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
  canGeneratePairings: boolean;
  pairingsGenerated: boolean;
  startReasons: string[];
  completeReasons: string[];
  requirements: {
    placementsFilled: RequirementStatus;
    decklistsSubmitted: RequirementStatus;
    suggestionsSubmitted: RequirementStatus;
    nextBanlistExists: RequirementStatus;
    eventWheelSpun: RequirementStatus;
    pairingsGenerated: RequirementStatus;
    victoryPointsAssigned: RequirementStatus;
    walletPointsAssigned: RequirementStatus;
    votesSubmitted: RequirementStatus;
    moderatorSelected: RequirementStatus;
    moderatorVoted: RequirementStatus;
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
        canGeneratePairings: false,
        pairingsGenerated: false,
        startReasons: [],
        completeReasons: [],
        requirements: {
          placementsFilled: { met: false, message: 'Unauthorized' },
          decklistsSubmitted: { met: false, message: 'Unauthorized' },
          suggestionsSubmitted: { met: false, message: 'Unauthorized' },
          nextBanlistExists: { met: false, message: 'Unauthorized' },
          eventWheelSpun: { met: false, message: 'Unauthorized' },
          pairingsGenerated: { met: false, message: 'Unauthorized' },
          victoryPointsAssigned: { met: false, message: 'Unauthorized' },
          walletPointsAssigned: { met: false, message: 'Unauthorized' },
          votesSubmitted: { met: false, message: 'Unauthorized' },
          moderatorSelected: { met: false, message: 'Unauthorized' },
          moderatorVoted: { met: false, message: 'Unauthorized' },
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
      eventWheelSpun: { met: false, message: '' },
      pairingsGenerated: { met: false, message: '' },
      victoryPointsAssigned: { met: false, message: '' },
      walletPointsAssigned: { met: false, message: '' },
      votesSubmitted: { met: false, message: '' },
      moderatorSelected: { met: false, message: '' },
      moderatorVoted: { met: false, message: '' },
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
      // Step 2: Check if all players have submitted decklists for active session
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

      // Step 3: Check if event wheel has been spun
      requirements.eventWheelSpun = {
        met: activeSession.eventWheelSpun,
        message: activeSession.eventWheelSpun
          ? 'Event wheel has been spun'
          : 'Event wheel has not been spun',
      };
      if (!activeSession.eventWheelSpun) {
        completeReasons.push(requirements.eventWheelSpun.message);
      }

      // Step 4: Check if pairings have been generated
      const pairingsExist = await prisma.pairing.findFirst({
        where: { sessionId: activeSession.id },
      });

      requirements.pairingsGenerated = {
        met: !!pairingsExist,
        message: pairingsExist
          ? 'Pairings have been generated'
          : 'Pairings have not been generated',
      };
      if (!pairingsExist) {
        completeReasons.push(requirements.pairingsGenerated.message);
      }

      // Step 7: Check if all placement fields are filled (standings finalized)
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

      // Step 8: Check if victory points have been assigned
      requirements.victoryPointsAssigned = {
        met: activeSession.victoryPointsAssigned,
        message: activeSession.victoryPointsAssigned
          ? 'Victory points have been assigned'
          : 'Victory points have not been assigned',
      };
      if (!activeSession.victoryPointsAssigned) {
        completeReasons.push(requirements.victoryPointsAssigned.message);
      }

      // Step 9: Check if wallet points have been assigned
      requirements.walletPointsAssigned = {
        met: activeSession.walletPointsAssigned,
        message: activeSession.walletPointsAssigned
          ? 'Wallet points have been assigned'
          : 'Wallet points have not been assigned',
      };
      if (!activeSession.walletPointsAssigned) {
        completeReasons.push(requirements.walletPointsAssigned.message);
      }

      // Step 11: Check if all players have submitted banlist suggestions for active session
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

      // Step 12: Check if all players have voted at least twice on banlist suggestions
      if (activeBanlist) {
        // Get all players
        const allPlayers = await prisma.player.findMany({
          select: { id: true },
        });

        // For each player, count how many votes they have submitted
        let playersWithInsufficientVotes = 0;
        for (const player of allPlayers) {
          const voteCount = await prisma.banlistSuggestionVote.count({
            where: {
              playerId: player.id,
              suggestion: {
                banlistId: activeBanlist.id,
              },
            },
          });
          if (voteCount < 2) {
            playersWithInsufficientVotes++;
          }
        }

        const votesComplete = playersWithInsufficientVotes === 0;
        requirements.votesSubmitted = {
          met: votesComplete,
          message: votesComplete
            ? 'All players have voted at least twice'
            : `${playersWithInsufficientVotes} player(s) need to vote more (minimum 2 votes each)`,
        };
        if (!votesComplete) {
          completeReasons.push(requirements.votesSubmitted.message);
        }
      } else {
        requirements.votesSubmitted = {
          met: false,
          message: 'No banlist to vote on',
        };
        completeReasons.push(requirements.votesSubmitted.message);
      }

      // Step 13: Check if moderator has been selected
      requirements.moderatorSelected = {
        met: !!activeSession.moderatorId,
        message: activeSession.moderatorId
          ? 'Moderator has been selected'
          : 'Moderator has not been selected',
      };
      if (!activeSession.moderatorId) {
        completeReasons.push(requirements.moderatorSelected.message);
      }

      // Step 14: Check if moderator has chosen a banlist
      if (activeBanlist) {
        const chosenSuggestion = await prisma.banlistSuggestion.findFirst({
          where: {
            banlistId: activeBanlist.id,
            chosen: true,
          },
        });

        requirements.moderatorVoted = {
          met: !!chosenSuggestion,
          message: chosenSuggestion
            ? 'Moderator has chosen a banlist'
            : 'Moderator has not chosen a banlist',
        };
        if (!chosenSuggestion) {
          completeReasons.push(requirements.moderatorVoted.message);
        }
      } else {
        requirements.moderatorVoted = {
          met: false,
          message: 'No banlist to vote on',
        };
        completeReasons.push(requirements.moderatorVoted.message);
      }

      canCompleteSession = completeReasons.length === 0;
    }

    // Check pairing generation status
    let canGeneratePairings = false;
    let pairingsGenerated = false;

    if (activeSession) {
      // Check if pairings already exist for the active session
      const existingPairings = await prisma.pairing.findFirst({
        where: { sessionId: activeSession.id },
      });

      pairingsGenerated = !!existingPairings;

      // Can generate pairings if:
      // - Active session exists
      // - Event wheel has been spun
      // - No pairings exist yet
      canGeneratePairings = activeSession.eventWheelSpun && !pairingsGenerated;
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
      canGeneratePairings,
      pairingsGenerated,
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
      canGeneratePairings: false,
      pairingsGenerated: false,
      startReasons: [],
      completeReasons: [],
      requirements: {
        placementsFilled: { met: false, message: 'Validation failed' },
        decklistsSubmitted: { met: false, message: 'Validation failed' },
        suggestionsSubmitted: { met: false, message: 'Validation failed' },
        nextBanlistExists: { met: false, message: 'Validation failed' },
        eventWheelSpun: { met: false, message: 'Validation failed' },
        pairingsGenerated: { met: false, message: 'Validation failed' },
        victoryPointsAssigned: { met: false, message: 'Validation failed' },
        walletPointsAssigned: { met: false, message: 'Validation failed' },
        votesSubmitted: { met: false, message: 'Validation failed' },
        moderatorSelected: { met: false, message: 'Validation failed' },
        moderatorVoted: { met: false, message: 'Validation failed' },
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

    // Revalidate relevant pages
    revalidatePath('/admin/prog_actions');
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

export interface GeneratePairingsResult {
  success: boolean;
  error?: string;
  numPairings?: number;
}

/**
 * Generate pairings for the active session
 * Must be called after event wheel is spun
 */
export async function generatePairings(): Promise<GeneratePairingsResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    if (!activeSession) {
      return { success: false, error: 'No active session found' };
    }

    // Check if event wheel has been spun
    if (!activeSession.eventWheelSpun) {
      return {
        success: false,
        error: 'Event wheel must be spun before generating pairings',
      };
    }

    // Check if pairings already exist
    const existingPairings = await prisma.pairing.findFirst({
      where: { sessionId: activeSession.id },
    });

    if (existingPairings) {
      return {
        success: false,
        error: 'Pairings have already been generated for this session',
      };
    }

    // Get all players
    const players = await prisma.player.findMany();
    const playerIds = players.map(p => p.id);

    if (playerIds.length < 2) {
      return {
        success: false,
        error: 'At least 2 players are required to generate pairings',
      };
    }

    // Generate round-robin pairings with randomization
    const pairingData = generateRoundRobinPairings(playerIds);

    // Save pairings to database
    await prisma.pairing.createMany({
      data: pairingData.map(p => ({
        sessionId: activeSession.id,
        round: p.round,
        player1Id: p.player1,
        player2Id: p.player2,
        player1wins: 0,
        player2wins: 0,
      })),
    });

    // Send Discord notification with all pairings
    const { notifyNewSessionWithPairings } = await import('@lib/discordClient');
    await notifyNewSessionWithPairings(activeSession.id);

    // Revalidate relevant pages
    revalidatePath('/admin/prog_actions');
    revalidatePath('/play/pairings');
    revalidatePath('/play/standings');

    return {
      success: true,
      numPairings: pairingData.length,
    };
  } catch (error) {
    console.error('Error generating pairings:', error);
    return {
      success: false,
      error: 'Failed to generate pairings',
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

export interface AutoSubmitDecklistsResult {
  success: boolean;
  error?: string;
  decklistsSubmitted?: number;
}

export async function autoSubmitDecklists(): Promise<AutoSubmitDecklistsResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return { success: false, error: 'Only admins can use this test function' };
    }

    // Get current session
    const session = await prisma.session.findFirst({
      orderBy: { date: 'desc' }
    })

    if (!session) {
      return { success: false, error: 'No session found!'}
    }

    // Get all players
    const players = await prisma.player.findMany();

    if (players.length === 0) {
      return { success: false, error: 'No players found' };
    }

    const existingDecklists = await prisma.decklist.findMany({
      where: { sessionId: session.id },
      select: { playerId: true }
    });

    const playersWithDecklists = new Set(existingDecklists.map(d => d.playerId));

    const playersNeedingDecklists = players.filter(p => !playersWithDecklists.has(p.id));

    if (playersNeedingDecklists.length === 0) {
      return { success: false, error: 'All players have already submitted decklists'};
    }

    // Read and parse testdeck.ydk
    const fs = await import('fs/promises');
    const path = await import('path');
    const { parseYdkFile } = await import('@lib/ydkParser');

    const ydkPath = path.join(process.cwd(), 'data', 'testdeck.ydk');
    const ydkContent = await fs.readFile(ydkPath, 'utf-8');
    const parseResult = parseYdkFile(ydkContent);

    if (!parseResult.success || !parseResult.deck) {
      return { success: false, error: `Failed to parse testdeck.ydk: ${parseResult.error}` };
    }

    const { maindeck, sidedeck, extradeck } = parseResult.deck;

    // Create decklists for all players who need them
    for (const player of playersNeedingDecklists) {
      await prisma.decklist.create({
        data: {
          playerId: player.id,
          sessionId: session.id,
          maindeck: JSON.stringify(maindeck),
          sidedeck: JSON.stringify(sidedeck),
          extradeck: JSON.stringify(extradeck),
        },
      });
    }

    revalidatePath('/admin/prog_actions');
    revalidatePath('/play/decklist');

    return { success: true, decklistsSubmitted: playersNeedingDecklists.length };



  } catch (error) {
    console.error('Error auto-submitting decklists: ', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to auto-create suggestions',
    };
  }
}

export interface ResetSessionResult {
  success: boolean;
  error?: string;
  sessionNumber?: number;
}

/**
 * Reset the current active session and delete all associated data
 */
export async function resetSession(): Promise<ResetSessionResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return { success: false, error: 'Only admins can reset sessions' };
    }

    // Get active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    if (!activeSession) {
      return { success: false, error: 'No active session found' };
    }

    // Delete all associated data for this session
    // Order matters due to foreign key constraints

    // If wallet points were assigned, rollback the wallet amounts using transaction records
    if (activeSession.walletPointsAssigned && activeSession.victoryPointsAssigned) {
      // Get all wallet transactions for this session
      const sessionTransactions = await prisma.walletTransaction.findMany({
        where: { sessionId: activeSession.id },
        include: { wallet: true },
      });

      // Rollback each transaction
      for (const transaction of sessionTransactions) {
        // Only rollback if wallet has enough balance
        await prisma.wallet.updateMany({
          where: {
            id: transaction.walletId,
            amount: { gte: transaction.amount },
          },
          data: {
            amount: {
              decrement: transaction.amount,
            },
          },
        });
      }

      // Delete the wallet transactions for this session
      await prisma.walletTransaction.deleteMany({
        where: { sessionId: activeSession.id },
      });
    }

    // Delete victory points
    await prisma.victoryPoint.deleteMany({
      where: { sessionId: activeSession.id },
    });

    // Delete pairings
    await prisma.pairing.deleteMany({
      where: { sessionId: activeSession.id },
    });

    // Delete decklists
    await prisma.decklist.deleteMany({
      where: { sessionId: activeSession.id },
    });

    // Reset session fields
    await prisma.session.update({
      where: { id: activeSession.id },
      data: {
        active: false,
        complete: false,
        date: null,
        first: null,
        second: null,
        third: null,
        fourth: null,
        fifth: null,
        sixth: null,
        eventWheelSpun: false,
        victoryPointsAssigned: false,
        walletPointsAssigned: false,
      },
    });

    revalidatePath('/admin/prog_actions');
    revalidatePath('/play/pairings');
    revalidatePath('/play/standings');
    revalidatePath('/play/decklist-submission');
    revalidatePath('/admin/victory-point-assignment');

    return {
      success: true,
      sessionNumber: activeSession.number,
    };
  } catch (error) {
    console.error('Error resetting session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset session',
    };
  }
}

