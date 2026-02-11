'use server';

import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@lib/auth';
import { revalidatePath } from 'next/cache';

export interface PlayerForModeratorSelection {
  id: number;
  name: string;
  wasLastModerator: boolean;
}

export interface ModeratorSelectionStatusResult {
  success: boolean;
  error?: string;
  canSpin: boolean;
  reason?: string;
  players: PlayerForModeratorSelection[];
  activeSessionNumber?: number;
  alreadySelected: boolean;
  selectedModeratorId?: number;
  selectedModeratorName?: string;
  useRandomBanlist?: boolean;
  useTrueDemocracy?: boolean;
}

export interface SpinModeratorWheelResult {
  success: boolean;
  error?: string;
  selectedModerator?: {
    id: number;
    name: string;
  };
}

export interface RandomBanlistResult {
  success: boolean;
  error?: string;
  selectedSuggestion?: {
    id: number;
    playerName: string;
  };
}

/**
 * Get the current moderator selection status and eligible players
 */
export async function getModeratorSelectionStatus(): Promise<ModeratorSelectionStatusResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
        canSpin: false,
        players: [],
        alreadySelected: false,
      };
    }

    // Get active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    if (!activeSession) {
      return {
        success: false,
        error: 'No active session found',
        canSpin: false,
        players: [],
        alreadySelected: false,
      };
    }

    // Check for skip moderator modifier
    const modifiers = await prisma.sessionModifier.findUnique({
      where: { sessionId: activeSession.id },
    });

    const useRandomBanlist = modifiers?.skipModeratorRandomBanlist || false;
    const useTrueDemocracy = modifiers?.trueDemocracyBanlist || false;

    // Check if moderator already selected (but allow re-spinning)
    let currentModerator = null;
    if (activeSession.moderatorId) {
      currentModerator = await prisma.player.findUnique({
        where: { id: activeSession.moderatorId },
      });
    }

    // Get previous session to find last moderator
    const previousSession = await prisma.session.findFirst({
      where: {
        number: activeSession.number - 1,
        complete: true,
      },
    });

    const lastModeratorId = previousSession?.moderatorId;

    // Get all players
    const players = await prisma.player.findMany({
      orderBy: { name: 'asc' },
    });

    // Check if all players have voted (relaxed in dev for testing)
    const isDev = process.env.NODE_ENV === 'development';
    const activeBanlist = await prisma.banlist.findFirst({
      where: { sessionId: activeSession.number },
    });

    if (!activeBanlist && !isDev) {
      return {
        success: true,
        canSpin: false,
        reason: 'Active session does not have a banlist',
        players: players.map((p) => ({
          id: p.id,
          name: p.name,
          wasLastModerator: p.id === lastModeratorId,
        })),
        alreadySelected: false,
        activeSessionNumber: activeSession.number,
      };
    }

    // Get all suggestions for this banlist
    const suggestions = activeBanlist ? await prisma.banlistSuggestion.findMany({
      where: { banlistId: activeBanlist.id },
    }) : [];

    if (suggestions.length === 0 && !isDev) {
      return {
        success: true,
        canSpin: false,
        reason: 'No banlist suggestions submitted yet',
        players: players.map((p) => ({
          id: p.id,
          name: p.name,
          wasLastModerator: p.id === lastModeratorId,
        })),
        alreadySelected: false,
        activeSessionNumber: activeSession.number,
      };
    }

    // Count unique players who have voted
    const votedPlayers = await prisma.banlistSuggestionVote.findMany({
      where: {
        suggestionId: { in: suggestions.map((s) => s.id) },
      },
      select: {
        playerId: true,
      },
      distinct: ['playerId'],
    });

    const totalPlayers = players.length;
    const allPlayersVoted = votedPlayers.length >= totalPlayers;

    if (!allPlayersVoted && !isDev) {
      return {
        success: true,
        canSpin: false,
        reason: `Only ${votedPlayers.length}/${totalPlayers} players have voted on banlist suggestions`,
        players: players.map((p) => ({
          id: p.id,
          name: p.name,
          wasLastModerator: p.id === lastModeratorId,
        })),
        alreadySelected: false,
        activeSessionNumber: activeSession.number,
      };
    }

    return {
      success: true,
      canSpin: true,
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        wasLastModerator: p.id === lastModeratorId,
      })),
      alreadySelected: !!activeSession.moderatorId,
      activeSessionNumber: activeSession.number,
      selectedModeratorId: activeSession.moderatorId || undefined,
      selectedModeratorName: currentModerator?.name,
      useRandomBanlist,
      useTrueDemocracy,
    };
  } catch (error) {
    console.error('Error getting moderator selection status:', error);
    return {
      success: false,
      error: 'Failed to load moderator selection status',
      canSpin: false,
      players: [],
      alreadySelected: false,
    };
  }
}

