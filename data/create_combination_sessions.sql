-- ========================================
-- Create Combination Sets and Reorganize Sessions
-- ========================================
-- This script:
-- 1. Updates/creates 7 combination sets
-- 2. Marks individual early sets as NOT sessions
-- 3. Deletes all existing sessions
-- 4. Recreates sessions with combinations first

START TRANSACTION;

-- ========================================
-- STEP 1: Update existing LOB+MRD combination set (id 9999)
-- ========================================
UPDATE sets
SET
    set_name = 'LOB+MRD',
    set_code = 'LOB+MRD',
    num_of_cards = 432,
    tcg_date = '2002-06-26',
    set_image = 'https://images.ygoprodeck.com/images/sets/MRD.jpg',
    is_a_session = 1,
    is_purchasable = 0,
    is_promo = 0
WHERE id = 9999;

-- ========================================
-- STEP 2: Create 6 new combination sets (IDs 10000-10005)
-- ========================================

-- 10000: SRL+PSV (use PSV data: id 492)
INSERT INTO sets (id, set_name, set_code, num_of_cards, tcg_date, set_image, is_a_session, is_promo, is_purchasable, price)
VALUES (10000, 'SRL+PSV', 'SRL+PSV', 315, '2002-10-20', 'https://images.ygoprodeck.com/images/sets/PSV.jpg', 1, 0, 0, 4)
ON DUPLICATE KEY UPDATE
    set_name = 'SRL+PSV',
    set_code = 'SRL+PSV',
    num_of_cards = 315,
    tcg_date = '2002-10-20',
    set_image = 'https://images.ygoprodeck.com/images/sets/PSV.jpg',
    is_a_session = 1,
    is_purchasable = 0;

-- 10001: LON+LOD (use LOD data: id 360)
INSERT INTO sets (id, set_name, set_code, num_of_cards, tcg_date, set_image, is_a_session, is_promo, is_purchasable, price)
VALUES (10001, 'LON+LOD', 'LON+LOD', 202, '2003-06-06', 'https://images.ygoprodeck.com/images/sets/LOD.jpg', 1, 0, 0, 4)
ON DUPLICATE KEY UPDATE
    set_name = 'LON+LOD',
    set_code = 'LON+LOD',
    num_of_cards = 202,
    tcg_date = '2003-06-06',
    set_image = 'https://images.ygoprodeck.com/images/sets/LOD.jpg',
    is_a_session = 1,
    is_purchasable = 0;

-- 10002: PGD+MFC (use MFC data: id 408)
INSERT INTO sets (id, set_name, set_code, num_of_cards, tcg_date, set_image, is_a_session, is_promo, is_purchasable, price)
VALUES (10002, 'PGD+MFC', 'PGD+MFC', 108, '2003-10-10', 'https://images.ygoprodeck.com/images/sets/MFC.jpg', 1, 0, 0, 4)
ON DUPLICATE KEY UPDATE
    set_name = 'PGD+MFC',
    set_code = 'PGD+MFC',
    num_of_cards = 108,
    tcg_date = '2003-10-10',
    set_image = 'https://images.ygoprodeck.com/images/sets/MFC.jpg',
    is_a_session = 1,
    is_purchasable = 0;

-- 10003: DCR+IOC (use IOC data: id 345)
INSERT INTO sets (id, set_name, set_code, num_of_cards, tcg_date, set_image, is_a_session, is_promo, is_purchasable, price)
VALUES (10003, 'DCR+IOC', 'DCR+IOC', 224, '2004-03-01', 'https://images.ygoprodeck.com/images/sets/IOC.jpg', 1, 0, 0, 4)
ON DUPLICATE KEY UPDATE
    set_name = 'DCR+IOC',
    set_code = 'DCR+IOC',
    num_of_cards = 224,
    tcg_date = '2004-03-01',
    set_image = 'https://images.ygoprodeck.com/images/sets/IOC.jpg',
    is_a_session = 1,
    is_purchasable = 0;

