/**
 * Deck image generation module
 *
 * Usage:
 * ```typescript
 * import { generateDeckImage } from '@lib/deckImage';
 *
 * const deck = {
 *   maindeck: [89631139, 46986414, ...],
 *   extradeck: [44508094, ...],
 *   sidedeck: [14558127, ...]
 * };
 *
 * const banlist = {
 *   banned: [46986414],
 *   limited: [89631139],
 *   semilimited: []
 * };
 *
 * const imageBuffer = await generateDeckImage(deck, banlist);
 * // Use imageBuffer to save to file or send in response
 * ```
 */

export { generateDeckImage, DeckImageGenerator } from './generator';
export { ImageCache } from './imageCache';
export { CardLayoutEngine, countCards, getUniqueCards } from './layout';
export { DEFAULT_CONFIG, CARD_IMAGE_BASE_URL, CARD_IMAGE_SMALL_URL } from './config';
export { saveDeckImage, deckImageExists, deleteDeckImage } from './saveDeckImage';
export type {
  DeckImageConfig,
  CardPosition,
  DeckSection,
  BanlistForImage,
  DeckForImage,
} from './types';
