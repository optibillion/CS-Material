import { useRealtime } from '../../hooks/useRealtime'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Users, BookOpen, Send, ShoppingCart, AlertTriangle, TrendingUp, UserPlus, ShoppingBag, X, Package, Search } from 'lucide-react'
import { format } from 'date-fns'

function safeFormat(dateStr, fmt) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? '—' : format(d, fmt)
}

const MODAL_META = {
  students:    { title: 'All Students',        Icon: Users,         color: 'text-blue-400' },
  books:       { title: 'Active Books',         Icon: BookOpen,      color: 'text-[#bd0a0a]' },
  issuedToday: { title: 'Issued Today',         Icon: Send,          color: 'text-emerald-400' },
  salesToday:  { title: 'Sales Today',          Icon: ShoppingCart,  color: 'text-[#f0a500]' },
  newStudents: { title: 'New Students Today',   Icon: UserPlus,      color: 'text-purple-400' },
  bags:        { title: 'Bags Issued To',       Icon: ShoppingBag,   color: 'text-teal-400' },
  lowStock:    { title: 'Low Stock Items',      Icon: AlertTriangle, color: 'text-orange-400' },
}

function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-5 hover:border-[#3a3a55] active:opacity-70 transition-opacity touch-manipulation"
    >
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
      <p className="text-[#4b5563] text-xs mt-2">Tap to view details</p>
    </button>
  )
}

function getRowSearchText(type, row) {
  if (type === 'students' || type === 'newStudents' || type === 'bags')
    return `${row.name} ${row.student_id} ${row.batches?.name || ''} ${row.batches?.batch_code || ''}`.toLowerCase()
  if (type === 'books')
    return `${row.title} ${row.exam_level || ''} ${row.unit || ''} ${row.part || ''} ${row.medium || ''}`.toLowerCase()
  if (type === 'issuedToday')
    return `${row.student?.name || ''} ${row.student?.student_id || ''} ${row.issuedBy?.name || ''} ${row.books?.map(b => `${b.title} ${b.exam_level || ''} ${b.unit || ''}`).join(' ') || ''}`.toLowerCase()
  if (type === 'salesToday')
    return `${row.books?.title || ''} ${row.books?.exam_level || ''} ${row.books?.unit || ''} ${row.buyer_name || ''} ${row.users?.name || ''}`.toLowerCase()
  if (type === 'lowStock')
    return `${row.books?.title || ''} ${row.books?.exam_level || ''} ${row.books?.unit || ''} ${row.books?.medium || ''} ${row.books?.category || ''}`.toLowerCase()
  return ''
}

