"use server";

import { prisma } from "@lib/prisma";

export interface BanlistSuggestionHistory {
  id: number;
  playerName: string;
  sessionNumber: number;
  banned: string[];
  limited: string[];
  semilimited: string[];
  unlimited: string[];
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
        banlist: {
          include: {
            session: { select: { number: true } },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    return {
      success: true,
      suggestions: suggestions.map(s => ({
        id: s.id,
        playerName: s.player.name,
        sessionNumber: s.banlist.session.number,
        banned: s.banned as string[],
        limited: s.limited as string[],
        semilimited: s.semilimited as string[],
        unlimited: s.unlimited as string[],
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
