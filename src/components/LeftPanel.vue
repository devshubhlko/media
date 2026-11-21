<template>
  <aside class="w-full flex flex-col bg-white dark:bg-gray-900 h-full overflow-hidden">
    <!-- Header -->
    <div class="h-10 border-b border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 px-4 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-gray-300">
        <Sliders class="w-3.5 h-3.5 text-indigo-500" />
        <span>Post Text & Typography</span>
      </div>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <div v-if="currentLayer" class="space-y-4">
       
        <!-- Text Area with Multi-line Support -->
        <div class="space-y-1.5">
          <textarea
            v-model="currentLayer.text"
            rows="4"
            placeholder="यहाँ अपना विचार..."
            class="w-full bg-slate-50 dark:bg-gray-950 border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-gray-100 rounded-lg p-3 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y font-sans font-medium"
          ></textarea>
        </div>

       

        <!-- 2. Font Color Option (Default or Custom Color) -->
        <div class="space-y-2 p-3 bg-slate-50 dark:bg-gray-950 rounded-xl border border-slate-200 dark:border-gray-800">
          <div class="flex items-center justify-between text-xs">
            <label class="font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
              <Palette class="w-3.5 h-3.5 text-indigo-500" />
              <span>Font Color</span>
            </label>
            <button
              v-if="currentLayer.textColor"
              @click="currentLayer.textColor = ''"
              class="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Default Color
            </button>
            <span v-else class="text-[10px] text-slate-400 font-medium">Template Default</span>
          </div>

          <!-- Color Swatches & Picker -->
          <div class="flex items-center gap-2">
            <!-- Reset to Template Default -->
            <button
              @click="currentLayer.textColor = ''"
              :class="[
                'px-2 py-1 text-[11px] font-medium rounded border transition',
                !currentLayer.textColor
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold'
                  : 'bg-white dark:bg-gray-900 border-slate-300 dark:border-gray-700 text-slate-600 dark:text-gray-400 hover:border-slate-400'
              ]"
            >
              Default
            </button>

            <!-- Quick Color Palette -->
            <div class="flex items-center gap-1.5 flex-1 overflow-x-auto py-0.5">
              <button
                v-for="color in quickColors"
                :key="color"
                @click="currentLayer.textColor = color"
                :class="[
                  'w-6 h-6 rounded-md border shrink-0 transition hover:scale-110 shadow-2xs',
                  currentLayer.textColor === color ? 'ring-2 ring-indigo-500 ring-offset-1' : 'border-black/20'
                ]"
                :style="{ backgroundColor: color }"
                :title="color"
              ></button>
            </div>

            <!-- Custom Color input -->
            <input
              type="color"
              :value="currentLayer.textColor || '#ffffff'"
              @input="e => currentLayer.textColor = e.target.value"
              class="w-7 h-7 rounded cursor-pointer border border-slate-300 dark:border-gray-700 p-0.5 shrink-0"
              title="Custom Color"
            />
          </div>
        </div>

       

        <!-- 4. Text Size (Clean Slider) -->
        <div class="space-y-2 p-3 bg-slate-50 dark:bg-gray-950 rounded-xl border border-slate-200 dark:border-gray-800">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
              <Maximize2 class="w-3.5 h-3.5 text-indigo-500" />
              <span>Text Size: {{ currentLayer.fontSize || 48 }}px</span>
            </span>
          </div>

          <input
            type="range"
            min="16"
            max="120"
            step="1"
            v-model.number="currentLayer.fontSize"
            class="w-full h-1.5 bg-slate-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <!-- 4. Position -->
        <div class="space-y-2">
          <label class="text-xs font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
            <Move class="w-3.5 h-3.5 text-indigo-500" />
            <span>Position</span>
          </label>
          <div class="grid grid-cols-4 gap-1.5">
            <button
              v-for="pos in [
                { id: 'top', label: 'Top' },
                { id: 'center', label: 'Center' },
                { id: 'bottom', label: 'Bottom' },
                { id: 'custom', label: 'Drag' }
              ]"
              :key="pos.id"
              @click="setLayerPosition(pos.id)"
              :class="[
                'py-1.5 px-2 text-xs rounded-lg border font-medium transition text-center',
                currentLayer.position === pos.id
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold'
                  : 'bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 hover:border-slate-300'
              ]"
            >
              {{ pos.label }}
            </button>
          </div>
        </div>

        <!-- Quick Samples for Inspiration -->
        <div class="space-y-2 pt-2 border-t border-slate-200 dark:border-gray-800">
          <span class="text-xs font-semibold text-slate-600 dark:text-gray-400">Quick Samples:</span>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="(sample, idx) in sampleQuotes"
              :key="idx"
              @click="currentLayer.text = sample"
              class="text-[11px] py-1 px-2.5 rounded-full border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 hover:bg-slate-100 text-slate-700 dark:text-gray-300 transition"
            >
              Sample {{ idx + 1 }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { Sliders, Type, Maximize2, Move, Sparkles, CaseSensitive, Palette } from 'lucide-vue-next';
import { usePostState } from '../composables/usePostState.js';
import { getStyleById } from '../data/templateEngine.js';
import { useGoogleFonts } from '../composables/useGoogleFonts.js';

const {
  textLayers,
  activeLayerId,
  activeLayer
} = usePostState();

const { hindiFonts, loadGoogleFont } = useGoogleFonts();

const currentLayer = computed(() => {
  return activeLayer.value || textLayers.value[0];
});

const currentTemplateName = computed(() => {
  if (!currentLayer.value) return '';
  const s = getStyleById(currentLayer.value.templateId);
  return s ? s.name : currentLayer.value.templateId;
});

const quickColors = [
  '#ffffff', '#000000', '#facc15', '#ef4444', '#06b6d4', '#10b981', '#f43f5e',
];

function onFontChange() {
  if (currentLayer.value?.fontFamily) {
    loadGoogleFont(currentLayer.value.fontFamily);
  }
}

function setLayerPosition(posId) {
  if (!currentLayer.value) return;
  currentLayer.value.position = posId;
  if (posId === 'top') {
    currentLayer.value.customCoord = { x: 50, y: 22 };
  } else if (posId === 'bottom') {
    currentLayer.value.customCoord = { x: 50, y: 78 };
  } else if (posId === 'center') {
    currentLayer.value.customCoord = { x: 50, y: 50 };
  }
}

const sampleQuotes = [
  "खामोशी का शोर\nसबसे गहरा होता है",
  "हार मत मानो,\nवक़्त तुम्हारा भी आएगा",
  "कर्म ही तुम्हारा\nसबसे बड़ा धर्म है",
  "START NOW\nNOT TOMORROW",
  "BUILD IN SILENCE\nLET SUCCESS MAKE THE NOISE"
];
</script>
