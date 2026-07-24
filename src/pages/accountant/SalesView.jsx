import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Check, Receipt } from 'lucide-react'
import { format } from 'date-fns'
import ReceiptModal from '../../components/ReceiptModal'

export default function SalesView() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedTxns, setExpandedTxns] = useState({})
  const [receiptData, setReceiptData] = useState(null)

  const today = new Date().toISOString().slice(0, 10)
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => { fetchSales() }, [])

  async function fetchSales() {
    setLoading(true)
    const { data } = await supabase.from('sales')
      .select('*, books(title, exam_level, unit, part), users!sales_sold_by_fkey(name)')
      .order('sold_at', { ascending: false })
    setSales(data || [])
    setLoading(false)
  }

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
          payment_mode: s.payment_mode || 'cash',
          books: [],
          ids: [],
          all_returned: true,
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
    if (!showAll) {
      const txnDate = t.sold_at.slice(0, 10)
      if (dateFrom && txnDate < dateFrom) return false
      if (dateTo && txnDate > dateTo) return false
    }
    const q = search.toLowerCase()
    return !q || (
      t.buyer_name?.toLowerCase().includes(q) ||
      t.buyer_phone?.includes(search) ||
      t.sold_by_name?.toLowerCase().includes(q) ||
      t.books.some(b => b.title?.toLowerCase().includes(q))
    )
  })

  const activeTxns = filteredTxns.filter(t => !t.all_returned)
  const dayTotalQty = activeTxns.reduce((s, t) => s + t.books.reduce((bs, b) => bs + (b.qty || 1), 0), 0)
  const dayTotalRevenue = activeTxns.reduce((s, t) => s + (parseFloat(t.total_price) || 0), 0)
  const cashRevenue = activeTxns.filter(t => t.payment_mode !== 'online').reduce((s, t) => s + (parseFloat(t.total_price) || 0), 0)
  const onlineRevenue = activeTxns.filter(t => t.payment_mode === 'online').reduce((s, t) => s + (parseFloat(t.total_price) || 0), 0)

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-white text-2xl font-bold">Sales History</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">{transactions.length} total transactions</p>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowAll(a => !a)}
          className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all ${showAll ? 'bg-[#bd0a0a] border-[#bd0a0a] text-white' : 'bg-[#2a2a45] border-[#2a2a45] text-[#9ca3af] hover:text-white'}`}>
          All
        </button>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-[#1a1a2e] border border-[#2a2a45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
        <span className="text-[#6b7280] text-xs">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="bg-[#1a1a2e] border border-[#2a2a45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
        {(dateFrom !== today || dateTo !== today) && (
          <button onClick={() => { setDateFrom(today); setDateTo(today) }}
            className="text-xs px-3 py-2 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] hover:text-white transition-all">
            Today
          </button>
        )}
      </div>

      {/* Day summary */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs">Transactions</p>
            <p className="text-white text-2xl font-bold mt-0.5">{filteredTxns.length}</p>
          </div>
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs">Books Sold</p>
            <p className="text-white text-2xl font-bold mt-0.5">{dayTotalQty}</p>
          </div>
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs">Revenue</p>
            <p className="text-[#f0a500] text-2xl font-bold mt-0.5">₹{dayTotalRevenue.toFixed(0)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[#6b7280] text-xs">Cash</p>
              <p className="text-white text-xl font-bold mt-0.5">₹{cashRevenue.toFixed(0)}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#2a2a45] text-[#9ca3af] border border-[#2a2a45]">Cash</span>
          </div>
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[#6b7280] text-xs">Online</p>
              <p className="text-white text-xl font-bold mt-0.5">₹{onlineRevenue.toFixed(0)}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Online</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by buyer name, phone or book..."
          className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
      </div>

      <div className="space-y-3">
        {loading ? [...Array(3)].map((_, i) => (
          <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 animate-pulse h-28" />
        )) : filteredTxns.length === 0 ? (
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-10 text-center text-[#6b7280] text-sm">No sales found</div>
        ) : filteredTxns.map(txn => (
          <div key={txn.key} className={`bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 ${txn.all_returned ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-1">
              <div className="min-w-0 flex-1">
                <p className="text-white font-semibold text-sm">{txn.buyer_name}</p>
                {txn.buyer_phone && <p className="text-[#6b7280] text-xs">{txn.buyer_phone}</p>}
                <p className="text-[#4b5563] text-xs mt-0.5">by {txn.sold_by_name || '—'} · {format(new Date(txn.sold_at), 'dd MMM yy, hh:mm a')}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3 flex-wrap justify-end">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${txn.payment_mode === 'online' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-[#2a2a45] text-[#9ca3af] border-[#2a2a45]'}`}>
                  {txn.payment_mode === 'online' ? 'Online' : 'Cash'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${txn.all_returned ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                  {txn.all_returned ? 'Returned' : 'Sold'}
                </span>
                {txn.total_price && <span className="text-[#f0a500] font-bold text-sm whitespace-nowrap">₹{txn.total_price}</span>}
              </div>
            </div>

            {(() => {
              const isExp = !!expandedTxns[txn.key]
              const shown = isExp ? txn.books : txn.books.slice(0, 4)
              return (
                <>
                  <div className="mt-3 border-t border-[#2a2a45] divide-y divide-[#2a2a45]">
                    {shown.map((b, i) => (
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
                  {txn.books.length > 4 && (
                    <button onClick={() => setExpandedTxns(prev => ({ ...prev, [txn.key]: !isExp }))}
                      className="mt-1 text-[#6b7280] hover:text-white text-xs w-full text-center py-1 transition-colors">
                      {isExp ? 'Show less' : `+${txn.books.length - 4} more books`}
                    </button>
                  )}
                </>
              )
            })()}

            <div className="mt-3 pt-3 border-t border-[#2a2a45]">
              <button
                onClick={() => setReceiptData({ buyer_name: txn.buyer_name, buyer_phone: txn.buyer_phone, books: txn.books, total_price: txn.total_price, sold_at: txn.sold_at, sold_by_name: txn.sold_by_name, payment_mode: txn.payment_mode })}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white text-xs font-medium transition-all">
                <Receipt size={13} /> View Receipt
              </button>
            </div>
          </div>
        ))}
      </div>

      <ReceiptModal data={receiptData} onClose={() => setReceiptData(null)} />
    </div>
  )
}
