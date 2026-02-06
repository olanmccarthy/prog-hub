/**
 * Common query functions for stats calculations
 * Reusable database queries to avoid code duplication
 */

import { prisma } from "@lib/prisma";
import { Decklist, Pairing, Prisma } from "@prisma/client";

// ============================================================================
// SESSION QUERIES
// ============================================================================

/**
 * Get all completed sessions
 */
export async function getCompletedSessions() {
  return await prisma.session.findMany({
    where: { complete: true },
    orderBy: { number: "asc" },
  });
}

/**
 * Get the active session
 */
export async function getActiveSession() {
  return await prisma.session.findFirst({
    where: { active: true },
  });
}

/**
 * Get a specific session by ID
 */
export async function getSessionById(sessionId: number) {
  return await prisma.session.findUnique({
    where: { id: sessionId },
  });
}

// ============================================================================
// PLACEMENT QUERIES
// ============================================================================

/**
 * Get placement for a player in a specific session
 * Returns 1-6 for placed players, null if not placed
 */
export async function getPlayerPlacement(
  playerId: number,
  sessionId: number
): Promise<number | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { first: true, second: true, third: true, fourth: true, fifth: true, sixth: true },
  });

  if (!session) return null;

  if (session.first === playerId) return 1;
  if (session.second === playerId) return 2;
  if (session.third === playerId) return 3;
  if (session.fourth === playerId) return 4;
  if (session.fifth === playerId) return 5;
  if (session.sixth === playerId) return 6;

  return null;
}

/**
 * Get all placements for a player across all completed sessions
 * Returns array of { sessionId, placement } where placement is 1-6
 */
export async function getAllPlacementsForPlayer(playerId: number) {
  const sessions = await prisma.session.findMany({
    where: { complete: true },
    select: { id: true, first: true, second: true, third: true, fourth: true, fifth: true, sixth: true },
  });

  const placements: { sessionId: number; placement: number }[] = [];

  for (const session of sessions) {
    let placement: number | null = null;

    if (session.first === playerId) placement = 1;
    else if (session.second === playerId) placement = 2;
    else if (session.third === playerId) placement = 3;
    else if (session.fourth === playerId) placement = 4;
    else if (session.fifth === playerId) placement = 5;
    else if (session.sixth === playerId) placement = 6;

    if (placement !== null) {
      placements.push({ sessionId: session.id, placement });
    }
  }

  return placements;
}

/**
 * Get player IDs in a specific placement range for a session
 * @param sessionId - Session ID
 * @param min - Minimum placement (1-6)
 * @param max - Maximum placement (1-6)
 */
export async function getPlayersInPlacementRange(
  sessionId: number,
  min: number,
  max: number
): Promise<number[]> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { first: true, second: true, third: true, fourth: true, fifth: true, sixth: true },
  });

  if (!session) return [];

  const placements = [
    session.first,
    session.second,
    session.third,
    session.fourth,
    session.fifth,
    session.sixth,
  ];

  const playerIds: number[] = [];
  for (let i = min - 1; i < max && i < placements.length; i++) {
    if (placements[i] !== null) {
      playerIds.push(placements[i]!);
    }
  }

  return playerIds;
}

// ============================================================================
// PAIRING QUERIES
// ============================================================================

/**
 * Get all pairings for a specific player
 * Optionally filter by session
 */
export async function getPairingsForPlayer(playerId: number, sessionId?: number) {
  const where: Prisma.PairingWhereInput = {
    OR: [{ player1Id: playerId }, { player2Id: playerId }],
  };

  if (sessionId !== undefined) {
    where.sessionId = sessionId;
  }

  return await prisma.pairing.findMany({
    where,
    orderBy: [{ sessionId: "asc" }, { round: "asc" }],
  });
}

/**
 * Get all pairings for a specific session
 */
export async function getPairingsForSession(sessionId: number) {
  return await prisma.pairing.findMany({
    where: { sessionId },
    orderBy: { round: "asc" },
  });
}

