import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useRealtime } from '../../hooks/useRealtime'
import { Send, Users, ShoppingCart } from 'lucide-react'
import { format } from 'date-fns'

export default function IssuerDashboard() {
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({})
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const today = new Date(); today.setHours(0,0,0,0)
    const [{ count: myToday }, { count: totalStudents }, { data: salesQtyData }, { data: recentData }] = await Promise.all([
      supabase.from('issuances').select('*', { count: 'exact', head: true }).eq('issued_by', profile?.id).gte('issued_at', today.toISOString()).eq('is_reversed', false),
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('sales').select('qty').eq('sold_by', profile?.id).eq('is_returned', false),
      supabase.from('issuances').select('*, students(name, student_id), books(title)').eq('issued_by', profile?.id).order('issued_at', { ascending: false }).limit(6)
    ])
    const mySales = (salesQtyData || []).reduce((sum, row) => sum + (row.qty || 1), 0)
    setStats({ myToday, totalStudents, mySales })
    setRecent(recentData || [])
    setLoading(false)
  }


  useRealtime('issuances', fetchAll)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Dashboard</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">Welcome, {profile?.name} · {format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Issued by me today', value: stats.myToday, icon: Send, color: 'bg-[#bd0a0a]' },
          { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'bg-blue-600' },
          { label: 'My Total Sales', value: stats.mySales, icon: ShoppingCart, color: 'bg-[#f0a500]' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-[#6b7280] text-sm">{label}</p>
              <p className="text-white text-3xl font-bold mt-1">{loading ? '—' : value}</p>
            </div>
            <div className={`p-2.5 rounded-lg ${color}`}><Icon size={20} className="text-white" /></div>
          </div>
        ))}
      </div>
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl">
        <div className="px-5 py-4 border-b border-[#2a2a45]">
          <h2 className="text-white font-semibold text-sm">My Recent Issuances</h2>
        </div>
        <div className="divide-y divide-[#2a2a45]">
          {loading ? [...Array(4)].map((_, i) => (
            <div key={i} className="px-5 py-3 animate-pulse"><div className="h-4 bg-[#2a2a45] rounded w-3/4 mb-1" /><div className="h-3 bg-[#2a2a45] rounded w-1/2" /></div>
          )) : recent.length === 0 ? (
            <p className="text-[#6b7280] text-sm px-5 py-6 text-center">No issuances yet</p>
          ) : recent.map(i => (
            <div key={i.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{i.books?.title}</p>
                <p className="text-[#6b7280] text-xs">{i.students?.name} · {i.students?.student_id}</p>
              </div>
              <span className="text-[#6b7280] text-xs">{format(new Date(i.issued_at), 'dd MMM, hh:mm a')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}