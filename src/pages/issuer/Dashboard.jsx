import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useRealtime } from '../../hooks/useRealtime'
import { Send, Users, ShoppingCart, X } from 'lucide-react'
import { format } from 'date-fns'

export default function IssuerDashboard() {
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({})
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalType, setModalType] = useState(null)
  const [modalData, setModalData] = useState([])
  const [modalLoading, setModalLoading] = useState(false)

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

  async function openModal(type) {
    setModalType(type)
    setModalData([])
    setModalLoading(true)
    const today = new Date(); today.setHours(0,0,0,0)

    if (type === 'issuedToday') {
      const { data } = await supabase.from('issuances')
        .select('id, issued_at, students(name, student_id), books(title, exam_level, unit, part)')
        .eq('issued_by', profile?.id)
        .gte('issued_at', today.toISOString())
        .eq('is_reversed', false)
        .order('issued_at', { ascending: false })
      setModalData(data || [])
    } else if (type === 'students') {
      const { data } = await supabase.from('students')
        .select('name, student_id, batches(name, batch_code)')
        .order('name')
      setModalData(data || [])
    } else if (type === 'mySales') {
      const { data } = await supabase.from('sales')
        .select('*, books(title, exam_level, unit, part, medium)')
        .eq('sold_by', profile?.id)
        .order('sold_at', { ascending: false })
      const groups = {}
      for (const s of data || []) {
        const key = `${s.sold_at}|${s.buyer_name}|${s.sold_by}`
        if (!groups[key]) groups[key] = {
          key, buyer_name: s.buyer_name, buyer_phone: s.buyer_phone,
          sold_at: s.sold_at, total_price: null, payment_mode: s.payment_mode || 'cash',
          books: [], all_returned: true
        }
        const g = groups[key]
        if (s.total_price) g.total_price = s.total_price
        g.books.push({ title: s.books?.title, qty: s.qty, is_returned: s.is_returned })
        if (!s.is_returned) g.all_returned = false
      }
      setModalData(Object.values(groups).sort((a, b) => new Date(b.sold_at) - new Date(a.sold_at)))
    }
    setModalLoading(false)
  }

  useRealtime('issuances', fetchAll)

  const MODAL_META = {
    issuedToday: 'Issued Today by Me',
    students:    'All Students',
    mySales:     'My Sales History',
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Dashboard</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">Welcome, {profile?.name} · {format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Issued by me today', value: stats.myToday, icon: Send, color: 'bg-[#bd0a0a]', type: 'issuedToday' },
          { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'bg-blue-600', type: 'students' },
          { label: 'My Total Sales', value: stats.mySales, icon: ShoppingCart, color: 'bg-[#f0a500]', type: 'mySales' },
        ].map(({ label, value, icon: Icon, color, type }) => (
          <button
            key={label}
            type="button"
            onClick={() => openModal(type)}
            className="w-full text-left bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-5 flex items-center justify-between hover:border-[#3a3a55] active:opacity-70 transition-all touch-manipulation"
          >
            <div>
              <p className="text-[#6b7280] text-sm">{label}</p>
              <p className="text-white text-3xl font-bold mt-1">{loading ? '—' : value}</p>
              <p className="text-[#4b5563] text-xs mt-1">Tap to view details</p>
            </div>
            <div className={`p-2.5 rounded-lg ${color}`}><Icon size={20} className="text-white" /></div>
          </button>
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

      {/* Detail Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setModalType(null)}>
          <div
            className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6 max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <h2 className="text-white font-semibold">{MODAL_META[modalType]}</h2>
                {!modalLoading && (
                  <p className="text-[#6b7280] text-xs mt-0.5">{modalData.length} record{modalData.length !== 1 ? 's' : ''}</p>
                )}
              </div>
              <button onClick={() => setModalType(null)} className="text-[#6b7280] hover:text-white p-1 touch-manipulation">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {modalLoading ? (
                [...Array(5)].map((_, i) => <div key={i} className="h-14 bg-[#2a2a45] rounded-lg animate-pulse" />)
              ) : modalData.length === 0 ? (
                <p className="text-[#6b7280] text-sm text-center py-8">No records found</p>
              ) : modalType === 'issuedToday' ? (
                modalData.map((row, i) => (
                  <div key={row.id} className="flex items-center gap-3 px-3 py-2.5 bg-[#12121f] rounded-lg">
                    <span className="text-[#4b5563] text-xs w-5 flex-shrink-0">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{row.books?.title}</p>
                      <p className="text-[#6b7280] text-xs">{row.students?.name} · <span className="font-mono">{row.students?.student_id}</span></p>
                    </div>
                    <span className="text-[#6b7280] text-xs flex-shrink-0">{format(new Date(row.issued_at), 'hh:mm a')}</span>
                  </div>
                ))
              ) : modalType === 'students' ? (
                modalData.map((row, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-[#12121f] rounded-lg">
                    <span className="text-[#4b5563] text-xs w-5 flex-shrink-0">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{row.name}</p>
                      {row.batches && <p className="text-[#6b7280] text-xs">{row.batches.batch_code ? `${row.batches.batch_code} · ` : ''}{row.batches.name}</p>}
                    </div>
                    <span className="text-[#6b7280] text-xs font-mono flex-shrink-0">{row.student_id}</span>
                  </div>
                ))
              ) : (
                modalData.map((txn) => (
                  <div key={txn.key} className={`px-3 py-3 bg-[#12121f] rounded-lg ${txn.all_returned ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-semibold truncate">{txn.buyer_name}</p>
                        {txn.buyer_phone && <p className="text-[#6b7280] text-xs">{txn.buyer_phone}</p>}
                        <p className="text-[#4b5563] text-xs mt-0.5">
                          {txn.books.length} book{txn.books.length !== 1 ? 's' : ''} ·{' '}
                          <span className={txn.payment_mode === 'online' ? 'text-blue-400' : 'text-[#9ca3af]'}>
                            {txn.payment_mode === 'online' ? 'Online' : 'Cash'}
                          </span>
                          {txn.all_returned && <span className="text-red-400"> · Returned</span>}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {txn.total_price && <p className="text-[#f0a500] text-sm font-bold">₹{txn.total_price}</p>}
                        <p className="text-[#6b7280] text-xs">{format(new Date(txn.sold_at), 'dd MMM yy')}</p>
                        <p className="text-[#4b5563] text-xs">{format(new Date(txn.sold_at), 'hh:mm a')}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[#2a2a45] space-y-1">
                      {txn.books.map((b, i) => (
                        <p key={i} className="text-[#9ca3af] text-xs truncate">· {b.title} ×{b.qty || 1}</p>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
