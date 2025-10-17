/**
 * Deck validation utilities for checking against banlists
 */

export interface BanlistData {
  banned: string[];
  limited: string[];
  semilimited: string[];
  unlimited: string[];
}

export interface DeckValidationResult {
  isLegal: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a deck against a banlist
 */
export function validateDeckAgainstBanlist(
  maindeck: number[],
  sidedeck: number[],
  extradeck: number[],
  banlist: BanlistData
): DeckValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Combine main and side deck for card limit checks
  const combinedDeck = [...maindeck, ...sidedeck];

  // Count occurrences of each card in combined deck
  const cardCounts = new Map<string, number>();
  combinedDeck.forEach((cardId) => {
    const idStr = String(cardId);
    cardCounts.set(idStr, (cardCounts.get(idStr) || 0) + 1);
  });

  // Check banned cards
  banlist.banned.forEach((bannedId) => {
    const count = cardCounts.get(bannedId) || 0;
    if (count > 0) {
      errors.push(
        `Banned card detected: Card ID ${bannedId} (${count} ${count === 1 ? "copy" : "copies"} found)`
      );
    }
  });

  // Check limited cards (max 1 copy)
  banlist.limited.forEach((limitedId) => {
    const count = cardCounts.get(limitedId) || 0;
    if (count > 1) {
      errors.push(
        `Limited card exceeded: Card ID ${limitedId} (${count} copies found, max 1 allowed)`
      );
    }
  });

  // Check semi-limited cards (max 2 copies)
  banlist.semilimited.forEach((semiLimitedId) => {
    const count = cardCounts.get(semiLimitedId) || 0;
    if (count > 2) {
      errors.push(
        `Semi-limited card exceeded: Card ID ${semiLimitedId} (${count} copies found, max 2 allowed)`
      );
    }
  });

  // Check unlimited cards (these were previously restricted)
  banlist.unlimited.forEach((unlimitedId) => {
    const count = cardCounts.get(unlimitedId) || 0;
    if (count > 0) {
      warnings.push(
        `Card ID ${unlimitedId} was recently moved to unlimited (${count} ${count === 1 ? "copy" : "copies"} in deck)`
      );
    }
  });

  return {
    isLegal: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get a summary message for validation results
 */
export function getValidationSummary(result: DeckValidationResult): string {
  if (result.isLegal) {
    if (result.warnings.length > 0) {
      return "Deck is legal with notes";
    }
    return "Deck is legal";
  }
  return `Deck is illegal (${result.errors.length} ${result.errors.length === 1 ? "violation" : "violations"})`;
}
