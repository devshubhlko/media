import { ref, computed } from 'vue';

// Global singleton timeline state
const scriptText = ref('');
const scriptFilename = ref('');
const wordCount = ref(0);
const characterCount = ref(0);

const audioFile = ref(null);
const subtitleFile = ref(null);
const subtitleSegments = ref([]);
const captionsEnabled = ref(true);
const isDarkMode = ref(false); // Light Mode default!

const captionSettings = ref({
  fontFamily: 'Gotu',
  fontSize: 48,
  fontColor: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 2,
  position: 'bottom', // 'bottom' | 'middle' | 'top' | 'custom'
  customPosition: { x: 50, y: 85 },
  background: 'none',   // 'box' | 'shadow' | 'none'
  boxColor: '#000000',
  boxOpacity: 0.7,
  animation: 'none',    // 'none' | 'fade' | 'slide' | 'karaoke' | 'typewriter'
  karaokeColor: '#FACC15'
});

const exportSettings = ref({
  resolution: '720p',  // '720p' | '1080p'
  aspectRatio: '16:9', // '16:9' | '9:16' | '1:1'
  fps: 30              // 24 | 30 | 60
});

// Image Slots array
const slots = ref([]);

/**
 * Smart Subtitle Text Auto-Wrapper:
 * Breaks long lines (e.g. Hindi Devanagari or English sentences) into balanced 2 (or more) lines.
 * Exactly matches backend ASS \N splitting so preview and export video match 1:1.
 */
export function wrapSubtitleText(text, aspectRatio = '16:9') {
  if (!text) return '';
  let maxChars = 34;
  if (aspectRatio === '9:16') {
    maxChars = 22; // 9:16 vertical
  } else if (aspectRatio === '1:1') {
    maxChars = 26; // 1:1 square
  } else {
    maxChars = 34; // 16:9 landscape
  }

  const rawLines = text.split(/\r?\n|\\N/);
  const resultLines = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.length <= maxChars) {
      resultLines.push(trimmed);
      continue;
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length <= 1) {
      resultLines.push(trimmed);
      continue;
    }

    // If it fits nicely into 2 balanced lines (<= maxChars * 2 + 6)
    if (trimmed.length <= maxChars * 2 + 6) {
      const targetMid = trimmed.length / 2;
      let bestIdx = 1;
      let minDiff = Infinity;
      let runningLen = 0;
      for (let i = 0; i < words.length - 1; i++) {
        runningLen += words[i].length + (i > 0 ? 1 : 0);
        const diff = Math.abs(runningLen - targetMid);
        if (diff < minDiff) {
          minDiff = diff;
          bestIdx = i + 1;
        }
      }
      resultLines.push(words.slice(0, bestIdx).join(' '));
      resultLines.push(words.slice(bestIdx).join(' '));
    } else {
      let curLine = '';
      for (const w of words) {
        if (!curLine) {
          curLine = w;
        } else if ((curLine + ' ' + w).length <= maxChars) {
          curLine += ' ' + w;
        } else {
          resultLines.push(curLine);
          curLine = w;
        }
      }
      if (curLine) resultLines.push(curLine);
    }
  }

  return resultLines.join('\n');
}

// Sentence end detector for subtitles: detects '.', '|', '।', '॥', '!', '?'
export function extractSentencesFromSubtitles(segments = []) {
  if (!segments || segments.length === 0) return [];

  const sentences = [];
  let currentGroup = {
    startTime: null,
    endTime: null,
    texts: [],
    cueIndices: []
  };

  const sentenceEndRegex = /[.।|!?]/;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (currentGroup.startTime === null) {
      currentGroup.startTime = seg.startTime;
    }
    currentGroup.endTime = seg.endTime;
    currentGroup.texts.push(seg.text);
    currentGroup.cueIndices.push(seg.index || (i + 1));

    // If cue contains sentence end (. | । ॥ ! ?), or is the final cue
    if (sentenceEndRegex.test(seg.text) || i === segments.length - 1) {
      const fullText = currentGroup.texts.join(' ').trim();
      if (fullText) {
        const start = currentGroup.startTime;
        const end = currentGroup.endTime;
        sentences.push({
          sentenceIndex: sentences.length + 1,
          startTime: parseFloat(start.toFixed(2)),
          endTime: parseFloat(end.toFixed(2)),
          duration: parseFloat(Math.max(0.5, end - start).toFixed(2)),
          text: fullText
        });
      }
      currentGroup = {
        startTime: null,
        endTime: null,
        texts: [],
        cueIndices: []
      };
    }
  }

  return sentences;
}

const detectedSubtitleSentences = computed(() => extractSentencesFromSubtitles(subtitleSegments.value));
const subtitleSentenceCount = computed(() => detectedSubtitleSentences.value.length);
const limitSlotsToSentences = ref(false);

