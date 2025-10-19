"use server";

import { prisma } from "@lib/prisma";
import { getCurrentUser } from "@lib/auth";

export interface ShopSet {
  id: number;
  setName: string;
  setCode: string;
  tcgDate: Date;
  setImage: string | null;
  numOfCards: number;
}

export interface GetShopSetsResult {
  success: boolean;
  sets?: ShopSet[];
  nextSessionNumber?: number;
  error?: string;
}

export interface PurchaseSetResult {
  success: boolean;
  error?: string;
  newBalance?: number;
}

export interface GetWalletBalanceResult {
  success: boolean;
  balance?: number;
  error?: string;
}

/**
 * Get all purchasable sets available up to and including the next session
 * Shows all purchasable sets from the beginning up to the next session's release date
 */
export async function getShopSets(): Promise<GetShopSetsResult> {
  try {
    // Get the next session (first non-completed session)
    const nextSession = await prisma.session.findFirst({
      where: { complete: false },
      orderBy: { number: 'asc' },
      include: {
        set: {
          select: {
            tcgDate: true,
          },
        },
      },
    });

    if (!nextSession || !nextSession.set) {
      return {
        success: false,
        error: "No upcoming session found",
      };
    }

    // Get all purchasable sets up to and including the next session's set
    // This includes all previous session sets and the next session's set
    const sets = await prisma.set.findMany({
      where: {
        isPurchasable: true,
        tcgDate: {
          lte: nextSession.set.tcgDate,
        },
      },
      orderBy: {
        tcgDate: 'desc',
      },
      select: {
        id: true,
        setName: true,
        setCode: true,
        tcgDate: true,
        setImage: true,
        numOfCards: true,
      },
    });

    return {
      success: true,
      sets,
      nextSessionNumber: nextSession.number,
    };
  } catch (error) {
    console.error("Error fetching shop sets:", error);
    return {
      success: false,
      error: "Failed to fetch shop sets",
    };
  }
}

/**
 * Get the current player's wallet balance
 */
export async function getWalletBalance(): Promise<GetWalletBalanceResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    const wallet = await prisma.wallet.findUnique({
      where: { playerId: currentUser.playerId },
    });

    if (!wallet) {
      return {
        success: false,
        error: "Wallet not found",
      };
    }

    return {
      success: true,
      balance: wallet.amount,
    };
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return {
      success: false,
      error: "Failed to fetch wallet balance",
    };
  }
}

/**
 * Purchase a set for a player
 * Deducts 4 points from wallet and creates a transaction record
 */
export async function purchaseSet(setId: number): Promise<PurchaseSetResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    // Verify player exists
    const player = await prisma.player.findUnique({
      where: { id: currentUser.playerId },
      include: { wallet: true },
    });

    if (!player) {
      return {
        success: false,
        error: "Player not found. Please log out and log back in.",
      };
    }

    if (!player.wallet) {
      return {
        success: false,
        error: "Wallet not found for player.",
      };
    }

    // Check if player has enough balance
    const purchaseCost = 4;
    if (player.wallet.amount < purchaseCost) {
      return {
        success: false,
        error: `Insufficient funds. You need ${purchaseCost} points but only have ${player.wallet.amount}.`,
      };
    }

    // Verify set exists
    const set = await prisma.set.findUnique({
      where: { id: setId },
    });

    if (!set) {
      return {
        success: false,
        error: "Set not found.",
      };
    }

    // Deduct from wallet and create transaction in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update wallet
      const updatedWallet = await tx.wallet.update({
        where: { playerId: currentUser.playerId },
        data: {
          amount: {
            decrement: purchaseCost,
          },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          playerId: currentUser.playerId,
          setId: setId,
          amount: purchaseCost,
        },
      });

      return updatedWallet;
    });

    return {
      success: true,
      newBalance: result.amount,
    };
  } catch (error) {
    console.error("Error purchasing set:", error);
    return {
      success: false,
      error: "Failed to complete purchase",
    };
  }
}
