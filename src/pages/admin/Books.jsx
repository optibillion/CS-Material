import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Search, BookOpen, Eye, EyeOff, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { logAction } from '../../lib/audit'

const CATEGORIES = ['booklet', 'notes', 'test_series', 'paper_set']
const MEDIUMS = ['hindi', 'english', 'both']

function Badge({ label }) {
  const colors = {
    booklet: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    notes: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    test_series: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    paper_set: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    hindi: 'bg-[#bd0a0a]/20 text-red-400 border-[#bd0a0a]/30',
    english: 'bg-[#f0a500]/20 text-[#f0a500] border-[#f0a500]/30',
    both: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[label] || 'bg-[#2a2a45] text-[#9ca3af] border-[#2a2a45]'}`}>
      {label?.replace('_', ' ')}
    </span>
  )
}

function BookModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({ title: '', subject: '', medium: 'hindi', category: 'booklet', exam_level: '', unit: '', part: '' })
  useEffect(() => {
    if (initial) setForm(initial)
    else setForm({ title: '', subject: '', medium: 'hindi', category: 'booklet', exam_level: '', unit: '', part: '' })
  }, [initial, open])
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  async function handleSave() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    await onSave(form); onClose()
  }
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6">
        <h2 className="text-white font-semibold text-lg mb-5">{initial ? 'Edit Book' : 'Add New Book'}</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. MPPSC GS Paper 1"
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Subject</label>
            <input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. General Studies"
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Exam Level</label>
            <input list="exam-lvl-list" value={form.exam_level || ''} onChange={e => set('exam_level', e.target.value)} placeholder="e.g. Prelims, Mains"
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
            <datalist id="exam-lvl-list"><option value="Prelims"/><option value="Mains"/><option value="Interview"/></datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Unit</label>
              <input value={form.unit || ''} onChange={e => set('unit', e.target.value)} placeholder="e.g. Paper 1 Part-A"
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
            </div>
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Part <span className="text-[#6b7280] text-xs">(optional)</span></label>
              <input value={form.part || ''} onChange={e => set('part', e.target.value)} placeholder="e.g. Unit-1"
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Medium</label>
              <select value={form.medium} onChange={e => set('medium', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]">
                {MEDIUMS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]">
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">{initial ? 'Save Changes' : 'Add Book'}</button>
        </div>
      </div>
    </div>
  )
}

function BundlePromptModal({ open, onClose, onConfirm, bundles, bookTitle }) {
  const [selected, setSelected] = useState([])
  useEffect(() => { if (open) setSelected((bundles || []).map(b => b.id)) }, [open, bundles])
  function toggle(id) { setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]) }
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6">
        <div className="flex items-center gap-2 mb-1">
          <Package size={18} className="text-[#f0a500]" />
          <h2 className="text-white font-semibold text-lg">Add to Bundle?</h2>
        </div>
        <p className="text-[#6b7280] text-sm mb-4">
          "<span className="text-white">{bookTitle}</span>" matches {bundles?.length} bundle(s) with the same unit. Add it to:
        </p>
        <div className="space-y-2 mb-5">
          {(bundles || []).map(b => (
            <label key={b.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer border transition-all ${selected.includes(b.id) ? 'bg-[#f0a500]/10 border-[#f0a500]/40' : 'bg-[#12121f] border-[#2a2a45] hover:border-[#3a3a55]'}`}>
              <input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggle(b.id)} className="accent-[#f0a500]" />
              <div className="flex items-center gap-2">
                <Package size={13} className="text-[#f0a500]" />
                <span className="text-white text-sm">{b.name}</span>
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Skip</button>
          <button onClick={() => selected.length > 0 && onConfirm(selected)} disabled={selected.length === 0}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#f0a500] hover:bg-[#d4920a] disabled:opacity-50 text-black font-semibold text-sm transition-all">
            Add to {selected.length} Bundle{selected.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Books() {
  const [books, setBooks] = useState([])
  const [issuanceCounts, setIssuanceCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterExam, setFilterExam] = useState('all')
  const [filterUnit, setFilterUnit] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [bundlePrompt, setBundlePrompt] = useState(null)

  useEffect(() => { fetchBooks() }, [])

  async function fetchBooks() {
    setLoading(true)
    const [{ data: b }, { data: ic }] = await Promise.all([
      supabase.from('books').select('*').order('created_at', { ascending: false }),
      supabase.from('issuances').select('book_id').eq('is_reversed', false)
    ])
    const counts = {}
    for (const r of (ic || [])) counts[r.book_id] = (counts[r.book_id] || 0) + 1
    setBooks(b || [])
    setIssuanceCounts(counts)
    setLoading(false)
  }

  async function handleSave(form) {
    if (editing) {
      const { error } = await supabase.from('books').update(form).eq('id', editing.id)
      if (error) { toast.error('Failed to update'); return }
      toast.success('Book updated')
      logAction('BOOK_UPDATED', `${form.title} (${form.medium})`)
      fetchBooks()
    } else {
      const { data: newBook, error } = await supabase.from('books').insert(form).select().single()
      if (error) { toast.error('Failed to add book'); return }
      toast.success('Book added')
      logAction('BOOK_CREATED', `${form.title} (${form.medium}, ${form.category})`)
      fetchBooks()

      if (newBook.unit && newBook.exam_level) {
        const { data: similarBooks } = await supabase
          .from('books')
          .select('id')
          .eq('unit', newBook.unit)
          .eq('exam_level', newBook.exam_level)
          .eq('is_active', true)
          .neq('id', newBook.id)

        if (similarBooks?.length > 0) {
          const { data: bundleLinks } = await supabase
            .from('bundle_books')
            .select('bundle_id, bundles(id, name, is_active)')
            .in('book_id', similarBooks.map(b => b.id))

          const uniqueBundles = [...new Map(
            (bundleLinks || [])
              .filter(bl => bl.bundles?.is_active)
              .map(bl => [bl.bundle_id, bl.bundles])
          ).values()].filter(Boolean)

          if (uniqueBundles.length > 0) {
            setBundlePrompt({ bookId: newBook.id, bookTitle: newBook.title, bundles: uniqueBundles })
          }
        }
      }
    }
  }

  async function handleAddToBundles(bundleIds) {
    const rows = bundleIds.map(bid => ({ bundle_id: bid, book_id: bundlePrompt.bookId }))
    const { error } = await supabase.from('bundle_books').insert(rows)
    if (error) { toast.error('Failed to add to bundles'); return }
    toast.success(`Added to ${bundleIds.length} bundle(s)`)
    logAction('BUNDLE_UPDATED', `${bundlePrompt.bookTitle} added to ${bundleIds.length} bundle(s)`)
    setBundlePrompt(null)
  }

  async function toggleActive(book) {
    const { error } = await supabase.from('books').update({ is_active: !book.is_active }).eq('id', book.id)
    if (error) { toast.error('Failed to update'); return }
    toast.success(book.is_active ? 'Book deactivated' : 'Book activated')
    logAction(book.is_active ? 'BOOK_DEACTIVATED' : 'BOOK_ACTIVATED', book.title)
    fetchBooks()
  }

  const examOptions = [...new Set(books.map(b => b.exam_level).filter(Boolean))].sort()
  const unitOptions = [...new Set(
    books.filter(b => filterExam === 'all' || b.exam_level === filterExam).map(b => b.unit).filter(Boolean)
  )].sort()

  const filtered = books.filter(b => {
    const matchSearch = b.title?.toLowerCase().includes(search.toLowerCase()) || b.subject?.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || b.category === filterCat
    const matchExam = filterExam === 'all' || b.exam_level === filterExam
    const matchUnit = filterUnit === 'all' || b.unit === filterUnit
    return matchSearch && matchCat && matchExam && matchUnit
  })

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Books</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{books.length} total in catalogue</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true) }}
          className="flex items-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
          <Plus size={16} /> Add Book
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or subject..."
            className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="bg-[#1a1a2e] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]">
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
      </div>

      {examOptions.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[#6b7280] text-xs w-10">Exam</span>
            {['all', ...examOptions].map(e => (
              <button key={e} onClick={() => { setFilterExam(e); setFilterUnit('all') }}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize ${filterExam === e ? 'bg-[#bd0a0a] border-[#bd0a0a] text-white' : 'bg-[#1a1a2e] border-[#2a2a45] text-[#9ca3af] hover:text-white hover:border-[#bd0a0a]'}`}>
                {e === 'all' ? 'All' : e}
              </button>
            ))}
          </div>
          {unitOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[#6b7280] text-xs w-10">Unit</span>
              {['all', ...unitOptions].map(u => (
                <button key={u} onClick={() => setFilterUnit(u)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize ${filterUnit === u ? 'bg-[#f0a500] border-[#f0a500] text-black' : 'bg-[#1a1a2e] border-[#2a2a45] text-[#9ca3af] hover:text-white hover:border-[#f0a500]'}`}>
                  {u === 'all' ? 'All' : u}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Desktop table */}
      <div className="mob-table bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-[#2a2a45]">
              {['TITLE','SUBJECT','CATEGORY','MEDIUM','ISSUED','STATUS','ACTIONS'].map(h=>(
                <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a45]">
            {loading ? [...Array(5)].map((_,i)=>(
              <tr key={i}>{[...Array(7)].map((_,j)=>(
                <td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse"/></td>
              ))}</tr>
            )) : filtered.length===0 ? (
              <tr><td colSpan={7} className="text-center text-[#6b7280] py-10 text-sm">No books found</td></tr>
            ) : filtered.map(book=>(
              <tr key={book.id} className={`hover:bg-[#12121f] transition-colors ${!book.is_active?'opacity-50':''}`}>
                <td className="px-5 py-3"><div className="flex items-center gap-2"><BookOpen size={15} className="text-[#bd0a0a] flex-shrink-0"/>
                  <div>
                    {(book.exam_level||book.unit||book.part) && <p className="text-[#6b7280] text-xs">{[book.exam_level,book.unit,book.part].filter(Boolean).join(' › ')}</p>}
                    <span className="text-white text-sm font-medium">{book.title}</span>
                  </div>
                </div></td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm">{book.subject||'—'}</td>
                <td className="px-5 py-3"><Badge label={book.category}/></td>
                <td className="px-5 py-3"><Badge label={book.medium}/></td>
                <td className="px-5 py-3">
                  <span className="text-sm font-semibold text-[#f0a500]">{issuanceCounts[book.id] || 0}</span>
                  <span className="text-[#6b7280] text-xs ml-1">copies</span>
                </td>
                <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${book.is_active?'bg-emerald-500/20 text-emerald-400 border-emerald-500/30':'bg-[#2a2a45] text-[#6b7280] border-[#2a2a45]'}`}>{book.is_active?'Active':'Inactive'}</span></td>
                <td className="px-5 py-3"><div className="flex items-center gap-2">
                  <button onClick={()=>{setEditing(book);setModalOpen(true)}} className="text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white transition-all">Edit</button>
                  <button onClick={()=>toggleActive(book)} className="text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] transition-all flex items-center gap-1">{book.is_active?<EyeOff size={12}/>:<Eye size={12}/>}{book.is_active?'Deactivate':'Activate'}</button>
                </div></td>
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
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-6 text-center text-[#6b7280] text-sm">No books found</div>
        ) : filtered.map(book=>(
          <div key={book.id} className={`bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 ${!book.is_active?'opacity-50':''}`}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1 min-w-0 mr-2">
                {(book.exam_level||book.unit||book.part) && <p className="text-[#6b7280] text-xs mb-0.5">{[book.exam_level,book.unit,book.part].filter(Boolean).join(' › ')}</p>}
                <p className="text-white font-semibold text-sm">{book.title}</p>
              </div>
              <Badge label={book.medium}/>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge label={book.category}/>
              {book.subject&&<span className="text-xs text-[#6b7280]">{book.subject}</span>}
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#6b7280] text-xs">Issued (active copies)</span>
              <span className="text-[#f0a500] text-sm font-bold">{issuanceCounts[book.id] || 0}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>{setEditing(book);setModalOpen(true)}} className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white transition-all">Edit</button>
              <button onClick={()=>toggleActive(book)} className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] transition-all">{book.is_active?'Deactivate':'Activate'}</button>
            </div>
          </div>
        ))}
      </div>

      <BookModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} initial={editing} />
      <BundlePromptModal
        open={!!bundlePrompt}
        onClose={() => setBundlePrompt(null)}
        onConfirm={handleAddToBundles}
        bundles={bundlePrompt?.bundles}
        bookTitle={bundlePrompt?.bookTitle}
      />
    </div>
  )
}
