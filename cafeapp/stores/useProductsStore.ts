import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// useProductsStore
//
// Store global de productos. Mantiene una copia en memoria y escucha cambios
// en tiempo real desde Supabase (tabla `products`). Cuando el admin cambia
// `is_available`, todos los componentes que lean de este store se actualizan
// automáticamente sin necesidad de refetch.
//
// USO:
//   const { products, updateAvailability } = useProductsStore()
//
// En _id_.tsx: reemplaza el estado local `product` con este store.
// En index.tsx / useProducts: filtra desde `useProductsStore().products`.
// ─────────────────────────────────────────────────────────────────────────────

type ProductsState = {
  products: Product[]
  loading: boolean
  realtimeReady: boolean

  fetchProducts: () => Promise<void>
  updateAvailability: (id: string, isAvailable: boolean) => Promise<void>
  getProduct: (id: string) => Product | undefined
  startRealtime: () => () => void   // devuelve unsubscribe
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  loading: false,
  realtimeReady: false,

  fetchProducts: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      set({ products: data ?? [] })
    } catch (err) {
      console.error('[useProductsStore] fetchProducts:', err)
    } finally {
      set({ loading: false })
    }
  },

  updateAvailability: async (id: string, isAvailable: boolean) => {
    // Optimistic update — actualiza localmente de inmediato
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, is_available: isAvailable } : p
      ),
    }))

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_available: isAvailable })
        .eq('id', id)
      if (error) throw error
    } catch (err) {
      // Revertir si falla
      console.error('[useProductsStore] updateAvailability:', err)
      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, is_available: !isAvailable } : p
        ),
      }))
    }
  },

  getProduct: (id: string) => get().products.find((p) => p.id === id),

  startRealtime: () => {
    const channel = supabase
      .channel('products-availability')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          const updated = payload.new as Product
          set((state) => ({
            products: state.products.map((p) =>
              p.id === updated.id ? { ...p, ...updated } : p
            ),
          }))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') set({ realtimeReady: true })
      })

    // Devuelve función para cancelar la suscripción (úsala en useEffect cleanup)
    return () => {
      supabase.removeChannel(channel)
      set({ realtimeReady: false })
    }
  },
}))