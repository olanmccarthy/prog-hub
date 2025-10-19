"use server";

import { prisma } from "@lib/prisma";

export interface BanlistSuggestionHistory {
  id: number;
  playerName: string;
  sessionNumber: number;
  banned: number[];
  limited: number[];
  semilimited: number[];
  unlimited: number[];
  chosen: boolean;
}

interface GetAllBanlistSuggestionsResult {
  success: boolean;
  suggestions?: BanlistSuggestionHistory[];
  error?: string;
}

export async function getAllBanlistSuggestions(): Promise<GetAllBanlistSuggestionsResult> {
  try {
    const suggestions = await prisma.banlistSuggestion.findMany({
      include: {
        player: { select: { name: true } },
        banlist: { select: { sessionId: true } },
      },
      orderBy: { id: 'desc' },
    });

    return {
      success: true,
      suggestions: suggestions.map(s => ({
        id: s.id,
        playerName: s.player.name,
        sessionNumber: s.banlist.sessionId, // sessionId stores the session number
        banned: s.banned as number[],
        limited: s.limited as number[],
        semilimited: s.semilimited as number[],
        unlimited: s.unlimited as number[],
        chosen: s.chosen,
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
