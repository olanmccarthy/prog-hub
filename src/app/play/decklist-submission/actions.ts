"use server";

import { AppDataSource } from "@lib/data-source";
import { Decklist } from "@entities/Decklist";
import { Session } from "@entities/Session";
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
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const sessionRepo = AppDataSource.getRepository(Session);
    const sessions = await sessionRepo.find({
      order: { date: "DESC" },
      take: 1,
    });

    if (sessions.length === 0) {
      return {
        success: false,
        error: "No active session found",
      };
    }

    const currentSession = sessions[0];

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

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const sessionResult = await getCurrentSession();
    if (!sessionResult.success || !sessionResult.sessionId) {
      return {
        success: false,
        error: sessionResult.error || "No active session",
      };
    }

    const decklistRepo = AppDataSource.getRepository(Decklist);
    const decklist = await decklistRepo.findOne({
      where: {
        player: { id: currentUser.playerId },
        session: { id: sessionResult.sessionId },
      },
      relations: ["player", "session"],
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

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
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

    const decklistRepo = AppDataSource.getRepository(Decklist);

    // Check if user already has a decklist for this session
    const existingDecklist = await decklistRepo.findOne({
      where: {
        player: { id: currentUser.playerId },
        session: { id: sessionResult.sessionId },
      },
    });

    // Convert number arrays to string arrays for database storage
    const maindeckStrings = maindeck.map(String);
    const sidedeckStrings = sidedeck.map(String);
    const extradeckStrings = extradeck.map(String);

    if (existingDecklist) {
      // Update existing decklist
      existingDecklist.maindeck = maindeckStrings;
      existingDecklist.sidedeck = sidedeckStrings;
      existingDecklist.extradeck = extradeckStrings;
      existingDecklist.submittedAt = new Date();
      await decklistRepo.save(existingDecklist);
    } else {
      // Create new decklist
      const newDecklist = decklistRepo.create({
        player: { id: currentUser.playerId },
        session: { id: sessionResult.sessionId },
        maindeck: maindeckStrings,
        sidedeck: sidedeckStrings,
        extradeck: extradeckStrings,
        submittedAt: new Date(),
      });
      await decklistRepo.save(newDecklist);
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
