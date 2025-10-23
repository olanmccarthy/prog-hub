/**
 * Main deck image generator
 * Generates a visual representation of a Yu-Gi-Oh deck with banlist indicators
 */

import sharp from 'sharp';
import { ImageCache } from './imageCache';
import { CardLayoutEngine } from './layout';
import { DEFAULT_CONFIG } from './config';
import { DeckForImage, BanlistForImage, DeckImageConfig } from './types';

export class DeckImageGenerator {
  private imageCache: ImageCache;
  private layoutEngine: CardLayoutEngine;
  private config: DeckImageConfig;

  constructor(config: Partial<DeckImageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.imageCache = new ImageCache();
    this.layoutEngine = new CardLayoutEngine(this.config);
  }

  /**
   * Initialize the generator (sets up cache)
   */
  async init(): Promise<void> {
    await this.imageCache.init();
  }

  /**
   * Generate a deck image and return as buffer
   */
  async generateDeckImage(
    deck: DeckForImage,
    banlist?: BanlistForImage
  ): Promise<Buffer> {
    const { cardWidth, cardHeight, cardSpacing, backgroundColor } = this.config;

    // Calculate total height needed
    const totalHeight = this.layoutEngine.calculateTotalHeight(
      deck.maindeck.length,
      deck.extradeck.length,
      deck.sidedeck.length
    );

    // Calculate width (10 cards + spacing)
    const totalWidth = 10 * cardWidth + 9 * cardSpacing + 100; // 100px padding

    // Create base image
    const canvas = sharp({
      create: {
        width: totalWidth,
        height: totalHeight,
        channels: 4,
        background: backgroundColor,
      },
    });

    // Composite layers for cards
    const compositeOperations: sharp.OverlayOptions[] = [];

    let currentY = 50; // Top padding

    // Main Deck
    if (deck.maindeck.length > 0) {
      const mainDeckComposite = await this.renderDeckSection(
        deck.maindeck,
        50, // Left padding
        currentY + 30, // Space for title
        banlist,
        'main'
      );
      compositeOperations.push(...mainDeckComposite);

      // Add title
      const titleSvg = this.createTextSvg(`Main Deck (${deck.maindeck.length})`, totalWidth - 100);
      compositeOperations.push({
        input: Buffer.from(titleSvg),
        top: currentY,
        left: 50,
      });

      currentY += Math.ceil(deck.maindeck.length / 10) * (cardHeight + cardSpacing) + 60;
    }

    // Extra Deck
    if (deck.extradeck.length > 0) {
      const extraDeckComposite = await this.renderDeckSection(
        deck.extradeck,
        50,
        currentY + 30,
        banlist,
        'extra'
      );
      compositeOperations.push(...extraDeckComposite);

      // Add title
      const titleSvg = this.createTextSvg(`Extra Deck (${deck.extradeck.length})`, totalWidth - 100);
      compositeOperations.push({
        input: Buffer.from(titleSvg),
        top: currentY,
        left: 50,
      });

      currentY += Math.ceil(deck.extradeck.length / 10) * (cardHeight + cardSpacing) + 60;
    }

    // Side Deck
    if (deck.sidedeck.length > 0) {
      const sideDeckComposite = await this.renderDeckSection(
        deck.sidedeck,
        50,
        currentY + 30,
        banlist,
        'side'
      );
      compositeOperations.push(...sideDeckComposite);

      // Add title
      const titleSvg = this.createTextSvg(`Side Deck (${deck.sidedeck.length})`, totalWidth - 100);
      compositeOperations.push({
        input: Buffer.from(titleSvg),
        top: currentY,
        left: 50,
      });
    }

    // Composite all cards onto the canvas
    const result = await canvas.composite(compositeOperations).png().toBuffer();

    return result;
  }

  /**
   * Render a single deck section (main/extra/side)
   */
  private async renderDeckSection(
    cards: number[],
    startX: number,
    startY: number,
    banlist: BanlistForImage | undefined,
    deckType: 'main' | 'extra' | 'side'
  ): Promise<sharp.OverlayOptions[]> {
    const compositeOps: sharp.OverlayOptions[] = [];

    // Calculate positions based on deck type
    let positions;
    if (deckType === 'main') {
      positions = this.layoutEngine.calculateMainDeckPositions(cards, startX, startY);
    } else if (deckType === 'extra') {
      positions = this.layoutEngine.calculateExtraDeckPositions(cards, startX, startY);
    } else {
      positions = this.layoutEngine.calculateSideDeckPositions(cards, startX, startY);
    }

    // Load and position each card
    for (let i = 0; i < cards.length; i++) {
      const cardId = cards[i];
      const position = positions[i];

      try {
        // Get card image
        const cardImage = await this.imageCache.getCardImage(
          cardId,
          position.width,
          position.height
        );

        // Add banlist indicator if needed
        let finalImage = cardImage;
        if (banlist) {
          finalImage = await this.addBanlistIndicator(cardImage, cardId, banlist, position.width, position.height);
        }

        compositeOps.push({
          input: finalImage,
          top: position.y,
          left: position.x,
        });
      } catch (error) {
        console.error(`Failed to load card ${cardId}:`, error);
      }
    }

    return compositeOps;
  }

