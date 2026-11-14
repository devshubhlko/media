import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { UPLOAD_DIR, FFMPEG_PATH } from '../config.js';
import { getAudioInfo } from './ffmpegService.js';
import { splitTextIntoSafeChunks } from './speechifyService.js';
import { logger } from '../utils/logger.js';

export const EDGE_VOICES = [
  { id: 'hi-IN-SwaraNeural', name: 'Swara', label: 'Swara – Female', gender: 'Female', locale: 'hi-IN' },
  { id: 'hi-IN-MadhurNeural', name: 'Madhur', label: 'Madhur – Male', gender: 'Male', locale: 'hi-IN' },
  { id: 'hi-IN-AaravNeural', name: 'Aarav', label: 'Aarav – Male', gender: 'Male', locale: 'hi-IN' }
];

const VOICE_ALIASES = {
  'hi-IN-AaravNeural': 'hi-IN-MadhurNeural'
};

/**
 * Helper to escape XML/SSML special characters & strip invalid XML control chars
 */
function sanitizeForSSML(unsafe) {
  if (!unsafe) return '';
  const clean = unsafe.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Convert 100-nanosecond ticks to SRT timestamp format (HH:MM:SS,mmm)
 */
function ticksToTimeSRT(ticks) {
  const totalMs = Math.max(0, Math.floor(ticks / 10000));
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const sec = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const min = totalMin % 60;
  const hours = Math.floor(totalMin / 60);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(hours)}:${pad(min)}:${pad(sec)},${pad(ms, 3)}`;
}

/**
 * Convert 100-nanosecond ticks to WebVTT timestamp format (HH:MM:SS.mmm)
 */
function ticksToTimeVTT(ticks) {
  return ticksToTimeSRT(ticks).replace(',', '.');
}

/**
 * Extract clean subtitle items from MsEdgeTTS metadata events
 */
function extractSubtitlesFromMetadata(metadataEvents, fallbackText = '') {
  const sentences = [];
  const words = [];

  if (Array.isArray(metadataEvents)) {
    for (const ev of metadataEvents) {
      if (ev.Type === 'SentenceBoundary' && ev.Data) {
        const text = (ev.Data.text && ev.Data.text.Text) ? ev.Data.text.Text.trim() : '';
        if (text) {
          sentences.push({
            offset: ev.Data.Offset || 0,
            duration: ev.Data.Duration || 0,
            text
          });
        }
      } else if (ev.Type === 'WordBoundary' && ev.Data) {
        const text = (ev.Data.text && ev.Data.text.Text) ? ev.Data.text.Text.trim() : '';
        if (text) {
          words.push({
            offset: ev.Data.Offset || 0,
            duration: ev.Data.Duration || 0,
            text
          });
        }
      }
    }
  }

  if (sentences.length > 0) {
    return sentences;
  }

  // Fallback: group word boundaries if sentences missing
  if (words.length > 0) {
    const grouped = [];
    const groupSize = 7;
    for (let i = 0; i < words.length; i += groupSize) {
      const slice = words.slice(i, i + groupSize);
      const first = slice[0];
      const last = slice[slice.length - 1];
      const text = slice.map((w) => w.text).join(' ');
      grouped.push({
        offset: first.offset,
        duration: (last.offset + last.duration) - first.offset,
        text
      });
    }
    return grouped;
  }

  // Final fallback: use original text spanning estimated duration
  if (fallbackText && fallbackText.trim()) {
    return [{
      offset: 0,
      duration: Math.max(30000000, fallbackText.length * 700000),
      text: fallbackText.trim()
    }];
  }

  return [];
}

/**
 * Build UTF-8 .SRT string
 */
function buildSRT(boundaries) {
  if (!boundaries || boundaries.length === 0) return '';

  const entries = boundaries.map((item, index) => {
    const start = ticksToTimeSRT(item.offset);
    const end = ticksToTimeSRT(item.offset + item.duration);
    return `${index + 1}\n${start} --> ${end}\n${item.text}`;
  });

  return '\uFEFF' + entries.join('\n\n') + '\n';
}

/**
 * Build UTF-8 .VTT string
 */
function buildVTT(boundaries) {
  if (!boundaries || boundaries.length === 0) return 'WEBVTT\n\n';

  const entries = boundaries.map((item, index) => {
    const start = ticksToTimeVTT(item.offset);
    const end = ticksToTimeVTT(item.offset + item.duration);
    return `${index + 1}\n${start} --> ${end}\n${item.text}`;
  });

  return `WEBVTT\n\n${entries.join('\n\n')}\n`;
}

/**
 * Synthesize speech for a single text chunk into Buffer with metadata events
 */
async function synthesizeChunk(text, requestedVoice, prosody = {}, maxAttempts = 2) {
  const safeText = sanitizeForSSML(text.trim());
  let targetVoice = VOICE_ALIASES[requestedVoice] || requestedVoice;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let tts = null;
    try {
      tts = new MsEdgeTTS({
        enableLogger: false,
        connectionTimeoutMs: 30000,
        synthesisTimeoutMs: 120000
      });

      await tts.setMetadata(targetVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {
        sentenceBoundaryEnabled: true,
        wordBoundaryEnabled: true
      });

      const { audioStream, metadataStream } = tts.toStream(
        safeText,
        Object.keys(prosody).length > 0 ? prosody : undefined
      );

      const chunks = [];
      const metadataEvents = [];

      if (metadataStream) {
        metadataStream.on('data', (mChunk) => {
          try {
            const parsed = JSON.parse(mChunk.toString());
            if (parsed && Array.isArray(parsed.Metadata)) {
              for (const item of parsed.Metadata) {
                metadataEvents.push(item);
              }
            }
          } catch (_) {}
        });
      }

      await new Promise((resolve, reject) => {
        let finished = false;

        audioStream.on('data', (chunk) => {
          chunks.push(chunk);
        });

        audioStream.once('end', () => {
          if (!finished) {
            finished = true;
            resolve();
          }
        });

        audioStream.once('error', (err) => {
          if (!finished) {
            finished = true;
            reject(err);
          }
        });

        audioStream.once('close', () => {
          if (!finished) {
            finished = true;
            if (chunks.length > 0) resolve();
            else reject(new Error('Edge TTS stream closed before receiving audio data.'));
          }
        });
      });

      try { tts.close(); } catch (_) {}

      const buffer = Buffer.concat(chunks);
      if (buffer.length === 0) {
        if (targetVoice !== 'hi-IN-SwaraNeural') {
          logger.warn(`[Edge TTS] Voice ${targetVoice} yielded 0 bytes, switching to hi-IN-SwaraNeural`);
          targetVoice = 'hi-IN-SwaraNeural';
        }
        throw new Error('Received empty audio payload from Edge TTS.');
      }

      return { buffer, metadataEvents };
    } catch (err) {
      lastError = err;
      if (tts) {
        try { tts.close(); } catch (_) {}
      }
      logger.warn(`[Edge TTS] Synthesis attempt ${attempt}/${maxAttempts} failed: ${err.message}`);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }

  throw lastError;
}

/**
 * Merge multiple MP3 files into a single MP3 file using FFmpeg concat demuxer
 */
function mergeMp3Files(chunkFilePaths, outputFilePath) {
  return new Promise((resolve, reject) => {
    const listFilePath = path.join(UPLOAD_DIR, `concat_list_${Date.now()}_${Math.round(Math.random() * 1e4)}.txt`);
    const fileListContent = chunkFilePaths
      .map(p => `file '${p.replace(/\\/g, '/')}'`)
      .join('\n');

    fs.writeFileSync(listFilePath, fileListContent, 'utf8');

    const proc = spawn(FFMPEG_PATH, [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFilePath,
      '-c', 'copy',
      outputFilePath
    ]);

    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('error', (err) => {
      try { fs.unlinkSync(listFilePath); } catch (_) {}
      reject(err);
    });

    proc.on('close', (code) => {
      try { fs.unlinkSync(listFilePath); } catch (_) {}
      if (code === 0 && fs.existsSync(outputFilePath)) {
        resolve();
      } else {
        reject(new Error(`FFmpeg concat failed (code ${code}): ${stderr}`));
      }
    });
  });
}

/**
 * Process entire script with Edge TTS:
 * - Automatically splits long text into chunks
 * - Sequentially synthesizes each chunk with Edge TTS
 * - Accurately probes each chunk duration and adjusts subtitle timestamps
 * - Merges all chunk MP3s using FFmpeg into one final MP3
 * - Generates synchronized SRT and VTT files
 * - Saves MP3, SRT, and VTT to UPLOAD_DIR
 */
export async function generateEdgeTts({ text, voice = 'hi-IN-SwaraNeural', prosody = {}, onProgress = () => {} }) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('Text is required for Edge TTS generation.');
  }

  const selectedVoice = (voice || 'hi-IN-SwaraNeural').toString().trim();
  const chunks = splitTextIntoSafeChunks(text, 1500);

  if (chunks.length === 0) {
    throw new Error('No valid text found after cleaning input.');
  }

  logger.info(`[Edge TTS] Starting generation for voice '${selectedVoice}': ${text.length} chars in ${chunks.length} chunk(s)`);

  onProgress({
    type: 'start',
    totalChunks: chunks.length,
    originalCharCount: text.length,
    voice: selectedVoice,
    service: 'edge'
  });

  const timestamp = Date.now();
  const rand = Math.round(Math.random() * 1e6);
  const voiceSafe = selectedVoice.replace(/[^a-zA-Z0-9_-]/g, '_');
  const baseFilename = `edge_${voiceSafe}_${timestamp}_${rand}`;

  const mp3Filename = `${baseFilename}.mp3`;
  const srtFilename = `${baseFilename}.srt`;
  const vttFilename = `${baseFilename}.vtt`;

  const finalMp3Path = path.join(UPLOAD_DIR, mp3Filename);
  const finalSrtPath = path.join(UPLOAD_DIR, srtFilename);
  const finalVttPath = path.join(UPLOAD_DIR, vttFilename);

  const chunkMp3Paths = [];
  const allMetadataEvents = [];
  let cumulativeOffsetSeconds = 0;

  try {
    for (let i = 0; i < chunks.length; i++) {
      const chunkPercent = Math.round((i / (chunks.length + 1)) * 90);
      onProgress({
        type: 'progress',
        current: i + 1,
        total: chunks.length,
        percent: Math.max(5, chunkPercent),
        message: `Generating voice chunk ${i + 1} of ${chunks.length}...`
      });

      logger.info(`[Edge TTS] Requesting chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);
      const { buffer: chunkBuffer, metadataEvents } = await synthesizeChunk(chunks[i], selectedVoice, prosody);

      // Write chunk buffer to temp MP3
      const chunkPath = path.join(UPLOAD_DIR, `temp_chunk_${timestamp}_${i}_${rand}.mp3`);
      fs.writeFileSync(chunkPath, chunkBuffer);
      chunkMp3Paths.push(chunkPath);

      // Probe exact audio duration of this chunk
      const chunkAudioInfo = await getAudioInfo(chunkPath);
      const chunkDuration = chunkAudioInfo.duration;

      // Adjust metadata event timestamps according to cumulative offset
      const cumulativeOffsetTicks = Math.round(cumulativeOffsetSeconds * 10000000);
      if (Array.isArray(metadataEvents)) {
        for (const ev of metadataEvents) {
          if (ev && ev.Data) {
            allMetadataEvents.push({
              Type: ev.Type,
              Data: {
                ...ev.Data,
                Offset: (ev.Data.Offset || 0) + cumulativeOffsetTicks
              }
            });
          }
        }
      }

      cumulativeOffsetSeconds += chunkDuration;
    }

    onProgress({
      type: 'progress',
      current: chunks.length,
      total: chunks.length,
      percent: 92,
      message: 'Merging audio chunks and finalizing subtitles (SRT/VTT)...'
    });

    // Merge chunk MP3s
    if (chunkMp3Paths.length === 1) {
      // Single chunk: simply move/copy to final destination
      fs.copyFileSync(chunkMp3Paths[0], finalMp3Path);
    } else {
      // Multiple chunks: losslessly concatenate with FFmpeg
      await mergeMp3Files(chunkMp3Paths, finalMp3Path);
    }

    // Extract boundaries and format subtitles
    const boundaries = extractSubtitlesFromMetadata(allMetadataEvents, text);
    const srt = buildSRT(boundaries);
    const vtt = buildVTT(boundaries);

    fs.writeFileSync(finalSrtPath, srt, 'utf8');
    fs.writeFileSync(finalVttPath, vtt, 'utf8');

    // Probe final merged MP3 with FFprobe
    const audioInfo = await getAudioInfo(finalMp3Path);

    // Standard segments array for use in frontend preview & export
    const segments = boundaries.map((item, idx) => {
      const startSec = parseFloat((item.offset / 10000000).toFixed(3));
      const endSec = parseFloat(((item.offset + item.duration) / 10000000).toFixed(3));
      return {
        id: `seg_${idx + 1}`,
        index: idx + 1,
        startTime: startSec,
        endTime: endSec,
        duration: parseFloat((item.duration / 10000000).toFixed(3)),
        text: item.text
      };
    });

    logger.info(`[Edge TTS] Success! Final MP3: ${mp3Filename} (${audioInfo.duration}s), ${segments.length} subtitle cues.`);

    const taskId = `task_${timestamp}_${rand}`;

    return {
      taskId,
      service: 'edge',
      voice: selectedVoice,
      audio: {
        filename: mp3Filename,
        originalName: `edge_${selectedVoice}.mp3`,
        path: finalMp3Path,
        url: `/uploads/${mp3Filename}`,
        duration: audioInfo.duration,
        codec: audioInfo.codec,
        sampleRate: audioInfo.sampleRate,
        channels: audioInfo.channels,
        size: audioInfo.size
      },
      srt: {
        filename: srtFilename,
        originalName: `edge_${selectedVoice}.srt`,
        path: finalSrtPath,
        url: `/uploads/${srtFilename}`,
        format: 'SRT',
        count: segments.length,
        segments,
        content: srt
      },
      vtt: {
        filename: vttFilename,
        originalName: `edge_${selectedVoice}.vtt`,
        path: finalVttPath,
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
  } finally {
    // Clean up temporary chunk files
    for (const p of chunkMp3Paths) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch (_) {}
    }
  }
}
