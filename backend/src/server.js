import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PORT, CLIENT_ORIGIN, UPLOAD_DIR, EXPORT_DIR, FFMPEG_PATH, FFPROBE_PATH } from './config.js';
import uploadRouter from './routes/upload.js';
import exportRouter from './routes/export.js';
import ttsRouter from './routes/tts.js';
import { initCleanupService } from './services/cleanupService.js';
import { logger } from './utils/logger.js';
import { jobQueue } from './services/jobQueue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

const app = express();

// Middleware
app.use(cors({
  origin: CLIENT_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploads and exports preview/download
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/exports', express.static(EXPORT_DIR));

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/export', exportRouter);
app.use('/api/tts', ttsRouter);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    ffmpeg: {
      path: FFMPEG_PATH,
      available: fs.existsSync(FFMPEG_PATH)
    },
    ffprobe: {
      path: FFPROBE_PATH,
      available: fs.existsSync(FFPROBE_PATH)
    },
    activeJobId: jobQueue.currentRunningJobId,
    queuedJobs: jobQueue.queue.length
  });
});

// Serve frontend SPA in production if build exists
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/exports')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // Root Welcome Page
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Antigravity Video Backend API</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0c0f17; color: #f1f5f9; padding: 3rem; margin: 0; }
          .card { max-width: 600px; margin: 0 auto; background: #131824; border: 1px solid #273147; border-radius: 12px; padding: 2rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          h1 { color: #818cf8; font-size: 1.5rem; margin-top: 0; }
          p { color: #94a3b8; font-size: 0.95rem; line-height: 1.6; }
          .status { display: inline-flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.15); color: #34d399; padding: 4px 10px; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; margin-bottom: 1rem; }
          .dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; }
          .btn { display: inline-block; background: #4f46e5; color: #fff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 0.85rem; font-weight: 600; margin-top: 1rem; margin-right: 0.5rem; }
          .btn-sec { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
          code { background: #0a0d14; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #38bdf8; font-size: 0.85rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="status"><span class="dot"></span> Backend Active & Healthy</div>
          <h1>Antigravity Video Studio API</h1>
          <p>This is the Node.js + Express + FFmpeg video generation backend server running on port <code>5000</code>.</p>
          <p>To use the Video Creation Studio with the visual timeline, preview player, and export tools, open the frontend:</p>
          <a href="http://localhost:5173" class="btn">Open Frontend Studio (localhost:5173)</a>
          <a href="/api/health" class="btn btn-sec">Check API Health</a>
        </div>
      </body>
      </html>
    `);
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start Background Cleanup Service
initCleanupService(15);

// Start Server
const server = app.listen(PORT, () => {
  logger.info(`Video Generator Backend running on http://localhost:${PORT}`);
  logger.info(`FFmpeg path: ${FFMPEG_PATH}`);
  logger.info(`FFprobe path: ${FFPROBE_PATH}`);
  logger.info(`Uploads directory: ${UPLOAD_DIR}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use. Please terminate any process using port ${PORT} or configure a different PORT in backend/.env`);
    process.exit(1);
  } else {
    logger.error('Server error:', err);
  }
});

