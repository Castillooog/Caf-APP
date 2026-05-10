import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  TrendingUp, TrendingDown, Users, ShoppingBag,
  DollarSign, Clock, Package, ChevronDown, Calendar,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
} from 'lucide-react-native'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useauthstore'

const { width: SCREEN_W } = Dimensions.get('window')

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month' | 'year'

type OrderItem = {
  id: string
  quantity: number
  unit_price: number
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
  delivered_at: string | null
  order_items: OrderItem[]
}

type MetricCard = {
  title: string
  value: string
  change: number
  changeLabel: string
  icon: React.FC<any>
  color: string
  bg: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPeriodDates(period: Period) {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  switch (period) {
    case 'today':
      return { start: start.toISOString(), end: now.toISOString() }
    case 'week':
      start.setDate(start.getDate() - 7)
      return { start: start.toISOString(), end: now.toISOString() }
    case 'month':
      start.setMonth(start.getMonth() - 1)
      return { start: start.toISOString(), end: now.toISOString() }
    case 'year':
      start.setFullYear(start.getFullYear() - 1)
      return { start: start.toISOString(), end: now.toISOString() }
  }
}

function getPreviousPeriodDates(period: Period) {
  const now = new Date()
  let start: Date, end: Date

  switch (period) {
    case 'today':
      start = new Date(now)
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      end = new Date(start)
      end.setHours(23, 59, 59, 999)
      return { start: start.toISOString(), end: end.toISOString() }
    case 'week':
      start = new Date(now)
      start.setDate(start.getDate() - 14)
      end = new Date(now)
      end.setDate(end.getDate() - 7)
      return { start: start.toISOString(), end: end.toISOString() }
    case 'month':
      start = new Date(now)
      start.setMonth(start.getMonth() - 2)
      end = new Date(now)
      end.setMonth(end.getMonth() - 1)
      return { start: start.toISOString(), end: end.toISOString() }
    case 'year':
      start = new Date(now)
      start.setFullYear(start.getFullYear() - 2)
      end = new Date(now)
      end.setFullYear(end.getFullYear() - 1)
      return { start: start.toISOString(), end: end.toISOString() }
  }
}

function formatChange(val: number): string {
  const sign = val >= 0 ? '+' : ''
  return `${sign}${val.toFixed(1)}%`
}

function groupByHour(orders: Order[]): { label: string; value: number }[] {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    label: `${String(i).padStart(2, '0')}:00`,
    value: 0,
    hour: i,
  }))
  orders.forEach(o => {
    const h = new Date(o.created_at).getHours()
    hours[h].value += o.total
  })
  return hours.filter(h => h.value > 0)
}

function groupByDay(orders: Order[]): { label: string; value: number }[] {
  const map = new Map<string, number>()
  orders.forEach(o => {
    const d = new Date(o.created_at).toLocaleDateString('es-CO', { weekday: 'short' })
    map.set(d, (map.get(d) || 0) + o.total)
  })
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
}

function groupByMonth(orders: Order[]): { label: string; value: number }[] {
  const map = new Map<string, number>()
  orders.forEach(o => {
    const d = new Date(o.created_at).toLocaleDateString('es-CO', { month: 'short' })
    map.set(d, (map.get(d) || 0) + o.total)
  })
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
}

// ─── Componente: Barra simple ─────────────────────────────────────────────────

function SimpleBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <View style={chart.container}>
      {data.map((item, i) => (
        <View key={i} style={chart.barWrap}>
          <View style={[chart.bar, { height: Math.max((item.value / max) * 80, 4), backgroundColor: color }]} />
          <Text style={chart.barLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}

const chart = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100, paddingTop: 10 },
  barWrap: { flex: 1, alignItems: 'center' },
  bar: { width: '100%', borderRadius: 3, minHeight: 4 },
  barLabel: { fontFamily: Font.sans, fontSize: 9, color: Colors.latte, marginTop: 4, textAlign: 'center' },
})

