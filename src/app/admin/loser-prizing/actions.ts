'use server';

import { prisma } from '@lib/prisma';
import type { LoserPrizingEntry as PrismaLoserPrizingEntry } from '@prisma/client';
import { requireAuth, requireAdmin } from '@lib/serverUtils';
import { requireActiveSession } from '@lib/sessionHelpers';
import { selectWeightedRandom } from '@lib/randomHelpers';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@lib/auth';
import {
  updateWallet,
  calculateSessionsSinceLastWin,
  getOpponentsWhoBeat,
  getOpponentsPlayerBeat,
  applySessionModifier,
  stealFromPlayer,
  stealFromPlayers,
} from '@lib/loserPrizing';

export interface LoserPrizingEntry {
  id: number;
  name: string;
  description: string;
  chance: number;
  automationType: string | null;
  requiresPlayerSelection: boolean;
  requiresInput: boolean;
  allowsRespin: boolean;
  walletPointChange: number | null;
  victoryPointChange: number | null;
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
    id: number;
    name: string;
    description: string;
    automationType: string | null;
    requiresPlayerSelection: boolean;
    requiresInput: boolean;
    allowsRespin: boolean;
  } | null;
}

export interface ApplyLoserPrizingResult {
  success: boolean;
  error?: string;
  message?: string;
  requiresRespin?: boolean;
  pointsAwarded?: number;
}

/**
 * Get all loser prizing entries (public - anyone can view)
 */
export async function getPublicLoserPrizingEntries(): Promise<LoserPrizingStatusResult> {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error,
        entries: [],
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
        automationType: e.automationType,
        requiresPlayerSelection: e.requiresPlayerSelection,
        requiresInput: e.requiresInput,
        allowsRespin: e.allowsRespin,
        walletPointChange: e.walletPointChange,
        victoryPointChange: e.victoryPointChange,
      })),
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
 * Get all loser prizing entries (admin-only for configuration)
 */
export async function getLoserPrizingEntries(): Promise<LoserPrizingStatusResult> {
  try {
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error,
        entries: [],
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
        automationType: e.automationType,
        requiresPlayerSelection: e.requiresPlayerSelection,
        requiresInput: e.requiresInput,
        allowsRespin: e.allowsRespin,
        walletPointChange: e.walletPointChange,
        victoryPointChange: e.victoryPointChange,
      })),
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
 */
