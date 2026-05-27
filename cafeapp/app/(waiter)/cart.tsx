import React, { useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import {
  Minus, Plus, Trash2, ShoppingBag, ArrowLeft,
  Receipt, UtensilsCrossed, Package,
} from 'lucide-react-native'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { useCartStore } from '@/stores/usecartstore'
import type { CartItem } from '@/stores/usecartstore'

export default function CartScreen() {
  const insets        = useSafeAreaInsets()
  const items         = useCartStore(s => s.items)
  const totalPrice    = useCartStore(s => s.totalPrice)
  const totalItems    = useCartStore(s => s.totalItems)
  const deliveryFee   = useCartStore(s => s.deliveryFee)
  const grandTotal    = useCartStore(s => s.grandTotal)
  const orderType     = useCartStore(s => s.orderType)
  const setOrderType  = useCartStore(s => s.setOrderType)
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const removeItem    = useCartStore(s => s.removeItem)
  const clearCart     = useCartStore(s => s.clearCart)

  const subtotal = totalPrice()
  const servicio = Math.round(subtotal * 0.1)
  const domicilio = deliveryFee()
  const total    = grandTotal()

  const handleCheckout = () => {
    if (items.length === 0) return
    router.push('/(waiter)/checkout' as any)
  }

  const handleRemoveItem = (key: string, name: string) => {
    Alert.alert('Eliminar producto', `¿Deseas eliminar ${name} del carrito?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => removeItem(key) },
    ])
  }

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemImageContainer}>
        <Image source={item.product.image_url ?? undefined} contentFit="cover" style={styles.itemImage} />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
        {Object.keys(item.selectedOptions).length > 0 && (
          <View style={styles.optionsContainer}>
            {Object.entries(item.selectedOptions).map(([key, value]) => (
              <Text key={key} style={styles.optionText}>{key}: {value}</Text>
            ))}
          </View>
        )}
        {item.notes ? <Text style={styles.notesText} numberOfLines={1}>📝 {item.notes}</Text> : null}
        <Text style={styles.itemPrice}>{formatCOP(item.product.price * item.quantity)}</Text>
      </View>
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
          <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(item.key, item.quantity + 1)} activeOpacity={0.7}>
            <Plus size={14} color={Colors.espresso} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleRemoveItem(item.key, item.product.name)} activeOpacity={0.7}>
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
      <Text style={styles.emptySubtitle}>Agrega productos del menú para comenzar tu pedido</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={() => router.replace('/(tabs)' as any)} activeOpacity={0.8}>
        <Text style={styles.emptyButtonText}>Ir al menú</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.espresso} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Carrito</Text>
        <TouchableOpacity onPress={() => clearCart()} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Vaciar</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? renderEmpty() : (
        <>
          <FlatList
            data={items}
            keyExtractor={item => item.key}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.footer}>
            {/* ✅ Selector tipo de pedido */}
            <View style={styles.orderTypeRow}>
              <TouchableOpacity
                style={[styles.orderTypeBtn, orderType === 'dine_in' && styles.orderTypeBtnActive]}
                onPress={() => setOrderType('dine_in')}
                activeOpacity={0.8}
              >
                <UtensilsCrossed size={16} color={orderType === 'dine_in' ? Colors.white : Colors.mocha} />
                <Text style={[styles.orderTypeBtnText, orderType === 'dine_in' && styles.orderTypeBtnTextActive]}>
                  En restaurante
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.orderTypeBtn, orderType === 'takeaway' && styles.orderTypeBtnActive]}
                onPress={() => setOrderType('takeaway')}
                activeOpacity={0.8}
              >
                <Package size={16} color={orderType === 'takeaway' ? Colors.white : Colors.mocha} />
                <Text style={[styles.orderTypeBtnText, orderType === 'takeaway' && styles.orderTypeBtnTextActive]}>
                  Para llevar
                </Text>
              </TouchableOpacity>
            </View>

            {/* Resumen de precios */}
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal ({totalItems()} items)</Text>
                <Text style={styles.summaryValue}>{formatCOP(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Servicio (10%)</Text>
                <Text style={styles.summaryValue}>{formatCOP(servicio)}</Text>
              </View>
              {orderType === 'takeaway' && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: Colors.terra }]}>🛵 Domicilio</Text>
                  <Text style={[styles.summaryValue, { color: Colors.terra }]}>{formatCOP(domicilio)}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total a pagar</Text>
                <Text style={styles.totalValue}>{formatCOP(total)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckout}
              disabled={items.length === 0}
              activeOpacity={0.88}
            >
              <Receipt size={20} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.checkoutButtonText}>Continuar al pago</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: Colors.cream },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.cream },
  backButton:    { padding: 4 },
  headerTitle:   { fontFamily: Font.serif, fontSize: 20, fontWeight: '700', color: Colors.espresso },
  clearButton:   { padding: 8 },
  clearButtonText: { fontFamily: Font.sans, fontSize: 13, color: Colors.terra, fontWeight: '600' },
  listContent:   { padding: 20, gap: 16, paddingBottom: 320 },
  itemCard:      { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 12, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: Colors.creamDeep, ...Shadow.sm },
  itemImageContainer: { width: 80, height: 80, borderRadius: Radius.md, overflow: 'hidden' },
  itemImage:     { width: '100%', height: '100%' },
  itemInfo:      { flex: 1, gap: 4 },
  itemName:      { fontFamily: Font.serif, fontSize: 15, fontWeight: '700', color: Colors.espresso },
  optionsContainer: { gap: 2 },
  optionText:    { fontFamily: Font.sans, fontSize: 11, color: Colors.mocha },
  notesText:     { fontFamily: Font.sans, fontSize: 11, color: Colors.latte, fontStyle: 'italic' },
  itemPrice:     { fontFamily: Font.sans, fontSize: 14, fontWeight: '700', color: Colors.terra, marginTop: 4 },
  itemControls:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.creamDark, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.creamDeep, overflow: 'hidden' },
  quantityButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white },
  quantityButtonDisabled: { opacity: 0.4 },
  quantityText:  { fontFamily: Font.sans, fontSize: 14, fontWeight: '600', color: Colors.espresso, paddingHorizontal: 12 },
  deleteButton:  { width: 32, height: 32, borderRadius: Radius.full, backgroundColor: Colors.terraDust, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  emptyIcon:     { width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.creamDark, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle:    { fontFamily: Font.serif, fontSize: 20, fontWeight: '700', color: Colors.espresso },
  emptySubtitle: { fontFamily: Font.sans, fontSize: 14, color: Colors.mocha, textAlign: 'center', lineHeight: 20 },
  emptyButton:   { backgroundColor: Colors.espresso, paddingHorizontal: 32, paddingVertical: 14, borderRadius: Radius.full, marginTop: 8 },
  emptyButtonText: { fontFamily: Font.sans, fontSize: 15, fontWeight: '700', color: Colors.white },
  footer:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.card, padding: 20, gap: 14, borderTopWidth: 1, borderTopColor: Colors.creamDeep, ...Shadow.card },
  orderTypeRow:  { flexDirection: 'row', gap: 10 },
  orderTypeBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderRadius: Radius.lg, backgroundColor: Colors.creamDark, borderWidth: 1, borderColor: Colors.creamDeep },
  orderTypeBtnActive: { backgroundColor: Colors.espresso, borderColor: Colors.espresso },
  orderTypeBtnText:   { fontFamily: Font.sans, fontSize: 13, fontWeight: '600', color: Colors.mocha },
  orderTypeBtnTextActive: { color: Colors.white },
  summary:       { gap: 6 },
  summaryRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel:  { fontFamily: Font.sans, fontSize: 13, color: Colors.mocha },
  summaryValue:  { fontFamily: Font.sans, fontSize: 13, color: Colors.espresso, fontWeight: '600' },
  totalRow:      { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.creamDeep },
  totalLabel:    { fontFamily: Font.sans, fontSize: 15, fontWeight: '700', color: Colors.espresso },
  totalValue:    { fontFamily: Font.serif, fontSize: 22, fontWeight: '700', color: Colors.terra },
  checkoutButton: { backgroundColor: Colors.espresso, borderRadius: Radius.xl, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', ...Shadow.sm },
  checkoutButtonText: { fontFamily: Font.sans, fontSize: 16, fontWeight: '700', color: Colors.white },
})