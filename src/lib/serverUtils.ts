"use server";

import { getCurrentUser, type SessionData } from "@lib/auth";

/**
 * Requires that a user is authenticated.
 * Returns user data on success, or an error result on failure.
 */
export async function requireAuth(): Promise<
  | { success: true; user: SessionData }
  | { success: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }
  return { success: true, user };
}

/**
 * Requires that a user is authenticated AND is an admin.
 * Returns user data on success, or an error result on failure.
 */
export async function requireAdmin(): Promise<
  | { success: true; user: SessionData }
  | { success: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }
  if (!user.isAdmin) {
    return { success: false, error: "Admin access required" };
  }
  return { success: true, user };
}
