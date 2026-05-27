import React, { useRef, useEffect } from 'react'
import {
  ScrollView, TouchableOpacity, Text, View,
  StyleSheet, Animated, LayoutChangeEvent,
} from 'react-native'
import { Coffee, UtensilsCrossed, CakeSlice, Star, Tag } from 'lucide-react-native'
import { Colors, Font, Radius } from '@/constants/theme'
import type { Category } from '@/lib/supabase'

type Props = { categories: Category[]; selectedId: string | null; onSelect: (id: string) => void }

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  bebidas:     Coffee,
  comidas:     UtensilsCrossed,
  postres:     CakeSlice,
  promo:       Star,
  promociones: Star,
}

export function CategoryTabs({ categories, selectedId, onSelect }: Props) {
  const scrollRef    = useRef<ScrollView>(null)
  const slideX       = useRef(new Animated.Value(0)).current
  const slideW       = useRef(new Animated.Value(80)).current
  const layouts      = useRef<Record<string, { x: number; width: number }>>({})
  const isFirstMount = useRef(true)

  // Mueve el indicador cuando cambia selectedId (incluye la carga inicial)
  useEffect(() => {
    if (!selectedId) return
    const layout = layouts.current[selectedId]
    if (!layout) return

    if (isFirstMount.current) {
      // Sin animación en el primer render
      slideX.setValue(layout.x)
      slideW.setValue(layout.width)
      isFirstMount.current = false
    } else {
      Animated.parallel([
        Animated.spring(slideX, { toValue: layout.x,     useNativeDriver: false, tension: 70, friction: 11 }),
        Animated.spring(slideW, { toValue: layout.width, useNativeDriver: false, tension: 70, friction: 11 }),
      ]).start()
      scrollRef.current?.scrollTo({ x: Math.max(0, layout.x - 24), animated: true })
    }
  }, [selectedId])

  const handleLayout = (id: string, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout
    layouts.current[id] = { x, width }
    // Ajusta el indicador al montar si este es el tab activo
    if (id === selectedId) {
      slideX.setValue(x)
      slideW.setValue(width)
    }
  }

  return (
    <View style={s.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        bounces
      >
        {/* Indicador deslizante */}
        <Animated.View style={[s.indicator, { left: slideX, width: slideW }]} />

        {categories.map(cat => {
          const isActive = cat.id === selectedId
          const Icon = ICON_MAP[cat.slug?.toLowerCase()] ?? Tag
          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.75}
              onLayout={e => handleLayout(cat.id, e)}
              onPress={() => onSelect(cat.id)}
              style={s.tab}
            >
              <Icon
                size={15}
                color={isActive ? Colors.cream : Colors.mocha}
                strokeWidth={2.2}
              />
              <Text style={[s.label, isActive && s.labelActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.cream,
    paddingBottom: 4,
    // Separador sutil abajo
    borderBottomWidth: 1,
    borderBottomColor: Colors.creamDeep,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    // Centrado vertical dentro del scroll: paddingVertical=10, tab height≈40 → top=10
    top: 10,
    height: 40,
    backgroundColor: Colors.espresso,
    borderRadius: Radius.full,
    zIndex: 0,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    zIndex: 1,
    // Altura mínima para no cortar texto
    minHeight: 40,
  },
  label: {
    fontFamily: Font.sans,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.mocha,
    letterSpacing: 0.1,
  },
  labelActive: {
    color: Colors.cream,
    fontWeight: '700',
  },
})