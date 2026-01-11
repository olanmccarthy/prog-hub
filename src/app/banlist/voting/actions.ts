'use server';

import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@lib/auth';
import { getMostRecentBanlist } from '../actions';
import { revalidatePath } from 'next/cache';

/**
 * Helper function to parse banlist field (handles both string and array)
 */
function parseBanlistField(field: unknown): number[] {
  if (!field) return [];
  if (typeof field === 'string') {
    if (field.trim() === '') return [];
    try {
      return JSON.parse(field) as number[];
    } catch {
      return [];
    }
  }
  if (Array.isArray(field)) return field;
  return [];
}

export interface BanlistSuggestionForVoting {
  id: number;
  playerId: number;
  playerName: string;
  sessionNumber: number;
  banned: number[];
  limited: number[];
  semilimited: number[];
  unlimited: number[];
  voteCount: number;
  comment?: string;
}

interface GetSuggestionsForVotingResult {
  success: boolean;
  suggestions?: BanlistSuggestionForVoting[];
  currentUserId?: number;
  hasVoted?: boolean;
  userVotedIds?: number[];
  submissionCount?: number;
  sessionNumber?: number;
  votedPlayerCount?: number;
  totalPlayerCount?: number;
  isModerator?: boolean;
  chosenSuggestionId?: number | null;
  error?: string;
}

export async function getBanlistSuggestionsForVoting(): Promise<GetSuggestionsForVotingResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get the active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    if (!activeSession) {
      return {
        success: false,
        error: 'No active session found',
      };
    }
    // Get the banlist for this session
    const banlist = await prisma.banlist.findFirst({
      where: { sessionId: activeSession.number },
    });

    if (!banlist) {
      return {
        success: false,
        error: 'No banlist found for the most recent session',
      };
    }

    if (!banlist) {
      return { success: false, error: 'No banlist found' };
    }

    // Get all suggestions for this banlist
    const suggestions = await prisma.banlistSuggestion.findMany({
      where: { banlistId: banlist.id },
      include: {
        player: { select: { name: true, id: true } },
        votes: true,
      },
    });

    // Check if user has already voted
    const userVotes = await prisma.banlistSuggestionVote.findMany({
      where: {
        playerId: user.playerId,
        suggestionId: { in: suggestions.map((s) => s.id) },
      },
      select: { suggestionId: true },
    });

    const hasVoted = userVotes.length > 0;
    const userVotedIds = userVotes.map((v) => v.suggestionId);

    // Count how many unique players have voted
    const allVotes = await prisma.banlistSuggestionVote.findMany({
      where: {
        suggestionId: { in: suggestions.map((s) => s.id) },
      },
      select: {
        playerId: true,
      },
      distinct: ['playerId'],
    });

    // Get total number of players
    const totalPlayers = await prisma.player.count();

    // Check if current user is the moderator for this session
    const isModerator = activeSession.moderatorId === user.playerId;

    // Check if a suggestion has already been chosen
    const chosenSuggestion = suggestions.find((s) => s.chosen);

    return {
      success: true,
      suggestions: suggestions.map((s) => ({
        id: s.id,
        playerId: s.playerId,
        playerName: s.player.name,
        sessionNumber: banlist.sessionId,
        banned: parseBanlistField(s.banned),
        limited: parseBanlistField(s.limited),
        semilimited: parseBanlistField(s.semilimited),
        unlimited: parseBanlistField(s.unlimited),
        voteCount: s.votes.length,
        comment: s.comment || undefined,
      })),
      currentUserId: user.playerId,
      hasVoted,
      userVotedIds,
      submissionCount: suggestions.length,
      sessionNumber: banlist.sessionId,
      votedPlayerCount: allVotes.length,
      totalPlayerCount: totalPlayers,
      isModerator,
      chosenSuggestionId: chosenSuggestion?.id || null,
    };
  } catch (error) {
    console.error('Error fetching suggestions for voting:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch suggestions',
    };
  }
}

