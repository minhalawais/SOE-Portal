import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { SelectField } from '@/design-system/components/Fields'
import { scenarioCatalogue } from '@/mock-data'
import {
  resetDemoData,
  beginQaCycle,
  getFixtureVersion,
  getReleaseCandidateId,
  getMockRuntime,
  setMockLatencyMode,
  setMockErrorMode,
  setMockScenarioFilter,
  type MockErrorMode,
  type MockLatencyMode,
  mockFinanceService,
  mockOrganizationService,
  mockStakeholderValidationService,
} from '@/mock-services'
import type { ValidationRoundId } from '@/mock-data/validationRounds'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'

/**
 * Developer / demo controls — clearly marked as prototype tooling.
 * Not part of production MoIP operating UI.
 */
export function DemoControlsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)
  const presentationMode = useUiStore((s) => s.presentationMode)
  const setPresentationMode = useUiStore((s) => s.setPresentationMode)
  const setActiveRound = useUiStore((s) => s.setActiveValidationRound)
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const role = useSessionStore((s) => s.role)
  const setOrganizationId = useSessionStore((s) => s.setOrganizationId)
  const setReportingPeriodId = useSessionStore((s) => s.setReportingPeriodId)
  const setRole = useSessionStore((s) => s.setRole)
  const [runtime, setRuntime] = useState(() => getMockRuntime())
  const [lastBaseline, setLastBaseline] = useState<string | null>(null)
  const [roundId, setRoundId] = useState<ValidationRoundId | ''>('')

  const orgs = useQuery({
    queryKey: ['organizations', 'demo-controls'],
    queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 50 }),
  })
  const periods = useQuery({
    queryKey: ['reporting-periods'],
    queryFn: () => mockFinanceService.getReportingPeriods(),
  })
  const rounds = useQuery({
    queryKey: ['validation-rounds'],
    queryFn: () => mockStakeholderValidationService.listRounds(),
  })

  function refreshRuntime() {
    setRuntime(getMockRuntime())
  }

  return (
    <div>
      <PageHeader
        title="Demo Controls"
        subtitle="Prototype tooling only — reset fixtures, latency, and validation prep"
        actions={
          <Link className="text-xs text-soe-blue underline" to="/soe/stakeholder-validation">
            Stakeholder validation
          </Link>
        }
      />

      <div className="mb-3 rounded-control border border-soe-border bg-soe-canvas px-3 py-2 text-xs text-soe-slate">
        Demo environment · {getReleaseCandidateId()} · fixture {getFixtureVersion()} · not
        production data
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Reset">
          <p className="mb-3 text-sm text-soe-slate">
            Restore deterministic seed data and clear runtime error/latency knobs.
          </p>
          <Button
            variant="destructive"
            onClick={() => {
              resetDemoData(queryClient)
              refreshRuntime()
              setLastBaseline(null)
              setActiveRound(null)
              pushToast({ title: 'Demo data reset to seed.', tone: 'success' })
            }}
          >
            Reset Demo Data
          </Button>
        </Card>

        <Card title="QA cycle baseline">
          <p className="mb-3 text-sm text-soe-slate">
            Reset fixtures and record fixture version, period, org, and role for the execution log.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              const baseline = beginQaCycle({
                reportingPeriodId,
                organizationId,
                role,
                queryClient,
              })
              refreshRuntime()
              setLastBaseline(
                `${baseline.releaseCandidate} · ${baseline.fixtureVersion} · ${baseline.role} · ${baseline.organizationId} · ${baseline.reportingPeriodId}`,
              )
              pushToast({ title: 'QA cycle baseline recorded (demo reset).', tone: 'success' })
            }}
          >
            Begin QA cycle
          </Button>
          {lastBaseline ? (
            <p className="mt-2 font-mono text-[11px] text-soe-ink">{lastBaseline}</p>
          ) : null}
        </Card>

        <Card title="Stakeholder round prep">
          <p className="mb-3 text-sm text-soe-slate">
            Phase 24: reset to round scenario, enable presentation mode, open start route.
          </p>
          <SelectField
            label="Validation round"
            value={roundId}
            options={[
              { value: '', label: 'Select round…' },
              ...(rounds.data ?? []).map((r) => ({
                value: r.id,
                label: `R${r.roundNumber} — ${r.title}`,
              })),
            ]}
            onChange={(e) => setRoundId(e.target.value as ValidationRoundId | '')}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!roundId}
              onClick={async () => {
                if (!roundId) return
                const prep = await mockStakeholderValidationService.prepareRound(roundId, {
                  queryClient,
                })
                setOrganizationId(prep.organizationId)
                setReportingPeriodId(prep.reportingPeriodId)
                setRole(prep.startRole)
                setActiveRound(prep.round.id)
                setPresentationMode(true)
                setLastBaseline(prep.baselineLine)
                refreshRuntime()
                pushToast({
                  title: `Round ${prep.round.roundNumber} prepared.`,
                  tone: 'success',
                })
                navigate(prep.startRoute)
              }}
            >
              Prepare & open
            </Button>
            <Button
              size="sm"
              variant={presentationMode ? 'primary' : 'tertiary'}
              onClick={() => setPresentationMode(!presentationMode)}
            >
              {presentationMode ? 'Exit presentation' : 'Presentation mode'}
            </Button>
          </div>
        </Card>

        <Card title="Latency">
          <SelectField
            label="Mock latency"
            value={runtime.latencyMode}
            options={[
              { value: 'none', label: 'None' },
              { value: 'normal', label: 'Normal' },
              { value: 'slow', label: 'Slow' },
            ]}
            onChange={(e) => {
              setMockLatencyMode(e.target.value as MockLatencyMode)
              refreshRuntime()
            }}
          />
        </Card>

        <Card title="Error testing">
          <SelectField
            label="Error mode"
            value={runtime.errorMode}
            options={[
              { value: 'none', label: 'None' },
              { value: 'query_failure', label: 'Query failure' },
              { value: 'save_failure', label: 'Save failure' },
              { value: 'validation_failure', label: 'Validation failure' },
              { value: 'permission_failure', label: 'Permission failure' },
              { value: 'empty_result', label: 'Empty result' },
            ]}
            onChange={(e) => {
              setMockErrorMode(e.target.value as MockErrorMode)
              refreshRuntime()
            }}
          />
        </Card>

        <Card title="Scenario filter">
          <SelectField
            label="Filter SOEs by scenario"
            value={runtime.scenarioFilter}
            options={[
              { value: 'all', label: 'All scenarios' },
              ...scenarioCatalogue.map((s) => ({ value: s.id, label: s.label })),
            ]}
            onChange={(e) => {
              setMockScenarioFilter(e.target.value)
              refreshRuntime()
              void queryClient.invalidateQueries({ queryKey: ['organizations'] })
            }}
          />
        </Card>

        <Card title="Session context">
          <div className="space-y-3">
            <SelectField
              label="Organization"
              value={organizationId}
              options={(orgs.data?.items ?? []).map((o) => ({
                value: o.id,
                label: `${o.abbreviation} — ${o.name}`,
              }))}
              onChange={(e) => setOrganizationId(e.target.value)}
            />
            <SelectField
              label="Reporting period"
              value={reportingPeriodId}
              options={(periods.data ?? []).map((p) => ({
                value: p.id,
                label: p.label,
              }))}
              onChange={(e) => setReportingPeriodId(e.target.value)}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
