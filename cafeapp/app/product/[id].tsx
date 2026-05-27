import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { ArrowLeft, Plus, Minus, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react-native'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { useCartStore } from '@/stores/usecartstore'
import { useAuthStore } from '@/stores/useauthstore'
import { useProductsStore } from '@/stores/useProductsStore'

// ─── Modal de confirmación ────────────────────────────────────────────────────

function ConfirmModal({
  visible, isAvailable, onConfirm, onCancel, loading,
}: {
  visible: boolean; isAvailable: boolean
  onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  const newState = !isAvailable
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={m.backdrop} onPress={onCancel}>
        <Pressable style={m.box} onPress={e => e.stopPropagation()}>
          <View style={[m.iconWrap, { backgroundColor: newState ? '#ECFDF5' : '#FEF2F2' }]}>
            <AlertTriangle size={24} color={newState ? '#059669' : '#DC2626'} />
          </View>
          <Text style={m.title}>Cambiar disponibilidad</Text>
          <Text style={m.body}>
            ¿Marcar <Text style={{ fontWeight: '700', color: Colors.espresso }}>este producto</Text> como{' '}
            <Text style={{ fontWeight: '700', color: newState ? '#059669' : '#DC2626' }}>
              {newState ? 'disponible' : 'no disponible'}
            </Text>?
          </Text>
          <View style={m.actions}>
            <TouchableOpacity style={m.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={m.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.confirmBtn, { backgroundColor: newState ? '#059669' : '#DC2626' }]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={m.confirmText}>Confirmar</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const m = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box:        { width: '100%', maxWidth: 360, backgroundColor: Colors.card, borderRadius: 20, padding: 24, gap: 14, ...Shadow.card },
  iconWrap:   { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title:      { fontFamily: Font.serif, fontSize: 19, fontWeight: '700', color: Colors.espresso, textAlign: 'center' },
  body:       { fontFamily: Font.sans, fontSize: 14, color: Colors.mocha, textAlign: 'center', lineHeight: 20 },
  actions:    { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.background },
  cancelText: { fontFamily: Font.sans, fontSize: 14, fontWeight: '600', color: Colors.mocha },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: Radius.lg, alignItems: 'center' },
  confirmText:{ fontFamily: Font.sans, fontSize: 14, fontWeight: '700', color: '#fff' },
})

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function ProductDetailScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [showConfirm, setShowConfirm] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [quantity, setQuantity] = useState(1)

  const addItem = useCartStore((s) => s.addItem)
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin'

  const { getProduct, fetchProducts, updateAvailability, products } = useProductsStore()

  // Si el store aún no tiene productos, los cargamos
  useEffect(() => {
    if (products.length === 0) fetchProducts()
  }, [])

  const product = getProduct(id)

  const handleConfirmToggle = async () => {
    if (!product || !isAdmin) return
    setToggling(true)
    await updateAvailability(product.id, !product.is_available)
    setToggling(false)
    setShowConfirm(false)
  }

  const handleAddToCart = () => {
    if (product) {
      for (let i = 0; i < quantity; i++) addItem(product)
      router.back()
    }
  }

  // Loading: store vacío o producto aún no encontrado tras fetch
  if (products.length === 0) {
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

  const isAvailable = product.is_available

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ConfirmModal
        visible={showConfirm}
        isAvailable={isAvailable}
        onConfirm={handleConfirmToggle}
        onCancel={() => setShowConfirm(false)}
        loading={toggling}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonIcon}>
          <ArrowLeft size={24} color={Colors.espresso} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Imagen */}
        <View style={styles.imageContainer}>
          <Image source={product.image_url ?? undefined} contentFit="cover" style={styles.image} />
          {!isAvailable && (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableOverlayText}>No disponible</Text>
            </View>
          )}
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

            {isAdmin ? (
              <TouchableOpacity
                style={[styles.infoItem, styles.availabilityToggle, isAvailable ? styles.availableToggleOn : styles.availableToggleOff]}
                onPress={() => setShowConfirm(true)}
                activeOpacity={0.75}
              >
                <Text style={[styles.infoLabel, { color: isAvailable ? Colors.sage : '#DC2626' }]}>
                  Disponibilidad
                </Text>
                <View style={styles.toggleRow}>
                  {isAvailable
                    ? <ToggleRight size={22} color={Colors.sage} />
                    : <ToggleLeft size={22} color="#DC2626" />}
                  <Text style={[styles.infoValue, { color: isAvailable ? Colors.sage : '#DC2626' }]}>
                    {isAvailable ? 'Disponible' : 'No disponible'}
                  </Text>
                </View>
                <Text style={[styles.toggleHint, { color: isAvailable ? Colors.sage : '#DC2626' }]}>
                  Toca para cambiar
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.infoItem, isAvailable ? styles.available : styles.unavailable]}>
                <Text style={styles.infoLabel}>Disponibilidad</Text>
                <Text style={[styles.infoValue, isAvailable ? styles.availableText : styles.unavailableText]}>
                  {isAvailable ? 'Disponible' : 'No disponible'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Precio</Text>
            <Text style={styles.price}>{formatCOP(product.price)}</Text>
          </View>

          {isAvailable && (
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
          )}

          {isAvailable ? (
            <TouchableOpacity style={styles.addButton} onPress={handleAddToCart} activeOpacity={0.88}>
              <Text style={styles.addButtonText}>
                Agregar al carrito • {formatCOP(product.price * quantity)}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.unavailableButton}>
              <Text style={styles.unavailableButtonText}>Producto no disponible</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  centerContent:  { justifyContent: 'center', alignItems: 'center' },
  header:         { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 20, paddingTop: 12 },
  backButtonIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', ...Shadow.card },
  imageContainer: { width: '100%', height: 350, position: 'relative' },
  image:          { width: '100%', height: '100%' },
  unavailableOverlay:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 10, alignItems: 'center' },
  unavailableOverlayText: { fontFamily: Font.sans, fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 1, textTransform: 'uppercase' },
  content:        { padding: 20, gap: 16 },
  badge:          { alignSelf: 'flex-start', backgroundColor: Colors.terra, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  badgeText:      { fontFamily: Font.sans, fontSize: 11, fontWeight: '700', color: Colors.white, textTransform: 'uppercase', letterSpacing: 0.5 },
  name:           { fontFamily: Font.serif, fontSize: 26, fontWeight: '700', color: Colors.espresso, lineHeight: 32 },
  description:    { fontFamily: Font.sans, fontSize: 15, color: Colors.mocha, lineHeight: 22 },
  infoRow:        { flexDirection: 'row', gap: 12 },
  infoItem:       { flex: 1, backgroundColor: Colors.card, padding: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  available:      { borderColor: Colors.sage },
  availableText:  { color: Colors.sage },
  unavailable:    { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  unavailableText:{ color: '#DC2626' },
  availabilityToggle:  { gap: 6 },
  availableToggleOn:   { borderColor: Colors.sage, backgroundColor: '#F0FDF4' },
  availableToggleOff:  { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  toggleRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleHint:     { fontFamily: Font.sans, fontSize: 9, fontWeight: '500', opacity: 0.6, marginTop: 2 },
  infoLabel:      { fontFamily: Font.sans, fontSize: 11, color: Colors.latte, fontWeight: '600', textTransform: 'uppercase' },
  infoValue:      { fontFamily: Font.sans, fontSize: 14, color: Colors.espresso, fontWeight: '600' },
  priceSection:   { backgroundColor: Colors.card, padding: 16, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  priceLabel:     { fontFamily: Font.sans, fontSize: 12, color: Colors.mocha, fontWeight: '600', textTransform: 'uppercase' },
  price:          { fontFamily: Font.serif, fontSize: 28, fontWeight: '700', color: Colors.terra },
  quantitySection:{ gap: 8 },
  quantityLabel:  { fontFamily: Font.sans, fontSize: 14, fontWeight: '700', color: Colors.espresso },
  quantityControl:{ flexDirection: 'row', alignItems: 'center', gap: 12 },
  quantityButton: { width: 44, height: 44, borderRadius: Radius.full, backgroundColor: Colors.creamDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  quantityText:   { fontFamily: Font.sans, fontSize: 20, fontWeight: '700', color: Colors.espresso, minWidth: 40, textAlign: 'center' },
  addButton:          { backgroundColor: Colors.espresso, borderRadius: Radius.xl, paddingVertical: 18, alignItems: 'center', marginTop: 8, ...Shadow.card },
  addButtonText:      { fontFamily: Font.sans, fontSize: 16, fontWeight: '700', color: Colors.white },
  unavailableButton:  { backgroundColor: Colors.creamDeep, borderRadius: Radius.xl, paddingVertical: 18, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: Colors.border },
  unavailableButtonText: { fontFamily: Font.sans, fontSize: 16, fontWeight: '700', color: Colors.latte },
  errorText:      { fontFamily: Font.serif, fontSize: 20, color: Colors.espresso, marginBottom: 16 },
  backButton:     { backgroundColor: Colors.espresso, paddingHorizontal: 24, paddingVertical: 14, borderRadius: Radius.full },
  backButtonText: { fontFamily: Font.sans, fontSize: 15, fontWeight: '700', color: Colors.white },
})