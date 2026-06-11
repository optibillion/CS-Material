import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useRealtime } from '../../hooks/useRealtime'
import { logAction } from '../../lib/audit'
import { Plus, Search, Pencil, UserX, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

function AddStudentModal({ open, onClose, onSave, batches, courses }) {
  const [form, setForm] = useState({ name: '', phone: '', dob: '', admission_date: '', batch_id: '', course_id: '', medium: '' })
  const [errors, setErrors] = useState({})
  const today = new Date().toISOString().split('T')[0]
  const dobMax = new Date(new Date().setFullYear(new Date().getFullYear() - 15)).toISOString().split('T')[0]
  useEffect(() => {
    if (open) { setForm({ name: '', phone: '', dob: '', admission_date: '', batch_id: '', course_id: '', medium: '' }); setErrors({}) }
  }, [open])
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Phone * (10 digits)</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 digit number"
                className={`w-full bg-[#12121f] border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none placeholder-[#4b5563] ${errors.phone ? 'border-red-500' : 'border-[#2a2a45] focus:border-[#bd0a0a]'}`} />
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Batch</label>
              <select value={form.batch_id} onChange={e => set('batch_id', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]">
                <option value="">Select batch</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Course</label>
              <select value={form.course_id} onChange={e => set('course_id', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]">
                <option value="">Select course</option>
                {courses.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
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

function EditStudentModal({ open, onClose, onSave, student, batches, courses }) {
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  useEffect(() => {
    if (open && student) {
      setForm({
        name: student.name || '',
        phone: student.phone || '',
        dob: student.dob || '',
        admission_date: student.admission_date || '',
        batch_id: student.batch_id || '',
        course_id: student.course_id || '',
        medium: student.medium || ''
      })
      setErrors({})
    }
  }, [open, student])
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  async function handleSave() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (form.phone && !/^\d{10}$/.test(form.phone)) errs.phone = 'Must be 10 digits'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    await onSave(form); onClose()
  }
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-white font-semibold text-lg mb-1">Edit Student</h2>
        <p className="text-[#f0a500] text-xs font-mono mb-5">{student?.student_id}</p>
        <div className="space-y-4">
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Full Name *</label>
            <input value={form.name || ''} onChange={e => set('name', e.target.value)}
              className={`w-full bg-[#12121f] border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none ${errors.name ? 'border-red-500' : 'border-[#2a2a45] focus:border-[#bd0a0a]'}`} />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Phone</label>
              <input value={form.phone || ''} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                className={`w-full bg-[#12121f] border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none ${errors.phone ? 'border-red-500' : 'border-[#2a2a45] focus:border-[#bd0a0a]'}`} />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Date of Birth</label>
              <input type="date" value={form.dob || ''} onChange={e => set('dob', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
            </div>
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Admission Date</label>
            <input type="date" value={form.admission_date || ''} onChange={e => set('admission_date', e.target.value)}
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Batch</label>
              <select value={form.batch_id || ''} onChange={e => set('batch_id', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]">
                <option value="">No batch</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Course</label>
              <select value={form.course_id || ''} onChange={e => set('course_id', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]">
                <option value="">No course</option>
                {(courses || []).filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Medium</label>
            <div className="grid grid-cols-2 gap-2">
              {['hindi', 'english'].map(m => (
                <button key={m} type="button" onClick={() => set('medium', m)}
                  className={`py-2.5 rounded-lg border text-sm font-medium capitalize transition-all ${form.medium === m ? 'bg-[#bd0a0a] border-[#bd0a0a] text-white' : 'bg-[#12121f] border-[#2a2a45] text-[#9ca3af] hover:border-[#bd0a0a]'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">Save Changes</button>
        </div>
      </div>
    </div>
  )
}

export default function Students() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [students, setStudents] = useState([])
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => { fetchAll() }, [])
  useRealtime('students', fetchAll)

  async function fetchAll() {
    setLoading(true)
    const [{ data: s }, { data: b }, { data: c }] = await Promise.all([
      supabase.from('students').select('*, batches(name), courses(name), users!students_created_by_fkey(name)').order('created_at', { ascending: false }),
      supabase.from('batches').select('*').order('name'),
      supabase.from('courses').select('*').eq('is_active', true).order('name')
    ])
    setStudents(s || []); setBatches(b || []); setCourses(c || []); setLoading(false)
  }

  async function handleAdd(form) {
    const { data: existing } = await supabase
      .from('students').select('id, name, student_id').eq('phone', form.phone).maybeSingle()
    if (existing) { toast.error(`Phone already registered to ${existing.name} (${existing.student_id})`); return }
    if (form.dob) {
      const { data: dobMatch } = await supabase
        .from('students').select('id, name, student_id').ilike('name', form.name.trim()).eq('dob', form.dob).maybeSingle()
      if (dobMatch) { toast.error(`${dobMatch.name} (${dobMatch.student_id}) already registered with same name & DOB`); return }
    }
    const payload = {
      name: form.name, phone: form.phone,
      dob: form.dob || null, admission_date: form.admission_date || null,
      batch_id: form.batch_id || null, course_id: form.course_id || null,
      medium: form.medium || null, created_by: profile?.id
    }
    const { error } = await supabase.from('students').insert(payload)
    if (error) { toast.error('Failed to add student'); return }
    toast.success('Student added')
    logAction('STUDENT_CREATED', `${form.name} | ${form.phone}`)
    fetchAll()
  }

  async function handleEdit(form) {
    const payload = {
      name: form.name,
      phone: form.phone || null,
      dob: form.dob || null,
      admission_date: form.admission_date || null,
      batch_id: form.batch_id || null,
      course_id: form.course_id || null,
      medium: form.medium || null
    }
    const { error } = await supabase.from('students').update(payload).eq('id', editing.id)
    if (error) { toast.error('Failed to update student'); return }
    toast.success('Student updated')
    logAction('STUDENT_UPDATED', `${editing.name} (${editing.student_id})`)
    fetchAll()
  }

  async function toggleActive(s, e) {
    e.stopPropagation()
    const newVal = s.is_active === false ? true : false
    const { error } = await supabase.from('students').update({ is_active: newVal }).eq('id', s.id)
    if (error) {
      if (error.code === '42703') {
        toast.error('Run DB migration: ALTER TABLE students ADD COLUMN is_active BOOLEAN DEFAULT TRUE')
      } else {
        toast.error('Failed to update')
      }
      return
    }
    toast.success(newVal ? 'Student reactivated' : 'Student deactivated')
    logAction(newVal ? 'STUDENT_ACTIVATED' : 'STUDENT_DEACTIVATED', `${s.name} (${s.student_id})`)
    fetchAll()
  }

  const inactiveCount = students.filter(s => s.is_active === false).length

  const filtered = students.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search)
    const matchActive = showInactive ? s.is_active === false : s.is_active !== false
    return matchSearch && matchActive
  })

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Students</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{students.filter(s => s.is_active !== false).length} active enrolled</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
          <Plus size={16} /> Add Student
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ID or phone..."
            className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
        </div>
        {inactiveCount > 0 && (
          <button onClick={() => setShowInactive(v => !v)}
            className={`text-sm px-4 py-2 rounded-lg border transition-all flex-shrink-0 flex items-center gap-1.5 ${showInactive ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' : 'bg-[#1a1a2e] border-[#2a2a45] text-[#6b7280] hover:text-white'}`}>
            {showInactive ? <UserCheck size={14} /> : <UserX size={14} />}
            {showInactive ? 'Show Active' : `Inactive (${inactiveCount})`}
          </button>
        )}
      </div>

      {showInactive && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <UserX size={14} className="text-orange-400" />
          <p className="text-orange-400 text-xs">Showing deactivated students — these students cannot be searched in Issue page</p>
        </div>
      )}

      {/* Desktop table */}
      <div className="mob-table bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[750px]">
          <thead>
            <tr className="border-b border-[#2a2a45]">
              {['STUDENT ID','NAME','PHONE','BATCH','COURSE','ADMITTED','ACTIONS'].map(h=>(
                <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a45]">
            {loading ? [...Array(5)].map((_,i)=>(
              <tr key={i}>{[...Array(7)].map((_,j)=>(
                <td key={j} className="px-4 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse"/></td>
              ))}</tr>
            )) : filtered.length===0 ? (
              <tr><td colSpan={7} className="text-center text-[#6b7280] py-10 text-sm">No students found</td></tr>
            ) : filtered.map(s=>(
              <tr key={s.id} className={`hover:bg-[#12121f] transition-colors ${s.is_active === false ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 cursor-pointer" onClick={()=>navigate(`/admin/students/${s.id}`)}>
                  <span className="text-[#f0a500] text-sm font-mono">{s.student_id}</span>
                </td>
                <td className="px-4 py-3 cursor-pointer" onClick={()=>navigate(`/admin/students/${s.id}`)}>
                  <p className="text-white text-sm font-medium">{s.name}</p>
                  {s.is_active === false && <span className="text-xs text-orange-400">Inactive</span>}
                </td>
                <td className="px-4 py-3 text-[#9ca3af] text-sm cursor-pointer" onClick={()=>navigate(`/admin/students/${s.id}`)}>{s.phone||'—'}</td>
                <td className="px-4 py-3 text-[#9ca3af] text-sm cursor-pointer" onClick={()=>navigate(`/admin/students/${s.id}`)}>{s.batches?.name||'—'}</td>
                <td className="px-4 py-3 text-[#9ca3af] text-sm cursor-pointer" onClick={()=>navigate(`/admin/students/${s.id}`)}>{s.courses?.name||'—'}</td>
                <td className="px-4 py-3 text-[#9ca3af] text-sm cursor-pointer" onClick={()=>navigate(`/admin/students/${s.id}`)}>{s.admission_date?format(new Date(s.admission_date),'dd MMM yyyy'):'—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={e => { e.stopPropagation(); setEditing(s) }}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white transition-all">
                      <Pencil size={11} /> Edit
                    </button>
                    <button onClick={e => toggleActive(s, e)}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-all ${s.is_active === false ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400' : 'bg-[#2a2a45] hover:bg-orange-500/20 hover:text-orange-400 text-[#9ca3af]'}`}>
                      {s.is_active === false ? <><UserCheck size={11}/> Activate</> : <><UserX size={11}/> Deactivate</>}
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
        {loading ? [...Array(4)].map((_,i)=>(
          <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 animate-pulse h-24"/>
        )) : filtered.length===0 ? (
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-6 text-center text-[#6b7280] text-sm">No students found</div>
        ) : filtered.map(s=>(
          <div key={s.id} className={`bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 ${s.is_active === false ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-2" onClick={()=>navigate(`/admin/students/${s.id}`)}>
              <div>
                <p className="text-white font-semibold text-sm">{s.name}</p>
                {s.is_active === false && <span className="text-xs text-orange-400">Inactive</span>}
              </div>
              <span className="text-[#f0a500] text-xs font-mono">{s.student_id}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-3 cursor-pointer" onClick={()=>navigate(`/admin/students/${s.id}`)}>
              <p className="text-[#6b7280] text-xs">📞 {s.phone||'—'}</p>
              <p className="text-[#6b7280] text-xs">🏫 {s.batches?.name||'—'}</p>
              <p className="text-[#6b7280] text-xs">📚 {s.courses?.name||'—'}</p>
              <p className="text-[#6b7280] text-xs">📅 {s.admission_date?format(new Date(s.admission_date),'dd MMM yyyy'):'—'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(s)}
                className="flex-1 flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white transition-all">
                <Pencil size={11} /> Edit
              </button>
              <button onClick={e => toggleActive(s, e)}
                className={`flex-1 flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-lg transition-all ${s.is_active === false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#2a2a45] text-[#9ca3af]'}`}>
                {s.is_active === false ? <><UserCheck size={11}/> Activate</> : <><UserX size={11}/> Deactivate</>}
              </button>
              <button onClick={()=>navigate(`/admin/students/${s.id}`)}
                className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] transition-all">
                View →
              </button>
            </div>
          </div>
        ))}
      </div>

      <AddStudentModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleAdd} batches={batches} courses={courses} />
      <EditStudentModal open={!!editing} onClose={() => setEditing(null)} onSave={handleEdit} student={editing} batches={batches} courses={courses} />
    </div>
  )
}
