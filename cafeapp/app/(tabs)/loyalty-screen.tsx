import React, { useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import {
  ArrowLeft, Star, ShoppingBag, Percent, Gift,
  Award, Shield, Zap, Crown, ChevronRight, TrendingUp,
} from 'lucide-react-native'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { useAuthStore } from '@/stores/useauthstore'
import { useLoyaltyStore } from '@/stores/useLoyaltyStore'
import { Image } from 'expo-image'

// ─── Mapa de íconos por nombre de tier ───────────────────────────────────────
// Ajusta los nombres para que coincidan con tus tiers en Supabase

function TierIcon({ name, size, color }: { name: string; size: number; color: string }) {
  const n = name?.toLowerCase() ?? ''
  if (n.includes('platin')) return <Crown size={size} color={color} strokeWidth={2} />
  if (n.includes('oro') || n.includes('gold')) return <Star size={size} color={color} strokeWidth={2} />
  if (n.includes('plata') || n.includes('silver')) return <Shield size={size} color={color} strokeWidth={2} />
  if (n.includes('bronce') || n.includes('bronze')) return <Award size={size} color={color} strokeWidth={2} />
  return <Zap size={size} color={color} strokeWidth={2} />
}

// ─── Barra de progreso ────────────────────────────────────────────────────────

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${Math.max(pct, 4)}%`, backgroundColor: color }]}>
        <View style={[pb.glow, { backgroundColor: color + '60' }]} />
      </View>
    </View>
  )
}

const pb = StyleSheet.create({
  track: { height: 8, backgroundColor: Colors.creamDark, borderRadius: 8, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 8, position: 'relative', overflow: 'hidden' },
  glow:  { position: 'absolute', top: 0, right: 0, bottom: 0, width: 24, borderRadius: 8 },
})

// ─── Tarjeta de nivel ─────────────────────────────────────────────────────────

function TierCard({
  name, color, minOrders, discountPct, description, isActive, isCurrent,
}: {
  name: string; color: string; minOrders: number
  discountPct: number; description: string; isActive: boolean; isCurrent: boolean
}) {
  return (
    <View style={[
      tc.card,
      isCurrent && { borderColor: color, borderWidth: 1.5 },
      !isActive && tc.locked,
    ]}>
      {/* Ícono del tier */}
      <View style={[tc.iconWrap, { backgroundColor: isActive ? color + '18' : Colors.creamDark }]}>
        <TierIcon name={name} size={20} color={isActive ? color : Colors.latte} />
      </View>

      <View style={tc.middle}>
        <View style={tc.nameRow}>
          <Text style={[tc.name, isActive && { color }]}>{name}</Text>
          {isCurrent && (
            <View style={[tc.badge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
              <Star size={9} color={color} strokeWidth={2.5} />
              <Text style={[tc.badgeText, { color }]}>Tu nivel</Text>
            </View>
          )}
        </View>
        <Text style={tc.req}>{minOrders === 0 ? 'Nivel inicial' : `Desde ${minOrders} pedidos`}</Text>
        <Text style={tc.desc}>{description}</Text>
      </View>

      <View style={[tc.pctWrap, { backgroundColor: isActive ? color + '14' : Colors.creamDark }]}>
        <Text style={[tc.pct, { color: isActive ? color : Colors.latte }]}>{discountPct}%</Text>
        <Text style={[tc.pctLabel, { color: isActive ? color + 'CC' : Colors.latte }]}>dto.</Text>
      </View>
    </View>
  )
}

const tc = StyleSheet.create({
  card:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  locked:   { opacity: 0.4 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  middle:   { flex: 1, gap: 2 },
  nameRow:  { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  name:     { fontFamily: Font.serif, fontSize: 16, fontWeight: '700', color: Colors.espresso },
  req:      { fontFamily: Font.sans, fontSize: 11, color: Colors.latte },
  desc:     { fontFamily: Font.sans, fontSize: 12, color: Colors.mocha, lineHeight: 17 },
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText:{ fontFamily: Font.sans, fontSize: 10, fontWeight: '700' },
  pctWrap:  { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', minWidth: 50 },
  pct:      { fontFamily: Font.serif, fontSize: 18, fontWeight: '800' },
  pctLabel: { fontFamily: Font.sans, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
})

// ─── Producto especial ────────────────────────────────────────────────────────

function SpecialProductCard({ item }: { item: { product_id: string; special_price: number | null; products: any } }) {
  const { products: p, special_price } = item
  const hasSpecialPrice = special_price !== null && special_price < p.price
  return (
    <TouchableOpacity style={sp.card} onPress={() => router.push(`/product/${p.id}`)} activeOpacity={0.8}>
      <Image source={p.image_url ?? undefined} contentFit="cover" style={sp.image} />
      {hasSpecialPrice && (
        <View style={sp.ribbon}>
          <Percent size={8} color="#fff" strokeWidth={3} />
          <Text style={sp.ribbonText}>Oferta</Text>
        </View>
      )}
      <View style={sp.info}>
        <Text style={sp.name} numberOfLines={1}>{p.name}</Text>
        <View style={sp.priceRow}>
          {hasSpecialPrice ? (
            <>
              <Text style={sp.specialPrice}>{formatCOP(special_price!)}</Text>
              <Text style={sp.originalPrice}>{formatCOP(p.price)}</Text>
            </>
          ) : (
            <Text style={sp.normalPrice}>{formatCOP(p.price)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const sp = StyleSheet.create({
  card:          { width: 148, borderRadius: 14, overflow: 'hidden', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  image:         { width: '100%', height: 100 },
  ribbon:        { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.terra, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  ribbonText:    { fontFamily: Font.sans, fontSize: 9, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  info:          { padding: 10, gap: 4 },
  name:          { fontFamily: Font.sans, fontSize: 13, fontWeight: '700', color: Colors.espresso },
  priceRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  specialPrice:  { fontFamily: Font.serif, fontSize: 14, fontWeight: '700', color: Colors.terra },
  originalPrice: { fontFamily: Font.sans, fontSize: 11, color: Colors.latte, textDecorationLine: 'line-through' },
  normalPrice:   { fontFamily: Font.serif, fontSize: 14, fontWeight: '700', color: Colors.espresso },
})

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <View style={stat.wrap}>
      <View style={stat.iconWrap}>{icon}</View>
      <Text style={stat.value}>{value}</Text>
      <Text style={stat.label}>{label}</Text>
    </View>
  )
}

const stat = StyleSheet.create({
  wrap:    { alignItems: 'center', gap: 4 },
  iconWrap:{ width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.creamDark, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  value:   { fontFamily: Font.serif, fontSize: 22, fontWeight: '800', color: Colors.espresso },
  label:   { fontFamily: Font.sans, fontSize: 11, color: Colors.latte },
})

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function LoyaltyScreen() {
  const insets = useSafeAreaInsets()
  const { profile } = useAuthStore()
  const {
    loyalty, allTiers, tierProducts, loading,
    fetchLoyalty, fetchAllTiers,
    nextTier, ordersToNextTier, progressPct,
  } = useLoyaltyStore()

  useEffect(() => {
    if (profile?.id) {
      fetchLoyalty(profile.id)
      fetchAllTiers()
    }
  }, [profile?.id])

  if (loading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.terra} />
      </View>
    )
  }

  const tier = loyalty?.tier
  const tierColor = tier?.color ?? '#9CA3AF'
  const next = nextTier()
  const toNext = ordersToNextTier()
  const pct = progressPct()
  const isMaxTier = !next

  return (
    <ScrollView
      style={[s.screen, { paddingTop: insets.top }]}
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.espresso} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Fidelidad</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Hero card */}
      <View style={[s.heroCard, { borderColor: tierColor + '60' }]}>
        {/* Fondo decorativo */}
        <View style={[s.heroBg, { backgroundColor: tierColor + '0C' }]} />

        {/* Ícono grande del tier */}
        <View style={[s.heroIconRing, { borderColor: tierColor + '30', backgroundColor: tierColor + '12' }]}>
          <TierIcon name={tier?.name ?? ''} size={36} color={tierColor} />
        </View>

        <Text style={[s.heroTierName, { color: tierColor }]}>{tier?.name ?? 'Sin nivel'}</Text>
        <Text style={s.heroUserName}>{profile?.full_name ?? 'Cliente'}</Text>

        {/* Stats */}
        <View style={s.statsRow}>
          <StatPill
            icon={<ShoppingBag size={16} color={Colors.mocha} strokeWidth={1.8} />}
            value={loyalty?.total_orders ?? 0}
            label="pedidos"
          />
          <View style={s.statsDivider} />
          <StatPill
            icon={<Percent size={16} color={Colors.mocha} strokeWidth={1.8} />}
            value={`${tier?.discount_pct ?? 0}%`}
            label="descuento"
          />
          {!isMaxTier && (
            <>
              <View style={s.statsDivider} />
              <StatPill
                icon={<TrendingUp size={16} color={Colors.mocha} strokeWidth={1.8} />}
                value={toNext}
                label="para subir"
              />
            </>
          )}
        </View>

        {/* Progreso */}
        {isMaxTier ? (
          <View style={[s.maxBadge, { backgroundColor: tierColor + '14', borderColor: tierColor + '30' }]}>
            <Crown size={14} color={tierColor} strokeWidth={2} />
            <Text style={[s.maxText, { color: tierColor }]}>¡Nivel máximo alcanzado!</Text>
          </View>
        ) : (
          <View style={s.progressSection}>
            <View style={s.progressHeader}>
              <View style={s.progressNextWrap}>
                <TierIcon name={next?.name ?? ''} size={13} color={Colors.mocha} />
                <Text style={s.progressLabel}>Próximo: {next?.name}</Text>
              </View>
              <Text style={s.progressCount}>{toNext} pedido{toNext !== 1 ? 's' : ''}</Text>
            </View>
            <ProgressBar pct={pct} color={tierColor} />
          </View>
        )}
      </View>

      {/* Banner descuento activo */}
      {(tier?.discount_pct ?? 0) > 0 && (
        <View style={[s.discountBanner, { borderColor: tierColor + '40', backgroundColor: tierColor + '0E' }]}>
          <View style={[s.discountIconWrap, { backgroundColor: tierColor + '20' }]}>
            <Percent size={18} color={tierColor} strokeWidth={2} />
          </View>
          <Text style={[s.discountText, { color: tierColor }]}>
            Tienes <Text style={{ fontWeight: '800' }}>{tier!.discount_pct}% de descuento</Text> aplicado automáticamente en cada pedido
          </Text>
        </View>
      )}

      {/* Productos especiales del tier */}
      {tierProducts.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionIconWrap}>
              <Gift size={15} color={Colors.espresso} strokeWidth={2} />
            </View>
            <Text style={s.sectionTitle}>Productos de tu nivel</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.productsRow}>
            {tierProducts.map(item => (
              <SpecialProductCard key={item.product_id} item={item} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Todos los niveles */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <View style={s.sectionIconWrap}>
            <Award size={15} color={Colors.espresso} strokeWidth={2} />
          </View>
          <Text style={s.sectionTitle}>Todos los niveles</Text>
        </View>
        <View style={s.tiersList}>
          {allTiers.filter(t => t.min_orders > 0).map(t => (
            <TierCard
              key={t.id}
              name={t.name}
              color={t.color}
              minOrders={t.min_orders}
              discountPct={t.discount_pct}
              description={t.description}
              isActive={(loyalty?.total_orders ?? 0) >= t.min_orders}
              isCurrent={loyalty?.tier_id === t.id}
            />
          ))}
        </View>
      </View>

      <View style={{ height: insets.bottom + 24 }} />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: Colors.background },
  scroll:  { padding: 16, gap: 16 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  headerTitle: { fontFamily: Font.serif, fontSize: 18, fontWeight: '700', color: Colors.espresso },

  heroCard:     { backgroundColor: Colors.card, borderRadius: 22, padding: 24, borderWidth: 1.5, alignItems: 'center', gap: 10, overflow: 'hidden', ...Shadow.card },
  heroBg:       { position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 90 },
  heroIconRing: { width: 80, height: 80, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTierName: { fontFamily: Font.serif, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  heroUserName: { fontFamily: Font.sans, fontSize: 13, color: Colors.latte, marginBottom: 4 },

  statsRow:    { flexDirection: 'row', alignItems: 'center', gap: 20, marginVertical: 4 },
  statsDivider:{ width: 1, height: 40, backgroundColor: Colors.border },

  progressSection: { width: '100%', gap: 8, marginTop: 4 },
  progressHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressNextWrap:{ flexDirection: 'row', alignItems: 'center', gap: 5 },
  progressLabel:   { fontFamily: Font.sans, fontSize: 12, color: Colors.mocha, fontWeight: '600' },
  progressCount:   { fontFamily: Font.sans, fontSize: 12, color: Colors.latte },

  maxBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4 },
  maxText:  { fontFamily: Font.sans, fontSize: 13, fontWeight: '700' },

  discountBanner:   { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
  discountIconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  discountText:     { fontFamily: Font.sans, fontSize: 13, flex: 1, lineHeight: 19 },

  section:       { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconWrap:{ width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.creamDark, alignItems: 'center', justifyContent: 'center' },
  sectionTitle:  { fontFamily: Font.sans, fontSize: 15, fontWeight: '700', color: Colors.espresso },
  productsRow:   { gap: 12, paddingBottom: 4 },
  tiersList:     { gap: 8 },
})