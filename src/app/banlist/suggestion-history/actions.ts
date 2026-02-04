"use server";

import { prisma } from "@lib/prisma";

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

export interface BanlistSuggestionHistory {
  id: number;
  playerName: string;
  sessionNumber: number;
  banned: number[];
  limited: number[];
  semilimited: number[];
  unlimited: number[];
  bannedNames: string[];
  limitedNames: string[];
  semilimitedNames: string[];
  unlimitedNames: string[];
  chosen: boolean;
  comment: string | null;
  moderatorName: string | null;
  voters: string[];
}

interface GetAllBanlistSuggestionsResult {
  success: boolean;
  suggestions?: BanlistSuggestionHistory[];
  error?: string;
}

export async function getAllBanlistSuggestions(): Promise<GetAllBanlistSuggestionsResult> {
  try {
    // Get the active session to exclude its suggestions
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    const suggestions = await prisma.banlistSuggestion.findMany({
      include: {
        player: { select: { name: true } },
        moderator: { select: { name: true } },
        banlist: { select: { sessionId: true } },
        votes: {
          include: {
            player: { select: { name: true } },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    // Filter out suggestions from the active session
    const filteredSuggestions = activeSession
      ? suggestions.filter(s => s.banlist.sessionId !== activeSession.number)
      : suggestions;

    // Collect all unique card IDs from all suggestions
    const allCardIds = new Set<number>();
    filteredSuggestions.forEach(s => {
      parseBanlistField(s.banned).forEach(id => allCardIds.add(id));
      parseBanlistField(s.limited).forEach(id => allCardIds.add(id));
      parseBanlistField(s.semilimited).forEach(id => allCardIds.add(id));
      parseBanlistField(s.unlimited).forEach(id => allCardIds.add(id));
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

    return {
      success: true,
      suggestions: filteredSuggestions.map(s => {
        const banned = parseBanlistField(s.banned);
        const limited = parseBanlistField(s.limited);
        const semilimited = parseBanlistField(s.semilimited);
        const unlimited = parseBanlistField(s.unlimited);

        return {
          id: s.id,
          playerName: s.player.name,
          sessionNumber: s.banlist.sessionId, // sessionId stores the session number
          banned,
          limited,
          semilimited,
          unlimited,
          bannedNames: getCardNames(banned),
          limitedNames: getCardNames(limited),
          semilimitedNames: getCardNames(semilimited),
          unlimitedNames: getCardNames(unlimited),
          chosen: s.chosen,
          comment: s.comment,
          moderatorName: s.moderator?.name || null,
          voters: s.votes.map(v => v.player.name),
        };
      }),
    };
  } catch (error) {
    console.error("Error fetching banlist suggestions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch suggestions",
    };
  }
}
