'use server';

import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@lib/auth';

export interface CreateSuggestionInput {
  banlistId: number;
  banned: string[];
  limited: string[];
  semilimited: string[];
  unlimited: string[];
}

export async function createBanlistSuggestion(input: CreateSuggestionInput) {
  try {
    const user = await getCurrentUser();
    if (!user?.playerId) {
      return { success: false, error: 'Not authenticated' };
    }

    const suggestion = await prisma.banlistSuggestion.create({
      data: {
        playerId: user.playerId,
        banlistId: input.banlistId,
        banned: input.banned,
        limited: input.limited,
        semilimited: input.semilimited,
        unlimited: input.unlimited,
        chosen: false,
      },
    });

    return { success: true, id: suggestion.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create suggestion',
    };
  }
}
