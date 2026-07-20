import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { logAction } from '../../lib/audit'
import { useAuthStore } from '../../store/authStore'

const MEDIUM_COLORS = {
  hindi:   { bg: 'bg-[#bd0a0a]', text: 'text-white', label: 'HINDI' },
  english: { bg: 'bg-[#f0a500]', text: 'text-black', label: 'ENGLISH' },
  both:    { bg: 'bg-teal-600',  text: 'text-white', label: 'H + E' },
}

export default function BookPrices() {
  const { priceAccess, isAdmin, isAccountant } = useAuthStore()
  const canEdit = isAdmin || isAccountant || priceAccess === 'edit'

  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [mediumFilter, setMediumFilter] = useState('all')
  const [mrpEdits, setMrpEdits] = useState({})
  const [savingMrp, setSavingMrp] = useState(null)

  useEffect(() => { fetchBooks() }, [])

  async function fetchBooks() {
    setLoading(true)
    const { data } = await supabase
      .from('books')
      .select('id, title, exam_level, unit, part, medium, is_active, mrp')
      .order('exam_level').order('unit').order('part').order('title')
    setBooks(data || [])
    setLoading(false)
  }

  async function handleSave(bookId, bookTitle, value) {
    const trimmed = String(value).trim()
    const parsed = trimmed === '' ? null : parseFloat(trimmed)
    if (trimmed !== '' && (isNaN(parsed) || parsed < 0)) { toast.error('Enter a valid price'); return }
    setSavingMrp(bookId)
    const { error } = await supabase.from('books').update({ mrp: parsed }).eq('id', bookId)
    if (error) { toast.error('Failed to save'); setSavingMrp(null); return }
    toast.success(parsed != null ? `MRP updated to ₹${parsed}` : 'MRP cleared')
    logAction('BOOK_UPDATED', `${bookTitle} — MRP set to ${parsed != null ? '₹' + parsed : 'none'}`)
    setMrpEdits(e => { const n = { ...e }; delete n[bookId]; return n })
    setSavingMrp(null)
    fetchBooks()
  }

  const filtered = books.filter(b => {
    const matchSearch =
      b.title?.toLowerCase().includes(search.toLowerCase()) ||
      b.exam_level?.toLowerCase().includes(search.toLowerCase()) ||
      b.unit?.toLowerCase().includes(search.toLowerCase())
    const matchMedium = mediumFilter === 'all' || b.medium === mediumFilter
    return matchSearch && matchMedium
  })

  const activeBooks = filtered.filter(b => b.is_active)
  const inactiveBooks = filtered.filter(b => !b.is_active)

  const priceSetCount = books.filter(b => b.is_active && b.mrp != null).length
  const activeCount = books.filter(b => b.is_active).length

  function renderRow(book) {
    const lvl = [book.exam_level, book.unit, book.part].filter(Boolean).join(' › ')
    const editVal = mrpEdits[book.id]
    const currentDisplay = editVal !== undefined ? editVal : (book.mrp != null ? String(book.mrp) : '')
    const isDirty = editVal !== undefined

    const mc = MEDIUM_COLORS[book.medium] || MEDIUM_COLORS.hindi

    return (
      <div key={book.id} className={`flex items-center gap-3 px-4 py-3 border-b border-[#2a2a45] last:border-0 transition-all ${!book.is_active ? 'opacity-40' : ''}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {lvl ? (
              <p className="text-white text-sm font-semibold">{lvl}</p>
            ) : (
              <p className="text-white text-sm font-semibold">{book.title}</p>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${mc.bg} ${mc.text} flex-shrink-0`}>
              {mc.label}
            </span>
          </div>
          {lvl && <p className="text-[#6b7280] text-xs truncate mt-0.5">{book.title}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit ? (
            <>
              {book.mrp != null && !isDirty && (
                <span className="text-[#6b7280] text-xs">₹{book.mrp}</span>
              )}
              <span className="text-[#6b7280] text-sm">₹</span>
              <input
                type="number" min="0" step="0.01"
                placeholder={book.mrp != null ? String(book.mrp) : '—'}
                value={currentDisplay}
                onChange={e => setMrpEdits(m => ({ ...m, [book.id]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter' && isDirty) handleSave(book.id, book.title, editVal) }}
                className={`w-24 bg-[#12121f] border rounded-lg px-2 py-1.5 text-white text-sm text-right focus:outline-none transition-all ${isDirty ? 'border-[#f0a500] focus:border-[#f0a500]' : 'border-[#2a2a45] focus:border-[#f0a500]'}`}
              />
              <button
                onClick={() => isDirty && handleSave(book.id, book.title, editVal)}
                disabled={!isDirty || savingMrp === book.id}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all w-14 text-center ${isDirty ? 'bg-[#f0a500] hover:bg-[#d4920a] text-black' : 'bg-[#2a2a45] text-[#4b5563] cursor-default'}`}>
                {savingMrp === book.id ? '…' : isDirty ? 'Save' : 'set'}
              </button>
            </>
          ) : (
            <span className="text-white text-sm font-medium">
              {book.mrp != null ? `₹${book.mrp}` : <span className="text-[#4b5563]">—</span>}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-white text-2xl font-bold">Book Prices</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">
          {priceSetCount} of {activeCount} active books have MRP set
        </p>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, exam or unit…"
          className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#f0a500] placeholder-[#4b5563]"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all',     label: 'All' },
          { key: 'hindi',   label: 'Hindi' },
          { key: 'english', label: 'English' },
          { key: 'both',    label: 'Hindi + English' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setMediumFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              mediumFilter === key
                ? key === 'hindi'   ? 'bg-[#bd0a0a] border-[#bd0a0a] text-white'
                : key === 'english' ? 'bg-[#f0a500] border-[#f0a500] text-black'
                : key === 'both'    ? 'bg-teal-600 border-teal-600 text-white'
                :                     'bg-white border-white text-black'
                : 'bg-[#1a1a2e] border-[#2a2a45] text-[#9ca3af] hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a45]">
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-[#2a2a45] rounded w-32 animate-pulse" />
                <div className="h-3 bg-[#2a2a45] rounded w-48 animate-pulse" />
              </div>
              <div className="h-8 w-36 bg-[#2a2a45] rounded-lg animate-pulse" />
            </div>
          ))
        ) : activeBooks.length === 0 && inactiveBooks.length === 0 ? (
          <p className="text-[#6b7280] text-sm text-center py-10">No books found</p>
        ) : (
          <>
            {activeBooks.map(book => renderRow(book))}
            {inactiveBooks.length > 0 && (
              <>
                <div className="px-4 py-2 bg-[#12121f] border-t border-[#2a2a45]">
                  <p className="text-[#4b5563] text-xs font-medium uppercase tracking-wide">Inactive Books</p>
                </div>
                {inactiveBooks.map(book => renderRow(book))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
