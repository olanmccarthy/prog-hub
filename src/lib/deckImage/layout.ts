/**
 * Card layout and positioning logic
 * Based on omega-api-decks table system with overlap support
 */

import { CardPosition, DeckImageConfig } from './types';

export class CardLayoutEngine {
  constructor(private config: DeckImageConfig) {}

  /**
   * Calculate positions for a list of cards in a grid layout with overlap
   */
  calculateCardPositions(
    cards: number[],
    startX: number,
    startY: number,
    useOverlap: boolean = false
  ): CardPosition[] {
    const positions: CardPosition[] = [];
    const { cardWidth, cardHeight, cardSpacing, cardsPerRow, overlapFactor } = this.config;

    let currentX = startX;
    let currentY = startY;
    let cardsInRow = 0;

    for (let i = 0; i < cards.length; i++) {
      const isLastCard = i === cards.length - 1;
      const isLastInRow = cardsInRow === cardsPerRow - 1;

      positions.push({
        x: currentX,
        y: currentY,
        width: cardWidth,
        height: cardHeight,
      });

      cardsInRow++;

      // Calculate next position
      if (isLastInRow || isLastCard) {
        // Move to next row
        currentX = startX;
        currentY += cardHeight + cardSpacing;
        cardsInRow = 0;
      } else {
        // Move to next column
        if (useOverlap) {
          // Apply overlap (cards slightly overlap each other)
          currentX += Math.floor(cardWidth * (1 - overlapFactor));
        } else {
          // Normal spacing
          currentX += cardWidth + cardSpacing;
        }
      }
    }

    return positions;
  }

  /**
   * Calculate compact positions for main deck (40-60 cards)
   * Uses vertical stacking with slight overlap
   */
  calculateMainDeckPositions(cards: number[], startX: number, startY: number): CardPosition[] {
    const positions: CardPosition[] = [];
    const { cardWidth, cardHeight, cardSpacing } = this.config;

    // Calculate how many rows we need
    const totalCards = cards.length;
    const columns = 10; // Main deck uses 10 columns
    const rows = Math.ceil(totalCards / columns);

    let cardIndex = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns && cardIndex < totalCards; col++) {
        positions.push({
          x: startX + col * (cardWidth + cardSpacing),
          y: startY + row * (cardHeight + cardSpacing),
          width: cardWidth,
          height: cardHeight,
        });
        cardIndex++;
      }
    }

    return positions;
  }

  /**
   * Calculate positions for extra deck (0-15 cards)
   * Uses same 10-column grid layout as main deck
   */
  calculateExtraDeckPositions(cards: number[], startX: number, startY: number): CardPosition[] {
    if (cards.length === 0) return [];

    const positions: CardPosition[] = [];
    const { cardWidth, cardHeight, cardSpacing } = this.config;

    const totalCards = cards.length;
    const columns = 10; // Same as main deck
    const rows = Math.ceil(totalCards / columns);

    let cardIndex = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns && cardIndex < totalCards; col++) {
        positions.push({
          x: startX + col * (cardWidth + cardSpacing),
          y: startY + row * (cardHeight + cardSpacing),
          width: cardWidth,
          height: cardHeight,
        });
        cardIndex++;
      }
    }

    return positions;
  }

  /**
   * Calculate positions for side deck (0-15 cards)
   * Uses same 10-column grid layout as main deck
   */
  calculateSideDeckPositions(cards: number[], startX: number, startY: number): CardPosition[] {
    // Same layout as main deck and extra deck
    return this.calculateExtraDeckPositions(cards, startX, startY);
  }

  /**
   * Calculate the total height needed for a deck layout
   */
  calculateTotalHeight(mainCount: number, extraCount: number, sideCount: number): number {
    const { cardHeight, cardSpacing } = this.config;
    const sectionSpacing = 60; // Space between sections and for titles

    // Main deck height
    const mainRows = Math.ceil(mainCount / 10);
    const mainHeight = mainRows * (cardHeight + cardSpacing) + sectionSpacing;

    // Extra deck height (now uses rows like main deck)
    const extraRows = Math.ceil(extraCount / 10);
    const extraHeight = extraCount > 0 ? extraRows * (cardHeight + cardSpacing) + sectionSpacing : 0;

    // Side deck height (now uses rows like main deck)
    const sideRows = Math.ceil(sideCount / 10);
    const sideHeight = sideCount > 0 ? sideRows * (cardHeight + cardSpacing) + sectionSpacing : 0;

    return mainHeight + extraHeight + sideHeight + 100; // Extra padding
  }
}

/**
 * Helper to count cards by ID (for card limits in banlist)
 */
export function countCards(cards: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const cardId of cards) {
    counts.set(cardId, (counts.get(cardId) || 0) + 1);
  }
  return counts;
}

/**
 * Helper to get unique cards from a deck
 */
export function getUniqueCards(cards: number[]): number[] {
  return Array.from(new Set(cards));
}
