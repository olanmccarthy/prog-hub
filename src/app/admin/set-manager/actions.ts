'use server';

import { prisma } from '@lib/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@lib/auth';

export interface SetData {
  id: number;
  setName: string;
  setCode: string;
  numOfCards: number;
  tcgDate: Date;
  setImage: string | null;
  isASession: boolean;
  isPurchasable: boolean;
  isPromo: boolean;
  useDBImage: boolean;
  price: number;
}

export interface UpdateSetBooleansInput {
  id: number;
  isASession: boolean;
  isPurchasable: boolean;
  isPromo: boolean;
  useDBImage: boolean;
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
        numOfCards: true,
        tcgDate: true,
        setImage: true,
        isASession: true,
        isPurchasable: true,
        isPromo: true,
        useDBImage: true,
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

    const { id, isASession, isPurchasable, isPromo, useDBImage } = input;

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
        useDBImage,
      },
      select: {
        id: true,
        setName: true,
        setCode: true,
        numOfCards: true,
        tcgDate: true,
        setImage: true,
        isASession: true,
        isPurchasable: true,
        isPromo: true,
        useDBImage: true,
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
        numOfCards: true,
        tcgDate: true,
        setImage: true,
        isASession: true,
        isPurchasable: true,
        isPromo: true,
        useDBImage: true,
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

export interface CreateSetInput {
  setName: string;
  setCode: string;
  numOfCards: number;
  tcgDate: string; // ISO date string
  setImage?: string;
  isASession?: boolean;
  isPurchasable?: boolean;
  isPromo?: boolean;
  useDBImage?: boolean;
  price?: number;
}

export async function createSet(input: CreateSetInput): Promise<SetData> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { setName, setCode, numOfCards, tcgDate, setImage, isASession, isPurchasable, isPromo, useDBImage, price } = input;

    // Validate required fields
    if (!setName || !setCode || !numOfCards || !tcgDate) {
      throw new Error('Set name, set code, number of cards, and TCG date are required');
    }

    if (numOfCards < 1) {
      throw new Error('Number of cards must be at least 1');
    }

    // Check if set code already exists
    const existingSet = await prisma.set.findFirst({
      where: { setCode },
    });

    if (existingSet) {
      throw new Error(`A set with code "${setCode}" already exists`);
    }

    const newSet = await prisma.set.create({
      data: {
        setName,
        setCode,
        numOfCards,
        tcgDate: new Date(tcgDate),
        setImage: setImage || null,
        isASession: isASession ?? false,
        isPurchasable: isPurchasable ?? true,
        isPromo: isPromo ?? false,
        useDBImage: useDBImage ?? false,
        price: price ?? 4,
      },
      select: {
        id: true,
        setName: true,
        setCode: true,
        numOfCards: true,
        tcgDate: true,
        setImage: true,
        isASession: true,
        isPurchasable: true,
        isPromo: true,
        useDBImage: true,
        price: true,
      },
    });

    // Revalidate the set manager page
    revalidatePath('/admin/set-manager');

    return newSet;
  } catch (error) {
    console.error('Error creating set:', error);
    throw error instanceof Error ? error : new Error('Failed to create set');
  }
}

export interface UpdateSetInput {
  id: number;
  setName: string;
  setCode: string;
  numOfCards: number;
  tcgDate: string; // ISO date string
  setImage?: string;
  isASession: boolean;
  isPurchasable: boolean;
  isPromo: boolean;
  useDBImage: boolean;
  price: number;
}

export async function updateSet(input: UpdateSetInput): Promise<SetData> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { id, setName, setCode, numOfCards, tcgDate, setImage, isASession, isPurchasable, isPromo, useDBImage, price } = input;

    // Validate required fields
    if (!id) {
      throw new Error('Set ID is required');
    }

    if (!setName || !setCode || !numOfCards || !tcgDate) {
      throw new Error('Set name, set code, number of cards, and TCG date are required');
    }

    if (numOfCards < 1) {
      throw new Error('Number of cards must be at least 1');
    }

    if (price < 0) {
      throw new Error('Price cannot be negative');
    }

    // Check if set exists
    const existingSet = await prisma.set.findUnique({
      where: { id },
    });

    if (!existingSet) {
      throw new Error('Set not found');
    }

    // Check if set code is taken by another set
    const duplicateSetCode = await prisma.set.findFirst({
      where: {
        setCode,
        id: { not: id },
      },
    });

    if (duplicateSetCode) {
      throw new Error(`A different set with code "${setCode}" already exists`);
    }

    const updatedSet = await prisma.set.update({
      where: { id },
      data: {
        setName,
        setCode,
        numOfCards,
        tcgDate: new Date(tcgDate),
        setImage: setImage || null,
        isASession,
        isPurchasable,
        isPromo,
        useDBImage,
        price,
      },
      select: {
        id: true,
        setName: true,
        setCode: true,
        numOfCards: true,
        tcgDate: true,
        setImage: true,
        isASession: true,
        isPurchasable: true,
        isPromo: true,
        useDBImage: true,
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
