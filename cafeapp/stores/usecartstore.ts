import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Product } from '@/lib/supabase'

export type CartItem = {
  product: Product
  quantity: number
  selectedOptions: Record<string, string>
  notes: string
  key: string
}

type CartStore = {
  items: CartItem[]
  tableNumber: string | null
  totalItems: () => number
  totalPrice: () => number
  getItem: (key: string) => CartItem | undefined
  addItem: (product: Product, options?: Record<string, string>, notes?: string) => void
  removeItem: (key: string) => void
  updateQuantity: (key: string, quantity: number) => void
  setTableNumber: (table: string | null) => void
  clearCart: () => void
}

function buildKey(productId: string, options: Record<string, string>) {
  const sorted = Object.entries(options)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|')
  return `${productId}__${sorted}`
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      tableNumber: null,
      totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: () =>
        get().items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        ),
      getItem: (key) => get().items.find((i) => i.key === key),
      
      addItem: (product, options = {}, notes = '') => {
        const key = buildKey(product.id, options)
        set((state) => {
          const existing = state.items.find((i) => i.key === key)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.key === key ? { ...i, quantity: i.quantity + 1 } : i
              ),
            }
          }
          // ✅ CORREGIDO: quantity (sin espacio)
          return {
            items: [
              ...state.items,
              { product, quantity: 1, selectedOptions: options, notes, key },
            ],
          }
        })
      },
      
      removeItem: (key) =>
        set((state) => ({
          items: state.items.filter((i) => i.key !== key),
        })),
      
      updateQuantity: (key, quantity) => {
        if (quantity <= 0) {
          get().removeItem(key)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.key === key ? { ...i, quantity } : i
          ),
        }))
      },
      
      setTableNumber: (table) => set({ tableNumber: table }),
      clearCart: () => set({ items: [], tableNumber: null }),
    }),
    {
      name: 'cafeteria-cart',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)