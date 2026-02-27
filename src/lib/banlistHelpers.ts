"use server";

/**
 * Parses a banlist field from the database.
 * Handles both string (JSON) and array formats.
 * Returns an empty array for null, undefined, or empty strings.
 */
export async function parseBanlistField(field: unknown): Promise<number[]> {
  if (!field) return [];

  if (typeof field === "string") {
    if (field.trim() === "") return [];
    try {
      return JSON.parse(field) as number[];
    } catch {
      return [];
    }
  }

  if (Array.isArray(field)) return field;

  return [];
}

/**
 * Merges a banlist suggestion into the current banlist.
 *
 * Logic:
 * - Cards mentioned in the suggestion move to their new categories
 * - Cards NOT mentioned in the suggestion stay in their current categories
 * - New cards from the suggestion are added to their specified categories
 *
 * @param currentBanlist - The existing banlist to merge into
 * @param suggestion - The suggestion with proposed changes
 * @returns A new merged banlist
 */
export async function mergeBanlists(
  currentBanlist: {
    banned: number[];
    limited: number[];
    semilimited: number[];
    unlimited: number[];
  },
  suggestion: {
    banned: number[];
    limited: number[];
    semilimited: number[];
    unlimited: number[];
  }
): Promise<{
  banned: number[];
  limited: number[];
  semilimited: number[];
  unlimited: number[];
}> {
  // Get all cards that are mentioned in the suggestion
  const allAffectedCards = new Set([
    ...suggestion.banned,
    ...suggestion.limited,
    ...suggestion.semilimited,
    ...suggestion.unlimited,
  ]);

  // For each category, keep cards from current banlist that aren't affected,
  // then add the new cards from the suggestion
  return {
    banned: [
      ...currentBanlist.banned.filter((id) => !allAffectedCards.has(id)),
      ...suggestion.banned,
    ],
    limited: [
      ...currentBanlist.limited.filter((id) => !allAffectedCards.has(id)),
      ...suggestion.limited,
    ],
    semilimited: [
      ...currentBanlist.semilimited.filter((id) => !allAffectedCards.has(id)),
      ...suggestion.semilimited,
    ],
    unlimited: [
      ...currentBanlist.unlimited.filter((id) => !allAffectedCards.has(id)),
      ...suggestion.unlimited,
    ],
  };
}
