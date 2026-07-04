import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, uploadStudentPhoto, adjustStock } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { ArrowLeft, BookOpen, RotateCcw, Edit, Send, ShoppingBag, UserX, UserCheck, Camera, Upload } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { logAction } from '../../lib/audit'
import CameraModal from '../../components/CameraModal'

function EditModal({ open, onClose, onSave, student, batches, isAdmin, allUsers }) {
  const [form, setForm] = useState({})
  const [idError, setIdError] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const fileRef = useRef(null)
  useEffect(() => {
    if (open && student) {
      setForm({
        name: student.name || '',
        phone: student.phone || '',
        dob: student.dob || '',
        admission_date: student.admission_date || '',
        batch_id: student.batch_id || '',
        medium: student.medium || '',
        created_by: student.created_by || '',
        student_id: student.student_id || ''
      })
      setIdError('')
      setPhotoFile(null)
      setPhotoPreview(null)
    }
  }, [open, student])
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function handlePhotoSelect(file) {
    if (!file) return
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }
  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name required'); return }
    const newId = (form.student_id || '').trim().toUpperCase()
    if (!newId) { setIdError('Student ID cannot be empty'); return }
    if (newId !== student.student_id) {
      const { data: clash } = await supabase.from('students').select('id').eq('student_id', newId).maybeSingle()
      if (clash) { setIdError('This Student ID is already in use'); return }
    }
    setIdError('')
    await onSave({ ...form, student_id: newId, _photoFile: photoFile }); onClose()
  }
  if (!open) return null
  const displayPhoto = photoPreview || student?.profile_image_url
  const initials = (form.name || student?.name)?.split(' ').filter(Boolean).map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?'
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-white font-semibold text-lg mb-5">Edit Student</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[#9ca3af] text-sm mb-2 block">Photo</label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-[#2a2a45] border-2 border-[#3a3a55] flex items-center justify-center flex-shrink-0 text-white text-lg font-bold">
                {displayPhoto ? <img src={displayPhoto} alt="" className="w-full h-full object-cover" /> : initials}
              </div>
              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] hover:text-white cursor-pointer transition-all">
                  <Upload size={12} /> Upload
                  <input ref={fileRef} type="file" accept="image/*" style={{ position: 'absolute', opacity: 0, width: 0, height: 0, overflow: 'hidden' }} onChange={e => handlePhotoSelect(e.target.files?.[0])} />
                </label>
                <button type="button" onClick={() => setCameraOpen(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] hover:text-white transition-all">
                  <Camera size={12} /> Camera
                </button>
                <CameraModal open={cameraOpen} onCapture={handlePhotoSelect} onClose={() => setCameraOpen(false)} />
              </div>
            </div>
            {photoPreview && <p className="text-[#f0a500] text-xs mt-1.5">New photo selected — will save with changes</p>}
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Student ID <span className="text-[#bd0a0a] text-xs">(must be unique)</span></label>
            <input value={form.student_id || ''} onChange={e => { set('student_id', e.target.value.toUpperCase()); setIdError('') }}
              className={`w-full bg-[#12121f] border rounded-lg px-3 py-2.5 text-[#f0a500] font-mono text-sm focus:outline-none tracking-wide ${idError ? 'border-red-500' : 'border-[#2a2a45] focus:border-[#f0a500]'}`} />
            {idError && <p className="text-red-400 text-xs mt-1">{idError}</p>}
          </div>
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
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Batch</label>
            <select value={form.batch_id} onChange={e => set('batch_id', e.target.value)}
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]">
              <option value="">No batch</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
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
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [reversing, setReversing] = useState(null)
  const [editing, setEditing] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    setLoading(true)
    const [{ data: s }, { data: i }, { data: b }, { data: u }] = await Promise.all([
      supabase.from('students').select('*, batches(name, batch_code), created_by_user:users!students_created_by_fkey(name)').eq('id', id).single(),
      supabase.from('issuances').select('*, books(title, exam_level, unit, part, category, medium), users!issuances_issued_by_fkey(name)')
        .eq('student_id', id).order('issued_at', { ascending: false }),
      supabase.from('batches').select('*').eq('is_active', true),
      supabase.from('users').select('id, name').eq('is_active', true).order('name')
    ])
    setStudent(s); setIssuances(i || []); setBatches(b || []); setAllUsers(u || []); setLoading(false)
  }

  async function handleEdit(form) {
    const { _photoFile, ...cleanForm } = form
    const payload = {
      name: cleanForm.name,
      phone: cleanForm.phone || null,
      dob: cleanForm.dob || null,
      admission_date: cleanForm.admission_date || null,
      batch_id: cleanForm.batch_id || null,
      medium: cleanForm.medium || null,
      student_id: cleanForm.student_id || student.student_id
    }
    if (isAdmin) payload.created_by = cleanForm.created_by || null
    if (_photoFile) {
      try {
        const url = await uploadStudentPhoto(_photoFile, cleanForm.student_id || student.student_id)
        payload.profile_image_url = url
      } catch { toast.error('Photo upload failed'); return }
    }
    const { data: updated, error } = await supabase.from('students').update(payload).eq('id', id).select('id').single()
    if (error) {
      if (error.code === '23505') toast.error('Student ID already in use by another student')
      else toast.error('Failed to update')
      return
    }
    if (!updated) { toast.error('Failed to update — check permissions'); return }
    toast.success('Student updated')
    logAction('STUDENT_UPDATED', `${student.name} (${student.student_id})${form.student_id !== student.student_id ? ` → ID changed to ${form.student_id}` : ''}`)
    fetchAll()
  }

  async function handleToggleActive() {
    const newVal = student.is_active === false ? true : false
    const { error } = await supabase.from('students').update({ is_active: newVal }).eq('id', id)
    if (error) {
      if (error.code === '42703') toast.error('Run migration: ALTER TABLE students ADD COLUMN is_active BOOLEAN DEFAULT TRUE')
      else toast.error('Failed to update')
      return
    }
    toast.success(newVal ? 'Student reactivated' : 'Student deactivated')
    logAction(newVal ? 'STUDENT_ACTIVATED' : 'STUDENT_DEACTIVATED', `${student.name} (${student.student_id})`)
    fetchAll()
  }

  async function handleReversal(reason) {
    const { error } = await supabase.from('issuances').update({
      is_reversed: true, reversed_by: profile?.id,
      reversed_at: new Date().toISOString(), reversal_reason: reason
    }).eq('id', reversing.id)
    if (error) { toast.error('Failed'); return }
    await adjustStock(reversing.book_id, 1)
    toast.success('Reversed')
    logAction('ISSUANCE_REVERSED', `${reversing.books?.title} from ${student.name} (${student.student_id}) — Reason: ${reason}`)
    setReversing(null); fetchAll()
  }

  async function handlePhotoUpload(file) {
    if (!file || !student) return
    setPhotoUploading(true)
    try {
      const url = await uploadStudentPhoto(file, student.student_id)
      const { error } = await supabase.from('students').update({ profile_image_url: url }).eq('id', student.id)
      if (error) throw error
      toast.success('Photo updated')
      fetchAll()
    } catch {
      toast.error('Photo upload failed')
    } finally {
      setPhotoUploading(false)
    }
  }

  async function handleIssueBag() {
    const now = new Date().toISOString()
    const { error } = await supabase.from('students').update({ bag_issued: true, bag_issued_by: profile?.id, bag_issued_at: now }).eq('id', id)
    if (error) { toast.error('Failed to issue bag'); return }
    toast.success(`Bag issued to ${student.name}`)
    logAction('BAG_ISSUED', `${student.name} (${student.student_id})`)
    fetchAll()
  }

  async function handleRevokeBag() {
    const { error } = await supabase.from('students').update({ bag_issued: false, bag_issued_by: null, bag_issued_at: null }).eq('id', id)
    if (error) { toast.error('Failed to revoke bag'); return }
    toast.success(`Bag revoked for ${student.name}`)
    logAction('BAG_REVOKED', `${student.name} (${student.student_id})`)
    fetchAll()
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
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[#2a2a45] border-2 border-[#3a3a55] flex items-center justify-center">
                {student.profile_image_url
                  ? <img src={student.profile_image_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-white text-xl font-bold">{student.name?.split(' ').filter(Boolean).map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?'}</span>}
                {photoUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  </div>
                )}
              </div>
              {!photoUploading && (
                <div className="flex gap-1">
                  <label className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] hover:text-white cursor-pointer transition-all">
                    <Upload size={10} /> <span>Upload</span>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ position: 'absolute', opacity: 0, width: 0, height: 0, overflow: 'hidden' }} onChange={e => handlePhotoUpload(e.target.files?.[0])} />
                  </label>
                  <button type="button" onClick={() => setCameraOpen(true)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] hover:text-white transition-all">
                    <Camera size={10} /> <span>Camera</span>
                  </button>
                  <CameraModal open={cameraOpen} onCapture={handlePhotoUpload} onClose={() => setCameraOpen(false)} />
                </div>
              )}
              {photoUploading && <p className="text-[#f0a500] text-xs">Uploading...</p>}
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">{student.name}</h1>
              <p className="text-[#f0a500] text-sm font-mono mt-1">{student.student_id}</p>
              {student.is_active === false && (
                <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full mt-1 inline-block">Inactive</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full">
              {active.length} active books
            </span>
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium ${student.bag_issued ? 'bg-[#f0a500]/20 text-[#f0a500] border-[#f0a500]/30' : 'bg-[#2a2a45] text-[#6b7280] border-[#2a2a45]'}`}>
              <ShoppingBag size={11} /> {student.bag_issued ? 'Bag issued' : 'No bag'}
            </span>
            {!student.bag_issued ? (
              <button onClick={handleIssueBag}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#f0a500] hover:bg-[#d4920a] text-black font-semibold transition-all">
                <ShoppingBag size={13} /> Issue Bag
              </button>
            ) : (
              <button onClick={() => { if (window.confirm(`Revoke bag from ${student.name}?`)) handleRevokeBag() }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-orange-500/20 hover:text-orange-400 text-[#9ca3af] transition-all">
                <ShoppingBag size={13} /> Revoke Bag
              </button>
            )}
            <button onClick={() => navigate(`/admin/issue?student=${id}`)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white transition-all">
              <Send size={13} /> Issue Books
            </button>
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white transition-all">
              <Edit size={13} /> Edit
            </button>
            {isAdmin && (
              <button onClick={handleToggleActive}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${student.is_active === false ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400' : 'bg-[#2a2a45] hover:bg-orange-500/20 hover:text-orange-400 text-[#9ca3af]'}`}>
                {student.is_active === false ? <><UserCheck size={13}/> Activate</> : <><UserX size={13}/> Deactivate</>}
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Phone', value: student.phone },
            { label: 'Batch', value: student.batches ? (student.batches.batch_code ? `${student.batches.batch_code} · ${student.batches.name}` : student.batches.name) : null },
            { label: 'Admitted', value: student.admission_date ? format(new Date(student.admission_date), 'dd MMM yyyy') : null },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[#6b7280] text-xs">{label}</p>
              <p className="text-white text-sm font-medium mt-0.5">{value || '—'}</p>
            </div>
          ))}
          <div>
            <p className="text-[#6b7280] text-xs">Created By</p>
            <p className="text-white text-sm font-medium mt-0.5">{student.created_by_user?.name || '—'}</p>
            <p className="text-[#6b7280] text-xs">{student.created_at ? format(new Date(student.created_at), 'dd MMM yy, hh:mm a') : ''}</p>
          </div>
          {student.bag_issued && (
            <div>
              <p className="text-[#6b7280] text-xs">Bag Issued By</p>
              <p className="text-white text-sm font-medium mt-0.5">{allUsers.find(u => u.id === student.bag_issued_by)?.name || '—'}</p>
              <p className="text-[#6b7280] text-xs">{student.bag_issued_at ? format(new Date(student.bag_issued_at), 'dd MMM yy, hh:mm a') : ''}</p>
            </div>
          )}
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
                <BookOpen size={15} className={`flex-shrink-0 ${i.is_previous_issuance ? 'text-[#f0a500]' : 'text-[#bd0a0a]'}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {(i.books?.exam_level||i.books?.unit||i.books?.part) ? (
                      <p className="text-white text-sm font-semibold truncate">{[i.books?.exam_level,i.books?.unit,i.books?.part].filter(Boolean).join(' › ')}</p>
                    ) : (
                      <p className="text-white text-sm font-medium truncate">{i.books?.title}</p>
                    )}
                    {i.is_previous_issuance && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#f0a500]/20 text-[#f0a500] border border-[#f0a500]/30 flex-shrink-0">Prev.</span>
                    )}
                  </div>
                  {(i.books?.exam_level||i.books?.unit||i.books?.part) && (
                    <p className="text-[#6b7280] text-xs truncate">{i.books?.title}</p>
                  )}
                  <p className="text-[#6b7280] text-xs">{i.books?.category} · {i.books?.medium} · by {i.users?.name || '—'} · {format(new Date(i.issued_at), 'dd MMM yy, hh:mm a')}</p>
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
                {(i.books?.exam_level||i.books?.unit||i.books?.part) ? (
                  <>
                    <p className="text-[#9ca3af] text-sm line-through">{[i.books?.exam_level,i.books?.unit,i.books?.part].filter(Boolean).join(' › ')}</p>
                    <p className="text-[#6b7280] text-xs line-through truncate">{i.books?.title}</p>
                  </>
                ) : (
                  <p className="text-[#9ca3af] text-sm line-through">{i.books?.title}</p>
                )}
                <p className="text-[#6b7280] text-xs mt-0.5">Reason: {i.reversal_reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <EditModal open={editing} onClose={() => setEditing(false)} onSave={handleEdit} student={student} batches={batches} isAdmin={isAdmin} allUsers={allUsers} />
      <ReversalModal open={!!reversing} onClose={() => setReversing(null)} onConfirm={handleReversal} issuance={reversing} />
    </div>
  )
}