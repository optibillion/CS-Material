import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Globe, MapPin, Phone, Package } from 'lucide-react'
import { format } from 'date-fns'

export default function WebsiteOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({})

  const today = new Date().toISOString().slice(0, 10)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  async function fetchOrders() {
    setLoading(true)
    const { data } = await supabase.from('website_orders')
      .select('*')
      .order('order_date', { ascending: false })
      .limit(1000)
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [])

  const filtered = useMemo(() => orders.filter(o => {
    if (dateFrom || dateTo) {
      const d = (o.order_date || o.created_at || '').slice(0, 10)
      if (dateFrom && d < dateFrom) return false
      if (dateTo && d > dateTo) return false
    }
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      o.buyer_name?.toLowerCase().includes(q) ||
      o.phone?.includes(search) ||
      o.email?.toLowerCase().includes(q) ||
      o.product_name?.toLowerCase().includes(q) ||
      o.cs_order_id?.toLowerCase().includes(q) ||
      o.city?.toLowerCase().includes(q) ||
      o.pincode?.includes(search)
    )
  }), [orders, search, dateFrom, dateTo])

  const totalRevenue = filtered.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0)

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Website Orders</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Live orders from championsquareias.com — synced automatically on payment</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input type="date" lang="en-GB" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-[#1a1a2e] border border-[#2a2a45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
        <span className="text-[#6b7280] text-xs">to</span>
        <input type="date" lang="en-GB" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="bg-[#1a1a2e] border border-[#2a2a45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo('') }}
            className="text-xs px-3 py-2 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] hover:text-white transition-all">
            Clear
          </button>
        )}
        <button onClick={() => { setDateFrom(today); setDateTo(today) }}
          className="text-xs px-3 py-2 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] hover:text-white transition-all">
          Today
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs">Orders</p>
          <p className="text-white text-2xl font-bold mt-0.5">{filtered.length}</p>
        </div>
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs">Revenue</p>
          <p className="text-[#f0a500] text-2xl font-bold mt-0.5">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, email, order ID, city or pincode..."
          className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
      </div>

      <div className="space-y-3">
        {loading ? [...Array(3)].map((_, i) => (
          <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 animate-pulse h-28" />
        )) : filtered.length === 0 ? (
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-10 text-center text-[#6b7280] text-sm">
            No website orders {orders.length === 0 ? 'yet — new paid orders on the website will appear here automatically' : 'match this filter'}
          </div>
        ) : filtered.map(o => {
          const isExp = !!expanded[o.id]
          const address = [o.house, o.locality, o.city, o.district, o.state, o.pincode].filter(Boolean).join(', ')
          return (
            <div key={o.id} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
              <div className="flex items-start justify-between mb-1 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold text-sm">{o.buyer_name || 'Unknown'}</p>
                    <span className="text-[#4b5563] text-xs">#{o.cs_order_id}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {o.phone && <span className="text-[#6b7280] text-xs flex items-center gap-1"><Phone size={11} />{o.phone}</span>}
                    {o.email && <span className="text-[#6b7280] text-xs">{o.email}</span>}
                  </div>
                  <p className="text-[#4b5563] text-xs mt-0.5">
                    {o.order_date ? format(new Date(o.order_date), 'dd MMM yy, hh:mm a') : '—'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-emerald-500/20 text-emerald-400 border-emerald-500/30 whitespace-nowrap">
                    {o.status || 'PAID'}
                  </span>
                  {o.amount != null && <span className="text-[#f0a500] font-bold text-sm whitespace-nowrap">₹{Number(o.amount).toLocaleString('en-IN')}</span>}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[#2a2a45] flex items-start gap-2">
                <Package size={13} className="text-[#bd0a0a] flex-shrink-0 mt-0.5" />
                <p className="text-white text-sm font-medium leading-snug">{o.product_name}</p>
              </div>

              {address && (
                <div className="mt-2 flex items-start gap-2">
                  <MapPin size={13} className="text-[#6b7280] flex-shrink-0 mt-0.5" />
                  <p className="text-[#9ca3af] text-xs leading-snug">{address}</p>
                </div>
              )}

              {o.books_ordered && (
                <>
                  <button onClick={() => setExpanded(prev => ({ ...prev, [o.id]: !isExp }))}
                    className="mt-2 text-[#6b7280] hover:text-white text-xs transition-colors">
                    {isExp ? 'Hide book list' : 'Show book list'}
                  </button>
                  {isExp && (
                    <div className="mt-2 bg-[#12121f] border border-[#2a2a45] rounded-lg p-3">
                      {o.books_ordered.split('\n').map((line, i) => (
                        <p key={i} className="text-[#9ca3af] text-xs leading-relaxed">{line}</p>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="mt-2 flex items-center gap-1.5">
                <Globe size={11} className="text-[#4b5563]" />
                <span className="text-[#4b5563] text-[11px]">Razorpay {o.razorpay_payment_id}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
