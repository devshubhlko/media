<template>
  <div
    :class="[
      'border rounded-lg p-3 transition-all relative',
      isActive ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/20 shadow-md shadow-indigo-500/10 dark:shadow-indigo-950/50' : 'border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 hover:border-slate-300 dark:hover:border-gray-700',
      isDragging ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/30' : ''
    ]"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- Slot Header -->
    <div class="flex items-center justify-between gap-2 mb-2">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-gray-700 font-mono">
          #{{ slotData.sceneNumber }}
        </span>
        <span class="text-xs text-slate-500 dark:text-gray-400 font-mono">
          {{ formatTime(slotData.startTime) }} - {{ formatTime(slotData.endTime) }} ({{ slotData.duration }}s)
        </span>
      </div>

      <div class="flex items-center gap-1">
        <!-- Delete Slot Button -->
        <button
          @click="$emit('delete-slot', slotData.id)"
          class="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          title="Delete scene image"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Image Preview / Drop Area -->
    <div class="flex gap-3 items-center">
      <!-- Thumbnail container -->
      <div class="w-20 sm:w-24 h-20 sm:h-24 rounded-lg bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 flex items-center justify-center shrink-0 overflow-hidden relative group">
        <template v-if="slotData.imageUrl">
          <img
            :src="slotData.imageUrl"
            :alt="`Scene ${slotData.sceneNumber}`"
            @click="showFullImage = true"
            class="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
            title="Click to view full image"
          />
          <div
            @click="showFullImage = true"
            class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center pointer-events-none"
          >
            <ZoomIn class="w-5 h-5 text-white drop-shadow-md" />
          </div>
        </template>
        <template v-else>
          <div
            @click="triggerFileInput"
            class="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-gray-900/50 cursor-pointer p-2 text-center transition-colors"
          >
            <UploadCloud class="w-6 h-6 mb-1 text-slate-400 dark:text-gray-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
            <span class="text-[10px] leading-tight font-medium">Select Image</span>
          </div>
        </template>
      </div>

      <!-- Actions -->
      <div class="flex-1 flex flex-col justify-between text-xs py-0.5 min-w-0">
        <div class="truncate text-[11px] font-mono text-slate-500 dark:text-gray-400">
          <span v-if="slotData.imageName" class="truncate block font-medium text-slate-700 dark:text-gray-300" :title="slotData.imageName">
            {{ slotData.imageName }}
          </span>
          <span v-else class="text-amber-600 dark:text-amber-400">
            No image assigned
          </span>
        </div>

        <div class="flex items-center gap-2 mt-2 flex-wrap">
          <template v-if="!slotData.imageUrl">
            <button 
              @click="triggerFileInput"
              :disabled="isUploading"
              class="btn btn-primary text-xs py-1 px-3 flex items-center gap-1.5 font-semibold"
            >
              <Upload class="w-3 h-3" />
              <span>Upload Image</span>
            </button>
          </template>

          <template v-else>
            <button
              @click="triggerFileInput"
              :disabled="isUploading"
              class="btn btn-secondary text-xs py-1 px-2.5 text-slate-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-white flex items-center gap-1"
              title="Replace image without altering other slots"
            >
              <RefreshCw class="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
              <span>Replace</span>
            </button>

            <button
              @click="$emit('delete-slot', slotData.id)"
              class="btn btn-ghost text-xs py-1 px-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
              title="Delete scene image"
            >
              <Trash class="w-3 h-3" />
              <span>Delete</span>
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      style="display: none;"
      @change="onFileSelected"
    />

    <!-- Full Image Lightbox Popup Modal -->
    <Teleport to="body">
      <div
        v-if="showFullImage && slotData.imageUrl"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-6 select-none animate-fadeIn"
        @click.self="showFullImage = false"
      >
        <div class="relative max-w-5xl max-h-[92vh] flex flex-col items-center">
          <div class="w-full flex items-center justify-between text-white pb-2.5 px-1">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-xs font-bold px-2 py-0.5 rounded bg-indigo-600 text-white font-mono shrink-0">
                #{{ slotData.sceneNumber }}
              </span>
              <span class="text-xs sm:text-sm font-medium text-slate-200 truncate">
                {{ slotData.imageName || `Scene #${slotData.sceneNumber} Image` }}
              </span>
            </div>
            <button
              @click="showFullImage = false"
              class="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors ml-2 shrink-0 cursor-pointer"
              title="Close (Esc)"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-black flex items-center justify-center">
            <img
              :src="slotData.imageUrl"
              :alt="`Scene ${slotData.sceneNumber} full preview`"
              class="max-h-[82vh] max-w-[92vw] object-contain select-none"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import {
  UploadCloud,
  Upload,
  RefreshCw,
  Trash2,
  Trash,
  X,
  ZoomIn
} from 'lucide-vue-next';
import { uploadImageFile } from '../services/api.js';
import { useTimeline } from '../composables/useTimeline.js';

const props = defineProps({
  slotData: {
    type: Object,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['assign-image', 'delete-slot']);

const { addNotification } = useTimeline();
const fileInputRef = ref(null);
const isUploading = ref(false);
const isDragging = ref(false);
const showFullImage = ref(false);

watch(showFullImage, (fullImg) => {
  if (fullImg) {
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        showFullImage.value = false;
        window.removeEventListener('keydown', onKey);
      }
    };
    window.addEventListener('keydown', onKey);
  }
});

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

async function handleFileUpload(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    addNotification('danger', 'Please select a valid image file (JPG, PNG, WEBP, etc.).');
    return;
  }

  try {
    isUploading.value = true;
    const res = await uploadImageFile(file);
    emit('assign-image', {
      slotId: props.slotData.id,
      imageData: {
        path: res.path,
        url: res.url,
        originalName: res.originalName
      }
    });
  } catch (err) {
    addNotification('danger', `Image upload failed: ${err.message}`);
  } finally {
    isUploading.value = false;
    if (fileInputRef.value) fileInputRef.value.value = '';
  }
}

function onFileSelected(e) {
  const file = e.target.files?.[0];
  if (file) {
    handleFileUpload(file);
  }
}

function onDragOver() {
  isDragging.value = true;
}

function onDragLeave() {
  isDragging.value = false;
}

function onDrop(e) {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    handleFileUpload(file);
  }
}

function formatTime(sec) {
  const s = Math.floor(sec || 0);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}
</script>
