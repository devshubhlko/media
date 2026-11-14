import { ref, computed, watch, onUnmounted } from 'vue';
import { useTimeline } from './useTimeline.js';

// Module-level singleton state for synchronized playback across all components (preview, timeline, modal)
const isPlaying = ref(false);
const currentTime = ref(0);
const audioRef = ref(null);
let animationFrameId = null;

export function usePlayer() {
  const { slots, audioFile, subtitleSegments, captionsEnabled, totalTimelineDuration } = useTimeline();
  let timerInterval = null;

  // Active slot for the current playback timestamp
  const currentSlot = computed(() => {
    if (!slots.value || slots.value.length === 0) return null;
    const time = currentTime.value;
    const match = slots.value.find(s => time >= s.startTime && time < s.endTime);
    // If at end or beyond, return last slot
    if (!match && time >= slots.value[slots.value.length - 1].endTime) {
      return slots.value[slots.value.length - 1];
    }
    return match || slots.value[0];
  });

  // Active caption segment object for current timestamp
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

  // Watch audio file and audioRef changes to update audio source immediately
  watch([audioFile, audioRef], ([newAudio, el]) => {
    if (el) {
      if (newAudio && newAudio.url) {
        if (!el.src || !el.src.includes(newAudio.url)) {
          el.src = newAudio.url;
          el.load();
        }
      } else {
        el.removeAttribute('src');
      }
    }
  }, { immediate: true });

  function tick() {
    if (!isPlaying.value) return;

    if (audioRef.value && audioFile.value) {
      currentTime.value = audioRef.value.currentTime;
      if (audioRef.value.ended || currentTime.value >= totalTimelineDuration.value) {
        pause();
        currentTime.value = 0;
        if (audioRef.value) audioRef.value.currentTime = 0;
        return;
      }
    } else {
      // Fallback timer when no audio is uploaded yet
      const nextTime = currentTime.value + 0.05;
      if (nextTime >= totalTimelineDuration.value && totalTimelineDuration.value > 0) {
        pause();
        currentTime.value = 0;
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
    }

    if (audioRef.value && audioFile.value) {
      if (audioFile.value.url && (!audioRef.value.src || !audioRef.value.src.includes(audioFile.value.url))) {
        audioRef.value.src = audioFile.value.url;
        audioRef.value.load();
      }
      audioRef.value.currentTime = currentTime.value;
      audioRef.value.play().then(() => {
        isPlaying.value = true;
        animationFrameId = requestAnimationFrame(tick);
      }).catch(err => {
        console.warn('Audio play prevented or error:', err);
        // Play visuals even if audio policy blocks autoplay
        isPlaying.value = true;
        animationFrameId = requestAnimationFrame(tick);
      });
    } else {
      isPlaying.value = true;
      animationFrameId = requestAnimationFrame(tick);
    }
  }

  function pause() {
    isPlaying.value = false;
    if (audioRef.value) {
      audioRef.value.pause();
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
    if (audioRef.value && audioFile.value) {
      audioRef.value.currentTime = clamped;
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
    isPlaying,
    currentTime,
    currentSlot,
    currentCaption,
    currentCaptionSegment,
    play,
    pause,
    togglePlay,
    seek,
    skip
  };
}