export async function spinLoserPrizingWheel(): Promise<SpinLoserPrizingResult> {
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
        error: 'No active session found. The loser prizing wheel can only be spun during an active session.',
      };
    }
    const activeSession = sessionResult.data;

    // Check if moderator has been selected
    if (!activeSession.moderatorId) {
      return {
        success: false,
        error: 'Moderator must be selected before spinning the loser prizing wheel.',
      };
    }

    // Check if moderator has chosen the banlist
    const chosenSuggestion = await prisma.banlistSuggestion.findFirst({
      where: {
        moderatorId: activeSession.moderatorId,
        chosen: true,
      },
    });

    if (!chosenSuggestion) {
      return {
        success: false,
        error: 'Moderator must choose the winning banlist before spinning the loser prizing wheel.',
      };
    }

    const entries = await prisma.loserPrizingEntry.findMany({
      orderBy: { id: 'asc' },
    });

    if (entries.length === 0) {
      return {
        success: true,
        selectedEntry: null,
      };
    }

    // Select a random entry based on weighted probabilities
    const selectedEntry = selectWeightedRandom(entries);

    return {
      success: true,
      selectedEntry: selectedEntry
        ? {
            id: selectedEntry.id,
            name: selectedEntry.name,
            description: selectedEntry.description,
            automationType: selectedEntry.automationType,
            requiresPlayerSelection: selectedEntry.requiresPlayerSelection,
            requiresInput: selectedEntry.requiresInput,
            allowsRespin: selectedEntry.allowsRespin,
          }
        : {
            id: -1,
            name: 'Normal Prizing',
            description: 'No prize awarded this spin. Better luck next time!',
            automationType: 'MANUAL',
            requiresPlayerSelection: false,
            requiresInput: false,
            allowsRespin: false,
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

/**
 * Apply loser prizing result with automation
 */
export async function applyLoserPrizingResult(
  playerId: number,
  entryId: number,
  targetPlayerId?: number,
  investmentAmount?: number,
  vendorAction?: 'sell' | 'buyback'
): Promise<ApplyLoserPrizingResult> {
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

    // Get entry details
    const entry = await prisma.loserPrizingEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      return {
        success: false,
        error: 'Entry not found',
      };
    }

    // Validate required fields
    if (entry.requiresPlayerSelection && !targetPlayerId) {
      return {
        success: false,
        error: 'This prize requires selecting a target player',
      };
    }

    if (entry.requiresInput && investmentAmount === undefined) {
      return {
        success: false,
        error: 'This prize requires an investment amount',
      };
    }

    // Create result record
    await prisma.loserPrizingResult.create({
      data: {
        sessionId: activeSession.id,
        playerId,
        entryId,
        entryName: entry.name,
        entryDescription: entry.description,
        targetPlayerId,
        additionalData: investmentAmount !== undefined
          ? JSON.stringify({ investmentAmount })
          : null,
        automatedResult: entry.automationType !== 'MANUAL',
      },
    });

    let message = `${entry.name} applied`;
    let pointsAwarded = 0;
    let requiresRespin = false;

    // Apply effects based on automation type
    if (entry.automationType === 'IMMEDIATE_WALLET') {
      const walletResult = await applyImmediateWalletEffect(
        entry,
        playerId,
        activeSession.id,
        activeSession.number,
        targetPlayerId,
        vendorAction
      );
      message = walletResult.message;
      pointsAwarded = walletResult.pointsAwarded;
      requiresRespin = walletResult.requiresRespin;
    } else if (entry.automationType === 'IMMEDIATE_VP') {
      const vpResult = await applyImmediateVPEffect(entry, playerId, activeSession.id);
      message = vpResult.message;
      pointsAwarded = vpResult.pointsAwarded;
    } else if (entry.automationType === 'SESSION_MODIFIER') {
      await applySessionModifierEffect(
        entry,
        playerId,
        activeSession.id,
        targetPlayerId,
        investmentAmount
      );
      message = `${entry.name} will be applied next session`;
    }

    // Mark loser prizing as spun for the session
    await prisma.session.update({
      where: { id: activeSession.id },
      data: { loserPrizingSpun: true },
    });

    revalidatePath('/admin/loser-prizing');
    revalidatePath('/admin/prog_actions');

    return {
      success: true,
      message,
      requiresRespin: requiresRespin || entry.allowsRespin,
      pointsAwarded,
    };
  } catch (error) {
    console.error('Error applying loser prizing result:', error);
    return {
      success: false,
      error: 'Failed to apply loser prizing result',
    };
  }
}

/**
 * Apply immediate wallet point effects
 */
