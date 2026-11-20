<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    @click.self="close"
  >
    <div
      class="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-scale-up"
    >
      <!-- Modal Header -->
      <div class="px-5 py-4 border-b border-slate-200 dark:border-gray-800 flex items-center justify-between bg-slate-50/50 dark:bg-gray-950/50">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Type class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Select Typography Font</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-mono">
                Live Preview
              </span>
            </h3>
            <p class="text-[11px] text-slate-500 dark:text-gray-400">Hindi aur English ke aesthetic fonts chunen</p>
          </div>
        </div>

        <button
          @click="close"
          class="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-gray-200 transition"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Category Filter Tabs: Hindi vs English vs Reset -->
      <div class="px-5 py-2.5 bg-slate-100/60 dark:bg-gray-950 border-b border-slate-200 dark:border-gray-800 flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
          <button
            @click="activeCategory = 'hindi'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer',
              activeCategory === 'hindi'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'
            ]"
          >
            🇮🇳 Hindi / Devanagari ({{ hindiFonts.length }})
          </button>
          <button
            @click="activeCategory = 'english'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer',
              activeCategory === 'english'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'
            ]"
          >
            🔤 English / Aesthetic ({{ englishFonts.length }})
          </button>
        </div>

        <button
          @click="selectDefaultFont"
          class="text-xs px-2.5 py-1 text-slate-500 hover:text-rose-500 dark:text-gray-400 dark:hover:text-rose-400 transition flex items-center gap-1 cursor-pointer font-medium"
          title="Reset to original template font"
        >
          <RotateCcw class="w-3 h-3" />
          <span>Template Default</span>
        </button>
      </div>

      <!-- Font List with Live Sample Rendering -->
      <div class="flex-1 overflow-y-auto p-4 space-y-2.5">
        <div
          v-for="font in currentFontList"
          :key="font.family"
          @click="selectFont(font.family)"
          :class="[
            'p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 group',
            currentLayerFont === font.family
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20'
              : 'border-slate-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
          ]"
        >
          <!-- Font Name & Category Info -->
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
              {{ font.label }}
            </span>
            <div class="flex items-center gap-1.5">
              <span
                v-if="currentLayerFont === font.family"
                class="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full"
              >
                <Check class="w-3 h-3" />
                Active
              </span>
              <span class="text-[10px] font-mono text-slate-400 uppercase">
                {{ font.family }}
              </span>
            </div>
          </div>

          <!-- The Live Visual Preview Rendered with Beautiful Static Sample Text -->
          <div
            class="p-3 rounded-lg bg-slate-50 dark:bg-gray-950/70 border border-slate-100 dark:border-gray-800/80 text-base sm:text-lg text-slate-900 dark:text-slate-100 leading-relaxed truncate"
            :style="{ fontFamily: `&quot;${font.family}&quot;, sans-serif` }"
          >
            {{ font.sample }}
          </div>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="px-5 py-3 border-t border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
        <span>Click on any font to apply immediately to the post</span>
        <button
          @click="close"
          class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Type, X, Check, RotateCcw } from 'lucide-vue-next';
import { usePostState } from '../composables/usePostState.js';
import { useGoogleFonts } from '../composables/useGoogleFonts.js';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

const activeCategory = ref('hindi');
const { textLayers, activeLayer, addNotification } = usePostState();
const { hindiFonts, englishFonts, loadGoogleFont } = useGoogleFonts();

const currentLayer = computed(() => activeLayer.value || textLayers.value[0]);
const currentLayerFont = computed(() => currentLayer.value?.fontFamily || '');

const userPreviewText = computed(() => {
  const t = currentLayer.value?.text?.trim();
  if (t) {
    const firstLine = t.split('\n')[0];
    return firstLine.slice(0, 45);
  }
  return '';
});

const currentFontList = computed(() => {
  return activeCategory.value === 'hindi' ? hindiFonts : englishFonts;
});

function selectFont(fontFamily) {
  if (currentLayer.value) {
    currentLayer.value.fontFamily = fontFamily;
    loadGoogleFont(fontFamily);
    addNotification('success', `Font applied: ${fontFamily}`);
  }
}

function selectDefaultFont() {
  if (currentLayer.value) {
    currentLayer.value.fontFamily = '';
    addNotification('info', 'Template default font restored');
  }
}

function close() {
  emit('close');
}
</script>
