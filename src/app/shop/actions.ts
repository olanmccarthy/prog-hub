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
  isPurchasable: boolean;
  isPromo: boolean;
  useDBImage: boolean;
  sessionNumber: number | null;
  sessionName: string | null;
  price: number;
}

export interface GetShopSetsResult {
  success: boolean;
  sets?: ShopSet[];
  nextSessionNumber?: number;
  nextSessionDate?: Date;
  availabilityCutoffDate?: Date;
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
 * Get sets available for the shop
 * @param showUnavailable - If true, shows all purchasable sets including future ones. If false, only shows currently available sets.
 */
export async function getShopSets(showUnavailable = false): Promise<GetShopSetsResult> {
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

    // Get the session after next to determine availability cutoff
    // This ensures sets grouped as "session X" are available when session X is active
    const sessionAfterNext = await prisma.session.findFirst({
      where: {
        complete: false,
        number: { gt: nextSession.number }
      },
      orderBy: { number: 'asc' },
      include: {
        set: {
          select: {
            tcgDate: true,
          },
        },
      },
    });

    // Build where clause
    // Always require isPurchasable = true
    // If showUnavailable is false, also filter by date
    const whereClause: {
      isPurchasable: boolean;
      tcgDate?: { lt: Date };
    } = {
      isPurchasable: true,
    };

    if (!showUnavailable) {
      // Use the session after next as the cutoff (or no limit if it doesn't exist)
      if (sessionAfterNext && sessionAfterNext.set) {
        whereClause.tcgDate = {
          lt: sessionAfterNext.set.tcgDate,
        };
      }
      // If no session after next, show all purchasable sets
    }

    // Get all sessions (sets marked as sessions) to determine grouping
    const allSessions = await prisma.session.findMany({
      orderBy: { number: 'asc' },
      include: {
        set: {
          select: {
            tcgDate: true,
            setName: true,
          },
        },
      },
    });

    // Get sets based on criteria
    const sets = await prisma.set.findMany({
      where: whereClause,
      orderBy: {
        tcgDate: 'asc',
      },
      select: {
        id: true,
        setName: true,
        setCode: true,
        tcgDate: true,
        setImage: true,
        numOfCards: true,
        isPurchasable: true,
        isPromo: true,
        useDBImage: true,
        price: true,
      },
    });

    // Assign each set to its corresponding session
    // A set belongs to a session if it's released between that session's date and the next session's date
    const setsWithSession = sets.map(set => {
      let belongsToSession = null;

      // Find which session this set belongs to
      for (let i = 0; i < allSessions.length; i++) {
        const currentSession = allSessions[i];
        const nextSession = allSessions[i + 1];

        if (!currentSession.set) continue;

        const setDate = new Date(set.tcgDate);
        const currentSessionDate = new Date(currentSession.set.tcgDate);

        // Check if set is released on or after this session's date
        if (setDate >= currentSessionDate) {
          // If there's a next session, check if set is before next session
          if (nextSession && nextSession.set) {
            const nextSessionDate = new Date(nextSession.set.tcgDate);
            if (setDate < nextSessionDate) {
              belongsToSession = currentSession;
              break;
            }
          } else {
            // No next session, so this set belongs to the last session
            belongsToSession = currentSession;
            break;
          }
        }
      }

      return {
        ...set,
        sessionNumber: belongsToSession?.number || null,
        sessionName: belongsToSession?.set?.setName || null,
      };
    });

    return {
      success: true,
      sets: setsWithSession,
      nextSessionNumber: nextSession.number,
      nextSessionDate: nextSession.set.tcgDate,
      availabilityCutoffDate: sessionAfterNext?.set?.tcgDate,
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
 * Deducts 4 points per box from wallet and creates a transaction record
 * @param setId - The ID of the set to purchase
 * @param quantity - Number of boxes to purchase (default: 1)
 */
export async function purchaseSet(setId: number, quantity: number = 1): Promise<PurchaseSetResult> {
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

    // Validate quantity
    if (quantity < 1 || !Number.isInteger(quantity)) {
      return {
        success: false,
        error: "Invalid quantity. Must be a positive integer.",
      };
    }

    if (quantity > 100) {
      return {
        success: false,
        error: "Cannot purchase more than 100 boxes at once.",
      };
    }

    // Check if player has enough balance
    const purchaseCostPerBox = 4;
    const totalCost = purchaseCostPerBox * quantity;
    if (player.wallet.amount < totalCost) {
      return {
        success: false,
        error: `Insufficient funds. You need ${totalCost} points but only have ${player.wallet.amount}.`,
      };
    }

    // Verify set exists and is purchasable
    const set = await prisma.set.findUnique({
      where: { id: setId },
    });

    if (!set) {
      return {
        success: false,
        error: "Set not found.",
      };
    }

    if (!set.isPurchasable) {
      return {
        success: false,
        error: "This set is not available for purchase.",
      };
    }

    // Check if set is available for the current session
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
        error: "No upcoming session found.",
      };
    }

    // Get the session after next to determine availability cutoff
    const sessionAfterNext = await prisma.session.findFirst({
      where: {
        complete: false,
        number: { gt: nextSession.number }
      },
      orderBy: { number: 'asc' },
      include: {
        set: {
          select: {
            tcgDate: true,
          },
        },
      },
    });

    // Check if set's release date is after the session after next
    // Sets are available if they're released before the next session starts
    if (sessionAfterNext && sessionAfterNext.set) {
      if (new Date(set.tcgDate) >= new Date(sessionAfterNext.set.tcgDate)) {
        return {
          success: false,
          error: "This set is not yet available for purchase.",
        };
      }
    }
    // If no session after next, all sets before or at next session are available

    // Deduct from wallet and create transaction records in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update wallet
      const updatedWallet = await tx.wallet.update({
        where: { playerId: currentUser.playerId },
        data: {
          amount: {
            decrement: totalCost,
          },
        },
      });

      // Create transaction records (one per box purchased)
      const transactionPromises = [];
      for (let i = 0; i < quantity; i++) {
        transactionPromises.push(
          tx.transaction.create({
            data: {
              playerId: currentUser.playerId,
              setId: setId,
              amount: purchaseCostPerBox,
            },
          })
        );
      }
      await Promise.all(transactionPromises);

      return updatedWallet;
    });

    // Get active session for notification context
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    // Send Discord notification for the transaction
    const { notifyTransaction } = await import('@lib/discordClient');
    await notifyTransaction(
      currentUser.playerId,
      setId,
      totalCost,
      activeSession?.id
    );

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
