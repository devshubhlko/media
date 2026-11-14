import fs from 'fs';

export const RESOLUTION_PRESETS = {
  '16:9': {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 }
  },
  '9:16': {
    '720p': { width: 720, height: 1280 },
    '1080p': { width: 1080, height: 1920 }
  },
  '1:1': {
    '720p': { width: 720, height: 720 },
    '1080p': { width: 1080, height: 1080 }
  }
};

export const ALLOWED_FPS = [24, 30, 60];

export function validateExportPayload(payload) {
  const errors = [];

  if (!payload) {
    return { valid: false, errors: ['Request body is empty'] };
  }

  const { timeline, audio, exportSettings } = payload;

  // 1. Validate export settings
  if (!exportSettings) {
    errors.push('Export settings are required.');
  } else {
    const { aspectRatio = '16:9', resolution = '720p', fps = 30 } = exportSettings;
    if (!RESOLUTION_PRESETS[aspectRatio]) {
      errors.push(`Invalid aspect ratio: ${aspectRatio}. Allowed: 16:9, 9:16, 1:1.`);
    } else if (!RESOLUTION_PRESETS[aspectRatio][resolution]) {
      errors.push(`Invalid resolution: ${resolution}. Allowed: 720p, 1080p.`);
    }
    if (!ALLOWED_FPS.includes(Number(fps))) {
      errors.push(`Invalid FPS: ${fps}. Allowed: 24, 30, 60.`);
    }
  }

  // 2. Validate audio
  if (!audio || !audio.path) {
    errors.push('Audio file is required for video export.');
  } else if (!fs.existsSync(audio.path)) {
    errors.push(`Audio file not found on server at: ${audio.path}`);
  }

  // 3. Validate timeline slots
  if (!timeline || !Array.isArray(timeline.slots) || timeline.slots.length === 0) {
    errors.push('Timeline must contain at least one image slot.');
  } else {
    timeline.slots.forEach((slot, index) => {
      const slotNum = slot.sceneNumber || (index + 1);
      if (!slot.imagePath) {
        errors.push(`Scene #${slotNum} has no image assigned.`);
      } else if (!fs.existsSync(slot.imagePath)) {
        errors.push(`Scene #${slotNum} image file does not exist on server: ${slot.imagePath}`);
      }

      const duration = Number(slot.duration);
      if (isNaN(duration) || duration <= 0) {
        errors.push(`Scene #${slotNum} has invalid duration (${slot.duration}s). Duration must be greater than 0.`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
