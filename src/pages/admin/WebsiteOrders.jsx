import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, MapPin, Phone, Package, X, CreditCard, User, Truck, CheckSquare, Square, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'

function safeFormat(dateStr, fmt) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? '—' : format(d, fmt)
}

function fulfillmentStage(o) {
  if (o.delivered) return 2
  if (o.shipped) return 1
  return 0
}

function FulfillmentBadge({ order }) {
  const stage = fulfillmentStage(order)
  const meta = stage === 2
    ? { label: 'Delivered', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
    : stage === 1
    ? { label: 'Shipped', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
    : { label: 'New', cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' }
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${meta.cls}`}>{meta.label}</span>
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

function Field({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-[#6b7280] text-xs flex-shrink-0">{label}</span>
      <span className="text-[#e5e7eb] text-xs text-right break-words">{value}</span>
    </div>
  )
}

function OrderDetailModal({ order, onClose, onShip, onUnship, onDeliver, onDeleteRequest, readOnly }) {
  const [awbInput, setAwbInput] = useState('')
  const [showAwbInput, setShowAwbInput] = useState(false)

  useEffect(() => { setAwbInput(''); setShowAwbInput(false) }, [order?.id])

  if (!order) return null

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
              <FulfillmentBadge order={order} />
            </div>
            <p className="text-[#6b7280] text-xs mt-1">{safeFormat(order.order_date, 'dd MMM yyyy, hh:mm a')}</p>
          </div>
          <div className="flex items-start gap-3">
            {order.amount != null && <span className="text-[#f0a500] font-bold text-xl">₹{Number(order.amount).toLocaleString('en-IN')}</span>}
            <button onClick={onClose} className="text-[#6b7280] hover:text-white p-1 -mt-1"><X size={18} /></button>
          </div>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-0">
          <Section icon={Truck} label="Fulfillment">
            <div className="space-y-3">
              {order.shipped ? (
                <div className="flex items-start gap-2">
                  <CheckSquare size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">Shipped</p>
                    <p className="text-[#6b7280] text-xs mt-0.5 break-all">AWB / Tracking: <span className="text-[#9ca3af] font-mono">{order.shipped_awb || '—'}</span></p>
                    <p className="text-[#4b5563] text-xs mt-0.5">
                      {safeFormat(order.shipped_at, 'dd MMM yyyy, hh:mm a')}
                      {!readOnly && (
                        <>
                          {' · '}
                          <button onClick={() => onUnship(order)} className="text-[#6b7280] hover:text-red-400 underline">Undo</button>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ) : readOnly ? (
                <p className="text-[#9ca3af] text-sm">Not shipped yet</p>
              ) : (
                <div>
                  <button onClick={() => setShowAwbInput(true)}
                    className="flex items-center gap-2 text-sm text-[#9ca3af] hover:text-white transition-colors">
                    <Square size={16} /> Mark as Shipped
                  </button>
                  {showAwbInput && (
                    <div className="flex gap-2 mt-2 ml-6">
                      <input value={awbInput} onChange={e => setAwbInput(e.target.value)} placeholder="AWB number or tracking link" autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') onShip(order, awbInput) }}
                        className="flex-1 bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
                      <button onClick={() => onShip(order, awbInput)}
                        className="px-3 py-1.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white text-xs font-semibold transition-all">
                        Confirm
                      </button>
                    </div>
                  )}
                </div>
              )}

              {order.shipped && (
                readOnly ? (
                  <div className="flex items-center gap-2 text-sm">
                    {order.delivered ? <CheckSquare size={16} className="text-blue-400 flex-shrink-0" /> : <Square size={16} className="text-[#9ca3af] flex-shrink-0" />}
                    <span className={order.delivered ? 'text-white font-medium' : 'text-[#9ca3af]'}>Delivered</span>
                    {order.delivered && order.delivered_at && <span className="text-[#4b5563] text-xs">· {safeFormat(order.delivered_at, 'dd MMM yyyy, hh:mm a')}</span>}
                  </div>
                ) : (
                  <button onClick={() => onDeliver(order, !order.delivered)}
                    className="flex items-center gap-2 text-sm transition-colors">
                    {order.delivered ? <CheckSquare size={16} className="text-blue-400 flex-shrink-0" /> : <Square size={16} className="text-[#9ca3af] flex-shrink-0" />}
                    <span className={order.delivered ? 'text-white font-medium' : 'text-[#9ca3af]'}>Delivered</span>
                    {order.delivered && order.delivered_at && <span className="text-[#4b5563] text-xs">· {safeFormat(order.delivered_at, 'dd MMM yyyy, hh:mm a')}</span>}
                  </button>
                )
              )}
            </div>
          </Section>

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
            <div className="divide-y divide-[#2a2a45]/60">
              <Field label="Naam / Name" value={order.buyer_name} />
              <Field label="Mobile" value={order.phone} />
              <Field label="Email" value={order.email} />
            </div>
          </Section>

          <Section icon={MapPin} label="Shipping Address">
            <div className="divide-y divide-[#2a2a45]/60">
              <Field label="House / Flat / Building" value={order.house} />
              <Field label="Colony / Locality" value={order.locality} />
              <Field label="City / Tehsil" value={order.city} />
              <Field label="District / Zila" value={order.district} />
              <Field label="State / Rajya" value={order.state} />
              <Field label="Pincode" value={order.pincode} />
            </div>
          </Section>

          <Section icon={CreditCard} label="Payment">
            <div className="divide-y divide-[#2a2a45]/60">
              <Field label="Amount" value={order.amount != null ? `₹${Number(order.amount).toLocaleString('en-IN')}` : null} />
              <Field label="Payment Status" value={order.status || 'PAID'} />
              <Field label="Razorpay Order ID" value={order.razorpay_order_id} />
              <Field label="Payment ID" value={order.razorpay_payment_id} />
            </div>
          </Section>

          {!readOnly && (
            <div className="mt-4 pt-4 border-t border-[#2a2a45]">
              <button onClick={() => onDeleteRequest(order)}
                className="flex items-center gap-2 text-sm text-red-400/80 hover:text-red-400 transition-colors">
                <Trash2 size={14} /> Delete this order
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function WebsiteOrders() {
  const { isViewAdmin } = useAuthStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

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

  function applyUpdate(orderId, patch) {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...patch } : o))
    setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, ...patch } : prev)
  }

  async function handleShip(order, awb) {
    if (!awb.trim()) { toast.error('Enter an AWB number or tracking link'); return }
    const patch = { shipped: true, shipped_awb: awb.trim(), shipped_at: new Date().toISOString() }
    const { error } = await supabase.from('website_orders').update(patch).eq('id', order.id)
    if (error) { toast.error('Failed to save — has add_website_orders_fulfillment.sql been run in Supabase?'); return }
    applyUpdate(order.id, patch)
    toast.success('Marked as shipped')
  }

  async function handleUnship(order) {
    const patch = { shipped: false, shipped_awb: null, shipped_at: null, delivered: false, delivered_at: null }
    const { error } = await supabase.from('website_orders').update(patch).eq('id', order.id)
    if (error) { toast.error('Failed to undo'); return }
    applyUpdate(order.id, patch)
    toast.success('Shipped status undone')
  }

  async function handleDeliver(order, delivered) {
    const patch = { delivered, delivered_at: delivered ? new Date().toISOString() : null }
    const { error } = await supabase.from('website_orders').update(patch).eq('id', order.id)
    if (error) { toast.error('Failed to update delivery status'); return }
    applyUpdate(order.id, patch)
    toast.success(delivered ? 'Marked as delivered' : 'Delivery unmarked')
  }

  async function handleDelete(order) {
    const { error } = await supabase.from('website_orders').delete().eq('id', order.id)
    if (error) { toast.error('Failed to delete — has add_website_orders_delete.sql been run in Supabase?'); return }
    setOrders(prev => prev.filter(o => o.id !== order.id))
    setSelectedOrder(prev => prev && prev.id === order.id ? null : prev)
    setDeleteConfirm(null)
    toast.success('Order deleted')
  }

  const filtered = useMemo(() => {
    const list = orders.filter(o => {
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
    })
    return [...list].sort((a, b) => {
      const stageDiff = fulfillmentStage(a) - fulfillmentStage(b)
      if (stageDiff !== 0) return stageDiff
      return new Date(b.order_date || 0) - new Date(a.order_date || 0)
    })
  }, [orders, search, dateFrom, dateTo, showAll])

  const totalRevenue = filtered.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0)
  const newCount = filtered.filter(o => !o.shipped).length

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

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs">Orders</p>
          <p className="text-white text-2xl font-bold mt-0.5">{filtered.length}</p>
        </div>
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs">New</p>
          <p className="text-orange-400 text-2xl font-bold mt-0.5">{newCount}</p>
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
          <div
            key={o.id}
            className="relative w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-xl hover:border-[#3a3a55] transition-all"
          >
            <button
              type="button"
              onClick={() => setSelectedOrder(o)}
              className="w-full text-left p-4 active:opacity-70 transition-all touch-manipulation"
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
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pr-6">
                  <FulfillmentBadge order={o} />
                  {o.amount != null && <span className="text-[#f0a500] font-bold text-sm whitespace-nowrap">₹{Number(o.amount).toLocaleString('en-IN')}</span>}
                </div>
              </div>
            </button>
            {!isViewAdmin && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(o) }}
                title="Delete order"
                className="absolute top-4 right-4 text-[#4b5563] hover:text-red-400 p-1 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onShip={handleShip}
        onUnship={handleUnship}
        onDeliver={handleDeliver}
        onDeleteRequest={(order) => setDeleteConfirm(order)}
        readOnly={isViewAdmin}
      />

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={() => setDeleteConfirm(null)}>
          <div
            className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Delete Order?</h3>
                <p className="text-[#6b7280] text-xs mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-[#9ca3af] text-sm">
              Permanently delete order <span className="text-white font-semibold">#{deleteConfirm.cs_order_id}</span>{' '}
              from <span className="text-white font-semibold">{deleteConfirm.buyer_name || 'Unknown'}</span>?
              Use this to remove duplicate orders — it won't affect any other order's count or revenue.
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white text-sm font-medium transition-all">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
