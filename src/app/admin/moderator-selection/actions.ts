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
}

export interface SpinModeratorWheelResult {
  success: boolean;
  error?: string;
  selectedModerator?: {
    id: number;
    name: string;
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
