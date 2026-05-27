import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Linking, Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import {
  ArrowLeft, CreditCard, Lock, MapPin, ChevronRight,
  Banknote, Smartphone, UtensilsCrossed, Package,
  Navigation, ExternalLink,
} from 'lucide-react-native'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { useCartStore } from '@/stores/usecartstore'
import { useAuthStore } from '@/stores/useauthstore'
import { supabase } from '@/lib/supabase'

type PaymentMethod = 'card' | 'cash' | 'transfer'

const PAYMENT_OPTIONS: { key: PaymentMethod; label: string; sub: string; Icon: any }[] = [
  { key: 'card',     label: 'Tarjeta',      sub: 'Visa, Mastercard, Amex', Icon: CreditCard },
  { key: 'cash',     label: 'Efectivo',     sub: 'Pago en caja',           Icon: Banknote   },
  { key: 'transfer', label: 'Transferencia',sub: 'Nequi, Bancolombia',     Icon: Smartphone },
]

// ─── Abrir Google Maps sin API key ───────────────────────────────────────────
function openInGoogleMaps(address: string, city: string) {
  const query = encodeURIComponent(`${address}, ${city}`)
  const url   = Platform.select({
    ios:     `comgooglemaps://?q=${query}`,
    android: `geo:0,0?q=${query}`,
    default: `https://www.google.com/maps/search/?api=1&query=${query}`,
  })

  Linking.canOpenURL(url!).then(supported => {
    if (supported) {
      Linking.openURL(url!)
    } else {
      // Fallback a maps web
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`)
    }
  })
}

export default function CheckoutScreen() {
  const insets      = useSafeAreaInsets()
  const { session } = useAuthStore()
  const {
    items, tableNumber, totalPrice, totalItems,
    deliveryFee, grandTotal, orderType, deliveryInfo,
    setDeliveryInfo, setOrderType,
  } = useCartStore()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [orderNotes,    setOrderNotes]    = useState('')
  const [processing,    setProcessing]    = useState(false)

  // Campos dirección domicilio
  const [address,    setAddress]    = useState(deliveryInfo?.address    ?? '')
  const [city,       setCity]       = useState(deliveryInfo?.city       ?? 'Santa Marta')
  const [references, setReferences] = useState(deliveryInfo?.references ?? '')

  // Campos tarjeta
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [expiry,     setExpiry]     = useState('')
  const [cvv,        setCvv]        = useState('')

  const subtotal  = totalPrice()
  const servicio  = Math.round(subtotal * 0.1)
  const domicilio = deliveryFee()
  const total     = grandTotal()

  const formatCardNumber = (t: string) => t.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
  const formatExpiry     = (t: string) => { const c = t.replace(/\D/g, '').slice(0, 4); return c.length >= 2 ? c.slice(0,2) + '/' + c.slice(2) : c }

  function validateCard() {
    if (!cardHolder.trim())                          { Alert.alert('Error', 'Ingresa el nombre del titular'); return false }
    if (cardNumber.replace(/\s/g,'').length !== 16)  { Alert.alert('Error', 'Número de tarjeta inválido');   return false }
    if (expiry.length !== 5)                         { Alert.alert('Error', 'Fecha de vencimiento inválida'); return false }
    if (cvv.length !== 3)                            { Alert.alert('Error', 'CVV inválido');                  return false }
    return true
  }

  function validateDelivery() {
    if (!address.trim()) { Alert.alert('Dirección requerida', 'Ingresa la dirección de entrega'); return false }
    if (!city.trim())    { Alert.alert('Ciudad requerida',    'Ingresa la ciudad');               return false }
    // Guardar en el store
    setDeliveryInfo({ address: address.trim(), city: city.trim(), references: references.trim() })
    return true
  }

  async function handleConfirm() {
    if (!session?.user)                            { Alert.alert('Error', 'Debes estar autenticado'); return }
    if (orderType === 'dine_in' && !tableNumber)   { Alert.alert('Falta la mesa', 'Selecciona una mesa antes de continuar'); return }
    if (orderType === 'takeaway' && !validateDelivery()) return
    if (paymentMethod === 'card' && !validateCard()) return
    if (items.length === 0)                        { Alert.alert('Error', 'No hay productos en el carrito'); return }

    setProcessing(true)
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id:        session.user.id,
          total,
          table_number:   orderType === 'dine_in' ? tableNumber : null,
          notes:          [
            orderNotes || null,
            orderType === 'takeaway'
              ? `DOMICILIO: ${address}, ${city}${references ? ` — Ref: ${references}` : ''}`
              : null,
          ].filter(Boolean).join(' | ') || null,
          status:         'pending',
          payment_status: 'unpaid',
          payment_method: null,
        })
        .select()
        .single()

      if (orderError || !order) throw orderError ?? new Error('No se pudo crear el pedido')

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(items.map(i => ({
          order_id:         order.id,
          product_id:       i.product.id,
          quantity:         i.quantity,
          unit_price:       i.product.price,
          selected_options: i.selectedOptions,
          notes:            i.notes || null,
        })))

      if (itemsError) throw itemsError

      await supabase.from('notifications').insert({
        user_id:  session.user.id,
        order_id: order.id,
        title:    orderType === 'takeaway' ? '🛵 Pedido para llevar confirmado' : '✅ Pedido confirmado',
        body:     `Tu orden #${order.id.slice(-6).toUpperCase()} ha sido recibida`,
        is_read:  false,
      })

      router.replace({
        pathname: '/(waiter)/order-success',
        params:   { orderId: order.id, tableNumber: tableNumber ?? 'domicilio' },
      } as any)

    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo crear el pedido')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <View style={[s.screen, { paddingBottom: insets.bottom }]}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={24} color={Colors.espresso} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Confirmar pedido</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Tipo de pedido ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Tipo de pedido</Text>
          <View style={s.typeRow}>
            <TouchableOpacity
              style={[s.typeBtn, orderType === 'dine_in' && s.typeBtnActive]}
              onPress={() => setOrderType('dine_in')}
              activeOpacity={0.8}
            >
              <UtensilsCrossed size={18} color={orderType === 'dine_in' ? Colors.white : Colors.mocha} />
              <Text style={[s.typeBtnText, orderType === 'dine_in' && s.typeBtnTextActive]}>En restaurante</Text>
              <Text style={[s.typeBtnSub, orderType === 'dine_in' && { color: '#FFFFFFAA' }]}>Comer aquí</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.typeBtn, orderType === 'takeaway' && s.typeBtnActive]}
              onPress={() => setOrderType('takeaway')}
              activeOpacity={0.8}
            >
              <Package size={18} color={orderType === 'takeaway' ? Colors.white : Colors.mocha} />
              <Text style={[s.typeBtnText, orderType === 'takeaway' && s.typeBtnTextActive]}>Para llevar</Text>
              <Text style={[s.typeBtnSub, orderType === 'takeaway' && { color: '#FFFFFFAA' }]}>Domicilio · {formatCOP(5000)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Mesa (solo dine_in) ── */}
        {orderType === 'dine_in' && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Mesa</Text>
            <TouchableOpacity
              style={s.tableRow}
              onPress={() => router.push('/(waiter)/table-map' as any)}
              activeOpacity={0.75}
            >
              <View style={s.tableRowLeft}>
                <MapPin size={18} color={tableNumber ? Colors.espresso : Colors.terra} />
                <View>
                  <Text style={[s.tableRowText, !tableNumber && { color: Colors.terra }]}>
                    {tableNumber ? `Mesa ${tableNumber}` : 'Seleccionar mesa'}
                  </Text>
                  <Text style={s.tableRowSub}>
                    {tableNumber ? 'Toca para cambiar' : 'Requerido para continuar'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={Colors.latte} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Dirección domicilio (solo takeaway) ── */}
        {orderType === 'takeaway' && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Dirección de entrega</Text>
            <View style={s.card}>
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Dirección *</Text>
                <TextInput
                  style={s.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Calle 15 #10-23, Barrio El Prado"
                  placeholderTextColor={Colors.latte}
                />
              </View>
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Ciudad *</Text>
                <TextInput
                  style={s.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Santa Marta"
                  placeholderTextColor={Colors.latte}
                />
              </View>
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Referencias (opcional)</Text>
                <TextInput
                  style={s.input}
                  value={references}
                  onChangeText={setReferences}
                  placeholder="Apto 301, edificio azul, portería..."
                  placeholderTextColor={Colors.latte}
                />
              </View>

              {/* Botón ver en Google Maps */}
              {address.trim().length > 0 && (
                <TouchableOpacity
                  style={s.mapsBtn}
                  onPress={() => openInGoogleMaps(address, city)}
                  activeOpacity={0.8}
                >
                  <Navigation size={14} color={Colors.terra} />
                  <Text style={s.mapsBtnText}>Ver ubicación en Google Maps</Text>
                  <ExternalLink size={13} color={Colors.terra} />
                </TouchableOpacity>
              )}

              {/* Info domicilio */}
              <View style={s.deliveryInfo}>
                <Text style={s.deliveryInfoText}>
                  🛵 Tiempo estimado: 30-45 min · Costo domicilio: {formatCOP(5000)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Resumen ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Resumen</Text>
          <View style={s.card}>
            {items.map(item => (
              <View key={item.key} style={s.itemRow}>
                <Text style={s.itemQty}>{item.quantity}×</Text>
                <Text style={s.itemName} numberOfLines={1}>{item.product.name}</Text>
                <Text style={s.itemPrice}>{formatCOP(item.product.price * item.quantity)}</Text>
              </View>
            ))}
            <View style={s.divider} />
            <SummaryRow label={`Subtotal (${totalItems()} items)`} value={formatCOP(subtotal)} />
            <SummaryRow label="Servicio (10%)" value={formatCOP(servicio)} muted />
            {orderType === 'takeaway' && (
              <SummaryRow label="🛵 Domicilio" value={formatCOP(domicilio)} accent />
            )}
            <View style={s.divider} />
            <SummaryRow label="Total" value={formatCOP(total)} bold />
          </View>
        </View>

        {/* ── Notas ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Notas del pedido (opcional)</Text>
          <TextInput
            style={s.notesInput}
            value={orderNotes}
            onChangeText={setOrderNotes}
            placeholder="Sin cebolla, alergia a los mariscos..."
            placeholderTextColor={Colors.latte}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* ── Método de pago ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Método de pago</Text>
          <View style={s.paymentOptions}>
            {PAYMENT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[s.paymentOpt, paymentMethod === opt.key && s.paymentOptActive]}
                onPress={() => setPaymentMethod(opt.key)}
                activeOpacity={0.8}
              >
                <View style={[s.radio, paymentMethod === opt.key && s.radioActive]}>
                  {paymentMethod === opt.key && <View style={s.radioDot} />}
                </View>
                <opt.Icon size={20} color={paymentMethod === opt.key ? Colors.espresso : Colors.latte} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.paymentLabel, paymentMethod === opt.key && s.paymentLabelActive]}>{opt.label}</Text>
                  <Text style={s.paymentSub}>{opt.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Campos tarjeta ── */}
        {paymentMethod === 'card' && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Datos de tarjeta</Text>
            <View style={s.card}>
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Número de tarjeta</Text>
                <TextInput
                  style={s.input}
                  value={cardNumber}
                  onChangeText={t => setCardNumber(formatCardNumber(t))}
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor={Colors.latte}
                  keyboardType="number-pad"
                  maxLength={19}
                />
              </View>
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Titular</Text>
                <TextInput
                  style={s.input}
                  value={cardHolder}
                  onChangeText={setCardHolder}
                  placeholder="Como aparece en la tarjeta"
                  placeholderTextColor={Colors.latte}
                  autoCapitalize="words"
                />
              </View>
              <View style={s.rowInputs}>
                <View style={[s.inputGroup, { flex: 1 }]}>
                  <Text style={s.inputLabel}>Vencimiento</Text>
                  <TextInput
                    style={s.input}
                    value={expiry}
                    onChangeText={t => setExpiry(formatExpiry(t))}
                    placeholder="MM/AA"
                    placeholderTextColor={Colors.latte}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
                <View style={[s.inputGroup, { flex: 1 }]}>
                  <Text style={s.inputLabel}>CVV</Text>
                  <TextInput
                    style={s.input}
                    value={cvv}
                    onChangeText={setCvv}
                    placeholder="123"
                    placeholderTextColor={Colors.latte}
                    keyboardType="number-pad"
                    maxLength={3}
                    secureTextEntry
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Info efectivo / transferencia ── */}
        {paymentMethod === 'cash' && (
          <View style={[s.infoBox, { borderColor: '#97C459' }]}>
            <Text style={[s.infoBoxTitle, { color: '#27500A' }]}>Pago en caja</Text>
            <Text style={[s.infoBoxText, { color: '#3B6D11' }]}>
              Dirígete a la caja al finalizar con el total de {formatCOP(total)}
            </Text>
          </View>
        )}
        {paymentMethod === 'transfer' && (
          <View style={[s.infoBox, { borderColor: '#378ADD' }]}>
            <Text style={[s.infoBoxTitle, { color: '#185FA5' }]}>Datos de transferencia</Text>
            <Text style={[s.infoBoxText, { color: '#0C447C' }]}>
              Nequi / Bancolombia: 300 000 0000{'\n'}
              A nombre de: Cafetería Luna{'\n'}
              Valor exacto: {formatCOP(total)}
            </Text>
          </View>
        )}

        <View style={s.securityRow}>
          <Lock size={13} color={Colors.latte} />
          <Text style={s.securityText}>Transacción segura con cifrado SSL 256-bit</Text>
        </View>

        <TouchableOpacity
          style={[s.confirmBtn, (processing || (orderType === 'dine_in' && !tableNumber)) && s.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={processing || (orderType === 'dine_in' && !tableNumber)}
          activeOpacity={0.85}
        >
          {processing
            ? <ActivityIndicator color="#FFFFFF" size="small" />
            : <>
                <Lock size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={s.confirmBtnText}>Enviar pedido · {formatCOP(total)}</Text>
              </>
          }
        </TouchableOpacity>

      </ScrollView>
    </View>
  )
}

function SummaryRow({ label, value, muted, bold, accent }: {
  label: string; value: string; muted?: boolean; bold?: boolean; accent?: boolean
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text style={[
        { fontFamily: Font.sans, fontSize: 13, color: muted ? Colors.latte : accent ? Colors.terra : Colors.mocha },
        bold && { fontWeight: '700', fontSize: 15, color: Colors.espresso },
      ]}>{label}</Text>
      <Text style={[
        { fontFamily: Font.sans, fontSize: 13, color: accent ? Colors.terra : Colors.espresso, fontWeight: '600' },
        bold && { fontFamily: Font.serif, fontSize: 18, color: Colors.terra },
      ]}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: Colors.cream },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backBtn:       { padding: 4 },
  headerTitle:   { fontFamily: Font.serif, fontSize: 20, fontWeight: '700', color: Colors.espresso },
  scroll:        { padding: 20, gap: 24, paddingBottom: 48 },
  section:       { gap: 10 },
  sectionTitle:  { fontFamily: Font.sans, fontSize: 12, fontWeight: '700', color: Colors.mocha, textTransform: 'uppercase', letterSpacing: 0.5 },
  typeRow:       { flexDirection: 'row', gap: 10 },
  typeBtn:       { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 14, borderRadius: Radius.lg, backgroundColor: Colors.creamDark, borderWidth: 1, borderColor: Colors.creamDeep },
  typeBtnActive: { backgroundColor: Colors.espresso, borderColor: Colors.espresso },
  typeBtnText:   { fontFamily: Font.sans, fontSize: 13, fontWeight: '700', color: Colors.mocha },
  typeBtnTextActive: { color: Colors.white },
  typeBtnSub:    { fontFamily: Font.sans, fontSize: 10, color: Colors.latte },
  card:          { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.creamDeep, gap: 12, ...Shadow.sm },
  tableRow:      { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.creamDeep, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...Shadow.sm },
  tableRowLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  tableRowText:  { fontFamily: Font.sans, fontSize: 15, fontWeight: '600', color: Colors.espresso },
  tableRowSub:   { fontFamily: Font.sans, fontSize: 11, color: Colors.latte, marginTop: 1 },
  inputGroup:    { gap: 5 },
  inputLabel:    { fontFamily: Font.sans, fontSize: 11, fontWeight: '600', color: Colors.mocha, textTransform: 'uppercase' },
  input:         { backgroundColor: Colors.creamDark, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.creamDeep, paddingHorizontal: 14, paddingVertical: 11, fontFamily: Font.sans, fontSize: 15, color: Colors.espresso },
  mapsBtn:       { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.terraDust, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.terra + '40' },
  mapsBtnText:   { fontFamily: Font.sans, fontSize: 13, fontWeight: '600', color: Colors.terra, flex: 1 },
  deliveryInfo:  { backgroundColor: Colors.creamDark, borderRadius: Radius.md, padding: 10 },
  deliveryInfoText: { fontFamily: Font.sans, fontSize: 12, color: Colors.mocha, lineHeight: 18 },
  itemRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  itemQty:       { fontFamily: Font.sans, fontSize: 13, color: Colors.latte, width: 24 },
  itemName:      { fontFamily: Font.sans, fontSize: 13, color: Colors.espresso, flex: 1 },
  itemPrice:     { fontFamily: Font.sans, fontSize: 13, fontWeight: '600', color: Colors.espresso },
  divider:       { height: 0.5, backgroundColor: Colors.creamDeep, marginVertical: 8 },
  notesInput:    { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.creamDeep, padding: 14, fontFamily: Font.sans, fontSize: 14, color: Colors.espresso, textAlignVertical: 'top', minHeight: 72 },
  paymentOptions:{ gap: 8 },
  paymentOpt:    { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.creamDeep, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentOptActive: { borderColor: Colors.espresso, borderWidth: 1.5 },
  paymentLabel:  { fontFamily: Font.sans, fontSize: 14, fontWeight: '600', color: Colors.latte },
  paymentLabelActive: { color: Colors.espresso },
  paymentSub:    { fontFamily: Font.sans, fontSize: 11, color: Colors.latte, marginTop: 1 },
  radio:         { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: Colors.creamDeep, alignItems: 'center', justifyContent: 'center' },
  radioActive:   { borderColor: Colors.espresso },
  radioDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.espresso },
  rowInputs:     { flexDirection: 'row', gap: 12 },
  infoBox:       { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, padding: 14, gap: 4 },
  infoBoxTitle:  { fontFamily: Font.sans, fontSize: 13, fontWeight: '700' },
  infoBoxText:   { fontFamily: Font.sans, fontSize: 13, lineHeight: 20 },
  securityRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  securityText:  { fontFamily: Font.sans, fontSize: 11, color: Colors.latte },
  confirmBtn:    { backgroundColor: Colors.espresso, borderRadius: Radius.xl, paddingVertical: 17, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', ...Shadow.card },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText:{ fontFamily: Font.sans, fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
})