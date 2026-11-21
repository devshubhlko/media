import { ref, computed } from 'vue';

// Background options
export const BACKGROUND_PRESETS = [
  { id: 'none', label: 'Custom / Transparent', type: 'none' },
  { id: 'bg-minimal', label: 'Minimal Dark Studio', type: 'preset' },
  { id: 'bg-midnight', label: 'Midnight Purple Gradient', type: 'preset' },
  { id: 'bg-sunset', label: 'Warm Sunset Aesthetic', type: 'preset' },
  { id: 'bg-lofi', label: 'Lo-Fi Teal & Slate', type: 'preset' },
  { id: 'bg-cyber', label: 'Cyberpunk Neon Grid', type: 'preset' },
  { id: 'bg-royal', label: 'Royal Amber & Crimson', type: 'preset' },
  { id: 'bg-aurora', label: 'Aurora Borealis', type: 'preset' }
];

export const SOLID_COLORS = [
  '#000000', '#0f172a', '#1e1b4b', '#311042', '#18181b',
  '#ffffff', '#f8fafc', '#ef4444', '#f97316', '#eab308',
  '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7'
];

// Global State
const bgMode = ref('preset'); // 'preset' | 'color' | 'image'
const selectedPreset = ref('bg-midnight');
const solidColor = ref('#0f172a');
const uploadedImage = ref(null); // { url, name, path }

// Aspect ratio and resolution for image export
const aspectRatio = ref('16:9'); // '9:16' | '1:1' | '16:9'
const resolution = ref('1080p'); // '720p' | '1080p' | '4k'

// Text Content (Multi-line text supported)
const postText = ref('खामोशी का शोर');

// Cinematic Visual Effects
const grainEffect = ref('none'); // 'none' | 'light' | 'medium' | 'heavy'
const vintageEffect = ref(false); // boolean vintage tone
const vignetteEffect = ref(false); // subtle vignette

// Text customization options
const fontSize = ref(48); // Base font size
const textColor = ref(''); // empty = use template default
const accentColor = ref(''); // empty = use template accent default (e.g. red line, highlight box, underline)
const customFontFamily = ref(''); // empty = use template default font
const textPosition = ref('center'); // 'center' | 'top' | 'bottom' | 'custom'
const customCoord = ref({ x: 50, y: 50 }); // % coordinates
const textScale = ref(1.0); // +- text scale modifier

// Text Layers (Multi-Text support with individual templates & coordinates)
const textLayers = ref([
  {
    id: 'layer-1',
    text: 'खामोशी का शोर',
    templateId: 'hindi-redbar',
    fontSize: 48,
    textColor: '',
    accentColor: '', // custom accent/line color
    fontFamily: '',
    position: 'center', // 'top' | 'center' | 'bottom' | 'custom'
    customCoord: { x: 50, y: 50 }
  }
]);
const activeLayerId = ref('layer-1');

// Single-source Selected Template ID synced with active layer
const selectedTemplateId = computed({
  get: () => {
    const layer = textLayers.value.find(l => l.id === activeLayerId.value) || textLayers.value[0];
    return layer?.templateId || 'hindi-redbar';
  },
  set: (val) => {
    const layer = textLayers.value.find(l => l.id === activeLayerId.value) || textLayers.value[0];
    if (layer) {
      layer.templateId = val;
    }
  }
});
// Active layer helper
const activeLayer = computed(() => {
  return textLayers.value.find(l => l.id === activeLayerId.value) || textLayers.value[0];
});

function addTextLayer(initialText = 'नया टेक्स्ट यहाँ लिखें...', initialTemplateId = 'hindi-yatra') {
  const newId = 'layer-' + Date.now();
  // Place slightly staggered or below
  const layerCount = textLayers.value.length;
  const newY = Math.min(85, Math.max(15, 50 + (layerCount % 2 === 1 ? 25 : -25)));
  const newLayer = {
    id: newId,
    text: initialText,
    templateId: initialTemplateId || selectedTemplateId.value || 'hindi-yatra',
    fontSize: 40,
    position: 'custom',
    customCoord: { x: 50, y: newY }
  };
  textLayers.value.push(newLayer);
  activeLayerId.value = newId;
  addNotification('success', 'नया टेक्स्ट लेयर जुड़ गया! आप इसे ड्रैग करके कहीं भी रख सकते हैं।');
}

function removeTextLayer(id) {
  if (textLayers.value.length <= 1) {
    addNotification('info', 'कम से कम एक टेक्स्ट लेयर होना आवश्यक है');
    return;
  }
  textLayers.value = textLayers.value.filter(l => l.id !== id);
  if (activeLayerId.value === id) {
    activeLayerId.value = textLayers.value[0].id;
  }
}

// Toast / Notification system
const notifications = ref([]);
function addNotification(type = 'info', message = '') {
  const id = Date.now() + Math.random();
  notifications.value.push({ id, type, message });
  setTimeout(() => {
    notifications.value = notifications.value.filter(n => n.id !== id);
  }, 3500);
}

function removeNotification(id) {
  notifications.value = notifications.value.filter(n => n.id !== id);
}

// Text scale +- controls
function increaseTextSize(step = 4) {
  if (activeLayer.value) {
    activeLayer.value.fontSize = Math.min(120, (activeLayer.value.fontSize || 48) + step);
    fontSize.value = activeLayer.value.fontSize;
  } else {
    fontSize.value = Math.min(120, fontSize.value + step);
  }
}

function decreaseTextSize(step = 4) {
  if (activeLayer.value) {
    activeLayer.value.fontSize = Math.max(16, (activeLayer.value.fontSize || 48) - step);
    fontSize.value = activeLayer.value.fontSize;
  } else {
    fontSize.value = Math.max(16, fontSize.value - step);
  }
}

function resetPost() {
  textLayers.value = [
    {
      id: 'layer-1',
      text: 'खामोशी का शोर',
      templateId: 'hindi-rozkha',
      fontSize: 48,
      position: 'center',
      customCoord: { x: 50, y: 50 }
    }
  ];
  activeLayerId.value = 'layer-1';
  postText.value = 'खामोशी का शोर';
  selectedTemplateId.value = 'hindi-rozkha';
  bgMode.value = 'preset';
  selectedPreset.value = 'bg-midnight';
  solidColor.value = '#0f172a';
  uploadedImage.value = null;
  fontSize.value = 48;
  aspectRatio.value = '9:16';
  resolution.value = '1080p';
  textPosition.value = 'center';
  customCoord.value = { x: 50, y: 50 };
  addNotification('info', 'Post settings reset to default');
}

export function usePostState() {
  return {
    bgMode,
    selectedPreset,
    solidColor,
    uploadedImage,
    aspectRatio,
    resolution,
    grainEffect,
    vintageEffect,
    vignetteEffect,
    postText,
    selectedTemplateId,
    fontSize,
    textColor,
    accentColor,
    customFontFamily,
    textPosition,
    customCoord,
    textScale,
    textLayers,
    activeLayerId,
    activeLayer,
    addTextLayer,
    removeTextLayer,
    notifications,
    addNotification,
    removeNotification,
    increaseTextSize,
    decreaseTextSize,
    resetPost
  };
}
