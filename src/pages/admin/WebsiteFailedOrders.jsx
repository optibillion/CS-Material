import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, MapPin, Phone, X, AlertTriangle, User, PhoneCall, CheckSquare, Square, CreditCard } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'

function safeFormat(dateStr, fmt) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? '—' : format(d, fmt)
}

function StatusBadge({ status }) {
  const contacted = status === 'Contacted'
  const cls = contacted
    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${cls}`}>{contacted ? 'Contacted' : 'New'}</span>
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

function LeadDetailModal({ lead, onClose, onToggleContacted, readOnly }) {
  if (!lead) return null
  const contacted = lead.status === 'Contacted'
  const address = [lead.house, lead.locality, lead.city, lead.district, lead.state, lead.pincode].filter(Boolean).join(', ')

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-[#2a2a45] flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-white font-bold text-lg">#{lead.attempt_id}</h2>
              <StatusBadge status={lead.status} />
            </div>
            <p className="text-[#6b7280] text-xs mt-1">{safeFormat(lead.attempt_date, 'dd MMM yyyy, hh:mm a')}</p>
          </div>
          <div className="flex items-start gap-3">
            {lead.amount != null && <span className="text-[#f0a500] font-bold text-xl">₹{Number(lead.amount).toLocaleString('en-IN')}</span>}
            <button onClick={onClose} className="text-[#6b7280] hover:text-white p-1 -mt-1"><X size={18} /></button>
          </div>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-0">
          <Section icon={PhoneCall} label="Follow-up">
            {readOnly ? (
              <div className="flex items-center gap-2 text-sm">
                {contacted ? <CheckSquare size={16} className="text-emerald-400 flex-shrink-0" /> : <Square size={16} className="text-[#9ca3af] flex-shrink-0" />}
                <span className={contacted ? 'text-white font-medium' : 'text-[#9ca3af]'}>Contacted</span>
                {contacted && lead.contacted_at && <span className="text-[#4b5563] text-xs">· {safeFormat(lead.contacted_at, 'dd MMM yyyy, hh:mm a')}</span>}
              </div>
            ) : (
              <button onClick={() => onToggleContacted(lead)}
                className="flex items-center gap-2 text-sm transition-colors">
                {contacted ? <CheckSquare size={16} className="text-emerald-400 flex-shrink-0" /> : <Square size={16} className="text-[#9ca3af] flex-shrink-0" />}
                <span className={contacted ? 'text-white font-medium' : 'text-[#9ca3af]'}>Contacted</span>
                {contacted && lead.contacted_at && <span className="text-[#4b5563] text-xs">· {safeFormat(lead.contacted_at, 'dd MMM yyyy, hh:mm a')}</span>}
              </button>
            )}
          </Section>

          <Section icon={AlertTriangle} label="Why It Failed">
            <div className="bg-[#12121f] border border-[#2a2a45] rounded-lg p-3">
              <p className="text-white text-sm font-medium">{lead.error_reason || 'Unknown reason'}</p>
              {lead.error_description && <p className="text-[#9ca3af] text-xs mt-1">{lead.error_description}</p>}
            </div>
          </Section>

          <Section icon={CreditCard} label="Product">
            <p className="text-white text-sm font-medium leading-snug">{lead.product_name}</p>
          </Section>

          <Section icon={User} label="Customer">
            <div className="divide-y divide-[#2a2a45]/60">
              <Field label="Naam / Name" value={lead.buyer_name} />
              <Field label="Mobile" value={lead.phone} />
              <Field label="Email" value={lead.email} />
            </div>
          </Section>

          {address && (
            <Section icon={MapPin} label="Address">
              <p className="text-[#e5e7eb] text-xs leading-relaxed">{address}</p>
            </Section>
          )}

          <Section icon={CreditCard} label="Payment">
            <div className="divide-y divide-[#2a2a45]/60">
              <Field label="Amount Attempted" value={lead.amount != null ? `₹${Number(lead.amount).toLocaleString('en-IN')}` : null} />
              <Field label="Razorpay Order ID" value={lead.razorpay_order_id} />
              <Field label="Payment ID" value={lead.razorpay_payment_id} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

export default function WebsiteFailedOrders() {
  const { isViewAdmin } = useAuthStore()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLead, setSelectedLead] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'New' | 'Contacted'

  async function fetchLeads() {
    setLoading(true)
    const { data } = await supabase.from('website_failed_orders')
      .select('*')
      .order('attempt_date', { ascending: false })
      .limit(1000)
    setLeads(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchLeads() }, [])

  function applyUpdate(id, patch) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
    setSelectedLead(prev => prev && prev.id === id ? { ...prev, ...patch } : prev)
  }

  async function handleToggleContacted(lead) {
    const contacted = lead.status !== 'Contacted'
    const patch = { status: contacted ? 'Contacted' : 'New', contacted_at: contacted ? new Date().toISOString() : null }
    const { error } = await supabase.from('website_failed_orders').update(patch).eq('id', lead.id)
    if (error) { toast.error('Failed to save — has add_website_failed_orders.sql been run in Supabase?'); return }
    applyUpdate(lead.id, patch)
    toast.success(contacted ? 'Marked as contacted' : 'Contacted unmarked')
  }

  const filtered = useMemo(() => {
    const list = leads.filter(l => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (
        l.buyer_name?.toLowerCase().includes(q) ||
        l.phone?.includes(search) ||
        l.email?.toLowerCase().includes(q) ||
        l.product_name?.toLowerCase().includes(q) ||
        l.attempt_id?.toLowerCase().includes(q) ||
        l.error_reason?.toLowerCase().includes(q)
      )
    })
    return [...list].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'New' ? -1 : 1
      return new Date(b.attempt_date || 0) - new Date(a.attempt_date || 0)
    })
  }, [leads, search, statusFilter])

  const newCount = leads.filter(l => l.status !== 'Contacted').length

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Website Failed Orders</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Failed/timed-out payment attempts — call these leads to help them complete the order</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {['all', 'New', 'Contacted'].map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all capitalize ${statusFilter === f ? 'bg-[#bd0a0a] border-[#bd0a0a] text-white' : 'bg-[#2a2a45] border-[#2a2a45] text-[#9ca3af] hover:text-white'}`}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs">Total Leads</p>
          <p className="text-white text-2xl font-bold mt-0.5">{leads.length}</p>
        </div>
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs">Not Yet Contacted</p>
          <p className="text-orange-400 text-2xl font-bold mt-0.5">{newCount}</p>
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, email, product or failure reason..."
          className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
      </div>

      <div className="space-y-2.5">
        {loading ? [...Array(3)].map((_, i) => (
          <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 animate-pulse h-20" />
        )) : filtered.length === 0 ? (
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-10 text-center text-[#6b7280] text-sm">
            No failed payment leads {leads.length === 0 ? 'yet — failed checkout attempts will appear here automatically' : 'match this filter'}
          </div>
        ) : filtered.map(l => (
          <button
            key={l.id}
            type="button"
            onClick={() => setSelectedLead(l)}
            className="w-full text-left bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 hover:border-[#3a3a55] active:opacity-70 transition-all touch-manipulation"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold text-sm truncate">{l.buyer_name || 'Unknown'}</p>
                  <span className="text-[#4b5563] text-xs flex-shrink-0">#{l.attempt_id}</span>
                </div>
                <p className="text-[#9ca3af] text-xs mt-1 truncate">{l.product_name}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {l.phone && <span className="text-[#6b7280] text-xs flex items-center gap-1"><Phone size={10} />{l.phone}</span>}
                  <span className="text-red-400/80 text-xs">{l.error_reason || 'Failed'}</span>
                  <span className="text-[#4b5563] text-xs">{safeFormat(l.attempt_date, 'dd MMM yy, hh:mm a')}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <StatusBadge status={l.status} />
                {l.amount != null && <span className="text-[#f0a500] font-bold text-sm whitespace-nowrap">₹{Number(l.amount).toLocaleString('en-IN')}</span>}
              </div>
            </div>
          </button>
        ))}
      </div>

      <LeadDetailModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onToggleContacted={handleToggleContacted}
        readOnly={isViewAdmin}
      />
    </div>
  )
}
