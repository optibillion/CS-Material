-- Run in Supabase SQL editor
ALTER TABLE students ADD COLUMN IF NOT EXISTS bag_issued_by UUID REFERENCES users(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS bag_issued_at TIMESTAMPTZ;
