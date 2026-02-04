/**
 * Configuration for banlist image generation
 */

import { BanlistImageConfig } from './types';

export const DEFAULT_CONFIG: BanlistImageConfig = {
  width: 1200,
  height: 1800,
  cardWidth: 81,
  cardHeight: 118,
  backgroundColor: '#2d2d30',
  cardSpacing: 4,
  cardsPerRow: 10,
};

// Local card images path (mounted in Docker container)
export const CARD_IMAGE_LOCAL_PATH = '/app/card-images';

// Fallback to remote URLs if local images not available
export const CARD_IMAGE_BASE_URL = 'https://images.ygoprodeck.com/images/cards/';
export const CARD_IMAGE_SMALL_URL = 'https://images.ygoprodeck.com/images/cards_small/';
export const PLACEHOLDER_IMAGE_URL = 'https://images.ygoprodeck.com/images/cards/0.jpg';
