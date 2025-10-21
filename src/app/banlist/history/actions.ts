'use server';

import { prisma } from '@lib/prisma';

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
      banned: b.banned as number[],
      limited: b.limited as number[],
      semilimited: b.semilimited as number[],
      unlimited: b.unlimited as number[],
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
