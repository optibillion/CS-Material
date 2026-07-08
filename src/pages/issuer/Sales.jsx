import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Check, ShoppingCart, Package, Search, RotateCcw, Receipt } from 'lucide-react'
import { logAction } from '../../lib/audit'
import ReceiptModal from '../../components/ReceiptModal'

export default function IssuerSales() {
  const { profile } = useAuthStore()
  const canModify = profile?.role === 'manager' || profile?.role === 'admin'

  const [books, setBooks] = useState([])
  const [bundles, setBundles] = useState([])
  const [stockMap, setStockMap] = useState({})
  const [stockEntries, setStockEntries] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [salesSearch, setSalesSearch] = useState('')

  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [saleMedium, setSaleMedium] = useState('')
  const [selectedBooks, setSelectedBooks] = useState([])
  const [finalPrice, setFinalPrice] = useState('')
  const [examFilter, setExamFilter] = useState('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [bookSearch, setBookSearch] = useState('')
  const [receiptData, setReceiptData] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: booksData }, { data: bundlesData }, { data: stockData }, { data: salesData }] = await Promise.all([
      supabase.from('books').select('*').eq('is_active', true).order('title'),
      supabase.from('bundles').select('*, bundle_books(book_id)').eq('is_active', true),
      supabase.from('stock').select('id, book_id, available_qty, location'),
      supabase.from('sales')
        .select('*, books(title, exam_level, unit, part), users!sales_sold_by_fkey(name)')
        .order('sold_at', { ascending: false })
    ])
    setBooks(booksData || [])
    setBundles(bundlesData || [])
    setStockEntries(stockData || [])
    const map = {}
    for (const s of (stockData || [])) {
      map[s.book_id] = (map[s.book_id] || 0) + (s.available_qty || 0)
    }
    setStockMap(map)
    setSales(salesData || [])
    setLoading(false)
  }

  function toggleBook(bookId) {
    setSelectedBooks(prev => {
      if (prev.find(b => b.id === bookId)) return prev.filter(b => b.id !== bookId)
      return [...prev, { id: bookId, qty: 1 }]
    })
  }

  function updateBook(bookId, field, value) {
    setSelectedBooks(prev => prev.map(b => b.id === bookId ? { ...b, [field]: value } : b))
  }

  function selectBundle(bundle) {
    const ids = bundle.bundle_books
      .map(bb => bb.book_id)
      .filter(id => {
        const m = books.find(b => b.id === id)?.medium
        return (m === saleMedium || m === 'both') && !selectedBooks.find(s => s.id === id)
      })
    if (ids.length === 0) { toast.error('All books in this bundle are already selected or wrong medium'); return }
    setSelectedBooks(prev => [...prev, ...ids.map(id => ({ id, qty: 1 }))])
    toast.success(`${ids.length} book(s) added from ${bundle.name}`)
  }

  const total = parseFloat(finalPrice) || 0

  async function handleSubmit() {
    if (!buyerName.trim()) { toast.error('Buyer name is required'); return }
    if (!saleMedium) { toast.error('Select a medium'); return }
    if (selectedBooks.length === 0) { toast.error('Select at least one book'); return }
    for (const b of selectedBooks) {
      if ((parseInt(b.qty) || 0) < 1) { toast.error('Qty must be at least 1 for all books'); return }
    }
    setConfirmOpen(true)
  }

  async function confirmSale() {
    setConfirmOpen(false)
    setSubmitting(true)
    const now = new Date().toISOString()
    const saleRows = selectedBooks.map((b, i) => ({
      buyer_name: buyerName.trim(),
      buyer_phone: buyerPhone.trim() || null,
      book_id: b.id,
      qty: parseInt(b.qty) || 1,
      total_price: i === 0 ? (parseFloat(finalPrice) || null) : null,
      sold_by: profile?.id,
      sold_at: now,
      is_returned: false
    }))
    const { error } = await supabase.from('sales').insert(saleRows)
    if (error) { toast.error('Failed to record sale'); setSubmitting(false); return }
    for (const b of selectedBooks) {
      await deductStock(b.id, parseInt(b.qty) || 1)
    }
    const summary = selectedBooks.map(b => `${books.find(bk => bk.id === b.id)?.title} x${b.qty}`).join(', ')
    logAction('SALE_RECORDED', `${buyerName.trim()} (${buyerPhone || 'no phone'}) — ${summary} — ₹${total.toFixed(0)}`)
    toast.success(`Sale recorded — ${selectedBooks.length} book(s) sold to ${buyerName}`)
    setReceiptData({
      _fresh: true,
      buyer_name: buyerName.trim(),
      buyer_phone: buyerPhone.trim() || null,
      books: selectedBooks.map(b => {
        const book = books.find(bk => bk.id === b.id)
        return { title: book?.title, exam_level: book?.exam_level, unit: book?.unit, part: book?.part, qty: parseInt(b.qty) || 1 }
      }),
      total_price: parseFloat(finalPrice) || null,
      sold_at: now,
    })
    setBuyerName(''); setBuyerPhone(''); setSaleMedium(''); setSelectedBooks([]); setFinalPrice('')
    fetchData()
    setSubmitting(false)
  }

  async function deductStock(bookId, qty) {
    const entries = stockEntries
      .filter(e => e.book_id === bookId && (e.available_qty || 0) > 0)
      .sort((a, b) => b.available_qty - a.available_qty)
    let remaining = qty
    for (const entry of entries) {
      if (remaining <= 0) break
      const deduct = Math.min(remaining, entry.available_qty)
      await supabase.from('stock').update({ available_qty: entry.available_qty - deduct }).eq('id', entry.id)
      remaining -= deduct
    }
  }

  async function handleReturn(txn) {
    const { error } = await supabase.from('sales')
      .update({ is_returned: true, return_handled_by: profile?.id, returned_at: new Date().toISOString() })
      .in('id', txn.ids)
    if (error) { toast.error('Failed'); return }
    toast.success('Sale marked as returned')
    logAction('SALE_RETURNED', `${txn.books.map(b => b.title).join(', ')} — ${txn.buyer_name} (${txn.buyer_phone || 'no phone'})`)
    fetchData()
  }

  // Group individual sale rows into transactions (same buyer + same timestamp + same seller)
  const transactions = useMemo(() => {
    const groups = {}
    for (const s of sales) {
      const key = `${s.sold_at}|${s.buyer_name}|${s.sold_by}`
      if (!groups[key]) {
        groups[key] = {
          key,
          buyer_name: s.buyer_name,
          buyer_phone: s.buyer_phone,
          sold_by_name: s.users?.name,
          sold_at: s.sold_at,
          total_price: null,
          books: [],
          ids: [],
          all_returned: true
        }
      }
      const g = groups[key]
      if (s.total_price) g.total_price = s.total_price
      g.books.push({ title: s.books?.title, exam_level: s.books?.exam_level, unit: s.books?.unit, part: s.books?.part, qty: s.qty, is_returned: s.is_returned })
      g.ids.push(s.id)
      if (!s.is_returned) g.all_returned = false
    }
    return Object.values(groups).sort((a, b) => new Date(b.sold_at) - new Date(a.sold_at))
  }, [sales])

  const filteredTxns = transactions.filter(t => {
    const q = salesSearch.toLowerCase()
    return (
      t.buyer_name?.toLowerCase().includes(q) ||
      t.buyer_phone?.includes(salesSearch) ||
      t.sold_by_name?.toLowerCase().includes(q) ||
      t.books.some(b => b.title?.toLowerCase().includes(q))
    )
  })

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-white text-2xl font-bold">Record Sale</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">Sell books to students or buyers — auto-deducts from inventory</p>
      </div>

      {/* Buyer Info */}
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 space-y-3">
        <p className="text-white font-semibold text-sm">Buyer Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[#9ca3af] text-xs mb-1 block">Name *</label>
            <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Full name"
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
          </div>
          <div>
            <label className="text-[#9ca3af] text-xs mb-1 block">Phone</label>
            <input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 digit number"
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
          </div>
        </div>
        <div>
          <label className="text-[#9ca3af] text-xs mb-2 block">Medium *</label>
          <div className="grid grid-cols-2 gap-2">
            {['hindi', 'english'].map(m => (
              <button key={m} type="button" onClick={() => { setSaleMedium(m); setSelectedBooks([]); setExamFilter('all'); setUnitFilter('all'); setBookSearch('') }}
                className={`py-2.5 rounded-lg border text-sm font-medium capitalize transition-all ${saleMedium === m ? 'bg-[#bd0a0a] border-[#bd0a0a] text-white' : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] hover:border-[#bd0a0a]'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bundle Quick Select */}
      {saleMedium && bundles.length > 0 && (
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 space-y-3">
          <p className="text-white font-semibold text-sm">Quick Select — Bundles</p>
          <div className="flex flex-wrap gap-2">
            {bundles.map(b => {
              const count = b.bundle_books?.filter(bb => {
                const m = books.find(bk => bk.id === bb.book_id)?.medium
                return m === saleMedium || m === 'both'
              }).length ?? 0
              return (
                <button key={b.id} onClick={() => selectBundle(b)}
                  className="flex items-center gap-2 px-3 py-2 bg-[#12121f] border border-[#2a2a45] hover:border-[#f0a500] rounded-lg text-sm text-white transition-all">
                  <Package size={14} className="text-[#f0a500]" />
                  {b.name}
                  <span className="text-[#6b7280] text-xs">({count})</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Book Selection */}
      {saleMedium && (() => {
        const saleBooks = books.filter(b => b.medium === saleMedium || b.medium === 'both')
        const examOptions = [...new Set(saleBooks.map(b => b.exam_level).filter(Boolean))].sort()
        const unitOptions = [...new Set(saleBooks.filter(b => examFilter === 'all' || b.exam_level === examFilter).map(b => b.unit).filter(Boolean))].sort()
        const visibleBooks = saleBooks.filter(b =>
          (examFilter === 'all' || b.exam_level === examFilter) &&
          (unitFilter === 'all' || b.unit === unitFilter) &&
          (!bookSearch.trim() || b.title?.toLowerCase().includes(bookSearch.toLowerCase()) ||
            b.exam_level?.toLowerCase().includes(bookSearch.toLowerCase()) ||
            b.unit?.toLowerCase().includes(bookSearch.toLowerCase()))
        )
        return (
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 space-y-3">
            <p className="text-white font-semibold text-sm">Select Books <span className="text-[#6b7280] font-normal capitalize">({saleMedium} · {selectedBooks.length} selected)</span></p>
            {examOptions.length > 0 && (
              <div className="space-y-2">
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
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
              <input value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder="Search books..."
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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
                          onChange={e => updateBook(b.id, 'qty', e.target.value)}
                          className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {selectedBooks.length > 0 && (
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 space-y-3">
          <div>
            <label className="text-[#9ca3af] text-xs mb-1.5 block">Final Price (₹)</label>
            <input type="number" min="0" value={finalPrice} placeholder="Enter total amount charged"
              onChange={e => setFinalPrice(e.target.value)}
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#f0a500] placeholder-[#4b5563]" />
          </div>
          {finalPrice && (
            <div className="flex items-center justify-between">
              <p className="text-[#9ca3af] text-sm">Total</p>
              <p className="text-[#f0a500] font-bold text-xl">₹{parseFloat(finalPrice).toFixed(0)}</p>
            </div>
          )}
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-sm transition-all">
            <ShoppingCart size={16} /> Record Sale — {selectedBooks.length} Book(s)
          </button>
        </div>
      )}

      {/* Past Sales — grouped by transaction */}
      <div className="space-y-3">
        <div>
          <h2 className="text-white font-semibold text-base">Past Sales</h2>
          <p className="text-[#6b7280] text-xs mt-0.5">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''} · {canModify ? 'manager — can mark returns' : 'view only'}</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
          <input value={salesSearch} onChange={e => setSalesSearch(e.target.value)} placeholder="Search by buyer, book, phone or sold by..."
            className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
        </div>

        <div className="space-y-3">
          {loading ? [...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 animate-pulse h-28" />
          )) : filteredTxns.length === 0 ? (
            <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-6 text-center text-[#6b7280] text-sm">No sales found</div>
          ) : filteredTxns.map(txn => (
            <div key={txn.key} className={`bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 ${txn.all_returned ? 'opacity-60' : ''}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-1">
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-sm">{txn.buyer_name}</p>
                  {txn.buyer_phone && <p className="text-[#6b7280] text-xs">{txn.buyer_phone}</p>}
                  <p className="text-[#4b5563] text-xs mt-0.5">by {txn.sold_by_name || '—'} · {format(new Date(txn.sold_at), 'dd MMM yy, hh:mm a')}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${txn.all_returned ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                    {txn.all_returned ? 'Returned' : 'Sold'}
                  </span>
                  {txn.total_price && <span className="text-[#f0a500] font-bold text-sm whitespace-nowrap">₹{txn.total_price}</span>}
                </div>
              </div>

              {/* Books list */}
              <div className="mt-3 border-t border-[#2a2a45] divide-y divide-[#2a2a45] max-h-52 overflow-y-auto">
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
              {txn.books.length > 5 && (
                <p className="text-[#4b5563] text-[10px] text-center mt-1">{txn.books.length} books — scroll to see all</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-[#2a2a45]">
                <button
                  onClick={() => setReceiptData({ buyer_name: txn.buyer_name, buyer_phone: txn.buyer_phone, books: txn.books, total_price: txn.total_price, sold_at: txn.sold_at })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white text-xs font-medium transition-all">
                  <Receipt size={13} /> View Receipt
                </button>
                {canModify && !txn.all_returned && (
                  <button onClick={() => handleReturn(txn)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs py-2 rounded-lg bg-[#2a2a45] hover:bg-red-500/20 hover:text-red-400 text-[#9ca3af] transition-all">
                    <RotateCcw size={12} /> Mark Returned
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ReceiptModal data={receiptData} onClose={() => setReceiptData(null)} />

      {/* Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6">
            <h2 className="text-white font-semibold text-lg mb-1">Confirm Sale</h2>
            <p className="text-[#6b7280] text-sm mb-5">Please verify before recording.</p>
            <div className="bg-[#12121f] border border-[#2a2a45] rounded-lg p-4 mb-4">
              <p className="text-xs text-[#6b7280] uppercase tracking-wide mb-1">Buyer</p>
              <p className="text-white font-semibold">{buyerName}</p>
              {buyerPhone && <p className="text-[#9ca3af] text-sm">{buyerPhone}</p>}
            </div>
            <div className="bg-[#12121f] border border-[#2a2a45] rounded-lg p-4 mb-4">
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
                          {(book?.unit || book?.part) && <p className="text-[#4b5563] text-[11px] truncate">{book?.title}</p>}
                        </div>
                      </div>
                      <span className="text-[#9ca3af] text-sm flex-shrink-0">x{b.qty}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center justify-between mb-5 border-t border-[#2a2a45] pt-3">
              <span className="text-[#9ca3af] text-sm">Total</span>
              <span className="text-[#f0a500] font-bold text-xl">₹{total.toFixed(0)}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
              <button onClick={confirmSale} disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] disabled:opacity-50 text-white font-semibold text-sm transition-all">
                {submitting ? 'Recording...' : 'Confirm Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
