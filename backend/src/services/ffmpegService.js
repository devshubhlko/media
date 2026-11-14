import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { FFMPEG_PATH, FFPROBE_PATH } from '../config.js';
import { RESOLUTION_PRESETS } from '../utils/validator.js';
import { generateAssSubtitleFile } from './subtitleParser.js';
import { FONTS_DIR, ensureFontAvailable } from './fontService.js';
import { logger } from '../utils/logger.js';

/**
 * Ensures path is safe from Windows MAX_PATH limitations by creating a short temporary copy if needed.
 */
function ensureSafePath(filePath, prefix, tempShortFiles) {
  if (!filePath || !fs.existsSync(filePath)) return filePath;
  if (filePath.length > 150) {
    const ext = path.extname(filePath) || '.dat';
    const shortName = `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e4)}${ext}`;
    const shortPath = path.join(path.dirname(filePath), shortName);
    try {
      fs.copyFileSync(filePath, shortPath);
      tempShortFiles.push(shortPath);
      logger.info(`Shortened path for FFmpeg (${filePath.length} -> ${shortPath.length} chars)`);
      return shortPath;
    } catch (err) {
      logger.warn(`Could not copy long path: ${err.message}`);
      return filePath;
    }
  }
  return filePath;
}

/**
 * Escapes file path for FFmpeg filter strings (especially on Windows)
 */
export function escapeFfmpegFilterPath(filePath) {
  let p = filePath.replace(/\\/g, '/');
  p = p.replace(/:/g, '\\:');
  p = p.replace(/'/g, "\\'");
  return p;
}

/**
 * Probes audio file for duration, sample rate, channels, and format
 */
export function getAudioInfo(audioPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(audioPath)) {
      return reject(new Error(`Audio file not found: ${audioPath}`));
    }

    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration,size,bit_rate:stream=codec_name,sample_rate,channels',
      '-of', 'json',
      audioPath
    ];

    logger.info(`Running ffprobe on: ${audioPath}`);
    const probe = spawn(FFPROBE_PATH, args);

    let stdout = '';
    let stderr = '';

    probe.stdout.on('data', data => {
      stdout += data.toString();
    });

    probe.stderr.on('data', data => {
      stderr += data.toString();
    });

    probe.on('error', err => {
      logger.error('Failed to spawn ffprobe:', err);
      reject(new Error(`Failed to execute ffprobe: ${err.message}`));
    });

    probe.on('close', code => {
      if (code !== 0) {
        logger.error(`ffprobe exited with code ${code}: ${stderr}`);
        return reject(new Error(`Invalid audio file or ffprobe error: ${stderr || code}`));
      }

      try {
        const info = JSON.parse(stdout);
        const format = info.format || {};
        const stream = (info.streams && info.streams[0]) || {};
        const duration = parseFloat(format.duration || stream.duration || 0);

        if (!duration || isNaN(duration) || duration <= 0) {
          return reject(new Error('Could not determine audio duration from file'));
        }

        resolve({
          duration: parseFloat(duration.toFixed(3)),
          codec: stream.codec_name || 'unknown',
          sampleRate: parseInt(stream.sample_rate || '44100', 10),
          channels: stream.channels || 2,
          size: parseInt(format.size || '0', 10)
        });
      } catch (parseErr) {
        reject(new Error(`Failed to parse ffprobe output: ${parseErr.message}`));
      }
    });
  });
}

/**
 * Renders complete video using FFmpeg
 */
