"use server";

import { prisma } from "@lib/prisma";
import { getCurrentUser } from "@lib/auth";
import { revalidatePath } from "next/cache";

export interface CurrentBanlistData {
  activeSessionId: number | null;
  activeSessionNumber: number | null;
  banned: number[];
  limited: number[];
  semilimited: number[];
  unlimited: number[];
}

export interface CurrentBanlistResult {
  success: boolean;
  data?: CurrentBanlistData;
  error?: string;
}

export interface UpdateBanlistResult {
  success: boolean;
  error?: string;
}

export async function getCurrentBanlistData(): Promise<CurrentBanlistResult> {
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
          banned: [],
          limited: [],
          semilimited: [],
          unlimited: [],
        },
      };
    }

    // Get the banlist for the active session
    const banlist = await prisma.banlist.findFirst({
      where: { sessionId: activeSession.number },
    });

    if (!banlist) {
      return {
        success: true,
        data: {
          activeSessionId: activeSession.id,
          activeSessionNumber: activeSession.number,
          banned: [],
          limited: [],
          semilimited: [],
          unlimited: [],
        },
      };
    }

    const parseBanlistField = (field: string | number[] | unknown): number[] => {
      if (!field) return [];
      if (typeof field === 'string') {
        if (field.trim() === '') return [];
        return JSON.parse(field) as number[];
      }
      if (Array.isArray(field)) return field;
      return [];
    };

    return {
      success: true,
      data: {
        activeSessionId: activeSession.id,
        activeSessionNumber: activeSession.number,
        banned: parseBanlistField(banlist.banned),
        limited: parseBanlistField(banlist.limited),
        semilimited: parseBanlistField(banlist.semilimited),
        unlimited: parseBanlistField(banlist.unlimited),
      },
    };
  } catch (error) {
    console.error("Error fetching current banlist data:", error);
    return {
      success: false,
      error: "Failed to fetch data",
    };
  }
}

export async function updateCurrentBanlist(
  sessionNumber: number,
  banned: number[],
  limited: number[],
  semilimited: number[],
  unlimited: number[]
): Promise<UpdateBanlistResult> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.isAdmin) {
      return {
        success: false,
        error: "Unauthorized: Only admins can update the banlist",
      };
    }

    // Check if banlist exists for this session
    const existingBanlist = await prisma.banlist.findFirst({
      where: { sessionId: sessionNumber },
    });

    if (existingBanlist) {
      // Update existing banlist
      await prisma.banlist.update({
        where: { id: existingBanlist.id },
        data: {
          banned: JSON.stringify(banned),
          limited: JSON.stringify(limited),
          semilimited: JSON.stringify(semilimited),
          unlimited: JSON.stringify(unlimited),
        },
      });
    } else {
      // Create new banlist
      await prisma.banlist.create({
        data: {
          sessionId: sessionNumber,
          banned: JSON.stringify(banned),
          limited: JSON.stringify(limited),
          semilimited: JSON.stringify(semilimited),
          unlimited: JSON.stringify(unlimited),
        },
      });
    }

    revalidatePath("/admin/prog_actions");
    revalidatePath("/admin/prog_actions/current-banlist");
    revalidatePath("/banlist/current");
    revalidatePath("/");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error updating current banlist:", error);
    return {
      success: false,
      error: "Failed to update banlist",
    };
  }
}
