"use server";

import { prisma } from "@lib/prisma";
import { getCurrentUser } from "@lib/auth";
import { COMPARATIVE_STATS } from "./comparativeStatsConfig";
import {
  getAllPlacementsForPlayer,
  getPlayersInPlacementRange,
  parseCardIds,
  getPairingsForPlayer,
  getMatchResult,
  getCompletedSessions as getCompletedSessionsQuery,
  getAllPlayers as getAllPlayersQuery,
  getHeadToHeadRecord as getHeadToHeadRecordQuery,
  getAllOpponents as getAllOpponentsQuery,
} from "@lib/statQueries";

// Type definitions
export interface PerformanceStats {
  totalWins: number;
  totalLosses: number;
  runnerUps: number;
  thirdPlace: number;
  averagePlacement: number | null;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  gameWins: number;
  gameLosses: number;
  twoOhsGiven: number;
  twoOhsReceived: number;
  longestWinStreak: number;
  longestLossStreak: number;
}

export interface EconomyStats {
  totalPointsEarned: number;
  totalPointsSpent: number;
  currentBalance: number;
  averagePointsPerSession: number;
  averageSpentPerSession: number;
  timesVPTaken: number;
  timesVPPassed: number;
}

export interface ParticipationStats {
  totalSessions: number;
  sessionsSinceLastVP: number;
  timesAsModerator: number;
  banlistSuggestionsChosen: number;
}

export interface DeckBuildingStats {
  averageUniqueCards: number; // Average cards only this player used per session
  averageCardsChanged: number; // Average cards changed between consecutive sessions
}

export interface BanlistVotingStats {
  averageVotesPerSuggestion: number | null;
  averageSuggestionsWithThreshold: number | null;
  averageChosenPerSession: number | null;
  timesChoseOwnSuggestion: number;
}

export interface CardUsage {
  cardId: number;
  cardName: string;
  timesPlayed: number;
  decklistPercentage: number;
  averageCopies: number;
}

export interface HeadToHeadRecord {
  opponentId: number;
  opponentName: string;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  gameWins: number;
  gameLosses: number;
}

export interface PlayerStatsResult {
  success: boolean;
  error?: string;
  playerId?: number;
  playerName?: string;
  performance?: PerformanceStats;
  economy?: EconomyStats;
  participation?: ParticipationStats;
  banlistVoting?: BanlistVotingStats;
  deckBuilding?: DeckBuildingStats;
  mostPlayedCards?: CardUsage[];
  headToHead?: HeadToHeadRecord[];
}

// Types for Prisma results
type SessionWithPlacements = {
  id: number;
  number: number;
  complete: boolean;
  active: boolean;
  first: number | null;
  second: number | null;
  third: number | null;
  fourth: number | null;
  fifth: number | null;
  sixth: number | null;
  moderatorId: number | null;
};

type PairingWithPlayers = {
  player1Id: number;
  player2Id: number;
  player1wins: number;
  player2wins: number;
  player1: { id: number; name: string };
  player2: { id: number; name: string };
};

type VictoryPointWithSession = {
  session: { number: number };
};

type BanlistSuggestionWithVotes = {
  playerId: number;
  moderatorId: number | null;
  chosen: boolean;
  votes: unknown[];
};

type DecklistData = {
  maindeck: unknown;
  sidedeck: unknown;
  extradeck: unknown;
  sessionId: number;
};

/**
 * Helper function to parse card IDs from partial decklist objects
 * Used when querying only specific fields from decklist table
 */
function parsePartialDecklistCards(decklist: { maindeck: unknown; extradeck: unknown }): number[] {
  const maindeck = Array.isArray(decklist.maindeck)
    ? decklist.maindeck
    : JSON.parse(decklist.maindeck as string);
  const extradeck = Array.isArray(decklist.extradeck)
    ? decklist.extradeck
    : JSON.parse(decklist.extradeck as string);

  return [...maindeck, ...extradeck].map((id) => (typeof id === "number" ? id : parseInt(id, 10)));
}

// Get current user's player ID
export async function getCurrentPlayerId(): Promise<{
  success: boolean;
  playerId?: number;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    return { success: true, playerId: user.playerId };
  } catch (error) {
    console.error("Error getting current user:", error);
    return { success: false, error: "Failed to get current user" };
  }
}

// Get list of completed sessions
export async function getCompletedSessions(): Promise<{
  success: boolean;
  sessions?: Array<{ id: number; number: number; setCode: string }>;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const sessions = await prisma.session.findMany({
      where: { complete: true },
      select: {
        id: true,
        number: true,
        set: {
          select: { setCode: true }
        }
      },
      orderBy: { number: 'asc' }
    });

    // Transform to include setCode at the top level
    const formattedSessions = sessions.map(s => ({
      id: s.id,
      number: s.number,
      setCode: s.set?.setCode || 'Unknown'
    }));

    return { success: true, sessions: formattedSessions };
  } catch (error) {
    console.error("Error fetching completed sessions:", error);
    return { success: false, error: "Failed to load sessions" };
  }
}

// Get list of all players for dropdown
export async function getPlayerList(): Promise<{
  success: boolean;
  players?: Array<{ id: number; name: string }>;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const players = await prisma.player.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    return { success: true, players };
  } catch (error) {
    console.error("Error fetching player list:", error);
    return { success: false, error: "Failed to load player list" };
  }
}

// Get comprehensive stats for a player
export async function getPlayerStats(
  playerId: number,
  cardStartSession?: number,
  cardEndSession?: number
): Promise<PlayerStatsResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Build where clause for decklist session filtering
    const decklistWhere: { playerId: number; sessionId?: { gte?: number; lte?: number } } = { playerId };
    if (cardStartSession !== undefined || cardEndSession !== undefined) {
      decklistWhere.sessionId = {};
      if (cardStartSession !== undefined) decklistWhere.sessionId.gte = cardStartSession;
      if (cardEndSession !== undefined) decklistWhere.sessionId.lte = cardEndSession;
    }

    // Fetch all data in parallel
    const [
      player,
      sessions,
      pairings,
      victoryPoints,
      wallet,
      walletTransactions,
      transactions,
      decklists,
      suggestions
    ] = await Promise.all([
      prisma.player.findUnique({
        where: { id: playerId },
        select: { id: true, name: true }
      }),
      prisma.session.findMany({
        where: { complete: true },
        orderBy: { number: 'asc' }
      }),
      prisma.pairing.findMany({
        where: {
          OR: [{ player1Id: playerId }, { player2Id: playerId }]
        },
        include: {
          player1: { select: { id: true, name: true } },
          player2: { select: { id: true, name: true } }
        }
      }),
      prisma.victoryPoint.findMany({
        where: { playerId },
        include: { session: true }
      }),
      prisma.wallet.findUnique({
        where: { playerId }
      }),
      prisma.walletTransaction.findMany({
        where: { wallet: { playerId } }
      }),
      prisma.transaction.findMany({
        where: { playerId }
      }),
      prisma.decklist.findMany({
        where: decklistWhere,
        select: { maindeck: true, sidedeck: true, extradeck: true, sessionId: true }
      }),
      prisma.banlistSuggestion.findMany({
        where: { playerId },
        include: { votes: true }
      })
    ]);

    if (!player) {
      return { success: false, error: "Player not found" };
    }

    // Calculate Performance Stats
    const performance = calculatePerformanceStats(playerId, sessions, pairings);

    // Filter sessions where player participated
    const participatedSessions = sessions.filter(s =>
      s.first === playerId || s.second === playerId || s.third === playerId ||
      s.fourth === playerId || s.fifth === playerId || s.sixth === playerId
    ).length;

    // Calculate Economy Stats
    const economy = calculateEconomyStats(
      victoryPoints,
      wallet,
      walletTransactions,
      transactions,
      participatedSessions
    );

    // Calculate Participation Stats
    const participation = calculateParticipationStats(
      playerId,
      sessions,
      victoryPoints,
      suggestions
    );

    // Calculate Banlist Voting Stats
    const banlistVoting = calculateBanlistVotingStats(playerId, suggestions);

    // Calculate Deck Building Stats
    const deckBuilding = await calculateDeckBuildingStats(playerId);

    // Calculate Card Usage Stats
    const mostPlayedCards = await calculateCardUsageStats(decklists);

    // Calculate Head-to-Head Records
    const headToHead = calculateHeadToHeadRecords(playerId, pairings);

    return {
      success: true,
      playerId: player.id,
      playerName: player.name,
      performance,
      economy,
      participation,
      banlistVoting,
      deckBuilding,
      mostPlayedCards,
      headToHead
    };
  } catch (error) {
    console.error("Error fetching player stats:", error);
    return { success: false, error: "Failed to load player statistics" };
  }
}

