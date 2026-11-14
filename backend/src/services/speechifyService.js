import https from 'https';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { UPLOAD_DIR, FFMPEG_PATH } from '../config.js';
import { getAudioInfo } from './ffmpegService.js';
import { logger } from '../utils/logger.js';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize lamejs pure JS MP3 Encoder
let Mp3EncoderClass = null;
try {
  const lamePath = path.resolve(__dirname, '../../node_modules/lamejs/lame.all.js');
  if (fs.existsSync(lamePath)) {
    const lameCode = fs.readFileSync(lamePath, 'utf8');
    const ctx = {};
    vm.runInNewContext(lameCode, ctx);
    if (ctx.lamejs && ctx.lamejs.Mp3Encoder) {
      Mp3EncoderClass = ctx.lamejs.Mp3Encoder;
      logger.info('[Speechify TTS] lamejs MP3 encoder initialized.');
    }
  }
} catch (e) {
  logger.warn('[Speechify TTS] Could not initialize lamejs, FFmpeg fallback will be used:', e.message);
}

/**
 * Convert PCM buffer to standard MP3 via lamejs
 */
function convertPcmToMp3(pcmBuffer, sampleRate = 24000, channels = 1, kbps = 128) {
  if (!Mp3EncoderClass) {
    throw new Error('lamejs Mp3Encoder is not initialized.');
  }

  const encoder = new Mp3EncoderClass(channels, sampleRate, kbps);
  const mp3Data = [];
  const int16Samples = new Int16Array(
    pcmBuffer.buffer,
    pcmBuffer.byteOffset,
    Math.floor(pcmBuffer.length / 2)
  );

  const chunkSize = 1152;
  for (let i = 0; i < int16Samples.length; i += chunkSize) {
    const chunk = int16Samples.subarray(i, i + chunkSize);
    const mp3buf = encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) {
      mp3Data.push(Buffer.from(mp3buf));
    }
  }

  const flushBuf = encoder.flush();
  if (flushBuf.length > 0) {
    mp3Data.push(Buffer.from(flushBuf));
  }

  return Buffer.concat(mp3Data);
}

/**
 * Convert WAV buffer to MP3 using FFmpeg
 */
function convertWavToMp3WithFfmpeg(wavBuffer, outputMp3Path) {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_PATH, [
      '-y',
      '-f', 'wav',
      '-i', 'pipe:0',
      '-c:a', 'libmp3lame',
      '-b:a', '128k',
      outputMp3Path
    ]);

    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('error', reject);
    proc.on('close', code => {
      if (code === 0 && fs.existsSync(outputMp3Path)) {
        resolve();
      } else {
        reject(new Error(`FFmpeg MP3 conversion failed (code ${code}): ${stderr}`));
      }
    });

    proc.stdin.write(wavBuffer);
    proc.stdin.end();
  });
}

/**
 * Split large text into safe chunks (<= maxLen characters)
 * Uses sentence boundaries (Hindi poornaviram, periods, question marks, commas, whitespace)
 */
