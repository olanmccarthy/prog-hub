"use server";

import { prisma } from "@lib/prisma";
import { getCurrentUser } from "@lib/auth";
import { revalidatePath } from "next/cache";

export interface PlayerWalletData {
  id: number;
  name: string;
  walletId: number;
  walletAmount: number;
}

export interface WalletEditorData {
  activeSessionId: number | null;
  activeSessionNumber: number | null;
  players: PlayerWalletData[];
}

export interface WalletEditorResult {
  success: boolean;
  data?: WalletEditorData;
  error?: string;
}

export interface UpdateWalletResult {
  success: boolean;
  error?: string;
}

export async function getWalletEditorData(): Promise<WalletEditorResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.isAdmin) {
      return {
        success: false,
        error: "Unauthorized: Only admins can access this page",
      };
    }

    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    // Get all players with their wallets
    const players = await prisma.player.findMany({
      include: {
        wallet: true,
      },
      orderBy: { name: 'asc' },
    });

    const playerWalletData: PlayerWalletData[] = players.map((player) => ({
      id: player.id,
      name: player.name,
      walletId: player.wallet!.id,
      walletAmount: player.wallet!.amount,
    }));

    return {
      success: true,
      data: {
        activeSessionId: activeSession?.id || null,
        activeSessionNumber: activeSession?.number || null,
        players: playerWalletData,
      },
    };
  } catch (error) {
    console.error("Error fetching wallet editor data:", error);
    return {
      success: false,
      error: "Failed to fetch data",
    };
  }
}

export async function updateWalletValue(
  walletId: number,
  newAmount: number,
  sessionId: number | null
): Promise<UpdateWalletResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.isAdmin) {
      return {
        success: false,
        error: "Unauthorized: Only admins can update wallet values",
      };
    }

    // Get the old amount to calculate the change
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      return {
        success: false,
        error: "Wallet not found",
      };
    }

    const amountChange = newAmount - wallet.amount;

    // Update the wallet
    await prisma.wallet.update({
      where: { id: walletId },
      data: { amount: newAmount },
    });

    // Create a transaction record
    await prisma.walletTransaction.create({
      data: {
        walletId: walletId,
        sessionId: sessionId,
        amount: amountChange,
        type: "MANUAL_ADJUSTMENT",
        description: `Admin adjusted wallet value from ${wallet.amount} to ${newAmount}`,
      },
    });

    revalidatePath("/admin/prog_actions");
    revalidatePath("/admin/prog_actions/wallets");
    revalidatePath("/leaderboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error updating wallet value:", error);
    return {
      success: false,
      error: "Failed to update wallet value",
    };
  }
}
