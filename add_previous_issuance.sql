-- Add is_previous_issuance flag to issuances table
-- Run this in Supabase SQL Editor before using the "Previous Issue" feature

ALTER TABLE issuances
ADD COLUMN IF NOT EXISTS is_previous_issuance BOOLEAN NOT NULL DEFAULT FALSE;
