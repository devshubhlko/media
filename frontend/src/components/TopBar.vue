<template>
  <header class="h-14 border-b border-slate-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/90 px-3 sm:px-4 flex items-center justify-between shrink-0 select-none backdrop-blur transition-colors">
    <!-- Brand -->
    <div class="flex items-center gap-3 min-w-0">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
        <Video class="w-4 h-4 text-white" />
      </div>
      <div class="min-w-0">
        <h1 class="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2 truncate">
          <span>Video Studio</span>
        </h1>
        <p class="text-[11px] text-slate-500 dark:text-gray-400 hidden sm:block truncate">Timeline & Subtitle Driven Video Creation</p>
      </div>
    </div>

    <!-- Panel View Quick Toggles (Desktop only) -->
    <div class="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-gray-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-gray-700/60">
      <button
        @click="$emit('toggle-left')"
        :class="[
          'px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1.5',
          leftActive
            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-xs font-semibold'
            : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
        ]"
        title="Toggle Uploads & Slots Panel"
      >
        <PanelLeft class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">Slots & Uploads</span>
      </button>

      <button
        @click="$emit('toggle-right')"
        :class="[
          'px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1.5',
          rightActive
            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-xs font-semibold'
            : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
        ]"
        title="Toggle Settings & Styling Panel"
      >
        <PanelRight class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">Settings</span>
      </button>
    </div>

    <!-- Status Badges (Large screens) -->
    <div class="hidden lg:flex items-center gap-3 text-xs">
      <!-- Audio Badge -->
      <div :class="['flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors', audioFile ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-gray-800/50 border-slate-200 dark:border-gray-700/50 text-slate-500 dark:text-gray-400']">
        <Music class="w-3.5 h-3.5" />
        <span>{{ audioFile ? `${audioFile.duration?.toFixed(1)}s Audio` : 'No Audio' }}</span>
      </div>

      <!-- Subtitles Badge -->
      <div :class="['flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors', subtitleSegments.length > 0 ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-700/50 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-gray-800/50 border-slate-200 dark:border-gray-700/50 text-slate-500 dark:text-gray-400']">
        <FileText class="w-3.5 h-3.5" />
        <span>{{ subtitleSegments.length > 0 ? `${subtitleSegments.length} Cues` : 'No Subs' }}</span>
      </div>

      <!-- Scenes Badge -->
      <div :class="['flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors', slots.length > 0 ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-700/50 text-cyan-700 dark:text-cyan-300' : 'bg-slate-100 dark:bg-gray-800/50 border-slate-200 dark:border-gray-700/50 text-slate-500 dark:text-gray-400']">
        <Film class="w-3.5 h-3.5" />
        <span>{{ slots.length }} Scenes ({{ slotsWithImages }}/{{ slots.length }})</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <button
        @click="confirmReset"
        class="btn btn-secondary text-xs px-2.5 sm:px-3 py-1.5"
        title="Reset project"
      >
        <RotateCcw class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">Reset</span>
      </button>

      <!-- Full Video Preview Popup Button -->
      <button
        @click="$emit('open-preview')"
        :disabled="slots.length === 0"
        class="btn btn-secondary text-xs px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
        title="Watch Full Video Preview in Popup"
      >
        <Tv class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        <span>Preview</span>
      </button>

      <button
        @click="$emit('open-export')"
        :disabled="slots.length === 0 || !audioFile"
        class="btn btn-primary text-xs px-3 sm:px-4 py-1.5 shadow-md shadow-indigo-600/20 flex items-center gap-2"
        title="Export full MP4 video"
      >
        <Download class="w-3.5 h-3.5 shrink-0" />
        <span class="font-semibold whitespace-nowrap">Export MP4</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import {
  Video,
  RotateCcw,
  Download,
  Film,
  Music,
  FileText,
  PanelLeft,
  PanelRight,
  Tv
} from 'lucide-vue-next';
import { useTimeline } from '../composables/useTimeline.js';

defineProps({
  leftActive: {
    type: Boolean,
    default: true
  },
  rightActive: {
    type: Boolean,
    default: true
  }
});

defineEmits(['open-export', 'open-preview', 'toggle-left', 'toggle-right']);

const { slots, audioFile, subtitleFile, subtitleSegments, resetAll } = useTimeline();

const slotsWithImages = computed(() => {
  return slots.value.filter(s => Boolean(s.imageUrl)).length;
});

function confirmReset() {
  if (confirm('Are you sure you want to reset all timeline data, script, audio, and images?')) {
    resetAll();
  }
}
</script>
