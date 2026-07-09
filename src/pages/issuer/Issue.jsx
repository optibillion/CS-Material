import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase, generateStudentId, adjustStock } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Search, Package, AlertTriangle, Check, UserPlus, Printer, Languages, ShoppingBag, History } from 'lucide-react'
import { logAction } from '../../lib/audit'
import toast from 'react-hot-toast'

function SelectMediumModal({ open, student, onSave }) {
  const [medium, setMedium] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) setMedium('') }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Languages size={18} className="text-[#f0a500]" />
          <h2 className="text-white font-semibold text-lg">Select Medium</h2>
        </div>
        <p className="text-[#6b7280] text-sm mb-6">
          <span className="text-white font-medium">{student?.name}</span> has no medium on record. Select their medium — it will be saved to their profile and books will be filtered accordingly.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {['hindi', 'english'].map(m => (
            <button key={m} type="button" onClick={() => setMedium(m)}
              className={`py-5 rounded-xl border text-base font-semibold capitalize transition-all ${medium === m ? 'bg-[#bd0a0a] border-[#bd0a0a] text-white' : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] hover:border-[#bd0a0a] hover:text-white'}`}>
              {m === 'hindi' ? 'Hindi' : 'English'}
            </button>
          ))}
        </div>
        <button onClick={async () => { if (!medium) return; setSaving(true); await onSave(medium); setSaving(false) }}
          disabled={!medium || saving}
          className="w-full bg-[#bd0a0a] hover:bg-[#a00909] disabled:opacity-40 text-white font-semibold py-3 rounded-lg text-sm transition-all">
          {saving ? 'Saving...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  )
}

function CreateStudentModal({ open, onClose, onSave, batches, prefillName }) {
  const [form, setForm] = useState({ name: '', phone: '', dob: '', admission_date: '', batch_id: '', medium: '' })
  const [errors, setErrors] = useState({})
  const today = new Date().toISOString().split('T')[0]
  const dobMax = new Date(new Date().setFullYear(new Date().getFullYear() - 15)).toISOString().split('T')[0]
  useEffect(() => {
    if (open) { setForm({ name: prefillName || '', phone: '', dob: '', admission_date: '', batch_id: '', medium: '' }); setErrors({}) }
  }, [open, prefillName])
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  async function handleSave() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.phone) errs.phone = 'Phone is required'
    else if (!/^\d{10}$/.test(form.phone)) errs.phone = 'Must be exactly 10 digits'
    if (!form.dob) errs.dob = 'Date of birth is required'
    else if (form.dob < '1960-01-01' || form.dob > dobMax) errs.dob = 'Enter a valid date of birth (age 15–65)'
    if (form.admission_date && (form.admission_date < '2010-01-01' || form.admission_date > today))
      errs.admission_date = 'Must be between 2010 and today'
    if (!form.medium) errs.medium = 'Medium is required'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    await onSave(form)
  }
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-white font-semibold text-lg mb-1">Create New Student</h2>
        <p className="text-[#6b7280] text-sm mb-5">Student will be created and books issued immediately</p>
        <div className="space-y-4">
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Full Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Student full name"
              className={`w-full bg-[#12121f] border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none placeholder-[#4b5563] ${errors.name ? 'border-red-500' : 'border-[#2a2a45] focus:border-[#bd0a0a]'}`} />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Phone * (10 digits)</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                className={`w-full bg-[#12121f] border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none ${errors.phone ? 'border-red-500' : 'border-[#2a2a45] focus:border-[#bd0a0a]'}`} />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Date of Birth *</label>
              <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)}
                min="1960-01-01" max={dobMax}
                className={`w-full bg-[#12121f] border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none ${errors.dob ? 'border-red-500' : 'border-[#2a2a45] focus:border-[#bd0a0a]'}`} />
              {errors.dob && <p className="text-red-400 text-xs mt-1">{errors.dob}</p>}
            </div>
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Admission Date</label>
            <input type="date" value={form.admission_date} onChange={e => set('admission_date', e.target.value)}
              min="2010-01-01" max={today}
              className={`w-full bg-[#12121f] border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none ${errors.admission_date ? 'border-red-500' : 'border-[#2a2a45] focus:border-[#bd0a0a]'}`} />
            {errors.admission_date && <p className="text-red-400 text-xs mt-1">{errors.admission_date}</p>}
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Batch</label>
            <select value={form.batch_id} onChange={e => set('batch_id', e.target.value)}
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]">
              <option value="">Select batch</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Medium *</label>
            <div className="grid grid-cols-2 gap-2">
              {['hindi', 'english'].map(m => (
                <button key={m} type="button" onClick={() => set('medium', m)}
                  className={`py-2.5 rounded-lg border text-sm font-medium capitalize transition-all ${form.medium === m ? 'bg-[#bd0a0a] border-[#bd0a0a] text-white' : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] hover:border-[#bd0a0a]'}`}>
                  {m}
                </button>
              ))}
            </div>
            {errors.medium && <p className="text-red-400 text-xs mt-1">{errors.medium}</p>}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">Create & Continue</button>
        </div>
      </div>
    </div>
  )
}

