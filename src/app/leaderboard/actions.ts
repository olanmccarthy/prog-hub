"use server";

import { prisma } from "@lib/prisma";

export interface VictoryPointsLeaderboard {
  playerId: number;
  playerName: string;
  totalVictoryPoints: number;
  rank: number;
}

export interface WalletLeaderboard {
  playerId: number;
  playerName: string;
  amount: number;
  rank: number;
}

export interface GetVictoryPointsLeaderboardResult {
  success: boolean;
  leaderboard?: VictoryPointsLeaderboard[];
  error?: string;
}

export interface GetWalletLeaderboardResult {
  success: boolean;
  leaderboard?: WalletLeaderboard[];
  error?: string;
}

/**
 * Get victory points leaderboard
 */
export async function getVictoryPointsLeaderboard(): Promise<GetVictoryPointsLeaderboardResult> {
  try {
    // Get all players first
    const allPlayers = await prisma.player.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get all victory points
    const victoryPoints = await prisma.victoryPoint.findMany({
      select: {
        playerId: true,
      },
    });

    // Count VP per player
    const vpCountMap = new Map<number, number>();
    victoryPoints.forEach((vp) => {
      const count = vpCountMap.get(vp.playerId) || 0;
      vpCountMap.set(vp.playerId, count + 1);
    });

    // Build leaderboard with all players
    const leaderboard = allPlayers.map((player) => ({
      playerId: player.id,
      playerName: player.name,
      totalVictoryPoints: vpCountMap.get(player.id) || 0,
      rank: 0, // Will be assigned after sorting
    }));

    // Sort by VP descending, then by name ascending
    leaderboard.sort((a, b) => {
      if (b.totalVictoryPoints !== a.totalVictoryPoints) {
        return b.totalVictoryPoints - a.totalVictoryPoints;
      }
      return a.playerName.localeCompare(b.playerName);
    });

    // Assign ranks
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return {
      success: true,
      leaderboard,
    };
  } catch (error) {
    console.error("Error fetching victory points leaderboard:", error);
    return {
      success: false,
      error: "Failed to fetch victory points leaderboard",
    };
  }
}

/**
 * Get wallet leaderboard
 */
export async function getWalletLeaderboard(): Promise<GetWalletLeaderboardResult> {
  try {
    // Get all wallets with player names
    const wallets = await prisma.wallet.findMany({
      include: {
        player: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        amount: 'desc',
      },
    });

    // Map to leaderboard format with ranks
    const leaderboard: WalletLeaderboard[] = wallets.map((wallet, index) => ({
      playerId: wallet.player.id,
      playerName: wallet.player.name,
      amount: wallet.amount,
      rank: index + 1,
    }));

    return {
      success: true,
      leaderboard,
    };
  } catch (error) {
    console.error("Error fetching wallet leaderboard:", error);
    return {
      success: false,
      error: "Failed to fetch wallet leaderboard",
    };
  }
}
