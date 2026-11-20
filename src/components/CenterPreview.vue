<template>
  <main class="flex-1 flex flex-col bg-slate-100 dark:bg-gray-950 overflow-hidden relative">
    <!-- Top Bar Controls -->
    <div class="h-10 border-b border-slate-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/40 px-4 flex items-center justify-between shrink-0 select-none backdrop-blur">
      <div class="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-gray-300">
        <span>Post Canvas Preview</span>
        <span class="text-slate-400 font-mono text-[10px]">({{ resolution.toUpperCase() }})</span>
        <span class="text-[11px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-medium">
          {{ textLayers.length }} Text Layer{{ textLayers.length > 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Ratio Quick Switcher -->
      <div class="flex items-center gap-1 bg-slate-100 dark:bg-gray-900 rounded p-0.5 border border-slate-200 dark:border-gray-800 text-xs">
        <button
          v-for="r in ['9:16', '1:1', '16:9']"
          :key="r"
          @click="aspectRatio = r"
          :class="[
            'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
            aspectRatio === r
              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
              : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
          ]"
        >
          {{ r }}
        </button>
      </div>
    </div>

    <!-- Center Canvas Stage Area -->
    <div class="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-slate-200/50 dark:bg-black/50 relative">
      <!-- The Target Element Captured for HD Download -->
      <div
        ref="canvasBoxRef"
        :class="[
          'relative rounded-xl overflow-hidden shadow-2xl border border-slate-300 dark:border-gray-800 flex items-center justify-center transition-all duration-200 select-none',
          aspectRatioClasses
        ]"
        :style="canvasBackgroundStyle"
      >
        <!-- 1. Background Layer: Gradient Preset -->
        <div
          v-if="bgMode === 'preset' && selectedPreset !== 'none'"
          class="screen-bg-layer"
          :class="[selectedPreset]"
          style="position: absolute; inset: 0;"
        ></div>

        <!-- 2. Background Layer: Uploaded Image or Pexels Selected Image -->
        <img
          v-else-if="(bgMode === 'image' || bgMode === 'pexels') && uploadedImage?.url"
          :src="uploadedImage.url"
          crossorigin="anonymous"
          class="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        <!-- Subtle aesthetic dark vignette overlay for legibility -->
        <div v-if="vignetteEffect" class="absolute inset-0 bg-black/15 pointer-events-none z-[6]"></div>

        <!-- 3. Text Layers (Clean Drag: Pure Text Only, No X/Y Badge, No Border Box Area) -->
        <div
          v-for="layer in textLayers"
          :key="layer.id"
          :class="[
            'absolute flex justify-center items-center select-none cursor-grab active:cursor-grabbing',
            activeLayerId === layer.id ? 'z-20' : 'z-10'
          ]"
          :style="getLayerWrapperStyle(layer)"
          @pointerdown="(e) => onLayerPointerDown(layer, e)"
        >
          <!-- Scaler -->
          <div
            class="template-scaler"
            :style="{
              transform: `scale(${getEffectiveScale(layer)})`,
              transformOrigin: 'center center',
              width: '100%',
              display: 'flex',
              justifyContent: 'center'
            }"
          >
            <!-- Rendered Template Html -->
            <div
              class="post-template-content"
              :class="{
                'custom-font-override': Boolean(layer?.fontFamily),
                'custom-color-override': Boolean(layer?.textColor),
                'has-custom-accent': Boolean(layer?.accentColor)
              }"
              :style="getLayerContentStyle(layer)"
              v-html="renderLayerHtml(layer)"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Move } from 'lucide-vue-next';
import { usePostState } from '../composables/usePostState.js';
import { renderPostTemplate } from '../data/templateEngine.js';

const canvasBoxRef = ref(null);
const draggingLayerId = ref(null);

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
  textLayers,
  activeLayerId
} = usePostState();

defineExpose({
  getCanvasElement: () => canvasBoxRef.value
});

// Aspect ratio classes for responsive canvas preview
const aspectRatioClasses = computed(() => {
  if (aspectRatio.value === '9:16') {
    return 'h-full max-h-[560px] aspect-[9/16]';
  } else if (aspectRatio.value === '1:1') {
    return 'h-full max-h-[560px] aspect-square';
  }
  return 'w-full max-w-[780px] aspect-video';
});

// Dynamic canvas background style
const canvasBackgroundStyle = computed(() => {
  if (bgMode.value === 'color') {
    return { backgroundColor: solidColor.value };
  }
  return {};
});

// Scale factor for layer (base 48px = 1.0)
function getEffectiveScale(layer) {
  const fs = layer?.fontSize || 48;
  return parseFloat((fs / 48).toFixed(3));
}

// Layer content style for custom font and custom color
function getLayerContentStyle(layer) {
  const style = {
    fontSize: `${layer?.fontSize || 48}px`,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    wordBreak: 'break-word',
    overflowWrap: 'break-word'
  };
  if (layer?.fontFamily) {
    style.fontFamily = `"${layer.fontFamily}", sans-serif !important`;
  }
  if (layer?.textColor) {
    style.color = `${layer.textColor} !important`;
  }
  if (layer?.accentColor) {
    style['--template-accent-color'] = layer.accentColor;
  }
  return style;
}

// Render template content for layer
function renderLayerHtml(layer) {
  return renderPostTemplate(layer?.templateId || 'hindi-rozkha', layer?.text || '');
}

// Layer positioning style
function getLayerWrapperStyle(layer) {
  let left = '50%';
  let top = '50%';
  let transform = 'translate(-50%, -50%)';

  if (layer.position === 'custom' && layer.customCoord) {
    const x = Math.min(92, Math.max(8, layer.customCoord.x ?? 50));
    const y = Math.min(92, Math.max(8, layer.customCoord.y ?? 50));
    left = `${x}%`;
    top = `${y}%`;
  } else if (layer.position === 'top') {
    top = '22%';
  } else if (layer.position === 'bottom') {
    top = '78%';
  } else {
    top = '50%';
  }

  return {
    position: 'absolute',
    left,
    top,
    transform,
    width: '88%',
    maxWidth: '88%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxSizing: 'border-box',
    touchAction: 'none'
  };
}

// Drag layer pointer down handler
function onLayerPointerDown(layer, e) {
  activeLayerId.value = layer.id;
  layer.position = 'custom';
  if (!layer.customCoord) {
    layer.customCoord = { x: 50, y: 50 };
  }

  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();

  draggingLayerId.value = layer.id;

  const updateCoord = (clientX, clientY) => {
    if (!canvasBoxRef.value) return;
    const rect = canvasBoxRef.value.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const rawX = ((clientX - rect.left) / rect.width) * 100;
    const rawY = ((clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.min(90, Math.max(10, Math.round(rawX * 10) / 10));
    const clampedY = Math.min(90, Math.max(10, Math.round(rawY * 10) / 10));
    layer.customCoord = { x: clampedX, y: clampedY };
  };

  updateCoord(e.clientX, e.clientY);

  const onPointerMove = (evt) => {
    if (draggingLayerId.value !== layer.id) return;
    evt.preventDefault();
    updateCoord(evt.clientX, evt.clientY);
  };

  const onPointerUp = () => {
    draggingLayerId.value = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };

  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp, { once: true });
}
</script>
