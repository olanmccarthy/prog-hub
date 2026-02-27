-- Schema Migration for PR #16: Automation + Refactoring
-- Adds SessionModifier, PlayerBet, LoserPrizingResult tables and various enhancements
-- Run this BEFORE deploying the new code to production

-- ============================================================================
-- 1. ADD NEW FIELDS TO EXISTING TABLES
-- ============================================================================

-- Add new fields to sessions table
ALTER TABLE sessions
  ADD COLUMN loser_prizing_spun BOOLEAN NOT NULL DEFAULT FALSE AFTER wallet_points_assigned,
  ADD COLUMN selected_events TEXT NULL AFTER sixth;

-- Add new field to transactions table
ALTER TABLE transactions
  ADD COLUMN session_id INT NULL AFTER set_id,
  ADD INDEX idx_transaction_session_id (session_id),
  ADD CONSTRAINT fk_transaction_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- Add new fields to sets table
ALTER TABLE sets
  ADD COLUMN price INT NOT NULL DEFAULT 4 AFTER is_promo,
  ADD COLUMN use_db_image BOOLEAN NOT NULL DEFAULT FALSE AFTER price;

-- ============================================================================
-- 2. ENHANCE EVENT WHEEL ENTRIES TABLE
-- ============================================================================

ALTER TABLE event_wheel_entries
  -- Wallet & Victory Point Modifiers
  ADD COLUMN double_wallet_points BOOLEAN NOT NULL DEFAULT FALSE AFTER chance,
  ADD COLUMN award_two_victory_points BOOLEAN NOT NULL DEFAULT FALSE AFTER double_wallet_points,
  ADD COLUMN odd_placement_bonus BOOLEAN NOT NULL DEFAULT FALSE AFTER award_two_victory_points,
  ADD COLUMN even_placement_bonus BOOLEAN NOT NULL DEFAULT FALSE AFTER odd_placement_bonus,
  ADD COLUMN reverse_vp_order BOOLEAN NOT NULL DEFAULT FALSE AFTER even_placement_bonus,
  ADD COLUMN match_win_bonus BOOLEAN NOT NULL DEFAULT FALSE AFTER reverse_vp_order,
  ADD COLUMN admin_halve_wallet BOOLEAN NOT NULL DEFAULT FALSE AFTER match_win_bonus,
  ADD COLUMN equal_split_wallet BOOLEAN NOT NULL DEFAULT FALSE AFTER admin_halve_wallet,
  ADD COLUMN halve_all_wallet_points BOOLEAN NOT NULL DEFAULT FALSE AFTER equal_split_wallet,
  ADD COLUMN bounty_hunter BOOLEAN NOT NULL DEFAULT FALSE AFTER halve_all_wallet_points,

  -- Decklist Visibility Modifiers
  ADD COLUMN early_decklist_public BOOLEAN NOT NULL DEFAULT FALSE AFTER bounty_hunter,

  -- Event Wheel Modifiers
  ADD COLUMN allow_multiple_event_spins BOOLEAN NOT NULL DEFAULT FALSE AFTER early_decklist_public,

  -- Moderator & Banlist Modifiers
  ADD COLUMN skip_moderator_random_banlist BOOLEAN NOT NULL DEFAULT FALSE AFTER allow_multiple_event_spins,
  ADD COLUMN true_democracy_banlist BOOLEAN NOT NULL DEFAULT FALSE AFTER skip_moderator_random_banlist,

  -- Gambling Modifier
  ADD COLUMN gambling_enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER true_democracy_banlist,

  -- Metadata
  ADD COLUMN halved_player_ids JSON NULL AFTER gambling_enabled;

-- ============================================================================
-- 3. ENHANCE LOSER PRIZING ENTRIES TABLE
-- ============================================================================

ALTER TABLE loser_prizing_entries
  -- Automation flags
  ADD COLUMN automation_type VARCHAR(50) NULL AFTER chance,
  ADD COLUMN requires_player_selection BOOLEAN NOT NULL DEFAULT FALSE AFTER automation_type,
  ADD COLUMN requires_input BOOLEAN NOT NULL DEFAULT FALSE AFTER requires_player_selection,
  ADD COLUMN allows_respin BOOLEAN NOT NULL DEFAULT FALSE AFTER requires_input,

  -- Immediate wallet/VP effects
  ADD COLUMN wallet_point_change INT NULL AFTER allows_respin,
  ADD COLUMN victory_point_change INT NULL AFTER wallet_point_change,

  -- Session modifiers
  ADD COLUMN double_points_next_session BOOLEAN NOT NULL DEFAULT FALSE AFTER victory_point_change,
  ADD COLUMN half_price_shop_next_session BOOLEAN NOT NULL DEFAULT FALSE AFTER double_points_next_session,
  ADD COLUMN take_vp_and_wallet_next_session BOOLEAN NOT NULL DEFAULT FALSE AFTER half_price_shop_next_session,
  ADD COLUMN all_wins_two_zeros_next_session BOOLEAN NOT NULL DEFAULT FALSE AFTER take_vp_and_wallet_next_session;

