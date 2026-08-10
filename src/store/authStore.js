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
      isViewAdmin: false,
      allotmentAccess: null,
      stockAccess: null,
      priceAccess: null,
      websiteOrdersAccess: null,
      failedOrdersAccess: null,
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
        const isViewAdmin = safeProfile.role === 'view_admin'
        const fullAccess = isAdmin || isAccountant
        set({
          user: safeProfile,
          profile: safeProfile,
          isAdmin,
          isAccountant,
          isViewAdmin,
          // view_admin sees everything admin sees, but only ever at 'view' level
          allotmentAccess: fullAccess ? 'edit' : (isViewAdmin ? 'view' : (safeProfile.can_allot || null)),
          stockAccess: fullAccess ? 'edit' : (isViewAdmin ? 'view' : (safeProfile.can_stock || null)),
          priceAccess: fullAccess ? 'edit' : (isViewAdmin ? 'view' : (safeProfile.can_price || null)),
          websiteOrdersAccess: fullAccess || isViewAdmin || !!safeProfile.can_view_website_orders,
          failedOrdersAccess: fullAccess || isViewAdmin || !!safeProfile.can_view_failed_orders,
          loginAt: Date.now()
        })
        return safeProfile
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null, isAdmin: false, isAccountant: false, isViewAdmin: false, allotmentAccess: null, stockAccess: null, priceAccess: null, loginAt: null })
      }
    }),
    {
      name: 'csmdis-auth',
      partialize: (state) => ({ user: state.user, profile: state.profile, isAdmin: state.isAdmin, isAccountant: state.isAccountant, isViewAdmin: state.isViewAdmin, allotmentAccess: state.allotmentAccess, stockAccess: state.stockAccess, priceAccess: state.priceAccess, websiteOrdersAccess: state.websiteOrdersAccess, failedOrdersAccess: state.failedOrdersAccess, loginAt: state.loginAt })
    }
  )
)