async function applyImmediateWalletEffect(
  entry: PrismaLoserPrizingEntry,
  playerId: number,
  sessionId: number,
  sessionNumber: number,
  targetPlayerId?: number,
  vendorAction?: 'sell' | 'buyback'
): Promise<{ message: string; pointsAwarded: number; requiresRespin: boolean }> {
  let pointsAwarded = 0;
  let message = '';
  let requiresRespin = false;

  // Special handling for vendor entry
  if (entry.name === 'Selling to a Vendor after the Event' && vendorAction) {
    const walletChange = vendorAction === 'sell' ? 1 : -3;
    const actualAmount = await updateWallet(
      playerId,
      walletChange,
      sessionId,
      `Loser Prizing: ${entry.name} (${vendorAction})`
    );
    pointsAwarded = actualAmount;

    if (actualAmount !== walletChange && walletChange < 0) {
      // They didn't have enough to lose the full amount
      message = `${vendorAction === 'buyback' ? 'Bought back card - lost' : 'Lost'} ${Math.abs(actualAmount)} wallet points (only had ${Math.abs(actualAmount)} available)`;
    } else {
      message = vendorAction === 'sell'
        ? `Sold the card - gained ${actualAmount} wallet point`
        : `Bought back the card - lost ${Math.abs(actualAmount)} wallet points`;
    }
  }
  // Simple wallet changes (Cyber Jar, Sucks to Suck, Selling to a Vendor)
  else if (entry.walletPointChange !== null) {
    const actualAmount = await updateWallet(
      playerId,
      entry.walletPointChange,
      sessionId,
      `Loser Prizing: ${entry.name}`
    );
    pointsAwarded = actualAmount;

    if (actualAmount !== entry.walletPointChange && entry.walletPointChange < 0) {
      // They didn't have enough to lose the full amount
      message = `Lost ${Math.abs(actualAmount)} wallet points (only had ${Math.abs(actualAmount)} available)`;
    } else {
      message = `${actualAmount > 0 ? 'Gained' : 'Lost'} ${Math.abs(actualAmount)} wallet points`;
    }
  }

  // Special cases based on entry name
  switch (entry.name) {
    case 'Take All Their Lighters':
      if (targetPlayerId) {
        const result = await stealFromPlayer(targetPlayerId, playerId, 2, sessionId, entry.name);
        pointsAwarded = result.gained;
        message = `Stole ${result.stolen} points from target player`;
      }
      break;

    case 'Take Everyone\'s Lighter':
      {
        const allPlayers = await prisma.player.findMany({
          where: { id: { not: playerId } },
        });
        const victimIds = allPlayers.map(p => p.id);
        const result = await stealFromPlayers(victimIds, playerId, 1, sessionId, entry.name);
        pointsAwarded = result.gained;
        message = `Stole ${result.totalStolen} points from ${result.victimCount} players`;
      }
      break;

    case 'Morphing Jar':
      if (targetPlayerId) {
        const result = await stealFromPlayer(targetPlayerId, playerId, 1, sessionId, entry.name);
        pointsAwarded = result.gained;
        message = `Stole ${result.stolen} point from target player`;
      }
      break;

    case 'Vampire Baby':
      {
        const winners = await getOpponentsWhoBeat(playerId, sessionId);
        if (winners.length > 0) {
          const result = await stealFromPlayers(winners, playerId, 1, sessionId, entry.name);
          pointsAwarded = result.gained;
          message = `Stole ${result.totalStolen} points from ${result.victimCount} player(s) who beat you`;
        } else {
          message = 'No one beat you this session';
        }
      }
      break;

    case 'Vengeful Loser':
      {
        const losers = await getOpponentsPlayerBeat(playerId, sessionId);
        if (losers.length > 0) {
          const result = await stealFromPlayers(losers, playerId, 1, sessionId, entry.name);
          pointsAwarded = result.gained;
          message = `Stole ${result.totalStolen} points from ${result.victimCount} player(s) you beat`;
        } else {
          message = 'You didn\'t beat anyone - you can respin';
          requiresRespin = true;
        }
      }
      break;

    case 'Kristoff Friedrichnigiannopolous':
      if (targetPlayerId) {
        const targetWallet = await prisma.wallet.findUnique({
          where: { playerId: targetPlayerId },
        });
        if (targetWallet && targetWallet.amount > 0) {
          const result = await stealFromPlayer(
            targetPlayerId,
            playerId,
            targetWallet.amount,
            sessionId,
            entry.name
          );

          // Award VPs to target (1 VP per 12 points)
          const vpsToAward = Math.floor(result.stolen / 12);
          for (let i = 0; i < vpsToAward; i++) {
            await prisma.victoryPoint.create({
              data: {
                playerId: targetPlayerId,
                sessionId,
              },
            });
          }
          pointsAwarded = result.gained;
          message = `Stole ${result.stolen} points. Target received ${vpsToAward} VP(s)`;
        } else {
          message = 'Target player has no wallet points to steal';
        }
      }
      break;

    case 'Remember the good ol\' days?':
      {
        const sessionsSince = await calculateSessionsSinceLastWin(playerId, sessionNumber);
        const walletPoints = sessionsSince * 2;
        const gained = await updateWallet(playerId, walletPoints, sessionId, `Loser Prizing: ${entry.name}`);
        pointsAwarded = gained;
        message = `Gained ${gained} points (${sessionsSince} sessions × 2)`;
      }
      break;

    case 'Pawn Shop':
      {
        // Check if player has at least 1 VP
        const vpCount = await prisma.victoryPoint.count({
          where: { playerId },
        });
        if (vpCount > 0) {
          // Delete one VP
          const vpToDelete = await prisma.victoryPoint.findFirst({
            where: { playerId },
          });
          if (vpToDelete) {
            await prisma.victoryPoint.delete({
              where: { id: vpToDelete.id },
            });
          }
          const gained = await updateWallet(playerId, 16, sessionId, `Loser Prizing: ${entry.name} (sold VP)`);
          pointsAwarded = gained;
          message = 'Sold 1 VP for 16 points (can buy back for 18 if you come last)';
        } else {
          message = 'No VP to sell - you can respin';
          requiresRespin = true;
        }
      }
      break;
  }

  return { message, pointsAwarded, requiresRespin };
}

