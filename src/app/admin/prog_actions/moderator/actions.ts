"use server";

import { prisma } from "@lib/prisma";
import { getCurrentUser } from "@lib/auth";
import { revalidatePath } from "next/cache";

export interface ModeratorChangeData {
  activeSessionId: number | null;
  activeSessionNumber: number | null;
  currentModeratorId: number | null;
  currentModeratorName: string | null;
  allPlayers: Array<{ id: number; name: string }>;
}

export interface ModeratorChangeResult {
  success: boolean;
  data?: ModeratorChangeData;
  error?: string;
}

export interface UpdateModeratorResult {
  success: boolean;
  error?: string;
}

export async function getModeratorChangeData(): Promise<ModeratorChangeResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.isAdmin) {
      return {
        success: false,
        error: "Unauthorized: Only admins can access this page",
      };
    }

    // Get active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    // Get all players
    const players = await prisma.player.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    let currentModeratorName: string | null = null;
    if (activeSession?.moderatorId) {
      const moderator = await prisma.player.findUnique({
        where: { id: activeSession.moderatorId },
        select: { name: true },
      });
      currentModeratorName = moderator?.name || null;
    }

    return {
      success: true,
      data: {
        activeSessionId: activeSession?.id || null,
        activeSessionNumber: activeSession?.number || null,
        currentModeratorId: activeSession?.moderatorId || null,
        currentModeratorName,
        allPlayers: players,
      },
    };
  } catch (error) {
    console.error("Error fetching moderator change data:", error);
    return {
      success: false,
      error: "Failed to fetch data",
    };
  }
}

export async function updateModerator(
  sessionId: number,
  newModeratorId: number
): Promise<UpdateModeratorResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.isAdmin) {
      return {
        success: false,
        error: "Unauthorized: Only admins can update the moderator",
      };
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { moderatorId: newModeratorId },
    });

    revalidatePath("/admin/prog_actions");
    revalidatePath("/admin/prog_actions/moderator");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error updating moderator:", error);
    return {
      success: false,
      error: "Failed to update moderator",
    };
  }
}
