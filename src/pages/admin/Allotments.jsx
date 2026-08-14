import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Plus, Search, Building2, MapPin, Phone, Table2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'
import { logAction } from '../../lib/audit'

function InstitutionModal({ open, onClose, onSave, initial }) {
  const blank = { name: '', location: '', phone: '', notes: '' }
  const [form, setForm] = useState(blank)
  useEffect(() => {
    if (open) setForm(initial ? { name: initial.name || '', location: initial.location || '', phone: initial.phone || '', notes: initial.notes || '' } : blank)
  }, [open, initial])
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  async function handleSave() {
    if (!form.name.trim()) { toast.error('Distributor name is required'); return }
    await onSave(form); onClose()
  }
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6">
        <h2 className="text-white font-semibold text-lg mb-5">{initial ? 'Edit Distributor' : 'New Distributor'}</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Distributor Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sharma Book House, Gupta Distributors"
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="City / Area"
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
            </div>
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit number"
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
            </div>
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Optional notes"
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] resize-none placeholder-[#4b5563]" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">
            {initial ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DistributorTotalsModal({ institution, onClose }) {
  if (!institution) return null

  const perBook = {}
  for (const a of institution.allotments || []) {
    if (!a.book_id) continue
    if (!perBook[a.book_id]) perBook[a.book_id] = {
      title: a.books?.title,
      exam_level: a.books?.exam_level,
      unit: a.books?.unit,
      part: a.books?.part,
      medium: a.books?.medium,
      given: 0,
      returned: 0,
    }
    if ((a.qty || 0) > 0) perBook[a.book_id].given += a.qty
    else perBook[a.book_id].returned += Math.abs(a.qty || 0)
  }
  const rows = Object.values(perBook).sort((a, b) => {
    const key = x => [x.exam_level, x.unit, x.part, x.medium, x.title].map(v => v || '').join('\x00')
    return key(a).localeCompare(key(b))
  })
  const totalGiven = rows.reduce((s, r) => s + r.given, 0)
  const totalReturned = rows.reduce((s, r) => s + r.returned, 0)
  const moneyTotal = (institution.allotments || []).reduce((s, a) => {
    const mrp = a.unit_mrp ?? a.books?.mrp ?? 0
    const disc = a.discount_pct || 0
    return s + +(mrp * (1 - disc / 100)).toFixed(2) * (a.qty || 0)
  }, 0)

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#2a2a45] flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">{institution.name}</h2>
            <p className="text-[#6b7280] text-xs mt-0.5">{rows.length} title{rows.length !== 1 ? 's' : ''} · full ledger</p>
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white p-1.5 rounded-lg hover:bg-[#2a2a45] transition-all flex-shrink-0 ml-3">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="text-[#6b7280] text-sm text-center py-10">No books given yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px]">
                <thead className="sticky top-0 bg-[#1a1a2e]">
                  <tr className="border-b border-[#2a2a45]">
                    <th className="text-left text-[#6b7280] text-[10px] font-semibold uppercase tracking-wide px-4 py-2.5">Book</th>
                    <th className="text-right text-[#6b7280] text-[10px] font-semibold uppercase tracking-wide px-4 py-2.5">Given</th>
                    <th className="text-right text-[#6b7280] text-[10px] font-semibold uppercase tracking-wide px-4 py-2.5">Taken Back</th>
                    <th className="text-right text-[#6b7280] text-[10px] font-semibold uppercase tracking-wide px-4 py-2.5">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a45]">
                  {rows.map((r, i) => {
                    const lvl = [r.exam_level, r.unit, r.part].filter(Boolean).join(' › ')
                    const net = r.given - r.returned
                    return (
                      <tr key={i}>
                        <td className="px-4 py-2.5 align-top">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {r.medium === 'hindi' && <span className="text-[9px] px-1 py-0.5 rounded border bg-orange-500/20 text-orange-400 border-orange-500/30 font-semibold flex-shrink-0">H</span>}
                            {r.medium === 'english' && <span className="text-[9px] px-1 py-0.5 rounded border bg-blue-500/20 text-blue-400 border-blue-500/30 font-semibold flex-shrink-0">E</span>}
                            {r.medium === 'both' && <span className="text-[9px] px-1 py-0.5 rounded border bg-purple-500/20 text-purple-400 border-purple-500/30 font-semibold flex-shrink-0">B</span>}
                            <span className="text-white text-xs font-medium">{lvl || r.title}</span>
                          </div>
                          {lvl && <p className="text-[#6b7280] text-[10px] truncate mt-0.5">{r.title}</p>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-white text-xs font-semibold align-top">{r.given}</td>
                        <td className="px-4 py-2.5 text-right text-xs font-semibold align-top">
                          {r.returned > 0 ? <span className="text-red-400">−{r.returned}</span> : <span className="text-[#4b5563]">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-emerald-400 text-xs font-bold align-top">{net}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 p-4 border-t border-[#2a2a45] flex-shrink-0">
          <div className="bg-[#12121f] rounded-lg p-3 text-center">
            <p className="text-[#6b7280] text-[10px] uppercase tracking-wide">Total Given</p>
            <p className="text-white text-lg font-bold mt-0.5">{totalGiven}</p>
          </div>
          <div className="bg-[#12121f] rounded-lg p-3 text-center">
            <p className="text-[#6b7280] text-[10px] uppercase tracking-wide">Total Returned</p>
            <p className="text-red-400 text-lg font-bold mt-0.5">{totalReturned}</p>
          </div>
          <div className="bg-[#12121f] rounded-lg p-3 text-center">
            <p className="text-[#6b7280] text-[10px] uppercase tracking-wide">Money Total</p>
            <p className="text-[#f0a500] text-lg font-bold mt-0.5">₹{Math.round(moneyTotal).toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Allotments() {
  const { profile, allotmentAccess } = useAuthStore()
  const [institutions, setInstitutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [totalsModal, setTotalsModal] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const basePath = location.pathname.startsWith('/admin') ? '/admin'
    : location.pathname.startsWith('/accountant') ? '/accountant'
    : '/issuer'

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data } = await supabase
      .from('institutions')
      .select('*, allotments(book_id, qty, unit_mrp, discount_pct, books(title, exam_level, unit, part, medium, mrp))')
      .order('created_at', { ascending: false })
    setInstitutions(data || [])
    setLoading(false)
  }

  async function handleCreate(form) {
    const { error } = await supabase.from('institutions').insert({
      name: form.name.trim(),
      location: form.location.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
      created_by: profile?.id
    })
    if (error) { toast.error('Failed to create distributor'); return }
    toast.success('Distributor created')
    logAction('DISTRIBUTOR_CREATED', form.name.trim())
    fetchAll()
  }

  const filtered = institutions.filter(i =>
    i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.location?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Distributors</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{institutions.length} distributor{institutions.length !== 1 ? 's' : ''}</p>
        </div>
        {allotmentAccess === 'edit' && (
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0">
            <Plus size={16} /> New Distributor
          </button>
        )}
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or location..."
          className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-5 h-36 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-12 text-center">
          <Building2 size={32} className="text-[#2a2a45] mx-auto mb-3" />
          <p className="text-[#6b7280] text-sm">{search ? 'No distributors match your search' : 'No distributors yet — create one to get started'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(inst => {
            const totalQty = (inst.allotments || []).reduce((s, a) => s + (a.qty || 0), 0)
            const totalValue = (inst.allotments || []).reduce((s, a) => {
              const mrp = a.unit_mrp ?? a.books?.mrp ?? 0
              const disc = a.discount_pct || 0
              return s + +(mrp * (1 - disc / 100)).toFixed(2) * (a.qty || 1)
            }, 0)
            const hasValue = totalValue > 0
            return (
              <div key={inst.id} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden hover:border-[#bd0a0a]/50 hover:bg-[#1f1f35] transition-all group">
                <button onClick={() => navigate(`${basePath}/allotments/${inst.id}`)} className="w-full text-left p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[#bd0a0a]/10 flex items-center justify-center flex-shrink-0">
                      <Building2 size={20} className="text-[#bd0a0a]" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs bg-[#2a2a45] text-[#9ca3af] px-2 py-0.5 rounded-full">
                        {totalQty} books sent
                      </span>
                      {hasValue && (
                        <span className="text-xs text-[#f0a500] font-semibold">
                          ₹{Math.round(totalValue).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-white font-semibold text-sm group-hover:text-white truncate">{inst.name}</p>
                  {inst.location && (
                    <p className="text-[#6b7280] text-xs mt-1 flex items-center gap-1">
                      <MapPin size={10} /> {inst.location}
                    </p>
                  )}
                  {inst.phone && (
                    <p className="text-[#6b7280] text-xs mt-0.5 flex items-center gap-1">
                      <Phone size={10} /> {inst.phone}
                    </p>
                  )}
                  {!inst.location && !inst.phone && (
                    <p className="text-[#4b5563] text-xs mt-1">No contact info</p>
                  )}
                </button>
                <button
                  onClick={() => setTotalsModal(inst)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 border-t border-[#2a2a45] text-[#9ca3af] hover:text-white hover:bg-[#2a2a45] transition-all">
                  <Table2 size={12} />
                  View Total
                </button>
              </div>
            )
          })}
        </div>
      )}

      <InstitutionModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleCreate} initial={null} />
      <DistributorTotalsModal institution={totalsModal} onClose={() => setTotalsModal(null)} />
    </div>
  )
}
