import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type LoyaltyTier = {
  id: number
  name: string
  min_orders: number
  discount_pct: number
  color: string
  icon: string
  description: string
}

export type TierProduct = {
  product_id: string
  special_price: number | null
  products: {
    id: string
    name: string
    price: number
    image_url: string | null
    description: string | null
  }
}

export type CustomerLoyalty = {
  tier_id: number
  total_orders: number
  tier: LoyaltyTier
}

type LoyaltyState = {
  loyalty: CustomerLoyalty | null
  allTiers: LoyaltyTier[]
  tierProducts: TierProduct[]
  loading: boolean
  fetchLoyalty: (userId: string) => Promise<void>
  fetchAllTiers: () => Promise<void>
  fetchTierProducts: (tierId: number) => Promise<void>
  // Helpers
  discountPct: () => number
  nextTier: () => LoyaltyTier | null
  ordersToNextTier: () => number
  progressPct: () => number
}

export const useLoyaltyStore = create<LoyaltyState>((set, get) => ({
  loyalty: null,
  allTiers: [],
  tierProducts: [],
  loading: false,

  fetchLoyalty: async (userId: string) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('customer_loyalty')
        .select('tier_id, total_orders, tier:loyalty_tiers(*)')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

      if (data) {
        set({ loyalty: data as unknown as CustomerLoyalty })
        // Cargar productos especiales del tier actual
        await get().fetchTierProducts(data.tier_id)
      }
    } catch (err) {
      console.error('Error fetching loyalty:', err)
    } finally {
      set({ loading: false })
    }
  },

  fetchAllTiers: async () => {
    const { data, error } = await supabase
      .from('loyalty_tiers')
      .select('*')
      .order('min_orders', { ascending: true })
    if (!error && data) set({ allTiers: data })
  },

  fetchTierProducts: async (tierId: number) => {
    const { data, error } = await supabase
      .from('loyalty_tier_products')
      .select('product_id, special_price, products(id, name, price, image_url, description)')
      .eq('tier_id', tierId)
    if (!error && data) set({ tierProducts: data as unknown as TierProduct[] })
  },

  discountPct: () => get().loyalty?.tier.discount_pct ?? 0,

  nextTier: () => {
    const { allTiers, loyalty } = get()
    if (!loyalty) return allTiers.find(t => t.min_orders > 0) ?? null
    return allTiers.find(t => t.min_orders > loyalty.total_orders) ?? null
  },

  ordersToNextTier: () => {
    const { loyalty } = get()
    const next = get().nextTier()
    if (!next || !loyalty) return 0
    return next.min_orders - loyalty.total_orders
  },

  progressPct: () => {
    const { loyalty } = get()
    const next = get().nextTier()
    if (!loyalty) return 0
    if (!next) return 100 // ya está en el nivel máximo
    const current = loyalty.tier.min_orders
    const range = next.min_orders - current
    const done = loyalty.total_orders - current
    return Math.min((done / range) * 100, 100)
  },
}))