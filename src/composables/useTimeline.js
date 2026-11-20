import { ref, computed, watch } from 'vue';
import { getStyleById } from '../data/reelsStyles.js';

// Global singleton timeline state
const scriptText = ref('');
const scriptFilename = ref('');
const wordCount = ref(0);
const characterCount = ref(0);

const audioFile = ref(null);
const customAudio = ref(null);
const bgVideo = ref(null);
const subtitleFile = ref(null);
const rawSubtitleSegments = ref([]);
const subtitleSegments = ref([]);
const captionsEnabled = ref(true);
const isDarkMode = ref(false); // Light Mode default!

const hasCustomAudio = computed(() => Boolean(customAudio.value && customAudio.value.path));
const audioSource = computed(() => (bgVideo.value && !hasCustomAudio.value) ? 'video' : 'custom');

// Reels Subtitle Style & Background Settings (from C:\Users\ok\Music\reels)
const selectedCaptionStyleId = ref('hindi-rozkha');
const selectedBg = ref('none'); // 'none' (Timeline Scene Images) or 'bg-minimal', 'bg-midnight', etc.
const captionScale = ref(1.0);

const captionSettings = ref({
  presetId: 'hindi-rozkha',
  styleId: 'hindi-rozkha',
  fontFamily: 'Rozha One',
  fontSize: 48,
  fontColor: '#fef08a',
  outlineColor: '#000000',
  outlineWidth: 3,
  position: 'bottom', // 'bottom' | 'middle' | 'top' | 'custom'
  customPosition: { x: 50, y: 85 },
  background: 'none',   // 'box' | 'shadow' | 'none'
  boxColor: '#000000',
  boxOpacity: 0.7,
  animation: 'pop',    // 'pop' | 'bounce' | 'karaoke' | 'fade' | 'slide' | 'typewriter' | 'none'
  karaokeColor: '#00FF66'
});

const exportSettings = ref({
  resolution: '720p',  // '720p' | '1080p'
  aspectRatio: '16:9', // '16:9' | '9:16' | '1:1'
  fps: 30              // 24 | 30 | 60
});