// ─── Componente: Tarjeta de métrica ─────────────────────────────────────────

function MetricCardComponent({ metric }: { metric: MetricCard }) {
  const Icon = metric.icon
  const isPositive = metric.change >= 0
  return (
    <View style={[metricStyles.card, { backgroundColor: metric.bg }]}>
      <View style={metricStyles.top}>
        <View style={[metricStyles.iconWrap, { backgroundColor: metric.color + '20' }]}>
          <Icon size={18} color={metric.color} />
        </View>
        <View style={[metricStyles.badge, { backgroundColor: isPositive ? '#EAF3DE' : '#FCEBEB' }]}>
          {isPositive
            ? <ArrowUpRight size={10} color="#3B6D11" />
            : <ArrowDownRight size={10} color="#A32D2D" />}
          <Text style={[metricStyles.badgeText, { color: isPositive ? '#3B6D11' : '#A32D2D' }]}>
            {formatChange(metric.change)}
          </Text>
        </View>
      </View>
      <Text style={metricStyles.value}>{metric.value}</Text>
      <Text style={metricStyles.title}>{metric.title}</Text>
      <Text style={metricStyles.sub}>{metric.changeLabel}</Text>
    </View>
  )
}

const metricStyles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: 14,
    flex: 1,
    minWidth: SCREEN_W / 2 - 28,
    ...Shadow.sm,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  iconWrap: {
    width: 36, height: 36, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { fontFamily: Font.sans, fontSize: 11, fontWeight: '600' },
  value: { fontFamily: Font.serif, fontSize: 22, fontWeight: '700', color: Colors.espresso, marginBottom: 2 },
  title: { fontFamily: Font.sans, fontSize: 12, fontWeight: '600', color: Colors.mocha },
  sub: { fontFamily: Font.sans, fontSize: 10, color: Colors.latte, marginTop: 2 },
})

// ─── Componente: Tabla de productos top ───────────────────────────────────────

function TopProductsTable({ items }: { items: { name: string; qty: number; revenue: number }[] }) {
  return (
    <View style={tableStyles.container}>
      <View style={tableStyles.headerRow}>
        <Text style={[tableStyles.headerText, { flex: 2 }]}>Producto</Text>
        <Text style={[tableStyles.headerText, { width: 50, textAlign: 'center' }]}>Cant.</Text>
        <Text style={[tableStyles.headerText, { width: 90, textAlign: 'right' }]}>Ingresos</Text>
      </View>
      {items.slice(0, 5).map((item, i) => (
        <View key={i} style={tableStyles.row}>
          <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[tableStyles.rank, { backgroundColor: i < 3 ? Colors.terra + '15' : Colors.creamDark }]}>
              <Text style={[tableStyles.rankText, { color: i < 3 ? Colors.terra : Colors.latte }]}>{i + 1}</Text>
            </View>
            <Text style={tableStyles.name} numberOfLines={1}>{item.name}</Text>
          </View>
          <Text style={[tableStyles.cell, { width: 50, textAlign: 'center' }]}>{item.qty}</Text>
          <Text style={[tableStyles.cell, { width: 90, textAlign: 'right', fontWeight: '700', color: Colors.espresso }]}>
            {formatCOP(item.revenue)}
          </Text>
        </View>
      ))}
    </View>
  )
}

const tableStyles = StyleSheet.create({
  container: { gap: 2 },
  headerRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.creamDeep },
  headerText: { fontFamily: Font.sans, fontSize: 10, fontWeight: '700', color: Colors.latte, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.card, borderRadius: Radius.md,
    marginBottom: 4,
  },
  rank: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: Font.sans, fontSize: 11, fontWeight: '700' },
  name: { fontFamily: Font.sans, fontSize: 13, color: Colors.espresso, flex: 1 },
  cell: { fontFamily: Font.sans, fontSize: 12, color: Colors.mocha },
})

// ─── Componente: Estado de pedidos ──────────────────────────────────────────

