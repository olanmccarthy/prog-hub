/**
 * Utility functions for loser prizing automation
 */

import { prisma } from '@lib/prisma';

/**
 * Update a player's wallet and create a transaction record
 * Returns the actual amount changed (may be less than requested if it would cause negative balance)
 */
export async function updateWallet(
  playerId: number,
  amount: number,
  sessionId: number | null,
  description: string
): Promise<number> {
  // Get current wallet balance
  const existingWallet = await prisma.wallet.findUnique({
    where: { playerId },
  });

  let actualAmount = amount;

  // If deducting points, ensure we don't go below 0
  if (amount < 0) {
    const currentBalance = existingWallet?.amount || 0;
    const wouldResultIn = currentBalance + amount;

    if (wouldResultIn < 0) {
      // Cap the deduction to not go below 0
      actualAmount = -currentBalance;
    }
  }

  const wallet = await prisma.wallet.upsert({
    where: { playerId },
    update: {
      amount: { increment: actualAmount },
    },
    create: {
      playerId,
      amount: Math.max(0, actualAmount), // Don't create with negative balance
    },
  });

  // Only create transaction if actual amount changed
  if (actualAmount !== 0) {
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        sessionId,
        amount: actualAmount,
        type: 'LOSER_PRIZING',
        description,
      },
    });
  }

  return actualAmount;
}

/**
 * Get the session when a player last placed 1st
 * Returns null if the player has never won
 */
export async function getLastWinSession(playerId: number): Promise<number | null> {
  const lastWinSession = await prisma.session.findFirst({
    where: {
      OR: [{ first: playerId }],
    },
    orderBy: { number: 'desc' },
  });

  return lastWinSession ? lastWinSession.number : null;
}

/**
 * Calculate sessions since last win for "Remember the good ol' days?"
 */
export async function calculateSessionsSinceLastWin(
  playerId: number,
  currentSessionNumber: number
): Promise<number> {
  const lastWinSessionNumber = await getLastWinSession(playerId);

  if (!lastWinSessionNumber) {
    // Never won, use current session number
    return currentSessionNumber;
  }

  return currentSessionNumber - lastWinSessionNumber;
}

/**
 * Get all opponents who beat this player in a session
 */
export async function getOpponentsWhoBeat(
  playerId: number,
  sessionId: number
): Promise<number[]> {
  const pairings = await prisma.pairing.findMany({
    where: {
      sessionId,
      OR: [
        { player1Id: playerId, player2wins: { gte: 2 } },
        { player2Id: playerId, player1wins: { gte: 2 } },
      ],
    },
  });

  return pairings.map((p) => (p.player1Id === playerId ? p.player2Id : p.player1Id));
}

/**
 * Get all opponents this player beat in a session
 */
export async function getOpponentsPlayerBeat(
  playerId: number,
  sessionId: number
): Promise<number[]> {
  const pairings = await prisma.pairing.findMany({
    where: {
      sessionId,
      OR: [
        { player1Id: playerId, player1wins: { gte: 2 } },
        { player2Id: playerId, player2wins: { gte: 2 } },
      ],
    },
  });

  return pairings.map((p) => (p.player1Id === playerId ? p.player2Id : p.player1Id));
}

/**
 * Apply session modifier to next session
 */
export async function applySessionModifier(
  currentSessionId: number,
  playerId: number,
  modifierType: string,
  targetPlayerId?: number,
  investmentAmount?: number
): Promise<void> {
  // Get next session
  const currentSession = await prisma.session.findUnique({
    where: { id: currentSessionId },
  });

  if (!currentSession) {
    throw new Error('Current session not found');
  }

  const nextSession = await prisma.session.findFirst({
    where: { number: { gt: currentSession.number } },
    orderBy: { number: 'asc' },
  });

  if (!nextSession) {
    throw new Error('No next session found');
  }

  // Get or create session modifiers
  let modifiers = await prisma.sessionModifier.findUnique({
    where: { sessionId: nextSession.id },
  });

  if (!modifiers) {
    modifiers = await prisma.sessionModifier.create({
      data: { sessionId: nextSession.id },
    });
  }

  // Apply specific modifier
  const updates: Record<string, boolean | number | null> = {
    loserPrizingPlayerId: playerId,
  };

  switch (modifierType) {
    case 'DOUBLE_POINTS':
      updates.loserPrizingDoublePoints = true;
      break;
    case 'HALF_PRICE_SHOP':
      updates.loserPrizingHalfPriceShop = true;
      break;
    case 'TAKE_VP_AND_WALLET':
      updates.loserPrizingTakeVpAndWallet = true;
      break;
    case 'ALL_WINS_TWO_ZEROS':
      updates.loserPrizingAllWinsTwoZeros = true;
      break;
    case 'SHARED_POINTS':
      updates.loserPrizingSharedPoints = true;
      updates.loserPrizingTargetPlayerId = targetPlayerId ?? null;
      break;
    case 'INVESTMENT':
      updates.loserPrizingInvestment = investmentAmount ?? 0;
      break;
  }

  await prisma.sessionModifier.update({
    where: { sessionId: nextSession.id },
    data: updates,
  });
}

/**
 * Steal wallet points from a single player and give them to the beneficiary
 * Returns the actual amounts stolen and gained (respects balance protection)
 */
export async function stealFromPlayer(
  victimId: number,
  beneficiaryId: number,
  amount: number,
  sessionId: number,
  entryName: string
): Promise<{ stolen: number; gained: number }> {
  const stolenAmount = await updateWallet(
    victimId,
    -amount,
    sessionId,
    `Loser Prizing: ${entryName} (stolen)`
  );
  const gainedAmount = await updateWallet(
    beneficiaryId,
    Math.abs(stolenAmount),
    sessionId,
    `Loser Prizing: ${entryName}`
  );

  return {
    stolen: Math.abs(stolenAmount),
    gained: gainedAmount,
  };
}

/**
 * Steal wallet points from multiple players and give the total to the beneficiary
 * Returns the total stolen, total gained, and number of victims
 */
export async function stealFromPlayers(
  victimIds: number[],
  beneficiaryId: number,
  amountPerVictim: number,
  sessionId: number,
  entryName: string
): Promise<{ totalStolen: number; gained: number; victimCount: number }> {
  let totalStolen = 0;

  for (const victimId of victimIds) {
    const stolen = await updateWallet(
      victimId,
      -amountPerVictim,
      sessionId,
      `Loser Prizing: ${entryName} (stolen)`
    );
    totalStolen += Math.abs(stolen);
  }

  const gained = await updateWallet(
    beneficiaryId,
    totalStolen,
    sessionId,
    `Loser Prizing: ${entryName}`
  );

  return {
    totalStolen,
    gained,
    victimCount: victimIds.length,
  };
}
