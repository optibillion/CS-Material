import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { ArrowLeft, BookOpen, RotateCcw, Edit, Send } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { logAction } from '../../lib/audit'

function EditModal({ open, onClose, onSave, student, batches, courses, isAdmin, allUsers }) {
  const [form, setForm] = useState({})
  useEffect(() => {
    if (open && student) setForm({
      name: student.name || '',
      phone: student.phone || '',
      dob: student.dob || '',
      admission_date: student.admission_date || '',
      batch_id: student.batch_id || '',
      course_id: student.course_id || '',
      medium: student.medium || '',
      created_by: student.created_by || ''
    })
  }, [open, student])
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name required'); return }
    await onSave(form); onClose()
  }
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-white font-semibold text-lg mb-5">Edit Student</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Full Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
            </div>
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Date of Birth</label>
              <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
            </div>
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Admission Date</label>
            <input type="date" value={form.admission_date} onChange={e => set('admission_date', e.target.value)}
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Batch</label>
              <select value={form.batch_id} onChange={e => set('batch_id', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]">
                <option value="">No batch</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Course</label>
              <select value={form.course_id} onChange={e => set('course_id', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]">
                <option value="">No course</option>
                {(courses||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          {isAdmin && (
            <div>
              <label className="text-[#9ca3af] text-sm mb-1.5 block">Created By <span className="text-[#bd0a0a] text-xs">(Admin only)</span></label>
              <select value={form.created_by} onChange={e => set('created_by', e.target.value)}
                className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]">
                <option value="">— Unknown —</option>
                {(allUsers||[]).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">Save Changes</button>
        </div>
      </div>
    </div>
  )
}

function ReversalModal({ open, onClose, onConfirm, issuance }) {
  const [reason, setReason] = useState('')
  useEffect(() => { if (open) setReason('') }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6">
        <h2 className="text-white font-semibold text-lg mb-2">Reverse Issuance</h2>
        <p className="text-[#9ca3af] text-sm mb-5">Reversing <span className="text-white">{issuance?.books?.title}</span></p>
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

export default function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, isAdmin } = useAuthStore()
  const [student, setStudent] = useState(null)
  const [issuances, setIssuances] = useState([])
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [reversing, setReversing] = useState(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    setLoading(true)
    const [{ data: s }, { data: i }, { data: b }, { data: c }, { data: u }] = await Promise.all([
      supabase.from('students').select('*, batches(name), courses(name), users!students_created_by_fkey(name)').eq('id', id).single(),
      supabase.from('issuances').select('*, books(title, category, medium), users!issuances_issued_by_fkey(name)')
        .eq('student_id', id).order('issued_at', { ascending: false }),
      supabase.from('batches').select('*').eq('is_active', true),
      supabase.from('courses').select('*').eq('is_active', true).order('name'),
      supabase.from('users').select('id, name').eq('is_active', true).order('name')
    ])
    setStudent(s); setIssuances(i || []); setBatches(b || []); setCourses(c || []); setAllUsers(u || []); setLoading(false)
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
    if (isAdmin) payload.created_by = form.created_by || null
    const { error } = await supabase.from('students').update(payload).eq('id', id)
    if (error) { toast.error('Failed to update'); return }
    toast.success('Student updated')
    logAction('STUDENT_UPDATED', `${student.name} (${student.student_id})`)
    fetchAll()
  }

  async function handleReversal(reason) {
    const { error } = await supabase.from('issuances').update({
      is_reversed: true, reversed_by: profile?.id,
      reversed_at: new Date().toISOString(), reversal_reason: reason
    }).eq('id', reversing.id)
    if (error) { toast.error('Failed'); return }
    toast.success('Reversed')
    logAction('ISSUANCE_REVERSED', `${reversing.books?.title} from ${student.name} (${student.student_id}) — Reason: ${reason}`)
    setReversing(null); fetchAll()
  }

  const active = issuances.filter(i => !i.is_reversed)
  const reversed = issuances.filter(i => i.is_reversed)

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="h-8 bg-[#2a2a45] rounded w-48 animate-pulse" />
      <div className="h-32 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl animate-pulse" />
    </div>
  )

  if (!student) return <div className="p-6 text-[#6b7280]">Student not found</div>

  return (
    <div className="p-4 md:p-6 space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#6b7280] hover:text-white text-sm transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-white text-xl font-bold">{student.name}</h1>
            <p className="text-[#f0a500] text-sm font-mono mt-1">{student.student_id}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full">
              {active.length} active
            </span>
            <button onClick={() => navigate(`/admin/issue?student=${id}`)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white transition-all">
              <Send size={13} /> Issue Books
            </button>
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white transition-all">
              <Edit size={13} /> Edit
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Phone', value: student.phone },
            { label: 'Batch', value: student.batches?.name },
            { label: 'Course', value: student.courses?.name },
            { label: 'Admitted', value: student.admission_date ? format(new Date(student.admission_date), 'dd MMM yyyy') : null },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[#6b7280] text-xs">{label}</p>
              <p className="text-white text-sm font-medium mt-0.5">{value || '—'}</p>
            </div>
          ))}
          <div>
            <p className="text-[#6b7280] text-xs">Created By</p>
            <p className="text-white text-sm font-medium mt-0.5">{student.users?.name || '—'}</p>
            <p className="text-[#6b7280] text-xs">{student.created_at ? format(new Date(student.created_at), 'dd MMM yyyy, hh:mm a') : ''}</p>
          </div>
        </div>
      </div>

      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl">
        <div className="px-5 py-4 border-b border-[#2a2a45]">
          <h2 className="text-white font-semibold text-sm">Active Issuances ({active.length})</h2>
        </div>
        <div className="divide-y divide-[#2a2a45]">
          {active.length === 0 ? (
            <p className="text-[#6b7280] text-sm px-5 py-6 text-center">No active issuances</p>
          ) : active.map(i => (
            <div key={i.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <BookOpen size={15} className="text-[#bd0a0a] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{i.books?.title}</p>
                  <p className="text-[#6b7280] text-xs">{i.books?.category} · {i.books?.medium} · by {i.users?.name} · {format(new Date(i.issued_at), 'dd MMM yy')}</p>
                </div>
              </div>
              <button onClick={() => setReversing(i)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-red-500/20 hover:text-red-400 text-[#9ca3af] transition-all flex-shrink-0">
                <RotateCcw size={12} /> Reverse
              </button>
            </div>
          ))}
        </div>
      </div>

      {reversed.length > 0 && (
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl opacity-60">
          <div className="px-5 py-4 border-b border-[#2a2a45]">
            <h2 className="text-white font-semibold text-sm">Reversed ({reversed.length})</h2>
          </div>
          <div className="divide-y divide-[#2a2a45]">
            {reversed.map(i => (
              <div key={i.id} className="px-5 py-3">
                <p className="text-[#9ca3af] text-sm line-through">{i.books?.title}</p>
                <p className="text-[#6b7280] text-xs mt-0.5">Reason: {i.reversal_reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <EditModal open={editing} onClose={() => setEditing(false)} onSave={handleEdit} student={student} batches={batches} courses={courses} isAdmin={isAdmin} allUsers={allUsers} />
      <ReversalModal open={!!reversing} onClose={() => setReversing(null)} onConfirm={handleReversal} issuance={reversing} />
    </div>
  )
}