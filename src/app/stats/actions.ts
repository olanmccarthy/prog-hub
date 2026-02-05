"use server";

import { prisma } from "@lib/prisma";
import { getCurrentUser } from "@lib/auth";
import { COMPARATIVE_STATS } from "./comparativeStatsConfig";

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
    const banlistVoting = calculateBanlistVotingStats(playerId, suggestions, participatedSessions);

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

function calculateBanlistVotingStats(
  playerId: number,
  suggestions: BanlistSuggestionWithVotes[],
  participatedSessions: number
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
        timesChoseOwnSuggestion: stats.banlistVoting?.timesChoseOwnSuggestion ?? 0
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
