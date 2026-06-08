import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { logAction } from '../../lib/audit'

function Modal({ open, onClose, onSave, books }) {
  const [form, setForm] = useState({ institution_name: '', contact_person: '', book_id: '', qty: '', type: 'external', from_location: '', to_location: '', approved_by: '', notes: '' })
  useEffect(() => { if (open) setForm({ institution_name: '', contact_person: '', book_id: '', qty: '', type: 'external', from_location: '', to_location: '', approved_by: '', notes: '' }) }, [open])
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  async function handleSave() {
    if (!form.institution_name.trim() || !form.book_id || !form.qty) { toast.error('Fill required fields'); return }
    await onSave(form); onClose()
  }
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-white font-semibold text-lg mb-5">New Allotment</h2>
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
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">Record Allotment</button>
        </div>
      </div>
    </div>
  )
}

export default function Allotments() {
  const { profile } = useAuthStore()
  const [allotments, setAllotments] = useState([])
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from('allotments').select('*, books(title), users!allotments_allotted_by_fkey(name)').order('allotted_at', { ascending: false }),
      supabase.from('books').select('*').eq('is_active', true)
    ])
    setAllotments(a || []); setBooks(b || []); setLoading(false)
  }

  async function handleSave(form) {
    const payload = { ...form, qty: parseInt(form.qty), allotted_by: profile?.id, to_location: form.type === 'internal' ? form.to_location : null }
    const { error } = await supabase.from('allotments').insert(payload)
    if (error) { toast.error('Failed to record allotment'); return }
    toast.success('Allotment recorded')
    const bookTitle = books.find(b => b.id === form.book_id)?.title || form.book_id
    logAction('ALLOTMENT_CREATED', `${bookTitle} x${form.qty} → ${form.institution_name} (${form.type})`)
    fetchAll()
  }

  const filtered = allotments.filter(a =>
    a.institution_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.books?.title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Allotments</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{allotments.length} total allotments</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
          <Plus size={16} /> New Allotment
        </button>
      </div>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by institution or book..."
          className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
      </div>
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-[#2a2a45]">
              {['INSTITUTION', 'BOOK', 'QTY', 'TYPE', 'APPROVED BY', 'ALLOTTED BY', 'DATE'].map(h => (
                <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a45]">
            {loading ? [...Array(4)].map((_, i) => (
              <tr key={i}>{[...Array(7)].map((_, j) => (
                <td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse" /></td>
              ))}</tr>
            )) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-[#6b7280] py-10 text-sm">No allotments found</td></tr>
            ) : filtered.map(a => (
              <tr key={a.id} className="hover:bg-[#12121f] transition-colors">
                <td className="px-5 py-3">
                  <p className="text-white text-sm font-medium">{a.institution_name}</p>
                  <p className="text-[#6b7280] text-xs">{a.contact_person}</p>
                </td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm">{a.books?.title}</td>
                <td className="px-5 py-3 text-white text-sm">{a.qty}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${a.type === 'external' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                    {a.type}
                  </span>
                </td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm">{a.approved_by || '—'}</td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm">{a.users?.name || '—'}</td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm">{format(new Date(a.allotted_at), 'dd MMM yy')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} books={books} />
    </div>
  )
}