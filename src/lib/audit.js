import { supabase } from './supabase'
import { useAuthStore } from '../store/authStore'

// Fire-and-forget — never blocks the calling action
export function logAction(action, details = '') {
  const profile = useAuthStore.getState().profile
  supabase.from('audit_logs').insert({
    action,
    entity_type: details,
    user_id: profile?.id || null,
    timestamp: new Date().toISOString()
  }).then(({ error }) => {
    if (error) console.warn('Audit log failed:', error.message)
  })
}
