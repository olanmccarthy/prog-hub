'use server';

import { prisma } from '@lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyNewSessionWithPairings } from '@lib/discordClient';
import { getCurrentUser } from '@lib/auth';

export interface RequirementStatus {
  met: boolean;
  message: string;
}

export interface SessionStatusResult {
  success: boolean;
  error?: string;
  activeSession: {
    id: number;
    number: number;
    setName: string | null;
  } | null;
  nextSession: {
    id: number;
    number: number;
    setName: string | null;
  } | null;
  canStartSession: boolean;
  canCompleteSession: boolean;
  startReasons: string[];
  completeReasons: string[];
  requirements: {
    placementsFilled: RequirementStatus;
    decklistsSubmitted: RequirementStatus;
    suggestionsSubmitted: RequirementStatus;
    nextBanlistExists: RequirementStatus;
  };
}

export interface StartSessionResult {
  success: boolean;
  error?: string;
  sessionId?: number;
}

export interface CompleteSessionResult {
  success: boolean;
  error?: string;
  sessionNumber?: number;
}

/**
 * Get session status and validation for start/complete operations
 */
export async function getSessionStatus(): Promise<SessionStatusResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return {
        success: false,
        error: 'Unauthorized',
        activeSession: null,
        nextSession: null,
        canStartSession: false,
        canCompleteSession: false,
        startReasons: [],
        completeReasons: [],
        requirements: {
          placementsFilled: { met: false, message: 'Unauthorized' },
          decklistsSubmitted: { met: false, message: 'Unauthorized' },
          suggestionsSubmitted: { met: false, message: 'Unauthorized' },
          nextBanlistExists: { met: false, message: 'Unauthorized' },
        },
      };
    }

    // Get active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
      include: { set: true },
    });

    // Get next non-completed session
    const nextSession = await prisma.session.findFirst({
      where: { complete: false },
      orderBy: { number: 'asc' },
      include: { set: true },
    });

    const playerCount = await prisma.player.count();
    const startReasons: string[] = [];
    const completeReasons: string[] = [];

    const requirements = {
      placementsFilled: { met: false, message: '' },
      decklistsSubmitted: { met: false, message: '' },
      suggestionsSubmitted: { met: false, message: '' },
      nextBanlistExists: { met: false, message: '' },
    };

    // Check if we can start a session
    let canStartSession = false;
    if (!activeSession && nextSession) {
      // Check if next session has a banlist
      const nextBanlist = await prisma.banlist.findFirst({
        where: { sessionId: nextSession.number },
      });

      if (nextBanlist) {
        canStartSession = true;
        requirements.nextBanlistExists = {
          met: true,
          message: `Banlist ready for Session ${nextSession.number}`,
        };
      } else {
        startReasons.push(`Session ${nextSession.number} needs a banlist chosen`);
        requirements.nextBanlistExists = {
          met: false,
          message: `No banlist chosen for Session ${nextSession.number}`,
        };
      }
    } else if (activeSession) {
      startReasons.push('A session is currently active and must be completed first');
    } else if (!nextSession) {
      startReasons.push('No sessions available to start');
    }

    // Check if we can complete the active session
    let canCompleteSession = false;
    if (activeSession) {
      // Check if all placement fields are filled
      const placementsFilled = !!(activeSession.first && activeSession.second && activeSession.third &&
          activeSession.fourth && activeSession.fifth && activeSession.sixth);

      requirements.placementsFilled = {
        met: placementsFilled,
        message: placementsFilled
          ? 'All placements filled'
          : 'All placement fields (1st-6th) must be filled',
      };
      if (!placementsFilled) {
        completeReasons.push(requirements.placementsFilled.message);
      }

      // Check if all players have submitted decklists for active session
      const decklistCount = await prisma.decklist.count({
        where: { sessionId: activeSession.id },
      });

      const decklistsComplete = decklistCount >= playerCount;
      requirements.decklistsSubmitted = {
        met: decklistsComplete,
        message: decklistsComplete
          ? `All ${playerCount} decklists submitted`
          : `Not all players have submitted decklists (${decklistCount}/${playerCount})`,
      };
      if (!decklistsComplete) {
        completeReasons.push(requirements.decklistsSubmitted.message);
      }

      // Check if all players have submitted banlist suggestions for active session
      const activeBanlist = await prisma.banlist.findFirst({
        where: { sessionId: activeSession.number },
      });

      if (activeBanlist) {
        const suggestionCount = await prisma.banlistSuggestion.count({
          where: { banlistId: activeBanlist.id },
        });

        const suggestionsComplete = suggestionCount >= playerCount;
        requirements.suggestionsSubmitted = {
          met: suggestionsComplete,
          message: suggestionsComplete
            ? `All ${playerCount} suggestions submitted`
            : `Not all players have submitted suggestions (${suggestionCount}/${playerCount})`,
        };
        if (!suggestionsComplete) {
          completeReasons.push(requirements.suggestionsSubmitted.message);
        }
      } else {
        requirements.suggestionsSubmitted = {
          met: false,
          message: 'Active session does not have a banlist',
        };
        completeReasons.push(requirements.suggestionsSubmitted.message);
      }

      canCompleteSession = completeReasons.length === 0;
    }

    return {
      success: true,
      activeSession: activeSession ? {
        id: activeSession.id,
        number: activeSession.number,
        setName: activeSession.set?.setName || null,
      } : null,
      nextSession: nextSession ? {
        id: nextSession.id,
        number: nextSession.number,
        setName: nextSession.set?.setName || null,
      } : null,
      canStartSession,
      canCompleteSession,
      startReasons,
      completeReasons,
      requirements,
    };
  } catch (error) {
    console.error('Error getting session status:', error);
    return {
      success: false,
      error: 'Failed to get session status',
      activeSession: null,
      nextSession: null,
      canStartSession: false,
      canCompleteSession: false,
      startReasons: [],
      completeReasons: [],
      requirements: {
        placementsFilled: { met: false, message: 'Validation failed' },
        decklistsSubmitted: { met: false, message: 'Validation failed' },
        suggestionsSubmitted: { met: false, message: 'Validation failed' },
        nextBanlistExists: { met: false, message: 'Validation failed' },
      },
    };
  }
}