function calculatePerformanceStats(
  playerId: number,
  sessions: SessionWithPlacements[],
  pairings: PairingWithPlayers[]
): PerformanceStats {
  // Count placements
  const totalWins = sessions.filter(s => s.first === playerId).length;
  const totalLosses = sessions.filter(s => s.sixth === playerId).length;
  const runnerUps = sessions.filter(s => s.second === playerId).length;
  const thirdPlace = sessions.filter(s => s.third === playerId).length;

  // Calculate average placement
  const placements: number[] = [];
  sessions.forEach(session => {
    if (session.first === playerId) placements.push(1);
    else if (session.second === playerId) placements.push(2);
    else if (session.third === playerId) placements.push(3);
    else if (session.fourth === playerId) placements.push(4);
    else if (session.fifth === playerId) placements.push(5);
    else if (session.sixth === playerId) placements.push(6);
  });

  const averagePlacement = placements.length > 0
    ? Math.round((placements.reduce((sum, p) => sum + p, 0) / placements.length) * 10) / 10
    : null;

  // Calculate match/game records
  let matchWins = 0, matchLosses = 0, matchDraws = 0;
  let gameWins = 0, gameLosses = 0;
  let twoOhsGiven = 0, twoOhsReceived = 0;

  pairings.forEach(p => {
    const isPlayer1 = p.player1Id === playerId;
    const playerWins = isPlayer1 ? p.player1wins : p.player2wins;
    const opponentWins = isPlayer1 ? p.player2wins : p.player1wins;

    gameWins += playerWins;
    gameLosses += opponentWins;

    if (playerWins === 2 && opponentWins < 2) {
      matchWins++;
      if (opponentWins === 0) twoOhsGiven++;
    } else if (opponentWins === 2 && playerWins < 2) {
      matchLosses++;
      if (playerWins === 0) twoOhsReceived++;
    } else if (playerWins === opponentWins) {
      matchDraws++;
    }
  });

  // Calculate streaks
  const { longestWinStreak, longestLossStreak } = calculateStreaks(playerId, sessions);

  return {
    totalWins,
    totalLosses,
    runnerUps,
    thirdPlace,
    averagePlacement,
    matchWins,
    matchLosses,
    matchDraws,
    gameWins,
    gameLosses,
    twoOhsGiven,
    twoOhsReceived,
    longestWinStreak,
    longestLossStreak
  };
}

