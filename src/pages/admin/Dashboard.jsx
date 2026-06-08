import { useRealtime } from '../../hooks/useRealtime'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Users, BookOpen, Send, ShoppingCart, AlertTriangle, TrendingUp, UserPlus } from 'lucide-react'
import { format } from 'date-fns'

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#6b7280] text-sm font-medium">{label}</p>
          <p className="text-white text-3xl font-bold mt-1">{value ?? '—'}</p>
          {sub && <p className="text-[#6b7280] text-xs mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({})
  const [recentIssuances, setRecentIssuances] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 60000)
    return () => clearInterval(interval)
  }, [])

  useRealtime('issuances', fetchAll)
  useRealtime('students', fetchAll)
  useRealtime('sales', fetchAll)

  async function fetchAll() {
    setLoading(true)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    const [
      { count: totalStudents },
      { count: totalBooks },
      { count: issuedToday },
      { count: salesToday },
      { count: newStudentsToday },
      { data: recentData },
      { data: stockData }
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('books').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('issuances').select('*', { count: 'exact', head: true }).gte('issued_at', todayISO).eq('is_reversed', false),
      supabase.from('sales').select('*', { count: 'exact', head: true }).gte('sold_at', todayISO).eq('is_returned', false),
      supabase.from('students').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      supabase.from('issuances')
        .select('id, issued_at, students(name, student_id), books(title), users!issuances_issued_by_fkey(name)')
        .eq('is_reversed', false)
        .order('issued_at', { ascending: false })
        .limit(8),
      supabase.from('stock').select('*, books(title)')
    ])

    setStats({ totalStudents, totalBooks, issuedToday, salesToday, newStudentsToday })
    setRecentIssuances(recentData || [])
    setLowStock(stockData?.filter(s => s.available_qty <= s.low_stock_threshold) || [])
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Dashboard</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">
          Welcome back, {profile?.name} · {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={Users} label="Total Students" value={stats.totalStudents} sub="All time" color="bg-blue-600" />
          <StatCard icon={BookOpen} label="Active Books" value={stats.totalBooks} sub="In catalogue" color="bg-[#bd0a0a]" />
          <StatCard icon={Send} label="Issued Today" value={stats.issuedToday} sub="Books distributed" color="bg-emerald-600" />
          <StatCard icon={ShoppingCart} label="Sales Today" value={stats.salesToday} sub="External sales" color="bg-[#f0a500]" />
          <StatCard icon={UserPlus} label="New Students Today" value={stats.newStudentsToday} sub="Enrolled today" color="bg-purple-600" />
          <StatCard icon={AlertTriangle} label="Low Stock Items" value={lowStock.length} sub="Need attention" color="bg-orange-600" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a45]">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[#bd0a0a]" />
              <h2 className="text-white font-semibold text-sm">Recent Issuances</h2>
            </div>
            <span className="text-[#6b7280] text-xs">Latest 8</span>
          </div>
          <div className="divide-y divide-[#2a2a45]">
            {loading ? [...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-3 animate-pulse">
                <div className="h-4 bg-[#2a2a45] rounded w-3/4 mb-1" />
                <div className="h-3 bg-[#2a2a45] rounded w-1/2" />
              </div>
            )) : recentIssuances.length === 0 ? (
              <p className="text-[#6b7280] text-sm px-5 py-6 text-center">No issuances yet</p>
            ) : recentIssuances.map(i => (
              <div key={i.id} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">{i.books?.title}</p>
                  <p className="text-[#6b7280] text-xs mt-0.5">{i.students?.name} · {i.students?.student_id}</p>
                  <p className="text-[#6b7280] text-xs">by {i.users?.name || '—'} · {format(new Date(i.issued_at), 'hh:mm a')}</p>
                </div>
                <span className="text-[#6b7280] text-xs whitespace-nowrap ml-3 flex-shrink-0">
                  {format(new Date(i.issued_at), 'dd MMM')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#2a2a45]">
            <AlertTriangle size={16} className="text-[#f0a500]" />
            <h2 className="text-white font-semibold text-sm">Low Stock Alerts</h2>
          </div>
          <div className="divide-y divide-[#2a2a45]">
            {loading ? [...Array(3)].map((_, i) => (
              <div key={i} className="px-5 py-3 animate-pulse">
                <div className="h-4 bg-[#2a2a45] rounded w-3/4 mb-1" />
                <div className="h-3 bg-[#2a2a45] rounded w-1/2" />
              </div>
            )) : lowStock.length === 0 ? (
              <p className="text-[#6b7280] text-sm px-5 py-6 text-center">All stock levels OK</p>
            ) : lowStock.map(s => (
              <div key={s.id} className="px-5 py-3">
                <p className="text-white text-sm font-medium">{s.books?.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[#6b7280] text-xs">{s.location}</span>
                  <span className="text-red-400 text-xs font-semibold">{s.available_qty} left</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}