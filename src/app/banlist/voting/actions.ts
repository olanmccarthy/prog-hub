'use server';

import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@lib/auth';
import { getMostRecentBanlist } from '../actions';
import { revalidatePath } from 'next/cache';

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

    // Get current banlist (most recent one)
    const banlist = await prisma.banlist.findFirst({
      orderBy: { id: 'desc' },
    });

    if (!banlist) {
      return { success: false, error: 'No banlist found' };
    }

    console.log('Current banlist:', banlist);

    // Find the completed session that matches this banlist
    const completedSession = await prisma.session.findFirst({
      where: {
        number: banlist.sessionId,
        complete: true,
      },
    });

    // console.log('Completed session for banlist:', completedSession);

    // if (!completedSession) {
    //   return {
    //     success: false,
    //     error: 'No completed session found for current banlist',
    //   };
    // }
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

    // Check if current user is moderator (for now, player ID 1 is always moderator)
    const isModerator = user.playerId === 1;

    // Check if a suggestion has already been chosen
    const chosenSuggestion = suggestions.find((s) => s.chosen);

    return {
      success: true,
      suggestions: suggestions.map((s) => ({
        id: s.id,
        playerId: s.playerId,
        playerName: s.player.name,
        sessionNumber: banlist.sessionId,
        banned: s.banned as number[],
        limited: s.limited as number[],
        semilimited: s.semilimited as number[],
        unlimited: s.unlimited as number[],
        voteCount: s.votes.length,
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
    const currentBanned = new Set(currentBanlist.banned as number[]);
    const currentLimited = new Set(currentBanlist.limited as number[]);
    const currentSemilimited = new Set(currentBanlist.semilimited as number[]);
    const currentUnlimited = new Set(currentBanlist.unlimited as number[]);

    // Build map of card locations from winning suggestion
    const cardLocations = new Map<
      number,
      'banned' | 'limited' | 'semilimited' | 'unlimited'
    >();

    winningSuggestion.banned.forEach((id) => cardLocations.set(id, 'banned'));
    winningSuggestion.limited.forEach((id) => cardLocations.set(id, 'limited'));
    winningSuggestion.semilimited.forEach((id) =>
      cardLocations.set(id, 'semilimited'),
    );
    winningSuggestion.unlimited.forEach((id) =>
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

    // Check if user is moderator (player ID 1)
    if (user.playerId !== 1) {
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

    // Create new banlist for next session from winning suggestion
    const banlistResult = await createBanlistFromWinningSuggestion(
      suggestion.banlistId,
      {
        banned: suggestion.banned as number[],
        limited: suggestion.limited as number[],
        semilimited: suggestion.semilimited as number[],
        unlimited: suggestion.unlimited as number[],
      },
    );

    if (!banlistResult.success) {
      return { success: false, error: banlistResult.error };
    }

    // Revalidate pages to show new state
    revalidatePath('/banlist/voting');
    revalidatePath('/banlist/current');
    revalidatePath('/');

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
