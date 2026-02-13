"use server";

import { prisma } from "@lib/prisma";
import { getCurrentUser } from "@lib/auth";
import { revalidatePath } from "next/cache";

// ============================================================================
// FACTOR CALCULATION HELPERS
// ============================================================================

/**
 * Calculate Recent Placement Average (33% weight)
 * Returns 0-100 score based on average placement in last 5 sessions
 */
async function calculateRecentPlacement(
  playerId: number,
  currentSessionId: number
): Promise<number> {
  const sessions = await prisma.session.findMany({
    where: {
      id: { lt: currentSessionId },
      complete: true,
    },
    orderBy: { id: "desc" },
    take: 5,
  });

  if (sessions.length === 0) return 50; // No history

  const placements: number[] = [];
  for (const session of sessions) {
    let placement = 7; // Default to last if not found
    if (session.first === playerId) placement = 1;
    else if (session.second === playerId) placement = 2;
    else if (session.third === playerId) placement = 3;
    else if (session.fourth === playerId) placement = 4;
    else if (session.fifth === playerId) placement = 5;
    else if (session.sixth === playerId) placement = 6;

    placements.push(placement);
  }

  // Apply exponential decay weighting (most recent = highest weight)
  let weightedSum = 0;
  let weightSum = 0;
  for (let i = 0; i < placements.length; i++) {
    const weight = Math.pow(0.7, i); // Decay factor
    weightedSum += placements[i] * weight;
    weightSum += weight;
  }

  const avgPlacement = weightedSum / weightSum;

  // Convert to 0-100 score (lower placement = higher score)
  // 1st place = 100, 3rd place = 50, 6th place = 0
  return Math.max(0, 100 - ((avgPlacement - 1) * 20));
}

/**
 * Calculate Match Win Rate (23% weight)
 * Returns 0-100 score based on overall match win percentage
 */
async function calculateMatchWinRate(
  playerId: number,
  currentSessionId: number
): Promise<number> {
  const pairings = await prisma.pairing.findMany({
    where: {
      sessionId: { lt: currentSessionId },
      OR: [{ player1Id: playerId }, { player2Id: playerId }],
    },
  });

  if (pairings.length === 0) return 50; // No history

  let totalWins = 0;
  let totalMatches = 0;

  for (const pairing of pairings) {
    if (pairing.player1Id === playerId) {
      totalWins += pairing.player1wins;
      totalMatches += pairing.player1wins + pairing.player2wins;
    } else {
      totalWins += pairing.player2wins;
      totalMatches += pairing.player1wins + pairing.player2wins;
    }
  }

  if (totalMatches === 0) return 50;

  const winRate = totalWins / totalMatches;
  return winRate * 100; // 0-100%
}

/**
 * Calculate Shop Spending Pattern (12% weight)
 * Returns 0-100 score based on recent spending, timing, and net position
 */
async function calculateSpendingPattern(
  playerId: number,
  currentSessionId: number
): Promise<number> {
  // 1. Recent Spending Score (40%)
  const last3Sessions = [
    currentSessionId - 1,
    currentSessionId - 2,
    currentSessionId - 3,
  ];

  const recentSpending = await prisma.walletTransaction.findMany({
    where: {
      wallet: { playerId },
      type: "SHOP_PURCHASE",
      sessionId: { in: last3Sessions },
    },
  });

  const totalSpent = Math.abs(
    recentSpending.reduce((sum, t) => sum + t.amount, 0)
  );
  const avgSpendingLast3 = totalSpent / 3;
  const recentSpendingScore = Math.min(100, (avgSpendingLast3 / 20) * 100);

  // 2. Spending Timing Score (30%)
  const lastSessionPurchases = await prisma.walletTransaction.findMany({
    where: {
      wallet: { playerId },
      type: "SHOP_PURCHASE",
      sessionId: currentSessionId - 1,
    },
  });

  const timingScore = lastSessionPurchases.length > 0 ? 70 : 30;

  // 3. Net Position Score (30%)
  const fiveSessionsAgo = currentSessionId - 5;
  const allTransactions = await prisma.walletTransaction.findMany({
    where: {
      wallet: { playerId },
      sessionId: { gte: fiveSessionsAgo, lt: currentSessionId },
    },
  });

  const netChange = allTransactions.reduce((sum, t) => sum + t.amount, 0);
  const netPositionScore = Math.max(0, Math.min(100, 50 + netChange * 2));

  // Combine with weights
  return (
    recentSpendingScore * 0.4 + timingScore * 0.3 + netPositionScore * 0.3
  );
}

