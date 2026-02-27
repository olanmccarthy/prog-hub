/**
 * Represents an entry that can be selected with weighted randomness.
 */
export interface WeightedEntry {
  chance: number;
}

/**
 * Selects a random entry from a weighted list.
 *
 * Logic:
 * - If total chances >= 100: Normalize all entries to sum to 100%
 * - If total chances < 100: Add a null entry for the remainder (represents "no selection")
 *
 * @param entries - Array of entries with chance percentages
 * @returns Selected entry or null if "no selection" is chosen
 */
export function selectWeightedRandom<T extends WeightedEntry>(
  entries: T[]
): T | null {
  const totalChance = entries.reduce((sum, entry) => sum + entry.chance, 0);

  let normalizedEntries: Array<{ entry: T | null; weight: number }>;

  if (totalChance >= 100) {
    // Normalize entries to sum to exactly 100%
    normalizedEntries = entries.map((entry) => ({
      entry,
      weight: (entry.chance / totalChance) * 100,
    }));
  } else {
    // Add a "no selection" entry for the remainder
    normalizedEntries = [
      ...entries.map((entry) => ({ entry, weight: entry.chance })),
      { entry: null, weight: 100 - totalChance },
    ];
  }

  // Select using cumulative probability
  const random = Math.random() * 100;
  let cumulative = 0;

  for (const { entry, weight } of normalizedEntries) {
    cumulative += weight;
    if (random <= cumulative) {
      return entry;
    }
  }

  return null;
}
