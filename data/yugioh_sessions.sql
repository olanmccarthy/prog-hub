-- Auto-generated SQL to populate sessions table
-- This file should be run after yugioh_sets.sql

-- Populate sessions table from sets marked as is_a_session
INSERT INTO sessions (number, date, set_id, complete, active, first, second, third, fourth, fifth, sixth)
SELECT 
  ROW_NUMBER() OVER (ORDER BY tcg_date ASC) as number,
  NULL as date,
  id as set_id,
  FALSE as complete,
  FALSE as active,
  NULL as first,
  NULL as second,
  NULL as third,
  NULL as fourth,
  NULL as fifth,
  NULL as sixth
FROM sets
WHERE is_a_session = TRUE
ORDER BY tcg_date ASC;
