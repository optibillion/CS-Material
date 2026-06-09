import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { logAction } from '../../lib/audit'

function Modal({ open, onClose, onSave, initial }) {
  const [name, setName] = useState('')
  const isEdit = !!initial
  useEffect(() => { if (open) setName(initial?.name || '') }, [open, initial])
  async function handleSave() {
    if (!name.trim()) { toast.error('Course name required'); return }
    await onSave(name.trim()); onClose()
  }
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-sm p-6">
        <h2 className="text-white font-semibold text-lg mb-5">{isEdit ? 'Rename Course' : 'Add Course'}</h2>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. MPPSC Pre 2027"
          className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">
            {isEdit ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => { fetchCourses() }, [])

  async function fetchCourses() {
    setLoading(true)
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: true })
    setCourses(data || []); setLoading(false)
  }

  async function handleSave(name) {
    const { error } = await supabase.from('courses').insert({ name, is_default: false, is_active: true })
    if (error) { toast.error('Failed to add course'); return }
    toast.success('Course added')
    logAction('COURSE_CREATED', name)
    fetchCourses()
  }

  async function handleEdit(name) {
    const { error } = await supabase.from('courses').update({ name }).eq('id', editing.id)
    if (error) { toast.error('Failed to update course'); return }
    toast.success('Course renamed')
    logAction('COURSE_UPDATED', `${editing.name} → ${name}`)
    setEditing(null)
    fetchCourses()
  }

  async function toggleActive(course) {
    if (course.is_default) { toast.error('Cannot deactivate default courses'); return }
    const { error } = await supabase.from('courses').update({ is_active: !course.is_active }).eq('id', course.id)
    if (error) { toast.error('Failed'); return }
    toast.success(course.is_active ? 'Course deactivated' : 'Course activated')
    logAction(course.is_active ? 'COURSE_DEACTIVATED' : 'COURSE_ACTIVATED', course.name)
    fetchCourses()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Courses</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{courses.length} total courses</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
          <Plus size={16} /> Add Course
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? [...Array(6)].map((_, i) => (
          <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 h-20 animate-pulse" />
        )) : courses.map(c => (
          <div key={c.id} className={`bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 flex items-center justify-between ${!c.is_active ? 'opacity-50' : ''}`}>
            <div>
              <p className="text-white text-sm font-medium">{c.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {c.is_default && (
                  <span className="text-xs bg-[#f0a500]/20 text-[#f0a500] border border-[#f0a500]/30 px-2 py-0.5 rounded-full">Default</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full border ${c.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-[#2a2a45] text-[#6b7280] border-[#2a2a45]'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 items-end ml-3">
              {!c.is_default && (
                <button onClick={() => setEditing(c)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] transition-all">
                  <Pencil size={10} /> Edit
                </button>
              )}
              {!c.is_default && (
                <button onClick={() => toggleActive(c)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] transition-all">
                  {c.is_active ? 'Deactivate' : 'Activate'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} initial={null} />
      <Modal open={!!editing} onClose={() => setEditing(null)} onSave={handleEdit} initial={editing} />
    </div>
  )
}
