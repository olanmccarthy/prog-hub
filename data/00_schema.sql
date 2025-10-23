-- Auto-generated schema from Prisma
-- This file creates all tables before any data is loaded

-- CreateTable
CREATE TABLE IF NOT EXISTS `players` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `is_admin` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `number` INTEGER NOT NULL,
    `date` DATETIME(3) NULL,
    `set_id` INTEGER NULL,
    `complete` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `event_wheel_spun` BOOLEAN NOT NULL DEFAULT false,
    `victory_points_assigned` BOOLEAN NOT NULL DEFAULT false,
    `wallet_points_assigned` BOOLEAN NOT NULL DEFAULT false,
    `moderator_id` INTEGER NULL,
    `first` INTEGER NULL,
    `second` INTEGER NULL,
    `third` INTEGER NULL,
    `fourth` INTEGER NULL,
    `fifth` INTEGER NULL,
    `sixth` INTEGER NULL,

    UNIQUE INDEX `sessions_number_key`(`number`),
    INDEX `idx_active`(`active`),
    INDEX `idx_complete`(`complete`),
    INDEX `idx_moderator_id`(`moderator_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `decklists` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `player_id` INTEGER NOT NULL,
    `session_id` INTEGER NOT NULL,
    `maindeck` JSON NOT NULL,
    `sidedeck` JSON NOT NULL,
    `extradeck` JSON NOT NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_session_id`(`session_id`),
    INDEX `idx_player_id`(`player_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `banlists` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `banned` JSON NOT NULL,
    `limited` JSON NOT NULL,
    `semilimited` JSON NOT NULL,
    `unlimited` JSON NOT NULL,

    INDEX `idx_banlist_session_id`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `banlist_suggestions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `banlist_id` INTEGER NOT NULL,
    `player_id` INTEGER NOT NULL,
    `moderator_id` INTEGER NULL,
    `banned` JSON NOT NULL,
    `limited` JSON NOT NULL,
    `semilimited` JSON NOT NULL,
    `unlimited` JSON NOT NULL,
    `chosen` BOOLEAN NOT NULL DEFAULT false,

    INDEX `idx_suggestion_banlist_id`(`banlist_id`),
    INDEX `idx_suggestion_player_id`(`player_id`),
    INDEX `idx_suggestion_chosen`(`chosen`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `banlist_suggestion_votes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `player_id` INTEGER NOT NULL,
    `suggestion_id` INTEGER NOT NULL,

    INDEX `idx_vote_suggestion_id`(`suggestion_id`),
    INDEX `idx_vote_player_id`(`player_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `pairings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `round` INTEGER NOT NULL,
    `player1_id` INTEGER NOT NULL,
    `player2_id` INTEGER NOT NULL,
    `player1wins` INTEGER NOT NULL DEFAULT 0,
    `player2wins` INTEGER NOT NULL DEFAULT 0,

    INDEX `idx_pairing_session_id`(`session_id`),
    INDEX `idx_pairing_round`(`round`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `victory_points` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `player_id` INTEGER NOT NULL,
    `session_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `wallets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `player_id` INTEGER NOT NULL,
    `amount` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `wallets_player_id_key`(`player_id`),
    INDEX `idx_wallet_player_id`(`player_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `wallet_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `wallet_id` INTEGER NOT NULL,
    `session_id` INTEGER NULL,
    `amount` INTEGER NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_wallet_transaction_wallet_id`(`wallet_id`),
    INDEX `idx_wallet_transaction_session_id`(`session_id`),
    INDEX `idx_wallet_transaction_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `player_id` INTEGER NOT NULL,
    `set_id` INTEGER NOT NULL,
    `amount` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_transaction_player_id`(`player_id`),
    INDEX `idx_transaction_set_id`(`set_id`),
    INDEX `idx_transaction_date`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `cards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `card_name` VARCHAR(255) NOT NULL,
    `card_type` VARCHAR(50) NULL,
    `attribute` VARCHAR(50) NULL,
    `property` VARCHAR(50) NULL,
    `types` VARCHAR(100) NULL,
    `level` INTEGER NULL,
    `atk` INTEGER NULL,
    `def` INTEGER NULL,
    `link` INTEGER NULL,
    `pendulum_scale` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `sets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `set_name` VARCHAR(255) NOT NULL,
    `set_code` VARCHAR(50) NOT NULL,
    `num_of_cards` INTEGER NOT NULL,
    `tcg_date` DATE NOT NULL,
    `set_image` VARCHAR(500) NULL,
    `is_a_session` BOOLEAN NOT NULL DEFAULT false,
    `is_purchasable` BOOLEAN NOT NULL DEFAULT true,
    `is_promo` BOOLEAN NOT NULL DEFAULT false,
    `price` INTEGER NOT NULL DEFAULT 4,

    INDEX `idx_set_code`(`set_code`),
    INDEX `idx_tcg_date`(`tcg_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `event_wheel_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `chance` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `loser_prizing_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `chance` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `wallet_point_breakdowns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL DEFAULT 'Unnamed',
    `first` INTEGER NOT NULL,
    `second` INTEGER NOT NULL,
    `third` INTEGER NOT NULL,
    `fourth` INTEGER NOT NULL,
    `fifth` INTEGER NOT NULL,
    `sixth` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey (only if not exists)
-- Note: MySQL doesn't support IF NOT EXISTS for foreign keys, so we'll skip them here
-- Prisma will handle foreign key creation via `npx prisma db push` if needed
