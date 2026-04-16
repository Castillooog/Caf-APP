import { useEffect } from 'react'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useauthstore'

export default function RootLayout() {
  const { setSession, fetchProfile, loading } = useAuthStore()

  useEffect(() => {
    // Sesión activa al abrir la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
    })

    // Escucha cambios: login, logout, token refresh
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (session?.user) {
          fetchProfile(session.user.id)
          // No navegamos aquí automáticamente para evitar el error
        }
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [fetchProfile, setSession])

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="product/[id]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
      
      {/* Loading overlay opcional */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1C1208" />
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
})