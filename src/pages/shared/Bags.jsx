import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { logAction } from '../../lib/audit'
import { ShoppingBag, Plus, Users, UserCheck, Search, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

function IssueBagModal({ open, onClose, onIssueStaff, onIssueStudent }) {
  const [step, setStep] = useState('choose')
  const [staffName, setStaffName] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [studentResults, setStudentResults] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [saving, setSaving] = useState(false)
  const searchTimeout = useRef(null)

  useEffect(() => {
    if (open) {
      setStep('choose')
      setStaffName('')
      setStudentSearch('')
      setStudentResults([])
      setSelectedStudent(null)
    }
  }, [open])

  function handleStudentSearch(q) {
    setStudentSearch(q)
    setSelectedStudent(null)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.length < 2) { setStudentResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('students')
        .select('id, name, student_id, phone, bag_issued')
        .or(`name.ilike.%${q}%,student_id.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(8)
      setStudentResults(data || [])
    }, 350)
  }

  async function handleStaffIssue() {
    if (!staffName.trim()) { toast.error('Enter a name'); return }
    setSaving(true)
    await onIssueStaff(staffName.trim())
    setSaving(false)
    onClose()
  }

  async function handleStudentIssue() {
    if (!selectedStudent) { toast.error('Select a student'); return }
    if (selectedStudent.bag_issued) { toast.error('Bag already given to this student'); return }
    setSaving(true)
    await onIssueStudent(selectedStudent)
    setSaving(false)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl w-full max-w-sm p-6">

        {step === 'choose' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-[#f0a500]" />
                <h2 className="text-white font-semibold text-lg">Issue Bag</h2>
              </div>
              <button onClick={onClose} className="text-[#6b7280] hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-[#6b7280] text-sm mb-5">Who is receiving the bag?</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStep('student')}
                className="flex flex-col items-center gap-3 py-7 rounded-xl border border-[#2a2a45] bg-[#12121f] hover:border-[#bd0a0a] hover:bg-[#bd0a0a]/5 transition-all group">
                <Users size={28} className="text-[#bd0a0a]" />
                <span className="text-white text-sm font-semibold">Student</span>
              </button>
              <button onClick={() => setStep('staff')}
                className="flex flex-col items-center gap-3 py-7 rounded-xl border border-[#2a2a45] bg-[#12121f] hover:border-[#f0a500] hover:bg-[#f0a500]/5 transition-all group">
                <UserCheck size={28} className="text-[#f0a500]" />
                <span className="text-white text-sm font-semibold">Staff</span>
              </button>
            </div>
          </>
        )}

        {step === 'staff' && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setStep('choose')} className="text-[#6b7280] hover:text-white p-0.5"><X size={16} /></button>
              <h2 className="text-white font-semibold text-lg">Staff Bag</h2>
            </div>
            <label className="text-[#9ca3af] text-sm mb-1.5 block">Name of staff member</label>
            <input
              value={staffName}
              onChange={e => setStaffName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStaffIssue()}
              placeholder="Enter full name..."
              autoFocus
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#f0a500] placeholder-[#4b5563] mb-5"
            />
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] text-sm hover:bg-[#2a2a45] transition-all">
                Cancel
              </button>
              <button onClick={handleStaffIssue} disabled={saving || !staffName.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#f0a500] hover:bg-[#d4920a] disabled:opacity-40 text-black font-semibold text-sm transition-all">
                {saving ? 'Saving...' : 'Give Bag'}
              </button>
            </div>
          </>
        )}

        {step === 'student' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep('choose')} className="text-[#6b7280] hover:text-white p-0.5"><X size={16} /></button>
              <h2 className="text-white font-semibold text-lg">Student Bag</h2>
            </div>

            {selectedStudent ? (
              <div className="bg-[#bd0a0a]/10 border border-[#bd0a0a]/30 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{selectedStudent.name}</p>
                  <p className="text-[#9ca3af] text-xs">{selectedStudent.student_id}</p>
                </div>
                <button onClick={() => { setSelectedStudent(null); setStudentSearch('') }}
                  className="text-[#6b7280] hover:text-white"><X size={15} /></button>
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
                  <input
                    value={studentSearch}
                    onChange={e => handleStudentSearch(e.target.value)}
                    placeholder="Search by name, ID or phone..."
                    autoFocus
                    className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]"
                  />
                </div>
                {studentResults.length > 0 && (
                  <div className="bg-[#12121f] border border-[#2a2a45] rounded-lg overflow-hidden mb-3 max-h-52 overflow-y-auto">
                    {studentResults.map(s => (
                      <button key={s.id} onClick={() => setSelectedStudent(s)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#2a2a45] transition-colors border-b border-[#2a2a45] last:border-0 text-left">
                        <div>
                          <p className="text-white text-sm font-medium">{s.name}</p>
                          <p className="text-[#6b7280] text-xs">{s.student_id}</p>
                        </div>
                        {s.bag_issued && (
                          <span className="text-xs text-emerald-400 flex-shrink-0 ml-2">Bag given</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 mt-3">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] text-sm hover:bg-[#2a2a45] transition-all">
                Cancel
              </button>
              <button onClick={handleStudentIssue}
                disabled={saving || !selectedStudent || selectedStudent?.bag_issued}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] disabled:opacity-40 text-white font-semibold text-sm transition-all">
                {saving ? 'Saving...' : selectedStudent?.bag_issued ? 'Already Given' : 'Give Bag'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Bags() {
  const { profile, isAdmin } = useAuthStore()
  const [staffBags, setStaffBags] = useState([])
  const [studentBags, setStudentBags] = useState([])
  const [issuerNames, setIssuerNames] = useState({})
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: staff }, { data: students }, { data: users }] = await Promise.all([
      supabase.from('staff_bag_issuances').select('*').order('issued_at', { ascending: false }),
      supabase.from('students')
        .select('id, name, student_id, bag_issued, bag_issued_by, bag_issued_at')
        .eq('bag_issued', true)
        .order('bag_issued_at', { ascending: false }),
      supabase.from('users').select('id, name'),
    ])
    setStaffBags(staff || [])
    setStudentBags(students || [])
    const map = {}
    ;(users || []).forEach(u => { map[u.id] = u.name })
    setIssuerNames(map)
    setLoading(false)
  }

  async function handleIssueStaff(name) {
    const { error } = await supabase.from('staff_bag_issuances').insert({
      recipient_name: name,
      issued_by: profile?.id,
      issued_at: new Date().toISOString(),
    })
    if (error) { toast.error('Failed to record bag'); return }
    toast.success(`Bag given to ${name}`)
    logAction('BAG_ISSUED_STAFF', `${name} (recorded by ${profile?.name})`)
    fetchAll()
  }

  async function handleIssueStudent(student) {
    const now = new Date().toISOString()
    const { error } = await supabase.from('students').update({
      bag_issued: true, bag_issued_by: profile?.id, bag_issued_at: now
    }).eq('id', student.id)
    if (error) { toast.error('Failed to record bag'); return }
    toast.success(`Bag given to ${student.name}`)
    logAction('BAG_ISSUED', `${student.name} (${student.student_id})`)
    fetchAll()
  }

  async function undoStaffBag(id, name) {
    const { error } = await supabase.from('staff_bag_issuances').delete().eq('id', id)
    if (error) { toast.error('Failed to undo'); return }
    toast.success(`Removed bag record for ${name}`)
    logAction('BAG_REVOKED_STAFF', name)
    setStaffBags(prev => prev.filter(b => b.id !== id))
  }

  async function undoStudentBag(student) {
    const { error } = await supabase.from('students').update({
      bag_issued: false, bag_issued_by: null, bag_issued_at: null
    }).eq('id', student.id)
    if (error) { toast.error('Failed to undo'); return }
    toast.success(`Removed bag record for ${student.name}`)
    logAction('BAG_REVOKED', `${student.name} (${student.student_id})`)
    setStudentBags(prev => prev.filter(b => b.id !== student.id))
  }

  const allBags = [
    ...staffBags.map(b => ({ ...b, _type: 'staff', _date: b.issued_at, _key: 'staff-' + b.id, _issuerId: b.issued_by })),
    ...studentBags.map(b => ({ ...b, _type: 'student', _date: b.bag_issued_at, _key: 'student-' + b.id, _issuerId: b.bag_issued_by })),
  ].sort((a, b) => new Date(b._date || 0) - new Date(a._date || 0))

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Bags</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {allBags.length} bag{allBags.length !== 1 ? 's' : ''} issued total
          </p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-[#f0a500] hover:bg-[#d4920a] text-black font-semibold px-4 py-2.5 rounded-lg text-sm transition-all">
          <Plus size={16} /> Issue Bag
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : allBags.length === 0 ? (
        <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-10 text-center">
          <ShoppingBag size={36} className="text-[#2a2a45] mx-auto mb-3" />
          <p className="text-white font-medium">No bags issued yet</p>
          <p className="text-[#6b7280] text-sm mt-1">Tap "Issue Bag" to record one</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allBags.map(item => (
            <div key={item._key}
              className="flex items-center gap-3 px-4 py-3.5 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                item._type === 'student' ? 'bg-[#bd0a0a]/20' : 'bg-[#f0a500]/20'
              }`}>
                {item._type === 'student'
                  ? <Users size={16} className="text-[#bd0a0a]" />
                  : <UserCheck size={16} className="text-[#f0a500]" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white text-sm font-medium">
                    {item._type === 'student' ? item.name : item.recipient_name}
                  </p>
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${
                    item._type === 'student'
                      ? 'bg-[#bd0a0a]/20 text-red-400 border-[#bd0a0a]/30'
                      : 'bg-[#f0a500]/20 text-[#f0a500] border-[#f0a500]/30'
                  }`}>
                    {item._type === 'student' ? 'Student' : 'Staff'}
                  </span>
                </div>
                <p className="text-[#6b7280] text-xs mt-0.5">
                  {item._date ? format(new Date(item._date), 'dd MMM yyyy, h:mm a') : '—'}
                  {item._issuerId && issuerNames[item._issuerId]
                    ? ` · by ${issuerNames[item._issuerId]}` : ''}
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => item._type === 'staff'
                    ? undoStaffBag(item.id, item.recipient_name)
                    : undoStudentBag(item)
                  }
                  className="text-[#4b5563] hover:text-red-400 transition-colors flex-shrink-0 p-1.5"
                  title="Remove record"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <IssueBagModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onIssueStaff={handleIssueStaff}
        onIssueStudent={handleIssueStudent}
      />
    </div>
  )
}
