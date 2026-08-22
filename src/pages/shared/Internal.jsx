import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { logAction } from '../../lib/audit'
import { Boxes, UserCheck, Building2, Plus, X, Check, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const TYPE_META = {
  staff: { label: 'Staff', icon: UserCheck, color: '#f0a500' },
  campus: { label: 'Campus', icon: Building2, color: '#bd0a0a' },
}

function IssueInternalModal({ open, onClose, recipientType, books, stockMap, pastNames, onSubmit }) {
  const [step, setStep] = useState('name')
  const [name, setName] = useState('')
  const [selectedBooks, setSelectedBooks] = useState([])
  const [examFilter, setExamFilter] = useState('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [bookSearch, setBookSearch] = useState('')
  const [deduct, setDeduct] = useState(null)
  const [saving, setSaving] = useState(false)

  const meta = TYPE_META[recipientType]

  useEffect(() => {
    if (open) {
      setStep('name')
      setName('')
      setSelectedBooks([])
      setExamFilter('all')
      setUnitFilter('all')
      setBookSearch('')
      setDeduct(null)
    }
  }, [open])

  function toggleBook(bookId) {
    setSelectedBooks(prev => {
      if (prev.find(b => b.id === bookId)) return prev.filter(b => b.id !== bookId)
      return [...prev, { id: bookId, qty: 1 }]
    })
  }

  function updateBook(bookId, value) {
    setSelectedBooks(prev => prev.map(b => b.id === bookId ? { ...b, qty: value } : b))
  }

  function goToBooks() {
    if (!name.trim()) { toast.error('Enter a name'); return }
    setStep('books')
  }

  function goToConfirm() {
    if (selectedBooks.length === 0) { toast.error('Select at least one book'); return }
    for (const b of selectedBooks) {
      if ((parseInt(b.qty) || 0) < 1) { toast.error('Qty must be at least 1 for all books'); return }
    }
    setStep('confirm')
  }

  async function finish(deductChoice) {
    setDeduct(deductChoice)
    setSaving(true)
    await onSubmit(name.trim(), selectedBooks, deductChoice)
    setSaving(false)
    onClose()
  }

  if (!open) return null

  const nameMatches = name.trim().length > 0
    ? pastNames.filter(n => n.toLowerCase().includes(name.trim().toLowerCase()) && n.toLowerCase() !== name.trim().toLowerCase())
    : pastNames.slice(0, 8)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">

        {step === 'name' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <meta.icon size={18} style={{ color: meta.color }} />
                <h2 className="text-white font-semibold text-lg">Issue to {meta.label}</h2>
              </div>
              <button onClick={onClose} className="text-[#6b7280] hover:text-white"><X size={18} /></button>
            </div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">
              {recipientType === 'staff' ? 'Name of staff member' : 'Campus / location name'}
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && goToBooks()}
              placeholder={recipientType === 'staff' ? 'Enter full name...' : 'Enter campus name...'}
              autoFocus
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none placeholder-[#4b5563] mb-2"
              style={{ borderColor: name ? meta.color : undefined }}
            />
            {nameMatches.length > 0 && (
              <div className="bg-[#12121f] border border-[#2a2a45] rounded-lg overflow-hidden mb-4 max-h-40 overflow-y-auto">
                {nameMatches.map(n => (
                  <button key={n} onClick={() => setName(n)}
                    className="w-full flex items-center px-4 py-2 hover:bg-[#2a2a45] transition-colors border-b border-[#2a2a45] last:border-0 text-left">
                    <span className="text-white text-sm">{n}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3 mt-3">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] text-sm hover:bg-[#2a2a45] transition-all">
                Cancel
              </button>
              <button onClick={goToBooks} disabled={!name.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg disabled:opacity-40 text-black font-semibold text-sm transition-all"
                style={{ backgroundColor: meta.color }}>
                Next — Select Books
              </button>
            </div>
          </>
        )}

        {step === 'books' && (() => {
          const examOptions = [...new Set(books.map(b => b.exam_level).filter(Boolean))].sort()
          const unitOptions = [...new Set(books.filter(b => examFilter === 'all' || b.exam_level === examFilter).map(b => b.unit).filter(Boolean))].sort()
          const visibleBooks = books.filter(b =>
            (examFilter === 'all' || b.exam_level === examFilter) &&
            (unitFilter === 'all' || b.unit === unitFilter) &&
            (!bookSearch.trim() || b.title?.toLowerCase().includes(bookSearch.toLowerCase()) ||
              b.exam_level?.toLowerCase().includes(bookSearch.toLowerCase()) ||
              b.unit?.toLowerCase().includes(bookSearch.toLowerCase()))
          )
          return (
            <>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setStep('name')} className="text-[#6b7280] hover:text-white p-0.5"><X size={16} /></button>
                <h2 className="text-white font-semibold text-lg">Select Books</h2>
                <span className="text-[#6b7280] text-xs ml-auto">{selectedBooks.length} selected</span>
              </div>

              {examOptions.length > 0 && (
                <div className="space-y-2 mb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {['all', ...examOptions].map(e => (
                      <button key={e} type="button" onClick={() => { setExamFilter(e); setUnitFilter('all') }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border touch-manipulation capitalize ${examFilter === e ? 'bg-[#bd0a0a] border-[#bd0a0a] text-white' : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] active:opacity-70'}`}>
                        {e === 'all' ? 'All Exams' : e}
                      </button>
                    ))}
                  </div>
                  {unitOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {['all', ...unitOptions].map(u => (
                        <button key={u} type="button" onClick={() => setUnitFilter(u)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border touch-manipulation capitalize ${unitFilter === u ? 'bg-[#f0a500] border-[#f0a500] text-black' : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] active:opacity-70'}`}>
                          {u === 'all' ? 'All Units' : u}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="relative mb-3">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
                <input value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder="Search books..."
                  className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 mb-4">
                {visibleBooks.length === 0 ? (
                  <p className="text-[#6b7280] text-sm text-center py-4">No books match this filter</p>
                ) : visibleBooks.map(b => {
                  const avail = stockMap[b.id] || 0
                  const sel = selectedBooks.find(s => s.id === b.id)
                  return (
                    <div key={b.id}>
                      <label className={`flex items-center gap-3 px-3 py-3 rounded-lg border transition-all cursor-pointer ${sel ? 'bg-[#bd0a0a]/20 border-[#bd0a0a]/40' : 'bg-[#12121f] border-[#2a2a45] hover:border-[#3a3a55]'}`}>
                        <input type="checkbox" checked={!!sel} onChange={() => toggleBook(b.id)} className="accent-[#bd0a0a] w-4 h-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          {b.exam_level && <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-[#bd0a0a]/20 text-[#bd0a0a] font-bold uppercase tracking-wide mb-0.5">{b.exam_level}</span>}
                          <p className="text-white text-sm font-bold leading-snug">{[b.unit, b.part].filter(Boolean).join(' · ') || b.title}</p>
                          {(b.unit || b.part) && <p className="text-[#4b5563] text-[11px] truncate">{b.title}</p>}
                        </div>
                        <span className={`text-xs flex-shrink-0 font-medium ${avail > 5 ? 'text-emerald-400' : avail > 0 ? 'text-yellow-400' : 'text-[#6b7280]'}`}>
                          {avail} avail
                        </span>
                      </label>
                      {sel && (
                        <div className="mt-1.5 px-1 pb-1 w-32">
                          <label className="text-[#9ca3af] text-xs mb-1 block">Qty</label>
                          <input type="number" min="1" value={sel.qty}
                            onChange={e => updateBook(b.id, e.target.value)}
                            className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('name')}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] text-sm hover:bg-[#2a2a45] transition-all">
                  Back
                </button>
                <button onClick={goToConfirm} disabled={selectedBooks.length === 0}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] disabled:opacity-40 text-white font-semibold text-sm transition-all">
                  Review & Confirm
                </button>
              </div>
            </>
          )
        })()}

        {step === 'confirm' && (
          <>
            <h2 className="text-white font-semibold text-lg mb-1">Confirm Issuance</h2>
            <p className="text-[#6b7280] text-sm mb-5">Please verify before recording.</p>
            <div className="bg-[#12121f] border border-[#2a2a45] rounded-lg p-4 mb-4">
              <p className="text-xs text-[#6b7280] uppercase tracking-wide mb-1">{meta.label}</p>
              <p className="text-white font-semibold">{name}</p>
            </div>
            <div className="bg-[#12121f] border border-[#2a2a45] rounded-lg p-4 mb-5">
              <p className="text-xs text-[#6b7280] uppercase tracking-wide mb-2">Books ({selectedBooks.length})</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedBooks.map(b => {
                  const book = books.find(bk => bk.id === b.id)
                  return (
                    <div key={b.id} className="flex items-center justify-between">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Check size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          {book?.exam_level && <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-[#bd0a0a]/20 text-[#bd0a0a] font-bold uppercase tracking-wide mb-0.5">{book.exam_level}</span>}
                          <p className="text-white text-sm font-bold leading-snug">{[book?.unit, book?.part].filter(Boolean).join(' · ') || book?.title}</p>
                        </div>
                      </div>
                      <span className="text-[#9ca3af] text-sm flex-shrink-0">x{b.qty}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('books')}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Back</button>
              <button onClick={() => setStep('stock')}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">
                Confirm
              </button>
            </div>
          </>
        )}

        {step === 'stock' && (
          <>
            <h2 className="text-white font-semibold text-lg mb-1">Deduct from Stock?</h2>
            <p className="text-[#6b7280] text-sm mb-6">Should these {selectedBooks.length} book(s) be subtracted from available inventory now?</p>
            <div className="flex gap-3">
              <button onClick={() => finish(false)} disabled={saving}
                className="flex-1 px-4 py-3 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] font-semibold text-sm transition-all disabled:opacity-50">
                {saving && deduct === false ? 'Saving...' : 'No'}
              </button>
              <button onClick={() => finish(true)} disabled={saving}
                className="flex-1 px-4 py-3 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all disabled:opacity-50">
                {saving && deduct === true ? 'Saving...' : 'Yes, Deduct'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Internal() {
  const { profile, isAdmin } = useAuthStore()
  const [issuances, setIssuances] = useState([])
  const [books, setBooks] = useState([])
  const [stockMap, setStockMap] = useState({})
  const [stockEntries, setStockEntries] = useState([])
  const [issuerNames, setIssuerNames] = useState({})
  const [recipientType, setRecipientType] = useState('staff')
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: rows }, { data: booksData }, { data: stockData }, { data: users }] = await Promise.all([
      supabase.from('internal_issuances').select('*, books(title, exam_level, unit, part, medium)').order('issued_at', { ascending: false }),
      supabase.from('books').select('*').eq('is_active', true).order('title'),
      supabase.from('stock').select('id, book_id, available_qty, location'),
      supabase.from('users').select('id, name'),
    ])
    setIssuances(rows || [])
    setBooks(booksData || [])
    setStockEntries(stockData || [])
    const map = {}
    for (const s of (stockData || [])) map[s.book_id] = (map[s.book_id] || 0) + (s.available_qty || 0)
    setStockMap(map)
    const uMap = {}
    ;(users || []).forEach(u => { uMap[u.id] = u.name })
    setIssuerNames(uMap)
    setLoading(false)
  }

  async function deductStock(bookId, qty) {
    const entries = stockEntries
      .filter(e => e.book_id === bookId && (e.available_qty || 0) > 0)
      .sort((a, b) => b.available_qty - a.available_qty)
    let remaining = qty
    for (const entry of entries) {
      if (remaining <= 0) break
      const ded = Math.min(remaining, entry.available_qty)
      await supabase.from('stock').update({ available_qty: entry.available_qty - ded }).eq('id', entry.id)
      remaining -= ded
    }
  }

  async function restoreStock(bookId, qty) {
    const entry = stockEntries.find(e => e.book_id === bookId)
    if (!entry) return
    await supabase.from('stock').update({ available_qty: (entry.available_qty || 0) + qty }).eq('id', entry.id)
  }

  async function handleIssue(name, selectedBooks, deduct) {
    const now = new Date().toISOString()
    const rows = selectedBooks.map(b => ({
      recipient_type: recipientType,
      recipient_name: name,
      book_id: b.id,
      qty: parseInt(b.qty) || 1,
      stock_deducted: deduct,
      issued_by: profile?.id,
      issued_at: now,
    }))
    const { error } = await supabase.from('internal_issuances').insert(rows)
    if (error) { toast.error('Failed to record issuance'); return }
    if (deduct) {
      for (const b of selectedBooks) {
        await deductStock(b.id, parseInt(b.qty) || 1)
      }
    }
    const summary = selectedBooks.map(b => `${books.find(bk => bk.id === b.id)?.title} x${b.qty}`).join(', ')
    logAction('INTERNAL_ISSUANCE', `${TYPE_META[recipientType].label}: ${name} — ${summary}${deduct ? '' : ' (stock not deducted)'}`)
    toast.success(`Issued to ${name}`)
    fetchAll()
  }

  async function undoTxn(txn) {
    const { error } = await supabase.from('internal_issuances').delete().in('id', txn.ids)
    if (error) { toast.error('Failed to remove'); return }
    if (txn.stock_deducted) {
      for (const b of txn.books) {
        await restoreStock(b.book_id, b.qty)
      }
    }
    logAction('INTERNAL_ISSUANCE_REMOVED', `${TYPE_META[txn.recipient_type].label}: ${txn.recipient_name}`)
    toast.success(`Removed record for ${txn.recipient_name}`)
    fetchAll()
  }

  const transactions = useMemo(() => {
    const groups = {}
    for (const r of issuances) {
      const key = `${r.issued_at}|${r.recipient_name}|${r.recipient_type}|${r.issued_by}`
      if (!groups[key]) {
        groups[key] = {
          key,
          recipient_name: r.recipient_name,
          recipient_type: r.recipient_type,
          issued_at: r.issued_at,
          issued_by: r.issued_by,
          stock_deducted: r.stock_deducted,
          books: [],
          ids: [],
          qtyTotal: 0,
        }
      }
      const g = groups[key]
      g.books.push({ book_id: r.book_id, title: r.books?.title, exam_level: r.books?.exam_level, unit: r.books?.unit, part: r.books?.part, qty: r.qty })
      g.ids.push(r.id)
      g.qtyTotal += r.qty
    }
    return Object.values(groups).sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at))
  }, [issuances])

  const staffTxns = transactions.filter(t => t.recipient_type === 'staff')
  const campusTxns = transactions.filter(t => t.recipient_type === 'campus')
  const staffQty = staffTxns.reduce((s, t) => s + t.qtyTotal, 0)
  const campusQty = campusTxns.reduce((s, t) => s + t.qtyTotal, 0)

  const activeTxns = recipientType === 'staff' ? staffTxns : campusTxns
  const q = search.trim().toLowerCase()
  const filteredTxns = activeTxns.filter(t =>
    !q || t.recipient_name.toLowerCase().includes(q) || t.books.some(b => b.title?.toLowerCase().includes(q))
  )

  const pastNames = useMemo(() => {
    const names = new Set()
    for (const t of transactions) {
      if (t.recipient_type === recipientType) names.add(t.recipient_name)
    }
    return [...names].sort()
  }, [transactions, recipientType])

  const meta = TYPE_META[recipientType]

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold flex items-center gap-2">
            <Boxes size={22} className="text-[#f0a500]" /> Internal
          </h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {transactions.length} entr{transactions.length !== 1 ? 'ies' : 'y'} · {staffQty + campusQty} book(s) issued total
          </p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all">
          <Plus size={16} /> Issue
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Object.entries(TYPE_META).map(([type, m]) => {
          const active = recipientType === type
          const txns = type === 'staff' ? staffTxns : campusTxns
          const qty = type === 'staff' ? staffQty : campusQty
          return (
            <button key={type} onClick={() => setRecipientType(type)}
              className={`text-left bg-[#1a1a2e] rounded-xl p-4 flex items-center justify-between border transition-all touch-manipulation ${active ? 'border-white/40' : 'border-[#2a2a45] hover:border-[#3a3a55]'}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <m.icon size={16} style={{ color: m.color }} />
                  <p className="text-white font-semibold text-sm">{m.label}</p>
                </div>
                <p className="text-[#9ca3af] text-xs">{txns.length} entr{txns.length !== 1 ? 'ies' : 'y'}</p>
                <p className="text-white text-lg font-bold mt-0.5">{qty} <span className="text-[#6b7280] text-xs font-normal">books</span></p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${meta.label.toLowerCase()} entries or books...`}
          className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredTxns.length === 0 ? (
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-10 text-center">
          <meta.icon size={36} className="text-[#2a2a45] mx-auto mb-3" />
          <p className="text-white font-medium">No {meta.label.toLowerCase()} issuances yet</p>
          <p className="text-[#6b7280] text-sm mt-1">Tap "Issue" to record one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTxns.map(txn => (
            <div key={txn.key} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
              <div className="flex items-start justify-between mb-1">
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-sm">{txn.recipient_name}</p>
                  <p className="text-[#4b5563] text-xs mt-0.5">
                    by {issuerNames[txn.issued_by] || '—'} · {format(new Date(txn.issued_at), 'dd MMM yy, hh:mm a')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${txn.stock_deducted ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                    {txn.stock_deducted ? 'Stock deducted' : 'Not deducted'}
                  </span>
                  {isAdmin && (
                    <button onClick={() => undoTxn(txn)} className="text-[#4b5563] hover:text-red-400 transition-colors p-1" title="Remove record">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 border-t border-[#2a2a45] divide-y divide-[#2a2a45]">
                {txn.books.map((b, i) => (
                  <div key={i} className="flex items-start gap-2 py-2">
                    <Check size={11} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium leading-snug truncate">{b.title}</p>
                      {[b.exam_level, b.unit, b.part].filter(Boolean).length > 0 && (
                        <p className="text-[#6b7280] text-[11px] truncate">{[b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')}</p>
                      )}
                    </div>
                    <span className="text-[#9ca3af] text-xs flex-shrink-0 mt-0.5">×{b.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <IssueInternalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        recipientType={recipientType}
        books={books}
        stockMap={stockMap}
        pastNames={pastNames}
        onSubmit={handleIssue}
      />
    </div>
  )
}
