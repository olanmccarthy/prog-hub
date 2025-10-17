'use server';

import { getDataSource } from '@lib/data-source';
import { Session } from '@entities/Session';
import { Player } from '@entities/Player';
import { Banlist } from '@entities/Banlist';
import { Decklist } from '@entities/Decklist';
import { BanlistSuggestion } from '@entities/BanlistSuggestion';
import { Pairing } from '@entities/Pairing';
import { revalidatePath } from 'next/cache';

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
    const dataSource = await getDataSource();
    const sessionRepo = dataSource.getRepository(Session);
    const playerRepo = dataSource.getRepository(Player);
    const banlistRepo = dataSource.getRepository(Banlist);
    const decklistRepo = dataSource.getRepository(Decklist);
    const suggestionRepo = dataSource.getRepository(BanlistSuggestion);

    const reasons: string[] = [];
    const requirements = {
      placementsFilled: { met: false, message: '' },
      decklistsSubmitted: { met: false, message: '' },
      suggestionsSubmitted: { met: false, message: '' },
      nextBanlistExists: { met: false, message: '' },
    };

    // Get the current (most recent) session
    const sessions = await sessionRepo.find({
      order: { date: 'DESC' },
      take: 1,
    });
    const currentSession = sessions.length > 0 ? sessions[0] : null;

    const players = await playerRepo.find();
    const playerCount = players.length;

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
      const decklists = await decklistRepo.find({
        where: { session: { id: currentSession.id } },
      });

      const decklistsComplete = decklists.length >= playerCount;
      requirements.decklistsSubmitted = {
        met: decklistsComplete,
        message: decklistsComplete
          ? `All ${playerCount} decklists submitted`
          : `Not all players have submitted decklists (${decklists.length}/${playerCount})`,
      };
      if (!decklistsComplete) {
        reasons.push(requirements.decklistsSubmitted.message);
      }

      // Check if all players have submitted banlist suggestions for current session
      const currentBanlist = await banlistRepo.findOne({
        where: { session: { id: currentSession.id } },
      });

      if (currentBanlist) {
        const suggestions = await suggestionRepo.find({
          where: { banlist: { id: currentBanlist.id } },
        });

        const suggestionsComplete = suggestions.length >= playerCount;
        requirements.suggestionsSubmitted = {
          met: suggestionsComplete,
          message: suggestionsComplete
            ? `All ${playerCount} suggestions submitted`
            : `Not all players have submitted suggestions (${suggestions.length}/${playerCount})`,
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
      // No current session
      requirements.placementsFilled = { met: true, message: 'No current session (first prog)' };
      requirements.decklistsSubmitted = { met: true, message: 'No current session (first prog)' };
      requirements.suggestionsSubmitted = { met: true, message: 'No current session (first prog)' };
    }

    // Check if there's a banlist for the new session (next session number)
    const nextSessionNumber = currentSession ? currentSession.number + 1 : 1;
    const nextSession = await sessionRepo.findOne({
      where: { number: nextSessionNumber },
    });

    if (nextSession) {
      const nextBanlist = await banlistRepo.findOne({
        where: { session: { id: nextSession.id } },
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
    const dataSource = await getDataSource();
    const sessionRepo = dataSource.getRepository(Session);
    const playerRepo = dataSource.getRepository(Player);
    const pairingRepo = dataSource.getRepository(Pairing);

    // Validate first
    const validation = await validateProgStart();
    if (!validation.canStartProg) {
      return {
        success: false,
        error: `Cannot start prog: ${validation.reasons.join(', ')}`,
      };
    }

    // Get current session to determine next session number
    const currentSessions = await sessionRepo.find({
      order: { date: 'DESC' },
      take: 1,
    });
    const currentSession = currentSessions.length > 0 ? currentSessions[0] : null;

    const nextSessionNumber = currentSession ? currentSession.number + 1 : 1;

    // Check if session already exists (it should from validation)
    let nextSession = await sessionRepo.findOne({
      where: { number: nextSessionNumber },
    });

    // If it doesn't exist, create it
    if (!nextSession) {
      nextSession = sessionRepo.create({
        number: nextSessionNumber,
        date: new Date(),
        first: null,
        second: null,
        third: null,
        fourth: null,
        fifth: null,
        sixth: null,
      });
      await sessionRepo.save(nextSession);
    }

    // Get all players
    const players = await playerRepo.find();
    const playerIds = players.map(p => p.id);

    // Generate round-robin pairings with randomization
    const pairingData = generateRoundRobinPairings(playerIds);

    // Save pairings to database
    const pairings = pairingData.map(p => pairingRepo.create({
      session: { id: nextSession!.id },
      round: p.round,
      player1: { id: p.player1 },
      player2: { id: p.player2 },
      player1wins: 0,
      player2wins: 0,
    }));

    await pairingRepo.save(pairings);

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
