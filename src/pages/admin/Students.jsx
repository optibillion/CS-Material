import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, generateStudentId, uploadStudentPhoto } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useRealtime } from '../../hooks/useRealtime'
import { logAction } from '../../lib/audit'
import { Plus, Search, Pencil, UserX, UserCheck, Upload, X, Camera, Trash2, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import CameraModal from '../../components/CameraModal'

function getInitials(name) {
  return name?.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function StudentAvatar({ url, name, size = 28 }) {
  return (
    <div
      style={{ width: size, height: size, minWidth: size, fontSize: size * 0.36 }}
      className="rounded-full overflow-hidden bg-[#2a2a45] border border-[#3a3a55] flex items-center justify-center flex-shrink-0">
      {url
        ? <img src={url} alt="" className="w-full h-full object-cover" />
        : <span className="text-white font-semibold">{getInitials(name)}</span>}
    </div>
  )
}

function AddStudentModal({ open, onClose, onSave, batches }) {
  const [form, setForm] = useState({ name: '', phone: '', dob: '', admission_date: '', batch_id: '', medium: '' })
  const [errors, setErrors] = useState({})
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const fileInputRef = useRef(null)
  const today = new Date().toISOString().split('T')[0]
  const dobMax = new Date(new Date().setFullYear(new Date().getFullYear() - 15)).toISOString().split('T')[0]
  useEffect(() => {
    if (open) {
      setForm({ name: '', phone: '', dob: '', admission_date: '', batch_id: '', medium: '' })
      setErrors({})
      setPhotoFile(null)
      setPhotoPreview(null)
    }
  }, [open])
  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function handlePhotoSelect(file) {
    if (!file) return
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }
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
    await onSave(form, photoFile); onClose()
  }
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-white font-semibold text-lg mb-5">Add New Student</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[#9ca3af] text-sm mb-2 block">Photo <span className="text-[#6b7280] text-xs">(optional)</span></label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-[#2a2a45] border-2 border-[#3a3a55] flex items-center justify-center flex-shrink-0 text-white text-lg font-bold">
                {photoPreview
                  ? <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                  : getInitials(form.name) }
              </div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] hover:text-white transition-all">
                  <Upload size={12} /> Upload
                </button>
                <button type="button" onClick={() => setCameraOpen(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] hover:text-white transition-all">
                  <Camera size={12} /> Camera
                </button>
                {photoPreview && (
                  <button type="button" onClick={() => { URL.revokeObjectURL(photoPreview); setPhotoPreview(null); setPhotoFile(null) }}
                    className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all">
                    <X size={11} />
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ position: 'absolute', opacity: 0, width: 0, height: 0, overflow: 'hidden' }} onChange={e => handlePhotoSelect(e.target.files?.[0])} />
            </div>
          </div>
          <CameraModal open={cameraOpen} onCapture={handlePhotoSelect} onClose={() => setCameraOpen(false)} />
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

function EditStudentModal({ open, onClose, onSave, student, batches }) {
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const fileInputRef = useRef(null)
  useEffect(() => {
    if (open && student) {
      setForm({
        name: student.name || '',
        phone: student.phone || '',
        dob: student.dob || '',
        admission_date: student.admission_date || '',
        batch_id: student.batch_id || '',
        medium: student.medium || '',
        student_id: student.student_id || ''
      })
      setPhotoFile(null)
      setPhotoPreview(null)
      setErrors({})
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
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (form.phone && !/^\d{10}$/.test(form.phone)) errs.phone = 'Must be 10 digits'
    const newId = form.student_id.trim().toUpperCase()
    if (!newId) {
      errs.student_id = 'Student ID cannot be empty'
    } else if (newId !== student.student_id) {
      const { data: clash } = await supabase.from('students').select('id').eq('student_id', newId).maybeSingle()
      if (clash) errs.student_id = 'This Student ID is already in use'
    }
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    await onSave({ ...form, student_id: newId, _photoFile: photoFile }); onClose()
  }
  if (!open) return null
  const displayPhoto = photoPreview || student?.profile_image_url
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-white font-semibold text-lg mb-5">Edit Student</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[#9ca3af] text-sm mb-2 block">Photo</label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-[#2a2a45] border-2 border-[#3a3a55] flex items-center justify-center flex-shrink-0 text-white text-lg font-bold">
                {displayPhoto
                  ? <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
                  : getInitials(form.name || student?.name)}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] hover:text-white transition-all">
                  <Upload size={12} /> Upload
                </button>
                <button type="button" onClick={() => setCameraOpen(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] hover:text-white transition-all">
                  <Camera size={12} /> Camera
                </button>
                {photoPreview && (
                  <button type="button" onClick={() => { URL.revokeObjectURL(photoPreview); setPhotoPreview(null); setPhotoFile(null) }}
                    className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all">
                    <X size={11} />
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ position: 'absolute', opacity: 0, width: 0, height: 0, overflow: 'hidden' }} onChange={e => handlePhotoSelect(e.target.files?.[0])} />
            </div>
            <CameraModal open={cameraOpen} onCapture={handlePhotoSelect} onClose={() => setCameraOpen(false)} />
            {photoPreview && <p className="text-[#f0a500] text-xs mt-1.5">New photo selected — will save with student</p>}
          </div>
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Student ID <span className="text-[#bd0a0a] text-xs">(must be unique)</span></label>
            <input value={form.student_id || ''} onChange={e => set('student_id', e.target.value.toUpperCase())}
              className={`w-full bg-[#12121f] border rounded-lg px-3 py-2.5 text-[#f0a500] font-mono text-sm focus:outline-none tracking-wide ${errors.student_id ? 'border-red-500' : 'border-[#2a2a45] focus:border-[#f0a500]'}`} />
            {errors.student_id && <p className="text-red-400 text-xs mt-1">{errors.student_id}</p>}
          </div>
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
          <div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Batch</label>
            <select value={form.batch_id || ''} onChange={e => set('batch_id', e.target.value)}
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
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">Save Changes</button>
        </div>
      </div>
    </div>
  )
}

const BULK_FIELD_ALIASES = {
  student_id:     ['स्टूडेंट id', 'स्टूडेंट आईडी', 'student id', 'id', 'roll no', 'roll number', 'rollno'],
  name:           ['नाम', 'name', 'full name', 'student name', 'student'],
  phone:          ['फ़ोन', 'फोन', 'phone', 'mobile', 'मोबाइल', 'contact', 'number'],
  dob:            ['जन्म तिथि', 'जन्म', 'dob', 'date of birth', 'birth'],
  admission_date: ['प्रवेश तिथि', 'प्रवेश', 'admission', 'joining', 'admit'],
  medium:         ['माध्यम', 'medium', 'language', 'lang', 'भाषा'],
  batch:          ['बैच', 'batch'],
}

function parseDateStr(val) {
  if (!val?.trim()) return ''
  const v = val.trim()
  const dmy = v.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2,'0')}-${String(dmy[1]).padStart(2,'0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  return ''
}

function parseMediumStr(val) {
  if (!val?.trim()) return ''
  const v = val.trim().toLowerCase()
  if (['हिंदी','hindi','h','हि','हिन्दी'].some(x => v.includes(x.toLowerCase()))) return 'hindi'
  if (['अंग्रेजी','english','eng','e','अं'].some(x => v.includes(x.toLowerCase()))) return 'english'
  return ''
}

function rowErrors(row) {
  const e = []
  if (!row.name?.trim()) e.push('नाम आवश्यक')
  if (row.phone?.trim() && !/^\d{10}$/.test(row.phone.trim())) e.push('फ़ोन 10 अंक होना चाहिए')
  return e
}

function BulkUploadModal({ open, onClose, onDone, batches, profile }) {
  const [stage, setStage] = useState('paste')
  const [rows, setRows] = useState([])
  const [uploading, setUploading] = useState(false)
  const [doneResult, setDoneResult] = useState(null)

  useEffect(() => {
    if (open) { setStage('paste'); setRows([]); setDoneResult(null) }
  }, [open])

  const batchByName = Object.fromEntries(batches.map(b => [b.name.toLowerCase().trim(), b.id]))

  function processFieldValue(field, val) {
    const v = (val || '').trim()
    if (field === 'student_id') return v.toUpperCase()
    if (field === 'phone') return v.replace(/\D/g, '').slice(0, 10)
    // dates stored as raw DD/MM/YYYY — parsed only on create
    if (field === 'dob' || field === 'admission_date') return v
    // medium and batch_text stored as raw — parsed only on create
    return v
  }

  function handleCellPaste(e, rowIndex, field) {
    const text = e.clipboardData.getData('text')
    const values = text.split('\n').map(v => v.replace(/\r/g, '').trim()).filter(Boolean)
    if (values.length <= 1) return
    e.preventDefault()
    setRows(prev => {
      const updated = [...prev]
      values.forEach((val, i) => {
        const idx = rowIndex + i
        const processed = processFieldValue(field, val)
        if (idx < updated.length) {
          updated[idx] = { ...updated[idx], [field]: processed }
        } else {
          const blank = { student_id: '', name: '', phone: '', dob: '', admission_date: '', medium: '', batch_text: '' }
          blank[field] = processed
          updated.push(blank)
        }
      })
      return updated
    })
  }

  function handlePastedText(text) {
    if (!text.trim()) return
    const lines = text.trim().split('\n').map(l => l.split('\t').map(c => c.replace(/\r/g, '').trim()))
    if (lines.length < 2) return
    const colMap = {}
    lines[0].forEach((cell, i) => {
      const h = cell.trim().toLowerCase()
      for (const [field, aliases] of Object.entries(BULK_FIELD_ALIASES)) {
        if (aliases.some(a => h.includes(a.toLowerCase()))) { colMap[i] = field; break }
      }
    })
    const parsed = lines.slice(1).filter(row => row.some(c => c)).map(row => {
      const r = { student_id: '', name: '', phone: '', dob: '', admission_date: '', medium: '', batch_text: '' }
      row.forEach((cell, i) => {
        const field = colMap[i]
        if (!field || !cell) return
        if (field === 'dob') r.dob = cell.trim()
        else if (field === 'admission_date') r.admission_date = cell.trim()
        else if (field === 'medium') r.medium = cell.trim()
        else if (field === 'batch') r.batch_text = cell.trim()
        else if (field === 'student_id') r.student_id = cell.trim().toUpperCase()
        else r[field] = cell
      })
      return r
    })
    if (parsed.length > 0) { setRows(parsed); setStage('review') }
  }

  function updateRow(i, field, value) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  function deleteRow(i) {
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }

  function addRow() {
    setRows(prev => [...prev, { student_id: '', name: '', phone: '', dob: '', admission_date: '', medium: '', batch_text: '' }])
  }

  async function handleCreate() {
    const valid = rows.filter(r => rowErrors(r).length === 0 && r.name?.trim())
    if (!valid.length) return
    setUploading(true)

    const phones = valid.map(r => r.phone?.trim()).filter(Boolean)
    const { data: existing } = phones.length
      ? await supabase.from('students').select('phone').in('phone', phones)
      : { data: [] }
    const existingPhones = new Set((existing || []).map(s => s.phone))

    const toInsert = valid
      .filter(r => !r.phone?.trim() || !existingPhones.has(r.phone.trim()))
      .map(r => ({
        student_id: r.student_id?.trim() || null,
        name: r.name.trim(),
        phone: r.phone?.trim() || null,
        dob: parseDateStr(r.dob) || null,
        admission_date: parseDateStr(r.admission_date) || null,
        medium: parseMediumStr(r.medium) || null,
        batch_id: batchByName[r.batch_text?.toLowerCase().trim()] || null,
        created_by: profile?.id
      }))

    const dupes = valid.length - toInsert.length

    const needsId = toInsert.filter(r => !r.student_id)
    if (needsId.length > 0) {
      const ids = await generateStudentId(needsId.length)
      const idsArr = Array.isArray(ids) ? ids : [ids]
      let idx = 0
      for (const r of toInsert) { if (!r.student_id) r.student_id = idsArr[idx++] }
    }

    const { data: inserted, error } = await supabase.from('students').insert(toInsert).select()
    setUploading(false)
    if (error) { toast.error('Failed: ' + error.message); return }
    logAction('BULK_STUDENT_UPLOAD', `${inserted.length} students created via bulk upload`)
    toast.success(`${inserted.length} students created`)
    setDoneResult({ success: inserted.length, dupes, errRows: rows.length - valid.length })
    setStage('done')
    onDone()
  }

  const validCount = rows.filter(r => rowErrors(r).length === 0 && r.name?.trim()).length
  const isReview = stage === 'review'

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-2 py-4">
      <div className={`bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-5 max-h-[95vh] flex flex-col transition-all ${isReview ? 'w-full max-w-[98vw]' : 'w-full max-w-xl'}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h2 className="text-white font-semibold text-lg flex items-center gap-2">
              <Upload size={17} className="text-[#f0a500]" /> Bulk Student Upload
              {isReview && <span className="text-[#6b7280] text-sm font-normal ml-1">— Review & Edit</span>}
            </h2>
            {stage === 'paste' && <p className="text-[#6b7280] text-xs mt-0.5">Excel से data paste करें • headers auto-detect होती हैं</p>}
            {isReview && <p className="text-[#6b7280] text-xs mt-0.5">{rows.length} rows • {validCount} valid — सब कुछ ठीक करें, फिर Create दबाएं</p>}
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white p-1 flex-shrink-0"><X size={18} /></button>
        </div>

        {/* DONE */}
        {stage === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 text-3xl font-bold">✓</span>
            </div>
            <p className="text-white text-xl font-bold">{doneResult?.success} students created</p>
            {doneResult?.dupes > 0 && <p className="text-orange-400 text-sm">{doneResult.dupes} skipped — phone already registered</p>}
            {doneResult?.errRows > 0 && <p className="text-red-400 text-sm">{doneResult.errRows} rows skipped (had errors)</p>}
            <button onClick={onClose} className="mt-4 px-8 py-2.5 bg-[#bd0a0a] hover:bg-[#a00909] text-white rounded-lg text-sm font-semibold">Done</button>
          </div>
        )}

        {/* PASTE STAGE */}
        {stage === 'paste' && (
          <>
            <div className="bg-[#12121f] border border-[#2a2a45] rounded-lg px-4 py-3 mb-3">
              <p className="text-[#6b7280] text-xs mb-1.5">Excel में पहली row ये headers रखें (order कोई भी हो सकता है):</p>
              <p className="text-[#f0a500] text-sm font-mono tracking-wide">स्टूडेंट ID · नाम · फ़ोन · जन्म तिथि · प्रवेश तिथि · माध्यम · बैच</p>
              <p className="text-[#4b5563] text-xs mt-1.5">खाली cells बिल्कुल ठीक हैं · ID खाली हो तो auto-generate · तिथि: DD/MM/YYYY · माध्यम: हिंदी / English</p>
            </div>
            <textarea
              autoFocus
              onPaste={e => { e.preventDefault(); const t = e.clipboardData.getData('text'); handlePastedText(t) }}
              onChange={e => handlePastedText(e.target.value)}
              placeholder="Excel से data copy करें और यहाँ Ctrl+V से paste करें..."
              rows={6}
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563] resize-none font-mono"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
            </div>
          </>
        )}

        {/* REVIEW / EDIT STAGE */}
        {isReview && (
          <>
            <div className="flex-1 overflow-auto min-h-0 border border-[#2a2a45] rounded-lg mb-4">
              <table className="text-xs w-full" style={{ minWidth: '900px' }}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#12121f] border-b border-[#2a2a45]">
                    <th className="px-2 py-2 text-[#6b7280] font-medium text-left w-8">#</th>
                    <th className="px-2 py-2 text-[#f0a500] font-medium text-left w-28">स्टूडेंट ID</th>
                    <th className="px-2 py-2 text-[#9ca3af] font-medium text-left w-36">नाम *</th>
                    <th className="px-2 py-2 text-[#9ca3af] font-medium text-left w-28">फ़ोन</th>
                    <th className="px-2 py-2 text-[#9ca3af] font-medium text-left w-32">जन्म तिथि</th>
                    <th className="px-2 py-2 text-[#9ca3af] font-medium text-left w-32">प्रवेश तिथि</th>
                    <th className="px-2 py-2 text-[#9ca3af] font-medium text-left w-28">माध्यम</th>
                    <th className="px-2 py-2 text-[#9ca3af] font-medium text-left w-36">बैच</th>
                    <th className="px-2 py-2 text-[#9ca3af] font-medium text-left w-28">स्थिति</th>
                    <th className="px-2 py-2 w-7"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a45]">
                  {rows.map((row, i) => {
                    const errs = rowErrors(row)
                    const cellCls = 'w-full bg-transparent text-white text-xs px-1.5 py-1 focus:outline-none focus:bg-[#2a2a45] rounded'
                    return (
                      <tr key={i} className={errs.length > 0 ? 'bg-red-500/5' : 'hover:bg-[#12121f]/60'}>
                        <td className="px-2 py-1 text-[#4b5563] text-center">{i + 1}</td>
                        <td className="px-1 py-1">
                          <input value={row.student_id} onChange={e => updateRow(i, 'student_id', e.target.value.toUpperCase())}
                            onPaste={e => handleCellPaste(e, i, 'student_id')}
                            placeholder="auto" className={cellCls + ' font-mono text-[#f0a500] placeholder-[#4b5563]'} />
                        </td>
                        <td className="px-1 py-1">
                          <input value={row.name} onChange={e => updateRow(i, 'name', e.target.value)}
                            onPaste={e => handleCellPaste(e, i, 'name')}
                            placeholder="नाम *" className={cellCls + (!row.name?.trim() ? ' border-b border-red-500/60' : '')} />
                        </td>
                        <td className="px-1 py-1">
                          <input value={row.phone} onChange={e => updateRow(i, 'phone', e.target.value.replace(/\D/g,'').slice(0,10))}
                            onPaste={e => handleCellPaste(e, i, 'phone')}
                            placeholder="10 digits" className={cellCls} />
                        </td>
                        <td className="px-1 py-1">
                          <input type="text" value={row.dob} onChange={e => updateRow(i, 'dob', e.target.value)}
                            onPaste={e => handleCellPaste(e, i, 'dob')}
                            placeholder="DD/MM/YYYY" className={cellCls + ' text-[#9ca3af] placeholder-[#4b5563]'} />
                        </td>
                        <td className="px-1 py-1">
                          <input type="text" value={row.admission_date} onChange={e => updateRow(i, 'admission_date', e.target.value)}
                            onPaste={e => handleCellPaste(e, i, 'admission_date')}
                            placeholder="DD/MM/YYYY" className={cellCls + ' text-[#9ca3af] placeholder-[#4b5563]'} />
                        </td>
                        <td className="px-1 py-1">
                          <input value={row.medium} onChange={e => updateRow(i, 'medium', e.target.value)}
                            onPaste={e => handleCellPaste(e, i, 'medium')}
                            placeholder="हिंदी / English" className={cellCls + ' text-[#9ca3af] placeholder-[#4b5563]'} />
                        </td>
                        <td className="px-1 py-1">
                          <input value={row.batch_text} onChange={e => updateRow(i, 'batch_text', e.target.value)}
                            onPaste={e => handleCellPaste(e, i, 'batch_text')}
                            placeholder="batch name" className={`${cellCls} placeholder-[#4b5563] ${row.batch_text && !batchByName[row.batch_text.toLowerCase().trim()] ? 'text-orange-400' : 'text-[#9ca3af]'}`} />
                        </td>
                        <td className="px-2 py-1">
                          {errs.length > 0
                            ? <span className="text-red-400" title={errs.join(' | ')}>⚠ {errs[0]}</span>
                            : row.batch_text && !batchByName[row.batch_text.toLowerCase().trim()]
                              ? <span className="text-orange-400 text-xs">बैच नहीं मिला</span>
                              : <span className="text-emerald-400 font-medium">✓</span>}
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button onClick={() => deleteRow(i)} className="text-[#4b5563] hover:text-red-400 transition-colors" title="Delete row">
                            <X size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              <button onClick={() => setStage('paste')}
                className="px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">
                ← Back
              </button>
              <button onClick={addRow}
                className="px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">
                + Row
              </button>
              <div className="flex-1" />
              <span className="self-center text-[#6b7280] text-xs">{validCount} of {rows.length} ready</span>
              <button onClick={handleCreate} disabled={validCount === 0 || uploading}
                className="px-6 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] disabled:opacity-40 text-white font-semibold text-sm transition-all">
                {uploading ? 'Creating...' : `Create ${validCount} Student${validCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Students() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [students, setStudents] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [bulkOpen, setBulkOpen] = useState(false)

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

  async function handleAdd(form, photoFile) {
    const { data: existing } = await supabase
      .from('students').select('id, name, student_id').eq('phone', form.phone).maybeSingle()
    if (existing) { toast.error(`Phone already registered to ${existing.name} (${existing.student_id})`); return }
    if (form.dob) {
      const { data: dobMatch } = await supabase
        .from('students').select('id, name, student_id').ilike('name', form.name.trim()).eq('dob', form.dob).maybeSingle()
      if (dobMatch) { toast.error(`${dobMatch.name} (${dobMatch.student_id}) already registered with same name & DOB`); return }
    }
    const student_id = await generateStudentId()
    const payload = {
      student_id,
      name: form.name, phone: form.phone,
      dob: form.dob || null, admission_date: form.admission_date || null,
      batch_id: form.batch_id || null,
      medium: form.medium || null, created_by: profile?.id
    }
    const { data: inserted, error } = await supabase.from('students').insert(payload).select().single()
    if (error) { toast.error('Failed to add student'); return }
    if (photoFile && inserted) {
      try {
        const url = await uploadStudentPhoto(photoFile, inserted.student_id)
        await supabase.from('students').update({ profile_image_url: url }).eq('id', inserted.id)
      } catch { toast.error('Student added — photo upload failed (check storage bucket)') }
    }
    toast.success(`Student added — ${student_id}`)
    logAction('STUDENT_CREATED', `${form.name} | ${form.phone} | ${student_id}`)
    fetchAll()
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
      student_id: cleanForm.student_id || editing.student_id
    }
    if (_photoFile) {
      try {
        const url = await uploadStudentPhoto(_photoFile, cleanForm.student_id || editing.student_id)
        payload.profile_image_url = url
      } catch {
        toast.error('Photo upload failed')
        return
      }
    }
    const { data: updated, error } = await supabase.from('students').update(payload).eq('id', editing.id).select('id').single()
    if (error) {
      if (error.code === '23505') toast.error('Student ID already in use by another student')
      else toast.error('Failed to update student')
      return
    }
    if (!updated) { toast.error('Failed to update — check permissions'); return }
    toast.success('Student updated')
    logAction('STUDENT_UPDATED', `${editing.name} (${editing.student_id})${cleanForm.student_id !== editing.student_id ? ` → ID changed to ${cleanForm.student_id}` : ''}`)
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

  async function handleDelete(s) {
    const { error } = await supabase.from('students').delete().eq('id', s.id)
    if (error) { toast.error('Failed to delete student'); return }
    toast.success(`${s.name} permanently deleted`)
    logAction('STUDENT_DELETED', `${s.name} (${s.student_id})`)
    setDeleteConfirm(null)
    fetchAll()
  }

  function handleExportDeactivated() {
    const headers = ['Student ID', 'Name', 'Phone', 'Batch', 'Medium', 'Admitted', 'DOB']
    const csv = [
      headers.join(','),
      ...filtered.map(s => [
        s.student_id,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        s.phone || '',
        `"${s.batches?.name || ''}"`,
        s.medium || '',
        s.admission_date ? format(new Date(s.admission_date), 'dd MMM yyyy') : '',
        s.dob ? format(new Date(s.dob), 'dd MMM yyyy') : '',
      ].join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `deactivated-students-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
        <div className="flex items-center gap-2">
          {!showInactive && (
            <>
              <button onClick={() => setBulkOpen(true)}
                className="flex items-center gap-2 bg-[#2a2a45] hover:bg-[#3a3a55] text-[#f0a500] border border-[#f0a500]/30 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
                <Upload size={15} /> Bulk Upload
              </button>
              <button onClick={() => setAddOpen(true)}
                className="flex items-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
                <Plus size={16} /> Add Student
              </button>
            </>
          )}
          {showInactive && filtered.length > 0 && (
            <button onClick={handleExportDeactivated}
              className="flex items-center gap-2 bg-[#2a2a45] hover:bg-[#3a3a55] text-orange-400 border border-orange-500/30 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
              <Download size={15} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#12121f] border border-[#2a2a45] rounded-xl p-1 w-fit">
        <button
          onClick={() => { setShowInactive(false); setSearch('') }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${!showInactive ? 'bg-[#bd0a0a] text-white shadow' : 'text-[#6b7280] hover:text-white'}`}>
          <UserCheck size={14} />
          Active
          <span className={`text-xs px-1.5 py-0.5 rounded-md ${!showInactive ? 'bg-white/20 text-white' : 'bg-[#2a2a45] text-[#9ca3af]'}`}>
            {students.filter(s => s.is_active !== false).length}
          </span>
        </button>
        <button
          onClick={() => { setShowInactive(true); setSearch('') }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${showInactive ? 'bg-orange-500/20 text-orange-400 shadow' : 'text-[#6b7280] hover:text-white'}`}>
          <UserX size={14} />
          Deactivated
          {inactiveCount > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-md ${showInactive ? 'bg-orange-500/30 text-orange-300' : 'bg-[#2a2a45] text-[#9ca3af]'}`}>
              {inactiveCount}
            </span>
          )}
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={showInactive ? 'Search deactivated students...' : 'Search by name, ID or phone...'}
          className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
      </div>

      {showInactive && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <UserX size={14} className="text-orange-400 flex-shrink-0" />
          <p className="text-orange-400 text-xs">Deactivated students cannot be searched or issued books. You can reactivate or permanently delete them.</p>
        </div>
      )}

      {/* Desktop table */}
      <div className="mob-table bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[750px]">
          <thead>
            <tr className="border-b border-[#2a2a45]">
              {['STUDENT ID','NAME','PHONE','BATCH / CODE','ADMITTED','ACTIONS'].map(h=>(
                <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a45]">
            {loading ? [...Array(5)].map((_,i)=>(
              <tr key={i}>{[...Array(6)].map((_,j)=>(
                <td key={j} className="px-4 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse"/></td>
              ))}</tr>
            )) : filtered.length===0 ? (
              <tr><td colSpan={6} className="text-center text-[#6b7280] py-10 text-sm">No students found</td></tr>
            ) : filtered.map(s=>(
              <tr key={s.id} className={`hover:bg-[#12121f] transition-colors ${s.is_active === false ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 cursor-pointer" onClick={()=>navigate(`/admin/students/${s.id}`)}>
                  <span className="text-[#f0a500] text-sm font-mono">{s.student_id}</span>
                </td>
                <td className="px-4 py-3 cursor-pointer" onClick={()=>navigate(`/admin/students/${s.id}`)}>
                  <div className="flex items-center gap-2.5">
                    <StudentAvatar url={s.profile_image_url} name={s.name} size={28} />
                    <div>
                      <p className="text-white text-sm font-medium">{s.name}</p>
                      {s.is_active === false && <span className="text-xs text-orange-400">Inactive</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#9ca3af] text-sm cursor-pointer" onClick={()=>navigate(`/admin/students/${s.id}`)}>{s.phone||'—'}</td>
                <td className="px-4 py-3 cursor-pointer" onClick={()=>navigate(`/admin/students/${s.id}`)}>
                  {s.batches ? (
                    <div>
                      {s.batches.batch_code && <span className="text-[#f0a500] text-xs font-mono font-semibold tracking-widest block">{s.batches.batch_code}</span>}
                      <span className="text-[#9ca3af] text-sm">{s.batches.name}</span>
                    </div>
                  ) : <span className="text-[#6b7280] text-sm">—</span>}
                </td>
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
                    {s.is_active === false && (
                      <button onClick={e => { e.stopPropagation(); setDeleteConfirm(s) }}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all">
                        <Trash2 size={11} /> Delete
                      </button>
                    )}
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
              <div className="flex items-center gap-2.5">
                <StudentAvatar url={s.profile_image_url} name={s.name} size={36} />
                <div>
                  <p className="text-white font-semibold text-sm">{s.name}</p>
                  {s.is_active === false && <span className="text-xs text-orange-400">Inactive</span>}
                </div>
              </div>
              <span className="text-[#f0a500] text-xs font-mono">{s.student_id}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-3 cursor-pointer" onClick={()=>navigate(`/admin/students/${s.id}`)}>
              <p className="text-[#6b7280] text-xs">📞 {s.phone||'—'}</p>
              <p className="text-[#6b7280] text-xs">
                🏫 {s.batches
                  ? <>{s.batches.batch_code && <span className="text-[#f0a500] font-mono font-semibold">{s.batches.batch_code} · </span>}{s.batches.name}</>
                  : '—'}
              </p>
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
              {s.is_active === false ? (
                <button onClick={e => { e.stopPropagation(); setDeleteConfirm(s) }}
                  className="flex-1 flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-lg bg-red-500/10 text-red-400 transition-all">
                  <Trash2 size={11} /> Delete
                </button>
              ) : (
                <button onClick={()=>navigate(`/admin/students/${s.id}`)}
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] transition-all">
                  View →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AddStudentModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleAdd} batches={batches} />
      <EditStudentModal open={!!editing} onClose={() => setEditing(null)} onSave={handleEdit} student={editing} batches={batches} />
      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)} onDone={fetchAll} batches={batches} profile={profile} />

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Delete Student?</h3>
                <p className="text-[#6b7280] text-xs mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-[#9ca3af] text-sm">
              Permanently delete <span className="text-white font-semibold">{deleteConfirm.name}</span>{' '}
              <span className="text-[#f0a500] font-mono text-xs">({deleteConfirm.student_id})</span>? All records linked to this student will also be removed.
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white text-sm font-medium transition-all">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2">
                <Trash2 size={14} /> Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
