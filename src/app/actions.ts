"use server";

import { prisma } from "@lib/prisma";
import type { BanlistData } from "@lib/deckValidator";

interface GetMostRecentBanlistResult {
  success: boolean;
  banlist: BanlistData | null;
  sessionNumber?: number;
  error?: string;
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
