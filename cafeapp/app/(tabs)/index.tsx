import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
 StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Animated,
  TextInput,
  TouchableOpacity,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { useFocusEffect } from 'expo-router'
import { Search } from 'lucide-react-native'
import { Colors, Font, Radius } from '@/constants/theme'
import { useCategories, useProducts } from '@/hooks/useSupabase'
import { MenuHeader } from '@/components/menuheader'
import { CategoryTabs } from '@/components/CategoryTabs'
import { ProductCard } from '@/components/Productcard'
import { FeaturedBanner } from '@/components/Featuredbanner'
import { CartBar } from '@/components/CartBar'
import { useLoyaltyStore } from '@/stores/useLoyaltyStore'
import { useAuthStore } from '@/stores/useauthstore'
import { useProductsStore } from '@/stores/useProductsStore'
import type { Product } from '@/lib/supabase'

// Nombre exacto de tu categoría Promociones (debe coincidir con el de Supabase)
const PROMOCIONES_NAME = 'Promociones'

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <View style={sectionStyles.wrapper}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.line} />
      <Text style={sectionStyles.count}>{count}</Text>
    </View>
  )
}

const sectionStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    gap: 10,
  },
  title: {
    fontFamily: Font.serif,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.espresso,
    letterSpacing: -0.2,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.creamDeep,
  },
  count: {
    fontFamily: Font.sans,
    fontSize: 12,
    color: Colors.latte,
    fontWeight: '500',
  },
})

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={searchStyles.wrapper}>
      <Search size={18} color={Colors.latte} strokeWidth={2} />
      <TextInput
        style={searchStyles.input}
        placeholder="Buscar producto..."
        placeholderTextColor={Colors.latte}
        value={value}
        onChangeText={onChange}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChange('')} activeOpacity={0.7}>
          <Text style={searchStyles.clear}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const searchStyles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginBottom: 4,
    marginTop: 8,
    backgroundColor: Colors.creamDark,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Colors.creamDeep,
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.espresso,
  },
  clear: {
    fontSize: 13,
    color: Colors.latte,
    paddingLeft: 8,
  },
})

export default function MenuScreen() {
  const insets = useSafeAreaInsets()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  // Lealtad
  const { profile } = useAuthStore()
  const { tierProducts, loyalty, fetchLoyalty, fetchAllTiers } = useLoyaltyStore()

  // Realtime productos
  const { startRealtime } = useProductsStore()

  // Realtime listener
  useEffect(() => {
    const unsubscribe = startRealtime()

    return unsubscribe
  }, [])

  useEffect(() => {
    if (profile?.id) {
      fetchLoyalty(profile.id)
      fetchAllTiers()
    }
  }, [profile?.id])

  const { categories, loading: catLoading } = useCategories()
  const { products, loading: prodLoading, refetch } = useProducts({
    categoryId: selectedCategoryId ?? undefined,
    search: search.trim(),
  })

  const { products: featuredProducts } = useProducts({ featuredOnly: true })

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id)
    }
  }, [categories, selectedCategoryId])

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0)
      slideAnim.setValue(30)

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start()
    }, [fadeAnim, slideAnim])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)

  // ¿Está seleccionada la categoría Promociones?
  const isPromocionesSelected = selectedCategory?.name === PROMOCIONES_NAME

  // Productos a mostrar: si es Promociones, usar tierProducts del store de lealtad
  const promoProducts: Product[] = isPromocionesSelected
    ? tierProducts.map((tp) => ({
        ...tp.products,
        price: tp.special_price ?? tp.products.price,
        original_price: tp.products.price,
      } as unknown as Product))
    : []

  const displayProducts = isPromocionesSelected ? promoProducts : products
  const displayCount = isPromocionesSelected ? promoProducts.length : products.length

  const renderEmpty = () => {
    if (prodLoading) return null

    if (isPromocionesSelected && tierProducts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎁</Text>
          <Text style={styles.emptyTitle}>Sin promociones</Text>
          <Text style={styles.emptySubtitle}>
            {loyalty?.tier
              ? `Tu nivel ${loyalty.tier.name} no tiene productos especiales por ahora`
              : 'Haz más pedidos para desbloquear promociones exclusivas'}
          </Text>
        </View>
      )
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>☕</Text>
        <Text style={styles.emptyTitle}>Sin resultados</Text>
        <Text style={styles.emptySubtitle}>
          {search
            ? `No encontramos "${search}" en el menú`
            : 'Esta categoría está vacía por ahora'}
        </Text>
      </View>
    )
  }

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard product={item} />
  )

  const ListHeader = (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <MenuHeader />

      <SearchBar value={search} onChange={setSearch} />

      {!search && <FeaturedBanner products={featuredProducts} />}

      {!catLoading && (
        <CategoryTabs
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />
      )}

      {selectedCategory && (
        <SectionTitle title={selectedCategory.name} count={displayCount} />
      )}

      {/* Banner del tier */}
      {isPromocionesSelected && loyalty?.tier && (
        <View
          style={[
            styles.tierBanner,
            {
              borderColor: loyalty.tier.color + '60',
              backgroundColor: loyalty.tier.color + '12',
            },
          ]}
        >
          <Text style={styles.tierBannerIcon}>
            {loyalty.tier.icon}
          </Text>

          <Text
            style={[
              styles.tierBannerText,
              { color: loyalty.tier.color },
            ]}
          >
            Productos exclusivos de tu nivel{' '}
            <Text style={{ fontWeight: '800' }}>
              {loyalty.tier.name}
            </Text>
          </Text>
        </View>
      )}

      {prodLoading && (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="small" color={Colors.terra} />
        </View>
      )}
    </Animated.View>
  )

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <FlatList
        data={displayProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.terra}
            colors={[Colors.terra]}
          />
        }
        removeClippedSubviews
        maxToRenderPerBatch={8}
        windowSize={10}
        initialNumToRender={6}
        getItemLayout={(_, index) => ({
          length: 124,
          offset: 124 * index,
          index,
        })}
      />

      <CartBar />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },

  listContent: {
    flexGrow: 1,
  },

  loadingWrapper: {
    paddingVertical: 32,
    alignItems: 'center',
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 40,
    gap: 10,
  },

  emptyEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },

  emptyTitle: {
    fontFamily: Font.serif,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.espresso,
  },

  emptySubtitle: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.mocha,
    textAlign: 'center',
    lineHeight: 20,
  },

  tierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  tierBannerIcon: {
    fontSize: 20,
  },

  tierBannerText: {
    fontFamily: Font.sans,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
})