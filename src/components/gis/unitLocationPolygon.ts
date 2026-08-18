import type { OrganizationLocation } from '@/types/domain'

export type UnitPlaceOption = {
  id: string
  name: string
  province: string
  district: string
  latitude: number
  longitude: number
}

/** Searchable Pakistan cities/districts for unit footprint selection. */
export const UNIT_PLACE_CATALOG: UnitPlaceOption[] = [
  { id: 'islamabad', name: 'Islamabad', province: 'ICT', district: 'Islamabad', latitude: 33.6844, longitude: 73.0479 },
  { id: 'lahore', name: 'Lahore', province: 'Punjab', district: 'Lahore', latitude: 31.5204, longitude: 74.3587 },
  { id: 'karachi', name: 'Karachi', province: 'Sindh', district: 'Karachi', latitude: 24.8607, longitude: 67.0011 },
  { id: 'peshawar', name: 'Peshawar', province: 'Khyber Pakhtunkhwa', district: 'Peshawar', latitude: 34.0151, longitude: 71.5249 },
  { id: 'quetta', name: 'Quetta', province: 'Balochistan', district: 'Quetta', latitude: 30.1798, longitude: 66.975 },
  { id: 'multan', name: 'Multan', province: 'Punjab', district: 'Multan', latitude: 30.1575, longitude: 71.5249 },
  { id: 'faisalabad', name: 'Faisalabad', province: 'Punjab', district: 'Faisalabad', latitude: 31.4504, longitude: 73.135 },
  { id: 'rawalpindi', name: 'Rawalpindi', province: 'Punjab', district: 'Rawalpindi', latitude: 33.5651, longitude: 73.0169 },
  { id: 'hyderabad', name: 'Hyderabad', province: 'Sindh', district: 'Hyderabad', latitude: 25.396, longitude: 68.3578 },
  { id: 'sialkot', name: 'Sialkot', province: 'Punjab', district: 'Sialkot', latitude: 32.4945, longitude: 74.5229 },
  { id: 'gujranwala', name: 'Gujranwala', province: 'Punjab', district: 'Gujranwala', latitude: 32.1877, longitude: 74.1945 },
  { id: 'sukkur', name: 'Sukkur', province: 'Sindh', district: 'Sukkur', latitude: 27.7052, longitude: 68.8574 },
  { id: 'abbottabad', name: 'Abbottabad', province: 'Khyber Pakhtunkhwa', district: 'Abbottabad', latitude: 34.1688, longitude: 73.2215 },
  { id: 'gwadar', name: 'Gwadar', province: 'Balochistan', district: 'Gwadar', latitude: 25.1264, longitude: 62.3225 },
  { id: 'risalpur', name: 'Risalpur', province: 'Khyber Pakhtunkhwa', district: 'Nowshera', latitude: 34.055, longitude: 71.984 },
  { id: 'sundar', name: 'Sundar Industrial Estate', province: 'Punjab', district: 'Lahore', latitude: 31.4228, longitude: 74.2171 },
  { id: 'binqasim', name: 'Bin Qasim', province: 'Sindh', district: 'Karachi', latitude: 24.8052, longitude: 67.3466 },
  { id: 'hayatabad', name: 'Hayatabad', province: 'Khyber Pakhtunkhwa', district: 'Peshawar', latitude: 33.989, longitude: 71.431 },
]

function hashSeed(seed: string): number {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }
  return hash
}

const PARCEL = [
  [-0.95, -0.48],
  [-0.42, -0.92],
  [0.58, -0.78],
  [1, -0.14],
  [0.72, 0.74],
  [-0.18, 0.98],
  [-0.88, 0.5],
] as const

/** Illustrative closed footprint ring as [latitude, longitude] vertices. */
export function buildParcelPolygon(
  latitude: number,
  longitude: number,
  seed: string,
  kind: OrganizationLocation['kind'] = 'factory',
): Array<[number, number]> {
  const fallbackRadius = {
    head_office: 0.0028,
    factory: 0.012,
    warehouse: 0.007,
    regional_office: 0.0024,
    provincial_office: 0.0024,
  }[kind]
  const aspect = kind === 'factory' ? 1.65 : kind === 'warehouse' ? 1.4 : 1.15
  const angle = ((hashSeed(seed) % 44) - 22) * (Math.PI / 180)
  const longitudeCorrection = Math.max(Math.cos(latitude * (Math.PI / 180)), 0.65)

  return PARCEL.map(([x, y]) => {
    const stretchedX = x * aspect
    const rotatedX = stretchedX * Math.cos(angle) - y * Math.sin(angle)
    const rotatedY = stretchedX * Math.sin(angle) + y * Math.cos(angle)
    return [
      latitude + rotatedY * fallbackRadius,
      longitude + (rotatedX * fallbackRadius) / longitudeCorrection,
    ]
  })
}

export function locationPolygon(location: OrganizationLocation): Array<[number, number]> {
  if (location.polygon && location.polygon.length >= 3) return location.polygon
  return buildParcelPolygon(location.latitude, location.longitude, location.id, location.kind)
}

export function filterUnitPlaces(query: string): UnitPlaceOption[] {
  const needle = query.trim().toLowerCase()
  if (needle.length < 2) return []
  return UNIT_PLACE_CATALOG.filter(
    (place) =>
      place.name.toLowerCase().includes(needle) ||
      place.district.toLowerCase().includes(needle) ||
      place.province.toLowerCase().includes(needle),
  ).slice(0, 8)
}
