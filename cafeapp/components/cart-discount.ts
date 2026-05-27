// ─────────────────────────────────────────────────────────────────────────────
// cart-discount.ts  –  Helpers de descuento de lealtad para el carrito
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useLoyaltyStore } from '@/stores/useLoyaltyStore'
import { Colors, Font, Radius, formatCOP } from '@/constants/theme'

// ── 1. Hook de totales ────────────────────────────────────────────────────────
// Uso en cart.tsx:
//   const { subtotal, discountAmount, total, discountPct } = useCartTotals(items)
export function useCartTotals(items: { price: number; quantity: number }[]) {
  const discountPct = useLoyaltyStore.getState().discountPct()
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const discountAmount = Math.round(subtotal * (discountPct / 100))
  const total = subtotal - discountAmount
  return { subtotal, discountAmount, total, discountPct }
}

// ── 2. Componente de resumen ──────────────────────────────────────────────────
// Uso en cart.tsx (justo antes del botón de pagar):
//   <CartDiscountSummary
//     subtotal={subtotal}
//     discountAmount={discountAmount}
//     total={total}
//     discountPct={discountPct}
//     tierName={tierName}
//   />
type Props = {
  subtotal: number
  discountAmount: number
  total: number
  discountPct: number
  tierName: string
}

export function CartDiscountSummary({
  subtotal, discountAmount, total, discountPct, tierName,
}: Props) {
  return React.createElement(
    View,
    { style: cs.container },
    React.createElement(
      View,
      { style: cs.row },
      React.createElement(Text, { style: cs.label }, 'Subtotal'),
      React.createElement(Text, { style: cs.value }, formatCOP(subtotal)),
    ),
    discountPct > 0
      ? React.createElement(
          View,
          { style: cs.row },
          React.createElement(
            View,
            { style: cs.discountLeft },
            React.createElement(Text, { style: cs.discountLabel }, `Descuento ${tierName}`),
            React.createElement(
              View,
              { style: cs.pctBadge },
              React.createElement(Text, { style: cs.pctText }, `-${discountPct}%`),
            ),
          ),
          React.createElement(Text, { style: cs.discountValue }, `-${formatCOP(discountAmount)}`),
        )
      : null,
    React.createElement(View, { style: cs.divider }),
    React.createElement(
      View,
      { style: cs.row },
      React.createElement(Text, { style: cs.totalLabel }, 'Total'),
      React.createElement(Text, { style: cs.totalValue }, formatCOP(total)),
    ),
  )
}

const cs = StyleSheet.create({
  container:     { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.border },
  row:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label:         { fontFamily: Font.sans, fontSize: 14, color: Colors.mocha },
  value:         { fontFamily: Font.sans, fontSize: 14, color: Colors.espresso, fontWeight: '600' },
  discountLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  discountLabel: { fontFamily: Font.sans, fontSize: 14, color: '#059669' },
  pctBadge:      { backgroundColor: '#ECFDF5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  pctText:       { fontFamily: Font.sans, fontSize: 11, fontWeight: '700', color: '#059669' },
  discountValue: { fontFamily: Font.sans, fontSize: 14, fontWeight: '700', color: '#059669' },
  divider:       { height: 1, backgroundColor: Colors.border },
  totalLabel:    { fontFamily: Font.serif, fontSize: 17, fontWeight: '800', color: Colors.espresso },
  totalValue:    { fontFamily: Font.serif, fontSize: 17, fontWeight: '800', color: Colors.terra },
})