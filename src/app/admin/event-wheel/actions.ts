'use server';

import { prisma } from '@lib/prisma';
import { requireAuth, requireAdmin } from '@lib/serverUtils';
import { getActiveSession, requireActiveSession } from '@lib/sessionHelpers';
import { selectWeightedRandom } from '@lib/randomHelpers';
import { mergeSessionModifiers } from '@lib/sessionModifierHelpers';
import { revalidatePath } from 'next/cache';
import type { EventWheelEntry } from '@prisma/client';
import type { SessionModifiers } from '@/src/types/sessionModifiers';

export interface EventWheelStatusResult {
  success: boolean;
  error?: string;
  canSpin: boolean;
  reason?: string;
  entries: EventWheelEntry[];
  alreadySpun: boolean;
  activeSessionNumber?: number;
}

export interface SpinWheelResult {
  success: boolean;
  error?: string;
  selectedEntry?: {
    name: string;
    description: string;
  } | null;
}

export interface GetActiveModifiersResult {
  success: boolean;
  error?: string;
  modifiers?: SessionModifiers | null;
  selectedEvents?: string[];
}

/**
 * Get event wheel entries (public - anyone can view)
 */
export async function getPublicEventWheelEntries(): Promise<EventWheelStatusResult> {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error,
        canSpin: false,
        entries: [],
        alreadySpun: false,
      };
    }

    // Get active session
    const activeSession = await getActiveSession();

    if (!activeSession) {
      // Return empty state if no active session
      const entries = await prisma.eventWheelEntry.findMany({
        orderBy: { id: 'asc' },
      });

      return {
        success: true,
        canSpin: false,
        entries,
        alreadySpun: false,
      };
    }

    // Get event wheel entries
    const entries = await prisma.eventWheelEntry.findMany({
      orderBy: { id: 'asc' },
    });

    return {
      success: true,
      canSpin: false, // Non-admins can't spin
      entries,
      alreadySpun: activeSession.eventWheelSpun,
      activeSessionNumber: activeSession.number,
    };
  } catch (error) {
    console.error('Error getting event wheel entries:', error);
    return {
      success: false,
      error: 'Failed to load event wheel entries',
      canSpin: false,
      entries: [],
      alreadySpun: false,
    };
  }
}

/**
 * Get the current event wheel status and check if it can be spun (admin-only)
 */
export async function getEventWheelStatus(): Promise<EventWheelStatusResult> {
  try {
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error,
        canSpin: false,
        entries: [],
        alreadySpun: false,
      };
    }

    const sessionResult = await requireActiveSession();
    if (!sessionResult.success) {
      return {
        success: false,
        error: sessionResult.error,
        canSpin: false,
        entries: [],
        alreadySpun: false,
      };
    }
    const activeSession = sessionResult.data;

    // Check if already spun (allow re-spin in dev or if allowMultipleEventSpins is active)
    const currentModifiers = await prisma.sessionModifier.findUnique({
      where: { sessionId: activeSession.id },
    });

    const isDev = process.env.NODE_ENV === 'development';
    const allowMultipleSpin = currentModifiers?.allowMultipleEventSpins || false;

    if (activeSession.eventWheelSpun && !isDev && !allowMultipleSpin) {
      const entries = await prisma.eventWheelEntry.findMany({
        orderBy: { id: 'asc' },
      });

      return {
        success: true,
        canSpin: false,
        reason: 'Event wheel has already been spun for this session',
        entries,
        alreadySpun: true,
        activeSessionNumber: activeSession.number,
      };
    }

    // Count total players
    const totalPlayers = await prisma.player.count();

    // Count submitted decklists for active session
    const submittedDecklists = await prisma.decklist.count({
      where: { sessionId: activeSession.id },
    });

    // Check if all players have submitted decklists
    const allDecksSubmitted = submittedDecklists >= totalPlayers;

    // Get event wheel entries
    const entries = await prisma.eventWheelEntry.findMany({
      orderBy: { id: 'asc' },
    });

    if (!allDecksSubmitted) {
      return {
        success: true,
        canSpin: false,
        reason: `Only ${submittedDecklists}/${totalPlayers} players have submitted decklists`,
        entries,
        alreadySpun: false,
        activeSessionNumber: activeSession.number,
      };
    }

    return {
      success: true,
      canSpin: true,
      entries,
      alreadySpun: false,
      activeSessionNumber: activeSession.number,
    };
  } catch (error) {
    console.error('Error getting event wheel status:', error);
    return {
      success: false,
      error: 'Failed to load event wheel status',
      canSpin: false,
      entries: [],
      alreadySpun: false,
    };
  }
}

