-- ============================================================
-- Students.jsx's "Delete Student" button does a plain DELETE on
-- the students row with no stock-restoration logic at all. If
-- issuances.student_id has ON DELETE CASCADE, deleting a student
-- silently wipes their issuance history too — the books stay
-- deducted from available_qty forever with no ledger trace of why.
-- This shows exactly what happens on delete.
-- ============================================================

select
  conname as constraint_name,
  confrelid::regclass as references_table,
  case confdeltype
    when 'c' then 'CASCADE — deleting a student deletes their issuances too'
    when 'r' then 'RESTRICT — deleting a student blocked while issuances exist'
    when 'n' then 'SET NULL — issuances survive, student_id becomes null'
    when 'a' then 'NO ACTION — same as RESTRICT unless deferred'
    else confdeltype::text
  end as on_delete_behavior
from pg_constraint
where conrelid = 'issuances'::regclass
  and contype = 'f'
  and confrelid = 'students'::regclass;
