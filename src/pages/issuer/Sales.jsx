import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Check, ShoppingCart, Package, Search } from 'lucide-react'
import { logAction } from '../../lib/audit'

export default function IssuerSales() {
  const { profile } = useAuthStore()
  const [books, setBooks] = useState([])
  const [bundles, setBundles] = useState([])
  const [stockMap, setStockMap] = useState({})
  const [stockEntries, setStockEntries] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [saleMedium, setSaleMedium] = useState('')
  const [selectedBooks, setSelectedBooks] = useState([]) // [{id, qty}]
  const [finalPrice, setFinalPrice] = useState('')
  const [examFilter, setExamFilter] = useState('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [bookSearch, setBookSearch] = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: booksData }, { data: bundlesData }, { data: stockData }, { data: salesData }] = await Promise.all([
      supabase.from('books').select('*').eq('is_active', true).order('title'),
      supabase.from('bundles').select('*, bundle_books(book_id)').eq('is_active', true),
      supabase.from('stock').select('id, book_id, available_qty, location'),
      supabase.from('sales').select('*, books(title, exam_level, unit, part)')
        .eq('sold_by', profile?.id).order('sold_at', { ascending: false }).limit(20)
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
    setLoading(true)
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
    if (error) { toast.error('Failed to record sale'); setLoading(false); return }
    for (const b of selectedBooks) {
      await deductStock(b.id, parseInt(b.qty) || 1)
    }
    const summary = selectedBooks.map(b => `${books.find(bk => bk.id === b.id)?.title} x${b.qty}`).join(', ')
    logAction('SALE_RECORDED', `${buyerName.trim()} (${buyerPhone || 'no phone'}) — ${summary} — ₹${total.toFixed(0)}`)
    toast.success(`Sale recorded — ${selectedBooks.length} book(s) sold to ${buyerName}`)
    setBuyerName(''); setBuyerPhone(''); setSaleMedium(''); setSelectedBooks([]); setFinalPrice('')
    fetchData()
    setLoading(false)
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
                        {(b.exam_level || b.unit || b.part) ? (
                          <>
                            <p className="text-white text-sm font-semibold">{[b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')}</p>
                            <p className="text-[#6b7280] text-xs truncate">{b.title}</p>
                          </>
                        ) : (
                          <p className="text-white text-sm">{b.title}</p>
                        )}
                        <p className="text-[#6b7280] text-xs">{b.category?.replace('_', ' ')} · {b.medium}</p>
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
          <button onClick={handleSubmit} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-sm transition-all">
            <ShoppingCart size={16} /> Record Sale — {selectedBooks.length} Book(s)
          </button>
        </div>
      )}

      {/* Recent Sales */}
      {sales.length > 0 && (
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl">
          <div className="px-5 py-4 border-b border-[#2a2a45]">
            <h2 className="text-white font-semibold text-sm">My Recent Sales</h2>
          </div>
          <div className="divide-y divide-[#2a2a45]">
            {sales.map(s => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  {(s.books?.exam_level||s.books?.unit||s.books?.part) ? (
                    <>
                      <p className="text-white text-sm font-semibold">{[s.books?.exam_level,s.books?.unit,s.books?.part].filter(Boolean).join(' › ')}</p>
                      <p className="text-[#6b7280] text-xs truncate">{s.books?.title}</p>
                    </>
                  ) : (
                    <p className="text-white text-sm font-medium">{s.books?.title}</p>
                  )}
                  <p className="text-[#6b7280] text-xs">{s.buyer_name} · qty {s.qty}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#f0a500] text-sm font-medium">₹{s.total_price || '—'}</p>
                  <p className="text-[#6b7280] text-xs">{format(new Date(s.sold_at), 'dd MMM, hh:mm a')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                          {(book?.exam_level||book?.unit||book?.part) ? (
                            <>
                              <p className="text-white text-sm font-semibold">{[book?.exam_level,book?.unit,book?.part].filter(Boolean).join(' › ')}</p>
                              <p className="text-[#6b7280] text-xs truncate">{book?.title}</p>
                            </>
                          ) : (
                            <p className="text-white text-sm">{book?.title}</p>
                          )}
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
              <button onClick={confirmSale} disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] disabled:opacity-50 text-white font-semibold text-sm transition-all">
                {loading ? 'Recording...' : 'Confirm Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
