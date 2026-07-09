import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { ArrowLeft, Building2, MapPin, Phone, Pencil, BookOpen, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { logAction } from '../../lib/audit'

function EditModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({ name: '', location: '', phone: '', notes: '' })
  useEffect(() => {
    if (open && initial) setForm({ name: initial.name || '', location: initial.location || '', phone: initial.phone || '', notes: initial.notes || '' })
  }, [open, initial])
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6">
        <h2 className="text-white font-semibold text-lg mb-5">Edit Distributor</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Distributor Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="City / Area"
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
            </div>
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit"
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
            </div>
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] resize-none placeholder-[#4b5563]" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={() => { if (!form.name.trim()) { toast.error('Distributor name required'); return } onSave(form); onClose() }}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">Save</button>
        </div>
      </div>
    </div>
  )
}

export default function InstitutionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const basePath = location.pathname.startsWith('/admin') ? '/admin'
    : location.pathname.startsWith('/accountant') ? '/accountant'
    : '/issuer'

  const { profile, isAdmin, allotmentAccess } = useAuthStore()

  const [institution, setInstitution] = useState(null)
  const [allotments, setAllotments] = useState([])
  const [books, setBooks] = useState([])
  const [stockEntries, setStockEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [issueOpen, setIssueOpen] = useState(false)

  // Issue panel state
  const [examFilter, setExamFilter] = useState('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [qtyMap, setQtyMap] = useState({}) // { bookId: qty string }
  const [deductStock, setDeductStock] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    setLoading(true)
    const [{ data: inst }, { data: alts }, { data: bks, error: bksErr }, { data: stk }] = await Promise.all([
      supabase.from('institutions').select('*').eq('id', id).single(),
      supabase.from('allotments').select('*, books(title, exam_level, unit, part, category, medium)').eq('institution_id', id).order('allotted_at', { ascending: false }),
      supabase.from('books').select('*').eq('is_active', true).order('exam_level').order('unit').order('part'),
      supabase.from('stock').select('id, book_id, available_qty'),
    ])
    if (!inst) { toast.error('Distributor not found'); navigate(`${basePath}/allotments`); return }
    if (bksErr) toast.error('Could not load books — check Supabase RLS for accountant role')
    setInstitution(inst)
    setAllotments(alts || [])
    setBooks(bks || [])
    setStockEntries(stk || [])
    setLoading(false)
  }

  // stock map: bookId → total available
  const stockMap = {}
  for (const e of stockEntries) stockMap[e.book_id] = (stockMap[e.book_id] || 0) + (e.available_qty || 0)

  // per-book totals
  const bookTotals = {}
  for (const a of allotments) {
    if (!a.book_id) continue
    if (!bookTotals[a.book_id]) bookTotals[a.book_id] = { title: a.books?.title, qty: 0 }
    bookTotals[a.book_id].qty += a.qty || 0
  }
  const totalQty = allotments.reduce((s, a) => s + (a.qty || 0), 0)
  const uniqueTitles = Object.keys(bookTotals).length

  async function handleEdit(form) {
    const { error } = await supabase.from('institutions').update({
      name: form.name.trim(),
      location: form.location.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
    }).eq('id', id)
    if (error) { toast.error('Failed to update'); return }
    toast.success('Distributor updated')
    logAction('DISTRIBUTOR_UPDATED', form.name.trim())
    fetchAll()
  }

  // Issue panel derived data
  const examOptions = [...new Set(books.map(b => b.exam_level).filter(Boolean))].sort()
  const unitOptions = [...new Set(books.filter(b => examFilter === 'all' || b.exam_level === examFilter).map(b => b.unit).filter(Boolean))].sort()
  const visibleBooks = books.filter(b =>
    (examFilter === 'all' || b.exam_level === examFilter) &&
    (unitFilter === 'all' || b.unit === unitFilter)
  )
  const selectedBooks = books.filter(b => parseInt(qtyMap[b.id] || 0) > 0)

  function openIssue() { setQtyMap({}); setDeductStock(false); setExamFilter('all'); setUnitFilter('all'); setIssueOpen(true) }

  async function handleIssue() {
    if (selectedBooks.length === 0) { toast.error('Select at least one book with quantity'); return }
    setSubmitting(true)
    const rows = selectedBooks.map(b => ({
      institution_id: id,
      book_id: b.id,
      qty: parseInt(qtyMap[b.id]),
      allotted_by: profile?.id,
      allotted_at: new Date().toISOString(),
      type: 'external',
      institution_name: institution.name,
    }))
    const { error } = await supabase.from('allotments').insert(rows)
    if (error) { toast.error('Failed to record allotment'); setSubmitting(false); return }

    if (deductStock) {
      for (const b of selectedBooks) {
        let remaining = parseInt(qtyMap[b.id])
        const entries = stockEntries
          .filter(e => e.book_id === b.id && (e.available_qty || 0) > 0)
          .sort((a, z) => z.available_qty - a.available_qty)
        for (const entry of entries) {
          if (remaining <= 0) break
          const deduct = Math.min(remaining, entry.available_qty)
          await supabase.from('stock').update({ available_qty: entry.available_qty - deduct }).eq('id', entry.id)
          remaining -= deduct
        }
        if (remaining > 0) toast.error(`Warning: insufficient stock for some books`)
      }
    }

    const bookList = selectedBooks.map(b => {
      const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
      return `${b.title}${lvl ? ` (${lvl})` : ''} ×${qtyMap[b.id]}`
    }).join(', ')
    logAction('ALLOTMENT_CREATED', `${institution.name} — ${selectedBooks.length} book(s): ${bookList}${deductStock ? ' [stock deducted]' : ''}`)
    toast.success(`${selectedBooks.length} book(s) allotted to ${institution.name}`)
    setSubmitting(false)
    setIssueOpen(false)
    fetchAll()
  }

  if (loading) return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="h-8 bg-[#2a2a45] rounded w-48 animate-pulse" />
      <div className="h-32 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl animate-pulse" />
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Back */}
      <button onClick={() => navigate(`${basePath}/allotments`)}
        className="flex items-center gap-2 text-[#9ca3af] hover:text-white text-sm transition-colors">
        <ArrowLeft size={15} /> Back to Distributors
      </button>

      {/* Header */}
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#bd0a0a]/10 flex items-center justify-center flex-shrink-0">
              <Building2 size={24} className="text-[#bd0a0a]" />
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">{institution.name}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {institution.location && <span className="text-[#6b7280] text-xs flex items-center gap-1"><MapPin size={11} />{institution.location}</span>}
                {institution.phone && <span className="text-[#6b7280] text-xs flex items-center gap-1"><Phone size={11} />{institution.phone}</span>}
              </div>
              {institution.notes && <p className="text-[#6b7280] text-xs mt-1">{institution.notes}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {(isAdmin || allotmentAccess === 'edit') && (
              <button onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] hover:text-white transition-all">
                <Pencil size={12} /> Edit
              </button>
            )}
            {allotmentAccess === 'edit' && (
              <button onClick={openIssue}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold transition-all">
                <Package size={12} /> Issue Books
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="bg-[#12121f] rounded-lg p-3">
            <p className="text-[#6b7280] text-xs">Total Books Sent</p>
            <p className="text-white text-xl font-bold mt-0.5">{totalQty}</p>
          </div>
          <div className="bg-[#12121f] rounded-lg p-3">
            <p className="text-[#6b7280] text-xs">Unique Titles</p>
            <p className="text-white text-xl font-bold mt-0.5">{uniqueTitles}</p>
          </div>
        </div>
      </div>

      {/* Per-book breakdown */}
      {uniqueTitles > 0 && (
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2a2a45]">
            <h2 className="text-white font-semibold text-sm">Books Summary</h2>
          </div>
          <div className="divide-y divide-[#2a2a45]">
            {Object.entries(bookTotals).map(([bookId, { title, qty }]) => (
              <div key={bookId} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <BookOpen size={14} className="text-[#bd0a0a] flex-shrink-0" />
                  <p className="text-[#9ca3af] text-sm truncate">{title}</p>
                </div>
                <span className="text-white text-sm font-semibold flex-shrink-0 ml-3">{qty} copies</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full history */}
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2a45]">
          <h2 className="text-white font-semibold text-sm">Allotment History ({allotments.length})</h2>
        </div>
        {allotments.length === 0 ? (
          <p className="text-[#6b7280] text-sm px-5 py-8 text-center">No books allotted yet</p>
        ) : (
          <div className="divide-y divide-[#2a2a45]">
            {allotments.map(a => {
              const lvl = [a.books?.exam_level, a.books?.unit, a.books?.part].filter(Boolean).join(' › ')
              return (
                <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                  <BookOpen size={14} className="text-[#bd0a0a] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{a.books?.title}</p>
                    {lvl && <p className="text-[#9ca3af] text-xs">{lvl}</p>}
                    <p className="text-[#6b7280] text-xs mt-0.5">{format(new Date(a.allotted_at), 'dd MMM yy, hh:mm a')}</p>
                  </div>
                  <span className="text-white text-sm font-bold flex-shrink-0">×{a.qty}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit modal */}
      <EditModal open={editOpen} onClose={() => setEditOpen(false)} onSave={handleEdit} initial={institution} />

      {/* Issue panel modal */}
      {issueOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-[#2a2a45] flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-white font-semibold">Issue Books</h2>
                <p className="text-[#6b7280] text-xs mt-0.5">to {institution.name}</p>
              </div>
              <button onClick={() => setIssueOpen(false)} className="text-[#6b7280] hover:text-white text-sm px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] transition-all">Cancel</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Exam filter */}
              {examOptions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {['all', ...examOptions].map(e => (
                      <button key={e} type="button" onClick={() => { setExamFilter(e); setUnitFilter('all') }}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all capitalize ${examFilter === e ? 'bg-[#bd0a0a] border-[#bd0a0a] text-white' : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] hover:text-white'}`}>
                        {e === 'all' ? 'All Exams' : e}
                      </button>
                    ))}
                  </div>
                  {unitOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {['all', ...unitOptions].map(u => (
                        <button key={u} type="button" onClick={() => setUnitFilter(u)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all capitalize ${unitFilter === u ? 'bg-[#f0a500] border-[#f0a500] text-black' : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] hover:text-white'}`}>
                          {u === 'all' ? 'All Units' : u}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Book list with qty inputs */}
              <div className="space-y-2">
                {visibleBooks.map(b => {
                  const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
                  const avail = stockMap[b.id] ?? null
                  const qty = parseInt(qtyMap[b.id] || 0)
                  const overStock = deductStock && avail !== null && qty > avail
                  return (
                    <div key={b.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${qty > 0 ? 'bg-[#bd0a0a]/10 border-[#bd0a0a]/40' : 'bg-[#12121f] border-[#2a2a45]'}`}>
                      <div className="flex-1 min-w-0">
                        {lvl ? (
                          <>
                            <p className="text-white text-sm font-semibold">{lvl}</p>
                            <p className="text-[#6b7280] text-xs truncate">{b.title}</p>
                          </>
                        ) : (
                          <p className="text-white text-sm">{b.title}</p>
                        )}
                        {avail !== null && (
                          <p className={`text-xs mt-0.5 ${avail === 0 ? 'text-red-400' : avail <= 10 ? 'text-orange-400' : 'text-emerald-400'}`}>
                            {avail === 0 ? 'Out of stock' : `${avail} in stock`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {overStock && <span className="text-red-400 text-xs">Exceeds stock</span>}
                        <input
                          type="number" min="0" placeholder="0"
                          value={qtyMap[b.id] || ''}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, '')
                            setQtyMap(m => ({ ...m, [b.id]: v }))
                          }}
                          className="w-16 bg-[#12121f] border border-[#2a2a45] rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-[#bd0a0a]"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Bottom summary + submit */}
            <div className="border-t border-[#2a2a45] px-5 py-4 space-y-3 flex-shrink-0">
              {selectedBooks.length > 0 && (
                <div className="bg-[#12121f] rounded-lg p-3 space-y-1.5">
                  <p className="text-[#6b7280] text-xs font-medium uppercase tracking-wide">Selected ({selectedBooks.length} books)</p>
                  {selectedBooks.map(b => {
                    const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
                    return (
                      <div key={b.id} className="flex items-center justify-between gap-2">
                        <p className="text-[#9ca3af] text-xs truncate">{lvl || b.title}</p>
                        <span className="text-white text-xs font-semibold flex-shrink-0">×{qtyMap[b.id]}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              <label className={`flex items-center gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-all ${deductStock ? 'bg-orange-500/10 border-orange-500/30' : 'bg-[#12121f] border-[#2a2a45] hover:border-[#3a3a55]'}`}>
                <input type="checkbox" checked={deductStock} onChange={e => setDeductStock(e.target.checked)} className="accent-[#f0a500] w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">Deduct from Stock</p>
                  <p className="text-[#6b7280] text-xs">Will reduce available inventory for selected books</p>
                </div>
              </label>

              <button onClick={handleIssue} disabled={submitting || selectedBooks.length === 0}
                className="w-full py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all disabled:opacity-50">
                {submitting ? 'Recording…' : `Allot ${selectedBooks.length > 0 ? selectedBooks.length + ' Book(s)' : 'Books'} to ${institution.name}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
