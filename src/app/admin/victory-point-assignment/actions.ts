'use server';

import { prisma } from '@lib/prisma';
import { requireAdmin } from '@lib/serverUtils';
import { getActiveSession } from '@lib/sessionHelpers';
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
  awardTwoVictoryPoints?: boolean;
  reverseVpOrder?: boolean;
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
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error,
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

      // Get modifiers
      const modifiers = await prisma.sessionModifier.findUnique({
        where: { sessionId: activeSession.id },
      });

      return {
        success: true,
        canAssign: false,
        reason: 'Victory points have already been assigned for this session',
        activeSessionNumber: activeSession.number,
        rankedPlayers,
        alreadyAssigned: true,
        awardTwoVictoryPoints: modifiers?.awardTwoVictoryPoints || false,
        reverseVpOrder: modifiers?.reverseVpOrder || false,
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
        awardTwoVictoryPoints: false,
      };
    }

    // Get ranked players
    const rankedPlayers = await getRankedPlayersForSession(activeSession.id);

    // Get modifiers
    const modifiers = await prisma.sessionModifier.findUnique({
      where: { sessionId: activeSession.id },
    });

    return {
      success: true,
      canAssign: true,
      activeSessionNumber: activeSession.number,
      rankedPlayers,
      alreadyAssigned: false,
      awardTwoVictoryPoints: modifiers?.awardTwoVictoryPoints || false,
      reverseVpOrder: modifiers?.reverseVpOrder || false,
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

  // Get session modifiers to apply to wallet points
  const modifiers = await prisma.sessionModifier.findUnique({
    where: { sessionId: sessionId },
  });

  let walletPoints = activeBreakdown
    ? [
        activeBreakdown.first,
        activeBreakdown.second,
        activeBreakdown.third,
        activeBreakdown.fourth,
        activeBreakdown.fifth,
        activeBreakdown.sixth,
      ]
    : [0, 0, 0, 0, 0, 0];

  // Apply wallet point modifiers to base amounts
  // Modifier 1: Double wallet points
  if (modifiers?.doubleWalletPoints) {
    walletPoints = walletPoints.map((pts) => pts * 2);
  }

  // Modifier 12: Halve all wallet points (round up)
  if (modifiers?.halveAllWalletPoints) {
    walletPoints = walletPoints.map((pts) => Math.ceil(pts / 2));
  }

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
      const isLastPlace = rank === placementPlayerIds.length;

      // Calculate base wallet points with modifiers
      let walletPointsThisSession = 0;

      if (modifiers?.equalSplitWallet) {
        // Equal split mode: top 5 players split equally
        if (!isLastPlace) {
          const totalPoints = walletPoints.slice(0, 5).reduce((sum, pts) => sum + pts, 0);
          walletPointsThisSession = Math.floor(totalPoints / 5);
        }
      } else {
        // Normal mode: based on placement
        walletPointsThisSession = isLastPlace ? 0 : walletPoints[rank - 1] || 0;
      }

      // Apply placement bonuses (if not last place)
      if (!isLastPlace) {
        // Modifier 3: Odd placement bonus
        if (modifiers?.oddPlacementBonus && rank % 2 === 1) {
          walletPointsThisSession += 1;
        }

        // Modifier 4: Even placement bonus
        if (modifiers?.evenPlacementBonus && rank % 2 === 0) {
          walletPointsThisSession += 1;
        }

        // Modifier 8: Match win bonus
        if (modifiers?.matchWinBonus) {
          walletPointsThisSession += stats.matchWins || 0;
        }

        // Bounty Hunter: Bonus for beating VP leaders
        if (modifiers?.bountyHunter) {
          // Get all players and their VP counts before this session
          const allPlayers = await prisma.player.findMany({
            select: { id: true },
          });

          const vpCounts = await Promise.all(
            allPlayers.map(async (p) => ({
              playerId: p.id,
              vpCount: await prisma.victoryPoint.count({
                where: { playerId: p.id },
              }),
            }))
          );

          // Find the max VP count
          const maxVP = Math.max(...vpCounts.map(p => p.vpCount));

          // Get all players at max VP (includes single leader or multiple tied)
          const vpLeaders = vpCounts
            .filter(p => p.vpCount === maxVP)
            .map(p => p.playerId);

          // Check how many VP leaders this player beat
          let bountyCount = 0;
          for (const leaderId of vpLeaders) {
            const matchup = session.pairings.find(
              p =>
                (p.player1Id === playerId && p.player2Id === leaderId) ||
                (p.player2Id === playerId && p.player1Id === leaderId)
            );

            if (matchup) {
              const isPlayer1 = matchup.player1Id === playerId;
              const playerWins = isPlayer1 ? matchup.player1wins : matchup.player2wins;

              // Player beat this VP leader (won the match)
              if (playerWins === 2) {
                bountyCount++;
              }
            }
          }

          walletPointsThisSession += bountyCount;
        }
      }

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
 * Calculate bounty hunter bonus for a player
 * Returns the number of VP leaders (at top) that this player beat
 */
async function calculateBountyHunterBonus(playerId: number, sessionId: number): Promise<number> {
  // Get all players and their VP counts before this session
  const allPlayers = await prisma.player.findMany({
    select: { id: true },
  });

  const vpCounts = await Promise.all(
    allPlayers.map(async (p) => ({
      playerId: p.id,
      vpCount: await prisma.victoryPoint.count({
        where: { playerId: p.id },
      }),
    }))
  );

  // Find the max VP count
  const maxVP = Math.max(...vpCounts.map(p => p.vpCount));

  // Get all players at max VP (includes single leader or multiple tied)
  const vpLeaders = vpCounts
    .filter(p => p.vpCount === maxVP)
    .map(p => p.playerId);

  // Get session pairings
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      pairings: true,
    },
  });

  if (!session) {
    return 0;
  }

  // Check how many VP leaders this player beat
  let bountyCount = 0;
  for (const leaderId of vpLeaders) {
    const matchup = session.pairings.find(
      p =>
        (p.player1Id === playerId && p.player2Id === leaderId) ||
        (p.player2Id === playerId && p.player1Id === leaderId)
    );

    if (matchup) {
      const isPlayer1 = matchup.player1Id === playerId;
      const playerWins = isPlayer1 ? matchup.player1wins : matchup.player2wins;

      // Player beat this VP leader (won the match)
      if (playerWins === 2) {
        bountyCount++;
      }
    }
  }

  return bountyCount;
}