/**
 * Spin the wheel and select a random moderator from eligible players
 */
export async function spinModeratorWheel(
  eligiblePlayerIds: number[],
): Promise<SpinModeratorWheelResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    // Validate that there are eligible players
    if (eligiblePlayerIds.length === 0) {
      return {
        success: false,
        error: 'No eligible players selected',
      };
    }

    // Get active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    if (!activeSession) {
      return {
        success: false,
        error: 'No active session found',
      };
    }

    // Verify all eligible player IDs exist
    const players = await prisma.player.findMany({
      where: { id: { in: eligiblePlayerIds } },
    });

    if (players.length !== eligiblePlayerIds.length) {
      return {
        success: false,
        error: 'Invalid player IDs provided',
      };
    }

    // Randomly select a moderator
    const randomIndex = Math.floor(Math.random() * eligiblePlayerIds.length);
    const selectedModeratorId = eligiblePlayerIds[randomIndex];
    const selectedModerator = players.find((p) => p.id === selectedModeratorId);

    if (!selectedModerator) {
      return {
        success: false,
        error: 'Failed to find selected moderator',
      };
    }

    // Update session with moderator
    await prisma.session.update({
      where: { id: activeSession.id },
      data: {
        moderatorId: selectedModeratorId,
      },
    });

    revalidatePath('/admin/moderator-selection');
    revalidatePath('/banlist/voting');

    return {
      success: true,
      selectedModerator: {
        id: selectedModerator.id,
        name: selectedModerator.name,
      },
    };
  } catch (error) {
    console.error('Error spinning moderator wheel:', error);
    return {
      success: false,
      error: 'Failed to select moderator',
    };
  }
}

/**
 * Select a random banlist suggestion (RNG Moderation mode)
 * Randomly chooses a suggestion with 2+ votes and applies it as the chosen banlist
 */
