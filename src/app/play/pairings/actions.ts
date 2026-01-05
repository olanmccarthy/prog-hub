"use server";

import { prisma } from "@lib/prisma";
import { getCurrentUser } from "@lib/auth";
import { revalidatePath } from "next/cache";
import { notifyStandings } from "@lib/discordClient";
import { saveDeckImage } from "@lib/deckImage";

export interface PairingData {
  id: number;
  round: number;
  player1: {
    id: number;
    name: string;
  };
  player2: {
    id: number;
    name: string;
  };
  player1wins: number;
  player2wins: number;
}

export interface GetPairingsResult {
  success: boolean;
  sessionId?: number;
  pairings?: PairingData[];
  error?: string;
}

export interface UpdatePairingResult {
  success: boolean;
  pairing?: PairingData;
  error?: string;
}

export async function getPairings(
  sessionId?: number
): Promise<GetPairingsResult> {
  try {
    // If no sessionId provided, get the active session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const activeSession = await prisma.session.findFirst({
        where: { active: true },
        select: { id: true },
      });

      if (!activeSession) {
        return {
          success: false,
          error: "No active session found",
        };
      }
      currentSessionId = activeSession.id;
    }

    const pairings = await prisma.pairing.findMany({
      where: { sessionId: currentSessionId },
      include: {
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
      },
      orderBy: [{ round: "asc" }, { id: "asc" }],
    });

    // Map to plain objects for serialization
    const pairingData: PairingData[] = pairings.map((p) => ({
      id: p.id,
      round: p.round,
      player1: {
        id: p.player1.id,
        name: p.player1.name,
      },
      player2: {
        id: p.player2.id,
        name: p.player2.name,
      },
      player1wins: p.player1wins,
      player2wins: p.player2wins,
    }));

    return {
      success: true,
      sessionId: currentSessionId,
      pairings: pairingData,
    };
  } catch (error) {
    console.error("Error fetching pairings:", error);
    return {
      success: false,
      error: "Failed to fetch pairings",
    };
  }
}

export async function updatePairing(
  pairingId: number,
  player1wins: number,
  player2wins: number
): Promise<UpdatePairingResult> {
  try {
    // Check if user is logged in
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "You must be logged in to update scores",
      };
    }

    // Verify the player exists in the database
    const player = await prisma.player.findUnique({
      where: { id: currentUser.playerId },
    });

    if (!player) {
      return {
        success: false,
        error: "Your session is invalid. Please log out and log back in.",
      };
    }

    if (!pairingId || player1wins === undefined || player2wins === undefined) {
      return {
        success: false,
        error: "Missing required fields",
      };
    }

    const pairing = await prisma.pairing.findUnique({
      where: { id: pairingId },
      include: {
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
      },
    });

    if (!pairing) {
      return {
        success: false,
        error: "Pairing not found",
      };
    }

    // Check if the logged-in user is one of the players in this pairing or is an admin
    const isPlayer1 = pairing.player1.id === currentUser.playerId;
    const isPlayer2 = pairing.player2.id === currentUser.playerId;
    const isAdmin = currentUser.isAdmin ?? false;

    if (!isPlayer1 && !isPlayer2 && !isAdmin) {
      return {
        success: false,
        error: "You can only update scores for games you are involved in",
      };
    }

    const updatedPairing = await prisma.pairing.update({
      where: { id: pairingId },
      data: {
        player1wins,
        player2wins,
      },
      include: {
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
      },
    });

    // Map to plain object for serialization
    const pairingData: PairingData = {
      id: updatedPairing.id,
      round: updatedPairing.round,
      player1: {
        id: updatedPairing.player1.id,
        name: updatedPairing.player1.name,
      },
      player2: {
        id: updatedPairing.player2.id,
        name: updatedPairing.player2.name,
      },
      player1wins: updatedPairing.player1wins,
      player2wins: updatedPairing.player2wins,
    };

    return {
      success: true,
      pairing: pairingData,
    };
  } catch (error) {
    console.error("Error updating pairing:", error);
    return {
      success: false,
      error: "Failed to update pairing",
    };
  }
}

// ============================================================================
// STANDINGS-RELATED ACTIONS
// ============================================================================

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
  omw?: number; // Opponent Match Win percentage (tiebreaker)
  gw?: number;  // Game Win percentage (tiebreaker)
  ogw?: number; // Opponent Game Win percentage (tiebreaker)
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
  date: Date | null;
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

