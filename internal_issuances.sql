CREATE TABLE IF NOT EXISTS internal_issuances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('staff', 'campus')),
  recipient_name TEXT NOT NULL,
  book_id UUID REFERENCES books(id),
  qty INT NOT NULL,
  stock_deducted BOOLEAN NOT NULL DEFAULT true,
  issued_by UUID,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE internal_issuances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view internal issuances"
  ON internal_issuances FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert internal issuances"
  ON internal_issuances FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete internal issuances"
  ON internal_issuances FOR DELETE TO authenticated USING (true);
