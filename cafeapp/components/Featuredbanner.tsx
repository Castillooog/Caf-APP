import React from 'react'
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { useCartStore } from '@/stores/usecartstore'
import type { Product } from '@/lib/supabase'

type Props = {
  products: Product[]
}

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W * 0.68
const BLURHASH = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4'

export function FeaturedBanner({ products }: Props) {
  const addItem = useCartStore((s) => s.addItem)
  if (products.length === 0) return null

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Destacados</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{products.length} items</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        decelerationRate="fast"
        snapToInterval={CARD_W + 12}
        snapToAlignment="start"
      >
        {products.map((product) => (
          <TouchableOpacity
            key={product.id}
            style={[styles.card, { width: CARD_W }]}
            activeOpacity={0.88}
            onPress={() =>
              router.push({
                pathname: '/product/[id]',
                params: { id: product.id },
              } as any)
            }
          >
            <Image
              source={product.image_url ?? undefined}
              placeholder={BLURHASH}
              contentFit="cover"
              transition={400}
              style={styles.image}
            />

            <View style={styles.overlay} />

            <View style={styles.content}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>✦ Especial</Text>
              </View>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={styles.productPrice}>{formatCOP(product.price)}</Text>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => addItem(product)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.addBtnText}>Agregar +</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
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
    paddingRight: 8,
    gap: 12,
  },
  card: {
    height: 200,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.card,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28,18,8,0.52)',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
    gap: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(196,80,26,0.88)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: 4,
  },
  badgeText: {
    fontFamily: Font.sans,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  productName: {
    fontFamily: Font.serif,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.1,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  productPrice: {
    fontFamily: Font.sans,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.cream,
    letterSpacing: -0.3,
  },
  addBtn: {
    backgroundColor: Colors.cream,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  addBtnText: {
    fontFamily: Font.sans,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.espresso,
  },
})