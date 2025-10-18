"use server";

import { getDataSource } from "@lib/data-source";
import { BanlistSuggestion } from "@entities/BanlistSuggestion";

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
    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(BanlistSuggestion);

    const suggestions = await repo.find({
      relations: ['player', 'banlist', 'banlist.session'],
      order: { id: 'DESC' },
    });

    return {
      success: true,
      suggestions: suggestions.map(s => ({
        id: s.id,
        playerName: s.player.name,
        sessionNumber: s.banlist.session.number,
        banned: s.banned,
        limited: s.limited,
        semilimited: s.semilimited,
        unlimited: s.unlimited,
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
