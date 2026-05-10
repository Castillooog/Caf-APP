import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno de Supabase. Revisa tu archivo .env');
}

const getStorage = () => {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.sessionStorage : undefined;
  }
  return AsyncStorage;
};

// ✅ En web: storageKey único por pestaña para aislar sesiones completamente
const getStorageKey = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Cada pestaña tiene su propio tabId en sessionStorage
    let tabId = window.sessionStorage.getItem('_tab_id')
    if (!tabId) {
      tabId = crypto.randomUUID()
      window.sessionStorage.setItem('_tab_id', tabId)
    }
    return `sb-auth-${tabId}`
  }
  return 'sb-auth-token'
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    storageKey: getStorageKey(), // ✅ clave única por pestaña
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// ── Tipos ──────────────────────────────────────────────────────────────────

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'customer' | 'staff' | 'admin' | 'waiter' | 'kitchen' | 'cashier';
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  display_order: number;
  is_active: boolean;
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  prep_time_min: number;
  created_at: string;
};

export type ProductOption = {
  id: string;
  product_id: string;
  name: string;
  type: 'single' | 'multiple';
  choices: { label: string; price_delta: number }[];
  is_required: boolean;
};

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type Order = {
  id: string;
  user_id: string;
  status: OrderStatus;
  total: number;
  notes: string | null;
  table_number: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  selected_options: Record<string, string>;
  notes: string | null;
};

export type Notification = {
  id: string;
  user_id: string;
  order_id: string | null;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};