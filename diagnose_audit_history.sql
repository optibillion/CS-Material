-- ============================================================
-- Was the 242-unit gap on the English-medium copy (book id
-- dcf38441-a179-4d94-adaa-3f8f8d3b94b3) caused by a manual
-- "Correct" stock-count override rather than an active bug?
-- audit_logs.entity_type actually holds the free-text details
-- string passed to logAction(), not a real entity type — see
-- src/lib/audit.js.
-- ============================================================

select action, entity_type as details, timestamp
from audit_logs
where entity_type ilike '%Cultural Heritage%'
order by timestamp;
