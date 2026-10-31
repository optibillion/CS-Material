-- ============================================================
-- Follow-up: the previous diagnostic found TWO book rows sharing
-- the exact title "संकल्पना एवं विचार - Cultural Heritage &
-- Thought". This pulls full details on both so we can tell
-- whether it's a genuine accidental duplicate (same exam_level/
-- unit/part/medium) or something more intentional, and which one
-- is safe to treat as canonical before merging.
-- ============================================================

select id, title, exam_level, unit, part, medium, category, is_active, created_at
from books
where title ilike '%Cultural Heritage%'
order by created_at;
