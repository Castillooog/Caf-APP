import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Alert,
  Modal, Switch, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import {
  Plus, Search, Edit2, Trash2, X, Check,
  Package, Tag, Clock, ToggleLeft, Star, ChevronDown,
} from 'lucide-react-native'
import { Colors, Font, Radius, Shadow, formatCOP } from '@/constants/theme'
import { supabase } from '@/lib/supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; slug: string }

type Product = {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  is_featured: boolean
  prep_time_min: number
  created_at: string
}

type ProductForm = {
  name: string
  description: string
  price: string
  image_url: string
  is_available: boolean
  is_featured: boolean
  prep_time_min: string
  category_id: string
}

const EMPTY_FORM: ProductForm = {
  name: '', description: '', price: '', image_url: '',
  is_available: true, is_featured: false,
  prep_time_min: '10', category_id: '',
}

// ─── Componente: Fila de producto ─────────────────────────────────────────────

function ProductRow({
  product, category, onEdit, onDelete, onToggle,
}: {
  product: Product
  category?: Category
  onEdit: (p: Product) => void
  onDelete: (p: Product) => void
  onToggle: (p: Product) => void
}) {
  return (
    <View style={row.card}>
      <Image
        source={product.image_url ?? undefined}
        style={row.image}
        contentFit="cover"
      />
      <View style={row.info}>
        <View style={row.topLine}>
          <Text style={row.name} numberOfLines={1}>{product.name}</Text>
          {product.is_featured && (
            <Star size={12} color={Colors.terra} fill={Colors.terra} />
          )}
        </View>
        <Text style={row.category}>{category?.name ?? '—'}</Text>
        <View style={row.meta}>
          <Text style={row.price}>{formatCOP(product.price)}</Text>
          {/* ✅ Badge basado solo en is_available */}
          <View style={[
            row.badge,
            product.is_available
              ? { backgroundColor: Colors.sageDust }
              : { backgroundColor: '#FCEBEB' },
          ]}>
            <Text style={[
              row.badgeText,
              product.is_available
                ? { color: '#3B6D11' }
                : { color: '#A32D2D' },
            ]}>
              {product.is_available ? 'Disponible' : 'No disponible'}
            </Text>
          </View>
        </View>
      </View>

      <View style={row.actions}>
        {/* ✅ Switch controla is_available directamente */}
        <Switch
          value={product.is_available}
          onValueChange={() => onToggle(product)}
          trackColor={{ true: Colors.sage, false: Colors.creamDeep }}
          thumbColor={Colors.white}
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
        <TouchableOpacity style={row.actionBtn} onPress={() => onEdit(product)}>
          <Edit2 size={15} color={Colors.mocha} />
        </TouchableOpacity>
        <TouchableOpacity style={[row.actionBtn, row.deleteBtn]} onPress={() => onDelete(product)}>
          <Trash2 size={15} color={Colors.terra} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const row = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.creamDeep, ...Shadow.sm, gap: 10 },
  image:     { width: 56, height: 56, borderRadius: Radius.md, backgroundColor: Colors.creamDark },
  info:      { flex: 1, gap: 3 },
  topLine:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name:      { fontFamily: Font.sans, fontSize: 14, fontWeight: '700', color: Colors.espresso, flex: 1 },
  category:  { fontFamily: Font.sans, fontSize: 11, color: Colors.latte },
  meta:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  price:     { fontFamily: Font.serif, fontSize: 13, fontWeight: '700', color: Colors.terra },
  badge:     { borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontFamily: Font.sans, fontSize: 10, fontWeight: '600' },
  actions:   { alignItems: 'center', gap: 6 },
  actionBtn: { width: 30, height: 30, borderRadius: Radius.md, backgroundColor: Colors.creamDark, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { backgroundColor: Colors.terraDust },
})

// ─── Componente: Modal de formulario ──────────────────────────────────────────

