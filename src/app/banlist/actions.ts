"use server";

import { prisma } from "@lib/prisma";
import { Banlist } from '@/src/types';

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
      banned: parseBanlistField(banlistEntity.banned),
      limited: parseBanlistField(banlistEntity.limited),
      semilimited: parseBanlistField(banlistEntity.semilimited),
      unlimited: parseBanlistField(banlistEntity.unlimited),
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
