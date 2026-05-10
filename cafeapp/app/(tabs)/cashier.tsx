import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Modal,
  TextInput, RefreshControl, Vibration,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Banknote, CreditCard, Smartphone,
  CheckCircle2, ChevronRight, X, Receipt, Bell,
} from 'lucide-react-native'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { supabase } from '@/lib/supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type PaymentMethod = 'cash' | 'card' | 'transfer'

type OrderItem = {
  id: string
  quantity: number
  unit_price: number
  notes: string | null
  products: { name: string }
}

type Order = {
  id: string
  status: string
  total: number
  payment_status: string
  payment_method: string | null
  table_number: string | null
  created_at: string
  order_items: OrderItem[]
}

const PAYMENT_OPTIONS: {
  key: PaymentMethod
  label: string
  sub: string
  Icon: React.FC<any>
}[] = [
  { key: 'cash',     label: 'Efectivo',      sub: 'Pago directo',        Icon: Banknote    },
  { key: 'card',     label: 'Tarjeta',        sub: 'Datáfono',            Icon: CreditCard  },
  { key: 'transfer', label: 'Transferencia',  sub: 'Nequi / Bancolombia', Icon: Smartphone  },
]

const IVA = 0.19

function calcTotals(subtotal: number) {
  const tax   = Math.round(subtotal * IVA)
  const total = subtotal + tax
  return { tax, total }
}

// ─── Modal de cobro ───────────────────────────────────────────────────────────

