'use server';

import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@lib/auth';
import { revalidatePath } from 'next/cache';

export interface LoserPrizingEntry {
  id: number;
  name: string;
  description: string;
  chance: number;
}

export interface GetEntriesResult {
  success: boolean;
  entries?: LoserPrizingEntry[];
  error?: string;
}

export interface CreateEntryInput {
  name: string;
  description: string;
  chance: number;
}

export interface CreateEntryResult {
  success: boolean;
  id?: number;
  error?: string;
}

export interface UpdateEntryResult {
  success: boolean;
  error?: string;
}

export interface DeleteEntryResult {
  success: boolean;
  error?: string;
}

export interface MassUpdateChancesInput {
  updates: { id: number; chance: number }[];
}

export interface MassUpdateChancesResult {
  success: boolean;
  error?: string;
}

export interface ApplyMultiplierInput {
  entryIds: number[];
  multiplier: number;
}

export interface ApplyMultiplierResult {
  success: boolean;
  error?: string;
}

/**
 * Get all loser prizing entries
 */
export async function getLoserPrizingEntries(): Promise<GetEntriesResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    const entries = await prisma.loserPrizingEntry.findMany({
      orderBy: { id: 'asc' },
    });

    return {
      success: true,
      entries: entries.map(e => ({
        id: e.id,
        name: e.name,
        description: e.description,
        chance: e.chance,
      })),
    };
  } catch (error) {
    console.error('Error fetching loser prizing entries:', error);
    return {
      success: false,
      error: 'Failed to fetch loser prizing entries',
    };
  }
}

/**
 * Create a new loser prizing entry
 */
export async function createLoserPrizingEntry(input: CreateEntryInput): Promise<CreateEntryResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    // Validate input
    if (!input.name.trim()) {
      return {
        success: false,
        error: 'Name cannot be empty',
      };
    }

    if (!input.description.trim()) {
      return {
        success: false,
        error: 'Description cannot be empty',
      };
    }

    if (input.chance < 0) {
      return {
        success: false,
        error: 'Chance must be non-negative',
      };
    }

    const entry = await prisma.loserPrizingEntry.create({
      data: {
        name: input.name,
        description: input.description,
        chance: input.chance,
      },
    });

    revalidatePath('/admin/loser-prizing-config');
    revalidatePath('/admin/loser-prizing');

    return {
      success: true,
      id: entry.id,
    };
  } catch (error) {
    console.error('Error creating loser prizing entry:', error);
    return {
      success: false,
      error: 'Failed to create loser prizing entry',
    };
  }
}

/**
 * Update an existing loser prizing entry
 */
export async function updateLoserPrizingEntry(
  id: number,
  input: CreateEntryInput
): Promise<UpdateEntryResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    // Validate input
    if (!input.name.trim()) {
      return {
        success: false,
        error: 'Name cannot be empty',
      };
    }

    if (!input.description.trim()) {
      return {
        success: false,
        error: 'Description cannot be empty',
      };
    }

    if (input.chance < 0) {
      return {
        success: false,
        error: 'Chance must be non-negative',
      };
    }

    await prisma.loserPrizingEntry.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        chance: input.chance,
      },
    });

    revalidatePath('/admin/loser-prizing-config');
    revalidatePath('/admin/loser-prizing');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error updating loser prizing entry:', error);
    return {
      success: false,
      error: 'Failed to update loser prizing entry',
    };
  }
}

/**
 * Delete a loser prizing entry
 */
export async function deleteLoserPrizingEntry(id: number): Promise<DeleteEntryResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    await prisma.loserPrizingEntry.delete({
      where: { id },
    });

    revalidatePath('/admin/loser-prizing-config');
    revalidatePath('/admin/loser-prizing');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting loser prizing entry:', error);
    return {
      success: false,
      error: 'Failed to delete loser prizing entry',
    };
  }
}

/**
 * Mass update chances for multiple entries
 */
export async function massUpdateLoserPrizingChances(
  input: MassUpdateChancesInput
): Promise<MassUpdateChancesResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    // Validate all chances are non-negative
    for (const update of input.updates) {
      if (update.chance < 0) {
        return {
          success: false,
          error: 'All chances must be non-negative',
        };
      }
    }

    // Update all entries in a transaction
    await prisma.$transaction(
      input.updates.map(update =>
        prisma.loserPrizingEntry.update({
          where: { id: update.id },
          data: { chance: update.chance },
        })
      )
    );

    revalidatePath('/admin/loser-prizing-config');
    revalidatePath('/admin/loser-prizing');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error mass updating loser prizing chances:', error);
    return {
      success: false,
      error: 'Failed to mass update chances',
    };
  }
}

/**
 * Apply a multiplier to selected entries (rounds down)
 */
export async function applyMultiplierToLoserPrizingEntries(
  input: ApplyMultiplierInput
): Promise<ApplyMultiplierResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    if (input.multiplier < 0) {
      return {
        success: false,
        error: 'Multiplier must be non-negative',
      };
    }

    // Fetch current entries
    const entries = await prisma.loserPrizingEntry.findMany({
      where: { id: { in: input.entryIds } },
    });

    // Calculate new chances with multiplier (round down)
    const updates = entries.map(entry => ({
      id: entry.id,
      chance: Math.floor(entry.chance * input.multiplier),
    }));

    // Update all entries in a transaction
    await prisma.$transaction(
      updates.map(update =>
        prisma.loserPrizingEntry.update({
          where: { id: update.id },
          data: { chance: update.chance },
        })
      )
    );

    revalidatePath('/admin/loser-prizing-config');
    revalidatePath('/admin/loser-prizing');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error applying multiplier to loser prizing entries:', error);
    return {
      success: false,
      error: 'Failed to apply multiplier',
    };
  }
}
