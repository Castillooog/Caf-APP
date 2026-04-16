import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Colors, Font } from '@/constants/theme'
import { useAuthStore } from '@/stores/useauthstore'
import { useNotifications } from '@/hooks/useSupabase'

export function MenuHeader() {
  const insets = useSafeAreaInsets()
  const { profile, session } = useAuthStore()
  const { unreadCount } = useNotifications(session?.user.id)
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Bienvenido'

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.left}>
        <Text style={styles.greeting}>{greeting},</Text>
        <Text style={styles.name}>{firstName} ✦</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push('/(tabs)/orders')}
          activeOpacity={0.7}
        >
          <Text style={styles.iconEmoji}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.dot}>
              <Text style={styles.dotText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.avatar}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.8}
        >
          <Text style={styles.avatarInitial}>
            {(profile?.full_name?.[0] ?? 'U').toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.cream,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  left: {
    gap: 1,
  },
  greeting: {
    fontFamily: Font.sans,
    fontSize: 13,
    color: Colors.mocha,
    letterSpacing: 0.2,
  },
  name: {
    fontFamily: Font.serif,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.espresso,
    letterSpacing: -0.3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconEmoji: {
    fontSize: 17,
  },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.terra,
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.cream,
  },
  dotText: {
    fontFamily: Font.sans,
    fontSize: 8,
    fontWeight: '800',
    color: Colors.white,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: Font.sans,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.cream,
  },
})