import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Receipt } from 'lucide-react-native'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { useCartStore } from '@/stores/usecartstore'
import type { CartItem } from '@/stores/usecartstore'
import { useLoyaltyStore } from '@/stores/useLoyaltyStore'
// Inline replacement for missing module '@/components/cart-discount'
type CartTotals = { subtotal: number; discountAmount: number; total: number; discountPct: number }
function useCartTotals(items: Array<{ product: { price: number }; quantity: number }>): CartTotals {
  const subtotal = items.reduce((s, it) => s + (it.product.price ?? 0) * (it.quantity ?? 0), 0)
  const discountPct = 0
  const discountAmount = Math.round(subtotal * discountPct)
  const total = subtotal - discountAmount
  return { subtotal, discountAmount, total, discountPct }
}

function CartDiscountSummary({ subtotal, discountAmount, total, discountPct, tierName }: {
  subtotal: number; discountAmount: number; total: number; discountPct: number; tierName: string
}) {
  return (
    <View>
      <Text style={{ fontFamily: Font.sans, color: Colors.mocha }}>Subtotal: {formatCOP(subtotal)}</Text>
      {discountAmount > 0 && (
        <Text style={{ fontFamily: Font.sans, color: Colors.terra }}>Descuento {discountPct}%: -{formatCOP(discountAmount)}</Text>
      )}
      <Text style={{ fontFamily: Font.sans, fontWeight: '700', color: Colors.espresso }}>Total: {formatCOP(total)} {tierName ? `(${tierName})` : ''}</Text>
    </View>
  )
}

export default function CartScreen() {
  const insets = useSafeAreaInsets()
  const items = useCartStore((s) => s.items)
  const totalItems = useCartStore((s) => s.totalItems())
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clearCart = useCartStore((s) => s.clearCart)

  const loyalty = useLoyaltyStore((s) => s.loyalty)
  const { subtotal, discountAmount, total, discountPct } = useCartTotals(items)
  const tierName = loyalty?.tier.name ?? ''

  const [loading, setLoading] = useState(false)

  const handleCheckout = () => {
    if (items.length === 0) return
    router.push('/(waiter)/checkout' as any)
  }

  const handleRemoveItem = (key: string, productName: string) => {
    Alert.alert(
      'Eliminar producto',
      `¿Deseas eliminar ${productName} del carrito?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => removeItem(key) },
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

        {item.notes ? (
          <Text style={styles.notesText} numberOfLines={1}>
            📝 {item.notes}
          </Text>
        ) : null}

        <Text style={styles.itemPrice}>{formatCOP(item.product.price * item.quantity)}</Text>
      </View>

      {/* Controles */}
      <View style={styles.itemControls}>
        <View style={styles.quantityControl}>
          <TouchableOpacity
            style={[styles.quantityButton, item.quantity <= 1 && styles.quantityButtonDisabled]}
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
        onPress={() => router.replace('/(tabs)' as any)}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyButtonText}>Ir al menú</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.espresso} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Carrito</Text>
        <TouchableOpacity onPress={() => clearCart()} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Vaciar</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        renderEmpty()
      ) : (
        <>
          {/* Lista de items */}
          <FlatList
            data={items}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Footer con resumen y checkout */}
          <View style={styles.footer}>
            {/* Resumen con descuento de lealtad */}
            <CartDiscountSummary
              subtotal={subtotal}
              discountAmount={discountAmount}
              total={total}
              discountPct={discountPct}
              tierName={tierName}
            />

            {/* Items count */}
            <Text style={styles.itemsCount}>{totalItems} producto{totalItems !== 1 ? 's' : ''} en tu carrito</Text>

            <TouchableOpacity
              style={[styles.checkoutButton, loading && styles.checkoutButtonDisabled]}
              onPress={handleCheckout}
              disabled={loading || items.length === 0}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Receipt size={20} color={Colors.white} style={{ marginRight: 8 }} />
                  <Text style={styles.checkoutButtonText}>Pagar {formatCOP(total)}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.cream,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: Font.serif,
    fontSize: 20,
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
    paddingBottom: 320,
  },
  itemCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.creamDeep,
    ...Shadow.sm,
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
  notesText: {
    fontFamily: Font.sans,
    fontSize: 11,
    color: Colors.latte,
    fontStyle: 'italic',
  },
  itemPrice: {
    fontFamily: Font.sans,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.terra,
    marginTop: 4,
  },
  itemControls: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.creamDark,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.creamDeep,
    overflow: 'hidden',
  },
  quantityButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  quantityButtonDisabled: {
    opacity: 0.4,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.creamDeep,
    ...Shadow.card,
  },
  itemsCount: {
    fontFamily: Font.sans,
    fontSize: 12,
    color: Colors.latte,
    textAlign: 'center',
  },
  checkoutButton: {
    backgroundColor: Colors.espresso,
    borderRadius: Radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
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