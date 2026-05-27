import React, { useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Pressable, useWindowDimensions,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { Plus, Clock } from 'lucide-react-native'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { useCartStore } from '@/stores/usecartstore'
import type { Product } from '@/lib/supabase'

type Props = { product: Product; index?: number }

const BLURHASH = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4'

export function ProductCard({ product, index = 0 }: Props) {
  const addItem      = useCartStore(s => s.addItem)
  const { width }    = useWindowDimensions()
  // Imagen cuadrada: 26% del ancho, entre 88 y 120px
  const imgSize      = Math.min(Math.max(Math.floor(width * 0.26), 88), 120)

  const cardScale = useRef(new Animated.Value(1)).current
  const addScale  = useRef(new Animated.Value(1)).current

  const onPressIn  = () => Animated.spring(cardScale, { toValue: 0.975, useNativeDriver: true, tension: 120, friction: 8 }).start()
  const onPressOut = () => Animated.spring(cardScale, { toValue: 1,     useNativeDriver: true, tension: 120, friction: 8 }).start()

  const onAdd = () => {
    if (!product.is_available) return
    Animated.sequence([
      Animated.spring(addScale, { toValue: 0.8,  useNativeDriver: true, tension: 220, friction: 5 }),
      Animated.spring(addScale, { toValue: 1,    useNativeDriver: true, tension: 220, friction: 5 }),
    ]).start()
    addItem(product)
  }

  return (
    <Animated.View style={[s.wrapper, { transform: [{ scale: cardScale }] }]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } } as any)}
        style={s.card}
      >
        {/* ── Imagen ── */}
        <View style={[s.imgWrap, { width: imgSize, height: imgSize }]}>
          <Image
            source={product.image_url ?? undefined}
            placeholder={BLURHASH}
            contentFit="cover"
            transition={280}
            style={StyleSheet.absoluteFill}
          />

          {/* Badge destacado */}
          {product.is_featured && (
            <View style={s.featBadge}>
              <Text style={s.featText}>✦</Text>
            </View>
          )}

          {/* Overlay no disponible */}
          {!product.is_available && (
            <View style={s.unavailOverlay}>
              <Text style={s.unavailText}>Agotado</Text>
            </View>
          )}
        </View>

        {/* ── Info ── */}
        <View style={s.info}>
          {/* Nombre */}
          <Text style={s.name} numberOfLines={1} ellipsizeMode="tail">
            {product.name}
          </Text>

          {/* Descripción */}
          <Text style={s.desc} numberOfLines={2} ellipsizeMode="tail">
            {product.description}
          </Text>

          {/* Footer: precio + tiempo + botón */}
          <View style={s.footer}>
            <View style={s.priceBlock}>
              <Text style={s.price}>{formatCOP(product.price)}</Text>
              {product.prep_time_min != null && (
                <View style={s.timeRow}>
                  <Clock size={10} color={Colors.latte} strokeWidth={2} />
                  <Text style={s.time}>~{product.prep_time_min} min</Text>
                </View>
              )}
            </View>

            <Animated.View style={{ transform: [{ scale: addScale }] }}>
              <TouchableOpacity
                style={[s.addBtn, !product.is_available && s.addBtnOff]}
                onPress={onAdd}
                disabled={!product.is_available}
                activeOpacity={0.85}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={2.8} />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: Radius.lg,
    ...Shadow.sm,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.creamDeep,
    minHeight: 96,
  },

  // ── Imagen ──
  imgWrap: {
    position: 'relative',
    flexShrink: 0,
    backgroundColor: Colors.creamDark,
  },
  featBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.terra,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  unavailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245,240,232,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailText: {
    fontFamily: Font.sans,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.mocha,
    letterSpacing: 0.3,
  },

  // ── Info ──
  info: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  name: {
    fontFamily: Font.serif,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.espresso,
    letterSpacing: 0.1,
    marginBottom: 3,
  },
  desc: {
    fontFamily: Font.sans,
    fontSize: 12,
    color: Colors.mocha,
    lineHeight: 17,
    flex: 1,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  priceBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  price: {
    fontFamily: Font.sans,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.roast,
    letterSpacing: -0.3,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  time: {
    fontFamily: Font.sans,
    fontSize: 10,
    color: Colors.latte,
  },

  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addBtnOff: {
    backgroundColor: Colors.creamDeep,
  },
})