/**
 * Get match result for a specific player in a pairing
 * Returns 'win' | 'loss' | 'draw'
 */
export function getMatchResult(pairing: Pairing, playerId: number): "win" | "loss" | "draw" {
  const isPlayer1 = pairing.player1Id === playerId;
  const playerWins = isPlayer1 ? pairing.player1wins : pairing.player2wins;
  const opponentWins = isPlayer1 ? pairing.player2wins : pairing.player1wins;

  if (playerWins > opponentWins) return "win";
  if (playerWins < opponentWins) return "loss";
  return "draw";
}

/**
 * Calculate total wins, losses, and draws for a player
 */
export async function getMatchRecord(playerId: number, sessionId?: number) {
  const pairings = await getPairingsForPlayer(playerId, sessionId);

  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (const pairing of pairings) {
    const result = getMatchResult(pairing, playerId);
    if (result === "win") wins++;
    else if (result === "loss") losses++;
    else draws++;
  }

  return { wins, losses, draws };
}

// ============================================================================
// DECKLIST QUERIES
// ============================================================================

/**
 * Get all decklists for a specific session
 * Optionally filter by placement range
 */
export async function getDecklistsForSession(
  sessionId: number,
  placementFilter?: { min: number; max: number }
) {
  let playerIds: number[] | undefined;

  if (placementFilter) {
    playerIds = await getPlayersInPlacementRange(sessionId, placementFilter.min, placementFilter.max);
  }

  const where: Prisma.DecklistWhereInput = { sessionId };
  if (playerIds && playerIds.length > 0) {
    where.playerId = { in: playerIds };
  }

  return await prisma.decklist.findMany({
    where,
    include: { player: true },
  });
}

/**
 * Get decklist for a specific player in a specific session
 */
export async function getDecklistForPlayer(playerId: number, sessionId: number) {
  return await prisma.decklist.findFirst({
    where: { playerId, sessionId },
  });
}

/**
 * Parse all card IDs from a decklist (maindeck + extradeck)
 * Returns array of card IDs as numbers
 */
export function parseCardIds(decklist: Decklist): number[] {
  const maindeck = Array.isArray(decklist.maindeck)
    ? decklist.maindeck
    : JSON.parse(decklist.maindeck as string);
  const extradeck = Array.isArray(decklist.extradeck)
    ? decklist.extradeck
    : JSON.parse(decklist.extradeck as string);

  return [...maindeck, ...extradeck].map((id) => (typeof id === "number" ? id : parseInt(id, 10)));
}

// ============================================================================
// WALLET QUERIES
// ============================================================================

/**
 * Get all wallet transactions for a player
 * Optionally filter by transaction type
 */
export async function getWalletTransactionsForPlayer(playerId: number, type?: string) {
  const wallet = await prisma.wallet.findUnique({
    where: { playerId },
    include: {
      walletTransactions: type
        ? {
            where: { type },
            orderBy: { createdAt: "asc" },
          }
        : {
            orderBy: { createdAt: "asc" },
          },
    },
  });

  return wallet?.walletTransactions || [];
}

/**
 * Calculate net ROI for a player (total earned - total spent)
 * Includes both WalletTransaction and legacy Transaction (shop purchases)
 */
export async function getNetROIForPlayer(playerId: number): Promise<number> {
  // Get wallet transactions (positive = earned, negative = debits)
  const walletTransactions = await getWalletTransactionsForPlayer(playerId);
  const walletNet = walletTransactions.reduce((sum, txn) => sum + txn.amount, 0);

  // Get legacy shop transactions (always positive amounts = money spent)
  const shopTransactions = await prisma.transaction.findMany({
    where: { playerId },
    select: { amount: true }
  });
  const shopSpent = shopTransactions.reduce((sum, txn) => sum + txn.amount, 0);

  // Net ROI = wallet net - shop spent
  return walletNet - shopSpent;
}