/**
 * Calculate Deck Adaptation Score (12% weight)
 * Returns 0-100 score based on change rate, uniqueness, and banlist adaptation
 */
async function calculateDeckAdaptation(
  playerId: number,
  currentSessionId: number
): Promise<number> {
  // 1. Change Rate Score (40%)
  const changeRateScore = await calculateChangeRate(playerId, currentSessionId);

  // 2. Deck Uniqueness Score (35%)
  const uniquenessScore = await calculateDeckUniqueness(
    playerId,
    currentSessionId
  );

  // 3. Banlist Adaptation Score (25%)
  const banlistAdaptationScore = await calculateBanlistAdaptation(
    playerId,
    currentSessionId
  );

  return (
    changeRateScore * 0.4 +
    uniquenessScore * 0.35 +
    banlistAdaptationScore * 0.25
  );
}

/**
 * Helper: Calculate Change Rate
 */
async function calculateChangeRate(
  playerId: number,
  currentSessionId: number
): Promise<number> {
  const lastSession = currentSessionId - 1;
  const decklists = await prisma.decklist.findMany({
    where: {
      playerId,
      sessionId: { gte: lastSession - 2, lte: lastSession },
    },
    orderBy: { sessionId: "asc" },
  });

  if (decklists.length < 2) return 50; // Not enough history

  const changes: number[] = [];
  for (let i = 1; i < decklists.length; i++) {
    const prev = JSON.parse(decklists[i - 1].maindeck as string) as number[];
    const curr = JSON.parse(decklists[i].maindeck as string) as number[];

    const prevSet = new Set(prev);
    const currSet = new Set(curr);

    const added = curr.filter((id) => !prevSet.has(id)).length;
    const removed = prev.filter((id) => !currSet.has(id)).length;
    const totalChanged = added + removed;

    changes.push(totalChanged);
  }

  const avgChange =
    changes.reduce((sum, c) => sum + c, 0) / changes.length;

  // Optimal change: 5-10 cards per session
  if (avgChange === 0) return 30;
  if (avgChange >= 5 && avgChange <= 10) return 100;
  if (avgChange < 5) return 30 + avgChange * 14;
  return Math.max(40, 100 - (avgChange - 10) * 6);
}

/**
 * Helper: Calculate Deck Uniqueness
 */
async function calculateDeckUniqueness(
  playerId: number,
  sessionId: number
): Promise<number> {
  const playerDeck = await prisma.decklist.findFirst({
    where: { playerId, sessionId: sessionId - 1 },
  });

  if (!playerDeck) return 50;

  const otherDecks = await prisma.decklist.findMany({
    where: {
      sessionId: sessionId - 1,
      playerId: { not: playerId },
    },
  });

  if (otherDecks.length === 0) return 50;

  const playerCards = new Set(
    JSON.parse(playerDeck.maindeck as string) as number[]
  );

  const overlaps: number[] = [];
  for (const otherDeck of otherDecks) {
    const otherCards = new Set(
      JSON.parse(otherDeck.maindeck as string) as number[]
    );

    const shared = [...playerCards].filter((id) => otherCards.has(id)).length;
    const overlapPercent = (shared / playerCards.size) * 100;

    overlaps.push(overlapPercent);
  }

  const avgOverlap =
    overlaps.reduce((sum, o) => sum + o, 0) / overlaps.length;

  return Math.max(0, 100 - avgOverlap);
}

