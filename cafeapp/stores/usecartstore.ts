import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
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
  submitting: boolean
  totalItems: () => number
  totalPrice: () => number
  getItem: (key: string) => CartItem | undefined
  addItem: (product: Product, options?: Record<string, string>, notes?: string) => void
  removeItem: (key: string) => void
  updateQuantity: (key: string, quantity: number) => void
  setTableNumber: (table: string | null) => void
  clearCart: () => void
  submitOrder: (userId: string, orderNotes?: string) => Promise<string>
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
      submitting: false,

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

      submitOrder: async (userId, orderNotes) => {
        const { tableNumber, items } = get()
        if (!tableNumber) throw new Error('Selecciona una mesa primero')
        if (items.length === 0) throw new Error('El carrito está vacío')

        set({ submitting: true })
        try {
          const total = get().totalPrice()

          // 1. Crear el pedido
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              user_id:      userId,
              table_number: tableNumber,
              total,
              notes:        orderNotes ?? null,
              status:       'pending',
            })
            .select()
            .single()

          if (orderError) throw orderError

          // 2. Insertar items — combina notes del item con selectedOptions
          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(
              items.map((i) => ({
                order_id:   order.id,
                product_id: i.product.id,
                quantity:   i.quantity,
                unit_price: i.product.price,
                notes: [
                  i.notes,
                  Object.entries(i.selectedOptions)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', '),
                ]
                  .filter(Boolean)
                  .join(' — ') || null,
              }))
            )

          if (itemsError) throw itemsError

          get().clearCart()
          return order.id
        } finally {
          set({ submitting: false })
        }
      },
    }),
    {
      name: 'cafeteria-cart',
      storage: createJSONStorage(() => AsyncStorage),
      // No persistir submitting — solo items y mesa
      partialize: (state) => ({
        items:       state.items,
        tableNumber: state.tableNumber,
      }),
    }
  )
)