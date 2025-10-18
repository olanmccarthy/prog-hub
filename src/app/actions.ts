"use server";

import { prisma } from "@lib/prisma";
import type { BanlistData } from "@lib/deckValidator";

interface GetMostRecentBanlistResult {
  success: boolean;
  banlist: BanlistData | null;
  sessionNumber?: number;
  error?: string;
}

export async function getMostRecentBanlist(): Promise<GetMostRecentBanlistResult> {
  try {
    // Get the most recent session
    const mostRecentSession = await prisma.session.findFirst({
      orderBy: { date: "desc" },
    });

    if (!mostRecentSession) {
      return {
        success: false,
        banlist: null,
        error: "No sessions found",
      };
    }

    // Get the banlist for this session
    const banlist = await prisma.banlist.findFirst({
      where: { sessionId: mostRecentSession.id },
    });

    if (!banlist) {
      return {
        success: false,
        banlist: null,
        error: "No banlist found for the most recent session",
      };
    }

    // Prisma automatically parses JSON columns to proper types
    const banlistData: BanlistData = {
      banned: banlist.banned as number[],
      limited: banlist.limited as number[],
      semilimited: banlist.semilimited as number[],
      unlimited: banlist.unlimited as number[],
    };

    return {
      success: true,
      banlist: banlistData,
      sessionNumber: mostRecentSession.number,
    };
  } catch (error) {
    console.error("Error fetching most recent banlist:", error);
    return {
      success: false,
      banlist: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