-- ============================================================================
-- 4. CREATE SESSION_MODIFIERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_modifiers (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL UNIQUE,

  -- Wallet & Victory Point Modifiers
  double_wallet_points BOOLEAN NOT NULL DEFAULT FALSE,
  award_two_victory_points BOOLEAN NOT NULL DEFAULT FALSE,
  odd_placement_bonus BOOLEAN NOT NULL DEFAULT FALSE,
  even_placement_bonus BOOLEAN NOT NULL DEFAULT FALSE,
  reverse_vp_order BOOLEAN NOT NULL DEFAULT FALSE,
  match_win_bonus BOOLEAN NOT NULL DEFAULT FALSE,
  admin_halve_wallet BOOLEAN NOT NULL DEFAULT FALSE,
  equal_split_wallet BOOLEAN NOT NULL DEFAULT FALSE,
  halve_all_wallet_points BOOLEAN NOT NULL DEFAULT FALSE,
  bounty_hunter BOOLEAN NOT NULL DEFAULT FALSE,

  -- Decklist Visibility Modifiers
  early_decklist_public BOOLEAN NOT NULL DEFAULT FALSE,

  -- Event Wheel Modifiers
  allow_multiple_event_spins BOOLEAN NOT NULL DEFAULT FALSE,

  -- Moderator & Banlist Modifiers
  skip_moderator_random_banlist BOOLEAN NOT NULL DEFAULT FALSE,
  true_democracy_banlist BOOLEAN NOT NULL DEFAULT FALSE,

  -- Gambling Modifier
  gambling_enabled BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata for admin halve wallet feature
  halved_player_ids JSON NULL,

  -- Loser prizing modifiers (single player per session)
  loser_prizing_player_id INT NULL,
  loser_prizing_target_player_id INT NULL,
  loser_prizing_double_points BOOLEAN NOT NULL DEFAULT FALSE,
  loser_prizing_half_price_shop BOOLEAN NOT NULL DEFAULT FALSE,
  loser_prizing_take_vp_and_wallet BOOLEAN NOT NULL DEFAULT FALSE,
  loser_prizing_all_wins_two_zeros BOOLEAN NOT NULL DEFAULT FALSE,
  loser_prizing_shared_points BOOLEAN NOT NULL DEFAULT FALSE,

  -- Investment tracking (The Market is Going to go Up)
  loser_prizing_investment INT NULL,

  -- Foreign keys
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  INDEX idx_session_modifier_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. CREATE PLAYER_BETS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS player_bets (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  bettor_id INT NOT NULL,
  target_player_id INT NOT NULL,
  bet_amount INT NOT NULL,
  odds FLOAT NOT NULL COMMENT 'Multiplier (e.g., 1.5x, 2.0x, 3.5x)',
  payout INT NULL COMMENT 'Calculated after resolution',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending, won, lost, void',
  placed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (bettor_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (target_player_id) REFERENCES players(id) ON DELETE CASCADE,

  -- Indexes
  UNIQUE KEY unique_session_bettor (session_id, bettor_id) COMMENT 'One bet per player per session',
  INDEX idx_player_bet_session_id (session_id),
  INDEX idx_player_bet_bettor_id (bettor_id),
  INDEX idx_player_bet_target_player_id (target_player_id),
  INDEX idx_player_bet_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. CREATE LOSER_PRIZING_RESULTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS loser_prizing_results (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  player_id INT NOT NULL,
  entry_id INT NOT NULL,
  entry_name VARCHAR(255) NOT NULL,
  entry_description TEXT NOT NULL,

  -- Player selections (if needed)
  target_player_id INT NULL,
  additional_data TEXT NULL COMMENT 'JSON for complex data',

  -- Tracking
  automated_result BOOLEAN NOT NULL DEFAULT FALSE,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (entry_id) REFERENCES loser_prizing_entries(id),
  FOREIGN KEY (target_player_id) REFERENCES players(id),

  -- Indexes
  INDEX idx_loser_prizing_session_player (session_id, player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. CREATE SYNERGY_EXCLUDED_CARDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS synergy_excluded_cards (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  card_id INT NOT NULL UNIQUE,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. UPDATE WALLET_TRANSACTIONS FOR NEW TRANSACTION TYPES
-- ============================================================================

-- No schema changes needed, but new transaction types will be used:
-- - 'GAMBLING_BET': When a player places a bet
-- - 'GAMBLING_PAYOUT': When a bet is resolved and payout is awarded
-- - 'LOSER_PRIZING': When loser prizing awards wallet points
-- These are just VARCHAR values in the existing 'type' column

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Run 'npx prisma generate' after this migration to update Prisma Client
-- Then restart the application
