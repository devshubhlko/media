import { styles, getStyleById } from './reelsStyles.js';

export { styles, getStyleById };

/**
 * Smart template renderer that adapts any multi-line or long user text into the selected template format
 */
export function renderPostTemplate(templateId, fullText) {
  const style = getStyleById(templateId);
  if (!style) return '';

  const cleanText = (fullText || '').trim();
  if (!cleanText) {
    return style.renderStatic(style.defaultWords || ['Your', 'Text', 'Here']);
  }

  // Check if text has manual newlines
  const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  if (lines.length > 1) {
    // 1. Podcast Watermark Headline (Ref Image 1)
    if (style.id === 'podcast-watermark') {
      const renderedLines = lines.map(line => `<div class="ref-podcast-line">${line}</div>`).join('');
      return `
        <div class="ref-podcast-watermark-container">
          <div class="ref-podcast-bg-watermark">PODCAST</div>
          <div class="ref-podcast-foreground">
            ${renderedLines}
          </div>
        </div>
      `;
    }

    // 2. White Tiered Block Boxes (Ref Image 2)
    if (style.id === 'tiered-boxes') {
      const renderedBoxes = lines.map(line => `<div class="ref-tiered-box-row">${line}</div>`).join('');
      return `
        <div class="ref-tiered-boxes-container">
          ${renderedBoxes}
        </div>
      `;
    }

    // 3. Contrast Underline Dual-Tone (Ref Image 3)
    if (style.id === 'contrast-underline') {
      const top = lines[0] || '';
      const middle = lines[1] || '';
      const bottom = lines.slice(2).join(' ') || '';
      return `
        <div class="ref-contrast-underline-container">
          <div class="ref-contrast-line-white">${top}</div>
          ${middle ? `<div class="ref-contrast-line-yellow">${middle}</div>` : ''}
          <div class="ref-contrast-divider"></div>
          ${bottom ? `<div class="ref-contrast-line-yellow">${bottom}</div>` : ''}
          ${bottom ? `<div class="ref-contrast-divider"></div>` : ''}
        </div>
      `;
    }

    // If the user provided multiple lines, faithfully render each line as written!
    if (style.id === 'hindi-redbar') {
      const renderedLines = lines.map(line => `<div class="ref-hindi-redbar-text1">${line}</div>`).join('');
      return `
        <div class="ref-hindi-redbar-container">
          <div class="ref-hindi-redbar-content">
            ${renderedLines}
          </div>
        </div>
      `;
    }

    if (style.id === 'genz-cyber') {
      const main = lines[0];
      const sub = lines.slice(1).join('<br>');
      return `
        <div class="ref-genz-cyber-container">
          <div class="ref-genz-cyber-tag">AESTHETIC</div>
          <div class="ref-genz-cyber-main">${main}</div>
          ${sub ? `<div class="ref-genz-cyber-sub">${sub}</div>` : ''}
        </div>
      `;
    }

    if (style.id === 'hindi-luxury') {
      const main = lines[0];
      const sub = lines.slice(1).join('<br>');
      return `
        <div class="ref-hindi-luxury-container">
          <div class="ref-hindi-luxury-crown">✦ ✦ ✦</div>
          <div class="ref-hindi-luxury-main">${main}</div>
          ${sub ? `<div class="ref-hindi-luxury-sub">${sub}</div>` : ''}
        </div>
      `;
    }

    if (style.id === 'genz-glass') {
      const main = lines[0];
      const sub = lines.slice(1).join('<br>');
      return `
        <div class="ref-genz-glass-container">
          <div class="ref-genz-glass-pill">
            <span>●</span>
            <span>SHAYARI • THOUGHTS</span>
          </div>
          <div class="ref-genz-glass-main">${main}</div>
          ${sub ? `<div class="ref-genz-glass-sub">${sub}</div>` : ''}
        </div>
      `;
    }

    if (style.id === 'hindi-poetry') {
      const main = lines[0];
      const sub = lines.slice(1).join('<br>');
      return `
        <div class="ref-hindi-poetry-container">
          <div class="ref-hindi-poetry-quote">“</div>
          <div class="ref-hindi-poetry-main">${main}</div>
          ${sub ? `<div class="ref-hindi-poetry-sub">${sub}</div>` : ''}
          <div class="ref-hindi-poetry-divider"></div>
        </div>
      `;
    }

    if (style.id === 'genz-highlighter') {
      const main = lines[0];
      const sub = lines.slice(1).join('<br>');
      return `
        <div class="ref-genz-highlighter-container">
          <div class="ref-genz-highlighter-box">${main}</div>
          ${sub ? `<div class="ref-genz-highlighter-sub">${sub}</div>` : ''}
        </div>
      `;
    }

    if (style.id === 'hindi-rozkha' || style.id === 'hindi-yatra' || style.id === 'hindi-hook' || style.id === 'hindi-divine' || style.id === 'hindi-love') {
      const main = lines[0];
      const sub = lines.slice(1).join('<br>');
      if (style.id === 'hindi-hook') {
        return `
          <div class="ref-hindi-hook-container">
            <div class="ref-hindi-hook-box">${main}</div>
            <div class="ref-hindi-hook-sub">${sub}</div>
          </div>
        `;
      }
      return `
        <div class="ref-${style.id}-container">
          <div class="ref-${style.id}-main">${main}</div>
          <div class="ref-${style.id}-sub">${sub}</div>
        </div>
      `;
    }
  }

  // Single line fallback for the 3 new styles
  if (style.id === 'podcast-watermark') {
    return `
      <div class="ref-podcast-watermark-container">
        <div class="ref-podcast-bg-watermark">PODCAST</div>
        <div class="ref-podcast-foreground">
          <div class="ref-podcast-line">${cleanText}</div>
        </div>
      </div>
    `;
  }

  if (style.id === 'tiered-boxes') {
    const words = cleanText.split(/\s+/).filter(Boolean);
    const half = Math.ceil(words.length / 2);
    const r1 = words.slice(0, half).join(' ');
    const r2 = words.slice(half).join(' ');
    return `
      <div class="ref-tiered-boxes-container">
        <div class="ref-tiered-box-row">${r1}</div>
        ${r2 ? `<div class="ref-tiered-box-row">${r2}</div>` : ''}
      </div>
    `;
  }

  if (style.id === 'contrast-underline') {
    const words = cleanText.split(/\s+/).filter(Boolean);
    const w1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
    const w2 = words.slice(Math.ceil(words.length / 2)).join(' ');
    return `
      <div class="ref-contrast-underline-container">
        <div class="ref-contrast-line-white">${w1}</div>
        <div class="ref-contrast-divider"></div>
        ${w2 ? `<div class="ref-contrast-line-yellow">${w2}</div>` : ''}
        ${w2 ? `<div class="ref-contrast-divider"></div>` : ''}
      </div>
    `;
  }

  // Single line fallback: If it's hindi-redbar, display as single line without splitting
  if (style.id === 'hindi-redbar') {
    return `
      <div class="ref-hindi-redbar-container">
        <div class="ref-hindi-redbar-content">
          <div class="ref-hindi-redbar-text1">${cleanText}</div>
        </div>
      </div>
    `;
  }

  // Word-based split
  const words = cleanText.split(/\s+/).filter(Boolean);
  return style.renderStatic(words);
}
