import { NextResponse } from 'next/server';
import { getCurrentUser } from '@lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { isAdmin: false, authenticated: false },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        isAdmin: user.isAdmin || false,
        authenticated: true,
        playerId: user.playerId,
        playerName: user.playerName,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking user:', error);
    return NextResponse.json(
      { isAdmin: false, authenticated: false },
      { status: 200 }
    );
  }
}
