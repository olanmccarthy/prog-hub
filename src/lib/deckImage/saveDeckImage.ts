/**
 * Save deck image to filesystem
 */

import fs from 'fs/promises';
import path from 'path';
import { generateDeckImage } from './generator';
import { BanlistForImage, DeckForImage } from './types';

/**
 * Generate and save a deck image to the public/deck-images directory
 * @param decklistId - The ID of the decklist
 * @param deck - The deck data (maindeck, extradeck, sidedeck)
 * @param banlist - Optional banlist data for indicators
 * @returns The path to the saved image (relative to public/)
 */
export async function saveDeckImage(
  decklistId: number,
  deck: DeckForImage,
  banlist?: BanlistForImage
): Promise<string> {
  try {
    console.log(`[saveDeckImage] Starting image generation for decklist ${decklistId}`);

    // Generate the deck image
    const imageBuffer = await generateDeckImage(deck, banlist);
    console.log(`[saveDeckImage] Generated image buffer (${imageBuffer.length} bytes) for decklist ${decklistId}`);

    // Ensure the deck-images directory exists
    const deckImagesDir = path.join(process.cwd(), 'public', 'deck-images');
    console.log(`[saveDeckImage] Creating directory: ${deckImagesDir}`);
    await fs.mkdir(deckImagesDir, { recursive: true });

    // Save the image with the decklist ID as the filename
    const filename = `${decklistId}.png`;
    const filePath = path.join(deckImagesDir, filename);
    console.log(`[saveDeckImage] Writing image to: ${filePath}`);
    await fs.writeFile(filePath, imageBuffer);
    console.log(`[saveDeckImage] Successfully saved image for decklist ${decklistId}`);

    // Return the public URL path
    return `/deck-images/${filename}`;
  } catch (error) {
    console.error(`[saveDeckImage] Failed to save deck image for decklist ${decklistId}:`, error);
    throw error;
  }
}

/**
 * Check if a deck image exists for a given decklist ID
 * @param decklistId - The ID of the decklist
 * @returns True if the image exists, false otherwise
 */
export async function deckImageExists(decklistId: number): Promise<boolean> {
  const filePath = path.join(process.cwd(), 'public', 'deck-images', `${decklistId}.png`);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a deck image for a given decklist ID
 * @param decklistId - The ID of the decklist
 */
export async function deleteDeckImage(decklistId: number): Promise<void> {
  const filePath = path.join(process.cwd(), 'public', 'deck-images', `${decklistId}.png`);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}
