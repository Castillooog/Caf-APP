import { useEffect, useRef } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useauthstore'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function RootLayout() {
  const { session, profile, loading, setSession, fetchProfile } = useAuthStore()
  const router    = useRouter()
  const segments  = useSegments()
  const isMounted = useRef(false)

  usePushNotifications()

  useEffect(() => {
    isMounted.current = true
  }, [])

  useEffect(() => {
    // Carga inicial — sesión guardada en SecureStore/AsyncStorage
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        useAuthStore.setState({ loading: false })
      }
    })

    // Escuchar cambios futuros (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // ✅ FIX: En SIGNED_OUT, limpiar el store y redirigir inmediatamente
        if (event === 'SIGNED_OUT') {
          useAuthStore.setState({ session: null, profile: null, loading: false })
          // Redirigir aquí directamente, sin esperar al useEffect de abajo
          if (isMounted.current) {
            router.replace('/(auth)/login')
          }
          return
        }

        setSession(session)

        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          useAuthStore.setState({ loading: false })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Redirigir según estado de sesión (para carga inicial y cambios de rol)
  useEffect(() => {
    if (!isMounted.current) return
    if (loading) return

    const inAuth = segments[0] === '(auth)'

    if (!session && !inAuth) {
      router.replace('/(auth)/login')
      return
    }

    if (session && inAuth) {
      redirectByRole(profile?.role)
    }
  }, [session, profile, loading, segments])

  function redirectByRole(role?: string) {
    switch (role) {
      case 'kitchen': return router.replace('/(tabs)/orders' as any)
      case 'cashier': return router.replace('/(tabs)/cashier' as any)
      default:        return router.replace('/(tabs)' as any)
    }
  }

  return <Slot />
}