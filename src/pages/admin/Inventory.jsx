import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../hooks/useRealtime'
import { Plus, Search, AlertTriangle, History, Package, X, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { logAction } from '../../lib/audit'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

const MEDIUM_LABELS = { hindi: 'Hindi', english: 'English', both: 'Both' }
const MEDIUM_COLORS = { hindi: 'bg-orange-500/20 text-orange-400 border-orange-500/30', english: 'bg-blue-500/20 text-blue-400 border-blue-500/30', both: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
const CAT_COLORS = { booklet: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', book: 'bg-sky-500/20 text-sky-400 border-sky-500/30', notes: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' }

function Modal({ open, onClose, onSave, books, editing, allBooks, onGoToBooks }) {
  const [form, setForm] = useState({ book_id: '', location: 'Main Campus', total_qty: '', available_qty: '', low_stock_threshold: '10' })
  const [bookSearch, setBookSearch] = useState('')
  const [filterMedium, setFilterMedium] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterExam, setFilterExam] = useState('')

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          book_id: editing.book_id,
          location: editing.location,
          total_qty: String(editing.total_qty),
          available_qty: String(editing.available_qty),
          low_stock_threshold: String(editing.low_stock_threshold)
        })
      } else {
        setForm({ book_id: '', location: 'Main Campus', total_qty: '', available_qty: '', low_stock_threshold: '10' })
        setBookSearch(''); setFilterMedium(''); setFilterCat(''); setFilterExam('')
      }
    }
  }, [open, editing])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const examOptions = [...new Set(books.map(b => b.exam_level).filter(Boolean))].sort()

  const visibleBooks = books.filter(b => {
    const q = bookSearch.toLowerCase()
    const matchQ = !q || [b.title, b.exam_level, b.unit, b.part, b.subject].some(f => f?.toLowerCase().includes(q))
    return matchQ &&
      (!filterMedium || b.medium === filterMedium) &&
      (!filterCat || b.category === filterCat) &&
      (!filterExam || b.exam_level === filterExam)
  })

  async function handleSave() {
    if (!editing && !form.book_id) { toast.error('Select a book'); return }
    await onSave(form); onClose()
  }

  if (!open) return null
  const editBook = editing ? allBooks.find(b => b.id === editing.book_id) : null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a45] flex-shrink-0">
          <h2 className="text-white font-semibold text-base">{editing ? 'Edit Stock' : 'Add Stock Entry'}</h2>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Book section */}
          {editing ? (
            <div>
              <label className="text-[#9ca3af] text-xs uppercase tracking-wide mb-2 block">Book</label>
              <div className="bg-[#12121f] border border-[#2a2a45] rounded-lg px-4 py-3">
                <p className="text-white text-sm font-medium">{editBook?.title || '—'}</p>
                <div className="flex gap-2 flex-wrap mt-1.5">
                  {editBook?.exam_level && <span className="text-xs text-[#9ca3af]">{editBook.exam_level}</span>}
                  {editBook?.unit && <span className="text-xs text-[#6b7280]">· {editBook.unit}</span>}
                  {editBook?.part && <span className="text-xs text-[#6b7280]">· {editBook.part}</span>}
                  {editBook?.medium && <span className={`text-xs px-1.5 py-0.5 rounded border ${MEDIUM_COLORS[editBook.medium] || ''}`}>{MEDIUM_LABELS[editBook.medium]}</span>}
                  {editBook?.category && <span className={`text-xs px-1.5 py-0.5 rounded border capitalize ${CAT_COLORS[editBook.category] || ''}`}>{editBook.category}</span>}
                </div>
              </div>
            </div>
          ) : books.length === 0 ? (
            <div className="bg-[#12121f] border border-[#2a2a45] rounded-lg px-4 py-5 text-center">
              <BookOpen size={22} className="text-[#6b7280] mx-auto mb-2" />
              <p className="text-[#9ca3af] text-sm mb-1">All books already have stock entries.</p>
              <p className="text-[#6b7280] text-xs mb-3">To track a new book, add it in the Books section first, then come back here.</p>
              <button type="button" onClick={onGoToBooks}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white transition-all">
                Go to Books →
              </button>
            </div>
          ) : (
            <div>
              <label className="text-[#9ca3af] text-xs uppercase tracking-wide mb-2 block">Select Book *</label>
              {/* Search */}
              <div className="relative mb-2">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
                <input value={bookSearch} onChange={e => setBookSearch(e.target.value)}
                  placeholder="Search title, exam, unit..."
                  className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
              </div>
              {/* Filter chips */}
              <div className="flex gap-1.5 flex-wrap mb-2">
                {['hindi','english','both'].map(m => (
                  <button key={m} type="button" onClick={() => setFilterMedium(f => f === m ? '' : m)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-all ${filterMedium === m ? MEDIUM_COLORS[m] : 'border-[#2a2a45] text-[#6b7280] hover:text-white'}`}>
                    {MEDIUM_LABELS[m]}
                  </button>
                ))}
                {['booklet','book','notes'].map(c => (
                  <button key={c} type="button" onClick={() => setFilterCat(f => f === c ? '' : c)}
                    className={`text-xs px-2 py-0.5 rounded-full border capitalize transition-all ${filterCat === c ? CAT_COLORS[c] : 'border-[#2a2a45] text-[#6b7280] hover:text-white'}`}>
                    {c}
                  </button>
                ))}
                {examOptions.map(e => (
                  <button key={e} type="button" onClick={() => setFilterExam(f => f === e ? '' : e)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-all ${filterExam === e ? 'bg-[#bd0a0a]/20 text-red-400 border-[#bd0a0a]/30' : 'border-[#2a2a45] text-[#6b7280] hover:text-white'}`}>
                    {e}
                  </button>
                ))}
              </div>
              {/* Book list */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {visibleBooks.length === 0 ? (
                  <p className="text-[#6b7280] text-xs text-center py-4">No books match your filters</p>
                ) : visibleBooks.map(b => (
                  <button key={b.id} type="button" onClick={() => set('book_id', b.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${form.book_id === b.id ? 'border-[#bd0a0a] bg-[#bd0a0a]/10' : 'border-[#2a2a45] bg-[#12121f] hover:border-[#3a3a55]'}`}>
                    <p className="text-white text-sm font-medium leading-snug">{b.title}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {b.exam_level && <span className="text-[#9ca3af] text-xs">{b.exam_level}</span>}
                      {b.unit && <span className="text-[#6b7280] text-xs">· {b.unit}</span>}
                      {b.part && <span className="text-[#6b7280] text-xs">· {b.part}</span>}
                      {b.medium && <span className={`text-xs px-1.5 py-0.5 rounded border ${MEDIUM_COLORS[b.medium] || ''}`}>{MEDIUM_LABELS[b.medium]}</span>}
                      {b.category && <span className={`text-xs px-1.5 py-0.5 rounded border capitalize ${CAT_COLORS[b.category] || ''}`}>{b.category}</span>}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[#6b7280] text-xs mt-2">Only books without a stock entry are shown. To add a new book, go to the Books page first.</p>
            </div>
          )}

          {/* Qty fields */}
          <div>
            <label className="text-[#9ca3af] text-xs uppercase tracking-wide mb-2 block">Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)}
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
          </div>

          {editing ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[#9ca3af] text-xs mb-1.5 block">Total Qty</label>
                <input type="number" min="0" value={form.total_qty} onChange={e => set('total_qty', e.target.value)}
                  className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
              </div>
              <div>
                <label className="text-[#9ca3af] text-xs mb-1.5 block">Available <span className="text-[#6b7280]">(correct if needed)</span></label>
                <input type="number" min="0" value={form.available_qty} onChange={e => set('available_qty', e.target.value)}
                  className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
              </div>
              <div>
                <label className="text-[#9ca3af] text-xs mb-1.5 block">Alert At</label>
                <input type="number" min="0" value={form.low_stock_threshold} onChange={e => set('low_stock_threshold', e.target.value)}
                  className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#9ca3af] text-xs mb-1.5 block">Total Qty</label>
                <input type="number" min="0" value={form.total_qty}
                  onChange={e => { set('total_qty', e.target.value); set('available_qty', e.target.value) }}
                  className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
                <p className="text-[#6b7280] text-xs mt-1">Available will be set to the same amount</p>
              </div>
              <div>
                <label className="text-[#9ca3af] text-xs mb-1.5 block">Alert At <span className="text-[#6b7280]">(warn below this)</span></label>
                <input type="number" min="0" value={form.low_stock_threshold} onChange={e => set('low_stock_threshold', e.target.value)}
                  className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-[#2a2a45] flex-shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">{editing ? 'Save Changes' : 'Add Stock'}</button>
        </div>
      </div>
    </div>
  )
}

function BookHistoryModal({ open, onClose, bookId, bookTitle }) {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !bookId) return
    setLoading(true)
    Promise.all([
      supabase.from('issuances')
        .select('id, issued_at, is_reversed, is_previous_issuance, students(name, student_id), users!issuances_issued_by_fkey(name)')
        .eq('book_id', bookId).order('issued_at', { ascending: false }),
      supabase.from('sales')
        .select('id, sold_at, qty, buyer_name, buyer_phone, is_returned, users!sales_sold_by_fkey(name)')
        .eq('book_id', bookId).order('sold_at', { ascending: false }),
      supabase.from('allotments')
        .select('id, allotted_at, qty, institution_name, contact_person, type, users!allotments_allotted_by_fkey(name)')
        .eq('book_id', bookId).order('allotted_at', { ascending: false })
    ]).then(([{ data: iss }, { data: sal }, { data: all }]) => {
      const merged = [
        ...(iss || []).map(i => ({
          key: `i-${i.id}`, type: i.is_previous_issuance ? 'PREV_ISSUANCE' : 'ISSUANCE',
          to: `${i.students?.name || '—'} (${i.students?.student_id || ''})`,
          qty: 1, by: i.users?.name || '—',
          date: i.issued_at, voided: i.is_reversed
        })),
        ...(sal || []).map(s => ({
          key: `s-${s.id}`, type: 'SALE',
          to: s.buyer_name + (s.buyer_phone ? ` · ${s.buyer_phone}` : ''),
          qty: s.qty || 1, by: s.users?.name || '—',
          date: s.sold_at, voided: s.is_returned
        })),
        ...(all || []).map(a => ({
          key: `a-${a.id}`, type: 'ALLOTMENT',
          to: a.institution_name + (a.contact_person ? ` · ${a.contact_person}` : '') + ` (${a.type})`,
          qty: a.qty || 1, by: a.users?.name || '—',
          date: a.allotted_at, voided: false
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date))
      setMovements(merged)
      setLoading(false)
    })
  }, [open, bookId])

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a45] flex-shrink-0">
          <div>
            <p className="text-white font-semibold text-sm">{bookTitle}</p>
            <p className="text-[#6b7280] text-xs mt-0.5">{loading ? '…' : `${movements.length} total movements`}</p>
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-[#2a2a45]">
          {loading ? [...Array(5)].map((_,i) => (
            <div key={i} className="px-5 py-3 animate-pulse">
              <div className="h-4 bg-[#2a2a45] rounded w-3/4 mb-2"/>
              <div className="h-3 bg-[#2a2a45] rounded w-1/2"/>
            </div>
          )) : movements.length === 0 ? (
            <p className="text-[#6b7280] text-sm text-center py-10">No movements recorded for this book</p>
          ) : movements.map(m => {
            const ts = TYPE_STYLES[m.type]
            return (
              <div key={m.key} className={`px-5 py-3 ${m.voided ? 'opacity-40' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ts.cls}`}>{ts.label}</span>
                      {m.voided && <span className="text-[#6b7280] text-xs">reversed/returned</span>}
                    </div>
                    <p className="text-white text-sm truncate">→ {m.to}</p>
                    <p className="text-[#6b7280] text-xs mt-0.5">qty {m.qty} · by {m.by}</p>
                  </div>
                  <p className="text-[#6b7280] text-xs whitespace-nowrap flex-shrink-0">{format(new Date(m.date), 'dd MMM yy, hh:mm a')}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const TYPE_STYLES = {
  ISSUANCE:      { label: 'Issuance',      cls: 'bg-[#bd0a0a]/20 text-red-400 border-[#bd0a0a]/30' },
  PREV_ISSUANCE: { label: 'Prev. Issuance', cls: 'bg-[#f0a500]/20 text-[#f0a500] border-[#f0a500]/30' },
  SALE:          { label: 'Sale',          cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  ALLOTMENT:     { label: 'Allotment',     cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
}

export default function Inventory() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('stock')
  const [stock, setStock] = useState([])
  const [books, setBooks] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [histLoading, setHistLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [histSearch, setHistSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [historyBook, setHistoryBook] = useState(null)

  useEffect(() => { fetchAll() }, [])
  useRealtime('stock', fetchAll)

  async function fetchAll() {
    setLoading(true)
    try {
      const [{ data: s, error: e1 }, { data: b, error: e2 }] = await Promise.all([
        supabase.from('stock').select('*, books(title, category)').order('id', { ascending: false }),
        supabase.from('books').select('*').eq('is_active', true)
      ])
      if (e1) { toast.error('Failed to load stock'); console.error(e1) }
      if (e2) { toast.error('Failed to load books'); console.error(e2) }
      setStock(s || [])
      setBooks(b || [])
    } catch (err) {
      toast.error('Unexpected error loading inventory')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchHistory() {
    setHistLoading(true)
    const [{ data: iss }, { data: sal }, { data: all }] = await Promise.all([
      supabase.from('issuances')
        .select('id, issued_at, is_reversed, is_previous_issuance, books(title), students(name, student_id), users!issuances_issued_by_fkey(name)')
        .order('issued_at', { ascending: false }).limit(500),
      supabase.from('sales')
        .select('id, sold_at, qty, buyer_name, buyer_phone, is_returned, books(title), users!sales_sold_by_fkey(name)')
        .order('sold_at', { ascending: false }).limit(500),
      supabase.from('allotments')
        .select('id, allotted_at, qty, institution_name, contact_person, type, books(title), users!allotments_allotted_by_fkey(name)')
        .order('allotted_at', { ascending: false }).limit(500)
    ])
    const merged = [
      ...(iss || []).map(i => ({
        key: `i-${i.id}`, type: i.is_previous_issuance ? 'PREV_ISSUANCE' : 'ISSUANCE',
        book: i.books?.title || '—',
        to: `${i.students?.name || '—'} (${i.students?.student_id || ''})`,
        qty: 1, by: i.users?.name || '—',
        date: i.issued_at, voided: i.is_reversed
      })),
      ...(sal || []).map(s => ({
        key: `s-${s.id}`, type: 'SALE',
        book: s.books?.title || '—',
        to: s.buyer_name + (s.buyer_phone ? ` · ${s.buyer_phone}` : ''),
        qty: s.qty || 1, by: s.users?.name || '—',
        date: s.sold_at, voided: s.is_returned
      })),
      ...(all || []).map(a => ({
        key: `a-${a.id}`, type: 'ALLOTMENT',
        book: a.books?.title || '—',
        to: a.institution_name + (a.contact_person ? ` · ${a.contact_person}` : '') + ` (${a.type})`,
        qty: a.qty || 1, by: a.users?.name || '—',
        date: a.allotted_at, voided: false
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date))
    setMovements(merged)
    setHistLoading(false)
  }

  useEffect(() => { if (tab === 'history') fetchHistory() }, [tab])

  async function handleSave(form) {
    const payload = {
      location: form.location,
      total_qty: parseInt(form.total_qty) || 0,
      available_qty: parseInt(form.available_qty) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 10
    }
    if (editing) {
      const { error } = await supabase.from('stock').update(payload).eq('id', editing.id)
      if (error) { toast.error('Failed to update'); return }
      toast.success('Stock updated')
      logAction('STOCK_UPDATED', `${editing.books?.title || editing.book_id} — qty ${payload.available_qty}/${payload.total_qty} @ ${payload.location}`)
    } else {
      const { error } = await supabase.from('stock').insert({ ...payload, book_id: form.book_id })
      if (error) { toast.error('Failed to add stock'); return }
      toast.success('Stock added')
      const bookTitle = books.find(b => b.id === form.book_id)?.title || form.book_id
      logAction('STOCK_CREATED', `${bookTitle} — qty ${payload.available_qty}/${payload.total_qty} @ ${payload.location}`)
    }
    fetchAll()
  }

  const filtered = stock.filter(s =>
    s.books?.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.location?.toLowerCase().includes(search.toLowerCase())
  )

  const q = histSearch.toLowerCase()
  const filteredMov = movements.filter(m =>
    m.book.toLowerCase().includes(q) ||
    m.to.toLowerCase().includes(q) ||
    m.by.toLowerCase().includes(q) ||
    m.type.toLowerCase().includes(q)
  )

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Inventory</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{tab === 'stock' ? `${stock.length} stock entries` : `${movements.length} movements`}</p>
        </div>
        {tab === 'stock' && (
          <button onClick={() => { setEditing(null); setModalOpen(true) }}
            className="flex items-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
            <Plus size={16} /> Add Stock
          </button>
        )}
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-[#12121f] border border-[#2a2a45] rounded-lg p-1 w-fit">
        <button onClick={() => setTab('stock')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === 'stock' ? 'bg-[#bd0a0a] text-white' : 'text-[#9ca3af] hover:text-white'}`}>
          <Package size={14} /> Stock
        </button>
        <button onClick={() => setTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === 'history' ? 'bg-[#bd0a0a] text-white' : 'text-[#9ca3af] hover:text-white'}`}>
          <History size={14} /> History
        </button>
      </div>

      {tab === 'stock' && (
        <>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by book or location..."
              className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
          </div>

          {/* Desktop table */}
          <div className="mob-table bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-[#2a2a45]">
                  {['BOOK','LOCATION','TOTAL','AVAILABLE','ALERT AT','STATUS','ACTIONS'].map(h=>(
                    <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a45]">
                {loading ? [...Array(4)].map((_,i)=>(
                  <tr key={i}>{[...Array(7)].map((_,j)=>(
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse"/></td>
                  ))}</tr>
                )) : filtered.length===0 ? (
                  <tr><td colSpan={7} className="text-center text-[#6b7280] py-10 text-sm">No stock entries found</td></tr>
                ) : filtered.map(s => {
                  const isLow = s.available_qty <= s.low_stock_threshold
                  return (
                    <tr key={s.id} className="hover:bg-[#12121f] transition-colors cursor-pointer"
                      onClick={() => setHistoryBook({ id: s.book_id, title: s.books?.title })}>
                      <td className="px-5 py-3 text-white text-sm font-medium">{s.books?.title}<p className="text-[#6b7280] text-xs font-normal">tap to view history</p></td>
                      <td className="px-5 py-3 text-[#9ca3af] text-sm">{s.location}</td>
                      <td className="px-5 py-3 text-white text-sm">{s.total_qty}</td>
                      <td className="px-5 py-3">
                        <span className={`text-sm font-semibold ${s.available_qty === 0 ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-white'}`}>{s.available_qty}</span>
                        {s.total_qty > 0 && (
                          <div className="w-16 bg-[#2a2a45] rounded-full h-1 mt-1">
                            <div className={`h-1 rounded-full ${s.available_qty === 0 ? 'bg-red-500' : isLow ? 'bg-orange-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.round((s.available_qty / s.total_qty) * 100)}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[#9ca3af] text-sm">{s.low_stock_threshold}</td>
                      <td className="px-5 py-3">
                        {isLow ? (
                          <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                            <AlertTriangle size={12} /> {s.available_qty === 0 ? 'Out of stock' : 'Low Stock'}
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400 font-medium">OK</span>
                        )}
                      </td>
                      <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setEditing(s); setModalOpen(true) }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white transition-all">
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mob-cards space-y-3">
            {loading ? [...Array(3)].map((_,i)=>(
              <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 animate-pulse h-24"/>
            )) : filtered.length===0 ? (
              <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-6 text-center text-[#6b7280] text-sm">No stock entries</div>
            ) : filtered.map(s => {
              const isLow = s.available_qty <= s.low_stock_threshold
              return (
                <div key={s.id} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 cursor-pointer active:bg-[#12121f] transition-all"
                  onClick={() => setHistoryBook({ id: s.book_id, title: s.books?.title })}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-white font-semibold text-sm">{s.books?.title}</p>
                    {isLow ? (
                      <span className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={11}/> Low</span>
                    ) : (
                      <span className="text-xs text-emerald-400">OK</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <p className="text-[#6b7280] text-xs">Total</p>
                      <p className="text-white text-sm font-medium">{s.total_qty}</p>
                    </div>
                    <div>
                      <p className="text-[#6b7280] text-xs">Available</p>
                      <p className={`text-sm font-semibold ${s.available_qty === 0 ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-emerald-400'}`}>{s.available_qty}</p>
                    </div>
                    <div>
                      <p className="text-[#6b7280] text-xs">Alert at</p>
                      <p className="text-white text-sm">{s.low_stock_threshold}</p>
                    </div>
                  </div>
                  {s.total_qty > 0 && (
                    <div className="mb-2">
                      <div className="w-full bg-[#12121f] rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all ${s.available_qty === 0 ? 'bg-red-500' : isLow ? 'bg-orange-400' : 'bg-emerald-400'}`}
                          style={{ width: `${Math.round((s.available_qty / s.total_qty) * 100)}%` }} />
                      </div>
                      <p className="text-[#6b7280] text-xs mt-0.5">{s.total_qty > 0 ? Math.round((s.available_qty / s.total_qty) * 100) : 0}% available</p>
                    </div>
                  )}
                  <p className="text-[#6b7280] text-xs mb-3">{s.location}</p>
                  <button onClick={e => { e.stopPropagation(); setEditing(s); setModalOpen(true) }}
                    className="w-full text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white transition-all">
                    Edit Stock
                  </button>
                  <button onClick={e => { e.stopPropagation(); setHistoryBook({ id: s.book_id, title: s.books?.title }) }}
                    className="w-full mt-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#12121f] border border-[#2a2a45] text-[#9ca3af] hover:text-white transition-all flex items-center justify-center gap-1">
                    <History size={11}/> View History
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'history' && (
        <>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
            <input value={histSearch} onChange={e => setHistSearch(e.target.value)}
              placeholder="Search by book, recipient, user or type..."
              className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
          </div>

          {/* Desktop table */}
          <div className="mob-table bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-[#2a2a45]">
                  {['TYPE','BOOK','TO (STUDENT / BUYER / INSTITUTION)','QTY','BY','DATE'].map(h=>(
                    <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a45]">
                {histLoading ? [...Array(6)].map((_,i)=>(
                  <tr key={i}>{[...Array(6)].map((_,j)=>(
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse"/></td>
                  ))}</tr>
                )) : filteredMov.length===0 ? (
                  <tr><td colSpan={6} className="text-center text-[#6b7280] py-10 text-sm">No movements found</td></tr>
                ) : filteredMov.map(m => {
                  const ts = TYPE_STYLES[m.type]
                  return (
                    <tr key={m.key} className={`hover:bg-[#12121f] transition-colors ${m.voided ? 'opacity-40' : ''}`}>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${ts.cls}`}>
                          {ts.label}
                        </span>
                        {m.voided && <p className="text-[#6b7280] text-xs mt-0.5">reversed/returned</p>}
                      </td>
                      <td className="px-5 py-3 text-white text-sm font-medium max-w-[180px] truncate">{m.book}</td>
                      <td className="px-5 py-3 text-[#9ca3af] text-sm max-w-[200px] truncate">{m.to}</td>
                      <td className="px-5 py-3 text-white text-sm">{m.qty}</td>
                      <td className="px-5 py-3 text-[#9ca3af] text-sm">{m.by}</td>
                      <td className="px-5 py-3 text-[#9ca3af] text-sm whitespace-nowrap">{format(new Date(m.date), 'dd MMM yy, hh:mm a')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mob-cards space-y-3">
            {histLoading ? [...Array(4)].map((_,i)=>(
              <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 animate-pulse h-20"/>
            )) : filteredMov.length===0 ? (
              <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-6 text-center text-[#6b7280] text-sm">No movements found</div>
            ) : filteredMov.map(m => {
              const ts = TYPE_STYLES[m.type]
              return (
                <div key={m.key} className={`bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 ${m.voided ? 'opacity-40' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ts.cls}`}>{ts.label}</span>
                      {m.voided && <span className="text-[#6b7280] text-xs">reversed/returned</span>}
                    </div>
                    <span className="text-[#6b7280] text-xs whitespace-nowrap">{format(new Date(m.date), 'dd MMM yy')}</span>
                  </div>
                  <p className="text-white text-sm font-medium mb-1">{m.book}</p>
                  <p className="text-[#9ca3af] text-xs mb-1">→ {m.to}</p>
                  <p className="text-[#6b7280] text-xs">qty {m.qty} · by {m.by} · {format(new Date(m.date), 'hh:mm a')}</p>
                </div>
              )
            })}
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        books={editing ? books : books.filter(b => !stock.some(s => s.book_id === b.id))}
        allBooks={books}
        editing={editing}
        onGoToBooks={() => { setModalOpen(false); navigate('/admin/books') }}
      />
      <BookHistoryModal
        open={!!historyBook}
        onClose={() => setHistoryBook(null)}
        bookId={historyBook?.id}
        bookTitle={historyBook?.title}
      />
    </div>
  )
}