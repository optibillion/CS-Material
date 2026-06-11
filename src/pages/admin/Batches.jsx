import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Search, Pencil, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { logAction } from '../../lib/audit'

function suggestCode(name) {
  const words = name.trim().split(/\s+/)
  const yearMatch = name.match(/20(\d{2})/)
  const prefix = words[0].slice(0, 4).toUpperCase()
  return yearMatch ? `${prefix}${yearMatch[1]}` : prefix
}

function Modal({ open, onClose, onSave, initial }) {
  const [name, setName] = useState('')
  const [batchCode, setBatchCode] = useState('')
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false)
  const isEdit = !!initial

  useEffect(() => {
    if (open) {
      setName(initial?.name || '')
      setBatchCode(initial?.batch_code || '')
      setCodeManuallyEdited(!!initial?.batch_code)
    }
  }, [open, initial])

  function handleNameChange(val) {
    setName(val)
    if (!codeManuallyEdited && val.trim()) {
      setBatchCode(suggestCode(val))
    }
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Batch name required'); return }
    await onSave(name.trim(), batchCode.trim().toUpperCase() || null)
    onClose()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6">
        <h2 className="text-white font-semibold text-lg mb-5">{isEdit ? 'Edit Batch' : 'Add New Batch'}</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Batch Name *</label>
            <input value={name} onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. VIP Batch 2026"
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">
              Batch Code
              <span className="text-[#6b7280] text-xs ml-2">shared by all students in this batch</span>
            </label>
            <input
              value={batchCode}
              onChange={e => { setBatchCode(e.target.value.toUpperCase()); setCodeManuallyEdited(true) }}
              placeholder="e.g. VIP26"
              maxLength={12}
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-[#f0a500] text-sm font-mono font-semibold tracking-widest focus:outline-none focus:border-[#f0a500] placeholder-[#4b5563]"
            />
            {batchCode && (
              <p className="text-[#6b7280] text-xs mt-1">
                Students in this batch will show <span className="text-[#f0a500] font-mono">{batchCode}</span> as their batch code
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">
            {isEdit ? 'Save Changes' : 'Add Batch'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Batches() {
  const [batches, setBatches] = useState([])
  const [studentCounts, setStudentCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: b }, { data: sc }] = await Promise.all([
      supabase.from('batches').select('*').order('created_at', { ascending: false }),
      supabase.from('students').select('batch_id')
    ])
    setBatches(b || [])
    const counts = {}
    for (const s of (sc || [])) if (s.batch_id) counts[s.batch_id] = (counts[s.batch_id] || 0) + 1
    setStudentCounts(counts)
    setLoading(false)
  }

  async function handleSave(name, batch_code) {
    const { error } = await supabase.from('batches').insert({ name, batch_code: batch_code || null, is_active: true })
    if (error) {
      if (error.code === '42703') toast.error('Run DB migration to add batch_code column (see console)')
      else if (error.code === '23505') toast.error('Batch code already used by another batch')
      else toast.error('Failed to add batch')
      return
    }
    toast.success('Batch added')
    logAction('BATCH_CREATED', `${name}${batch_code ? ` [${batch_code}]` : ''}`)
    fetchAll()
  }

  async function handleEdit(name, batch_code) {
    const { error } = await supabase.from('batches').update({ name, batch_code: batch_code || null }).eq('id', editing.id)
    if (error) {
      if (error.code === '23505') toast.error('Batch code already used by another batch')
      else toast.error('Failed to update batch')
      return
    }
    toast.success('Batch updated')
    logAction('BATCH_UPDATED', `${editing.name} → ${name}${batch_code ? ` [${batch_code}]` : ''}`)
    setEditing(null)
    fetchAll()
  }

  async function toggleActive(batch) {
    const { error } = await supabase.from('batches').update({ is_active: !batch.is_active }).eq('id', batch.id)
    if (error) { toast.error('Failed'); return }
    toast.success(batch.is_active ? 'Batch deactivated' : 'Batch activated')
    logAction(batch.is_active ? 'BATCH_DEACTIVATED' : 'BATCH_ACTIVATED', batch.name)
    fetchAll()
  }

  const filtered = batches.filter(b => b.name?.toLowerCase().includes(search.toLowerCase()) || b.batch_code?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Batches</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{batches.length} total batches</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
          <Plus size={16} /> Add Batch
        </button>
      </div>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or batch code..."
          className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
      </div>

      {/* Desktop table */}
      <div className="mob-table bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-[#2a2a45]">
              {['BATCH CODE', 'BATCH NAME', 'STUDENTS', 'STATUS', 'ACTIONS'].map(h => (
                <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a45]">
            {loading ? [...Array(4)].map((_, i) => (
              <tr key={i}>{[...Array(5)].map((_, j) => (
                <td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse" /></td>
              ))}</tr>
            )) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-[#6b7280] py-10 text-sm">No batches found</td></tr>
            ) : filtered.map(b => (
              <tr key={b.id} className={`hover:bg-[#12121f] transition-colors ${!b.is_active ? 'opacity-50' : ''}`}>
                <td className="px-5 py-3">
                  {b.batch_code
                    ? <span className="text-[#f0a500] text-sm font-mono font-semibold tracking-widest">{b.batch_code}</span>
                    : <span className="text-[#4b5563] text-xs">— no code</span>}
                </td>
                <td className="px-5 py-3 text-white text-sm font-medium">{b.name}</td>
                <td className="px-5 py-3">
                  <span className="flex items-center gap-1 text-[#9ca3af] text-sm">
                    <Users size={13} className="text-[#6b7280]" />
                    {studentCounts[b.id] || 0}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${b.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-[#2a2a45] text-[#6b7280] border-[#2a2a45]'}`}>
                    {b.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditing(b)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] transition-all">
                      <Pencil size={11} /> Edit
                    </button>
                    <button onClick={() => toggleActive(b)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] transition-all">
                      {b.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mob-cards space-y-3">
        {loading ? [...Array(3)].map((_, i) => (
          <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 animate-pulse h-20" />
        )) : filtered.length === 0 ? (
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-6 text-center text-[#6b7280] text-sm">No batches found</div>
        ) : filtered.map(b => (
          <div key={b.id} className={`bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 ${!b.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white font-semibold text-sm">{b.name}</p>
                {b.batch_code
                  ? <span className="text-[#f0a500] text-xs font-mono font-semibold tracking-widest">{b.batch_code}</span>
                  : <span className="text-[#4b5563] text-xs">no batch code</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[#9ca3af] text-xs"><Users size={11} /> {studentCounts[b.id] || 0}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${b.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-[#2a2a45] text-[#6b7280] border-[#2a2a45]'}`}>
                  {b.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(b)}
                className="flex-1 flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] transition-all">
                <Pencil size={11} /> Edit
              </button>
              <button onClick={() => toggleActive(b)}
                className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] transition-all">
                {b.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} initial={null} />
      <Modal open={!!editing} onClose={() => setEditing(null)} onSave={handleEdit} initial={editing} />
    </div>
  )
}
