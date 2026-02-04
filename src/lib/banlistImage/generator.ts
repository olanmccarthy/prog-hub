/**
 * Banlist image generator
 * Generates a visual representation of a banlist showing banned, limited, semi-limited, and unlimited cards
 */

import sharp from 'sharp';
import { ImageCache } from '../deckImage/imageCache';
import { DEFAULT_CONFIG } from './config';
import { BanlistForImage, BanlistImageConfig } from './types';

export class BanlistImageGenerator {
  private imageCache: ImageCache;
  private config: BanlistImageConfig;

  constructor(config: Partial<BanlistImageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.imageCache = new ImageCache();
  }

  /**
   * Initialize the generator (sets up cache)
   */
  async init(): Promise<void> {
    await this.imageCache.init();
  }

  /**
   * Generate a banlist image and return as buffer
   */
  async generateBanlistImage(banlist: BanlistForImage): Promise<Buffer> {
    const { cardWidth, cardHeight, cardSpacing, backgroundColor, cardsPerRow } = this.config;

    // Calculate sections
    const sections = [
      { title: 'Banned', cards: banlist.banned, color: '#DC143C' },
      { title: 'Limited', cards: banlist.limited, color: '#FFD700' },
      { title: 'Semi-Limited', cards: banlist.semilimited, color: '#FF8C00' },
      { title: 'Unlimited', cards: banlist.unlimited, color: '#32CD32' },
    ].filter(section => section.cards.length > 0);

    // Calculate total height
    let totalHeight = 100; // Top padding + title
    sections.forEach(section => {
      const rows = Math.ceil(section.cards.length / cardsPerRow);
      totalHeight += 60 + rows * (cardHeight + cardSpacing); // Section title + cards
    });
    totalHeight += 50; // Bottom padding

    // Calculate width (10 cards + spacing)
    const totalWidth = cardsPerRow * cardWidth + (cardsPerRow - 1) * cardSpacing + 100; // 100px padding

    // Create base image
    const canvas = sharp({
      create: {
        width: totalWidth,
        height: totalHeight,
        channels: 4,
        background: backgroundColor,
      },
    });

    const compositeOperations: sharp.OverlayOptions[] = [];

    // Add main title
    const mainTitle = this.createTextSvg(
      `Session ${banlist.sessionNumber} Banlist`,
      totalWidth - 100,
      28,
      '#ffffff'
    );
    compositeOperations.push({
      input: Buffer.from(mainTitle),
      top: 30,
      left: 50,
    });

    let currentY = 100;

    // Render each section
    for (const section of sections) {
      // Add section title
      const sectionTitle = this.createTextSvg(
        `${section.title} (${section.cards.length})`,
        totalWidth - 100,
        22,
        section.color
      );
      compositeOperations.push({
        input: Buffer.from(sectionTitle),
        top: currentY,
        left: 50,
      });

      currentY += 30;

      // Render cards for this section
      const cardOps = await this.renderCardSection(
        section.cards,
        50,
        currentY,
        section.color
      );
      compositeOperations.push(...cardOps);

      // Move to next section
      const rows = Math.ceil(section.cards.length / cardsPerRow);
      currentY += rows * (cardHeight + cardSpacing) + 30;
    }

    // Composite all elements onto canvas
    const result = await canvas.composite(compositeOperations).png().toBuffer();

    return result;
  }

  /**
   * Render a section of cards (banned, limited, etc.)
   * Loads all cards in parallel for optimal performance with local filesystem
   */
  private async renderCardSection(
    cards: number[],
    startX: number,
    startY: number,
    borderColor: string
  ): Promise<sharp.OverlayOptions[]> {
    const { cardWidth, cardHeight, cardSpacing, cardsPerRow } = this.config;

    // Load all cards in parallel
    const cardPromises = cards.map(async (cardId, i) => {
      const row = Math.floor(i / cardsPerRow);
      const col = i % cardsPerRow;

      const x = startX + col * (cardWidth + cardSpacing);
      const y = startY + row * (cardHeight + cardSpacing);

      try {
        // Get card image
        const cardImage = await this.imageCache.getCardImage(
          cardId,
          cardWidth,
          cardHeight
        );

        // Add colored border to indicate category
        const borderedCard = await this.addColoredBorder(
          cardImage,
          borderColor,
          cardWidth,
          cardHeight
        );

        return {
          input: borderedCard,
          top: y,
          left: x,
        };
      } catch (error) {
        console.error(`Failed to load card ${cardId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(cardPromises);

    // Filter out failed cards and return composite operations
    return results.filter((op): op is sharp.OverlayOptions => op !== null);
  }

  /**
   * Add a colored border around a card image
   */
  private async addColoredBorder(
    cardImage: Buffer,
    color: string,
    width: number,
    height: number
  ): Promise<Buffer> {
    // Create a border SVG overlay
    const borderSvg = `
      <svg width="${width}" height="${height}">
        <rect
          x="0"
          y="0"
          width="${width}"
          height="${height}"
          fill="none"
          stroke="${color}"
          stroke-width="3"
        />
      </svg>
    `;

    return sharp(cardImage)
      .composite([
        {
          input: Buffer.from(borderSvg),
          top: 0,
          left: 0,
        },
      ])
      .toBuffer();
  }

  /**
   * Create an SVG text element
   */
  private createTextSvg(
    text: string,
    width: number,
    fontSize: number = 20,
    color: string = '#ffffff'
  ): string {
    return `
      <svg width="${width}" height="${fontSize + 10}">
        <style>
          .title {
            fill: ${color};
            font-size: ${fontSize}px;
            font-family: Arial, sans-serif;
            font-weight: bold;
          }
        </style>
        <text x="0" y="${fontSize}" class="title">${text}</text>
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
 * Convenience function to generate a banlist image
 */
export async function generateBanlistImage(
  banlist: BanlistForImage,
  config?: Partial<BanlistImageConfig>
): Promise<Buffer> {
  const generator = new BanlistImageGenerator(config);
  await generator.init();
  const image = await generator.generateBanlistImage(banlist);
  generator.cleanup();
  return image;
}