function CheckoutModal({
  order,
  onClose,
  onSuccess,
}: {
  order: Order | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [method,       setMethod]       = useState<PaymentMethod>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [processing,   setProcessing]   = useState(false)

  if (!order) return null

  const { tax, total } = calcTotals(order.total)
  const cashAmt  = parseFloat(cashReceived.replace(/\D/g, '') || '0')
  const change   = cashAmt - total

  async function handleConfirm() {
    if (method === 'cash' && cashAmt < total) {
      Alert.alert('Monto insuficiente', `Faltan ${formatCOP(total - cashAmt)}`)
      return
    }

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_method: method,
          status: 'delivered',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order!.id)

      if (error) throw error
      onSuccess()
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo registrar el pago')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={m.screen}>
        <View style={m.handle} />
        <View style={m.header}>
          <View>
            <Text style={m.headerTitle}>Cobrar pedido</Text>
            <Text style={m.headerSub}>
              #{order.id.slice(-6).toUpperCase()}
              {order.table_number ? ` · Mesa ${order.table_number}` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={m.closeBtn}>
            <X size={20} color={Colors.mocha} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={m.scroll} showsVerticalScrollIndicator={false}>
          <View style={m.section}>
            <Text style={m.sectionTitle}>Productos</Text>
            <View style={m.card}>
              {order.order_items.map(item => (
                <View key={item.id} style={m.itemRow}>
                  <Text style={m.itemQty}>{item.quantity}×</Text>
                  <Text style={m.itemName} numberOfLines={1}>{item.products?.name}</Text>
                  <Text style={m.itemPrice}>{formatCOP(item.unit_price * item.quantity)}</Text>
                </View>
              ))}
              <View style={m.divider} />
              <Row label="Subtotal"  value={formatCOP(order.total)} />
              <Row label={`IVA (${Math.round(IVA * 100)}%)`} value={formatCOP(tax)} muted />
              <View style={m.divider} />
              <Row label="Total" value={formatCOP(total)} bold />
            </View>
          </View>

          <View style={m.section}>
            <Text style={m.sectionTitle}>Método de pago</Text>
            <View style={m.methodList}>
              {PAYMENT_OPTIONS.map(opt => {
                const active = method === opt.key
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[m.methodCard, active && m.methodCardActive]}
                    onPress={() => setMethod(opt.key)}
                    activeOpacity={0.75}
                  >
                    <View style={[m.methodIcon, active && m.methodIconActive]}>
                      <opt.Icon size={18} color={active ? Colors.white : Colors.mocha} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[m.methodLabel, active && m.methodLabelActive]}>{opt.label}</Text>
                      <Text style={m.methodSub}>{opt.sub}</Text>
                    </View>
                    <View style={[m.radio, active && m.radioActive]}>
                      {active && <View style={m.radioDot} />}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {method === 'cash' && (
            <View style={m.section}>
              <Text style={m.sectionTitle}>Efectivo recibido</Text>
              <TextInput
                style={m.cashInput}
                value={cashReceived}
                onChangeText={setCashReceived}
                placeholder={formatCOP(total)}
                placeholderTextColor={Colors.latte}
                keyboardType="numeric"
              />
              {cashReceived.length > 0 && (
                <View style={[m.changeCard, change < 0 && m.changeCardError]}>
                  <Text style={[m.changeLabel, change < 0 && { color: Colors.terra }]}>
                    {change >= 0 ? 'Cambio a devolver' : 'Falta'}
                  </Text>
                  <Text style={[m.changeValue, change < 0 && { color: Colors.terra }]}>
                    {formatCOP(Math.abs(change))}
                  </Text>
                </View>
              )}
            </View>
          )}

          {method === 'transfer' && (
            <View style={[m.infoBox, { borderColor: '#378ADD' }]}>
              <Text style={[m.infoTitle, { color: '#185FA5' }]}>Datos para transferencia</Text>
              <Text style={[m.infoText, { color: '#0C447C' }]}>
                Nequi / Bancolombia: 300 000 0000{'\n'}
                A nombre de: Cafetería Luna{'\n'}
                Valor exacto: {formatCOP(total)}
              </Text>
            </View>
          )}

          {method === 'card' && (
            <View style={[m.infoBox, { borderColor: Colors.sage }]}>
              <Text style={[m.infoTitle, { color: Colors.sage }]}>Pase la tarjeta por el datáfono</Text>
              <Text style={[m.infoText, { color: Colors.sage }]}>
                Confirma aquí cuando el datáfono apruebe la transacción
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={[m.footer, { paddingBottom: 32 }]}>
          <TouchableOpacity
            style={[m.confirmBtn, processing && { opacity: 0.6 }]}
            onPress={handleConfirm}
            disabled={processing}
            activeOpacity={0.85}
          >
            {processing
              ? <ActivityIndicator color={Colors.white} />
              : <>
                  <CheckCircle2 size={18} color={Colors.white} style={{ marginRight: 8 }} />
                  <Text style={m.confirmBtnText}>Confirmar pago · {formatCOP(total)}</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

function Row({ label, value, muted, bold }: {
  label: string; value: string; muted?: boolean; bold?: boolean
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text style={[
        { fontFamily: Font.sans, fontSize: 13, color: muted ? Colors.latte : Colors.mocha },
        bold && { fontWeight: '700', fontSize: 15, color: Colors.espresso },
      ]}>
        {label}
      </Text>
      <Text style={[
        { fontFamily: Font.sans, fontSize: 13, color: Colors.espresso, fontWeight: '500' },
        bold && { fontFamily: Font.serif, fontSize: 18, color: Colors.terra },
      ]}>
        {value}
      </Text>
    </View>
  )
}

// ─── Tarjeta de pedido en lista ───────────────────────────────────────────────

function OrderListCard({
  order,
  onPress,
  paid,
}: {
  order: Order
  onPress?: () => void
  paid?: boolean
}) {
  const { total } = calcTotals(order.total)
  const isReady = order.status === 'ready' && !paid

  return (
    <TouchableOpacity
      style={[s.card, paid && s.cardPaid, isReady && s.cardReady]}
      onPress={onPress}
      disabled={paid}
      activeOpacity={0.75}
    >
      <View style={s.cardLeft}>
        <Text style={s.cardId}>#{order.id.slice(-6).toUpperCase()}</Text>
        <Text style={s.cardMeta}>
          {order.table_number ? `Mesa ${order.table_number}` : 'Sin mesa'}
          {' · '}{order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
        </Text>
        {isReady && (
          <View style={s.readyBadge}>
            <Bell size={10} color={Colors.sage} />
            <Text style={s.readyBadgeText}>Listo para cobrar</Text>
          </View>
        )}
      </View>
      <View style={s.cardRight}>
        <Text style={[s.cardTotal, paid && { color: Colors.latte }]}>{formatCOP(total)}</Text>
        {paid
          ? <View style={s.paidBadge}><Text style={s.paidBadgeText}>Pagado</Text></View>
          : <View style={s.cobrarBadge}>
              <Receipt size={11} color={Colors.terra} />
              <Text style={s.cobrarText}>Cobrar</Text>
              <ChevronRight size={12} color={Colors.terra} />
            </View>
        }
      </View>
    </TouchableOpacity>
  )
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function CashierScreen() {
  const insets = useSafeAreaInsets()
  const [orders,     setOrders]     = useState<Order[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected,   setSelected]   = useState<Order | null>(null)
  const [newArrivals, setNewArrivals] = useState<string[]>([])

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, total, payment_status, payment_method,
          table_number, created_at,
          order_items(id, quantity, unit_price, notes, products(name))
        `)
        .in('status', ['ready', 'delivered'])
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const newOrders = (data as unknown as Order[]) ?? []

      // Detectar nuevos pedidos "ready" para notificación
      const currentReadyIds = orders.filter(o => o.status === 'ready').map(o => o.id)
      const newReadyIds = newOrders.filter(o => o.status === 'ready' && !currentReadyIds.includes(o.id)).map(o => o.id)

      if (newReadyIds.length > 0) {
        setNewArrivals(newReadyIds)
        Vibration.vibrate(500) // Vibrar cuando llega un pedido listo
        setTimeout(() => setNewArrivals([]), 3000) // Reset después de 3s
      }

      setOrders(newOrders)
    } catch (err) {
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [orders])

  useEffect(() => {
    fetchOrders()

    // ✅ Canal Realtime: escucha cambios en orders para mostrar pedidos listos automáticamente
    const channel = supabase
      .channel('cashier-orders')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
      }, (payload) => {
        console.log('Cashier realtime:', payload.new)
        // Solo actualizar si el pedido está en estados que nos interesan
        const newStatus = (payload.new as any)?.status
        if (newStatus === 'ready' || newStatus === 'delivered') {
          fetchOrders()
        }
      })
      .subscribe((status) => {
        console.log('Cashier channel status:', status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  const unpaid = orders.filter(o => o.payment_status === 'unpaid')
  const paid   = orders.filter(o => o.payment_status === 'paid')

  const totalUnpaid = unpaid.reduce((s, o) => s + calcTotals(o.total).total, 0)

  return (
    <View style={[s.screen, { paddingBottom: insets.bottom }]}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Text style={s.headerTitle}>Caja</Text>
        <View style={s.headerStats}>
          <View style={s.statChip}>
            <Text style={s.statNum}>{unpaid.length}</Text>
            <Text style={s.statLabel}>por cobrar</Text>
          </View>
          <View style={[s.statChip, { backgroundColor: Colors.terraDust }]}>
            <Text style={[s.statNum, { color: Colors.terra }]}>{formatCOP(totalUnpaid)}</Text>
            <Text style={[s.statLabel, { color: Colors.terra }]}>pendiente</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={Colors.terra} size="large" />
        </View>
      ) : (
        <FlatList
          data={[...unpaid, ...paid]}
          keyExtractor={o => o.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchOrders() }}
              tintColor={Colors.terra}
              colors={[Colors.terra]}
            />
          }
          ListHeaderComponent={
            unpaid.length === 0 ? (
              <View style={s.allClearBox}>
                <CheckCircle2 size={28} color={Colors.sage} />
                <Text style={s.allClearText}>Todo cobrado</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <OrderListCard
              order={item}
              paid={item.payment_status === 'paid'}
              onPress={() => setSelected(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🧾</Text>
              <Text style={s.emptyTitle}>Sin pedidos listos</Text>
              <Text style={s.emptySub}>Los pedidos marcados como "Listo" aparecerán aquí automáticamente</Text>
            </View>
          }
        />
      )}

      <CheckoutModal
        order={selected}
        onClose={() => setSelected(null)}
        onSuccess={() => {
          setSelected(null)
          fetchOrders()
          Alert.alert('✅ Pago registrado', 'El pedido fue marcado como pagado')
        }}
      />
    </View>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: Colors.cream },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle:  { fontFamily: Font.serif, fontSize: 28, fontWeight: '700', color: Colors.espresso },
  headerStats:  { flexDirection: 'row', gap: 8, marginTop: 4 },
  statChip: {
    backgroundColor: Colors.creamDark, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center',
  },
  statNum:  { fontFamily: Font.serif, fontSize: 16, fontWeight: '700', color: Colors.espresso },
  statLabel:{ fontFamily: Font.sans, fontSize: 10, color: Colors.mocha, marginTop: 1 },
  list:     { padding: 20, paddingTop: 4 },
  allClearBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.sageDust, borderRadius: Radius.md,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.sage + '44',
  },
  allClearText: { fontFamily: Font.sans, fontSize: 14, fontWeight: '600', color: Colors.sage },
  card: {
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.creamDeep,
    padding: 14, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    ...Shadow.sm,
  },
  cardPaid:   { opacity: 0.55 },
  cardReady:  { borderColor: Colors.sage, borderWidth: 1.5, backgroundColor: Colors.sageDust + '40' },
  cardLeft:   { gap: 3, flex: 1 },
  cardId:     { fontFamily: Font.serif, fontSize: 16, fontWeight: '700', color: Colors.espresso },
  cardMeta:   { fontFamily: Font.sans, fontSize: 12, color: Colors.latte },
  cardRight:  { alignItems: 'flex-end', gap: 5 },
  cardTotal:  { fontFamily: Font.serif, fontSize: 17, fontWeight: '700', color: Colors.espresso },
  readyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.sageDust, borderRadius: Radius.sm,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-start',
  },
  readyBadgeText: { fontFamily: Font.sans, fontSize: 10, fontWeight: '600', color: Colors.sage },
  paidBadge: {
    backgroundColor: Colors.sageDust, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  paidBadgeText: { fontFamily: Font.sans, fontSize: 11, fontWeight: '600', color: Colors.sage },
  cobrarBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.terraDust, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  cobrarText: { fontFamily: Font.sans, fontSize: 11, fontWeight: '600', color: Colors.terra },
  empty:      { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontFamily: Font.serif, fontSize: 18, fontWeight: '700', color: Colors.espresso },
  emptySub:   { fontFamily: Font.sans, fontSize: 14, color: Colors.mocha, textAlign: 'center', paddingHorizontal: 40 },
})

const m = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: Colors.cream },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.creamDeep,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 0.5, borderBottomColor: Colors.creamDeep,
  },
  headerTitle: { fontFamily: Font.serif, fontSize: 20, fontWeight: '700', color: Colors.espresso },
  headerSub:   { fontFamily: Font.sans, fontSize: 13, color: Colors.latte, marginTop: 2 },
  closeBtn:    { padding: 4 },
  scroll:      { padding: 20, gap: 20, paddingBottom: 40 },
  section:     { gap: 10 },
  sectionTitle: {
    fontFamily: Font.sans, fontSize: 11, fontWeight: '700',
    color: Colors.mocha, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.creamDeep, padding: 16, gap: 4,
  },
  itemRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  itemQty:  { fontFamily: Font.sans, fontSize: 12, color: Colors.latte, width: 22 },
  itemName: { fontFamily: Font.sans, fontSize: 13, color: Colors.espresso, flex: 1 },
  itemPrice:{ fontFamily: Font.sans, fontSize: 13, fontWeight: '600', color: Colors.espresso },
  divider:  { height: 0.5, backgroundColor: Colors.creamDeep, marginVertical: 8 },
  methodList: { gap: 8 },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.creamDeep, padding: 14,
  },
  methodCardActive: { borderColor: Colors.espresso, borderWidth: 1.5 },
  methodIcon: {
    width: 36, height: 36, borderRadius: Radius.sm,
    backgroundColor: Colors.creamDark,
    alignItems: 'center', justifyContent: 'center',
  },
  methodIconActive: { backgroundColor: Colors.espresso },
  methodLabel:      { fontFamily: Font.sans, fontSize: 14, fontWeight: '600', color: Colors.latte },
  methodLabelActive:{ color: Colors.espresso },
  methodSub:        { fontFamily: Font.sans, fontSize: 11, color: Colors.latte, marginTop: 1 },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: Colors.creamDeep,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive:  { borderColor: Colors.espresso },
  radioDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.espresso },
  cashInput: {
    backgroundColor: Colors.white, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.creamDeep,
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: Font.serif, fontSize: 22, color: Colors.espresso,
  },
  changeCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.sageDust, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.sage + '44', padding: 14,
  },
  changeCardError: { backgroundColor: Colors.terraDust, borderColor: Colors.terraLight + '44' },
  changeLabel:     { fontFamily: Font.sans, fontSize: 13, fontWeight: '500', color: Colors.sage },
  changeValue:     { fontFamily: Font.serif, fontSize: 20, fontWeight: '700', color: Colors.sage },
  infoBox: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    borderWidth: 1, padding: 14, gap: 4,
  },
  infoTitle:   { fontFamily: Font.sans, fontSize: 13, fontWeight: '700' },
  infoText:    { fontFamily: Font.sans, fontSize: 13, lineHeight: 20 },
  footer: {
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 0.5, borderTopColor: Colors.creamDeep,
    backgroundColor: Colors.cream,
  },
  confirmBtn: {
    backgroundColor: Colors.espresso, borderRadius: Radius.xl,
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.card,
  },
  confirmBtnText: { fontFamily: Font.sans, fontSize: 15, fontWeight: '700', color: Colors.white },
})