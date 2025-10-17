"use server";

import { getDataSource } from "@lib/data-source";
import { Pairing } from "@entities/Pairing";
import { Session } from "@entities/Session";
import { getCurrentUser } from "@lib/auth";
import { revalidatePath } from "next/cache";

export interface PlayerStanding {
  playerId: number;
  playerName: string;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  gameWins: number;
  gameLosses: number;
  gameWinsInLosses: number;
  gameLossesInWins: number;
  rank: number;
}

export interface GetStandingsResult {
  success: boolean;
  sessionId?: number;
  standings?: PlayerStanding[];
  error?: string;
}

export interface SessionInfo {
  id: number;
  number: number;
  date: Date;
}

export interface GetSessionsResult {
  success: boolean;
  sessions?: SessionInfo[];
  error?: string;
}

interface PlayerStats {
  playerId: number;
  playerName: string;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  gameWins: number;
  gameLosses: number;
  gameWinsInLosses: number;
  gameLossesInWins: number;
  opponentIds: number[];
}

export async function getStandings(
  sessionId?: number
): Promise<GetStandingsResult> {
  try {
    const dataSource = await getDataSource();

    // If no sessionId provided, get the current session (latest session)
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const sessionRepo = dataSource.getRepository(Session);
      const sessions = await sessionRepo.find({
        select: ["id", "number", "date"],
        order: { date: "DESC" },
        take: 1,
      });

      if (sessions.length === 0) {
        return {
          success: false,
          error: "No sessions found",
        };
      }
      currentSessionId = sessions[0].id;
    }

    const pairingRepo = dataSource.getRepository(Pairing);
    const pairings = await pairingRepo.find({
      where: { session: { id: currentSessionId } },
      relations: ["player1", "player2"],
    });

    // Calculate player stats
    const playerStatsMap = new Map<number, PlayerStats>();

    pairings.forEach((pairing) => {
      const p1Id = pairing.player1.id;
      const p2Id = pairing.player2.id;
      const p1Wins = pairing.player1wins;
      const p2Wins = pairing.player2wins;

      // Initialize player1 if not exists
      if (!playerStatsMap.has(p1Id)) {
        playerStatsMap.set(p1Id, {
          playerId: p1Id,
          playerName: pairing.player1.name,
          matchWins: 0,
          matchLosses: 0,
          matchDraws: 0,
          gameWins: 0,
          gameLosses: 0,
          gameWinsInLosses: 0,
          gameLossesInWins: 0,
          opponentIds: [],
        });
      }

      // Initialize player2 if not exists
      if (!playerStatsMap.has(p2Id)) {
        playerStatsMap.set(p2Id, {
          playerId: p2Id,
          playerName: pairing.player2.name,
          matchWins: 0,
          matchLosses: 0,
          matchDraws: 0,
          gameWins: 0,
          gameLosses: 0,
          gameWinsInLosses: 0,
          gameLossesInWins: 0,
          opponentIds: [],
        });
      }

      const p1Stats = playerStatsMap.get(p1Id)!;
      const p2Stats = playerStatsMap.get(p2Id)!;

      // Track opponents
      p1Stats.opponentIds.push(p2Id);
      p2Stats.opponentIds.push(p1Id);

      // Update game wins/losses
      p1Stats.gameWins += p1Wins;
      p1Stats.gameLosses += p2Wins;
      p2Stats.gameWins += p2Wins;
      p2Stats.gameLosses += p1Wins;

      // Determine match result (best of 3: first to 2 wins)
      if (p1Wins === 2) {
        // Player 1 won the match
        p1Stats.matchWins++;
        p2Stats.matchLosses++;
        p1Stats.gameLossesInWins += p2Wins;
        p2Stats.gameWinsInLosses += p2Wins;
      } else if (p2Wins === 2) {
        // Player 2 won the match
        p2Stats.matchWins++;
        p1Stats.matchLosses++;
        p2Stats.gameLossesInWins += p1Wins;
        p1Stats.gameWinsInLosses += p1Wins;
      } else if (p1Wins === 1 && p2Wins === 1) {
        // Draw
        p1Stats.matchDraws++;
        p2Stats.matchDraws++;
      }
      // If both are 0, match hasn't been played yet (no update needed)
    });

    // Convert to array and sort with tiebreakers
    const playerStats = Array.from(playerStatsMap.values());
    const sortedStandings = sortWithTiebreakers(playerStats, pairings);

    // Assign ranks
    const standings: PlayerStanding[] = sortedStandings.map((stats, index) => ({
      playerId: stats.playerId,
      playerName: stats.playerName,
      matchWins: stats.matchWins,
      matchLosses: stats.matchLosses,
      matchDraws: stats.matchDraws,
      gameWins: stats.gameWins,
      gameLosses: stats.gameLosses,
      gameWinsInLosses: stats.gameWinsInLosses,
      gameLossesInWins: stats.gameLossesInWins,
      rank: index + 1,
    }));

    return {
      success: true,
      sessionId: currentSessionId,
      standings,
    };
  } catch (error) {
    console.error("Error fetching standings:", error);
    return {
      success: false,
      error: "Failed to fetch standings",
    };
  }
}