function OrderStatusBreakdown({ orders }: { orders: Order[] }) {
  const counts = useMemo(() => {
    const total = orders.length
    return {
      delivered: orders.filter(o => o.status === 'delivered').length,
      ready: orders.filter(o => o.status === 'ready').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      pending: orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      total,
    }
  }, [orders])

  const bars = [
    { label: 'Entregados', count: counts.delivered, color: Colors.sage, bg: Colors.sageDust },
    { label: 'Listos', count: counts.ready, color: '#3B6D11', bg: '#EAF3DE' },
    { label: 'En prep.', count: counts.preparing, color: '#854F0B', bg: '#FAEEDA' },
    { label: 'Pendientes', count: counts.pending, color: '#185FA5', bg: '#E6F1FB' },
    { label: 'Cancelados', count: counts.cancelled, color: '#A32D2D', bg: '#FCEBEB' },
  ]

  return (
    <View style={statusStyles.container}>
      {bars.map((bar, i) => {
        const pct = counts.total > 0 ? (bar.count / counts.total) * 100 : 0
        return (
          <View key={i} style={statusStyles.row}>
            <View style={[statusStyles.dot, { backgroundColor: bar.color }]} />
            <Text style={statusStyles.label}>{bar.label}</Text>
            <View style={statusStyles.barWrap}>
              <View style={[statusStyles.bar, { width: `${Math.max(pct, 4)}%`, backgroundColor: bar.color }]} />
            </View>
            <Text style={statusStyles.count}>{bar.count}</Text>
          </View>
        )
      })}
    </View>
  )
}

const statusStyles = StyleSheet.create({
  container: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontFamily: Font.sans, fontSize: 12, color: Colors.mocha, width: 70 },
  barWrap: { flex: 1, height: 8, backgroundColor: Colors.creamDark, borderRadius: 4, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4 },
  count: { fontFamily: Font.sans, fontSize: 12, fontWeight: '700', color: Colors.espresso, width: 30, textAlign: 'right' },
})

