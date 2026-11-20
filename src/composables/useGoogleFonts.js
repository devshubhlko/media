import { ref, onMounted } from 'vue';

// Curated Hindi / Devanagari fonts
export const HINDI_FONTS = [
  { family: 'Gotu', label: 'Gotu (Minimal Ref)', sample: 'बहुत हार के आया हूँ' },
  { family: 'Rozha One', label: 'Rozha One (Royal Serif)', sample: 'शाही शायरी और अंदाज़' },
  { family: 'Yatra One', label: 'Yatra One (Devanagari Display)', sample: 'रौद्र ज़िद और हिम्मत' },
  { family: 'Noto Sans Devanagari', label: 'Noto Sans Devanagari (Clean)', sample: 'खामोशी का शोर सबसे गहरा' },
  { family: 'Poppins', label: 'Poppins (Modern Clean)', sample: 'सपनों का शोर गूंजेगा' },
  { family: 'Mukta', label: 'Mukta (Bold Modern)', sample: 'कर्म ही तुम्हारा धर्म है' },
  { family: 'Khand', label: 'Khand (Condensed Bold)', sample: 'वक़्त तुम्हारा भी आएगा' },
  { family: 'Kalam', label: 'Kalam (Handwritten Diary)', sample: 'तेरी यादों में हर शाम ढलती है' },
  { family: 'Rajdhani', label: 'Rajdhani (Cyber Tech)', sample: 'मेहनत इतनी करो कि किस्मत झुक जाए' },
  { family: 'Tiro Devanagari Hindi', label: 'Tiro Devanagari (Classic Book)', sample: 'कुछ बातें दिल में ही अच्छी हैं' },
  { family: 'Baloo 2', label: 'Baloo 2 (Soft Rounded)', sample: 'मुस्कुराओ क्योंकि ज़िंदगी खूबसूरत है' },
  { family: 'Modak', label: 'Modak (Extra Chunky)', sample: 'दमदार और जबरदस्त' },
  { family: 'Karma', label: 'Karma (Elegant Editorial)', sample: 'शांति और सुकून' },
  { family: 'Amita', label: 'Amita (Cursive Hindi)', sample: 'इश्क़ सुफियाना' },
  { family: 'Halant', label: 'Halant (Refined Serif)', sample: 'सच्चाई की जीत' }
];

// Curated English & Global typography fonts
export const ENGLISH_FONTS = [
  { family: 'Inter', label: 'Inter (Ultra Clean Minimal)', sample: 'Build in silence, let success make noise' },
  { family: 'Anton', label: 'Anton (Impact High Bold)', sample: 'THE FIX SELLS EVERYTHING' },
  { family: 'Caveat', label: 'Caveat (Aesthetic Handwriting)', sample: 'It is always remembered' },
  { family: 'Playfair Display', label: 'Playfair Display (Vogue Luxury)', sample: 'Luxury & Timeless Aesthetic' },
  { family: 'Bebas Neue', label: 'Bebas Neue (Punchy Headline)', sample: 'EARLY ACCESS IS OPEN' },
  { family: 'Cinzel', label: 'Cinzel (Imperial Roman)', sample: 'THE SIGNATURE VERDICT' },
  { family: 'Space Mono', label: 'Space Mono (Dev Cyberpunk)', sample: 'SYSTEM_FAILURE_01' },
  { family: 'Special Elite', label: 'Special Elite (Typewriter Vintage)', sample: 'Memories after midnight sunset' },
  { family: 'Abril Fatface', label: 'Abril Fatface (High-Fashion Title)', sample: 'Editorial Magazine' },
  { family: 'Syne', label: 'Syne (Experimental Futuristic)', sample: 'GEN-Z FUTURE SHIFT' },
  { family: 'Alex Brush', label: 'Alex Brush (Calligraphy Script)', sample: 'Save Your Tears' },
  { family: 'Montserrat', label: 'Montserrat (Geometric Bold)', sample: 'NEVER FOLD STAY STRONG' },
  { family: 'Great Vibes', label: 'Great Vibes (Flowing Signature)', sample: 'Stories worth telling' },
  { family: 'Archivo Black', label: 'Archivo Black (Solid Monster)', sample: 'BREAKING NEWS ALERT' }
];

const loadedFontsSet = new Set();

export function useGoogleFonts() {
  function loadGoogleFont(fontFamily) {
    if (!fontFamily || loadedFontsSet.has(fontFamily)) return;

    try {
      const linkId = `gfont-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
      if (document.getElementById(linkId)) {
        loadedFontsSet.add(fontFamily);
        return;
      }

      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700&display=swap`;
      document.head.appendChild(link);

      loadedFontsSet.add(fontFamily);
    } catch (e) {
      console.warn('Failed to load font:', e);
    }
  }

  // Preload top fonts so modal preview is instantaneous
  function preloadTopFonts() {
    [...HINDI_FONTS, ...ENGLISH_FONTS].forEach(f => loadGoogleFont(f.family));
  }

  return {
    hindiFonts: HINDI_FONTS,
    englishFonts: ENGLISH_FONTS,
    loadGoogleFont,
    preloadTopFonts
  };
}
