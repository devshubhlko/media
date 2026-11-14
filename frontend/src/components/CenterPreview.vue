<template>
  <main class="flex-1 flex flex-col bg-slate-100 dark:bg-gray-950 overflow-hidden relative transition-colors">
    <!-- Preview Header / Controls -->
    <div class="h-10 border-b border-slate-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/40 px-4 flex items-center justify-between shrink-0 select-none backdrop-blur">
      <div class="flex items-center gap-2">
       
      </div>

      <!-- Aspect Ratio Switcher -->
      <div class="flex items-center gap-1 bg-slate-100 dark:bg-gray-900 rounded p-0.5 border border-slate-200 dark:border-gray-800 text-xs">
        <button
          v-for="ratio in ['16:9', '9:16', '1:1']"
          :key="ratio"
          @click="exportSettings.aspectRatio = ratio"
          :class="[
            'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
            exportSettings.aspectRatio === ratio
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          {{ ratio }}
        </button>
      </div>
    </div>

    <!-- Center Stage: Canvas & Video Viewport -->
    <div class="flex-1 flex items-center justify-center p-2 sm:p-4 relative overflow-hidden bg-slate-200/60 dark:bg-black/60">
      <!-- Player Aspect Ratio Box -->
      <div
        ref="videoContainerRef"
        :class="[
          'relative rounded-lg overflow-hidden shadow-2xl bg-black border border-slate-300 dark:border-gray-800 flex items-center justify-center transition-all duration-300',
          aspectRatioClasses
        ]"
      >
        <!-- Background Image of Active Slot -->
        <template v-if="currentSlot && currentSlot.imageUrl">
          <img
            :src="currentSlot.imageUrl"
            :alt="`Scene ${currentSlot.sceneNumber}`"
            class="w-full h-full object-contain select-none pointer-events-none"
          />
        </template>

        <!-- Transparent Click to Play/Pause on Canvas background (No center button blocking view) -->
        <div
          @click="togglePlay"
          class="absolute inset-0 z-10 cursor-pointer"
          title="Click to Play / Pause"
        ></div>

        <!-- Subtitle Caption Overlay (Higher z-index so it's draggable) -->
        <div
          v-if="captionsEnabled && (currentCaption || (captionSettings.position === 'custom' && !isPlaying))"
          :class="[
            'absolute flex justify-center z-20 select-none transition-all duration-75',
            captionSettings.position === 'custom'
              ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-indigo-400/60 rounded-lg p-1'
              : 'pointer-events-auto cursor-grab hover:ring-1 hover:ring-indigo-400/40 rounded-lg',
            isDraggingSubtitle ? 'cursor-grabbing scale-[1.02] ring-2 ring-indigo-500 shadow-xl' : ''
          ]"
          :style="captionWrapperStyle"
          @pointerdown="onSubtitlePointerDown"
          :title="captionSettings.position === 'custom' ? 'Drag subtitle to set custom position' : 'Click & drag to position anywhere'"
        >
          <!-- Floating Position Coordinates Badge (shown during drag or custom position when paused) -->
          <div
            v-if="captionSettings.position === 'custom' && (isDraggingSubtitle || !isPlaying)"
            class="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-indigo-600/95 text-white text-[10px] font-mono pointer-events-none flex items-center gap-1 shadow-md whitespace-nowrap z-30"
          >
            <Move class="w-2.5 h-2.5" />
            <span>X: {{ Math.round(captionSettings.customPosition?.x ?? 50) }}% | Y: {{ Math.round(captionSettings.customPosition?.y ?? 85) }}%</span>
          </div>

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

    <!-- Hidden audio element managed by usePlayer -->
    <audio ref="audioRef"></audio>

    <!-- Transport & Playback Controls Bar -->
    <div class="border-t border-slate-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/80 px-3 sm:px-4 py-2 flex flex-col gap-2 shrink-0 select-none backdrop-blur transition-colors">
      <!-- Scrubber Bar -->
      <div class="flex items-center gap-2 sm:gap-3">
        <span class="text-xs font-mono text-indigo-600 dark:text-indigo-400 w-11 sm:w-12 text-right font-bold">
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
            class="w-full h-1.5 bg-slate-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer group-hover:h-2 transition-all"
          />
        </div>

        <span class="text-xs font-mono text-slate-500 dark:text-gray-400 w-11 sm:w-12 font-medium">
          {{ formatTime(totalTimelineDuration) }}
        </span>
      </div>

      <!-- Playback Buttons -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <!-- Skip Back 5s -->
          <button
            @click="skip(-5)"
            class="btn btn-ghost text-xs p-1.5 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
            title="Rewind 5 seconds"
          >
            <RotateCcw class="w-4 h-4" />
          </button>

          <!-- Play / Pause -->
          <button
            @click="togglePlay"
            class="btn btn-primary p-2 rounded-full w-9 h-9 shadow-md flex items-center justify-center"
            :title="isPlaying ? 'Pause' : 'Play'"
          >
            <Pause v-if="isPlaying" class="w-4 h-4" />
            <Play v-else class="w-4 h-4 ml-0.5" />
          </button>

          <!-- Skip Forward 5s -->
          <button
            @click="skip(5)"
            class="btn btn-ghost text-xs p-1.5 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
            title="Forward 5 seconds"
          >
            <RotateCw class="w-4 h-4" />
          </button>
        </div>

        <!-- Extra Info -->
        <div class="text-[11px] text-slate-500 dark:text-gray-400 flex items-center gap-2 sm:gap-3 font-mono">
          <span v-if="audioFile" class="text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[130px] sm:max-w-none">● Audio ({{ audioFile.duration.toFixed(1) }}s)</span>
          <span v-else class="text-amber-600 dark:text-amber-500/80 text-[10px] sm:text-[11px]">Visuals Only</span>

          <button
            @click="$emit('open-preview')"
            class="p-1 rounded text-slate-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
            title="Open Video Preview Popup (Fullscreen)"
          >
            <Maximize2 class="w-3.5 h-3.5" />
          </button>
        </div> 
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Image,
  Move,
  Tv,
  Maximize2
} from 'lucide-vue-next';
import { useTimeline, wrapSubtitleText } from '../composables/useTimeline.js';
import { usePlayer } from '../composables/usePlayer.js';

