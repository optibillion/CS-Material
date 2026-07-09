import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Download } from 'lucide-react'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

export default function Reports() {
  const [issuances, setIssuances] = useState([])
  const [sales, setSales] = useState([])
  const [allotments, setAllotments] = useState([])
  const [studentCount, setStudentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [tab, setTab] = useState('issuances')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: i }, { data: s }, { data: a }, { count: sc }] = await Promise.all([
      supabase.from('issuances')
        .select('*, students(name, student_id), books(title), users!issuances_issued_by_fkey(name)')
        .order('issued_at', { ascending: false }),
      supabase.from('sales')
        .select('*, books(title), users!sales_sold_by_fkey(name)')
        .order('sold_at', { ascending: false }),
      supabase.from('allotments')
        .select('*, books(title), users!allotments_allotted_by_fkey(name)')
        .order('allotted_at', { ascending: false }),
      supabase.from('students').select('*', { count: 'exact', head: true })
    ])
    setIssuances(i || [])
    setSales(s || [])
    setAllotments(a || [])
    setStudentCount(sc || 0)
    setLoading(false)
  }

  function filterByDate(data, dateField) {
    return data.filter(d => {
      const date = new Date(d[dateField])
      if (dateFrom && date < new Date(dateFrom)) return false
      if (dateTo && date > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }

  const filteredIssuances = filterByDate(issuances, 'issued_at')
  const filteredSales = filterByDate(sales, 'sold_at')
  const filteredAllotments = filterByDate(allotments, 'allotted_at')

  // Book-level summary (computed from filtered data)
  function buildBookSummary() {
    const map = {}
    for (const i of filteredIssuances.filter(x => !x.is_reversed)) {
      const t = i.books?.title || 'Unknown'
      if (!map[t]) map[t] = { title: t, issued: 0, sold: 0, allotted: 0, revenue: 0 }
      map[t].issued += 1
    }
    for (const s of filteredSales.filter(x => !x.is_returned)) {
      const t = s.books?.title || 'Unknown'
      if (!map[t]) map[t] = { title: t, issued: 0, sold: 0, allotted: 0, revenue: 0 }
      map[t].sold += (s.qty || 0)
      map[t].revenue += (s.total_price || 0)
    }
    for (const a of filteredAllotments) {
      const t = a.books?.title || 'Unknown'
      if (!map[t]) map[t] = { title: t, issued: 0, sold: 0, allotted: 0, revenue: 0 }
      map[t].allotted += (a.qty || 0)
    }
    return Object.values(map).sort((a, b) => (b.issued + b.sold + b.allotted) - (a.issued + a.sold + a.allotted))
  }

  const bookSummary = buildBookSummary()
  const totalRevenue = filteredSales.filter(s => !s.is_returned).reduce((sum, s) => sum + (s.total_price || 0), 0)
  const totalAllottedQty = filteredAllotments.reduce((sum, a) => sum + (a.qty || 0), 0)
  const activeIssuances = filteredIssuances.filter(i => !i.is_reversed).length

  function exportExcel() {
    if (tab === 'overall') {
      const wb = XLSX.utils.book_new()
      // Sheet 1: Summary stats
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { 'Metric': 'Total Students', 'Value': studentCount },
        { 'Metric': 'Active Issuances', 'Value': activeIssuances },
        { 'Metric': 'Total Sales Revenue (₹)', 'Value': totalRevenue },
        { 'Metric': 'Total Allotted Qty', 'Value': totalAllottedQty },
        { 'Metric': 'Date Filter From', 'Value': dateFrom || 'All time' },
        { 'Metric': 'Date Filter To', 'Value': dateTo || 'All time' },
      ]), 'Summary')
      // Sheet 2: Book Summary
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bookSummary.map(b => ({
        'Book Title': b.title,
        'Issued to Students': b.issued,
        'Sold (Qty)': b.sold,
        'Allotted to Distributors': b.allotted,
        'Total Out': b.issued + b.sold + b.allotted,
        'Sale Revenue (₹)': b.revenue,
      }))), 'Book Summary')
      // Sheet 3: Issuances
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filteredIssuances.map(i => ({
        'Student Name': i.students?.name,
        'Student ID': i.students?.student_id,
        'Book': i.books?.title,
        'Issued By': i.users?.name,
        'Date': format(new Date(i.issued_at), 'dd MMM yyyy'),
        'Status': i.is_reversed ? 'Reversed' : 'Active',
      }))), 'Issuances')
      // Sheet 4: Sales
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filteredSales.map(s => ({
        'Buyer': s.buyer_name,
        'Phone': s.buyer_phone,
        'Book': s.books?.title,
        'Qty': s.qty,
        'Price (₹)': s.total_price,
        'Sold By': s.users?.name,
        'Date': format(new Date(s.sold_at), 'dd MMM yyyy'),
        'Status': s.is_returned ? 'Returned' : 'Sold',
      }))), 'Sales')
      // Sheet 5: Allotments
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filteredAllotments.map(a => ({
        'Distributor': a.institution_name,
        'Contact': a.contact_person,
        'Book': a.books?.title,
        'Qty': a.qty,
        'Type': a.type,
        'Approved By': a.approved_by,
        'Allotted By': a.users?.name,
        'Date': format(new Date(a.allotted_at), 'dd MMM yyyy'),
      }))), 'Allotments')
      XLSX.writeFile(wb, `cs-overall-report-${format(new Date(), 'dd-MM-yyyy')}.xlsx`)
      toast.success('Overall report exported (5 sheets)')
      return
    }

    const rows = tab === 'issuances'
      ? filteredIssuances.map(i => ({
          'Student Name': i.students?.name,
          'Student ID': i.students?.student_id,
          'Book': i.books?.title,
          'Issued By': i.users?.name,
          'Date': format(new Date(i.issued_at), 'dd MMM yyyy'),
          'Status': i.is_reversed ? 'Reversed' : 'Active',
        }))
      : tab === 'sales'
      ? filteredSales.map(s => ({
          'Buyer': s.buyer_name,
          'Phone': s.buyer_phone,
          'Book': s.books?.title,
          'Qty': s.qty,
          'Price (₹)': s.total_price,
          'Sold By': s.users?.name,
          'Date': format(new Date(s.sold_at), 'dd MMM yyyy'),
          'Status': s.is_returned ? 'Returned' : 'Sold',
        }))
      : filteredAllotments.map(a => ({
          'Distributor': a.institution_name,
          'Contact': a.contact_person,
          'Book': a.books?.title,
          'Qty': a.qty,
          'Type': a.type,
          'Approved By': a.approved_by,
          'Allotted By': a.users?.name,
          'Date': format(new Date(a.allotted_at), 'dd MMM yyyy'),
        }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, tab)
    XLSX.writeFile(wb, `cs-${tab}-${format(new Date(), 'dd-MM-yyyy')}.xlsx`)
    toast.success('Exported successfully')
  }

  const TABS = [
    { key: 'issuances', label: `Issuances (${filteredIssuances.length})` },
    { key: 'sales', label: `Sales (${filteredSales.length})` },
    { key: 'allotments', label: `Allotments (${filteredAllotments.length})` },
    { key: 'overall', label: 'Overall' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Reports</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Export and view records</p>
        </div>
        <button onClick={exportExcel}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
          <Download size={16} /> {tab === 'overall' ? 'Export All (5 sheets)' : 'Export Excel'}
        </button>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap gap-4 items-center bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
        <div>
          <label className="text-[#9ca3af] text-xs mb-1 block">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
        </div>
        <div>
          <label className="text-[#9ca3af] text-xs mb-1 block">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo('') }}
            className="text-[#6b7280] hover:text-white text-sm mt-4 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-[#bd0a0a] text-white' : 'bg-[#1a1a2e] border border-[#2a2a45] text-[#9ca3af] hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Issuances tab */}
      {tab === 'issuances' && (
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#2a2a45]">
                {['STUDENT','BOOK','ISSUED BY','DATE','STATUS'].map(h=>(
                  <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a45]">
              {loading ? [...Array(5)].map((_,i)=>(
                <tr key={i}>{[...Array(5)].map((_,j)=>(<td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse"/></td>))}</tr>
              )) : filteredIssuances.length===0 ? (
                <tr><td colSpan={5} className="text-center text-[#6b7280] py-10 text-sm">No records</td></tr>
              ) : filteredIssuances.map(i=>(
                <tr key={i.id} className="hover:bg-[#12121f] transition-colors">
                  <td className="px-5 py-3"><p className="text-white text-sm font-medium">{i.students?.name}</p><p className="text-[#6b7280] text-xs">{i.students?.student_id}</p></td>
                  <td className="px-5 py-3 text-[#9ca3af] text-sm">{i.books?.title}</td>
                  <td className="px-5 py-3 text-[#9ca3af] text-sm">{i.users?.name}</td>
                  <td className="px-5 py-3 text-[#9ca3af] text-sm">{format(new Date(i.issued_at),'dd MMM yy')}</td>
                  <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border ${i.is_reversed?'bg-red-500/20 text-red-400 border-red-500/30':'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>{i.is_reversed?'Reversed':'Active'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sales tab */}
      {tab === 'sales' && (
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#2a2a45]">
                {['BUYER','BOOK','QTY','PRICE','SOLD BY','DATE','STATUS'].map(h=>(
                  <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a45]">
              {loading ? [...Array(4)].map((_,i)=>(
                <tr key={i}>{[...Array(7)].map((_,j)=>(<td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse"/></td>))}</tr>
              )) : filteredSales.length===0 ? (
                <tr><td colSpan={7} className="text-center text-[#6b7280] py-10 text-sm">No records</td></tr>
              ) : filteredSales.map(s=>(
                <tr key={s.id} className="hover:bg-[#12121f] transition-colors">
                  <td className="px-5 py-3"><p className="text-white text-sm font-medium">{s.buyer_name}</p><p className="text-[#6b7280] text-xs">{s.buyer_phone}</p></td>
                  <td className="px-5 py-3 text-[#9ca3af] text-sm">{s.books?.title}</td>
                  <td className="px-5 py-3 text-white text-sm">{s.qty}</td>
                  <td className="px-5 py-3 text-[#f0a500] text-sm font-medium">₹{s.total_price}</td>
                  <td className="px-5 py-3 text-[#9ca3af] text-sm">{s.users?.name||'—'}</td>
                  <td className="px-5 py-3 text-[#9ca3af] text-sm">{format(new Date(s.sold_at),'dd MMM yy')}</td>
                  <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border ${s.is_returned?'bg-red-500/20 text-red-400 border-red-500/30':'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>{s.is_returned?'Returned':'Sold'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Allotments tab */}
      {tab === 'allotments' && (
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[#2a2a45]">
                {['INSTITUTION','BOOK','QTY','TYPE','APPROVED BY','ALLOTTED BY','DATE'].map(h=>(
                  <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a45]">
              {loading ? [...Array(4)].map((_,i)=>(
                <tr key={i}>{[...Array(7)].map((_,j)=>(<td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse"/></td>))}</tr>
              )) : filteredAllotments.length===0 ? (
                <tr><td colSpan={7} className="text-center text-[#6b7280] py-10 text-sm">No records</td></tr>
              ) : filteredAllotments.map(a=>(
                <tr key={a.id} className="hover:bg-[#12121f] transition-colors">
                  <td className="px-5 py-3"><p className="text-white text-sm font-medium">{a.institution_name}</p><p className="text-[#6b7280] text-xs">{a.contact_person}</p></td>
                  <td className="px-5 py-3 text-[#9ca3af] text-sm">{a.books?.title}</td>
                  <td className="px-5 py-3 text-white text-sm font-semibold">{a.qty}</td>
                  <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${a.type==='external'?'bg-orange-500/20 text-orange-400 border-orange-500/30':'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>{a.type}</span></td>
                  <td className="px-5 py-3 text-[#9ca3af] text-sm">{a.approved_by||'—'}</td>
                  <td className="px-5 py-3 text-[#9ca3af] text-sm">{a.users?.name||'—'}</td>
                  <td className="px-5 py-3 text-[#9ca3af] text-sm">{format(new Date(a.allotted_at),'dd MMM yy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Overall tab */}
      {tab === 'overall' && (
        <div className="space-y-5">
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Students', value: studentCount, color: 'text-blue-400' },
              { label: 'Active Issuances', value: activeIssuances, color: 'text-emerald-400' },
              { label: 'Sale Revenue', value: `₹${totalRevenue.toLocaleString()}`, color: 'text-[#f0a500]' },
              { label: 'Total Allotted Qty', value: totalAllottedQty, color: 'text-orange-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
                <p className="text-[#6b7280] text-xs mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{loading ? '—' : stat.value}</p>
                {(dateFrom || dateTo) && <p className="text-[#6b7280] text-xs mt-1">filtered period</p>}
              </div>
            ))}
          </div>

          {/* Book-level breakdown */}
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
            <div className="px-5 py-4 border-b border-[#2a2a45]">
              <p className="text-white font-semibold text-sm">Book-wise Breakdown</p>
              <p className="text-[#6b7280] text-xs mt-0.5">Copies issued to students + sold externally + allotted to distributors</p>
            </div>
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-[#2a2a45]">
                  {['BOOK','ISSUED (STUDENTS)','SOLD (QTY)','ALLOTTED (INSTITUTIONS)','TOTAL OUT','REVENUE'].map(h=>(
                    <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a45]">
                {loading ? [...Array(5)].map((_,i)=>(
                  <tr key={i}>{[...Array(6)].map((_,j)=>(<td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse"/></td>))}</tr>
                )) : bookSummary.length===0 ? (
                  <tr><td colSpan={6} className="text-center text-[#6b7280] py-10 text-sm">No data for selected period</td></tr>
                ) : bookSummary.map((b,idx)=>(
                  <tr key={idx} className="hover:bg-[#12121f] transition-colors">
                    <td className="px-5 py-3 text-white text-sm font-medium">{b.title}</td>
                    <td className="px-5 py-3 text-[#bd0a0a] text-sm font-semibold">{b.issued}</td>
                    <td className="px-5 py-3 text-purple-400 text-sm font-semibold">{b.sold}</td>
                    <td className="px-5 py-3 text-orange-400 text-sm font-semibold">{b.allotted}</td>
                    <td className="px-5 py-3">
                      <span className="text-white text-sm font-bold">{b.issued + b.sold + b.allotted}</span>
                    </td>
                    <td className="px-5 py-3 text-[#f0a500] text-sm font-medium">{b.revenue > 0 ? `₹${b.revenue.toLocaleString()}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards for overall */}
          <div className="mob-cards space-y-3">
            {bookSummary.map((b,idx) => (
              <div key={idx} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
                <p className="text-white font-semibold text-sm mb-3">{b.title}</p>
                <div className="grid grid-cols-3 gap-3 mb-2">
                  <div><p className="text-[#6b7280] text-xs">Issued</p><p className="text-[#bd0a0a] font-bold text-lg">{b.issued}</p></div>
                  <div><p className="text-[#6b7280] text-xs">Sold</p><p className="text-purple-400 font-bold text-lg">{b.sold}</p></div>
                  <div><p className="text-[#6b7280] text-xs">Allotted</p><p className="text-orange-400 font-bold text-lg">{b.allotted}</p></div>
                </div>
                <div className="flex items-center justify-between border-t border-[#2a2a45] pt-2">
                  <span className="text-[#6b7280] text-xs">Total out</span>
                  <span className="text-white font-bold">{b.issued + b.sold + b.allotted}</span>
                </div>
                {b.revenue > 0 && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[#6b7280] text-xs">Revenue</span>
                    <span className="text-[#f0a500] font-semibold text-sm">₹{b.revenue.toLocaleString()}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
