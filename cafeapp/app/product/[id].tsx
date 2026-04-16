import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { ArrowLeft, Plus, Minus } from 'lucide-react-native'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/stores/usecartstore'
import type { Product } from '@/lib/supabase'

export default function ProductDetailScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  
  const addItem = useCartStore((s) => s.addItem)

  useEffect(() => {
    loadProduct()
  }, [id])

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setProduct(data)
    } catch (error) {
      console.error('Error loading product:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (product) {
      for (let i = 0; i < quantity; i++) {
        addItem(product)
      }
      router.back()
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.terra} />
      </View>
    )
  }

  if (!product) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Producto no encontrado</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver al menú</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonIcon}>
          <ArrowLeft size={24} color={Colors.espresso} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Imagen */}
        <View style={styles.imageContainer}>
          <Image
            source={product.image_url ?? undefined}
            contentFit="cover"
            style={styles.image}
          />
        </View>

        {/* Contenido */}
        <View style={styles.content}>
          {product.is_featured && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Destacado</Text>
            </View>
          )}

          <Text style={styles.name}>{product.name}</Text>
          
          <Text style={styles.description}>{product.description}</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Tiempo de preparación</Text>
              <Text style={styles.infoValue}>~{product.prep_time_min} min</Text>
            </View>

            <View style={[styles.infoItem, styles.available]}>
              <Text style={styles.infoLabel}>Disponibilidad</Text>
              <Text style={[styles.infoValue, styles.availableText]}>
                {product.is_available ? 'Disponible' : 'No disponible'}
              </Text>
            </View>
          </View>

          {/* Precio */}
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Precio</Text>
            <Text style={styles.price}>{formatCOP(product.price)}</Text>
          </View>

          {/* Selector de cantidad */}
          <View style={styles.quantitySection}>
            <Text style={styles.quantityLabel}>Cantidad</Text>
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                activeOpacity={0.7}
              >
                <Minus size={16} color={quantity <= 1 ? Colors.latte : Colors.espresso} />
              </TouchableOpacity>

              <Text style={styles.quantityText}>{quantity}</Text>

              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(quantity + 1)}
                activeOpacity={0.7}
              >
                <Plus size={16} color={Colors.espresso} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Botón agregar */}
          <TouchableOpacity
            style={[
              styles.addButton,
              !product.is_available && styles.addButtonDisabled,
            ]}
            onPress={handleAddToCart}
            disabled={!product.is_available}
            activeOpacity={0.88}
          >
            <Text style={styles.addButtonText}>
              Agregar al carrito • {formatCOP(product.price * quantity)}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  imageContainer: {
    width: '100%',
    height: 350,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.terra,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontFamily: Font.sans,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    fontFamily: Font.serif,
    fontSize: 26,
    fontWeight: '700',
    color: Colors.espresso,
    lineHeight: 32,
  },
  description: {
    fontFamily: Font.sans,
    fontSize: 15,
    color: Colors.mocha,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  available: {
    borderColor: Colors.sage,
  },
  availableText: {
    color: Colors.sage,
  },
  infoLabel: {
    fontFamily: Font.sans,
    fontSize: 11,
    color: Colors.latte,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.espresso,
    fontWeight: '600',
  },
  priceSection: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  priceLabel: {
    fontFamily: Font.sans,
    fontSize: 12,
    color: Colors.mocha,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  price: {
    fontFamily: Font.serif,
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
  },
  quantitySection: {
    gap: 8,
  },
  quantityLabel: {
    fontFamily: Font.sans,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.espresso,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quantityText: {
    fontFamily: Font.sans,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.espresso,
    minWidth: 40,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: Colors.espresso,
    borderRadius: Radius.xl,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    ...Shadow.card,
  },
  addButtonDisabled: {
    backgroundColor: Colors.creamDeep,
  },
  addButtonText: {
    fontFamily: Font.sans,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  errorText: {
    fontFamily: Font.serif,
    fontSize: 20,
    color: Colors.espresso,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: Colors.espresso,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: Radius.full,
  },
  backButtonText: {
    fontFamily: Font.sans,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
})