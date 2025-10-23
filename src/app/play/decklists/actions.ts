"use server";

import { prisma } from "@lib/prisma";
import { getCurrentUser } from "@lib/auth";

export interface DecklistWithDetails {
  id: number;
  playerId: number;
  playerName: string;
  sessionId: number;
  sessionNumber: number;
  setName: string | null;
  name: string | null;
  maindeck: number[];
  sidedeck: number[];
  extradeck: number[];
  submittedAt: Date;
  sessionComplete: boolean;
  standingsFinalized: boolean;
}

export interface SessionOption {
  id: number;
  number: number;
  setName: string | null;
  complete: boolean;
}

export interface PlayerOption {
  id: number;
  name: string;
}

/**
 * Get all sessions for filter dropdown (excludes future sessions)
 * Returns current active session or latest completed session as default
 */
export async function getSessions(): Promise<{ success: boolean; data?: SessionOption[]; currentSessionId?: number; error?: string }> {
  try {
    // Get active session
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
      include: { set: true },
    });

    // Get all sessions that have been started (have a date) or are active
    const sessions = await prisma.session.findMany({
      where: {
        OR: [
          { date: { not: null } },
          { active: true },
        ],
      },
      orderBy: { number: 'desc' },
      include: {
        set: true,
      },
    });

    const sessionOptions: SessionOption[] = sessions.map(session => ({
      id: session.id,
      number: session.number,
      setName: session.set?.setName || null,
      complete: session.complete,
    }));

    // Default to active session, or most recent session if no active one
    const currentSessionId = activeSession?.id || (sessions.length > 0 ? sessions[0].id : undefined);

    return { success: true, data: sessionOptions, currentSessionId };
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return { success: false, error: "Failed to fetch sessions" };
  }
}

/**
 * Get all players for filter dropdown
 */
export async function getPlayers(): Promise<{ success: boolean; data?: PlayerOption[]; error?: string }> {
  try {
    const players = await prisma.player.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      },
    });

    return { success: true, data: players };
  } catch (error) {
    console.error("Error fetching players:", error);
    return { success: false, error: "Failed to fetch players" };
  }
}

/**
 * Get decklists with optional filters
 * - Hidden for current session if standings not finalized (unless user is viewing their own)
 * - Can filter by session and/or player
 */
export async function getDecklists(
  sessionId?: number,
  playerId?: number
): Promise<{ success: boolean; data?: DecklistWithDetails[]; error?: string; isCurrentSession?: boolean }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get active session to check if standings are finalized
    const activeSession = await prisma.session.findFirst({
      where: { active: true },
    });

    const isCurrentSession = activeSession && sessionId === activeSession.id;

    // Build where clause
    const where: { sessionId?: number; playerId?: number } = {};
    if (sessionId) {
      where.sessionId = sessionId;
    }
    if (playerId) {
      where.playerId = playerId;
    }

    const decklists = await prisma.decklist.findMany({
      where,
      include: {
        player: true,
        session: {
          include: {
            set: true,
          },
        },
      },
      orderBy: [
        { sessionId: 'desc' },
        { submittedAt: 'asc' },
      ],
    });

    // Helper function to parse JSON fields that might be strings or already parsed
    const parseJsonField = (field: string | number[] | unknown): number[] => {
      if (typeof field === 'string') {
        return JSON.parse(field) as number[];
      }
      return Array.isArray(field) ? field : [];
    };

    // Check if standings are finalized for each session
    const decklistsWithDetails: DecklistWithDetails[] = decklists.map(decklist => {
      const standingsFinalized =
        decklist.session.first !== null &&
        decklist.session.second !== null &&
        decklist.session.third !== null &&
        decklist.session.fourth !== null &&
        decklist.session.fifth !== null &&
        decklist.session.sixth !== null;

      return {
        id: decklist.id,
        playerId: decklist.playerId,
        playerName: decklist.player.name,
        sessionId: decklist.sessionId,
        sessionNumber: decklist.session.number,
        setName: decklist.session.set?.setName || null,
        name: decklist.name,
        maindeck: parseJsonField(decklist.maindeck),
        sidedeck: parseJsonField(decklist.sidedeck),
        extradeck: parseJsonField(decklist.extradeck),
        submittedAt: decklist.submittedAt,
        sessionComplete: decklist.session.complete,
        standingsFinalized,
      };
    });

    // Filter out current session decklists if standings not finalized (unless viewing own deck)
    const filteredDecklists = decklistsWithDetails.filter(decklist => {
      // Always show completed sessions
      if (decklist.sessionComplete) return true;

      // For active session, only show if standings finalized or it's the user's own deck
      if (decklist.sessionId === activeSession?.id) {
        return decklist.standingsFinalized || decklist.playerId === user.playerId;
      }

      return true;
    });

    return { success: true, data: filteredDecklists, isCurrentSession: !!isCurrentSession };
  } catch (error) {
    console.error("Error fetching decklists:", error);
    return { success: false, error: "Failed to fetch decklists" };
  }
}

/**
 * Get card names from card IDs
 */
export async function getCardNames(cardIds: number[]): Promise<{ success: boolean; data?: Record<number, string>; error?: string }> {
  try {
    const cards = await prisma.card.findMany({
      where: {
        id: { in: cardIds },
      },
      select: {
        id: true,
        cardName: true,
      },
    });

    const cardMap: Record<number, string> = {};
    cards.forEach(card => {
      cardMap[card.id] = card.cardName;
    });

    return { success: true, data: cardMap };
  } catch (error) {
    console.error("Error fetching card names:", error);
    return { success: false, error: "Failed to fetch card names" };
  }
}

/**
 * Update decklist name (only allowed for own decklist in most recent session)
 */
export async function updateDecklistName(decklistId: number, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get the decklist
    const decklist = await prisma.decklist.findUnique({
      where: { id: decklistId },
      include: { session: true },
    });

    if (!decklist) {
      return { success: false, error: "Decklist not found" };
    }

    // Check if it's the user's own decklist
    if (decklist.playerId !== user.playerId) {
      return { success: false, error: "You can only edit your own decklists" };
    }

    // Get the most recent session (highest session number)
    const mostRecentSession = await prisma.session.findFirst({
      where: {
        OR: [
          { date: { not: null } },
          { active: true },
        ],
      },
      orderBy: { number: 'desc' },
    });

    if (!mostRecentSession) {
      return { success: false, error: "No sessions found" };
    }

    // Check if the decklist is from the most recent session
    if (decklist.sessionId !== mostRecentSession.id) {
      return { success: false, error: "You can only edit decklists from the most recent session" };
    }

    // Update the name
    await prisma.decklist.update({
      where: { id: decklistId },
      data: { name: name.trim() || null },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating decklist name:", error);
    return { success: false, error: "Failed to update decklist name" };
  }
}