/**
 * Spin the event wheel and select a random entry based on weighted probabilities
 */
export async function spinEventWheel(): Promise<SpinWheelResult> {
  try {
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error,
      };
    }

    const sessionResult = await requireActiveSession();
    if (!sessionResult.success) {
      return {
        success: false,
        error: sessionResult.error,
      };
    }
    const activeSession = sessionResult.data;

    // Check if already spun (allow re-spin in dev or if allowMultipleEventSpins is active)
    const currentModifiers = await prisma.sessionModifier.findUnique({
      where: { sessionId: activeSession.id },
    });

    const isDev = process.env.NODE_ENV === 'development';
    const canSpin =
      !activeSession.eventWheelSpun ||
      currentModifiers?.allowMultipleEventSpins ||
      isDev;

    if (!canSpin) {
      return {
        success: false,
        error: 'Event wheel has already been spun for this session',
      };
    }

    // Verify all decklists are submitted
    const totalPlayers = await prisma.player.count();
    const submittedDecklists = await prisma.decklist.count({
      where: { sessionId: activeSession.id },
    });

    if (submittedDecklists < totalPlayers) {
      return {
        success: false,
        error: `Cannot spin: only ${submittedDecklists}/${totalPlayers} players have submitted decklists`,
      };
    }

    // Get event wheel entries
    const entries = await prisma.eventWheelEntry.findMany({
      orderBy: { id: 'asc' },
    });

    if (entries.length === 0) {
      // No entries, mark as spun but no event selected
      await prisma.session.update({
        where: { id: activeSession.id },
        data: { eventWheelSpun: true },
      });

      revalidatePath('/admin/event-wheel');

      return {
        success: true,
        selectedEntry: null,
      };
    }

    // Select a random entry based on weighted probabilities
    const selectedEntry = selectWeightedRandom(entries);

    // Apply event modifiers to session if an event was selected
    if (selectedEntry) {
      // Fetch existing modifiers
      const existingModifiers = await prisma.sessionModifier.findUnique({
        where: { sessionId: activeSession.id },
      });

      // Parse halvedPlayerIds from JsonValue
      const halvedPlayerIds = Array.isArray(selectedEntry.halvedPlayerIds)
        ? (selectedEntry.halvedPlayerIds as number[])
        : null;

      // Merge modifiers using OR logic (if ANY event enables it, it's active)
      const mergedModifiers = mergeSessionModifiers(
        existingModifiers ? {
          doubleWalletPoints: existingModifiers.doubleWalletPoints,
          awardTwoVictoryPoints: existingModifiers.awardTwoVictoryPoints,
          oddPlacementBonus: existingModifiers.oddPlacementBonus,
          evenPlacementBonus: existingModifiers.evenPlacementBonus,
          reverseVpOrder: existingModifiers.reverseVpOrder,
          matchWinBonus: existingModifiers.matchWinBonus,
          adminHalveWallet: existingModifiers.adminHalveWallet,
          equalSplitWallet: existingModifiers.equalSplitWallet,
          halveAllWalletPoints: existingModifiers.halveAllWalletPoints,
          bountyHunter: existingModifiers.bountyHunter,
          earlyDecklistPublic: existingModifiers.earlyDecklistPublic,
          allowMultipleEventSpins: existingModifiers.allowMultipleEventSpins,
          skipModeratorRandomBanlist: existingModifiers.skipModeratorRandomBanlist,
          trueDemocracyBanlist: existingModifiers.trueDemocracyBanlist,
          gamblingEnabled: existingModifiers.gamblingEnabled,
          halvedPlayerIds: Array.isArray(existingModifiers.halvedPlayerIds)
            ? (existingModifiers.halvedPlayerIds as number[])
            : null,
        } : null,
        {
          doubleWalletPoints: selectedEntry.doubleWalletPoints,
          awardTwoVictoryPoints: selectedEntry.awardTwoVictoryPoints,
          oddPlacementBonus: selectedEntry.oddPlacementBonus,
          evenPlacementBonus: selectedEntry.evenPlacementBonus,
          reverseVpOrder: selectedEntry.reverseVpOrder,
          matchWinBonus: selectedEntry.matchWinBonus,
          adminHalveWallet: selectedEntry.adminHalveWallet,
          equalSplitWallet: selectedEntry.equalSplitWallet,
          halveAllWalletPoints: selectedEntry.halveAllWalletPoints,
          bountyHunter: selectedEntry.bountyHunter,
          earlyDecklistPublic: selectedEntry.earlyDecklistPublic,
          allowMultipleEventSpins: selectedEntry.allowMultipleEventSpins,
          skipModeratorRandomBanlist: selectedEntry.skipModeratorRandomBanlist,
          trueDemocracyBanlist: selectedEntry.trueDemocracyBanlist,
          gamblingEnabled: selectedEntry.gamblingEnabled,
          halvedPlayerIds: halvedPlayerIds,
        }
      );

      // Upsert session modifiers with proper JSON handling
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { halvedPlayerIds: _, ...modifiersWithoutHalvedPlayerIds } = mergedModifiers;
      await prisma.sessionModifier.upsert({
        where: { sessionId: activeSession.id },
        create: {
          sessionId: activeSession.id,
          ...modifiersWithoutHalvedPlayerIds,
          halvedPlayerIds: mergedModifiers.halvedPlayerIds ? mergedModifiers.halvedPlayerIds : undefined,
        },
        update: {
          ...modifiersWithoutHalvedPlayerIds,
          halvedPlayerIds: mergedModifiers.halvedPlayerIds ? mergedModifiers.halvedPlayerIds : undefined,
        },
      });
    }

    // Parse existing selected events (JSON array)
    const currentEvents = activeSession.selectedEvents
      ? JSON.parse(activeSession.selectedEvents)
      : [];

    // Add new event to array
    if (selectedEntry) {
      currentEvents.push(selectedEntry.name);
    }

    // Mark session as spun and store selected events
    await prisma.session.update({
      where: { id: activeSession.id },
      data: {
        eventWheelSpun: true,
        selectedEvents: JSON.stringify(currentEvents),
      },
    });

    revalidatePath('/admin/event-wheel');

    return {
      success: true,
      selectedEntry: selectedEntry
        ? {
            name: selectedEntry.name,
            description: selectedEntry.description,
          }
        : null,
    };
  } catch (error) {
    console.error('Error spinning event wheel:', error);
    return {
      success: false,
      error: 'Failed to spin event wheel',
    };
  }
}