-- 10004: AST+SOD (use SOD data: id 617)
INSERT INTO sets (id, set_name, set_code, num_of_cards, tcg_date, set_image, is_a_session, is_promo, is_purchasable, price)
VALUES (10004, 'AST+SOD', 'AST+SOD', 60, '2004-10-01', 'https://images.ygoprodeck.com/images/sets/SOD.jpg', 1, 0, 0, 4)
ON DUPLICATE KEY UPDATE
    set_name = 'AST+SOD',
    set_code = 'AST+SOD',
    num_of_cards = 60,
    tcg_date = '2004-10-01',
    set_image = 'https://images.ygoprodeck.com/images/sets/SOD.jpg',
    is_a_session = 1,
    is_purchasable = 0;

-- 10005: RDS+FET (use FET data: id 263)
INSERT INTO sets (id, set_name, set_code, num_of_cards, tcg_date, set_image, is_a_session, is_promo, is_purchasable, price)
VALUES (10005, 'RDS+FET', 'RDS+FET', 60, '2005-03-01', 'https://images.ygoprodeck.com/images/sets/FET.jpg', 1, 0, 0, 4)
ON DUPLICATE KEY UPDATE
    set_name = 'RDS+FET',
    set_code = 'RDS+FET',
    num_of_cards = 60,
    tcg_date = '2005-03-01',
    set_image = 'https://images.ygoprodeck.com/images/sets/FET.jpg',
    is_a_session = 1,
    is_purchasable = 0;

-- ========================================
-- STEP 3: Mark individual early sets as NOT sessions
-- ========================================
-- These 14 sets are now part of combinations, so they shouldn't be sessions themselves
UPDATE sets
SET is_a_session = 0
WHERE id IN (
    365,  -- LOB (already 0)
    427,  -- MRD (already 0)
    407,  -- MRL (already 0)
    643,  -- SRL (Spell Ruler)
    492,  -- PSV
    359,  -- LON
    360,  -- LOD
    493,  -- PGD
    408,  -- MFC
    140,  -- DCR
    345,  -- IOC
    43,   -- AST
    617,  -- SOD
    529,  -- RDS
    263   -- FET
);

-- ========================================
-- STEP 4: Delete all existing sessions
-- ========================================
DELETE FROM sessions;

-- ========================================
-- STEP 5: Recreate sessions from sets marked as is_a_session=1
-- ========================================
-- This will automatically number them 1, 2, 3, etc. based on tcg_date order
INSERT INTO sessions (number, date, set_id, complete, active, event_wheel_spun, victory_points_assigned, wallet_points_assigned, moderator_id, first, second, third, fourth, fifth, sixth)
SELECT
    ROW_NUMBER() OVER (ORDER BY tcg_date ASC) as number,
    NULL as date,
    id as set_id,
    FALSE as complete,
    FALSE as active,
    FALSE as event_wheel_spun,
    FALSE as victory_points_assigned,
    FALSE as wallet_points_assigned,
    NULL as moderator_id,
    NULL as first,
    NULL as second,
    NULL as third,
    NULL as fourth,
    NULL as fifth,
    NULL as sixth
FROM sets
WHERE is_a_session = TRUE
ORDER BY tcg_date ASC;

-- ========================================
-- Verify the results
-- ========================================
SELECT 'Combination sets created:' as status;
SELECT id, set_name, set_code, num_of_cards, tcg_date
FROM sets
WHERE id IN (9999, 10000, 10001, 10002, 10003, 10004, 10005)
ORDER BY tcg_date;

SELECT '' as blank;
SELECT 'First 10 sessions after reorganization:' as status;
SELECT s.id, s.number, s.set_id, se.set_code, se.set_name, se.tcg_date
FROM sessions s
JOIN sets se ON s.set_id = se.id
ORDER BY s.number
LIMIT 10;

COMMIT;
