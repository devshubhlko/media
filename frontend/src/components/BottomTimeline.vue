<template>
  <div class="h-44 border-t border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/90 flex flex-col shrink-0 select-none overflow-hidden transition-colors">
    <!-- Timeline Header -->
    <div class="h-8 border-b border-slate-200 dark:border-gray-800/80 px-4 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-gray-950/40">
      <div class="flex items-center gap-2 font-medium">
        <Clock class="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
        <span class="font-semibold text-slate-700 dark:text-gray-300">Multi-Track Synchronized Timeline</span>
      </div>

      <div class="flex items-center gap-3 text-[11px] font-mono">
        <span>Playhead: <strong class="text-indigo-600 dark:text-indigo-400">{{ currentTime.toFixed(2) }}s</strong></span>
        <span>Duration: <strong class="text-slate-700 dark:text-gray-300">{{ totalTimelineDuration.toFixed(2) }}s</strong></span>
      </div>
    </div>

    <!-- Timeline Body & Tracks -->
    <div
      ref="timelineContainerRef"
      @click="onTimelineClick"
      class="flex-1 relative overflow-x-auto overflow-y-hidden p-2 flex flex-col gap-1.5 cursor-pointer bg-slate-100/60 dark:bg-gray-950/60"
    >
      <!-- Playhead Needle -->
      <div
        class="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none transition-all duration-75 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
        :style="{ left: `${playheadPercent}%` }"
      >
        <div class="w-2.5 h-2.5 bg-rose-500 rounded-full -ml-1 -mt-0.5 shadow-md"></div>
      </div>

      <!-- 1. TIME RULER TRACK -->
      <div class="h-4 w-full relative border-b border-slate-300 dark:border-gray-800/50 text-[9px] font-mono text-slate-400 dark:text-gray-500">
        <div
          v-for="tick in rulerTicks"
          :key="tick.time"
          class="absolute top-0 flex flex-col items-center"
          :style="{ left: `${tick.percent}%` }"
        >
          <div class="w-px h-1.5 bg-slate-300 dark:bg-gray-700"></div>
          <span>{{ tick.label }}</span>
        </div>
      </div>

      <!-- 2. IMAGE SCENE TRACK -->
      <div class="h-14 w-full bg-white dark:bg-gray-900/80 rounded border border-slate-200 dark:border-gray-800/80 relative flex overflow-hidden shadow-xs">
        <div class="absolute top-1 left-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-400 z-10 pointer-events-none bg-slate-100/80 dark:bg-black/40 px-1 rounded">
          Images Track
        </div>

        <template v-if="slots.length > 0">
          <div
            v-for="slot in slots"
            :key="slot.id"
            @click.stop="seekToSlot(slot)"
            :class="[
              'h-full border-r border-slate-200 dark:border-gray-800/80 relative transition-all group flex items-center px-1 overflow-hidden',
              isSlotActive(slot) ? 'bg-indigo-50 dark:bg-indigo-900/40 ring-1 ring-indigo-500 ring-inset' : 'hover:bg-slate-50 dark:hover:bg-gray-800/50'
            ]"
            :style="{ width: `${getSlotWidthPercent(slot)}%` }"
            :title="`Scene #${slot.sceneNumber} (${slot.duration}s)`"
          >
            <!-- Thumbnail if available -->
            <img
              v-if="slot.imageUrl"
              :src="slot.imageUrl"
              class="w-8 h-8 rounded object-cover shrink-0 mr-1.5 border border-slate-200 dark:border-gray-700 shadow-xs"
            />
            <div
              v-else
              class="w-8 h-8 rounded bg-slate-50 dark:bg-gray-950 border border-dashed border-slate-300 dark:border-gray-700 flex items-center justify-center shrink-0 mr-1.5 text-slate-400 dark:text-gray-600"
            >
              <Image class="w-4 h-4" />
            </div>

            <div class="min-w-0 text-[10px] leading-tight">
              <div class="font-bold text-slate-800 dark:text-gray-200 truncate">#{{ slot.sceneNumber }}</div>
              <div class="text-slate-500 dark:text-gray-400 text-[9px] font-mono">{{ slot.duration }}s</div>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="w-full h-full flex items-center justify-center text-xs text-slate-400 dark:text-gray-600">
            No image slots configured
          </div>
        </template>
      </div>

      <!-- 3. AUDIO TRACK -->
      <div class="h-6 w-full bg-cyan-50/50 dark:bg-gray-900/60 rounded border border-cyan-200 dark:border-gray-800/60 relative flex items-center px-2 overflow-hidden">
        <div class="text-[9px] font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 shrink-0 mr-2 flex items-center gap-1 z-10">
          <Music class="w-3 h-3" />
          <span>Audio</span>
        </div>

        <template v-if="audioFile">
          <!-- Waveform simulation blocks -->
          <div class="flex-1 h-full flex items-center gap-0.5 opacity-60">
            <div
              v-for="n in 60"
              :key="n"
              class="flex-1 bg-cyan-500 rounded-sm"
              :style="{ height: `${20 + (n % 7) * 10}%` }"
            ></div>
          </div>
          <span class="text-[9px] font-mono text-cyan-700 dark:text-cyan-300 ml-2 z-10 shrink-0 font-bold">
            {{ audioFile.duration.toFixed(1) }}s
          </span>
        </template>
        <template v-else>
          <span class="text-[10px] text-slate-400 dark:text-gray-500 italic">No audio track loaded</span>
        </template>
      </div>

      <!-- 4. SUBTITLE TRACK -->
      <div class="h-6 w-full bg-amber-50/50 dark:bg-gray-900/60 rounded border border-amber-200 dark:border-gray-800/60 relative flex items-center px-2 overflow-hidden">
        <div class="text-[9px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0 mr-2 flex items-center gap-1 z-10">
          <Subtitles class="w-3 h-3" />
          <span>Subs</span>
        </div>

        <template v-if="subtitleSegments.length > 0">
          <div class="flex-1 h-full relative">
            <div
              v-for="seg in subtitleSegments"
              :key="seg.id"
              class="absolute top-1 bottom-1 bg-amber-200 dark:bg-amber-500/30 border border-amber-400 dark:border-amber-500/50 rounded text-[8px] text-amber-900 dark:text-amber-200 px-1 truncate flex items-center font-medium"
              :style="{
                left: `${(seg.startTime / totalTimelineDuration) * 100}%`,
                width: `${Math.max(1, (seg.duration / totalTimelineDuration) * 100)}%`
              }"
              :title="seg.text"
            >
              {{ seg.text }}
            </div>
          </div>
        </template>
        <template v-else>
          <span class="text-[10px] text-slate-400 dark:text-gray-500 italic">No subtitle cues loaded</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Clock, Image, Music, Subtitles } from 'lucide-vue-next';
