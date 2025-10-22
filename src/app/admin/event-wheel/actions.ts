'use server';

import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@lib/auth';
import { revalidatePath } from 'next/cache';

export interface EventWheelEntry {
  id: number;
  name: string;
  description: string;
  chance: number;
}

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

/**
 * Get the current event wheel status and check if it can be spun
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

    // Check if already spun
    if (activeSession.eventWheelSpun) {
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

    // Check if already spun
    if (activeSession.eventWheelSpun) {
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

    // Mark session as spun
    await prisma.session.update({
      where: { id: activeSession.id },
      data: { eventWheelSpun: true },
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