export async function selectRandomBanlistSuggestion(): Promise<RandomBanlistResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    // Get active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    if (!activeSession) {
      return {
        success: false,
        error: 'No active session found',
      };
    }

    // Get active banlist
    const activeBanlist = await prisma.banlist.findFirst({
      where: { sessionId: activeSession.number },
    });

    if (!activeBanlist) {
      return {
        success: false,
        error: 'No active banlist found',
      };
    }

    // Get all suggestions for this banlist with their vote counts
    const suggestions = await prisma.banlistSuggestion.findMany({
      where: { banlistId: activeBanlist.id },
      include: {
        player: true,
        votes: true,
      },
    });

    // Filter to suggestions with 2+ votes
    const eligibleSuggestions = suggestions.filter((s) => s.votes.length >= 2);

    if (eligibleSuggestions.length === 0) {
      return {
        success: false,
        error: 'No suggestions with 2+ votes found',
      };
    }

    // Randomly select one
    const randomIndex = Math.floor(Math.random() * eligibleSuggestions.length);
    const selectedSuggestion = eligibleSuggestions[randomIndex];

    // Mark as chosen
    await prisma.banlistSuggestion.update({
      where: { id: selectedSuggestion.id },
      data: { chosen: true },
    });

    // Create new banlist for next session (merge with current)
    const currentBanned = activeBanlist.banned as number[] | string;
    const currentLimited = activeBanlist.limited as number[] | string;
    const currentSemilimited = activeBanlist.semilimited as number[] | string;
    const currentUnlimited = activeBanlist.unlimited as number[] | string;

    const suggestionBanned = selectedSuggestion.banned as number[] | string;
    const suggestionLimited = selectedSuggestion.limited as number[] | string;
    const suggestionSemilimited = selectedSuggestion.semilimited as number[] | string;
    const suggestionUnlimited = selectedSuggestion.unlimited as number[] | string;

    // Parse JSON if needed
    const parseCardList = (list: number[] | string): number[] => {
      if (typeof list === 'string') {
        return JSON.parse(list);
      }
      return list;
    };

    const currentBannedList = parseCardList(currentBanned);
    const currentLimitedList = parseCardList(currentLimited);
    const currentSemilimitedList = parseCardList(currentSemilimited);
    const currentUnlimitedList = parseCardList(currentUnlimited);

    const suggestionBannedList = parseCardList(suggestionBanned);
    const suggestionLimitedList = parseCardList(suggestionLimited);
    const suggestionSemilimitedList = parseCardList(suggestionSemilimited);
    const suggestionUnlimitedList = parseCardList(suggestionUnlimited);

    // Create merged lists (suggestion cards move to their new categories, others stay)
    const allAffectedCards = new Set([
      ...suggestionBannedList,
      ...suggestionLimitedList,
      ...suggestionSemilimitedList,
      ...suggestionUnlimitedList,
    ]);

    const newBanned = [
      ...currentBannedList.filter((id) => !allAffectedCards.has(id)),
      ...suggestionBannedList,
    ];

    const newLimited = [
      ...currentLimitedList.filter((id) => !allAffectedCards.has(id)),
      ...suggestionLimitedList,
    ];

    const newSemilimited = [
      ...currentSemilimitedList.filter((id) => !allAffectedCards.has(id)),
      ...suggestionSemilimitedList,
    ];

    const newUnlimited = [
      ...currentUnlimitedList.filter((id) => !allAffectedCards.has(id)),
      ...suggestionUnlimitedList,
    ];

    // Create banlist for next session
    await prisma.banlist.create({
      data: {
        sessionId: activeSession.number + 1,
        banned: newBanned,
        limited: newLimited,
        semilimited: newSemilimited,
        unlimited: newUnlimited,
      },
    });

    // Mark session as having a moderator (skip actual moderator selection)
    await prisma.session.update({
      where: { id: activeSession.id },
      data: {
        moderatorId: -1, // Special value indicating "RNG Moderation" mode
      },
    });

    revalidatePath('/admin/moderator-selection');
    revalidatePath('/banlist/voting');

    return {
      success: true,
      selectedSuggestion: {
        id: selectedSuggestion.id,
        playerName: selectedSuggestion.player.name,
      },
    };
  } catch (error) {
    console.error('Error selecting random banlist suggestion:', error);
    return {
      success: false,
      error: 'Failed to select random banlist',
    };
  }
}

/**
 * Select the most voted banlist suggestion (True Democracy mode)
 * Chooses the suggestion with the most votes
 * In case of a tie, randomly selects among the tied suggestions
 */
