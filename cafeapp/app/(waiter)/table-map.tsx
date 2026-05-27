import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, ActivityIndicator, Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import {
  ArrowLeft, Users, CheckCircle, Coffee,
  Armchair, Leaf, Circle, Square, RectangleHorizontal,
  Wifi, Clock, Ban,
} from 'lucide-react-native'
import { Colors, Font, Radius, Shadow } from '@/constants/theme'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/stores/usecartstore'

const { width: SCREEN_W } = Dimensions.get('window')

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TableStatus = 'available' | 'occupied' | 'reserved' | 'closed'

type Table = {
  id: string
  number: number
  capacity: number
  status: TableStatus
  shape: 'square' | 'round' | 'long'
  zone: 'interior' | 'terraza' | 'barra'
}

// ─── Config visual de estados ─────────────────────────────────────────────────

const STATUS: Record<TableStatus, {
  label: string; color: string; bg: string; border: string
  selectable: boolean; icon: React.FC<any>
}> = {
  available: { label: 'Disponible', color: '#27500A', bg: '#EAF3DE', border: '#97C459', selectable: true,  icon: CheckCircle },
  occupied:  { label: 'Ocupada',    color: '#854F0B', bg: '#FAEEDA', border: '#EF9F27', selectable: false, icon: Clock       },
  reserved:  { label: 'Reservada',  color: '#185FA5', bg: '#E6F1FB', border: '#378ADD', selectable: false, icon: Clock       },
  closed:    { label: 'Cerrada',    color: '#5F5E5A', bg: '#F1EFE8', border: '#B4B2A9', selectable: false, icon: Ban         },
}

// Iconos por zona
const ZONE_ICONS: Record<string, React.FC<any>> = {
  barra:    Coffee,
  interior: Armchair,
  terraza:  Leaf,
}

const ZONE_LABELS: Record<string, string> = {
  barra:    'Barra',
  interior: 'Interior',
  terraza:  'Terraza',
}

// ─── Componente: Indicador en vivo ───────────────────────────────────────────

function LiveIndicator() {
  const blink = useRef(new Animated.Value(1)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.2, duration: 800, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])
  return (
    <View style={live.wrap}>
      <Animated.View style={[live.dot, { opacity: blink }]} />
      <Text style={live.text}>En vivo</Text>
    </View>
  )
}

const live = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.sageDust, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  dot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.sage },
  text: { fontFamily: Font.sans, fontSize: 11, fontWeight: '700', color: '#27500A', letterSpacing: 0.5 },
})

// ─── Componente de mesa individual ───────────────────────────────────────────

function TableNode({ table, selected, onPress }: {
  table: Table; selected: boolean; onPress: () => void
}) {
  const cfg         = STATUS[table.status]
  const pulse       = useRef(new Animated.Value(1)).current
  const selectAnim  = useRef(new Animated.Value(0)).current
  const StatusIcon  = cfg.icon

  // Pulso suave en mesas disponibles
  useEffect(() => {
    if (table.status !== 'available') { pulse.setValue(1); return }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1400, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [table.status])

  useEffect(() => {
    Animated.spring(selectAnim, { toValue: selected ? 1 : 0, tension: 80, friction: 6, useNativeDriver: true }).start()
  }, [selected])

  const isRound = table.shape === 'round'
  const isLong  = table.shape === 'long'
  const w       = isLong ? 92 : 62
  const h       = isLong ? 46 : 62
  const br      = isRound ? 31 : isLong ? 12 : 12

  const ShapeIcon = isRound
    ? Circle
    : isLong
    ? RectangleHorizontal
    : Square

  return (
    <TouchableOpacity onPress={onPress} disabled={!cfg.selectable} activeOpacity={0.75}>
      <Animated.View style={{
        transform: [{
          scale: Animated.multiply(
            pulse,
            selectAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] })
          ),
        }],
        opacity: table.status === 'closed' ? 0.4 : 1,
      }}>
        {/* Sombra de selección */}
        {selected && (
          <Animated.View style={[
            node.selectedGlow,
            { width: w + 12, height: h + 12, borderRadius: br + 6 },
            { opacity: selectAnim },
          ]} />
        )}

        <View style={[
          node.base,
          { width: w, height: h, borderRadius: br },
          selected
            ? { backgroundColor: Colors.espresso, borderWidth: 0 }
            : { backgroundColor: cfg.bg, borderWidth: 1.5, borderColor: cfg.border },
        ]}>
          {/* Icono de estado */}
          <StatusIcon
            size={13}
            color={selected ? '#FFFFFF99' : cfg.color + '99'}
            style={{ marginBottom: 1 }}
          />
          <Text style={[node.num, { color: selected ? '#FFFFFF' : cfg.color }]}>
            {table.number}
          </Text>
          <View style={node.capRow}>
            <Users size={8} color={selected ? '#FFFFFF88' : cfg.color + '88'} />
            <Text style={[node.cap, { color: selected ? '#FFFFFF88' : cfg.color + '99' }]}>
              {table.capacity}
            </Text>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  )
}

