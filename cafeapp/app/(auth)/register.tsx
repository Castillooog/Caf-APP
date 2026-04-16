import React, { useState } from 'react'
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
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { supabase } from '@/lib/supabase'
import { Colors, Font, Radius, Shadow } from '@/constants/theme'

export default function RegisterScreen() {
  const insets = useSafeAreaInsets()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Completa todos los campos')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    })

    if (authError) {
      const msg =
        authError.message.includes('already registered')
          ? 'Este correo ya está registrado'
          : authError.message
      setError(msg)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <View style={[styles.screen, styles.successScreen, { paddingTop: insets.top }]}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successTitle}>¡Cuenta creada!</Text>
        <Text style={styles.successSubtitle}>
          Revisa tu correo para confirmar tu cuenta y luego inicia sesión.
        </Text>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={() => router.replace('/(auth)/login' as any)}
          activeOpacity={0.88}
        >
          <Text style={styles.submitText}>Ir al inicio de sesión</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>

        <View style={styles.brand}>
          <Text style={styles.brandIcon}>☕</Text>
          <Text style={styles.brandName}>Cafetería Luna</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Únete a la comunidad del campus</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Tu nombre"
              placeholderTextColor={Colors.latte}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
            />
          </View>

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

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={Colors.latte}
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator color={Colors.cream} size="small" />
            ) : (
              <Text style={styles.submitText}>Crear cuenta</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.footerLink}>Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  successScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 14,
  },
  successEmoji: { fontSize: 56, marginBottom: 8 },
  successTitle: {
    fontFamily: Font.serif,
    fontSize: 26,
    fontWeight: '700',
    color: Colors.espresso,
  },
  successSubtitle: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.mocha,
    textAlign: 'center',
    lineHeight: 21,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    gap: 24,
  },
  backBtn: { alignSelf: 'flex-start' },
  backText: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.mocha,
    fontWeight: '500',
  },
  brand: { alignItems: 'center', gap: 6 },
  brandIcon: { fontSize: 40 },
  brandName: {
    fontFamily: Font.serif,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.espresso,
  },
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: { fontFamily: Font.sans, fontSize: 14, color: Colors.mocha },
  footerLink: {
    fontFamily: Font.sans,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.terra,
  },
})