function calculateStreaks(playerId: number, sessions: SessionWithPlacements[]): {
  longestWinStreak: number;
  longestLossStreak: number;
} {
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  sessions.forEach(session => {
    if (session.first === playerId) {
      currentWinStreak++;
      currentLossStreak = 0;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    } else if (session.sixth === playerId) {
      currentLossStreak++;
      currentWinStreak = 0;
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  });

  return { longestWinStreak, longestLossStreak };
}

function calculateEconomyStats(
  victoryPoints: VictoryPointWithSession[],
  wallet: { amount: number } | null,
  walletTransactions: { amount: number }[],
  transactions: { amount: number }[],
  participatedSessions: number
): EconomyStats {
  const totalPointsEarned = walletTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  // Total points spent from legacy transactions table (shop purchases)
  const totalPointsSpent = transactions.reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = wallet?.amount ?? 0;

  const averagePointsPerSession = participatedSessions > 0
    ? Math.round(totalPointsEarned / participatedSessions)
    : 0;

  const averageSpentPerSession = participatedSessions > 0
    ? Math.round(totalPointsSpent / participatedSessions)
    : 0;

  const timesVPTaken = victoryPoints.length;
  const timesVPPassed = participatedSessions - timesVPTaken;

  return {
    totalPointsEarned,
    totalPointsSpent,
    currentBalance,
    averagePointsPerSession,
    averageSpentPerSession,
    timesVPTaken,
    timesVPPassed
  };
}

function calculateParticipationStats(
  playerId: number,
  sessions: SessionWithPlacements[],
  victoryPoints: VictoryPointWithSession[],
  suggestions: BanlistSuggestionWithVotes[]
): ParticipationStats {
  const totalSessions = sessions.filter(s =>
    s.first === playerId || s.second === playerId || s.third === playerId ||
    s.fourth === playerId || s.fifth === playerId || s.sixth === playerId
  ).length;

  // Find sessions since last VP
  let sessionsSinceLastVP = 0;
  if (victoryPoints.length > 0) {
    const lastVPSession = victoryPoints
      .map(vp => vp.session.number)
      .sort((a, b) => b - a)[0];

    sessionsSinceLastVP = sessions.filter(s =>
      s.number > lastVPSession &&
      (s.first === playerId || s.second === playerId || s.third === playerId ||
       s.fourth === playerId || s.fifth === playerId || s.sixth === playerId)
    ).length;
  } else {
    sessionsSinceLastVP = totalSessions;
  }

  const timesAsModerator = sessions.filter(s => s.moderatorId === playerId).length;
  const banlistSuggestionsChosen = suggestions.filter(s => s.chosen).length;

  return {
    totalSessions,
    sessionsSinceLastVP,
    timesAsModerator,
    banlistSuggestionsChosen
  };
}

async function calculateDeckBuildingStats(
  playerId: number
): Promise<DeckBuildingStats> {
  // Get all player's decklists ordered by session
  const playerDecklists = await prisma.decklist.findMany({
    where: { playerId },
    orderBy: { sessionId: 'asc' },
    select: { sessionId: true, maindeck: true, sidedeck: true, extradeck: true }
  });

  if (playerDecklists.length === 0) {
    return {
      averageUniqueCards: 0,
      averageCardsChanged: 0
    };
  }

  // Calculate average unique cards per session
  const uniqueCardCounts: number[] = [];
  for (const playerDecklist of playerDecklists) {
    // Get player's cards for this session
    const playerCards = new Set(parsePartialDecklistCards(playerDecklist));

    // Get all other players' decklists for this session
    const otherDecklists = await prisma.decklist.findMany({
      where: {
        sessionId: playerDecklist.sessionId,
        playerId: { not: playerId }
      },
      select: { maindeck: true, sidedeck: true, extradeck: true }
    });

    // Collect all cards used by other players
    const otherPlayersCards = new Set<number>();
    for (const otherDecklist of otherDecklists) {
      const cards = parsePartialDecklistCards(otherDecklist);
      cards.forEach(cardId => otherPlayersCards.add(cardId));
    }

    // Count cards only this player used
    const uniqueCards = [...playerCards].filter(cardId => !otherPlayersCards.has(cardId));
    uniqueCardCounts.push(uniqueCards.length);
  }

  const averageUniqueCards = uniqueCardCounts.length > 0
    ? Math.round((uniqueCardCounts.reduce((sum, count) => sum + count, 0) / uniqueCardCounts.length) * 10) / 10
    : 0;

  // Calculate average cards changed between consecutive sessions
  const cardsChangedCounts: number[] = [];
  for (let i = 0; i < playerDecklists.length - 1; i++) {
    const currentDeck = new Set(parsePartialDecklistCards(playerDecklists[i]));
    const nextDeck = new Set(parsePartialDecklistCards(playerDecklists[i + 1]));

    // Count cards added + cards removed
    const cardsAdded = [...nextDeck].filter(cardId => !currentDeck.has(cardId)).length;
    const cardsRemoved = [...currentDeck].filter(cardId => !nextDeck.has(cardId)).length;
    const totalChanged = cardsAdded + cardsRemoved;

    cardsChangedCounts.push(totalChanged);
  }

  const averageCardsChanged = cardsChangedCounts.length > 0
    ? Math.round((cardsChangedCounts.reduce((sum, count) => sum + count, 0) / cardsChangedCounts.length) * 10) / 10
    : 0;

  return {
    averageUniqueCards,
    averageCardsChanged
  };
}

function calculateBanlistVotingStats(
  playerId: number,
  suggestions: BanlistSuggestionWithVotes[]
): BanlistVotingStats {
  if (suggestions.length === 0) {
    return {
      averageVotesPerSuggestion: null,
      averageSuggestionsWithThreshold: null,
      averageChosenPerSession: null,
      timesChoseOwnSuggestion: 0
    };
  }

  // Calculate total votes across all suggestions
  const totalVotes = suggestions.reduce((sum, s) => sum + (s.votes?.length || 0), 0);
  const averageVotesPerSuggestion = Math.round((totalVotes / suggestions.length) * 10) / 10;

  // Percentage of suggestions with 2+ votes
  const suggestionsWithThreshold = suggestions.filter(s => (s.votes?.length || 0) >= 2).length;
  const averageSuggestionsWithThreshold = Math.round((suggestionsWithThreshold / suggestions.length) * 1000) / 10;

  // Percentage of suggestions that were chosen
  const timesChosen = suggestions.filter(s => s.chosen).length;
  const averageChosenPerSession = Math.round((timesChosen / suggestions.length) * 1000) / 10;

  // Count times player was moderator and chose their own suggestion
  const timesChoseOwnSuggestion = suggestions.filter(
    s => s.chosen && s.moderatorId === playerId
  ).length;

  return {
    averageVotesPerSuggestion,
    averageSuggestionsWithThreshold,
    averageChosenPerSession,
    timesChoseOwnSuggestion
  };
}

async function calculateCardUsageStats(decklists: DecklistData[]): Promise<CardUsage[]> {
  if (decklists.length === 0) return [];

  const totalDecklists = decklists.length;

  // Combine ALL cards from ALL decklists into one big array
  const allCardsAcrossAllDecks: number[] = [];

  // Also track which decklists contain each card for average calculation
  const cardInDeckCount = new Map<number, number>();

  decklists.forEach(decklist => {
    // Prisma returns JSON fields as their native types (arrays in this case)
    const maindeck = Array.isArray(decklist.maindeck) ? decklist.maindeck : [];
    const sidedeck = Array.isArray(decklist.sidedeck) ? decklist.sidedeck : [];
    const extradeck = Array.isArray(decklist.extradeck) ? decklist.extradeck : [];
    const deckCards = [...maindeck, ...sidedeck, ...extradeck];

    allCardsAcrossAllDecks.push(...deckCards);

    // Track which unique cards appear in this deck
    const uniqueCardsInThisDeck = new Set(deckCards);
    uniqueCardsInThisDeck.forEach(cardId => {
      cardInDeckCount.set(cardId, (cardInDeckCount.get(cardId) || 0) + 1);
    });
  });

  // Count frequency of each card ID
  const cardFrequency = new Map<number, number>();
  allCardsAcrossAllDecks.forEach(cardId => {
    cardFrequency.set(cardId, (cardFrequency.get(cardId) || 0) + 1);
  });

  // Fetch card names
  const cardIds = Array.from(cardFrequency.keys());
  const cards = await prisma.card.findMany({
    where: { id: { in: cardIds } },
    select: { id: true, cardName: true }
  });

  const cardNameMap = new Map(cards.map(c => [c.id, c.cardName]));

  // Build result array
  const result: CardUsage[] = [];
  cardFrequency.forEach((totalCount, cardId) => {
    const decksContainingCard = cardInDeckCount.get(cardId) || 1;
    const decklistPercentage = Math.round((decksContainingCard / totalDecklists) * 1000) / 10;
    result.push({
      cardId,
      cardName: cardNameMap.get(cardId) || `Unknown Card ${cardId}`,
      timesPlayed: decksContainingCard, // Number of decklists containing this card
      decklistPercentage,
      averageCopies: Math.round((totalCount / decksContainingCard) * 10) / 10
    });
  });

  // Sort by frequency (descending), then by avg copies (descending) as tiebreaker
  result.sort((a, b) => {
    if (a.timesPlayed !== b.timesPlayed) return b.timesPlayed - a.timesPlayed;
    return b.averageCopies - a.averageCopies;
  });

  return result;
}

function calculateHeadToHeadRecords(
  playerId: number,
  pairings: PairingWithPlayers[]
): HeadToHeadRecord[] {
  const opponentMap = new Map<number, {
    name: string;
    matchWins: number;
    matchLosses: number;
    matchDraws: number;
    gameWins: number;
    gameLosses: number;
    totalMatches: number;
  }>();

  pairings.forEach(p => {
    const isPlayer1 = p.player1Id === playerId;
    const opponentId = isPlayer1 ? p.player2Id : p.player1Id;
    const opponentName = isPlayer1 ? p.player2.name : p.player1.name;
    const playerWins = isPlayer1 ? p.player1wins : p.player2wins;
    const opponentWins = isPlayer1 ? p.player2wins : p.player1wins;

    let existing = opponentMap.get(opponentId);
    if (!existing) {
      existing = {
        name: opponentName,
        matchWins: 0,
        matchLosses: 0,
        matchDraws: 0,
        gameWins: 0,
        gameLosses: 0,
        totalMatches: 0
      };
      opponentMap.set(opponentId, existing);
    }

    existing.gameWins += playerWins;
    existing.gameLosses += opponentWins;
    existing.totalMatches++;

    if (playerWins === 2 && opponentWins < 2) {
      existing.matchWins++;
    } else if (opponentWins === 2 && playerWins < 2) {
      existing.matchLosses++;
    } else {
      existing.matchDraws++;
    }
  });

  // Convert to array and sort by total matches (descending)
  const result: HeadToHeadRecord[] = [];
  opponentMap.forEach((stats, opponentId) => {
    result.push({
      opponentId,
      opponentName: stats.name,
      matchWins: stats.matchWins,
      matchLosses: stats.matchLosses,
      matchDraws: stats.matchDraws,
      gameWins: stats.gameWins,
      gameLosses: stats.gameLosses
    });
  });

  // Sort by W-L-D record (wins desc, losses asc, draws desc)
  result.sort((a, b) => {
    if (a.matchWins !== b.matchWins) return b.matchWins - a.matchWins;
    if (a.matchLosses !== b.matchLosses) return a.matchLosses - b.matchLosses;
    return b.matchDraws - a.matchDraws;
  });

  return result;
}

// Comparative Stats Result Types
export interface ComparativePlayerStat {
  playerId: number;
  playerName: string;
  value: number | string | null;
  formattedValue: string;
  sessionsPlayed: number;
}

export interface ComparativeStatsResult {
  success: boolean;
  error?: string;
  statKey?: string;
  statLabel?: string;
  rankings?: ComparativePlayerStat[];
}

// All Players All Stats Types
export interface PlayerAllStats {
  playerId: number;
  playerName: string;
  sessionsPlayed: number;

  // Performance stats (13)
  totalWins: number;
  runnerUps: number;
  thirdPlace: number;
  totalLosses: number;
  averagePlacement: number | null;
  matchWins: number;
  matchWinRate: number;
  gameWins: number;
  gameWinRate: number;
  twoOhsGiven: number;
  twoOhsReceived: number;
  longestWinStreak: number;
  longestLossStreak: number;

  // Economy stats (6)
  totalPointsEarned: number;
  totalPointsSpent: number;
  currentBalance: number;
  averagePointsPerSession: number;
  timesVPTaken: number;
  timesVPPassed: number;

  // Participation stats (4)
  totalSessions: number;
  sessionsSinceLastVP: number;
  timesAsModerator: number;
  banlistSuggestionsChosen: number;

  // Banlist voting stats (4)
  averageVotesPerSuggestion: number | null;
  averageSuggestionsWithThreshold: number | null;
  averageChosenPerSession: number | null;
  timesChoseOwnSuggestion: number;

  // Deck building stats (2)
  averageUniqueCards: number;
  averageCardsChanged: number;
}

export interface AllPlayersStatsResult {
  success: boolean;
  error?: string;
  players?: PlayerAllStats[];
}

// Get card usage across all players
export async function getAllPlayersCardUsage(
  limit: number = 50,
  startSession?: number,
  endSession?: number
): Promise<{
  success: boolean;
  error?: string;
  cards?: CardUsage[];
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Build where clause for session filtering
    const whereClause: { sessionId?: { gte?: number; lte?: number } } = {};
    if (startSession !== undefined || endSession !== undefined) {
      whereClause.sessionId = {};
      if (startSession !== undefined) whereClause.sessionId.gte = startSession;
      if (endSession !== undefined) whereClause.sessionId.lte = endSession;
    }

    // Fetch all decklists from all players (with optional session filter)
    const allDecklists = await prisma.decklist.findMany({
      where: whereClause,
      select: { maindeck: true, sidedeck: true, extradeck: true }
    });

    if (allDecklists.length === 0) {
      return { success: true, cards: [] };
    }

    const totalDecklists = allDecklists.length;

    // Combine ALL cards from ALL decklists into one big array
    const allCardsAcrossAllDecks: number[] = [];
    const cardInDeckCount = new Map<number, number>();

    allDecklists.forEach(decklist => {
      const maindeck = (Array.isArray(decklist.maindeck) ? decklist.maindeck : []) as number[];
      const sidedeck = (Array.isArray(decklist.sidedeck) ? decklist.sidedeck : []) as number[];
      const extradeck = (Array.isArray(decklist.extradeck) ? decklist.extradeck : []) as number[];
      const deckCards: number[] = [...maindeck, ...sidedeck, ...extradeck];

      allCardsAcrossAllDecks.push(...deckCards);

      // Track which unique cards appear in this deck
      const uniqueCardsInThisDeck = new Set<number>(deckCards);
      uniqueCardsInThisDeck.forEach(cardId => {
        cardInDeckCount.set(cardId, (cardInDeckCount.get(cardId) || 0) + 1);
      });
    });

    // Count frequency of each card ID
    const cardFrequency = new Map<number, number>();
    allCardsAcrossAllDecks.forEach(cardId => {
      cardFrequency.set(cardId, (cardFrequency.get(cardId) || 0) + 1);
    });

    // Fetch card names
    const cardIds = Array.from(cardFrequency.keys());
    const cards = await prisma.card.findMany({
      where: { id: { in: cardIds } },
      select: { id: true, cardName: true }
    });

    const cardNameMap = new Map(cards.map(c => [c.id, c.cardName]));

    // Build result array
    const result: CardUsage[] = [];
    cardFrequency.forEach((totalCount, cardId) => {
      const decksContainingCard = cardInDeckCount.get(cardId) || 1;
      const decklistPercentage = Math.round((decksContainingCard / totalDecklists) * 1000) / 10;
      result.push({
        cardId,
        cardName: cardNameMap.get(cardId) || `Unknown Card ${cardId}`,
        timesPlayed: decksContainingCard,
        decklistPercentage,
        averageCopies: Math.round((totalCount / decksContainingCard) * 10) / 10
      });
    });

    // Sort by frequency (descending), then by avg copies (descending) as tiebreaker
    result.sort((a, b) => {
      if (a.timesPlayed !== b.timesPlayed) return b.timesPlayed - a.timesPlayed;
      return b.averageCopies - a.averageCopies;
    });

    return { success: true, cards: result.slice(0, limit) };
  } catch (error) {
    console.error("Error calculating all players card usage:", error);
    return { success: false, error: "Failed to calculate card usage" };
  }
}

