import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, BookOpen, Send, ShoppingBag, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { logAction } from '../../lib/audit'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'

export default function IssuerStudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [student, setStudent] = useState(null)
  const [issuances, setIssuances] = useState([])
  const [bagIssuerName, setBagIssuerName] = useState(null)
  const [loading, setLoading] = useState(true)
  const [phoneModal, setPhoneModal] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [phoneSaving, setPhoneSaving] = useState(false)

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    setLoading(true)
    const [{ data: s }, { data: i }] = await Promise.all([
      supabase.from('students').select('*, batches(name, batch_code), created_by_user:users!students_created_by_fkey(name)').eq('id', id).single(),
      supabase.from('issuances')
        .select('*, books(title, exam_level, unit, part, category, medium), users!issuances_issued_by_fkey(name)')
        .eq('student_id', id)
        .eq('is_reversed', false)
        .order('issued_at', { ascending: false })
    ])
    setStudent(s); setIssuances(i || [])
    if (s?.bag_issued_by) {
      const { data: u } = await supabase.from('users').select('name').eq('id', s.bag_issued_by).single()
      setBagIssuerName(u?.name || null)
    }
    setLoading(false)
  }

  function openPhoneModal() {
    setPhoneInput(student.phone || '')
    setPhoneError('')
    setPhoneModal(true)
  }

  async function handleSavePhone() {
    const cleaned = phoneInput.replace(/\D/g, '')
    if (cleaned.length !== 10) { setPhoneError('Phone number must be exactly 10 digits'); return }
    setPhoneSaving(true)
    const oldPhone = student.phone || '—'
    const { error } = await supabase.from('students').update({ phone: cleaned }).eq('id', id)
    setPhoneSaving(false)
    if (error) { toast.error('Failed to update phone'); return }
    logAction('PHONE_UPDATED', `${student.name} (${student.student_id}) — ${oldPhone} → ${cleaned}`)
    setStudent(prev => ({ ...prev, phone: cleaned }))
    setPhoneModal(false)
    toast.success('Phone number updated')
  }

  async function handleIssueBag() {
    const now = new Date().toISOString()
    const { error } = await supabase.from('students').update({ bag_issued: true, bag_issued_by: profile?.id, bag_issued_at: now }).eq('id', id)
    if (error) { toast.error('Failed to mark bag'); return }
    toast.success(`Bag issued to ${student.name}`)
    logAction('BAG_ISSUED', `${student.name} (${student.student_id})`)
    setStudent(prev => ({ ...prev, bag_issued: true, bag_issued_by: profile?.id, bag_issued_at: now }))
    setBagIssuerName(profile?.name || null)
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="h-8 bg-[#2a2a45] rounded w-48 animate-pulse" />
      <div className="h-32 bg-[#1a1a2e] border border-[#2a2a45] rounded-xl animate-pulse" />
    </div>
  )

  if (!student) return <div className="p-6 text-[#6b7280]">Student not found</div>

  return (
    <div className="p-6 space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#6b7280] hover:text-white text-sm transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-[#2a2a45] border-2 border-[#3a3a55] flex items-center justify-center flex-shrink-0">
              {student.profile_image_url
                ? <img src={student.profile_image_url} alt="" className="w-full h-full object-cover" />
                : <span className="text-white text-xl font-bold">{student.name?.split(' ').filter(Boolean).map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?'}</span>}
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">{student.name}</h1>
              <p className="text-[#f0a500] text-sm font-mono mt-1">{student.student_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full">
              {issuances.length} books issued
            </span>
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium ${student.bag_issued ? 'bg-[#f0a500]/20 text-[#f0a500] border-[#f0a500]/30' : 'bg-[#2a2a45] text-[#6b7280] border-[#2a2a45]'}`}>
              <ShoppingBag size={11} /> {student.bag_issued ? 'Bag issued' : 'No bag'}
            </span>
            {!student.bag_issued && (
              <button onClick={handleIssueBag}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#f0a500] hover:bg-[#d4920a] text-black font-semibold transition-all">
                <ShoppingBag size={13} /> Issue Bag
              </button>
            )}
            <button onClick={() => navigate(`/issuer/issue?student=${id}`)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white transition-all">
              <Send size={13} /> Issue Material
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-[#6b7280] text-xs">Phone</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-white text-sm font-medium">{student.phone || '—'}</p>
              <button onClick={openPhoneModal} className="text-[#6b7280] hover:text-[#f0a500] transition-colors" title="Edit phone">
                <Pencil size={12} />
              </button>
            </div>
          </div>
          {[
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
              <p className="text-white text-sm font-medium mt-0.5">{bagIssuerName || '—'}</p>
              <p className="text-[#6b7280] text-xs">{student.bag_issued_at ? format(new Date(student.bag_issued_at), 'dd MMM yy, hh:mm a') : ''}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl">
        <div className="px-5 py-4 border-b border-[#2a2a45]">
          <h2 className="text-white font-semibold text-sm">Issued Books ({issuances.length})</h2>
        </div>
        <div className="divide-y divide-[#2a2a45]">
          {issuances.length === 0 ? (
            <p className="text-[#6b7280] text-sm px-5 py-6 text-center">No books issued yet</p>
          ) : issuances.map(i => (
            <div key={i.id} className="px-5 py-3 flex items-center gap-3">
              <BookOpen size={15} className={`flex-shrink-0 ${i.is_previous_issuance ? 'text-[#f0a500]' : 'text-[#bd0a0a]'}`} />
              <div className="flex-1 min-w-0">
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
                <p className="text-[#6b7280] text-xs mt-0.5">
                  {i.books?.category} · {i.books?.medium} · by {i.users?.name || '—'} · {format(new Date(i.issued_at), 'dd MMM yy, hh:mm a')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {phoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-5 w-full max-w-sm space-y-4">
            <h3 className="text-white font-semibold text-sm">Update Phone Number</h3>
            <div>
              <input
                type="tel"
                inputMode="numeric"
                value={phoneInput}
                onChange={e => { setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10)); setPhoneError('') }}
                placeholder="10-digit phone number"
                className="w-full bg-[#0f0f23] border border-[#2a2a45] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#f0a500] placeholder-[#4b5563]"
              />
              {phoneError && <p className="text-red-400 text-xs mt-1">{phoneError}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPhoneModal(false)} className="text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-white transition-all">
                Cancel
              </button>
              <button onClick={handleSavePhone} disabled={phoneSaving} className="text-xs px-3 py-1.5 rounded-lg bg-[#f0a500] hover:bg-[#d4920a] text-black font-semibold transition-all disabled:opacity-50">
                {phoneSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
