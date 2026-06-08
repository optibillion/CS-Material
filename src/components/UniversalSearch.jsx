import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Users, BookOpen, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function UniversalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ students: [], books: [], bundles: [] })
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timeout = useRef(null)
  const navigate = useNavigate()
  const { isAdmin } = useAuthStore()
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(q) {
    setQuery(q)
    if (timeout.current) clearTimeout(timeout.current)
    if (q.length < 2) { setResults({ students: [], books: [], bundles: [] }); setOpen(false); return }
    timeout.current = setTimeout(async () => {
      setLoading(true)
      const [{ data: students }, { data: books }, { data: bundles }] = await Promise.all([
        supabase.from('students').select('id, name, student_id, phone, course_name')
          .or(`name.ilike.%${q}%,student_id.ilike.%${q}%,phone.ilike.%${q}%`).limit(4),
        supabase.from('books').select('id, title, category, medium').eq('is_active', true)
          .ilike('title', `%${q}%`).limit(3),
        supabase.from('bundles').select('id, name, bundle_books(count)').eq('is_active', true)
          .ilike('name', `%${q}%`).limit(2)
      ])
      setResults({ students: students || [], books: books || [], bundles: bundles || [] })
      setOpen(true)
      setLoading(false)
    }, 350)
  }

  function goTo(path) {
    navigate(path)
    setQuery('')
    setOpen(false)
  }

  const hasResults = results.students.length > 0 || results.books.length > 0 || results.bundles.length > 0
  const base = isAdmin ? '/admin' : '/issuer'

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Search students, books, bundles..."
          autoCapitalize="none"
          autoCorrect="off"
          className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]"
        />
        {loading && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-[#bd0a0a] border-t-transparent rounded-full animate-spin" />}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden z-50 shadow-xl">
          {!hasResults ? (
            <p className="text-[#6b7280] text-sm px-4 py-3">No results for "{query}"</p>
          ) : (
            <>
              {results.students.length > 0 && (
                <div>
                  <div className="px-4 py-2 border-b border-[#2a2a45]">
                    <p className="text-[#6b7280] text-xs font-medium flex items-center gap-1.5"><Users size={11} /> STUDENTS</p>
                  </div>
                  {results.students.map(s => (
                    <button key={s.id} onClick={() => goTo(`${base}/students/${s.id}`)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#2a2a45] transition-colors text-left">
                      <div>
                        <p className="text-white text-sm font-medium">{s.name}</p>
                        <p className="text-[#6b7280] text-xs">{s.phone} · {s.course_name || 'No course'}</p>
                      </div>
                      <span className="text-[#f0a500] text-xs font-mono">{s.student_id}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.books.length > 0 && (
                <div>
                  <div className="px-4 py-2 border-t border-b border-[#2a2a45]">
                    <p className="text-[#6b7280] text-xs font-medium flex items-center gap-1.5"><BookOpen size={11} /> BOOKS</p>
                  </div>
                  {results.books.map(b => (
                    <button key={b.id} onClick={() => goTo(`${base}/books`)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#2a2a45] transition-colors text-left">
                      <p className="text-white text-sm">{b.title}</p>
                      <span className="text-[#6b7280] text-xs">{b.category?.replace('_',' ')} · {b.medium}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.bundles.length > 0 && (
                <div>
                  <div className="px-4 py-2 border-t border-b border-[#2a2a45]">
                    <p className="text-[#6b7280] text-xs font-medium flex items-center gap-1.5"><Package size={11} /> BUNDLES</p>
                  </div>
                  {results.bundles.map(b => (
                    <button key={b.id} onClick={() => goTo(`${base}/bundles`)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#2a2a45] transition-colors text-left">
                      <p className="text-white text-sm">{b.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}