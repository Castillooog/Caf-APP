import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/supabase'

type AuthState = {
  session: any
  profile: Profile | null
  loading: boolean
  setSession: (session: any) => void
  fetchProfile: (userId: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  loading: true,

  setSession: (session) => set({ session, loading: false }),

  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      set({ profile: data })
    } catch (error) {
      console.error('Error fetching profile:', error)
      set({ profile: null })
    }
  },

  // ✅ FUNCIÓN CORRECTA DE CERRAR SESIÓN
  signOut: async () => {
    try {
      // 1. Cerrar sesión en Supabase (esto elimina la sesión persistente)
      await supabase.auth.signOut()
      
      // 2. Limpiar el estado global
      set({ session: null, profile: null, loading: false })
      
      console.log('Sesión cerrada correctamente')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  },
}))