export interface AutoModeratorVoteResult {
  success: boolean;
  error?: string;
  chosenSuggestionId?: number;
  moderatorName?: string;
}

/**
 * Test function: Auto-select a random banlist suggestion for the moderator
 */
export async function autoModeratorVote(): Promise<AutoModeratorVoteResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return { success: false, error: 'Only admins can use this test function' };
    }

    // Get active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    if (!activeSession) {
      return { success: false, error: 'No active session found' };
    }

    // Check if moderator is selected
    if (!activeSession.moderatorId) {
      return { success: false, error: 'No moderator has been selected yet' };
    }

    // Get moderator info
    const moderator = await prisma.player.findUnique({
      where: { id: activeSession.moderatorId },
    });

    if (!moderator) {
      return { success: false, error: 'Moderator not found' };
    }

    // Get active banlist
    const activeBanlist = await prisma.banlist.findFirst({
      where: { sessionId: activeSession.number },
    });

    if (!activeBanlist) {
      return { success: false, error: 'No banlist found for active session' };
    }

    // Get all suggestions for this banlist
    const suggestions = await prisma.banlistSuggestion.findMany({
      where: { banlistId: activeBanlist.id },
    });

    if (suggestions.length === 0) {
      return { success: false, error: 'No banlist suggestions found' };
    }

    // Pick a random suggestion
    const randomIndex = Math.floor(Math.random() * suggestions.length);
    const chosenSuggestion = suggestions[randomIndex];

    // Clear any existing chosen suggestion
    await prisma.banlistSuggestion.updateMany({
      where: {
        banlistId: activeBanlist.id,
        chosen: true,
      },
      data: {
        chosen: false,
        moderatorId: null,
      },
    });

    // Mark it as chosen by the moderator
    await prisma.banlistSuggestion.update({
      where: { id: chosenSuggestion.id },
      data: {
        chosen: true,
        moderatorId: activeSession.moderatorId,
      },
    });

    // Delete any existing banlist for the next session (in case of reselection)
    await prisma.banlist.deleteMany({
      where: { sessionId: activeBanlist.sessionId + 1 },
    });

    // Create new banlist for next session by merging current with winning suggestion
    // Parse current lists and create Sets for lookup
    const currentBanned = new Set(activeBanlist.banned as number[]);
    const currentLimited = new Set(activeBanlist.limited as number[]);
    const currentSemilimited = new Set(activeBanlist.semilimited as number[]);
    const currentUnlimited = new Set(activeBanlist.unlimited as number[]);

    // Build map of card locations from winning suggestion
    const cardLocations = new Map<
      number,
      'banned' | 'limited' | 'semilimited' | 'unlimited'
    >();

    (chosenSuggestion.banned as number[]).forEach((id) => cardLocations.set(id, 'banned'));
    (chosenSuggestion.limited as number[]).forEach((id) => cardLocations.set(id, 'limited'));
    (chosenSuggestion.semilimited as number[]).forEach((id) =>
      cardLocations.set(id, 'semilimited'),
    );
    (chosenSuggestion.unlimited as number[]).forEach((id) =>
      cardLocations.set(id, 'unlimited'),
    );

    // Create new lists by merging
    const newBanned: number[] = [];
    const newLimited: number[] = [];
    const newSemilimited: number[] = [];
    const newUnlimited: number[] = [];

    // Helper to add card to appropriate list
    const addToList = (cardId: number, category: string) => {
      switch (category) {
        case 'banned':
          newBanned.push(cardId);
          break;
        case 'limited':
          newLimited.push(cardId);
          break;
        case 'semilimited':
          newSemilimited.push(cardId);
          break;
        case 'unlimited':
          newUnlimited.push(cardId);
          break;
      }
    };

    // Get all unique card IDs from current banlist
    const allCurrentCards = new Set([
      ...currentBanned,
      ...currentLimited,
      ...currentSemilimited,
      ...currentUnlimited,
    ]);

    // Process each card from current banlist
    allCurrentCards.forEach((cardId) => {
      // If card is mentioned in suggestion, use new location; otherwise keep current
      if (cardLocations.has(cardId)) {
        addToList(cardId, cardLocations.get(cardId)!);
      } else {
        // Keep in current category
        if (currentBanned.has(cardId)) addToList(cardId, 'banned');
        else if (currentLimited.has(cardId)) addToList(cardId, 'limited');
        else if (currentSemilimited.has(cardId))
          addToList(cardId, 'semilimited');
        else if (currentUnlimited.has(cardId)) addToList(cardId, 'unlimited');
      }
    });

    // Add any new cards from suggestion that weren't in current banlist
    cardLocations.forEach((category, cardId) => {
      if (!allCurrentCards.has(cardId)) {
        addToList(cardId, category);
      }
    });

    // Create new banlist for next session
    await prisma.banlist.create({
      data: {
        sessionId: activeBanlist.sessionId + 1,
        banned: newBanned,
        limited: newLimited,
        semilimited: newSemilimited,
        unlimited: newUnlimited,
      },
    });

    revalidatePath('/admin/prog_actions');
    revalidatePath('/banlist/voting');
    revalidatePath('/banlist/current');
    revalidatePath('/');

    // Send Discord notification for the new banlist
    const { notifyBanlistChosen } = await import('@lib/discordClient');
    await notifyBanlistChosen(activeBanlist.sessionId + 1);

    return {
      success: true,
      chosenSuggestionId: chosenSuggestion.id,
      moderatorName: moderator.name,
    };
  } catch (error) {
    console.error('Error auto-voting as moderator:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to auto-vote',
    };
  }
}

