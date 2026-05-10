import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ArrowLeft, Users, Clock, CheckCircle } from 'lucide-react-native'
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
  label: string
  color: string
  bg: string
  border: string
  selectable: boolean
}> = {
  available: {
    label: 'Disponible',
    color: '#27500A',
    bg: '#EAF3DE',
    border: '#97C459',
    selectable: true,
  },
  occupied: {
    label: 'Ocupada',
    color: '#854F0B',
    bg: '#FAEEDA',
    border: '#EF9F27',
    selectable: false,
  },
  reserved: {
    label: 'Reservada',
    color: '#185FA5',
    bg: '#E6F1FB',
    border: '#378ADD',
    selectable: false,
  },
  closed: {
    label: 'Cerrada',
    color: '#5F5E5A',
    bg: '#F1EFE8',
    border: '#B4B2A9',
    selectable: false,
  },
}

// ─── Componente de mesa individual ───────────────────────────────────────────

function TableNode({
  table,
  selected,
  onPress,
}: {
  table: Table
  selected: boolean
  onPress: () => void
}) {
  const cfg      = STATUS[table.status]
  const pulse    = useRef(new Animated.Value(1)).current
  const selectAnim = useRef(new Animated.Value(0)).current

  // Pulso suave en mesas disponibles
  useEffect(() => {
    if (table.status !== 'available') return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1200, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [table.status])

  // Animación al seleccionar
  useEffect(() => {
    Animated.spring(selectAnim, {
      toValue: selected ? 1 : 0,
      tension: 80,
      friction: 6,
      useNativeDriver: true,
    }).start()
  }, [selected])

  const isRound = table.shape === 'round'
  const isLong  = table.shape === 'long'

  const nodeStyle = {
    width:        isLong ? 90 : isRound ? 58 : 58,
    height:       isLong ? 44 : isRound ? 58 : 58,
    borderRadius: isRound ? 29 : isLong ? 10 : 10,
    backgroundColor: selected ? Colors.espresso : cfg.bg,
    borderWidth:  selected ? 0 : 1.5,
    borderColor:  cfg.border,
    alignItems:   'center' as const,
    justifyContent: 'center' as const,
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!cfg.selectable}
      activeOpacity={0.75}
    >
      <Animated.View style={{
        transform: [
          { scale: Animated.multiply(
              pulse,
              selectAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] })
            )
          },
        ],
        opacity: table.status === 'closed' ? 0.45 : 1,
      }}>
        <View style={nodeStyle}>
          {selected && (
            <CheckCircle size={18} color="#FFFFFF" style={{ marginBottom: 2 }} />
          )}
          <Text style={[
            s.tableNum,
            { color: selected ? '#FFFFFF' : cfg.color },
          ]}>
            {table.number}
          </Text>
          <Text style={[
            s.tableCap,
            { color: selected ? '#D3D1C7' : cfg.color + '99' },
          ]}>
            {table.capacity}p
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  )
}

// ─── Zona del restaurante ─────────────────────────────────────────────────────

