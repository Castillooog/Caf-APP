import React, { useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { useCartStore } from '@/stores/usecartstore'
import type { Product } from '@/lib/supabase'

type Props = {
  product: Product
  index?: number
}

const BLURHASH = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4'

export function ProductCard({ product, index = 0 }: Props) {
  const addItem = useCartStore((s) => s.addItem)
  const scaleAnim = useRef(new Animated.Value(1)).current
  const addScaleAnim = useRef(new Animated.Value(1)).current

  const onPressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start()

  const onPressOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start()

  const onAddPress = () => {
    Animated.sequence([
      Animated.spring(addScaleAnim, {
        toValue: 0.82,
        useNativeDriver: true,
        tension: 200,
        friction: 5,
      }),
      Animated.spring(addScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 5,
      }),
    ]).start()
    addItem(product)
  }

  const navigateToDetail = () => {
    router.push({
      pathname: '/product/[id]',
      params: { id: product.id },
    } as any)
  }

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={navigateToDetail}
        style={styles.card}
      >
        <View style={styles.imageContainer}>
          <Image
            source={product.image_url ?? undefined}
            placeholder={BLURHASH}
            contentFit="cover"
            transition={300}
            style={styles.image}
          />
          {product.is_featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>Destacado</Text>
            </View>
          )}
          {!product.is_available && (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableText}>No disponible</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.infoTop}>
            <Text style={styles.name} numberOfLines={1}>
              {product.name}
            </Text>
            <Text style={styles.description} numberOfLines={2}>
              {product.description}
            </Text>
          </View>

          <View style={styles.footer}>
            <View>
              <Text style={styles.price}>{formatCOP(product.price)}</Text>
              <Text style={styles.prepTime}>~{product.prep_time_min} min</Text>
            </View>

            <Animated.View style={{ transform: [{ scale: addScaleAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  !product.is_available && styles.addButtonDisabled,
                ]}
                onPress={onAddPress}
                disabled={!product.is_available}
                activeOpacity={0.85}
              >
                <Plus size={20} color={Colors.cream} strokeWidth={2.5} />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: Radius.lg,
    ...Shadow.card,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.creamDeep,
  },
  imageContainer: {
    width: 110,
    height: 110,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.terra,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  featuredText: {
    fontFamily: Font.sans,
    fontSize: 9,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245,240,232,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableText: {
    fontFamily: Font.sans,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.mocha,
  },
  info: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  infoTop: {
    gap: 3,
  },
  name: {
    fontFamily: Font.serif,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.espresso,
    letterSpacing: 0.1,
  },
  description: {
    fontFamily: Font.sans,
    fontSize: 12,
    color: Colors.mocha,
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  price: {
    fontFamily: Font.sans,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.roast,
    letterSpacing: -0.3,
  },
  prepTime: {
    fontFamily: Font.sans,
    fontSize: 10,
    color: Colors.latte,
    marginTop: 1,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  addButtonDisabled: {
    backgroundColor: Colors.creamDeep,
  },
})