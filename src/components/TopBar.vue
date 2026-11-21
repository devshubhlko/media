<template>
  <header class="h-14 border-b border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center justify-between shrink-0 select-none shadow-xs">
    <!-- Brand -->
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
        <Sparkles class="w-4 h-4" />
      </div>
      <div>
        <h1 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <span>Post Creator</span>
        </h1>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <!-- Header Font Picker Button -->
      <button
        @click="isFontModalOpen = true"
        class="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700/80 text-xs font-semibold text-slate-800 dark:text-gray-200 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
        title="Open Fonts Gallery"
      >
        <span>Fonts</span>
        <span v-if="activeFontName" class="max-w-[70px] truncate text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
          ({{ activeFontName }})
        </span>
      </button>

      <button
        @click="$emit('download-hd')"
        :disabled="isDownloading"
        class="btn btn-primary text-xs px-4 py-1.5 shadow-md shadow-indigo-600/20 flex items-center gap-2 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition cursor-pointer"
        title="Download"
      >
        <span>{{ isDownloading ? 'Working...' : 'Download' }}</span>
      </button>
    </div>

    <!-- Font Picker Popup Modal -->
    <FontPickerModal
      :is-open="isFontModalOpen"
      @close="isFontModalOpen = false"
    />
  </header>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Sparkles, Download, RotateCcw, RefreshCw, CaseSensitive } from 'lucide-vue-next';
import { usePostState } from '../composables/usePostState.js';
import { useGoogleFonts } from '../composables/useGoogleFonts.js';
import FontPickerModal from './FontPickerModal.vue';

defineProps({
  isDownloading: {
    type: Boolean,
    default: false
  }
});

defineEmits(['download-hd']);

const { resetPost, textLayers, activeLayer } = usePostState();
const { preloadTopFonts } = useGoogleFonts();

const isFontModalOpen = ref(false);

const activeFontName = computed(() => {
  const current = activeLayer.value || textLayers.value[0];
  return current?.fontFamily || '';
});

onMounted(() => {
  preloadTopFonts();
});
</script>
