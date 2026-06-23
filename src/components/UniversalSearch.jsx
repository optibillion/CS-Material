import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Users, BookOpen, Package, ChevronRight, Send, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function UniversalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ students: [], books: [], bundles: [] })
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const timeout = useRef(null)
  const navigate = useNavigate()
  const { isAdmin } = useAuthStore()
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setExpandedId(null) }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(q) {
    setQuery(q)
    setExpandedId(null)
    if (timeout.current) clearTimeout(timeout.current)
    if (q.length < 2) { setResults({ students: [], books: [], bundles: [] }); setOpen(false); return }
    timeout.current = setTimeout(async () => {
      setLoading(true)
      const [{ data: students }, { data: books }, { data: bundles }] = await Promise.all([
        supabase.from('students').select('id, name, student_id, phone, medium, batches(name), bag_issued')
          .or(`name.ilike.%${q}%,student_id.ilike.%${q}%,phone.ilike.%${q}%`).limit(5),
        supabase.from('books').select('id, title, category, medium').eq('is_active', true)
          .ilike('title', `%${q}%`).limit(4),
        supabase.from('bundles').select('id, name').eq('is_active', true)
          .ilike('name', `%${q}%`).limit(3)
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
    setExpandedId(null)
  }

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
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
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden z-50 shadow-xl max-h-[80vh] overflow-y-auto">
          {!hasResults ? (
            <p className="text-[#6b7280] text-sm px-4 py-3">No results for "{query}"</p>
          ) : (
            <>
              {results.students.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-[#12121f] border-b border-[#2a2a45]">
                    <p className="text-[#6b7280] text-xs font-medium flex items-center gap-1.5"><Users size={11} /> STUDENTS</p>
                  </div>
                  {results.students.map(s => (
                    <div key={s.id} className="border-b border-[#2a2a45] last:border-0">
                      <button onClick={() => toggleExpand(`s-${s.id}`)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#2a2a45] transition-colors text-left">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{s.name}</p>
                          <p className="text-[#6b7280] text-xs">
                            {s.phone} · {s.batches?.name || 'No batch'}
                            {s.bag_issued && <span className="ml-2 text-[#f0a500]">🎒 Bag issued</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <span className="text-[#f0a500] text-xs font-mono">{s.student_id}</span>
                          <ChevronRight size={14} className={`text-[#6b7280] transition-transform duration-150 ${expandedId === `s-${s.id}` ? 'rotate-90' : ''}`} />
                        </div>
                      </button>
                      {expandedId === `s-${s.id}` && (
                        <div className="px-4 pb-3 pt-1 flex flex-wrap gap-2 bg-[#0e0e1f] border-t border-[#2a2a45]">
                          <button onClick={() => goTo(`${base}/students/${s.id}`)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white transition-all">
                            <Eye size={11} /> View Profile
                          </button>
                          <button onClick={() => goTo(`${base}/issue?student=${s.id}`)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white transition-all">
                            <Send size={11} /> Issue Books
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {results.books.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-[#12121f] border-b border-[#2a2a45]">
                    <p className="text-[#6b7280] text-xs font-medium flex items-center gap-1.5"><BookOpen size={11} /> BOOKS</p>
                  </div>
                  {results.books.map(b => (
                    <div key={b.id} className="border-b border-[#2a2a45] last:border-0">
                      <button onClick={() => toggleExpand(`b-${b.id}`)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#2a2a45] transition-colors text-left">
                        <p className="text-white text-sm flex-1 min-w-0 truncate pr-2">{b.title}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[#6b7280] text-xs hidden sm:block">{b.category?.replace('_',' ')} · {b.medium}</span>
                          <ChevronRight size={14} className={`text-[#6b7280] transition-transform duration-150 ${expandedId === `b-${b.id}` ? 'rotate-90' : ''}`} />
                        </div>
                      </button>
                      {expandedId === `b-${b.id}` && (
                        <div className="px-4 pb-3 pt-1 flex flex-wrap gap-2 bg-[#0e0e1f] border-t border-[#2a2a45]">
                          <button onClick={() => goTo(`${base}/books`)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white transition-all">
                            <BookOpen size={11} /> View in Books
                          </button>
                          <button onClick={() => goTo(`${base}/issue`)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white transition-all">
                            <Send size={11} /> Go to Issue
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {results.bundles.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-[#12121f] border-b border-[#2a2a45]">
                    <p className="text-[#6b7280] text-xs font-medium flex items-center gap-1.5"><Package size={11} /> BUNDLES</p>
                  </div>
                  {results.bundles.map(b => (
                    <div key={b.id} className="border-b border-[#2a2a45] last:border-0">
                      <button onClick={() => toggleExpand(`bun-${b.id}`)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#2a2a45] transition-colors text-left">
                        <p className="text-white text-sm flex-1 min-w-0 truncate pr-2">{b.name}</p>
                        <ChevronRight size={14} className={`text-[#6b7280] transition-transform duration-150 flex-shrink-0 ${expandedId === `bun-${b.id}` ? 'rotate-90' : ''}`} />
                      </button>
                      {expandedId === `bun-${b.id}` && (
                        <div className="px-4 pb-3 pt-1 flex flex-wrap gap-2 bg-[#0e0e1f] border-t border-[#2a2a45]">
                          <button onClick={() => goTo(`${base}/bundles`)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white transition-all">
                            <Package size={11} /> View Bundles
                          </button>
                          <button onClick={() => goTo(`${base}/issue`)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white transition-all">
                            <Send size={11} /> Go to Issue
                          </button>
                        </div>
                      )}
                    </div>
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
