'use server';

import { prisma } from '@lib/prisma';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@lib/auth';
import { revalidatePath } from 'next/cache';
import type { EventWheelEntry } from '@prisma/client';

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

export interface SessionModifiers {
  doubleWalletPoints: boolean;
  awardTwoVictoryPoints: boolean;
  oddPlacementBonus: boolean;
  evenPlacementBonus: boolean;
  reverseVpOrder: boolean;
  matchWinBonus: boolean;
  adminHalveWallet: boolean;
  equalSplitWallet: boolean;
  halveAllWalletPoints: boolean;
  bountyHunter: boolean;
  earlyDecklistPublic: boolean;
  allowMultipleEventSpins: boolean;
  skipModeratorRandomBanlist: boolean;
  trueDemocracyBanlist: boolean;
  halvedPlayerIds: number[] | null;
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
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Authentication required',
        canSpin: false,
        entries: [],
        alreadySpun: false,
      };
    }

    // Get active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

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
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
        canSpin: false,
        entries: [],
        alreadySpun: false,
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
        entries: [],
        alreadySpun: false,
      };
    }

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

    // Calculate total chance
    const totalChance = entries.reduce((sum, entry) => sum + entry.chance, 0);

    // Normalize if over 100%, otherwise add "no event" option
    let normalizedEntries: Array<{ entry: EventWheelEntry | null; weight: number }>;

    if (totalChance >= 100) {
      // Normalize to 100%
      normalizedEntries = entries.map(entry => ({
        entry,
        weight: (entry.chance / totalChance) * 100,
      }));
    } else {
      // Add "no event" with remaining percentage
      const noEventChance = 100 - totalChance;
      normalizedEntries = [
        ...entries.map(entry => ({ entry, weight: entry.chance })),
        { entry: null, weight: noEventChance },
      ];
    }

    // Select a random entry based on weighted probabilities
    const random = Math.random() * 100;
    let cumulative = 0;
    let selectedEntry: EventWheelEntry | null = null;

    for (const { entry, weight } of normalizedEntries) {
      cumulative += weight;
      if (random <= cumulative) {
        selectedEntry = entry;
        break;
      }
    }

    // Apply event modifiers to session if an event was selected
    if (selectedEntry) {
      // Fetch existing modifiers
      const existingModifiers = await prisma.sessionModifier.findUnique({
        where: { sessionId: activeSession.id },
      });

      // Merge modifiers using OR logic (if ANY event enables it, it's active)
      const mergedModifiers = {
        doubleWalletPoints:
          (existingModifiers?.doubleWalletPoints || false) || selectedEntry.doubleWalletPoints,
        awardTwoVictoryPoints:
          (existingModifiers?.awardTwoVictoryPoints || false) || selectedEntry.awardTwoVictoryPoints,
        oddPlacementBonus:
          (existingModifiers?.oddPlacementBonus || false) || selectedEntry.oddPlacementBonus,
        evenPlacementBonus:
          (existingModifiers?.evenPlacementBonus || false) || selectedEntry.evenPlacementBonus,
        reverseVpOrder:
          (existingModifiers?.reverseVpOrder || false) || selectedEntry.reverseVpOrder,
        matchWinBonus:
          (existingModifiers?.matchWinBonus || false) || selectedEntry.matchWinBonus,
        adminHalveWallet:
          (existingModifiers?.adminHalveWallet || false) || selectedEntry.adminHalveWallet,
        equalSplitWallet:
          (existingModifiers?.equalSplitWallet || false) || selectedEntry.equalSplitWallet,
        halveAllWalletPoints:
          (existingModifiers?.halveAllWalletPoints || false) || selectedEntry.halveAllWalletPoints,
        bountyHunter:
          (existingModifiers?.bountyHunter || false) || selectedEntry.bountyHunter,
        earlyDecklistPublic:
          (existingModifiers?.earlyDecklistPublic || false) || selectedEntry.earlyDecklistPublic,
        allowMultipleEventSpins:
          (existingModifiers?.allowMultipleEventSpins || false) || selectedEntry.allowMultipleEventSpins,
        skipModeratorRandomBanlist:
          (existingModifiers?.skipModeratorRandomBanlist || false) || selectedEntry.skipModeratorRandomBanlist,
        trueDemocracyBanlist:
          (existingModifiers?.trueDemocracyBanlist || false) || selectedEntry.trueDemocracyBanlist,
        halvedPlayerIds: selectedEntry.halvedPlayerIds || existingModifiers?.halvedPlayerIds || Prisma.JsonNull,
      };

      // Upsert session modifiers
      await prisma.sessionModifier.upsert({
        where: { sessionId: activeSession.id },
        create: { sessionId: activeSession.id, ...mergedModifiers },
        update: mergedModifiers,
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

    // Merge modifiers using OR logic (if ANY event enables it, it's active)
    const mergedModifiers = {
      doubleWalletPoints:
        (existingModifiers?.doubleWalletPoints || false) || selectedEntry.doubleWalletPoints,
      awardTwoVictoryPoints:
        (existingModifiers?.awardTwoVictoryPoints || false) || selectedEntry.awardTwoVictoryPoints,
      oddPlacementBonus:
        (existingModifiers?.oddPlacementBonus || false) || selectedEntry.oddPlacementBonus,
      evenPlacementBonus:
        (existingModifiers?.evenPlacementBonus || false) || selectedEntry.evenPlacementBonus,
      reverseVpOrder:
        (existingModifiers?.reverseVpOrder || false) || selectedEntry.reverseVpOrder,
      matchWinBonus:
        (existingModifiers?.matchWinBonus || false) || selectedEntry.matchWinBonus,
      adminHalveWallet:
        (existingModifiers?.adminHalveWallet || false) || selectedEntry.adminHalveWallet,
      equalSplitWallet:
        (existingModifiers?.equalSplitWallet || false) || selectedEntry.equalSplitWallet,
      halveAllWalletPoints:
        (existingModifiers?.halveAllWalletPoints || false) || selectedEntry.halveAllWalletPoints,
      bountyHunter:
        (existingModifiers?.bountyHunter || false) || selectedEntry.bountyHunter,
      earlyDecklistPublic:
        (existingModifiers?.earlyDecklistPublic || false) || selectedEntry.earlyDecklistPublic,
      allowMultipleEventSpins:
        (existingModifiers?.allowMultipleEventSpins || false) || selectedEntry.allowMultipleEventSpins,
      skipModeratorRandomBanlist:
        (existingModifiers?.skipModeratorRandomBanlist || false) || selectedEntry.skipModeratorRandomBanlist,
      trueDemocracyBanlist:
        (existingModifiers?.trueDemocracyBanlist || false) || selectedEntry.trueDemocracyBanlist,
      halvedPlayerIds: selectedEntry.halvedPlayerIds || existingModifiers?.halvedPlayerIds || Prisma.JsonNull,
    };

    // Upsert session modifiers
    await prisma.sessionModifier.upsert({
      where: { sessionId: activeSession.id },
      create: { sessionId: activeSession.id, ...mergedModifiers },
      update: mergedModifiers,
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