/**
 * Generate round-robin pairings with randomized seeding
 */
function generateRoundRobinPairings(playerIds: number[]): { round: number; player1: number; player2: number }[] {
  const pairings: { round: number; player1: number; player2: number }[] = [];
  const numPlayers = playerIds.length;

  // Fisher-Yates shuffle for randomization
  const shuffled = [...playerIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // For odd number of players, add a "bye" (represented as -1)
  if (numPlayers % 2 === 1) {
    shuffled.push(-1);
  }

  const totalPlayers = shuffled.length;
  const numRounds = totalPlayers - 1;

  // Round-robin algorithm (circle method)
  for (let round = 0; round < numRounds; round++) {
    const roundPairings: { round: number; player1: number; player2: number }[] = [];

    for (let i = 0; i < totalPlayers / 2; i++) {
      const player1Idx = i;
      const player2Idx = totalPlayers - 1 - i;

      const player1 = shuffled[player1Idx];
      const player2 = shuffled[player2Idx];

      // Skip pairings with bye (-1)
      if (player1 !== -1 && player2 !== -1) {
        roundPairings.push({
          round: round + 1,
          player1,
          player2,
        });
      }
    }

    pairings.push(...roundPairings);

    // Rotate players (keep first player fixed, rotate others)
    const last = shuffled.pop()!;
    shuffled.splice(1, 0, last);
  }

  return pairings;
}

/**
 * Start a new session
 */
export async function startSession(): Promise<StartSessionResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate first
    const status = await getSessionStatus();
    if (!status.canStartSession) {
      return {
        success: false,
        error: `Cannot start session: ${status.startReasons.join(', ')}`,
      };
    }

    if (!status.nextSession) {
      return { success: false, error: 'No sessions available to start' };
    }

    // Mark session as active and set date
    const session = await prisma.session.update({
      where: { id: status.nextSession.id },
      data: {
        active: true,
        date: new Date(),
      },
    });

    // Get all players
    const players = await prisma.player.findMany();
    const playerIds = players.map(p => p.id);

    // Generate round-robin pairings with randomization
    const pairingData = generateRoundRobinPairings(playerIds);

    // Save pairings to database
    await prisma.pairing.createMany({
      data: pairingData.map(p => ({
        sessionId: session.id,
        round: p.round,
        player1Id: p.player1,
        player2Id: p.player2,
        player1wins: 0,
        player2wins: 0,
      })),
    });

    // Send Discord notification with all pairings
    await notifyNewSessionWithPairings(session.id);

    // Revalidate relevant pages
    revalidatePath('/admin/prog_actions');
    revalidatePath('/play/pairings');
    revalidatePath('/play/standings');
    revalidatePath('/');

    return {
      success: true,
      sessionId: session.id,
    };
  } catch (error) {
    console.error('Error starting session:', error);
    return {
      success: false,
      error: 'Failed to start session',
    };
  }
}

