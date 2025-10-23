/**
 * Save banlist image to filesystem
 */

import fs from 'fs/promises';
import path from 'path';
import { generateBanlistImage } from './generator';
import { BanlistForImage } from './types';

/**
 * Save a banlist image to public/banlist-images/{sessionNumber}.png
 */
export async function saveBanlistImage(banlist: BanlistForImage): Promise<string> {
  const imageBuffer = await generateBanlistImage(banlist);

  // Ensure the directory exists
  const banlistImagesDir = path.join(process.cwd(), 'public', 'banlist-images');
  await fs.mkdir(banlistImagesDir, { recursive: true });

  // Save the image
  const imagePath = path.join(banlistImagesDir, `${banlist.sessionNumber}.png`);
  await fs.writeFile(imagePath, imageBuffer);

  return imagePath;
}
