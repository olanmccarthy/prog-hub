import { NextRequest, NextResponse } from 'next/server';
import { AppDataSource } from '@/src/lib/data-source';
import { Player } from '@/src/entities/Player';

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json(
        { error: 'Name and password are required' },
        { status: 400 }
      );
    }

    // Initialize database connection if not already initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Get player repository
    const playerRepository = AppDataSource.getRepository(Player);

    // Find player by name
    const player = await playerRepository.findOne({
      where: { name },
    });

    if (!player) {
      return NextResponse.json(
        { error: 'Invalid name or password' },
        { status: 401 }
      );
    }

    // Check password (plain text comparison as requested)
    if (player.password !== password) {
      return NextResponse.json(
        { error: 'Invalid name or password' },
        { status: 401 }
      );
    }

    // Create response with session cookie
    const response = NextResponse.json(
      {
        success: true,
        player: {
          id: player.id,
          name: player.name,
        },
      },
      { status: 200 }
    );

    // Set session cookie (simple session with player ID and admin status)
    response.cookies.set('session', JSON.stringify({ playerId: player.id, playerName: player.name, isAdmin: player.isAdmin }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
