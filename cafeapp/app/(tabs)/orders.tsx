import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Clock, AlertTriangle, CheckCircle2, Bell } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useauthstore'

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

type OrderItem = {
  id: string
  quantity: number
  notes: string | null
  products: { name: string }
}

type Order = {
  id: string
  status: OrderStatus
  notes: string | null
  created_at: string
  table_number: string | null
  order_items: OrderItem[]
}

const STATUS_CONFIG: Record<string, {
  label: string; badgeColor: string; badgeText: string; borderColor: string
}> = {
  pending:   { label: 'Nuevo',          badgeColor: '#E6F1FB', badgeText: '#185FA5', borderColor: '#378ADD' },
  confirmed: { label: 'Nuevo',          badgeColor: '#E6F1FB', badgeText: '#185FA5', borderColor: '#378ADD' },
  preparing: { label: 'En preparación', badgeColor: '#FAEEDA', badgeText: '#854F0B', borderColor: '#EF9F27' },
  ready:     { label: 'Listo',          badgeColor: '#EAF3DE', badgeText: '#3B6D11', borderColor: '#639922' },
  cancelled: { label: 'Cancelado',      badgeColor: '#FCEBEB', badgeText: '#A32D2D', borderColor: '#E24B4A' },
}

const ACTION_CONFIG: Record<string, {
  label: string; nextStatus: OrderStatus; btnColor: string; btnText: string
} | null> = {
  pending:   { label: 'Preparar',            nextStatus: 'preparing', btnColor: '#2C2C2A', btnText: '#FFFFFF' },
  confirmed: { label: 'Iniciar preparación', nextStatus: 'preparing', btnColor: '#2C2C2A', btnText: '#FFFFFF' },
  preparing: { label: 'Listo',               nextStatus: 'ready',     btnColor: '#639922', btnText: '#FFFFFF' },
  ready:     { label: 'Entregar',            nextStatus: 'delivered', btnColor: '#085041', btnText: '#FFFFFF' },
  cancelled: null,
  delivered: null,
}

function elapsedTime(createdAt: string): { display: string; isOverdue: boolean } {
  const seconds = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  const mins    = Math.floor(seconds / 60)
  const secs    = seconds % 60
  return { display: `${mins}:${String(secs).padStart(2, '0')}`, isOverdue: mins >= 15 }
}

function shortId(id: string) { return `#ORD-${id.slice(-4).toUpperCase()}` }

