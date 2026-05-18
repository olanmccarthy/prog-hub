"use server";

import { prisma } from "@lib/prisma";

export interface SpendingHistoryItem {
  id: number;
  playerName: string;
  setName: string;
  amount: number;
  date: Date;
  sessionNumber: number | null;
}

export interface SpendingHistoryResult {
  success: boolean;
  data?: SpendingHistoryItem[];
  error?: string;
}

export async function getSpendingHistory(
  playerId?: number,
  sortOrder: "newest" | "oldest" = "newest"
): Promise<SpendingHistoryResult> {
  try {
    const transactions = await prisma.transaction.findMany({
      where: playerId ? { playerId } : {},
      include: {
        player: {
          select: {
            name: true,
          },
        },
        set: {
          select: {
            setName: true,
          },
        },
        session: {
          select: {
            number: true,
          },
        },
      },
      orderBy: {
        date: sortOrder === "newest" ? "desc" : "asc",
      },
    });

    const formattedData: SpendingHistoryItem[] = transactions.map((t) => ({
      id: t.id,
      playerName: t.player.name,
      setName: t.set.setName,
      amount: t.amount,
      date: t.date,
      sessionNumber: t.session?.number ?? null,
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error("Error fetching spending history:", error);
    return { success: false, error: "Failed to fetch spending history" };
  }
}

export interface PlayerListResult {
  success: boolean;
  data?: Array<{ id: number; name: string }>;
  error?: string;
}

export async function getPlayerList(): Promise<PlayerListResult> {
  try {
    const players = await prisma.player.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return { success: true, data: players };
  } catch (error) {
    console.error("Error fetching player list:", error);
    return { success: false, error: "Failed to fetch player list" };
  }
}
