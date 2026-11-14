import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export const PORT = process.env.PORT || 5000;
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

export const UPLOAD_DIR = path.resolve(rootDir, 'temp', 'uploads');
export const EXPORT_DIR = path.resolve(rootDir, 'temp', 'exports');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

// Resolve FFmpeg path - prefer system ffmpeg with libharfbuzz for proper Hindi / Devanagari text shaping
export function getFfmpegPath() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  try {
    const cmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
    const sysPath = execSync(cmd, { encoding: 'utf8' }).trim().split(/[\r\n]+/)[0];
    if (sysPath && fs.existsSync(sysPath)) {
      return sysPath;
    }
  } catch (e) {}

  if (ffmpegInstaller && ffmpegInstaller.path && fs.existsSync(ffmpegInstaller.path)) {
    return ffmpegInstaller.path;
  }
  return 'ffmpeg';
}

// Resolve FFprobe path - prefer system ffprobe
export function getFfprobePath() {
  if (process.env.FFPROBE_PATH && fs.existsSync(process.env.FFPROBE_PATH)) {
    return process.env.FFPROBE_PATH;
  }
  try {
    const cmd = process.platform === 'win32' ? 'where ffprobe' : 'which ffprobe';
    const sysPath = execSync(cmd, { encoding: 'utf8' }).trim().split(/[\r\n]+/)[0];
    if (sysPath && fs.existsSync(sysPath)) {
      return sysPath;
    }
  } catch (e) {}

  if (ffprobeInstaller && ffprobeInstaller.path && fs.existsSync(ffprobeInstaller.path)) {
    return ffprobeInstaller.path;
  }
  return 'ffprobe';
}

export const FFMPEG_PATH = getFfmpegPath();
export const FFPROBE_PATH = getFfprobePath();

// Temporary file retention in minutes (default 60 mins)
export const FILE_TTL_MINUTES = parseInt(process.env.FILE_TTL_MINUTES || '60', 10);