interface SubmitVotesResult {
  success: boolean;
  error?: string;
}

interface SelectWinnerResult {
  success: boolean;
  error?: string;
}

/**
 * Creates a new banlist for the next session by merging the current banlist
 * with changes from the winning suggestion.
 *
 * Cards mentioned in the suggestion are moved to their new categories.
 * Cards not mentioned stay in their current categories.
 * New cards from the suggestion are added.
 */
async function createBanlistFromWinningSuggestion(
  currentBanlistId: number,
  winningSuggestion: {
    banned: number[];
    limited: number[];
    semilimited: number[];
    unlimited: number[];
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current banlist to merge with winning suggestion
    const currentBanlist = await prisma.banlist.findUnique({
      where: { id: currentBanlistId },
    });

    if (!currentBanlist) {
      return { success: false, error: 'Current banlist not found' };
    }

    // Parse current lists and create Sets for lookup
    // Ensure we're working with arrays of numbers, not strings
    const currentBannedArray = parseBanlistField(currentBanlist.banned);
    const currentLimitedArray = parseBanlistField(currentBanlist.limited);
    const currentSemilimitedArray = parseBanlistField(currentBanlist.semilimited);
    const currentUnlimitedArray = parseBanlistField(currentBanlist.unlimited);

    // Double-check these are arrays (defensive programming)
    if (!Array.isArray(currentBannedArray) || !Array.isArray(currentLimitedArray) ||
        !Array.isArray(currentSemilimitedArray) || !Array.isArray(currentUnlimitedArray)) {
      console.error('Current banlist fields are not arrays after parsing:', {
        banned: currentBanlist.banned,
        limited: currentBanlist.limited,
        semilimited: currentBanlist.semilimited,
        unlimited: currentBanlist.unlimited,
      });
      return { success: false, error: 'Current banlist data is corrupted' };
    }

    const currentBanned = new Set(currentBannedArray.filter(id => typeof id === 'number'));
    const currentLimited = new Set(currentLimitedArray.filter(id => typeof id === 'number'));
    const currentSemilimited = new Set(currentSemilimitedArray.filter(id => typeof id === 'number'));
    const currentUnlimited = new Set(currentUnlimitedArray.filter(id => typeof id === 'number'));

    // Build map of card locations from winning suggestion
    // Ensure winning suggestion fields are arrays of numbers
    const cardLocations = new Map<
      number,
      'banned' | 'limited' | 'semilimited' | 'unlimited'
    >();

    // Filter out non-number values from suggestions (defensive)
    const suggestionBanned = Array.isArray(winningSuggestion.banned)
      ? winningSuggestion.banned.filter(id => typeof id === 'number')
      : [];
    const suggestionLimited = Array.isArray(winningSuggestion.limited)
      ? winningSuggestion.limited.filter(id => typeof id === 'number')
      : [];
    const suggestionSemilimited = Array.isArray(winningSuggestion.semilimited)
      ? winningSuggestion.semilimited.filter(id => typeof id === 'number')
      : [];
    const suggestionUnlimited = Array.isArray(winningSuggestion.unlimited)
      ? winningSuggestion.unlimited.filter(id => typeof id === 'number')
      : [];

    suggestionBanned.forEach((id) => cardLocations.set(id, 'banned'));
    suggestionLimited.forEach((id) => cardLocations.set(id, 'limited'));
    suggestionSemilimited.forEach((id) => cardLocations.set(id, 'semilimited'));
    suggestionUnlimited.forEach((id) => cardLocations.set(id, 'unlimited'));

    // Create new lists by merging
    const newBanned: number[] = [];
    const newLimited: number[] = [];
    const newSemilimited: number[] = [];
    const newUnlimited: number[] = [];

    // Helper to add card to appropriate list
    const addToList = (cardId: number, category: string) => {
      // Extra safety: only add if it's actually a number
      if (typeof cardId !== 'number' || isNaN(cardId)) {
        console.warn(`Skipping invalid cardId: ${cardId} (type: ${typeof cardId})`);
        return;
      }

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

    // Final validation: ensure all arrays contain only numbers
    const validateArray = (arr: unknown, name: string): boolean => {
      if (!Array.isArray(arr)) {
        console.error(`${name} is not an array:`, arr);
        return false;
      }
      const nonNumbers = arr.filter(item => typeof item !== 'number' || isNaN(item));
      if (nonNumbers.length > 0) {
        console.error(`${name} contains non-number values:`, nonNumbers);
        return false;
      }
      return true;
    };

    if (!validateArray(newBanned, 'newBanned') ||
        !validateArray(newLimited, 'newLimited') ||
        !validateArray(newSemilimited, 'newSemilimited') ||
        !validateArray(newUnlimited, 'newUnlimited')) {
      return { success: false, error: 'Generated banlist contains invalid data' };
    }

    console.log('Creating new banlist for session', currentBanlist.sessionId + 1, {
      banned: newBanned.length,
      limited: newLimited.length,
      semilimited: newSemilimited.length,
      unlimited: newUnlimited.length,
    });

    // Create new banlist for next session
    await prisma.banlist.create({
      data: {
        sessionId: currentBanlist.sessionId + 1,
        banned: newBanned,
        limited: newLimited,
        semilimited: newSemilimited,
        unlimited: newUnlimited,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating banlist from winning suggestion:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create new banlist',
    };
  }
}

export async function selectWinningSuggestion(
  suggestionId: number,
): Promise<SelectWinnerResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get active session to check moderator
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    if (!activeSession) {
      return { success: false, error: 'No active session found' };
    }

    // Check if user is the moderator for this session
    if (!activeSession.moderatorId) {
      return {
        success: false,
        error: 'No moderator has been selected for this session yet',
      };
    }

    if (user.playerId !== activeSession.moderatorId) {
      return {
        success: false,
        error: 'Only the moderator can select the winning suggestion',
      };
    }

    // Get the suggestion
    const suggestion = await prisma.banlistSuggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion) {
      return { success: false, error: 'Suggestion not found' };
    }

    // Unmark any previously chosen suggestions for this banlist
    await prisma.banlistSuggestion.updateMany({
      where: {
        banlistId: suggestion.banlistId,
        chosen: true,
      },
      data: {
        chosen: false,
        moderatorId: null,
      },
    });

    // Mark this suggestion as chosen and set moderator
    await prisma.banlistSuggestion.update({
      where: { id: suggestionId },
      data: {
        chosen: true,
        moderatorId: user.playerId,
      },
    });

    // Get current banlist to determine next session number
    const currentBanlist = await prisma.banlist.findUnique({
      where: { id: suggestion.banlistId },
    });

    if (!currentBanlist) {
      return { success: false, error: 'Current banlist not found' };
    }

    // Delete any existing banlist for the next session (in case of reselection)
    await prisma.banlist.deleteMany({
      where: { sessionId: currentBanlist.sessionId + 1 },
    });

    // Create new banlist for next session from winning suggestion
    const banlistResult = await createBanlistFromWinningSuggestion(
      suggestion.banlistId,
      {
        banned: parseBanlistField(suggestion.banned),
        limited: parseBanlistField(suggestion.limited),
        semilimited: parseBanlistField(suggestion.semilimited),
        unlimited: parseBanlistField(suggestion.unlimited),
      },
    );

    if (!banlistResult.success) {
      return { success: false, error: banlistResult.error };
    }

    // Get the newly created banlist for image generation
    const newBanlist = await prisma.banlist.findFirst({
      where: { sessionId: currentBanlist.sessionId + 1 },
    });

    if (newBanlist) {
      // Generate banlist image
      try {
        const { saveBanlistImage } = await import('@lib/banlistImage');
        await saveBanlistImage({
          sessionNumber: newBanlist.sessionId,
          banned: parseBanlistField(newBanlist.banned),
          limited: parseBanlistField(newBanlist.limited),
          semilimited: parseBanlistField(newBanlist.semilimited),
          unlimited: parseBanlistField(newBanlist.unlimited),
        });
        console.log(`Banlist image generated for session ${newBanlist.sessionId}`);
      } catch (imageError) {
        console.error('Failed to generate banlist image:', imageError);
        // Don't fail the entire operation if image generation fails
      }
    }

    // Revalidate pages to show new state
    revalidatePath('/banlist/voting');
    revalidatePath('/banlist/current');
    revalidatePath('/');

    // Send Discord notification for the new banlist
    const { notifyBanlistChosen } = await import('@lib/discordClient');
    await notifyBanlistChosen(currentBanlist.sessionId + 1);

    return { success: true };
  } catch (error) {
    console.error('Error selecting winning suggestion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to select winner',
    };
  }
}

