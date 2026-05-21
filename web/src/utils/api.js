const API_BASE = 'https://actionflow-api-460723832471.us-central1.run.app/api';

export async function fetchSamples() {
  const res = await fetch(`${API_BASE}/samples`);
  if (!res.ok) throw new Error('Failed to fetch samples');
  return res.json();
}

export async function uploadPDF(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Failed to upload PDF');
  return res.json();
}

export async function fetchURLContent(url) {
  const res = await fetch(`${API_BASE}/fetch-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error('Failed to fetch URL');
  return res.json();
}

export async function analyzeContent(content, onEvent, pipelineId) {
  const finalPipelineId = pipelineId || ('web_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now());
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, pipelineId: finalPipelineId }),
  });

  if (!res.ok) throw new Error('Analysis failed');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const event = JSON.parse(data);
          if (onEvent) onEvent(event);
        } catch {}
      }
    }
  }
}

export async function resetSimulation() {
  const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
  return res.json();
}

export async function cancelAnalysis(pipelineId) {
  const res = await fetch(`${API_BASE}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pipelineId }),
  });
  return res.json();
}
