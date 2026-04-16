import { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { useAuthStore } from '@/stores/useauthstore'

export default function AuthLayout() {
  const { session, loading } = useAuthStore()

  useEffect(() => {
    if (loading) return
    // Si ya hay sesión activa, redirigir al menú principal
    if (session) router.replace('/(tabs)')
  }, [session, loading])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  )
}