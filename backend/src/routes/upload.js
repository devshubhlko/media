import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { UPLOAD_DIR } from '../config.js';
import { getAudioInfo } from '../services/ffmpegService.js';
import { parseSubtitleFile } from '../services/subtitleParser.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase().slice(0, 8);
    const rawBase = path.basename(file.originalname, ext);
    const safeBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 24);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${safeBase || 'asset'}-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

/**
 * 1. Script Upload (TXT or text payload)
 */
router.post('/script', upload.single('scriptFile'), (req, res) => {
  try {
    let scriptText = '';
    let filename = null;

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (ext !== '.txt') {
        return res.status(400).json({ error: 'Please upload a plain text (.txt) file.' });
      }
      scriptText = fs.readFileSync(req.file.path, 'utf8');
      filename = req.file.originalname;
    } else if (req.body && req.body.scriptText) {
      scriptText = req.body.scriptText;
    } else {
      return res.status(400).json({ error: 'No script file or text provided.' });
    }

    // Retain exact Hindi text without altering
    const trimmed = scriptText.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const characters = trimmed.length;

    res.json({
      success: true,
      text: scriptText,
      filename,
      wordCount: words,
      characterCount: characters
    });
  } catch (err) {
    logger.error('Error handling script upload:', err);
    res.status(500).json({ error: `Failed to process script: ${err.message}` });
  }
});

/**
 * 2. Audio Upload (MP3, WAV)
 */
router.post('/audio', upload.single('audioFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext)) {
      return res.status(400).json({
        error: `Unsupported audio format: ${ext}. Supported formats: MP3, WAV.`
      });
    }

    const audioPath = req.file.path;
    logger.info(`Analyzing audio file with ffprobe: ${req.file.originalname}`);

    const audioInfo = await getAudioInfo(audioPath);

    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: audioPath,
      url: `/uploads/${req.file.filename}`,
      duration: audioInfo.duration,
      codec: audioInfo.codec,
      sampleRate: audioInfo.sampleRate,
      channels: audioInfo.channels,
      size: audioInfo.size
    });
  } catch (err) {
    logger.error('Audio upload/analysis error:', err);
    res.status(400).json({ error: err.message || 'Failed to analyze audio file with FFprobe.' });
  }
});

/**
 * 3. Subtitle Upload (SRT, VTT, BTT)
 */
router.post('/subtitles', upload.single('subtitleFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No subtitle file uploaded.' });
    }

    const parsed = parseSubtitleFile(req.file.path, req.file.originalname);

    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      format: parsed.format,
      count: parsed.count,
      totalDuration: parsed.totalDuration,
      segments: parsed.segments
    });
  } catch (err) {
    logger.error('Subtitle parse error:', err);
    res.status(400).json({ error: err.message || 'Failed to parse subtitle file.' });
  }
});

/**
 * 4. Single Image Upload (for a timeline slot)
 */
router.post('/image', upload.single('imageFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'].includes(ext)) {
      return res.status(400).json({
        error: `Invalid image format: ${ext}. Supported formats: JPG, PNG, WEBP, BMP, GIF.`
      });
    }

    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      url: `/uploads/${req.file.filename}`
    });
  } catch (err) {
    logger.error('Image upload error:', err);
    res.status(500).json({ error: `Image upload failed: ${err.message}` });
  }
});

/**
 * 5. Batch Images Upload (multi-file upload)
 */
router.post('/images-batch', upload.array('imageFiles', 50), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded.' });
    }

    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'];
    const uploadedImages = [];

    req.files.forEach(file => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (validExtensions.includes(ext)) {
        uploadedImages.push({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          url: `/uploads/${file.filename}`
        });
      }
    });

    res.json({
      success: true,
      count: uploadedImages.length,
      images: uploadedImages
    });
  } catch (err) {
    logger.error('Batch image upload error:', err);
    res.status(500).json({ error: `Batch image upload failed: ${err.message}` });
  }
});

export default router;
