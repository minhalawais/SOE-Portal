import {
  BOARD_EXPIRY_BAND,
  DEMO_AS_OF_DATE,
  type BoardExpiryBand,
} from '@/constants'

export function daysUntil(isoDate: string, asOf = DEMO_AS_OF_DATE): number {
  const a = new Date(asOf).getTime()
  const b = new Date(isoDate).getTime()
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

export function resolveBoardExpiryBand(
  opts: { isVacancySlot?: boolean; expiryDate: string },
  asOf = DEMO_AS_OF_DATE,
): BoardExpiryBand {
  if (opts.isVacancySlot) return BOARD_EXPIRY_BAND.VACANCY
  const d = daysUntil(opts.expiryDate, asOf)
  if (d < 0) return BOARD_EXPIRY_BAND.EXPIRED
  if (d <= 30) return BOARD_EXPIRY_BAND.WITHIN_30
  if (d <= 90) return BOARD_EXPIRY_BAND.WITHIN_90
  if (d <= 180) return BOARD_EXPIRY_BAND.WITHIN_180
  return BOARD_EXPIRY_BAND.OK
}

/** Mask fictional CNIC for normal list/detail unless sensitive permission granted. */
export function maskCnic(cnic?: string): string {
  if (!cnic) return '—'
  if (cnic.length < 5) return '****'
  return `${cnic.slice(0, 5)}-*******-${cnic.slice(-1)}`
}

export function vacancyRate(sanctioned: number, vacant: number): number {
  if (sanctioned <= 0) return 0
  return Math.round((vacant / sanctioned) * 1000) / 10
}
