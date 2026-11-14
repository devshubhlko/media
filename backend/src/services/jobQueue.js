import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { renderVideo, cancelRenderJob } from './ffmpegService.js';
import { EXPORT_DIR } from '../config.js';
import { logger } from '../utils/logger.js';

class JobQueue {
  constructor() {
    this.jobs = new Map();
    this.queue = [];
    this.currentRunningJobId = null;
  }

  createJob({ timeline, audio, captionsEnabled, subtitleSegments, captionSettings, exportSettings }) {
    const jobId = uuidv4();
    const outputPath = path.join(EXPORT_DIR, `export_${jobId}.mp4`);

    const job = {
      id: jobId,
      status: 'queued', // queued | rendering | completed | failed | cancelled
      progress: {
        percent: 0,
        currentTime: 0,
        totalDuration: 0,
        fps: 0,
        speed: '0x'
      },
      payload: {
        timeline,
        audio,
        captionsEnabled,
        subtitleSegments,
        captionSettings,
        exportSettings
      },
      outputPath,
      error: null,
      result: null,
      createdAt: Date.now(),
      sseClients: new Set()
    };

    this.jobs.set(jobId, job);
    this.queue.push(jobId);
    logger.info(`Job ${jobId} created and enqueued. Queue length: ${this.queue.length}`);

    // Trigger queue processing
    setTimeout(() => this.processNext(), 0);

    return job;
  }

  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  async processNext() {
    if (this.currentRunningJobId) {
      logger.debug(`Renderer is currently busy with Job ${this.currentRunningJobId}`);
      return;
    }

    if (this.queue.length === 0) {
      return;
    }

    const nextJobId = this.queue.shift();
    const job = this.jobs.get(nextJobId);

    if (!job || job.status === 'cancelled') {
      return this.processNext();
    }

    this.currentRunningJobId = nextJobId;
    job.status = 'rendering';
    this.broadcast(job.id, 'status', { status: 'rendering', message: 'FFmpeg rendering started' });

    try {
      logger.info(`Starting rendering for Job ${job.id}`);
      const result = await renderVideo({
        jobId: job.id,
        timeline: job.payload.timeline,
        audioPath: job.payload.audio.path,
        captionsEnabled: job.payload.captionsEnabled,
        subtitleSegments: job.payload.subtitleSegments,
        captionSettings: job.payload.captionSettings,
        exportSettings: job.payload.exportSettings,
        outputPath: job.outputPath,
        tempDir: EXPORT_DIR,
        onProgress: (prog) => {
          job.progress = { ...job.progress, ...prog };
          this.broadcast(job.id, 'progress', job.progress);
        },
        onLog: (logStr) => {
          // Can send debug logs if client requested
        }
      });

      job.status = 'completed';
      job.result = {
        jobId: job.id,
        filename: path.basename(job.outputPath),
        downloadUrl: `/api/export/${job.id}/download`,
        duration: result.duration,
        width: result.width,
        height: result.height,
        fps: result.fps
      };

      this.broadcast(job.id, 'completed', job.result);
      logger.info(`Job ${job.id} rendered successfully.`);
    } catch (err) {
      logger.error(`Job ${job.id} failed:`, err);
      job.status = 'failed';
      job.error = err.message || 'Unknown rendering error';
      this.broadcast(job.id, 'error', { error: job.error });
    } finally {
      this.currentRunningJobId = null;
      // Close SSE connections for this job after a short delay
      setTimeout(() => {
        job.sseClients.forEach(res => {
          try {
            res.end();
          } catch (e) {}
        });
        job.sseClients.clear();
      }, 5000);

      // Process next job in queue if any
      this.processNext();
    }
  }

  cancel(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (this.currentRunningJobId === jobId) {
      cancelRenderJob(jobId);
      this.currentRunningJobId = null;
    }

    job.status = 'cancelled';
    this.broadcast(jobId, 'cancelled', { message: 'Job was cancelled by user' });

    // Remove from queue if still queued
    this.queue = this.queue.filter(id => id !== jobId);
    setTimeout(() => this.processNext(), 0);
    return true;
  }

  subscribe(jobId, res) {
    const job = this.jobs.get(jobId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    res.write(`data: ${JSON.stringify({ type: 'init', status: job.status, progress: job.progress, error: job.error, result: job.result })}\n\n`);

    job.sseClients.add(res);

    res.on('close', () => {
      job.sseClients.delete(res);
    });
  }

  broadcast(jobId, eventType, data) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const payload = JSON.stringify({ type: eventType, data });
    job.sseClients.forEach(client => {
      try {
        client.write(`data: ${payload}\n\n`);
      } catch (err) {
        job.sseClients.delete(client);
      }
    });
  }
}

export const jobQueue = new JobQueue();
