import { ref, computed, watch, onUnmounted } from 'vue';
import { useTimeline } from './useTimeline.js';

// Module-level singleton state for synchronized playback across all components (preview, timeline, modal)
const isPlaying = ref(false);
const currentTime = ref(0);
const audioRef = ref(null);
const bgVideoRef = ref(null);
const previewContainerRef = ref(null);
const isExportingCanvas = ref(false);
let animationFrameId = null;

export function usePlayer() {
  const {
    slots,
    audioFile,
    bgVideo,
    hasCustomAudio,
    audioSource,
    subtitleSegments,
    captionsEnabled,
    totalTimelineDuration
  } = useTimeline();
  let timerInterval = null;

  // Active slot for the current playback timestamp
  const currentSlot = computed(() => {
    if (!slots.value || slots.value.length === 0) return null;
    const time = currentTime.value;
    const match = slots.value.find(s => time >= s.startTime && time < s.endTime);
    if (!match && time >= slots.value[slots.value.length - 1].endTime) {
      return slots.value[slots.value.length - 1];
    }
    return match || slots.value[0];
  });

  // Active caption segment object for current timestamp (ONLY from loaded SRT subtitles)
  const currentCaptionSegment = computed(() => {
    if (!captionsEnabled.value || !subtitleSegments.value || subtitleSegments.value.length === 0) {
      return null;
    }
    const time = currentTime.value;
    return subtitleSegments.value.find(s => time >= s.startTime && time <= s.endTime) || null;
  });

  // Active caption text for current timestamp
  const currentCaption = computed(() => {
    return currentCaptionSegment.value ? currentCaptionSegment.value.text : '';
  });

  // Watch custom audio changes to load into audioRef element (only when custom audio is active!)
  watch([audioFile, audioRef, audioSource], ([newAudio, el, srcType]) => {
    if (el) {
      if (srcType === 'custom' && newAudio && newAudio.url && !newAudio.isVideoAudio) {
        if (!el.src || !el.src.includes(newAudio.url)) {
          el.src = newAudio.url;
          el.load();
        }
      } else {
        el.removeAttribute('src');
      }
    }
  }, { immediate: true });

  // Keep bgVideoRef element audio muting synchronized with audioSource
  watch([bgVideoRef, audioSource], ([vidEl, srcType]) => {
    if (vidEl) {
      if (srcType === 'video') {
        vidEl.muted = false;
        vidEl.volume = 1.0;
      } else {
        vidEl.muted = true;
      }
    }
  }, { immediate: true });

  function tick() {
    if (!isPlaying.value) return;

    if (audioSource.value === 'video' && bgVideoRef.value) {
      // Background video original voice drives playback
      currentTime.value = bgVideoRef.value.currentTime;
      if (bgVideoRef.value.ended || currentTime.value >= totalTimelineDuration.value) {
        pause();
        currentTime.value = 0;
        if (bgVideoRef.value) bgVideoRef.value.currentTime = 0;
        return;
      }
    } else if (audioRef.value && audioFile.value && audioSource.value === 'custom') {
      // Custom uploaded audio drives playback
      currentTime.value = audioRef.value.currentTime;
      // Also keep background video in sync with custom audio time
      if (bgVideoRef.value && Math.abs(bgVideoRef.value.currentTime - currentTime.value) > 0.25) {
        bgVideoRef.value.currentTime = currentTime.value;
      }
      if (audioRef.value.ended || currentTime.value >= totalTimelineDuration.value) {
        pause();
        currentTime.value = 0;
        if (audioRef.value) audioRef.value.currentTime = 0;
        if (bgVideoRef.value) bgVideoRef.value.currentTime = 0;
        return;
      }
    } else {
      // Fallback timer when no audio is uploaded yet
      const nextTime = currentTime.value + 0.05;
      if (bgVideoRef.value) {
        bgVideoRef.value.currentTime = nextTime;
      }
      if (nextTime >= totalTimelineDuration.value && totalTimelineDuration.value > 0) {
        pause();
        currentTime.value = 0;
        if (bgVideoRef.value) bgVideoRef.value.currentTime = 0;
        return;
      }
      currentTime.value = nextTime;
    }

    animationFrameId = requestAnimationFrame(tick);
  }

  function play() {
    if (isPlaying.value) return;

    const maxDur = totalTimelineDuration.value;
    if (currentTime.value >= maxDur && maxDur > 0) {
      currentTime.value = 0;
      if (audioRef.value) audioRef.value.currentTime = 0;
      if (bgVideoRef.value) bgVideoRef.value.currentTime = 0;
    }

    // 1. Play Background Video if active
    if (bgVideoRef.value) {
      if (audioSource.value === 'video') {
        bgVideoRef.value.muted = false;
        bgVideoRef.value.volume = 1.0;
        if (audioRef.value) audioRef.value.pause();
      } else {
        bgVideoRef.value.muted = true;
      }
      bgVideoRef.value.currentTime = currentTime.value;
      bgVideoRef.value.play().catch(err => {
        console.warn('Video play warning:', err);
      });
    }

    // 2. Play Custom Audio if active
    if (audioSource.value === 'custom' && audioRef.value && audioFile.value) {
      if (audioFile.value.url && (!audioRef.value.src || !audioRef.value.src.includes(audioFile.value.url))) {
        audioRef.value.src = audioFile.value.url;
        audioRef.value.load();
      }
      audioRef.value.currentTime = currentTime.value;
      audioRef.value.play().catch(err => {
        console.warn('Custom audio play warning:', err);
      });
    }

    isPlaying.value = true;
    animationFrameId = requestAnimationFrame(tick);
  }

  function pause() {
    isPlaying.value = false;
    if (audioRef.value) {
      audioRef.value.pause();
    }
    if (bgVideoRef.value) {
      bgVideoRef.value.pause();
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function togglePlay() {
    if (isPlaying.value) {
      pause();
    } else {
      play();
    }
  }

  function seek(time) {
    const clamped = Math.max(0, Math.min(Number(time) || 0, totalTimelineDuration.value));
    currentTime.value = clamped;
    if (audioSource.value === 'video' && bgVideoRef.value) {
      bgVideoRef.value.currentTime = clamped;
    } else if (audioRef.value && audioFile.value) {
      audioRef.value.currentTime = clamped;
      if (bgVideoRef.value) {
        bgVideoRef.value.currentTime = clamped;
      }
    } else if (bgVideoRef.value) {
      bgVideoRef.value.currentTime = clamped;
    }
  }

  function skip(delta) {
    seek(currentTime.value + delta);
  }

  onUnmounted(() => {
    pause();
  });

  return {
    audioRef,
    bgVideoRef,
    isPlaying,
    currentTime,
    currentSlot,
    currentCaption,
    currentCaptionSegment,
    previewContainerRef,
    isExportingCanvas,
    play,
    pause,
    togglePlay,
    seek,
    skip
  };
}
