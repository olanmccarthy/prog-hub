-- Production Updates SQL Script
-- This script:
-- 1. Populates synergy_excluded_cards with common staple cards
-- 2. Backfills sessionId for transactions based on their dates

-- ============================================================================
-- PART 1: Populate Synergy Exclusions
-- ============================================================================

-- Insert common staple cards that should be excluded from synergy calculations
-- These are cards that appear in most decks but don't have specific synergies

INSERT IGNORE INTO synergy_excluded_cards (card_id, added_at)
SELECT id, NOW() FROM cards WHERE name IN (
    -- Draw/Search Staples
    'Pot of Greed',
    'Graceful Charity',
    'Pot of Avarice',
    'Pot of Desires',
    'Pot of Extravagance',
    'Pot of Prosperity',
    'Upstart Goblin',
    'Into the Void',
    'Card of Demise',
    'Allure of Darkness',

    -- Generic Spells
    'Monster Reborn',
    'Called by the Grave',
    'Forbidden Droplet',
    'Dark Ruler No More',
    'Lightning Storm',
    'Raigeki',
    'Harpie\'s Feather Duster',
    'Twin Twisters',
    'Cosmic Cyclone',
    'Mystical Space Typhoon',

    -- Hand Traps
    'Ash Blossom & Joyous Spring',
    'Effect Veiler',
    'Infinite Impermanence',
    'Ghost Ogre & Snow Rabbit',
    'Droll & Lock Bird',
    'Nibiru, the Primal Being',
    'Dimension Shifter',
    'PSY-Framegear Gamma',
    'Ghost Belle & Haunted Mansion',
    'Skull Meister',

    -- Generic Extra Deck
    'Accesscode Talker',
    'Apollousa, Bow of the Goddess',
    'Borreload Dragon',
    'Knightmare Phoenix',
    'Knightmare Unicorn',
    'I:P Masquerena',
    'Underworld Goddess of the Closed World',
    'Divine Arsenal AA-ZEUS - Sky Thunder',
    'Number 41: Bagooska the Terribly Tired Tapir',
    'Abyss Dweller',
    'Tornado Dragon',

    -- Generic Traps
    'Solemn Judgment',
    'Solemn Strike',
    'Solemn Warning',
    'Infinite Impermanence',
    'Evenly Matched',
    'Red Reboot'
);

-- ============================================================================
-- PART 2: Backfill Transaction SessionIds
-- ============================================================================

-- Update transactions to link them to the appropriate session
-- For each transaction, find the most recent session that started on or before the transaction date

UPDATE transactions t
SET session_id = (
    SELECT s.id
    FROM sessions s
    WHERE s.date IS NOT NULL
      AND s.date <= t.date
    ORDER BY s.date DESC
    LIMIT 1
)
WHERE t.session_id IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check how many synergy exclusions were added
SELECT
    COUNT(*) as excluded_cards_count,
    'Synergy exclusions added' as description
FROM synergy_excluded_cards;

-- Check transactions with sessionId
SELECT
    COUNT(*) as total_transactions,
    COUNT(session_id) as transactions_with_session_id,
    COUNT(*) - COUNT(session_id) as transactions_without_session_id,
    'Transaction sessionId status' as description
FROM transactions;

-- Show sample of excluded cards
SELECT
    sec.id,
    c.cardName as card_name,
    sec.added_at
FROM synergy_excluded_cards sec
JOIN cards c ON sec.card_id = c.id
ORDER BY sec.added_at DESC
LIMIT 10;

-- Show sample of transactions with their sessions
SELECT
    t.id,
    t.player_id,
    t.amount,
    DATE(t.date) as transaction_date,
    t.session_id,
    s.number as session_number
FROM transactions t
LEFT JOIN sessions s ON t.session_id = s.id
ORDER BY t.date
LIMIT 10;