export async function selectMostVotedBanlistSuggestion(): Promise<RandomBanlistResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    // Get active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    if (!activeSession) {
      return {
        success: false,
        error: 'No active session found',
      };
    }

    // Get active banlist
    const activeBanlist = await prisma.banlist.findFirst({
      where: { sessionId: activeSession.number },
    });

    if (!activeBanlist) {
      return {
        success: false,
        error: 'No active banlist found',
      };
    }

    // Get all suggestions for this banlist with their vote counts
    const suggestions = await prisma.banlistSuggestion.findMany({
      where: { banlistId: activeBanlist.id },
      include: {
        player: true,
        votes: true,
      },
    });

    if (suggestions.length === 0) {
      return {
        success: false,
        error: 'No suggestions found',
      };
    }

    // Find the maximum vote count
    const maxVotes = Math.max(...suggestions.map((s) => s.votes.length));

    // Filter to suggestions with the maximum vote count
    const topSuggestions = suggestions.filter((s) => s.votes.length === maxVotes);

    // Randomly select one if there's a tie
    const randomIndex = Math.floor(Math.random() * topSuggestions.length);
    const selectedSuggestion = topSuggestions[randomIndex];

    // Mark as chosen
    await prisma.banlistSuggestion.update({
      where: { id: selectedSuggestion.id },
      data: { chosen: true },
    });

    // Create new banlist for next session (merge with current)
    const currentBanned = activeBanlist.banned as number[] | string;
    const currentLimited = activeBanlist.limited as number[] | string;
    const currentSemilimited = activeBanlist.semilimited as number[] | string;
    const currentUnlimited = activeBanlist.unlimited as number[] | string;

    const suggestionBanned = selectedSuggestion.banned as number[] | string;
    const suggestionLimited = selectedSuggestion.limited as number[] | string;
    const suggestionSemilimited = selectedSuggestion.semilimited as number[] | string;
    const suggestionUnlimited = selectedSuggestion.unlimited as number[] | string;

    // Parse JSON if needed
    const parseCardList = (list: number[] | string): number[] => {
      if (typeof list === 'string') {
        return JSON.parse(list);
      }
      return list;
    };

    const currentBannedList = parseCardList(currentBanned);
    const currentLimitedList = parseCardList(currentLimited);
    const currentSemilimitedList = parseCardList(currentSemilimited);
    const currentUnlimitedList = parseCardList(currentUnlimited);

    const suggestionBannedList = parseCardList(suggestionBanned);
    const suggestionLimitedList = parseCardList(suggestionLimited);
    const suggestionSemilimitedList = parseCardList(suggestionSemilimited);
    const suggestionUnlimitedList = parseCardList(suggestionUnlimited);

    // Create merged lists (suggestion cards move to their new categories, others stay)
    const allAffectedCards = new Set([
      ...suggestionBannedList,
      ...suggestionLimitedList,
      ...suggestionSemilimitedList,
      ...suggestionUnlimitedList,
    ]);

    const newBanned = [
      ...currentBannedList.filter((id) => !allAffectedCards.has(id)),
      ...suggestionBannedList,
    ];

    const newLimited = [
      ...currentLimitedList.filter((id) => !allAffectedCards.has(id)),
      ...suggestionLimitedList,
    ];

    const newSemilimited = [
      ...currentSemilimitedList.filter((id) => !allAffectedCards.has(id)),
      ...suggestionSemilimitedList,
    ];

    const newUnlimited = [
      ...currentUnlimitedList.filter((id) => !allAffectedCards.has(id)),
      ...suggestionUnlimitedList,
    ];

    // Create banlist for next session
    await prisma.banlist.create({
      data: {
        sessionId: activeSession.number + 1,
        banned: newBanned,
        limited: newLimited,
        semilimited: newSemilimited,
        unlimited: newUnlimited,
      },
    });

    // Mark session as having a moderator (skip actual moderator selection)
    await prisma.session.update({
      where: { id: activeSession.id },
      data: {
        moderatorId: -2, // Special value indicating "True Democracy" mode (-1 is RNG, -2 is True Democracy)
      },
    });

    revalidatePath('/admin/moderator-selection');
    revalidatePath('/banlist/voting');

    return {
      success: true,
      selectedSuggestion: {
        id: selectedSuggestion.id,
        playerName: selectedSuggestion.player.name,
      },
    };
  } catch (error) {
    console.error('Error selecting most voted banlist suggestion:', error);
    return {
      success: false,
      error: 'Failed to select most voted banlist',
    };
  }
}
