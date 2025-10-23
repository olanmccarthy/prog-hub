/**
 * Type definitions for banlist image generation
 */

export interface BanlistImageConfig {
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
}

export interface BanlistForImage {
  /** Session number for the banlist */
  sessionNumber: number;
  /** Banned cards (0 copies allowed) */
  banned: number[];
  /** Limited cards (1 copy allowed) */
  limited: number[];
  /** Semi-limited cards (2 copies allowed) */
  semilimited: number[];
  /** Recently unlimited cards */
  unlimited: number[];
}
