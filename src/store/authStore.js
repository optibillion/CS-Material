import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      profile: null,
      isAdmin: false,
      isAccountant: false,
      allotmentAccess: null,
      stockAccess: null,
      priceAccess: false,
      loginAt: null,

      login: async (username, password) => {
        // Step 1: Get email from username using service role (bypass RLS)
        // We use a Postgres function to do this securely
        const { data: emailData, error: emailError } = await supabase
          .rpc('get_email_by_username', { p_username: username })

        if (emailError || !emailData) throw new Error('Invalid username or password')

        // Step 2: Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: emailData,
          password
        })

        if (authError) throw new Error('Invalid username or password')

        // Step 3: Fetch full profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', authData.user.id)
          .single()

        if (profileError || !profile) throw new Error('Profile not found')

        const { password_hash, ...safeProfile } = profile

        const isAdmin = safeProfile.role === 'admin'
        const isAccountant = safeProfile.role === 'accountant'
        const fullAccess = isAdmin || isAccountant
        set({
          user: safeProfile,
          profile: safeProfile,
          isAdmin,
          isAccountant,
          allotmentAccess: fullAccess ? 'edit' : (safeProfile.can_allot || null),
          stockAccess: fullAccess ? 'edit' : (safeProfile.can_stock || null),
          priceAccess: fullAccess || !!safeProfile.can_price,
          loginAt: Date.now()
        })
        return safeProfile
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null, isAdmin: false, isAccountant: false, allotmentAccess: null, stockAccess: null, priceAccess: false, loginAt: null })
      }
    }),
    {
      name: 'csmdis-auth',
      partialize: (state) => ({ user: state.user, profile: state.profile, isAdmin: state.isAdmin, isAccountant: state.isAccountant, allotmentAccess: state.allotmentAccess, stockAccess: state.stockAccess, priceAccess: state.priceAccess, loginAt: state.loginAt })
    }
  )
)