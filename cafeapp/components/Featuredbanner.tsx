import React, { useRef } from 'react'
import {
  ScrollView, View, Text, StyleSheet,
  TouchableOpacity, Dimensions, Animated,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { useCartStore } from '@/stores/usecartstore'
import type { Product } from '@/lib/supabase'

type Props = { products: Product[] }

const { width: SCREEN_W } = Dimensions.get('window')
// ✅ Ancho de tarjeta: muestra 1.25 cards para que sea obvio que hay más
const CARD_W   = Math.min(SCREEN_W * 0.72, 300)
const CARD_GAP = 12
const BLURHASH = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4'

function FeaturedCard({ product }: { product: Product }) {
  const addItem      = useCartStore(s => s.addItem)
  const addScaleAnim = useRef(new Animated.Value(1)).current

  const onAdd = () => {
    Animated.sequence([
      Animated.spring(addScaleAnim, { toValue: 0.85, useNativeDriver: true, tension: 200, friction: 5 }),
      Animated.spring(addScaleAnim, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 5 }),
    ]).start()
    addItem(product)
  }

  return (
    <TouchableOpacity
      style={[s.card, { width: CARD_W }]}
      activeOpacity={0.9}
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } } as any)}
    >
      {/* Imagen de fondo */}
      <Image
        source={product.image_url ?? undefined}
        placeholder={BLURHASH}
        contentFit="cover"
        transition={400}
        style={StyleSheet.absoluteFill}
      />

      {/* Gradiente oscuro inferior */}
      <View style={s.gradient} />

      {/* Contenido sobre la imagen */}
      <View style={s.content}>
        {/* Badge superior */}
        <View style={s.badge}>
          <Text style={s.badgeText}>✦ Especial</Text>
        </View>

        {/* Nombre y precio */}
        <View style={s.bottom}>
          <Text style={s.name} numberOfLines={2}>{product.name}</Text>
          <View style={s.footer}>
            <Text style={s.price}>{formatCOP(product.price)}</Text>
            <Animated.View style={{ transform: [{ scale: addScaleAnim }] }}>
              <TouchableOpacity style={s.addBtn} onPress={onAdd} activeOpacity={0.85}>
                <Plus size={16} color={Colors.espresso} strokeWidth={2.5} />
                <Text style={s.addBtnText}>Agregar</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export function FeaturedBanner({ products }: Props) {
  if (products.length === 0) return null

  return (
    <View style={s.section}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Destacados</Text>
        <View style={s.pill}>
          <Text style={s.pillText}>{products.length} items</Text>
        </View>
      </View>

      {/* Carrusel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        decelerationRate="fast"
        snapToInterval={CARD_W + CARD_GAP}
        snapToAlignment="start"
        bounces
      >
        {products.map(p => <FeaturedCard key={p.id} product={p} />)}
        {/* Espaciado final para ver que hay más */}
        <View style={{ width: 8 }} />
      </ScrollView>

      {/* Indicador de dots */}
      {products.length > 1 && (
        <View style={s.dots}>
          {products.map((_, i) => (
            <View key={i} style={[s.dot, i === 0 && s.dotActive]} />
          ))}
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  section: { marginBottom: 4 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  title: {
    fontFamily: Font.serif,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.espresso,
    letterSpacing: -0.2,
  },
  pill: {
    backgroundColor: Colors.terraDust,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: Font.sans,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.terra,
  },

  scroll: {
    paddingLeft: 20,
    paddingRight: 20,
    gap: CARD_GAP,
  },

  // ── Tarjeta ──
  card: {
    height: 210,
    borderRadius: Radius.xl ?? 20,
    overflow: 'hidden',
    ...Shadow.card,
  },

  // Gradiente negro-transparente de abajo hacia arriba
  gradient: {
    ...StyleSheet.absoluteFillObject,
    // Simulamos gradiente con capas
    backgroundColor: 'transparent',
    // Capa superior más transparente, inferior más oscura
    borderRadius: Radius.xl ?? 20,
    // Trick: overlay con gradiente simulado
    background: 'linear-gradient(to top, rgba(10,6,2,0.85) 0%, rgba(10,6,2,0.3) 55%, transparent 100%)',
  } as any,

  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    // Gradiente real usando dos Views superpuestas
    backgroundColor: 'transparent',
  },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(180, 60, 20, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontFamily: Font.sans,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },

  bottom:  { gap: 6 },
  name: {
    fontFamily: Font.serif,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
    lineHeight: 24,
    // Sombra de texto para legibilidad
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  price: {
    fontFamily: Font.sans,
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.cream,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    ...Shadow.sm,
  },
  addBtnText: {
    fontFamily: Font.sans,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.espresso,
  },

  // Dots
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.creamDeep,
  },
  dotActive: {
    width: 16,
    backgroundColor: Colors.espresso,
  },
})