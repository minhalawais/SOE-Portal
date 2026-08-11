/** Semantic color tokens — SOE-GAIP-DESIGN-SYSTEM.md */

export const color = {
  navy: '#12304A',
  blue: '#1D5D8F',
  teal: '#16877A',
  canvas: '#F6F8FA',
  surface: '#FFFFFF',
  surfaceSubtle: 'rgba(18, 48, 74, 0.035)',
  surfaceSelected: 'rgba(29, 93, 143, 0.08)',
  surfaceTeal: 'rgba(22, 135, 122, 0.08)',
  ink: '#17212B',
  slate: '#64748B',
  inverse: '#FFFFFF',
  heading: '#12304A',
  link: '#1D5D8F',
  border: '#DDE3E8',
  borderSubtle: 'rgba(221, 227, 232, 0.72)',
  borderFocus: '#1D5D8F',
  success: '#2E7D5A',
  warning: '#C58A19',
  critical: '#B84242',
  info: '#3B76A8',
  pending: '#64748B',
  successSoft: 'rgba(46, 125, 90, 0.10)',
  warningSoft: 'rgba(197, 138, 25, 0.12)',
  criticalSoft: 'rgba(184, 66, 66, 0.10)',
  infoSoft: 'rgba(59, 118, 168, 0.10)',
  pendingSoft: 'rgba(100, 116, 139, 0.10)',
} as const

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  page: 24,
  section: 20,
  card: 18,
  controlGap: 12,
  fieldGap: 16,
} as const

export const radius = {
  sm: 6,
  control: 8,
  card: 12,
  feature: 14,
  modal: 16,
  pill: 9999,
} as const

export const shadow = {
  xs: '0 1px 2px rgba(18, 48, 74, 0.04)',
  sm: '0 2px 5px rgba(18, 48, 74, 0.06)',
  card: '0 4px 12px rgba(18, 48, 74, 0.07)',
  cardHover: '0 6px 16px rgba(18, 48, 74, 0.10)',
  modal: '0 18px 42px rgba(18, 48, 74, 0.16)',
  focus: '0 0 0 3px rgba(29, 93, 143, 0.18)',
} as const

export const typography = {
  pageTitle: { size: 24, weight: 600, lineHeight: 1.25 },
  executiveTitle: { size: 28, weight: 600, lineHeight: 1.2 },
  sectionTitle: { size: 18, weight: 600, lineHeight: 1.3 },
  cardTitle: { size: 14, weight: 600, lineHeight: 1.3 },
  body: { size: 14, weight: 400, lineHeight: 1.5 },
  table: { size: 13, weight: 400, lineHeight: 1.4 },
  label: { size: 12, weight: 500, lineHeight: 1.3 },
  meta: { size: 11, weight: 600, lineHeight: 1.3 },
  kpi: { size: 28, weight: 600, lineHeight: 1.1 },
  helper: { size: 12, weight: 400, lineHeight: 1.4 },
} as const

export const size = {
  buttonSm: 32,
  buttonMd: 40,
  buttonLg: 44,
  input: 42,
  tableRowCompact: 44,
  tableRowStandard: 52,
  tableHeader: 46,
  sidebar: 260,
  sidebarCollapsed: 72,
  topbar: 56,
  chart: 260,
} as const

export const motion = {
  fast: '120ms',
  normal: '200ms',
  slow: '300ms',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const

export const zIndex = {
  dropdown: 40,
  sticky: 30,
  drawer: 50,
  modal: 60,
  toast: 70,
  tooltip: 80,
} as const

export const tokens = {
  color,
  spacing,
  radius,
  shadow,
  typography,
  size,
  motion,
  zIndex,
} as const
