import {
  MODULE,
  ROLE,
  SUBMISSION_STATUS,
  type ModuleId,
  type RoleId,
} from '@/constants'
import { db } from '@/mock-data'
import { hasPermission, PERMISSION } from '@/permissions'
import { AppError, simulateLatency, simulateMutation } from '@/utils'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'

export type IntelligentImportPortal = 'soe_entry' | 'moip_review'
export type ImportValidationState = 'ready' | 'review' | 'blocked'

export interface IntelligentImportFile {
  id: string
  name: string
  size: number
  type: string
  extension: string
  pageOrSheetCount: number
}

export interface IntelligentImportRow {
  id: string
  fileId: string
  fileName: string
  sourceReference: string
  organizationId: string
  organizationLabel: string
  module: ModuleId
  moduleLabel: string
  fieldKey: string
  fieldLabel: string
  value: string
  confidence: number
  validation: ImportValidationState
  validationMessage: string
  selected: boolean
}

export interface IntelligentImportBatch {
  id: string
  portal: IntelligentImportPortal
  reportingPeriodId: string
  files: IntelligentImportFile[]
  rows: IntelligentImportRow[]
  status: 'review' | 'approved'
  createdAt: string
  approvedAt?: string
  approvedBy?: RoleId
  insertedRows?: number
  affectedOrganizations?: number
  affectedModules?: number
}

export interface IntelligentImportContext {
  portal: IntelligentImportPortal
  organizationId: string
  reportingPeriodId: string
  role: RoleId
}

const MAX_FILES = 10
const MAX_FILE_SIZE = 20 * 1024 * 1024
const acceptedExtensions = new Set(['pdf', 'xlsx', 'xls', 'xlsm', 'xlsb', 'csv'])
const batches: IntelligentImportBatch[] = []

const fieldCatalogue: Partial<Record<ModuleId, Array<{ key: string; label: string; samples: string[] }>>> = {
  [MODULE.ENTERPRISE]: [
    { key: 'legalStatus', label: 'Legal status', samples: ['Section 42 Company', 'Statutory Corporation'] },
    { key: 'sector', label: 'Sector', samples: ['Industrial Development', 'Engineering'] },
    { key: 'website', label: 'Website', samples: ['https://www.example.gov.pk'] },
  ],
  [MODULE.ASSETS]: [
    { key: 'assetName', label: 'Asset name', samples: ['Head office land', 'Production machinery'] },
    { key: 'bookValuePkr', label: 'Book value PKR', samples: ['425000000', '86500000'] },
    { key: 'utilizationStatus', label: 'Utilization status', samples: ['In use', 'Underutilized'] },
  ],
  [MODULE.WORKFORCE]: [
    { key: 'totalEmployees', label: 'Total employees', samples: ['842', '1260'] },
    { key: 'permanentEmployees', label: 'Permanent employees', samples: ['690', '1035'] },
    { key: 'vacantPositions', label: 'Vacant positions', samples: ['37', '64'] },
  ],
  [MODULE.BOARD]: [
    { key: 'memberName', label: 'Board member name', samples: ['Ayesha Malik', 'Imran Siddiqui'] },
    { key: 'designation', label: 'Board designation', samples: ['Independent Director', 'Chairperson'] },
    { key: 'appointmentDate', label: 'Appointment date', samples: ['2026-02-15', '2025-11-01'] },
  ],
  [MODULE.EXECUTIVES]: [
    { key: 'designation', label: 'Executive designation', samples: ['Chief Executive Officer', 'Chief Financial Officer'] },
    { key: 'appointmentStatus', label: 'Appointment status', samples: ['Regular', 'Acting'] },
  ],
  [MODULE.FINANCE]: [
    { key: 'revenuePkr', label: 'Revenue PKR', samples: ['6840000000', '2375000000'] },
    { key: 'expensesPkr', label: 'Expenses PKR', samples: ['6120000000', '2510000000'] },
    { key: 'profitOrLossPkr', label: 'Profit / loss PKR', samples: ['720000000', '-135000000'] },
  ],
  [MODULE.LOANS]: [
    { key: 'outstandingPrincipalPkr', label: 'Outstanding principal PKR', samples: ['940000000', '315000000'] },
    { key: 'nextDueDate', label: 'Next repayment date', samples: ['2027-03-31', '2027-06-30'] },
  ],
  [MODULE.PROCUREMENT]: [
    { key: 'contractValuePkr', label: 'Contract value PKR', samples: ['185000000', '47500000'] },
    { key: 'procurementMethod', label: 'Procurement method', samples: ['Open tender', 'Single source'] },
  ],
  [MODULE.AUDIT]: [
    { key: 'auditParaReference', label: 'Audit para reference', samples: ['AP-2026-017', 'AP-2026-044'] },
    { key: 'amountPkr', label: 'Audit amount PKR', samples: ['76000000', '128000000'] },
  ],
  [MODULE.LITIGATION]: [
    { key: 'caseNumber', label: 'Case number', samples: ['CIV-2026-184', 'WP-2026-071'] },
    { key: 'court', label: 'Court', samples: ['Islamabad High Court', 'District Court'] },
    { key: 'amountInvolvedPkr', label: 'Amount involved PKR', samples: ['124000000', '73500000'] },
  ],
  [MODULE.COMPLIANCE]: [
    { key: 'obligation', label: 'Compliance obligation', samples: ['Annual statutory return', 'Tax filing'] },
    { key: 'dueDate', label: 'Due date', samples: ['2027-03-31', '2027-06-30'] },
    { key: 'status', label: 'Compliance status', samples: ['Compliant', 'Pending verification'] },
  ],
  [MODULE.INDUSTRIAL]: [
    { key: 'productionVolume', label: 'Production volume', samples: ['128500', '73400'] },
    { key: 'capacityUtilizationPct', label: 'Capacity utilization %', samples: ['78', '63'] },
  ],
  [MODULE.PRIVATIZATION]: [
    { key: 'currentStage', label: 'Current privatization stage', samples: ['Due diligence', 'Valuation'] },
    { key: 'targetDate', label: 'Target completion date', samples: ['2027-12-31', '2028-06-30'] },
  ],
  [MODULE.DOCUMENTS]: [
    { key: 'documentTitle', label: 'Document title', samples: ['Audited financial statements', 'Board resolution'] },
    { key: 'documentDate', label: 'Document date', samples: ['2026-06-30', '2026-08-15'] },
  ],
}