export function splitTextIntoSafeChunks(rawText, maxLen = 1800) {
  let clean = rawText.replace(/<\/?speak>/gi, '').trim();
  if (!clean) return [];

  function breakDown(text) {
    if (text.length <= maxLen) return [text];

    // Split on Hindi poornaviram, dot, question, exclamation, newline
    let parts = text.split(/(?<=[।\.\?\!\n]+)/g).filter(s => s.trim().length > 0);
    if (parts.length > 1 && parts.every(p => p.length < text.length)) {
      let result = [];
      for (const p of parts) result.push(...breakDown(p));
      return result;
    }

    // Split on commas or semicolons
    parts = text.split(/(?<=[,;،]+)/g).filter(s => s.trim().length > 0);
    if (parts.length > 1 && parts.every(p => p.length < text.length)) {
      let result = [];
      for (const p of parts) result.push(...breakDown(p));
      return result;
    }

    // Split on whitespace
    parts = text.split(/(?<=\s+)/g).filter(s => s.trim().length > 0);
    if (parts.length > 1 && parts.every(p => p.length < text.length)) {
      let result = [];
      for (const p of parts) result.push(...breakDown(p));
      return result;
    }

    // Hard fallback
    let slices = [];
    for (let i = 0; i < text.length; i += maxLen) {
      slices.push(text.slice(i, i + maxLen));
    }
    return slices;
  }

  const units = breakDown(clean);
  const chunks = [];
  let current = '';

  for (const u of units) {
    if ((current + u).length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = u;
    } else {
      current += u;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * Extract PCM from Speechify WAV (skipping to 'data' chunk)
 */
function extractPcm(wavBuf) {
  let offset = 12;
  while (offset + 8 <= wavBuf.length) {
    const chunkId = wavBuf.subarray(offset, offset + 4).toString('ascii');
    const chunkSize = wavBuf.readUInt32LE(offset + 4);
    if (chunkId === 'data' || chunkSize === 4294967295) {
      return wavBuf.subarray(offset + 8);
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return wavBuf.subarray(78);
}

/**
 * Build standard 44-byte WAV
 */
function buildCleanWav(pcmBuffers, sampleRate = 24000) {
  const totalPcmLength = pcmBuffers.reduce((sum, b) => sum + b.length, 0);
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + totalPcmLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(totalPcmLength, 40);

  return Buffer.concat([header, ...pcmBuffers]);
}

/**
 * Format milliseconds into SRT or VTT timestamp
 */
function formatTimestamp(ms, isVtt = false) {
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = Math.floor(ms % 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const msStr = pad(milliseconds, 3);
  const timeStr = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return isVtt ? `${timeStr}.${msStr}` : `${timeStr},${msStr}`;
}

/**
 * Generate SRT, VTT, and structured segments from synchronized word timestamps
 */
function generateSubtitles(allWords) {
  if (!allWords || !allWords.length) {
    return { srt: '', vtt: 'WEBVTT\n\n', segments: [] };
  }

  const cues = [];
  let currentGroup = [];
  let cueStartTime = 0;

  for (let i = 0; i < allWords.length; i++) {
    const item = allWords[i];
    if (currentGroup.length === 0) {
      cueStartTime = item.startTime;
    }
    currentGroup.push(item);

    const val = item.value || '';
    const hasSentenceEnd = /[।\.\?\!\n]$/.test(val.trim());
    const isMaxWords = currentGroup.length >= 7;

    if (hasSentenceEnd || isMaxWords || i === allWords.length - 1) {
      cues.push({
        start: cueStartTime,
        end: Math.max(cueStartTime + 200, item.endTime),
        text: currentGroup.map(w => w.value).join(' ')
      });
      currentGroup = [];
    }
  }

  // Format SRT
  let srt = '';
  cues.forEach((c, idx) => {
    srt += `${idx + 1}\n`;
    srt += `${formatTimestamp(c.start, false)} --> ${formatTimestamp(c.end, false)}\n`;
    srt += `${c.text}\n\n`;
  });

  // Format VTT
  let vtt = 'WEBVTT\n\n';
  cues.forEach((c, idx) => {
    vtt += `${idx + 1}\n`;
    vtt += `${formatTimestamp(c.start, true)} --> ${formatTimestamp(c.end, true)}\n`;
    vtt += `${c.text}\n\n`;
  });

  // Standard segments array for use in frontend preview & export
  const segments = cues.map((c, idx) => {
    const startSec = parseFloat((c.start / 1000).toFixed(3));
    const endSec = parseFloat((c.end / 1000).toFixed(3));
    return {
      id: `seg_${idx + 1}`,
      index: idx + 1,
      startTime: startSec,
      endTime: endSec,
      duration: parseFloat((endSec - startSec).toFixed(3)),
      text: c.text
    };
  });

  return { srt: srt.trim(), vtt: vtt.trim(), segments };
}

export const SPEECHIFY_VOICE_ALIASES = {
  'vinti': 'aditi'
};

/**
 * Call Speechify API for a single chunk with automatic alias mapping and fallback
 */
export function callSpeechify(textChunk, options = {}) {
  const cleanText = textChunk.replace(/^\s*<speak>\s*/i, '').replace(/\s*<\/speak>\s*$/i, '').trim();
  const payloadText = `<speak>${cleanText}</speak>`;
  const rawVoice = (options.voice || 'mihika').toString().trim().toLowerCase();
  const initialVoice = SPEECHIFY_VOICE_ALIASES[rawVoice] || rawVoice;

  return new Promise((resolve, reject) => {
    function makeRequest(voiceToUse) {
      const payload = JSON.stringify({
        text: payloadText,
        isDefaultText: options.isDefaultText !== undefined ? options.isDefaultText : true,
        voice: voiceToUse,
        language: options.language || 'hi-IN',
        pageUrl: options.pageUrl || 'https://speechify.com/text-to-speech-online/',
        escape: options.escape !== undefined ? options.escape : false
      });

      const req = https.request('https://speechify.com/api/generate-audio/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://speechify.com',
          'Referer': 'https://speechify.com/text-to-speech-online/'
        }
      }, (res) => {
        let chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const bodyStr = Buffer.concat(chunks).toString('utf8');
          try {
            const data = JSON.parse(bodyStr);
            if (res.statusCode >= 200 && res.statusCode < 300 && data.audioData) {
              resolve({ statusCode: res.statusCode, data });
            } else {
              const errMsg = data.message || `Speechify API error (${res.statusCode}): ${bodyStr.slice(0, 200)}`;
              // If voice is not found or returns 404, gracefully fallback to 'mihika'
              if ((res.statusCode === 404 || errMsg.includes('Voice Lookup Error')) && voiceToUse !== 'mihika') {
                logger.warn(`[Speechify TTS] Voice '${voiceToUse}' returned lookup error, falling back to 'mihika'...`);
                return makeRequest('mihika');
              }
              reject(new Error(errMsg));
            }
          } catch (e) {
            reject(new Error(`Failed to parse Speechify response: ${bodyStr.slice(0, 300)}`));
          }
        });
      });

      req.on('error', (err) => {
        if (voiceToUse !== 'mihika') {
          logger.warn(`[Speechify TTS] Network error on voice '${voiceToUse}', retrying with fallback 'mihika'...`);
          return makeRequest('mihika');
        }
        reject(err);
      });

      req.write(payload);
      req.end();
    }

    makeRequest(initialVoice);
  });
}

export const SPEECHIFY_VOICES = [
  { id: 'rajiv', name: 'Rajiv', label: 'Rajiv (rajiv)', gender: 'Male' },
  { id: 'shlok', name: 'Shlok', label: 'Shlok (shlok)', gender: 'Male' },
  { id: 'kathan', name: 'Kathan', label: 'Kathan (kathan)', gender: 'Male' },
  { id: 'vinti', name: 'Vinti', label: 'Vinti (vinti)', gender: 'Female' },
  { id: 'mihika', name: 'Mihika', label: 'Mihika (mihika)', gender: 'Female' }
];

/**
 * Process entire script with Speechify TTS:
 * - Automatically splits long text into chunks
 * - Sequentially requests audio and word speech marks
 * - Offsets timestamps accurately per chunk
 * - Merges PCM and converts to MP3
 * - Generates synchronized SRT and VTT
 * - Saves MP3, SRT, and VTT to UPLOAD_DIR
 */
export async function generateSpeechifyTts({ text, voice = 'mihika', onProgress = () => {} }) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('Text is required for Speechify TTS generation.');
  }

  const selectedVoice = (voice || 'mihika').toString().trim().toLowerCase();
  const chunks = splitTextIntoSafeChunks(text, 1800);

  if (chunks.length === 0) {
    throw new Error('No valid text found after cleaning input.');
  }

  logger.info(`[Speechify TTS] Starting generation for voice '${selectedVoice}': ${text.length} chars in ${chunks.length} chunk(s)`);

  onProgress({
    type: 'start',
    totalChunks: chunks.length,
    originalCharCount: text.length,
    voice: selectedVoice,
    service: 'speechify'
  });

  const pcmBuffers = [];
  const allWords = [];
  let currentTimelineOffsetMs = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunkPercent = Math.round((i / (chunks.length + 1)) * 90);
    onProgress({
      type: 'progress',
      current: i + 1,
      total: chunks.length,
      percent: Math.max(5, chunkPercent),
      message: `Generating voice chunk ${i + 1} of ${chunks.length}...`
    });

    logger.info(`[Speechify TTS] Requesting chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);
    const result = await callSpeechify(chunks[i], { voice: selectedVoice });
    const rawWav = Buffer.from(result.data.audioData, 'base64');
    const pcm = extractPcm(rawWav);
    pcmBuffers.push(pcm);

    const chunkDurationMs = Math.round((pcm.length / (24000 * 2)) * 1000);

    // Extract word timing data for SRT / VTT with accurate chunk offsets
    if (result.data.speechMarks && Array.isArray(result.data.speechMarks.chunks)) {
      for (const word of result.data.speechMarks.chunks) {
        allWords.push({
          value: word.value,
          startTime: currentTimelineOffsetMs + (word.startTime || 0),
          endTime: currentTimelineOffsetMs + (word.endTime || 0)
        });
      }
    } else {
      // Synthesize words if speechMarks chunks array missing
      const rawWords = chunks[i].replace(/<\/?speak>/gi, '').trim().split(/\s+/).filter(Boolean);
      const wordStep = chunkDurationMs / (rawWords.length || 1);
      rawWords.forEach((rw, idx) => {
        allWords.push({
          value: rw,
          startTime: currentTimelineOffsetMs + Math.round(idx * wordStep),
          endTime: currentTimelineOffsetMs + Math.round((idx + 1) * wordStep)
        });
      });
    }

    currentTimelineOffsetMs += chunkDurationMs;
  }

  onProgress({
    type: 'progress',
    current: chunks.length,
    total: chunks.length,
    percent: 92,
    message: 'Merging audio chunks and encoding final MP3...'
  });

  // 1. Merge PCM buffers
  const totalPcmLength = pcmBuffers.reduce((sum, b) => sum + b.length, 0);
  const combinedPcm = Buffer.concat(pcmBuffers, totalPcmLength);
  const cleanWav = buildCleanWav(pcmBuffers, 24000);

  // Generate unique base filename
  const timestamp = Date.now();
  const rand = Math.round(Math.random() * 1e6);
  const baseFilename = `speechify_${selectedVoice}_${timestamp}_${rand}`;

  const mp3Filename = `${baseFilename}.mp3`;
  const srtFilename = `${baseFilename}.srt`;
  const vttFilename = `${baseFilename}.vtt`;

  const mp3Path = path.join(UPLOAD_DIR, mp3Filename);
  const srtPath = path.join(UPLOAD_DIR, srtFilename);
  const vttPath = path.join(UPLOAD_DIR, vttFilename);

  // 2. Convert to MP3
  try {
    const mp3Buffer = convertPcmToMp3(combinedPcm, 24000, 1, 128);
    fs.writeFileSync(mp3Path, mp3Buffer);
  } catch (lameErr) {
    logger.warn('[Speechify TTS] lamejs encoding fallback to FFmpeg:', lameErr.message);
    await convertWavToMp3WithFfmpeg(cleanWav, mp3Path);
  }

  // 3. Generate Subtitles (SRT and VTT)
  const { srt, vtt, segments } = generateSubtitles(allWords);
  fs.writeFileSync(srtPath, srt, 'utf8');
  fs.writeFileSync(vttPath, vtt, 'utf8');

  // 4. Probe generated MP3 with FFprobe for exact media info
  const audioInfo = await getAudioInfo(mp3Path);

  logger.info(`[Speechify TTS] Success! Final MP3: ${mp3Filename} (${audioInfo.duration}s), ${segments.length} subtitle cues.`);

  const taskId = `task_${timestamp}_${rand}`;

  return {
    taskId,
    service: 'speechify',
    voice: selectedVoice,
    audio: {
      filename: mp3Filename,
      originalName: `speechify_${selectedVoice}.mp3`,
      path: mp3Path,
      url: `/uploads/${mp3Filename}`,
      duration: audioInfo.duration,
      codec: audioInfo.codec,
      sampleRate: audioInfo.sampleRate,
      channels: audioInfo.channels,
      size: audioInfo.size
    },
    srt: {
      filename: srtFilename,
      originalName: `speechify_${selectedVoice}.srt`,
      path: srtPath,
      url: `/uploads/${srtFilename}`,
      format: 'SRT',
      count: segments.length,
      segments,
      content: srt
    },
    vtt: {
      filename: vttFilename,
      originalName: `speechify_${selectedVoice}.vtt`,
      path: vttPath,
      url: `/uploads/${vttFilename}`,
      format: 'VTT',
      count: segments.length,
      segments,
      content: vtt
    },
    totalChunks: chunks.length,
    characterCount: text.length,
    totalDurationSeconds: audioInfo.duration,
    createdAt: new Date().toISOString()
  };
}
