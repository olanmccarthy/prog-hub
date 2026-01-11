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

export interface CardOption {
  id: number;
  name: string;
}

export interface SearchCardsResult {
  success: boolean;
  cards?: CardOption[];
  error?: string;
}

export interface CardWithName {
  id: number;
  name: string;
}

export interface GetCardNamesResult {
  success: boolean;
  cards?: CardWithName[];
  error?: string;
}

/**
 * Search for card names that match the given query
 * Only returns results if query is 3+ characters
 */
export async function searchCardNames(query: string): Promise<SearchCardsResult> {
  try {
    // Only search if query is 3+ characters
    if (query.length < 3) {
      return { success: true, cards: [] };
    }

    const cards = await prisma.card.findMany({
      where: {
        cardName: {
          contains: query,
        },
      },
      select: {
        id: true,
        cardName: true,
      },
      orderBy: {
        cardName: 'asc',
      },
      take: 20, // Limit to 20 results
    });

    return {
      success: true,
      cards: cards.map(c => ({ id: c.id, name: c.cardName }))
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search cards',
    };
  }
}

/**
 * Get card names for a list of card IDs
 */
export async function getCardNames(cardIds: number[]): Promise<GetCardNamesResult> {
  try {
    if (cardIds.length === 0) {
      return { success: true, cards: [] };
    }

    const cards = await prisma.card.findMany({
      where: {
        id: { in: cardIds },
      },
      select: {
        id: true,
        cardName: true,
      },
    });

    return {
      success: true,
      cards: cards.map(c => ({ id: c.id, name: c.cardName })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch card names',
    };
  }
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
      // DO NOT use JSON.stringify - Prisma handles JSON serialization automatically
      await prisma.banlist.update({
        where: { id: existingBanlist.id },
        data: {
          banned: banned,
          limited: limited,
          semilimited: semilimited,
          unlimited: unlimited,
        },
      });
    } else {
      // Create new banlist
      // DO NOT use JSON.stringify - Prisma handles JSON serialization automatically
      await prisma.banlist.create({
        data: {
          sessionId: sessionNumber,
          banned: banned,
          limited: limited,
          semilimited: semilimited,
          unlimited: unlimited,
        },
      });
    }

    // Regenerate banlist image
    try {
      console.log(`Regenerating banlist image for session ${sessionNumber}`);
      const { saveBanlistImage } = await import('@lib/banlistImage');
      await saveBanlistImage({
        sessionNumber,
        banned,
        limited,
        semilimited,
        unlimited,
      });
      console.log(`Successfully regenerated banlist image for session ${sessionNumber}`);
    } catch (imageError) {
      console.error(`Failed to regenerate banlist image for session ${sessionNumber}:`, imageError);
      // Don't fail the update if image generation fails
    }

    // Check if we need to regenerate decklist images
    // Get the session to check if standings are finalized
    const session = await prisma.session.findFirst({
      where: { number: sessionNumber },
    });

    if (session) {
      const standingsFinalized = session.first !== null ||
                                 session.second !== null ||
                                 session.third !== null ||
                                 session.fourth !== null ||
                                 session.fifth !== null ||
                                 session.sixth !== null;

      if (standingsFinalized) {
        // Get all decklists for this session
        const decklists = await prisma.decklist.findMany({
          where: { sessionId: session.id },
          select: {
            id: true,
            maindeck: true,
            extradeck: true,
            sidedeck: true,
          },
        });

        if (decklists.length > 0) {
          console.log(`Regenerating ${decklists.length} decklist images for session ${sessionNumber} after banlist change`);

          // Regenerate images for each decklist
          const imagePromises = decklists.map(async (decklist) => {
            try {
              const parseDeckField = (field: string | number[] | unknown): number[] => {
                if (!field) return [];
                if (typeof field === 'string') return JSON.parse(field) as number[];
                if (Array.isArray(field)) return field;
                return [];
              };

              const maindeck = parseDeckField(decklist.maindeck);
              const extradeck = parseDeckField(decklist.extradeck);
              const sidedeck = parseDeckField(decklist.sidedeck);

              const banlistForImage = {
                banned,
                limited,
                semilimited,
              };

              const { saveDeckImage } = await import('@lib/deckImage');
              await saveDeckImage(
                decklist.id,
                { maindeck, extradeck, sidedeck },
                banlistForImage
              );

              console.log(`Regenerated decklist image for decklist ${decklist.id}`);
            } catch (error) {
              console.error(`Failed to regenerate decklist image for decklist ${decklist.id}:`, error);
            }
          });

          await Promise.all(imagePromises);
          console.log(`Finished regenerating all decklist images for session ${sessionNumber}`);
        }
      }
    }

    revalidatePath("/admin/prog_actions");
    revalidatePath("/admin/prog_actions/current-banlist");
    revalidatePath("/banlist/current");
    revalidatePath("/play/decklists");
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
