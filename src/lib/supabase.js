import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function generateStudentId(count = 1) {
  const year = new Date().getFullYear()
  const prefix = `CS${year}`
  const { data } = await supabase
    .from('students')
    .select('student_id')
    .like('student_id', `${prefix}%`)
    .order('student_id', { ascending: false })
    .limit(1)
  const lastNum = data?.[0]?.student_id
    ? parseInt(data[0].student_id.replace(prefix, '')) || 0
    : 0
  if (count === 1) return `${prefix}${String(lastNum + 1).padStart(4, '0')}`
  return Array.from({ length: count }, (_, i) => `${prefix}${String(lastNum + 1 + i).padStart(4, '0')}`)
}

export async function uploadStudentPhoto(file, studentId) {
  const ext = file.name.split('.').pop().toLowerCase().replace('heic', 'jpg') || 'jpg'
  const path = `${studentId}.${ext}`
  const { error } = await supabase.storage
    .from('student-photos')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('student-photos').getPublicUrl(path)
  return publicUrl
}

export async function adjustStock(bookId, delta) {
  const { data } = await supabase
    .from('stock')
    .select('id, available_qty')
    .eq('book_id', bookId)
    .maybeSingle()
  if (!data) return
  await supabase.from('stock').update({ available_qty: Math.max(0, data.available_qty + delta) }).eq('id', data.id)
}