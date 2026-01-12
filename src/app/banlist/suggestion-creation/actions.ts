'use server';

import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@lib/auth';
import { getCardEntriesFromIds } from '@lib/cardLookup';

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

export interface CreateSuggestionInput {
  banlistId: number;
  banned: number[]; // Card IDs
  limited: number[]; // Card IDs
  semilimited: number[]; // Card IDs
  unlimited: number[]; // Card IDs
  comment?: string; // Optional comment from player
  existingSuggestionId?: number; // If updating an existing suggestion
}

export interface CanSubmitSuggestionsResult {
  success: boolean;
  canSubmit: boolean;
  error?: string;
}

/**
 * Check if banlist suggestions can be submitted for the current session
 */
export async function canSubmitSuggestions(banlistId: number): Promise<CanSubmitSuggestionsResult> {
  try {
    // Get the banlist to find its session
    const banlist = await prisma.banlist.findUnique({
      where: { id: banlistId },
    });

    if (!banlist) {
      return { success: false, canSubmit: false, error: 'Banlist not found' };
    }

    // Get the session by number (banlist.sessionId stores session number, not id)
    const session = await prisma.session.findUnique({
      where: { number: banlist.sessionId },
    });

    if (!session) {
      return { success: false, canSubmit: false, error: 'Session not found' };
    }

    // Check if the session's standings are finalized
    const isFinalized = !!(
      session.first &&
      session.second &&
      session.third &&
      session.fourth &&
      session.fifth &&
      session.sixth
    );

    return { success: true, canSubmit: isFinalized };
  } catch (error) {
    return {
      success: false,
      canSubmit: false,
      error: error instanceof Error ? error.message : 'Failed to check submission status',
    };
  }
}

export interface CreateSuggestionResult {
  success: boolean;
  id?: number;
  error?: string;
}

export interface CardOption {
  id: number;
  name: string;
}

export interface SearchCardsResult {
  success: boolean;
  cards?: CardOption[];
  error?: string;
}

export interface ExistingSuggestion {
  id: number;
  banned: number[]; // Card IDs
  limited: number[]; // Card IDs
  semilimited: number[]; // Card IDs
  unlimited: number[]; // Card IDs
  comment?: string; // Optional comment from player
}

export interface GetExistingSuggestionResult {
  success: boolean;
  suggestion?: ExistingSuggestion;
  error?: string;
}

export { getCardEntriesFromIds };

/**
 * Get the user's existing suggestion for a banlist
 */
export async function getExistingSuggestion(banlistId: number): Promise<GetExistingSuggestionResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.playerId) {
      return { success: false, error: 'Not authenticated' };
    }

    const suggestion = await prisma.banlistSuggestion.findFirst({
      where: {
        banlistId,
        playerId: user.playerId,
      },
      select: {
        id: true,
        banned: true,
        limited: true,
        semilimited: true,
        unlimited: true,
        comment: true,
      },
    });

    if (!suggestion) {
      return { success: true }; // No existing suggestion
    }

    return {
      success: true,
      suggestion: {
        id: suggestion.id,
        banned: parseBanlistField(suggestion.banned),
        limited: parseBanlistField(suggestion.limited),
        semilimited: parseBanlistField(suggestion.semilimited),
        unlimited: parseBanlistField(suggestion.unlimited),
        comment: suggestion.comment || undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch existing suggestion',
    };
  }
}

/**
 * Search for card names that match the given query
 * Only returns results if query is 3+ characters
 */
export async function searchCardNames(query: string): Promise<SearchCardsResult> {
  try {
    // Only search if query is 3+ characters
    if (query.length < 3) {
      return { success: true, cards: [] };
    }

    const cards = await prisma.card.findMany({
      where: {
        cardName: {
          contains: query,
          // Note: MySQL is case-insensitive by default with utf8mb4_general_ci collation
        },
      },
      select: {
        id: true,
        cardName: true,
      },
      orderBy: {
        cardName: 'asc',
      },
      take: 20, // Limit to 20 results
    });

    return {
      success: true,
      cards: cards.map(c => ({ id: c.id, name: c.cardName }))
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search cards',
    };
  }
}

export async function createBanlistSuggestion(input: CreateSuggestionInput): Promise<CreateSuggestionResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.playerId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify the player exists in the database
    const player = await prisma.player.findUnique({
      where: { id: user.playerId },
    });

    if (!player) {
      return {
        success: false,
        error: "Your session is invalid. Please log out and log back in.",
      };
    }

    // Get the banlist to find its session
    const banlist = await prisma.banlist.findUnique({
      where: { id: input.banlistId },
    });

    if (!banlist) {
      return { success: false, error: 'Banlist not found' };
    }

    // Get the session by number (banlist.sessionId stores session number, not id)
    const session = await prisma.session.findUnique({
      where: { number: banlist.sessionId },
    });

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // Check if the session's standings are finalized
    const isFinalized = !!(
      session.first &&
      session.second &&
      session.third &&
      session.fourth &&
      session.fifth &&
      session.sixth
    );

    if (!isFinalized) {
      return {
        success: false,
        error: 'Cannot submit banlist suggestions until the current session standings are finalized',
      };
    }

    // If existingSuggestionId is provided, update existing suggestion
    if (input.existingSuggestionId) {
      const suggestion = await prisma.banlistSuggestion.update({
        where: {
          id: input.existingSuggestionId,
        },
        data: {
          banned: input.banned,
          limited: input.limited,
          semilimited: input.semilimited,
          unlimited: input.unlimited,
          comment: input.comment || null,
        },
      });

      return { success: true, id: suggestion.id };
    }

    // Otherwise, create new suggestion
    const suggestion = await prisma.banlistSuggestion.create({
      data: {
        playerId: user.playerId,
        banlistId: input.banlistId,
        banned: input.banned,
        limited: input.limited,
        semilimited: input.semilimited,
        unlimited: input.unlimited,
        comment: input.comment || null,
        chosen: false,
      },
    });

    // Note: Discord notification for banlist suggestions is sent after moderator selection
    // not when all suggestions are submitted

    return { success: true, id: suggestion.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create/update suggestion',
    };
  }
}
