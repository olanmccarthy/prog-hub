"use server";

import { prisma } from "@lib/prisma";
import { Banlist } from '@/src/types';
import { parseBanlistField } from "@lib/banlistHelpers";


interface GetMostRecentBanlistResult {
  success: boolean;
  banlist: Banlist | null;
  error?: string;
}

export async function getMostRecentBanlist(): Promise<GetMostRecentBanlistResult> {
  try {
    // Get the active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    if (!activeSession) {
      return {
        success: false,
        banlist: null,
        error: 'No active session found',
      };
    }

    // Get the banlist for this session
    const banlistEntity = await prisma.banlist.findFirst({
      where: { sessionId: activeSession.number },
    });

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
      banned: await parseBanlistField(banlistEntity.banned),
      limited: await parseBanlistField(banlistEntity.limited),
      semilimited: await parseBanlistField(banlistEntity.semilimited),
      unlimited: await parseBanlistField(banlistEntity.unlimited),
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
