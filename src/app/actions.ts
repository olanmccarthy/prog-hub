"use server";

import { prisma } from "@lib/prisma";
import type { BanlistData } from "@lib/deckValidator";
import { getCurrentUser } from "@lib/auth";
import { revalidatePath } from "next/cache";

interface GetMostRecentBanlistResult {
  success: boolean;
  banlist: BanlistData | null;
  sessionNumber?: number;
  error?: string;
}

interface DeleteSessionResult {
  success: boolean;
  error?: string;
  sessionNumber?: number;
}

interface IsAdminResult {
  isAdmin: boolean;
}

export interface SessionWithSets {
  sessionNumber: number;
  sessionSet: {
    id: number;
    setName: string;
    setCode: string;
    tcgDate: Date;
  };
  setsBetween: Array<{
    id: number;
    setName: string;
    setCode: string;
    tcgDate: Date;
  }>;
}

export interface UpcomingSessionData {
  sessions: SessionWithSets[];
}

interface GetUpcomingSessionResult {
  success: boolean;
  data: UpcomingSessionData | null;
  error?: string;
}

export async function getMostRecentBanlist(): Promise<GetMostRecentBanlistResult> {
  try {
    // Get the active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    if (!activeSession) {
      return {
        success: false,
        banlist: null,
        error: "No active session found",
      };
    }

    // Get the banlist for this session
    const banlist = await prisma.banlist.findFirst({
      where: { sessionId: activeSession.number },
    });

    if (!banlist) {
      return {
        success: false,
        banlist: null,
        error: "No banlist found for the most recent session",
      };
    }

    // Prisma automatically parses JSON columns to proper types
    const banlistData: BanlistData = {
      banned: banlist.banned as number[],
      limited: banlist.limited as number[],
      semilimited: banlist.semilimited as number[],
      unlimited: banlist.unlimited as number[],
    };

    return {
      success: true,
      banlist: banlistData,
      sessionNumber: activeSession.number,
    };
  } catch (error) {
    console.error("Error fetching most recent banlist:", error);
    return {
      success: false,
      banlist: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getUpcomingSession(): Promise<GetUpcomingSessionResult> {
  try {
    // Find all non-completed sessions (ordered by session number)
    const upcomingSessions = await prisma.session.findMany({
      where: {
        complete: false,
      },
      orderBy: { number: 'asc' },
      include: {
        set: {
          select: {
            id: true,
            setName: true,
            setCode: true,
            tcgDate: true,
          },
        },
      },
    });

    if (upcomingSessions.length === 0) {
      return {
        success: true,
        data: {
          sessions: [],
        },
      };
    }

    // Fetch all non-session sets once (optimization: avoid N+1 queries)
    const allNonSessionSets = await prisma.set.findMany({
      where: {
        isASession: false,
      },
      orderBy: { tcgDate: 'asc' },
      select: {
        id: true,
        setName: true,
        setCode: true,
        tcgDate: true,
      },
    });

    // Build array of sessions with sets between each pair
    const sessionsWithSets: SessionWithSets[] = [];

    for (let i = 0; i < upcomingSessions.length; i++) {
      const currentSession = upcomingSessions[i];
      const nextSession = upcomingSessions[i + 1];

      let setsBetween: Array<{
        id: number;
        setName: string;
        setCode: string;
        tcgDate: Date;
      }> = [];

      // Filter sets between this session and the next (in memory)
      if (nextSession && currentSession.set && nextSession.set) {
        setsBetween = allNonSessionSets.filter(
          (set) =>
            set.tcgDate > currentSession.set!.tcgDate &&
            set.tcgDate < nextSession.set!.tcgDate
        );
      }

      // Only add if the session has a set assigned
      if (currentSession.set) {
        sessionsWithSets.push({
          sessionNumber: currentSession.number,
          sessionSet: {
            id: currentSession.set.id,
            setName: currentSession.set.setName,
            setCode: currentSession.set.setCode,
            tcgDate: currentSession.set.tcgDate,
          },
          setsBetween,
        });
      }
    }

    return {
      success: true,
      data: {
        sessions: sessionsWithSets,
      },
    };
  } catch (error) {
    console.error("Error fetching upcoming session:", error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function checkIsAdmin(): Promise<IsAdminResult> {
  try {
    const user = await getCurrentUser();
    return { isAdmin: user?.isAdmin || false };
  } catch {
    return { isAdmin: false };
  }
}

export async function deleteSession(sessionNumber: number): Promise<DeleteSessionResult> {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return {
        success: false,
        error: "Unauthorized: Admin access required",
      };
    }

    // Find the session
    const session = await prisma.session.findFirst({
      where: { number: sessionNumber },
    });

    if (!session) {
      return {
        success: false,
        error: "Session not found",
      };
    }

    // Check if session is active
    if (session.active) {
      return {
        success: false,
        error: "Cannot delete an active session. Please complete it first.",
      };
    }

    // Check if session is already complete
    if (session.complete) {
      return {
        success: false,
        error: "Cannot delete a completed session",
      };
    }

    // Delete related data in correct order (respecting foreign key constraints)
    // 1. Delete decklists for this session
    await prisma.decklist.deleteMany({
      where: { sessionId: session.id },
    });

    // 2. Delete pairings for this session
    await prisma.pairing.deleteMany({
      where: { sessionId: session.id },
    });

    // 3. Delete banlist suggestions for this session
    const suggestions = await prisma.banlistSuggestion.findMany({
      where: {
        banlist: {
          sessionId: sessionNumber,
        },
      },
      select: { id: true },
    });

    const suggestionIds = suggestions.map(s => s.id);

    // Delete votes for these suggestions
    if (suggestionIds.length > 0) {
      await prisma.banlistSuggestionVote.deleteMany({
        where: { suggestionId: { in: suggestionIds } },
      });
    }

    // Delete the suggestions themselves
    await prisma.banlistSuggestion.deleteMany({
      where: {
        banlist: {
          sessionId: sessionNumber,
        },
      },
    });

    // 4. Delete banlist for this session (sessionId stores session number)
    await prisma.banlist.deleteMany({
      where: { sessionId: sessionNumber },
    });

    // 5. Delete victory points for this session
    await prisma.victoryPoint.deleteMany({
      where: { sessionId: session.id },
    });

    // 6. Delete wallet transactions for this session
    await prisma.walletTransaction.deleteMany({
      where: { sessionId: session.id },
    });

    // 7. Finally, delete the session itself
    await prisma.session.delete({
      where: { id: session.id },
    });

    revalidatePath("/");
    revalidatePath("/admin/prog_actions");

    return {
      success: true,
      sessionNumber: sessionNumber,
    };
  } catch (error) {
    console.error("Error deleting session:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
