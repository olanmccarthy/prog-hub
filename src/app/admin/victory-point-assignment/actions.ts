'use server';

import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@lib/auth';
import { revalidatePath } from 'next/cache';

export interface RankedPlayer {
  playerId: number;
  playerName: string;
  rank: number;
  matchWins: number;
  gameWins: number;
  opponentMatchWinRate: number;
  currentVictoryPoints: number;
  currentWalletPoints: number;
  walletPointsThisSession: number;
}

export interface VictoryPointStatusResult {
  success: boolean;
  error?: string;
  canAssign: boolean;
  reason?: string;
  activeSessionNumber?: number;
  rankedPlayers: RankedPlayer[];
  alreadyAssigned: boolean;
}

export interface AssignVictoryPointResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Get victory point assignment status and ranked players
 */
export async function getVictoryPointStatus(): Promise<VictoryPointStatusResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
        canAssign: false,
        rankedPlayers: [],
        alreadyAssigned: false,
      };
    }

    // Get active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
      include: {
        pairings: {
          include: {
            player1: true,
            player2: true,
          },
        },
      },
    });

    if (!activeSession) {
      return {
        success: false,
        error: 'No active session found',
        canAssign: false,
        rankedPlayers: [],
        alreadyAssigned: false,
      };
    }

    // Check if victory points already assigned
    if (activeSession.victoryPointsAssigned) {
      // Get ranked players anyway for display
      const rankedPlayers = await getRankedPlayersForSession(activeSession.id);

      return {
        success: true,
        canAssign: false,
        reason: 'Victory points have already been assigned for this session',
        activeSessionNumber: activeSession.number,
        rankedPlayers,
        alreadyAssigned: true,
      };
    }

    // Check if all placements are filled
    const placementsFilled = activeSession.first && activeSession.second &&
                             activeSession.third && activeSession.fourth &&
                             activeSession.fifth && activeSession.sixth;

    if (!placementsFilled) {
      return {
        success: true,
        canAssign: false,
        reason: 'Standings must be finalized before assigning victory points',
        activeSessionNumber: activeSession.number,
        rankedPlayers: [],
        alreadyAssigned: false,
      };
    }

    // Get ranked players
    const rankedPlayers = await getRankedPlayersForSession(activeSession.id);

    return {
      success: true,
      canAssign: true,
      activeSessionNumber: activeSession.number,
      rankedPlayers,
      alreadyAssigned: false,
    };
  } catch (error) {
    console.error('Error getting victory point status:', error);
    return {
      success: false,
      error: 'Failed to load victory point status',
      canAssign: false,
      rankedPlayers: [],
      alreadyAssigned: false,
    };
  }
}

/**
 * Helper function to get ranked players for a session
 * Uses the saved placement fields from the session (populated when standings are finalized)
 */
async function getRankedPlayersForSession(sessionId: number): Promise<RankedPlayer[]> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      pairings: {
        include: {
          player1: true,
          player2: true,
        },
      },
    },
  });

  if (!session) return [];

  // Get active wallet point breakdown
  const activeBreakdown = await prisma.walletPointBreakdown.findFirst({
    where: { active: true },
  });

  const walletPoints = activeBreakdown
    ? [
        activeBreakdown.first,
        activeBreakdown.second,
        activeBreakdown.third,
        activeBreakdown.fourth,
        activeBreakdown.fifth,
        activeBreakdown.sixth,
      ]
    : [0, 0, 0, 0, 0, 0];

  // Use saved placement fields from finalized standings
  const placementPlayerIds = [
    session.first,
    session.second,
    session.third,
    session.fourth,
    session.fifth,
    session.sixth,
  ].filter((id): id is number => id !== null);

  if (placementPlayerIds.length === 0) {
    // Fallback: if placements not saved, return empty array
    return [];
  }

  // Calculate match stats for display purposes only (ranking already determined)
  const playerStatsMap = new Map<number, { matchWins: number; gameWins: number; opponentMatchWinRate: number }>();

  // Get all unique players in the session
  const playerIds = new Set<number>();
  session.pairings.forEach(pairing => {
    playerIds.add(pairing.player1Id);
    playerIds.add(pairing.player2Id);
  });

  // Calculate stats for each player
  Array.from(playerIds).forEach(playerId => {
    const playerPairings = session.pairings.filter(
      p => p.player1Id === playerId || p.player2Id === playerId
    );

    let matchWins = 0;
    let gameWins = 0;
    const opponentIds: number[] = [];

    playerPairings.forEach(pairing => {
      const isPlayer1 = pairing.player1Id === playerId;
      const playerWins = isPlayer1 ? pairing.player1wins : pairing.player2wins;
      const opponentWins = isPlayer1 ? pairing.player2wins : pairing.player1wins;
      const opponentId = isPlayer1 ? pairing.player2Id : pairing.player1Id;

      gameWins += playerWins;

      if (playerWins === 2) {
        matchWins++;
      }

      opponentIds.push(opponentId);
    });

    // Calculate opponent match win rate
    let totalOpponentMatchWins = 0;
    let totalOpponentMatches = 0;

    opponentIds.forEach(opponentId => {
      const opponentPairings = session.pairings.filter(
        p => p.player1Id === opponentId || p.player2Id === opponentId
      );

      opponentPairings.forEach(pairing => {
        const isOppPlayer1 = pairing.player1Id === opponentId;
        const oppWins = isOppPlayer1 ? pairing.player1wins : pairing.player2wins;

        if (oppWins === 2) {
          totalOpponentMatchWins++;
        }
        totalOpponentMatches++;
      });
    });

    const opponentMatchWinRate = totalOpponentMatches > 0
      ? totalOpponentMatchWins / totalOpponentMatches
      : 0;

    playerStatsMap.set(playerId, {
      matchWins,
      gameWins,
      opponentMatchWinRate,
    });
  });

  // Build ranked list using saved placement order
  const rankedPlayers: RankedPlayer[] = [];
  for (let i = 0; i < placementPlayerIds.length; i++) {
    const playerId = placementPlayerIds[i];
    const stats = playerStatsMap.get(playerId) || { matchWins: 0, gameWins: 0, opponentMatchWinRate: 0 };

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        wallet: true,
      },
    });

    if (player) {
      // Get current victory points
      const victoryPointCount = await prisma.victoryPoint.count({
        where: { playerId: playerId },
      });

      // Wallet points this session based on rank (0 for last place)
      const rank = i + 1;
      const walletPointsThisSession = rank === placementPlayerIds.length ? 0 : walletPoints[rank - 1] || 0;

      rankedPlayers.push({
        playerId: playerId,
        playerName: player.name,
        rank,
        matchWins: stats.matchWins,
        gameWins: stats.gameWins,
        opponentMatchWinRate: stats.opponentMatchWinRate,
        currentVictoryPoints: victoryPointCount,
        currentWalletPoints: player.wallet?.amount || 0,
        walletPointsThisSession,
      });
    }
  }

  return rankedPlayers;
}

