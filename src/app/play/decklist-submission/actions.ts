"use server";

import { prisma } from "@lib/prisma";
import { getCurrentUser } from "@lib/auth";
import { revalidatePath } from "next/cache";

export interface DecklistInfo {
  id: number;
  playerName: string;
  sessionNumber: number;
  submittedAt: Date;
}

export interface GetDecklistResult {
  success: boolean;
  decklist?: DecklistInfo;
  error?: string;
}

export interface SubmitDecklistResult {
  success: boolean;
  error?: string;
}

export interface CurrentSessionResult {
  success: boolean;
  sessionId?: number;
  sessionNumber?: number;
  error?: string;
}

/**
 * Get current session information
 */
export async function getCurrentSession(): Promise<CurrentSessionResult> {
  try {
    const currentSession = await prisma.session.findFirst({
      orderBy: { date: "desc" },
    });

    if (!currentSession) {
      return {
        success: false,
        error: "No active session found",
      };
    }

    return {
      success: true,
      sessionId: currentSession.id,
      sessionNumber: currentSession.number,
    };
  } catch (error) {
    console.error("Error fetching current session:", error);
    return {
      success: false,
      error: "Failed to fetch current session",
    };
  }
}

/**
 * Get current user's decklist for the current session
 */
export async function getMyDecklist(): Promise<GetDecklistResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "You must be logged in",
      };
    }

    const sessionResult = await getCurrentSession();
    if (!sessionResult.success || !sessionResult.sessionId) {
      return {
        success: false,
        error: sessionResult.error || "No active session",
      };
    }

    const decklist = await prisma.decklist.findFirst({
      where: {
        playerId: currentUser.playerId,
        sessionId: sessionResult.sessionId,
      },
      include: {
        player: { select: { name: true } },
        session: { select: { number: true } },
      },
    });

    if (!decklist) {
      return {
        success: false,
        error: "No decklist found for current session",
      };
    }

    return {
      success: true,
      decklist: {
        id: decklist.id,
        playerName: decklist.player.name,
        sessionNumber: decklist.session.number,
        submittedAt: decklist.submittedAt,
      },
    };
  } catch (error) {
    console.error("Error fetching decklist:", error);
    return {
      success: false,
      error: "Failed to fetch decklist",
    };
  }
}

/**
 * Submit a decklist for the current session
 */
export async function submitDecklist(
  maindeck: number[],
  sidedeck: number[],
  extradeck: number[]
): Promise<SubmitDecklistResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "You must be logged in to submit a decklist",
      };
    }

    // Validate deck structure
    if (maindeck.length < 40 || maindeck.length > 60) {
      return {
        success: false,
        error: `Main deck must be between 40 and 60 cards (found ${maindeck.length})`,
      };
    }

    if (extradeck.length > 15) {
      return {
        success: false,
        error: `Extra deck cannot exceed 15 cards (found ${extradeck.length})`,
      };
    }

    if (sidedeck.length > 15) {
      return {
        success: false,
        error: `Side deck cannot exceed 15 cards (found ${sidedeck.length})`,
      };
    }

    const sessionResult = await getCurrentSession();
    if (!sessionResult.success || !sessionResult.sessionId) {
      return {
        success: false,
        error: sessionResult.error || "No active session",
      };
    }

    // Check if user already has a decklist for this session
    const existingDecklist = await prisma.decklist.findFirst({
      where: {
        playerId: currentUser.playerId,
        sessionId: sessionResult.sessionId,
      },
    });

    if (existingDecklist) {
      // Update existing decklist
      await prisma.decklist.update({
        where: { id: existingDecklist.id },
        data: {
          maindeck,
          sidedeck,
          extradeck,
          submittedAt: new Date(),
        },
      });
    } else {
      // Create new decklist
      await prisma.decklist.create({
        data: {
          playerId: currentUser.playerId,
          sessionId: sessionResult.sessionId,
          maindeck,
          sidedeck,
          extradeck,
          submittedAt: new Date(),
        },
      });
    }

    revalidatePath("/play/decklist-submission");
    revalidatePath("/admin/prog_actions");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error submitting decklist:", error);
    return {
      success: false,
      error: "Failed to submit decklist",
    };
  }
}