const node = StyleSheet.create({
  base:          { alignItems: 'center', justifyContent: 'center', gap: 1 },
  selectedGlow:  { position: 'absolute', top: -6, left: -6, backgroundColor: Colors.espresso + '20' },
  num:           { fontFamily: Font.sans, fontSize: 15, fontWeight: '800', lineHeight: 18 },
  capRow:        { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cap:           { fontFamily: Font.sans, fontSize: 9, lineHeight: 11 },
})

// ─── Componente: Zona del restaurante ────────────────────────────────────────

function ZoneSection({ zone, label, tables, selectedId, onSelect }: {
  zone: string; label: string; tables: Table[]
  selectedId: string | null; onSelect: (t: Table) => void
}) {
  const ZoneIcon = ZONE_ICONS[zone] ?? Coffee
  const available = tables.filter(t => t.status === 'available').length

  return (
    <View style={zn.container}>
      <View style={zn.header}>
        <View style={zn.labelRow}>
          <ZoneIcon size={14} color={Colors.mocha} />
          <Text style={zn.label}>{label}</Text>
        </View>
        <View style={zn.availBadge}>
          <Text style={zn.availText}>{available} libre{available !== 1 ? 's' : ''}</Text>
        </View>
      </View>
      <View style={zn.floor}>
        {tables.map(table => (
          <View key={table.id} style={zn.tableWrap}>
            <TableNode
              table={table}
              selected={selectedId === table.id}
              onPress={() => onSelect(table)}
            />
          </View>
        ))}
      </View>
    </View>
  )
}

const zn = StyleSheet.create({
  container:   { gap: 10 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label:       { fontFamily: Font.sans, fontSize: 12, fontWeight: '700', color: Colors.mocha, textTransform: 'uppercase', letterSpacing: 0.6 },
  availBadge:  { backgroundColor: Colors.sageDust, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  availText:   { fontFamily: Font.sans, fontSize: 10, fontWeight: '600', color: '#27500A' },
  floor:       { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  tableWrap:   { alignItems: 'center' },
})

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function TableMapScreen() {
  const insets = useSafeAreaInsets()
  const { tableNumber, setTableNumber } = useCartStore()
  const [tables,   setTables]   = useState<Table[]>([])
  const [selected, setSelected] = useState<Table | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const footerAnim = useRef(new Animated.Value(0)).current

  const enrich = (raw: any[]): Table[] =>
    raw.map(t => ({
      ...t,
      shape: t.capacity >= 6 ? 'long' : t.capacity >= 4 ? 'square' : 'round',
      zone:  t.number <= 4 ? 'barra' : t.number <= 8 ? 'interior' : 'terraza',
    }))

  const fetchTables = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('number')
      if (error) throw error
      setTables(enrich(data ?? []))
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Error fetching tables:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Carga inicial + Realtime con canal único
  useEffect(() => {
    fetchTables()

    const channelName = `table-map-${Math.random().toString(36).slice(2)}`

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          // ✅ Actualización local inmediata — sin refetch
          const updated = payload.new as any
          setTables(prev => enrich(
            prev.map(t => t.id === updated.id ? { ...t, ...updated } : t)
          ))
          setLastUpdate(new Date())

          // Si la mesa seleccionada cambió de estado, deseleccionar
          setSelected(prev => {
            if (prev?.id === updated.id && updated.status !== 'available') return null
            return prev
          })
        } else {
          // INSERT o DELETE: refetch completo
          fetchTables()
        }
      })
      // También escuchar orders para actualizar mesas ocupadas en tiempo real
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchTables()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchTables])

  // Restaurar selección previa
  useEffect(() => {
    if (tableNumber && tables.length > 0) {
      const prev = tables.find(t => String(t.number) === tableNumber)
      if (prev?.status === 'available') setSelected(prev)
    }
  }, [tables])

  // Animar footer
  useEffect(() => {
    Animated.spring(footerAnim, {
      toValue: selected ? 1 : 0,
      tension: 70, friction: 8, useNativeDriver: true,
    }).start()
  }, [selected])

  function handleSelect(table: Table) {
    if (!STATUS[table.status].selectable) return
    setSelected(prev => prev?.id === table.id ? null : table)
  }

  function handleConfirm() {
    if (!selected) return
    setTableNumber(String(selected.number))
    router.back()
  }

  const zones = {
    barra:    tables.filter(t => t.zone === 'barra'),
    interior: tables.filter(t => t.zone === 'interior'),
    terraza:  tables.filter(t => t.zone === 'terraza'),
  }

  const stats = {
    available: tables.filter(t => t.status === 'available').length,
    occupied:  tables.filter(t => t.status === 'occupied').length,
    reserved:  tables.filter(t => t.status === 'reserved').length,
    total:     tables.length,
  }

  const timeStr = lastUpdate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  return (
    <View style={[s.screen, { paddingBottom: insets.bottom }]}>

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={22} color={Colors.espresso} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Mapa de mesas</Text>
          <Text style={s.headerSub}>Toca una mesa disponible</Text>
        </View>
        <LiveIndicator />
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <StatChip
          count={stats.available}
          label="Libres"
          color={STATUS.available.color}
          bg={STATUS.available.bg}
          icon={CheckCircle}
        />
        <StatChip
          count={stats.occupied}
          label="Ocupadas"
          color={STATUS.occupied.color}
          bg={STATUS.occupied.bg}
          icon={Clock}
        />
        <StatChip
          count={stats.reserved}
          label="Reservadas"
          color={STATUS.reserved.color}
          bg={STATUS.reserved.bg}
          icon={Clock}
        />
        <StatChip
          count={stats.total}
          label="Total"
          color={Colors.mocha}
          bg={Colors.creamDark}
          icon={Users}
        />
      </View>

      {/* Leyenda */}
      <View style={s.legend}>
        {Object.entries(STATUS).map(([key, cfg]) => {
          const Icon = cfg.icon
          return (
            <View key={key} style={s.legendItem}>
              <Icon size={11} color={cfg.border} />
              <Text style={s.legendText}>{cfg.label}</Text>
            </View>
          )
        })}
        <Text style={s.legendTime}>· {timeStr}</Text>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={Colors.terra} size="large" />
          <Text style={s.loadingText}>Cargando mesas...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: selected ? 130 : 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.floorPlan}>

            {/* Ventanas decorativas */}
            <View style={s.windowRow}>
              <View style={s.windowLabel}>
                <Wifi size={10} color={Colors.latte} />
                <Text style={s.windowLabelText}>Entrada</Text>
              </View>
              <View style={s.windows}>
                {[0,1,2].map(i => <View key={i} style={s.window} />)}
              </View>
            </View>

            {zones.barra.length > 0 && (
              <ZoneSection
                zone="barra"
                label="Barra"
                tables={zones.barra}
                selectedId={selected?.id ?? null}
                onSelect={handleSelect}
              />
            )}

            {zones.interior.length > 0 && (
              <>
                <View style={s.divider}>
                  <View style={s.dividerLine} />
                  <View style={s.dividerPill}>
                    <Armchair size={11} color={Colors.latte} />
                    <Text style={s.dividerText}>Salón principal</Text>
                  </View>
                  <View style={s.dividerLine} />
                </View>
                <ZoneSection
                  zone="interior"
                  label="Interior"
                  tables={zones.interior}
                  selectedId={selected?.id ?? null}
                  onSelect={handleSelect}
                />
              </>
            )}

            {zones.terraza.length > 0 && (
              <>
                <View style={s.divider}>
                  <View style={s.dividerLine} />
                  <View style={s.dividerPill}>
                    <Leaf size={11} color={Colors.latte} />
                    <Text style={s.dividerText}>Terraza</Text>
                  </View>
                  <View style={s.dividerLine} />
                </View>
                <ZoneSection
                  zone="terraza"
                  label="Exterior"
                  tables={zones.terraza}
                  selectedId={selected?.id ?? null}
                  onSelect={handleSelect}
                />
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* Footer */}
      <Animated.View style={[
        s.footer,
        {
          transform: [{ translateY: footerAnim.interpolate({ inputRange: [0, 1], outputRange: [130, 0] }) }],
          paddingBottom: insets.bottom + 12,
        },
      ]}>
        {selected && (
          <View style={s.footerContent}>
            <View style={s.footerLeft}>
              <View style={s.footerTableBadge}>
                <Text style={s.footerTableNum}>{selected.number}</Text>
              </View>
              <View>
                <Text style={s.footerTitle}>Mesa {selected.number}</Text>
                <View style={s.footerMeta}>
                  <Users size={12} color={Colors.mocha} />
                  <Text style={s.footerMetaText}>{selected.capacity} personas</Text>
                  <Text style={s.footerDot}>·</Text>
                  {React.createElement(ZONE_ICONS[selected.zone] ?? Coffee, { size: 12, color: Colors.mocha })}
                  <Text style={s.footerMetaText}>{ZONE_LABELS[selected.zone]}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <CheckCircle size={16} color={Colors.white} />
              <Text style={s.confirmBtnText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  )
}

// ─── StatChip ─────────────────────────────────────────────────────────────────

function StatChip({ count, label, color, bg, icon: Icon }: {
  count: number; label: string; color: string; bg: string; icon: React.FC<any>
}) {
  return (
    <View style={[sc.chip, { backgroundColor: bg }]}>
      <Icon size={13} color={color} />
      <Text style={[sc.num, { color }]}>{count}</Text>
      <Text style={[sc.label, { color }]}>{label}</Text>
    </View>
  )
}

const sc = StyleSheet.create({
  chip:  { flex: 1, borderRadius: Radius.md, paddingVertical: 8, alignItems: 'center', gap: 3 },
  num:   { fontFamily: Font.sans, fontSize: 17, fontWeight: '800' },
  label: { fontFamily: Font.sans, fontSize: 9, fontWeight: '600', letterSpacing: 0.3 },
})

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: Colors.cream },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText:  { fontFamily: Font.sans, fontSize: 13, color: Colors.latte },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, backgroundColor: Colors.cream },
  backBtn:      { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.creamDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.creamDeep },
  headerCenter: { alignItems: 'center' },
  headerTitle:  { fontFamily: Font.serif, fontSize: 18, fontWeight: '700', color: Colors.espresso },
  headerSub:    { fontFamily: Font.sans, fontSize: 11, color: Colors.latte, marginTop: 1 },
  statsRow:     { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  legend:       { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginBottom: 12 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText:   { fontFamily: Font.sans, fontSize: 11, color: Colors.mocha },
  legendTime:   { fontFamily: Font.sans, fontSize: 11, color: Colors.latte, marginLeft: 'auto' },
  scroll:       { paddingHorizontal: 16 },
  floorPlan:    { backgroundColor: Colors.card, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.creamDeep, padding: 16, gap: 18, ...Shadow.sm },
  windowRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  windowLabel:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  windowLabelText: { fontFamily: Font.sans, fontSize: 9, color: Colors.latte, textTransform: 'uppercase', letterSpacing: 0.5 },
  windows:      { flexDirection: 'row', gap: 6 },
  window:       { width: 26, height: 10, backgroundColor: Colors.creamDark, borderRadius: 3, borderWidth: 1, borderColor: Colors.creamDeep },
  divider:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine:  { flex: 1, height: 0.5, backgroundColor: Colors.creamDeep },
  dividerPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.creamDark, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  dividerText:  { fontFamily: Font.sans, fontSize: 10, color: Colors.latte, letterSpacing: 0.4 },
  footer:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.creamDeep, paddingTop: 16, paddingHorizontal: 20, ...Shadow.card },
  footerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  footerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  footerTableBadge: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.creamDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.creamDeep },
  footerTableNum:   { fontFamily: Font.serif, fontSize: 22, fontWeight: '800', color: Colors.espresso },
  footerTitle:      { fontFamily: Font.sans, fontSize: 15, fontWeight: '700', color: Colors.espresso },
  footerMeta:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  footerMetaText:   { fontFamily: Font.sans, fontSize: 12, color: Colors.mocha },
  footerDot:        { fontFamily: Font.sans, fontSize: 12, color: Colors.latte },
  confirmBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.espresso, borderRadius: Radius.full, paddingHorizontal: 20, paddingVertical: 13, ...Shadow.sm },
  confirmBtnText:   { fontFamily: Font.sans, fontSize: 14, fontWeight: '700', color: Colors.white },
})