export default function Issue() {
  const { profile } = useAuthStore()
  const [searchParams] = useSearchParams()
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentIssuances, setStudentIssuances] = useState([])
  const [books, setBooks] = useState([])
  const [bundles, setBundles] = useState([])
  const [batches, setBatches] = useState([])
  const [selectedRegularBooks, setSelectedRegularBooks] = useState([])
  const [selectedPreviousBooks, setSelectedPreviousBooks] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [lastIssued, setLastIssued] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [examFilter, setExamFilter] = useState('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [issuanceMode, setIssuanceMode] = useState('regular')
  const searchTimeout = useRef(null)

  useEffect(() => {
    async function init() {
      const [{ data: booksData }, { data: bundlesData }, { data: batchesData }] = await Promise.all([
        supabase.from('books').select('*').eq('is_active', true),
        supabase.from('bundles').select('*, bundle_books(book_id)').eq('is_active', true),
        supabase.from('batches').select('*').eq('is_active', true),
      ])
      setBooks(booksData || [])
      setBundles(bundlesData || [])
      setBatches(batchesData || [])

      const studentId = searchParams.get('student')
      if (studentId) {
        const { data, error } = await supabase.from('students').select('*').eq('id', studentId).single()
        if (data && !error) await selectStudent(data)
      }
      setInitialLoading(false)
    }
    init()
  }, [])

  function handleSearchChange(q) {
    setSearchQ(q)
    setSearched(false)
    setSearchResults([])
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.length < 2) return
    searchTimeout.current = setTimeout(async () => {
      const { data } = await supabase.from('students').select('*')
        .or(`name.ilike.%${q}%,student_id.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(8)
      setSearchResults(data || [])
      setSearched(true)
    }, 400)
  }

  async function selectStudent(s) {
    setSelectedStudent(s)
    setSearchResults([])
    setSearchQ(s.name)
    setSearched(false)
    setSelectedRegularBooks([])
    setSelectedPreviousBooks([])
    setIssuanceMode('regular')
    const { data } = await supabase.from('issuances')
      .select('book_id').eq('student_id', s.id).eq('is_reversed', false)
    setStudentIssuances(data?.map(i => i.book_id) || [])
  }

  async function handleSetMedium(medium) {
    const { data, error } = await supabase.from('students').update({ medium }).eq('id', selectedStudent.id).select('id')
    if (error || !data?.length) { toast.error('Failed to save medium — please try again'); return }
    toast.success(`Medium set to ${medium}`)
    logAction('STUDENT_UPDATED', `${selectedStudent.name} (${selectedStudent.student_id}) — medium set to ${medium}`)
    setSelectedStudent(prev => ({ ...prev, medium }))
  }

  async function handleCreateStudent(form) {
    const { data: existing } = await supabase
      .from('students').select('id, name, student_id').eq('phone', form.phone).maybeSingle()
    if (existing) {
      toast.error(`Phone already registered to ${existing.name} (${existing.student_id})`)
      return
    }
    if (form.dob) {
      const { data: dobMatch } = await supabase
        .from('students').select('id, name, student_id').ilike('name', form.name.trim()).eq('dob', form.dob).maybeSingle()
      if (dobMatch) {
        toast.error(`${dobMatch.name} (${dobMatch.student_id}) already registered with same name & date of birth`)
        return
      }
    }
    const student_id = await generateStudentId()
    const payload = {
      student_id,
      name: form.name,
      phone: form.phone,
      dob: form.dob || null,
      admission_date: form.admission_date || null,
      batch_id: form.batch_id || null,
      medium: form.medium || null,
      created_by: profile?.id
    }
    const { data, error } = await supabase.from('students').insert(payload).select().single()
    if (error) { toast.error('Failed to create student'); return }
    toast.success(`Student created — ${data.student_id}`)
    logAction('STUDENT_CREATED', `${data.name} (${data.student_id}) | ${data.phone}`)
    setCreating(false)
    await selectStudent(data)
  }

  function toggleBook(bookId) {
    if (studentIssuances.includes(bookId)) { toast.error('Already issued to this student'); return }
    if (issuanceMode === 'regular') {
      if (selectedPreviousBooks.includes(bookId)) { toast.error('Already selected as Previous Issue — remove it there first'); return }
      setSelectedRegularBooks(prev => prev.includes(bookId) ? prev.filter(b => b !== bookId) : [...prev, bookId])
    } else {
      if (selectedRegularBooks.includes(bookId)) { toast.error('Already selected as Regular Issue — remove it there first'); return }
      setSelectedPreviousBooks(prev => prev.includes(bookId) ? prev.filter(b => b !== bookId) : [...prev, bookId])
    }
  }

  function selectBundle(bundle) {
    const allIds = bundle.bundle_books.map(b => b.book_id)
    const mediumIds = selectedStudent?.medium
      ? allIds.filter(id => { const m = books.find(b => b.id === id)?.medium; return m === selectedStudent.medium || m === 'both' })
      : allIds
    const blocked = issuanceMode === 'regular'
      ? [...studentIssuances, ...selectedPreviousBooks]
      : [...studentIssuances, ...selectedRegularBooks]
    const ids = mediumIds.filter(id => !blocked.includes(id))
    const skipped = mediumIds.length - ids.length
    if (skipped > 0) toast.error(`${skipped} book(s) already issued or selected — skipped`)
    if (ids.length === 0) return
    if (issuanceMode === 'regular') setSelectedRegularBooks(prev => [...new Set([...prev, ...ids])])
    else setSelectedPreviousBooks(prev => [...new Set([...prev, ...ids])])
    toast.success(`${ids.length} book(s) added`)
  }

  async function handleCombinedIssue() {
    if (!selectedStudent || (selectedRegularBooks.length === 0 && selectedPreviousBooks.length === 0)) {
      toast.error('Select at least one book'); return
    }
    setLoading(true)
    const { data: freshIssuances } = await supabase.from('issuances')
      .select('book_id').eq('student_id', selectedStudent.id).eq('is_reversed', false)
    const alreadyIssuedIds = freshIssuances?.map(i => i.book_id) || []
    const regularToIssue = [...new Set(selectedRegularBooks)].filter(id => !alreadyIssuedIds.includes(id))
    const previousToIssue = [...new Set(selectedPreviousBooks)].filter(id => !alreadyIssuedIds.includes(id))
    if (regularToIssue.length === 0 && previousToIssue.length === 0) {
      toast.error('All selected books are already issued to this student')
      setStudentIssuances(alreadyIssuedIds)
      setSelectedRegularBooks([]); setSelectedPreviousBooks([])
      setLoading(false); return
    }
    const now = new Date().toISOString()
    const rows = [
      ...regularToIssue.map(book_id => ({ student_id: selectedStudent.id, book_id, issued_by: profile?.id, issued_at: now, is_reversed: false, is_previous_issuance: false })),
      ...previousToIssue.map(book_id => ({ student_id: selectedStudent.id, book_id, issued_by: profile?.id, issued_at: now, is_reversed: false, is_previous_issuance: true })),
    ]
    const { error } = await supabase.from('issuances').insert(rows)
    if (error) { toast.error('Failed to record issuances'); setLoading(false); return }
    await Promise.all(regularToIssue.map(bookId => adjustStock(bookId, -1)))
    const total = regularToIssue.length + previousToIssue.length
    toast.success(`✓ ${total} book(s) recorded for ${selectedStudent.name}`)
    if (regularToIssue.length > 0)
      logAction('BOOKS_ISSUED', `${selectedStudent.name} (${selectedStudent.student_id}) — ${regularToIssue.length} book(s): ${regularToIssue.map(id => { const b = books.find(b => b.id === id); if (!b) return null; const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › '); return lvl ? `${b.title} (${lvl})` : b.title }).filter(Boolean).join(', ')}`)
    if (previousToIssue.length > 0)
      logAction('PREVIOUS_ISSUANCE', `${selectedStudent.name} (${selectedStudent.student_id}) — ${previousToIssue.length} book(s): ${previousToIssue.map(id => { const b = books.find(b => b.id === id); if (!b) return null; const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › '); return lvl ? `${b.title} (${lvl})` : b.title }).filter(Boolean).join(', ')}`)
    setSelectedRegularBooks([]); setSelectedPreviousBooks([])
    const { data } = await supabase.from('issuances').select('book_id').eq('student_id', selectedStudent.id).eq('is_reversed', false)
    setStudentIssuances(data?.map(i => i.book_id) || [])
    setLastIssued({ student: selectedStudent, regularIds: regularToIssue, previousIds: previousToIssue })
    setLoading(false)
  }

  function printSlip(student, issuedBookIds) {
    const issuedBooks = books.filter(b => issuedBookIds.includes(b.id))
    const win = window.open('', '_blank')
    win.document.write(`
      <!DOCTYPE html><html><head><title>Issuance Slip</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;max-width:400px;margin:0 auto}
        .header{text-align:center;border-bottom:2px solid #bd0a0a;padding-bottom:12px;margin-bottom:16px}
        .logo-title{font-size:20px;font-weight:bold;color:#bd0a0a}
        .tagline{font-size:11px;color:#666;margin-top:4px}
        .student-box{background:#f9f9f9;border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:16px}
        .label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px}
        .value{font-size:13px;font-weight:600;color:#222;margin-bottom:8px}
        .student-id{font-size:14px;font-weight:bold;color:#bd0a0a}
        .books-title{font-size:12px;font-weight:bold;color:#444;margin-bottom:8px;text-transform:uppercase}
        .book-item{padding:8px 0;border-bottom:1px solid #eee;font-size:13px;color:#222}
        .book-item:last-child{border-bottom:none}
        .book-meta{font-size:11px;color:#888;margin-top:2px}
        .footer{margin-top:20px;text-align:center;font-size:11px;color:#888;border-top:1px solid #eee;padding-top:12px}
        .date{font-size:11px;color:#666;margin-top:4px}
        @media print{body{padding:0}}
      </style></head><body>
      <div class="header">
        <div class="logo-title">Champion Square IAS</div>
        <div class="tagline">Material Issuance Slip</div>
      </div>
      <div class="student-box">
        <div class="label">Student Name</div>
        <div class="value">${student.name}</div>
        <div class="label">Student ID</div>
        <div class="student-id">${student.student_id}</div>
      </div>
      <div class="books-title">Books Issued (${issuedBooks.length})</div>
      ${issuedBooks.map((b, idx) => `
        <div class="book-item">${idx + 1}. ${b.title}
          <div class="book-meta">${b.category?.replace('_', ' ')} · ${b.medium}</div>
        </div>`).join('')}
      <div class="date">Issued on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      <div class="footer">Champion Square IAS · Indore<br/>सटीकता, अनुभव और भरोसे का संगम</div>
      <script>window.onload=()=>{window.print()}</script>
      </body></html>
    `)
    win.document.close()
  }

  function reset() {
    setSelectedStudent(null)
    setSearchQ('')
    setSearchResults([])
    setSearched(false)
    setSelectedRegularBooks([])
    setSelectedPreviousBooks([])
    setStudentIssuances([])
    setLastIssued(null)
    setExamFilter('all')
    setUnitFilter('all')
    setIssuanceMode('regular')
  }

  const noResults = searched && searchResults.length === 0 && searchQ.length >= 2

  if (initialLoading) return (
    <div className="p-6 space-y-4">
      <div className="h-8 bg-[#2a2a45] rounded w-48 animate-pulse" />
      <div className="h-32 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl animate-pulse" />
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-white text-2xl font-bold">Issue Material</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">Search student → select books → confirm</p>
      </div>

      {!selectedStudent && (
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
            <input value={searchQ} onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search by name, student ID or phone..."
              autoCapitalize="none" autoCorrect="off"
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-3 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
          </div>
          {searchResults.length > 0 && (
            <div className="bg-[#12121f] border border-[#2a2a45] rounded-lg overflow-hidden">
              {searchResults.map(s => (
                <button key={s.id} onClick={() => selectStudent(s)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#2a2a45] transition-colors border-b border-[#2a2a45] last:border-0 text-left">
                  <div>
                    <p className="text-white text-sm font-medium">{s.name}</p>
                    <p className="text-[#6b7280] text-xs">{s.phone||'No phone'} · {s.batches?.name||'No batch'}</p>
                  </div>
                  <span className="text-[#f0a500] text-xs font-mono ml-2 flex-shrink-0">{s.student_id}</span>
                </button>
              ))}
            </div>
          )}
          {noResults && (
            <div className="bg-[#12121f] border border-[#2a2a45] rounded-lg p-4 text-center space-y-3">
              <p className="text-[#9ca3af] text-sm">No student found for "<span className="text-white">{searchQ}</span>"</p>
              <button onClick={() => setCreating(true)}
                className="flex items-center gap-2 mx-auto bg-[#bd0a0a] hover:bg-[#a00909] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
                <UserPlus size={15} /> Create New Student
              </button>
            </div>
          )}
        </div>
      )}

      {selectedStudent && (
        <>
          <div className="bg-[#bd0a0a]/10 border border-[#bd0a0a]/30 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">{selectedStudent.name}</p>
              <p className="text-[#9ca3af] text-xs">{selectedStudent.student_id}</p>
              <p className="text-[#6b7280] text-xs mt-0.5">{studentIssuances.length} books already issued</p>
            </div>
            <button onClick={reset} className="text-[#6b7280] hover:text-white text-xs border border-[#2a2a45] px-3 py-1.5 rounded-lg transition-colors">Change</button>
          </div>

          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${selectedStudent.bag_issued ? 'bg-[#f0a500]/10 border-[#f0a500]/30' : 'bg-[#1a1a2e] border-[#2a2a45]'}`}>
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} className={selectedStudent.bag_issued ? 'text-[#f0a500]' : 'text-[#6b7280]'} />
              <div>
                <p className="text-white text-sm font-medium">{selectedStudent.bag_issued ? 'Bag issued' : 'Bag not yet issued'}</p>
                <p className="text-[#6b7280] text-xs">Champion Square bag</p>
              </div>
            </div>
            {!selectedStudent.bag_issued && (
              <button onClick={async () => {
                const now = new Date().toISOString()
                const { error } = await supabase.from('students').update({ bag_issued: true, bag_issued_by: profile?.id, bag_issued_at: now }).eq('id', selectedStudent.id)
                if (error) { toast.error('Failed to mark bag'); return }
                toast.success(`Bag issued to ${selectedStudent.name}`)
                logAction('BAG_ISSUED', `${selectedStudent.name} (${selectedStudent.student_id})`)
                setSelectedStudent(prev => ({ ...prev, bag_issued: true, bag_issued_by: profile?.id, bag_issued_at: now }))
              }}
                className="flex items-center gap-1.5 bg-[#f0a500] hover:bg-[#d4920a] text-black font-semibold text-xs px-3 py-2 rounded-lg transition-all">
                <ShoppingBag size={13} /> Issue Bag
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setIssuanceMode('regular')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-all ${issuanceMode === 'regular' ? 'bg-[#bd0a0a] border-[#bd0a0a] text-white' : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] hover:border-[#bd0a0a]'}`}>
              <Package size={14} /> Issue {selectedRegularBooks.length > 0 && `(${selectedRegularBooks.length})`}
            </button>
            <button onClick={() => setIssuanceMode('previous')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-all ${issuanceMode === 'previous' ? 'bg-[#f0a500] border-[#f0a500] text-black' : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] hover:border-[#f0a500]'}`}>
              <History size={14} /> Previous {selectedPreviousBooks.length > 0 && `(${selectedPreviousBooks.length})`}
            </button>
          </div>

          {issuanceMode === 'previous' && (
            <div className="bg-[#f0a500]/10 border border-[#f0a500]/30 rounded-xl px-4 py-3">
              <p className="text-[#f0a500] text-sm font-semibold">Previous Issuance Mode</p>
              <p className="text-[#9ca3af] text-xs mt-0.5">Books selected here are recorded on the student's profile but <span className="text-white font-medium">never deducted from stock</span>.</p>
            </div>
          )}

          {lastIssued && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-emerald-400 text-sm font-medium">
                  ✓ {(lastIssued.regularIds?.length || 0) + (lastIssued.previousIds?.length || 0)} book(s) recorded for {lastIssued.student.name}
                </p>
                <p className="text-[#6b7280] text-xs mt-0.5">
                  {lastIssued.regularIds?.length > 0 && `${lastIssued.regularIds.length} issued`}
                  {lastIssued.regularIds?.length > 0 && lastIssued.previousIds?.length > 0 && ' · '}
                  {lastIssued.previousIds?.length > 0 && `${lastIssued.previousIds.length} previous`}
                </p>
              </div>
              {lastIssued.regularIds?.length > 0 && (
                <button onClick={() => printSlip(lastIssued.student, lastIssued.regularIds)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
                  <Printer size={13} /> Print Slip
                </button>
              )}
            </div>
          )}

          {bundles.length > 0 && (
            <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 space-y-3">
              <p className="text-white font-semibold text-sm">Quick Select — Bundles</p>
              <div className="flex flex-wrap gap-2">
                {bundles.map(b => {
                  const count = selectedStudent?.medium
                    ? b.bundle_books?.filter(bb => books.find(bk => bk.id === bb.book_id)?.medium === selectedStudent.medium).length ?? 0
                    : b.bundle_books?.length ?? 0
                  return (
                    <button key={b.id} onClick={() => selectBundle(b)}
                      className="flex items-center gap-2 px-3 py-2 bg-[#12121f] border border-[#2a2a45] hover:border-[#f0a500] rounded-lg text-sm text-white transition-all">
                      <Package size={14} className="text-[#f0a500]" />
                      {b.name}
                      <span className="text-[#6b7280] text-xs">({count})</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-white font-semibold text-sm">Select Books <span className="text-[#6b7280] font-normal">({issuanceMode === 'regular' ? selectedRegularBooks.length : selectedPreviousBooks.length} selected)</span></p>
              {selectedStudent?.medium && (
                <span className="text-xs bg-[#bd0a0a]/20 text-red-400 border border-[#bd0a0a]/30 px-2 py-0.5 rounded-full capitalize">
                  {selectedStudent.medium} only
                </span>
              )}
            </div>
            {(() => {
              const mediumBooks = books.filter(b => !selectedStudent?.medium || b.medium === selectedStudent.medium || b.medium === 'both')
              const examOptions = [...new Set(mediumBooks.map(b => b.exam_level).filter(Boolean))].sort()
              const unitOptions = [...new Set(mediumBooks.filter(b => examFilter === 'all' || b.exam_level === examFilter).map(b => b.unit).filter(Boolean))].sort()
              const visible = mediumBooks.filter(b =>
                (examFilter === 'all' || b.exam_level === examFilter) &&
                (unitFilter === 'all' || b.unit === unitFilter)
              )
              return (
                <>
                  {examOptions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {['all', ...examOptions].map(e => (
                          <button key={e} type="button" onClick={() => { setExamFilter(e); setUnitFilter('all') }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border touch-manipulation capitalize ${examFilter === e ? 'bg-[#bd0a0a] border-[#bd0a0a] text-white' : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] active:opacity-70'}`}>
                            {e === 'all' ? 'All Exams' : e}
                          </button>
                        ))}
                      </div>
                      {unitOptions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {['all', ...unitOptions].map(u => (
                            <button key={u} type="button" onClick={() => setUnitFilter(u)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border touch-manipulation capitalize ${unitFilter === u ? 'bg-[#f0a500] border-[#f0a500] text-black' : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] active:opacity-70'}`}>
                              {u === 'all' ? 'All Units' : u}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {visible.length === 0 ? (
                      <p className="text-[#6b7280] text-sm text-center py-4">No books match this filter</p>
                    ) : visible.map(b => {
                      const isIssued = studentIssuances.includes(b.id)
                      const isSelectedRegular = selectedRegularBooks.includes(b.id)
                      const isSelectedPrevious = selectedPreviousBooks.includes(b.id)
                      const isSelectedCurrent = issuanceMode === 'regular' ? isSelectedRegular : isSelectedPrevious
                      const isSelectedOther = issuanceMode === 'regular' ? isSelectedPrevious : isSelectedRegular
                      const borderColor = isIssued ? 'opacity-40 cursor-not-allowed bg-[#12121f] border-[#2a2a45]'
                        : isSelectedRegular ? 'bg-[#bd0a0a]/10 border-[#bd0a0a]/50 cursor-pointer'
                        : isSelectedPrevious ? 'bg-[#f0a500]/10 border-[#f0a500]/50 cursor-pointer'
                        : 'bg-[#12121f] border-[#2a2a45] hover:border-[#3a3a55] cursor-pointer'
                      return (
                        <label key={b.id} className={`flex items-center gap-3 px-3 py-3 rounded-lg border transition-all ${borderColor}`}>
                          <input type="checkbox" checked={isSelectedCurrent} disabled={isIssued || isSelectedOther}
                            onChange={() => toggleBook(b.id)}
                            className={`w-4 h-4 flex-shrink-0 ${issuanceMode === 'previous' ? 'accent-[#f0a500]' : 'accent-[#bd0a0a]'}`} />
                          <div className="flex-1 min-w-0">
                            {(b.exam_level || b.unit || b.part) ? (
                              <>
                                <p className="text-white text-sm font-semibold">{[b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')}</p>
                                <p className="text-[#6b7280] text-xs truncate">{b.title}</p>
                              </>
                            ) : (
                              <p className="text-white text-sm">{b.title}</p>
                            )}
                            <p className="text-[#6b7280] text-xs mt-0.5">{b.category?.replace('_',' ')} · {b.medium}</p>
                          </div>
                          {isIssued ? <span className="text-xs text-[#6b7280] flex-shrink-0">Issued</span>
                            : isSelectedRegular && issuanceMode === 'previous' ? <span className="text-xs text-[#bd0a0a] flex-shrink-0 font-medium">In Issue</span>
                            : isSelectedPrevious && issuanceMode === 'regular' ? <span className="text-xs text-[#f0a500] flex-shrink-0 font-medium">In Prev.</span>
                            : null}
                        </label>
                      )
                    })}
                  </div>
                </>
              )
            })()}

          </div>

          {(selectedRegularBooks.length > 0 || selectedPreviousBooks.length > 0) && (
            <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 space-y-3">
              <p className="text-white font-semibold text-sm">Summary</p>
              {selectedRegularBooks.length > 0 && (
                <div>
                  <p className="text-xs text-[#bd0a0a] font-semibold uppercase tracking-wide mb-1.5">Issue ({selectedRegularBooks.length})</p>
                  <div className="space-y-1">
                    {selectedRegularBooks.map(id => {
                      const book = books.find(b => b.id === id)
                      return (
                        <div key={id} className="flex items-start gap-2">
                          <Check size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                          <p className="text-[#9ca3af] text-sm truncate">{book?.exam_level ? [book?.exam_level,book?.unit,book?.part].filter(Boolean).join(' › ') : book?.title}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {selectedPreviousBooks.length > 0 && (
                <div>
                  <p className="text-xs text-[#f0a500] font-semibold uppercase tracking-wide mb-1.5">Previous Issue ({selectedPreviousBooks.length}) — no stock deduction</p>
                  <div className="space-y-1">
                    {selectedPreviousBooks.map(id => {
                      const book = books.find(b => b.id === id)
                      return (
                        <div key={id} className="flex items-start gap-2">
                          <Check size={13} className="text-[#f0a500] flex-shrink-0 mt-0.5" />
                          <p className="text-[#9ca3af] text-sm truncate">{book?.exam_level ? [book?.exam_level,book?.unit,book?.part].filter(Boolean).join(' › ') : book?.title}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <button onClick={() => setConfirmOpen(true)} disabled={loading}
                className="w-full bg-[#bd0a0a] hover:bg-[#a00909] disabled:opacity-50 text-white font-semibold py-3 rounded-lg text-sm transition-all">
                Confirm {selectedRegularBooks.length + selectedPreviousBooks.length} Book(s) for {selectedStudent.name}
              </button>
            </div>
          )}
        </>
      )}

      <SelectMediumModal open={!!selectedStudent && !selectedStudent.medium} student={selectedStudent} onSave={handleSetMedium} />
      <CreateStudentModal open={creating} onClose={() => setCreating(false)}
        onSave={handleCreateStudent} batches={batches} prefillName={searchQ} />

      {confirmOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6">
            <h2 className="text-white font-semibold text-lg mb-1">Confirm Issuance</h2>
            <p className="text-[#6b7280] text-sm mb-4">Please verify before confirming.</p>
            <div className="bg-[#12121f] border border-[#2a2a45] rounded-lg p-3 mb-4 space-y-0.5">
              <p className="text-xs text-[#6b7280] uppercase tracking-wide">Student</p>
              <p className="text-white font-semibold">{selectedStudent.name}</p>
              <p className="text-[#f0a500] text-sm font-mono">{selectedStudent.student_id}</p>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
              {selectedRegularBooks.length > 0 && (
                <div className="bg-[#12121f] border border-[#2a2a45] rounded-lg p-3">
                  <p className="text-xs text-[#bd0a0a] font-semibold uppercase tracking-wide mb-2">Issue — deducts stock ({selectedRegularBooks.length})</p>
                  {selectedRegularBooks.map(id => {
                    const book = books.find(b => b.id === id)
                    return (
                      <div key={id} className="flex items-start gap-2 py-1">
                        <Check size={12} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[#9ca3af] text-sm truncate">{book?.exam_level ? [book?.exam_level,book?.unit,book?.part].filter(Boolean).join(' › ') : book?.title}</p>
                      </div>
                    )
                  })}
                </div>
              )}
              {selectedPreviousBooks.length > 0 && (
                <div className="bg-[#f0a500]/5 border border-[#f0a500]/30 rounded-lg p-3">
                  <p className="text-xs text-[#f0a500] font-semibold uppercase tracking-wide mb-2">Previous Issue — no stock deduction ({selectedPreviousBooks.length})</p>
                  {selectedPreviousBooks.map(id => {
                    const book = books.find(b => b.id === id)
                    return (
                      <div key={id} className="flex items-start gap-2 py-1">
                        <Check size={12} className="text-[#f0a500] flex-shrink-0 mt-0.5" />
                        <p className="text-[#9ca3af] text-sm truncate">{book?.exam_level ? [book?.exam_level,book?.unit,book?.part].filter(Boolean).join(' › ') : book?.title}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">
                Cancel
              </button>
              <button onClick={() => { setConfirmOpen(false); handleCombinedIssue() }} disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] disabled:opacity-50 text-white font-semibold text-sm transition-all">
                {loading ? 'Saving...' : 'Confirm & Issue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}