/**
 * Helper: Calculate Banlist Adaptation (Current Vulnerability + Historical Resilience)
 */
async function calculateBanlistAdaptation(
  playerId: number,
  currentSessionId: number
): Promise<number> {
  const vulnerabilityScore = await calculateCurrentVulnerability(
    playerId,
    currentSessionId
  );
  const resilienceScore = await calculateHistoricalResilience(
    playerId,
    currentSessionId
  );

  return vulnerabilityScore * 0.6 + resilienceScore * 0.4;
}

/**
 * Helper: Calculate Current Vulnerability
 */
async function calculateCurrentVulnerability(
  playerId: number,
  currentSessionId: number
): Promise<number> {
  const prevBanlist = await prisma.banlist.findFirst({
    where: { sessionId: currentSessionId - 1 },
  });

  const currBanlist = await prisma.banlist.findFirst({
    where: { sessionId: currentSessionId },
  });

  if (!prevBanlist || !currBanlist) return 50;

  const currentDeck = await prisma.decklist.findFirst({
    where: { playerId, sessionId: currentSessionId },
  });

  if (!currentDeck) return 50;

  const deckCards = JSON.parse(currentDeck.maindeck as string) as number[];

  const prevBanned = new Set(
    JSON.parse(prevBanlist.banned as string) as number[]
  );
  const currBanned = new Set(
    JSON.parse(currBanlist.banned as string) as number[]
  );
  const newlyBanned = [...currBanned].filter((id) => !prevBanned.has(id));

  const prevLimited = new Set(
    JSON.parse(prevBanlist.limited as string) as number[]
  );
  const currLimited = new Set(
    JSON.parse(currBanlist.limited as string) as number[]
  );
  const newlyLimited = [...currLimited].filter((id) => !prevLimited.has(id));

  const prevSemiLimited = new Set(
    JSON.parse(prevBanlist.semilimited as string) as number[]
  );
  const currSemiLimited = new Set(
    JSON.parse(currBanlist.semilimited as string) as number[]
  );
  const newlySemiLimited = [...currSemiLimited].filter(
    (id) => !prevSemiLimited.has(id)
  );

  let hitSeverity = 0;

  const bannedInDeck = newlyBanned.filter((id) => deckCards.includes(id))
    .length;
  hitSeverity += bannedInDeck * 30;

  const limitedInDeck = newlyLimited.filter((id) => deckCards.includes(id))
    .length;
  hitSeverity += limitedInDeck * 15;

  const semiLimitedInDeck = newlySemiLimited.filter((id) =>
    deckCards.includes(id)
  ).length;
  hitSeverity += semiLimitedInDeck * 8;

  return Math.max(10, 100 - hitSeverity);
}

/**
 * Helper: Calculate Historical Resilience
 */
async function calculateHistoricalResilience(
  playerId: number,
  currentSessionId: number
): Promise<number> {
  const resilienceEvents: { placement: number }[] = [];

  for (let i = 1; i <= 5; i++) {
    const sessionId = currentSessionId - i;
    if (sessionId < 1) break;

    const prevBanlist = await prisma.banlist.findFirst({
      where: { sessionId: sessionId - 1 },
    });

    const currBanlist = await prisma.banlist.findFirst({
      where: { sessionId: sessionId },
    });

    const deck = await prisma.decklist.findFirst({
      where: { playerId, sessionId },
    });

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!prevBanlist || !currBanlist || !deck || !session) continue;

    const deckCards = JSON.parse(deck.maindeck as string) as number[];

    const prevBanned = new Set(
      JSON.parse(prevBanlist.banned as string) as number[]
    );
    const currBanned = new Set(
      JSON.parse(currBanlist.banned as string) as number[]
    );
    const newlyBanned = [...currBanned].filter((id) => !prevBanned.has(id));

    const prevLimited = new Set(
      JSON.parse(prevBanlist.limited as string) as number[]
    );
    const currLimited = new Set(
      JSON.parse(currBanlist.limited as string) as number[]
    );
    const newlyLimited = [...currLimited].filter((id) => !prevLimited.has(id));

    const wasHitHard =
      newlyBanned.some((id) => deckCards.includes(id)) ||
      newlyLimited.filter((id) => deckCards.includes(id)).length >= 2;

    if (wasHitHard) {
      let placement = 7;
      if (session.first === playerId) placement = 1;
      else if (session.second === playerId) placement = 2;
      else if (session.third === playerId) placement = 3;
      else if (session.fourth === playerId) placement = 4;
      else if (session.fifth === playerId) placement = 5;
      else if (session.sixth === playerId) placement = 6;

      resilienceEvents.push({ placement });
    }
  }

  if (resilienceEvents.length === 0) return 50;

  const avgPlacement =
    resilienceEvents.reduce((sum, e) => sum + e.placement, 0) /
    resilienceEvents.length;

  return Math.max(0, 100 - (avgPlacement - 1) * 20);
}

