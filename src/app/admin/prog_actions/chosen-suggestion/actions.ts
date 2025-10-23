"use server";

import { prisma } from "@lib/prisma";
import { getCurrentUser } from "@lib/auth";
import { revalidatePath } from "next/cache";

export interface BanlistSuggestionForSelection {
  id: number;
  playerId: number;
  playerName: string;
  banned: number[];
  limited: number[];
  semilimited: number[];
  unlimited: number[];
  chosen: boolean;
  voteCount: number;
}

export interface ChosenSuggestionData {
  activeSessionId: number | null;
  activeSessionNumber: number | null;
  suggestions: BanlistSuggestionForSelection[];
  currentChosenId: number | null;
}

export interface ChosenSuggestionResult {
  success: boolean;
  data?: ChosenSuggestionData;
  error?: string;
}

export interface UpdateChosenResult {
  success: boolean;
  error?: string;
}

export async function getChosenSuggestionData(): Promise<ChosenSuggestionResult> {
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

    if (!activeSession) {
      return {
        success: true,
        data: {
          activeSessionId: null,
          activeSessionNumber: null,
          suggestions: [],
          currentChosenId: null,
        },
      };
    }

    const suggestions = await prisma.banlistSuggestion.findMany({
      where: {
        banlist: {
          sessionId: activeSession.number,
        },
      },
      include: {
        player: {
          select: { name: true },
        },
        votes: true,
      },
      orderBy: { id: 'asc' },
    });

    const suggestionData: BanlistSuggestionForSelection[] = suggestions.map((s) => ({
      id: s.id,
      playerId: s.playerId,
      playerName: s.player.name,
      banned: typeof s.banned === 'string' ? JSON.parse(s.banned) : (s.banned as number[]),
      limited: typeof s.limited === 'string' ? JSON.parse(s.limited) : (s.limited as number[]),
      semilimited: typeof s.semilimited === 'string' ? JSON.parse(s.semilimited) : (s.semilimited as number[]),
      unlimited: typeof s.unlimited === 'string' ? JSON.parse(s.unlimited) : (s.unlimited as number[]),
      chosen: s.chosen,
      voteCount: s.votes.length,
    }));

    const currentChosen = suggestionData.find((s) => s.chosen);

    return {
      success: true,
      data: {
        activeSessionId: activeSession.id,
        activeSessionNumber: activeSession.number,
        suggestions: suggestionData,
        currentChosenId: currentChosen?.id || null,
      },
    };
  } catch (error) {
    console.error("Error fetching chosen suggestion data:", error);
    return {
      success: false,
      error: "Failed to fetch data",
    };
  }
}

export async function updateChosenSuggestion(
  sessionId: number,
  newChosenId: number
): Promise<UpdateChosenResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.isAdmin) {
      return {
        success: false,
        error: "Unauthorized: Only admins can update the chosen suggestion",
      };
    }

    // Get the session to find its banlist
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return {
        success: false,
        error: "Session not found",
      };
    }

    // Unmark all suggestions as chosen for this session's banlist
    await prisma.banlistSuggestion.updateMany({
      where: {
        banlist: {
          sessionId: session.number,
        },
      },
      data: { chosen: false },
    });

    // Mark the new one as chosen
    await prisma.banlistSuggestion.update({
      where: { id: newChosenId },
      data: { chosen: true },
    });

    revalidatePath("/admin/prog_actions");
    revalidatePath("/admin/prog_actions/chosen-suggestion");
    revalidatePath("/banlist/voting");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error updating chosen suggestion:", error);
    return {
      success: false,
      error: "Failed to update chosen suggestion",
    };
  }
}
