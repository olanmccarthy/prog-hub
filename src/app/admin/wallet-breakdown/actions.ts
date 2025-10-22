'use server';

import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@lib/auth';
import { revalidatePath } from 'next/cache';

export interface WalletPointBreakdown {
  id: number;
  name: string;
  first: number;
  second: number;
  third: number;
  fourth: number;
  fifth: number;
  sixth: number;
  active: boolean;
}

export interface GetBreakdownsResult {
  success: boolean;
  breakdowns?: WalletPointBreakdown[];
  error?: string;
}

export interface CreateBreakdownInput {
  name: string;
  first: number;
  second: number;
  third: number;
  fourth: number;
  fifth: number;
  sixth: number;
}

export interface CreateBreakdownResult {
  success: boolean;
  id?: number;
  error?: string;
}

export interface UpdateBreakdownResult {
  success: boolean;
  error?: string;
}

export interface DeleteBreakdownResult {
  success: boolean;
  error?: string;
}

export interface SetActiveBreakdownResult {
  success: boolean;
  error?: string;
}

/**
 * Get all wallet point breakdowns
 */
export async function getWalletPointBreakdowns(): Promise<GetBreakdownsResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    const breakdowns = await prisma.walletPointBreakdown.findMany({
      orderBy: [
        { active: 'desc' }, // Active first
        { id: 'asc' },
      ],
    });

    return {
      success: true,
      breakdowns: breakdowns.map(b => ({
        id: b.id,
        name: b.name,
        first: b.first,
        second: b.second,
        third: b.third,
        fourth: b.fourth,
        fifth: b.fifth,
        sixth: b.sixth,
        active: b.active,
      })),
    };
  } catch (error) {
    console.error('Error fetching breakdowns:', error);
    return {
      success: false,
      error: 'Failed to fetch wallet point breakdowns',
    };
  }
}

/**
 * Create a new wallet point breakdown
 */
export async function createWalletPointBreakdown(input: CreateBreakdownInput): Promise<CreateBreakdownResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    // Validate all values are non-negative
    if (input.first < 0 || input.second < 0 || input.third < 0 ||
        input.fourth < 0 || input.fifth < 0 || input.sixth < 0) {
      return {
        success: false,
        error: 'All point values must be non-negative',
      };
    }

    // Validate name is not empty
    if (!input.name.trim()) {
      return {
        success: false,
        error: 'Name cannot be empty',
      };
    }

    const breakdown = await prisma.walletPointBreakdown.create({
      data: {
        name: input.name,
        first: input.first,
        second: input.second,
        third: input.third,
        fourth: input.fourth,
        fifth: input.fifth,
        sixth: input.sixth,
        active: false, // New breakdowns are not active by default
      },
    });

    revalidatePath('/admin/wallet-breakdown');

    return {
      success: true,
      id: breakdown.id,
    };
  } catch (error) {
    console.error('Error creating breakdown:', error);
    return {
      success: false,
      error: 'Failed to create wallet point breakdown',
    };
  }
}

/**
 * Update an existing wallet point breakdown
 */
export async function updateWalletPointBreakdown(
  id: number,
  input: CreateBreakdownInput
): Promise<UpdateBreakdownResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    // Validate all values are non-negative
    if (input.first < 0 || input.second < 0 || input.third < 0 ||
        input.fourth < 0 || input.fifth < 0 || input.sixth < 0) {
      return {
        success: false,
        error: 'All point values must be non-negative',
      };
    }

    // Validate name is not empty
    if (!input.name.trim()) {
      return {
        success: false,
        error: 'Name cannot be empty',
      };
    }

    await prisma.walletPointBreakdown.update({
      where: { id },
      data: {
        name: input.name,
        first: input.first,
        second: input.second,
        third: input.third,
        fourth: input.fourth,
        fifth: input.fifth,
        sixth: input.sixth,
      },
    });

    revalidatePath('/admin/wallet-breakdown');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error updating breakdown:', error);
    return {
      success: false,
      error: 'Failed to update wallet point breakdown',
    };
  }
}

/**
 * Delete a wallet point breakdown
 */
export async function deleteWalletPointBreakdown(id: number): Promise<DeleteBreakdownResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    // Check if this is the active breakdown
    const breakdown = await prisma.walletPointBreakdown.findUnique({
      where: { id },
    });

    if (!breakdown) {
      return {
        success: false,
        error: 'Breakdown not found',
      };
    }

    if (breakdown.active) {
      return {
        success: false,
        error: 'Cannot delete the active breakdown. Please set another breakdown as active first.',
      };
    }

    await prisma.walletPointBreakdown.delete({
      where: { id },
    });

    revalidatePath('/admin/wallet-breakdown');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting breakdown:', error);
    return {
      success: false,
      error: 'Failed to delete wallet point breakdown',
    };
  }
}

/**
 * Set a wallet point breakdown as active
 */
export async function setActiveBreakdown(id: number): Promise<SetActiveBreakdownResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return {
        success: false,
        error: 'Admin access required',
      };
    }

    // Use a transaction to ensure only one breakdown is active
    await prisma.$transaction([
      // Deactivate all breakdowns
      prisma.walletPointBreakdown.updateMany({
        where: { active: true },
        data: { active: false },
      }),
      // Activate the selected breakdown
      prisma.walletPointBreakdown.update({
        where: { id },
        data: { active: true },
      }),
    ]);

    revalidatePath('/admin/wallet-breakdown');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error setting active breakdown:', error);
    return {
      success: false,
      error: 'Failed to set active breakdown',
    };
  }
}