defineEmits(['open-preview']);

const videoContainerRef = ref(null);
const isDraggingSubtitle = ref(false);
const previewHeight = ref(420);

let resizeObserver = null;
onMounted(() => {
  if (typeof ResizeObserver !== 'undefined' && videoContainerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.height > 0) {
          previewHeight.value = entry.contentRect.height;
        }
      }
    });
    resizeObserver.observe(videoContainerRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

const {
  exportSettings,
  captionSettings,
  captionsEnabled,
  audioFile,
  totalTimelineDuration
} = useTimeline();

const {
  audioRef,
  isPlaying,
  currentTime,
  currentSlot,
  currentCaption,
  currentCaptionSegment,
  togglePlay,
  seek,
  skip
} = usePlayer();

// Active display text: supports live subtitle or draggable placeholder
const activeDisplayText = computed(() => {
  if (currentCaption.value) return currentCaption.value;
  if (captionSettings.value.position === 'custom' && !isPlaying.value) {
    return 'कैप्शन स्थिति (खींचें) • Drag to Position';
  }
  return '';
});

// Auto-wrapped display text (matches backend ASS export 1:1)
const wrappedDisplayText = computed(() => {
  return wrapSubtitleText(activeDisplayText.value, exportSettings.value.aspectRatio);
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

// Aspect ratio classes for responsive canvas preview container
const aspectRatioClasses = computed(() => {
  const ratio = exportSettings.value.aspectRatio;
  if (ratio === '9:16') {
    return 'h-full max-h-[520px] aspect-[9/16]';
  } else if (ratio === '1:1') {
    return 'h-full max-h-[520px] aspect-square';
  }
  return 'w-full max-w-[760px] aspect-video';
});

// Subtitle positioning style wrapper (margins match ASS export)
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
  // bottom default (matches 8% export marginV and 8% marginLR)
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

// Real-time dynamic CSS for caption overlay - scaled to match export video resolution 1:1
const captionStyleObject = computed(() => {
  const s = captionSettings.value;
  // Scaled proportionally to preview minimum dimension (matches export 720p base standard)
  const currentHeight = previewHeight.value > 50 ? previewHeight.value : 420;
  const currentWidth = videoContainerRef.value?.clientWidth || (currentHeight * (16 / 9));
  const baseDim = Math.min(currentWidth, currentHeight);
  const previewScale = baseDim / 720;

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

  // Outline: ONLY apply if outlineWidth > 0
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

  // Background box with custom boxColor and boxOpacity
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

// Drag to position subtitle handler
function onSubtitlePointerDown(e) {
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();

  isDraggingSubtitle.value = true;
  captionSettings.value.position = 'custom';
  if (!captionSettings.value.customPosition) {
    captionSettings.value.customPosition = { x: 50, y: 85 };
  }

  const updateCoord = (clientX, clientY) => {
    if (!videoContainerRef.value) return;
    const rect = videoContainerRef.value.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const rawX = ((clientX - rect.left) / rect.width) * 100;
    const rawY = ((clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.min(90, Math.max(10, Math.round(rawX * 10) / 10));
    const clampedY = Math.min(92, Math.max(8, Math.round(rawY * 10) / 10));
    captionSettings.value.customPosition = { x: clampedX, y: clampedY };
  };

  updateCoord(e.clientX, e.clientY);

  const onPointerMove = (evt) => {
    if (!isDraggingSubtitle.value) return;
    evt.preventDefault();
    updateCoord(evt.clientX, evt.clientY);
  };

  const onPointerUp = () => {
    isDraggingSubtitle.value = false;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };

  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp, { once: true });
}

function onScrubInput(e) {
  const val = parseFloat(e.target.value);
  if (!isNaN(val)) {
    seek(val);
  }
}

function formatTime(sec) {
  const s = Math.floor(sec || 0);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}
</script>
