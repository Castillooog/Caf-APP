// ── Paleta "Espresso Editorial" ──────────────────────────────────────────────
export const Colors = {
  // Nombres modernos + colores originales
  primary: '#4B3621',      // espresso
  secondary: '#E2725B',    // terra
  tertiary: '#7A8C70',     // sage
  
  // Fondos
  background: '#F5F0E8',   // cream
  card: '#FDFAF4',         // card
  inputBg: '#FFFFFF',      // white
  
  // Textos
  text: '#1C1208',         // espresso
  textLight: '#6B4C3B',    // mocha
  
  // Bordes y utilitarios
  border: '#E2D9C8',       // creamDeep
  shadow: 'rgba(61, 43, 31, 0.12)',
  
  // Mantén los originales para compatibilidad
  cream: '#F5F0E8',
  creamDark: '#EDE7D9',
  creamDeep: '#E2D9C8',
  espresso: '#1C1208',
  roast: '#3D2B1F',
  mocha: '#6B4C3B',
  latte: '#A67C6D',
  terra: '#C4501A',
  terraLight: '#E8734A',
  terraDust: '#F2E0D8',
  sage: '#5C7A5E',
  sageDust: '#E8F0E8',
  white: '#FFFFFF',
} as const

export const Font = {
  serif: 'Playfair Display',
  sans: 'DM Sans',
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export const Shadow = {
  card: {
    shadowColor: 'rgba(61, 43, 31, 0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  sm: {
    shadowColor: 'rgba(61, 43, 31, 0.12)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;

export function formatCOP(value: number): string {
  return '$' + value.toLocaleString('es-CO')
}