  /**
   * Add banlist indicator with both icon badge and colored border
   */
  private async addBanlistIndicator(
    cardImage: Buffer,
    cardId: number,
    banlist: BanlistForImage,
    width: number,
    _height: number
  ): Promise<Buffer> {
    let badgeText: string | null = null;
    let badgeColor: string | null = null;

    if (banlist.banned.includes(cardId)) {
      badgeText = '0';
      badgeColor = '#DC143C'; // Crimson red
    } else if (banlist.limited.includes(cardId)) {
      badgeText = '1';
      badgeColor = '#FFD700'; // Gold
    } else if (banlist.semilimited.includes(cardId)) {
      badgeText = '2';
      badgeColor = '#FF8C00'; // Dark orange
    }

    if (!badgeText || !badgeColor) {
      return cardImage;
    }

    // Create circular badge SVG with number (smaller, more compact)
    const badgeSize = Math.floor(width * 0.30); // 30% of card width
    const badgeSvg = this.createBadgeSvg(badgeText, badgeSize, badgeColor);

    // Composite badge onto top-left corner
    return sharp(cardImage)
      .composite([
        {
          input: Buffer.from(badgeSvg),
          top: 2,
          left: 2,
        },
      ])
      .toBuffer();
  }

  /**
   * Create an SVG badge with a circular background and number
   * For banned cards, creates a "forbidden" icon (circle with diagonal line)
   */
  private createBadgeSvg(text: string, size: number, color: string): string {
    const radius = size / 2;
    const fontSize = Math.floor(size * 0.65);

    // Special handling for banned (text === '0')
    if (text === '0') {
      const innerRadius = radius - 2.5;
      const strokeWidth = 2.5;

      return `
        <svg width="${size}" height="${size}">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.4"/>
            </filter>
          </defs>
          <!-- White background circle -->
          <circle
            cx="${radius}"
            cy="${radius}"
            r="${radius - 0.5}"
            fill="#ffffff"
            stroke="#000000"
            stroke-width="0.5"
            filter="url(#shadow)"
          />
          <!-- Circle outline -->
          <circle
            cx="${radius}"
            cy="${radius}"
            r="${innerRadius}"
            fill="none"
            stroke="${color}"
            stroke-width="${strokeWidth}"
          />
          <!-- Diagonal line -->
          <line
            x1="${radius - innerRadius * 0.707}"
            y1="${radius + innerRadius * 0.707}"
            x2="${radius + innerRadius * 0.707}"
            y2="${radius - innerRadius * 0.707}"
            stroke="${color}"
            stroke-width="${strokeWidth}"
            stroke-linecap="round"
          />
        </svg>
      `;
    }

    // Regular numbered badge for limited/semi-limited
    return `
      <svg width="${size}" height="${size}">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.4"/>
          </filter>
        </defs>
        <circle
          cx="${radius}"
          cy="${radius}"
          r="${radius - 0.5}"
          fill="${color}"
          stroke="#000000"
          stroke-width="0.5"
          filter="url(#shadow)"
        />
        <text
          x="${radius}"
          y="${radius}"
          text-anchor="middle"
          dominant-baseline="central"
          font-family="Arial, sans-serif"
          font-size="${fontSize}px"
          font-weight="bold"
          fill="#000000"
        >${text}</text>
      </svg>
    `;
  }

  /**
   * Create an SVG text element for titles
   */
  private createTextSvg(text: string, width: number): string {
    return `
      <svg width="${width}" height="25">
        <style>
          .title {
            fill: #ffffff;
            font-size: 20px;
            font-family: Arial, sans-serif;
            font-weight: bold;
          }
        </style>
        <text x="0" y="20" class="title">${text}</text>
      </svg>
    `;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.imageCache.clearMemoryCache();
  }
}

/**
 * Convenience function to generate a deck image
 */
export async function generateDeckImage(
  deck: DeckForImage,
  banlist?: BanlistForImage,
  config?: Partial<DeckImageConfig>
): Promise<Buffer> {
  const generator = new DeckImageGenerator(config);
  await generator.init();
  const image = await generator.generateDeckImage(deck, banlist);
  generator.cleanup();
  return image;
}
