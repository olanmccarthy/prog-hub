'use server';

import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@lib/auth';
import { saveBanlistImage } from '@lib/banlistImage/saveBanlistImage';
import { parseBanlistField } from '@lib/banlistHelpers';


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
    for (const b of banlists) {
      (await parseBanlistField(b.banned)).forEach(id => allCardIds.add(id));
      (await parseBanlistField(b.limited)).forEach(id => allCardIds.add(id));
      (await parseBanlistField(b.semilimited)).forEach(id => allCardIds.add(id));
      (await parseBanlistField(b.unlimited)).forEach(id => allCardIds.add(id));
    }

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

    const formattedBanlists: BanlistHistoryItem[] = await Promise.all(banlists.map(async (b) => {
      const banned = await parseBanlistField(b.banned);
      const limited = await parseBanlistField(b.limited);
      const semilimited = await parseBanlistField(b.semilimited);
      const unlimited = await parseBanlistField(b.unlimited);

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
    }));

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

interface RegenerateBanlistImageResult {
  success: boolean;
  error?: string;
}

/**
 * Regenerate the image for a specific banlist (admin only)
 */
export async function regenerateBanlistImage(
  sessionNumber: number
): Promise<RegenerateBanlistImageResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Fetch the banlist
    const banlist = await prisma.banlist.findFirst({
      where: { sessionId: sessionNumber },
    });

    if (!banlist) {
      return { success: false, error: `Banlist for Session ${sessionNumber} not found` };
    }

    const banlistData = {
      sessionNumber,
      banned: await parseBanlistField(banlist.banned),
      limited: await parseBanlistField(banlist.limited),
      semilimited: await parseBanlistField(banlist.semilimited),
      unlimited: await parseBanlistField(banlist.unlimited),
    };

    // Generate and save image
    await saveBanlistImage(banlistData);

    return { success: true };
  } catch (error) {
    console.error('Error regenerating banlist image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to regenerate image',
    };
  }
}
