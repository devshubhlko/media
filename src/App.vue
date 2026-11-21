<template>
  <div class="h-screen h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-gray-100 overflow-hidden font-sans transition-colors duration-200">
    <!-- Top Bar -->
    <TopBar
      :is-downloading="isDownloading"
      @download-hd="handleDownloadHd"
    />

    <!-- Main Workspace: Desktop (3 Columns) vs Mobile/Tablet (Split: Top Sticky Preview + Bottom Scrollable Settings) -->
    <!-- DESKTOP VIEW (>= lg) -->
    <div class="hidden lg:flex flex-1 min-h-0 overflow-hidden w-full relative">
      <!-- Left Panel (Text Input, Font +/- & Positioning) -->
      <div class="h-full flex flex-col border-r border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10 shadow-xs transition-all overflow-hidden w-80 xl:w-88 shrink-0">
        <LeftPanel />
      </div>

      <!-- Center Preview (Canvas Stage) -->
      <div class="h-full flex flex-col overflow-hidden bg-slate-100 dark:bg-gray-950 flex-1 min-w-[320px]">
        <CenterPreview ref="centerPreviewRef" />
      </div>

      <!-- Right Panel (Background Presets, Solid Colors, Upload Image, Templates) -->
      <div class="h-full flex flex-col border-l border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10 shadow-xs transition-all overflow-hidden w-96 xl:w-[440px] shrink-0">
        <RightPanel />
      </div>
    </div>

    <!-- MOBILE & TABLET VIEW (< lg): Live Preview is ALWAYS visible on top, Controls scroll underneath -->
    <div class="flex lg:hidden flex-1 min-h-0 flex-col overflow-hidden w-full relative">
      <!-- Top Fixed/Sticky Live Canvas Preview -->
      <div class="h-[44vh] sm:h-[48vh] min-h-[220px] max-h-[360px] border-b border-slate-200 dark:border-gray-800 flex flex-col bg-slate-100 dark:bg-gray-950 shrink-0 shadow-xs overflow-hidden z-20">
        <CenterPreview ref="centerPreviewRefMobile" />
      </div>

      <!-- Middle Control Switcher: Text Settings vs Background & Template Design -->
      <div class="flex items-center border-b border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1.5 gap-2 shrink-0 z-10">
        <button
          @click="mobileActiveTab = 'text'"
          :class="[
            'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer',
            mobileActiveTab === 'text'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-200'
          ]"
        >
          <Type class="w-3.5 h-3.5" />
          <span>Text & Font Settings</span>
        </button>

        <button
          @click="mobileActiveTab = 'design'"
          :class="[
            'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer',
            mobileActiveTab === 'design'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-200'
          ]"
        >
          <Palette class="w-3.5 h-3.5" />
          <span>Styles & Background</span>
        </button>
      </div>

      <!-- Bottom Scrollable Settings Area (Scrolls independently while preview stays above!) -->
      <div class="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-gray-900">
        <div v-show="mobileActiveTab === 'text'" class="h-full">
          <LeftPanel />
        </div>
        <div v-show="mobileActiveTab === 'design'" class="h-full">
          <RightPanel />
        </div>
      </div>
    </div>
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
const centerPreviewRefMobile = ref(null);

const {
  aspectRatio,
  resolution,
  addNotification
} = usePostState();

const mobileActiveTab = ref('text');

async function handleDownloadHd() {
  const el = centerPreviewRef.value?.getCanvasElement() || centerPreviewRefMobile.value?.getCanvasElement();
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
