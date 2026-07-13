import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, generateStudentId } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useRealtime } from '../../hooks/useRealtime'
import { logAction } from '../../lib/audit'
import { Plus, Search, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

function StudentAvatar({ url, name, size = 28 }) {
  const initials = name?.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  return (
    <div style={{ width: size, height: size, minWidth: size, fontSize: size * 0.36 }}
      className="rounded-full overflow-hidden bg-[#2a2a45] border border-[#3a3a55] flex items-center justify-center flex-shrink-0">
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-semibold">{initials}</span>}
    </div>
  )
}

function Modal({ open, onClose, onSave, batches }) {
  const [form, setForm] = useState({ name: '', phone: '', admission_date: '', batch_id: '', medium: '' })
  const [errors, setErrors] = useState({})
  const today = new Date().toISOString().split('T')[0]
  useEffect(() => {
    if (open) { setForm({ name: '', phone: '', admission_date: '', batch_id: '', medium: '' }); setErrors({}) }
  }, [open])
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  async function handleSave() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.phone) errs.phone = 'Phone is required'
    else if (!/^\d{10}$/.test(form.phone)) errs.phone = 'Must be exactly 10 digits'
    if (form.admission_date && (form.admission_date < '2010-01-01' || form.admission_date > today))
      errs.admission_date = 'Must be between 2010 and today'
    if (!form.medium) errs.medium = 'Medium is required'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    await onSave(form); onClose()
  }
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-white font-semibold text-lg mb-5">Add New Student</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Full Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Student full name"
              className={`w-full bg-[#12121f] border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none placeholder-[#4b5563] ${errors.name ? 'border-red-500' : 'border-[#2a2a45] focus:border-[#bd0a0a]'}`} />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Phone * (10 digits)</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 digit number"
              className={`w-full bg-[#12121f] border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none placeholder-[#4b5563] ${errors.phone ? 'border-red-500' : 'border-[#2a2a45] focus:border-[#bd0a0a]'}`} />
            {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
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
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">Add Student</button>
        </div>
      </div>
    </div>
  )
}

export default function IssuerStudents() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => { fetchAll() }, [])
  useRealtime('students', fetchAll)

  async function fetchAll() {
    setLoading(true)
    const [{ data: s }, { data: b }] = await Promise.all([
      supabase.from('students').select('*, batches(name, batch_code), users!students_created_by_fkey(name)').order('created_at', { ascending: false }),
      supabase.from('batches').select('*').order('name'),
    ])
    setStudents(s || []); setBatches(b || []); setLoading(false)
  }

  async function handleSave(form) {
    const { data: existing } = await supabase
      .from('students').select('id, name, student_id').eq('phone', form.phone).maybeSingle()
    if (existing) {
      toast.error(`Phone already registered to ${existing.name} (${existing.student_id})`)
      return
    }
    const student_id = await generateStudentId()
    const payload = {
      student_id,
      name: form.name, phone: form.phone,
      admission_date: form.admission_date || null,
      batch_id: form.batch_id || null,
      medium: form.medium || null,
      created_by: profile?.id
    }
    const { error } = await supabase.from('students').insert(payload)
    if (error) { toast.error('Failed to add student'); return }
    toast.success(`Student added — ${student_id}`)
    logAction('STUDENT_CREATED', `${form.name} | ${form.phone} | ${student_id}`)
    fetchAll()
  }

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  )

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Students</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{students.length} enrolled</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/issuer/issue')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
            <Send size={15} /> Issue Material
          </button>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
            <Plus size={16} /> Add Student
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ID or phone..."
          className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
      </div>

      <div className="mob-table bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-[#2a2a45]">
              {['STUDENT ID','NAME','PHONE','BATCH','ADMITTED','ADDED BY'].map(h=>(
                <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a45]">
            {loading ? [...Array(4)].map((_,i)=>(
              <tr key={i}>{[...Array(6)].map((_,j)=>(
                <td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse"/></td>
              ))}</tr>
            )) : filtered.length===0 ? (
              <tr><td colSpan={6} className="text-center text-[#6b7280] py-10 text-sm">No students found</td></tr>
            ) : filtered.map(s=>(
              <tr key={s.id} className="hover:bg-[#12121f] transition-colors cursor-pointer" onClick={()=>navigate(`/issuer/students/${s.id}`)}>
                <td className="px-5 py-3"><span className="text-[#f0a500] text-sm font-mono">{s.student_id}</span></td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <StudentAvatar url={s.profile_image_url} name={s.name} size={28} />
                    <span className="text-white text-sm font-medium">{s.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm">{s.phone||'—'}</td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm">
                  {s.batches ? <>{s.batches.batch_code && <span className="text-[#f0a500] text-xs font-mono font-semibold mr-1">{s.batches.batch_code}</span>}{s.batches.name}</> : '—'}
                </td>
                <td className="px-5 py-3 text-[#9ca3af] text-sm">{s.admission_date?format(new Date(s.admission_date),'dd MMM yyyy'):'—'}</td>
                <td className="px-5 py-3"><p className="text-[#9ca3af] text-sm">{s.users?.name||'—'}</p><p className="text-[#6b7280] text-xs">{s.created_at?format(new Date(s.created_at),'dd MMM yy'):''}</p></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mob-cards space-y-3">
        {loading ? [...Array(4)].map((_,i)=>(
          <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 animate-pulse h-24"/>
        )) : filtered.length===0 ? (
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-6 text-center text-[#6b7280] text-sm">No students found</div>
        ) : filtered.map(s=>(
          <div key={s.id} onClick={()=>navigate(`/issuer/students/${s.id}`)}
            className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 cursor-pointer active:bg-[#12121f] transition-all">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <StudentAvatar url={s.profile_image_url} name={s.name} size={34} />
                <p className="text-white font-semibold text-sm">{s.name}</p>
              </div>
              <span className="text-[#f0a500] text-xs font-mono">{s.student_id}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <p className="text-[#6b7280] text-xs">📞 {s.phone||'—'}</p>
              <p className="text-[#6b7280] text-xs">🏫 {s.batches?.name||'—'}</p>
              <p className="text-[#6b7280] text-xs">📅 {s.admission_date?format(new Date(s.admission_date),'dd MMM yyyy'):'—'}</p>
              <p className="text-[#6b7280] text-xs col-span-2">👤 {s.users?.name||'—'} · {s.created_at?format(new Date(s.created_at),'dd MMM yy'):''}</p>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} batches={batches} />
    </div>
  )
}
