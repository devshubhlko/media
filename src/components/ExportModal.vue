<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
  >
    <div class="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden select-none transition-colors">
      <!-- Modal Header -->
      <div class="px-5 py-4 border-b border-slate-200 dark:border-gray-800 flex items-center justify-between bg-slate-50 dark:bg-gray-950/60">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
            <Video class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-slate-900 dark:text-white">Export Video</h2>
            <p class="text-xs text-slate-500 dark:text-gray-400">Server-Side FFmpeg Render</p>
          </div>
        </div>

        <button
          v-if="exportStatus !== 'rendering'"
          @click="$emit('close')"
          class="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-5 space-y-4">
        <!-- Summary Info (Before or during rendering) -->
        <div class="p-3 rounded-lg bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-xs space-y-1.5">
          <div class="flex justify-between text-slate-600 dark:text-gray-400">
            <span>Aspect Ratio & Resolution:</span>
            <span class="text-slate-900 dark:text-white font-mono font-medium">{{ exportSettings.aspectRatio }} ({{ exportSettings.resolution }})</span>
          </div>
          <div class="flex justify-between text-slate-600 dark:text-gray-400">
            <span>Frame Rate:</span>
            <span class="text-slate-900 dark:text-white font-mono font-medium">{{ exportSettings.fps }} FPS</span>
          </div>
          <div class="flex justify-between text-slate-600 dark:text-gray-400">
            <span>Total Duration:</span>
            <span class="text-indigo-600 dark:text-cyan-400 font-mono font-bold">{{ totalTimelineDuration.toFixed(2) }} seconds</span>
          </div>
          <div class="flex justify-between text-slate-600 dark:text-gray-400">
            <span>Subtitles Hardcoded:</span>
            <span :class="captionsEnabled ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-slate-400 dark:text-gray-500'">
              {{ captionsEnabled ? 'Enabled' : 'Disabled' }}
            </span>
          </div>
        </div>

        <!-- Rendering & Capturing Progress View -->
        <div v-if="exportStatus === 'rendering' || exportStatus === 'submitting' || exportStatus === 'capturing'" class="space-y-3 py-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-medium text-slate-700 dark:text-gray-300 flex items-center gap-2 truncate max-w-[280px]">
              <span class="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
              {{
                exportStatus === 'capturing'
                  ? (captureProgressText || 'Capturing canvas frames (WYSIWYG)...')
                  : (exportStatus === 'submitting' ? 'Submitting to FFmpeg engine...' : 'Encoding with FFmpeg...')
              }}
            </span>
            <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
              {{ progressPercent }}%
            </span>
          </div>

          <!-- Progress Bar -->
          <div class="w-full h-3 bg-slate-100 dark:bg-gray-950 rounded-full overflow-hidden border border-slate-300 dark:border-gray-800 p-0.5">
            <div
              class="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>

          <!-- Stats (Shown when rendering with FFmpeg) -->
          <div v-if="exportStatus === 'rendering'" class="grid grid-cols-3 gap-2 text-center pt-1 text-[11px] font-mono text-slate-600 dark:text-gray-400">
            <div class="bg-slate-50 dark:bg-gray-950/60 p-1.5 rounded border border-slate-200 dark:border-gray-800">
              <div class="text-[9px] text-slate-400 dark:text-gray-500 uppercase">Rendered</div>
              <div class="text-slate-800 dark:text-gray-200 font-bold">{{ currentTimeRendered.toFixed(1) }}s</div>
            </div>
            <div class="bg-slate-50 dark:bg-gray-950/60 p-1.5 rounded border border-slate-200 dark:border-gray-800">
              <div class="text-[9px] text-slate-400 dark:text-gray-500 uppercase">Speed</div>
              <div class="text-cyan-700 dark:text-cyan-300 font-bold">{{ renderSpeed }}</div>
            </div>
            <div class="bg-slate-50 dark:bg-gray-950/60 p-1.5 rounded border border-slate-200 dark:border-gray-800">
              <div class="text-[9px] text-slate-400 dark:text-gray-500 uppercase">FPS</div>
              <div class="text-slate-800 dark:text-gray-200 font-bold">{{ renderFps || exportSettings.fps }}</div>
            </div>
          </div>
          <!-- Info note during capturing -->
          <div v-else-if="exportStatus === 'capturing'" class="text-[11px] text-center text-slate-500 dark:text-gray-400 font-medium">
            Generating 100% WYSIWYG snapshots directly from your canvas preview
          </div>
        </div>

        <!-- Completed Success View -->
        <div v-else-if="exportStatus === 'completed'" class="text-center py-4 space-y-3">
          <div class="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-300 dark:border-emerald-500/30">
            <CheckCircle class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Video Ready!</h3>
            <p class="text-xs text-slate-500 dark:text-gray-400 mt-0.5">MP4 file encoded successfully with synchronized audio & captions.</p>
          </div>

          <a
            :href="downloadLink"
            download
            class="btn btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-500 border-none text-white mt-2"
          >
            <Download class="w-4 h-4" />
            <span>Download MP4 Video</span>
          </a>
        </div>

        <!-- Failed Error View -->
        <div v-else-if="exportStatus === 'failed'" class="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-xs text-red-700 dark:text-red-200 space-y-1">
          <div class="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
            <AlertCircle class="w-4 h-4" />
            <span>Rendering Failed</span>
          </div>
          <p class="font-mono text-[11px] whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
            {{ errorMessage }}
          </p>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-3 border-t border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950/80 flex items-center justify-end gap-2">
        <template v-if="exportStatus === 'idle'">
          <button
            @click="$emit('close')"
            class="btn btn-ghost text-xs text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            @click="$emit('trigger-export')"
            class="btn btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 shadow-md shadow-indigo-600/20 font-semibold"
          >
            <Play class="w-3.5 h-3.5 fill-current" />
            <span>Start Rendering</span>
          </button>
        </template>

        <template v-else-if="exportStatus === 'rendering' || exportStatus === 'capturing' || exportStatus === 'submitting'">
          <button
            @click="$emit('cancel-render')"
            class="btn btn-danger text-xs px-3 py-1.5 flex items-center gap-1"
          >
            <StopCircle class="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        </template>

        <template v-else>
          <button
            @click="$emit('close')"
            class="btn btn-secondary text-xs px-4 py-1.5"
          >
            Close
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Video, X, Download, CheckCircle, AlertCircle, Play, StopCircle } from 'lucide-vue-next';
import { useTimeline } from '../composables/useTimeline.js';

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  exportStatus: {
    type: String,
    default: 'idle'
  },
  progressPercent: {
    type: Number,
    default: 0
  },
  captureProgressText: {
    type: String,
    default: ''
  },
  currentTimeRendered: {
    type: Number,
    default: 0
  },
  renderSpeed: {
    type: String,
    default: '1x'
  },
  renderFps: {
    type: Number,
    default: 0
  },
  downloadLink: {
    type: String,
    default: ''
  },
  errorMessage: {
    type: String,
    default: ''
  }
});

defineEmits(['close', 'trigger-export', 'cancel-render']);

const { exportSettings, captionsEnabled, totalTimelineDuration } = useTimeline();
</script>
