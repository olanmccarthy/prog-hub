"use server";

import { AppDataSource } from "@/src/lib/data-source";
import { Pairing } from "@/src/entities/Pairing";
import { Session } from "@/src/entities/Session";
import { getCurrentUser } from "@/src/lib/auth";

export interface PairingData {
  id: number;
  round: number;
  player1: {
    id: number;
    name: string;
  };
  player2: {
    id: number;
    name: string;
  };
  player1wins: number;
  player2wins: number;
}

export interface GetPairingsResult {
  success: boolean;
  sessionId?: number;
  pairings?: PairingData[];
  error?: string;
}

export interface UpdatePairingResult {
  success: boolean;
  pairing?: PairingData;
  error?: string;
}

export async function getPairings(
  sessionId?: number
): Promise<GetPairingsResult> {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // If no sessionId provided, get the current session (latest session)
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const sessionRepo = AppDataSource.getRepository(Session);
      const sessions = await sessionRepo.find({
        select: ["id", "number", "date"],
        order: { date: "DESC" },
        take: 1,
      });

      if (sessions.length === 0) {
        return {
          success: false,
          error: "No sessions found",
        };
      }
      currentSessionId = sessions[0].id;
    }

    const pairingRepo = AppDataSource.getRepository(Pairing);
    const pairings = await pairingRepo.find({
      where: { session: { id: currentSessionId } },
      relations: ["player1", "player2", "session"],
      order: { round: "ASC", id: "ASC" },
    });

    // Map to plain objects for serialization
    const pairingData: PairingData[] = pairings.map((p) => ({
      id: p.id,
      round: p.round,
      player1: {
        id: p.player1.id,
        name: p.player1.name,
      },
      player2: {
        id: p.player2.id,
        name: p.player2.name,
      },
      player1wins: p.player1wins,
      player2wins: p.player2wins,
    }));

    return {
      success: true,
      sessionId: currentSessionId,
      pairings: pairingData,
    };
  } catch (error) {
    console.error("Error fetching pairings:", error);
    return {
      success: false,
      error: "Failed to fetch pairings",
    };
  }
}

export async function updatePairing(
  pairingId: number,
  player1wins: number,
  player2wins: number
): Promise<UpdatePairingResult> {
  try {
    // Check if user is logged in
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "You must be logged in to update scores",
      };
    }

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if (!pairingId || player1wins === undefined || player2wins === undefined) {
      return {
        success: false,
        error: "Missing required fields",
      };
    }

    const pairingRepo = AppDataSource.getRepository(Pairing);
    const pairing = await pairingRepo.findOne({
      where: { id: pairingId },
      relations: ["player1", "player2"],
    });

    if (!pairing) {
      return {
        success: false,
        error: "Pairing not found",
      };
    }

    // Check if the logged-in user is one of the players in this pairing or is an admin
    const isPlayer1 = pairing.player1.id === currentUser.playerId;
    const isPlayer2 = pairing.player2.id === currentUser.playerId;
    const isAdmin = currentUser.isAdmin ?? false;

    if (!isPlayer1 && !isPlayer2 && !isAdmin) {
      return {
        success: false,
        error: "You can only update scores for games you are involved in",
      };
    }

    pairing.player1wins = player1wins;
    pairing.player2wins = player2wins;
    await pairingRepo.save(pairing);

    // Map to plain object for serialization
    const pairingData: PairingData = {
      id: pairing.id,
      round: pairing.round,
      player1: {
        id: pairing.player1.id,
        name: pairing.player1.name,
      },
      player2: {
        id: pairing.player2.id,
        name: pairing.player2.name,
      },
      player1wins: pairing.player1wins,
      player2wins: pairing.player2wins,
    };

    return {
      success: true,
      pairing: pairingData,
    };
  } catch (error) {
    console.error("Error updating pairing:", error);
    return {
      success: false,
      error: "Failed to update pairing",
    };
  }
}
