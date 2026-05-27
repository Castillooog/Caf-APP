import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import {
  TrendingUp, TrendingDown, Users, ShoppingBag,
  DollarSign, Clock, Package, ChevronDown, Calendar,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
  FileText, RefreshCw,
} from 'lucide-react-native'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useauthstore'


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
  change: number | null
  changeLabel: string
  icon: React.FC<any>
  color: string
  bg: string
  border: string
}

// ─── Helpers de fechas ────────────────────────────────────────────────────────

function getPeriodDates(period: Period) {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  switch (period) {
    case 'today': return { start: start.toISOString(), end: now.toISOString() }
    case 'week':  start.setDate(start.getDate() - 7);   return { start: start.toISOString(), end: now.toISOString() }
    case 'month': start.setMonth(start.getMonth() - 1); return { start: start.toISOString(), end: now.toISOString() }
    case 'year':  start.setFullYear(start.getFullYear() - 1); return { start: start.toISOString(), end: now.toISOString() }
  }
}

function getPreviousPeriodDates(period: Period) {
  const now = new Date()
  let start: Date, end: Date
  switch (period) {
    case 'today':
      start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0)
      end = new Date(start); end.setHours(23, 59, 59, 999)
      return { start: start.toISOString(), end: end.toISOString() }
    case 'week':
      start = new Date(now); start.setDate(start.getDate() - 14)
      end = new Date(now); end.setDate(end.getDate() - 7)
      return { start: start.toISOString(), end: end.toISOString() }
    case 'month': {
      // Usar día 1 para evitar desborde de fin de mes (ej: 31 enero → 31 marzo no existe)
      const y = now.getFullYear(), m = now.getMonth()
      start = new Date(y, m - 2, 1, 0, 0, 0, 0)
      end   = new Date(y, m - 1, 1, 0, 0, 0, 0)
      return { start: start.toISOString(), end: end.toISOString() }
    }
    case 'year':
      start = new Date(now); start.setFullYear(start.getFullYear() - 2)
      end = new Date(now); end.setFullYear(end.getFullYear() - 1)
      return { start: start.toISOString(), end: end.toISOString() }
  }
}

function formatChange(val: number, hasBase = true): string {
  if (!hasBase) return '—'
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy', week: 'Esta semana', month: 'Este mes', year: 'Este año',
}

function groupByHour(orders: Order[]) {
  const hours = Array.from({ length: 24 }, (_, i) => ({ label: `${String(i).padStart(2, '0')}h`, value: 0 }))
  orders.forEach(o => { hours[new Date(o.created_at).getHours()].value += o.total })
  return hours.filter(h => h.value > 0)
}

function groupByDay(orders: Order[]) {
  const map = new Map<string, number>()
  orders.forEach(o => {
    const d = new Date(o.created_at).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })
    map.set(d, (map.get(d) || 0) + o.total)
  })
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
}

function groupByMonth(orders: Order[]) {
  const map = new Map<string, number>()
  orders.forEach(o => {
    const d = new Date(o.created_at).toLocaleDateString('es-CO', { month: 'short' })
    map.set(d, (map.get(d) || 0) + o.total)
  })
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }))
}

function calcAvgPrepTime(orders: Order[]): string {
  const done = orders.filter(o => o.delivered_at && o.created_at)
  if (!done.length) return 'N/A'
  const avg = done.reduce((s, o) => s + (new Date(o.delivered_at!).getTime() - new Date(o.created_at).getTime()) / 60000, 0) / done.length
  return `${Math.round(avg)} min`
}

function calcConversionRate(orders: Order[]): string {
  if (!orders.length) return '0%'
  return `${((orders.filter(o => o.payment_status === 'paid').length / orders.length) * 100).toFixed(0)}%`
}

function calcCancelRate(orders: Order[]): string {
  if (!orders.length) return '0%'
  return `${((orders.filter(o => o.status === 'cancelled').length / orders.length) * 100).toFixed(0)}%`
}

// ─── Componente: Barra ────────────────────────────────────────────────────────

function SimpleBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <View style={chart.wrap}>
      <View style={chart.bars}>
        {data.map((item, i) => (
          <View key={i} style={chart.barCol}>
            <Text style={chart.barVal}>{item.value > 0 ? formatCOP(item.value).replace('$', '') : ''}</Text>
            <View style={chart.barTrack}>
              <View style={[chart.bar, { height: Math.max((item.value / max) * 100, 4), backgroundColor: color }]} />
            </View>
            <Text style={chart.barLabel} numberOfLines={1}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const chart = StyleSheet.create({
  wrap:     { paddingTop: 8 },
  bars:     { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 140 },
  barCol:   { flex: 1, alignItems: 'center', gap: 3 },
  barVal:   { fontFamily: Font.sans, fontSize: 7, color: Colors.latte, textAlign: 'center' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar:      { width: '100%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontFamily: Font.sans, fontSize: 8, color: Colors.latte, textAlign: 'center', width: '100%' },
})

// ─── Componente: Métrica ──────────────────────────────────────────────────────

function MetricCardComponent({ metric }: { metric: MetricCard }) {
  const { width } = useWindowDimensions()
  const col2 = Math.floor((width - 52) / 2)
  const Icon = metric.icon
  const isPositive = (metric.change ?? 0) >= 0
  const hasChange = metric.change !== null
  return (
    <View style={[mc.card, { backgroundColor: metric.bg, borderColor: metric.border, width: col2 }]}>
      <View style={mc.top}>
        <View style={[mc.iconWrap, { backgroundColor: metric.color + '18' }]}>
          <Icon size={20} color={metric.color} />
        </View>
        <View style={[mc.badge, { backgroundColor: !hasChange ? '#F3F4F6' : isPositive ? '#ECFDF5' : '#FEF2F2' }]}>
          {hasChange && (isPositive
            ? <ArrowUpRight size={10} color="#059669" />
            : <ArrowDownRight size={10} color="#DC2626" />)}
          <Text style={[mc.badgeText, { color: !hasChange ? '#9CA3AF' : isPositive ? '#059669' : '#DC2626' }]}>
            {formatChange(metric.change ?? 0, hasChange)}
          </Text>
        </View>
      </View>
      <Text style={mc.value}>{metric.value}</Text>
      <Text style={mc.title}>{metric.title}</Text>
      <Text style={mc.sub}>{metric.changeLabel}</Text>
    </View>
  )
}

const mc = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 16, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  top:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  iconWrap:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  badgeText: { fontFamily: Font.sans, fontSize: 11, fontWeight: '700' },
  value:     { fontFamily: Font.serif, fontSize: 24, fontWeight: '800', color: Colors.espresso, marginBottom: 2 },
  title:     { fontFamily: Font.sans, fontSize: 13, fontWeight: '700', color: Colors.mocha },
  sub:       { fontFamily: Font.sans, fontSize: 10, color: Colors.latte, marginTop: 3 },
})

// ─── Componente: Top productos ────────────────────────────────────────────────

function TopProductsTable({ items }: { items: { name: string; qty: number; revenue: number }[] }) {
  const MEDAL = ['🥇', '🥈', '🥉']
  return (
    <View style={tp.container}>
      <View style={tp.header}>
        <Text style={[tp.th, { flex: 2 }]}>Producto</Text>
        <Text style={[tp.th, { width: 44, textAlign: 'center' }]}>Und.</Text>
        <Text style={[tp.th, { width: 100, textAlign: 'right' }]}>Ingresos</Text>
      </View>
      {items.slice(0, 7).map((item, i) => (
        <View key={i} style={[tp.row, i % 2 === 0 && tp.rowAlt]}>
          <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {i < 3
              ? <Text style={{ fontSize: 16 }}>{MEDAL[i]}</Text>
              : <View style={tp.rankBubble}><Text style={tp.rankText}>{i + 1}</Text></View>}
            <Text style={tp.name} numberOfLines={1}>{item.name}</Text>
          </View>
          <Text style={[tp.cell, { width: 44, textAlign: 'center', fontWeight: '700' }]}>{item.qty}</Text>
          <Text style={[tp.cell, { width: 100, textAlign: 'right', color: Colors.terra, fontWeight: '700' }]}>
            {formatCOP(item.revenue)}
          </Text>
        </View>
      ))}
    </View>
  )
}

const tp = StyleSheet.create({
  container:  { },
  header:     { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.creamDeep, marginBottom: 4 },
  th:         { fontFamily: Font.sans, fontSize: 10, fontWeight: '800', color: Colors.latte, textTransform: 'uppercase', letterSpacing: 0.8 },
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 8 },
  rowAlt:     { backgroundColor: Colors.creamDark + '60' },
  rankBubble: { width: 22, height: 22, borderRadius: 6, backgroundColor: Colors.creamDark, alignItems: 'center', justifyContent: 'center' },
  rankText:   { fontFamily: Font.sans, fontSize: 11, fontWeight: '700', color: Colors.latte },
  name:       { fontFamily: Font.sans, fontSize: 13, color: Colors.espresso, flex: 1 },
  cell:       { fontFamily: Font.sans, fontSize: 12, color: Colors.mocha },
})

// ─── Componente: Estado pedidos ───────────────────────────────────────────────

function OrderStatusBreakdown({ orders }: { orders: Order[] }) {
  const counts = useMemo(() => {
    const total = orders.length
    return {
      delivered: orders.filter(o => o.status === 'delivered').length,
      ready:     orders.filter(o => o.status === 'ready').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      pending:   orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      total,
    }
  }, [orders])

  const bars = [
    { label: 'Entregados',  count: counts.delivered, color: '#10B981', bg: '#ECFDF5' },
    { label: 'Listos',      count: counts.ready,     color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Preparando',  count: counts.preparing, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Pendientes',  count: counts.pending,   color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'Cancelados',  count: counts.cancelled, color: '#EF4444', bg: '#FEF2F2' },
  ]

  return (
    <View style={st.container}>
      {bars.map((bar, i) => {
        const pct = counts.total > 0 ? (bar.count / counts.total) * 100 : 0
        return (
          <View key={i} style={st.row}>
            <View style={[st.labelWrap, { backgroundColor: bar.bg }]}>
              <View style={[st.dot, { backgroundColor: bar.color }]} />
              <Text style={st.label}>{bar.label}</Text>
            </View>
            <View style={st.barWrap}>
              <View style={[st.bar, { width: `${Math.max(pct, 2)}%`, backgroundColor: bar.color }]} />
            </View>
            <Text style={[st.count, { color: bar.color }]}>{bar.count}</Text>
            <Text style={st.pct}>{pct.toFixed(0)}%</Text>
          </View>
        )
      })}
    </View>
  )
}

const st = StyleSheet.create({
  container: { gap: 10 },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  labelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, width: 110 },
  dot:       { width: 7, height: 7, borderRadius: 3.5 },
  label:     { fontFamily: Font.sans, fontSize: 11, fontWeight: '600', color: Colors.espresso },
  barWrap:   { flex: 1, height: 10, backgroundColor: Colors.creamDark, borderRadius: 5, overflow: 'hidden' },
  bar:       { height: '100%', borderRadius: 5 },
  count:     { fontFamily: Font.sans, fontSize: 14, fontWeight: '800', width: 28, textAlign: 'right' },
  pct:       { fontFamily: Font.sans, fontSize: 10, color: Colors.latte, width: 32, textAlign: 'right' },
})

// ─── Componente: Item de resumen ──────────────────────────────────────────────

function SummaryItem({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.FC<any>; color: string }) {
  const { width } = useWindowDimensions()
  const col2 = Math.floor((width - 52) / 2)
  return (
    <View style={[su.item, { borderColor: color + '30', backgroundColor: color + '08', minWidth: col2 }]}>
      <View style={[su.iconWrap, { backgroundColor: color + '15' }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={[su.value, { color }]}>{value}</Text>
      <Text style={su.label}>{label}</Text>
    </View>
  )
}

const su = StyleSheet.create({
  item:    { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 6 },
  iconWrap:{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  value:   { fontFamily: Font.serif, fontSize: 20, fontWeight: '800' },
  label:   { fontFamily: Font.sans, fontSize: 11, color: Colors.latte, textAlign: 'center' },
})

// ─── Generador de HTML para PDF ────────────────────────────────────────────────

function buildReportHTML(params: {
  period: string
  adminName: string
  metrics: MetricCard[]
  topProducts: { name: string; qty: number; revenue: number }[]
  paymentMethods: { method: string; count: number; amount: number }[]
  orders: Order[]
  chartData: { label: string; value: number }[]
  avgPrepTime: string
  conversionRate: string
  cancelRateStr: string
}) {
  const {
    period, adminName, metrics, topProducts, paymentMethods, orders,
    chartData, avgPrepTime, conversionRate, cancelRateStr,
  } = params
  const now = new Date().toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })

  const statusCount = {
    delivered: orders.filter(o => o.status === 'delivered').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    pending:   orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    ready:     orders.filter(o => o.status === 'ready').length,
  }

  const metricRows = metrics.map(m => {
    const hasChange = m.change !== null
    const isPos = (m.change ?? 0) >= 0
    const changeClass = !hasChange ? 'neutral' : isPos ? 'pos' : 'neg'
    const changeText = formatChange(m.change ?? 0, hasChange)
    return `
    <div class="metric-card">
      <div class="metric-title">${m.title}</div>
      <div class="metric-value">${m.value}</div>
      <div class="metric-change ${changeClass}">${changeText}</div>
      <div class="metric-sub">${m.changeLabel}</div>
    </div>`
  }).join('')

  const productRows = topProducts.slice(0, 10).map((p, i) => `
    <tr class="${i % 2 === 0 ? 'alt' : ''}">
      <td style="width:30px;text-align:center;font-weight:700;color:#6B7280">${i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}</td>
      <td>${p.name}</td>
      <td style="text-align:center;font-weight:700">${p.qty}</td>
      <td style="text-align:right;font-weight:700;color:#B45309">${formatCOP(p.revenue)}</td>
    </tr>`).join('')

  const paymentRows = paymentMethods.map(pm => `
    <tr>
      <td>${pm.method}</td>
      <td style="text-align:center">${pm.count}</td>
      <td style="text-align:right;font-weight:700;color:#B45309">${formatCOP(pm.amount)}</td>
    </tr>`).join('')

  // Gráfico de barras en SVG para el PDF
  const chartMax = Math.max(...chartData.map(d => d.value), 1)
  const barW = chartData.length > 0 ? Math.min(40, Math.floor(520 / chartData.length) - 4) : 30
  const chartBars = chartData.map((d, i) => {
    const barH = Math.max((d.value / chartMax) * 100, 3)
    const x = i * (barW + 4) + 2
    const y = 110 - barH
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="#B45309" opacity="0.85"/>
      <text x="${x + barW / 2}" y="125" text-anchor="middle" font-size="8" fill="#6B7280">${d.label}</text>
      ${d.value > 0 ? `<text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="7" fill="#B45309" font-weight="700">${formatCOP(d.value).replace('$', '')}</text>` : ''}`
  }).join('')

  const svgWidth = chartData.length > 0 ? chartData.length * (barW + 4) + 4 : 100
  const chartSVG = chartData.length > 0 ? `
    <svg viewBox="0 0 ${svgWidth} 135" width="100%" style="overflow:visible">
      ${chartBars}
    </svg>` : '<p style="color:#9CA3AF;text-align:center;padding:20px 0">Sin datos para este período</p>'

  const mesas = new Set(orders.map(o => o.table_number).filter(Boolean)).size

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1F1B18; background: #FBF8F5; padding: 40px; }
  .header { background: linear-gradient(135deg, #2C1A0E 0%, #5C3317 100%); color: white; border-radius: 16px; padding: 32px; margin-bottom: 28px; }
  .header h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px; }
  .header .sub { font-size: 13px; opacity: 0.7; }
  .header .meta { display: flex; gap: 24px; margin-top: 20px; flex-wrap: wrap; }
  .header .meta-item { font-size: 12px; opacity: 0.85; }
  .header .meta-item strong { display: block; font-size: 14px; opacity: 1; }
  .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #9CA3AF; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #E5E7EB; }
  .section { margin-bottom: 24px; background: white; border-radius: 14px; padding: 24px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
  .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .metric-card { background: white; border-radius: 14px; padding: 18px; box-shadow: 0 1px 6px rgba(0,0,0,0.06); border: 1px solid #F3F4F6; }
  .metric-title { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .metric-value { font-size: 20px; font-weight: 800; color: #1F1B18; margin-bottom: 4px; }
  .metric-change { font-size: 11px; font-weight: 700; display: inline-block; padding: 2px 8px; border-radius: 6px; margin-bottom: 4px; }
  .pos { background: #ECFDF5; color: #059669; }
  .neg { background: #FEF2F2; color: #DC2626; }
  .neutral { background: #F3F4F6; color: #9CA3AF; }
  .metric-sub { font-size: 10px; color: #9CA3AF; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280; padding: 10px 12px; border-bottom: 2px solid #E5E7EB; text-align: left; }
  td { padding: 10px 12px; border-bottom: 1px solid #F3F4F6; color: #374151; }
  tr.alt td { background: #F9FAFB; }
  .status-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
  .status-card { border-radius: 12px; padding: 14px; text-align: center; }
  .status-card .sval { font-size: 26px; font-weight: 800; }
  .status-card .slabel { font-size: 10px; font-weight: 600; margin-top: 4px; }
  .ops-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .ops-card { border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #F3F4F6; }
  .ops-val { font-size: 22px; font-weight: 800; color: #1F1B18; margin-bottom: 4px; }
  .ops-label { font-size: 10px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .chart-wrap { overflow: hidden; }
  .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #9CA3AF; }
</style>
</head>
<body>
  <div class="header">
    <h1>☕ Cafetería Luna</h1>
    <div class="sub">Reporte de negocio generado automáticamente</div>
    <div class="meta">
      <div class="meta-item"><strong>${period}</strong>Período</div>
      <div class="meta-item"><strong>${adminName}</strong>Generado por</div>
      <div class="meta-item"><strong>${now}</strong>Fecha y hora</div>
      <div class="meta-item"><strong>${orders.length}</strong>Total de pedidos</div>
    </div>
  </div>

  <!-- Métricas principales -->
  <div class="metrics-grid">${metricRows}</div>

  <!-- Resumen operativo -->
  <div class="section">
    <div class="section-title">Resumen operativo</div>
    <div class="ops-grid">
      <div class="ops-card">
        <div class="ops-val">${avgPrepTime}</div>
        <div class="ops-label">Tiempo promedio</div>
      </div>
      <div class="ops-card">
        <div class="ops-val">${mesas}</div>
        <div class="ops-label">Mesas atendidas</div>
      </div>
      <div class="ops-card">
        <div class="ops-val">${conversionRate}</div>
        <div class="ops-label">Tasa de conversión</div>
      </div>
      <div class="ops-card">
        <div class="ops-val">${cancelRateStr}</div>
        <div class="ops-label">Tasa cancelación</div>
      </div>
    </div>
  </div>

  <!-- Gráfico de ingresos -->
  <div class="section">
    <div class="section-title">Ingresos por período</div>
    <div class="chart-wrap">${chartSVG}</div>
  </div>

  <!-- Estado de pedidos -->
  <div class="section">
    <div class="section-title">Estado de pedidos</div>
    <div class="status-grid">
      <div class="status-card" style="background:#ECFDF5">
        <div class="sval" style="color:#059669">${statusCount.delivered}</div>
        <div class="slabel" style="color:#059669">Entregados</div>
      </div>
      <div class="status-card" style="background:#EFF6FF">
        <div class="sval" style="color:#2563EB">${statusCount.ready}</div>
        <div class="slabel" style="color:#2563EB">Listos</div>
      </div>
      <div class="status-card" style="background:#FFFBEB">
        <div class="sval" style="color:#D97706">${statusCount.preparing}</div>
        <div class="slabel" style="color:#D97706">Preparando</div>
      </div>
      <div class="status-card" style="background:#F5F3FF">
        <div class="sval" style="color:#7C3AED">${statusCount.pending}</div>
        <div class="slabel" style="color:#7C3AED">Pendientes</div>
      </div>
      <div class="status-card" style="background:#FEF2F2">
        <div class="sval" style="color:#DC2626">${statusCount.cancelled}</div>
        <div class="slabel" style="color:#DC2626">Cancelados</div>
      </div>
    </div>
  </div>

  <!-- Productos más vendidos -->
  <div class="section">
    <div class="section-title">Productos más vendidos</div>
    <table>
      <thead><tr><th>#</th><th>Producto</th><th style="text-align:center">Unidades</th><th style="text-align:right">Ingresos</th></tr></thead>
      <tbody>${productRows || '<tr><td colspan="4" style="text-align:center;color:#9CA3AF;padding:20px">Sin ventas en este período</td></tr>'}</tbody>
    </table>
  </div>

  <!-- Métodos de pago -->
  <div class="section">
    <div class="section-title">Métodos de pago</div>
    <table>
      <thead><tr><th>Método</th><th style="text-align:center">Transacciones</th><th style="text-align:right">Monto total</th></tr></thead>
      <tbody>${paymentRows || '<tr><td colspan="3" style="text-align:center;color:#9CA3AF;padding:20px">Sin pagos en este período</td></tr>'}</tbody>
    </table>
  </div>

  <div class="footer">
    Reporte generado por el sistema de Cafetería Luna · ${now}
  </div>
</body>
</html>`
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets()
  const { profile } = useAuthStore()

  const [period, setPeriod]                 = useState<Period>('today')
  const [loading, setLoading]               = useState(true)
  const [refreshing, setRefreshing]         = useState(false)
  const [showPeriodMenu, setShowPeriodMenu] = useState(false)
  const [generatingPDF, setGeneratingPDF]   = useState(false)
  const [currentOrders, setCurrentOrders]   = useState<Order[]>([])
  const [previousOrders, setPreviousOrders] = useState<Order[]>([])

  const fetchData = useCallback(async () => {
    try {
      const { start, end } = getPeriodDates(period)
      const prev = getPreviousPeriodDates(period)

      const [currRes, prevRes] = await Promise.all([
        supabase.from('orders').select(`
          id, status, total, payment_status, payment_method,
          table_number, created_at, delivered_at,
          order_items(id, quantity, unit_price, products(name))
        `).gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false }),
        supabase.from('orders').select(`
          id, status, total, payment_status, payment_method,
          table_number, created_at, delivered_at,
          order_items(id, quantity, unit_price, products(name))
        `).gte('created_at', prev.start).lte('created_at', prev.end),
      ])

      if (currRes.error) throw currRes.error
      if (prevRes.error) throw prevRes.error

      setCurrentOrders((currRes.data as unknown as Order[]) ?? [])
      setPreviousOrders((prevRes.data as unknown as Order[]) ?? [])
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [period])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Métricas ────────────────────────────────────────────────────────────

  const metrics = useMemo((): MetricCard[] => {
    const currPaid = currentOrders.filter(o => o.payment_status === 'paid')
    const prevPaid = previousOrders.filter(o => o.payment_status === 'paid')

    const revenue     = currPaid.reduce((s, o) => s + o.total, 0)
    const prevRevenue = prevPaid.reduce((s, o) => s + o.total, 0)
    const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null

    const ordersCount   = currentOrders.length
    const prevCount     = previousOrders.length
    const ordersChange  = prevCount > 0 ? ((ordersCount - prevCount) / prevCount) * 100 : null

    const avgTicket     = currPaid.length > 0 ? revenue / currPaid.length : 0
    const prevAvgTicket = prevPaid.length > 0 ? prevRevenue / prevPaid.length : 0
    const ticketChange  = prevAvgTicket > 0 ? ((avgTicket - prevAvgTicket) / prevAvgTicket) * 100 : null

    const delivered     = currentOrders.filter(o => o.status === 'delivered').length
    const prevDelivered = previousOrders.filter(o => o.status === 'delivered').length
    const deliveredChange = prevDelivered > 0 ? ((delivered - prevDelivered) / prevDelivered) * 100 : null

    const tables      = new Set(currentOrders.map(o => o.table_number).filter(Boolean)).size
    const prevTables  = new Set(previousOrders.map(o => o.table_number).filter(Boolean)).size
    const tablesChange = prevTables > 0 ? ((tables - prevTables) / prevTables) * 100 : null

    const cancelRate     = ordersCount > 0 ? (currentOrders.filter(o => o.status === 'cancelled').length / ordersCount) * 100 : 0
    const prevCancelRate = prevCount > 0 ? (previousOrders.filter(o => o.status === 'cancelled').length / prevCount) * 100 : 0
    // Cancelación: diferencia absoluta de puntos porcentuales, e invertida (bajar = positivo)
    const cancelChange   = prevCount > 0 ? -(cancelRate - prevCancelRate) : null

    return [
      { title: 'Ingresos',         value: formatCOP(revenue),               change: revenueChange,   changeLabel: 'vs período anterior', icon: DollarSign,  color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
      { title: 'Pedidos',          value: String(ordersCount),              change: ordersChange,    changeLabel: 'vs período anterior', icon: ShoppingBag, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
      { title: 'Ticket promedio',  value: formatCOP(Math.round(avgTicket)), change: ticketChange,    changeLabel: 'vs período anterior', icon: TrendingUp,  color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
      { title: 'Entregados',       value: String(delivered),                change: deliveredChange, changeLabel: 'vs período anterior', icon: Package,     color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
      { title: 'Mesas atendidas',  value: String(tables),                   change: tablesChange,    changeLabel: 'vs período anterior', icon: Users,       color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
      { title: 'Tasa cancelación', value: `${cancelRate.toFixed(0)}%`,      change: cancelChange,   changeLabel: 'vs período anterior', icon: TrendingDown, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    ]
  }, [currentOrders, previousOrders])

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>()
    currentOrders.forEach(order => {
      order.order_items?.forEach(item => {
        const name = item.products?.name || 'Desconocido'
        const ex = map.get(name)
        if (ex) { ex.qty += item.quantity; ex.revenue += item.unit_price * item.quantity }
        else map.set(name, { name, qty: item.quantity, revenue: item.unit_price * item.quantity })
      })
    })
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  }, [currentOrders])

  const chartData = useMemo(() => {
    if (period === 'today') return groupByHour(currentOrders)
    if (period === 'week')  return groupByDay(currentOrders)
    return groupByMonth(currentOrders)
  }, [currentOrders, period])

  const paymentMethods = useMemo(() => {
    const map = new Map<string, { method: string; count: number; amount: number }>()
    const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia',
  }
  currentOrders.filter(o => o.payment_status === 'paid').forEach(o => {
      const key   = o.payment_method || 'otro'
      const label = PAYMENT_LABELS[key] ?? 'Otro'
      const ex = map.get(key)
      if (ex) { ex.count++; ex.amount += o.total }
      else map.set(key, { method: label, count: 1, amount: o.total })
    })
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount)
  }, [currentOrders])

  // ─── Generar PDF ─────────────────────────────────────────────────────────

  async function handleGeneratePDF() {
    setGeneratingPDF(true)
    try {
      const html = buildReportHTML({
        period: PERIOD_LABELS[period],
        adminName: profile?.full_name ?? 'Administrador',
        metrics,
        topProducts,
        paymentMethods,
        orders: currentOrders,
        chartData,
        avgPrepTime: calcAvgPrepTime(currentOrders),
        conversionRate: calcConversionRate(currentOrders),
        cancelRateStr: calcCancelRate(currentOrders),
      })

      const { uri } = await Print.printToFileAsync({ html, base64: false })
      const canShare = await Sharing.isAvailableAsync()

      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Reporte ${PERIOD_LABELS[period]} — Cafetería Luna`,
          UTI: 'com.adobe.pdf',
        })
      } else {
        Alert.alert('PDF generado', `Guardado en:\n${uri}`)
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo generar el PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.terra} />
        <Text style={s.loadingText}>Cargando métricas...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={[s.screen, { paddingTop: insets.top }]}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={Colors.terra} />
      }
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>Panel de Control</Text>
          <Text style={s.headerSub}>{profile?.full_name ?? 'Administrador'}</Text>
        </View>
        <View style={s.headerActions}>
          {/* Botón PDF */}
          <TouchableOpacity
            style={[s.pdfBtn, generatingPDF && { opacity: 0.6 }]}
            onPress={handleGeneratePDF}
            disabled={generatingPDF}
            activeOpacity={0.8}
          >
            {generatingPDF
              ? <ActivityIndicator size="small" color={Colors.white} />
              : <FileText size={16} color={Colors.white} />}
            <Text style={s.pdfBtnText}>{generatingPDF ? 'Generando...' : 'PDF'}</Text>
          </TouchableOpacity>

          {/* Selector de período */}
          <TouchableOpacity
            style={s.periodBtn}
            onPress={() => setShowPeriodMenu(!showPeriodMenu)}
            activeOpacity={0.8}
          >
            <Calendar size={14} color={Colors.mocha} />
            <Text style={s.periodText}>{PERIOD_LABELS[period]}</Text>
            <ChevronDown size={13} color={Colors.latte} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Menú período */}
      {showPeriodMenu && (
        <View style={s.periodMenu}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[s.periodOption, period === p && s.periodOptionActive]}
              onPress={() => { setPeriod(p); setShowPeriodMenu(false); setLoading(true) }}
            >
              <Text style={[s.periodOptionText, period === p && s.periodOptionTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
              {period === p && <Text style={{ color: Colors.terra }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Métricas ── */}
      <Text style={s.sectionLabel}>MÉTRICAS PRINCIPALES</Text>
      <View style={s.metricsGrid}>
        {metrics.map((m, i) => <MetricCardComponent key={i} metric={m} />)}
      </View>

      {/* ── Gráfico ── */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <BarChart3 size={16} color={Colors.espresso} />
            <Text style={s.cardTitle}>
              Ingresos por {period === 'today' ? 'hora' : period === 'week' ? 'día' : 'mes'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => { setLoading(true); fetchData() }}>
            <RefreshCw size={14} color={Colors.latte} />
          </TouchableOpacity>
        </View>
        {chartData.length > 0
          ? <SimpleBarChart data={chartData} color={Colors.terra} />
          : <Text style={s.emptyText}>Sin datos para este período</Text>}
      </View>

      {/* ── Estado pedidos ── */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <PieChart size={16} color={Colors.espresso} />
            <Text style={s.cardTitle}>Estado de pedidos</Text>
          </View>
          <Text style={s.cardBadge}>{currentOrders.length} total</Text>
        </View>
        <OrderStatusBreakdown orders={currentOrders} />
      </View>

      {/* ── Operativo ── */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <Clock size={16} color={Colors.espresso} />
            <Text style={s.cardTitle}>Resumen operativo</Text>
          </View>
        </View>
        <View style={s.summaryGrid}>
          <SummaryItem label="Tiempo promedio"      value={calcAvgPrepTime(currentOrders)}    icon={Clock}        color="#F59E0B" />
          <SummaryItem label="Mesas atendidas"      value={String(new Set(currentOrders.map(o => o.table_number).filter(Boolean)).size)} icon={Users} color="#0891B2" />
          <SummaryItem label="Tasa de conversión"   value={calcConversionRate(currentOrders)} icon={TrendingUp}   color="#059669" />
          <SummaryItem label="Tasa cancelación"     value={calcCancelRate(currentOrders)}     icon={TrendingDown} color="#DC2626" />
        </View>
      </View>

      {/* ── Productos top ── */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <TrendingUp size={16} color={Colors.espresso} />
            <Text style={s.cardTitle}>Productos más vendidos</Text>
          </View>
          <Text style={s.cardBadge}>Top {Math.min(topProducts.length, 7)}</Text>
        </View>
        {topProducts.length > 0
          ? <TopProductsTable items={topProducts} />
          : <Text style={s.emptyText}>Sin ventas en este período</Text>}
      </View>

      {/* ── Métodos de pago ── */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <DollarSign size={16} color={Colors.espresso} />
            <Text style={s.cardTitle}>Métodos de pago</Text>
          </View>
        </View>
        {paymentMethods.length > 0 ? (
          <View style={s.paymentList}>
            {paymentMethods.map((pm, i) => {
              const totalPaid = currentOrders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + o.total, 0)
              const pct = totalPaid > 0 ? (pm.amount / totalPaid) * 100 : 0
              return (
                <View key={i} style={s.paymentRow}>
                  <View style={s.paymentLeft}>
                    <Text style={s.paymentMethod}>{pm.method}</Text>
                    <Text style={s.paymentCount}>{pm.count} transacciones</Text>
                  </View>
                  <View style={s.paymentRight}>
                    <Text style={s.paymentAmount}>{formatCOP(pm.amount)}</Text>
                    <View style={s.paymentPctBar}>
                      <View style={[s.paymentPctFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={s.paymentPct}>{pct.toFixed(0)}%</Text>
                  </View>
                </View>
              )
            })}
          </View>
        ) : <Text style={s.emptyText}>Sin pagos registrados</Text>}
      </View>

      <View style={{ height: insets.bottom + 24 }} />
    </ScrollView>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#F1F5F9' },
  scroll:       { padding: 16, gap: 14 },
  loadingText:  { marginTop: 12, fontFamily: Font.sans, color: Colors.mocha, fontSize: 13 },
  header:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  headerLeft:   { gap: 2 },
  headerTitle:  { fontFamily: Font.serif, fontSize: 26, fontWeight: '800', color: Colors.espresso },
  headerSub:    { fontFamily: Font.sans, fontSize: 12, color: Colors.latte },
  headerActions:{ alignItems: 'flex-end', gap: 8 },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.espresso, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  pdfBtnText:   { fontFamily: Font.sans, fontSize: 12, fontWeight: '700', color: Colors.white },
  periodBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.card, borderRadius: Radius.md,
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.creamDeep,
  },
  periodText:   { fontFamily: Font.sans, fontSize: 12, fontWeight: '600', color: Colors.mocha },
  periodMenu: {
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.creamDeep,
    overflow: 'hidden', marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
  },
  periodOption:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.creamDeep },
  periodOptionActive:    { backgroundColor: Colors.terraDust },
  periodOptionText:      { fontFamily: Font.sans, fontSize: 14, color: Colors.mocha },
  periodOptionTextActive:{ color: Colors.terra, fontWeight: '700' },
  sectionLabel: { fontFamily: Font.sans, fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1.2, textTransform: 'uppercase' },
  metricsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Colors.creamDeep,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle:      { fontFamily: Font.sans, fontSize: 14, fontWeight: '700', color: Colors.espresso },
  cardBadge: {
    fontFamily: Font.sans, fontSize: 11, fontWeight: '700',
    color: Colors.latte, backgroundColor: Colors.creamDark,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  emptyText:      { fontFamily: Font.sans, fontSize: 13, color: Colors.latte, textAlign: 'center', paddingVertical: 20 },
  summaryGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paymentList:    { gap: 14 },
  paymentRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paymentLeft:    { gap: 2 },
  paymentMethod:  { fontFamily: Font.sans, fontSize: 14, fontWeight: '700', color: Colors.espresso },
  paymentCount:   { fontFamily: Font.sans, fontSize: 11, color: Colors.latte },
  paymentRight:   { alignItems: 'flex-end', gap: 4 },
  paymentAmount:  { fontFamily: Font.serif, fontSize: 15, fontWeight: '700', color: Colors.terra },
  paymentPctBar:  { width: 80, height: 5, backgroundColor: Colors.creamDark, borderRadius: 3, overflow: 'hidden' },
  paymentPctFill: { height: '100%', backgroundColor: Colors.terra, borderRadius: 3 },
  paymentPct:     { fontFamily: Font.sans, fontSize: 10, color: Colors.latte, fontWeight: '600' },
})