// ─── Pantalla principal ─────────────────────────────────────────────────────

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets()
  const { profile } = useAuthStore()
  const [period, setPeriod] = useState<Period>('today')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showPeriodMenu, setShowPeriodMenu] = useState(false)

  const [currentOrders, setCurrentOrders] = useState<Order[]>([])
  const [previousOrders, setPreviousOrders] = useState<Order[]>([])

  const PERIOD_LABELS: Record<Period, string> = {
    today: 'Hoy',
    week: 'Esta semana',
    month: 'Este mes',
    year: 'Este año',
  }

  const fetchData = useCallback(async () => {
    try {
      const { start, end } = getPeriodDates(period)
      const prev = getPreviousPeriodDates(period)

      // Pedidos del período actual
      const { data: currData, error: currErr } = await supabase
        .from('orders')
        .select(`
          id, status, total, payment_status, payment_method,
          table_number, created_at, delivered_at,
          order_items(id, quantity, unit_price, products(name))
        `)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })

      if (currErr) throw currErr

      // Pedidos del período anterior (para comparación)
      const { data: prevData, error: prevErr } = await supabase
        .from('orders')
        .select(`
          id, status, total, payment_status, payment_method,
          table_number, created_at, delivered_at,
          order_items(id, quantity, unit_price, products(name))
        `)
        .gte('created_at', prev.start)
        .lte('created_at', prev.end)

      if (prevErr) throw prevErr

      setCurrentOrders((currData as unknown as Order[]) ?? [])
      setPreviousOrders((prevData as unknown as Order[]) ?? [])
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Cálculo de métricas ──────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const currPaid = currentOrders.filter(o => o.payment_status === 'paid')
    const prevPaid = previousOrders.filter(o => o.payment_status === 'paid')

    const revenue = currPaid.reduce((s, o) => s + o.total, 0)
    const prevRevenue = prevPaid.reduce((s, o) => s + o.total, 0)
    const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0

    const ordersCount = currentOrders.length
    const prevOrdersCount = previousOrders.length
    const ordersChange = prevOrdersCount > 0 ? ((ordersCount - prevOrdersCount) / prevOrdersCount) * 100 : 0

    const avgTicket = currPaid.length > 0 ? revenue / currPaid.length : 0
    const prevAvgTicket = prevPaid.length > 0 ? prevRevenue / prevPaid.length : 0
    const ticketChange = prevAvgTicket > 0 ? ((avgTicket - prevAvgTicket) / prevAvgTicket) * 100 : 0

    const deliveredCount = currentOrders.filter(o => o.status === 'delivered').length
    const prevDelivered = previousOrders.filter(o => o.status === 'delivered').length
    const deliveredChange = prevDelivered > 0 ? ((deliveredCount - prevDelivered) / prevDelivered) * 100 : 0

    return [
      {
        title: 'Ingresos',
        value: formatCOP(revenue),
        change: revenueChange,
        changeLabel: `vs ${PERIOD_LABELS[period].toLowerCase()} anterior`,
        icon: DollarSign,
        color: Colors.terra,
        bg: Colors.terraDust,
      },
      {
        title: 'Pedidos',
        value: String(ordersCount),
        change: ordersChange,
        changeLabel: `vs período anterior`,
        icon: ShoppingBag,
        color: '#185FA5',
        bg: '#E6F1FB',
      },
      {
        title: 'Ticket promedio',
        value: formatCOP(Math.round(avgTicket)),
        change: ticketChange,
        changeLabel: `vs período anterior`,
        icon: TrendingUp,
        color: '#3B6D11',
        bg: '#EAF3DE',
      },
      {
        title: 'Entregados',
        value: String(deliveredCount),
        change: deliveredChange,
        changeLabel: `vs período anterior`,
        icon: Package,
        color: Colors.sage,
        bg: Colors.sageDust,
      },
    ] as MetricCard[]
  }, [currentOrders, previousOrders, period])

  // ─── Productos más vendidos ─────────────────────────────────────────────────

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>()
    currentOrders.forEach(order => {
      order.order_items?.forEach(item => {
        const name = item.products?.name || 'Producto desconocido'
        const existing = map.get(name)
        if (existing) {
          existing.qty += item.quantity
          existing.revenue += item.unit_price * item.quantity
        } else {
          map.set(name, { name, qty: item.quantity, revenue: item.unit_price * item.quantity })
        }
      })
    })
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  }, [currentOrders])

  // ─── Datos para gráfico ───────────────────────────────────────────────────

  const chartData = useMemo(() => {
    if (period === 'today') return groupByHour(currentOrders)
    if (period === 'week') return groupByDay(currentOrders)
    return groupByMonth(currentOrders)
  }, [currentOrders, period])

  // ─── Métodos de pago ──────────────────────────────────────────────────────

  const paymentMethods = useMemo(() => {
    const paid = currentOrders.filter(o => o.payment_status === 'paid')
    const map = new Map<string, { method: string; count: number; amount: number }>()
    paid.forEach(o => {
      const method = o.payment_method || 'otro'
      const label = method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : method === 'transfer' ? 'Transferencia' : 'Otro'
      const existing = map.get(method)
      if (existing) {
        existing.count += 1
        existing.amount += o.total
      } else {
        map.set(method, { method: label, count: 1, amount: o.total })
      }
    })
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount)
  }, [currentOrders])

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.terra} />
        <Text style={{ marginTop: 12, fontFamily: Font.sans, color: Colors.mocha }}>Cargando métricas...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={Colors.terra} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Panel de Control</Text>
          <Text style={styles.headerSub}>Cafetería Luna · {profile?.full_name || 'Administrador'}</Text>
        </View>
        <TouchableOpacity
          style={styles.periodBtn}
          onPress={() => setShowPeriodMenu(!showPeriodMenu)}
          activeOpacity={0.8}
        >
          <Calendar size={14} color={Colors.mocha} />
          <Text style={styles.periodText}>{PERIOD_LABELS[period]}</Text>
          <ChevronDown size={14} color={Colors.mocha} />
        </TouchableOpacity>
      </View>

      {/* Menú de período */}
      {showPeriodMenu && (
        <View style={styles.periodMenu}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodOption, period === p && styles.periodOptionActive]}
              onPress={() => { setPeriod(p); setShowPeriodMenu(false); setLoading(true); }}
            >
              <Text style={[styles.periodOptionText, period === p && styles.periodOptionTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Métricas principales */}
      <View style={styles.metricsGrid}>
        {metrics.map((m, i) => (
          <MetricCardComponent key={i} metric={m} />
        ))}
      </View>

      {/* Gráfico de ingresos */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <BarChart3 size={16} color={Colors.espresso} />
          <Text style={styles.sectionTitle}>Ingresos por {period === 'today' ? 'hora' : period === 'week' ? 'día' : 'mes'}</Text>
        </View>
        <View style={styles.card}>
          {chartData.length > 0 ? (
            <SimpleBarChart data={chartData} color={Colors.terra} />
          ) : (
            <Text style={styles.emptyText}>Sin datos para este período</Text>
          )}
        </View>
      </View>

      {/* Estado de pedidos */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <PieChart size={16} color={Colors.espresso} />
          <Text style={styles.sectionTitle}>Estado de pedidos</Text>
        </View>
        <View style={styles.card}>
          <OrderStatusBreakdown orders={currentOrders} />
        </View>
      </View>

      {/* Productos top */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <TrendingUp size={16} color={Colors.espresso} />
          <Text style={styles.sectionTitle}>Productos más vendidos</Text>
        </View>
        <View style={styles.card}>
          {topProducts.length > 0 ? (
            <TopProductsTable items={topProducts} />
          ) : (
            <Text style={styles.emptyText}>Sin ventas registradas</Text>
          )}
        </View>
      </View>

      {/* Métodos de pago */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <DollarSign size={16} color={Colors.espresso} />
          <Text style={styles.sectionTitle}>Métodos de pago</Text>
        </View>
        <View style={styles.card}>
          {paymentMethods.length > 0 ? (
            <View style={paymentStyles.container}>
              {paymentMethods.map((pm, i) => {
                const totalPaid = currentOrders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + o.total, 0)
                const pct = totalPaid > 0 ? (pm.amount / totalPaid) * 100 : 0
                return (
                  <View key={i} style={paymentStyles.row}>
                    <View style={paymentStyles.left}>
                      <Text style={paymentStyles.method}>{pm.method}</Text>
                      <Text style={paymentStyles.count}>{pm.count} transacciones</Text>
                    </View>
                    <View style={paymentStyles.right}>
                      <Text style={paymentStyles.amount}>{formatCOP(pm.amount)}</Text>
                      <Text style={paymentStyles.pct}>{pct.toFixed(1)}%</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          ) : (
            <Text style={styles.emptyText}>Sin pagos registrados</Text>
          )}
        </View>
      </View>

      {/* Resumen rápido */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Clock size={16} color={Colors.espresso} />
          <Text style={styles.sectionTitle}>Resumen operativo</Text>
        </View>
        <View style={styles.card}>
          <View style={summaryStyles.grid}>
            <SummaryItem
              label="Tiempo promedio de preparación"
              value={calcAvgPrepTime(currentOrders)}
              icon={Clock}
            />
            <SummaryItem
              label="Mesas atendidas"
              value={String(new Set(currentOrders.map(o => o.table_number).filter(Boolean)).size)}
              icon={Users}
            />
            <SummaryItem
              label="Tasa de conversión"
              value={calcConversionRate(currentOrders)}
              icon={TrendingUp}
            />
            <SummaryItem
              label="Cancelaciones"
              value={`${currentOrders.filter(o => o.status === 'cancelled').length} (${calcCancelRate(currentOrders)})`}
              icon={TrendingDown}
            />
          </View>
        </View>
      </View>

      <View style={{ height: insets.bottom + 20 }} />
    </ScrollView>
  )
}

// ─── Helpers de resumen ─────────────────────────────────────────────────────

function calcAvgPrepTime(orders: Order[]): string {
  const completed = orders.filter(o => o.delivered_at && o.created_at)
  if (completed.length === 0) return 'N/A'
  const totalMinutes = completed.reduce((sum, o) => {
    const created = new Date(o.created_at).getTime()
    const delivered = new Date(o.delivered_at!).getTime()
    return sum + (delivered - created) / 60000
  }, 0)
  const avg = Math.round(totalMinutes / completed.length)
  return `${avg} min`
}

function calcConversionRate(orders: Order[]): string {
  const total = orders.length
  const paid = orders.filter(o => o.payment_status === 'paid').length
  if (total === 0) return '0%'
  return `${((paid / total) * 100).toFixed(0)}%`
}

function calcCancelRate(orders: Order[]): string {
  const total = orders.length
  const cancelled = orders.filter(o => o.status === 'cancelled').length
  if (total === 0) return '0%'
  return `${((cancelled / total) * 100).toFixed(0)}%`
}

function SummaryItem({ label, value, icon: Icon }: { label: string; value: string; icon: React.FC<any> }) {
  return (
    <View style={summaryStyles.item}>
      <Icon size={16} color={Colors.latte} />
      <Text style={summaryStyles.value}>{value}</Text>
      <Text style={summaryStyles.label}>{label}</Text>
    </View>
  )
}

const summaryStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: {
    flex: 1, minWidth: SCREEN_W / 2 - 40,
    backgroundColor: Colors.creamDark, borderRadius: Radius.md,
    padding: 12, alignItems: 'center', gap: 4,
  },
  value: { fontFamily: Font.serif, fontSize: 16, fontWeight: '700', color: Colors.espresso },
  label: { fontFamily: Font.sans, fontSize: 10, color: Colors.latte, textAlign: 'center' },
})

const paymentStyles = StyleSheet.create({
  container: { gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left: { gap: 2 },
  method: { fontFamily: Font.sans, fontSize: 14, fontWeight: '600', color: Colors.espresso },
  count: { fontFamily: Font.sans, fontSize: 11, color: Colors.latte },
  right: { alignItems: 'flex-end', gap: 2 },
  amount: { fontFamily: Font.serif, fontSize: 15, fontWeight: '700', color: Colors.espresso },
  pct: { fontFamily: Font.sans, fontSize: 11, color: Colors.sage, fontWeight: '600' },
})

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  scroll: { padding: 16, gap: 20 },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitle: { fontFamily: Font.serif, fontSize: 26, fontWeight: '700', color: Colors.espresso },
  headerSub: { fontFamily: Font.sans, fontSize: 12, color: Colors.latte, marginTop: 2 },
  periodBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.card, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.creamDeep,
    ...Shadow.sm,
  },
  periodText: { fontFamily: Font.sans, fontSize: 12, fontWeight: '600', color: Colors.mocha },
  periodMenu: {
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.creamDeep,
    ...Shadow.card, overflow: 'hidden',
  },
  periodOption: { paddingHorizontal: 16, paddingVertical: 12 },
  periodOptionActive: { backgroundColor: Colors.terraDust },
  periodOptionText: { fontFamily: Font.sans, fontSize: 14, color: Colors.mocha },
  periodOptionTextActive: { color: Colors.terra, fontWeight: '700' },
  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 10,
  },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontFamily: Font.sans, fontSize: 14, fontWeight: '700', color: Colors.espresso },
  card: {
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.creamDeep,
    padding: 16, ...Shadow.sm,
  },
  emptyText: { fontFamily: Font.sans, fontSize: 13, color: Colors.latte, textAlign: 'center', paddingVertical: 20 },
})