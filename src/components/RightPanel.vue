<template>
  <aside class="w-full flex flex-col bg-white dark:bg-gray-900 h-full overflow-hidden select-none">
    <!-- Panel Top Navigation Tabs: Background vs Template Styles -->
    <div class="flex items-center border-b border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-950 p-1.5 gap-1 shrink-0">
      <button
        @click="activePanelTab = 'background'"
        :class="[
          'flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer',
          activePanelTab === 'background'
            ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-white shadow-xs'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <Layers class="w-3.5 h-3.5" />
        <span>Background</span>
      </button>

      <button
        @click="activePanelTab = 'template'"
        :class="[
          'flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer',
          activePanelTab === 'template'
            ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-white shadow-xs'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
        ]"
      >
        <Sparkles class="w-3.5 h-3.5 text-amber-500" />
        <span>Template Styles</span>
      </button>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto p-4 space-y-5">
      <!-- 1. Canvas Size & HD Resolution (Always visible on top of body) -->
      <div class="space-y-3 pb-3 border-b border-slate-200 dark:border-gray-800">
        <label class="text-xs font-bold text-slate-800 dark:text-gray-200 uppercase tracking-wide flex items-center gap-1.5">
          <Settings2 class="w-3.5 h-3.5 text-indigo-500" />
          <span>Format & Quality</span>
        </label>

        <!-- Aspect Ratio -->
        <div class="space-y-1">
          <span class="text-[11px] font-medium text-slate-500 dark:text-gray-400">Aspect Ratio</span>
          <div class="grid grid-cols-3 gap-1.5">
            <button
              v-for="ratio in [
                { id: '9:16', label: 'Reel' },
                { id: '1:1', label: 'Square' },
                { id: '16:9', label: 'Landscape' }
              ]"
              :key="ratio.id"
              @click="aspectRatio = ratio.id"
              :class="[
                'py-1.5 px-1 text-[11px] rounded-lg border font-medium text-center transition',
                aspectRatio === ratio.id
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                  : 'bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400'
              ]"
            >
              {{ ratio.label }}
            </button>
          </div>
        </div>

        <!-- Resolution selection -->
        <div class="space-y-1">
          <span class="text-[11px] font-medium text-slate-500 dark:text-gray-400">Download Quality (HD)</span>
          <div class="grid grid-cols-3 gap-1.5">
            <button
              v-for="res in [
                { id: '720p', label: 'Standard' },
                { id: '1080p', label: 'Full HD' },
                { id: '4k', label: 'Ultra 4K' }
              ]"
              :key="res.id"
              @click="resolution = res.id"
              :class="[
                'py-1.5 px-1 text-[11px] rounded-lg border font-medium text-center transition',
                resolution === res.id
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                  : 'bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400'
              ]"
            >
              {{ res.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 1: BACKGROUND OPTIONS (Pexels, Upload, Gradient, Solid Color) -->
      <div v-show="activePanelTab === 'background'" class="space-y-4">
        <!-- Sub-source buttons -->
        <div class="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-gray-950 rounded-lg">
          <button
            @click="bgMode = 'pexels'"
            :class="[
              'py-1 text-[11px] rounded-md font-medium transition text-center flex flex-col items-center justify-center gap-0.5',
              bgMode === 'pexels' ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs' : 'text-slate-600 dark:text-gray-400'
            ]"
            title="Search Free Pexels Stock Photos"
          >
            <span>Pexels</span>
          </button>
          <button
            @click="bgMode = 'image'"
            :class="[
              'py-1 text-[11px] rounded-md font-medium transition text-center flex flex-col items-center justify-center gap-0.5',
              bgMode === 'image' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-white font-bold shadow-xs' : 'text-slate-600 dark:text-gray-400'
            ]"
            title="Upload custom image"
          >
            <span>Upload</span>
          </button>
          <button
            @click="bgMode = 'preset'"
            :class="[
              'py-1 text-[11px] rounded-md font-medium transition text-center flex flex-col items-center justify-center gap-0.5',
              bgMode === 'preset' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-white font-bold shadow-xs' : 'text-slate-600 dark:text-gray-400'
            ]"
            title="Gradient background presets"
          >
            <span>Gradient</span>
          </button>
          <button
            @click="bgMode = 'color'"
            :class="[
              'py-1 text-[11px] rounded-md font-medium transition text-center flex flex-col items-center justify-center gap-0.5',
              bgMode === 'color' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-white font-bold shadow-xs' : 'text-slate-600 dark:text-gray-400'
            ]"
            title="Single solid color"
          >
            <span>Color</span>
          </button>
        </div>

        <!-- Mode A: Pexels Free Image Search -->
        <div v-if="bgMode === 'pexels'" class="space-y-3">
          <!-- Search Input with Button -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-1.5">
              <div class="relative flex-1">
                <input
                  type="text"
                  v-model="pexelsQuery" 
                  @keyup.enter="handlePexelsSearch(1)"
                  placeholder="Enter Here"
                  class="w-full bg-slate-50 dark:bg-gray-950 border border-slate-300 dark:border-gray-700 text-xs pl-8 pr-2.5 py-2 rounded-lg text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <button
                @click="handlePexelsSearch(1)"
                :disabled="isSearchingPexels"
                class="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition disabled:opacity-50"
              >
                <RefreshCw v-if="isSearchingPexels" class="w-3.5 h-3.5 animate-spin" />
                <span v-else>Search</span>
              </button>
            </div>

            <!-- Quick Popular Tags -->
            <div class="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
              <button
                v-for="tag in ['Dark Aesthetic', 'Nature', 'Sad Alone', 'Cars', 'City Night', 'Shayari', 'Space']"
                :key="tag"
                @click="quickSearchTag(tag)"
                class="px-2 py-0.5 rounded-full border border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 shrink-0 transition"
              >
                {{ tag }}
              </button>
            </div>
          </div>

          <!-- Pexels Photo Results Grid -->
          <div v-if="isSearchingPexels" class="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
            <RefreshCw class="w-5 h-5 animate-spin text-emerald-500" />
            <span>Searching free HD photos on Pexels...</span>
          </div>

          <div v-else-if="pexelsPhotos.length > 0" class="space-y-2">
         
            <div class="grid grid-cols-3 gap-2 max-h-[380px] overflow-y-auto pr-1">
              <div
                v-for="photo in pexelsPhotos"
                :key="photo.id"
                @click="selectPexelsPhoto(photo)"
                :class="[
                  'group relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border transition-all hover:scale-[1.02] shadow-xs',
                  selectedPexelsId === photo.id
                    ? 'border-emerald-500 ring-2 ring-emerald-500'
                    : 'border-slate-200 dark:border-gray-800 hover:border-emerald-400'
                ]"
              >
                <img
                  :src="photo.thumbnail"
                  :alt="photo.alt"
                  class="w-full h-full object-cover transition duration-300 group-hover:brightness-105"
                  loading="lazy"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-1.5 flex flex-col justify-end">
                  <span class="text-[9px] text-white truncate font-medium">📷 {{ photo.photographer }}</span>
                </div>
                <div v-if="selectedPexelsId === photo.id" class="absolute top-1 right-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-md">
                  <Check class="w-3 h-3" />
                </div>
              </div>
            </div>

            <!-- Pagination buttons -->
            <div class="flex items-center justify-between pt-1 text-xs">
              <button
                @click="handlePexelsSearch(pexelsPage - 1)"
                :disabled="pexelsPage <= 1 || isSearchingPexels"
                class="px-2 py-1 rounded border border-slate-200 dark:border-gray-800 disabled:opacity-40 text-[11px] hover:bg-slate-100"
              >
                Previous
              </button>
              <span class="text-[11px] font-mono text-slate-500">Page {{ pexelsPage }}</span>
              <button
                @click="handlePexelsSearch(pexelsPage + 1)"
                :disabled="isSearchingPexels"
                class="px-2 py-1 rounded border border-slate-200 dark:border-gray-800 disabled:opacity-40 text-[11px] hover:bg-slate-100"
              >
                Next
              </button>
            </div>
          </div>

          <div v-else class="text-center py-8 text-xs text-slate-400 border border-dashed rounded-lg">
            <span>Type a keyword and click Search to browse free images!</span>
          </div>
        </div>

        <!-- Mode B: Upload Image -->
        <div v-else-if="bgMode === 'image'" class="space-y-2.5">
          <div
            @click="$refs.fileInputRef.click()"
            class="border-2 border-dashed border-slate-300 dark:border-gray-700 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition flex flex-col items-center justify-center gap-2"
          >
            <UploadCloud class="w-6 h-6 text-indigo-500" />
            <div>
              <p class="text-xs font-bold text-slate-700 dark:text-gray-300">
                {{ uploadedImage ? 'Replace Image' : 'Click to Upload Background Image' }}
              </p>
              <p class="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP</p>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onFileSelected"
            />
          </div>

          <div v-if="uploadedImage" class="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-gray-950 text-xs">
            <div class="flex items-center gap-2 truncate">
              <img :src="uploadedImage.url" class="w-8 h-8 object-cover rounded" />
              <span class="truncate max-w-[150px] font-medium">{{ uploadedImage.name }}</span>
            </div>
            <button
              @click="uploadedImage = null"
              class="p-1 text-rose-500 hover:bg-rose-50 rounded"
              title="Remove image"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Mode C: Preset / Gradient -->
        <div v-else-if="bgMode === 'preset'" class="space-y-2">
          <select
            v-model="selectedPreset"
            class="w-full text-xs bg-slate-50 dark:bg-gray-950 border border-slate-300 dark:border-gray-700 rounded-lg py-2 px-2.5 text-slate-800 dark:text-white cursor-pointer font-medium"
          >
            <option
              v-for="bg in BACKGROUND_PRESETS"
              :key="bg.id"
              :value="bg.id"
            >
              {{ bg.label }}
            </option>
          </select>

          <!-- Swatch preview -->
          <div
            v-if="selectedPreset !== 'none'"
            class="h-9 rounded-lg border border-slate-300 dark:border-gray-700 relative overflow-hidden flex items-center justify-center text-xs font-bold text-white shadow-xs"
          >
            <div class="screen-bg-layer" :class="[selectedPreset]" style="position: absolute; inset: 0;"></div>
            <span class="relative z-10 drop-shadow-md">{{ BACKGROUND_PRESETS.find(b => b.id === selectedPreset)?.label }}</span>
          </div>
        </div>

        <!-- Mode D: Solid Color -->
        <div v-else-if="bgMode === 'color'" class="space-y-2.5">
          <div class="flex items-center gap-2">
            <input
              type="color"
              v-model="solidColor"
              class="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-gray-700 p-0.5"
            />
            <input
              type="text"
              v-model="solidColor"
              class="flex-1 bg-slate-50 dark:bg-gray-950 border border-slate-300 dark:border-gray-700 text-xs px-2.5 py-1.5 rounded-lg font-mono text-slate-800 dark:text-white"
            />
          </div>

          <!-- Color palette swatches -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="col in SOLID_COLORS"
              :key="col"
              @click="solidColor = col"
              class="w-6 h-6 rounded-md border border-black/20 hover:scale-110 transition shadow-xs"
              :style="{ backgroundColor: col }"
              :title="col"
            ></button>
          </div>
        </div>
      </div>

      <!-- TAB 2: TEMPLATE STYLES CATALOG -->
      <div v-show="activePanelTab === 'template'" class="space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-xs font-bold text-slate-800 dark:text-gray-200 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles class="w-3.5 h-3.5 text-amber-500" />
            <span>Select Template ({{ styles.length }})</span>
          </label>
        </div>

        <!-- Catalog Grid (Pure Text Style Preview: No Title, No Badge, Full Width Visual) -->
        <div class="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
          <div
            v-for="s in styles"
            :key="s.id"
            @click="selectStyle(s.id)"
            :class="[
              'cursor-pointer transition-all relative overflow-hidden group select-none rounded-xl border p-0',
              currentActiveTemplateId === s.id
                ? 'border-indigo-500 ring-2 ring-indigo-500 shadow-md'
                : 'border-slate-200 dark:border-gray-800 hover:border-indigo-400 dark:hover:border-gray-600'
            ]"
          >
            <!-- Full visual card preview of the exact style text -->
            <div
              class="w-full min-h-[72px] py-4 px-3 bg-slate-950 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-[1.01]"
              v-html="s.renderStatic(s.defaultWords || ['Sample', 'Text'])"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Settings2, Layers, UploadCloud, Trash2, Sparkles, Search, RefreshCw, Check, Film } from 'lucide-vue-next';
