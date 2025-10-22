'use server';

import { prisma } from '@lib/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@lib/auth';

export interface SetData {
  id: number;
  setName: string;
  setCode: string;
  tcgDate: Date;
  isASession: boolean;
  isPurchasable: boolean;
  isPromo: boolean;
  price: number;
}

export interface UpdateSetBooleansInput {
  id: number;
  isASession: boolean;
  isPurchasable: boolean;
  isPromo: boolean;
}

export async function getAllSets(): Promise<SetData[]> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const sets = await prisma.set.findMany({
      orderBy: [
        { tcgDate: 'asc' },
      ],
      select: {
        id: true,
        setName: true,
        setCode: true,
        tcgDate: true,
        isASession: true,
        isPurchasable: true,
        isPromo: true,
        price: true,
      },
    });

    return sets;
  } catch (error) {
    console.error('Error fetching sets:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch sets');
  }
}

export async function updateSetBooleans(input: UpdateSetBooleansInput): Promise<SetData> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { id, isASession, isPurchasable, isPromo } = input;

    if (!id) {
      throw new Error('Set ID is required');
    }

    const set = await prisma.set.findUnique({ where: { id } });

    if (!set) {
      throw new Error('Set not found');
    }

    const updatedSet = await prisma.set.update({
      where: { id },
      data: {
        isASession,
        isPurchasable,
        isPromo,
      },
      select: {
        id: true,
        setName: true,
        setCode: true,
        tcgDate: true,
        isASession: true,
        isPurchasable: true,
        isPromo: true,
        price: true,
      },
    });

    // Revalidate the set manager page
    revalidatePath('/admin/set-manager');

    return updatedSet;
  } catch (error) {
    console.error('Error updating set:', error);
    throw error instanceof Error ? error : new Error('Failed to update set');
  }
}

export interface UpdateSetPriceInput {
  id: number;
  price: number;
}

export async function updateSetPrice(input: UpdateSetPriceInput): Promise<SetData> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { id, price } = input;

    if (!id) {
      throw new Error('Set ID is required');
    }

    if (price < 0) {
      throw new Error('Price cannot be negative');
    }

    const set = await prisma.set.findUnique({ where: { id } });

    if (!set) {
      throw new Error('Set not found');
    }

    const updatedSet = await prisma.set.update({
      where: { id },
      data: { price },
      select: {
        id: true,
        setName: true,
        setCode: true,
        tcgDate: true,
        isASession: true,
        isPurchasable: true,
        isPromo: true,
        price: true,
      },
    });

    // Revalidate the set manager page
    revalidatePath('/admin/set-manager');

    return updatedSet;
  } catch (error) {
    console.error('Error updating set price:', error);
    throw error instanceof Error ? error : new Error('Failed to update set price');
  }
}
