import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId: playerIdParam } = await params;
    const playerId = parseInt(playerIdParam, 10);

    if (isNaN(playerId)) {
      return NextResponse.json(
        { error: 'Invalid player ID' },
        { status: 400 }
      );
    }

    const wallet = await prisma.wallet.findUnique({
      where: { playerId },
    });

    if (!wallet) {
      // Return 0 if wallet doesn't exist yet
      return NextResponse.json({ amount: 0 });
    }

    return NextResponse.json({ amount: wallet.amount });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet balance' },
      { status: 500 }
    );
  }
}