// Get comparative stats for all players
export async function getComparativeStats(
  statKey: string,
  minSessions: number
): Promise<ComparativeStatsResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Find the stat configuration
    const statConfig = COMPARATIVE_STATS.find(s => s.key === statKey);
    if (!statConfig) {
      return { success: false, error: "Invalid stat key" };
    }

    // Get all players
    const players = await prisma.player.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    // Calculate stats for each player
    const rankings: ComparativePlayerStat[] = [];

    for (const player of players) {
      const stats = await getPlayerStats(player.id);

      if (!stats.success || !stats.participation) continue;

      const sessionsPlayed = stats.participation.totalSessions;

      // Filter by minimum sessions
      if (sessionsPlayed < minSessions) continue;

      // Extract the requested stat value
      let value: number | string | null = null;

      switch (statConfig.category) {
        case 'performance':
          if (statKey === 'matchWinRate') {
            // Calculate match win rate
            const totalMatches = (stats.performance?.matchWins || 0) +
                                (stats.performance?.matchLosses || 0) +
                                (stats.performance?.matchDraws || 0);
            value = totalMatches > 0
              ? Math.round(((stats.performance?.matchWins || 0) / totalMatches) * 1000) / 10
              : 0;
          } else if (statKey === 'gameWinRate') {
            // Calculate game win rate
            const totalGames = (stats.performance?.gameWins || 0) + (stats.performance?.gameLosses || 0);
            value = totalGames > 0
              ? Math.round(((stats.performance?.gameWins || 0) / totalGames) * 1000) / 10
              : 0;
          } else {
            value = stats.performance?.[statKey as keyof PerformanceStats] ?? null;
          }
          break;
        case 'economy':
          value = stats.economy?.[statKey as keyof EconomyStats] ?? null;
          break;
        case 'banlist':
          // Check both participation and banlistVoting stats
          if (statKey === 'timesAsModerator' || statKey === 'banlistSuggestionsChosen') {
            value = stats.participation?.[statKey as keyof ParticipationStats] ?? null;
          } else {
            value = stats.banlistVoting?.[statKey as keyof BanlistVotingStats] ?? null;
          }
          break;
      }

      rankings.push({
        playerId: player.id,
        playerName: player.name,
        value,
        formattedValue: statConfig.formatter(value),
        sessionsPlayed
      });
    }

    // Sort by value
    rankings.sort((a, b) => {
      // Handle null values (push to end)
      if (a.value === null && b.value === null) return 0;
      if (a.value === null) return 1;
      if (b.value === null) return -1;

      // Ensure values are numbers for arithmetic operations
      const aNum = typeof a.value === 'number' ? a.value : 0;
      const bNum = typeof b.value === 'number' ? b.value : 0;

      if (statConfig.sortDirection === 'desc') {
        return bNum - aNum;
      } else {
        return aNum - bNum;
      }
    });

    return {
      success: true,
      statKey,
      statLabel: statConfig.label,
      rankings
    };
  } catch (error) {
    console.error("Error calculating comparative stats:", error);
    return { success: false, error: "Failed to calculate comparative stats" };
  }
}

// Get all stats for all players in a single call
export async function getAllPlayersAllStats(
  minSessions: number
): Promise<AllPlayersStatsResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get all players
    const players = await prisma.player.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    // Calculate stats for each player
    const allStats: PlayerAllStats[] = [];

    for (const player of players) {
      const stats = await getPlayerStats(player.id);

      if (!stats.success || !stats.participation) continue;

      const sessionsPlayed = stats.participation.totalSessions;

      // Filter by minimum sessions
      if (sessionsPlayed < minSessions) continue;

      // Calculate match win rate
      const totalMatches = (stats.performance?.matchWins || 0) +
                          (stats.performance?.matchLosses || 0) +
                          (stats.performance?.matchDraws || 0);
      const matchWinRate = totalMatches > 0
        ? Math.round(((stats.performance?.matchWins || 0) / totalMatches) * 1000) / 10
        : 0;

      // Calculate game win rate
      const totalGames = (stats.performance?.gameWins || 0) + (stats.performance?.gameLosses || 0);
      const gameWinRate = totalGames > 0
        ? Math.round(((stats.performance?.gameWins || 0) / totalGames) * 1000) / 10
        : 0;

      // Build comprehensive stats object
      allStats.push({
        playerId: player.id,
        playerName: player.name,
        sessionsPlayed,

        // Performance stats
        totalWins: stats.performance?.totalWins || 0,
        runnerUps: stats.performance?.runnerUps || 0,
        thirdPlace: stats.performance?.thirdPlace || 0,
        totalLosses: stats.performance?.totalLosses || 0,
        averagePlacement: stats.performance?.averagePlacement ?? null,
        matchWins: stats.performance?.matchWins || 0,
        matchWinRate,
        gameWins: stats.performance?.gameWins || 0,
        gameWinRate,
        twoOhsGiven: stats.performance?.twoOhsGiven || 0,
        twoOhsReceived: stats.performance?.twoOhsReceived || 0,
        longestWinStreak: stats.performance?.longestWinStreak || 0,
        longestLossStreak: stats.performance?.longestLossStreak || 0,

        // Economy stats
        totalPointsEarned: stats.economy?.totalPointsEarned || 0,
        totalPointsSpent: stats.economy?.totalPointsSpent || 0,
        currentBalance: stats.economy?.currentBalance || 0,
        averagePointsPerSession: stats.economy?.averagePointsPerSession || 0,
        timesVPTaken: stats.economy?.timesVPTaken || 0,
        timesVPPassed: stats.economy?.timesVPPassed || 0,

        // Participation stats
        totalSessions: stats.participation?.totalSessions || 0,
        sessionsSinceLastVP: stats.participation?.sessionsSinceLastVP || 0,
        timesAsModerator: stats.participation?.timesAsModerator || 0,
        banlistSuggestionsChosen: stats.participation?.banlistSuggestionsChosen || 0,

        // Banlist voting stats
        averageVotesPerSuggestion: stats.banlistVoting?.averageVotesPerSuggestion ?? null,
        averageSuggestionsWithThreshold: stats.banlistVoting?.averageSuggestionsWithThreshold ?? null,
        averageChosenPerSession: stats.banlistVoting?.averageChosenPerSession ?? null,
        timesChoseOwnSuggestion: stats.banlistVoting?.timesChoseOwnSuggestion ?? 0,

        // Deck building stats
        averageUniqueCards: stats.deckBuilding?.averageUniqueCards ?? 0,
        averageCardsChanged: stats.deckBuilding?.averageCardsChanged ?? 0
      });
    }

    return {
      success: true,
      players: allStats
    };
  } catch (error) {
    console.error("Error calculating all players stats:", error);
    return { success: false, error: "Failed to calculate all players stats" };
  }
}

// Set purchase statistics types
export interface SetPurchaseStats {
  setId: number;
  setName: string;
  setCode: string;
  totalPurchases: number;
  totalPointsSpent: number;
  averageSpendPerPlayer: number;
  averageImmediateROI: number | null;
  topSpender: {
    playerName: string;
    amountSpent: number;
  } | null;
}

export interface SetPurchaseStatsResult {
  success: boolean;
  error?: string;
  stats?: SetPurchaseStats[];
}

