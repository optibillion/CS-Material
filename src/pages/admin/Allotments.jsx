import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Plus, Search, RotateCcw, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { logAction } from '../../lib/audit'

function AllotmentModal({ open, onClose, onSave, books, initial, stockMap }) {
  const isEdit = !!initial
  const blank = { institution_name: '', contact_person: '', book_id: '', qty: '', type: 'external', from_location: '', to_location: '', approved_by: '', notes: '', deduct_inventory: false }
  const [form, setForm] = useState(blank)
  useEffect(() => {
    if (open) setForm(initial ? {
      institution_name: initial.institution_name || '',
      contact_person: initial.contact_person || '',
      book_id: initial.book_id || '',
      qty: String(initial.qty || ''),
      type: initial.type || 'external',
      from_location: initial.from_location || '',
      to_location: initial.to_location || '',
      approved_by: initial.approved_by || '',
      notes: initial.notes || '',
      deduct_inventory: false
    } : blank)
  }, [open, initial])
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  async function handleSave() {
    if (!form.institution_name.trim() || !form.book_id || !form.qty) { toast.error('Fill required fields'); return }
    await onSave(form); onClose()
  }
  const availStock = stockMap?.[form.book_id] ?? null
  const qty = parseInt(form.qty) || 0
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-white font-semibold text-lg mb-5">{isEdit ? 'Edit Allotment' : 'New Allotment'}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Institution Name *</label>
              <input value={form.institution_name} onChange={e => set('institution_name', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" placeholder="Institution name" />
            </div>
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Contact Person</label>
              <input value={form.contact_person} onChange={e => set('contact_person', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" placeholder="Contact name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Book *</label>
              <select value={form.book_id} onChange={e => set('book_id', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]">
                <option value="">Select book</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Quantity *</label>
              <input type="number" value={form.qty} onChange={e => set('qty', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]">
                <option value="external">External</option>
                <option value="internal">Internal</option>
              </select>
            </div>
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Approved By</label>
              <input value={form.approved_by} onChange={e => set('approved_by', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" placeholder="Name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">From Location</label>
              <input value={form.from_location} onChange={e => set('from_location', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" placeholder="e.g. Main Campus" />
            </div>
            {form.type === 'internal' && (
              <div>
                <label className="text-[#9ca3af] text-sm mb-1.5 block">To Location</label>
                <input value={form.to_location} onChange={e => set('to_location', e.target.value)}
                  className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" placeholder="e.g. Branch Campus" />
              </div>
            )}
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] resize-none placeholder-[#4b5563]" placeholder="Optional notes" />
          </div>
          {!isEdit && (
            <label className={`flex items-center gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-all ${form.deduct_inventory ? 'bg-orange-500/10 border-orange-500/30' : 'bg-[#12121f] border-[#2a2a45] hover:border-[#3a3a55]'}`}>
              <input type="checkbox" checked={form.deduct_inventory} onChange={e => set('deduct_inventory', e.target.checked)} className="accent-[#f0a500] w-4 h-4 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Deduct from Inventory</p>
                <p className="text-[#6b7280] text-xs">
                  {form.book_id && availStock !== null
                    ? `Stock available: ${availStock} — will deduct ${qty}`
                    : 'Will reduce available stock for this book'}
                </p>
              </div>
              {form.deduct_inventory && qty > 0 && availStock !== null && qty > availStock && (
                <span className="text-red-400 text-xs flex-shrink-0">Insufficient stock</span>
              )}
            </label>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">
            {isEdit ? 'Save Changes' : 'Record Allotment'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReversalModal({ open, onClose, onConfirm, allotment }) {
  const [reason, setReason] = useState('')
  useEffect(() => { if (open) setReason('') }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6">
        <h2 className="text-white font-semibold text-lg mb-2">Reverse Allotment</h2>
        <p className="text-[#9ca3af] text-sm mb-5">
          Reversing <span className="text-white">{allotment?.books?.title}</span> × {allotment?.qty} for{' '}
          <span className="text-white">{allotment?.institution_name}</span>
        </p>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Reason for reversal..."
          className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563] resize-none" />
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={() => { if (!reason.trim()) { toast.error('Reason required'); return } onConfirm(reason) }}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">Confirm</button>
        </div>
      </div>
    </div>
  )
}

export default function Allotments() {
  const { profile } = useAuthStore()
  const [allotments, setAllotments] = useState([])
  const [books, setBooks] = useState([])
  const [stockEntries, setStockEntries] = useState([])
  const [stockMap, setStockMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showReversed, setShowReversed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [reversing, setReversing] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: a }, { data: b }, { data: s }] = await Promise.all([
      supabase.from('allotments').select('*, books(title), users!allotments_allotted_by_fkey(name)').order('allotted_at', { ascending: false }),
      supabase.from('books').select('*').eq('is_active', true),
      supabase.from('stock').select('id, book_id, available_qty, location')
    ])
    setAllotments(a || []); setBooks(b || [])
    setStockEntries(s || [])
    const map = {}
    for (const entry of (s || [])) map[entry.book_id] = (map[entry.book_id] || 0) + (entry.available_qty || 0)
    setStockMap(map)
    setLoading(false)
  }

  async function handleCreate(form) {
    const { deduct_inventory, ...rest } = form
    const payload = { ...rest, qty: parseInt(form.qty), allotted_by: profile?.id, to_location: form.type === 'internal' ? form.to_location : null }
    const { error } = await supabase.from('allotments').insert(payload)
    if (error) { toast.error('Failed to record allotment'); return }

    if (deduct_inventory) {
      let remaining = parseInt(form.qty) || 0
      const entries = stockEntries
        .filter(e => e.book_id === form.book_id && (e.available_qty || 0) > 0)
        .sort((a, b) => b.available_qty - a.available_qty)
      for (const entry of entries) {
        if (remaining <= 0) break
        const deduct = Math.min(remaining, entry.available_qty)
        await supabase.from('stock').update({ available_qty: entry.available_qty - deduct }).eq('id', entry.id)
        remaining -= deduct
      }
      if (remaining > 0) toast.error(`Warning: only partially deducted — ${remaining} qty had no stock`)
    }

    toast.success(`Allotment recorded${deduct_inventory ? ' & inventory deducted' : ''}`)
    const bookTitle = books.find(b => b.id === form.book_id)?.title || form.book_id
    logAction('ALLOTMENT_CREATED', `${bookTitle} x${form.qty} → ${form.institution_name} (${form.type})${deduct_inventory ? ' [inventory deducted]' : ''}`)
    fetchAll()
  }

  async function handleEdit(form) {
    const payload = {
      institution_name: form.institution_name,
      contact_person: form.contact_person || null,
      book_id: form.book_id,
      qty: parseInt(form.qty),
      type: form.type,
      from_location: form.from_location || null,
      to_location: form.type === 'internal' ? (form.to_location || null) : null,
      approved_by: form.approved_by || null,
      notes: form.notes || null
    }
    const { error } = await supabase.from('allotments').update(payload).eq('id', editing.id)
    if (error) { toast.error('Failed to update allotment'); return }
    toast.success('Allotment updated')
    logAction('ALLOTMENT_UPDATED', `${editing.institution_name} — ${editing.books?.title}`)
    setEditing(null)
    fetchAll()
  }

  async function handleReversal(reason) {
    const { error } = await supabase.from('allotments').update({
      is_reversed: true,
      reversed_at: new Date().toISOString(),
      reversed_by: profile?.id,
      reversal_reason: reason
    }).eq('id', reversing.id)
    if (error) { toast.error('Failed to reverse allotment'); return }
    toast.success('Allotment reversed')
    logAction('ALLOTMENT_REVERSED', `${reversing.books?.title} x${reversing.qty} for ${reversing.institution_name} — ${reason}`)
    setReversing(null)
    fetchAll()
  }

  const visible = allotments.filter(a => {
    const matchSearch = a.institution_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.books?.title?.toLowerCase().includes(search.toLowerCase())
    const matchReversed = showReversed ? true : !a.is_reversed
    return matchSearch && matchReversed
  })

  const reversedCount = allotments.filter(a => a.is_reversed).length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Allotments</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{allotments.filter(a => !a.is_reversed).length} active allotments</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
          <Plus size={16} /> New Allotment
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by institution or book..."
            className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
        </div>
        {reversedCount > 0 && (
          <button onClick={() => setShowReversed(v => !v)}
            className={`text-sm px-4 py-2 rounded-lg border transition-all flex-shrink-0 ${showReversed ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' : 'bg-[#1a1a2e] border-[#2a2a45] text-[#6b7280] hover:text-white'}`}>
            {showReversed ? 'Hide Reversed' : `Show Reversed (${reversedCount})`}
          </button>
        )}
      </div>

      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-[#2a2a45]">
              {['INSTITUTION', 'BOOK', 'QTY', 'TYPE', 'APPROVED BY', 'ALLOTTED BY', 'DATE', 'ACTIONS'].map(h => (
                <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a45]">
            {loading ? [...Array(4)].map((_, i) => (
              <tr key={i}>{[...Array(8)].map((_, j) => (
                <td key={j} className="px-4 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse" /></td>
              ))}</tr>
            )) : visible.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-[#6b7280] py-10 text-sm">No allotments found</td></tr>
            ) : visible.map(a => (
              <tr key={a.id} className={`hover:bg-[#12121f] transition-colors ${a.is_reversed ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <p className="text-white text-sm font-medium">{a.institution_name}</p>
                  {a.contact_person && <p className="text-[#6b7280] text-xs">{a.contact_person}</p>}
                  {a.is_reversed && (
                    <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded-full">Reversed</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[#9ca3af] text-sm">{a.books?.title}</td>
                <td className="px-4 py-3 text-white text-sm">{a.qty}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${a.type === 'external' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                    {a.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#9ca3af] text-sm">{a.approved_by || '—'}</td>
                <td className="px-4 py-3 text-[#9ca3af] text-sm">{a.users?.name || '—'}</td>
                <td className="px-4 py-3 text-[#9ca3af] text-sm">{format(new Date(a.allotted_at), 'dd MMM yy')}</td>
                <td className="px-4 py-3">
                  {!a.is_reversed ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditing(a)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] transition-all">
                        <Pencil size={10} /> Edit
                      </button>
                      <button onClick={() => setReversing(a)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[#2a2a45] hover:bg-red-500/20 hover:text-red-400 text-[#9ca3af] transition-all">
                        <RotateCcw size={10} /> Reverse
                      </button>
                    </div>
                  ) : (
                    <p className="text-[#6b7280] text-xs">{a.reversal_reason || '—'}</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AllotmentModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleCreate} books={books} initial={null} stockMap={stockMap} />
      <AllotmentModal open={!!editing} onClose={() => setEditing(null)} onSave={handleEdit} books={books} initial={editing} stockMap={stockMap} />
      <ReversalModal open={!!reversing} onClose={() => setReversing(null)} onConfirm={handleReversal} allotment={reversing} />
    </div>
  )
}
