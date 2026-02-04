/**
 * Image cache for card images
 * Optimized for local filesystem access with memory cache for frequently used cards
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { CARD_IMAGE_SMALL_URL, PLACEHOLDER_IMAGE_URL, CARD_IMAGE_LOCAL_PATH } from './config';

export class ImageCache {
  private memoryCache: Map<number, Buffer> = new Map();

  /**
   * Initialize the cache (no-op now, kept for compatibility)
   */
  async init(): Promise<void> {
    // No initialization needed for local filesystem
  }

  /**
   * Get a card image buffer
   * Checks memory cache -> local filesystem -> downloads from URL as fallback
   */
  async getCardImage(cardId: number, width: number, height: number): Promise<Buffer> {
    const cacheKey = cardId;

    // Check memory cache first (fastest)
    if (this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey)!;
      return this.resizeImage(cached, width, height);
    }

    // Try local filesystem (mounted card images)
    try {
      const localPath = path.join(CARD_IMAGE_LOCAL_PATH, `${cardId}.jpg`);
      const localImage = await fs.readFile(localPath);
      this.memoryCache.set(cacheKey, localImage);
      return this.resizeImage(localImage, width, height);
    } catch {
      // Not in local filesystem, fall back to API
    }

    // Download from URL as last resort
    try {
      const imageBuffer = await this.downloadCardImage(cardId);
      this.memoryCache.set(cacheKey, imageBuffer);
      return this.resizeImage(imageBuffer, width, height);
    } catch (error) {
      console.error(`Failed to load card ${cardId}:`, error);
      return this.getPlaceholderImage(width, height);
    }
  }

  /**
   * Download a card image from the YGOProDeck API
   */
  private async downloadCardImage(cardId: number): Promise<Buffer> {
    const url = `${CARD_IMAGE_SMALL_URL}${cardId}.jpg`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate we got actual data
    if (!buffer || buffer.length === 0) {
      throw new Error(`Downloaded image for card ${cardId} is empty`);
    }

    return buffer;
  }

  /**
   * Resize an image buffer to the specified dimensions
   */
  private async resizeImage(buffer: Buffer, width: number, height: number): Promise<Buffer> {
    // Validate buffer is not empty
    if (!buffer || buffer.length === 0) {
      console.error('Cannot resize empty buffer, returning fallback image');
      return sharp({
        create: {
          width,
          height,
          channels: 3,
          background: { r: 50, g: 50, b: 50 },
        },
      }).jpeg().toBuffer();
    }

    try {
      return await sharp(buffer)
        .resize(width, height, {
          fit: 'fill',
          kernel: sharp.kernel.lanczos3,
        })
        .toBuffer();
    } catch (error) {
      console.error('Failed to resize image:', error);
      // Return solid color fallback
      return sharp({
        create: {
          width,
          height,
          channels: 3,
          background: { r: 50, g: 50, b: 50 },
        },
      }).jpeg().toBuffer();
    }
  }

  /**
   * Get a placeholder image for missing cards
   */
  private async getPlaceholderImage(width: number, height: number): Promise<Buffer> {
    try {
      const response = await fetch(PLACEHOLDER_IMAGE_URL);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return this.resizeImage(buffer, width, height);
    } catch {
      // If placeholder fails, create a solid color rectangle
      return sharp({
        create: {
          width,
          height,
          channels: 3,
          background: { r: 50, g: 50, b: 50 },
        },
      }).jpeg().toBuffer();
    }
  }


  /**
   * Clear the memory cache
   */
  clearMemoryCache(): void {
    this.memoryCache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memoryCacheSize: this.memoryCache.size,
    };
  }
}