// Get set purchase statistics
export async function getSetPurchaseStats(): Promise<SetPurchaseStatsResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get all transactions with related set, player, and session data
    const transactions = await prisma.transaction.findMany({
      include: {
        set: {
          select: {
            id: true,
            setName: true,
            setCode: true
          }
        },
        player: {
          select: {
            id: true,
            name: true
          }
        },
        session: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Get all wallet transactions for ROI calculation
    const walletTransactions = await prisma.walletTransaction.findMany({
      where: {
        type: 'VICTORY_POINT_AWARD',
        amount: { gt: 0 }
      },
      select: {
        wallet: {
          select: {
            playerId: true
          }
        },
        sessionId: true,
        amount: true
      }
    });

    // Create a map for quick wallet earning lookups: playerId_sessionId -> earnings
    const earningsMap = new Map<string, number>();
    walletTransactions.forEach(wt => {
      if (wt.sessionId) {
        const key = `${wt.wallet.playerId}_${wt.sessionId}`;
        earningsMap.set(key, (earningsMap.get(key) || 0) + wt.amount);
      }
    });

    // Group by set and calculate statistics
    const setStatsMap = new Map<number, {
      setId: number;
      setName: string;
      setCode: string;
      totalPurchases: number;
      totalPointsSpent: number;
      uniquePlayers: Set<number>;
      roiValues: number[];
      playerSpending: Map<number, { name: string; amount: number }>;
    }>();

    transactions.forEach(transaction => {
      const setId = transaction.set.id;

      if (!setStatsMap.has(setId)) {
        setStatsMap.set(setId, {
          setId,
          setName: transaction.set.setName,
          setCode: transaction.set.setCode,
          totalPurchases: 0,
          totalPointsSpent: 0,
          uniquePlayers: new Set(),
          roiValues: [],
          playerSpending: new Map()
        });
      }

      const setStats = setStatsMap.get(setId)!;
      setStats.totalPurchases += 1;
      setStats.totalPointsSpent += transaction.amount;
      setStats.uniquePlayers.add(transaction.player.id);

      // Track player spending
      const currentSpending = setStats.playerSpending.get(transaction.player.id);
      if (currentSpending) {
        currentSpending.amount += transaction.amount;
      } else {
        setStats.playerSpending.set(transaction.player.id, {
          name: transaction.player.name,
          amount: transaction.amount
        });
      }

      // Calculate ROI for this transaction if session exists
      if (transaction.session) {
        const key = `${transaction.player.id}_${transaction.session.id}`;
        const earnings = earningsMap.get(key) || 0;
        const roi = (earnings / transaction.amount) * 100;
        setStats.roiValues.push(roi);
      }
    });

    // Convert map to array and calculate final stats
    const stats: SetPurchaseStats[] = Array.from(setStatsMap.values()).map(setStat => {
      const averageSpendPerPlayer = setStat.uniquePlayers.size > 0
        ? Math.round(setStat.totalPointsSpent / setStat.uniquePlayers.size)
        : 0;

      const averageImmediateROI = setStat.roiValues.length > 0
        ? Math.round((setStat.roiValues.reduce((sum, roi) => sum + roi, 0) / setStat.roiValues.length) * 10) / 10
        : null;

      // Find top spender
      let topSpender: { playerName: string; amountSpent: number } | null = null;
      if (setStat.playerSpending.size > 0) {
        const spenders = Array.from(setStat.playerSpending.values());
        const top = spenders.reduce((max, current) =>
          current.amount > max.amount ? current : max
        );
        topSpender = {
          playerName: top.name,
          amountSpent: top.amount
        };
      }

      return {
        setId: setStat.setId,
        setName: setStat.setName,
        setCode: setStat.setCode,
        totalPurchases: setStat.totalPurchases,
        totalPointsSpent: setStat.totalPointsSpent,
        averageSpendPerPlayer,
        averageImmediateROI,
        topSpender
      };
    });

    // Sort by total purchases (descending)
    stats.sort((a, b) => b.totalPurchases - a.totalPurchases);

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error("Error calculating set purchase stats:", error);
    return { success: false, error: "Failed to calculate set purchase statistics" };
  }
}

// ============================================================================
// PHASE 1: NEW STATS (Tier 1 - Quick Wins)
// ============================================================================

// Type definitions for new stats
export interface PlacementConsistencyStat {
  playerId: number;
  playerName: string;
  sessionsPlayed: number;
  averagePlacement: number;
  standardDeviation: number;
  interpretation: string; // "Highly Consistent", "Moderately Consistent", "Volatile"
}

export interface PlacementConsistencyResult {
  success: boolean;
  error?: string;
  playerStats?: PlacementConsistencyStat;
  allPlayersStats?: PlacementConsistencyStat[];
}

export interface AverageROIStat {
  playerId: number;
  playerName: string;
  averageROI: number; // Average Immediate ROI percentage across spending sessions
  totalEarned: number;
  totalSpent: number;
  spendingSessions: number; // Number of sessions where player spent points
  interpretation: string; // "Profitable", "Breaking Even", "Loss"
}

export interface AverageROIResult {
  success: boolean;
  error?: string;
  playerStats?: AverageROIStat;
  allPlayersStats?: AverageROIStat[];
}

export interface CardSynergyPair {
  card1Id: number;
  card1Name: string;
  card2Id: number;
  card2Name: string;
  appearanceCount: number;
  percentage: number; // Percentage of top-3 decklists containing both cards
}

export interface CardSynergyResult {
  success: boolean;
  error?: string;
  synergies?: CardSynergyPair[];
  totalDecksAnalyzed?: number;
}

export interface ComebackStat {
  playerId: number;
  playerName: string;
  totalMatchWins: number;
  twoZeroWins: number;
  twoOneWins: number;
  comebackPercentage: number;
  interpretation: string; // "Clutch Player", "Dominant Player", "Balanced"
}

export interface ComebackResult {
  success: boolean;
  error?: string;
  playerStats?: ComebackStat;
  allPlayersStats?: ComebackStat[];
}

export interface DeckUniquenessStat {
  playerId: number;
  playerName: string;
  averageUniqueness: number; // Average percentage of unique cards compared to opponents (0-100%)
  sessionsAnalyzed: number;
  interpretation: string; // "Unique Deck Builder", "Meta Player", "Balanced"
}

export interface DeckUniquenessResult {
  success: boolean;
  error?: string;
  playerStats?: DeckUniquenessStat;
  allPlayersStats?: DeckUniquenessStat[];
}

/**
 * Calculate placement consistency score for a player
 * Lower standard deviation = more consistent
 */
export async function getPlacementConsistency(
  playerId?: number
): Promise<PlacementConsistencyResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // If no playerId provided, calculate for current user
    const targetPlayerId = playerId ?? user.playerId;

    if (targetPlayerId) {
      // Single player stats
      const placements = await getAllPlacementsForPlayer(targetPlayerId);

      if (placements.length === 0) {
        return { success: false, error: "No completed sessions found for player" };
      }

      const player = await prisma.player.findUnique({
        where: { id: targetPlayerId },
        select: { name: true }
      });

      if (!player) {
        return { success: false, error: "Player not found" };
      }

      const placementValues = placements.map(p => p.placement);
      const avgPlacement = placementValues.reduce((sum, p) => sum + p, 0) / placementValues.length;

      // Calculate standard deviation
      const squaredDiffs = placementValues.map(p => Math.pow(p - avgPlacement, 2));
      const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / placementValues.length;
      const stdDev = Math.sqrt(variance);

      // Interpret consistency
      let interpretation = "Moderately Consistent";
      if (stdDev < 1.0) interpretation = "Highly Consistent";
      else if (stdDev > 1.8) interpretation = "Volatile";

      return {
        success: true,
        playerStats: {
          playerId: targetPlayerId,
          playerName: player.name,
          sessionsPlayed: placements.length,
          averagePlacement: Math.round(avgPlacement * 10) / 10,
          standardDeviation: Math.round(stdDev * 100) / 100,
          interpretation
        }
      };
    } else {
      // All players stats
      const players = await getAllPlayersQuery();
      const allStats: PlacementConsistencyStat[] = [];

      for (const player of players) {
        const placements = await getAllPlacementsForPlayer(player.id);

        if (placements.length < 2) continue; // Need at least 2 sessions for meaningful stddev

        const placementValues = placements.map(p => p.placement);
        const avgPlacement = placementValues.reduce((sum, p) => sum + p, 0) / placementValues.length;

        const squaredDiffs = placementValues.map(p => Math.pow(p - avgPlacement, 2));
        const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / placementValues.length;
        const stdDev = Math.sqrt(variance);

        let interpretation = "Moderately Consistent";
        if (stdDev < 1.0) interpretation = "Highly Consistent";
        else if (stdDev > 1.8) interpretation = "Volatile";

        allStats.push({
          playerId: player.id,
          playerName: player.name,
          sessionsPlayed: placements.length,
          averagePlacement: Math.round(avgPlacement * 10) / 10,
          standardDeviation: Math.round(stdDev * 100) / 100,
          interpretation
        });
      }

      // Sort by standard deviation (ascending = most consistent first)
      allStats.sort((a, b) => a.standardDeviation - b.standardDeviation);

      return {
        success: true,
        allPlayersStats: allStats
      };
    }
  } catch (error) {
    console.error("Error calculating placement consistency:", error);
    return { success: false, error: "Failed to calculate placement consistency" };
  }
}

/**
 * Calculate Average Immediate ROI (Return on Investment) for a player
 * For each session where the player spent points, calculates ROI for that session
 * (wallet points earned in session ÷ points spent in session × 100)
 * Then averages across all spending sessions
 */
export async function getAverageROI(playerId?: number): Promise<AverageROIResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const targetPlayerId = playerId ?? user.playerId;

    if (targetPlayerId) {
      // Single player stats
      const player = await prisma.player.findUnique({
        where: { id: targetPlayerId },
        select: { name: true }
      });

      if (!player) {
        return { success: false, error: "Player not found" };
      }

      // Get all shop purchases grouped by session
      const shopPurchases = await prisma.transaction.findMany({
        where: {
          playerId: targetPlayerId,
          sessionId: { not: null } // Only include transactions with a session
        },
        orderBy: { date: 'asc' }
      });

      // Get all wallet earnings by session
      const walletTransactions = await prisma.walletTransaction.findMany({
        where: {
          wallet: { playerId: targetPlayerId },
          amount: { gt: 0 }, // Only positive (earnings)
          type: 'VICTORY_POINT_AWARD' // Only count VP awards, not other earnings
        }
      });

      // Group transactions by session
      const spendingBySession = new Map<number, number>();
      shopPurchases.forEach(purchase => {
        if (purchase.sessionId) {
          const current = spendingBySession.get(purchase.sessionId) || 0;
          spendingBySession.set(purchase.sessionId, current + purchase.amount);
        }
      });

      // Group earnings by session
      const earningsBySession = new Map<number, number>();
      walletTransactions.forEach(transaction => {
        if (transaction.sessionId) {
          const current = earningsBySession.get(transaction.sessionId) || 0;
          earningsBySession.set(transaction.sessionId, current + transaction.amount);
        }
      });

      // Calculate ROI for each session where player spent
      const sessionROIs: number[] = [];
      let totalEarned = 0;
      let totalSpent = 0;

      // Iterate through all sessions where player spent points
      for (const [sessionId, spent] of spendingBySession.entries()) {
        const earned = earningsBySession.get(sessionId) || 0;

        totalEarned += earned;
        totalSpent += spent;

        // Calculate ROI for this session
        const roi = (earned / spent) * 100;
        sessionROIs.push(roi);
      }

      // Calculate average ROI across spending sessions
      const averageROI = sessionROIs.length > 0
        ? Math.round((sessionROIs.reduce((sum, roi) => sum + roi, 0) / sessionROIs.length) * 10) / 10
        : 0;

      // Interpretation
      let interpretation = "Breaking Even";
      if (averageROI > 110) interpretation = "Profitable";
      else if (averageROI < 90) interpretation = "Loss";

      return {
        success: true,
        playerStats: {
          playerId: targetPlayerId,
          playerName: player.name,
          averageROI,
          totalEarned,
          totalSpent,
          spendingSessions: sessionROIs.length,
          interpretation
        }
      };
    } else {
      // All players stats
      const players = await getAllPlayersQuery();
      const allStats: AverageROIStat[] = [];

      for (const player of players) {
        const result = await getAverageROI(player.id);
        if (result.success && result.playerStats) {
          allStats.push(result.playerStats);
        }
      }

      // Sort by averageROI (descending = best ROI first)
      allStats.sort((a, b) => b.averageROI - a.averageROI);

      return {
        success: true,
        allPlayersStats: allStats
      };
    }
  } catch (error) {
    console.error("Error calculating average ROI:", error);
    return { success: false, error: "Failed to calculate average ROI" };
  }
}

