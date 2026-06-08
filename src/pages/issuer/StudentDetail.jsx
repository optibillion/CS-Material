import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, BookOpen, Send } from 'lucide-react'
import { format } from 'date-fns'

export default function IssuerStudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [issuances, setIssuances] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    setLoading(true)
    const [{ data: s }, { data: i }] = await Promise.all([
      supabase.from('students').select('*, batches(name), users!students_created_by_fkey(name)').eq('id', id).single(),
      supabase.from('issuances')
        .select('*, books(title, category, medium), users!issuances_issued_by_fkey(name)')
        .eq('student_id', id)
        .eq('is_reversed', false)
        .order('issued_at', { ascending: false })
    ])
    setStudent(s); setIssuances(i || []); setLoading(false)
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
          <div>
            <h1 className="text-white text-xl font-bold">{student.name}</h1>
            <p className="text-[#f0a500] text-sm font-mono mt-1">{student.student_id}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full">
              {issuances.length} books issued
            </span>
            <button onClick={() => navigate(`/issuer/issue?student=${id}`)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white transition-all">
              <Send size={13} /> Issue Material
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {[
            { label: 'Phone', value: student.phone },
            { label: 'Batch', value: student.batches?.name },
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
            <p className="text-[#6b7280] text-xs">{student.created_at ? format(new Date(student.created_at), 'dd MMM yy') : ''}</p>
          </div>
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
              <BookOpen size={15} className="text-[#bd0a0a] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{i.books?.title}</p>
                <p className="text-[#6b7280] text-xs mt-0.5">
                  {i.books?.category} · {i.books?.medium} · by {i.users?.name} · {format(new Date(i.issued_at), 'dd MMM yy, hh:mm a')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}