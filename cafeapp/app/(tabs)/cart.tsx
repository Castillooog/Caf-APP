import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react-native'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { useCartStore } from '@/stores/usecartstore'
import type { CartItem } from '@/stores/usecartstore'

export default function CartScreen() {
  const insets = useSafeAreaInsets()
  const items = useCartStore((s) => s.items)
  const totalPrice = useCartStore((s) => s.totalPrice())
  const totalItems = useCartStore((s) => s.totalItems())
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clearCart = useCartStore((s) => s.clearCart)

  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)
    // Aquí iría la lógica para crear la orden en Supabase
    setTimeout(() => {
      Alert.alert(
        'Pedido realizado',
        'Tu pedido ha sido enviado a cocina. ¡Gracias por tu compra!',
        [
          {
            text: 'Aceptar',
            onPress: () => {
              clearCart()
              router.replace('/(tabs)')
            },
          },
        ]
      )
      setLoading(false)
    }, 1500)
  }

  const handleRemoveItem = (key: string, productName: string) => {
    Alert.alert(
      'Eliminar producto',
      `¿Deseas eliminar ${productName} del carrito?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => removeItem(key),
        },
      ]
    )
  }

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.itemCard}>
      {/* Imagen */}
      <View style={styles.itemImageContainer}>
        <Image
          source={item.product.image_url ?? undefined}
          contentFit="cover"
          style={styles.itemImage}
        />
      </View>

      {/* Info */}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.product.name}
        </Text>
        
        {Object.keys(item.selectedOptions).length > 0 && (
          <View style={styles.optionsContainer}>
            {Object.entries(item.selectedOptions).map(([key, value]) => (
              <Text key={key} style={styles.optionText}>
                {key}: {value}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.itemPrice}>{formatCOP(item.product.price)}</Text>
      </View>

      {/* Controles */}
      <View style={styles.itemControls}>
        {/* Cantidad */}
        <View style={styles.quantityControl}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.key, item.quantity - 1)}
            disabled={item.quantity <= 1}
            activeOpacity={0.7}
          >
            <Minus size={14} color={item.quantity <= 1 ? Colors.latte : Colors.espresso} />
          </TouchableOpacity>

          <Text style={styles.quantityText}>{item.quantity}</Text>

          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.key, item.quantity + 1)}
            activeOpacity={0.7}
          >
            <Plus size={14} color={Colors.espresso} />
          </TouchableOpacity>
        </View>

        {/* Eliminar */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleRemoveItem(item.key, item.product.name)}
          activeOpacity={0.7}
        >
          <Trash2 size={18} color={Colors.terra} />
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <ShoppingBag size={64} color={Colors.latte} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
      <Text style={styles.emptySubtitle}>
        Agrega productos del menú para comenzar tu pedido
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.replace('/(tabs)')}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyButtonText}>Ir al menú</Text>
      </TouchableOpacity>
    </View>
  )

  if (items.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.espresso} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Carrito</Text>
          <View style={{ width: 24 }} />
        </View>
        {renderEmpty()}
      </View>
    )
  }

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.espresso} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carrito</Text>
        <TouchableOpacity onPress={() => clearCart()} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Vaciar</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de items */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Footer con total y checkout */}
      <View style={styles.footer}>
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCOP(totalPrice)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Servicio (10%)</Text>
            <Text style={styles.summaryValue}>{formatCOP(totalPrice * 0.1)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCOP(totalPrice * 1.1)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.checkoutButton, loading && styles.checkoutButtonDisabled]}
          onPress={handleCheckout}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.checkoutButtonText}>
              Realizar pedido • {formatCOP(totalPrice * 1.1)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: Font.serif,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.espresso,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontFamily: Font.sans,
    fontSize: 13,
    color: Colors.terra,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  itemCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontFamily: Font.serif,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.espresso,
  },
  optionsContainer: {
    gap: 2,
  },
  optionText: {
    fontFamily: Font.sans,
    fontSize: 11,
    color: Colors.mocha,
  },
  itemPrice: {
    fontFamily: Font.sans,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 4,
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.creamDark,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  quantityButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  quantityText: {
    fontFamily: Font.sans,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.espresso,
    paddingHorizontal: 12,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.terraDust,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: Font.serif,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.espresso,
  },
  emptySubtitle: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.mocha,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: Colors.espresso,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: Radius.full,
    marginTop: 8,
  },
  emptyButtonText: {
    fontFamily: Font.sans,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  footer: {
    backgroundColor: Colors.card,
    padding: 20,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadow.sm,
  },
  summary: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.mocha,
  },
  summaryValue: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.espresso,
    fontWeight: '600',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontFamily: Font.sans,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.espresso,
  },
  totalValue: {
    fontFamily: Font.serif,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  checkoutButton: {
    backgroundColor: Colors.espresso,
    borderRadius: Radius.xl,
    paddingVertical: 18,
    alignItems: 'center',
    ...Shadow.sm,
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutButtonText: {
    fontFamily: Font.sans,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
})