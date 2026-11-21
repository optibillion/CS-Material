-- ============================================================
-- Change Book ruled out (0 rows for this title). Next candidate:
-- InstitutionDetail.jsx's "Edit Quantity" on an existing allotment
-- batch line (handleEditQty). It also splits into two non-atomic
-- steps: update allotments.qty first, then a separate adjustStock()
-- call for the delta.
--
-- If someone increased a previously-recorded allotment qty for this
-- book (e.g. "actually gave more copies than we logged, correcting
-- it upward"), the ledger update succeeds — allotted_net goes up,
-- expected_available goes DOWN by the delta — but if the matching
-- adjustStock(book, -delta) deduction silently failed, actual stock
-- never drops to match. That produces exactly a positive mismatch
-- of that size: expected drops, actual doesn't move, gap opens up
-- in the "actual is higher" direction.
--
-- logAction embeds the exact before/after qty and the stock delta
-- it believed it applied right in the message — so this one query
-- should show, in plain text, whether a matching edit happened.
-- ============================================================

select action, entity_type as details, timestamp
from audit_logs
where action = 'ALLOTMENT_QTY_EDITED'
  and (entity_type ilike '%भारत का भूगोल%' or entity_type ilike '%Geography%of India%')
order by timestamp;
