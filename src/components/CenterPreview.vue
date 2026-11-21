<template>
  <main class="flex-1 flex flex-col bg-slate-100 dark:bg-gray-950 overflow-hidden relative">
    <!-- Top Bar Controls -->
    <div class="h-10 border-b border-slate-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/40 px-4 flex items-center justify-between shrink-0 select-none backdrop-blur">
      <div class="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-gray-300">
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

        <!-- 3. Text Layers with Professional Bounding Box & Resizer Handles (Like Reference Image) -->
        <div
          v-for="layer in textLayers"
          :key="layer.id"
          :class="[
            'absolute flex justify-center items-center select-none cursor-move transition-[box-shadow]',
            activeLayerId === layer.id ? 'z-20' : 'z-10'
          ]"
          :style="getLayerWrapperStyle(layer)"
          @pointerdown="(e) => onLayerPointerDown(layer, e)"
        >
          <!-- Outer Selection Bounding Box with Orange Dashed Border -->
          <div
            class="relative w-full flex justify-center items-center py-2 px-3 transition-all"
            :class="{
              'border border-dashed border-amber-500': activeLayerId === layer.id
            }"
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

            <!-- Reference Style Drag & Resize Handles: 4 Corner Dots + 2 Side Bars -->
            <template v-if="activeLayerId === layer.id">
              <!-- Top-Left Corner Dot -->
              <div
                class="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full cursor-nwse-resize shadow-xs touch-none z-30 hover:scale-125 transition-transform"
                @pointerdown.stop="(e) => onResizeHandlePointerDown(layer, e, 'nw')"
              ></div>

              <!-- Top-Right Corner Dot -->
              <div
                class="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full cursor-nesw-resize shadow-xs touch-none z-30 hover:scale-125 transition-transform"
                @pointerdown.stop="(e) => onResizeHandlePointerDown(layer, e, 'ne')"
              ></div>

              <!-- Bottom-Left Corner Dot -->
              <div
                class="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full cursor-nesw-resize shadow-xs touch-none z-30 hover:scale-125 transition-transform"
                @pointerdown.stop="(e) => onResizeHandlePointerDown(layer, e, 'sw')"
              ></div>

              <!-- Bottom-Right Corner Dot -->
              <div
                class="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-amber-500 rounded-full cursor-nwse-resize shadow-xs touch-none z-30 hover:scale-125 transition-transform"
                @pointerdown.stop="(e) => onResizeHandlePointerDown(layer, e, 'se')"
              ></div>

              <!-- Left Middle Bar Handle -->
              <div
                class="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-4.5 bg-white border-2 border-amber-500 rounded-sm cursor-ew-resize shadow-xs touch-none z-30 hover:scale-110 transition-transform"
                @pointerdown.stop="(e) => onResizeHandlePointerDown(layer, e, 'w')"
              ></div>

              <!-- Right Middle Bar Handle -->
              <div
                class="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-4.5 bg-white border-2 border-amber-500 rounded-sm cursor-ew-resize shadow-xs touch-none z-30 hover:scale-110 transition-transform"
                @pointerdown.stop="(e) => onResizeHandlePointerDown(layer, e, 'e')"
              ></div>
            </template>
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
    return 'h-full max-h-[280px] sm:max-h-[420px] lg:max-h-[560px] aspect-[9/16]';
  } else if (aspectRatio.value === '1:1') {
    return 'h-full max-h-[280px] sm:max-h-[420px] lg:max-h-[560px] aspect-square';
  }
  return 'w-full max-w-[620px] lg:max-w-[780px] aspect-video max-h-[280px] sm:max-h-[400px] lg:max-h-[500px]';
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

// Pointer move/up cleanup
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp, { once: true });
}

// Drag handle to resize font size directly on screen (corner dots & side handles)
function onResizeHandlePointerDown(layer, e, direction = 'se') {
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();

  const startX = e.clientX;
  const startY = e.clientY;
  const initialFontSize = layer.fontSize || 48;

  const onPointerMove = (evt) => {
    evt.preventDefault();
    const deltaX = evt.clientX - startX;
    const deltaY = evt.clientY - startY;

    let delta = 0;
    if (direction === 'se') {
      delta = (deltaX + deltaY) / 2;
    } else if (direction === 'sw') {
      delta = (-deltaX + deltaY) / 2;
    } else if (direction === 'ne') {
      delta = (deltaX - deltaY) / 2;
    } else if (direction === 'nw') {
      delta = (-deltaX - deltaY) / 2;
    } else if (direction === 'e') {
      delta = deltaX;
    } else if (direction === 'w') {
      delta = -deltaX;
    }

    const newSize = Math.max(16, Math.min(140, Math.round(initialFontSize + delta * 0.75)));
    layer.fontSize = newSize;
  };

  const onPointerUp = () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };

  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp, { once: true });
}
</script>
