"use server";

import { AppDataSource } from "@/src/lib/data-source";
import { Pairing } from "@/src/entities/Pairing";
import { Session } from "@/src/entities/Session";

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
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // If no sessionId provided, get the current session (latest session)
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const sessionRepo = AppDataSource.getRepository(Session);
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

    const pairingRepo = AppDataSource.getRepository(Pairing);
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
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const sessionRepo = AppDataSource.getRepository(Session);
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