/**
 * Manually apply an event entry's modifiers (TESTING ONLY - non-production)
 */
export async function manuallyApplyEventEntry(entryId: number): Promise<SpinWheelResult> {
  try {
    // Only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'Manual event selection is not available in production',
      };
    }

    const authResult = await requireAdmin();
    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error,
      };
    }

    const sessionResult = await requireActiveSession();
    if (!sessionResult.success) {
      return {
        success: false,
        error: sessionResult.error,
      };
    }
    const activeSession = sessionResult.data;

    // Get the selected entry
    const selectedEntry = await prisma.eventWheelEntry.findUnique({
      where: { id: entryId },
    });

    if (!selectedEntry) {
      return {
        success: false,
        error: 'Event entry not found',
      };
    }

    // Apply event modifiers to session
    // Fetch existing modifiers
    const existingModifiers = await prisma.sessionModifier.findUnique({
      where: { sessionId: activeSession.id },
    });

    // Parse halvedPlayerIds from JsonValue
    const halvedPlayerIds = Array.isArray(selectedEntry.halvedPlayerIds)
      ? (selectedEntry.halvedPlayerIds as number[])
      : null;

    // Merge modifiers using OR logic (if ANY event enables it, it's active)
    const mergedModifiers = mergeSessionModifiers(
      existingModifiers ? {
        doubleWalletPoints: existingModifiers.doubleWalletPoints,
        awardTwoVictoryPoints: existingModifiers.awardTwoVictoryPoints,
        oddPlacementBonus: existingModifiers.oddPlacementBonus,
        evenPlacementBonus: existingModifiers.evenPlacementBonus,
        reverseVpOrder: existingModifiers.reverseVpOrder,
        matchWinBonus: existingModifiers.matchWinBonus,
        adminHalveWallet: existingModifiers.adminHalveWallet,
        equalSplitWallet: existingModifiers.equalSplitWallet,
        halveAllWalletPoints: existingModifiers.halveAllWalletPoints,
        bountyHunter: existingModifiers.bountyHunter,
        earlyDecklistPublic: existingModifiers.earlyDecklistPublic,
        allowMultipleEventSpins: existingModifiers.allowMultipleEventSpins,
        skipModeratorRandomBanlist: existingModifiers.skipModeratorRandomBanlist,
        trueDemocracyBanlist: existingModifiers.trueDemocracyBanlist,
        gamblingEnabled: existingModifiers.gamblingEnabled,
        halvedPlayerIds: Array.isArray(existingModifiers.halvedPlayerIds)
          ? (existingModifiers.halvedPlayerIds as number[])
          : null,
      } : null,
      {
        doubleWalletPoints: selectedEntry.doubleWalletPoints,
        awardTwoVictoryPoints: selectedEntry.awardTwoVictoryPoints,
        oddPlacementBonus: selectedEntry.oddPlacementBonus,
        evenPlacementBonus: selectedEntry.evenPlacementBonus,
        reverseVpOrder: selectedEntry.reverseVpOrder,
        matchWinBonus: selectedEntry.matchWinBonus,
        adminHalveWallet: selectedEntry.adminHalveWallet,
        equalSplitWallet: selectedEntry.equalSplitWallet,
        halveAllWalletPoints: selectedEntry.halveAllWalletPoints,
        bountyHunter: selectedEntry.bountyHunter,
        earlyDecklistPublic: selectedEntry.earlyDecklistPublic,
        allowMultipleEventSpins: selectedEntry.allowMultipleEventSpins,
        skipModeratorRandomBanlist: selectedEntry.skipModeratorRandomBanlist,
        trueDemocracyBanlist: selectedEntry.trueDemocracyBanlist,
        gamblingEnabled: selectedEntry.gamblingEnabled,
        halvedPlayerIds: halvedPlayerIds,
      }
    );

    // Upsert session modifiers with proper JSON handling
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { halvedPlayerIds: _, ...modifiersWithoutHalvedPlayerIds } = mergedModifiers;
    await prisma.sessionModifier.upsert({
      where: { sessionId: activeSession.id },
      create: {
        sessionId: activeSession.id,
        ...modifiersWithoutHalvedPlayerIds,
        halvedPlayerIds: mergedModifiers.halvedPlayerIds ? mergedModifiers.halvedPlayerIds : undefined,
      },
      update: {
        ...modifiersWithoutHalvedPlayerIds,
        halvedPlayerIds: mergedModifiers.halvedPlayerIds ? mergedModifiers.halvedPlayerIds : undefined,
      },
    });

    // Parse existing selected events (JSON array)
    const currentEvents = activeSession.selectedEvents
      ? JSON.parse(activeSession.selectedEvents)
      : [];

    // Add new event to array
    currentEvents.push(`${selectedEntry.name} (MANUAL TEST)`);

    // Mark session as spun and store selected events
    await prisma.session.update({
      where: { id: activeSession.id },
      data: {
        eventWheelSpun: true,
        selectedEvents: JSON.stringify(currentEvents),
      },
    });

    revalidatePath('/admin/event-wheel');

    return {
      success: true,
      selectedEntry: {
        name: selectedEntry.name,
        description: selectedEntry.description,
      },
    };
  } catch (error) {
    console.error('Error manually applying event entry:', error);
    return {
      success: false,
      error: 'Failed to apply event entry',
    };
  }
}

