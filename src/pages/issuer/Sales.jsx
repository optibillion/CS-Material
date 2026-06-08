import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Check, ShoppingCart } from 'lucide-react'
import { logAction } from '../../lib/audit'

export default function IssuerSales() {
  const { profile } = useAuthStore()
  const [books, setBooks] = useState([])
  const [stockMap, setStockMap] = useState({})
  const [stockEntries, setStockEntries] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [saleMedium, setSaleMedium] = useState('')
  const [selectedBooks, setSelectedBooks] = useState([]) // [{id, qty, price}]

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: booksData }, { data: stockData }, { data: salesData }] = await Promise.all([
      supabase.from('books').select('*').eq('is_active', true).order('title'),
      supabase.from('stock').select('id, book_id, available_qty, location'),
      supabase.from('sales').select('*, books(title)')
        .eq('sold_by', profile?.id).order('sold_at', { ascending: false }).limit(20)
    ])
    setBooks(booksData || [])
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
      return [...prev, { id: bookId, qty: 1, price: '' }]
    })
  }

  function updateBook(bookId, field, value) {
    setSelectedBooks(prev => prev.map(b => b.id === bookId ? { ...b, [field]: value } : b))
  }

  const total = selectedBooks.reduce((sum, b) => sum + (parseFloat(b.price) || 0) * (parseInt(b.qty) || 1), 0)

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
    const saleRows = selectedBooks.map(b => ({
      buyer_name: buyerName.trim(),
      buyer_phone: buyerPhone.trim() || null,
      book_id: b.id,
      qty: parseInt(b.qty) || 1,
      total_price: (parseFloat(b.price) || 0) * (parseInt(b.qty) || 1) || null,
      sold_by: profile?.id,
      sold_at: new Date().toISOString(),
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
    setBuyerName(''); setBuyerPhone(''); setSaleMedium(''); setSelectedBooks([])
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
              <button key={m} type="button" onClick={() => { setSaleMedium(m); setSelectedBooks([]) }}
                className={`py-2.5 rounded-lg border text-sm font-medium capitalize transition-all ${saleMedium === m ? 'bg-[#bd0a0a] border-[#bd0a0a] text-white' : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] hover:border-[#bd0a0a]'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Book Selection */}
      {saleMedium && (
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 space-y-3">
        <p className="text-white font-semibold text-sm">Select Books <span className="text-[#6b7280] font-normal capitalize">({saleMedium} · {selectedBooks.length} selected)</span></p>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {books.filter(b => b.medium === saleMedium).map(b => {
            const avail = stockMap[b.id] || 0
            const sel = selectedBooks.find(s => s.id === b.id)
            return (
              <div key={b.id}>
                <label className={`flex items-center gap-3 px-3 py-3 rounded-lg border transition-all cursor-pointer ${sel ? 'bg-[#bd0a0a]/20 border-[#bd0a0a]/40' : 'bg-[#12121f] border-[#2a2a45] hover:border-[#3a3a55]'}`}>
                  <input type="checkbox" checked={!!sel} onChange={() => toggleBook(b.id)} className="accent-[#bd0a0a] w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">{b.title}</p>
                    <p className="text-[#6b7280] text-xs mt-0.5">{b.category?.replace('_', ' ')} · {b.medium}</p>
                  </div>
                  <span className={`text-xs flex-shrink-0 font-medium ${avail > 5 ? 'text-emerald-400' : avail > 0 ? 'text-yellow-400' : 'text-[#6b7280]'}`}>
                    {avail} avail
                  </span>
                </label>
                {sel && (
                  <div className="grid grid-cols-2 gap-2 mt-1.5 px-1 pb-1">
                    <div>
                      <label className="text-[#9ca3af] text-xs mb-1 block">Qty</label>
                      <input type="number" min="1" value={sel.qty}
                        onChange={e => updateBook(b.id, 'qty', e.target.value)}
                        className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
                    </div>
                    <div>
                      <label className="text-[#9ca3af] text-xs mb-1 block">Price per book (₹)</label>
                      <input type="number" min="0" value={sel.price} placeholder="0"
                        onChange={e => updateBook(b.id, 'price', e.target.value)}
                        className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      )}

      {selectedBooks.length > 0 && (
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-white font-semibold text-sm">Total Amount</p>
            <p className="text-[#f0a500] font-bold text-xl">₹{total.toFixed(0)}</p>
          </div>
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
                  <p className="text-white text-sm font-medium">{s.books?.title}</p>
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
                  const lineTotal = (parseFloat(b.price) || 0) * (parseInt(b.qty) || 1)
                  return (
                    <div key={b.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check size={13} className="text-emerald-400 flex-shrink-0" />
                        <span className="text-white text-sm">{book?.title}</span>
                      </div>
                      <span className="text-[#9ca3af] text-sm flex-shrink-0">x{b.qty} · ₹{lineTotal}</span>
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
