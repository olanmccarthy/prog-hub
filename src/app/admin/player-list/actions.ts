'use server';

import { getDataSource } from '@/lib/data-source';
import { Player } from '@/src/entities/Player';
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
    const dataSource = await getDataSource();

    const players = await dataSource.getRepository(Player).find({
      order: { name: 'ASC' },
    });

    // Don't send passwords to the client
    return players.map(({ password, ...player }) => player);
  } catch (error) {
    console.error('Error fetching players:', error);
    throw new Error('Failed to fetch players');
  }
}

export async function createPlayer(input: CreatePlayerInput): Promise<PlayerData> {
  try {
    const dataSource = await getDataSource();

    const { name, password, isAdmin } = input;

    if (!name || !password) {
      throw new Error('Name and password are required');
    }

    const repo = dataSource.getRepository(Player);

    // Check if player with this name already exists
    const existingPlayer = await repo.findOne({ where: { name } });
    if (existingPlayer) {
      throw new Error('Player with this name already exists');
    }

    const player = repo.create({
      name,
      password, // In production, this should be hashed
      isAdmin: isAdmin || false,
    });

    await repo.save(player);

    // Revalidate the player list page
    revalidatePath('/admin/player-list');

    // Don't send password back
    const { password: _, ...sanitizedPlayer } = player;
    return sanitizedPlayer;
  } catch (error) {
    console.error('Error creating player:', error);
    throw error instanceof Error ? error : new Error('Failed to create player');
  }
}

export async function updatePlayer(input: UpdatePlayerInput): Promise<PlayerData> {
  try {
    const dataSource = await getDataSource();

    const { id, name, password, isAdmin } = input;

    if (!id) {
      throw new Error('Player ID is required');
    }

    const repo = dataSource.getRepository(Player);
    const player = await repo.findOne({ where: { id } });

    if (!player) {
      throw new Error('Player not found');
    }

    // Check if new name conflicts with existing player
    if (name && name !== player.name) {
      const existingPlayer = await repo.findOne({ where: { name } });
      if (existingPlayer) {
        throw new Error('Player with this name already exists');
      }
      player.name = name;
    }

    // Update password if provided
    if (password) {
      player.password = password; // In production, this should be hashed
    }

    // Update admin status if provided
    if (typeof isAdmin === 'boolean') {
      player.isAdmin = isAdmin;
    }

    await repo.save(player);

    // Revalidate the player list page
    revalidatePath('/admin/player-list');

    // Don't send password back
    const { password: _, ...sanitizedPlayer } = player;
    return sanitizedPlayer;
  } catch (error) {
    console.error('Error updating player:', error);
    throw error instanceof Error ? error : new Error('Failed to update player');
  }
}

export async function deletePlayer(id: number): Promise<void> {
  try {
    const dataSource = await getDataSource();

    if (!id) {
      throw new Error('Player ID is required');
    }

    const repo = dataSource.getRepository(Player);
    const player = await repo.findOne({ where: { id } });

    if (!player) {
      throw new Error('Player not found');
    }

    await repo.remove(player);

    // Revalidate the player list page
    revalidatePath('/admin/player-list');
  } catch (error) {
    console.error('Error deleting player:', error);
    throw error instanceof Error ? error : new Error('Failed to delete player');
  }
}
