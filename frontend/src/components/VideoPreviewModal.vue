<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 select-none animate-fadeIn"
      @click.self="handleClose"
    >
      <!-- Modal Main Card (or Fullscreen Container) -->
      <div
        ref="fullscreenTargetRef"
        :class="[
          'flex flex-col bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-800 transition-all overflow-hidden',
          isFullscreen
            ? 'fixed inset-0 w-full h-full rounded-none border-none p-0 z-[100]'
            : 'w-full max-w-5xl max-h-[95vh]'
        ]"
      >
        <!-- Modal Top Header (Hidden in fullscreen unless hovered/active) -->
        <div
          class="h-12 border-b border-slate-800 bg-slate-900/90 px-3 sm:px-4 flex items-center justify-between shrink-0 select-none backdrop-blur z-20"
        >
          <!-- Left: Title & Info Badge -->
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <Tv class="w-3.5 h-3.5" />
            </div>
            <div>
              <span class="text-xs sm:text-sm font-bold text-white tracking-wide">
                Video Preview
              </span>
              <span class="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                {{ exportSettings.aspectRatio }}
              </span>
            </div>
          </div>

          <!-- Middle: Aspect Ratio Switcher Pills -->
          <div class="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/60 text-xs">
            <button
              v-for="ratio in ['16:9', '9:16', '1:1']"
              :key="ratio"
              @click="exportSettings.aspectRatio = ratio"
              :class="[
                'px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all',
                exportSettings.aspectRatio === ratio
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              ]"
              :title="`Switch to ${ratio} format`"
            >
              {{ ratio }}
            </button>
          </div>

          <!-- Right: Action Buttons (Fullscreen, Export, Close) -->
          <div class="flex items-center gap-1.5 sm:gap-2">
            <!-- Fullscreen Button -->
            <button
              @click="toggleFullscreen"
              class="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              :title="isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen (F)'"
            >
              <Minimize2 v-if="isFullscreen" class="w-4 h-4 text-indigo-400" />
              <Maximize2 v-else class="w-4 h-4" />
            </button>

            <!-- Export MP4 Direct Action -->
            <button
              @click="onDirectExport"
              :disabled="slots.length === 0 || !audioFile"
              class="btn btn-primary text-xs py-1 px-3 hidden sm:flex items-center gap-1.5 shadow-sm font-semibold"
              title="Proceed to Export MP4"
            >
              <Download class="w-3.5 h-3.5" />
              <span>Export MP4</span>
            </button>

            <!-- Close Button -->
            <button
              @click="handleClose"
              class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Close Preview (Esc)"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Video Stage Viewport Area -->
        <div
          class="flex-1 flex items-center justify-center p-2 sm:p-4 relative overflow-hidden bg-black/95 min-h-[300px]"
          @click="togglePlay"
        >
          <!-- Video Frame Box respecting Aspect Ratio -->
          <div
            ref="videoContainerRef"
            :class="[
              'relative rounded-lg overflow-hidden bg-black shadow-2xl flex items-center justify-center transition-all duration-200 select-none',
              aspectRatioClasses
            ]"
            @click.stop="togglePlay"
          >
            <!-- Background Image of Active Scene Slot -->
            <template v-if="currentSlot && currentSlot.imageUrl">
              <img
                :src="currentSlot.imageUrl"
                :alt="`Scene ${currentSlot.sceneNumber}`"
                class="w-full h-full object-contain pointer-events-none select-none transition-opacity duration-150"
              />
            </template>
            <div
              v-else
              class="w-full h-full flex flex-col items-center justify-center text-slate-600 dark:text-gray-500 bg-gray-900 p-4 text-center"
            >
              <Film class="w-12 h-12 mb-2 opacity-40 text-slate-400" />
              <p class="text-xs text-slate-400 font-medium">Scene {{ currentSlot?.sceneNumber || 1 }}</p>
              <p class="text-[10px] text-slate-500 mt-0.5">No image uploaded for this slot</p>
            </div>

            <!-- Subtitle Captions Overlay (Clean 1:1 Export Simulation - No Draggable Rings or Badges) -->
            <div
              v-if="captionsEnabled && currentCaption"
              class="absolute flex justify-center z-20 select-none pointer-events-none transition-all duration-75"
              :style="captionWrapperStyle"
            >
              <!-- 1. Karaoke Word Highlight Mode -->
              <div
                v-if="captionSettings.animation === 'karaoke' && totalCaptionWordsCount > 0"
                :key="currentCaptionSegment?.startTime"
                :style="captionStyleObject"
                class="text-center font-hindi w-max max-w-full transition-all leading-relaxed"
              >
                <div v-for="(line, lIdx) in currentCaptionLinesWithWords" :key="lIdx" class="leading-relaxed">
                  <span
                    v-for="w in line"
                    :key="w.index"
                    :class="[
                      'inline-block mr-1.5 transition-all',
                      w.index === currentActiveWordIndex ? 'sub-karaoke-active' : ''
                    ]"
                    :style="w.index === currentActiveWordIndex ? {
                      color: captionSettings.karaokeColor || '#FACC15',
                      textShadow: (captionSettings.outlineWidth > 0)
                        ? `0 0 12px ${captionSettings.karaokeColor || '#FACC15'}, 2px 2px 0 ${captionSettings.outlineColor || '#000000'}`
                        : `0 0 12px ${captionSettings.karaokeColor || '#FACC15'}`
                    } : {}"
                  >
                    {{ w.text }}
                  </span>
                </div>
              </div>

              <!-- 2. Typewriter (Word by Word) Mode -->
              <div
                v-else-if="captionSettings.animation === 'typewriter' && totalCaptionWordsCount > 0"
                :key="currentCaptionSegment?.startTime"
                :style="captionStyleObject"
                class="text-center font-hindi w-max max-w-full transition-all leading-relaxed whitespace-pre-line"
              >
                {{ currentTypewriterText }}
              </div>

              <!-- 3. Fade In Mode -->
              <div
                v-else-if="captionSettings.animation === 'fade'"
                :key="currentCaptionSegment?.startTime"
                :style="captionStyleObject"
                class="text-center font-hindi w-max max-w-full transition-all leading-relaxed whitespace-pre-line sub-anim-fade"
              >
                {{ wrappedDisplayText }}
              </div>

              <!-- 4. Slide Up Mode -->
              <div
                v-else-if="captionSettings.animation === 'slide'"
                :key="currentCaptionSegment?.startTime"
                :style="captionStyleObject"
                class="text-center font-hindi w-max max-w-full transition-all leading-relaxed whitespace-pre-line sub-anim-slide-up"
              >
                {{ wrappedDisplayText }}
              </div>

              <!-- 5. Default: None (Static) Mode -->
              <div
                v-else
                :style="captionStyleObject"
                class="text-center font-hindi w-max max-w-full transition-all leading-relaxed whitespace-pre-line"
              >
                {{ wrappedDisplayText }}
              </div>
            </div>
          </div>
        </div>

        <!-- Transport Bar & Scrubber Controls (Docked at bottom) -->
        <div
          class="border-t border-slate-800 bg-slate-900/95 px-3 sm:px-6 py-2.5 flex flex-col gap-2 shrink-0 select-none backdrop-blur z-20"
        >
          <!-- Scrubber Bar -->
          <div class="flex items-center gap-3">
            <span class="text-xs font-mono font-bold text-indigo-400 w-11 text-right">
              {{ formatTime(currentTime) }}
            </span>

            <div class="flex-1 relative flex items-center group">
              <input
                type="range"
                min="0"
                :max="totalTimelineDuration || 10"
                step="0.05"
                :value="currentTime"
                @input="onScrubInput"
                class="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all"
              />
            </div>

            <span class="text-xs font-mono font-medium text-slate-400 w-11">
              {{ formatTime(totalTimelineDuration) }}
            </span>
          </div>

          <!-- Bottom Control Buttons Bar -->
          <div class="flex items-center justify-between gap-2">
            <!-- Left: Playback Controls (Play, Skip, Reset) -->
            <div class="flex items-center gap-1 sm:gap-2">
              <button
                @click="skip(-5)"
                class="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Skip back 5s"
              >
                <RotateCcw class="w-4 h-4" />
              </button>

              <button
                @click="togglePlay"
                class="btn btn-primary p-2 rounded-full w-9 h-9 flex items-center justify-center shadow-lg shadow-indigo-600/30"
                :title="isPlaying ? 'Pause (Space)' : 'Play (Space)'"
              >
                <Pause v-if="isPlaying" class="w-4 h-4" />
                <Play v-else class="w-4 h-4 ml-0.5" />
              </button>

              <button
                @click="skip(5)"
                class="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Skip forward 5s"
              >
                <RotateCw class="w-4 h-4" />
              </button>

              <div class="h-4 w-px bg-slate-800 mx-1 hidden sm:block"></div>

              <!-- Scene Info Indicator -->
              <span class="text-xs text-slate-400 font-medium hidden sm:inline">
                Scene {{ currentSlot?.sceneNumber || 1 }} / {{ slots.length }}
              </span>
            </div>

            <!-- Right: Fullscreen Toggle and Quick Export Button -->
            <div class="flex items-center gap-2">
              <button
                @click="toggleFullscreen"
                class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 font-medium transition-colors"
                title="Toggle Fullscreen (F)"
              >
                <Minimize2 v-if="isFullscreen" class="w-3.5 h-3.5 text-indigo-400" />
                <Maximize2 v-else class="w-3.5 h-3.5" />
                <span class="hidden sm:inline">{{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}</span>
              </button>

              <button
                @click="onDirectExport"
                :disabled="slots.length === 0 || !audioFile"
                class="btn btn-primary text-xs py-1 px-3 sm:hidden flex items-center gap-1 font-semibold"
              >
                <Download class="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  X,
  Tv,
  Film
} from 'lucide-vue-next';
import { useTimeline, wrapSubtitleText } from '../composables/useTimeline.js';
import { usePlayer } from '../composables/usePlayer.js';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'open-export']);