/**
 * Calculate card synergy pairs from top-3 decklists
 * Finds cards that frequently appear together in winning decks
 */
export async function getCardSynergies(
  minAppearances: number = 2
): Promise<CardSynergyResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get all completed sessions
    const sessions = await getCompletedSessionsQuery();

    // Get excluded cards
    const excludedCards = await prisma.synergyExcludedCard.findMany({
      select: { cardId: true }
    });
    const excludedCardIds = new Set(excludedCards.map(e => e.cardId));

    // Get all decklists for top 3 placements
    const allTopDecklists: number[][] = [];

    for (const session of sessions) {
      const topPlayers = await getPlayersInPlacementRange(session.id, 1, 3);

      for (const playerId of topPlayers) {
        const decklist = await prisma.decklist.findFirst({
          where: { playerId, sessionId: session.id }
        });

        if (decklist) {
          const cardIds = parseCardIds(decklist);
          // Filter out excluded cards
          const filteredCardIds = cardIds.filter(id => !excludedCardIds.has(id));
          allTopDecklists.push(filteredCardIds);
        }
      }
    }

    if (allTopDecklists.length === 0) {
      return { success: true, synergies: [], totalDecksAnalyzed: 0 };
    }

    // Find card pairs that appear together
    const pairCounts = new Map<string, number>();

    for (const deckCards of allTopDecklists) {
      const uniqueCards = [...new Set(deckCards)].sort((a, b) => a - b);

      // Generate all pairs from this deck
      for (let i = 0; i < uniqueCards.length; i++) {
        for (let j = i + 1; j < uniqueCards.length; j++) {
          const pairKey = `${uniqueCards[i]}-${uniqueCards[j]}`;
          pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1);
        }
      }
    }

    // Filter pairs that appear together at least minAppearances times
    const synergies: CardSynergyPair[] = [];
    const processedPairs: string[] = [];

    for (const [pairKey, count] of pairCounts.entries()) {
      if (count >= minAppearances) {
        processedPairs.push(pairKey);
      }
    }

    // Fetch card names for all pairs
    if (processedPairs.length > 0) {
      const allCardIds = new Set<number>();
      processedPairs.forEach(pairKey => {
        const [card1Id, card2Id] = pairKey.split('-').map(Number);
        allCardIds.add(card1Id);
        allCardIds.add(card2Id);
      });

      const cards = await prisma.card.findMany({
        where: { id: { in: Array.from(allCardIds) } },
        select: { id: true, cardName: true }
      });

      const cardNameMap = new Map(cards.map(c => [c.id, c.cardName]));

      for (const pairKey of processedPairs) {
        const [card1Id, card2Id] = pairKey.split('-').map(Number);
        const count = pairCounts.get(pairKey)!;
        const percentage = Math.round((count / allTopDecklists.length) * 1000) / 10;

        synergies.push({
          card1Id,
          card1Name: cardNameMap.get(card1Id) || `Unknown Card ${card1Id}`,
          card2Id,
          card2Name: cardNameMap.get(card2Id) || `Unknown Card ${card2Id}`,
          appearanceCount: count,
          percentage
        });
      }
    }

    // Sort by appearance count (descending)
    synergies.sort((a, b) => b.appearanceCount - a.appearanceCount);

    return {
      success: true,
      synergies: synergies.slice(0, 50), // Return top 50 synergies
      totalDecksAnalyzed: allTopDecklists.length
    };
  } catch (error) {
    console.error("Error calculating card synergies:", error);
    return { success: false, error: "Failed to calculate card synergies" };
  }
}

/**
 * Calculate comeback percentage (2-1 wins vs 2-0 wins)
 * Shows who wins close games vs who dominates
 */
export async function getComebackPercentage(playerId?: number): Promise<ComebackResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const targetPlayerId = playerId ?? user.playerId;

    if (targetPlayerId) {
      // Single player stats
      const player = await prisma.player.findUnique({
        where: { id: targetPlayerId },
        select: { name: true }
      });

      if (!player) {
        return { success: false, error: "Player not found" };
      }

      const pairings = await getPairingsForPlayer(targetPlayerId);

      let twoZeroWins = 0;
      let twoOneWins = 0;

      for (const pairing of pairings) {
        const result = getMatchResult(pairing, targetPlayerId);
        if (result === "win") {
          const isPlayer1 = pairing.player1Id === targetPlayerId;
          const playerWins = isPlayer1 ? pairing.player1wins : pairing.player2wins;
          const opponentWins = isPlayer1 ? pairing.player2wins : pairing.player1wins;

          if (playerWins === 2 && opponentWins === 0) {
            twoZeroWins++;
          } else if (playerWins === 2 && opponentWins === 1) {
            twoOneWins++;
          }
        }
      }

      const totalMatchWins = twoZeroWins + twoOneWins;
      const comebackPercentage = totalMatchWins > 0
        ? Math.round((twoOneWins / totalMatchWins) * 1000) / 10
        : 0;

      let interpretation = "Balanced";
      if (comebackPercentage > 60) interpretation = "Clutch Player";
      else if (comebackPercentage < 40) interpretation = "Dominant Player";

      return {
        success: true,
        playerStats: {
          playerId: targetPlayerId,
          playerName: player.name,
          totalMatchWins,
          twoZeroWins,
          twoOneWins,
          comebackPercentage,
          interpretation
        }
      };
    } else {
      // All players stats
      const players = await getAllPlayersQuery();
      const allStats: ComebackStat[] = [];

      for (const player of players) {
        const pairings = await getPairingsForPlayer(player.id);

        let twoZeroWins = 0;
        let twoOneWins = 0;

        for (const pairing of pairings) {
          const result = getMatchResult(pairing, player.id);
          if (result === "win") {
            const isPlayer1 = pairing.player1Id === player.id;
            const playerWins = isPlayer1 ? pairing.player1wins : pairing.player2wins;
            const opponentWins = isPlayer1 ? pairing.player2wins : pairing.player1wins;

            if (playerWins === 2 && opponentWins === 0) {
              twoZeroWins++;
            } else if (playerWins === 2 && opponentWins === 1) {
              twoOneWins++;
            }
          }
        }

        const totalMatchWins = twoZeroWins + twoOneWins;

        if (totalMatchWins === 0) continue; // Skip players with no match wins

        const comebackPercentage = Math.round((twoOneWins / totalMatchWins) * 1000) / 10;

        let interpretation = "Balanced";
        if (comebackPercentage > 60) interpretation = "Clutch Player";
        else if (comebackPercentage < 40) interpretation = "Dominant Player";

        allStats.push({
          playerId: player.id,
          playerName: player.name,
          totalMatchWins,
          twoZeroWins,
          twoOneWins,
          comebackPercentage,
          interpretation
        });
      }

      // Sort by comeback percentage (descending = most clutch first)
      allStats.sort((a, b) => b.comebackPercentage - a.comebackPercentage);

      return {
        success: true,
        allPlayersStats: allStats
      };
    }
  } catch (error) {
    console.error("Error calculating comeback percentage:", error);
    return { success: false, error: "Failed to calculate comeback percentage" };
  }
}

/**
 * Calculate average deck uniqueness within sessions
 * Measures how different a player's deck is from opponents in each session
 * Uses Jaccard distance: higher percentage = more unique deck choices
 */
