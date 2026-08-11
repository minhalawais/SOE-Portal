/**
 * Deterministic Pakistani-style display names for mock seed.
 * Fictional demonstration identities — not real persons.
 * Keep IDs/relations unchanged; only labels/titles improve.
 */

function hash(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick<T>(seed: string, items: readonly T[]): T {
  return items[hash(seed) % items.length]!
}

const MALE_FIRST = [
  'Ahmed',
  'Ali',
  'Bilal',
  'Farhan',
  'Hassan',
  'Imran',
  'Javed',
  'Kamran',
  'Khalid',
  'Nadeem',
  'Omar',
  'Rashid',
  'Saeed',
  'Tariq',
  'Usman',
  'Waqas',
  'Yasir',
  'Zubair',
  'Asad',
  'Faisal',
  'Hamza',
  'Irfan',
  'Shahid',
  'Adnan',
] as const

const FEMALE_FIRST = [
  'Ayesha',
  'Fatima',
  'Hina',
  'Iqra',
  'Maria',
  'Nadia',
  'Sana',
  'Sara',
  'Zainab',
  'Amna',
  'Bushra',
  'Fariha',
  'Mehwish',
  'Rabia',
  'Samina',
  'Uzma',
] as const

const SURNAMES = [
  'Khan',
  'Ahmed',
  'Ali',
  'Hussain',
  'Malik',
  'Sheikh',
  'Raza',
  'Qureshi',
  'Siddiqui',
  'Butt',
  'Chaudhry',
  'Mirza',
  'Ansari',
  'Hashmi',
  'Baig',
  'Javed',
  'Nawaz',
  'Rehman',
  'Shah',
  'Abbasi',
] as const

const SITE_PREFIX = [
  'Industrial Estate',
  'Factory Complex',
  'Warehouse Yard',
  'Plant Site',
  'Workshop Block',
  'Godown',
  'Mill Compound',
  'Depot',
  'Service Centre',
  'Training Campus',
] as const

const LAND_PARCEL = [
  'Plot',
  'Khasra Block',
  'Survey Parcel',
  'Leasehold Tract',
  'Open Yard',
  'Staff Colony Land',
] as const

const BUILDING_NAMES = [
  'Admin Block',
  'Main Office Building',
  'Stores Building',
  'Quality Lab',
  'Guest House',
  'Canteen Block',
  'Security Gate Complex',
  'Training Hall',
] as const

const MACHINERY_NAMES = [
  'Rolling Mill Line',
  'Boiler Unit',
  'CNC Lathe Bay',
  'Compressor Station',
  'Packaging Line',
  'Crusher Unit',
  'Generator Set',
  'Conveyor System',
] as const

const VEHICLE_NAMES = [
  'Official Sedan',
  'Pickup Truck',
  'Staff Van',
  'Forklift',
  'Water Bowser',
  'Security Patrol Vehicle',
] as const

const EQUIPMENT_NAMES = [
  'IT Server Rack',
  'Survey Equipment Set',
  'Laboratory Instruments',
  'Safety Gear Stock',
  'Office Furniture Lot',
  'Power Tools Set',
] as const

const VENDOR_FIRMS = [
  'Al-Noor Engineering Works',
  'PakTech Solutions (Pvt) Ltd',
  'Greenfield Traders',
  'Horizon Supply Co.',
  'Quaid Business Enterprises',
  'Indus Procurement Partners',
  'Falcon Industrial Services',
  'Northern Star Contractors',
  'Sufi Brothers Trading',
  'Khyber Technical Services',
] as const

const PROCUREMENT_TITLES = [
  'Annual maintenance of plant machinery',
  'Supply of spare parts and consumables',
  'IT infrastructure upgrade and licensing',
  'Security services for industrial premises',
  'Civil works — admin block renovation',
  'Procurement of official vehicles',
  'Laboratory equipment and calibration',
  'Cleaning and facility management services',
  'ERP support and customization',
  'Safety equipment and PPE supply',
] as const

const AUDIT_PARA_TITLES = [
  'Unsupported expenditure on consultancy',
  'Irregular procurement without competitive bidding',
  'Non-recovery of advances from staff',
  'Weak inventory controls at warehouse',
  'Overdue receivables without aging review',
  'Subsidy drawdown without supporting schedule',
  'Asset register incomplete versus physical stock',
  'Unauthorized overtime payments',
  'Tax withholding short-deposited',
  'Board approval missing for major CAPEX',
] as const

const LITIGATION_PARTIES = [
  'M/s Crescent Traders',
  'M/s Allied Contractors',
  'Estate of late landowner (demo)',
  'Provincial Revenue Authority',
  'Former employee association',
  'M/s National Logistics Partners',
  'Local tehsil residents (demo petition)',
  'M/s Apex Fabricators',
] as const

const COUNSEL_NAMES = [
  'Adv. Kamran Siddiqui',
  'Adv. Sana Qureshi',
  'Adv. Bilal Hashmi',
  'Adv. Ayesha Malik',
  'Adv. Tariq Rehman',
  'Adv. Hina Abbasi',
] as const

const GRANT_PROJECTS = [
  'Working capital support for operations',
  'Plant rehabilitation and safety upgrade',
  'Skills development and apprenticeships',
  'Export facilitation programme',
  'Energy efficiency retrofit',
] as const

const COMMERCIAL_LENDERS = [
  'National Bank of Pakistan',
  'Habib Bank Limited',
  'United Bank Limited',
  'MCB Bank Limited',
  'Allied Bank Limited',
  'Bank Alfalah Limited',
] as const

export type PersonGenderHint = 'male' | 'female' | 'any'

export function personName(seed: string, gender: PersonGenderHint = 'any'): string {
  const useFemale =
    gender === 'female' || (gender === 'any' && hash(`${seed}-g`) % 3 === 0)
  const first = useFemale ? pick(`${seed}-f`, FEMALE_FIRST) : pick(`${seed}-m`, MALE_FIRST)
  const last = pick(`${seed}-s`, SURNAMES)
  // Avoid identical first+last looking odd when both from shared pool
  if (first === last) {
    return `${first} ${pick(`${seed}-s2`, SURNAMES.filter((x) => x !== first))}`
  }
  return `${first} ${last}`
}

export function contactPersonName(seed: string, role: 'focal' | 'secretary'): string {
  return personName(`${seed}-${role}`, role === 'secretary' ? 'any' : 'any')
}

export function executivePersonName(
  seed: string,
  role: 'ceo' | 'cfo' | 'gm',
): string {
  const gender: PersonGenderHint = role === 'cfo' && hash(seed) % 4 === 0 ? 'female' : 'male'
  return personName(`${seed}-exec-${role}`, gender)
}

export function boardMemberName(seed: string, womanDirector: boolean): string {
  return personName(seed, womanDirector ? 'female' : 'any')
}

export function assetDisplayName(args: {
  seed: string
  abbreviation: string
  city: string
  assetType: string
  index: number
}): string {
  const { seed, abbreviation, city, assetType, index } = args
  const n = index + 1
  switch (assetType) {
    case 'land':
      return `${abbreviation} ${pick(seed, LAND_PARCEL)} ${n} — ${city}`
    case 'building':
      return `${abbreviation} ${pick(seed, BUILDING_NAMES)} (${city})`
    case 'machinery':
      return `${abbreviation} ${pick(seed, MACHINERY_NAMES)} #${n}`
    case 'vehicle':
      return `${abbreviation} ${pick(seed, VEHICLE_NAMES)} ${String(n).padStart(2, '0')}`
    case 'equipment':
      return `${abbreviation} ${pick(seed, EQUIPMENT_NAMES)} ${n}`
    default:
      return `${abbreviation} ${assetType.replaceAll('_', ' ')} ${n}`
  }
}

export function locationLabel(
  seed: string,
  abbreviation: string,
  kind: 'head_office' | 'factory' | 'warehouse' | 'regional_office' | 'provincial_office',
  city: string,
): string {
  if (kind === 'head_office') return `${abbreviation} Head Office — ${city}`
  if (kind === 'provincial_office' || kind === 'regional_office') {
    return `${abbreviation} Regional Office — ${city}`
  }
  if (kind === 'warehouse') {
    return `${abbreviation} ${pick(seed, ['Central Warehouse', 'Finished Goods Store', 'Spare Parts Depot'])} — ${city}`
  }
  return `${abbreviation} ${pick(seed, SITE_PREFIX)} — ${city}`
}

export function vendorName(seed: string): string {
  return pick(seed, VENDOR_FIRMS)
}

export function procurementTitle(seed: string): string {
  return pick(seed, PROCUREMENT_TITLES)
}

export function auditParaTitle(seed: string): string {
  return pick(seed, AUDIT_PARA_TITLES)
}

export function auditObservation(seed: string, orgAbbrev: string): string {
  return `${pick(seed, AUDIT_PARA_TITLES)} noted during FY review for ${orgAbbrev} (demonstration).`
}

export function litigationParty(seed: string): string {
  return pick(seed, LITIGATION_PARTIES)
}

export function counselName(seed: string): string {
  return pick(seed, COUNSEL_NAMES)
}

export function grantProjectName(seed: string, abbreviation: string): string {
  return `${abbreviation}: ${pick(seed, GRANT_PROJECTS)}`
}

export function commercialLenderName(seed: string): string {
  return pick(seed, COMMERCIAL_LENDERS)
}

export function documentAssetTitle(category: string, assetName: string): string {
  const cat = category.replaceAll('_', ' ')
  return `${cat} — ${assetName}`
}

export function ownershipDeedTitle(assetName: string): string {
  return `Ownership deed — ${assetName}`
}