function ZoneSection({
  label,
  tables,
  selectedId,
  onSelect,
}: {
  label: string
  tables: Table[]
  selectedId: string | null
  onSelect: (t: Table) => void
}) {
  return (
    <View style={s.zone}>
      <Text style={s.zoneLabel}>{label}</Text>
      <View style={s.zoneFloor}>
        {tables.map(table => (
          <View key={table.id} style={s.tableWrap}>
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

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function TableMapScreen() {
  const insets = useSafeAreaInsets()
  const { tableNumber, setTableNumber } = useCartStore()
  const [tables,   setTables]   = useState<Table[]>([])
  const [selected, setSelected] = useState<Table | null>(null)
  const [loading,  setLoading]  = useState(true)

  const footerAnim = useRef(new Animated.Value(0)).current

  const fetchTables = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('number')

      if (error) throw error

      // Enriquecer con shape y zone basado en número
      // Ajusta este mapeo a tu restaurante real
      const enriched: Table[] = (data ?? []).map((t: any) => ({
        ...t,
        shape: t.capacity >= 6 ? 'long' : t.capacity >= 4 ? 'square' : 'round',
        zone:  t.number <= 4 ? 'barra' : t.number <= 8 ? 'interior' : 'terraza',
      }))

      setTables(enriched)
    } catch (err) {
      console.error('Error fetching tables:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Carga + Realtime
  useEffect(() => {
    fetchTables()

    const channel = supabase
      .channel('table-map')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tables',
      }, () => fetchTables())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Restaurar selección previa si había una mesa guardada
  useEffect(() => {
    if (tableNumber && tables.length > 0) {
      const prev = tables.find(t => String(t.number) === tableNumber)
      if (prev) setSelected(prev)
    }
  }, [tables])

  // Animar footer al seleccionar
  useEffect(() => {
    Animated.spring(footerAnim, {
      toValue: selected ? 1 : 0,
      tension: 70,
      friction: 8,
      useNativeDriver: true,
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
  }

  return (
    <View style={[s.screen, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={24} color={Colors.espresso} />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Seleccionar mesa</Text>
          <Text style={s.headerSub}>Toca una mesa disponible</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Stats rápidos */}
      <View style={s.statsRow}>
        <StatChip count={stats.available} label="Libres"   color={STATUS.available.color} bg={STATUS.available.bg} />
        <StatChip count={stats.occupied}  label="Ocupadas" color={STATUS.occupied.color}  bg={STATUS.occupied.bg}  />
        <StatChip count={stats.reserved}  label="Reserv."  color={STATUS.reserved.color}  bg={STATUS.reserved.bg}  />
      </View>

      {/* Leyenda */}
      <View style={s.legend}>
        {Object.entries(STATUS).map(([key, cfg]) => (
          <View key={key} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: cfg.border }]} />
            <Text style={s.legendText}>{cfg.label}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={Colors.terra} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: selected ? 120 : 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Plano del restaurante */}
          <View style={s.floorPlan}>

            {/* Decoración — ventanas */}
            <View style={s.windowRow}>
              {[0,1,2].map(i => <View key={i} style={s.window} />)}
            </View>

            {zones.barra.length > 0 && (
              <ZoneSection
                label="☕  Barra"
                tables={zones.barra}
                selectedId={selected?.id ?? null}
                onSelect={handleSelect}
              />
            )}

            {/* Divisor decorativo */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>Salón principal</Text>
              <View style={s.dividerLine} />
            </View>

            {zones.interior.length > 0 && (
              <ZoneSection
                label="🪑  Interior"
                tables={zones.interior}
                selectedId={selected?.id ?? null}
                onSelect={handleSelect}
              />
            )}

            {zones.terraza.length > 0 && (
              <>
                <View style={s.divider}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerText}>Terraza</Text>
                  <View style={s.dividerLine} />
                </View>
                <ZoneSection
                  label="🌿  Exterior"
                  tables={zones.terraza}
                  selectedId={selected?.id ?? null}
                  onSelect={handleSelect}
                />
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* Footer — aparece al seleccionar */}
      <Animated.View style={[
        s.footer,
        {
          transform: [{
            translateY: footerAnim.interpolate({
              inputRange:  [0, 1],
              outputRange: [120, 0],
            }),
          }],
          paddingBottom: insets.bottom + 12,
        },
      ]}>
        {selected && (
          <View style={s.footerContent}>
            <View style={s.footerInfo}>
              <Text style={s.footerTableNum}>Mesa {selected.number}</Text>
              <View style={s.footerMeta}>
                <Users size={13} color={Colors.mocha} />
                <Text style={s.footerMetaText}>{selected.capacity} personas</Text>
                <Text style={s.footerZone}>
                  · {selected.zone === 'barra' ? 'Barra' : selected.zone === 'interior' ? 'Interior' : 'Terraza'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.confirmBtn}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Text style={s.confirmBtnText}>Confirmar mesa</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  )
}

function StatChip({ count, label, color, bg }: {
  count: number; label: string; color: string; bg: string
}) {
  return (
    <View style={[s.statChip, { backgroundColor: bg }]}>
      <Text style={[s.statNum, { color }]}>{count}</Text>
      <Text style={[s.statLabel, { color }]}>{label}</Text>
    </View>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: Colors.cream },
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: Colors.cream,
  },
  backBtn:       { padding: 4 },
  headerTitle: {
    fontFamily: Font.serif, fontSize: 20,
    fontWeight: '700', color: Colors.espresso, textAlign: 'center',
  },
  headerSub: {
    fontFamily: Font.sans, fontSize: 12,
    color: Colors.latte, textAlign: 'center', marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, marginBottom: 10,
  },
  statChip: {
    flex: 1, borderRadius: Radius.md,
    paddingVertical: 8, alignItems: 'center',
  },
  statNum:   { fontFamily: Font.sans, fontSize: 18, fontWeight: '700' },
  statLabel: { fontFamily: Font.sans, fontSize: 11, marginTop: 1 },
  legend: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, paddingHorizontal: 20, marginBottom: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: Font.sans, fontSize: 11, color: Colors.mocha },
  scroll:    { paddingHorizontal: 16 },
  floorPlan: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.creamDeep,
    padding: 16,
    gap: 16,
    ...Shadow.sm,
  },
  windowRow: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 4,
  },
  window: {
    width: 28, height: 10,
    backgroundColor: Colors.creamDark,
    borderRadius: 3,
    borderWidth: 1, borderColor: Colors.creamDeep,
  },
  zone:      { gap: 10 },
  zoneLabel: {
    fontFamily: Font.sans, fontSize: 12,
    fontWeight: '600', color: Colors.mocha,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  zoneFloor: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
  },
  tableWrap: { alignItems: 'center', gap: 4 },
  tableNum: {
    fontFamily: Font.sans, fontSize: 15, fontWeight: '700', lineHeight: 18,
  },
  tableCap: {
    fontFamily: Font.sans, fontSize: 10, lineHeight: 12,
  },
  divider: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  dividerLine: {
    flex: 1, height: 0.5, backgroundColor: Colors.creamDeep,
  },
  dividerText: {
    fontFamily: Font.sans, fontSize: 11,
    color: Colors.latte, letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.card,
    borderTopWidth: 1, borderTopColor: Colors.creamDeep,
    paddingTop: 16, paddingHorizontal: 20,
    ...Shadow.card,
  },
  footerContent: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 16,
  },
  footerInfo:    { flex: 1 },
  footerTableNum: {
    fontFamily: Font.serif, fontSize: 20,
    fontWeight: '700', color: Colors.espresso,
  },
  footerMeta:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  footerMetaText: {
    fontFamily: Font.sans, fontSize: 12, color: Colors.mocha,
  },
  footerZone: {
    fontFamily: Font.sans, fontSize: 12, color: Colors.latte,
  },
  confirmBtn: {
    backgroundColor: Colors.espresso,
    borderRadius: Radius.full,
    paddingHorizontal: 22, paddingVertical: 13,
    ...Shadow.sm,
  },
  confirmBtnText: {
    fontFamily: Font.sans, fontSize: 14,
    fontWeight: '700', color: '#FFFFFF',
  },
})