function DetailModal({ type, onClose }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!type) return
    setLoading(true)
    setRows([])
    setQuery('')
    fetchData(type)
      .then(data => { setRows(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [type])

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.toLowerCase()
    return rows.filter(row => getRowSearchText(type, row).includes(q))
  }, [rows, query, type])

  if (!type) return null
  const meta = MODAL_META[type]
  const showSearch = rows.length > 5

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <meta.Icon size={16} className={meta.color} />
            <h2 className="text-white font-semibold">{meta.title}</h2>
            {!loading && (
              <span className="text-[#6b7280] text-xs">
                ({query.trim() ? `${filtered.length}/${rows.length}` : rows.length})
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white p-1"><X size={16} /></button>
        </div>

        {showSearch && !loading && (
          <div className="relative mb-3 flex-shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg pl-8 pr-3 py-2 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-[#3a3a55]"
              autoFocus
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {loading ? (
            [...Array(5)].map((_, i) => <div key={i} className="h-12 bg-[#2a2a45] rounded-lg animate-pulse" />)
          ) : filtered.length === 0 ? (
            <p className="text-[#6b7280] text-sm text-center py-8">{query.trim() ? 'No results found' : 'No data found'}</p>
          ) : (
            filtered.map((row, i) => <RowItem key={i} type={type} row={row} index={i} />)
          )}
        </div>
      </div>
    </div>
  )
}

function RowItem({ type, row, index }) {
  const num = <span className="text-[#4b5563] text-xs w-5 flex-shrink-0">{index + 1}.</span>

  if (type === 'students' || type === 'newStudents') {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 bg-[#12121f] rounded-lg">
        {num}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{row.name}</p>
          {row.batches && (
            <p className="text-[#6b7280] text-xs">
              {row.batches.batch_code && <span className="text-[#f0a500] font-mono">{row.batches.batch_code} · </span>}
              {row.batches.name}
            </p>
          )}
          {type === 'newStudents' && (
            <p className="text-[#4b5563] text-xs">{safeFormat(row.created_at, 'hh:mm a')}</p>
          )}
        </div>
        <span className="text-[#6b7280] text-xs font-mono flex-shrink-0">{row.student_id}</span>
      </div>
    )
  }

  if (type === 'books') {
    return (
      <div className="flex items-start gap-3 px-3 py-2.5 bg-[#12121f] rounded-lg">
        {num}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{row.title}</p>
          {(row.exam_level || row.unit || row.part) && (
            <p className="text-[#6b7280] text-xs truncate">
              {[row.exam_level, row.unit, row.part].filter(Boolean).join(' › ')}
            </p>
          )}
          {row.medium && (
            <p className="text-[#4b5563] text-xs capitalize">{row.medium}</p>
          )}
        </div>
      </div>
    )
  }

  if (type === 'issuedToday') {
    return (
      <div className="flex items-start gap-3 px-3 py-2.5 bg-[#12121f] rounded-lg">
        {num}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{row.student?.name}</p>
          <p className="text-[#6b7280] text-xs font-mono">{row.student?.student_id}</p>
          <p className="text-[#4b5563] text-xs mt-0.5">
            {row.books.length} book{row.books.length !== 1 ? 's' : ''} · by {row.issuedBy?.name || '—'}
          </p>
        </div>
        <span className="text-[#6b7280] text-xs flex-shrink-0">{safeFormat(row.issuedAt, 'hh:mm a')}</span>
      </div>
    )
  }

  if (type === 'salesToday') {
    return (
      <div className="flex items-start gap-3 px-3 py-2.5 bg-[#12121f] rounded-lg">
        {num}
        <div className="flex-1 min-w-0">
          {(row.books?.exam_level || row.books?.unit || row.books?.part) ? (
            <>
              <p className="text-white text-sm font-medium truncate">
                {[row.books?.exam_level, row.books?.unit, row.books?.part].filter(Boolean).join(' › ')}
              </p>
              <p className="text-[#6b7280] text-xs truncate">{row.books?.title}</p>
            </>
          ) : (
            <p className="text-white text-sm font-medium truncate">{row.books?.title}</p>
          )}
          <p className="text-[#6b7280] text-xs">
            {row.buyer_name ? `${row.buyer_name} · ` : ''}{row.qty ?? 1} copy
          </p>
          <p className="text-[#4b5563] text-xs">by {row.users?.name || '—'}</p>
        </div>
        <div className="text-right flex-shrink-0">
          {row.total_price && <p className="text-[#f0a500] text-sm font-semibold">₹{row.total_price}</p>}
          <p className="text-[#6b7280] text-xs">{safeFormat(row.sold_at, 'hh:mm a')}</p>
        </div>
      </div>
    )
  }

  if (type === 'bags') {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 bg-[#12121f] rounded-lg">
        {num}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{row.name}</p>
          {row.batches && (
            <p className="text-[#6b7280] text-xs">
              {row.batches.batch_code && <span className="text-[#f0a500] font-mono">{row.batches.batch_code} · </span>}
              {row.batches.name}
            </p>
          )}
        </div>
        <span className="text-[#6b7280] text-xs font-mono flex-shrink-0">{row.student_id}</span>
      </div>
    )
  }

  if (type === 'lowStock') {
    const pct = Math.round((row.available_qty / Math.max(row.low_stock_threshold * 2, 1)) * 100)
    return (
      <div className="px-3 py-2.5 bg-[#12121f] rounded-lg">
        <div className="flex items-center gap-3">
          {num}
          <div className="flex-1 min-w-0">
            {(row.books?.exam_level || row.books?.unit || row.books?.part) && (
              <p className="text-white text-xs font-semibold truncate">{[row.books.exam_level, row.books.unit, row.books.part].filter(Boolean).join(' › ')}</p>
            )}
            <p className={`text-xs truncate ${(row.books?.exam_level || row.books?.unit || row.books?.part) ? 'text-[#9ca3af]' : 'text-white font-medium'}`}>{row.books?.title}</p>
            {(row.books?.medium || row.books?.category) && (
              <p className="text-[#6b7280] text-[10px] capitalize">{[row.books.medium, row.books.category].filter(Boolean).join(' · ')}</p>
            )}
          </div>
          <span className={`text-sm font-bold flex-shrink-0 ${row.available_qty === 0 ? 'text-red-400' : 'text-orange-400'}`}>{row.available_qty} left</span>
        </div>
        <div className="mt-2 ml-8 h-1.5 bg-[#2a2a45] rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    )
  }

  return null
}

async function fetchData(type) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  switch (type) {
    case 'students': {
      const { data } = await supabase
        .from('students').select('name, student_id, batches(name, batch_code)')
        .order('name')
      return data || []
    }
    case 'books': {
      const { data } = await supabase
        .from('books').select('title, exam_level, unit, part, medium')
        .eq('is_active', true).order('title')
      return data || []
    }
    case 'issuedToday': {
      const { data } = await supabase
        .from('issuances')
        .select('student_id, issued_at, students(name, student_id), books(title, exam_level, unit, part), users!issuances_issued_by_fkey(name)')
        .gte('issued_at', todayISO).eq('is_reversed', false)
        .order('issued_at', { ascending: false })
      const grouped = {}
      for (const row of data || []) {
        const key = row.student_id
        if (!grouped[key]) grouped[key] = { student: row.students, issuedBy: row.users, issuedAt: row.issued_at, books: [] }
        if (row.books) grouped[key].books.push(row.books)
      }
      return Object.values(grouped)
    }
    case 'salesToday': {
      const { data } = await supabase
        .from('sales')
        .select('id, sold_at, total_price, qty, buyer_name, books(title, exam_level, unit, part), users!sales_sold_by_fkey(name)')
        .gte('sold_at', todayISO).eq('is_returned', false)
        .order('sold_at', { ascending: false })
      return data || []
    }
    case 'newStudents': {
      const { data } = await supabase
        .from('students').select('name, student_id, created_at, batches(name, batch_code)')
        .gte('created_at', todayISO).order('created_at', { ascending: false })
      return data || []
    }
    case 'bags': {
      const { data } = await supabase
        .from('students').select('name, student_id, batches(name, batch_code)')
        .eq('bag_issued', true).order('name')
      return data || []
    }
    case 'lowStock': {
      const { data } = await supabase.from('stock').select('*, books(title, exam_level, unit, part, medium, category)')
      return (data || []).filter(s => s.available_qty <= s.low_stock_threshold)
    }
    default: return []
  }
}

export default function Dashboard() {
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({})
  const [recentIssuances, setRecentIssuances] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalType, setModalType] = useState(null)

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
      { data: issuedTodayData },
      { count: salesToday },
      { count: newStudentsToday },
      { count: bagsIssued },
      { data: recentData },
      { data: stockData }
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('books').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('issuances').select('student_id').gte('issued_at', todayISO).eq('is_reversed', false),
      supabase.from('sales').select('*', { count: 'exact', head: true }).gte('sold_at', todayISO).eq('is_returned', false),
      supabase.from('students').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('bag_issued', true),
      supabase.from('issuances')
        .select('id, issued_at, students(name, student_id), books(title, exam_level, unit, part), users!issuances_issued_by_fkey(name)')
        .eq('is_reversed', false)
        .order('issued_at', { ascending: false })
        .limit(8),
      supabase.from('stock').select('*, books(title, exam_level, unit, part, medium, category)')
    ])

    const issuedToday = new Set((issuedTodayData || []).map(r => r.student_id)).size
    setStats({ totalStudents, totalBooks, issuedToday, salesToday, newStudentsToday, bagsIssued })
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
          {[...Array(7)].map((_, i) => (
            <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={Users}         label="Total Students"      value={stats.totalStudents}    sub="All time"           color="bg-blue-600"    onClick={() => setModalType('students')} />
          <StatCard icon={BookOpen}      label="Active Books"         value={stats.totalBooks}       sub="In catalogue"       color="bg-[#bd0a0a]"   onClick={() => setModalType('books')} />
          <StatCard icon={Send}          label="Issued Today"         value={stats.issuedToday}      sub="Books distributed"  color="bg-emerald-600" onClick={() => setModalType('issuedToday')} />
          <StatCard icon={ShoppingCart}  label="Sales Today"          value={stats.salesToday}       sub="External sales"     color="bg-[#f0a500]"   onClick={() => setModalType('salesToday')} />
          <StatCard icon={UserPlus}      label="New Students Today"   value={stats.newStudentsToday} sub="Enrolled today"     color="bg-purple-600"  onClick={() => setModalType('newStudents')} />
          <StatCard icon={ShoppingBag}   label="Bags Issued"          value={stats.bagsIssued}       sub="Total bags given out" color="bg-teal-600"  onClick={() => setModalType('bags')} />
          <StatCard icon={AlertTriangle} label="Low Stock Items"      value={lowStock.length}        sub="Need attention"     color="bg-orange-600"  onClick={() => setModalType('lowStock')} />
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
                  {(i.books?.exam_level || i.books?.unit || i.books?.part) ? (
                    <>
                      <p className="text-white text-sm font-semibold truncate">{[i.books?.exam_level, i.books?.unit, i.books?.part].filter(Boolean).join(' › ')}</p>
                      <p className="text-[#6b7280] text-xs truncate">{i.books?.title}</p>
                    </>
                  ) : (
                    <p className="text-white text-sm font-medium truncate">{i.books?.title}</p>
                  )}
                  <p className="text-[#6b7280] text-xs mt-0.5">{i.students?.name} · {i.students?.student_id}</p>
                  <p className="text-[#6b7280] text-xs">by {i.users?.name || '—'} · {safeFormat(i.issued_at, 'hh:mm a')}</p>
                </div>
                <span className="text-[#6b7280] text-xs whitespace-nowrap ml-3 flex-shrink-0">
                  {safeFormat(i.issued_at, 'dd MMM')}
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
              <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {(s.books?.exam_level || s.books?.unit || s.books?.part) && (
                    <p className="text-white text-xs font-semibold truncate">{[s.books.exam_level, s.books.unit, s.books.part].filter(Boolean).join(' › ')}</p>
                  )}
                  <p className={`text-xs truncate ${(s.books?.exam_level || s.books?.unit || s.books?.part) ? 'text-[#6b7280]' : 'text-white font-medium'}`}>{s.books?.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {s.books?.medium && <span className="text-[10px] text-[#9ca3af] capitalize">{s.books.medium}</span>}
                    {s.books?.category && <span className="text-[10px] text-[#6b7280] capitalize">· {s.books.category}</span>}
                  </div>
                </div>
                <span className={`text-xs font-bold flex-shrink-0 ${s.available_qty === 0 ? 'text-red-400' : 'text-orange-400'}`}>
                  {s.available_qty === 0 ? 'Out' : `${s.available_qty} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DetailModal type={modalType} onClose={() => setModalType(null)} />
    </div>
  )
}
