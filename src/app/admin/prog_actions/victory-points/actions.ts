"use server";

import { prisma } from "@lib/prisma";
import { getCurrentUser } from "@lib/auth";
import { revalidatePath } from "next/cache";

export interface SessionVictoryPointData {
  sessionId: number;
  sessionNumber: number;
  victoryPoints: Array<{
    id: number;
    playerId: number;
    playerName: string;
  }>;
}

export interface VictoryPointEditorData {
  activeSessionId: number | null;
  activeSessionNumber: number | null;
  allSessions: Array<{
    id: number;
    number: number;
    date: Date | null;
    complete: boolean;
    vpCount: number;
  }>;
  allPlayers: Array<{ id: number; name: string }>;
}

export interface VictoryPointEditorResult {
  success: boolean;
  data?: VictoryPointEditorData;
  error?: string;
}

export interface SessionVictoryPointResult {
  success: boolean;
  data?: SessionVictoryPointData;
  error?: string;
}

export interface UpdateVictoryPointResult {
  success: boolean;
  error?: string;
}

export async function getVictoryPointEditorData(): Promise<VictoryPointEditorResult> {
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

    // Get all sessions with their VP counts
    const sessions = await prisma.session.findMany({
      include: {
        victoryPoints: true,
      },
      orderBy: { number: 'asc' },
    });

    const sessionData = sessions.map((s) => ({
      id: s.id,
      number: s.number,
      date: s.date,
      complete: s.complete,
      vpCount: s.victoryPoints.length,
    }));

    // Get all players
    const players = await prisma.player.findMany({
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: {
        activeSessionId: activeSession?.id || null,
        activeSessionNumber: activeSession?.number || null,
        allSessions: sessionData,
        allPlayers: players.map((p) => ({ id: p.id, name: p.name })),
      },
    };
  } catch (error) {
    console.error("Error fetching victory point editor data:", error);
    return {
      success: false,
      error: "Failed to fetch data",
    };
  }
}

export async function getSessionVictoryPoints(sessionId: number): Promise<SessionVictoryPointResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.isAdmin) {
      return {
        success: false,
        error: "Unauthorized: Only admins can access this page",
      };
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        victoryPoints: {
          include: {
            player: {
              select: { name: true },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!session) {
      return {
        success: false,
        error: "Session not found",
      };
    }

    return {
      success: true,
      data: {
        sessionId: session.id,
        sessionNumber: session.number,
        victoryPoints: session.victoryPoints.map((vp) => ({
          id: vp.id,
          playerId: vp.playerId,
          playerName: vp.player.name,
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching session victory points:", error);
    return {
      success: false,
      error: "Failed to fetch session data",
    };
  }
}

export async function addVictoryPoint(
  sessionId: number,
  playerId: number
): Promise<UpdateVictoryPointResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.isAdmin) {
      return {
        success: false,
        error: "Unauthorized: Only admins can add victory points",
      };
    }

    await prisma.victoryPoint.create({
      data: {
        sessionId,
        playerId,
      },
    });

    revalidatePath("/admin/prog_actions");
    revalidatePath("/admin/prog_actions/victory-points");
    revalidatePath("/leaderboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error adding victory point:", error);
    return {
      success: false,
      error: "Failed to add victory point",
    };
  }
}

export async function removeVictoryPoint(vpId: number): Promise<UpdateVictoryPointResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.isAdmin) {
      return {
        success: false,
        error: "Unauthorized: Only admins can remove victory points",
      };
    }

    await prisma.victoryPoint.delete({
      where: { id: vpId },
    });

    revalidatePath("/admin/prog_actions");
    revalidatePath("/admin/prog_actions/victory-points");
    revalidatePath("/leaderboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error removing victory point:", error);
    return {
      success: false,
      error: "Failed to remove victory point",
    };
  }
}