/**
 * Calculate Placement Consistency (13% weight)
 * Returns 0-100 score based on inverse of placement standard deviation
 */
async function calculatePlacementConsistency(
  playerId: number,
  currentSessionId: number
): Promise<number> {
  const sessions = await prisma.session.findMany({
    where: {
      id: { lt: currentSessionId },
      complete: true,
    },
    orderBy: { id: "desc" },
    take: 5,
  });

  if (sessions.length < 2) return 50;

  const placements: number[] = [];
  for (const session of sessions) {
    let placement = 7;
    if (session.first === playerId) placement = 1;
    else if (session.second === playerId) placement = 2;
    else if (session.third === playerId) placement = 3;
    else if (session.fourth === playerId) placement = 4;
    else if (session.fifth === playerId) placement = 5;
    else if (session.sixth === playerId) placement = 6;

    placements.push(placement);
  }

  const mean =
    placements.reduce((sum, p) => sum + p, 0) / placements.length;
  const variance =
    placements.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) /
    placements.length;
  const stdDev = Math.sqrt(variance);

  // Lower std dev = more consistent = higher score
  // 0 std dev = 100, 2+ std dev = 0
  return Math.max(0, 100 - stdDev * 50);
}

/**
 * Calculate 2-0 Win Rate (7% weight)
 * Returns 0-100 score based on percentage of wins that are 2-0
 */
async function calculateTwoZeroRate(
  playerId: number,
  currentSessionId: number
): Promise<number> {
  const pairings = await prisma.pairing.findMany({
    where: {
      sessionId: { lt: currentSessionId },
      OR: [{ player1Id: playerId }, { player2Id: playerId }],
    },
  });

  if (pairings.length === 0) return 50;

  let totalWins = 0;
  let twoZeroWins = 0;

  for (const pairing of pairings) {
    if (pairing.player1Id === playerId && pairing.player1wins === 2) {
      totalWins++;
      if (pairing.player2wins === 0) twoZeroWins++;
    } else if (pairing.player2Id === playerId && pairing.player2wins === 2) {
      totalWins++;
      if (pairing.player1wins === 0) twoZeroWins++;
    }
  }

  if (totalWins === 0) return 50;

  const twoZeroRate = twoZeroWins / totalWins;
  return twoZeroRate * 100;
}

// ============================================================================
// MAIN ODDS CALCULATION
// ============================================================================

/**
 * Calculate betting odds for all players in a session
 * Returns Map of playerId -> odds multiplier (1.2x to 5.0x)
 */
