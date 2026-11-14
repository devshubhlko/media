import express from 'express';
import { generateSpeechifyTts, SPEECHIFY_VOICES } from '../services/speechifyService.js';
import { generateEdgeTts, EDGE_VOICES } from '../services/edgeTtsService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/tts/voices
 * Return all supported voices for Speechify and Edge TTS
 */
router.get('/voices', (req, res) => {
  res.json({
    success: true,
    voices: {
      speechify: SPEECHIFY_VOICES,
      edge: EDGE_VOICES
    }
  });
});

/**
 * POST /api/tts/generate-stream
 * Server-Sent Events (SSE) streaming endpoint for real-time progress + audio & subtitle delivery
 */
router.post('/generate-stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const sendEvent = (obj) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    }
  };

  try {
    const { service = 'speechify', text, voice, prosody = {} } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      sendEvent({ type: 'error', error: 'Input text is required and cannot be empty.' });
      return res.end();
    }

    const onProgress = (evt) => {
      sendEvent(evt);
    };

    let result;
    if (service.toLowerCase() === 'edge') {
      result = await generateEdgeTts({ text, voice, prosody, onProgress });
    } else {
      result = await generateSpeechifyTts({ text, voice, onProgress });
    }

    sendEvent({
      type: 'complete',
      success: true,
      ...result
    });

    res.end();
  } catch (err) {
    logger.error('[TTS Stream Error]:', err);
    sendEvent({ type: 'error', error: err.message || 'Speech synthesis failed' });
    res.end();
  }
});

/**
 * POST /api/tts/generate
 * Standard non-streaming JSON endpoint for TTS generation
 */
router.post('/generate', async (req, res) => {
  try {
    const { service = 'speechify', text, voice, prosody = {} } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Input text is required and cannot be empty.' });
    }

    let result;
    if (service.toLowerCase() === 'edge') {
      result = await generateEdgeTts({ text, voice, prosody });
    } else {
      result = await generateSpeechifyTts({ text, voice });
    }

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    logger.error('[TTS Generate Error]:', err);
    res.status(500).json({ error: err.message || 'Speech synthesis failed' });
  }
});

export default router;
