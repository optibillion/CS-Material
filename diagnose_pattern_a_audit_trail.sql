-- ============================================================
-- Pattern A, step 4: RLS is ruled out (policies on `stock` are
-- unconditionally true for authenticated SELECT/UPDATE, and the
-- broken books' location matches healthy books exactly). Code
-- audit of both Issue.jsx files (admin + issuer) found no
-- insert/deduct divergence — the same book-id array feeds both the
-- `issuances` insert and the adjustStock() loop.
--
-- One thing adjustStock() failures would NOT leave a trace of: the
-- error only shows as an ephemeral browser toast (src/lib/supabase.js)
-- — it's never written to audit_logs or any table. So audit_logs
-- can't directly prove a failure happened. What it CAN show:
--   - whether anyone ever ran "Add Stock" or "Correct" for these
--     titles through the app (if the audit trail is silent here
--     too, it means no one has touched these titles' stock through
--     any app-logged action, in or out of the ordinary flow)
--   - the real cadence of BOOKS_ISSUED / SALE_RECORDED events —
--     one-by-one over time vs. suspicious bursts
-- ============================================================

select action, entity_type as details, timestamp
from audit_logs
where entity_type ilike '%सामान्य हिन्दी एवं व्याकरण%'
   or entity_type ilike '%हिन्दी निबंध एवं प्रारूप लेखन%'
   or entity_type ilike '%समाजशास्त्र%'
   or entity_type ilike '%मध्यप्रदेश का भूगोल%Geography of MP%'
   or entity_type ilike '%मध्यप्रदेश की जनजातियाँ%Tribes of Madhya%'
   or entity_type ilike '%महासंकलन%'
   or entity_type ilike '%Tribes Chart%'
order by timestamp desc
limit 100;

-- Action-type breakdown (same filter) — in particular: does
-- STOCK_ADDED or STOCK_CORRECTED ever appear for any of these 8
-- titles? If this comes back empty for those two actions, no one
-- has ever touched their stock count through the app at all.
select action, count(*) as events, min(timestamp) as first_seen, max(timestamp) as last_seen
from audit_logs
where entity_type ilike '%सामान्य हिन्दी एवं व्याकरण%'
   or entity_type ilike '%हिन्दी निबंध एवं प्रारूप लेखन%'
   or entity_type ilike '%समाजशास्त्र%'
   or entity_type ilike '%मध्यप्रदेश का भूगोल%Geography of MP%'
   or entity_type ilike '%मध्यप्रदेश की जनजातियाँ%Tribes of Madhya%'
   or entity_type ilike '%महासंकलन%'
   or entity_type ilike '%Tribes Chart%'
group by action
order by events desc;
