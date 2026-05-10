import React, { useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Pressable, useWindowDimensions,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { useCartStore } from '@/stores/usecartstore'
import type { Product } from '@/lib/supabase'

type Props = { product: Product; index?: number }

const BLURHASH = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4'

function useImageSize() {
  const { width } = useWindowDimensions()
  return Math.min(Math.max(Math.floor(width * 0.28), 90), 130)
}

export function ProductCard({ product, index = 0 }: Props) {
  const addItem      = useCartStore((s) => s.addItem)
  const imageSize    = useImageSize()
  const scaleAnim    = useRef(new Animated.Value(1)).current
  const addScaleAnim = useRef(new Animated.Value(1)).current

  const onPressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 100, friction: 8 }).start()
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, tension: 100, friction: 8 }).start()

  const onAddPress = () => {
    Animated.sequence([
      Animated.spring(addScaleAnim, { toValue: 0.82, useNativeDriver: true, tension: 200, friction: 5 }),
      Animated.spring(addScaleAnim, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 5 }),
    ]).start()
    addItem(product)
  }

  return (
    <Animated.View style={[s.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={onPressIn} onPressOut={onPressOut}
        onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } } as any)}
        style={s.card}
      >
        {/* Imagen responsive */}
        <View style={[s.imageContainer, { width: imageSize, height: imageSize }]}>
          <Image source={product.image_url ?? undefined} placeholder={BLURHASH} contentFit="cover" transition={300} style={StyleSheet.absoluteFill} />
          {product.is_featured && (
            <View style={s.featuredBadge}><Text style={s.featuredText}>DESTACADO</Text></View>
          )}
          {!product.is_available && (
            <View style={s.unavailableOverlay}><Text style={s.unavailableText}>No disponible</Text></View>
          )}
        </View>

        {/* Info — flex:1 + minWidth:0 para que el texto no desborde */}
        <View style={s.info}>
          <View style={s.infoTop}>
            <Text style={s.name} numberOfLines={1} ellipsizeMode="tail">{product.name}</Text>
            <Text style={s.description} numberOfLines={2} ellipsizeMode="tail">{product.description}</Text>
          </View>
          <View style={s.footer}>
            <View style={s.priceBlock}>
              <Text style={s.price} numberOfLines={1}>{formatCOP(product.price)}</Text>
              {product.prep_time_min != null && <Text style={s.prepTime}>~{product.prep_time_min} min</Text>}
            </View>
            <Animated.View style={{ transform: [{ scale: addScaleAnim }] }}>
              <TouchableOpacity
                style={[s.addButton, !product.is_available && s.addButtonDisabled]}
                onPress={onAddPress} disabled={!product.is_available}
                activeOpacity={0.85} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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

const s = StyleSheet.create({
  cardWrapper:       { marginHorizontal: 20, marginBottom: 12, borderRadius: Radius.lg, ...Shadow.card },
  card:              { backgroundColor: Colors.card, borderRadius: Radius.lg, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: Colors.creamDeep, minHeight: 100 },
  imageContainer:    { position: 'relative', flexShrink: 0 },
  featuredBadge:     { position: 'absolute', top: 8, left: 8, backgroundColor: Colors.terra, paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full },
  featuredText:      { fontFamily: Font.sans, fontSize: 8, fontWeight: '700', color: Colors.white, letterSpacing: 0.6 },
  unavailableOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(245,240,232,0.82)', alignItems: 'center', justifyContent: 'center' },
  unavailableText:   { fontFamily: Font.sans, fontSize: 11, fontWeight: '600', color: Colors.mocha },
  info:              { flex: 1, minWidth: 0, padding: 12, justifyContent: 'space-between' },
  infoTop:           { gap: 3, flex: 1 },
  name:              { fontFamily: Font.serif, fontSize: 15, fontWeight: '700', color: Colors.espresso, letterSpacing: 0.1, flexShrink: 1 },
  description:       { fontFamily: Font.sans, fontSize: 12, color: Colors.mocha, lineHeight: 17, flexShrink: 1 },
  footer:            { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  priceBlock:        { flex: 1, minWidth: 0 },
  price:             { fontFamily: Font.sans, fontSize: 15, fontWeight: '700', color: Colors.roast, letterSpacing: -0.3 },
  prepTime:          { fontFamily: Font.sans, fontSize: 10, color: Colors.latte, marginTop: 1 },
  addButton:         { width: 34, height: 34, borderRadius: Radius.full, backgroundColor: Colors.espresso, alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...Shadow.sm },
  addButtonDisabled: { backgroundColor: Colors.creamDeep },
})