const {
  exportSettings,
  captionSettings,
  captionsEnabled,
  slots,
  audioFile,
  totalTimelineDuration
} = useTimeline();

const {
  isPlaying,
  currentTime,
  currentSlot,
  currentCaption,
  currentCaptionSegment,
  togglePlay,
  pause,
  play,
  seek,
  skip
} = usePlayer();

const fullscreenTargetRef = ref(null);
const videoContainerRef = ref(null);
const isFullscreen = ref(false);
const previewHeight = ref(540);
let resizeObserver = null;

// Dynamic responsive aspect ratio classes for modal player
const aspectRatioClasses = computed(() => {
  const ratio = exportSettings.value.aspectRatio;
  if (isFullscreen.value) {
    if (ratio === '9:16') return 'h-full aspect-[9/16]';
    if (ratio === '1:1') return 'h-full aspect-square';
    return 'w-full max-w-full aspect-video';
  }
  if (ratio === '9:16') {
    return 'h-[65vh] max-h-[580px] aspect-[9/16]';
  } else if (ratio === '1:1') {
    return 'h-[65vh] max-h-[560px] aspect-square';
  }
  return 'w-full max-w-[780px] aspect-video max-h-[65vh]';
});

// Auto-wrapped display text (matches backend ASS export 1:1)
const wrappedDisplayText = computed(() => {
  return wrapSubtitleText(currentCaption.value, exportSettings.value.aspectRatio);
});