/**
 * Complete the active session
 */
export async function completeSession(): Promise<CompleteSessionResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate first
    const status = await getSessionStatus();
    if (!status.canCompleteSession) {
      return {
        success: false,
        error: `Cannot complete session: ${status.completeReasons.join(', ')}`,
      };
    }

    if (!status.activeSession) {
      return { success: false, error: 'No active session to complete' };
    }

    // Mark session as complete and inactive
    const session = await prisma.session.update({
      where: { id: status.activeSession.id },
      data: {
        complete: true,
        active: false,
      },
    });

    // Revalidate relevant pages
    revalidatePath('/admin/prog_actions');
    revalidatePath('/play/pairings');
    revalidatePath('/play/standings');
    revalidatePath('/');

    return {
      success: true,
      sessionNumber: session.number,
    };
  } catch (error) {
    console.error('Error completing session:', error);
    return {
      success: false,
      error: 'Failed to complete session',
    };
  }
}

export interface AutoVoteResult {
  success: boolean;
  error?: string;
  votesCreated?: number;
}

export interface AutoCreateSuggestionsResult {
  success: boolean;
  error?: string;
  suggestionsCreated?: number;
}

/**
 * TEST FUNCTION: Automatically creates votes from all players to skip to moderator phase
 */
export async function autoVoteAllPlayers(): Promise<AutoVoteResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return { success: false, error: 'Only admins can use this test function' };
    }

    // Get most recent banlist
    const banlist = await prisma.banlist.findFirst({
      orderBy: { id: 'desc' },
    });

    if (!banlist) {
      return { success: false, error: 'No banlist found' };
    }

    // Get all suggestions for this banlist
    const suggestions = await prisma.banlistSuggestion.findMany({
      where: { banlistId: banlist.id },
    });

    if (suggestions.length === 0) {
      return { success: false, error: 'No suggestions found for current banlist' };
    }

    // Get all players
    const players = await prisma.player.findMany();

    if (players.length === 0) {
      return { success: false, error: 'No players found' };
    }

    // Delete any existing votes
    await prisma.banlistSuggestionVote.deleteMany({
      where: {
        suggestionId: { in: suggestions.map(s => s.id) },
      },
    });

    // For each player, vote for 2 random suggestions (excluding their own)
    let votesCreated = 0;
    for (const player of players) {
      // Get suggestions not created by this player
      const votablesuggestions = suggestions.filter(s => s.playerId !== player.id);

      if (votablesuggestions.length < 2) {
        continue; // Skip if not enough suggestions to vote for
      }

      // Randomly select 2 suggestions
      const shuffled = [...votablesuggestions].sort(() => Math.random() - 0.5);
      const selectedSuggestions = shuffled.slice(0, 2);

      // Create votes
      await prisma.banlistSuggestionVote.createMany({
        data: selectedSuggestions.map(suggestion => ({
          playerId: player.id,
          suggestionId: suggestion.id,
        })),
      });

      votesCreated += 2;
    }

    revalidatePath('/banlist/voting');

    return {
      success: true,
      votesCreated,
    };
  } catch (error) {
    console.error('Error auto-voting:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to auto-vote',
    };
  }
}

/**
 * TEST FUNCTION: Automatically creates banlist suggestions for players who haven't submitted yet
 */