export async function getStandings(
  sessionId?: number
): Promise<GetStandingsResult> {
  try {
    // If no sessionId provided, get the active session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const activeSession = await prisma.session.findFirst({
        where: { active: true },
        select: { id: true },
      });

      if (!activeSession) {
        return {
          success: false,
          error: "No active session found",
        };
      }
      currentSessionId = activeSession.id;
    }

    const pairings = await prisma.pairing.findMany({
      where: { sessionId: currentSessionId },
      include: {
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
      },
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
    const sortedStandings = sortWithTiebreakersAndHeadToHead(playerStats, pairings);

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

/**
 * Sort players with full tiebreaker support including recursive multi-way head-to-head
 */
function sortWithTiebreakersAndHeadToHead(
  players: PlayerStats[],
  pairings: Array<{
    player1: { id: number };
    player2: { id: number };
    player1wins: number;
    player2wins: number;
  }>
): PlayerStats[] {
  // Step 1: Sort by first 3 criteria (match wins, game wins in losses, game losses in wins)
  const initialSort = [...players].sort((a, b) => {
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

    // Still tied - will be resolved in next step
    return 0;
  });

  // Step 2: Identify groups of tied players
  const tiedGroups: PlayerStats[][] = [];
  let currentGroup: PlayerStats[] = [initialSort[0]];

  for (let i = 1; i < initialSort.length; i++) {
    const prev = initialSort[i - 1];
    const curr = initialSort[i];

    // Check if current player is tied with previous on all 3 criteria
    if (
      curr.matchWins === prev.matchWins &&
      curr.gameWinsInLosses === prev.gameWinsInLosses &&
      curr.gameLossesInWins === prev.gameLossesInWins
    ) {
      currentGroup.push(curr);
    } else {
      // Group ended, save it if it has 2+ players
      if (currentGroup.length >= 2) {
        tiedGroups.push(currentGroup);
      }
      currentGroup = [curr];
    }
  }
  // Don't forget the last group
  if (currentGroup.length >= 2) {
    tiedGroups.push(currentGroup);
  }

  // Step 3: Resolve each tied group with recursive head-to-head
  const finalStandings = [...initialSort];

  for (const group of tiedGroups) {
    // Recursively resolve the tied group
    const resolvedGroup = resolveMultiWayTie(group, pairings);

    // Replace the group in finalStandings with the resolved group
    const firstIdx = finalStandings.findIndex(p => p.playerId === group[0].playerId);
    for (let i = 0; i < resolvedGroup.length; i++) {
      finalStandings[firstIdx + i] = resolvedGroup[i];
    }
  }

  return finalStandings;
}

/**
 * Recursively resolve a multi-way tie by calculating stats within the tied group
 * and applying all tiebreakers
 */
function resolveMultiWayTie(
  tiedPlayers: PlayerStats[],
  allPairings: Array<{
    player1: { id: number };
    player2: { id: number };
    player1wins: number;
    player2wins: number;
  }>
): PlayerStats[] {
  // Base case: only 1 player (no tie to resolve)
  if (tiedPlayers.length === 1) {
    return tiedPlayers;
  }

  // Base case: 2 players (simple head-to-head)
  if (tiedPlayers.length === 2) {
    const [player1, player2] = tiedPlayers;
    const h2h = resolveHeadToHead(player1.playerId, player2.playerId, allPairings);

    if (h2h < 0) {
      return [player1, player2]; // player1 won, maintains order
    } else if (h2h > 0) {
      return [player2, player1]; // player2 won, swap order
    } else {
      return tiedPlayers; // Can't resolve (no match, draw, or incomplete)
    }
  }

  // Multi-way tie (3+ players): Calculate mini-standings
  const playerIds = tiedPlayers.map(p => p.playerId);

  // Calculate stats for each player against only the other tied players
  const miniStandings = tiedPlayers.map(player => {
    const stats = calculateStatsAgainstGroup(player.playerId, playerIds, allPairings);
    return {
      ...player,
      miniMatchWins: stats.matchWins,
      miniGameWinsInLosses: stats.gameWinsInLosses,
      miniGameLossesInWins: stats.gameLossesInWins,
    };
  });

  // Sort by mini-standings using the same 3 criteria
  const sorted = miniStandings.sort((a, b) => {
    // 1. Most match wins (within the group)
    if (a.miniMatchWins !== b.miniMatchWins) {
      return b.miniMatchWins - a.miniMatchWins;
    }

    // 2. Most game wins in lost matches (within the group)
    if (a.miniGameWinsInLosses !== b.miniGameWinsInLosses) {
      return b.miniGameWinsInLosses - a.miniGameWinsInLosses;
    }

    // 3. Least game losses in won matches (within the group)
    if (a.miniGameLossesInWins !== b.miniGameLossesInWins) {
      return a.miniGameLossesInWins - b.miniGameLossesInWins;
    }

    // Still tied
    return 0;
  });

  // Identify any remaining ties within the sorted mini-standings
  const result: PlayerStats[] = [];
  let i = 0;

  while (i < sorted.length) {
    // Find all players tied with current player
    const currentPlayer = sorted[i];
    const subGroup: PlayerStats[] = [currentPlayer];
    let j = i + 1;

    while (
      j < sorted.length &&
      sorted[j].miniMatchWins === currentPlayer.miniMatchWins &&
      sorted[j].miniGameWinsInLosses === currentPlayer.miniGameWinsInLosses &&
      sorted[j].miniGameLossesInWins === currentPlayer.miniGameLossesInWins
    ) {
      subGroup.push(sorted[j]);
      j++;
    }

    // If we have a sub-tie, recurse ONLY if we made progress
    // (i.e., the subGroup is smaller than the original group)
    if (subGroup.length >= 2) {
      if (subGroup.length < tiedPlayers.length) {
        // Made progress, safe to recurse
        const resolved = resolveMultiWayTie(subGroup, allPairings);
        result.push(...resolved);
      } else {
        // No progress made (perfectly symmetric tie)
        // Randomize order to be fair since no objective tiebreaker exists
        const randomized = shuffleArray([...subGroup]);
        result.push(...randomized);
      }
    } else {
      result.push(currentPlayer);
    }

    i = j;
  }

  return result;
}

/**
 * Fisher-Yates shuffle algorithm for fair randomization
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Calculate a player's stats against a specific group of opponents
 */
function calculateStatsAgainstGroup(
  playerId: number,
  opponentIds: number[],
  pairings: Array<{
    player1: { id: number };
    player2: { id: number };
    player1wins: number;
    player2wins: number;
  }>
): {
  matchWins: number;
  gameWinsInLosses: number;
  gameLossesInWins: number;
} {
  let matchWins = 0;
  let gameWinsInLosses = 0;
  let gameLossesInWins = 0;

  for (const opponentId of opponentIds) {
    if (opponentId === playerId) continue; // Skip self

    // Find the pairing between this player and the opponent
    const pairing = pairings.find(
      (p) =>
        (p.player1.id === playerId && p.player2.id === opponentId) ||
        (p.player1.id === opponentId && p.player2.id === playerId)
    );

    if (!pairing) continue;

    const isPlayer1 = pairing.player1.id === playerId;
    const playerWins = isPlayer1 ? pairing.player1wins : pairing.player2wins;
    const opponentWins = isPlayer1 ? pairing.player2wins : pairing.player1wins;

    // Determine match result (first to 2 wins)
    if (playerWins === 2) {
      // Won the match
      matchWins++;
      gameLossesInWins += opponentWins;
    } else if (opponentWins === 2) {
      // Lost the match
      gameWinsInLosses += playerWins;
    }
    // If neither has 2 wins, it's incomplete or a draw - don't count
  }

  return { matchWins, gameWinsInLosses, gameLossesInWins };
}

/**
 * Resolve head-to-head matchup between two players
 * Returns:
 *   -1 if player A beat player B (A should rank higher)
 *    1 if player B beat player A (B should rank higher)
 *    0 if they didn't play, drew, or match incomplete
 */
function resolveHeadToHead(
  playerAId: number,
  playerBId: number,
  pairings: Array<{
    player1: { id: number };
    player2: { id: number };
    player1wins: number;
    player2wins: number;
  }>
): number {
  // Find the pairing between these two players
  const headToHeadPairing = pairings.find(
    (pairing) =>
      (pairing.player1.id === playerAId && pairing.player2.id === playerBId) ||
      (pairing.player1.id === playerBId && pairing.player2.id === playerAId)
  );

  if (!headToHeadPairing) {
    // Players didn't face each other
    return 0;
  }

  // Determine who won the match (first to 2 wins)
  const { player1, player2, player1wins, player2wins } = headToHeadPairing;

  // Check if match is complete (someone has 2 wins)
  if (player1wins !== 2 && player2wins !== 2) {
    // Match not complete or was a draw
    return 0;
  }

  // Determine which player is which in the pairing
  const isAPlayer1 = player1.id === playerAId;

  if (isAPlayer1) {
    // Player A is player1 in the pairing
    if (player1wins === 2) {
      return -1; // Player A won, A ranks higher
    } else {
      return 1; // Player B won, B ranks higher
    }
  } else {
    // Player A is player2 in the pairing
    if (player2wins === 2) {
      return -1; // Player A won, A ranks higher
    } else {
      return 1; // Player B won, B ranks higher
    }
  }
}

export async function getSessions(): Promise<GetSessionsResult> {
  try {
    // Get all sessions that have been started (active or complete)
    const sessions = await prisma.session.findMany({
      where: {
        OR: [
          { active: true },
          { complete: true },
        ],
      },
      select: {
        id: true,
        number: true,
        date: true,
      },
      orderBy: { number: "desc" },
    });

    return {
      success: true,
      sessions,
    };
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return {
      success: false,
      error: "Failed to fetch sessions",
    };
  }
}

/**
 * Check if standings for a session are finalized
 */
export async function checkIsFinalized(sessionId: number): Promise<IsFinalizedResult> {
  try {
    const session = await prisma.session.findUnique({
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
    // Get the active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    if (!activeSession) {
      return {
        canFinalize: false,
        isCurrentSession: false,
        allMatchesComplete: false,
        error: "No active session found",
      };
    }

    const isCurrentSession = activeSession.id === sessionId;

    // Get all pairings for this session
    const pairings = await prisma.pairing.findMany({
      where: { sessionId },
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

    // Update session with top 6 placements
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        first: standings[0].playerId,
        second: standings[1].playerId,
        third: standings[2].playerId,
        fourth: standings[3].playerId,
        fifth: standings[4].playerId,
        sixth: standings[5].playerId,
      },
    });

    // Generate deck images for all decklists in this session
    await generateDecklistImages(sessionId);

    // Send Discord notification with final standings
    await notifyStandings(sessionId);

    // Send Discord notification with decklist images
    const { notifyDecklists } = await import('@lib/discordClient');
    await notifyDecklists(sessionId);

    // Revalidate relevant pages
    revalidatePath("/play/pairings");
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

/**
 * Generate deck images for all decklists in a session
 */
async function generateDecklistImages(sessionId: number): Promise<void> {
  try {
    // Get the session to find the banlist
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { number: true },
    });

    if (!session) {
      console.error("Session not found for image generation");
      return;
    }

    // Get the banlist for this session
    const banlist = await prisma.banlist.findFirst({
      where: { sessionId: session.number },
    });

    // Get all decklists for this session
    const decklists = await prisma.decklist.findMany({
      where: { sessionId },
      select: {
        id: true,
        maindeck: true,
        extradeck: true,
        sidedeck: true,
      },
    });

    console.log(`Generating images for ${decklists.length} decklists in session ${session.number}`);

    // Generate images for each decklist
    const imagePromises = decklists.map(async (decklist) => {
      try {
        // Parse JSON arrays (handle JsonValue type)
        const maindeck = (typeof decklist.maindeck === 'string' ? JSON.parse(decklist.maindeck) : decklist.maindeck) as number[];
        const extradeck = (typeof decklist.extradeck === 'string' ? JSON.parse(decklist.extradeck) : decklist.extradeck) as number[];
        const sidedeck = (typeof decklist.sidedeck === 'string' ? JSON.parse(decklist.sidedeck) : decklist.sidedeck) as number[];

        // Parse banlist if available
        let banlistForImage = undefined;
        if (banlist) {
          try {
            const parseBanlistField = (field: string | number[] | unknown): number[] => {
              if (!field) return [];
              if (typeof field === 'string') {
                if (field.trim() === '') return [];
                return JSON.parse(field) as number[];
              }
              if (Array.isArray(field)) return field;
              return [];
            };

            banlistForImage = {
              banned: parseBanlistField(banlist.banned),
              limited: parseBanlistField(banlist.limited),
              semilimited: parseBanlistField(banlist.semilimited),
            };
          } catch (parseError) {
            console.warn(`Failed to parse banlist for session ${session.number}, generating without banlist indicators:`, parseError);
            banlistForImage = undefined;
          }
        }

        // Generate and save the image
        await saveDeckImage(
          decklist.id,
          { maindeck, extradeck, sidedeck },
          banlistForImage
        );

        console.log(`Generated image for decklist ${decklist.id}`);
      } catch (error) {
        console.error(`Failed to generate image for decklist ${decklist.id}:`, error);
      }
    });

    await Promise.all(imagePromises);
    console.log(`Finished generating all deck images for session ${session.number}`);
  } catch (error) {
    console.error("Error generating decklist images:", error);
    // Don't throw - we don't want image generation failures to block finalization
  }
}
