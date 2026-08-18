import { EntryFormSection, EntryFormShell } from '@/components/soe'
import { SelectField, CurrencyField, TextField } from '@/design-system/components/Fields'
import {
  ASSET_CONDITION,
  ASSET_EVIDENCE_STATUS,
  ASSET_EVIDENCE_STATUS_LABEL,
  ASSET_LITIGATION_STATUS,
  ASSET_LITIGATION_STATUS_LABEL,
  ASSET_OCCUPANCY,
  ASSET_OCCUPANCY_LABEL,
  ASSET_TYPE,
  ASSET_TYPE_LABEL,
  ASSET_UTILIZATION,
  ASSET_UTILIZATION_LABEL,
  ENCROACHMENT_STATUS,
  ENCROACHMENT_STATUS_LABEL,
  LAND_USE_CLASS,
  LAND_USE_CLASS_LABEL,
  LEASE_STATUS,
  LEASE_STATUS_LABEL,
  MACHINERY_OPERATIONAL,
  MACHINERY_OPERATIONAL_LABEL,
  type AssetCondition,
  type AssetEvidenceStatus,
  type AssetLitigationStatus,
  type AssetOccupancy,
  type AssetType,
  type AssetUtilization,
  type EncroachmentStatus,
  type LandUseClass,
  type LeaseStatus,
  type MachineryOperational,
} from '@/constants'
import type { Asset } from '@/types/domain'
import { validateAssetDraft } from '@/workflow/assetValidation'

const BUILDING_TYPE_OPTIONS = [
  'Office',
  'Factory',
  'Warehouse',
  'School',
  'Training institute',
  'Guest house',
  'Residential colony',
  'Hospital',
  'Rest house',
  'Storage facility',
]

const EQUIPMENT_CATEGORY_OPTIONS = [
  { value: 'computers', label: 'Computers' },
  { value: 'it_equipment', label: 'IT equipment' },
  { value: 'servers', label: 'Servers' },
  { value: 'office_equipment', label: 'Office equipment' },
  { value: 'plant_equipment', label: 'Plant equipment' },
  { value: 'laboratory_equipment', label: 'Laboratory equipment' },
  { value: 'heavy_machinery', label: 'Heavy machinery' },
  { value: 'tools', label: 'Tools' },
  { value: 'communication_equipment', label: 'Communication equipment' },
  { value: 'furniture', label: 'Furniture' },
]

const VEHICLE_TYPE_OPTIONS = ['Sedan', 'Pickup', 'Bus', 'Truck', 'Motorcycle', 'SUV', 'Van']

export interface AssetEntryDraft {
  name: string
  identifier: string
  assetType: AssetType
  province: string
  district: string
  tehsil: string
  acquisitionDate: string
  purpose: string
  currentUse: string
  bookValue: number
  marketValue: number
  utilizationStatus: AssetUtilization
  utilizationPercent: number
  encroachmentStatus: EncroachmentStatus
  litigationStatus: AssetLitigationStatus
  leaseStatus: LeaseStatus
  evidenceStatus: AssetEvidenceStatus
  documentReference: string
  mutationReference: string
  photoReference: string
  condition: AssetCondition
  latitude: string
  longitude: string
  mouza: string
  surveyNumber: string
  khasraNumber: string
  areaAcres: number
  areaKanals: number
  areaSqFt: number
  occupancyStatus: AssetOccupancy
  useClassification: LandUseClass
  buildingType: string
  floorAreaSqFt: number
  buildingAgeYears: number
  replacementValue: number
  maintenanceCostAnnual: number
  insuranceValue: number
  machineId: string
  manufacturer: string
  purchaseCost: number
  purchaseDate: string
  depreciation: number
  usefulLifeYears: number
  operationalStatus: MachineryOperational
  capacity: string
  maintenanceSchedule: string
  vehicleNumber: string
  vehicleType: string
  purchaseYear: number
  assignedOfficer: string
  mileageKm: number
  fuelConsumption: string
  gpsAvailable: boolean
  disposalStatus: string
  equipmentCategory: string
}

export function resolveFixedAssetType(fixedType?: AssetType | AssetType[]): AssetType {
  if (Array.isArray(fixedType)) return fixedType[0] ?? ASSET_TYPE.LAND
  return fixedType ?? ASSET_TYPE.LAND
}

