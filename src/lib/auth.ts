import { cookies } from 'next/headers';

export interface SessionData {
  playerId: number;
  playerName: string;
  isAdmin?: boolean;
}

/**
 * Get the currently logged-in player from the session cookie
 * @returns SessionData if user is logged in, null otherwise
 */
export async function getCurrentUser(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return null;
    }

    const session = JSON.parse(sessionCookie.value) as SessionData;

    if (!session.playerId) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
