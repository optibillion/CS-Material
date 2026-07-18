-- Track whether stock was deducted when an allotment was created
-- NULL = unknown (old records), true = yes, false = no
ALTER TABLE allotments ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN DEFAULT NULL;

-- Mark all existing records as NULL (unknown) since we didn't track this before
UPDATE allotments SET stock_deducted = NULL WHERE stock_deducted = false OR stock_deducted IS NULL;
