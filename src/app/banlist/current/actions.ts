'use server';

import { Banlist } from '@/src/types';
import { prisma } from '@lib/prisma';
import { getCardEntriesFromIds } from '@lib/cardLookup';

export interface BanlistCard {
  id: number;
  name: string;
}

export interface BanlistCardWithFlag {
  id: number;
  name: string;
  isNew: boolean;
}

export interface CurrentBanlist {
  banned: BanlistCardWithFlag[];
  limited: BanlistCardWithFlag[];
  semilimited: BanlistCardWithFlag[];
  unlimited: BanlistCardWithFlag[];
}

interface GetPreviousBanlistResult {
  success: boolean;
  banlist: {
    banned: number[];
    limited: number[];
    semilimited: number[];
    unlimited: number[];
  } | null;
  error?: string;
}

interface GetMostRecentBanlistResult {
  success: boolean;
  banlist: Banlist | null;
  sessionNumber?: number;
  error?: string;
}

/**
 * Gets the most recent banlist regardless of active status
 * Falls back to fetching by highest banlist ID if needed
 */
export async function getMostRecentBanlistBySession(): Promise<GetMostRecentBanlistResult> {
  try {
    //
    const mostRecentBanlist = await prisma.banlist.findFirst({
      orderBy: { sessionId: 'desc' },
    });

    if (!mostRecentBanlist) {
      return {
        success: false,
        banlist: null,
        error: 'No banlists found',
      };
    }

    const banlist: Banlist = {
      id: mostRecentBanlist.id,
      sessionId: mostRecentBanlist.sessionId,
      banned: mostRecentBanlist.banned as number[],
      limited: mostRecentBanlist.limited as number[],
      semilimited: mostRecentBanlist.semilimited as number[],
      unlimited: mostRecentBanlist.unlimited as number[],
    };
    return {
      success: true,
      banlist: banlist,
      sessionNumber: mostRecentBanlist.sessionId,
    };
  } catch (error) {
    console.error('Error fetching most recent banlist:', error);
    return {
      success: false,
      banlist: null,
      error: error instanceof Error ? error.message : 'Failed to fetch banlist',
    };
  }
}

/**
 * Fetches the previous banlist (sessionId - 1) to compare with current
 */
export async function getPreviousBanlist(
  currentSessionId: number,
): Promise<GetPreviousBanlistResult> {
  try {
    if (currentSessionId <= 1) {
      // No previous session
      return {
        success: true,
        banlist: null,
      };
    }

    const previousBanlist = await prisma.banlist.findFirst({
      where: { sessionId: currentSessionId - 1 },
    });

    if (!previousBanlist) {
      return {
        success: true,
        banlist: null,
      };
    }

    return {
      success: true,
      banlist: {
        banned: previousBanlist.banned as number[],
        limited: previousBanlist.limited as number[],
        semilimited: previousBanlist.semilimited as number[],
        unlimited: previousBanlist.unlimited as number[],
      },
    };
  } catch (error) {
    console.error('Error fetching previous banlist:', error);
    return {
      success: false,
      banlist: null,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch previous banlist',
    };
  }
}

/**
 * Determines which cards are new (moved or added) compared to previous banlist
 * Accepts card IDs and looks up card names internally
 */
export async function getNewCards(
  currentBanlist: {
    banned: number[];
    limited: number[];
    semilimited: number[];
    unlimited: number[];
  },
  previousBanlist: {
    banned: number[];
    limited: number[];
    semilimited: number[];
    unlimited: number[];
  } | null,
): Promise<CurrentBanlist> {
  // Look up card names for all cards in current banlist
  const [bannedCards, limitedCards, semilimitedCards, unlimitedCards] =
    await Promise.all([
      getCardEntriesFromIds(currentBanlist.banned),
      getCardEntriesFromIds(currentBanlist.limited),
      getCardEntriesFromIds(currentBanlist.semilimited),
      getCardEntriesFromIds(currentBanlist.unlimited),
    ]);

  if (!previousBanlist) {
    // If no previous banlist, all cards are new
    return {
      banned: bannedCards.map((c) => ({ ...c, isNew: true })),
      limited: limitedCards.map((c) => ({ ...c, isNew: true })),
      semilimited: semilimitedCards.map((c) => ({
        ...c,
        isNew: true,
      })),
      unlimited: unlimitedCards.map((c) => ({ ...c, isNew: true })),
    };
  }

  // Create sets for previous banlist cards by category
  const prevBanned = new Set(previousBanlist.banned);
  const prevLimited = new Set(previousBanlist.limited);
  const prevSemilimited = new Set(previousBanlist.semilimited);
  const prevUnlimited = new Set(previousBanlist.unlimited);

  // Get all cards from previous banlist
  const prevAllCards = new Set([
    ...prevBanned,
    ...prevLimited,
    ...prevSemilimited,
    ...prevUnlimited,
  ]);

  // Mark cards as new if:
  // 1. They weren't in the previous banlist at all (newly added)
  // 2. They moved categories (were in different restriction level)
  const markNewCards = (cards: BanlistCard[], currentCategory: Set<number>) => {
    return cards.map((card) => {
      const wasInPrevious = prevAllCards.has(card.id);
      const isInSameCategory = currentCategory.has(card.id);

      // New if: not in previous banlist OR moved to a different category
      const isNew = !wasInPrevious || !isInSameCategory;

      return { ...card, isNew };
    });
  };

  return {
    banned: markNewCards(bannedCards, prevBanned),
    limited: markNewCards(limitedCards, prevLimited),
    semilimited: markNewCards(semilimitedCards, prevSemilimited),
    unlimited: markNewCards(unlimitedCards, prevUnlimited),
  };
}
