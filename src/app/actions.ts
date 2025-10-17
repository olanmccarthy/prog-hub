"use server";

import { getDataSource } from "@lib/data-source";
import { Session } from "@entities/Session";
import { Banlist } from "@entities/Banlist";
import type { BanlistData } from "@lib/deckValidator";

interface GetMostRecentBanlistResult {
  success: boolean;
  banlist: BanlistData | null;
  sessionNumber?: number;
  error?: string;
}

export async function getMostRecentBanlist(): Promise<GetMostRecentBanlistResult> {
  try {
    const dataSource = await getDataSource();
    const sessionRepo = dataSource.getRepository(Session);
    const banlistRepo = dataSource.getRepository(Banlist);

    // Get the most recent session
    const sessions = await sessionRepo.find({
      order: { date: "DESC" },
      take: 1,
    });

    if (sessions.length === 0) {
      return {
        success: false,
        banlist: null,
        error: "No sessions found",
      };
    }

    const mostRecentSession = sessions[0];

    // Get the banlist for this session
    const banlist = await banlistRepo.findOne({
      where: { session: { id: mostRecentSession.id } },
    });

    if (!banlist) {
      return {
        success: false,
        banlist: null,
        error: "No banlist found for the most recent session",
      };
    }

    // TypeORM automatically parses JSON columns, so no need to JSON.parse
    const banlistData: BanlistData = {
      banned: banlist.banned,
      limited: banlist.limited,
      semilimited: banlist.semilimited,
      unlimited: banlist.unlimited,
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
