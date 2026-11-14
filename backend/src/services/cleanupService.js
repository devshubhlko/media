import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR, EXPORT_DIR, FILE_TTL_MINUTES } from '../config.js';
import { logger } from '../utils/logger.js';

/**
 * Deletes files older than ttlMinutes from the target directory
 */
export function cleanOldFiles(directory, ttlMinutes = FILE_TTL_MINUTES) {
  if (!fs.existsSync(directory)) return;

  const now = Date.now();
  const maxAgeMs = ttlMinutes * 60 * 1000;

  try {
    const files = fs.readdirSync(directory);
    let deletedCount = 0;

    files.forEach(file => {
      const filePath = path.join(directory, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.isFile() && (now - stats.mtimeMs > maxAgeMs)) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      } catch (fileErr) {
        // file might have been unlinked already
      }
    });

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} expired files from ${path.basename(directory)}`);
    }
  } catch (err) {
    logger.error(`Error during directory cleanup for ${directory}:`, err);
  }
}

/**
 * Deletes a specific file safely
 */
export function removeFile(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.debug(`Deleted file: ${filePath}`);
    }
  } catch (err) {
    logger.warn(`Could not delete file ${filePath}: ${err.message}`);
  }
}

/**
 * Initializes automatic background cleanup
 */
export function initCleanupService(intervalMinutes = 15) {
  logger.info(`Initializing temporary file cleanup service (TTL: ${FILE_TTL_MINUTES} mins, Interval: ${intervalMinutes} mins)`);

  // Run initial cleanup on server startup
  cleanOldFiles(UPLOAD_DIR, FILE_TTL_MINUTES);
  cleanOldFiles(EXPORT_DIR, FILE_TTL_MINUTES);

  // Schedule periodic cleanup
  const intervalMs = intervalMinutes * 60 * 1000;
  setInterval(() => {
    cleanOldFiles(UPLOAD_DIR, FILE_TTL_MINUTES);
    cleanOldFiles(EXPORT_DIR, FILE_TTL_MINUTES);
  }, intervalMs);
}