export async function autoCreateSuggestions(): Promise<AutoCreateSuggestionsResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return { success: false, error: 'Only admins can use this test function' };
    }

    // Get most recent banlist
    const banlist = await prisma.banlist.findFirst({
      orderBy: { id: 'desc' },
    });

    if (!banlist) {
      return { success: false, error: 'No banlist found' };
    }

    // Get all players
    const players = await prisma.player.findMany();

    if (players.length === 0) {
      return { success: false, error: 'No players found' };
    }

    // Get existing suggestions for this banlist
    const existingSuggestions = await prisma.banlistSuggestion.findMany({
      where: { banlistId: banlist.id },
      select: { playerId: true },
    });

    const playersWithSuggestions = new Set(existingSuggestions.map(s => s.playerId));

    // Filter to only players without suggestions
    const playersNeedingSuggestions = players.filter(p => !playersWithSuggestions.has(p.id));

    if (playersNeedingSuggestions.length === 0) {
      return { success: false, error: 'All players already have suggestions' };
    }

    // Get current banlist cards
    const currentBanned = banlist.banned as number[];
    const currentLimited = banlist.limited as number[];
    const currentSemilimited = banlist.semilimited as number[];
    const currentUnlimited = banlist.unlimited as number[];

    const allCurrentCards = [
      ...currentBanned,
      ...currentLimited,
      ...currentSemilimited,
      ...currentUnlimited,
    ];

    // Get random cards from database to add as new cards (cards not in current banlist)
    const randomNewCards = await prisma.card.findMany({
      where: {
        id: { notIn: allCurrentCards },
      },
      take: playersNeedingSuggestions.length * 2, // 2 cards per player
      orderBy: {
        id: 'asc', // Simple ordering, will randomize selection below
      },
    });

    if (randomNewCards.length < playersNeedingSuggestions.length * 2) {
      return { success: false, error: 'Not enough cards in database to generate suggestions' };
    }

    // Shuffle the new cards array
    const shuffledNewCards = [...randomNewCards].sort(() => Math.random() - 0.5);

    // Create suggestions for each player
    let suggestionsCreated = 0;
    for (let i = 0; i < playersNeedingSuggestions.length; i++) {
      const player = playersNeedingSuggestions[i];

      // Vary the number of changes per player (some small, some large)
      const isLargeChange = Math.random() > 0.5;
      const numChanges = isLargeChange
        ? Math.floor(Math.random() * 6) + 5 // 5-10 changes
        : Math.floor(Math.random() * 4) + 2; // 2-5 changes

      // Randomly select cards from current banlist to move
      const shuffledCurrent = [...allCurrentCards].sort(() => Math.random() - 0.5);
      const cardsToChange = shuffledCurrent.slice(0, Math.min(numChanges, allCurrentCards.length));

      // Get 2 new cards for this player
      const newCards = shuffledNewCards.slice(i * 2, i * 2 + 2).map(c => c.id);

      // Build suggestion lists
      const suggestionBanned: number[] = [];
      const suggestionLimited: number[] = [];
      const suggestionSemilimited: number[] = [];
      const suggestionUnlimited: number[] = [];

      // Randomly assign changed cards to categories
      cardsToChange.forEach(cardId => {
        const rand = Math.random();
        if (rand < 0.25) suggestionBanned.push(cardId);
        else if (rand < 0.5) suggestionLimited.push(cardId);
        else if (rand < 0.75) suggestionSemilimited.push(cardId);
        else suggestionUnlimited.push(cardId);
      });

      // Randomly assign new cards to categories
      newCards.forEach(cardId => {
        const rand = Math.random();
        if (rand < 0.25) suggestionBanned.push(cardId);
        else if (rand < 0.5) suggestionLimited.push(cardId);
        else if (rand < 0.75) suggestionSemilimited.push(cardId);
        else suggestionUnlimited.push(cardId);
      });

      // Create the suggestion
      await prisma.banlistSuggestion.create({
        data: {
          banlistId: banlist.id,
          playerId: player.id,
          banned: suggestionBanned,
          limited: suggestionLimited,
          semilimited: suggestionSemilimited,
          unlimited: suggestionUnlimited,
          chosen: false,
        },
      });

      suggestionsCreated++;
    }

    revalidatePath('/banlist/voting');
    revalidatePath('/banlist/suggestion-history');

    return {
      success: true,
      suggestionsCreated,
    };
  } catch (error) {
    console.error('Error auto-creating suggestions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to auto-create suggestions',
    };
  }
}