function sortWithTiebreakers(
  players: PlayerStats[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _pairings: Pairing[]
): PlayerStats[] {
  return players.sort((a, b) => {
    // Primary: Most match wins
    if (a.matchWins !== b.matchWins) {
      return b.matchWins - a.matchWins;
    }

    // Tiebreaker 1: Most game wins in lost matches
    if (a.gameWinsInLosses !== b.gameWinsInLosses) {
      return b.gameWinsInLosses - a.gameWinsInLosses;
    }

    // Tiebreaker 2: Least game losses in won matches
    if (a.gameLossesInWins !== b.gameLossesInWins) {
      return a.gameLossesInWins - b.gameLossesInWins;
    }

    // Tiebreaker 3: Head to head
    // Note: For full implementation of multi-way tie resolution, additional logic would be needed
    return 0;
  });
}

export async function getSessions(): Promise<GetSessionsResult> {
  try {
    const dataSource = await getDataSource();
    const sessionRepo = dataSource.getRepository(Session);
    const sessions = await sessionRepo.find({
      select: ["id", "number", "date"],
      order: { date: "DESC" },
    });

    const sessionData: SessionInfo[] = sessions.map((s) => ({
      id: s.id,
      number: s.number,
      date: s.date,
    }));

    return {
      success: true,
      sessions: sessionData,
    };
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return {
      success: false,
      error: "Failed to fetch sessions",
    };
  }
}

export interface CanFinalizeResult {
  canFinalize: boolean;
  isCurrentSession: boolean;
  allMatchesComplete: boolean;
  error?: string;
}

export interface FinalizeResult {
  success: boolean;
  error?: string;
}

export interface IsAdminResult {
  isAdmin: boolean;
}

export interface IsFinalizedResult {
  isFinalized: boolean;
}

/**
 * Check if standings for a session are finalized
 */
export async function checkIsFinalized(sessionId: number): Promise<IsFinalizedResult> {
  try {
    const dataSource = await getDataSource();
    const sessionRepo = dataSource.getRepository(Session);
    const session = await sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      return { isFinalized: false };
    }

    // Check if all placement fields are filled (meaning standings are finalized)
    const isFinalized = !!(
      session.first &&
      session.second &&
      session.third &&
      session.fourth &&
      session.fifth &&
      session.sixth
    );

    return { isFinalized };
  } catch (error) {
    console.error("Error checking finalized status:", error);
    return { isFinalized: false };
  }
}

/**
 * Check if current user is an admin
 */
export async function checkIsAdmin(): Promise<IsAdminResult> {
  try {
    const currentUser = await getCurrentUser();
    return {
      isAdmin: currentUser?.isAdmin || false,
    };
  } catch (error) {
    console.error("Error checking admin status:", error);
    return {
      isAdmin: false,
    };
  }
}

/**
 * Check if standings can be finalized
 */
export async function canFinalizeStandings(sessionId: number): Promise<CanFinalizeResult> {
  try {
    const dataSource = await getDataSource();
    const sessionRepo = dataSource.getRepository(Session);
    const pairingRepo = dataSource.getRepository(Pairing);

    // Get the current (most recent) session
    const sessions = await sessionRepo.find({
      order: { date: "DESC" },
      take: 1,
    });

    const currentSession = sessions.length > 0 ? sessions[0] : null;

    if (!currentSession) {
      return {
        canFinalize: false,
        isCurrentSession: false,
        allMatchesComplete: false,
        error: "No current session found",
      };
    }

    const isCurrentSession = currentSession.id === sessionId;

    // Get all pairings for this session
    const pairings = await pairingRepo.find({
      where: { session: { id: sessionId } },
    });

    // Check if all matches have at least one player with a win
    const allMatchesComplete = pairings.every(
      (pairing) => pairing.player1wins > 0 || pairing.player2wins > 0
    );

    return {
      canFinalize: isCurrentSession && allMatchesComplete,
      isCurrentSession,
      allMatchesComplete,
    };
  } catch (error) {
    console.error("Error checking finalize status:", error);
    return {
      canFinalize: false,
      isCurrentSession: false,
      allMatchesComplete: false,
      error: "Failed to check finalize status",
    };
  }
}

/**
 * Finalize standings by updating session placements
 */
export async function finalizeStandings(sessionId: number): Promise<FinalizeResult> {
  try {
    // Check permissions
    const currentUser = await getCurrentUser();
    if (!currentUser?.isAdmin) {
      return {
        success: false,
        error: "Unauthorized: Only admins can finalize standings",
      };
    }

    const dataSource = await getDataSource();

    // Validate that standings can be finalized
    const canFinalize = await canFinalizeStandings(sessionId);
    if (!canFinalize.canFinalize) {
      return {
        success: false,
        error: canFinalize.error || "Cannot finalize standings",
      };
    }

    // Get the standings
    const standingsResult = await getStandings(sessionId);
    if (!standingsResult.success || !standingsResult.standings) {
      return {
        success: false,
        error: "Failed to get standings",
      };
    }

    const standings = standingsResult.standings;

    // Ensure we have at least 6 players
    if (standings.length < 6) {
      return {
        success: false,
        error: "Not enough players to finalize (need at least 6)",
      };
    }

    const sessionRepo = dataSource.getRepository(Session);
    const session = await sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      return {
        success: false,
        error: "Session not found",
      };
    }

    // Update session with top 6 placements
    session.first = standings[0].playerId;
    session.second = standings[1].playerId;
    session.third = standings[2].playerId;
    session.fourth = standings[3].playerId;
    session.fifth = standings[4].playerId;
    session.sixth = standings[5].playerId;

    await sessionRepo.save(session);

    // Revalidate relevant pages
    revalidatePath("/play/standings");
    revalidatePath("/admin/prog_actions");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error finalizing standings:", error);
    return {
      success: false,
      error: "Failed to finalize standings",
    };
  }
}