export async function calculateBettingOdds(
  sessionId: number
): Promise<Map<number, number>> {
  // Get all players with decklists for this session
  const decklists = await prisma.decklist.findMany({
    where: { sessionId },
    select: { playerId: true },
  });

  const playerIds = [...new Set(decklists.map((d) => d.playerId))];

  // Calculate scores for each player
  const playerScores = new Map<number, number>();

  for (const playerId of playerIds) {
    // Calculate 6 factors
    const [
      recentPlacement,
      matchWinRate,
      spendingPattern,
      deckAdaptation,
      consistency,
      twoZeroRate,
    ] = await Promise.all([
      calculateRecentPlacement(playerId, sessionId),
      calculateMatchWinRate(playerId, sessionId),
      calculateSpendingPattern(playerId, sessionId),
      calculateDeckAdaptation(playerId, sessionId),
      calculatePlacementConsistency(playerId, sessionId),
      calculateTwoZeroRate(playerId, sessionId),
    ]);

    // Calculate weighted score
    let weightedScore =
      recentPlacement * 0.33 +
      matchWinRate * 0.23 +
      spendingPattern * 0.12 +
      deckAdaptation * 0.12 +
      consistency * 0.13 +
      twoZeroRate * 0.07;

    // Apply moderator bonus
    const lastSession = await prisma.session.findFirst({
      where: { id: sessionId - 1 },
    });

    if (lastSession?.moderatorId === playerId) {
      weightedScore += 5; // +5 point flat bonus
    }

    // Cap at 100
    weightedScore = Math.min(100, weightedScore);

    playerScores.set(playerId, weightedScore);
  }

  // Normalize scores to odds (inverse relationship)
  const scores = Array.from(playerScores.values());
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  const playerOdds = new Map<number, number>();

  for (const [playerId, score] of playerScores.entries()) {
    const normalized = (score - minScore) / (maxScore - minScore || 1);
    const oddsMultiplier = 1.2 + (1 - normalized) * 3.8;

    playerOdds.set(playerId, Math.round(oddsMultiplier * 100) / 100);
  }

  return playerOdds;
}

// ============================================================================
// BETTING STATUS CHECKS
// ============================================================================

/**
 * Check if all players have made their betting decisions (bet or skip)
 */
export async function checkAllBettingDecisions(
  sessionId: number
): Promise<{ allDecided: boolean; decided: number; total: number }> {
  try {
    // Get total number of players
    const totalPlayers = await prisma.player.count();

    // Get number of betting decisions made
    const decidedCount = await prisma.playerBet.count({
      where: { sessionId },
    });

    return {
      allDecided: decidedCount >= totalPlayers,
      decided: decidedCount,
      total: totalPlayers,
    };
  } catch (error) {
    console.error("Error checking betting decisions:", error);
    return {
      allDecided: false,
      decided: 0,
      total: 0,
    };
  }
}

// ============================================================================
// BETTING ACTIONS
// ============================================================================

type BettingStatusResult =
  | {
      success: true;
      gamblingEnabled: boolean;
      canBet: boolean;
      players?: Array<{ id: number; name: string; odds: number }>;
      currentBet?: {
        targetPlayerId: number;
        targetPlayerName: string;
        betAmount: number;
        odds: number;
        potentialPayout: number;
        status: string;
        actualPayout?: number;
      };
      maxBet?: number;
      bettingWindowOpen?: boolean;
    }
  | { success: false; error: string };

/**
 * Get betting status for current session
 */
