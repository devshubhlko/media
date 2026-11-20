/**
 * Curated Reels Subtitle & Post Templates
 * Strictly keeping only the 15 selected templates
 */

export const styles = [
  // New 1. Podcast Watermark Headline (Ref Image 1)
  {
    id: "podcast-watermark",
    name: "पॉडकास्ट वॉटरमार्क हेडलाइन",
    lang: "english",
    tag: "viral",
    maxWords: 5,
    defaultWords: ["THE", "SECRET", "FORMULA", "EXPLAINED"],
    renderStatic: (words) => {
      const line1 = words.slice(0, 2).join(" ");
      const line2 = words.slice(2, 3).join(" ");
      const line3 = words.slice(3).join(" ");
      return `
        <div class="ref-podcast-watermark-container">
          <div class="ref-podcast-bg-watermark">PODCAST</div>
          <div class="ref-podcast-foreground">
            <div class="ref-podcast-line">${line1}</div>
            ${line2 ? `<div class="ref-podcast-line">${line2}</div>` : ''}
            ${line3 ? `<div class="ref-podcast-line">${line3}</div>` : ''}
          </div>
        </div>
      `;
    }
  },

  // New 2. White Tiered Block Boxes (Ref Image 2)
  {
    id: "tiered-boxes",
    name: "व्हाइट टियर्ड ब्लॉक बॉक्सेस",
    lang: "english",
    tag: "hook",
    maxWords: 5,
    defaultWords: ["THE", "SECRET", "FORMULA", "EXPLAINED"],
    renderStatic: (words) => {
      const line1 = words.slice(0, 2).join(" ");
      const line2 = words.slice(2, 3).join(" ");
      const line3 = words.slice(3).join(" ");
      return `
        <div class="ref-tiered-boxes-container">
          <div class="ref-tiered-box-row">${line1}</div>
          ${line2 ? `<div class="ref-tiered-box-row">${line2}</div>` : ''}
          ${line3 ? `<div class="ref-tiered-box-row">${line3}</div>` : ''}
        </div>
      `;
    }
  },

  // New 3. Viral Contrast Underline Dual-Tone (Ref Image 3)
  {
    id: "contrast-underline",
    name: "कॉन्ट्रास्ट अंडरलाइन डुअल-टोन",
    lang: "english",
    tag: "editorial",
    maxWords: 5,
    defaultWords: ["THE", "SECRET", "FORMULA", "EXPLAINED"],
    renderStatic: (words) => {
      const line1 = words.slice(0, 2).join(" ");
      const line2 = words.slice(2, 3).join(" ");
      const line3 = words.slice(3).join(" ");
      return `
        <div class="ref-contrast-underline-container">
          <div class="ref-contrast-line-white">${line1}</div>
          ${line2 ? `<div class="ref-contrast-line-yellow">${line2}</div>` : ''}
          <div class="ref-contrast-divider"></div>
          ${line3 ? `<div class="ref-contrast-line-yellow">${line3}</div>` : ''}
          ${line3 ? `<div class="ref-contrast-divider"></div>` : ''}
        </div>
      `;
    }
  },

  // 1. रेड बार मिनिमल (Ref Style)
  {
    id: "hindi-redbar",
    name: "रेड बार मिनिमल (Ref Style)",
    lang: "hindi",
    tag: "aesthetic",
    maxWords: 8,
    defaultWords: ["बहुत", "हार", "के", "आया", "हूँ,", "देखना", "बहुत", "जीत", "कर", "जाऊँगा..."],
    renderStatic: (words) => {
      const half = Math.ceil(words.length / 2);
      const text1 = words.slice(0, half).join(" ");
      const text2 = words.slice(half).join(" ");
      return `
        <div class="ref-hindi-redbar-container">
          <div class="ref-hindi-redbar-content">
            <div class="ref-hindi-redbar-text1">${text1}</div>
            ${text2 ? `<div class="ref-hindi-redbar-text2">${text2}</div>` : ''}
          </div>
        </div>
      `;
    }
  },

  // 2. शाही शायरी
  {
    id: "hindi-rozkha",
    name: "शाही शायरी",
    lang: "hindi",
    tag: "hindi",
    maxWords: 6,
    defaultWords: ["खामोशी", "का", "शोर", "सबसे", "गहरा", "होता", "है"],
    renderStatic: (words) => {
      const half = Math.ceil(words.length / 2);
      const main = words.slice(0, half).join(" ");
      const sub = words.slice(half).join(" ");
      return `
        <div class="ref-hindi-rozkha-container">
          <div class="ref-hindi-rozkha-main">${main}</div>
          ${sub ? `<div class="ref-hindi-rozkha-sub">${sub}</div>` : ''}
        </div>
      `;
    }
  },

  // 3. सनातन डिवाइन
  {
    id: "hindi-divine",
    name: "सनातन डिवाइन",
    lang: "hindi",
    tag: "hindi",
    maxWords: 5,
    defaultWords: ["कर्म", "ही", "तुम्हारा", "धर्म", "है"],
    renderStatic: (words) => {
      const main = words.slice(0, 2).join(" ");
      const sub = words.slice(2).join(" ");
      return `
        <div class="ref-hindi-divine-container">
          <div class="ref-hindi-divine-main">${main}</div>
          ${sub ? `<div class="ref-hindi-divine-sub">${sub}</div>` : ''}
        </div>
      `;
    }
  },

  // 4. The 'SELLS' Hybrid
  {
    id: "sells",
    name: "The 'SELLS' Hybrid",
    lang: "english",
    tag: "viral",
    maxWords: 4,
    defaultWords: ["it", "as", "the", "fix", "SELLS"],
    renderStatic: (words) => {
      if (words.length === 1) {
        return `<div class="ref-sells-container"><div class="ref-sells">${words[0]}</div></div>`;
      }
      const top = words.slice(0, words.length - 1).join(" ");
      const main = words[words.length - 1];
      return `
        <div class="ref-sells-container">
          ${top ? `<div class="ref-sells-hand">${top}</div>` : ''}
          <div class="ref-sells">${main}</div>
        </div>
      `;
    }
  },

  // 5. The Signature Luxury
  {
    id: "bought",
    name: "The Signature Luxury",
    tag: "luxury",
    maxWords: 3,
    defaultWords: ["bought", "it", "Verdict."],
    renderStatic: (words) => {
      const scriptWord = words[0] || "";
      const subWords = words.slice(1).join(" ");
      return `
        <div class="ref-bought-container">
          <div class="ref-bought-script">${scriptWord}</div>
          ${subWords ? `<div class="ref-bought-sub">${subWords}</div>` : ''}
        </div>
      `;
    }
  },

  // 6. Multi-Tier Alert Boxes
  {
    id: "fired",
    name: "Multi-Tier Alert Boxes",
    tag: "hook",
    maxWords: 4,
    defaultWords: ["I", "FIRED", "OUR", "BIGGEST"],
    renderStatic: (words) => {
      if (words.length === 1) {
        return `<div class="ref-fired-container"><div class="ref-fired-row1"><div class="ref-fired-pill-yellow">${words[0]}</div></div></div>`;
      }
      const w1 = words[0] || "";
      const w2 = words[1] || "";
      const w3 = words.slice(2).join(" ");
      return `
        <div class="ref-fired-container">
          <div class="ref-fired-row1">
            <div class="ref-fired-pill-yellow">${w1}</div>
            ${w2 ? `<div class="ref-fired-pill-red">${w2}</div>` : ''}
          </div>
          ${w3 ? `<div class="ref-fired-row2">${w3}</div>` : ''}
        </div>
      `;
    }
  },

  // 7. High-Fashion Headline
  {
    id: "early",
    name: "High-Fashion Headline",
    tag: "editorial",
    maxWords: 5,
    defaultWords: ["EARLY", "ACCESS", "IS", "OPEN", "THIS", "WEEK."],
    renderStatic: (words) => {
      const main = words[0] || "";
      const sub = words.slice(1).join(" ");
      return `
        <div class="ref-early-container">
          <div class="ref-early-title">${main}</div>
          ${sub ? `<div class="ref-early-sub">${sub}</div>` : ''}
        </div>
      `;
    }
  },

  // 8. Neon Accent Underline
  {
    id: "underline",
    name: "Neon Accent Underline",
    tag: "editorial",
    maxWords: 3,
    defaultWords: ["remember", "that's"],
    renderStatic: (words) => {
      const w1 = words[0] || "";
      const w2 = words.slice(1).join(" ");
      return `
        <div class="ref-underline-wrap">
          <span class="ref-underline-accent">${w1}</span>
          ${w2 ? `<span>${w2}</span>` : ''}
        </div>
      `;
    }
  },

  // 9. Industrial Caution Tag
  {
    id: "trade",
    name: "Industrial Caution Tag",
    tag: "hook",
    maxWords: 3,
    defaultWords: ["TRADE.", "IN", "THIS"],
    renderStatic: (words) => {
      const main = words[0] || "";
      const sub = words.slice(1).join(" ");
      return `
        <div class="ref-trade-container">
          <div class="ref-trade-box">${main}</div>
          ${sub ? `<div class="ref-trade-sub">${sub}</div>` : ''}
        </div>
      `;
    }
  },

  // 10. Storyteller Script Duo
  {
    id: "storyteller",
    name: "Storyteller Script Duo",
    tag: "editorial",
    maxWords: 5,
    defaultWords: ["remembered,", "stop", "listing.", "Start", "telling."],
    renderStatic: (words) => {
      if (words.length === 1) {
        return `<div class="ref-storyteller-wrap"><div class="ref-storyteller-line1">${words[0]}</div></div>`;
      }
      const half = Math.ceil(words.length / 2);
      const line1 = words.slice(0, half).join(" ");
      const line2 = words.slice(half).join(" ");
      return `
        <div class="ref-storyteller-wrap">
          <div class="ref-storyteller-line1">${line1}</div>
          ${line2 ? `<div class="ref-storyteller-line2">${line2}</div>` : ''}
        </div>
      `;
    }
  },

  // 11. Puffy Vibrant Studio
  {
    id: "studio",
    name: "Puffy Vibrant Studio",
    tag: "hook",
    maxWords: 4,
    defaultWords: ["studio", "is", "officially", "open"],
    renderStatic: (words) => {
      const main = words[0] || "";
      const sub = words.slice(1).join(" ");
      return `
        <div class="ref-studio-container">
          <div class="ref-studio-text">${main}</div>
          ${sub ? `<div class="ref-studio-sub"><span>is</span> ${sub}</div>` : ''}
        </div>
      `;
    }
  },

  // 12. Editorial Block + Boxes
  {
    id: "month",
    name: "Editorial Block + Boxes",
    tag: "editorial",
    maxWords: 4,
    defaultWords: ["MONTH", "THREE", "OF", "BUILDING", "IN"],
    renderStatic: (words) => {
      const main = words[0] || "MONTH";
      const boxes = words.slice(1).map(w => `<div class="ref-box">${w}</div>`).join("");
      return `
        <div class="ref-month-container">
          <div class="ref-month">${main}</div>
          <div class="ref-boxes-row">${boxes}</div>
        </div>
      `;
    }
  },

  // 13. Mixed Typography Teams
  {
    id: "teams",
    name: "Mixed Typography Teams",
    tag: "viral",
    maxWords: 4,
    defaultWords: ["Marketing", "TEAMS", "LOSE", "weeks"],
    renderStatic: (words) => {
      if (words.length <= 2) {
        return `<div class="ref-teams-container"><div class="ref-teams ref-teams-shadow">${words.join(" ")}</div></div>`;
      }
      const top = words[0] || "";
      const center = words.slice(1, 3).join("<br>");
      const bottom = words.slice(3).join(" ");
      return `
        <div class="ref-teams-container">
          ${top ? `<div class="ref-teams-hand">${top}</div>` : ''}
          <div class="ref-teams ref-teams-shadow">${center}</div>
          ${bottom ? `<div class="ref-teams-hand bottom">${bottom}</div>` : ''}
        </div>
      `;
    }
  },

  // 14. Lofi Typewriter Paper
  {
    id: "lofi-paper",
    name: "Lofi Typewriter Paper",
    tag: "lofi",
    maxWords: 4,
    defaultWords: ["cigarettes", "after", "sunset", "memories"],
    renderStatic: (words) => {
      return `<div class="ref-lofi-tape">${words.join(" ")}</div>`;
    }
  },

  // 15. Punk Ransom Cutouts
  {
    id: "punk-tape",
    name: "Punk Ransom Cutouts",
    tag: "hook",
    maxWords: 4,
    defaultWords: ["ALL", "MY", "FAVORITE", "SONGS"],
    renderStatic: (words) => {
      const cutouts = words.map((w, idx) => `
        <div class="ref-punk-cutout ${idx % 2 === 1 ? 'dark' : ''}">${w}</div>
      `).join("");
      return `<div class="ref-punk-row">${cutouts}</div>`;
    }
  }
];

export const BACKGROUND_OPTIONS = [
  { id: 'none', label: 'Timeline Scene Images (Default)' },
  { id: 'bg-minimal', label: 'Minimal Dark Studio' },
  { id: 'bg-midnight', label: 'Midnight Purple Gradient' },
  { id: 'bg-sunset', label: 'Warm Sunset Aesthetic' },
  { id: 'bg-lofi', label: 'Lo-Fi Teal & Slate' },
  { id: 'bg-cyber', label: 'Cyberpunk Neon Grid' },
  { id: 'bg-royal', label: 'Royal Amber & Crimson' },
  { id: 'bg-aurora', label: 'Aurora Borealis' }
];

export function getStyleById(id) {
  return styles.find(s => s.id === id) || styles[0];
}

export function getHindiStyles() {
  return styles;
}

export function getEnglishStyles() {
  return styles;
}
