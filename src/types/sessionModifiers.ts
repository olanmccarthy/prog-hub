/**
 * Session modifier fields that can be applied via event wheel outcomes.
 * This is the single source of truth for all modifier fields.
 *
 * Matches the SessionModifier model in the Prisma schema.
 */
export interface SessionModifierFields {
  // Wallet & Victory Point Modifiers
  doubleWalletPoints?: boolean;
  awardTwoVictoryPoints?: boolean;
  oddPlacementBonus?: boolean;
  evenPlacementBonus?: boolean;
  reverseVpOrder?: boolean;
  matchWinBonus?: boolean;
  adminHalveWallet?: boolean;
  equalSplitWallet?: boolean;
  halveAllWalletPoints?: boolean;
  bountyHunter?: boolean;

  // Decklist Visibility Modifiers
  earlyDecklistPublic?: boolean;

  // Event Wheel Modifiers
  allowMultipleEventSpins?: boolean;

  // Moderator & Banlist Modifiers
  skipModeratorRandomBanlist?: boolean;
  trueDemocracyBanlist?: boolean;

  // Gambling Modifier
  gamblingEnabled?: boolean;

  // Metadata
  halvedPlayerIds?: number[] | null;
}

/**
 * Alias for backward compatibility and semantic clarity in different contexts.
 */
export type SessionModifiers = SessionModifierFields;