function hash(value: string) {
  return [...value].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 17)
}

function extensionOf(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function assertFiles(files: File[]) {
  if (!files.length) throw new AppError('Select at least one Excel or PDF file.', 'VALIDATION')
  if (files.length > MAX_FILES) throw new AppError(`A maximum of ${MAX_FILES} files can be processed together.`, 'VALIDATION')
  for (const file of files) {
    const extension = extensionOf(file.name)
    if (!acceptedExtensions.has(extension)) {
      throw new AppError(`${file.name} is not a supported Excel, CSV or PDF file.`, 'VALIDATION')
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(`${file.name} exceeds the 20 MB frontend demo limit.`, 'VALIDATION')
    }
  }
}

function inferModule(fileName: string, offset: number): ModuleId {
  const normalized = fileName.toLowerCase()
  const matches: Array<[RegExp, ModuleId]> = [
    [/financial|finance|accounts|profit|revenue/, MODULE.FINANCE],
    [/workforce|employee|staff|hr/, MODULE.WORKFORCE],
    [/asset|property|land|machinery/, MODULE.ASSETS],
    [/litigation|legal|court|case/, MODULE.LITIGATION],
    [/board|director|governance/, MODULE.BOARD],
    [/compliance|statutory|obligation/, MODULE.COMPLIANCE],
    [/audit|para|pac/, MODULE.AUDIT],
    [/procurement|contract|tender/, MODULE.PROCUREMENT],
    [/loan|grant|guarantee/, MODULE.LOANS],
    [/industrial|production|capacity/, MODULE.INDUSTRIAL],
    [/privatization|transformation/, MODULE.PRIVATIZATION],
    [/profile|enterprise|company/, MODULE.ENTERPRISE],
  ]
  return matches.find(([pattern]) => pattern.test(normalized))?.[1]
    ?? REPORTING_MODULES[offset % REPORTING_MODULES.length].id
}

function inferOrganization(fileName: string, context: IntelligentImportContext, offset: number) {
  if (context.portal === 'soe_entry') {
    return db.organizations.find((item) => item.id === context.organizationId) ?? db.organizations[0]
  }
  const normalized = fileName.toLowerCase()
  return db.organizations.find((item) => normalized.includes(item.abbreviation.toLowerCase()))
    ?? db.organizations[(hash(fileName) + offset) % db.organizations.length]
}

function descriptor(file: File, index: number): IntelligentImportFile {
  const extension = extensionOf(file.name)
  return {
    id: `ai-file-${Date.now()}-${index}`,
    name: file.name,
    size: file.size,
    type: file.type || (extension === 'pdf' ? 'application/pdf' : 'application/vnd.ms-excel'),
    extension,
    pageOrSheetCount: 1 + (hash(file.name) % 4),
  }
}

async function csvRows(file: File) {
  if (extensionOf(file.name) !== 'csv') return [] as Array<{ field: string; value: string; source: string }>
  const text = typeof file.text === 'function'
    ? await file.text()
    : await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result ?? ''))
        reader.onerror = () => reject(reader.error ?? new Error(`Unable to read ${file.name}`))
        reader.readAsText(file)
      })
  const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 8)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((value) => value.trim())
  return lines.slice(1).flatMap((line, rowIndex) =>
    line.split(',').slice(0, headers.length).map((value, columnIndex) => ({
      field: headers[columnIndex] || `Column ${columnIndex + 1}`,
      value: value.trim(),
      source: `Row ${rowIndex + 2}`,
    })),
  ).slice(0, 12)
}

