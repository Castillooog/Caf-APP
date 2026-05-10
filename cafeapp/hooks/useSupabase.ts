import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Category, Product, Order, Notification } from '@/lib/supabase'
import type { CartItem } from '@/stores/usecartstore'

// ── useCategories ────────────────────────────────────────────────────────────

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setCategories(data ?? [])
        setLoading(false)
      })
  }, [])

  return { categories, loading, error }
}

// ── useProducts ──────────────────────────────────────────────────────────────

type UseProductsOptions = {
  categoryId?: string
  featuredOnly?: boolean
  search?: string
}

export function useProducts(options: UseProductsOptions = {}) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const { categoryId, featuredOnly, search } = options

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('products')
      .select('*')
      .eq('is_available', true)

    if (categoryId)  query = query.eq('category_id', categoryId)
    if (featuredOnly) query = query.eq('is_featured', true)
    if (search)      query = query.ilike('name', `%${search}%`)

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setProducts(data ?? [])
    setLoading(false)
  }, [categoryId, featuredOnly, search])

  useEffect(() => {
    fetch()

    // ✅ Realtime: re-fetch cuando cualquier producto cambie
    // (INSERT, UPDATE, DELETE) — así is_available se refleja al instante
    const channel = supabase
      .channel(`products_realtime_${categoryId ?? 'all'}_${featuredOnly ?? ''}_${search ?? ''}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => fetch()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  return { products, loading, error, refetch: fetch }
}

// ── useOrders ────────────────────────────────────────────────────────────────

export function useOrders(userId: string | undefined) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders(data ?? [])
        setLoading(false)
      })

    const channel = supabase
      .channel(`orders_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) => [payload.new as Order, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === (payload.new as Order).id ? (payload.new as Order) : o
              )
            )
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return { orders, loading }
}

// ── useNotifications ─────────────────────────────────────────────────────────

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount]     = useState(0)

  useEffect(() => {
    if (!userId) return

    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        const notifs = data ?? []
        setNotifications(notifs)
        setUnreadCount(notifs.filter((n) => !n.is_read).length)
      })

    const channel = supabase
      .channel(`notifs_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
          setUnreadCount((c) => c + 1)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const markAllRead = async () => {
    if (!userId) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return { notifications, unreadCount, markAllRead }
}

// ── useCreateOrder ───────────────────────────────────────────────────────────

export function useCreateOrder() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const createOrder = async (
    userId: string,
    items: CartItem[],
    total: number,
    tableNumber: string | null,
    notes: string
  ): Promise<Order | null> => {
    setLoading(true)
    setError(null)

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id:      userId,
        total,
        table_number: tableNumber,
        notes,
        status:       'pending',
      })
      .select()
      .single()

    if (orderError || !order) {
      setError(orderError?.message ?? 'Error al crear el pedido')
      setLoading(false)
      return null
    }

    const orderItems = items.map((item) => ({
      order_id:         order.id,
      product_id:       item.product.id,
      quantity:         item.quantity,
      unit_price:       item.product.price,
      selected_options: item.selectedOptions,
      notes:            item.notes,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      setError(itemsError.message)
      setLoading(false)
      return null
    }

    await supabase.from('payments').insert({
      order_id: order.id,
      amount:   total,
      method:   'cash',
      status:   'pending',
    })

    setLoading(false)
    return order as Order
  }

  return { createOrder, loading, error }
}