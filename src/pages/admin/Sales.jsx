import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Search, RotateCcw, ShoppingCart, Check, Plus, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { logAction } from '../../lib/audit'

export default function Sales() {
  const { profile } = useAuthStore()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Record Sale modal state
  const [recordOpen, setRecordOpen] = useState(false)
  const [books, setBooks] = useState([])
  const [bundles, setBundles] = useState([])
  const [stockMap, setStockMap] = useState({})
  const [stockEntries, setStockEntries] = useState([])
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [saleMedium, setSaleMedium] = useState('')
  const [selectedBooks, setSelectedBooks] = useState([])
  const [finalPrice, setFinalPrice] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [saleExamFilter, setSaleExamFilter] = useState('all')
  const [saleUnitFilter, setSaleUnitFilter] = useState('all')
  const [saleBookSearch, setSaleBookSearch] = useState('')

  const total = parseFloat(finalPrice) || 0

  useEffect(() => { fetchSales() }, [])

  async function fetchSales() {
    setLoading(true)
    const { data } = await supabase.from('sales')
      .select('*, books(title, exam_level, unit, part), users!sales_sold_by_fkey(name)')
      .order('sold_at', { ascending: false })
    setSales(data || []); setLoading(false)
  }

  async function handleReturn(sale) {
    const { error } = await supabase.from('sales').update({
      is_returned: true, return_handled_by: profile?.id, returned_at: new Date().toISOString()
    }).eq('id', sale.id)
    if (error) { toast.error('Failed'); return }
    toast.success('Sale marked as returned')
    logAction('SALE_RETURNED', `${sale.books?.title} — ${sale.buyer_name} (${sale.buyer_phone || 'no phone'})`)
    fetchSales()
  }

  async function openRecordSale() {
    const [{ data: booksData }, { data: bundlesData }, { data: stockData }] = await Promise.all([
      supabase.from('books').select('*').eq('is_active', true).order('title'),
      supabase.from('bundles').select('*, bundle_books(book_id)').eq('is_active', true),
      supabase.from('stock').select('id, book_id, available_qty, location')
    ])
    setBooks(booksData || [])
    setBundles(bundlesData || [])
    setStockEntries(stockData || [])
    const map = {}
    for (const s of (stockData || [])) map[s.book_id] = (map[s.book_id] || 0) + (s.available_qty || 0)
    setStockMap(map)
    setBuyerName(''); setBuyerPhone(''); setSaleMedium(''); setSelectedBooks([]); setFinalPrice('')
    setSaleExamFilter('all'); setSaleUnitFilter('all'); setSaleBookSearch('')
    setRecordOpen(true)
  }

  function toggleBook(bookId) {
    setSelectedBooks(prev => prev.find(b => b.id === bookId)
      ? prev.filter(b => b.id !== bookId)
      : [...prev, { id: bookId, qty: 1 }])
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

  async function handleRecordSubmit() {
    if (!buyerName.trim()) { toast.error('Buyer name is required'); return }
    if (!saleMedium) { toast.error('Select a medium'); return }
    if (selectedBooks.length === 0) { toast.error('Select at least one book'); return }
    for (const b of selectedBooks) {
      if ((parseInt(b.qty) || 0) < 1) { toast.error('Qty must be at least 1 for all books'); return }
    }
    setConfirmOpen(true)
  }

  async function confirmSale() {
    setConfirmOpen(false); setRecording(true)
    const now = new Date().toISOString()
    const saleRows = selectedBooks.map((b, i) => ({
      buyer_name: buyerName.trim(), buyer_phone: buyerPhone.trim() || null,
      book_id: b.id, qty: parseInt(b.qty) || 1,
      total_price: i === 0 ? (parseFloat(finalPrice) || null) : null,
      sold_by: profile?.id, sold_at: now, is_returned: false
    }))
    const { error } = await supabase.from('sales').insert(saleRows)
    if (error) { toast.error('Failed to record sale'); setRecording(false); return }
    for (const b of selectedBooks) {
      let remaining = parseInt(b.qty) || 1
      const entries = stockEntries.filter(e => e.book_id === b.id && (e.available_qty || 0) > 0)
        .sort((a, c) => c.available_qty - a.available_qty)
      for (const entry of entries) {
        if (remaining <= 0) break
        const deduct = Math.min(remaining, entry.available_qty)
        await supabase.from('stock').update({ available_qty: entry.available_qty - deduct }).eq('id', entry.id)
        remaining -= deduct
      }
    }
    const summary = selectedBooks.map(b => `${books.find(bk => bk.id === b.id)?.title} x${b.qty}`).join(', ')
    logAction('SALE_RECORDED', `${buyerName.trim()} (${buyerPhone || 'no phone'}) — ${summary} — ₹${total.toFixed(0)}`)
    toast.success(`Sale recorded — ${selectedBooks.length} book(s)`)
    setRecordOpen(false); setRecording(false); setFinalPrice('')
    fetchSales()
  }

  const filtered = sales.filter(s =>
    s.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.books?.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.buyer_phone?.includes(search)
  )

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Sales</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{sales.length} total sales</p>
        </div>
        <button onClick={openRecordSale}
          className="flex items-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
          <Plus size={15} /> Record Sale
        </button>
      </div>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by buyer name, phone or book..."
          className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
      </div>

      {/* Desktop table */}
      <div className="mob-table bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-[#2a2a45]">
              {['BUYER','BOOK','QTY','PRICE','SOLD BY','DATE','STATUS','ACTIONS'].map(h=>(
                <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a45]">
            {loading ? [...Array(4)].map((_,i)=>(
              <tr key={i}>{[...Array(8)].map((_,j)=>(
                <td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse"/></td>
              ))}</tr>
            )) : filtered.length===0 ? (
              <tr><td colSpan={8} className="text-center text-[#6b7280] py-10 text-sm">No sales found</td></tr>
            ) : filtered.map(s=>(
              <tr key={s.id} className={`hover:bg-[#12121f] transition-colors ${s.is_returned?'opacity-50':''}`}>
                <td className="px-5 py-3"><p className="text-white text-sm font-medium">{s.buyer_name}</p><p className="text-[#6b7280] text-xs">{s.buyer_phone}</p></td>
                <td className="px-5 py-3">
                  {(s.books?.exam_level||s.books?.unit||s.books?.part) ? (
                    <>
                      <p className="text-white text-sm font-semibold">{[s.books?.exam_level,s.books?.unit,s.books?.part].filter(Boolean).join(' › ')}</p>
                      <p className="text-[#6b7280] text-xs truncate">{s.books?.title}</p>
                    </>
                  ) : (
                    <p className="text-[#9ca3af] text-sm">{s.books?.title}</p>
                  )}
                </td>
                <td className="px-5 py-3 text-white text-sm">{s.qty}</td>
                <td className="px-5 py-3 text-[#f0a500] text-sm font-medium">₹{s.total_price}</td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm">{s.users?.name||'—'}</td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm">{format(new Date(s.sold_at),'dd MMM yy')}</td>
                <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${s.is_returned?'bg-red-500/20 text-red-400 border-red-500/30':'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>{s.is_returned?'Returned':'Sold'}</span></td>
                <td className="px-5 py-3">{!s.is_returned&&<button onClick={()=>handleReturn(s)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-red-500/20 hover:text-red-400 text-[#9ca3af] transition-all"><RotateCcw size={12}/>Return</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mob-cards space-y-3">
        {loading ? [...Array(4)].map((_,i)=>(
          <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 animate-pulse h-24"/>
        )) : filtered.length===0 ? (
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-6 text-center text-[#6b7280] text-sm">No sales found</div>
        ) : filtered.map(s=>(
          <div key={s.id} className={`bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 ${s.is_returned?'opacity-50':''}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-white font-semibold text-sm">{s.buyer_name}</p>
                <p className="text-[#6b7280] text-xs">{s.buyer_phone}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${s.is_returned?'bg-red-500/20 text-red-400 border-red-500/30':'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>{s.is_returned?'Returned':'Sold'}</span>
            </div>
            {(s.books?.exam_level||s.books?.unit||s.books?.part) ? (
              <>
                <p className="text-white text-sm font-semibold">{[s.books?.exam_level,s.books?.unit,s.books?.part].filter(Boolean).join(' › ')}</p>
                <p className="text-[#6b7280] text-xs truncate mb-1">{s.books?.title}</p>
              </>
            ) : (
              <p className="text-[#9ca3af] text-sm mb-1">{s.books?.title}</p>
            )}
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#6b7280] text-xs">qty {s.qty} · by {s.users?.name||'—'} · {format(new Date(s.sold_at),'dd MMM yy')}</p>
              <p className="text-[#f0a500] text-sm font-semibold">₹{s.total_price}</p>
            </div>
            {!s.is_returned&&<button onClick={()=>handleReturn(s)} className="w-full flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-lg bg-[#2a2a45] hover:bg-red-500/20 hover:text-red-400 text-[#9ca3af] transition-all"><RotateCcw size={12}/>Mark as Returned</button>}
          </div>
        ))}
      </div>
      {/* Record Sale Modal */}
      {recordOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-white font-semibold text-lg mb-5">Record Sale</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#9ca3af] text-xs mb-1 block">Buyer Name *</label>
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
                    <button key={m} type="button" onClick={() => { setSaleMedium(m); setSelectedBooks([]); setSaleExamFilter('all'); setSaleUnitFilter('all'); setSaleBookSearch('') }}
                      className={`py-2 rounded-lg border text-sm font-medium capitalize transition-all ${saleMedium === m ? 'bg-[#bd0a0a] border-[#bd0a0a] text-white' : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] hover:border-[#bd0a0a]'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {saleMedium && bundles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[#9ca3af] text-xs font-medium">Quick Select — Bundles</p>
                  <div className="flex flex-wrap gap-2">
                    {bundles.map(b => {
                      const count = b.bundle_books?.filter(bb => {
                        const m = books.find(bk => bk.id === bb.book_id)?.medium
                        return m === saleMedium || m === 'both'
                      }).length ?? 0
                      return (
                        <button key={b.id} type="button" onClick={() => selectBundle(b)}
                          className="flex items-center gap-2 px-3 py-2 bg-[#12121f] border border-[#2a2a45] hover:border-[#f0a500] rounded-lg text-sm text-white transition-all">
                          <Package size={13} className="text-[#f0a500]" />
                          {b.name}
                          <span className="text-[#6b7280] text-xs">({count})</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {saleMedium && (() => {
                const saleBooks = books.filter(b => b.medium === saleMedium || b.medium === 'both')
                const saleExamOptions = [...new Set(saleBooks.map(b => b.exam_level).filter(Boolean))].sort()
                const saleUnitOptions = [...new Set(saleBooks.filter(b => saleExamFilter === 'all' || b.exam_level === saleExamFilter).map(b => b.unit).filter(Boolean))].sort()
                const visibleSaleBooks = saleBooks.filter(b =>
                  (saleExamFilter === 'all' || b.exam_level === saleExamFilter) &&
                  (saleUnitFilter === 'all' || b.unit === saleUnitFilter) &&
                  (!saleBookSearch.trim() || b.title?.toLowerCase().includes(saleBookSearch.toLowerCase()) ||
                    b.exam_level?.toLowerCase().includes(saleBookSearch.toLowerCase()) ||
                    b.unit?.toLowerCase().includes(saleBookSearch.toLowerCase()))
                )
                return (
                  <div className="space-y-3">
                    <p className="text-[#9ca3af] text-xs capitalize">{saleMedium} Books <span className="text-[#6b7280]">({selectedBooks.length} selected)</span></p>
                    {saleExamOptions.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {['all', ...saleExamOptions].map(e => (
                            <button key={e} type="button" onClick={() => { setSaleExamFilter(e); setSaleUnitFilter('all') }}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all capitalize ${saleExamFilter === e ? 'bg-[#bd0a0a] border-[#bd0a0a] text-white' : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] hover:text-white'}`}>
                              {e === 'all' ? 'All Exams' : e}
                            </button>
                          ))}
                        </div>
                        {saleUnitOptions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {['all', ...saleUnitOptions].map(u => (
                              <button key={u} type="button" onClick={() => setSaleUnitFilter(u)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all capitalize ${saleUnitFilter === u ? 'bg-[#f0a500] border-[#f0a500] text-black' : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] hover:text-white'}`}>
                                {u === 'all' ? 'All Units' : u}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
                      <input value={saleBookSearch} onChange={e => setSaleBookSearch(e.target.value)} placeholder="Search books..."
                        className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {visibleSaleBooks.length === 0 ? (
                        <p className="text-[#6b7280] text-sm text-center py-4">No books match this filter</p>
                      ) : visibleSaleBooks.map(b => {
                        const avail = stockMap[b.id] || 0
                        const sel = selectedBooks.find(s => s.id === b.id)
                        return (
                          <div key={b.id}>
                            <label className={`flex items-center gap-3 px-3 py-3 rounded-lg border transition-all cursor-pointer ${sel ? 'bg-[#bd0a0a]/20 border-[#bd0a0a]/40' : 'bg-[#12121f] border-[#2a2a45] hover:border-[#3a3a55]'}`}>
                              <input type="checkbox" checked={!!sel} onChange={() => toggleBook(b.id)} className="accent-[#bd0a0a] w-4 h-4 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                {(b.exam_level||b.unit||b.part) ? (
                                  <>
                                    <p className="text-white text-sm font-semibold">{[b.exam_level,b.unit,b.part].filter(Boolean).join(' › ')}</p>
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
                              <div className="mt-1 px-1 pb-1 w-32">
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
                <div className="space-y-2 border-t border-[#2a2a45] pt-3">
                  <div>
                    <label className="text-[#9ca3af] text-xs mb-1.5 block">Final Price (₹)</label>
                    <input type="number" min="0" value={finalPrice} placeholder="Enter total amount charged"
                      onChange={e => setFinalPrice(e.target.value)}
                      className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#f0a500] placeholder-[#4b5563]" />
                  </div>
                  {finalPrice && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#9ca3af] text-sm">Total</span>
                      <span className="text-[#f0a500] font-bold text-lg">₹{parseFloat(finalPrice).toFixed(0)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setRecordOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
              <button onClick={handleRecordSubmit} disabled={recording}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] disabled:opacity-50 text-white font-semibold text-sm transition-all">
                <ShoppingCart size={14} /> Record Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Sale Modal */}
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
                      <span className="text-[#6b7280] text-xs flex-shrink-0">x{b.qty}</span>
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
              <button onClick={confirmSale} disabled={recording}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] disabled:opacity-50 text-white font-semibold text-sm transition-all">
                {recording ? 'Recording...' : 'Confirm Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}