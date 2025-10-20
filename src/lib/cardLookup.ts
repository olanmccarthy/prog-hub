'use server';

import { prisma } from '@lib/prisma';

export interface CardLookupResult {
  id: number;
  name: string;
}

/**
 * Decode HTML apostrophe entities in card names
 * ' was getting stored as &#039; in the database
 */
function decodeCardName(text: string): string {
  return text.replace(/&#039;/g, "'");
}

/**
 * Convert card IDs to card entries with names
 * Returns cards in the same order as input
 * Returns [Unknown Card] for missing IDs as fallback
 */
export async function getCardEntriesFromIds(
  cardIds: number[]
): Promise<CardLookupResult[]> {
  if (cardIds.length === 0) return [];

  // Validate ids are correctly typed as numbers
  const validatedIds = cardIds.map((id) =>
    typeof id === 'string' ? parseInt(id, 10) : id
  );

  const cards = await prisma.card.findMany({
    where: {
      id: {
        in: validatedIds,
      },
    },
    select: {
      id: true,
      cardName: true,
    },
  });


  // Create a map for quick lookup, decoding HTML entities in card names
  const cardMap = new Map(cards.map((c) => [c.id, decodeCardName(c.cardName)]));

  // Return in the same order as input
  return validatedIds.map((id) => {
    const name = cardMap.get(id);
    return name ? { id, name } : { id, name: `[Unknown Card ${id}]` }; // Use unique ID in fallback
  });
}
