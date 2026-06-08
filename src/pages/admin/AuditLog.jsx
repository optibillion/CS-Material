import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { Search } from 'lucide-react'

const ACTION_COLORS = {
  STUDENT_CREATED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  STUDENT_UPDATED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  BOOKS_ISSUED: 'bg-[#bd0a0a]/20 text-red-400 border-[#bd0a0a]/30',
  ISSUANCE_REVERSED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  SALE_RECORDED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  SALE_RETURNED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  BOOK_CREATED: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  BOOK_UPDATED: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  BOOK_DEACTIVATED: 'bg-[#2a2a45] text-[#6b7280] border-[#2a2a45]',
  BOOK_ACTIVATED: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  BUNDLE_CREATED: 'bg-[#f0a500]/20 text-[#f0a500] border-[#f0a500]/30',
  ALLOTMENT_CREATED: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  STOCK_CREATED: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  STOCK_UPDATED: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  BATCH_CREATED: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  COURSE_CREATED: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchLogs() }, [])

  async function fetchLogs() {
    setLoading(true)
    const { data } = await supabase.from('audit_logs')
      .select('*, users(name)')
      .order('timestamp', { ascending: false })
      .limit(500)
    setLogs(data || []); setLoading(false)
  }

  const filtered = logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
    l.users?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-white text-2xl font-bold">Audit Log</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">
          Every action by every user — append-only, cannot be edited or deleted.
        </p>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by action, details or user..."
          className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
      </div>

      {/* Desktop table */}
      <div className="mob-table bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-[#2a2a45]">
              {['USER', 'ACTION', 'DETAILS', 'TIMESTAMP'].map(h => (
                <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a45]">
            {loading ? [...Array(5)].map((_, i) => (
              <tr key={i}>{[...Array(4)].map((_, j) => (
                <td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse" /></td>
              ))}</tr>
            )) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-[#6b7280] py-10 text-sm">No audit logs found</td></tr>
            ) : filtered.map(l => (
              <tr key={l.id} className="hover:bg-[#12121f] transition-colors">
                <td className="px-5 py-3 text-white text-sm">{l.users?.name || 'System'}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${ACTION_COLORS[l.action] || 'bg-[#2a2a45] text-[#9ca3af] border-[#2a2a45]'}`}>
                    {l.action}
                  </span>
                </td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm max-w-xs">{l.entity_type || '—'}</td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm whitespace-nowrap">{format(new Date(l.timestamp), 'dd MMM yy, hh:mm a')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mob-cards space-y-3">
        {loading ? [...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 animate-pulse h-20" />
        )) : filtered.length === 0 ? (
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-6 text-center text-[#6b7280] text-sm">No audit logs found</div>
        ) : filtered.map(l => (
          <div key={l.id} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
            <div className="flex items-start justify-between mb-1.5">
              <p className="text-white text-sm font-medium">{l.users?.name || 'System'}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ACTION_COLORS[l.action] || 'bg-[#2a2a45] text-[#9ca3af] border-[#2a2a45]'}`}>
                {l.action}
              </span>
            </div>
            {l.entity_type && <p className="text-[#9ca3af] text-xs mb-1">{l.entity_type}</p>}
            <p className="text-[#6b7280] text-xs">{format(new Date(l.timestamp), 'dd MMM yy, hh:mm a')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
