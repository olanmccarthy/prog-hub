'use server';

import { prisma } from '@lib/prisma';

/**
 * Helper function to parse banlist field (handles both string and array)
 */
function parseBanlistField(field: unknown): number[] {
  if (!field) return [];
  if (typeof field === 'string') {
    if (field.trim() === '') return [];
    try {
      return JSON.parse(field) as number[];
    } catch {
      return [];
    }
  }
  if (Array.isArray(field)) return field;
  return [];
}

/**
 * Decode HTML apostrophe entities in card names
 */
function decodeCardName(text: string): string {
  return text.replace(/&#039;/g, "'");
}

export interface BanlistHistoryItem {
  id: number;
  sessionId: number;
  banned: number[];
  limited: number[];
  semilimited: number[];
  unlimited: number[];
  bannedNames: string[];
  limitedNames: string[];
  semilimitedNames: string[];
  unlimitedNames: string[];
}

interface GetBanlistHistoryResult {
  success: boolean;
  banlists: BanlistHistoryItem[];
  error?: string;
}

export async function getBanlistHistory(): Promise<GetBanlistHistoryResult> {
  try {
    const banlists = await prisma.banlist.findMany({
      orderBy: { sessionId: 'desc' },
    });

    // Collect all unique card IDs from all banlists
    const allCardIds = new Set<number>();
    banlists.forEach(b => {
      parseBanlistField(b.banned).forEach(id => allCardIds.add(id));
      parseBanlistField(b.limited).forEach(id => allCardIds.add(id));
      parseBanlistField(b.semilimited).forEach(id => allCardIds.add(id));
      parseBanlistField(b.unlimited).forEach(id => allCardIds.add(id));
    });

    // Batch fetch all cards in one query
    const cards = await prisma.card.findMany({
      where: {
        id: { in: Array.from(allCardIds) },
      },
      select: {
        id: true,
        cardName: true,
      },
    });

    // Create a map for quick lookup
    const cardMap = new Map(cards.map((c) => [c.id, decodeCardName(c.cardName)]));

    // Helper to convert IDs to names
    const getCardNames = (ids: number[]): string[] => {
      return ids.map(id => cardMap.get(id) || `[Unknown Card ${id}]`);
    };

    const formattedBanlists: BanlistHistoryItem[] = banlists.map((b) => {
      const banned = parseBanlistField(b.banned);
      const limited = parseBanlistField(b.limited);
      const semilimited = parseBanlistField(b.semilimited);
      const unlimited = parseBanlistField(b.unlimited);

      return {
        id: b.id,
        sessionId: b.sessionId,
        banned,
        limited,
        semilimited,
        unlimited,
        bannedNames: getCardNames(banned),
        limitedNames: getCardNames(limited),
        semilimitedNames: getCardNames(semilimited),
        unlimitedNames: getCardNames(unlimited),
      };
    });

    return {
      success: true,
      banlists: formattedBanlists,
    };
  } catch (error) {
    console.error('Error fetching banlist history:', error);
    return {
      success: false,
      banlists: [],
      error: error instanceof Error ? error.message : 'Failed to fetch banlist history',
    };
  }
}
