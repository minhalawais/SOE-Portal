import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/layout/PageHeader'
import { ContributorModuleLayout } from '@/components/soe'
import { DataTable } from '@/components/tables/DataTable'
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  ChartContainer,
  CheckboxField,
  ConfirmDialog,
  CurrencyField,
  Drawer,
  FilterBar,
  KpiComparison,
  KpiGrid,
  KpiProgress,
  KpiValue,
  KpiWithStatus,
  KpiWithTrend,
  Modal,
  RadioGroup,
  SelectField,
  StatusLegend,
  Tabs,
  TextareaField,
  TextField,
  Tooltip,
} from '@/design-system'
import { MODULE } from '@/constants'
import { statusCatalog, type StatusFamily } from '@/design-system/tokens/status'

interface SampleRow {
  id: string
  name: string
  status: string
  amount: number
}

const sampleRows: SampleRow[] = [
  { id: '1', name: 'Financial draft', status: 'in_progress', amount: 120 },
  { id: '2', name: 'Board update', status: 'submitted', amount: 40 },
  { id: '3', name: 'Asset valuation', status: 'overdue', amount: 85 },
]

export function DesignSystemPage() {
  const [tab, setTab] = useState('foundations')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [radio, setRadio] = useState('annual')
  const [family, setFamily] = useState<StatusFamily>('approval')

  const columns = useMemo<ColumnDef<SampleRow, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Item' },
      { accessorKey: 'status', header: 'Status' },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ getValue }) => (
          <span className="tabular-nums">{Number(getValue()).toLocaleString()}</span>
        ),
      },
    ],
    [],
  )

  const filtered = sampleRows.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter ? r.status === statusFilter : true
    return matchesSearch && matchesStatus
  })

  const chips = [
    ...(search ? [{ id: 'search', label: `Search: ${search}` }] : []),
    ...(statusFilter ? [{ id: 'status', label: `Status: ${statusFilter}` }] : []),
  ]

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: 'SOE', to: '/soe/dashboard' },
          { label: 'Design System' },
        ]}
      />
      <PageHeader
        title="SOE-GAIP Design System"
        subtitle="Shared tokens and components for portal/module development — not a business screen"
      />

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'foundations', label: 'Foundations' },
          { id: 'contributor', label: 'Contributor shells' },
          { id: 'forms', label: 'Forms & actions' },
          { id: 'status', label: 'Status' },
          { id: 'data', label: 'Data display' },
          { id: 'overlays', label: 'Overlays' },
        ]}
      />

      {tab === 'foundations' ? (
        <div className="space-y-4">
          <Card title="Color budget" subtitle="Navy structure · Blue action · Teal accent · Neutral surfaces">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {[
                ['Navy', 'bg-soe-navy'],
                ['Blue', 'bg-soe-blue'],
                ['Teal', 'bg-soe-teal'],
                ['Success', 'bg-soe-success'],
                ['Critical', 'bg-soe-critical'],
              ].map(([label, cls]) => (
                <div key={label} className="space-y-1">
                  <div className={`h-10 rounded-control ${cls}`} />
                  <p className="text-xs text-soe-slate">{label}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Typography">
            <div className="space-y-2">
              <p className="text-[24px] font-semibold text-soe-navy">Page title 24px</p>
              <p className="text-lg font-semibold text-soe-navy">Section title 18px</p>
              <p className="text-sm text-soe-ink">Body 14px — institutional, factual copy only.</p>
              <p className="text-xs text-soe-slate">Meta / helper 12px</p>
            </div>
          </Card>
          <Alert tone="info" title="Prototype note">
            All visual decisions must follow SOE-GAIP-DESIGN-SYSTEM.md and FOS-UI-UX-INSTRUCTIONS.md.
          </Alert>
        </div>
      ) : null}

      {tab === 'contributor' ? (
        <div className="space-y-6">
          <Card title="Module page shell" subtitle="Entry form on page · registry table below · one save bar">
            <ContributorModuleLayout
              moduleId={MODULE.FINANCE}
              title="Sample module page"
              entry={
                <Card title="Entry form">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CurrencyField label="Revenue (PKR)" defaultValue={2131067250} />
                    <CurrencyField label="Operating expenditure (PKR)" defaultValue={2874638000} />
                  </div>
                </Card>
              }
              onSave={() => undefined}
              registryTitle="Registry"
              registry={
                <DataTable data={filtered} columns={columns} density="compact" showSearch={false} />
              }
            />
          </Card>
        </div>
      ) : null}

      {tab === 'forms' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Form controls">
            <div className="grid gap-3">
              <TextField label="Official name" placeholder="Enter name" required />
              <SelectField
                label="Reporting period"
                options={[
                  { value: 'fy2027', label: 'FY2027' },
                  { value: 'fy2026', label: 'FY2026' },
                ]}
                defaultValue="fy2027"
              />
              <TextareaField label="Notes" placeholder="Optional clarification" />
              <CheckboxField label="Evidence attached" />
              <RadioGroup
                label="Period type"
                name="period-type"
                value={radio}
                onChange={setRadio}
                options={[
                  { value: 'annual', label: 'Annual' },
                  { value: 'quarterly', label: 'Quarterly' },
                ]}
              />
            </div>
          </Card>
          <Card title="Actions" subtitle="One primary CTA per section">
            <div className="flex flex-wrap gap-2">
              <Button>Submit</Button>
              <Button variant="secondary">Save draft</Button>
              <Button variant="tertiary">Cancel</Button>
              <Button variant="destructive">Delete</Button>
              <Tooltip content="Governance action">
                <Button variant="teal">Certify</Button>
              </Tooltip>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === 'status' ? (
        <Card
          title="Government status families"
          subtitle="Status always uses color + text (+ icon)"
          actions={
            <SelectField
              label="Family"
              options={(Object.keys(statusCatalog) as StatusFamily[]).map((k) => ({
                value: k,
                label: k,
              }))}
              value={family}
              onChange={(e) => setFamily(e.target.value as StatusFamily)}
            />
          }
        >
          <StatusLegend family={family} />
        </Card>
      ) : null}

      {tab === 'data' ? (
        <div className="space-y-4">
          <KpiGrid>
            <KpiValue label="Completion" value="62%" period="FY2027" />
            <KpiWithTrend label="Profit / loss" value="-9.2B" trend="down" trendLabel="Worse YoY" />
            <KpiWithStatus label="Risk" value="High" status="high" family="risk" />
            <KpiProgress label="Module progress" value="74%" percent={74} period="Assets" />
            <KpiComparison
              label="Market vs book"
              value="3.8x"
              comparisonLabel="Book"
              comparisonValue="PKR 12.5B"
            />
          </KpiGrid>

          <FilterBar
            search={search}
            onSearchChange={setSearch}
            filters={
              <label className="space-y-1 text-xs text-soe-slate">
                Status
                <select
                  className="h-10 rounded-control border border-soe-border px-2 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="in_progress">In Progress</option>
                  <option value="submitted">Submitted</option>
                  <option value="overdue">Overdue</option>
                </select>
              </label>
            }
            chips={chips}
            onClearChip={(id) => {
              if (id === 'search') setSearch('')
              if (id === 'status') setStatusFilter('')
            }}
            onClearAll={() => {
              setSearch('')
              setStatusFilter('')
            }}
          />

          <Card title="Compact table" subtitle="Shared DataTable">
            <DataTable data={filtered} columns={columns} density="compact" showSearch={false} />
          </Card>

          <ChartContainer
            title="Illustrative distribution"
            subtitle="Chart wrapper only"
            period="Demo"
            summary="Bar chart of sample amounts"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sampleRows}>
                <CartesianGrid stroke="#DDE3E8" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} />
                <RechartsTooltip />
                <Bar dataKey="amount" fill="#1D5D8F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      ) : null}

      {tab === 'overlays' ? (
        <Card title="Overlays" subtitle="Governance actions require confirmation">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Open modal
            </Button>
            <Button onClick={() => setConfirmOpen(true)}>Approve (confirm)</Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
              Open drawer
            </Button>
          </div>
          <Modal
            open={modalOpen}
            title="Record detail"
            onClose={() => setModalOpen(false)}
            footer={<Button onClick={() => setModalOpen(false)}>Close</Button>}
          >
            Example modal content for review notes or detail inspection.
          </Modal>
          <ConfirmDialog
            open={confirmOpen}
            title="Approve submission"
            message="This will mark the selected submission as approved in the prototype. Corrections after approval create a new version."
            confirmLabel="Approve"
            onCancel={() => setConfirmOpen(false)}
            onConfirm={() => setConfirmOpen(false)}
          />
          <Drawer open={drawerOpen} title="Side panel" onClose={() => setDrawerOpen(false)}>
            Use drawers for record inspection without leaving the list context.
          </Drawer>
        </Card>
      ) : null}
    </div>
  )
}