// Cinematic Motion & Fake Video Player Settings
const cinematicSettings = ref({
  kenBurns: true,
  filmGrain: true,
  vignette: true,
  flicker: true,
  fit: 'cover' // 'cover' | 'contain'
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

/**
 * Smart Subtitle Chunker for Caption Templates:
 * Splits subtitle cues so that each displayed cue never exceeds the template's designed word count.
 * Remaining words are carried over into subsequent timed sub-cues ("aur text hai to dusre me aaye").
 * This ensures caption template designs remain pristine without overflow, wrapping breakage, or overlapping.
 */
export function chunkSegmentsForStyle(segments, maxWords = 5) {
  if (!segments || segments.length === 0) return [];
  const limit = Math.max(1, Number(maxWords) || 5);
  const chunked = [];
  let chunkIndex = 1;

  for (const seg of segments) {
    const rawText = (seg.text || '').trim();
    if (!rawText) continue;

    // Split text into words (handling multiple spaces, newlines, tabs)
    const words = rawText.split(/\s+/).filter(Boolean);
    if (words.length <= limit) {
      chunked.push({
        ...seg,
        id: `seg_${chunkIndex}`,
        index: chunkIndex++,
        text: rawText
      });
      continue;
    }

    // Split into balanced chunks so no chunk exceeds maxWords
    const totalWords = words.length;
    const numChunks = Math.ceil(totalWords / limit);
    const wordsPerChunk = Math.ceil(totalWords / numChunks);

    const segStart = Number(seg.startTime) || 0;
    const segEnd = Number(seg.endTime) || (segStart + (Number(seg.duration) || 2));
    const totalSegDuration = Math.max(0.1, segEnd - segStart);

    let wordOffset = 0;
    for (let c = 0; c < numChunks; c++) {
      const take = Math.min(wordsPerChunk, totalWords - wordOffset);
      if (take <= 0) break;

      const chunkWords = words.slice(wordOffset, wordOffset + take);
      const chunkText = chunkWords.join(' ');

      // Proportional timing based on word count
      const chunkStart = segStart + (wordOffset / totalWords) * totalSegDuration;
      const nextWordOffset = wordOffset + take;
      const chunkEnd = (c === numChunks - 1)
        ? segEnd
        : segStart + (nextWordOffset / totalWords) * totalSegDuration;

      const duration = parseFloat(Math.max(0.05, chunkEnd - chunkStart).toFixed(3));

      chunked.push({
        ...seg,
        id: `seg_${chunkIndex}`,
        index: chunkIndex++,
        startTime: parseFloat(chunkStart.toFixed(3)),
        endTime: parseFloat(chunkEnd.toFixed(3)),
        duration,
        text: chunkText
      });

      wordOffset = nextWordOffset;
    }
  }

  return chunked;
}

/**
 * Synchronizes and formats subtitle segments according to the active caption template's word capacity
 */
export function syncSubtitleSegments() {
  const currentStyle = getStyleById(selectedCaptionStyleId.value);
  const maxWords = captionSettings.value?.maxWords || currentStyle?.maxWords || currentStyle?.defaultWords?.length || 5;
  const base = (rawSubtitleSegments.value && rawSubtitleSegments.value.length > 0)
    ? rawSubtitleSegments.value
    : subtitleSegments.value;

  if (base && base.length > 0) {
    if (rawSubtitleSegments.value.length === 0) {
      rawSubtitleSegments.value = [...base];
    }
    subtitleSegments.value = chunkSegmentsForStyle(base, maxWords);
  }
}

// Watch style changes to dynamically adapt subtitle segments to template word capacity
watch(selectedCaptionStyleId, () => {
  syncSubtitleSegments();
});

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
    customAudio.value = audioData;
    audioFile.value = audioData;
    if (audioData?.duration > 0) {
      if (slots.value.length === 0) {
        createDefaultSlots(1);
      } else {
        recalculateTimings();
      }
      if (bgVideo.value) {
        addNotification('success', `Custom audio loaded (${audioData.duration.toFixed(1)}s). Video original voice is muted!`);
      } else {
        addNotification('success', `Audio loaded (${audioData.duration.toFixed(1)}s). ${slots.value.length} slot(s) synced to audio duration.`);
      }
    }
  }

  // Remove audio (if video is active, automatically unmutes and restores video's original audio!)
  function removeAudio() {
    customAudio.value = null;
    if (bgVideo.value) {
      audioFile.value = {
        path: bgVideo.value.path,
        url: bgVideo.value.url,
        duration: bgVideo.value.duration,
        isVideoAudio: true,
        originalName: bgVideo.value.originalName
      };
      recalculateTimings();
      addNotification('info', 'Custom audio removed. Video original audio unmuted and active!');
    } else {
      audioFile.value = null;
      addNotification('info', 'Audio removed.');
    }
  }

  // Set background video (uses video's voice unless custom audio is uploaded)
  function setBgVideo(videoData) {
    if (!videoData) return;
    bgVideo.value = videoData;
    selectedBg.value = 'none';

    // Reset previous custom audio so the freshly uploaded video's real voice is used!
    customAudio.value = null;

    audioFile.value = {
      path: videoData.path,
      url: videoData.url,
      duration: videoData.duration,
      isVideoAudio: true,
      originalName: videoData.originalName
    };

    // Set 1 slot matching video duration
    slots.value = [{
      id: `slot_video_${Date.now()}`,
      sceneNumber: 1,
      startTime: 0,
      endTime: videoData.duration,
      duration: videoData.duration,
      imagePath: null,
      imageUrl: null,
      videoPath: videoData.path,
      videoUrl: videoData.url
    }];

    recalculateTimings();
    addNotification('success', `Video loaded (${videoData.duration.toFixed(1)}s). Video voice is active!`);
  }

  // Remove background video
  function removeBgVideo() {
    bgVideo.value = null;
    if (hasCustomAudio.value) {
      audioFile.value = customAudio.value;
      recalculateTimings();
      addNotification('info', 'Background video removed. Custom audio active.');
    } else {
      audioFile.value = null;
      addNotification('info', 'Background video removed.');
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
    rawSubtitleSegments.value = Array.isArray(segments) ? [...segments] : [];
    syncSubtitleSegments();
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
    slots.value = slots.value.filter(s => s.id !== slotId);
    if (slots.value.length === 0) {
      createDefaultSlots(1);
      addNotification('info', 'All images removed.');
    } else {
      recalculateTimings();
      addNotification('info', `Image removed. Remaining ${slots.value.length} image(s) auto-adjusted to music.`);
    }
  }

  // Set single image spanning 100% of audio/music
  function setSingleImage(imageData) {
    if (!imageData) return;
    if (bgVideo.value) {
      bgVideo.value = null;
      if (audioFile.value?.isVideoAudio) {
        audioFile.value = customAudio.value;
      }
    }
    const audioDur = audioFile.value?.duration > 0 ? parseFloat(audioFile.value.duration) : 10;
    slots.value = [{
      id: `slot_1_${Date.now()}`,
      sceneNumber: 1,
      startTime: 0,
      endTime: audioDur,
      duration: audioDur,
      imagePath: imageData.path,
      imageUrl: imageData.url,
      imageName: imageData.originalName
    }];
    recalculateTimings();
    addNotification('success', `Image set and synced to entire video duration (${audioDur.toFixed(1)}s).`);
  }

  // Remove single image
  function removeSingleImage() {
    createDefaultSlots(1);
    addNotification('info', 'Image removed.');
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

  // Check if all slots have an image assigned (optional when a Background Preset is active)
  const allSlotsHaveImages = computed(() => {
    if (selectedBg.value && selectedBg.value !== 'none') {
      return true;
    }
    return slots.value.length > 0 && slots.value.every(s => Boolean(s.imagePath));
  });

  // Export readiness flag: requires audio file or background video, and either an active background preset, video, or image
  const canExport = computed(() => {
    if (!audioFile.value && !bgVideo.value) return false;
    if (bgVideo.value) return true;
    if (selectedBg.value && selectedBg.value !== 'none') {
      return true;
    }
    return slots.value.length > 0 && slots.value.every(s => Boolean(s.imagePath));
  });

  // Reset entire project state (re-creates 1 default slot)
  function resetAll() {
    scriptText.value = '';
    scriptFilename.value = '';
    wordCount.value = 0;
    characterCount.value = 0;
    audioFile.value = null;
    customAudio.value = null;
    bgVideo.value = null;
    subtitleFile.value = null;
    rawSubtitleSegments.value = [];
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
    customAudio,
    bgVideo,
    hasCustomAudio,
    audioSource,
    subtitleFile,
    rawSubtitleSegments,
    subtitleSegments,
    chunkSegmentsForStyle,
    syncSubtitleSegments,
    captionsEnabled,
    captionSettings,
    selectedCaptionStyleId,
    selectedBg,
    captionScale,
    exportSettings,
    cinematicSettings,
    slots,
    notifications,
    totalTimelineDuration,
    allSlotsHaveImages,
    canExport,
    isDarkMode,
    toggleTheme,
    initTheme,
    extractSentencesFromSubtitles,
    fitSlotsToDuration,
    addNotification,
    removeNotification,
    setScript,
    setAudio,
    removeAudio,
    setBgVideo,
    removeBgVideo,
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
    setSingleImage,
    removeSingleImage,
    resetAll
  };
}
