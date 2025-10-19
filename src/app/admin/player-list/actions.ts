'use server';

import { prisma } from '@lib/prisma';
import { revalidatePath } from 'next/cache';

export interface PlayerData {
  id: number;
  name: string;
  isAdmin: boolean;
}

export interface CreatePlayerInput {
  name: string;
  password: string;
  isAdmin: boolean;
}

export interface UpdatePlayerInput {
  id: number;
  name?: string;
  password?: string;
  isAdmin?: boolean;
}

export async function getPlayers(): Promise<PlayerData[]> {
  try {
    const players = await prisma.player.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        isAdmin: true,
      },
    });

    return players;
  } catch (error) {
    console.error('Error fetching players:', error);
    throw new Error('Failed to fetch players');
  }
}

export async function createPlayer(input: CreatePlayerInput): Promise<PlayerData> {
  try {
    const { name, password, isAdmin } = input;

    if (!name || !password) {
      throw new Error('Name and password are required');
    }

    // Check if player with this name already exists
    const existingPlayer = await prisma.player.findFirst({ where: { name } });
    if (existingPlayer) {
      throw new Error('Player with this name already exists');
    }

    const player = await prisma.player.create({
      data: {
        name,
        password, // In production, this should be hashed
        isAdmin: isAdmin || false,
        wallet: {
          create: {
            amount: 0,
          },
        },
      },
      select: {
        id: true,
        name: true,
        isAdmin: true,
      },
    });

    // Revalidate the player list page
    revalidatePath('/admin/player-list');

    return player;
  } catch (error) {
    console.error('Error creating player:', error);
    throw error instanceof Error ? error : new Error('Failed to create player');
  }
}

export async function updatePlayer(input: UpdatePlayerInput): Promise<PlayerData> {
  try {
    const { id, name, password, isAdmin } = input;

    if (!id) {
      throw new Error('Player ID is required');
    }

    const player = await prisma.player.findUnique({ where: { id } });

    if (!player) {
      throw new Error('Player not found');
    }

    // Check if new name conflicts with existing player
    if (name && name !== player.name) {
      const existingPlayer = await prisma.player.findFirst({ where: { name } });
      if (existingPlayer) {
        throw new Error('Player with this name already exists');
      }
    }

    // Build update data object
    const updateData: { name?: string; password?: string; isAdmin?: boolean } = {};
    if (name) updateData.name = name;
    if (password) updateData.password = password; // In production, this should be hashed
    if (typeof isAdmin === 'boolean') updateData.isAdmin = isAdmin;

    const updatedPlayer = await prisma.player.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        isAdmin: true,
      },
    });

    // Revalidate the player list page
    revalidatePath('/admin/player-list');

    return updatedPlayer;
  } catch (error) {
    console.error('Error updating player:', error);
    throw error instanceof Error ? error : new Error('Failed to update player');
  }
}

export async function deletePlayer(id: number): Promise<void> {
  try {
    if (!id) {
      throw new Error('Player ID is required');
    }

    const player = await prisma.player.findUnique({ where: { id } });

    if (!player) {
      throw new Error('Player not found');
    }

    await prisma.player.delete({ where: { id } });

    // Revalidate the player list page
    revalidatePath('/admin/player-list');
  } catch (error) {
    console.error('Error deleting player:', error);
    throw error instanceof Error ? error : new Error('Failed to delete player');
  }
}
