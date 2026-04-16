import React, { useEffect, useRef } from 'react'
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { useCartStore } from '@/stores/usecartstore'

export function CartBar() {
  const insets = useSafeAreaInsets()
  const totalItems = useCartStore((s) => s.totalItems())
  const totalPrice = useCartStore((s) => s.totalPrice())
  const slideAnim = useRef(new Animated.Value(120)).current
  const scaleAnim = useRef(new Animated.Value(1)).current
  const badgeAnim = useRef(new Animated.Value(1)).current
  const prevCount = useRef(0)
  const hasItems = totalItems > 0

  useEffect(() => {
    if (hasItems && prevCount.current === 0) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 11,
      }).start()
    } else if (!hasItems) {
      Animated.timing(slideAnim, {
        toValue: 120,
        duration: 250,
        useNativeDriver: true,
      }).start()
    }
    prevCount.current = totalItems
  }, [hasItems, slideAnim, totalItems])

  useEffect(() => {
    if (!hasItems) return
    Animated.sequence([
      Animated.spring(badgeAnim, {
        toValue: 1.5,
        useNativeDriver: true,
        tension: 300,
        friction: 5,
      }),
      Animated.spring(badgeAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 6,
      }),
    ]).start()
  }, [badgeAnim, hasItems, totalItems])

  if (totalItems === 0) return null

  const onPressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 200,
      friction: 7,
    }).start()

  const onPressOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 7,
    }).start()

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          bottom: insets.bottom + 16,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => router.push('/(tabs)/cart')}
        style={styles.bar}
      >
        <Animated.View
          style={[styles.badge, { transform: [{ scale: badgeAnim }] }]}
        >
          <Text style={styles.badgeText}>{totalItems}</Text>
        </Animated.View>

        <Text style={styles.label}>Ver carrito</Text>
        <Text style={styles.total}>{formatCOP(totalPrice)}</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 100,
    ...Shadow.card,
    shadowColor: Colors.espresso,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  bar: {
    backgroundColor: Colors.espresso,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  badge: {
    backgroundColor: Colors.terra,
    borderRadius: Radius.full,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeText: {
    fontFamily: Font.sans,
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
  },
  label: {
    fontFamily: Font.sans,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.cream,
    flex: 1,
    letterSpacing: 0.1,
  },
  total: {
    fontFamily: Font.sans,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.cream,
    letterSpacing: -0.3,
  },
})