import { useTimeline } from '../composables/useTimeline.js';
import { usePlayer } from '../composables/usePlayer.js';

const { slots, audioFile, subtitleSegments, totalTimelineDuration } = useTimeline();
const { currentTime, seek } = usePlayer();

const timelineContainerRef = ref(null);

const playheadPercent = computed(() => {
  if (totalTimelineDuration.value <= 0) return 0;
  return Math.min(100, Math.max(0, (currentTime.value / totalTimelineDuration.value) * 100));
});

const rulerTicks = computed(() => {
  const dur = totalTimelineDuration.value || 10;
  const count = Math.min(10, Math.max(3, Math.floor(dur / 5)));
  const step = dur / count;
  const ticks = [];

  for (let i = 0; i <= count; i++) {
    const time = i * step;
    ticks.push({
      time,
      percent: (time / dur) * 100,
      label: `${Math.round(time)}s`
    });
  }
  return ticks;
});

function getSlotWidthPercent(slot) {
  if (totalTimelineDuration.value <= 0) return 0;
  return (slot.duration / totalTimelineDuration.value) * 100;
}

function isSlotActive(slot) {
  return currentTime.value >= slot.startTime && currentTime.value < slot.endTime;
}

function seekToSlot(slot) {
  seek(slot.startTime);
}

function onTimelineClick(e) {
  if (!timelineContainerRef.value || totalTimelineDuration.value <= 0) return;
  const rect = timelineContainerRef.value.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
  const targetTime = ratio * totalTimelineDuration.value;
  seek(targetTime);
}
</script>
