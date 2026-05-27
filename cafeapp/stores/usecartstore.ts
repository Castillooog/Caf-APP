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

export type OrderType = 'dine_in' | 'takeaway'

export type DeliveryInfo = {
  address: string
  city: string
  references: string
  lat?: number
  lng?: number
}

type CartStore = {
  items: CartItem[]
  tableNumber: string | null
  orderType: OrderType
  deliveryInfo: DeliveryInfo | null
  submitting: boolean
  totalItems: () => number
  totalPrice: () => number
  deliveryFee: () => number
  grandTotal: () => number
  getItem: (key: string) => CartItem | undefined
  addItem: (product: Product, options?: Record<string, string>, notes?: string) => void
  removeItem: (key: string) => void
  updateQuantity: (key: string, quantity: number) => void
  setTableNumber: (table: string | null) => void
  setOrderType: (type: OrderType) => void
  setDeliveryInfo: (info: DeliveryInfo | null) => void
  clearCart: () => void
  submitOrder: (userId: string, orderNotes?: string) => Promise<string>
}

// ─── Tarifa de domicilio fija ─────────────────────────────────────────────────
const DELIVERY_FEE = 5000

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
      items:        [],
      tableNumber:  null,
      orderType:    'dine_in',
      deliveryInfo: null,
      submitting:   false,

      totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),

      // Domicilio solo si es para llevar
      deliveryFee: () => get().orderType === 'takeaway' ? DELIVERY_FEE : 0,

      grandTotal: () => {
        const subtotal = get().totalPrice()
        const servicio = Math.round(subtotal * 0.1)
        return subtotal + servicio + get().deliveryFee()
      },

      getItem: (key) => get().items.find(i => i.key === key),

      addItem: (product, options = {}, notes = '') => {
        const key = buildKey(product.id, options)
        set(state => {
          const existing = state.items.find(i => i.key === key)
          if (existing) {
            return { items: state.items.map(i => i.key === key ? { ...i, quantity: i.quantity + 1 } : i) }
          }
          return { items: [...state.items, { product, quantity: 1, selectedOptions: options, notes, key }] }
        })
      },

      removeItem: (key) => set(state => ({ items: state.items.filter(i => i.key !== key) })),

      updateQuantity: (key, quantity) => {
        if (quantity <= 0) { get().removeItem(key); return }
        set(state => ({ items: state.items.map(i => i.key === key ? { ...i, quantity } : i) }))
      },

      setTableNumber:  (table) => set({ tableNumber: table }),
      setOrderType:    (type)  => set({ orderType: type, deliveryInfo: type === 'dine_in' ? null : get().deliveryInfo }),
      setDeliveryInfo: (info)  => set({ deliveryInfo: info }),

      clearCart: () => set({ items: [], tableNumber: null, orderType: 'dine_in', deliveryInfo: null }),

      submitOrder: async (userId, orderNotes) => {
        const { orderType, deliveryInfo, tableNumber, items } = get()

        if (orderType === 'dine_in' && !tableNumber) throw new Error('Selecciona una mesa primero')
        if (orderType === 'takeaway' && !deliveryInfo?.address) throw new Error('Ingresa la dirección de entrega')
        if (items.length === 0) throw new Error('El carrito está vacío')

        set({ submitting: true })
        try {
          const subtotal  = get().totalPrice()
          const servicio  = Math.round(subtotal * 0.1)
          const total     = subtotal + servicio + get().deliveryFee()

          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              user_id:        userId,
              table_number:   orderType === 'dine_in' ? tableNumber : null,
              total,
              notes:          [
                orderNotes,
                orderType === 'takeaway' && deliveryInfo
                  ? `DOMICILIO: ${deliveryInfo.address}, ${deliveryInfo.city}${deliveryInfo.references ? ` — Ref: ${deliveryInfo.references}` : ''}`
                  : null,
              ].filter(Boolean).join(' | ') || null,
              status:         'pending',
              payment_status: 'unpaid',
              payment_method: null,
            })
            .select()
            .single()

          if (orderError || !order) throw orderError ?? new Error('No se pudo crear el pedido')

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(items.map(i => ({
              order_id:         order.id,
              product_id:       i.product.id,
              quantity:         i.quantity,
              unit_price:       i.product.price,
              selected_options: i.selectedOptions,
              notes:            i.notes || null,
            })))

          if (itemsError) throw itemsError

          await supabase.from('notifications').insert({
            user_id:  userId,
            order_id: order.id,
            title:    orderType === 'takeaway' ? '🛵 Pedido para llevar confirmado' : '✅ Pedido confirmado',
            body:     `Tu orden #${order.id.slice(-6).toUpperCase()} ha sido recibida`,
            is_read:  false,
          })

          get().clearCart()
          return order.id
        } finally {
          set({ submitting: false })
        }
      },
    }),
    {
      name:    'cafeteria-cart',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        items:        state.items,
        tableNumber:  state.tableNumber,
        orderType:    state.orderType,
        deliveryInfo: state.deliveryInfo,
      }),
    }
  )
)