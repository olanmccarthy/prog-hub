'use server';

import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@lib/auth';

export interface LoserPrizingEntry {
  id: number;
  name: string;
  description: string;
  chance: number;
}

export interface LoserPrizingStatusResult {
  success: boolean;
  error?: string;
  entries: LoserPrizingEntry[];
}

export interface SpinLoserPrizingResult {
  success: boolean;
  error?: string;
  selectedEntry?: {
    name: string;
    description: string;
  } | null;
}

/**
 * Get all loser prizing entries
 */
export async function getLoserPrizingEntries(): Promise<LoserPrizingStatusResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
        entries: [],
      };
    }

    // Get loser prizing entries
    const entries = await prisma.loserPrizingEntry.findMany({
      orderBy: { id: 'asc' },
    });

    return {
      success: true,
      entries,
    };
  } catch (error) {
    console.error('Error getting loser prizing entries:', error);
    return {
      success: false,
      error: 'Failed to load loser prizing entries',
      entries: [],
    };
  }
}

/**
 * Spin the loser prizing wheel and select a random entry based on weighted probabilities
 * Note: This wheel can be spun multiple times (no persistence)
 */
export async function spinLoserPrizingWheel(): Promise<SpinLoserPrizingResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    // Get loser prizing entries
    const entries = await prisma.loserPrizingEntry.findMany({
      orderBy: { id: 'asc' },
    });

    if (entries.length === 0) {
      return {
        success: true,
        selectedEntry: null,
      };
    }

    // Calculate total chance
    const totalChance = entries.reduce((sum, entry) => sum + entry.chance, 0);

    // Normalize if over 100%, otherwise add "no prize" option
    let normalizedEntries: Array<{ entry: LoserPrizingEntry | null; weight: number }>;

    if (totalChance >= 100) {
      // Normalize to 100%
      normalizedEntries = entries.map(entry => ({
        entry,
        weight: (entry.chance / totalChance) * 100,
      }));
    } else {
      // Add "no prize" with remaining percentage
      const noPrizeChance = 100 - totalChance;
      normalizedEntries = [
        ...entries.map(entry => ({ entry, weight: entry.chance })),
        { entry: null, weight: noPrizeChance },
      ];
    }

    // Select a random entry based on weighted probabilities
    const random = Math.random() * 100;
    let cumulative = 0;
    let selectedEntry: LoserPrizingEntry | null = null;

    for (const { entry, weight } of normalizedEntries) {
      cumulative += weight;
      if (random <= cumulative) {
        selectedEntry = entry;
        break;
      }
    }

    return {
      success: true,
      selectedEntry: selectedEntry
        ? {
            name: selectedEntry.name,
            description: selectedEntry.description,
          }
        : {
            name: 'Normal Prizing',
            description: 'No prize awarded this spin. Better luck next time!',
          },
    };
  } catch (error) {
    console.error('Error spinning loser prizing wheel:', error);
    return {
      success: false,
      error: 'Failed to spin loser prizing wheel',
    };
  }
}