/**
 * Assign victory point to a player and wallet points to others
 */
export async function assignVictoryPoint(
  selectedPlayerId: number,
  rankedPlayers: RankedPlayer[]
): Promise<AssignVictoryPointResult> {
  try {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult;

    // Get active session
    const activeSession = await getActiveSession();

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

    // Fetch session modifiers
    const modifiers = await prisma.sessionModifier.findUnique({
      where: { sessionId: activeSession.id },
    });

    // Validate selected player exists in ranked list
    const selectedPlayer = rankedPlayers.find(p => p.playerId === selectedPlayerId);
    if (!selectedPlayer) {
      return {
        success: false,
        error: 'Selected player not found in rankings',
      };
    }

    // Loser Prizing: "Why Not Both?" - check if special player can take both VP and wallet
    const canTakeBoth = modifiers?.loserPrizingTakeVpAndWallet &&
                        modifiers.loserPrizingPlayerId === selectedPlayerId;

    // Modifier 2: Award 2 VP instead of 1
    const vpCount = modifiers?.awardTwoVictoryPoints ? 2 : 1;
    for (let i = 0; i < vpCount; i++) {
      await prisma.victoryPoint.create({
        data: {
          playerId: selectedPlayerId,
          sessionId: activeSession.id,
        },
      });
    }

    // Modifier 10: Equal Split Wallet (complete override)
    if (modifiers?.equalSplitWallet) {
      // Calculate total pool from 1st-5th places only
      const totalPool =
        activeBreakdown.first +
        activeBreakdown.second +
        activeBreakdown.third +
        activeBreakdown.fourth +
        activeBreakdown.fifth;

      // Divide equally among top 5 players (including VP taker)
      let perPlayerAmount = Math.floor(totalPool / 5);

      // Modifier 1: Apply doubling BEFORE other bonuses
      if (modifiers?.doubleWalletPoints) {
        perPlayerAmount *= 2;
      }

      // Modifier 12: Halve all wallet points (round up)
      if (modifiers?.halveAllWalletPoints) {
        perPlayerAmount = Math.ceil(perPlayerAmount / 2);
      }

      // Get top 5 players (6th place excluded)
      const eligiblePlayers = rankedPlayers.slice(0, 5);

      // Award to each (including VP taker - don't filter them out)
      for (const player of eligiblePlayers) {
        let finalAmount = perPlayerAmount;

        // Modifier 3 & 4: Odd/even placement bonuses
        if (modifiers?.oddPlacementBonus && player.rank % 2 === 1) {
          finalAmount += 1;
        }
        if (modifiers?.evenPlacementBonus && player.rank % 2 === 0) {
          finalAmount += 1;
        }

        // Modifier 8: Match win bonus
        if (modifiers?.matchWinBonus) {
          finalAmount += player.matchWins || 0;
        }

        // Bounty Hunter: Bonus for beating VP leaders
        if (modifiers?.bountyHunter) {
          const bountyBonus = await calculateBountyHunterBonus(player.playerId, activeSession.id);
          finalAmount += bountyBonus;
        }

        // Modifier 9: Admin halve wallet for specific players
        if (
          modifiers?.adminHalveWallet &&
          Array.isArray(modifiers.halvedPlayerIds) &&
          modifiers.halvedPlayerIds.includes(player.playerId)
        ) {
          finalAmount = Math.floor(finalAmount / 2);
        }

        if (finalAmount > 0) {
          // Update player's wallet
          const wallet = await prisma.wallet.upsert({
            where: { playerId: player.playerId },
            update: {
              amount: {
                increment: finalAmount,
              },
            },
            create: {
              playerId: player.playerId,
              amount: finalAmount,
            },
          });

          // Create wallet transaction record
          await prisma.walletTransaction.create({
            data: {
              walletId: wallet.id,
              sessionId: activeSession.id,
              amount: finalAmount,
              type: 'VICTORY_POINT_AWARD',
              description: `Session ${activeSession.number} - Equal split distribution (${player.rank}${player.rank === 1 ? 'st' : player.rank === 2 ? 'nd' : player.rank === 3 ? 'rd' : 'th'} place)`,
            },
          });
        }
      }
    } else {
      // Normal distribution (existing logic)
      // Award wallet points to all other players (except last place)
      let walletPoints = [
        activeBreakdown.first,
        activeBreakdown.second,
        activeBreakdown.third,
        activeBreakdown.fourth,
        activeBreakdown.fifth,
        activeBreakdown.sixth,
      ];

      // Modifier 1: Double wallet points
      if (modifiers?.doubleWalletPoints) {
        walletPoints = walletPoints.map((pts) => pts * 2);
      }

      // Modifier 12: Halve all wallet points (round up)
      if (modifiers?.halveAllWalletPoints) {
        walletPoints = walletPoints.map((pts) => Math.ceil(pts / 2));
      }

      // Get the player who finished in last place (highest rank number)
      const lastPlacePlayer = rankedPlayers[rankedPlayers.length - 1];

      // Exclude VP winner AND originally-last-place player from wallet points
      const playersForWalletPoints = rankedPlayers.filter(
        (p) => p.playerId !== selectedPlayerId && p.playerId !== lastPlacePlayer.playerId
      );

      // Award wallet points based on original ranking position
      // If "Why Not Both?" is active, also award to the VP taker
      const allEligiblePlayers = canTakeBoth
        ? rankedPlayers.filter(p => p.playerId !== lastPlacePlayer.playerId)
        : playersForWalletPoints;

      for (const player of allEligiblePlayers) {
        let pointsToAward = walletPoints[player.rank - 1] || 0;

        // Modifier 3 & 4: Odd/even placement bonuses
        if (modifiers?.oddPlacementBonus && player.rank % 2 === 1) {
          pointsToAward += 1;
        }
        if (modifiers?.evenPlacementBonus && player.rank % 2 === 0) {
          pointsToAward += 1;
        }

        // Modifier 8: Match win bonus
        if (modifiers?.matchWinBonus) {
          pointsToAward += player.matchWins || 0;
        }

        // Bounty Hunter: Bonus for beating VP leaders
        if (modifiers?.bountyHunter) {
          const bountyBonus = await calculateBountyHunterBonus(player.playerId, activeSession.id);
          pointsToAward += bountyBonus;
        }

        // Loser Prizing: Crazy Time - double points for specific player
        if (
          modifiers?.loserPrizingDoublePoints &&
          modifiers.loserPrizingPlayerId === player.playerId
        ) {
          pointsToAward *= 2;
        }

        // Modifier 9: Admin halve wallet for specific players
        if (
          modifiers?.adminHalveWallet &&
          Array.isArray(modifiers.halvedPlayerIds) &&
          modifiers.halvedPlayerIds.includes(player.playerId)
        ) {
          pointsToAward = Math.floor(pointsToAward / 2);
        }

        // Loser Prizing: Dead Weight - split points with target player
        if (
          modifiers?.loserPrizingSharedPoints &&
          modifiers.loserPrizingPlayerId === player.playerId &&
          modifiers.loserPrizingTargetPlayerId
        ) {
          const halfPoints = Math.floor(pointsToAward / 2);

          // Give half to main player
          if (halfPoints > 0) {
            const wallet = await prisma.wallet.upsert({
              where: { playerId: player.playerId },
              update: { amount: { increment: halfPoints } },
              create: { playerId: player.playerId, amount: halfPoints },
            });

            await prisma.walletTransaction.create({
              data: {
                walletId: wallet.id,
                sessionId: activeSession.id,
                amount: halfPoints,
                type: 'VICTORY_POINT_AWARD',
                description: `Session ${activeSession.number} - Dead Weight (shared)`,
              },
            });
          }

          // Give half to target player
          if (halfPoints > 0) {
            const targetWallet = await prisma.wallet.upsert({
              where: { playerId: modifiers.loserPrizingTargetPlayerId },
              update: { amount: { increment: halfPoints } },
              create: { playerId: modifiers.loserPrizingTargetPlayerId, amount: halfPoints },
            });

            await prisma.walletTransaction.create({
              data: {
                walletId: targetWallet.id,
                sessionId: activeSession.id,
                amount: halfPoints,
                type: 'LOSER_PRIZING',
                description: `Session ${activeSession.number} - Dead Weight (received share)`,
              },
            });
          }

          continue; // Skip normal wallet award for this player
        }

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
          const description = canTakeBoth && player.playerId === selectedPlayerId
            ? `Session ${activeSession.number} - Why Not Both? (VP + Wallet)`
            : `Session ${activeSession.number} - ${player.rank}${player.rank === 1 ? 'st' : player.rank === 2 ? 'nd' : player.rank === 3 ? 'rd' : 'th'} place award (VP declined)`;

          await prisma.walletTransaction.create({
            data: {
              walletId: wallet.id,
              sessionId: activeSession.id,
              amount: pointsToAward,
              type: 'VICTORY_POINT_AWARD',
              description,
            },
          });
        }
      }
    }

    // Loser Prizing: The Market is Going to go Up - payout investment if player placed 1st or 2nd
    if (
      modifiers?.loserPrizingInvestment &&
      modifiers.loserPrizingPlayerId
    ) {
      const investorPlayer = rankedPlayers.find(p => p.playerId === modifiers.loserPrizingPlayerId);
      if (investorPlayer && (investorPlayer.rank === 1 || investorPlayer.rank === 2)) {
        const payout = modifiers.loserPrizingInvestment * 2;
        const wallet = await prisma.wallet.upsert({
          where: { playerId: modifiers.loserPrizingPlayerId },
          update: { amount: { increment: payout } },
          create: { playerId: modifiers.loserPrizingPlayerId, amount: payout },
        });

        await prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            sessionId: activeSession.id,
            amount: payout,
            type: 'LOSER_PRIZING',
            description: `The Market investment payout (${investorPlayer.rank}${investorPlayer.rank === 1 ? 'st' : 'nd'} place)`,
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