// Notification / Toast state
const notifications = ref([]);

export function useTimeline() {
  function addNotification(type, message, duration = 4500) {
    const id = Date.now() + Math.random();
    const timer = setTimeout(() => {
      removeNotification(id);
    }, duration);
    notifications.value.push({ id, type, message, timer, duration });
  }

  function removeNotification(id) {
    const item = notifications.value.find(n => n.id === id);
    if (item && item.timer) {
      clearTimeout(item.timer);
    }
    notifications.value = notifications.value.filter(n => n.id !== id);
  }

  // Set script
  function setScript(text, filename = '') {
    scriptText.value = text || '';
    scriptFilename.value = filename || '';
    const trimmed = (text || '').trim();
    wordCount.value = trimmed ? trimmed.split(/\s+/).length : 0;
    characterCount.value = trimmed.length;
  }

  // Set audio and automatically distribute slots across audio duration (no extra duration!)
  function setAudio(audioData) {
    audioFile.value = audioData;
    if (audioData?.duration > 0) {
      if (slots.value.length === 0) {
        createDefaultSlots(1);
      } else {
        recalculateTimings();
      }
      addNotification('success', `Audio loaded (${audioData.duration.toFixed(1)}s). ${slots.value.length} slot(s) synced to audio duration.`);
    }
  }

  // Ensure slots fit target duration
  function fitSlotsToDuration(targetDuration) {
    const target = parseFloat(targetDuration);
    if (isNaN(target) || target <= 0) return;
    recalculateTimings();
    addNotification('success', `Timeline configured to match ${target.toFixed(1)}s.`);
  }

  // Theme management: Strictly Light Mode always
  function toggleTheme() {
    // Disabled: permanent light mode
    isDarkMode.value = false;
    applyTheme();
  }

  function initTheme() {
    isDarkMode.value = false;
    try {
      localStorage.setItem('theme', 'light');
    } catch (e) {}
    applyTheme();
  }

  function applyTheme() {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }
  }

  // Set subtitles
  function setSubtitles(fileInfo, segments = []) {
    subtitleFile.value = fileInfo;
    subtitleSegments.value = segments;
  }

  // Auto populate fixed 10-second slots to cover subtitle duration
  function populateSlotsFromSubtitles() {
    if (!subtitleSegments.value || subtitleSegments.value.length === 0) {
      addNotification('warning', 'No subtitle segments found to create slots.');
      return;
    }

    const lastSeg = subtitleSegments.value[subtitleSegments.value.length - 1];
    const totalSubDuration = lastSeg ? lastSeg.endTime : 0;
    const effectiveDuration = audioFile.value?.duration > 0
      ? Math.max(totalSubDuration, audioFile.value.duration)
      : totalSubDuration;

    const fixedDur = 10;
    const neededCount = Math.max(1, Math.ceil(effectiveDuration / fixedDur));

    const oldSlotsMap = new Map();
    slots.value.forEach(s => {
      if (s.imageUrl) {
        oldSlotsMap.set(s.sceneNumber, {
          imagePath: s.imagePath,
          imageUrl: s.imageUrl,
          imageName: s.imageName
        });
      }
    });

    const newSlots = [];
    for (let i = 0; i < neededCount; i++) {
      const sceneNum = i + 1;
      const startTime = parseFloat((i * fixedDur).toFixed(2));
      const endTime = parseFloat(((i + 1) * fixedDur).toFixed(2));
      const preserved = oldSlotsMap.get(sceneNum);

      // Collect subtitle text falling in this 10s slot
      const overlappingText = subtitleSegments.value
        .filter(s => s.startTime < endTime && s.endTime > startTime)
        .map(s => s.text)
        .join(' ');

      newSlots.push({
        id: `slot_${sceneNum}_${Date.now()}_${i}`,
        sceneNumber: sceneNum,
        startTime,
        endTime,
        duration: fixedDur,
        imagePath: preserved?.imagePath || null,
        imageUrl: preserved?.imageUrl || null,
        imageName: preserved?.imageName || null,
        subtitleText: overlappingText || ''
      });
    }

    slots.value = newSlots;
    addNotification('success', `Created ${newSlots.length} image slots (10s each) synced to subtitles (${effectiveDuration.toFixed(1)}s).`);
  }

  // Create image slots matching detected subtitle sentences (ends with '.', '|', '।')
  function createSlotsFromSubtitleSentences(maxCount = null) {
    const sList = detectedSubtitleSentences.value;
    if (!sList || sList.length === 0) {
      addNotification('warning', 'No sentences found in subtitles. Subtitles must contain "." or "|" or "।".');
      return;
    }

    const count = Math.max(1, Math.min(sList.length, maxCount || sList.length));
    const audioDur = audioFile.value?.duration > 0 ? parseFloat(audioFile.value.duration) : 0;

    const oldSlotsMap = new Map();
    slots.value.forEach(s => {
      if (s.imageUrl) {
        oldSlotsMap.set(s.sceneNumber, {
          imagePath: s.imagePath,
          imageUrl: s.imageUrl,
          imageName: s.imageName
        });
      }
    });

    const newSlots = [];
    for (let i = 0; i < count; i++) {
      const sceneNum = i + 1;
      const item = sList[i];
      const preserved = oldSlotsMap.get(sceneNum);

      let startTime = item.startTime;
      let endTime = item.endTime;
      let duration = item.duration;

      // If this is the final slot and audio is loaded, lock it to end at audio duration
      if (i === count - 1 && audioDur > 0) {
        endTime = parseFloat(audioDur.toFixed(2));
        duration = parseFloat(Math.max(0.5, endTime - startTime).toFixed(2));
      }

      newSlots.push({
        id: `slot_${sceneNum}_${Date.now()}_${i}`,
        sceneNumber: sceneNum,
        startTime,
        endTime,
        duration,
        imagePath: preserved?.imagePath || null,
        imageUrl: preserved?.imageUrl || null,
        imageName: preserved?.imageName || null,
        subtitleText: item.text || ''
      });
    }

    slots.value = newSlots;
    addNotification('success', `Created ${count} image slot(s) synced to subtitle sentences.`);
  }

  // Create default slots (Default: 1 slot covering timeline)
  function createDefaultSlots(count = 1) {
    const newSlots = [];

    for (let i = 0; i < count; i++) {
      const text = detectedSubtitleSentences.value[i]?.text || '';
      newSlots.push({
        id: `slot_${i + 1}_${Date.now()}_${i}`,
        sceneNumber: i + 1,
        startTime: 0,
        endTime: 0,
        duration: 0,
        imagePath: null,
        imageUrl: null,
        imageName: null,
        subtitleText: text
      });
    }

    slots.value = newSlots;
    recalculateTimings();
  }

  // Recalculates slot timings:
  // If audio exists, slots divide audio duration equally so total duration NEVER exceeds audio!
  // If no audio, default to 10s per slot.
  function recalculateTimings() {
    if (slots.value.length === 0) return;

    const audioDur = audioFile.value?.duration > 0 ? parseFloat(audioFile.value.duration) : 0;

    if (audioDur > 0) {
      const count = slots.value.length;
      const baseSlotDur = parseFloat((audioDur / count).toFixed(2));
      let currentStart = 0;

      slots.value.forEach((slot, index) => {
        slot.sceneNumber = index + 1;
        slot.startTime = parseFloat(currentStart.toFixed(2));

        if (index === count - 1) {
          // Final slot ends exactly at audio duration to avoid floating point drift
          slot.endTime = parseFloat(audioDur.toFixed(2));
          slot.duration = parseFloat(Math.max(0.1, audioDur - currentStart).toFixed(2));
        } else {
          slot.duration = baseSlotDur;
          currentStart += baseSlotDur;
          slot.endTime = parseFloat(currentStart.toFixed(2));
        }
      });
    } else {
      // Fallback when no audio is loaded yet (10s fixed)
      const fixedDur = 10;
      slots.value.forEach((slot, index) => {
        slot.sceneNumber = index + 1;
        slot.duration = fixedDur;
        slot.startTime = parseFloat((index * fixedDur).toFixed(2));
        slot.endTime = parseFloat(((index + 1) * fixedDur).toFixed(2));
      });
    }
  }

  // Assign image to a specific slot
  function assignImageToSlot(slotId, imageData) {
    const slot = slots.value.find(s => s.id === slotId);
    if (slot) {
      slot.imagePath = imageData.path;
      slot.imageUrl = imageData.url;
      slot.imageName = imageData.originalName;
      addNotification('success', `Image assigned to Scene #${slot.sceneNumber}`);
    }
  }

  // Remove image from a specific slot
  function removeImageFromSlot(slotId) {
    const slot = slots.value.find(s => s.id === slotId);
    if (slot) {
      slot.imagePath = null;
      slot.imageUrl = null;
      slot.imageName = null;
      addNotification('info', `Image removed from Scene #${slot.sceneNumber}`);
    }
  }

  // Add a new empty slot: automatically redistributes timings within audio duration (no extra duration!)
  function addSlot() {
    if (limitSlotsToSentences.value && subtitleSentenceCount.value > 0 && slots.value.length >= subtitleSentenceCount.value) {
      addNotification('warning', `Maximum ${subtitleSentenceCount.value} slot(s) reached based on subtitle sentences.`);
      return false;
    }

    const sceneNumber = slots.value.length + 1;
    const associatedText = detectedSubtitleSentences.value[sceneNumber - 1]?.text || '';

    slots.value.push({
      id: `slot_${sceneNumber}_${Date.now()}_${Math.random()}`,
      sceneNumber,
      startTime: 0,
      endTime: 0,
      duration: 0,
      imagePath: null,
      imageUrl: null,
      imageName: null,
      subtitleText: associatedText
    });

    recalculateTimings();

    const currentDur = slots.value[slots.value.length - 1].duration;
    addNotification('info', `Added Scene #${sceneNumber} (${currentDur.toFixed(1)}s). Total: ${totalTimelineDuration.value.toFixed(1)}s`);
    return true;
  }

  // Remove the last slot (Minimum 1 slot)
  function removeLastSlot() {
    if (slots.value.length <= 1) {
      addNotification('warning', 'Minimum 1 image slot is required.');
      return false;
    }
    slots.value.pop();
    recalculateTimings();
    addNotification('info', `Scene removed. Total slots: ${slots.value.length}`);
    return true;
  }

  // Remove a slot
  function removeSlot(slotId) {
    if (slots.value.length <= 1) {
      addNotification('warning', 'Timeline must have at least one slot.');
      return;
    }
    slots.value = slots.value.filter(s => s.id !== slotId);
    recalculateTimings();
    addNotification('info', 'Scene removed and timeline adjusted to fit audio.');
  }

  // Update a slot's duration
  function updateSlotDuration(slotId, newDuration) {
    const slot = slots.value.find(s => s.id === slotId);
    if (!slot) return;
    const dur = Math.max(0.5, parseFloat(newDuration) || 1);
    slot.duration = dur;
    recalculateTimings();
  }

  // Assign multiple images batch to available empty or sequential slots (locked to audio duration)
  function assignBatchImages(images = []) {
    if (!images || images.length === 0) return;

    let imgIdx = 0;
    // 1. First assign to slots without an image
    for (let i = 0; i < slots.value.length && imgIdx < images.length; i++) {
      if (!slots.value[i].imageUrl) {
        slots.value[i].imagePath = images[imgIdx].path;
        slots.value[i].imageUrl = images[imgIdx].url;
        slots.value[i].imageName = images[imgIdx].originalName;
        imgIdx++;
      }
    }
    // 2. If remaining images, add new slots for them
    while (imgIdx < images.length) {
      const sceneNumber = slots.value.length + 1;
      const associatedText = detectedSubtitleSentences.value[sceneNumber - 1]?.text || '';

      slots.value.push({
        id: `slot_${sceneNumber}_${Date.now()}_${imgIdx}`,
        sceneNumber,
        startTime: 0,
        endTime: 0,
        duration: 0,
        imagePath: images[imgIdx].path,
        imageUrl: images[imgIdx].url,
        imageName: images[imgIdx].originalName,
        subtitleText: associatedText
      });
      imgIdx++;
    }

    // Recalculate timings so all slots evenly divide the audio duration (no extra duration!)
    recalculateTimings();

    addNotification('success', `Assigned ${images.length} images. ${slots.value.length} slots fit within ${totalTimelineDuration.value.toFixed(1)}s.`);
  }

  // Total duration of image timeline
  const totalTimelineDuration = computed(() => {
    if (audioFile.value && audioFile.value.duration > 0) {
      return audioFile.value.duration;
    }
    if (slots.value.length === 0) return 0;
    const last = slots.value[slots.value.length - 1];
    return last ? last.endTime : 0;
  });

  // Check if all slots have an image assigned
  const allSlotsHaveImages = computed(() => {
    return slots.value.length > 0 && slots.value.every(s => Boolean(s.imagePath));
  });

  // Reset entire project state (re-creates 1 default slot)
  function resetAll() {
    scriptText.value = '';
    scriptFilename.value = '';
    wordCount.value = 0;
    characterCount.value = 0;
    audioFile.value = null;
    subtitleFile.value = null;
    subtitleSegments.value = [];
    createDefaultSlots(1);
    addNotification('info', 'Project reset.');
  }

  return {
    scriptText,
    scriptFilename,
    wordCount,
    characterCount,
    detectedSubtitleSentences,
    subtitleSentenceCount,
    limitSlotsToSentences,
    audioFile,
    subtitleFile,
    subtitleSegments,
    captionsEnabled,
    captionSettings,
    exportSettings,
    slots,
    notifications,
    totalTimelineDuration,
    allSlotsHaveImages,
    isDarkMode,
    toggleTheme,
    initTheme,
    extractSentencesFromSubtitles,
    fitSlotsToDuration,
    addNotification,
    removeNotification,
    setScript,
    setAudio,
    setSubtitles,
    populateSlotsFromSubtitles,
    createDefaultSlots,
    createSlotsFromSubtitleSentences,
    assignImageToSlot,
    removeImageFromSlot,
    addSlot,
    removeSlot,
    removeLastSlot,
    updateSlotDuration,
    assignBatchImages,
    resetAll
  };
}