export function renderVideo({
  jobId,
  timeline,
  audioPath,
  captionsEnabled = false,
  subtitleSegments = [],
  captionSettings = {},
  exportSettings = {},
  outputPath,
  tempDir,
  onProgress = () => {},
  onLog = () => {}
}) {
  return new Promise(async (resolve, reject) => {
    try {
      const { aspectRatio = '16:9', resolution = '720p', fps = 30 } = exportSettings;
      const resPreset = RESOLUTION_PRESETS[aspectRatio]?.[resolution] || RESOLUTION_PRESETS['16:9']['720p'];
      const width = resPreset.width;
      const height = resPreset.height;

      const rawSlots = timeline.slots || [];
      if (rawSlots.length === 0) {
        return reject(new Error('Cannot render video: no timeline slots provided.'));
      }

      // Clone slots to safely calculate & adjust durations
      const slots = rawSlots.map(s => ({ ...s, duration: parseFloat(s.duration) || 1 }));

      // Probe audio duration to guarantee the final video matches audio duration exactly
      let audioDuration = 0;
      if (audioPath && fs.existsSync(audioPath)) {
        try {
          const aInfo = await getAudioInfo(audioPath);
          audioDuration = parseFloat(aInfo.duration) || 0;
        } catch (e) {
          logger.warn(`Could not probe audio duration: ${e.message}`);
        }
      }

      let totalDuration = slots.reduce((acc, slot) => acc + slot.duration, 0);

      // Force video duration to match audio duration exactly
      if (audioDuration > 0) {
        const slotsSum = slots.reduce((acc, slot) => acc + slot.duration, 0);
        logger.info(`Enforcing audio duration sync: Audio = ${audioDuration.toFixed(2)}s, Initial Slots Sum = ${slotsSum.toFixed(2)}s`);

        if (Math.abs(slotsSum - audioDuration) > 0.05) {
          if (slotsSum < audioDuration) {
            // Extend the last slot so the image holds until the audio completes
            const diff = audioDuration - slotsSum;
            slots[slots.length - 1].duration = parseFloat((slots[slots.length - 1].duration + diff).toFixed(3));
          } else {
            // Proportionally scale slot durations so the video matches audio length
            const factor = audioDuration / slotsSum;
            let runningSum = 0;
            slots.forEach((s, idx) => {
              if (idx === slots.length - 1) {
                s.duration = parseFloat(Math.max(0.5, audioDuration - runningSum).toFixed(3));
              } else {
                s.duration = parseFloat((s.duration * factor).toFixed(3));
                runningSum += s.duration;
              }
            });
          }
        }
        totalDuration = audioDuration;
      }

    const tempShortFiles = [];
    const inputs = [];
    const filterParts = [];
    const concatInputs = [];

    // 1. Build inputs and scaling filters for each slot image
    slots.forEach((slot, idx) => {
      const dur = parseFloat(slot.duration).toFixed(3);
      const safeSlotPath = ensureSafePath(slot.imagePath, `slot_${idx}`, tempShortFiles);
      inputs.push('-loop', '1', '-t', dur, '-i', safeSlotPath);

      // Scale to fit while maintaining aspect ratio, then pad to target canvas width/height
      filterParts.push(
        `[${idx}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}[v${idx}]`
      );
      concatInputs.push(`[v${idx}]`);
    });

    // 2. Concat all image segments
    const concatCount = slots.length;
    let lastFilterNode = '[vconcat]';
    filterParts.push(`${concatInputs.join('')}concat=n=${concatCount}:v=1:a=0${lastFilterNode}`);

    // 3. Handle Subtitles
    let tempAssPath = null;
    if (captionsEnabled && subtitleSegments && subtitleSegments.length > 0) {
      try {
        await ensureFontAvailable(captionSettings?.fontFamily || 'Gotu');
      } catch (fErr) {
        logger.warn(`Font preparation notice: ${fErr.message}`);
      }

      tempAssPath = path.join(tempDir, `captions_${jobId}.ass`);
      generateAssSubtitleFile({
        segments: subtitleSegments,
        captionSettings,
        videoWidth: width,
        videoHeight: height,
        outputPath: tempAssPath
      });

      const escapedAssPath = escapeFfmpegFilterPath(tempAssPath);
      const escapedFontsDir = escapeFfmpegFilterPath(FONTS_DIR);
      filterParts.push(`${lastFilterNode}subtitles='${escapedAssPath}':fontsdir='${escapedFontsDir}'[vsub]`);
      lastFilterNode = '[vsub]';
    }

    // Audio input is placed after image inputs
    const audioInputIndex = slots.length;
    const safeAudioPath = ensureSafePath(audioPath, 'audio', tempShortFiles);
    inputs.push('-i', safeAudioPath);

    const filterComplex = filterParts.join(';');

    const args = [
      '-y', // overwrite output if exists
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', lastFilterNode,
      '-map', `${audioInputIndex}:a`,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      '-r', String(fps),
      '-c:a', 'aac',
      '-b:a', '192k',
      '-t', String(totalDuration.toFixed(3)), // ensure exact match to image timeline duration
      '-movflags', '+faststart',
      '-progress', 'pipe:1',
      outputPath
    ];

    logger.info(`Spawning FFmpeg for Job ${jobId}`);
    logger.debug(`FFmpeg args: ${args.join(' ')}`);

    const ffmpegProcess = spawn(FFMPEG_PATH, args);

    let stderrBuffer = '';
    let isFinished = false;

    // Monitor progress on stdout (-progress pipe:1)
    ffmpegProcess.stdout.on('data', data => {
      const text = data.toString();
      const lines = text.split('\n');

      let currentSec = null;
      let currentFps = null;
      let speed = null;

      lines.forEach(line => {
        const [key, value] = line.split('=');
        if (!key || !value) return;

        const trimmedKey = key.trim();
        const trimmedVal = value.trim();

        if (trimmedKey === 'out_time_ms') {
          const us = parseInt(trimmedVal, 10);
          if (!isNaN(us)) {
            currentSec = us / 1000000;
          }
        } else if (trimmedKey === 'out_time') {
          // Format 00:00:05.123
          const match = trimmedVal.match(/(\d+):(\d+):(\d+\.?\d*)/);
          if (match && currentSec === null) {
            currentSec = parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]);
          }
        } else if (trimmedKey === 'fps') {
          currentFps = parseFloat(trimmedVal) || 0;
        } else if (trimmedKey === 'speed') {
          speed = trimmedVal;
        }
      });

      if (currentSec !== null && totalDuration > 0) {
        const percent = Math.min(100, Math.max(0, Math.round((currentSec / totalDuration) * 100)));
        onProgress({
          percent,
          currentTime: parseFloat(currentSec.toFixed(2)),
          totalDuration: parseFloat(totalDuration.toFixed(2)),
          fps: currentFps,
          speed
        });
      }
    });

    ffmpegProcess.stderr.on('data', data => {
      const str = data.toString();
      stderrBuffer += str;
      if (stderrBuffer.length > 10000) {
        stderrBuffer = stderrBuffer.slice(-10000); // keep last 10KB
      }
      onLog(str);
    });

    ffmpegProcess.on('error', err => {
      isFinished = true;
      logger.error(`FFmpeg spawn error for Job ${jobId}:`, err);
      cleanupTempFiles(tempAssPath, tempShortFiles);
      reject(new Error(`Failed to start FFmpeg: ${err.message}`));
    });

    ffmpegProcess.on('close', code => {
      isFinished = true;
      cleanupTempFiles(tempAssPath, tempShortFiles);

      if (code === 0) {
        logger.info(`FFmpeg Job ${jobId} finished successfully. Output: ${outputPath}`);
        onProgress({
          percent: 100,
          currentTime: totalDuration,
          totalDuration,
          speed: '1x'
        });
        resolve({
          jobId,
          outputPath,
          duration: totalDuration,
          width,
          height,
          fps
        });
      } else {
        logger.error(`FFmpeg Job ${jobId} failed with exit code ${code}`);
        const errorLines = stderrBuffer.split('\n').filter(Boolean).slice(-15).join('\n');
        reject(new Error(`FFmpeg rendering failed (code ${code}):\n${errorLines}`));
      }
    });

    // Attach cancel handler
    renderVideo._activeProcesses = renderVideo._activeProcesses || {};
    renderVideo._activeProcesses[jobId] = ffmpegProcess;
    } catch (err) {
      reject(err);
    }
  });
}

function cleanupTempFiles(assPath, shortFiles = []) {
  if (assPath && fs.existsSync(assPath)) {
    try {
      fs.unlinkSync(assPath);
    } catch (e) {}
  }
  shortFiles.forEach(f => {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    } catch (e) {}
  });
}

export function cancelRenderJob(jobId) {
  if (renderVideo._activeProcesses && renderVideo._activeProcesses[jobId]) {
    try {
      logger.warn(`Killing FFmpeg process for Job ${jobId}`);
      renderVideo._activeProcesses[jobId].kill('SIGKILL');
      delete renderVideo._activeProcesses[jobId];
      return true;
    } catch (err) {
      logger.error(`Error killing Job ${jobId}:`, err);
    }
  }
  return false;
}