/**
 * Apply immediate VP effects
 */
async function applyImmediateVPEffect(
  entry: PrismaLoserPrizingEntry,
  playerId: number,
  sessionId: number
): Promise<{ message: string; pointsAwarded: number }> {
  let pointsAwarded = 0;
  let message = '';

  if (entry.victoryPointChange !== null) {
    if (entry.victoryPointChange > 0) {
      // Award VPs
      for (let i = 0; i < entry.victoryPointChange; i++) {
        await prisma.victoryPoint.create({
          data: {
            playerId,
            sessionId,
          },
        });
      }
      pointsAwarded = entry.victoryPointChange;
      message = `Gained ${entry.victoryPointChange} Victory Point(s)`;
    } else {
      // Remove VPs
      const vpsToRemove = Math.abs(entry.victoryPointChange);
      const existingVPs = await prisma.victoryPoint.findMany({
        where: { playerId },
        take: vpsToRemove,
      });

      for (const vp of existingVPs) {
        await prisma.victoryPoint.delete({
          where: { id: vp.id },
        });
      }
      pointsAwarded = entry.victoryPointChange;
      message = `Lost ${vpsToRemove} Victory Point(s)`;
    }
  }

  return { message, pointsAwarded };
}

/**
 * Apply session modifier effects
 */
async function applySessionModifierEffect(
  entry: PrismaLoserPrizingEntry,
  playerId: number,
  sessionId: number,
  targetPlayerId?: number,
  investmentAmount?: number
): Promise<void> {
  if (entry.doublePointsNextSession) {
    await applySessionModifier(sessionId, playerId, 'DOUBLE_POINTS');
  }

  if (entry.halfPriceShopNextSession) {
    await applySessionModifier(sessionId, playerId, 'HALF_PRICE_SHOP');
  }

  if (entry.takeVpAndWalletNextSession) {
    await applySessionModifier(sessionId, playerId, 'TAKE_VP_AND_WALLET');
  }

  if (entry.allWinsTwoZerosNextSession) {
    await applySessionModifier(sessionId, playerId, 'ALL_WINS_TWO_ZEROS');
  }

  // Dead Weight
  if (entry.name === 'Dead Weight' && targetPlayerId) {
    await applySessionModifier(sessionId, playerId, 'SHARED_POINTS', targetPlayerId);
  }

  // The Market is Going to go Up
  if (entry.name === 'The Market is Going to go Up' && investmentAmount) {
    // Deduct investment immediately (only what they can afford)
    const actualInvestment = Math.abs(await updateWallet(playerId, -investmentAmount, sessionId, 'Loser Prizing: Investment (The Market)'));
    await applySessionModifier(sessionId, playerId, 'INVESTMENT', undefined, actualInvestment);
  }
}

/**
 * Get loser prizing history
 */
export async function getLoserPrizingHistory() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Authentication required',
        results: [],
      };
    }

    const results = await prisma.loserPrizingResult.findMany({
      include: {
        session: true,
        player: true,
        targetPlayer: true,
        entry: true,
      },
      orderBy: { appliedAt: 'desc' },
    });

    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error('Error fetching loser prizing history:', error);
    return {
      success: false,
      error: 'Failed to fetch history',
      results: [],
    };
  }
}
