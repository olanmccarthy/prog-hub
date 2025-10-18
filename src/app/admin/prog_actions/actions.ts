'use server';

import { prisma } from '@lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyNewSessionWithPairings } from '@lib/discordClient';

export interface RequirementStatus {
  met: boolean;
  message: string;
}

export interface ValidationResult {
  canStartProg: boolean;
  reasons: string[];
  requirements: {
    placementsFilled: RequirementStatus;
    decklistsSubmitted: RequirementStatus;
    suggestionsSubmitted: RequirementStatus;
    nextBanlistExists: RequirementStatus;
  };
}

export interface StartProgResult {
  success: boolean;
  error?: string;
  sessionId?: number;
}

/**
 * Validate if a new prog session can be started
 */
export async function validateProgStart(): Promise<ValidationResult> {
  try {
    const reasons: string[] = [];
    const requirements = {
      placementsFilled: { met: false, message: '' },
      decklistsSubmitted: { met: false, message: '' },
      suggestionsSubmitted: { met: false, message: '' },
      nextBanlistExists: { met: false, message: '' },
    };

    // Get the current (most recent) session
    const currentSession = await prisma.session.findFirst({
      orderBy: { date: 'desc' },
    });

    const playerCount = await prisma.player.count();

    if (currentSession) {
      // Check if all placement fields are filled
      const placementsFilled = !!(currentSession.first && currentSession.second && currentSession.third &&
          currentSession.fourth && currentSession.fifth && currentSession.sixth);

      requirements.placementsFilled = {
        met: placementsFilled,
        message: placementsFilled
          ? 'All placements filled'
          : 'Current session placements (1st-6th) are not all filled out',
      };
      if (!placementsFilled) {
        reasons.push(requirements.placementsFilled.message);
      }

      // Check if all players have submitted decklists for current session
      const decklistCount = await prisma.decklist.count({
        where: { sessionId: currentSession.id },
      });

      const decklistsComplete = decklistCount >= playerCount;
      requirements.decklistsSubmitted = {
        met: decklistsComplete,
        message: decklistsComplete
          ? `All ${playerCount} decklists submitted`
          : `Not all players have submitted decklists (${decklistCount}/${playerCount})`,
      };
      if (!decklistsComplete) {
        reasons.push(requirements.decklistsSubmitted.message);
      }

      // Check if all players have submitted banlist suggestions for current session
      const currentBanlist = await prisma.banlist.findFirst({
        where: { sessionId: currentSession.id },
      });

      if (currentBanlist) {
        const suggestionCount = await prisma.banlistSuggestion.count({
          where: { banlistId: currentBanlist.id },
        });

        const suggestionsComplete = suggestionCount >= playerCount;
        requirements.suggestionsSubmitted = {
          met: suggestionsComplete,
          message: suggestionsComplete
            ? `All ${playerCount} suggestions submitted`
            : `Not all players have submitted suggestions (${suggestionCount}/${playerCount})`,
        };
        if (!suggestionsComplete) {
          reasons.push(requirements.suggestionsSubmitted.message);
        }
      } else {
        requirements.suggestionsSubmitted = {
          met: false,
          message: 'Current session does not have a banlist',
        };
        reasons.push(requirements.suggestionsSubmitted.message);
      }
    } else {
      // No current session - first prog
      // Check that we have at least 6 players
      if (playerCount < 6) {
        const playerRequirementMessage = `Need at least 6 players to start first prog (currently have ${playerCount})`;
        requirements.placementsFilled = { met: false, message: playerRequirementMessage };
        requirements.decklistsSubmitted = { met: false, message: playerRequirementMessage };
        requirements.suggestionsSubmitted = { met: false, message: playerRequirementMessage };
        reasons.push(playerRequirementMessage);
      } else {
        requirements.placementsFilled = { met: true, message: `${playerCount} players ready for first prog` };
        requirements.decklistsSubmitted = { met: true, message: 'No current session (first prog)' };
        requirements.suggestionsSubmitted = { met: true, message: 'No current session (first prog)' };
      }
    }

    // Check if there's a banlist for the new session (next session number)
    const nextSessionNumber = currentSession ? currentSession.number + 1 : 1;

    // For first session, we'll auto-create a default banlist, so skip this check
    if (!currentSession) {
      requirements.nextBanlistExists = {
        met: true,
        message: 'Default banlist will be created for first session',
      };
    } else {
      const nextSession = await prisma.session.findUnique({
        where: { number: nextSessionNumber },
      });

      if (nextSession) {
        const nextBanlist = await prisma.banlist.findFirst({
          where: { sessionId: nextSession.id },
        });

        const banlistExists = !!nextBanlist;
        requirements.nextBanlistExists = {
          met: banlistExists,
          message: banlistExists
            ? `Banlist chosen for Session ${nextSessionNumber}`
            : `No banlist chosen for Session ${nextSessionNumber}`,
        };
        if (!banlistExists) {
          reasons.push(requirements.nextBanlistExists.message);
        }
      } else {
        requirements.nextBanlistExists = {
          met: false,
          message: `Session ${nextSessionNumber} needs to be created with a banlist`,
        };
        reasons.push(requirements.nextBanlistExists.message);
      }
    }

    return {
      canStartProg: reasons.length === 0,
      reasons,
      requirements,
    };
  } catch (error) {
    console.error('Error validating prog start:', error);
    return {
      canStartProg: false,
      reasons: ['Failed to validate prog requirements'],
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
 * Start a new prog session
 */
export async function startProg(): Promise<StartProgResult> {
  try {
    // Validate first
    const validation = await validateProgStart();
    if (!validation.canStartProg) {
      return {
        success: false,
        error: `Cannot start prog: ${validation.reasons.join(', ')}`,
      };
    }

    // Get current session to determine next session number
    const currentSession = await prisma.session.findFirst({
      orderBy: { date: 'desc' },
    });

    const nextSessionNumber = currentSession ? currentSession.number + 1 : 1;
    const isFirstSession = !currentSession;

    // Check if session already exists (it should from validation)
    let nextSession = await prisma.session.findUnique({
      where: { number: nextSessionNumber },
    });

    // If it doesn't exist, create it
    if (!nextSession) {
      nextSession = await prisma.session.create({
        data: {
          number: nextSessionNumber,
          date: new Date(),
          first: null,
          second: null,
          third: null,
          fourth: null,
          fifth: null,
          sixth: null,
        },
      });

      // If this is the first session, create a default banlist
      if (isFirstSession) {
        await prisma.banlist.create({
          data: {
            sessionId: nextSession.id,
            banned: [], // Empty array of card IDs
            limited: [], // Empty array of card IDs
            semilimited: [], // Empty array of card IDs
            unlimited: [], // Empty array of card IDs
          },
        });
      }
    }

    // Get all players
    const players = await prisma.player.findMany();
    const playerIds = players.map(p => p.id);

    // Generate round-robin pairings with randomization
    const pairingData = generateRoundRobinPairings(playerIds);

    // Save pairings to database
    await prisma.pairing.createMany({
      data: pairingData.map(p => ({
        sessionId: nextSession!.id,
        round: p.round,
        player1Id: p.player1,
        player2Id: p.player2,
        player1wins: 0,
        player2wins: 0,
      })),
    });

    // Send Discord notification with all pairings
    await notifyNewSessionWithPairings(nextSession!.id);

    // Revalidate relevant pages
    revalidatePath('/admin/prog_actions');
    revalidatePath('/play/pairings');
    revalidatePath('/play/standings');

    return {
      success: true,
      sessionId: nextSession.id,
    };
  } catch (error) {
    console.error('Error starting prog:', error);
    return {
      success: false,
      error: 'Failed to start prog session',
    };
  }
}
