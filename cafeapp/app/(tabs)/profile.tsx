import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  User,
  Mail,
  LogOut,
  ShoppingBag,
  Star,
  Settings,
  ChevronRight,
  Coffee,
} from 'lucide-react-native'
import { Colors, Font, Radius, Shadow } from '@/constants/theme'
import { useAuthStore } from '@/stores/useauthstore'
import { useCartStore } from '@/stores/usecartstore'
import { router } from 'expo-router'

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const { profile, session, signOut } = useAuthStore()
  const totalOrders = useCartStore((s) => s.items.length)

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            useCartStore.getState().clearCart?.()
            await signOut()
            router.replace('/(auth)/login')
          },
        },
      ]
    )
  }

  const userEmail = session?.user?.email ?? 'Sin correo'
  const userRole  = profile?.role ?? 'customer'

  const roleLabels: Record<string, string> = {
    customer: 'Cliente',
    staff:    'Personal',
    waiter:   'Mesero',
    kitchen:  'Cocina',
    cashier:  'Cajero',
    admin:    'Administrador',
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {(profile?.full_name?.[0] ?? 'U').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{profile?.full_name ?? 'Usuario'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{roleLabels[userRole] ?? userRole}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><User size={20} color={Colors.mocha} /></View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nombre completo</Text>
              <Text style={styles.infoValue}>{profile?.full_name ?? 'No especificado'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><Mail size={20} color={Colors.mocha} /></View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Correo electrónico</Text>
              <Text style={styles.infoValue}>{userEmail}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actividad</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <ShoppingBag size={24} color={Colors.terra} />
            <Text style={styles.statNumber}>{totalOrders}</Text>
            <Text style={styles.statLabel}>Pedidos</Text>
          </View>
          <View style={styles.statCard}>
            <Star size={24} color={Colors.terra} />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Puntos</Text>
          </View>
          <View style={styles.statCard}>
            <Coffee size={24} color={Colors.terra} />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Favoritos</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración</Text>
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <View style={styles.menuLeft}>
            <Settings size={20} color={Colors.mocha} />
            <Text style={styles.menuText}>Preferencias</Text>
          </View>
          <ChevronRight size={20} color={Colors.latte} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <View style={styles.menuLeft}>
            <ShoppingBag size={20} color={Colors.mocha} />
            <Text style={styles.menuText}>Historial de pedidos</Text>
          </View>
          <ChevronRight size={20} color={Colors.latte} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <LogOut size={20} color={Colors.terra} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Versión 1.0.0</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32, marginTop: 8 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.espresso, alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...Shadow.card },
  avatarText: { fontFamily: Font.serif, fontSize: 40, fontWeight: '700', color: Colors.cream },
  userName: { fontFamily: Font.serif, fontSize: 24, fontWeight: '700', color: Colors.espresso, marginBottom: 8 },
  roleBadge: { backgroundColor: Colors.terraDust, paddingHorizontal: 16, paddingVertical: 6, borderRadius: Radius.full },
  roleText: { fontFamily: Font.sans, fontSize: 12, fontWeight: '600', color: Colors.terra, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { marginBottom: 28 },
  sectionTitle: { fontFamily: Font.sans, fontSize: 14, fontWeight: '700', color: Colors.roast, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.creamDark, alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontFamily: Font.sans, fontSize: 11, color: Colors.mocha, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontFamily: Font.sans, fontSize: 15, color: Colors.espresso, fontWeight: '500' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },
  statsContainer: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  statNumber: { fontFamily: Font.serif, fontSize: 24, fontWeight: '700', color: Colors.espresso },
  statLabel: { fontFamily: Font.sans, fontSize: 12, color: Colors.mocha, fontWeight: '500' },
  menuItem: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { fontFamily: Font.sans, fontSize: 15, color: Colors.espresso, fontWeight: '500' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.terraDust, borderRadius: Radius.xl, paddingVertical: 16, marginTop: 8, borderWidth: 1, borderColor: Colors.terra },
  logoutText: { fontFamily: Font.sans, fontSize: 16, fontWeight: '700', color: Colors.terra },
  version: { textAlign: 'center', fontFamily: Font.sans, fontSize: 12, color: Colors.latte, marginTop: 24 },
})