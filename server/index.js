import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { orchestrate, resetSimulation, cancelledPipelines } from './agents/orchestrator.js';
import { parsePDF } from './utils/pdfParser.js';
import { fetchURL } from './utils/urlFetcher.js';
import { getSamples } from './data/samples.js';
import { optionalAuth } from './services/firebase.js';
import { uploadFile } from './services/cloudStorage.js';
import { getRecentLogs } from './services/cloudLogging.js';
import { ai } from './services/gemini.js';

dotenv.config();

// If running in Google Cloud Run (K_SERVICE is set), delete GOOGLE_APPLICATION_CREDENTIALS
// so the Google Auth Library correctly uses the metadata server instead of looking for a local file.
if (process.env.K_SERVICE) {
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Apply optional auth to all routes
app.use(optionalAuth);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    gcpProject: process.env.GCP_PROJECT_ID || 'not-configured',
    user: req.user?.uid || 'anonymous',
    services: {
      gemini: !!process.env.GEMINI_API_KEY,
      firebase: true,
      cloudStorage: true,
      cloudLogging: true,
    },
  });
});

// Get sample inputs
app.get('/api/samples', (req, res) => {
  res.json(getSamples());
});

// Upload PDF or Image and extract text (with Cloud Storage integration)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let text = '';
    let pages = 1;

    if (req.file.mimetype === 'application/pdf') {
      let resultText = '';
      try {
        const result = await parsePDF(req.file.buffer);
        resultText = result.text || '';
        pages = result.pages || 1;
      } catch (err) {
        console.warn('pdf-parse failed, falling back to Gemini:', err.message);
      }

      // If pdf-parse returns less than 50 alphanumeric characters, it is likely a scanned/image-only PDF
      const alphanumericCount = (resultText.match(/[a-zA-Z0-9]/g) || []).length;
      if (alphanumericCount < 50) {
        console.log('📄 pdf-parse returned gibberish or empty text. Falling back to Gemini Multimodal OCR...');
        if (!ai) throw new Error('Gemini AI not initialized for PDF fallback');
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            "Extract all the text from this PDF document exactly as it is written. If it contains charts, diagrams, or tables, transcribe and format them clearly.",
            {
              inlineData: {
                data: req.file.buffer.toString('base64'),
                mimeType: 'application/pdf'
              }
            }
          ]
        });
        text = response.text;
      } else {
        text = resultText;
      }
    } else if (req.file.mimetype.startsWith('image/')) {
      if (!ai) throw new Error('Gemini AI not initialized for image parsing');
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          "Extract all the text from this image exactly as it is written. If it contains a chart or table, summarize the data points clearly and accurately.",
          {
            inlineData: {
              data: req.file.buffer.toString('base64'),
              mimeType: req.file.mimetype
            }
          }
        ]
      });
      text = response.text;
    } else {
      text = req.file.buffer.toString('utf-8');
    }

    // Also upload to Cloud Storage (non-blocking)
    uploadFile(req.file.buffer, req.file.originalname)
      .then(storageResult => {
        console.log(`📁 File stored: ${storageResult.stored} — ${storageResult.filename}`);
      })
      .catch(err => console.warn('Cloud Storage upload skipped:', err.message));

    res.json({ text, pages });
  } catch (error) {
    console.error('❌ Upload Endpoint Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch URL content
app.post('/api/fetch-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    const result = await fetchURL(url);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const activeTracesMap = new Map();

// Helper to cleanup stale sessions periodically to avoid memory leak
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of activeTracesMap.entries()) {
    if (now - session.created > 5 * 60 * 1000) { // 5 minutes expiry
      activeTracesMap.delete(id);
    }
  }
}, 60 * 1000);

// Get active, in-progress orchestrator trace logs for a specific pipelineId
app.get('/api/active-traces', (req, res) => {
  const pipelineId = req.query.pipelineId || 'default';
  console.log(`[SESSION] GET /api/active-traces | pipelineId: ${pipelineId}`);
  const session = activeTracesMap.get(pipelineId);
  res.json(session ? session.traces : []);
});

