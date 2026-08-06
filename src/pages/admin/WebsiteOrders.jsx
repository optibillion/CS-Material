import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Globe, MapPin, Phone, Mail, Package, X, CreditCard, User } from 'lucide-react'
import { format } from 'date-fns'

function safeFormat(dateStr, fmt) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? '—' : format(d, fmt)
}

function StatusBadge({ status }) {
  const isPaid = (status || 'PAID').toUpperCase() === 'PAID'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${
      isPaid ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    }`}>
      {status || 'PAID'}
    </span>
  )
}

function Section({ icon: Icon, label, children }) {
  return (
    <div className="mt-4 pt-4 border-t border-[#2a2a45] first:mt-0 first:pt-0 first:border-t-0">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} className="text-[#6b7280]" />
        <p className="text-[#6b7280] text-[10px] font-semibold uppercase tracking-wide">{label}</p>
      </div>
      {children}
    </div>
  )
}

function OrderDetailModal({ order, onClose }) {
  if (!order) return null
  const address = [order.house, order.locality, order.city, order.district, order.state, order.pincode].filter(Boolean).join(', ')

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#2a2a45] flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-white font-bold text-lg">#{order.cs_order_id}</h2>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-[#6b7280] text-xs mt-1">{safeFormat(order.order_date, 'dd MMM yyyy, hh:mm a')}</p>
          </div>
          <div className="flex items-start gap-3">
            {order.amount != null && <span className="text-[#f0a500] font-bold text-xl">₹{Number(order.amount).toLocaleString('en-IN')}</span>}
            <button onClick={onClose} className="text-[#6b7280] hover:text-white p-1 -mt-1"><X size={18} /></button>
          </div>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-0">
          <Section icon={Package} label="Product">
            <p className="text-white text-sm font-medium leading-snug">{order.product_name}</p>
          </Section>

          {order.books_ordered && (
            <Section icon={Package} label="Books Ordered">
              <div className="bg-[#12121f] border border-[#2a2a45] rounded-lg p-3 space-y-1">
                {order.books_ordered.split('\n').filter(Boolean).map((line, i) => (
                  <p key={i} className="text-[#9ca3af] text-xs leading-relaxed">{line}</p>
                ))}
              </div>
            </Section>
          )}

          <Section icon={User} label="Customer">
            <p className="text-white text-sm font-medium">{order.buyer_name || 'Unknown'}</p>
            <div className="flex flex-col gap-1 mt-1.5">
              {order.phone && (
                <a href={`tel:${order.phone}`} className="text-[#9ca3af] hover:text-white text-xs flex items-center gap-1.5 w-fit">
                  <Phone size={11} />{order.phone}
                </a>
              )}
              {order.email && (
                <a href={`mailto:${order.email}`} className="text-[#9ca3af] hover:text-white text-xs flex items-center gap-1.5 w-fit break-all">
                  <Mail size={11} />{order.email}
                </a>
              )}
            </div>
          </Section>

          {address && (
            <Section icon={MapPin} label="Shipping Address">
              <p className="text-[#9ca3af] text-sm leading-relaxed">{address}</p>
            </Section>
          )}

          <Section icon={CreditCard} label="Payment">
            <div className="space-y-1">
              <p className="text-[#6b7280] text-xs">Razorpay Order <span className="text-[#9ca3af] font-mono">{order.razorpay_order_id || '—'}</span></p>
              <p className="text-[#6b7280] text-xs">Payment ID <span className="text-[#9ca3af] font-mono">{order.razorpay_payment_id || '—'}</span></p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

export default function WebsiteOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)

  const today = new Date().toISOString().slice(0, 10)
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [showAll, setShowAll] = useState(true)

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
    if (!showAll) {
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
  }), [orders, search, dateFrom, dateTo, showAll])

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
        <button onClick={() => setShowAll(a => !a)}
          className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all ${showAll ? 'bg-[#bd0a0a] border-[#bd0a0a] text-white' : 'bg-[#2a2a45] border-[#2a2a45] text-[#9ca3af] hover:text-white'}`}>
          All
        </button>
        <input type="date" lang="en-GB" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-[#1a1a2e] border border-[#2a2a45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
        <span className="text-[#6b7280] text-xs">to</span>
        <input type="date" lang="en-GB" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="bg-[#1a1a2e] border border-[#2a2a45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
        <button onClick={() => { setDateFrom(today); setDateTo(today); setShowAll(false) }}
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

      <div className="space-y-2.5">
        {loading ? [...Array(3)].map((_, i) => (
          <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 animate-pulse h-20" />
        )) : filtered.length === 0 ? (
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-10 text-center text-[#6b7280] text-sm">
            No website orders {orders.length === 0 ? 'yet — new paid orders on the website will appear here automatically' : 'match this filter'}
          </div>
        ) : filtered.map(o => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSelectedOrder(o)}
            className="w-full text-left bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 hover:border-[#3a3a55] active:opacity-70 transition-all touch-manipulation"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold text-sm truncate">{o.buyer_name || 'Unknown'}</p>
                  <span className="text-[#4b5563] text-xs flex-shrink-0">#{o.cs_order_id}</span>
                </div>
                <p className="text-[#9ca3af] text-xs mt-1 truncate">{o.product_name}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {o.phone && <span className="text-[#6b7280] text-xs flex items-center gap-1"><Phone size={10} />{o.phone}</span>}
                  <span className="text-[#4b5563] text-xs">{safeFormat(o.order_date, 'dd MMM yy, hh:mm a')}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <StatusBadge status={o.status} />
                {o.amount != null && <span className="text-[#f0a500] font-bold text-sm whitespace-nowrap">₹{Number(o.amount).toLocaleString('en-IN')}</span>}
              </div>
            </div>
          </button>
        ))}
      </div>

      <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  )
}
