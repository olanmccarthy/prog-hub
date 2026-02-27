"use server";

import { prisma } from "@lib/prisma";
import { parseBanlistField } from "@lib/banlistHelpers";


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
    for (const s of filteredSuggestions) {
      (await parseBanlistField(s.banned)).forEach(id => allCardIds.add(id));
      (await parseBanlistField(s.limited)).forEach(id => allCardIds.add(id));
      (await parseBanlistField(s.semilimited)).forEach(id => allCardIds.add(id));
      (await parseBanlistField(s.unlimited)).forEach(id => allCardIds.add(id));
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

    return {
      success: true,
      suggestions: await Promise.all(filteredSuggestions.map(async s => {
        const banned = await parseBanlistField(s.banned);
        const limited = await parseBanlistField(s.limited);
        const semilimited = await parseBanlistField(s.semilimited);
        const unlimited = await parseBanlistField(s.unlimited);

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
      })),
    };
  } catch (error) {
    console.error("Error fetching banlist suggestions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch suggestions",
    };
  }
}
