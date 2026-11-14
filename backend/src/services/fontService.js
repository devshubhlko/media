import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const FONTS_DIR = path.resolve(__dirname, '../../assets/fonts');

// Ensure fonts directory exists
if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
}

const downloadingPromises = new Map();

/**
 * Ensures a Google Font is available in the local fonts directory for FFmpeg/libass.
 * If not present, downloads the TTF directly from Google Fonts API.
 */
export async function ensureFontAvailable(fontFamily) {
  if (!fontFamily || typeof fontFamily !== 'string') return;
  const cleanFamily = fontFamily.trim();
  const safeName = cleanFamily.replace(/\s+/g, '');
  const fontPath = path.join(FONTS_DIR, `${safeName}-Regular.ttf`);

  // Already cached
  if (fs.existsSync(fontPath)) {
    return fontPath;
  }

  // Already downloading
  if (downloadingPromises.has(cleanFamily)) {
    return downloadingPromises.get(cleanFamily);
  }

  const promise = (async () => {
    try {
      logger.info(`Fetching font '${cleanFamily}' from Google Fonts for FFmpeg...`);
      const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(cleanFamily)}:wght@400;700&display=swap`;
      const cssRes = await fetch(cssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });

      if (!cssRes.ok) {
        logger.warn(`Could not fetch CSS for font '${cleanFamily}': ${cssRes.status}`);
        return null;
      }

      const css = await cssRes.text();
      const match = css.match(/src:\s*url\((https:\/\/[^)]+\.ttf)\)/);
      if (!match) {
        logger.warn(`Could not extract TTF URL from CSS for font '${cleanFamily}'`);
        return null;
      }

      const fontRes = await fetch(match[1]);
      if (!fontRes.ok) {
        logger.warn(`Could not download TTF for font '${cleanFamily}'`);
        return null;
      }

      const buf = Buffer.from(await fontRes.arrayBuffer());
      fs.writeFileSync(fontPath, buf);
      logger.info(`Successfully cached font '${cleanFamily}' to ${fontPath} (${buf.length} bytes)`);
      return fontPath;
    } catch (err) {
      logger.warn(`Failed to auto-fetch font '${cleanFamily}': ${err.message}`);
      return null;
    } finally {
      downloadingPromises.delete(cleanFamily);
    }
  })();

  downloadingPromises.set(cleanFamily, promise);
  return promise;
}