export async function getBettingStatus(): Promise<BettingStatusResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get active session
    const session = await prisma.session.findFirst({
      where: { active: true },
      include: { modifiers: true },
    });

    if (!session) {
      return {
        success: true,
        gamblingEnabled: false,
        canBet: false,
      };
    }

    // Check if gambling is enabled
    const gamblingEnabled = session.modifiers?.gamblingEnabled ?? false;

    if (!gamblingEnabled) {
      return {
        success: true,
        gamblingEnabled: false,
        canBet: false,
      };
    }

    // Check if betting window is open (after event wheel, before pairings)
    const hasPairings = await prisma.pairing.findFirst({
      where: { sessionId: session.id },
    });

    const bettingWindowOpen = session.eventWheelSpun && !hasPairings;

    // Check if user already has a bet
    const existingBet = await prisma.playerBet.findUnique({
      where: {
        sessionId_bettorId: {
          sessionId: session.id,
          bettorId: user.playerId,
        },
      },
      include: {
        targetPlayer: true,
      },
    });

    if (existingBet) {
      return {
        success: true,
        gamblingEnabled: true,
        canBet: false,
        currentBet: {
          targetPlayerId: existingBet.targetPlayerId,
          targetPlayerName: existingBet.targetPlayer.name,
          betAmount: existingBet.betAmount,
          odds: existingBet.odds,
          potentialPayout: Math.floor(existingBet.betAmount * existingBet.odds),
          status: existingBet.status,
          actualPayout: existingBet.payout ?? undefined,
        },
      };
    }

    // If betting window is closed, don't return players
    if (!bettingWindowOpen) {
      return {
        success: true,
        gamblingEnabled: true,
        canBet: false,
        bettingWindowOpen: false,
      };
    }

    // Get player's wallet balance
    const wallet = await prisma.wallet.findUnique({
      where: { playerId: user.playerId },
    });

    const maxBet = Math.min(8, wallet?.amount ?? 0);

    if (maxBet < 1) {
      return {
        success: true,
        gamblingEnabled: true,
        canBet: false,
        maxBet: 0,
        bettingWindowOpen: true,
      };
    }

    // Calculate odds for all players
    const odds = await calculateBettingOdds(session.id);

    // Get player names
    const players = await prisma.player.findMany({
      where: { id: { in: Array.from(odds.keys()) } },
      select: { id: true, name: true },
    });

    const playersWithOdds = players.map((p) => ({
      id: p.id,
      name: p.name,
      odds: odds.get(p.id) ?? 3.0,
    }));

    return {
      success: true,
      gamblingEnabled: true,
      canBet: true,
      players: playersWithOdds,
      maxBet,
      bettingWindowOpen: true,
    };
  } catch (error) {
    console.error("Error getting betting status:", error);
    return { success: false, error: "Failed to get betting status" };
  }
}

type PlaceBetResult =
  | { success: true; message: string }
  | { success: false; error: string };

/**
 * Skip betting for this session
 */
export async function skipBetting(): Promise<PlaceBetResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get active session
    const session = await prisma.session.findFirst({
      where: { active: true },
      include: { modifiers: true },
    });

    if (!session) {
      return { success: false, error: "No active session" };
    }

    // Check if gambling is enabled
    if (!session.modifiers?.gamblingEnabled) {
      return { success: false, error: "Gambling is not enabled" };
    }

    // Check betting window
    const hasPairings = await prisma.pairing.findFirst({
      where: { sessionId: session.id },
    });

    if (!session.eventWheelSpun || hasPairings) {
      return { success: false, error: "Betting window is closed" };
    }

    // Create a "skipped" bet record
    await prisma.playerBet.create({
      data: {
        sessionId: session.id,
        bettorId: user.playerId,
        targetPlayerId: user.playerId, // Bet on self with 0 amount = skip
        betAmount: 0,
        odds: 0,
        status: "void", // Use "void" status for skipped bets
      },
    });

    revalidatePath("/play/betting");
    return {
      success: true,
      message: "You have chosen to skip betting for this session",
    };
  } catch (error: unknown) {
    console.error("Error skipping bet:", error);

    if (error && typeof error === 'object' && 'code' in error && error.code === "P2002") {
      return { success: false, error: "You have already made a betting decision" };
    }

    return { success: false, error: "Failed to skip betting" };
  }
}

/**
 * Place a bet on a player
 */