export interface ResetEntireProgResult {
  success: boolean;
  error?: string;
}

/**
 * Resets the entire prog system to initial state
 * - Keeps players intact
 * - Empties all wallets
 * - Removes all victory points
 * - Removes all transactions
 * - Removes all decklists
 * - Removes all pairings
 * - Removes all banlist suggestions and votes
 * - Removes all banlists except creates empty banlist for session 1
 * - Marks all sessions as not complete and not active
 * - Resets all session fields (no date, no placements, no moderator, etc.)
 */
export async function resetEntireProg(): Promise<ResetEntireProgResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return { success: false, error: 'Only admins can reset the entire prog' };
    }

    // Delete all data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete all banlist suggestion votes
      await tx.banlistSuggestionVote.deleteMany({});

      // Delete all banlist suggestions
      await tx.banlistSuggestion.deleteMany({});

      // Delete all banlists
      await tx.banlist.deleteMany({});

      // Delete all pairings
      await tx.pairing.deleteMany({});

      // Delete all decklists
      await tx.decklist.deleteMany({});

      // Delete all victory points
      await tx.victoryPoint.deleteMany({});

      // Delete all wallet transactions
      await tx.walletTransaction.deleteMany({});

      // Reset all wallet amounts to 0
      await tx.wallet.updateMany({
        data: { amount: 0 },
      });

      // Reset all sessions
      await tx.session.updateMany({
        data: {
          active: false,
          complete: false,
          date: null,
          first: null,
          second: null,
          third: null,
          fourth: null,
          fifth: null,
          sixth: null,
          moderatorId: null,
          eventWheelSpun: false,
          victoryPointsAssigned: false,
          walletPointsAssigned: false,
        },
      });

      // Create empty banlist for session 1
      await tx.banlist.create({
        data: {
          sessionId: 1,
          banned: [],
          limited: [],
          semilimited: [],
          unlimited: [],
        },
      });
    });

    revalidatePath('/admin/prog_actions');
    revalidatePath('/play/pairings');
    revalidatePath('/play/standings');
    revalidatePath('/play/decklist');
    revalidatePath('/banlist/voting');
    revalidatePath('/banlist/suggestion');
    revalidatePath('/banlist/current');
    revalidatePath('/leaderboard');
    revalidatePath('/');

    return { success: true };
  } catch (error) {
    console.error('Error resetting entire prog:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset prog',
    };
  }
}
