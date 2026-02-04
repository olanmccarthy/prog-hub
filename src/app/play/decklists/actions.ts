"use server";

import { prisma } from "@lib/prisma";
import { getCurrentUser } from "@lib/auth";
import { saveDeckImage } from "@lib/deckImage/saveDeckImage";

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
  matchRecord: string | null; // e.g. "3-2"
  placement: number | null; // 1-6 for top 6 placements
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

export interface CurrentUserInfo {
  playerId: number;
  playerName: string;
  isAdmin: boolean;
}

/**
 * Get current user information
 */
export async function getCurrentUserInfo(): Promise<{ success: boolean; data?: CurrentUserInfo; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    return {
      success: true,
      data: {
        playerId: user.playerId,
        playerName: user.playerName,
        isAdmin: user.isAdmin || false,
      },
    };
  } catch (error) {
    console.error("Error fetching current user:", error);
    return { success: false, error: "Failed to fetch user information" };
  }
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

    // Get unique session IDs to fetch pairings
    const sessionIds = [...new Set(decklists.map(d => d.sessionId))];

    // Fetch all pairings for these sessions
    const pairings = await prisma.pairing.findMany({
      where: {
        sessionId: { in: sessionIds },
      },
      select: {
        sessionId: true,
        player1Id: true,
        player2Id: true,
        player1wins: true,
        player2wins: true,
      },
    });

    // Calculate match records for each player in each session
    const matchRecords = new Map<string, { wins: number; losses: number }>();

    pairings.forEach(pairing => {
      const p1Key = `${pairing.sessionId}-${pairing.player1Id}`;
      const p2Key = `${pairing.sessionId}-${pairing.player2Id}`;

      // Initialize if not exists
      if (!matchRecords.has(p1Key)) {
        matchRecords.set(p1Key, { wins: 0, losses: 0 });
      }
      if (!matchRecords.has(p2Key)) {
        matchRecords.set(p2Key, { wins: 0, losses: 0 });
      }

      const p1Record = matchRecords.get(p1Key)!;
      const p2Record = matchRecords.get(p2Key)!;

      // Determine match result (first to 2 wins)
      if (pairing.player1wins === 2) {
        // Player 1 won the match
        p1Record.wins++;
        p2Record.losses++;
      } else if (pairing.player2wins === 2) {
        // Player 2 won the match
        p2Record.wins++;
        p1Record.losses++;
      }
      // If neither has 2 wins, match isn't complete or is a draw - don't count
    });

    // Helper function to parse JSON fields that might be strings or already parsed
    const parseJsonField = (field: string | number[] | unknown): number[] => {
      if (typeof field === 'string') {
        return JSON.parse(field) as number[];
      }
      return Array.isArray(field) ? field : [];
    };

    // Check if standings are finalized for each session and get placement
    const decklistsWithDetails: DecklistWithDetails[] = decklists.map(decklist => {
      const standingsFinalized =
        decklist.session.first !== null &&
        decklist.session.second !== null &&
        decklist.session.third !== null &&
        decklist.session.fourth !== null &&
        decklist.session.fifth !== null &&
        decklist.session.sixth !== null;

      // Get match record
      const recordKey = `${decklist.sessionId}-${decklist.playerId}`;
      const record = matchRecords.get(recordKey);
      const matchRecord = record ? `${record.wins}-${record.losses}` : null;

      // Get placement (1-6)
      let placement: number | null = null;
      if (standingsFinalized) {
        if (decklist.session.first === decklist.playerId) placement = 1;
        else if (decklist.session.second === decklist.playerId) placement = 2;
        else if (decklist.session.third === decklist.playerId) placement = 3;
        else if (decklist.session.fourth === decklist.playerId) placement = 4;
        else if (decklist.session.fifth === decklist.playerId) placement = 5;
        else if (decklist.session.sixth === decklist.playerId) placement = 6;
      }

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
        matchRecord,
        placement,
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

    // Check if it's the user's own decklist (admins can edit any decklist)
    if (decklist.playerId !== user.playerId && !user.isAdmin) {
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

function parseDeckField(field: unknown): number[] {
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(field)) {
    return field;
  }
  return [];
}

function parseBanlistField(field: unknown): number[] {
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(field)) {
    return field;
  }
  return [];
}

interface RegenerateDeckImageResult {
  success: boolean;
  error?: string;
}

/**
 * Regenerate the image for a specific decklist (admin only)
 */
export async function regenerateDeckImage(
  decklistId: number
): Promise<RegenerateDeckImageResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Fetch the decklist with player and session info
    const decklist = await prisma.decklist.findUnique({
      where: { id: decklistId },
      include: {
        player: {
          select: { name: true },
        },
        session: {
          select: { number: true },
        },
      },
    });

    if (!decklist) {
      return { success: false, error: `Decklist ${decklistId} not found` };
    }

    // Fetch the banlist for this session
    const banlist = await prisma.banlist.findFirst({
      where: { sessionId: decklist.session.number },
    });

    const deckData = {
      playerName: decklist.player.name,
      sessionNumber: decklist.session.number,
      maindeck: parseDeckField(decklist.maindeck),
      extradeck: parseDeckField(decklist.extradeck),
      sidedeck: parseDeckField(decklist.sidedeck),
    };

    const banlistData = banlist
      ? {
          sessionNumber: decklist.session.number,
          banned: parseBanlistField(banlist.banned),
          limited: parseBanlistField(banlist.limited),
          semilimited: parseBanlistField(banlist.semilimited),
          unlimited: parseBanlistField(banlist.unlimited),
        }
      : undefined;

    // Generate and save image
    await saveDeckImage(decklistId, deckData, banlistData);

    return { success: true };
  } catch (error) {
    console.error('Error regenerating deck image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to regenerate image',
    };
  }
}
