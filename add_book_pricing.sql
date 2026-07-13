-- Add MRP to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS mrp NUMERIC(10,2);

-- Add discount and per-unit MRP snapshot to allotments
ALTER TABLE allotments ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,2) DEFAULT 0;
ALTER TABLE allotments ADD COLUMN IF NOT EXISTS unit_mrp NUMERIC(10,2);

-- Add book-pricing permission for issuers
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_price BOOLEAN DEFAULT FALSE;
