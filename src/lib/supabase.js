import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  }
})

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

// Single source of truth for every stock-count change across the app
// (student issuance, sales, distributor allotments, returns/reversals).
// Always applies the full delta — a deduction larger than what's on hand
// is allowed to push available_qty negative rather than silently
// capping, so a shortfall is visible as "-N" instead of hidden. The next
// stock-in just adds on top, which pays down the deficit automatically.
//
// Routed through the adjust_stock() Postgres function (see
// add_atomic_stock_functions.sql) so the read-modify-write happens inside
// one locked transaction — two near-simultaneous changes to the same book
// (e.g. an issuance and a sale landing at the same moment) can't silently
// overwrite each other the way a plain client-side read-then-write could.
export async function adjustStock(bookId, delta) {
  const { error } = await supabase.rpc('adjust_stock', { p_book_id: bookId, p_delta: delta })
  if (error) console.warn('adjustStock failed:', error.message)
}