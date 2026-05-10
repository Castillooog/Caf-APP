import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Vibration,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Clock, CheckCircle2, ChefHat, Package, XCircle, Plus, Bell } from 'lucide-react-native'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useauthstore'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

type OrderItem = {
  id: string
  quantity: number
  unit_price: number
  notes: string | null
  products: { name: string; image_url: string | null }
}

type Order = {
  id: string
  status: OrderStatus
  total: number
  notes: string | null
  table_number: string | null
  created_at: string
  order_items: OrderItem[]
}

// ─── Config de estados ────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, {
  label: string
  color: string
  bg: string
  icon: React.FC<any>
  step: number
}> = {
  pending:   { label: 'Pendiente',      color: Colors.latte,     bg: Colors.creamDark,  icon: Clock,        step: 1 },
  confirmed: { label: 'Confirmado',     color: '#185FA5',        bg: '#E6F1FB',         icon: CheckCircle2, step: 2 },
  preparing: { label: 'En preparación', color: '#854F0B',        bg: '#FAEEDA',         icon: ChefHat,      step: 3 },
  ready:     { label: 'Listo ✓',        color: Colors.sage,      bg: Colors.sageDust,   icon: Package,      step: 4 },
  delivered: { label: 'Entregado',      color: Colors.latte,     bg: Colors.creamDark,  icon: CheckCircle2, step: 5 },
  cancelled: { label: 'Cancelado',      color: Colors.terra,     bg: Colors.terraDust,  icon: XCircle,      step: 0 },
}

const STEPS: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered']

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  return `Hace ${Math.floor(mins / 60)}h`
}

// ─── Barra de progreso del pedido ────────────────────────────────────────────

function OrderProgress({ status }: { status: OrderStatus }) {
  const cfg  = STATUS_CONFIG[status]
  const step = cfg.step

  if (status === 'cancelled') return (
    <View style={p.row}>
      <XCircle size={13} color={Colors.terra} />
      <Text style={[p.label, { color: Colors.terra }]}>Pedido cancelado</Text>
    </View>
  )

  return (
    <View style={p.container}>
      {STEPS.map((s, i) => {
        const scfg    = STATUS_CONFIG[s]
        const done    = scfg.step <= step
        const current = s === status
        return (
          <React.Fragment key={s}>
            <View style={[p.dot, done && { backgroundColor: current ? Colors.terra : Colors.sage }, current && p.dotCurrent]}>
              {done && !current && <CheckCircle2 size={10} color={Colors.white} />}
            </View>
            {i < STEPS.length - 1 && (
              <View style={[p.line, { backgroundColor: scfg.step < step ? Colors.sage : Colors.creamDeep }]} />
            )}
          </React.Fragment>
        )
      })}
    </View>
  )
}

const p = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 4 },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.creamDeep,
    alignItems: 'center', justifyContent: 'center',
  },
  dotCurrent: {
    backgroundColor: Colors.terra,
    width: 20, height: 20, borderRadius: 10,
  },
  line: { flex: 1, height: 2, borderRadius: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  label: { fontFamily: Font.sans, fontSize: 12 },
})

// ─── Tarjeta de pedido ────────────────────────────────────────────────────────