function validationFor(confidence: number, value: string): Pick<IntelligentImportRow, 'validation' | 'validationMessage' | 'selected'> {
  if (!value.trim()) return { validation: 'blocked', validationMessage: 'No value was detected.', selected: false }
  if (confidence < 0.78) return { validation: 'review', validationMessage: 'Confirm this low-confidence AI mapping.', selected: false }
  if (confidence < 0.9) return { validation: 'review', validationMessage: 'Review the detected field and value.', selected: true }
  return { validation: 'ready', validationMessage: 'Ready for user approval.', selected: true }
}

export const mockIntelligentImportService = {
  async processFiles(files: File[], context: IntelligentImportContext): Promise<IntelligentImportBatch> {
    if (!hasPermission(context.role, PERMISSION.AI_IMPORT_USE)) {
      throw new AppError('Permission denied', 'PERMISSION')
    }
    assertFiles(files)
    const descriptors = files.map(descriptor)
    const rows: IntelligentImportRow[] = []

    for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
      const file = files[fileIndex]
      const fileDescriptor = descriptors[fileIndex]
      const parsedCsvRows = await csvRows(file)
      const inferredCount = parsedCsvRows.length || Math.min(6, 3 + (hash(file.name) % 4))
      for (let rowIndex = 0; rowIndex < inferredCount; rowIndex += 1) {
        const organization = inferOrganization(file.name, context, rowIndex)
        const module = inferModule(file.name, fileIndex + Math.floor(rowIndex / 3))
        const fields = fieldCatalogue[module] ?? fieldCatalogue[MODULE.DOCUMENTS]!
        const field = fields[rowIndex % fields.length]
        const parsed = parsedCsvRows[rowIndex]
        const confidence = Math.min(0.98, 0.72 + ((hash(`${file.name}-${rowIndex}`) % 27) / 100))
        const value = parsed?.value || field.samples[(hash(file.name) + rowIndex) % field.samples.length]
        const validation = validationFor(confidence, value)
        rows.push({
          id: `ai-row-${Date.now()}-${fileIndex}-${rowIndex}`,
          fileId: fileDescriptor.id,
          fileName: file.name,
          sourceReference: parsed?.source || `${fileDescriptor.extension === 'pdf' ? 'Page' : 'Sheet 1 · row'} ${rowIndex + 1}`,
          organizationId: organization.id,
          organizationLabel: organization.abbreviation,
          module,
          moduleLabel: REPORTING_MODULES.find((item) => item.id === module)?.label ?? module,
          fieldKey: parsed ? parsed.field.toLowerCase().replace(/[^a-z0-9]+/g, '_') : field.key,
          fieldLabel: parsed?.field || field.label,
          value,
          confidence,
          ...validation,
        })
      }
    }

    const batch: IntelligentImportBatch = {
      id: `ai-batch-${Date.now()}`,
      portal: context.portal,
      reportingPeriodId: context.reportingPeriodId,
      files: descriptors,
      rows,
      status: 'review',
      createdAt: new Date().toISOString(),
    }
    batches.unshift(batch)
    return simulateLatency(structuredClone(batch))
  },

  async approveBatch(batch: IntelligentImportBatch, role: RoleId): Promise<IntelligentImportBatch> {
    if (!hasPermission(role, PERMISSION.AI_IMPORT_USE)) throw new AppError('Permission denied', 'PERMISSION')
    const approvedRows = batch.rows.filter((row) => row.selected && row.validation !== 'blocked')
    if (!approvedRows.length) throw new AppError('Select at least one valid row to insert.', 'VALIDATION')
    const now = new Date().toISOString()
    const targets = new Map<string, IntelligentImportRow[]>()
    for (const row of approvedRows) {
      const key = `${row.organizationId}:${row.module}`
      targets.set(key, [...(targets.get(key) ?? []), row])
    }

    for (const targetRows of targets.values()) {
      const first = targetRows[0]
      const submission = db.submissions.find((item) =>
        item.organizationId === first.organizationId
        && item.reportingPeriodId === batch.reportingPeriodId
        && item.module === first.module)
      if (submission && ![SUBMISSION_STATUS.APPROVED, SUBMISSION_STATUS.LOCKED].includes(submission.status as never)) {
        submission.completeness = Math.min(100, submission.completeness + Math.min(18, targetRows.length * 3))
        if (submission.status === SUBMISSION_STATUS.DRAFT) submission.status = SUBMISSION_STATUS.IN_PROGRESS
        submission.updatedAt = now
      }
      db.timeline.unshift({
        id: `timeline-${batch.id}-${first.organizationId}-${first.module}`,
        organizationId: first.organizationId,
        occurredAt: now,
        title: `AI-assisted import approved: ${targetRows.length} field${targetRows.length === 1 ? '' : 's'} mapped to ${first.module}`,
        category: 'ai_import',
        actorRole: role,
        action: 'ai_import_approved',
        comment: `Frontend demonstration batch ${batch.id}`,
        linkedRecordType: 'submission',
        linkedRecordId: submission?.id,
      })
    }

    for (const file of batch.files) {
      const fileRows = approvedRows.filter((row) => row.fileId === file.id)
      const organizations = [...new Set(fileRows.map((row) => row.organizationId))]
      for (const organizationId of organizations) {
        const module = fileRows.find((row) => row.organizationId === organizationId)?.module ?? MODULE.DOCUMENTS
        db.documents.push({
          id: `doc-${batch.id}-${file.id}-${organizationId}`,
          organizationId,
          title: `AI import source: ${file.name}`,
          category: module,
          fileName: file.name,
          fileType: file.type,
          linkedRecordType: 'ai_import_batch',
          linkedRecordId: batch.id,
          linkedModule: module,
          reportingPeriodId: batch.reportingPeriodId,
          uploadedAt: now,
          uploadedBy: role,
          version: 1,
          documentFamilyId: `docfam-${batch.id}-${file.id}`,
          evidenceStatus: 'pending_review',
          status: 'pending_review',
          classification: 'evidence',
          notes: 'Source file registered by the frontend AI import demonstration.',
          isDummyDemonstrationData: true,
        })
      }
    }

    const approved: IntelligentImportBatch = {
      ...batch,
      rows: structuredClone(batch.rows),
      status: 'approved',
      approvedAt: now,
      approvedBy: role,
      insertedRows: approvedRows.length,
      affectedOrganizations: new Set(approvedRows.map((row) => row.organizationId)).size,
      affectedModules: targets.size,
    }
    const index = batches.findIndex((item) => item.id === batch.id)
    if (index >= 0) batches[index] = structuredClone(approved)
    else batches.unshift(structuredClone(approved))
    return simulateMutation(structuredClone(approved))
  },

  async listHistory(portal: IntelligentImportPortal, organizationId?: string) {
    const items = batches.filter((batch) =>
      batch.portal === portal
      && (!organizationId || batch.rows.some((row) => row.organizationId === organizationId)),
    )
    return simulateLatency(structuredClone(items))
  },
}

export const intelligentImportLimits = {
  maxFiles: MAX_FILES,
  maxFileSizeBytes: MAX_FILE_SIZE,
  acceptedExtensions: [...acceptedExtensions],
}

export function canUseIntelligentImport(role: RoleId) {
  return role === ROLE.SYSTEM_ADMIN || hasPermission(role, PERMISSION.AI_IMPORT_USE)
}
