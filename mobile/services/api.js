import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getApiBase = () => {
  return 'https://actionflow-api-460723832471.us-central1.run.app';
};

const API_BASE = getApiBase();

export async function fetchSamples() {
  const res = await fetch(`${API_BASE}/api/samples`, {
    headers: { 'Bypass-Tunnel-Reminder': 'true' }
  });
  if (!res.ok) throw new Error('Failed to fetch samples');
  return res.json();
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, {
      headers: { 'Bypass-Tunnel-Reminder': 'true' }
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Real SSE streaming analysis — identical to web's analyzeContent()
export async function analyzeContentSSE(content, onEvent) {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true'
    },
    body: JSON.stringify({ content }),
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

// Synchronous fallback for native mobile (no ReadableStream)
export async function analyzeContentSync(content, pipelineId) {
  const res = await fetch(`${API_BASE}/api/analyze-sync`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true'
    },
    body: JSON.stringify({ content, pipelineId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Analysis failed');
  }
  return res.json();
}

export async function uploadFileAPI(fileUri, fileType, fileName) {
  const formData = new FormData();
  
  if (Platform.OS === 'web') {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    formData.append('file', blob, fileName || 'upload.bin');
  } else {
    formData.append('file', {
      uri: fileUri,
      type: fileType,
      name: fileName || 'upload.bin',
    });
  }

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: { 'Bypass-Tunnel-Reminder': 'true' },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

export async function fetchURLContent(url) {
  const res = await fetch(`${API_BASE}/api/fetch-url`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true'
    },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch URL');
  }
  return res.json();
}

export async function fetchActiveTraces(pipelineId) {
  const res = await fetch(`${API_BASE}/api/active-traces?pipelineId=${pipelineId || 'default'}`, {
    headers: { 'Bypass-Tunnel-Reminder': 'true' }
  });
  if (!res.ok) throw new Error('Failed to fetch active traces');
  return res.json();
}

export async function cancelAnalysis(pipelineId) {
  try {
    const res = await fetch(`${API_BASE}/api/cancel`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true'
      },
      body: JSON.stringify({ pipelineId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export { API_BASE };