export async function getDeckUniqueness(playerId?: number): Promise<DeckUniquenessResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const targetPlayerId = playerId ?? user.playerId;

    if (targetPlayerId) {
      // Single player stats
      const player = await prisma.player.findUnique({
        where: { id: targetPlayerId },
        select: { name: true }
      });

      if (!player) {
        return { success: false, error: "Player not found" };
      }

      // Get all sessions where player submitted a decklist
      const playerDecklists = await prisma.decklist.findMany({
        where: { playerId: targetPlayerId },
        select: { sessionId: true, maindeck: true, sidedeck: true, extradeck: true }
      });

      if (playerDecklists.length === 0) {
        return { success: false, error: "No decklists found for player" };
      }

      const uniquenessScores: number[] = [];

      for (const playerDecklist of playerDecklists) {
        // Get all other decklists from the same session
        const otherDecklists = await prisma.decklist.findMany({
          where: {
            sessionId: playerDecklist.sessionId,
            playerId: { not: targetPlayerId }
          },
          select: { maindeck: true, sidedeck: true, extradeck: true }
        });

        if (otherDecklists.length === 0) continue; // Skip sessions with no opponents

        // Get unique cards in player's deck
        const playerCards = new Set(parsePartialDecklistCards(playerDecklist));

        // Calculate Jaccard distance from each opponent
        const distances: number[] = [];
        for (const opponentDecklist of otherDecklists) {
          const opponentCards = new Set(parsePartialDecklistCards(opponentDecklist));

          // Calculate intersection and union
          const intersection = new Set([...playerCards].filter(c => opponentCards.has(c)));
          const union = new Set([...playerCards, ...opponentCards]);

          // Jaccard distance = 1 - (intersection / union)
          // Higher distance = more different
          const jaccardDistance = union.size > 0
            ? 1 - (intersection.size / union.size)
            : 0;

          distances.push(jaccardDistance);
        }

        // Average distance from all opponents in this session
        const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
        uniquenessScores.push(avgDistance * 100); // Convert to percentage
      }

      // Average uniqueness across all sessions
      const averageUniqueness = uniquenessScores.length > 0
        ? Math.round((uniquenessScores.reduce((sum, s) => sum + s, 0) / uniquenessScores.length) * 10) / 10
        : 0;

      // Interpretation
      let interpretation = "Balanced";
      if (averageUniqueness > 60) interpretation = "Unique Deck Builder";
      else if (averageUniqueness < 40) interpretation = "Meta Player";

      return {
        success: true,
        playerStats: {
          playerId: targetPlayerId,
          playerName: player.name,
          averageUniqueness,
          sessionsAnalyzed: uniquenessScores.length,
          interpretation
        }
      };
    } else {
      // All players stats
      const players = await getAllPlayersQuery();
      const allStats: DeckUniquenessStat[] = [];

      for (const player of players) {
        const result = await getDeckUniqueness(player.id);
        if (result.success && result.playerStats) {
          allStats.push(result.playerStats);
        }
      }

      // Sort by uniqueness (descending = most unique first)
      allStats.sort((a, b) => b.averageUniqueness - a.averageUniqueness);

      return {
        success: true,
        allPlayersStats: allStats
      };
    }
  } catch (error) {
    console.error("Error calculating deck uniqueness:", error);
    return { success: false, error: "Failed to calculate deck uniqueness" };
  }
}

// ============================================================================
// PHASE 2: DEEP INSIGHTS (Tier 2 - Competitive Intelligence)
// ============================================================================

// Type definitions for Phase 2 stats
export interface MatchupRecord {
  opponentId: number;
  opponentName: string;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  gameWins: number;
  gameLosses: number;
  winRate: number;
}

export interface MatchupMatrixResult {
  success: boolean;
  error?: string;
  matrix?: {
    [playerId: number]: MatchupRecord[];
  };
  allPlayers?: { id: number; name: string }[];
}

export interface CardSuccessRate {
  cardId: number;
  cardName: string;
  tier1Usage: number; // 1st-2nd place inclusion rate (%)
  tier2Usage: number; // 3rd-4th place inclusion rate (%)
  tier3Usage: number; // 5th-6th place inclusion rate (%)
  tier1Decks: number; // Number of tier 1 decks with this card
  tier2Decks: number;
  tier3Decks: number;
  totalUsage: number;
}

export interface CardSuccessResult {
  success: boolean;
  error?: string;
  cards?: CardSuccessRate[];
  totalTier1Decks?: number;
  totalTier2Decks?: number;
  totalTier3Decks?: number;
}

export interface DeckDiversityStat {
  playerId: number;
  playerName: string;
  uniqueCards: number;
  totalDecks: number;
  averageCardsPerDeck: number;
  diversityScore: number; // Unique cards / total card slots
  interpretation: string; // "Deck Innovator", "Archetype Specialist", "Balanced"
}

export interface DeckDiversityResult {
  success: boolean;
  error?: string;
  playerStats?: DeckDiversityStat;
  allPlayersStats?: DeckDiversityStat[];
}

export interface VotingBloc {
  player1Id: number;
  player1Name: string;
  player2Id: number;
  player2Name: string;
  sharedVotes: number;
  totalVotes: number;
  overlapPercentage: number;
}

export interface VotingBlocResult {
  success: boolean;
  error?: string;
  blocs?: VotingBloc[];
  matrix?: {
    [playerId: number]: {
      [otherPlayerId: number]: number; // Overlap percentage
    };
  };
}

/**
 * Get matchup matrix for all players
 * Complete win/loss grid showing head-to-head records
 */
export async function getMatchupMatrix(): Promise<MatchupMatrixResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const players = await getAllPlayersQuery();
    const matrix: { [playerId: number]: MatchupRecord[] } = {};

    for (const player of players) {
      const opponents = await getAllOpponentsQuery(player.id);
      const matchupRecords: MatchupRecord[] = [];

      for (const opponentId of opponents) {
        const opponent = players.find(p => p.id === opponentId);
        if (!opponent) continue;

        const record = await getHeadToHeadRecordQuery(player.id, opponentId);

        const totalMatches = record.player1Wins + record.player2Wins + record.draws;
        const winRate = totalMatches > 0
          ? Math.round((record.player1Wins / totalMatches) * 1000) / 10
          : 0;

        matchupRecords.push({
          opponentId,
          opponentName: opponent.name,
          matchWins: record.player1Wins,
          matchLosses: record.player2Wins,
          matchDraws: record.draws,
          gameWins: 0, // Not tracked in getHeadToHeadRecordQuery, could be added later
          gameLosses: 0,
          winRate
        });
      }

      // Sort by win rate (descending)
      matchupRecords.sort((a, b) => b.winRate - a.winRate);

      matrix[player.id] = matchupRecords;
    }

    return {
      success: true,
      matrix,
      allPlayers: players.map(p => ({ id: p.id, name: p.name }))
    };
  } catch (error) {
    console.error("Error calculating matchup matrix:", error);
    return { success: false, error: "Failed to calculate matchup matrix" };
  }
}

/**
 * Calculate card success rate by placement tier
 * Shows which cards appear most in winning vs losing decks
 */
export async function getCardSuccessByPlacement(
  minDecks: number = 2
): Promise<CardSuccessResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const sessions = await getCompletedSessionsQuery();

    // Collect decklists by tier
    const tier1Cards: number[] = []; // 1st-2nd place
    const tier2Cards: number[] = []; // 3rd-4th place
    const tier3Cards: number[] = []; // 5th-6th place

    let tier1DeckCount = 0;
    let tier2DeckCount = 0;
    let tier3DeckCount = 0;

    for (const session of sessions) {
      // Tier 1: 1st-2nd place
      const tier1Players = await getPlayersInPlacementRange(session.id, 1, 2);
      for (const playerId of tier1Players) {
        const decklist = await prisma.decklist.findFirst({
          where: { playerId, sessionId: session.id }
        });
        if (decklist) {
          tier1Cards.push(...parseCardIds(decklist));
          tier1DeckCount++;
        }
      }

      // Tier 2: 3rd-4th place
      const tier2Players = await getPlayersInPlacementRange(session.id, 3, 4);
      for (const playerId of tier2Players) {
        const decklist = await prisma.decklist.findFirst({
          where: { playerId, sessionId: session.id }
        });
        if (decklist) {
          tier2Cards.push(...parseCardIds(decklist));
          tier2DeckCount++;
        }
      }

      // Tier 3: 5th-6th place
      const tier3Players = await getPlayersInPlacementRange(session.id, 5, 6);
      for (const playerId of tier3Players) {
        const decklist = await prisma.decklist.findFirst({
          where: { playerId, sessionId: session.id }
        });
        if (decklist) {
          tier3Cards.push(...parseCardIds(decklist));
          tier3DeckCount++;
        }
      }
    }

    // Count unique card appearances per tier
    const countCardAppearances = (cards: number[]): Map<number, number> => {
      const counts = new Map<number, number>();
      cards.forEach(cardId => {
        counts.set(cardId, (counts.get(cardId) || 0) + 1);
      });
      return counts;
    };

    const tier1Counts = countCardAppearances(tier1Cards);
    const tier2Counts = countCardAppearances(tier2Cards);
    const tier3Counts = countCardAppearances(tier3Cards);

    // Get all unique card IDs
    const allCardIds = new Set([
      ...tier1Counts.keys(),
      ...tier2Counts.keys(),
      ...tier3Counts.keys()
    ]);

    // Fetch card names
    const cards = await prisma.card.findMany({
      where: { id: { in: Array.from(allCardIds) } },
      select: { id: true, cardName: true }
    });

    const cardNameMap = new Map(cards.map(c => [c.id, c.cardName]));

    // Calculate success rates
    const results: CardSuccessRate[] = [];

    for (const cardId of allCardIds) {
      const tier1Decks = tier1Counts.get(cardId) || 0;
      const tier2Decks = tier2Counts.get(cardId) || 0;
      const tier3Decks = tier3Counts.get(cardId) || 0;

      const totalDecksWithCard = tier1Decks + tier2Decks + tier3Decks;

      // Filter: only include cards that appear in at least minDecks total
      if (totalDecksWithCard < minDecks) continue;

      const tier1Usage = tier1DeckCount > 0
        ? Math.round((tier1Decks / tier1DeckCount) * 1000) / 10
        : 0;
      const tier2Usage = tier2DeckCount > 0
        ? Math.round((tier2Decks / tier2DeckCount) * 1000) / 10
        : 0;
      const tier3Usage = tier3DeckCount > 0
        ? Math.round((tier3Decks / tier3DeckCount) * 1000) / 10
        : 0;

      results.push({
        cardId,
        cardName: cardNameMap.get(cardId) || `Unknown Card ${cardId}`,
        tier1Usage,
        tier2Usage,
        tier3Usage,
        tier1Decks,
        tier2Decks,
        tier3Decks,
        totalUsage: totalDecksWithCard
      });
    }

    // Sort by tier1Usage (descending) - cards that appear most in winning decks
    results.sort((a, b) => b.tier1Usage - a.tier1Usage);

    return {
      success: true,
      cards: results,
      totalTier1Decks: tier1DeckCount,
      totalTier2Decks: tier2DeckCount,
      totalTier3Decks: tier3DeckCount
    };
  } catch (error) {
    console.error("Error calculating card success by placement:", error);
    return { success: false, error: "Failed to calculate card success rates" };
  }
}

