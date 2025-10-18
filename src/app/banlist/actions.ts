"use server";

import { prisma } from "@lib/prisma";
import { Banlist } from '@/src/types';

interface GetMostRecentBanlistResult {
  success: boolean;
  banlist: Banlist | null;
  error?: string;
}

export async function getMostRecentBanlist(): Promise<GetMostRecentBanlistResult> {
  try {
    // Get the most recent session
    const mostRecentSession = await prisma.session.findFirst({
      orderBy: { date: 'desc' },
    });

    if (!mostRecentSession) {
      return {
        success: false,
        banlist: null,
        error: 'No sessions found',
      };
    }

    // Get the banlist for this session
    const banlistEntity = await prisma.banlist.findFirst({
      where: { sessionId: mostRecentSession.id },
    });

    if (!banlistEntity) {
      return {
        success: false,
        banlist: null,
        error: 'No banlist found for the most recent session',
      };
    }

    // Map to Banlist type
    const banlist: Banlist = {
      id: banlistEntity.id,
      sessionId: mostRecentSession.id,
      banned: banlistEntity.banned as number[],
      limited: banlistEntity.limited as number[],
      semilimited: banlistEntity.semilimited as number[],
      unlimited: banlistEntity.unlimited as number[],
    };

    return {
      success: true,
      banlist,
    };
  } catch (error) {
    console.error('Error fetching most recent banlist:', error);
    return {
      success: false,
      banlist: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
