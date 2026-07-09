-- Add payment_mode column to sales table
-- Run this in Supabase → SQL Editor.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) DEFAULT 'cash';