// Structured lines and words preserving line breaks
const currentCaptionLinesWithWords = computed(() => {
  const wrapped = wrappedDisplayText.value;
  if (!wrapped) return [];
  const lines = wrapped.split('\n');
  let globalWordCounter = 0;
  return lines.map((line) => {
    const words = line.trim().split(/\s+/).filter(Boolean);
    return words.map((w) => {
      const idx = globalWordCounter++;
      return { text: w, index: idx };
    });
  });
});

const totalCaptionWordsCount = computed(() => {
  let count = 0;
  for (const line of currentCaptionLinesWithWords.value) {
    count += line.length;
  }
  return count;
});

const cueProgress = computed(() => {
  if (!currentCaptionSegment.value) return 0;
  const start = currentCaptionSegment.value.startTime;
  const end = currentCaptionSegment.value.endTime;
  const dur = Math.max(0.05, end - start);
  const elapsed = Math.max(0, currentTime.value - start);
  return Math.min(1, elapsed / dur);
});

const currentActiveWordIndex = computed(() => {
  const total = totalCaptionWordsCount.value;
  if (total === 0) return 0;
  const idx = Math.floor(cueProgress.value * total);
  return Math.min(total - 1, Math.max(0, idx));
});

const currentTypewriterText = computed(() => {
  const lines = currentCaptionLinesWithWords.value;
  if (lines.length === 0) return '';
  const total = totalCaptionWordsCount.value;
  const count = Math.max(1, Math.min(total, Math.floor(cueProgress.value * total) + 1));

  const resultLines = [];
  let remaining = count;
  for (const line of lines) {
    if (remaining <= 0) break;
    const take = Math.min(line.length, remaining);
    resultLines.push(line.slice(0, take).map(w => w.text).join(' '));
    remaining -= take;
  }
  return resultLines.join('\n');
});

// Subtitle positioning wrapper matching exact export coordinate alignment
const captionWrapperStyle = computed(() => {
  if (captionSettings.value.position === 'custom') {
    const x = Math.min(90, Math.max(10, captionSettings.value.customPosition?.x ?? 50));
    const y = Math.min(92, Math.max(8, captionSettings.value.customPosition?.y ?? 85));
    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)',
      position: 'absolute',
      width: 'max-content',
      maxWidth: '85%',
      touchAction: 'none'
    };
  }
  if (captionSettings.value.position === 'top') {
    return {
      top: '8%',
      left: '8%',
      right: '8%',
      width: 'auto'
    };
  }
  if (captionSettings.value.position === 'middle') {
    return {
      top: '50%',
      left: '8%',
      right: '8%',
      transform: 'translateY(-50%)',
      width: 'auto'
    };
  }
  // Bottom default (matches 8% export marginV and 8% marginLR)
  return {
    bottom: '8%',
    left: '8%',
    right: '8%',
    width: 'auto'
  };
});

