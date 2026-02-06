"use server";

import { prisma } from "@lib/prisma";
import { getCurrentUser } from "@lib/auth";
import { revalidatePath } from "next/cache";

export interface ExcludedCard {
  id: number;
  cardId: number;
  cardName: string;
  addedAt: Date;
}

export interface ExcludedCardsResult {
  success: boolean;
  cards?: ExcludedCard[];
  error?: string;
}

export interface AddExcludedCardResult {
  success: boolean;
  error?: string;
}

export interface RemoveExcludedCardResult {
  success: boolean;
  error?: string;
}

/**
 * Get all cards excluded from synergy calculations
 */
export async function getExcludedCards(): Promise<ExcludedCardsResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    if (!user.isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    const excluded = await prisma.synergyExcludedCard.findMany({
      orderBy: { addedAt: 'desc' }
    });

    // Fetch card names
    const cardIds = excluded.map(e => e.cardId);
    const cards = await prisma.card.findMany({
      where: { id: { in: cardIds } },
      select: { id: true, cardName: true }
    });

    const cardMap = new Map(cards.map(c => [c.id, c.cardName]));

    const result: ExcludedCard[] = excluded.map(e => ({
      id: e.id,
      cardId: e.cardId,
      cardName: cardMap.get(e.cardId) || 'Unknown Card',
      addedAt: e.addedAt
    }));

    return { success: true, cards: result };
  } catch (error) {
    console.error("Error fetching excluded cards:", error);
    return { success: false, error: "Failed to load excluded cards" };
  }
}

/**
 * Add a card to the synergy exclusion list
 */
export async function addExcludedCard(cardId: number): Promise<AddExcludedCardResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    if (!user.isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    // Check if card exists
    const card = await prisma.card.findUnique({
      where: { id: cardId }
    });

    if (!card) {
      return { success: false, error: "Card not found" };
    }

    // Check if already excluded
    const existing = await prisma.synergyExcludedCard.findUnique({
      where: { cardId }
    });

    if (existing) {
      return { success: false, error: "Card is already in the exclusion list" };
    }

    // Add to exclusion list
    await prisma.synergyExcludedCard.create({
      data: { cardId }
    });

    revalidatePath('/admin/synergy-exclusions');
    revalidatePath('/stats/meta-analysis');

    return { success: true };
  } catch (error) {
    console.error("Error adding excluded card:", error);
    return { success: false, error: "Failed to add card to exclusion list" };
  }
}

/**
 * Remove a card from the synergy exclusion list
 */
export async function removeExcludedCard(id: number): Promise<RemoveExcludedCardResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    if (!user.isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    await prisma.synergyExcludedCard.delete({
      where: { id }
    });

    revalidatePath('/admin/synergy-exclusions');
    revalidatePath('/stats/meta-analysis');

    return { success: true };
  } catch (error) {
    console.error("Error removing excluded card:", error);
    return { success: false, error: "Failed to remove card from exclusion list" };
  }
}

/**
 * Search for cards by name
 */
export async function searchCards(query: string): Promise<{ success: boolean; cards?: Array<{ id: number; name: string }>; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    if (!user.isAdmin) {
      return { success: false, error: "Admin access required" };
    }

    if (query.length < 2) {
      return { success: true, cards: [] };
    }

    const cards = await prisma.card.findMany({
      where: {
        cardName: {
          contains: query
        }
      },
      select: { id: true, cardName: true },
      take: 20,
      orderBy: { cardName: 'asc' }
    });

    // Map to expected format
    const formattedCards = cards.map(c => ({ id: c.id, name: c.cardName }));

    return { success: true, cards: formattedCards };
  } catch (error) {
    console.error("Error searching cards:", error);
    return { success: false, error: "Failed to search cards" };
  }
}