/**
 * Get current wallet balance for a player
 */
export async function getWalletBalance(playerId: number): Promise<number> {
  const wallet = await prisma.wallet.findUnique({
    where: { playerId },
    select: { amount: true },
  });

  return wallet?.amount || 0;
}

// ============================================================================
// BANLIST QUERIES
// ============================================================================

/**
 * Get all banlist votes for a player
 * Optionally filter by session
 */
export async function getBanlistVotesForPlayer(playerId: number, sessionId?: number) {
  // If filtering by session, we need to join through suggestions to banlists
  if (sessionId !== undefined) {
    return await prisma.banlistSuggestionVote.findMany({
      where: {
        playerId,
        suggestion: {
          banlist: {
            sessionId,
          },
        },
      },
      include: {
        suggestion: true,
      },
    });
  }

  return await prisma.banlistSuggestionVote.findMany({
    where: { playerId },
    include: {
      suggestion: true,
    },
  });
}

/**
 * Get all banlist suggestions for a session
 */
export async function getBanlistSuggestionsForSession(sessionId: number) {
  // First find the banlist for this session
  const banlist = await prisma.banlist.findFirst({
    where: { sessionId },
  });

  if (!banlist) return [];

  return await prisma.banlistSuggestion.findMany({
    where: { banlistId: banlist.id },
    include: {
      player: true,
      votes: true,
    },
  });
}

// ============================================================================
// HEAD-TO-HEAD QUERIES
// ============================================================================

/**
 * Get head-to-head record between two players
 * Returns { player1Wins, player2Wins, draws }
 */
export async function getHeadToHeadRecord(player1Id: number, player2Id: number) {
  const pairings = await prisma.pairing.findMany({
    where: {
      OR: [
        { player1Id: player1Id, player2Id: player2Id },
        { player1Id: player2Id, player2Id: player1Id },
      ],
    },
  });

  let player1Wins = 0;
  let player2Wins = 0;
  let draws = 0;

  for (const pairing of pairings) {
    const isPlayer1First = pairing.player1Id === player1Id;
    const p1Wins = isPlayer1First ? pairing.player1wins : pairing.player2wins;
    const p2Wins = isPlayer1First ? pairing.player2wins : pairing.player1wins;

    if (p1Wins > p2Wins) player1Wins++;
    else if (p2Wins > p1Wins) player2Wins++;
    else draws++;
  }

  return { player1Wins, player2Wins, draws };
}

/**
 * Get all unique opponents for a player
 */
export async function getAllOpponents(playerId: number): Promise<number[]> {
  const pairings = await prisma.pairing.findMany({
    where: {
      OR: [{ player1Id: playerId }, { player2Id: playerId }],
    },
    select: { player1Id: true, player2Id: true },
  });

  const opponentIds = new Set<number>();

  for (const pairing of pairings) {
    const opponentId = pairing.player1Id === playerId ? pairing.player2Id : pairing.player1Id;
    opponentIds.add(opponentId);
  }

  return Array.from(opponentIds);
}

// ============================================================================
// VICTORY POINT QUERIES
// ============================================================================

/**
 * Get total victory points for a player
 */
export async function getTotalVictoryPoints(playerId: number): Promise<number> {
  const count = await prisma.victoryPoint.count({
    where: { playerId },
  });

  return count;
}

/**
 * Get all victory point awards across all sessions
 */
export async function getAllVictoryPoints() {
  return await prisma.victoryPoint.findMany({
    include: {
      player: true,
      session: true,
    },
    orderBy: { sessionId: "asc" },
  });
}

// ============================================================================
// PLAYER QUERIES
// ============================================================================

/**
 * Get all players
 */
export async function getAllPlayers() {
  return await prisma.player.findMany({
    orderBy: { name: "asc" },
  });
}

/**
 * Get player by ID
 */
export async function getPlayerById(playerId: number) {
  return await prisma.player.findUnique({
    where: { id: playerId },
  });
}
