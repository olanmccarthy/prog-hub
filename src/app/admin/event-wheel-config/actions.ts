'use server';

import { prisma } from '@lib/prisma';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@lib/auth';
import { revalidatePath } from 'next/cache';
import type { SessionModifierFields } from '@/src/types/sessionModifiers';

export interface EventWheelEntry extends SessionModifierFields {
  id: number;
  name: string;
  description: string;
  chance: number;
}

export interface GetEntriesResult {
  success: boolean;
  entries?: EventWheelEntry[];
  error?: string;
}

export interface CreateEntryInput extends SessionModifierFields {
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
 * Get all event wheel entries
 */
export async function getEventWheelEntries(): Promise<GetEntriesResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    const entries = await prisma.eventWheelEntry.findMany({
      orderBy: { id: 'asc' },
    });

    return {
      success: true,
      entries: entries.map(e => ({
        id: e.id,
        name: e.name,
        description: e.description,
        chance: e.chance,
        doubleWalletPoints: e.doubleWalletPoints,
        awardTwoVictoryPoints: e.awardTwoVictoryPoints,
        oddPlacementBonus: e.oddPlacementBonus,
        evenPlacementBonus: e.evenPlacementBonus,
        reverseVpOrder: e.reverseVpOrder,
        matchWinBonus: e.matchWinBonus,
        adminHalveWallet: e.adminHalveWallet,
        equalSplitWallet: e.equalSplitWallet,
        halveAllWalletPoints: e.halveAllWalletPoints,
        bountyHunter: e.bountyHunter,
        earlyDecklistPublic: e.earlyDecklistPublic,
        allowMultipleEventSpins: e.allowMultipleEventSpins,
        skipModeratorRandomBanlist: e.skipModeratorRandomBanlist,
        trueDemocracyBanlist: e.trueDemocracyBanlist,
        gamblingEnabled: e.gamblingEnabled,
        halvedPlayerIds: e.halvedPlayerIds as number[] | null,
      })),
    };
  } catch (error) {
    console.error('Error fetching event wheel entries:', error);
    return {
      success: false,
      error: 'Failed to fetch event wheel entries',
    };
  }
}

/**
 * Create a new event wheel entry
 */
export async function createEventWheelEntry(input: CreateEntryInput): Promise<CreateEntryResult> {
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

    const entry = await prisma.eventWheelEntry.create({
      data: {
        name: input.name,
        description: input.description,
        chance: input.chance,
        doubleWalletPoints: input.doubleWalletPoints || false,
        awardTwoVictoryPoints: input.awardTwoVictoryPoints || false,
        oddPlacementBonus: input.oddPlacementBonus || false,
        evenPlacementBonus: input.evenPlacementBonus || false,
        reverseVpOrder: input.reverseVpOrder || false,
        matchWinBonus: input.matchWinBonus || false,
        adminHalveWallet: input.adminHalveWallet || false,
        equalSplitWallet: input.equalSplitWallet || false,
        halveAllWalletPoints: input.halveAllWalletPoints || false,
        bountyHunter: input.bountyHunter || false,
        earlyDecklistPublic: input.earlyDecklistPublic || false,
        allowMultipleEventSpins: input.allowMultipleEventSpins || false,
        skipModeratorRandomBanlist: input.skipModeratorRandomBanlist || false,
        trueDemocracyBanlist: input.trueDemocracyBanlist || false,
        gamblingEnabled: input.gamblingEnabled || false,
        halvedPlayerIds: input.halvedPlayerIds || Prisma.JsonNull,
      },
    });

    revalidatePath('/admin/event-wheel-config');
    revalidatePath('/admin/event-wheel');

    return {
      success: true,
      id: entry.id,
    };
  } catch (error) {
    console.error('Error creating event wheel entry:', error);
    return {
      success: false,
      error: 'Failed to create event wheel entry',
    };
  }
}

/**
 * Update an existing event wheel entry
 */
export async function updateEventWheelEntry(
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

    await prisma.eventWheelEntry.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        chance: input.chance,
        doubleWalletPoints: input.doubleWalletPoints || false,
        awardTwoVictoryPoints: input.awardTwoVictoryPoints || false,
        oddPlacementBonus: input.oddPlacementBonus || false,
        evenPlacementBonus: input.evenPlacementBonus || false,
        reverseVpOrder: input.reverseVpOrder || false,
        matchWinBonus: input.matchWinBonus || false,
        adminHalveWallet: input.adminHalveWallet || false,
        equalSplitWallet: input.equalSplitWallet || false,
        halveAllWalletPoints: input.halveAllWalletPoints || false,
        bountyHunter: input.bountyHunter || false,
        earlyDecklistPublic: input.earlyDecklistPublic || false,
        allowMultipleEventSpins: input.allowMultipleEventSpins || false,
        skipModeratorRandomBanlist: input.skipModeratorRandomBanlist || false,
        trueDemocracyBanlist: input.trueDemocracyBanlist || false,
        gamblingEnabled: input.gamblingEnabled || false,
        halvedPlayerIds: input.halvedPlayerIds || Prisma.JsonNull,
      },
    });

    revalidatePath('/admin/event-wheel-config');
    revalidatePath('/admin/event-wheel');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error updating event wheel entry:', error);
    return {
      success: false,
      error: 'Failed to update event wheel entry',
    };
  }
}

/**
 * Delete an event wheel entry
 */
export async function deleteEventWheelEntry(id: number): Promise<DeleteEntryResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    await prisma.eventWheelEntry.delete({
      where: { id },
    });

    revalidatePath('/admin/event-wheel-config');
    revalidatePath('/admin/event-wheel');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting event wheel entry:', error);
    return {
      success: false,
      error: 'Failed to delete event wheel entry',
    };
  }
}

/**
 * Mass update chances for multiple entries
 */
export async function massUpdateEventWheelChances(
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
        prisma.eventWheelEntry.update({
          where: { id: update.id },
          data: { chance: update.chance },
        })
      )
    );

    revalidatePath('/admin/event-wheel-config');
    revalidatePath('/admin/event-wheel');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error mass updating event wheel chances:', error);
    return {
      success: false,
      error: 'Failed to mass update chances',
    };
  }
}

/**
 * Apply a multiplier to selected entries (rounds down)
 */
export async function applyMultiplierToEventWheelEntries(
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
    const entries = await prisma.eventWheelEntry.findMany({
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
        prisma.eventWheelEntry.update({
          where: { id: update.id },
          data: { chance: update.chance },
        })
      )
    );

    revalidatePath('/admin/event-wheel-config');
    revalidatePath('/admin/event-wheel');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error applying multiplier to event wheel entries:', error);
    return {
      success: false,
      error: 'Failed to apply multiplier',
    };
  }
}