function hexToRgba(hex, alpha = 0.7) {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(0, 0, 0, ${alpha})`;
}

// Proportional styling scaled 1:1 with export video resolution
const captionStyleObject = computed(() => {
  const s = captionSettings.value;
  const currentHeight = previewHeight.value > 50 ? previewHeight.value : 540;
  const currentWidth = videoContainerRef.value?.clientWidth || (currentHeight * (16 / 9));
  const baseDim = Math.min(currentWidth, currentHeight);
  const previewScale = baseDim / 720; // 720p base standard

  const renderedFontSize = Math.max(14, Math.round(s.fontSize * previewScale));
  const rawOutline = Number(s.outlineWidth) || 0;
  const hasOutline = rawOutline > 0;
  const renderedOutline = hasOutline ? Math.max(1, Math.round(rawOutline * previewScale)) : 0;
  const renderedPaddingY = Math.max(4, Math.round(10 * previewScale));
  const renderedPaddingX = Math.max(10, Math.round(20 * previewScale));
  const renderedRadius = Math.max(3, Math.round(6 * previewScale));

  const styles = {
    fontFamily: `"${s.fontFamily || 'Gotu'}", 'Gotu', 'Noto Sans Devanagari', sans-serif`,
    fontSize: `${renderedFontSize}px`,
    color: s.fontColor,
    fontWeight: '700',
    whiteSpace: 'pre-line',
    wordBreak: 'keep-all',
    overflowWrap: 'break-word'
  };

  // Text Outline: ONLY apply if outlineWidth > 0
  if (hasOutline) {
    const o = renderedOutline;
    const oc = s.outlineColor || '#000000';
    styles.textShadow = `
      -${o}px -${o}px 0 ${oc},
       ${o}px -${o}px 0 ${oc},
      -${o}px  ${o}px 0 ${oc},
       ${o}px  ${o}px 0 ${oc},
       0px -${o}px 0 ${oc},
       0px  ${o}px 0 ${oc},
      -${o}px  0px 0 ${oc},
       ${o}px  0px 0 ${oc}
    `;
  }

  // Background Box
  if (s.background === 'box') {
    const boxHex = s.boxColor || '#000000';
    const boxAlpha = typeof s.boxOpacity === 'number' ? s.boxOpacity : 0.7;
    styles.backgroundColor = hexToRgba(boxHex, boxAlpha);
    styles.padding = `${renderedPaddingY}px ${renderedPaddingX}px`;
    styles.borderRadius = `${renderedRadius}px`;
  } else if (s.background === 'shadow') {
    styles.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,0.8))';
  }

  return styles;
});

// Fullscreen API toggle
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    const el = fullscreenTargetRef.value;
    if (el) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(err => console.warn('Fullscreen error:', err));
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => console.warn('Exit fullscreen error:', err));
    }
  }
}

function onFullscreenChange() {
  isFullscreen.value = Boolean(document.fullscreenElement);
}

function onScrubInput(e) {
  const val = parseFloat(e.target.value);
  if (!isNaN(val)) {
    seek(val);
  }
}

function handleClose() {
  pause();
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  emit('close');
}

function onDirectExport() {
  handleClose();
  emit('open-export');
}

// Global keyboard shortcuts (Space: toggle play, Esc: close/exit, F: fullscreen)
function onKeyDown(e) {
  if (!props.isOpen) return;

  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.key === 'Escape' || e.key === 'Esc') {
    if (!document.fullscreenElement) {
      handleClose();
    }
  } else if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    toggleFullscreen();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    skip(-5);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    skip(5);
  }
}

function formatTime(sec) {
  const s = Math.floor(sec || 0);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

// Watch modal open/close to auto-observe container size and handle playback
watch(() => props.isOpen, (open) => {
  if (open) {
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    // Auto-play when preview popup opens
    play();
    setTimeout(() => {
      if (videoContainerRef.value) {
        previewHeight.value = videoContainerRef.value.getBoundingClientRect().height || 540;
        if (!resizeObserver && typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
              if (entry.contentRect.height > 50) {
                previewHeight.value = entry.contentRect.height;
              }
            }
          });
          resizeObserver.observe(videoContainerRef.value);
        }
      }
    }, 100);
  } else {
    window.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fadeIn {
  animation: fadeIn 0.15s ease-out forwards;
}
</style>