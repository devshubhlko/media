const API_BASE = import.meta.env.VITE_API_URL || '';

export async function uploadScriptFile(file) {
  const formData = new FormData();
  formData.append('scriptFile', file);

  const res = await fetch(`${API_BASE}/api/upload/script`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to upload script');
  return data;
}

export async function uploadScriptText(text) {
  const res = await fetch(`${API_BASE}/api/upload/script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scriptText: text })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save script text');
  return data;
}

export async function uploadAudioFile(file) {
  const formData = new FormData();
  formData.append('audioFile', file);

  const res = await fetch(`${API_BASE}/api/upload/audio`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to upload audio file');
  return data;
}

export async function uploadSubtitleFile(file) {
  const formData = new FormData();
  formData.append('subtitleFile', file);

  const res = await fetch(`${API_BASE}/api/upload/subtitles`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to upload subtitle file');
  return data;
}

export async function uploadImageFile(file) {
  const formData = new FormData();
  formData.append('imageFile', file);

  const res = await fetch(`${API_BASE}/api/upload/image`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to upload image');
  return data;
}

export async function uploadImagesBatch(files) {
  const formData = new FormData();
  Array.from(files).forEach(f => {
    formData.append('imageFiles', f);
  });

  const res = await fetch(`${API_BASE}/api/upload/images-batch`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to upload images batch');
  return data;
}

export async function startExport(payload) {
  const res = await fetch(`${API_BASE}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || (data.details ? data.details.join(', ') : 'Export failed'));
  return data;
}

export async function getJobStatus(jobId) {
  const res = await fetch(`${API_BASE}/api/export/${jobId}/status`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch status');
  return data;
}

export async function cancelJob(jobId) {
  const res = await fetch(`${API_BASE}/api/export/${jobId}/cancel`, {
    method: 'POST'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to cancel job');
  return data;
}

export function createProgressEventSource(jobId) {
  return new EventSource(`${API_BASE}/api/export/${jobId}/progress`);
}

export function getDownloadUrl(jobId) {
  return `${API_BASE}/api/export/${jobId}/download`;
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) return { healthy: false };
    const data = await res.json();
    return { healthy: true, ...data };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}

/**
 * Fetch available TTS voices for Speechify and Edge TTS
 */
export async function getTtsVoices() {
  const res = await fetch(`${API_BASE}/api/tts/voices`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch TTS voices');
  return data.voices;
}

/**
 * Trigger TTS Generation with real-time SSE progress
 */
export async function generateTtsStream({
  service = 'speechify',
  text,
  voice,
  prosody = {},
  onStart = () => {},
  onProgress = () => {},
  onComplete = () => {},
  onError = () => {}
}) {
  try {
    const res = await fetch(`${API_BASE}/api/tts/generate-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service, text, voice, prosody })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP error ${res.status}`);
    }

    if (!res.body) {
      throw new Error('ReadableStream not supported by browser or empty response');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop(); // Keep incomplete piece

      for (const ev of events) {
        const trimmed = ev.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === 'start') {
              onStart(data);
            } else if (data.type === 'progress') {
              onProgress(data);
            } else if (data.type === 'complete') {
              onComplete(data);
            } else if (data.type === 'error') {
              onError(new Error(data.error || 'Speech synthesis error'));
            }
          } catch (parseErr) {
            console.warn('[SSE Parse Error]:', parseErr, trimmed);
          }
        }
      }
    }
  } catch (err) {
    onError(err);
  }
}

/**
 * Trigger standard (non-streaming) TTS Generation
 */
export async function generateTts({ service = 'speechify', text, voice, prosody = {} }) {
  const res = await fetch(`${API_BASE}/api/tts/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service, text, voice, prosody })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'TTS generation failed');
  return data;
}
