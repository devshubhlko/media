import html2canvas from 'html2canvas';

const DIMENSIONS_MAP = {
  '9:16': {
    '720p': { width: 720, height: 1280 },
    '1080p': { width: 1080, height: 1920 },
    '4k': { width: 2160, height: 3840 }
  },
  '1:1': {
    '720p': { width: 1080, height: 1080 },
    '1080p': { width: 2048, height: 2048 },
    '4k': { width: 3840, height: 3840 }
  },
  '16:9': {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '4k': { width: 3840, height: 2160 }
  }
};

/**
 * Downloads high quality HD post image (PNG)
 */
export async function downloadPostImage(element, aspectRatio = '9:16', resolution = '1080p', fileName = 'post.png') {
  if (!element) {
    throw new Error('Target element not found');
  }

  // Ensure all webfonts are loaded
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {}
  }

  const dims = DIMENSIONS_MAP[aspectRatio]?.[resolution] || { width: 1080, height: 1920 };
  const targetW = dims.width;
  const targetH = dims.height;

  const currentW = element.offsetWidth || 1;
  const scale = targetW / currentW;

  const originalBorder = element.style.border;
  const originalBorderWidth = element.style.borderWidth;
  const originalOutline = element.style.outline;
  const originalBoxShadow = element.style.boxShadow;
  const originalBorderRadius = element.style.borderRadius;

  try {
    // Strip border and shadow on target element for clean export
    element.style.border = 'none';
    element.style.borderWidth = '0px';
    element.style.outline = 'none';
    element.style.boxShadow = 'none';
    element.style.borderRadius = '0px';
    element.classList.remove('border', 'border-slate-300', 'dark:border-gray-800', 'shadow-2xl', 'rounded-xl');

    const canvas = await html2canvas(element, {
      scale: Math.max(2, scale),
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      imageTimeout: 0,
      ignoreElements: (el) => el?.classList?.contains('hide-on-export')
    });

    // Create clean canvas with exact HD resolution
    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetW;
    outCanvas.height = targetH;
    const outCtx = outCanvas.getContext('2d');
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(canvas, 0, 0, targetW, targetH);

    // Trigger download
    const dataUrl = outCanvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } finally {
    // Restore styling
    element.style.border = originalBorder;
    element.style.borderWidth = originalBorderWidth;
    element.style.outline = originalOutline;
    element.style.boxShadow = originalBoxShadow;
    element.style.borderRadius = originalBorderRadius;
    element.classList.add('border', 'border-slate-300', 'dark:border-gray-800', 'shadow-2xl', 'rounded-xl');
  }
}
