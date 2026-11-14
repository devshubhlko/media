<template>
  <div class="h-screen h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-gray-100 overflow-hidden font-sans transition-colors duration-200">
    <!-- Top Bar -->
    <TopBar
      :left-active="showLeftPanel"
      :right-active="showRightPanel"
      @toggle-left="showLeftPanel = !showLeftPanel"
      @toggle-right="showRightPanel = !showRightPanel"
      @open-export="openExportModal"
      @open-preview="openPreviewModal"
    />

    <!-- Main Workspace (Desktop 3-Column, Mobile 1-Column Tabbed) -->
    <div class="flex-1 min-h-0 flex overflow-hidden w-full relative">
      <!-- Left Panel (Slots & Uploads) -->
      <div
        v-show="isMobile ? mobileActiveTab === 'media' : showLeftPanel"
        :class="[
          'h-full flex flex-col border-r border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10 shadow-xs transition-all overflow-hidden',
          isMobile ? 'w-full' : 'w-80 md:w-88 shrink-0'
        ]"
      >
        <LeftPanel :current-slot-id="currentSlot?.id" />
      </div>

      <!-- Center Preview (Canvas & Scrubber) -->
      <div
        v-show="isMobile ? mobileActiveTab === 'preview' : true"
        :class="[
          'h-full flex flex-col overflow-hidden bg-slate-100 dark:bg-gray-950',
          isMobile ? 'w-full' : 'flex-1 min-w-[320px]'
        ]"
      >
        <CenterPreview @open-preview="openPreviewModal" />
      </div>

      <!-- Right Panel (Settings & Caption Styling) -->
      <div
        v-show="isMobile ? mobileActiveTab === 'settings' : showRightPanel"
        :class="[
          'h-full flex flex-col border-l border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10 shadow-xs transition-all overflow-hidden',
          isMobile ? 'w-full' : 'w-72 md:w-80 shrink-0'
        ]"
      >
        <RightPanel @open-export="openExportModal" />
      </div>
    </div>

    <!-- Mobile Bottom Navigation Bar (ALWAYS rendered and docked at bottom on mobile) -->
    <nav v-if="isMobile" class="md:hidden flex h-14 border-t border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 items-center justify-around shrink-0 z-50 select-none shadow-lg pb-[env(safe-area-inset-bottom,0px)]">
      <button
        @click="mobileActiveTab = 'media'"
        :class="[
          'flex-1 flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-medium transition-all',
          mobileActiveTab === 'media'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40'
            : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <FolderOpen class="w-4 h-4" />
        <span>Media & Slots</span>
      </button>

      <button
        @click="mobileActiveTab = 'preview'"
        :class="[
          'flex-1 flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-medium transition-all',
          mobileActiveTab === 'preview'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40'
            : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <Tv class="w-4 h-4" />
        <span>Preview</span>
      </button>

      <button
        @click="mobileActiveTab = 'settings'"
        :class="[
          'flex-1 flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-medium transition-all',
          mobileActiveTab === 'settings'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40'
            : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <Sliders class="w-4 h-4" />
        <span>Styling</span>
      </button>
    </nav>

    <!-- Export MP4 Modal -->
    <ExportModal
      :is-open="isModalOpen"
      :export-status="exportStatus"
      :progress-percent="progressPercent"
      :current-time-rendered="currentTimeRendered"
      :render-speed="renderSpeed"
      :render-fps="renderFps"
      :download-link="downloadLink"
      :error-message="errorMessage"
      @close="closeModal"
      @trigger-export="triggerExport"
      @cancel-render="cancelRendering"
    />

    <!-- Video Preview Modal (Full Popup & Fullscreen) -->
    <VideoPreviewModal
      :is-open="isPreviewModalOpen"
      @close="isPreviewModalOpen = false"
      @open-export="openExportModal"
    />

    <!-- Toast Notifications -->
    <NotificationToast />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { FolderOpen, Tv, Sliders } from 'lucide-vue-next';
import TopBar from './components/TopBar.vue';
import LeftPanel from './components/LeftPanel.vue';
import CenterPreview from './components/CenterPreview.vue';
import RightPanel from './components/RightPanel.vue';
import ExportModal from './components/ExportModal.vue';
import VideoPreviewModal from './components/VideoPreviewModal.vue';
import NotificationToast from './components/NotificationToast.vue';

import { useTimeline } from './composables/useTimeline.js';
import { usePlayer } from './composables/usePlayer.js';
import { useExport } from './composables/useExport.js';
import { checkBackendHealth } from './services/api.js';

// Desktop panel visibility
const showLeftPanel = ref(true);
const showRightPanel = ref(true);

// Viewport detection (Desktop: >= 768px, Mobile: < 768px)
const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

// Mobile active tab: 'media' | 'preview' | 'settings'
const mobileActiveTab = ref('preview');

function updateViewport() {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth < 768;
  }
}

const { addNotification, createDefaultSlots, slots, initTheme } = useTimeline();
const { currentSlot } = usePlayer();
const {
  isModalOpen,
  exportStatus,
  progressPercent,
  currentTimeRendered,
  renderSpeed,
  renderFps,
  downloadLink,
  errorMessage,
  openExportModal,
  closeModal,
  triggerExport,
  cancelRendering
} = useExport();

// Fullscreen Video Preview Modal state
const isPreviewModalOpen = ref(false);
function openPreviewModal() {
  isPreviewModalOpen.value = true;
}

onMounted(async () => {
  // Listen for viewport changes (Desktop vs Mobile)
  updateViewport();
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
  }

  // Initialize Light Mode as default
  initTheme();

  // Initialize with 1 default image slot if empty
  if (slots.value.length === 0) {
    createDefaultSlots(1);
  }

  // Check backend connection
  const health = await checkBackendHealth();
  if (health.healthy) {
    console.log('Backend connected successfully. FFmpeg available:', health.ffmpeg?.available);
  } else {
    addNotification('warning', 'Connecting to backend... Ensure Node.js server is running on port 5000.');
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateViewport);
    window.removeEventListener('orientationchange', updateViewport);
  }
});
</script>
