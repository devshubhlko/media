<template>
  <aside class="w-full flex flex-col bg-white dark:bg-gray-900/70 h-full overflow-hidden select-none transition-colors">
    <!-- Panel Header -->
    <div class="h-10 border-b border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-950/60 px-4 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-gray-300">
        <Sliders class="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
        <span>Settings & Styling</span>
      </div>
    </div>

    <!-- Body / Accordion -->
    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      <!-- 1. EXPORT SETTINGS -->
      <div class="space-y-3">
        <h3 class="text-xs font-semibold text-slate-800 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <Settings2 class="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span>Export Output</span>
        </h3>

        <!-- Aspect Ratio -->
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-slate-600 dark:text-gray-400">Aspect Ratio</label>
          <div class="grid grid-cols-3 gap-1.5">
            <button
              v-for="ratio in ['16:9', '9:16', '1:1']"
              :key="ratio"
              @click="exportSettings.aspectRatio = ratio"
              :class="[
                'py-1.5 px-2 rounded text-xs font-medium border text-center transition-all',
                exportSettings.aspectRatio === ratio
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs'
                  : 'bg-slate-50 dark:bg-gray-950 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 hover:border-slate-300 dark:hover:border-gray-700 hover:text-slate-900 dark:hover:text-white'
              ]"
            >
              {{ ratio }}
            </button>
          </div>
        </div>

        <!-- Resolution -->
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-slate-600 dark:text-gray-400">Resolution</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="res in ['720p', '1080p']"
              :key="res"
              @click="exportSettings.resolution = res"
              :class="[
                'py-1.5 px-2 rounded text-xs font-medium border text-center transition-all',
                exportSettings.resolution === res
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs'
                  : 'bg-slate-50 dark:bg-gray-950 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 hover:border-slate-300 dark:hover:border-gray-700 hover:text-slate-900 dark:hover:text-white'
              ]"
            >
              {{ res }}
            </button>
          </div>
        </div>

        <!-- Frame Rate (FPS) -->
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-slate-600 dark:text-gray-400">Frame Rate (FPS)</label>
          <div class="grid grid-cols-3 gap-1.5">
            <button
              v-for="fps in [24, 30, 60]"
              :key="fps"
              @click="exportSettings.fps = fps"
              :class="[
                'py-1.5 px-2 rounded text-xs font-medium border text-center transition-all',
                exportSettings.fps === fps
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs'
                  : 'bg-slate-50 dark:bg-gray-950 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 hover:border-slate-300 dark:hover:border-gray-700 hover:text-slate-900 dark:hover:text-white'
              ]"
            >
              {{ fps }} fps
            </button>
          </div>
        </div>

        <!-- Codec specifications -->
        <div class="p-2.5 rounded bg-slate-50 dark:bg-gray-950/80 border border-slate-200 dark:border-gray-800/80 text-[11px] text-slate-600 dark:text-gray-400 space-y-1">
          <div class="flex justify-between">
            <span>Video Codec:</span>
            <span class="text-slate-900 dark:text-gray-300 font-mono font-medium">H.264 (libx264)</span>
          </div>
          <div class="flex justify-between">
            <span>Audio Codec:</span>
            <span class="text-slate-900 dark:text-gray-300 font-mono font-medium">AAC (192 kbps)</span>
          </div>
          <div class="flex justify-between">
            <span>Output Container:</span>
            <span class="text-slate-900 dark:text-gray-300 font-mono font-medium">MP4</span>
          </div>
        </div>
      </div>

      <!-- 2. CAPTION SETTINGS -->
      <div class="space-y-3 pt-2 border-t border-slate-200 dark:border-gray-800">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-semibold text-slate-800 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <Subtitles class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Caption Styling</span>
          </h3>

          <!-- Captions Toggle -->
          <label class="flex items-center gap-2 cursor-pointer">
            <span class="text-[11px] text-slate-500 dark:text-gray-400 font-medium">{{ captionsEnabled ? 'On' : 'Off' }}</span>
            <input
              type="checkbox"
              v-model="captionsEnabled"
              class="sr-only"
            />
            <div
              :class="[
                'w-8 h-4 rounded-full transition-colors relative',
                captionsEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-gray-700'
              ]"
            >
              <div
                :class="[
                  'w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs',
                  captionsEnabled ? 'translate-x-4' : 'translate-x-0.5'
                ]"
              ></div>
            </div>
          </label>
        </div>

        <div v-if="captionsEnabled" class="space-y-3.5">
          <!-- Google Fonts Hindi Font Selector -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs text-slate-600 dark:text-gray-400">
              <label class="font-medium flex items-center gap-1">
                <Type class="w-3.5 h-3.5 text-indigo-500" />
                <span>Hindi Font (Google Fonts)</span>
              </label>
              <span v-if="isLoadingFonts" class="text-[10px] text-indigo-500 animate-pulse font-mono">Loading...</span>
            </div>

            <select
              v-model="captionSettings.fontFamily"
              @change="onFontChanged"
              class="w-full text-xs bg-slate-50 dark:bg-gray-950 border border-slate-300 dark:border-gray-700 rounded-md py-1.5 px-2.5 text-slate-800 dark:text-white cursor-pointer font-sans"
            >
              <option
                v-for="font in hindiFonts"
                :key="font.family"
                :value="font.family"
              >
                {{ font.family }} ({{ font.category }})
              </option>
            </select>

            <!-- Live Font Sample -->
            <div
              :style="{ fontFamily: `'${captionSettings.fontFamily}', 'Noto Sans Devanagari', sans-serif` }"
              class="p-2 rounded bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 text-center text-sm font-semibold text-indigo-950 dark:text-indigo-200 transition-all shadow-xs"
            >
              नमस्ते दुनिया! — {{ captionSettings.fontFamily }}
            </div>
          </div>

          <!-- Font Size -->
          <div class="space-y-1">
            <div class="flex justify-between text-xs text-slate-600 dark:text-gray-400">
              <span>Font Size</span>
              <span class="font-mono text-slate-800 dark:text-gray-300 font-bold">{{ captionSettings.fontSize }}px</span>
            </div>
            <input
              type="range"
              min="20"
              max="72"
              step="2"
              v-model.number="captionSettings.fontSize"
              class="w-full h-1.5 bg-slate-200 dark:bg-gray-950 rounded cursor-pointer"
            />
          </div>

          <!-- Font Color -->
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-slate-600 dark:text-gray-400">Font Color</label>
            <div class="flex items-center gap-2">
              <input
                type="color"
                v-model="captionSettings.fontColor"
                class="w-8 h-8 rounded border border-slate-300 dark:border-gray-700 bg-transparent cursor-pointer p-0"
              />
              <div class="flex items-center gap-1.5 flex-1">
                <button
                  v-for="color in ['#FFFFFF', '#FFEB3B', '#00E5FF', '#76FF03']"
                  :key="color"
                  @click="captionSettings.fontColor = color"
                  class="w-5 h-5 rounded-full border border-slate-300 dark:border-gray-700 hover:scale-110 transition-transform shadow-xs"
                  :style="{ backgroundColor: color }"
                ></button>
              </div>
            </div>
          </div>

          <!-- Outline Styling -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs text-slate-600 dark:text-gray-400">
              <span>Outline Width</span>
              <span class="font-mono text-slate-800 dark:text-gray-300 font-bold">
                {{ captionSettings.outlineWidth > 0 ? `${captionSettings.outlineWidth}px` : '0px (None)' }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="color"
                v-model="captionSettings.outlineColor"
                :disabled="captionSettings.outlineWidth === 0"
                :class="[
                  'w-8 h-8 rounded border border-slate-300 dark:border-gray-700 bg-transparent p-0 transition-opacity',
                  captionSettings.outlineWidth === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                ]"
                :title="captionSettings.outlineWidth === 0 ? 'Increase outline width to enable' : 'Outline Color'"
              />
              <input
                type="range"
                min="0"
                max="6"
                step="1"
                v-model.number="captionSettings.outlineWidth"
                class="flex-1 h-1.5 bg-slate-200 dark:bg-gray-950 rounded cursor-pointer"
              />
            </div>
          </div>

          <!-- Position -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs text-slate-600 dark:text-gray-400">
              <label class="font-medium">Position</label>
              <span v-if="captionSettings.position === 'custom'" class="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                X: {{ Math.round(captionSettings.customPosition?.x ?? 50) }}% | Y: {{ Math.round(captionSettings.customPosition?.y ?? 85) }}%
              </span>
            </div>
            <div class="grid grid-cols-4 gap-1">
              <button
                v-for="pos in [
                  { id: 'top', label: 'Top' },
                  { id: 'middle', label: 'Middle' },
                  { id: 'bottom', label: 'Bottom' },
                  { id: 'custom', label: 'Custom' }
                ]"
                :key="pos.id"
                @click="onSelectPosition(pos.id)"
                :class="[
                  'py-1 px-1 rounded text-xs font-medium border text-center transition-all',
                  captionSettings.position === pos.id
                    ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
                    : 'bg-slate-50 dark:bg-gray-950 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 hover:border-slate-300 dark:hover:border-gray-700 hover:text-slate-900 dark:hover:text-white'
                ]"
              >
                {{ pos.label }}
              </button>
            </div>

          </div>

          <!-- Background Box -->
          <div class="space-y-2">
            <label class="text-xs font-medium text-slate-600 dark:text-gray-400">Background Style</label>
            <div class="grid grid-cols-3 gap-1.5">
              <button
                v-for="bg in [
                  { id: 'box', label: 'Box' },
                  { id: 'shadow', label: 'Shadow' },
                  { id: 'none', label: 'None' }
                ]"
                :key="bg.id"
                @click="captionSettings.background = bg.id"
                :class="[
                  'py-1 px-2 rounded text-xs font-medium border text-center transition-all',
                  captionSettings.background === bg.id
                    ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
                    : 'bg-slate-50 dark:bg-gray-950 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 hover:border-slate-300 dark:hover:border-gray-700 hover:text-slate-900 dark:hover:text-white'
                ]"
              >
                {{ bg.label }}
              </button>
            </div>

            <!-- Box Color & Opacity Controls (Only when background === 'box') -->
            <div
              v-if="captionSettings.background === 'box'"
              class="p-2.5 rounded-lg bg-slate-50 dark:bg-gray-950/80 border border-slate-200 dark:border-gray-800 space-y-2.5"
            >
              <!-- Box Color Picker & Presets -->
              <div class="space-y-1">
                <div class="flex items-center justify-between text-xs text-slate-600 dark:text-gray-400">
                  <span class="font-medium flex items-center gap-1">
                    <Palette class="w-3 h-3 text-indigo-500" />
                    <span>Box Color</span>
                  </span>
                  <span class="font-mono text-[10px] text-slate-700 dark:text-gray-300 font-bold uppercase">{{ captionSettings.boxColor || '#000000' }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <input
                    type="color"
                    v-model="captionSettings.boxColor"
                    class="w-7 h-7 rounded border border-slate-300 dark:border-gray-700 bg-transparent cursor-pointer p-0"
                    title="Choose Custom Box Color"
                  />
                  <div class="flex items-center gap-1.5 flex-1">
                    <button
                      v-for="color in ['#000000', '#1E293B', '#1E1B4B', '#7F1D1D', '#064E3B', '#3B82F6', '#FFFFFF']"
                      :key="color"
                      @click="captionSettings.boxColor = color"
                      class="w-4.5 h-4.5 rounded-full border border-slate-300 dark:border-gray-700 hover:scale-110 transition-transform shadow-xs"
                      :style="{ backgroundColor: color }"
                      :title="color"
                    ></button>
                  </div>
                </div>
              </div>

              <!-- Box Opacity Slider -->
              <div class="space-y-1">
                <div class="flex justify-between text-xs text-slate-600 dark:text-gray-400">
                  <span>Box Opacity</span>
                  <span class="font-mono text-slate-800 dark:text-gray-300 font-bold">
                    {{ Math.round((captionSettings.boxOpacity ?? 0.7) * 100) }}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  v-model.number="captionSettings.boxOpacity"
                  class="w-full h-1.5 bg-slate-200 dark:bg-gray-800 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          <!-- Subtitle Animation -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs text-slate-600 dark:text-gray-400">
              <label class="font-medium flex items-center gap-1">
                <Sparkles class="w-3.5 h-3.5 text-indigo-500" />
                <span>Subtitle Animation</span>
              </label>
            </div>

            <select
              v-model="captionSettings.animation"
              class="w-full text-xs bg-slate-50 dark:bg-gray-950 border border-slate-300 dark:border-gray-700 rounded-md py-1.5 px-2.5 text-slate-800 dark:text-white cursor-pointer font-sans"
            >
              <option value="none">None (Static - Default)</option>
              <option value="fade">Fade In (Smooth)</option>
              <option value="slide">Slide Up (Bottom to Top)</option>
              <option value="karaoke">Karaoke (Word Highlight)</option>
              <option value="typewriter">Typewriter (Word by Word)</option>
            </select>

            <!-- Karaoke Word Highlight Color Picker (Only when animation === 'karaoke') -->
            <div
              v-if="captionSettings.animation === 'karaoke'"
              class="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 space-y-2 mt-1.5"
            >
              <div class="flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                <span class="font-medium flex items-center gap-1">
                  <Palette class="w-3 h-3 text-amber-500" />
                  <span>Highlight Color</span>
                </span>
                <span class="font-mono text-[10px] text-amber-900 dark:text-amber-200 font-bold uppercase">{{ captionSettings.karaokeColor || '#FACC15' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  v-model="captionSettings.karaokeColor"
                  class="w-7 h-7 rounded border border-amber-300 dark:border-amber-700 bg-transparent cursor-pointer p-0"
                  title="Choose Karaoke Highlight Color"
                />
                <div class="flex items-center gap-1.5 flex-1">
                  <button
                    v-for="color in ['#FACC15', '#00E5FF', '#76FF03', '#FF007F', '#FF6D00', '#FFFFFF']"
                    :key="color"
                    @click="captionSettings.karaokeColor = color"
                    class="w-4.5 h-4.5 rounded-full border border-slate-300 dark:border-gray-700 hover:scale-110 transition-transform shadow-xs"
                    :style="{ backgroundColor: color }"
                    :title="color"
                  ></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Export Action Trigger Footer -->
    <div class="p-3 border-t border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950/80 shrink-0">
      <button
        @click="$emit('open-export')"
        :disabled="slots.length === 0 || !audioFile"
        class="btn btn-primary w-full py-2 text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 font-semibold"
      >
        <Download class="w-4 h-4" />
        <span>Export MP4 Video</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { onMounted } from 'vue';
import { Sliders, Settings2, Subtitles, Download, Type, Sparkles, Move, Palette } from 'lucide-vue-next';
import { useTimeline } from '../composables/useTimeline.js';
import { useGoogleFonts } from '../composables/useGoogleFonts.js';

defineEmits(['open-export']);

const { exportSettings, captionsEnabled, captionSettings, slots, audioFile } = useTimeline();
const { hindiFonts, isLoadingFonts, fetchHindiFonts, loadGoogleFont } = useGoogleFonts();

function onSelectPosition(posId) {
  captionSettings.value.position = posId;
  if (posId === 'custom' && !captionSettings.value.customPosition) {
    captionSettings.value.customPosition = { x: 50, y: 85 };
  }
}

function resetCustomPosition() {
  captionSettings.value.customPosition = { x: 50, y: 85 };
}

function onFontChanged() {
  if (captionSettings.value.fontFamily) {
    loadGoogleFont(captionSettings.value.fontFamily);
  }
}

onMounted(() => {
  fetchHindiFonts();
  if (captionSettings.value.fontFamily) {
    loadGoogleFont(captionSettings.value.fontFamily);
  }
});
</script>