export function emptyAssetDraft(fixedType?: AssetType | AssetType[]): AssetEntryDraft {
  const assetType = resolveFixedAssetType(fixedType)
  return {
    name: '',
    identifier: '',
    assetType,
    province: '',
    district: '',
    tehsil: '',
    acquisitionDate: '',
    purpose: '',
    currentUse: '',
    bookValue: 0,
    marketValue: 0,
    utilizationStatus: ASSET_UTILIZATION.UTILIZED,
    utilizationPercent: 0,
    encroachmentStatus: ENCROACHMENT_STATUS.CLEAR,
    litigationStatus: ASSET_LITIGATION_STATUS.CLEAR,
    leaseStatus: LEASE_STATUS.NONE,
    evidenceStatus: ASSET_EVIDENCE_STATUS.MISSING,
    documentReference: '',
    mutationReference: '',
    photoReference: '',
    condition: ASSET_CONDITION.FAIR,
    latitude: '',
    longitude: '',
    mouza: '',
    surveyNumber: '',
    khasraNumber: '',
    areaAcres: 0,
    areaKanals: 0,
    areaSqFt: 0,
    occupancyStatus: ASSET_OCCUPANCY.VACANT,
    useClassification: LAND_USE_CLASS.INDUSTRIAL,
    buildingType: '',
    floorAreaSqFt: 0,
    buildingAgeYears: 0,
    replacementValue: 0,
    maintenanceCostAnnual: 0,
    insuranceValue: 0,
    machineId: '',
    manufacturer: '',
    purchaseCost: 0,
    purchaseDate: '',
    depreciation: 0,
    usefulLifeYears: 0,
    operationalStatus: MACHINERY_OPERATIONAL.RUNNING,
    capacity: '',
    maintenanceSchedule: '',
    vehicleNumber: '',
    vehicleType: '',
    purchaseYear: new Date().getFullYear(),
    assignedOfficer: '',
    mileageKm: 0,
    fuelConsumption: '',
    gpsAvailable: false,
    disposalStatus: '',
    equipmentCategory: 'office_equipment',
  }
}

function numOrUndefined(value: number): number | undefined {
  return value > 0 ? value : undefined
}

