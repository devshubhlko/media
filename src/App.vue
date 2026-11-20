<template>
  <div class="h-screen h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-gray-100 overflow-hidden font-sans transition-colors duration-200">
    <!-- Top Bar -->
    <TopBar
      :is-downloading="isDownloading"
      @download-hd="handleDownloadHd"
    />

    <!-- Main Workspace (Desktop 3-Column, Mobile Tabbed) -->
    <div class="flex-1 min-h-0 flex overflow-hidden w-full relative">
      <!-- Left Panel (Text Input, Font +/- & Positioning) -->
      <div
        v-show="isMobile ? mobileActiveTab === 'text' : showLeftPanel"
        :class="[
          'h-full flex flex-col border-r border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10 shadow-xs transition-all overflow-hidden',
          isMobile ? 'w-full' : 'w-80 md:w-88 shrink-0'
        ]"
      >
        <LeftPanel />
      </div>

      <!-- Center Preview (Canvas Stage) -->
      <div
        v-show="isMobile ? mobileActiveTab === 'preview' : true"
        :class="[
          'h-full flex flex-col overflow-hidden bg-slate-100 dark:bg-gray-950',
          isMobile ? 'w-full' : 'flex-1 min-w-[320px]'
        ]"
      >
        <CenterPreview ref="centerPreviewRef" />
      </div>

      <!-- Right Panel (Background Presets, Solid Colors, Upload Image, Templates) -->
      <div
        v-show="isMobile ? mobileActiveTab === 'design' : showRightPanel"
        :class="[
          'h-full flex flex-col border-l border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10 shadow-xs transition-all overflow-hidden',
          isMobile ? 'w-full' : 'w-96 md:w-[420px] lg:w-[460px] shrink-0'
        ]"
      >
        <RightPanel />
      </div>
    </div>

    <!-- Mobile Bottom Navigation Bar -->
    <nav v-if="isMobile" class="md:hidden flex h-14 border-t border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 items-center justify-around shrink-0 z-50 select-none shadow-lg pb-[env(safe-area-inset-bottom,0px)]">
      <button
        @click="mobileActiveTab = 'text'"
        :class="[
          'flex-1 flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-medium transition-all',
          mobileActiveTab === 'text'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40'
            : 'text-slate-500 dark:text-gray-400'
        ]"
      >
        <Type class="w-4 h-4" />
        <span>Text</span>
      </button>

      <button
        @click="mobileActiveTab = 'preview'"
        :class="[
          'flex-1 flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-medium transition-all',
          mobileActiveTab === 'preview'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40'
            : 'text-slate-500 dark:text-gray-400'
        ]"
      >
        <Eye class="w-4 h-4" />
        <span>Preview</span>
      </button>

      <button
        @click="mobileActiveTab = 'design'"
        :class="[
          'flex-1 flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-medium transition-all',
          mobileActiveTab === 'design'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40'
            : 'text-slate-500 dark:text-gray-400'
        ]"
      >
        <Palette class="w-4 h-4" />
        <span>Design</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Type, Eye, Palette } from 'lucide-vue-next';
import TopBar from './components/TopBar.vue';
import LeftPanel from './components/LeftPanel.vue';
import CenterPreview from './components/CenterPreview.vue';
import RightPanel from './components/RightPanel.vue';
import { usePostState } from './composables/usePostState.js';
import { downloadPostImage } from './utils/downloadImage.js';

const showLeftPanel = ref(true);
const showRightPanel = ref(true);
const isDownloading = ref(false);
const centerPreviewRef = ref(null);

const {
  aspectRatio,
  resolution,
  addNotification
} = usePostState();

// Viewport detection
const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
const mobileActiveTab = ref('preview');

function updateViewport() {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth < 768;
  }
}

onMounted(() => {
  window.addEventListener('resize', updateViewport);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport);
});

async function handleDownloadHd() {
  const el = centerPreviewRef.value?.getCanvasElement();
  if (!el) {
    addNotification('danger', 'Canvas element not ready for download');
    return;
  }

  try {
    isDownloading.value = true;
    addNotification('info', `Preparing ${resolution.value.toUpperCase()} HD Image...`);

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `post_${aspectRatio.value.replace(':', 'x')}_${resolution.value}_${dateStr}.png`;

    await downloadPostImage(el, aspectRatio.value, resolution.value, fileName);
    addNotification('success', `HD Post Image successfully downloaded! (${resolution.value.toUpperCase()})`);
  } catch (err) {
    console.error('HD download failed:', err);
    addNotification('danger', `Failed to download HD image: ${err.message}`);
  } finally {
    isDownloading.value = false;
  }
}
</script>
