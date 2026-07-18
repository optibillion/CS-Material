import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../hooks/useRealtime'
import { useAuthStore } from '../../store/authStore'
import { ArrowLeft, Building2, MapPin, Phone, Pencil, BookOpen, Package, FileDown, X, Download, Loader2, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { logAction } from '../../lib/audit'
import { generateAllotmentSlipBlob, downloadAllotmentSlip, saveSlipFile } from '../../lib/receipt'

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function AllotmentSlipModal({ slipData, onClose }) {
  const [pdfBlob, setPdfBlob] = useState(null)
  const [sharing, setSharing] = useState(false)
  const sharingRef = useRef(false)

  useEffect(() => {
    if (!slipData) return
    setPdfBlob(null)
    generateAllotmentSlipBlob(slipData)
      .then(blob => setPdfBlob(blob))
      .catch(() => {})
  }, [slipData])

  if (!slipData) return null

  const totalQty = slipData.books.reduce((s, b) => s + (b.qty || 1), 0)
  const discPct = slipData.discount_pct || 0
  const hasPricing = slipData.books.some(b => (b.unit_mrp || 0) > 0)
  const totalValue = hasPricing ? slipData.books.reduce((s, b) => s + (+(b.unit_mrp || 0) * (1 - discPct / 100)).toFixed(2) * (b.qty || 1), 0) : 0

  async function handleShare() {
    if (sharingRef.current) return
    sharingRef.current = true
    setSharing(true)
    try {
      const blob = pdfBlob || await generateAllotmentSlipBlob(slipData)
      await downloadAllotmentSlip(blob, slipData.distributor_name)
    } catch {
      toast.error('Could not generate slip')
    } finally {
      sharingRef.current = false
      setSharing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-white font-semibold text-sm">{slipData.distributor_name}</p>
            <p className="text-[#6b7280] text-xs mt-0.5">
              {slipData.books.length} title{slipData.books.length !== 1 ? 's' : ''} · {totalQty} copies
            </p>
            {hasPricing && (
              <p className="text-[#f0a500] text-xs mt-0.5 font-semibold">
                ₹{Math.round(totalValue)} total{discPct > 0 ? ` · ${discPct}% off` : ''}
              </p>
            )}
            <p className="text-[#6b7280] text-xs mt-0.5">
              {format(new Date(slipData.allotted_at), 'dd MMM yyyy, hh:mm a')}
            </p>
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white p-1.5 rounded-lg hover:bg-[#2a2a45] transition-all flex-shrink-0 ml-3">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => pdfBlob && saveSlipFile(pdfBlob, slipData.distributor_name)}
            disabled={!pdfBlob}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-[#2a2a45] hover:bg-[#3a3a55] text-white transition-all disabled:opacity-50">
            <Download size={20} />
            <span className="text-sm font-medium">{pdfBlob ? 'Download' : 'Preparing…'}</span>
          </button>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-[#25D366] hover:bg-[#1fb857] disabled:opacity-70 text-white transition-all">
            {sharing ? <Loader2 size={20} className="animate-spin" /> : <WhatsAppIcon />}
            <span className="text-sm font-semibold">
              {sharing ? 'Preparing...' : 'WhatsApp'}
            </span>
          </button>
        </div>

        {!pdfBlob && !sharing && (
          <p className="text-[#4b5563] text-[10px] text-center mt-2">Preparing PDF in background…</p>
        )}
      </div>
    </div>
  )
}

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
  const [slipModal, setSlipModal] = useState(null)
  const [reverseModal, setReverseModal] = useState(null)
  const [reverseRestoreStock, setReverseRestoreStock] = useState(true)
  const [reversing, setReversing] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  // Issue panel state
  const [examFilter, setExamFilter] = useState('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [qtyMap, setQtyMap] = useState({}) // { bookId: qty string }
  const [deductStock, setDeductStock] = useState(false)
  const [discountPct, setDiscountPct] = useState(0)
  const [issueDate, setIssueDate] = useState(today)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchAll() }, [id])
  useRealtime('stock', fetchAll)

  async function fetchAll() {
    setLoading(true)
    const [{ data: inst }, { data: alts }, { data: bks, error: bksErr }, { data: stk }] = await Promise.all([
      supabase.from('institutions').select('*').eq('id', id).single(),
      supabase.from('allotments').select('*, books(title, exam_level, unit, part, category, medium, mrp), users(name)').eq('institution_id', id).order('allotted_at', { ascending: false }),
      supabase.from('books').select('*').eq('is_active', true).order('exam_level').order('unit').order('part'),
      supabase.from('stock').select('id, book_id, available_qty').order('id', { ascending: false }),
    ])
    if (!inst) { toast.error('Distributor not found'); navigate(`${basePath}/allotments`); return }
    if (bksErr) toast.error('Could not load books — check Supabase RLS for accountant role')
    setInstitution(inst)
    setAllotments(alts || [])
    setBooks(bks || [])
    setStockEntries(stk || [])
    setLoading(false)
  }

  // stock map: bookId → available qty (most recent entry only, matching inventory display)
  const stockMap = {}
  for (const e of stockEntries) {
    if (!(e.book_id in stockMap)) stockMap[e.book_id] = e.available_qty || 0
  }

  // per-book totals
  const bookTotals = {}
  for (const a of allotments) {
    if (!a.book_id) continue
    if (!bookTotals[a.book_id]) bookTotals[a.book_id] = {
      title: a.books?.title,
      exam_level: a.books?.exam_level,
      unit: a.books?.unit,
      part: a.books?.part,
      medium: a.books?.medium,
      qty: 0,
    }
    bookTotals[a.book_id].qty += a.qty || 0
  }
  const totalQty = allotments.reduce((s, a) => s + (a.qty || 0), 0)
  const uniqueTitles = Object.keys(bookTotals).length

  const batches = useMemo(() => {
    const groups = {}
    for (const a of allotments) {
      const batchKey = a.allotted_at.substring(0, 19)
      if (!groups[batchKey]) {
        groups[batchKey] = {
          key: batchKey,
          allotted_at: a.allotted_at,
          allotted_by_name: a.users?.name,
          books: [],
          totalQty: 0,
          discount_pct: a.discount_pct || 0,
          totalValue: 0,
          stock_deducted: a.stock_deducted ?? false,
        }
      }
      const unit_mrp = a.unit_mrp ?? a.books?.mrp ?? null
      const mrp = unit_mrp || 0
      const disc = groups[batchKey].discount_pct
      groups[batchKey].books.push({
        book_id: a.book_id,
        title: a.books?.title,
        exam_level: a.books?.exam_level,
        unit: a.books?.unit,
        part: a.books?.part,
        medium: a.books?.medium,
        qty: a.qty || 1,
        unit_mrp,
      })
      groups[batchKey].totalQty += a.qty || 0
      groups[batchKey].totalValue += +(mrp * (1 - disc / 100)).toFixed(2) * (a.qty || 1)
    }
    return Object.values(groups).sort((a, b) => new Date(b.allotted_at) - new Date(a.allotted_at))
  }, [allotments])

  function openSlipModal(batch) {
    setSlipModal({
      distributor_name: institution.name,
      distributor_location: institution.location,
      distributor_phone: institution.phone,
      books: batch.books,
      allotted_at: batch.allotted_at,
      allotted_by_name: batch.allotted_by_name,
      discount_pct: batch.discount_pct || 0,
    })
  }

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

  async function handleReverseBatch() {
    if (!reverseModal) return
    setReversing(true)
    const batch = reverseModal

    const { error: delError } = await supabase
      .from('allotments')
      .delete()
      .eq('institution_id', id)
      .eq('allotted_at', batch.allotted_at)

    if (delError) { toast.error('Failed to reverse: ' + delError.message); setReversing(false); return }

    if (reverseRestoreStock) {
      for (const b of batch.books) {
        if (!b.book_id) continue
        const entry = stockEntries.find(e => e.book_id === b.book_id)
        if (entry) {
          await supabase.from('stock').update({ available_qty: (entry.available_qty || 0) + b.qty }).eq('id', entry.id)
        }
      }
    }

    const bookList = batch.books.map(b => {
      const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
      return `${lvl || b.title} ×${b.qty}`
    }).join(', ')
    logAction('ALLOTMENT_REVERSED', `${institution.name} — ${batch.books.length} book(s) reversed (${format(new Date(batch.allotted_at), 'dd MMM yy')}): ${bookList}${reverseRestoreStock ? ' [stock restored]' : ''}`)

    toast.success('Allotment reversed')
    setReverseModal(null)
    setReversing(false)
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

  function openIssue() { setQtyMap({}); setDeductStock(true); setDiscountPct(0); setExamFilter('all'); setUnitFilter('all'); setIssueDate(today); setIssueOpen(true) }

  async function handleIssue() {
    if (selectedBooks.length === 0) { toast.error('Select at least one book with quantity'); return }
    setSubmitting(true)
    const issuedAt = new Date(issueDate + 'T12:00:00').toISOString()
    const rows = selectedBooks.map(b => ({
      institution_id: id,
      book_id: b.id,
      qty: parseInt(qtyMap[b.id]),
      allotted_by: profile?.id,
      allotted_at: issuedAt,
      type: 'external',
      institution_name: institution.name,
      discount_pct: discountPct || 0,
      unit_mrp: b.mrp || null,
      stock_deducted: deductStock,
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
    logAction('ALLOTMENT_CREATED', `${institution.name} — ${selectedBooks.length} book(s): ${bookList}${deductStock ? ' [stock deducted]' : ''}${discountPct > 0 ? ` [${discountPct}% discount]` : ''}`)
    toast.success(`${selectedBooks.length} book(s) allotted to ${institution.name}`)
    setSubmitting(false)
    setIssueOpen(false)

    setSlipModal({
      distributor_name: institution.name,
      distributor_location: institution.location,
      distributor_phone: institution.phone,
      books: selectedBooks.map(b => ({
        title: b.title,
        exam_level: b.exam_level,
        unit: b.unit,
        part: b.part,
        medium: b.medium,
        qty: parseInt(qtyMap[b.id]),
        unit_mrp: b.mrp || null,
      })),
      discount_pct: discountPct || 0,
      allotted_at: issuedAt,
      allotted_by_name: profile?.name,
    })

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
            {Object.entries(bookTotals)
              .sort(([, a], [, b]) => {
                const key = x => [x.exam_level, x.unit, x.part, x.title].map(v => v || '').join('\x00')
                return key(a).localeCompare(key(b))
              })
              .map(([bookId, { title, qty, exam_level, unit, part }]) => {
                const lvl = [exam_level, unit, part].filter(Boolean).join(' › ')
                return (
                  <div key={bookId} className="px-5 py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <BookOpen size={13} className="text-[#bd0a0a] flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        {lvl ? (
                          <p className="text-white text-xs font-semibold leading-snug">{lvl}</p>
                        ) : (
                          <p className="text-[#9ca3af] text-sm truncate">{title}</p>
                        )}
                        {lvl && <p className="text-[#6b7280] text-[11px] truncate mt-0.5">{title}</p>}
                      </div>
                    </div>
                    <span className="text-white text-xs font-semibold flex-shrink-0 mt-0.5">{qty} copies</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Batch history */}
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#2a2a45]">
          <h2 className="text-white font-semibold text-sm">Allotment History ({batches.length} batch{batches.length !== 1 ? 'es' : ''})</h2>
        </div>
        {batches.length === 0 ? (
          <p className="text-[#6b7280] text-sm px-5 py-8 text-center">No books allotted yet</p>
        ) : (
          <div className="divide-y divide-[#2a2a45]">
            {batches.map(batch => (
              <div key={batch.key} className="px-5 py-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white text-sm font-semibold">{batch.books.length} title{batch.books.length !== 1 ? 's' : ''} · {batch.totalQty} copies</p>
                      {batch.discount_pct > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium">{batch.discount_pct}% off</span>
                      )}
                    </div>
                    <p className="text-[#6b7280] text-xs mt-0.5">
                      {format(new Date(batch.allotted_at), 'dd MMM yy, hh:mm a')}
                      {batch.allotted_by_name ? ` · by ${batch.allotted_by_name}` : ''}
                    </p>
                    {batch.totalValue > 0 && (
                      <p className="text-[#f0a500] text-xs mt-0.5 font-semibold">₹{Math.round(batch.totalValue)}{batch.discount_pct > 0 ? ` after ${batch.discount_pct}% discount` : ''}</p>
                    )}
                    <p className={`text-xs mt-0.5 font-medium ${batch.stock_deducted ? 'text-orange-400' : 'text-[#4b5563]'}`}>
                      {batch.stock_deducted ? '📦 Stock was deducted' : '📦 Stock was NOT deducted'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <button
                      onClick={() => openSlipModal(batch)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] hover:text-white transition-all">
                      <FileDown size={12} />
                      Slip
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { setReverseRestoreStock(batch.stock_deducted ?? true); setReverseModal(batch) }}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all">
                        <RotateCcw size={12} />
                        Reverse
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {batch.books.map((b, i) => {
                    const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <BookOpen size={11} className="text-[#bd0a0a] flex-shrink-0" />
                        <span className="text-[#9ca3af] text-xs flex-1 truncate">{lvl ? `${lvl} — ${b.title}` : b.title}</span>
                        <span className="text-white text-xs font-semibold flex-shrink-0">×{b.qty}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      <EditModal open={editOpen} onClose={() => setEditOpen(false)} onSave={handleEdit} initial={institution} />

      {/* Allotment slip modal */}
      <AllotmentSlipModal slipData={slipModal} onClose={() => setSlipModal(null)} />

      {/* Reverse allotment modal — admin only */}
      {reverseModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center px-4">
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-sm p-6">
            <h2 className="text-white font-semibold text-base mb-1">Reverse Allotment?</h2>
            <p className="text-[#6b7280] text-xs mb-4">
              {format(new Date(reverseModal.allotted_at), 'dd MMM yy, hh:mm a')}
              {reverseModal.allotted_by_name ? ` · by ${reverseModal.allotted_by_name}` : ''}
              {' · '}{reverseModal.books.length} title{reverseModal.books.length !== 1 ? 's' : ''} · {reverseModal.totalQty} copies
            </p>
            <div className="space-y-1.5 mb-4 bg-[#12121f] rounded-lg p-3">
              {reverseModal.books.map((b, i) => {
                const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
                return (
                  <div key={i} className="flex items-center gap-2">
                    <BookOpen size={11} className="text-[#bd0a0a] flex-shrink-0" />
                    <span className="text-[#9ca3af] text-xs flex-1 truncate">{lvl || b.title}</span>
                    <span className="text-white text-xs font-semibold flex-shrink-0">×{b.qty}</span>
                  </div>
                )
              })}
            </div>
            <div className={`px-3 py-2 rounded-lg mb-3 text-xs font-semibold ${reverseModal.stock_deducted ? 'bg-orange-500/10 text-orange-400' : 'bg-[#12121f] text-[#4b5563]'}`}>
              {reverseModal.stock_deducted ? '📦 Stock WAS deducted when this was issued' : '📦 Stock was NOT deducted when this was issued'}
            </div>
            <label className={`flex items-center gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-all mb-5 ${reverseRestoreStock ? 'bg-orange-500/10 border-orange-500/30' : 'bg-[#12121f] border-[#2a2a45]'}`}>
              <input type="checkbox" checked={reverseRestoreStock} onChange={e => setReverseRestoreStock(e.target.checked)} className="accent-[#f0a500] w-4 h-4 flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">Restore stock</p>
                <p className="text-[#6b7280] text-xs">Add quantities back to inventory</p>
              </div>
            </label>
            <div className="flex gap-3">
              <button onClick={() => setReverseModal(null)} disabled={reversing}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleReverseBatch} disabled={reversing}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all disabled:opacity-50">
                {reversing ? 'Reversing…' : 'Yes, Reverse'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              {/* Date picker */}
              <div>
                <label className="text-[#9ca3af] text-xs mb-1 block">Allotment Date</label>
                <input type="date" value={issueDate} max={today} onChange={e => setIssueDate(e.target.value)}
                  className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
                {issueDate !== today && (
                  <p className="text-yellow-400 text-xs mt-1">Backdated — slip will show {format(new Date(issueDate + 'T12:00:00'), 'dd MMM yyyy')}</p>
                )}
              </div>

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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {b.medium === 'hindi' && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-orange-500/20 text-orange-400 border-orange-500/30 font-semibold flex-shrink-0">Hindi</span>}
                          {b.medium === 'english' && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-500/20 text-blue-400 border-blue-500/30 font-semibold flex-shrink-0">English</span>}
                          {b.medium === 'both' && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-purple-500/20 text-purple-400 border-purple-500/30 font-semibold flex-shrink-0">Both</span>}
                          {lvl ? (
                            <p className="text-white text-sm font-semibold">{lvl}</p>
                          ) : (
                            <p className="text-white text-sm">{b.title}</p>
                          )}
                        </div>
                        {lvl && <p className="text-[#6b7280] text-xs truncate mt-0.5">{b.title}</p>}
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
                  <p className="text-white text-sm font-medium">{deductStock ? 'Deducting from Stock' : 'Not Deducting from Stock'}</p>
                  <p className="text-[#6b7280] text-xs">{deductStock ? 'Uncheck to skip stock deduction' : 'Check to reduce available inventory'}</p>
                </div>
              </label>

              <div className={`flex items-center gap-3 px-3 py-3 rounded-lg border transition-all ${discountPct > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#12121f] border-[#2a2a45]'}`}>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Distributor Discount</p>
                  <p className="text-[#6b7280] text-xs">0% = full MRP · 100% = free</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="number" min="0" max="100" placeholder="0"
                    value={discountPct || ''}
                    onChange={e => {
                      const v = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                      setDiscountPct(v)
                    }}
                    className="w-16 bg-[#12121f] border border-[#2a2a45] rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-white text-sm font-bold">%</span>
                </div>
              </div>

              {selectedBooks.length > 0 && selectedBooks.some(b => b.mrp) && (
                <div className="bg-[#12121f] rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-[#6b7280] text-xs">Value to distributor</span>
                  <span className="text-[#f0a500] text-sm font-bold">
                    ₹{Math.round(selectedBooks.reduce((s, b) => s + (b.mrp || 0) * (1 - discountPct / 100) * parseInt(qtyMap[b.id] || 0), 0))}
                  </span>
                </div>
              )}

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
