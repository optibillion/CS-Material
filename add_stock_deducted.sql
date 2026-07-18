-- Track whether stock was deducted when an allotment was created
ALTER TABLE allotments ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN DEFAULT false;