export async function placeBet(
  targetPlayerId: number,
  betAmount: number
): Promise<PlaceBetResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate bet amount
    if (betAmount < 1 || betAmount > 8) {
      return { success: false, error: "Bet amount must be between 1 and 8" };
    }

    // Get active session
    const session = await prisma.session.findFirst({
      where: { active: true },
      include: { modifiers: true },
    });

    if (!session) {
      return { success: false, error: "No active session" };
    }

    // Check if gambling is enabled
    if (!session.modifiers?.gamblingEnabled) {
      return { success: false, error: "Gambling is not enabled" };
    }

    // Check betting window (after event wheel, before pairings)
    const hasPairings = await prisma.pairing.findFirst({
      where: { sessionId: session.id },
    });

    if (!session.eventWheelSpun || hasPairings) {
      return { success: false, error: "Betting window is closed" };
    }

    // Check wallet balance
    const wallet = await prisma.wallet.findUnique({
      where: { playerId: user.playerId },
    });

    if (!wallet || wallet.amount < betAmount) {
      return { success: false, error: "Insufficient wallet balance" };
    }

    // Calculate odds
    const odds = await calculateBettingOdds(session.id);
    const playerOdds = odds.get(targetPlayerId);

    if (!playerOdds) {
      return { success: false, error: "Invalid target player" };
    }

    // Create bet and deduct from wallet in a transaction
    await prisma.$transaction(async (tx) => {
      // Deduct from wallet
      await tx.wallet.update({
        where: { playerId: user.playerId },
        data: { amount: { decrement: betAmount } },
      });

      // Create transaction record
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          sessionId: session.id,
          amount: -betAmount,
          type: "GAMBLING_BET",
          description: `Bet ${betAmount} on player ${targetPlayerId}`,
        },
      });

      // Create bet record
      await tx.playerBet.create({
        data: {
          sessionId: session.id,
          bettorId: user.playerId,
          targetPlayerId,
          betAmount,
          odds: playerOdds,
          status: "pending",
        },
      });
    });

    revalidatePath("/play/betting");
    return {
      success: true,
      message: `Bet placed successfully! ${betAmount} points on player ${targetPlayerId} at ${playerOdds}x odds`,
    };
  } catch (error: unknown) {
    console.error("Error placing bet:", error);

    // Check for unique constraint violation
    if (error && typeof error === 'object' && 'code' in error && error.code === "P2002") {
      return { success: false, error: "You have already placed a bet" };
    }

    return { success: false, error: "Failed to place bet" };
  }
}

type ResolveBetsResult =
  | { success: true; message: string; betsResolved: number }
  | { success: false; error: string };

/**
 * Resolve all bets for a session (called from finalizeStandings)
 */
export async function resolveBets(
  sessionId: number
): Promise<ResolveBetsResult> {
  try {
    // Get session with winner
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.first) {
      return { success: false, error: "Session or winner not found" };
    }

    const winnerId = session.first;

    // Get all pending bets for this session
    const bets = await prisma.playerBet.findMany({
      where: {
        sessionId,
        status: "pending",
      },
      include: {
        bettor: { select: { id: true, name: true } },
      },
    });

    let betsResolved = 0;

    // Resolve each bet
    for (const bet of bets) {
      const won = bet.targetPlayerId === winnerId;
      const payout = won ? Math.floor(bet.betAmount * bet.odds) : 0;

      await prisma.$transaction(async (tx) => {
        // Update bet status
        await tx.playerBet.update({
          where: { id: bet.id },
          data: {
            status: won ? "won" : "lost",
            payout,
          },
        });

        // If won, credit wallet
        if (won && payout > 0) {
          const wallet = await tx.wallet.findUnique({
            where: { playerId: bet.bettorId },
          });

          if (wallet) {
            await tx.wallet.update({
              where: { playerId: bet.bettorId },
              data: { amount: { increment: payout } },
            });

            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                sessionId,
                amount: payout,
                type: "GAMBLING_PAYOUT",
                description: `Won bet on player ${bet.targetPlayerId}`,
              },
            });
          }
        }
      });

      betsResolved++;
    }

    revalidatePath("/play/betting");
    return {
      success: true,
      message: `Resolved ${betsResolved} bets`,
      betsResolved,
    };
  } catch (error) {
    console.error("Error resolving bets:", error);
    return { success: false, error: "Failed to resolve bets" };
  }
}
