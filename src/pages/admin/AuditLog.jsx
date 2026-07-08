import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { Search } from 'lucide-react'
import toast from 'react-hot-toast'

const ACTION_COLORS = {
  // Students
  STUDENT_CREATED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  STUDENT_UPDATED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PHONE_UPDATED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  STUDENT_ACTIVATED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  STUDENT_DEACTIVATED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  BULK_STUDENT_UPLOAD: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  // Books & Issuances
  BOOKS_ISSUED: 'bg-[#bd0a0a]/20 text-red-400 border-[#bd0a0a]/30',
  PREVIOUS_ISSUANCE: 'bg-[#f0a500]/20 text-[#f0a500] border-[#f0a500]/30',
  ISSUANCE_REVERSED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  // Bag
  BAG_ISSUED: 'bg-[#f0a500]/20 text-[#f0a500] border-[#f0a500]/30',
  BAG_REVOKED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  // Books catalog
  BOOK_CREATED: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  BOOK_UPDATED: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  BOOK_ACTIVATED: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  BOOK_DEACTIVATED: 'bg-[#2a2a45] text-[#6b7280] border-[#2a2a45]',
  // Bundles
  BUNDLE_CREATED: 'bg-[#f0a500]/20 text-[#f0a500] border-[#f0a500]/30',
  BUNDLE_UPDATED: 'bg-[#f0a500]/20 text-[#f0a500] border-[#f0a500]/30',
  BUNDLE_ACTIVATED: 'bg-[#f0a500]/20 text-[#f0a500] border-[#f0a500]/30',
  BUNDLE_DEACTIVATED: 'bg-[#2a2a45] text-[#6b7280] border-[#2a2a45]',
  // Batches
  BATCH_CREATED: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  BATCH_UPDATED: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  BATCH_ACTIVATED: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  BATCH_DEACTIVATED: 'bg-[#2a2a45] text-[#6b7280] border-[#2a2a45]',
  // Courses
  COURSE_CREATED: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  COURSE_UPDATED: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  COURSE_ACTIVATED: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  COURSE_DEACTIVATED: 'bg-[#2a2a45] text-[#6b7280] border-[#2a2a45]',
  // Sales
  SALE_RECORDED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  SALE_RETURNED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  // Allotments
  ALLOTMENT_CREATED: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  ALLOTMENT_UPDATED: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  ALLOTMENT_REVERSED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  // Stock
  STOCK_CREATED: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  STOCK_UPDATED: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  // Users
  USER_CREATED: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  USER_ACTIVATED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  USER_DEACTIVATED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  USER_PASSWORD_RESET: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
}

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Backfill state
  const [backfillLoading, setBackfillLoading] = useState(false)
  const [backfillPreview, setBackfillPreview] = useState(null) // null | { updates[], sample[] }
  const [backfillRunning, setBackfillRunning] = useState(false)
  const [backfillProgress, setBackfillProgress] = useState(0)
  const [backfillDone, setBackfillDone] = useState(false)

  useEffect(() => { fetchLogs() }, [])

  async function fetchLogs() {
    setLoading(true)
    const { data } = await supabase.from('audit_logs')
      .select('*, users(name)')
      .order('timestamp', { ascending: false })
      .limit(500)
    setLogs(data || []); setLoading(false)
  }

  // ── Backfill: dry-run, zero writes ──────────────────────────────────────
  async function runBackfillDryRun() {
    setBackfillLoading(true)
    try {
      // 1. Fetch ALL issuance log rows (no limit — we need every old entry)
      const { data: logRows, error: logErr } = await supabase
        .from('audit_logs')
        .select('id, entity_type')
        .in('action', ['BOOKS_ISSUED', 'PREVIOUS_ISSUANCE'])
      if (logErr) throw logErr

      // 2. Fetch all books
      const { data: books, error: bookErr } = await supabase
        .from('books')
        .select('title, exam_level, unit, part')
      if (bookErr) throw bookErr

      // 3. Build title → book map
      const bookMap = {}
      for (const b of books || []) bookMap[b.title] = b

      // 4. Compute what would change — READ ONLY, no writes
      const updates = []
      const sample = []

      for (const row of logRows || []) {
        const txt = row.entity_type || ''

        // Isolate the book list: everything after "N book(s): "
        const match = txt.match(/(\d+ book\(s\): )(.+)$/)
        if (!match) continue

        const bookList = match[2]

        // SAFETY: skip rows already enriched (idempotent)
        if (bookList.includes(' › ')) continue

        // Enrich each comma-separated title
        const enrichedTitles = bookList.split(', ').map(t => {
          const b = bookMap[t]
          if (!b) return t // title not in DB — leave exactly as-is
          const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
          return lvl ? `${t} (${lvl})` : t
        })

        const newBookList = enrichedTitles.join(', ')
        if (newBookList === bookList) continue // nothing enrichable — skip

        const prefix = txt.slice(0, txt.indexOf(match[1])) + match[1]
        const updatedText = prefix + newBookList

        updates.push({ id: row.id, entity_type: updatedText })
        if (sample.length < 3) sample.push({ before: txt, after: updatedText })
      }

      setBackfillPreview({ updates, sample })
    } catch (e) {
      toast.error('Failed to analyse logs: ' + e.message)
    } finally {
      setBackfillLoading(false)
    }
  }

  // ── Backfill: apply — one row at a time by primary key ──────────────────
  async function applyBackfill() {
    if (!backfillPreview) return
    setBackfillRunning(true)
    setBackfillProgress(0)
    const { updates } = backfillPreview
    let failed = 0

    for (let i = 0; i < updates.length; i++) {
      const { id, entity_type } = updates[i]
      // Only touches entity_type of this exact row — no other column, no deletes
      const { error } = await supabase
        .from('audit_logs')
        .update({ entity_type })
        .eq('id', id)
      if (error) { failed++; console.warn('Backfill row failed:', id, error.message) }
      setBackfillProgress(i + 1)
    }

    setBackfillRunning(false)
    setBackfillPreview(null)
    setBackfillDone(true)
    if (failed === 0) {
      toast.success(`Backfill complete — ${updates.length} entries updated`)
    } else {
      toast.error(`Done with ${failed} errors — ${updates.length - failed} updated`)
    }
    fetchLogs()
  }

  const filtered = logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
    l.users?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Audit Log</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            Every action by every user — append-only, cannot be edited or deleted.
          </p>
        </div>
        {!backfillDone && (
          <button
            onClick={runBackfillDryRun}
            disabled={backfillLoading}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] hover:text-white border border-[#3a3a55] transition-all disabled:opacity-50"
          >
            {backfillLoading ? 'Analysing…' : 'Backfill Book Details'}
          </button>
        )}
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by action, details or user..."
          className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
      </div>

      {/* Desktop table */}
      <div className="mob-table bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-[#2a2a45]">
              {['USER', 'ACTION', 'DETAILS', 'TIMESTAMP'].map(h => (
                <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a45]">
            {loading ? [...Array(5)].map((_, i) => (
              <tr key={i}>{[...Array(4)].map((_, j) => (
                <td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse" /></td>
              ))}</tr>
            )) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-[#6b7280] py-10 text-sm">No audit logs found</td></tr>
            ) : filtered.map(l => (
              <tr key={l.id} className="hover:bg-[#12121f] transition-colors">
                <td className="px-5 py-3 text-white text-sm">{l.users?.name || 'System'}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${ACTION_COLORS[l.action] || 'bg-[#2a2a45] text-[#9ca3af] border-[#2a2a45]'}`}>
                    {l.action}
                  </span>
                </td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm max-w-xs">{l.entity_type || '—'}</td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm whitespace-nowrap">{format(new Date(l.timestamp), 'dd MMM yy, hh:mm a')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mob-cards space-y-3">
        {loading ? [...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 animate-pulse h-20" />
        )) : filtered.length === 0 ? (
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-6 text-center text-[#6b7280] text-sm">No audit logs found</div>
        ) : filtered.map(l => (
          <div key={l.id} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
            <div className="flex items-start justify-between mb-1.5">
              <p className="text-white text-sm font-medium">{l.users?.name || 'System'}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ACTION_COLORS[l.action] || 'bg-[#2a2a45] text-[#9ca3af] border-[#2a2a45]'}`}>
                {l.action}
              </span>
            </div>
            {l.entity_type && <p className="text-[#9ca3af] text-xs mb-1">{l.entity_type}</p>}
            <p className="text-[#6b7280] text-xs">{format(new Date(l.timestamp), 'dd MMM yy, hh:mm a')}</p>
          </div>
        ))}
      </div>

      {/* ── Backfill confirmation modal ── */}
      {backfillPreview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-2xl w-full max-w-lg p-6 space-y-5">
            <div>
              <h2 className="text-white font-semibold text-base">Backfill Book Details</h2>
              <p className="text-[#9ca3af] text-sm mt-1">
                {backfillPreview.updates.length === 0
                  ? 'All entries are already up to date. Nothing to change.'
                  : <><span className="text-white font-medium">{backfillPreview.updates.length}</span> old log entries will be enriched with exam level · unit · part. No data will be deleted or overwritten — only the book name text gets extended.</>
                }
              </p>
            </div>

            {backfillPreview.sample.length > 0 && (
              <div className="space-y-3">
                <p className="text-[#6b7280] text-xs font-medium uppercase tracking-wide">Preview (first {backfillPreview.sample.length})</p>
                {backfillPreview.sample.map((s, i) => (
                  <div key={i} className="bg-[#12121f] rounded-lg p-3 space-y-1.5 text-xs">
                    <p className="text-[#6b7280]"><span className="text-[#9ca3af] font-medium">Before: </span>{s.before}</p>
                    <p className="text-[#6b7280]"><span className="text-emerald-400 font-medium">After: &nbsp;</span>{s.after}</p>
                  </div>
                ))}
              </div>
            )}

            {backfillRunning && (
              <div className="space-y-1.5">
                <div className="w-full bg-[#2a2a45] rounded-full h-1.5">
                  <div
                    className="bg-[#bd0a0a] h-1.5 rounded-full transition-all"
                    style={{ width: `${(backfillProgress / backfillPreview.updates.length) * 100}%` }}
                  />
                </div>
                <p className="text-[#6b7280] text-xs text-center">Updating {backfillProgress} / {backfillPreview.updates.length}…</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setBackfillPreview(null)}
                disabled={backfillRunning}
                className="flex-1 py-2 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white text-sm font-medium transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              {backfillPreview.updates.length > 0 && (
                <button
                  onClick={applyBackfill}
                  disabled={backfillRunning}
                  className="flex-1 py-2 rounded-lg bg-[#bd0a0a] hover:bg-red-700 text-white text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {backfillRunning ? 'Running…' : `Confirm & Update ${backfillPreview.updates.length} Entries`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
