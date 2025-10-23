/**
 * Image cache for card images
 * Implements a two-tier caching system (memory + disk)
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { CARD_IMAGE_SMALL_URL, PLACEHOLDER_IMAGE_URL } from './config';

export class ImageCache {
  private memoryCache: Map<number, Buffer> = new Map();
  private diskCacheDir: string;

  constructor(diskCacheDir: string = '/tmp/card-image-cache') {
    this.diskCacheDir = diskCacheDir;
  }

  /**
   * Initialize the cache directory
   */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.diskCacheDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create cache directory:', error);
    }
  }

  /**
   * Get a card image buffer
   * Checks memory cache -> disk cache -> downloads from URL
   */
  async getCardImage(cardId: number, width: number, height: number): Promise<Buffer> {
    const cacheKey = cardId;

    // Check memory cache first
    if (this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey)!;
      return this.resizeImage(cached, width, height);
    }

    // Check disk cache
    const diskPath = this.getDiskCachePath(cardId);
    try {
      const diskCached = await fs.readFile(diskPath);
      this.memoryCache.set(cacheKey, diskCached);
      return this.resizeImage(diskCached, width, height);
    } catch {
      // Not in disk cache, download
    }

    // Download from URL
    try {
      const imageBuffer = await this.downloadCardImage(cardId);

      // Store in both caches
      this.memoryCache.set(cacheKey, imageBuffer);
      await fs.writeFile(diskPath, imageBuffer).catch(() => {
        // Ignore disk write errors
      });

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
   * Get the disk cache path for a card ID
   */
  private getDiskCachePath(cardId: number): string {
    const idStr = cardId.toString();
    const subfolder = idStr.substring(0, 2).padStart(2, '0');
    const subfolderPath = path.join(this.diskCacheDir, subfolder);

    // Create subfolder if needed (sync for simplicity)
    try {
      fsSync.mkdirSync(subfolderPath, { recursive: true });
    } catch {
      // Ignore errors
    }

    return path.join(subfolderPath, `${cardId}.jpg`);
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
      diskCacheDir: this.diskCacheDir,
    };
  }
}
