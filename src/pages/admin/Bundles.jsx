import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Package, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { logAction } from '../../lib/audit'

function Modal({ open, onClose, onSave, books, initial }) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState('')
  const [examFilter, setExamFilter] = useState('all')
  const isEdit = !!initial

  useEffect(() => {
    if (open) {
      setName(initial?.name || '')
      setSelected(initial?.bundle_books?.map(bb => bb.book_id) || [])
      setSearch('')
      setExamFilter('all')
    }
  }, [open, initial])

  function toggle(id) { setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]) }

  async function handleSave() {
    if (!name.trim()) { toast.error('Bundle name required'); return }
    if (selected.length === 0) { toast.error('Select at least one book'); return }
    await onSave(name, selected); onClose()
  }

  const examLevels = useMemo(() =>
    [...new Set(books.map(b => b.exam_level).filter(Boolean))].sort(),
    [books]
  )

  const filtered = useMemo(() => books.filter(b => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      b.title?.toLowerCase().includes(q) ||
      b.unit?.toLowerCase().includes(q) ||
      b.subject?.toLowerCase().includes(q)
    const matchExam = examFilter === 'all' || b.exam_level === examFilter
    return matchSearch && matchExam
  }), [books, search, examFilter])

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6 max-h-[90vh] flex flex-col">
        <h2 className="text-white font-semibold text-lg mb-5">{isEdit ? 'Edit Bundle' : 'Create Bundle'}</h2>
        <div className="space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Bundle Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. VIP 2026 Full Kit"
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Select Books ({selected.length} selected)</label>

            {/* Exam level chips */}
            {examLevels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['all', ...examLevels].map(lvl => (
                  <button key={lvl} type="button" onClick={() => setExamFilter(lvl)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      examFilter === lvl
                        ? lvl === 'Prelims' ? 'bg-blue-500/30 border-blue-500/60 text-blue-300'
                          : lvl === 'Mains' ? 'bg-purple-500/30 border-purple-500/60 text-purple-300'
                          : 'bg-[#bd0a0a] border-[#bd0a0a] text-white'
                        : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] hover:border-[#4a4a65]'
                    }`}>
                    {lvl === 'all' ? 'All' : lvl}
                  </button>
                ))}
              </div>
            )}

            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, unit, subject..."
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563] mb-2" />

            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {filtered.map(b => {
                const label = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
                return (
                  <label key={b.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all border ${selected.includes(b.id) ? 'bg-[#bd0a0a]/20 border-[#bd0a0a]/40' : 'bg-[#12121f] border-[#2a2a45] hover:border-[#3a3a55]'}`}>
                    <input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggle(b.id)} className="accent-[#bd0a0a] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {label
                        ? <>
                            <p className="text-white text-sm font-medium truncate">{label}</p>
                            <p className="text-[#6b7280] text-xs truncate">{b.title} · {b.category?.replace('_',' ')}</p>
                          </>
                        : <>
                            <p className="text-white text-sm truncate">{b.title}</p>
                            <p className="text-[#6b7280] text-xs">{b.category?.replace('_',' ')} · {b.medium}</p>
                          </>
                      }
                    </div>
                  </label>
                )
              })}
              {filtered.length === 0 && <p className="text-[#6b7280] text-sm text-center py-4">No books found</p>}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">
            {isEdit ? 'Save Changes' : 'Create Bundle'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Bundles() {
  const [bundles, setBundles] = useState([])
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: bu }, { data: bo }] = await Promise.all([
      supabase.from('bundles').select('*, bundle_books(book_id, books(title, category, medium))').order('created_at', { ascending: false }),
      supabase.from('books').select('*').eq('is_active', true).order('title')
    ])
    setBundles(bu || []); setBooks(bo || []); setLoading(false)
  }

  async function handleCreate(name, bookIds) {
    const { data: bundle, error } = await supabase.from('bundles').insert({ name }).select().single()
    if (error) { toast.error('Failed to create bundle'); return }
    const rows = bookIds.map(book_id => ({ bundle_id: bundle.id, book_id }))
    const { error: e2 } = await supabase.from('bundle_books').insert(rows)
    if (e2) { toast.error('Failed to add books'); return }
    toast.success('Bundle created')
    logAction('BUNDLE_CREATED', `${name} — ${bookIds.length} books`)
    fetchAll()
  }

  async function handleEdit(name, bookIds) {
    const { error: e1 } = await supabase.from('bundles').update({ name }).eq('id', editing.id)
    if (e1) { toast.error('Failed to update bundle'); return }
    await supabase.from('bundle_books').delete().eq('bundle_id', editing.id)
    const rows = bookIds.map(book_id => ({ bundle_id: editing.id, book_id }))
    const { error: e2 } = await supabase.from('bundle_books').insert(rows)
    if (e2) { toast.error('Failed to update books'); return }
    toast.success('Bundle updated')
    logAction('BUNDLE_UPDATED', `${editing.name} → ${name} — ${bookIds.length} books`)
    setEditing(null)
    fetchAll()
  }

  async function toggleActive(bundle) {
    await supabase.from('bundles').update({ is_active: !bundle.is_active }).eq('id', bundle.id)
    toast.success(bundle.is_active ? 'Bundle deactivated' : 'Bundle activated')
    logAction(bundle.is_active ? 'BUNDLE_DEACTIVATED' : 'BUNDLE_ACTIVATED', bundle.name)
    fetchAll()
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Bundles</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Group books into bundles for quick issuance</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
          <Plus size={16} /> Create Bundle
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-5 h-40 animate-pulse" />)}
        </div>
      ) : bundles.length === 0 ? (
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-10 text-center">
          <Package size={32} className="text-[#2a2a45] mx-auto mb-3" />
          <p className="text-[#6b7280] text-sm">No bundles yet — create one to group books for quick issuance</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bundles.map(b => (
            <div key={b.id} className={`bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-5 ${!b.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Package size={16} className="text-[#f0a500] flex-shrink-0" />
                  <h3 className="text-white font-semibold text-sm truncate">{b.name}</h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ml-2 ${b.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-[#2a2a45] text-[#6b7280] border-[#2a2a45]'}`}>
                  {b.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-1 mb-4 max-h-32 overflow-y-auto">
                {b.bundle_books?.map(bb => (
                  <div key={bb.book_id} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#bd0a0a] flex-shrink-0" />
                    <p className="text-[#9ca3af] text-xs truncate">{bb.books?.title}</p>
                  </div>
                ))}
              </div>
              <p className="text-[#6b7280] text-xs mb-3">{b.bundle_books?.length} books</p>
              <div className="flex gap-2">
                <button onClick={() => setEditing(b)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] transition-all">
                  <Pencil size={11} /> Edit
                </button>
                <button onClick={() => toggleActive(b)}
                  className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] transition-all">
                  {b.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleCreate} books={books} initial={null} />
      <Modal open={!!editing} onClose={() => setEditing(null)} onSave={handleEdit} books={books} initial={editing} />
    </div>
  )
}
