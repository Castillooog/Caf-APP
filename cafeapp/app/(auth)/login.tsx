import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { supabase } from '@/lib/supabase'
import { Colors, Font, Radius, Shadow } from '@/constants/theme'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Google Sign-In Configuration
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  })

  // Manejar respuesta de Google
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params
      if (id_token) {
        handleGoogleSignIn(id_token)
      }
    }
  }, [response])

  const handleGoogleSignIn = async (idToken: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      })

      if (authError) {
        throw authError
      }

      // El listener en _layout.tsx detecta la sesión y redirige automáticamente
      router.replace('/(tabs)' as any)
    } catch (err: any) {
      console.error('Google sign in error:', err)
      Alert.alert(
        'Error',
        err.message || 'Error al iniciar sesión con Google. Verifica la configuración.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Completa todos los campos')
      return
    }
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos'
          : authError.message
      )
      setLoading(false)
      return
    }

    router.replace('/(tabs)' as any)
  }

  const handleGooglePress = () => {
    if (!request) {
      Alert.alert('Error', 'La configuración de Google no está disponible')
      return
    }
    promptAsync()
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding */}
        <View style={styles.brand}>
          <Text style={styles.brandIcon}>☕</Text>
          <Text style={styles.brandName}>Cafetería Luna</Text>
          <Text style={styles.brandTagline}>Tu café universitario</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Iniciar sesión</Text>
          <Text style={styles.subtitle}>Ingresa con tu cuenta universitaria</Text>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="usuario@universidad.edu.co"
              placeholderTextColor={Colors.latte}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.latte}
                secureTextEntry={!showPassword}
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color={Colors.cream} size="small" />
            ) : (
              <Text style={styles.submitText}>Entrar</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o continúa con</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[styles.googleBtn, (!request || loading) && styles.googleBtnDisabled]}
            onPress={handleGooglePress}
            disabled={!request || loading}
            activeOpacity={0.88}
          >
            <Image
              source={{ uri: 'https://www.google.com/favicon.ico' }}
              style={styles.googleIcon}
            />
            <Text style={styles.googleBtnText}>Continuar con Google</Text>
          </TouchableOpacity>
        </View>

        {/* Registro */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tienes cuenta? </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/register' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>Regístrate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 28,
  },
  // Brand
  brand: { alignItems: 'center', gap: 6 },
  brandIcon: { fontSize: 48 },
  brandName: {
    fontFamily: Font.serif,
    fontSize: 28,
    fontWeight: '700',
    color: Colors.espresso,
    letterSpacing: -0.3,
  },
  brandTagline: {
    fontFamily: Font.sans,
    fontSize: 13,
    color: Colors.mocha,
  },
  // Card
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.creamDeep,
    ...Shadow.card,
  },
  title: {
    fontFamily: Font.serif,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.espresso,
  },
  subtitle: {
    fontFamily: Font.sans,
    fontSize: 13,
    color: Colors.mocha,
    marginTop: -8,
  },
  // Error
  errorBox: {
    backgroundColor: Colors.terraDust,
    borderRadius: Radius.md,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.terra,
  },
  errorText: {
    fontFamily: Font.sans,
    fontSize: 13,
    color: Colors.terra,
    fontWeight: '500',
  },
  // Fields
  fieldGroup: { gap: 6 },
  label: {
    fontFamily: Font.sans,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.roast,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.creamDark,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: Font.sans,
    fontSize: 15,
    color: Colors.espresso,
    borderWidth: 1,
    borderColor: Colors.creamDeep,
  },
  passwordWrapper: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: { fontSize: 16 },
  // Submit
  submitBtn: {
    backgroundColor: Colors.espresso,
    borderRadius: Radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    ...Shadow.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: {
    fontFamily: Font.sans,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.cream,
    letterSpacing: 0.2,
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.creamDeep,
  },
  dividerText: {
    fontFamily: Font.sans,
    fontSize: 12,
    color: Colors.latte,
    paddingHorizontal: 8,
  },
  // Google Button
  googleBtn: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.creamDeep,
    ...Shadow.sm,
  },
  googleBtnDisabled: { opacity: 0.5 },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleBtnText: {
    fontFamily: Font.sans,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.roast,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.mocha,
  },
  footerLink: {
    fontFamily: Font.sans,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.terra,
  },
})