/**
 * Reset session modifiers (TESTING ONLY - non-production)
 */
export async function resetSessionModifiers(): Promise<{ success: boolean; error?: string }> {
  try {
    // Only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'Reset is not available in production',
      };
    }

    const authResult = await requireAdmin();
    if (!authResult.success) return authResult;

    const sessionResult = await requireActiveSession();
    if (!sessionResult.success) return sessionResult;
    const activeSession = sessionResult.data;

    // Delete session modifiers
    await prisma.sessionModifier.deleteMany({
      where: { sessionId: activeSession.id },
    });

    // Reset eventWheelSpun and selectedEvents
    await prisma.session.update({
      where: { id: activeSession.id },
      data: {
        eventWheelSpun: false,
        selectedEvents: null,
      },
    });

    revalidatePath('/admin/event-wheel');

    return { success: true };
  } catch (error) {
    console.error('Error resetting session modifiers:', error);
    return {
      success: false,
      error: 'Failed to reset session modifiers',
    };
  }
}

/**
 * Get the active session modifiers
 */
export async function getActiveSessionModifiers(): Promise<GetActiveModifiersResult> {
  try {
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error,
      };
    }

    const sessionResult = await requireActiveSession();
    if (!sessionResult.success) {
      return {
        success: false,
        error: sessionResult.error,
      };
    }
    const activeSession = sessionResult.data;

    // Get session modifiers
    const modifiers = await prisma.sessionModifier.findUnique({
      where: { sessionId: activeSession.id },
    });

    // Parse selected events
    const selectedEvents = activeSession.selectedEvents
      ? JSON.parse(activeSession.selectedEvents)
      : [];

    return {
      success: true,
      modifiers: modifiers
        ? {
            doubleWalletPoints: modifiers.doubleWalletPoints,
            awardTwoVictoryPoints: modifiers.awardTwoVictoryPoints,
            oddPlacementBonus: modifiers.oddPlacementBonus,
            evenPlacementBonus: modifiers.evenPlacementBonus,
            reverseVpOrder: modifiers.reverseVpOrder,
            matchWinBonus: modifiers.matchWinBonus,
            adminHalveWallet: modifiers.adminHalveWallet,
            equalSplitWallet: modifiers.equalSplitWallet,
            halveAllWalletPoints: modifiers.halveAllWalletPoints,
            bountyHunter: modifiers.bountyHunter,
            earlyDecklistPublic: modifiers.earlyDecklistPublic,
            allowMultipleEventSpins: modifiers.allowMultipleEventSpins,
            skipModeratorRandomBanlist: modifiers.skipModeratorRandomBanlist,
            trueDemocracyBanlist: modifiers.trueDemocracyBanlist,
            gamblingEnabled: modifiers.gamblingEnabled,
            halvedPlayerIds: modifiers.halvedPlayerIds as number[] | null,
          }
        : null,
      selectedEvents,
    };
  } catch (error) {
    console.error('Error getting active session modifiers:', error);
    return {
      success: false,
      error: 'Failed to load active session modifiers',
    };
  }
}