function OrderCard({ order, isNew }: { order: Order; isNew?: boolean }) {
  const cfg    = STATUS_CONFIG[order.status]
  const Icon   = cfg.icon
  const isReady = order.status === 'ready'

  return (
    <View style={[s.card, isReady && s.cardHighlight, isNew && s.cardNewArrival]}>
      {isReady && (
        <View style={s.readyBanner}>
          <Package size={13} color={Colors.sage} />
          <Text style={s.readyBannerText}>¡Listo para entregar!</Text>
        </View>
      )}

      <View style={s.cardHeader}>
        <View style={s.orderMeta}>
          <Text style={s.orderId}>#{order.id.slice(-6).toUpperCase()}</Text>
          {order.table_number && (
            <View style={s.tablePill}>
              <Text style={s.tablePillText}>Mesa {order.table_number}</Text>
            </View>
          )}
        </View>
        <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
          <Icon size={12} color={cfg.color} />
          <Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <OrderProgress status={order.status} />

      <View style={s.itemsList}>
        {order.order_items.slice(0, 3).map(item => (
          <View key={item.id} style={s.itemRow}>
            <Text style={s.itemQty}>{item.quantity}×</Text>
            <Text style={s.itemName} numberOfLines={1}>{item.products?.name}</Text>
            <Text style={s.itemPrice}>{formatCOP(item.unit_price * item.quantity)}</Text>
          </View>
        ))}
        {order.order_items.length > 3 && (
          <Text style={s.moreItems}>+{order.order_items.length - 3} productos más</Text>
        )}
      </View>

      <View style={s.cardFooter}>
        <Text style={s.timeAgo}>{timeAgo(order.created_at)}</Text>
        <Text style={s.total}>{formatCOP(order.total)}</Text>
      </View>
    </View>
  )
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function WaiterOrdersScreen() {
  const insets             = useSafeAreaInsets()
  const { session }        = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter]   = useState<'active' | 'done'>('active')
  const [newReadyIds, setNewReadyIds] = useState<Set<string>>(new Set())

  const fetchOrders = useCallback(async () => {
    if (!session?.user) return
    try {
      const statusFilter = filter === 'active'
        ? ['pending', 'confirmed', 'preparing', 'ready']
        : ['delivered', 'cancelled']

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, total, notes, table_number, created_at,
          order_items(id, quantity, unit_price, notes, products(name, image_url))
        `)
        .eq('user_id', session.user.id)
        .in('status', statusFilter)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error

      const newOrders = (data as unknown as Order[]) ?? []

      // Detectar pedidos que acaban de pasar a "ready"
      const previousReadyIds = new Set(orders.filter(o => o.status === 'ready').map(o => o.id))
      const newlyReady = newOrders.filter(o => o.status === 'ready' && !previousReadyIds.has(o.id))

      if (newlyReady.length > 0) {
        setNewReadyIds(new Set(newlyReady.map(o => o.id)))
        Vibration.vibrate([0, 300, 100, 300]) // Patrón de vibración para notificación
        Alert.alert(
          '🔔 ¡Pedido listo!',
          `${newlyReady.length} pedido(s) listo(s) para entregar`,
          [{ text: 'OK', style: 'default' }]
        )
        // Limpiar la animación después de 5 segundos
        setTimeout(() => setNewReadyIds(new Set()), 5000)
      }

      setOrders(newOrders)
    } catch (err) {
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [session?.user?.id, filter, orders])

  useEffect(() => {
    fetchOrders()

    // ✅ CORRECCIÓN CLAVE: Canal Realtime SIN filtro de user_id en el listener
    // El filtro .eq('user_id', ...) ya se hace en el fetchOrders
    // Pero el canal escucha TODOS los cambios en orders para detectar cuando la cocina actualiza
    const channel = supabase
      .channel(`waiter-orders-${session?.user?.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
      }, (payload) => {
        const updatedOrder = payload.new as any
        console.log('Waiter realtime update:', updatedOrder)

        // Solo actualizar si el pedido pertenece a este mesero
        if (updatedOrder.user_id === session?.user?.id) {
          fetchOrders()
        }
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'orders',
      }, (payload) => {
        const newOrder = payload.new as any
        if (newOrder.user_id === session?.user?.id) {
          fetchOrders()
        }
      })
      .subscribe((status) => {
        console.log('Waiter channel status:', status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  const readyCount = orders.filter(o => o.status === 'ready').length

  return (
    <View style={[s.screen, { paddingBottom: insets.bottom }]}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={s.headerTitle}>Mis pedidos</Text>
          {readyCount > 0 && (
            <View style={s.alertRow}>
              <Bell size={12} color={Colors.sage} />
              <Text style={s.headerAlert}>
                {readyCount} listo{readyCount !== 1 ? 's' : ''} para entregar
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={s.newOrderBtn}
          onPress={() => router.push('/(tabs)' as any)}
          activeOpacity={0.8}
        >
          <Plus size={18} color={Colors.white} />
          <Text style={s.newOrderBtnText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      <View style={s.filterRow}>
        <TouchableOpacity
          style={[s.filterTab, filter === 'active' && s.filterTabActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[s.filterTabText, filter === 'active' && s.filterTabTextActive]}>
            Activos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.filterTab, filter === 'done' && s.filterTabActive]}
          onPress={() => setFilter('done')}
        >
          <Text style={[s.filterTabText, filter === 'done' && s.filterTabTextActive]}>
            Historial
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={Colors.terra} size="large" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => o.id}
          renderItem={({ item }) => (
            <OrderCard 
              order={item} 
              isNew={newReadyIds.has(item.id)} 
            />
          )}
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
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🧾</Text>
              <Text style={s.emptyTitle}>
                {filter === 'active' ? 'Sin pedidos activos' : 'Sin historial aún'}
              </Text>
              <Text style={s.emptySub}>
                {filter === 'active'
                  ? 'Tus pedidos activos aparecerán aquí automáticamente'
                  : 'Los pedidos entregados aparecerán aquí'}
              </Text>
              {filter === 'active' && (
                <TouchableOpacity
                  style={s.emptyBtn}
                  onPress={() => router.push('/(tabs)' as any)}
                >
                  <Text style={s.emptyBtnText}>Ir al menú</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: Colors.cream },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14,
  },
  headerTitle: { fontFamily: Font.serif, fontSize: 24, fontWeight: '700', color: Colors.espresso },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  headerAlert: { fontFamily: Font.sans, fontSize: 12, color: Colors.sage, fontWeight: '600' },
  newOrderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.espresso, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  newOrderBtnText: { fontFamily: Font.sans, fontSize: 13, fontWeight: '700', color: Colors.white },
  filterRow: {
    flexDirection: 'row', marginHorizontal: 20,
    backgroundColor: Colors.creamDark, borderRadius: Radius.full,
    padding: 3, marginBottom: 16,
  },
  filterTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.full },
  filterTabActive: { backgroundColor: Colors.white, ...Shadow.sm },
  filterTabText: { fontFamily: Font.sans, fontSize: 13, color: Colors.latte, fontWeight: '500' },
  filterTabTextActive: { color: Colors.espresso, fontWeight: '700' },
  list:        { padding: 20, paddingTop: 4, gap: 12 },
  card: {
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.creamDeep,
    padding: 16, ...Shadow.sm,
  },
  cardHighlight: { borderColor: Colors.sage, borderWidth: 1.5 },
  cardNewArrival: { 
    borderColor: Colors.sage, 
    borderWidth: 2,
    shadowColor: Colors.sage,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  readyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.sageDust, borderRadius: Radius.sm,
    paddingHorizontal: 10, paddingVertical: 5,
    marginBottom: 10, alignSelf: 'flex-start',
  },
  readyBannerText: { fontFamily: Font.sans, fontSize: 11, fontWeight: '700', color: Colors.sage },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderMeta:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderId:     { fontFamily: Font.serif, fontSize: 17, fontWeight: '700', color: Colors.espresso },
  tablePill: {
    backgroundColor: Colors.creamDark, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  tablePillText: { fontFamily: Font.sans, fontSize: 11, color: Colors.mocha, fontWeight: '500' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusText:  { fontFamily: Font.sans, fontSize: 11, fontWeight: '600' },
  itemsList:   { gap: 5, marginTop: 10 },
  itemRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemQty:     { fontFamily: Font.sans, fontSize: 12, color: Colors.latte, width: 22 },
  itemName:    { fontFamily: Font.sans, fontSize: 13, color: Colors.espresso, flex: 1 },
  itemPrice:   { fontFamily: Font.sans, fontSize: 12, color: Colors.mocha, fontWeight: '500' },
  moreItems:   { fontFamily: Font.sans, fontSize: 11, color: Colors.latte, fontStyle: 'italic', marginTop: 2 },
  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: Colors.creamDeep },
  timeAgo:     { fontFamily: Font.sans, fontSize: 12, color: Colors.latte },
  total:       { fontFamily: Font.serif, fontSize: 16, fontWeight: '700', color: Colors.terra },
  empty:       { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyEmoji:  { fontSize: 40 },
  emptyTitle:  { fontFamily: Font.serif, fontSize: 18, fontWeight: '700', color: Colors.espresso },
  emptySub:    { fontFamily: Font.sans, fontSize: 14, color: Colors.mocha, textAlign: 'center', paddingHorizontal: 40 },
  emptyBtn: {
    marginTop: 8, backgroundColor: Colors.espresso,
    borderRadius: Radius.full, paddingHorizontal: 24, paddingVertical: 11,
  },
  emptyBtnText: { fontFamily: Font.sans, fontSize: 14, fontWeight: '700', color: Colors.white },
})