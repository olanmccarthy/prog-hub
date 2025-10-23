/**
 * Type definitions for deck image generation
 */

export interface DeckImageConfig {
  /** Width of the output image in pixels */
  width: number;
  /** Height of the output image in pixels */
  height: number;
  /** Width of each card image in pixels */
  cardWidth: number;
  /** Height of each card image in pixels */
  cardHeight: number;
  /** Background color (hex) */
  backgroundColor: string;
  /** Spacing between cards in pixels */
  cardSpacing: number;
  /** Maximum cards per row */
  cardsPerRow: number;
  /** Overlap percentage for cards (0-1) */
  overlapFactor: number;
}

export interface CardPosition {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Width of the card in this position */
  width: number;
  /** Height of the card in this position */
  height: number;
  /** Source crop (if overlapping) */
  crop?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

export interface DeckSection {
  /** Section name (main, extra, side) */
  name: string;
  /** Card IDs in this section */
  cards: number[];
  /** Starting Y position for this section */
  startY: number;
  /** Title to display */
  title: string;
}

export interface BanlistForImage {
  banned: number[];
  limited: number[];
  semilimited: number[];
}

export interface DeckForImage {
  maindeck: number[];
  extradeck: number[];
  sidedeck: number[];
}
