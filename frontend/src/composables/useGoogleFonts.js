import { ref, onMounted } from 'vue';

const GOOGLE_FONTS_API_KEY = 'AIzaSyCl9SxEXh-nqyUza8E0iyLaHSvRFWix95A';

// Curated Hindi / Devanagari fallback fonts
const DEFAULT_HINDI_FONTS = [
  { family: 'Gotu', category: 'sans-serif' },
  { family: 'Poppins', category: 'sans-serif' },
  { family: 'Noto Sans Devanagari', category: 'sans-serif' },
  { family: 'Khand', category: 'sans-serif' },
  { family: 'Mukta', category: 'sans-serif' },
  { family: 'Baloo 2', category: 'display' },
  { family: 'Rajdhani', category: 'sans-serif' },
  { family: 'Kalam', category: 'handwriting' },
  { family: 'Tiro Devanagari Hindi', category: 'serif' },
  { family: 'Karma', category: 'serif' },
  { family: 'Yatra One', category: 'display' },
  { family: 'Rozha One', category: 'serif' },
  { family: 'Modak', category: 'display' },
  { family: 'Akshar', category: 'sans-serif' },
  { family: 'Hind', category: 'sans-serif' },
  { family: 'Ranga', category: 'display' },
  { family: 'Halant', category: 'serif' },
  { family: 'Amita', category: 'handwriting' },
  { family: 'Biryani', category: 'sans-serif' },
  { family: 'Eczar', category: 'serif' },
  { family: 'Kurale', category: 'serif' },
  { family: 'Pragati Narrow', category: 'sans-serif' },
  { family: 'Samarkan', category: 'display' }
];

const hindiFonts = ref([...DEFAULT_HINDI_FONTS]);
const isLoadingFonts = ref(false);
const loadedFontsSet = new Set();

export function useGoogleFonts() {
  async function fetchHindiFonts() {
    if (hindiFonts.value.length > DEFAULT_HINDI_FONTS.length) {
      return; // already loaded from API
    }

    try {
      isLoadingFonts.value = true;
      const url = `https://www.googleapis.com/webfonts/v1/webfonts?key=${GOOGLE_FONTS_API_KEY}&subset=devanagari&sort=popularity`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Google Fonts API responded with ${res.status}`);
      const data = await res.json();

      if (data.items && Array.isArray(data.items)) {
        // Filter strictly to Devanagari / Hindi fonts
        const devanagariOnly = data.items
          .filter(f => f.subsets && f.subsets.includes('devanagari'))
          .map(f => ({
            family: f.family,
            category: f.category || 'sans-serif',
            variants: f.variants || []
          }));

        if (devanagariOnly.length > 0) {
          hindiFonts.value = devanagariOnly;
        }
      }
    } catch (err) {
      console.warn('Could not fetch live Google Fonts list, using curated Hindi fonts fallback:', err.message);
    } finally {
      isLoadingFonts.value = false;
    }
  }

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
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;600;700;800&display=swap`;
      document.head.appendChild(link);

      loadedFontsSet.add(fontFamily);
    } catch (e) {
      console.warn('Failed to inject font stylesheet:', e);
    }
  }

  return {
    hindiFonts,
    isLoadingFonts,
    fetchHindiFonts,
    loadGoogleFont
  };
}
