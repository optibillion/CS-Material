import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { logAction } from '../../lib/audit'
import { ShoppingBag, Search, Check, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const ROLE_COLORS = {
  admin: 'bg-[#bd0a0a]/20 text-red-400 border-[#bd0a0a]/30',
  accountant: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  issuer: 'bg-[#f0a500]/20 text-[#f0a500] border-[#f0a500]/30',
}

export default function Bags() {
  const { profile } = useAuthStore()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [issuing, setIssuing] = useState(null)

  useEffect(() => { fetchStaff() }, [])

  async function fetchStaff() {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('id, name, username, role, is_active, bag_issued, bag_issued_at, bag_issued_by')
      .eq('is_active', true)
      .order('name')
    setStaff(data || [])
    setLoading(false)
  }

  async function issueBag(member) {
    setIssuing(member.id)
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('users')
      .update({ bag_issued: true, bag_issued_by: profile?.id, bag_issued_at: now })
      .eq('id', member.id)
    if (error) {
      toast.error('Failed to record bag')
      setIssuing(null)
      return
    }
    toast.success(`Bag given to ${member.name}`)
    logAction('BAG_ISSUED_STAFF', `${member.name} (@${member.username})`)
    setStaff(prev => prev.map(m =>
      m.id === member.id
        ? { ...m, bag_issued: true, bag_issued_by: profile?.id, bag_issued_at: now }
        : m
    ))
    setIssuing(null)
  }

  async function revokeBag(member) {
    setIssuing(member.id)
    const { error } = await supabase
      .from('users')
      .update({ bag_issued: false, bag_issued_by: null, bag_issued_at: null })
      .eq('id', member.id)
    if (error) {
      toast.error('Failed to undo')
      setIssuing(null)
      return
    }
    toast.success(`Bag record removed for ${member.name}`)
    logAction('BAG_REVOKED_STAFF', `${member.name} (@${member.username})`)
    setStaff(prev => prev.map(m =>
      m.id === member.id
        ? { ...m, bag_issued: false, bag_issued_by: null, bag_issued_at: null }
        : m
    ))
    setIssuing(null)
  }

  const filtered = staff.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.username?.toLowerCase().includes(search.toLowerCase())
  )

  const givenCount = staff.filter(m => m.bag_issued).length
  const pendingCount = staff.length - givenCount

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-2xl font-bold">Bags</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Track Champion Square bag issuances to staff</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-center min-w-[72px]">
            <p className="text-emerald-400 font-bold text-xl leading-tight">{givenCount}</p>
            <p className="text-[#6b7280] text-xs">Given</p>
          </div>
          <div className="bg-[#f0a500]/10 border border-[#f0a500]/30 rounded-xl px-4 py-2.5 text-center min-w-[72px]">
            <p className="text-[#f0a500] font-bold text-xl leading-tight">{pendingCount}</p>
            <p className="text-[#6b7280] text-xs">Pending</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search staff by name or username..."
          className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-8 text-center">
          <Users size={32} className="text-[#2a2a45] mx-auto mb-3" />
          <p className="text-[#6b7280] text-sm">No staff found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(member => (
            <div
              key={member.id}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all ${
                member.bag_issued
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-[#1a1a2e] border-[#2a2a45]'
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                member.bag_issued ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#2a2a45] text-[#9ca3af]'
              }`}>
                {member.bag_issued
                  ? <Check size={16} />
                  : member.name?.[0]?.toUpperCase()
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white text-sm font-medium">{member.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${ROLE_COLORS[member.role] || ROLE_COLORS.issuer}`}>
                    {member.role}
                  </span>
                </div>
                {member.bag_issued && member.bag_issued_at ? (
                  <p className="text-emerald-400 text-xs mt-0.5">
                    Given on {format(new Date(member.bag_issued_at), 'dd MMM yyyy, h:mm a')}
                  </p>
                ) : (
                  <p className="text-[#4b5563] text-xs mt-0.5">@{member.username}</p>
                )}
              </div>

              {member.bag_issued ? (
                <button
                  onClick={() => revokeBag(member)}
                  disabled={issuing === member.id}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[#2a2a45] text-[#6b7280] hover:text-red-400 hover:border-red-400/30 transition-all disabled:opacity-40"
                >
                  Undo
                </button>
              ) : (
                <button
                  onClick={() => issueBag(member)}
                  disabled={issuing === member.id}
                  className="flex items-center gap-1.5 bg-[#f0a500] hover:bg-[#d4920a] disabled:opacity-40 text-black font-semibold text-xs px-3 py-2 rounded-lg transition-all"
                >
                  <ShoppingBag size={13} />
                  {issuing === member.id ? 'Saving...' : 'Give Bag'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
