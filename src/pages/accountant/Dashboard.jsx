import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { ShoppingCart, Building2, BookOpen, AlertTriangle, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'

export default function AccountantDashboard() {
  const { profile } = useAuthStore()
  const today = new Date().toISOString().slice(0, 10)

  const [loading, setLoading] = useState(true)
  const [salesToday, setSalesToday] = useState([])
  const [issuancesToday, setIssuancesToday] = useState(0)
  const [allotmentsToday, setAllotmentsToday] = useState([])
  const [lowStock, setLowStock] = useState([])

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: sales }, { data: issuances }, { data: allotments }, { data: stock }] = await Promise.all([
      supabase.from('sales').select('qty, total_price, payment_mode, is_returned').gte('sold_at', today).lt('sold_at', today + 'T23:59:59'),
      supabase.from('issuances').select('id').eq('is_previous_issuance', false).eq('is_reversed', false).gte('issued_at', today).lt('issued_at', today + 'T23:59:59'),
      supabase.from('allotments').select('qty, institution_name').gte('allotted_at', today).lt('allotted_at', today + 'T23:59:59'),
      supabase.from('stock').select('available_qty, low_stock_threshold, books(title)').order('available_qty'),
    ])
    setSalesToday(sales || [])
    setIssuancesToday((issuances || []).length)
    setAllotmentsToday(allotments || [])
    setLowStock((stock || []).filter(s => s.available_qty <= s.low_stock_threshold))
    setLoading(false)
  }

  const activeSales = salesToday.filter(s => !s.is_returned)
  const totalBooks = activeSales.reduce((s, r) => s + (r.qty || 1), 0)
  const totalRevenue = activeSales.reduce((s, r) => s + (parseFloat(r.total_price) || 0), 0)
  const cashRevenue = activeSales.filter(s => s.payment_mode !== 'online').reduce((s, r) => s + (parseFloat(r.total_price) || 0), 0)
  const onlineRevenue = activeSales.filter(s => s.payment_mode === 'online').reduce((s, r) => s + (parseFloat(r.total_price) || 0), 0)
  const allotmentQty = allotmentsToday.reduce((s, r) => s + (r.qty || 0), 0)

  if (loading) return (
    <div className="p-4 md:p-6 space-y-4">
      {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-white text-2xl font-bold">Dashboard</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">{format(new Date(), 'dd MMM yyyy')} · {profile?.name}</p>
      </div>

      {/* Sales today */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart size={15} className="text-[#bd0a0a]" />
          <p className="text-white text-sm font-semibold">Sales Today</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs">Books Sold</p>
            <p className="text-white text-2xl font-bold mt-0.5">{totalBooks}</p>
          </div>
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
            <p className="text-[#6b7280] text-xs">Revenue</p>
            <p className="text-[#f0a500] text-2xl font-bold mt-0.5">₹{totalRevenue.toFixed(0)}</p>
          </div>
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

      {/* Issuances + Distribution today */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={13} className="text-[#bd0a0a]" />
            <p className="text-[#6b7280] text-xs font-medium">Issuances Today</p>
          </div>
          <p className="text-white text-2xl font-bold">{issuancesToday}</p>
          <p className="text-[#6b7280] text-xs mt-0.5">books to students</p>
        </div>
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={13} className="text-[#bd0a0a]" />
            <p className="text-[#6b7280] text-xs font-medium">Distribution Today</p>
          </div>
          <p className="text-white text-2xl font-bold">{allotmentQty}</p>
          <p className="text-[#6b7280] text-xs mt-0.5">
            {allotmentsToday.length > 0
              ? [...new Set(allotmentsToday.map(a => a.institution_name))].join(', ')
              : 'no dispatches'}
          </p>
        </div>
      </div>

      {/* Low stock */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={15} className="text-red-400" />
          <p className="text-white text-sm font-semibold">Low Stock</p>
          {lowStock.length === 0 && <span className="text-xs text-emerald-400 font-medium">All OK</span>}
        </div>
        {lowStock.length > 0 && (
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden">
            <div className="divide-y divide-[#2a2a45]">
              {lowStock.slice(0, 8).map((s, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <p className="text-[#9ca3af] text-sm truncate flex-1">{s.books?.title}</p>
                  <span className={`text-xs font-bold ml-3 flex-shrink-0 ${s.available_qty === 0 ? 'text-red-400' : 'text-orange-400'}`}>
                    {s.available_qty === 0 ? 'Out' : `${s.available_qty} left`}
                  </span>
                </div>
              ))}
              {lowStock.length > 8 && (
                <div className="px-4 py-2 text-center text-[#6b7280] text-xs">+{lowStock.length - 8} more</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
