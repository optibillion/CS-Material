-- Run in Supabase SQL editor
CREATE TABLE IF NOT EXISTS staff_bag_issuances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_name TEXT NOT NULL,
  issued_by UUID REFERENCES users(id),
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE staff_bag_issuances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view staff bags"
  ON staff_bag_issuances FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert staff bags"
  ON staff_bag_issuances FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete staff bags"
  ON staff_bag_issuances FOR DELETE TO authenticated USING (true);
