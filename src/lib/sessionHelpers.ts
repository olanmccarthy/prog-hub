"use server";

import { prisma } from "@lib/prisma";
import type { Session } from "@prisma/client";

/**
 * Retrieves the currently active session.
 * Returns null if no session is active.
 */
export async function getActiveSession(): Promise<Session | null> {
  return await prisma.session.findFirst({
    where: { active: true },
  });
}

/**
 * Requires that an active session exists.
 * Returns session data on success, or an error result on failure.
 */
export async function requireActiveSession(): Promise<
  | { success: true; data: Session }
  | { success: false; error: string }
> {
  const activeSession = await getActiveSession();
  if (!activeSession) {
    return { success: false, error: "No active session found" };
  }
  return { success: true, data: activeSession };
}

/**
 * Checks if standings have been finalized for a session.
 * Standings are finalized when all placement fields (1st-6th) are populated.
 */
export async function areStandingsFinalized(session: Session): Promise<boolean> {
  return !!(
    session.first &&
    session.second &&
    session.third &&
    session.fourth &&
    session.fifth &&
    session.sixth
  );
}

/**
 * Retrieves the next incomplete session (ordered by session number).
 * Returns null if all sessions are complete.
 */
export async function getNextIncompleteSession(): Promise<Session | null> {
  return await prisma.session.findFirst({
    where: { complete: false },
    orderBy: { number: "asc" },
  });
}