function ProductFormModal({
  visible, product, categories, onClose, onSave,
}: {
  visible: boolean
  product: Product | null
  categories: Category[]
  onClose: () => void
  onSave: () => void
}) {
  const [form,    setForm]    = useState<ProductForm>(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [showCat, setShowCat] = useState(false)

  useEffect(() => {
    if (product) {
      setForm({
        name:          product.name,
        description:   product.description ?? '',
        price:         String(product.price),
        image_url:     product.image_url ?? '',
        is_available:  product.is_available,
        is_featured:   product.is_featured,
        prep_time_min: String(product.prep_time_min),
        category_id:   product.category_id,
      })
    } else {
      setForm({ ...EMPTY_FORM, category_id: categories[0]?.id ?? '' })
    }
    setShowCat(false)
  }, [product, visible])

  function set(key: keyof ProductForm, value: any) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.name.trim())         return Alert.alert('Error', 'El nombre es requerido')
    if (!form.price.trim())        return Alert.alert('Error', 'El precio es requerido')
    if (!form.category_id)         return Alert.alert('Error', 'Selecciona una categoría')
    if (isNaN(Number(form.price))) return Alert.alert('Error', 'El precio debe ser un número')

    setSaving(true)
    try {
      // ✅ Payload sin stock — solo is_available
      const payload = {
        name:          form.name.trim(),
        description:   form.description.trim() || null,
        price:         Number(form.price),
        image_url:     form.image_url.trim() || null,
        is_available:  form.is_available,
        is_featured:   form.is_featured,
        prep_time_min: Number(form.prep_time_min) || 10,
        category_id:   form.category_id,
      }

      if (product) {
        const { error } = await supabase.from('products').update(payload).eq('id', product.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('products').insert(payload)
        if (error) throw error
      }

      onSave()
      onClose()
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const selectedCat = categories.find(c => c.id === form.category_id)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={fm.screen}>
          {/* Header */}
          <View style={fm.header}>
            <TouchableOpacity onPress={onClose} style={fm.headerBtn}>
              <X size={20} color={Colors.mocha} />
            </TouchableOpacity>
            <Text style={fm.title}>{product ? 'Editar producto' : 'Nuevo producto'}</Text>
            <TouchableOpacity onPress={handleSave} style={[fm.headerBtn, fm.saveBtn]} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={Colors.white} />
                : <Check size={20} color={Colors.white} />}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={fm.scroll} showsVerticalScrollIndicator={false}>

            {/* Preview imagen */}
            {form.image_url ? (
              <Image source={form.image_url} style={fm.imagePreview} contentFit="cover" />
            ) : (
              <View style={fm.imagePlaceholder}>
                <Package size={32} color={Colors.latte} />
                <Text style={fm.imagePlaceholderText}>Sin imagen</Text>
              </View>
            )}

            {/* Información básica */}
            <View style={fm.section}>
              <Text style={fm.sectionTitle}>Información básica</Text>

              <Field label="Nombre del producto" required>
                <TextInput
                  style={fm.input}
                  value={form.name}
                  onChangeText={v => set('name', v)}
                  placeholder="Ej. Lavender Oat Latte"
                  placeholderTextColor={Colors.latte}
                />
              </Field>

              <Field label="Descripción">
                <TextInput
                  style={[fm.input, fm.textarea]}
                  value={form.description}
                  onChangeText={v => set('description', v)}
                  placeholder="Descripción del producto..."
                  placeholderTextColor={Colors.latte}
                  multiline
                  numberOfLines={3}
                />
              </Field>

              <Field label="URL de imagen">
                <TextInput
                  style={fm.input}
                  value={form.image_url}
                  onChangeText={v => set('image_url', v)}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor={Colors.latte}
                  autoCapitalize="none"
                />
              </Field>

              <Field label="Categoría" required>
                <TouchableOpacity style={fm.select} onPress={() => setShowCat(!showCat)}>
                  <Tag size={14} color={Colors.latte} />
                  <Text style={[fm.selectText, !selectedCat && { color: Colors.latte }]}>
                    {selectedCat?.name ?? 'Seleccionar categoría'}
                  </Text>
                  <ChevronDown size={14} color={Colors.latte} />
                </TouchableOpacity>
                {showCat && (
                  <View style={fm.dropdown}>
                    {categories.map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[fm.dropdownItem, form.category_id === cat.id && fm.dropdownItemActive]}
                        onPress={() => { set('category_id', cat.id); setShowCat(false) }}
                      >
                        <Text style={[fm.dropdownText, form.category_id === cat.id && { color: Colors.terra, fontWeight: '700' }]}>
                          {cat.name}
                        </Text>
                        {form.category_id === cat.id && <Check size={14} color={Colors.terra} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Field>
            </View>

            {/* Precio y tiempo */}
            <View style={fm.section}>
              <Text style={fm.sectionTitle}>Precio y preparación</Text>

              <Field label="Precio (COP)" required>
                <TextInput
                  style={fm.input}
                  value={form.price}
                  onChangeText={v => set('price', v)}
                  placeholder="12000"
                  placeholderTextColor={Colors.latte}
                  keyboardType="numeric"
                />
              </Field>

              <Field label="Tiempo de preparación (min)">
                <View style={fm.row}>
                  {[5, 10, 15, 20, 30].map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[fm.timeChip, Number(form.prep_time_min) === t && fm.timeChipActive]}
                      onPress={() => set('prep_time_min', String(t))}
                    >
                      <Clock size={11} color={Number(form.prep_time_min) === t ? Colors.white : Colors.mocha} />
                      <Text style={[fm.timeChipText, Number(form.prep_time_min) === t && { color: Colors.white }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>
            </View>

            {/* Opciones */}
            <View style={fm.section}>
              <Text style={fm.sectionTitle}>Opciones</Text>

              <View style={fm.toggleRow}>
                <View style={fm.toggleLeft}>
                  <ToggleLeft size={16} color={Colors.mocha} />
                  <View>
                    <Text style={fm.toggleLabel}>Disponible</Text>
                    <Text style={fm.toggleSub}>Visible y ordenable por clientes</Text>
                  </View>
                </View>
                <Switch
                  value={form.is_available}
                  onValueChange={v => set('is_available', v)}
                  trackColor={{ true: Colors.sage, false: Colors.creamDeep }}
                  thumbColor={Colors.white}
                />
              </View>

              <View style={[fm.toggleRow, { marginTop: 12 }]}>
                <View style={fm.toggleLeft}>
                  <Star size={16} color={Colors.terra} />
                  <View>
                    <Text style={fm.toggleLabel}>Destacado</Text>
                    <Text style={fm.toggleSub}>Aparece en el banner principal</Text>
                  </View>
                </View>
                <Switch
                  value={form.is_featured}
                  onValueChange={v => set('is_featured', v)}
                  trackColor={{ true: Colors.terra, false: Colors.creamDeep }}
                  thumbColor={Colors.white}
                />
              </View>
            </View>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={fm.field}>
      <Text style={fm.label}>{label}{required ? <Text style={{ color: Colors.terra }}> *</Text> : ''}</Text>
      {children}
    </View>
  )
}

const fm = StyleSheet.create({
  screen:               { flex: 1, backgroundColor: Colors.cream },
  header:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.creamDeep },
  headerBtn:            { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.creamDark, alignItems: 'center', justifyContent: 'center' },
  saveBtn:              { backgroundColor: Colors.espresso },
  title:                { fontFamily: Font.serif, fontSize: 17, fontWeight: '700', color: Colors.espresso },
  scroll:               { padding: 16, gap: 4, paddingBottom: 60 },
  imagePreview:         { width: '100%', height: 180, borderRadius: Radius.lg, marginBottom: 16, backgroundColor: Colors.creamDark },
  imagePlaceholder:     { width: '100%', height: 120, borderRadius: Radius.lg, backgroundColor: Colors.creamDark, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  imagePlaceholderText: { fontFamily: Font.sans, fontSize: 12, color: Colors.latte },
  section:              { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 16, borderWidth: 1, borderColor: Colors.creamDeep, gap: 12, marginBottom: 12, ...Shadow.sm },
  sectionTitle:         { fontFamily: Font.sans, fontSize: 12, fontWeight: '700', color: Colors.latte, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  field:                { gap: 6 },
  label:                { fontFamily: Font.sans, fontSize: 13, fontWeight: '600', color: Colors.mocha },
  input:                { backgroundColor: Colors.creamDark, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 11, fontFamily: Font.sans, fontSize: 14, color: Colors.espresso, borderWidth: 1, borderColor: Colors.creamDeep },
  textarea:             { height: 80, textAlignVertical: 'top' },
  select:               { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.creamDark, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: Colors.creamDeep },
  selectText:           { fontFamily: Font.sans, fontSize: 14, color: Colors.espresso, flex: 1 },
  dropdown:             { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.creamDeep, overflow: 'hidden', marginTop: 4, ...Shadow.sm },
  dropdownItem:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  dropdownItemActive:   { backgroundColor: Colors.terraDust },
  dropdownText:         { fontFamily: Font.sans, fontSize: 14, color: Colors.espresso },
  row:                  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  timeChip:             { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.creamDark, borderWidth: 1, borderColor: Colors.creamDeep },
  timeChipActive:       { backgroundColor: Colors.espresso, borderColor: Colors.espresso },
  timeChipText:         { fontFamily: Font.sans, fontSize: 12, fontWeight: '600', color: Colors.mocha },
  toggleRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLeft:           { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  toggleLabel:          { fontFamily: Font.sans, fontSize: 14, fontWeight: '600', color: Colors.espresso },
  toggleSub:            { fontFamily: Font.sans, fontSize: 11, color: Colors.latte },
})

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function AdminProductsScreen() {
  const insets = useSafeAreaInsets()
  const [products,   setProducts]   = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filterCat,  setFilterCat]  = useState<string | null>(null)
  const [showForm,   setShowForm]   = useState(false)
  const [editing,    setEditing]    = useState<Product | null>(null)
  // ✅ Filtro por disponibilidad en lugar de stock
  const [filterAvail, setFilterAvail] = useState<'all' | 'available' | 'unavailable'>('all')

  const fetchAll = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('categories').select('id, name, slug').order('display_order'),
      ])
      if (prodRes.error) throw prodRes.error
      if (catRes.error)  throw catRes.error
      setProducts(prodRes.data ?? [])
      setCategories(catRes.data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function handleEdit(p: Product) { setEditing(p); setShowForm(true) }
  function handleNew()            { setEditing(null); setShowForm(true) }

  async function handleDelete(p: Product) {
    Alert.alert(
      'Eliminar producto',
      `¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('products').delete().eq('id', p.id)
            if (error) Alert.alert('Error', error.message)
            else fetchAll()
          },
        },
      ]
    )
  }

  async function handleToggle(p: Product) {
    const { error } = await supabase
      .from('products')
      .update({ is_available: !p.is_available })
      .eq('id', p.id)
    if (!error) setProducts(prev =>
      prev.map(x => x.id === p.id ? { ...x, is_available: !x.is_available } : x)
    )
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat    = filterCat ? p.category_id === filterCat : true
    const matchAvail  = filterAvail === 'available'   ? p.is_available
                      : filterAvail === 'unavailable' ? !p.is_available
                      : true
    return matchSearch && matchCat && matchAvail
  })

  const unavailableCount = products.filter(p => !p.is_available).length
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Productos</Text>
          <Text style={s.sub}>
            {products.length} en total · {products.filter(p => p.is_available).length} disponibles
          </Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={handleNew} activeOpacity={0.8}>
          <Plus size={18} color={Colors.white} />
          <Text style={s.addBtnText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={s.searchRow}>
        <View style={s.searchWrap}>
          <Search size={16} color={Colors.latte} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar producto..."
            placeholderTextColor={Colors.latte}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={14} color={Colors.latte} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
        <TouchableOpacity
          style={[s.chip, filterAvail === 'all' && !filterCat && s.chipActive]}
          onPress={() => { setFilterAvail('all'); setFilterCat(null) }}
        >
          <Text style={[s.chipText, filterAvail === 'all' && !filterCat && s.chipTextActive]}>Todos</Text>
        </TouchableOpacity>

        {/* ✅ Filtro por disponibilidad */}
        <TouchableOpacity
          style={[s.chip, filterAvail === 'available' && s.chipActive]}
          onPress={() => { setFilterAvail('available'); setFilterCat(null) }}
        >
          <Text style={[s.chipText, filterAvail === 'available' && s.chipTextActive]}>✓ Disponibles</Text>
        </TouchableOpacity>

        {unavailableCount > 0 && (
          <TouchableOpacity
            style={[s.chip, filterAvail === 'unavailable' && { backgroundColor: '#FCEBEB', borderColor: '#E24B4A' }]}
            onPress={() => { setFilterAvail('unavailable'); setFilterCat(null) }}
          >
            <Text style={[s.chipText, filterAvail === 'unavailable' && { color: '#A32D2D', fontWeight: '700' }]}>
              ✕ No disponibles ({unavailableCount})
            </Text>
          </TouchableOpacity>
        )}

        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[s.chip, filterCat === cat.id && s.chipActive]}
            onPress={() => { setFilterCat(cat.id); setFilterAvail('all') }}
          >
            <Text style={[s.chipText, filterCat === cat.id && s.chipTextActive]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista */}
      {loading ? (
        <View style={s.centered}><ActivityIndicator color={Colors.terra} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductRow
              product={item}
              category={catMap[item.category_id]}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>📦</Text>
              <Text style={s.emptyTitle}>Sin productos</Text>
              <Text style={s.emptySub}>
                {search ? `No hay resultados para "${search}"` : 'Agrega tu primer producto'}
              </Text>
            </View>
          }
        />
      )}

      <ProductFormModal
        visible={showForm}
        product={editing}
        categories={categories}
        onClose={() => setShowForm(false)}
        onSave={fetchAll}
      />
    </View>
  )
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: Colors.cream },
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.creamDeep },
  title:         { fontFamily: Font.serif, fontSize: 24, fontWeight: '700', color: Colors.espresso },
  sub:           { fontFamily: Font.sans, fontSize: 12, color: Colors.latte, marginTop: 2 },
  addBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.espresso, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText:    { fontFamily: Font.sans, fontSize: 13, fontWeight: '700', color: Colors.white },
  searchRow:     { paddingHorizontal: 16, paddingVertical: 10 },
  searchWrap:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.card, borderRadius: Radius.lg, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.creamDeep },
  searchInput:   { flex: 1, fontFamily: Font.sans, fontSize: 14, color: Colors.espresso },
  filters:       { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  chip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.creamDeep },
  chipActive:    { backgroundColor: Colors.espresso, borderColor: Colors.espresso },
  chipText:      { fontFamily: Font.sans, fontSize: 13, color: Colors.mocha },
  chipTextActive:{ color: Colors.white, fontWeight: '700' },
  list:          { padding: 16, paddingBottom: 40 },
  empty:         { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyEmoji:    { fontSize: 40 },
  emptyTitle:    { fontFamily: Font.serif, fontSize: 18, fontWeight: '700', color: Colors.espresso },
  emptySub:      { fontFamily: Font.sans, fontSize: 14, color: Colors.mocha, textAlign: 'center' },
})