// Main analysis endpoint with SSE streaming
app.post('/api/analyze', async (req, res) => {
  let { content, pipelineId } = req.body;
  if (!pipelineId || pipelineId === 'default') {
    pipelineId = 'web_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
  }
  console.log(`[SESSION] POST /api/analyze | pipelineId: ${pipelineId}`);
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Content is required' });
  }

  activeTracesMap.set(pipelineId, {
    traces: [],
    created: Date.now()
  });

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (event) => {
    const session = activeTracesMap.get(pipelineId);
    if (session) {
      session.traces.push(event);
    }
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const result = await orchestrate(content, sendEvent, pipelineId);
    sendEvent({ stage: 'final_result', status: 'completed', data: result, timestamp: new Date().toISOString() });
    res.write('data: [DONE]\n\n');
    res.end();
    
    // Clean up active traces after a slight delay to allow final polling client retrieval
    setTimeout(() => {
      activeTracesMap.delete(pipelineId);
    }, 15000);
  } catch (error) {
    sendEvent({
      stage: 'pipeline',
      status: 'error',
      data: { error: error.message || error.error?.message || 'Pipeline failed' },
      timestamp: new Date().toISOString(),
    });
    res.write('data: [DONE]\n\n');
    res.end();
    
    setTimeout(() => {
      activeTracesMap.delete(pipelineId);
    }, 15000);
  }
});

// Non-streaming analysis (for mobile app)
app.post('/api/analyze-sync', async (req, res) => {
  let { content, pipelineId } = req.body;
  if (!pipelineId || pipelineId === 'default') {
    pipelineId = 'mobile_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
  }
  console.log(`[SESSION] POST /api/analyze-sync | pipelineId: ${pipelineId}`);
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Content is required' });
  }

  activeTracesMap.set(pipelineId, {
    traces: [],
    created: Date.now()
  });

  try {
    const traces = [];
    const result = await orchestrate(content, (event) => {
      traces.push(event);
      const session = activeTracesMap.get(pipelineId);
      if (session) {
        session.traces.push(event);
      }
    }, pipelineId);

    res.json({ ...result, traces });
    
    // Clean up active traces after a slight delay
    setTimeout(() => {
      activeTracesMap.delete(pipelineId);
    }, 15000);
  } catch (error) {
    activeTracesMap.delete(pipelineId);
    res.status(500).json({ error: error.message || 'Pipeline failed' });
  }
});

// Get agent trace logs from Cloud Logging
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await getRecentLogs(parseInt(req.query.limit) || 50);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset simulation state
app.post('/api/reset', (req, res) => {
  resetSimulation();
  res.json({ status: 'reset', timestamp: new Date().toISOString() });
});

// Cancel active analysis session
app.post('/api/cancel', (req, res) => {
  const { pipelineId } = req.body;
  if (!pipelineId) {
    return res.status(400).json({ error: 'pipelineId is required' });
  }
  cancelledPipelines.add(pipelineId);
  res.json({ status: 'cancelled', pipelineId });
});

app.listen(PORT, () => {
  console.log(`\n🚀 ActionFlow AI Server running on http://localhost:${PORT}`);
  console.log(`🔗 GCP Project: ${process.env.GCP_PROJECT_ID || 'not-configured'}`);
  console.log(`📡 API endpoints:`);
  console.log(`   POST /api/analyze      - Main analysis (SSE streaming)`);
  console.log(`   POST /api/analyze-sync  - Synchronous analysis (mobile)`);
  console.log(`   POST /api/upload       - PDF upload (Cloud Storage)`);
  console.log(`   POST /api/fetch-url    - Fetch URL content`);
  console.log(`   GET  /api/samples      - Sample inputs`);
  console.log(`   GET  /api/logs         - Agent trace logs (Cloud Logging)`);
  console.log(`   POST /api/reset        - Reset simulation state\n`);
});
