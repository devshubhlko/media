import express from 'express';
import fs from 'fs';
import path from 'path';
import { jobQueue } from '../services/jobQueue.js';
import { validateExportPayload } from '../utils/validator.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Trigger MP4 Video Export
 */
router.post('/', (req, res) => {
  try {
    const validation = validateExportPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    const {
      timeline,
      audio,
      captionsEnabled = false,
      subtitleSegments = [],
      captionSettings = {},
      exportSettings = {}
    } = req.body;

    const job = jobQueue.createJob({
      timeline,
      audio,
      captionsEnabled,
      subtitleSegments,
      captionSettings,
      exportSettings
    });

    res.json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: 'Video rendering queued successfully.'
    });
  } catch (err) {
    logger.error('Export request error:', err);
    res.status(500).json({ error: `Failed to queue export: ${err.message}` });
  }
});

/**
 * SSE Real-time Progress Stream
 */
router.get('/:jobId/progress', (req, res) => {
  const { jobId } = req.params;
  const job = jobQueue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  jobQueue.subscribe(jobId, res);
});

/**
 * Get Job Status (Polling fallback)
 */
router.get('/:jobId/status', (req, res) => {
  const { jobId } = req.params;
  const job = jobQueue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error,
    result: job.result,
    createdAt: job.createdAt
  });
});

/**
 * Cancel Render Job
 */
router.post('/:jobId/cancel', (req, res) => {
  const { jobId } = req.params;
  const cancelled = jobQueue.cancel(jobId);

  if (!cancelled) {
    return res.status(404).json({ error: 'Job not found or already finished' });
  }

  res.json({ success: true, message: `Job ${jobId} cancelled.` });
});

/**
 * Download Rendered MP4
 */
router.get('/:jobId/download', (req, res) => {
  const { jobId } = req.params;
  const job = jobQueue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found or expired' });
  }

  if (job.status !== 'completed' || !job.outputPath || !fs.existsSync(job.outputPath)) {
    return res.status(400).json({ error: 'Video file is not ready or does not exist.' });
  }

  const filename = `video_${job.payload.exportSettings?.aspectRatio || '16-9'}_${job.payload.exportSettings?.resolution || '720p'}_${Date.now()}.mp4`.replace(':', '-');

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const fileStream = fs.createReadStream(job.outputPath);
  fileStream.pipe(res);

  fileStream.on('error', err => {
    logger.error(`Error streaming file for download ${jobId}:`, err);
    if (!res.headersSent) {
      res.status(500).send('Error downloading file');
    }
  });
});

export default router;