export async function submitVotes(
  suggestionIds: number[],
): Promise<SubmitVotesResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate minimum votes
    if (suggestionIds.length < 2) {
      return {
        success: false,
        error: 'You must vote for at least 2 suggestions',
      };
    }

    // // Get active session
    // const activeSession = await prisma.session.findFirst({
    //   where: { active: true },
    // });

    // if (!activeSession) {
    //   return { success: false, error: 'No active session found' };
    // }

    // Get banlist for active session
    const banlist = await getMostRecentBanlist();

    if (!banlist || !banlist.banlist) {
      return { success: false, error: 'No banlist found for active session' };
    }

    // Verify all suggestions belong to this banlist
    const suggestions = await prisma.banlistSuggestion.findMany({
      where: {
        id: { in: suggestionIds },
        banlistId: banlist.banlist.id,
      },
    });

    if (suggestions.length !== suggestionIds.length) {
      return { success: false, error: 'Invalid suggestion IDs' };
    }

    // Delete existing votes and create new ones in a transaction
    await prisma.$transaction([
      // Delete any existing votes from this user for this session
      prisma.banlistSuggestionVote.deleteMany({
        where: {
          playerId: user.playerId,
          suggestionId: { in: suggestions.map((s) => s.id) },
        },
      }),
      // Create new votes
      prisma.banlistSuggestionVote.createMany({
        data: suggestionIds.map((id) => ({
          playerId: user.playerId,
          suggestionId: id,
        })),
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error('Error submitting votes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit votes',
    };
  }
}

export async function clearWinningSuggestion(): Promise<SelectWinnerResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get the active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    if (!activeSession) {
      return {
        success: false,
        error: 'No active session found',
      };
    }

    // Check if user is the moderator for this session
    if (!activeSession.moderatorId) {
      return {
        success: false,
        error: 'No moderator has been selected for this session yet',
      };
    }

    if (user.playerId !== activeSession.moderatorId) {
      return {
        success: false,
        error: 'Only the moderator can clear the winning suggestion',
      };
    }

    // Get the banlist for this session
    const banlist = await prisma.banlist.findFirst({
      where: { sessionId: activeSession.number },
    });

    if (!banlist) {
      return { success: false, error: 'No banlist found' };
    }

    // Find and clear the chosen suggestion
    const chosenSuggestion = await prisma.banlistSuggestion.findFirst({
      where: {
        banlistId: banlist.id,
        chosen: true,
      },
    });

    if (!chosenSuggestion) {
      return { success: false, error: 'No chosen suggestion to clear' };
    }

    // Unmark as chosen and clear moderator
    await prisma.banlistSuggestion.update({
      where: { id: chosenSuggestion.id },
      data: {
        chosen: false,
        moderatorId: null,
      },
    });

    // Delete the next session's banlist since the selection changed
    await prisma.banlist.deleteMany({
      where: { sessionId: activeSession.number + 1 },
    });

    // Revalidate pages to show new state
    revalidatePath('/banlist/voting');
    revalidatePath('/banlist/current');
    revalidatePath('/');

    return { success: true };
  } catch (error) {
    console.error('Error clearing winning suggestion:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to clear selection',
    };
  }
}
