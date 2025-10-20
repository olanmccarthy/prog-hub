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
    // Get the most recent banlist (by ID descending)
    const banlistEntity = await prisma.banlist.findFirst({
      orderBy: { id: 'desc' },
    });

    // // Get the active session
    // const activeSession = await prisma.session.findFirst({
    //   where: { active: true },
    // });

    // if (!activeSession) {
    //   return {
    //     success: false,
    //     banlist: null,
    //     error: 'No active session found',
    //   };
    // }

    // // Get the banlist for this session
    // const banlistEntity = await prisma.banlist.findFirst({
    //   where: { sessionId: activeSession.number },
    // });

    if (!banlistEntity) {
      return {
        success: false,
        banlist: null,
        error: 'No banlist found',
      };
    }

    // Map to Banlist type
    const banlist: Banlist = {
      id: banlistEntity.id,
      sessionId: banlistEntity.sessionId,
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