/**
 * Assign victory point to a player and wallet points to others
 */
export async function assignVictoryPoint(
  selectedPlayerId: number,
  rankedPlayers: RankedPlayer[]
): Promise<AssignVictoryPointResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    // Get active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    if (!activeSession) {
      return {
        success: false,
        error: 'No active session found',
      };
    }

    // Check if already assigned
    if (activeSession.victoryPointsAssigned) {
      return {
        success: false,
        error: 'Victory points have already been assigned for this session',
      };
    }

    // Get active wallet breakdown
    const activeBreakdown = await prisma.walletPointBreakdown.findFirst({
      where: { active: true },
    });

    if (!activeBreakdown) {
      return {
        success: false,
        error: 'No active wallet point breakdown found',
      };
    }

    // Validate selected player exists in ranked list
    const selectedPlayer = rankedPlayers.find(p => p.playerId === selectedPlayerId);
    if (!selectedPlayer) {
      return {
        success: false,
        error: 'Selected player not found in rankings',
      };
    }

    // Create victory point for selected player
    await prisma.victoryPoint.create({
      data: {
        playerId: selectedPlayerId,
        sessionId: activeSession.id,
      },
    });

    // Award wallet points to all other players (except last place)
    const walletPoints = [
      activeBreakdown.first,
      activeBreakdown.second,
      activeBreakdown.third,
      activeBreakdown.fourth,
      activeBreakdown.fifth,
      activeBreakdown.sixth,
    ];

    // Create adjusted rankings excluding the VP winner
    const playersForWalletPoints = rankedPlayers
      .filter(p => p.playerId !== selectedPlayerId)
      .filter((_, index, array) => index < array.length - 1); // Exclude last place

    // Award wallet points based on original ranking position
    for (let i = 0; i < playersForWalletPoints.length; i++) {
      const player = playersForWalletPoints[i];
      const pointsToAward = walletPoints[player.rank - 1] || 0;

      if (pointsToAward > 0) {
        // Update player's wallet
        const wallet = await prisma.wallet.upsert({
          where: { playerId: player.playerId },
          update: {
            amount: {
              increment: pointsToAward,
            },
          },
          create: {
            playerId: player.playerId,
            amount: pointsToAward,
          },
        });

        // Create wallet transaction record
        await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            sessionId: activeSession.id,
            amount: pointsToAward,
            type: 'VICTORY_POINT_AWARD',
            description: `Session ${activeSession.number} - ${player.rank}${player.rank === 1 ? 'st' : player.rank === 2 ? 'nd' : player.rank === 3 ? 'rd' : 'th'} place award (VP declined)`,
          },
        });
      }
    }

    // Mark session as victory points assigned and wallet points assigned
    await prisma.session.update({
      where: { id: activeSession.id },
      data: {
        victoryPointsAssigned: true,
        walletPointsAssigned: true,
      },
    });

    revalidatePath('/admin/victory-point-assignment');

    // Send Discord notifications for leaderboard and wallet updates
    const { notifyLeaderboard, notifyWalletUpdate } = await import('@lib/discordClient');
    await Promise.all([
      notifyLeaderboard(activeSession.id),
      notifyWalletUpdate(activeSession.id),
    ]);

    return {
      success: true,
      message: `Victory point assigned to ${selectedPlayer.playerName}. Wallet points distributed to other players.`,
    };
  } catch (error) {
    console.error('Error assigning victory point:', error);
    return {
      success: false,
      error: 'Failed to assign victory point',
    };
  }
}
