'use server';

import { prisma } from '@lib/prisma';

/**
 * Helper function to parse banlist field (handles both string and array)
 */
function parseBanlistField(field: unknown): number[] {
  if (!field) return [];
  if (typeof field === 'string') {
    if (field.trim() === '') return [];
    try {
      return JSON.parse(field) as number[];
    } catch {
      return [];
    }
  }
  if (Array.isArray(field)) return field;
  return [];
}

export interface BanlistHistoryItem {
  id: number;
  sessionId: number;
  banned: number[];
  limited: number[];
  semilimited: number[];
  unlimited: number[];
}

interface GetBanlistHistoryResult {
  success: boolean;
  banlists: BanlistHistoryItem[];
  error?: string;
}

export async function getBanlistHistory(): Promise<GetBanlistHistoryResult> {
  try {
    const banlists = await prisma.banlist.findMany({
      orderBy: { sessionId: 'desc' },
    });

    const formattedBanlists: BanlistHistoryItem[] = banlists.map((b) => ({
      id: b.id,
      sessionId: b.sessionId,
      banned: parseBanlistField(b.banned),
      limited: parseBanlistField(b.limited),
      semilimited: parseBanlistField(b.semilimited),
      unlimited: parseBanlistField(b.unlimited),
    }));

    return {
      success: true,
      banlists: formattedBanlists,
    };
  } catch (error) {
    console.error('Error fetching banlist history:', error);
    return {
      success: false,
      banlists: [],
      error: error instanceof Error ? error.message : 'Failed to fetch banlist history',
    };
  }
}