/**
 * Calculate deck diversity score for players
 * Shows who uses the most varied cards across sessions
 */
export async function getDeckDiversity(playerId?: number): Promise<DeckDiversityResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const targetPlayerId = playerId ?? user.playerId;

    if (targetPlayerId) {
      // Single player stats
      const player = await prisma.player.findUnique({
        where: { id: targetPlayerId },
        select: { name: true }
      });

      if (!player) {
        return { success: false, error: "Player not found" };
      }

      const decklists = await prisma.decklist.findMany({
        where: { playerId: targetPlayerId }
      });

      if (decklists.length === 0) {
        return { success: false, error: "No decklists found for player" };
      }

      const allCardsUsed = new Set<number>();
      let totalCardSlots = 0;

      for (const decklist of decklists) {
        const cardIds = parseCardIds(decklist);
        cardIds.forEach(id => allCardsUsed.add(id));
        totalCardSlots += cardIds.length;
      }

      const uniqueCards = allCardsUsed.size;
      const averageCardsPerDeck = Math.round(totalCardSlots / decklists.length);
      const diversityScore = Math.round((uniqueCards / totalCardSlots) * 1000) / 10;

      let interpretation = "Balanced";
      if (diversityScore > 40) interpretation = "Deck Innovator";
      else if (diversityScore < 25) interpretation = "Archetype Specialist";

      return {
        success: true,
        playerStats: {
          playerId: targetPlayerId,
          playerName: player.name,
          uniqueCards,
          totalDecks: decklists.length,
          averageCardsPerDeck,
          diversityScore,
          interpretation
        }
      };
    } else {
      // All players stats
      const players = await getAllPlayersQuery();
      const allStats: DeckDiversityStat[] = [];

      for (const player of players) {
        const decklists = await prisma.decklist.findMany({
          where: { playerId: player.id }
        });

        if (decklists.length === 0) continue;

        const allCardsUsed = new Set<number>();
        let totalCardSlots = 0;

        for (const decklist of decklists) {
          const cardIds = parseCardIds(decklist);
          cardIds.forEach(id => allCardsUsed.add(id));
          totalCardSlots += cardIds.length;
        }

        const uniqueCards = allCardsUsed.size;
        const averageCardsPerDeck = Math.round(totalCardSlots / decklists.length);
        const diversityScore = Math.round((uniqueCards / totalCardSlots) * 1000) / 10;

        let interpretation = "Balanced";
        if (diversityScore > 40) interpretation = "Deck Innovator";
        else if (diversityScore < 25) interpretation = "Archetype Specialist";

        allStats.push({
          playerId: player.id,
          playerName: player.name,
          uniqueCards,
          totalDecks: decklists.length,
          averageCardsPerDeck,
          diversityScore,
          interpretation
        });
      }

      // Sort by diversity score (descending = most innovative first)
      allStats.sort((a, b) => b.diversityScore - a.diversityScore);

      return {
        success: true,
        allPlayersStats: allStats
      };
    }
  } catch (error) {
    console.error("Error calculating deck diversity:", error);
    return { success: false, error: "Failed to calculate deck diversity" };
  }
}

export interface SessionDiversityPoint {
  sessionNumber: number;
  sessionName: string;
  averageDiversity: number;
  deckCount: number;
}

export interface SessionDiversityResult {
  success: boolean;
  error?: string;
  dataPoints?: SessionDiversityPoint[];
}

/**
 * Calculate deck diversity for each completed session
 * Shows how different decks were from each other over time
 */
export async function getSessionDiversity(
  includeMaindeck: boolean = true,
  includeExtradeck: boolean = true,
  includeSidedeck: boolean = true
): Promise<SessionDiversityResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get all completed sessions
    const sessions = await getCompletedSessionsQuery();
    const dataPoints: SessionDiversityPoint[] = [];

    for (const session of sessions) {
      // Get all decklists for this session
      const decklists = await prisma.decklist.findMany({
        where: { sessionId: session.id },
        select: { maindeck: true, sidedeck: true, extradeck: true }
      });

      if (decklists.length < 2) {
        // Need at least 2 decks to compare
        continue;
      }

      // Convert each decklist to a set of unique card IDs (filtering by selected parts)
      const deckCardSets = decklists.map(decklist => {
        const maindeck = (includeMaindeck && Array.isArray(decklist.maindeck) ? decklist.maindeck : []) as number[];
        const sidedeck = (includeSidedeck && Array.isArray(decklist.sidedeck) ? decklist.sidedeck : []) as number[];
        const extradeck = (includeExtradeck && Array.isArray(decklist.extradeck) ? decklist.extradeck : []) as number[];
        const cards = [...maindeck, ...sidedeck, ...extradeck];
        return new Set(cards);
      });

      // Calculate Jaccard distance between every pair of decks
      const distances: number[] = [];
      for (let i = 0; i < deckCardSets.length; i++) {
        for (let j = i + 1; j < deckCardSets.length; j++) {
          const deck1 = deckCardSets[i];
          const deck2 = deckCardSets[j];

          // Calculate intersection and union
          const intersection = new Set([...deck1].filter(c => deck2.has(c)));
          const union = new Set([...deck1, ...deck2]);

          // Jaccard distance = 1 - (intersection / union)
          const jaccardDistance = union.size > 0
            ? 1 - (intersection.size / union.size)
            : 0;

          distances.push(jaccardDistance * 100); // Convert to percentage
        }
      }

      // Average distance across all pairs
      const averageDiversity = distances.length > 0
        ? Math.round((distances.reduce((sum, d) => sum + d, 0) / distances.length) * 10) / 10
        : 0;

      dataPoints.push({
        sessionNumber: session.number,
        sessionName: `Session ${session.number}`,
        averageDiversity,
        deckCount: decklists.length
      });
    }

    return {
      success: true,
      dataPoints
    };
  } catch (error) {
    console.error("Error calculating session diversity:", error);
    return { success: false, error: "Failed to calculate session diversity" };
  }
}

/**
 * Calculate voting bloc detection
 * Shows which players vote similarly (potential alliances)
 */
export async function getVotingBlocs(): Promise<VotingBlocResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const players = await getAllPlayersQuery();

    // Get all votes for each player
    const playerVotes = new Map<number, Set<number>>(); // playerId -> Set of suggestionIds voted for

    for (const player of players) {
      const votes = await prisma.banlistSuggestionVote.findMany({
        where: { playerId: player.id },
        select: { suggestionId: true }
      });

      playerVotes.set(player.id, new Set(votes.map(v => v.suggestionId)));
    }

    // Calculate overlap for all player pairs
    const blocs: VotingBloc[] = [];
    const matrix: { [playerId: number]: { [otherPlayerId: number]: number } } = {};

    for (const player1 of players) {
      matrix[player1.id] = {};

      for (const player2 of players) {
        if (player1.id >= player2.id) continue; // Skip self and duplicates

        const votes1 = playerVotes.get(player1.id) || new Set();
        const votes2 = playerVotes.get(player2.id) || new Set();

        // Calculate shared votes
        const sharedVotes = [...votes1].filter(v => votes2.has(v)).length;
        const totalUniqueVotes = new Set([...votes1, ...votes2]).size;

        if (totalUniqueVotes === 0) continue; // Skip if neither player has voted

        const overlapPercentage = Math.round((sharedVotes / totalUniqueVotes) * 1000) / 10;

        // Store in matrix (both directions)
        matrix[player1.id][player2.id] = overlapPercentage;
        if (!matrix[player2.id]) matrix[player2.id] = {};
        matrix[player2.id][player1.id] = overlapPercentage;

        blocs.push({
          player1Id: player1.id,
          player1Name: player1.name,
          player2Id: player2.id,
          player2Name: player2.name,
          sharedVotes,
          totalVotes: totalUniqueVotes,
          overlapPercentage
        });
      }
    }

    // Sort by overlap percentage (descending = highest similarity first)
    blocs.sort((a, b) => b.overlapPercentage - a.overlapPercentage);

    return {
      success: true,
      blocs,
      matrix
    };
  } catch (error) {
    console.error("Error calculating voting blocs:", error);
    return { success: false, error: "Failed to calculate voting blocs" };
  }
}