function OrderCard({
  order, onAction, tick,
}: {
  order: Order; onAction: (orderId: string, nextStatus: OrderStatus) => Promise<void>; tick: number
}) {
  const cfg    = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
  const action = ACTION_CONFIG[order.status]
  const { display: elapsed, isOverdue } = elapsedTime(order.created_at)
  const [loading, setLoading] = useState(false)

  async function handlePress() {
    if (!action) return
    setLoading(true)
    try { await onAction(order.id, action.nextStatus) }
    catch { Alert.alert('Error', 'No se pudo actualizar el pedido') }
    finally { setLoading(false) }
  }

  const tableLabel = order.table_number ? `MESA ${order.table_number}` : 'SIN MESA'

  return (
    <View style={[styles.card, { borderColor: isOverdue ? '#E24B4A' : cfg.borderColor }]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.tableLabel}>{tableLabel}</Text>
          <Text style={styles.orderId}>{shortId(order.id)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: isOverdue ? '#FCEBEB' : cfg.badgeColor }]}>
          <Text style={[styles.badgeText, { color: isOverdue ? '#A32D2D' : cfg.badgeText }]}>
            {isOverdue ? 'Retrasado' : cfg.label}
          </Text>
        </View>
      </View>

      <View style={styles.itemsList}>
        {order.order_items.map(item => (
          <View key={item.id}>
            <View style={styles.itemRow}>
              <View style={styles.itemQtyBubble}>
                <Text style={styles.itemQty}>{item.quantity}</Text>
              </View>
              <Text style={styles.itemName}>{item.products?.name}</Text>
            </View>
            {item.notes ? (
              <View style={styles.itemNote}>
                <Text style={styles.itemNoteText}>{item.notes}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {order.notes ? (
        <View style={styles.orderNote}>
          <Text style={styles.orderNoteLabel}>NOTA DE BARRA</Text>
          <Text style={styles.orderNoteText}>{order.notes}</Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.timerWrap}>
          {isOverdue
            ? <AlertTriangle size={14} color="#E24B4A" />
            : order.status === 'ready'
            ? <CheckCircle2 size={14} color="#3B6D11" />
            : <Clock size={14} color="#854F0B" />
          }
          <Text style={[
            styles.timerText,
            isOverdue && { color: '#E24B4A' },
            order.status === 'ready' && { color: '#3B6D11' },
          ]}>
            {elapsed}
          </Text>
        </View>

        {action && (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: isOverdue ? '#E24B4A' : action.btnColor },
              loading && styles.actionBtnDisabled,
            ]}
            onPress={handlePress}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={[styles.actionBtnText, { color: action.btnText }]}>
                  {isOverdue ? 'FINALIZAR AHORA' : action.label.toUpperCase()}
                </Text>
            }
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

export default function OrdersScreen() {
  const insets               = useSafeAreaInsets()
  const { session, profile } = useAuthStore()
  const [orders,     setOrders]     = useState<Order[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tick,       setTick]       = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, notes, created_at, table_number,
          order_items (id, quantity, notes, products (name))
        `)
        .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
        .order('created_at', { ascending: true })

      if (error) throw error
      setOrders((data as unknown as Order[]) ?? [])
    } catch (err) {
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()

    const channelName = `kitchen-orders-${Math.random().toString(36).slice(2)}`

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = payload.new as Order
        // ✅ Actualización local inmediata
        setOrders(prev =>
          prev
            .map(o => o.id === updated.id ? { ...o, status: updated.status } : o)
            .filter(o => !['delivered', 'cancelled'].includes(o.status))
        )
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchOrders()
      })
      .subscribe((status) => {
        console.log('Kitchen channel status:', status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  async function handleAction(orderId: string, nextStatus: OrderStatus) {
    // ✅ Actualización local inmediata — UI responde al instante
    setOrders(prev =>
      prev
        .map(o => o.id === orderId ? { ...o, status: nextStatus } : o)
        .filter(o => !['delivered', 'cancelled'].includes(o.status))
    )

    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (error) {
      // ❌ Si falla, revertir desde la DB
      fetchOrders()
      throw error
    }

    // Notificar al cliente
    if (nextStatus === 'ready' || nextStatus === 'preparing') {
      const { data: orderData } = await supabase
        .from('orders')
        .select('user_id')
        .eq('id', orderId)
        .single()

      if (orderData?.user_id) {
        const msgMap: Partial<Record<OrderStatus, { title: string; body: string }>> = {
          preparing: {
            title: '👨‍🍳 Tu pedido está en preparación',
            body:  `Tu pedido ${shortId(orderId)} ya está siendo preparado`,
          },
          ready: {
            title: '🔔 ¡Tu pedido está listo!',
            body:  `Tu pedido ${shortId(orderId)} está listo para recoger`,
          },
        }
        const msg = msgMap[nextStatus]
        if (msg) {
          await supabase.from('notifications').insert({
            user_id: orderData.user_id,
            title:   msg.title,
            message: msg.body,
            type:    'order',
            is_read: false,
          })
        }
      }
    }
  }

  const pendingCount    = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length
  const inProgressCount = orders.filter(o => o.status === 'preparing').length
  const readyCount      = orders.filter(o => o.status === 'ready').length

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerBrand}>CAFETERÍA LUNA</Text>
          <Text style={styles.headerSection}>COLA DE COCINA</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerStat}>
            {orders.length > 0
              ? `${orders.length} pedido${orders.length !== 1 ? 's' : ''} activo${orders.length !== 1 ? 's' : ''}`
              : 'Sin pedidos'}
          </Text>
          <Bell size={20} color="#5F5E5A" style={{ marginLeft: 16 }} />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4B3621" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <CheckCircle2 size={48} color="#97C459" />
          <Text style={styles.emptyTitle}>Todo al día</Text>
          <Text style={styles.emptySubtitle}>No hay pedidos pendientes</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => o.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchOrders() }}
              tintColor="#4B3621"
              colors={["#4B3621"]}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <OrderCard order={item} onAction={handleAction} tick={tick} />
            </View>
          )}
        />
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.footerStat}>
          <View style={[styles.dot, { backgroundColor: '#378ADD' }]} />
          <Text style={styles.footerStatLabel}>NUEVOS</Text>
          <Text style={styles.footerStatNum}>{String(pendingCount).padStart(2, '0')}</Text>
        </View>
        <View style={styles.footerStat}>
          <View style={[styles.dot, { backgroundColor: '#EF9F27' }]} />
          <Text style={styles.footerStatLabel}>EN PREP.</Text>
          <Text style={styles.footerStatNum}>{String(inProgressCount).padStart(2, '0')}</Text>
        </View>
        <View style={styles.footerStat}>
          <View style={[styles.dot, { backgroundColor: '#639922' }]} />
          <Text style={styles.footerStatLabel}>LISTOS</Text>
          <Text style={styles.footerStatNum}>{String(readyCount).padStart(2, '0')}</Text>
        </View>
        <View style={styles.footerDivider} />
        <Text style={styles.footerProfile}>
          {profile?.full_name ?? 'Cocina'} · {profile?.role ?? ''}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#F5F3EE' },
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5, borderBottomColor: '#D3D1C7',
  },
  headerBrand:   { fontSize: 16, fontWeight: '700', color: '#2C2C2A', letterSpacing: 1 },
  headerSection: { fontSize: 11, color: '#888780', letterSpacing: 1.5, marginTop: 1 },
  headerRight:   { flexDirection: 'row', alignItems: 'center' },
  headerStat:    { fontSize: 13, color: '#5F5E5A' },
  grid:          { padding: 12, paddingBottom: 80 },
  row:           { gap: 12, marginBottom: 12 },
  cardWrap:      { flex: 1 },
  card:          { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 2, padding: 14, flex: 1 },
  cardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  tableLabel:    { fontSize: 10, fontWeight: '600', color: '#888780', letterSpacing: 1 },
  orderId:       { fontSize: 22, fontWeight: '700', color: '#2C2C2A', marginTop: 2 },
  badge:         { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText:     { fontSize: 11, fontWeight: '600' },
  itemsList:     { gap: 6, marginBottom: 10 },
  itemRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemQtyBubble: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#F1EFE8', alignItems: 'center', justifyContent: 'center' },
  itemQty:       { fontSize: 12, fontWeight: '600', color: '#444441' },
  itemName:      { fontSize: 14, color: '#2C2C2A', flex: 1 },
  itemNote:      { marginLeft: 30, marginTop: 2, marginBottom: 4, backgroundColor: '#FCEBEB', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  itemNoteText:  { fontSize: 11, color: '#A32D2D', fontStyle: 'italic' },
  orderNote:     { backgroundColor: '#F5F3EE', borderRadius: 6, padding: 10, marginBottom: 10, borderLeftWidth: 2, borderLeftColor: '#D3D1C7' },
  orderNoteLabel: { fontSize: 9, fontWeight: '700', color: '#888780', letterSpacing: 1, marginBottom: 4 },
  orderNoteText:  { fontSize: 12, color: '#5F5E5A', lineHeight: 17 },
  cardFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  timerWrap:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timerText:     { fontSize: 13, fontWeight: '600', color: '#854F0B', fontVariant: ['tabular-nums'] },
  actionBtn:     { borderRadius: 6, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', minWidth: 90 },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  emptyTitle:    { fontSize: 18, fontWeight: '600', color: '#2C2C2A' },
  emptySubtitle: { fontSize: 14, color: '#888780' },
  footer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5, borderTopColor: '#D3D1C7',
    gap: 16,
  },
  footerStat:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:             { width: 8, height: 8, borderRadius: 4 },
  footerStatLabel: { fontSize: 10, fontWeight: '600', color: '#888780', letterSpacing: 0.8 },
  footerStatNum:   { fontSize: 18, fontWeight: '700', color: '#2C2C2A', marginLeft: 2 },
  footerDivider:   { flex: 1 },
  footerProfile:   { fontSize: 12, color: '#888780' },
})