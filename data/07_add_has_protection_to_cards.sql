-- Migration: Add has_protection column to cards table
-- Date: 2026-02-21
-- Description: Adds a boolean has_protection column to the cards table with a default value of TRUE

ALTER TABLE cards
ADD COLUMN has_protection BOOLEAN NOT NULL DEFAULT TRUE;