import { usePostState, BACKGROUND_PRESETS, SOLID_COLORS } from '../composables/usePostState.js';
import { styles } from '../data/templateEngine.js';
import { searchPexelsImages } from '../services/api.js';

const {
  bgMode,
  selectedPreset,
  solidColor,
  uploadedImage,
  aspectRatio,
  resolution,
  grainEffect,
  vintageEffect,
  vignetteEffect,
  selectedTemplateId,
  activeLayer,
  textLayers
} = usePostState();

function resetEffects() {
  grainEffect.value = 'none';
  vintageEffect.value = false;
}

const currentActiveTemplateId = computed(() => {
  return activeLayer.value?.templateId || selectedTemplateId.value;
});

function selectStyle(id) {
  selectedTemplateId.value = id;
  if (activeLayer.value) {
    activeLayer.value.templateId = id;
  }
  if (textLayers.value && textLayers.value[0]) {
    textLayers.value[0].templateId = id;
  }
}

// Top Level Panel Tabs: 'background' | 'template'
const activePanelTab = ref('background');

const fileInputRef = ref(null);
const filterLang = ref('hindi');

// Pexels Search States
const pexelsQuery = ref('aesthetic dark');
const pexelsPhotos = ref([]);
const isSearchingPexels = ref(false);
const pexelsPage = ref(1);
const selectedPexelsId = ref(null);

