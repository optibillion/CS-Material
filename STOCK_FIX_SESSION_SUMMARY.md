# Stock Correctness Project — Session Summary / Handoff

Paste this whole file into a new chat to continue where this session left off.

## Context
Champion Square Material System (React + Vite + Supabase) — book distribution app with Sales, Student Issuance, Distributor Allotments, and Internal (staff/campus) issuance, all drawing down a shared `stock.available_qty` per book.

## What was wrong (found via a full code audit)
1. Student issuance (`adjustStock` in `src/lib/supabase.js`) only ever deducted from a book's single most-recent stock row, ignoring others if a book had more than one.
2. Distributor allotments (`InstitutionDetail.jsx handleIssue`) recorded the **full requested quantity** in the ledger even when there wasn't enough physical stock — the deduction loop silently capped at what was available, but the ledger kept the inflated number forever. This is the root cause of the two real mismatches below.
3. Reversing a "previous issuance" (a historical note that never deducted stock) was incorrectly crediting `+1` back anyway.
4. A separate reversal action on `Issuances.jsx` didn't touch stock at all.
5. `InstitutionDetail.jsx`'s Take Back, Edit Qty, and first-time stock creation all floored results at 0, hiding real deficits, and some silently did nothing if a book had no stock row yet.
6. Both Sales pages' return handler, and Internal issuance's "undo", credited stock based on stale local state instead of what the DB actually just changed — a double-credit race risk. Issuer Sales didn't restore stock on return **at all**.
7. No double-submit guard on "Edit Qty" — a fast double-press could apply the same stock delta twice.
8. All plain client-side read-then-write stock updates had a theoretical lost-update race under concurrent use.

## What was fixed (all pushed to `main`, commits in order)
- `0b997f9` — effective-dated book pricing (unrelated feature, done earlier same day)
- `d308ebf` — multi-row stock deduction fix for issuance
- `d588390` — allotment ledger capped at available stock (later superseded by the negative-stock design)
- `d6324dd` — big Hindi/English medium badges everywhere (prevents the kind of mis-click that caused the original 242-unit bug)
- `904f218` — **core redesign**: every deduction/credit now goes through one function, `adjustStock()`, routed through a Postgres RPC (`adjust_stock` / `add_stock_batch`, see `add_atomic_stock_functions.sql`) so changes are atomic and `available_qty` is **allowed to go negative** instead of being capped/floored — a shortfall shows as `-N` instead of being hidden, and the next stock-in pays it down automatically.
- `48a5560` — closed remaining gaps: previous-issuance phantom credit, Issuances.jsx not crediting at all, stale-state double-credit races in both Sales return handlers and Internal undo, missing double-submit guard on Edit Qty.

## SQL migrations — must be run in Supabase SQL Editor if not already done
1. `add_book_price_history.sql` — effective-dated pricing (unrelated feature)
2. `add_atomic_stock_functions.sql` — **critical**, the app calls `adjust_stock()`/`add_stock_batch()` RPCs for every stock change; nothing works without this

## Diagnostic SQL files in the repo (for future investigation, not migrations)
- `full_stock_reconciliation.sql` — compares every book's actual stock against what the full ledger implies it should be. Run this any time to re-check.
- `full_book_ledger.sql` — full in/out timeline with running balance for a specific book (edit the UUIDs at the top)
- `check_allotment_coverage.sql` — checks if there was enough stock for a specific historical allotment line
- `diagnose_book_stock.sql`, `diagnose_duplicate_books.sql`, `diagnose_audit_history.sql` — earlier one-off diagnostics from tracing the Cultural Heritage & Thought bug
- `check_student_delete_fk.sql` — **still unresolved, intentionally left alone per user instruction**. Checks whether `issuances.student_id` cascades when a student is deleted. `Students.jsx`'s delete button has no stock-restoration logic; whether that's a problem depends on this FK behavior. Not fixed — explicitly told to leave it.

## Current audit result (see `stock_mismatch_report.md` for full detail)
67 books checked, **58 reconcile exactly**. 17 don't, split into:
- **2 real bugs, need physical recount + Correct button**: संकल्पना एवं विचार - Cultural Heritage & Thought (English, +242), Major Commissions... (English Mains, +13)
- **6 honest hidden shortages, no action needed**: these show `0 available` correctly — self-resolve on next normal Add Stock
- **9 off by exactly 1 unit, ignore**: almost certainly legitimate past manual Correct actions (no ledger trace by design)

## Outstanding for the user
1. Physically recount the 2 Priority-1 books and use Correct in Inventory.
2. Confirm `add_atomic_stock_functions.sql` has actually been run.
3. `check_student_delete_fk.sql` is unresolved and intentionally not acted on — revisit only if asked.
