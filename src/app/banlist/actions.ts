"use server";

import { getDataSource } from "@lib/data-source";
import { Banlist as BanlistEntity } from "@entities/Banlist";
import { Session } from '@entities/Session';
import { getCurrentUser } from '@lib/auth';
import { Banlist } from '@/src/types';

interface GetMostRecentBanlistResult {
  success: boolean;
  banlist: Banlist | null;
  error?: string;
}

export async function getMostRecentBanlist(): Promise<GetMostRecentBanlistResult> {
  try {
    const dataSource = await getDataSource();
    const sessionRepo = dataSource.getRepository(Session);
    const banlistRepo = dataSource.getRepository(BanlistEntity);

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
    const banlistEntity = await banlistRepo.findOne({
      where: { session: { id: mostRecentSession.id } },
    });

    if (!banlistEntity) {
      return {
        success: false,
        banlist: null,
        error: "No banlist found for the most recent session",
      };
    }

    // Map to Banlist type
    const banlist: Banlist = {
      id: banlistEntity.id,
      sessionId: mostRecentSession.id,
      banned: banlistEntity.banned,
      limited: banlistEntity.limited,
      semilimited: banlistEntity.semilimited,
      unlimited: banlistEntity.unlimited,
    };

    return {
      success: true,
      banlist,
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


export async function getPlayerId() {
const user = await getCurrentUser();

if (!user?.playerId) {
    return {
    success: false,
    error: "Not authenticated",
    };
}

return {
    success: true,
    playerId: user.playerId,
};
}
