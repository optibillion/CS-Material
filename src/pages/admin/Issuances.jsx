import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Search, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

function ReversalModal({ open, onClose, onConfirm, issuance }) {
  const [reason, setReason] = useState('')
  useEffect(() => { if (open) setReason('') }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6">
        <h2 className="text-white font-semibold text-lg mb-2">Reverse Issuance</h2>
        <p className="text-[#9ca3af] text-sm mb-5">Reversing <span className="text-white">{issuance?.books?.title}</span> issued to <span className="text-white">{issuance?.students?.name}</span></p>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Why is this being reversed?"
          className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563] resize-none" />
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={() => { if (!reason.trim()) { toast.error('Reason required'); return } onConfirm(reason) }}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">Confirm Reversal</button>
        </div>
      </div>
    </div>
  )
}

export default function Issuances() {
  const { profile } = useAuthStore()
  const [issuances, setIssuances] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [reversing, setReversing] = useState(null)

  useEffect(() => { fetchIssuances() }, [])

  async function fetchIssuances() {
    setLoading(true)
    const { data } = await supabase.from('issuances')
      .select('*, students(name, student_id), books(title), users!issuances_issued_by_fkey(name)')
      .order('issued_at', { ascending: false }).limit(200)
    setIssuances(data || []); setLoading(false)
  }

  async function handleReversal(reason) {
    const { error } = await supabase.from('issuances').update({
      is_reversed: true, reversed_by: profile?.id,
      reversed_at: new Date().toISOString(), reversal_reason: reason
    }).eq('id', reversing.id)
    if (error) { toast.error('Failed to reverse'); return }
    toast.success('Issuance reversed')
    setReversing(null); fetchIssuances()
  }

  const filtered = issuances.filter(i =>
    i.students?.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.students?.student_id?.toLowerCase().includes(search.toLowerCase()) ||
    i.books?.title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-white text-2xl font-bold">Issuances</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">{issuances.length} total records</p>
      </div>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by student name, ID or book..."
          className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
      </div>

      {/* Desktop table */}
      <div className="mob-table bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-[#2a2a45]">
              {['STUDENT','BOOK','ISSUED BY','DATE','STATUS','ACTIONS'].map(h=>(
                <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a45]">
            {loading ? [...Array(5)].map((_,i)=>(
              <tr key={i}>{[...Array(6)].map((_,j)=>(
                <td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse"/></td>
              ))}</tr>
            )) : filtered.length===0 ? (
              <tr><td colSpan={6} className="text-center text-[#6b7280] py-10 text-sm">No issuances found</td></tr>
            ) : filtered.map(i=>(
              <tr key={i.id} className={`hover:bg-[#12121f] transition-colors ${i.is_reversed?'opacity-50':''}`}>
                <td className="px-5 py-3"><p className="text-white text-sm font-medium">{i.students?.name}</p><p className="text-[#6b7280] text-xs">{i.students?.student_id}</p></td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm">{i.books?.title}</td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm">{i.users?.name||'—'}</td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm">{format(new Date(i.issued_at),'dd MMM yy, hh:mm a')}</td>
                <td className="px-5 py-3">{i.is_reversed?<span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">Reversed</span>:<span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">Active</span>}</td>
                <td className="px-5 py-3">{!i.is_reversed&&<button onClick={()=>setReversing(i)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-red-500/20 hover:text-red-400 text-[#9ca3af] transition-all"><RotateCcw size={12}/>Reverse</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mob-cards space-y-3">
        {loading ? [...Array(4)].map((_,i)=>(
          <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 animate-pulse h-24"/>
        )) : filtered.length===0 ? (
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-6 text-center text-[#6b7280] text-sm">No issuances found</div>
        ) : filtered.map(i=>(
          <div key={i.id} className={`bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 ${i.is_reversed?'opacity-50':''}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-white font-semibold text-sm">{i.students?.name}</p>
                <p className="text-[#f0a500] text-xs font-mono">{i.students?.student_id}</p>
              </div>
              {i.is_reversed?<span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">Reversed</span>:<span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">Active</span>}
            </div>
            <p className="text-[#9ca3af] text-sm mb-1">{i.books?.title}</p>
            <p className="text-[#6b7280] text-xs mb-3">by {i.users?.name||'—'} · {format(new Date(i.issued_at),'dd MMM yy, hh:mm a')}</p>
            {!i.is_reversed&&<button onClick={()=>setReversing(i)} className="w-full flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-lg bg-[#2a2a45] hover:bg-red-500/20 hover:text-red-400 text-[#9ca3af] transition-all"><RotateCcw size={12}/>Reverse Issuance</button>}
          </div>
        ))}
      </div>

      <ReversalModal open={!!reversing} onClose={() => setReversing(null)} onConfirm={handleReversal} issuance={reversing} />
    </div>
  )
}