function strOrUndefined(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

export function assetDraftToPayload(
  draft: AssetEntryDraft,
  organizationId: string,
): Omit<Asset, 'id'> {
  const latitude = draft.latitude.trim() ? Number(draft.latitude) : undefined
  const longitude = draft.longitude.trim() ? Number(draft.longitude) : undefined
  const base: Omit<Asset, 'id'> = {
    organizationId,
    name: draft.name.trim(),
    identifier: strOrUndefined(draft.identifier),
    assetType: draft.assetType,
    province: strOrUndefined(draft.province),
    district: strOrUndefined(draft.district),
    tehsil: strOrUndefined(draft.tehsil),
    acquisitionDate: strOrUndefined(draft.acquisitionDate),
    purpose: strOrUndefined(draft.purpose),
    currentUse: strOrUndefined(draft.currentUse),
    bookValue: numOrUndefined(draft.bookValue),
    marketValue: numOrUndefined(draft.marketValue),
    utilizationStatus: draft.utilizationStatus,
    utilizationPercent: numOrUndefined(draft.utilizationPercent),
    encroachmentStatus: draft.encroachmentStatus,
    litigationStatus: draft.litigationStatus,
    leaseStatus: draft.leaseStatus,
    evidenceStatus: draft.evidenceStatus,
    documentReference: strOrUndefined(draft.documentReference),
    mutationReference: strOrUndefined(draft.mutationReference),
    photoReference: strOrUndefined(draft.photoReference),
    condition: draft.condition,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    lastUpdated: new Date().toISOString().slice(0, 10),
  }

  if (draft.assetType === ASSET_TYPE.LAND) {
    return {
      ...base,
      mouza: strOrUndefined(draft.mouza),
      surveyNumber: strOrUndefined(draft.surveyNumber),
      khasraNumber: strOrUndefined(draft.khasraNumber),
      areaAcres: numOrUndefined(draft.areaAcres),
      areaKanals: numOrUndefined(draft.areaKanals),
      areaSqFt: numOrUndefined(draft.areaSqFt),
      occupancyStatus: draft.occupancyStatus,
      useClassification: draft.useClassification,
    }
  }

  if (draft.assetType === ASSET_TYPE.BUILDING) {
    return {
      ...base,
      buildingType: strOrUndefined(draft.buildingType),
      floorAreaSqFt: numOrUndefined(draft.floorAreaSqFt),
      buildingAgeYears: numOrUndefined(draft.buildingAgeYears),
      replacementValue: numOrUndefined(draft.replacementValue),
      maintenanceCostAnnual: numOrUndefined(draft.maintenanceCostAnnual),
      insuranceValue: numOrUndefined(draft.insuranceValue),
      occupancyStatus: draft.occupancyStatus,
    }
  }

  if (draft.assetType === ASSET_TYPE.MACHINERY) {
    return {
      ...base,
      machineId: strOrUndefined(draft.machineId),
      manufacturer: strOrUndefined(draft.manufacturer),
      purchaseCost: numOrUndefined(draft.purchaseCost),
      purchaseDate: strOrUndefined(draft.purchaseDate),
      depreciation: numOrUndefined(draft.depreciation),
      usefulLifeYears: numOrUndefined(draft.usefulLifeYears),
      operationalStatus: draft.operationalStatus,
      capacity: strOrUndefined(draft.capacity),
      maintenanceSchedule: strOrUndefined(draft.maintenanceSchedule),
    }
  }

  if (draft.assetType === ASSET_TYPE.VEHICLE) {
    return {
      ...base,
      vehicleNumber: strOrUndefined(draft.vehicleNumber),
      vehicleType: strOrUndefined(draft.vehicleType),
      purchaseYear: numOrUndefined(draft.purchaseYear),
      assignedOfficer: strOrUndefined(draft.assignedOfficer),
      mileageKm: numOrUndefined(draft.mileageKm),
      fuelConsumption: strOrUndefined(draft.fuelConsumption),
      gpsAvailable: draft.gpsAvailable,
      insuranceValue: numOrUndefined(draft.insuranceValue),
      disposalStatus: strOrUndefined(draft.disposalStatus),
    }
  }

  return {
    ...base,
    equipmentCategory: strOrUndefined(draft.equipmentCategory),
  }
}

export function isAssetDraftValid(draft: AssetEntryDraft, organizationId: string): boolean {
  const errors = validateAssetDraft(assetDraftToPayload(draft, organizationId)).filter(
    (i) => i.severity === 'error',
  )
  return errors.length === 0
}

export function AssetEntryForm({
  draft,
  onChange,
  fixedType,
}: {
  draft: AssetEntryDraft
  onChange: (next: AssetEntryDraft) => void
  fixedType?: AssetType | AssetType[]
}) {
  const showTypeSelector = !fixedType
  const equipmentTypes = Array.isArray(fixedType) ? fixedType : null

  const setAcres = (acres: number) => {
    onChange({
      ...draft,
      areaAcres: acres,
      areaKanals: acres > 0 ? acres * 8 : 0,
      areaSqFt: acres > 0 ? Math.round(acres * 43560) : 0,
    })
  }

  return (
    <EntryFormShell title={entryTitle(fixedType)} mode="create" columns={3}>
        <EntryFormSection title="Identification" />
        <TextField
          label="Name"
          value={draft.name}
          required
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
        />
        <TextField
          label="Asset ID"
          value={draft.identifier}
          hint="Unique asset identifier"
          onChange={(e) => onChange({ ...draft, identifier: e.target.value })}
        />
        {showTypeSelector ? (
          <SelectField
            label="Asset type"
            value={draft.assetType}
            options={Object.values(ASSET_TYPE).map((t) => ({
              value: t,
              label: ASSET_TYPE_LABEL[t],
            }))}
            onChange={(e) =>
              onChange({ ...draft, assetType: e.target.value as AssetType })
            }
          />
        ) : equipmentTypes ? (
          <SelectField
            label="Equipment type"
            value={draft.assetType}
            options={equipmentTypes.map((t) => ({
              value: t,
              label: ASSET_TYPE_LABEL[t],
            }))}
            onChange={(e) =>
              onChange({ ...draft, assetType: e.target.value as AssetType })
            }
          />
        ) : null}
        <TextField
          label="Acquisition date"
          type="date"
          value={draft.acquisitionDate}
          onChange={(e) => onChange({ ...draft, acquisitionDate: e.target.value })}
        />
        <TextField
          label="Purpose"
          value={draft.purpose}
          onChange={(e) => onChange({ ...draft, purpose: e.target.value })}
        />
        <TextField
          label="Current use"
          value={draft.currentUse}
          onChange={(e) => onChange({ ...draft, currentUse: e.target.value })}
        />

        <EntryFormSection title="Location" />
        <TextField
          label="Province"
          value={draft.province}
          onChange={(e) => onChange({ ...draft, province: e.target.value })}
        />
        <TextField
          label="District"
          value={draft.district}
          onChange={(e) => onChange({ ...draft, district: e.target.value })}
        />
        <TextField
          label="Tehsil"
          value={draft.tehsil}
          onChange={(e) => onChange({ ...draft, tehsil: e.target.value })}
        />
        <TextField
          label="Latitude"
          type="number"
          value={draft.latitude}
          onChange={(e) => onChange({ ...draft, latitude: e.target.value })}
        />
        <TextField
          label="Longitude"
          type="number"
          value={draft.longitude}
          onChange={(e) => onChange({ ...draft, longitude: e.target.value })}
        />

        <EntryFormSection title="Valuation" />
        <CurrencyField
          label="Book value (PKR)"
          min={0}
          value={draft.bookValue || ''}
          onChange={(e) => onChange({ ...draft, bookValue: Number(e.target.value) })}
        />
        <CurrencyField
          label="Market value (PKR)"
          min={0}
          value={draft.marketValue || ''}
          onChange={(e) => onChange({ ...draft, marketValue: Number(e.target.value) })}
        />

        <EntryFormSection title="Legal & utilization" />
        <SelectField
          label="Utilization"
          value={draft.utilizationStatus}
          options={Object.values(ASSET_UTILIZATION).map((u) => ({
            value: u,
            label: ASSET_UTILIZATION_LABEL[u],
          }))}
          onChange={(e) =>
            onChange({ ...draft, utilizationStatus: e.target.value as AssetUtilization })
          }
        />
        <TextField
          label="Utilization %"
          type="number"
          min={0}
          max={100}
          value={draft.utilizationPercent || ''}
          onChange={(e) =>
            onChange({ ...draft, utilizationPercent: Number(e.target.value) })
          }
        />
        <SelectField
          label="Encroachment"
          value={draft.encroachmentStatus}
          options={Object.values(ENCROACHMENT_STATUS).map((u) => ({
            value: u,
            label: ENCROACHMENT_STATUS_LABEL[u],
          }))}
          onChange={(e) =>
            onChange({ ...draft, encroachmentStatus: e.target.value as EncroachmentStatus })
          }
        />
        <SelectField
          label="Litigation"
          value={draft.litigationStatus}
          options={Object.values(ASSET_LITIGATION_STATUS).map((u) => ({
            value: u,
            label: ASSET_LITIGATION_STATUS_LABEL[u],
          }))}
          onChange={(e) =>
            onChange({ ...draft, litigationStatus: e.target.value as AssetLitigationStatus })
          }
        />
        <SelectField
          label="Lease status"
          value={draft.leaseStatus}
          options={Object.values(LEASE_STATUS).map((u) => ({
            value: u,
            label: LEASE_STATUS_LABEL[u],
          }))}
          onChange={(e) => onChange({ ...draft, leaseStatus: e.target.value as LeaseStatus })}
        />
        <SelectField
          label="Evidence status"
          value={draft.evidenceStatus}
          options={Object.values(ASSET_EVIDENCE_STATUS).map((u) => ({
            value: u,
            label: ASSET_EVIDENCE_STATUS_LABEL[u],
          }))}
          onChange={(e) =>
            onChange({ ...draft, evidenceStatus: e.target.value as AssetEvidenceStatus })
          }
        />
        <TextField
          label="Document reference"
          value={draft.documentReference}
          onChange={(e) => onChange({ ...draft, documentReference: e.target.value })}
        />
        <TextField
          label="Mutation reference"
          value={draft.mutationReference}
          onChange={(e) => onChange({ ...draft, mutationReference: e.target.value })}
        />
        <TextField
          label="Photo reference"
          value={draft.photoReference}
          onChange={(e) => onChange({ ...draft, photoReference: e.target.value })}
        />
        <SelectField
          label="Condition"
          value={draft.condition}
          options={Object.values(ASSET_CONDITION).map((u) => ({
            value: u,
            label: u.charAt(0).toUpperCase() + u.slice(1),
          }))}
          onChange={(e) =>
            onChange({ ...draft, condition: e.target.value as AssetCondition })
          }
        />

        {draft.assetType === ASSET_TYPE.LAND ? (
          <>
            <EntryFormSection title="Land record" />
            <TextField
              label="Mouza"
              value={draft.mouza}
              onChange={(e) => onChange({ ...draft, mouza: e.target.value })}
            />
            <TextField
              label="Survey number"
              value={draft.surveyNumber}
              onChange={(e) => onChange({ ...draft, surveyNumber: e.target.value })}
            />
            <TextField
              label="Khasra number"
              value={draft.khasraNumber}
              onChange={(e) => onChange({ ...draft, khasraNumber: e.target.value })}
            />
            <TextField
              label="Area (acres)"
              type="number"
              min={0}
              value={draft.areaAcres || ''}
              onChange={(e) => setAcres(Number(e.target.value))}
            />
            <TextField label="Area (kanals)" type="number" value={draft.areaKanals || ''} disabled />
            <TextField label="Area (sq ft)" type="number" value={draft.areaSqFt || ''} disabled />
            <SelectField
              label="Occupancy"
              value={draft.occupancyStatus}
              options={Object.values(ASSET_OCCUPANCY).map((o) => ({
                value: o,
                label: ASSET_OCCUPANCY_LABEL[o],
              }))}
              onChange={(e) =>
                onChange({ ...draft, occupancyStatus: e.target.value as AssetOccupancy })
              }
            />
            <SelectField
              label="Use classification"
              value={draft.useClassification}
              options={Object.values(LAND_USE_CLASS).map((o) => ({
                value: o,
                label: LAND_USE_CLASS_LABEL[o],
              }))}
              onChange={(e) =>
                onChange({ ...draft, useClassification: e.target.value as LandUseClass })
              }
            />
          </>
        ) : null}

        {draft.assetType === ASSET_TYPE.BUILDING ? (
          <>
            <EntryFormSection title="Building details" />
            <SelectField
              label="Building type"
              value={draft.buildingType}
              options={BUILDING_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
              placeholder="Select type"
              onChange={(e) => onChange({ ...draft, buildingType: e.target.value })}
            />
            <TextField
              label="Floor area (sq ft)"
              type="number"
              min={0}
              value={draft.floorAreaSqFt || ''}
              onChange={(e) =>
                onChange({ ...draft, floorAreaSqFt: Number(e.target.value) })
              }
            />
            <TextField
              label="Age (years)"
              type="number"
              min={0}
              value={draft.buildingAgeYears || ''}
              onChange={(e) =>
                onChange({ ...draft, buildingAgeYears: Number(e.target.value) })
              }
            />
            <SelectField
              label="Occupancy"
              value={draft.occupancyStatus}
              options={Object.values(ASSET_OCCUPANCY).map((o) => ({
                value: o,
                label: ASSET_OCCUPANCY_LABEL[o],
              }))}
              onChange={(e) =>
                onChange({ ...draft, occupancyStatus: e.target.value as AssetOccupancy })
              }
            />
            <CurrencyField
              label="Replacement value (PKR)"
              min={0}
              value={draft.replacementValue || ''}
              onChange={(e) =>
                onChange({ ...draft, replacementValue: Number(e.target.value) })
              }
            />
            <CurrencyField
              label="Annual maintenance (PKR)"
              min={0}
              value={draft.maintenanceCostAnnual || ''}
              onChange={(e) =>
                onChange({ ...draft, maintenanceCostAnnual: Number(e.target.value) })
              }
            />
            <CurrencyField
              label="Insurance value (PKR)"
              min={0}
              value={draft.insuranceValue || ''}
              onChange={(e) =>
                onChange({ ...draft, insuranceValue: Number(e.target.value) })
              }
            />
          </>
        ) : null}

        {draft.assetType === ASSET_TYPE.MACHINERY ? (
          <>
            <EntryFormSection title="Machinery details" />
            <TextField
              label="Machine ID"
              value={draft.machineId}
              onChange={(e) => onChange({ ...draft, machineId: e.target.value })}
            />
            <TextField
              label="Manufacturer"
              value={draft.manufacturer}
              onChange={(e) => onChange({ ...draft, manufacturer: e.target.value })}
            />
            <TextField
              label="Purchase date"
              type="date"
              value={draft.purchaseDate}
              onChange={(e) => onChange({ ...draft, purchaseDate: e.target.value })}
            />
            <CurrencyField
              label="Purchase cost (PKR)"
              min={0}
              value={draft.purchaseCost || ''}
              onChange={(e) =>
                onChange({ ...draft, purchaseCost: Number(e.target.value) })
              }
            />
            <CurrencyField
              label="Depreciation (PKR)"
              min={0}
              value={draft.depreciation || ''}
              onChange={(e) =>
                onChange({ ...draft, depreciation: Number(e.target.value) })
              }
            />
            <TextField
              label="Useful life (years)"
              type="number"
              min={0}
              value={draft.usefulLifeYears || ''}
              onChange={(e) =>
                onChange({ ...draft, usefulLifeYears: Number(e.target.value) })
              }
            />
            <SelectField
              label="Operational status"
              value={draft.operationalStatus}
              options={Object.values(MACHINERY_OPERATIONAL).map((o) => ({
                value: o,
                label: MACHINERY_OPERATIONAL_LABEL[o],
              }))}
              onChange={(e) =>
                onChange({
                  ...draft,
                  operationalStatus: e.target.value as MachineryOperational,
                })
              }
            />
            <TextField
              label="Capacity"
              value={draft.capacity}
              hint="e.g. units/day"
              onChange={(e) => onChange({ ...draft, capacity: e.target.value })}
            />
            <TextField
              label="Maintenance schedule"
              value={draft.maintenanceSchedule}
              onChange={(e) =>
                onChange({ ...draft, maintenanceSchedule: e.target.value })
              }
            />
          </>
        ) : null}

        {draft.assetType === ASSET_TYPE.VEHICLE ? (
          <>
            <EntryFormSection title="Vehicle details" />
            <TextField
              label="Vehicle number"
              value={draft.vehicleNumber}
              onChange={(e) => onChange({ ...draft, vehicleNumber: e.target.value })}
            />
            <SelectField
              label="Vehicle type"
              value={draft.vehicleType}
              options={VEHICLE_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
              placeholder="Select type"
              onChange={(e) => onChange({ ...draft, vehicleType: e.target.value })}
            />
            <TextField
              label="Purchase year"
              type="number"
              min={1900}
              value={draft.purchaseYear || ''}
              onChange={(e) =>
                onChange({ ...draft, purchaseYear: Number(e.target.value) })
              }
            />
            <TextField
              label="Assigned officer"
              value={draft.assignedOfficer}
              onChange={(e) => onChange({ ...draft, assignedOfficer: e.target.value })}
            />
            <TextField
              label="Mileage (km)"
              type="number"
              min={0}
              value={draft.mileageKm || ''}
              onChange={(e) => onChange({ ...draft, mileageKm: Number(e.target.value) })}
            />
            <TextField
              label="Fuel consumption"
              value={draft.fuelConsumption}
              hint="e.g. L/100km"
              onChange={(e) => onChange({ ...draft, fuelConsumption: e.target.value })}
            />
            <CurrencyField
              label="Insurance value (PKR)"
              min={0}
              value={draft.insuranceValue || ''}
              onChange={(e) =>
                onChange({ ...draft, insuranceValue: Number(e.target.value) })
              }
            />
            <SelectField
              label="GPS"
              value={draft.gpsAvailable ? 'yes' : 'no'}
              options={[
                { value: 'yes', label: 'Available' },
                { value: 'no', label: 'Not available' },
              ]}
              onChange={(e) =>
                onChange({ ...draft, gpsAvailable: e.target.value === 'yes' })
              }
            />
            <TextField
              label="Disposal status"
              value={draft.disposalStatus}
              hint="If disposed or auctioned"
              onChange={(e) => onChange({ ...draft, disposalStatus: e.target.value })}
            />
          </>
        ) : null}

        {draft.assetType === ASSET_TYPE.OTHER_EQUIPMENT ||
        draft.assetType === ASSET_TYPE.IT_EQUIPMENT ? (
          <>
            <EntryFormSection title="Equipment details" />
            <SelectField
              label="Category"
              value={draft.equipmentCategory}
              options={EQUIPMENT_CATEGORY_OPTIONS}
              onChange={(e) => onChange({ ...draft, equipmentCategory: e.target.value })}
            />
          </>
        ) : null}
    </EntryFormShell>
  )
}

function entryTitle(fixedType?: AssetType | AssetType[]): string {
  if (Array.isArray(fixedType)) return 'Add equipment'
  if (!fixedType) return 'Add asset'
  return `Add ${(ASSET_TYPE_LABEL[fixedType] ?? 'asset').toLowerCase()}`
}

export function assetAddLabel(fixedType?: AssetType | AssetType[]): string {
  return entryTitle(fixedType)
}
