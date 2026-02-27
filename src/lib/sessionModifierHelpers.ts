import type { SessionModifiers } from '@/src/types/sessionModifiers';

/**
 * Merges new session modifiers into existing modifiers.
 * Uses OR logic - if either existing or new has a modifier enabled, it remains enabled.
 * For halvedPlayerIds, the new value takes precedence if provided.
 *
 * @param existing - The existing modifiers (may be null, undefined, or partial)
 * @param newModifiers - The new modifiers to merge in
 * @returns Merged modifiers with all fields populated
 */
export function mergeSessionModifiers(
  existing: SessionModifiers | null | undefined,
  newModifiers: SessionModifiers
): SessionModifiers {
  return {
    doubleWalletPoints:
      (existing?.doubleWalletPoints || false) ||
      (newModifiers.doubleWalletPoints || false),
    awardTwoVictoryPoints:
      (existing?.awardTwoVictoryPoints || false) ||
      (newModifiers.awardTwoVictoryPoints || false),
    oddPlacementBonus:
      (existing?.oddPlacementBonus || false) ||
      (newModifiers.oddPlacementBonus || false),
    evenPlacementBonus:
      (existing?.evenPlacementBonus || false) ||
      (newModifiers.evenPlacementBonus || false),
    reverseVpOrder:
      (existing?.reverseVpOrder || false) ||
      (newModifiers.reverseVpOrder || false),
    matchWinBonus:
      (existing?.matchWinBonus || false) ||
      (newModifiers.matchWinBonus || false),
    adminHalveWallet:
      (existing?.adminHalveWallet || false) ||
      (newModifiers.adminHalveWallet || false),
    equalSplitWallet:
      (existing?.equalSplitWallet || false) ||
      (newModifiers.equalSplitWallet || false),
    halveAllWalletPoints:
      (existing?.halveAllWalletPoints || false) ||
      (newModifiers.halveAllWalletPoints || false),
    bountyHunter:
      (existing?.bountyHunter || false) ||
      (newModifiers.bountyHunter || false),
    earlyDecklistPublic:
      (existing?.earlyDecklistPublic || false) ||
      (newModifiers.earlyDecklistPublic || false),
    allowMultipleEventSpins:
      (existing?.allowMultipleEventSpins || false) ||
      (newModifiers.allowMultipleEventSpins || false),
    skipModeratorRandomBanlist:
      (existing?.skipModeratorRandomBanlist || false) ||
      (newModifiers.skipModeratorRandomBanlist || false),
    trueDemocracyBanlist:
      (existing?.trueDemocracyBanlist || false) ||
      (newModifiers.trueDemocracyBanlist || false),
    gamblingEnabled:
      (existing?.gamblingEnabled || false) ||
      (newModifiers.gamblingEnabled || false),
    halvedPlayerIds:
      newModifiers.halvedPlayerIds !== undefined
        ? newModifiers.halvedPlayerIds
        : existing?.halvedPlayerIds || null,
  };
}
