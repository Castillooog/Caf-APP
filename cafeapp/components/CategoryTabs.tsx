import React, { useRef } from 'react'
import { ScrollView, TouchableOpacity, Text, View, StyleSheet, Animated, LayoutChangeEvent } from 'react-native'
import { Coffee, UtensilsCrossed, CakeSlice, Star } from 'lucide-react-native'
import { Colors, Font, Radius } from '@/constants/theme'
import type { Category } from '@/lib/supabase'

type Props = { categories: Category[]; selectedId: string | null; onSelect: (id: string) => void }

// ✅ Tipo flexible para evitar conflicto con LucideProps
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  bebidas: Coffee,
  comidas: UtensilsCrossed,
  postres: CakeSlice,
  promo: Star,
}
const FALLBACK_ICON = Star

export function CategoryTabs({ categories, selectedId, onSelect }: Props) {
  const scrollRef = useRef<ScrollView>(null)
  const indicatorAnim = useRef(new Animated.Value(0)).current
  const widthAnim = useRef(new Animated.Value(80)).current
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({})

  const handleLayout = (id: string, e: LayoutChangeEvent) => {
    tabLayouts.current[id] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width }
  }

  const handleSelect = (id: string) => {
    onSelect(id)
    const layout = tabLayouts.current[id]
    if (layout) {
      Animated.parallel([
        Animated.spring(indicatorAnim, { toValue: layout.x, useNativeDriver: false, tension: 60, friction: 10 }),
        Animated.spring(widthAnim, { toValue: layout.width, useNativeDriver: false, tension: 60, friction: 10 }),
      ]).start()
      scrollRef.current?.scrollTo({ x: Math.max(0, layout.x - 24), animated: true })
    }
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={[styles.indicator, { left: indicatorAnim, width: widthAnim }]} />
        {categories.map((cat) => {
          const isSelected = cat.id === selectedId
          const IconComponent = ICON_MAP[cat.slug] ?? FALLBACK_ICON
          return (
            <TouchableOpacity key={cat.id} activeOpacity={0.75} onLayout={(e) => handleLayout(cat.id, e)} onPress={() => handleSelect(cat.id)} style={styles.tab}>
              <IconComponent size={14} color={isSelected ? Colors.cream : Colors.mocha} strokeWidth={2.5} />
              <Text style={[styles.label, isSelected && styles.labelSelected]}>{cat.name}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: Colors.cream, paddingBottom: 2 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 10, gap: 4, flexDirection: 'row', alignItems: 'center' },
  indicator: { position: 'absolute', bottom: 10, height: 38, backgroundColor: Colors.espresso, borderRadius: Radius.full, zIndex: 0 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.full, zIndex: 1 },
  label: { fontFamily: Font.sans, fontSize: 14, fontWeight: '500', color: Colors.mocha, letterSpacing: 0.2 },
  labelSelected: { color: Colors.cream, fontWeight: '600' },
})