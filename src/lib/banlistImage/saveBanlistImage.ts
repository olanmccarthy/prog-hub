/**
 * Save banlist image to filesystem
 */

import fs from 'fs/promises';
import path from 'path';
import { generateBanlistImage } from './generator';
import { BanlistForImage } from './types';
import { notifyError } from '@lib/discordClient';

/**
 * Save a banlist image to public/banlist-images/{sessionNumber}.png
 */
export async function saveBanlistImage(banlist: BanlistForImage): Promise<string> {
  try {
    console.log(`[saveBanlistImage] Starting image generation for session ${banlist.sessionNumber}`);

    const imageBuffer = await generateBanlistImage(banlist);
    console.log(`[saveBanlistImage] Generated image buffer (${imageBuffer.length} bytes) for session ${banlist.sessionNumber}`);

    // Ensure the directory exists
    const banlistImagesDir = path.join(process.cwd(), 'public', 'banlist-images');
    console.log(`[saveBanlistImage] Creating directory: ${banlistImagesDir}`);
    await fs.mkdir(banlistImagesDir, { recursive: true });

    // Save the image
    const imagePath = path.join(banlistImagesDir, `${banlist.sessionNumber}.png`);
    console.log(`[saveBanlistImage] Writing image to: ${imagePath}`);
    await fs.writeFile(imagePath, imageBuffer);
    console.log(`[saveBanlistImage] Successfully saved image for session ${banlist.sessionNumber}`);

    return imagePath;
  } catch (error) {
    console.error(`[saveBanlistImage] Failed to save banlist image for session ${banlist.sessionNumber}:`, error);

    // Send error notification to Discord
    await notifyError(
      'saveBanlistImage',
      error instanceof Error ? error.message : String(error),
      {
        sessionNumber: banlist.sessionNumber,
        banlistSize: {
          banned: banlist.banned.length,
          limited: banlist.limited.length,
          semilimited: banlist.semilimited.length,
          unlimited: banlist.unlimited.length,
        },
      }
    );

    throw error;
  }
}