const filteredStyles = computed(() => {
  if (filterLang.value === 'hindi') {
    return styles.filter(s => s.lang === 'hindi');
  }
  return styles.filter(s => s.lang !== 'hindi');
});

async function handlePexelsSearch(page = 1) {
  if (!pexelsQuery.value.trim()) return;
  try {
    isSearchingPexels.value = true;
    pexelsPage.value = Math.max(1, page);

    const orientation = aspectRatio.value === '16:9' ? 'landscape' : 'portrait';
    const res = await searchPexelsImages(pexelsQuery.value.trim(), pexelsPage.value, orientation);
    if (res && res.photos) {
      pexelsPhotos.value = res.photos;
    }
  } catch (err) {
    console.error('Pexels search error:', err);
  } finally {
    isSearchingPexels.value = false;
  }
}

function quickSearchTag(tag) {
  pexelsQuery.value = tag;
  handlePexelsSearch(1);
}

function selectPexelsPhoto(photo) {
  if (!photo) return;
  selectedPexelsId.value = photo.id;
  // Directly set high-res Pexels CDN image (100% pure frontend)
  const imgUrl = photo.portrait || photo.large || photo.original;
  uploadedImage.value = {
    url: imgUrl,
    name: `pexels_${photo.id}.jpg`
  };
}

onMounted(() => {
  handlePexelsSearch(1);
});

function onFileSelected(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    uploadedImage.value = {
      url: evt.target.result,
      name: file.name
    };
    bgMode.value = 'image';
  };
  reader.readAsDataURL(file);
}
</script>
