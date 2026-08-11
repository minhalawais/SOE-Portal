/**
 * Phase 24 — Facilitator workspace for stakeholder validation rounds.
 * Prototype tooling only — not a MoIP production operating screen.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { SelectField } from '@/design-system/components/Fields'
import { Alert, EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { ROLE_LABEL } from '@/constants'
import {
  getFixtureVersion,
  getReleaseCandidateId,
  mockStakeholderValidationService,
} from '@/mock-services'
import type { ValidationRoundId } from '@/mock-data/validationRounds'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'

export function StakeholderValidationPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const setRole = useSessionStore((s) => s.setRole)
  const setOrganizationId = useSessionStore((s) => s.setOrganizationId)
  const setReportingPeriodId = useSessionStore((s) => s.setReportingPeriodId)
  const pushToast = useUiStore((s) => s.pushToast)
  const presentationMode = useUiStore((s) => s.presentationMode)
  const setPresentationMode = useUiStore((s) => s.setPresentationMode)
  const activeRoundId = useUiStore((s) => s.activeValidationRoundId)
  const setActiveRound = useUiStore((s) => s.setActiveValidationRound)
  const [selectedId, setSelectedId] = useState<ValidationRoundId | ''>('')
  const [baselineLine, setBaselineLine] = useState<string | null>(null)

  const rounds = useQuery({
    queryKey: ['validation-rounds'],
    queryFn: () => mockStakeholderValidationService.listRounds(),
  })

  const selected = useMemo(
    () => rounds.data?.find((r) => r.id === (selectedId || activeRoundId)) ?? null,
    [rounds.data, selectedId, activeRoundId],
  )

  const prepare = useMutation({
    mutationFn: (id: ValidationRoundId) =>
      mockStakeholderValidationService.prepareRound(id, { queryClient }),
    onSuccess: (prep) => {
      setOrganizationId(prep.organizationId)
      setReportingPeriodId(prep.reportingPeriodId)
      setRole(prep.startRole)
      setActiveRound(prep.round.id)
      setSelectedId(prep.round.id)
      setBaselineLine(prep.baselineLine)
      setPresentationMode(true)
      pushToast({ title: `Round ${prep.round.roundNumber} prepared.`, tone: 'success' })
      navigate(prep.startRoute)
    },
    onError: () => pushToast({ title: 'Unable to prepare validation round.', tone: 'critical' }),
  })

  if (rounds.isLoading) return <LoadingBlock label="Loading validation rounds…" />
  if (rounds.isError) return <ErrorState title="Unable to load validation rounds" />

  return (
    <div>
      <PageHeader
        title="Stakeholder validation"
        subtitle="Facilitator tooling · scripted rounds · not production MoIP UI"
        actions={
          <Button
            size="sm"
            variant={presentationMode ? 'primary' : 'secondary'}
            onClick={() => setPresentationMode(!presentationMode)}
          >
            {presentationMode ? 'Exit presentation mode' : 'Presentation mode'}
          </Button>
        }
      />

      <Alert
        className="mb-3"
        tone="info"
        title="Demo validation package"
      >
        Build {getReleaseCandidateId()} · fixture {getFixtureVersion()}. Record every comment in
        the Product Decision Register. Do not implement new requirements mid-session.
      </Alert>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card title="Rounds">
          <SelectField
            label="Validation round"
            value={selectedId || activeRoundId || ''}
            options={[
              { value: '', label: 'Select round…' },
              ...(rounds.data ?? []).map((r) => ({
                value: r.id,
                label: `R${r.roundNumber} — ${r.title}`,
              })),
            ]}
            onChange={(e) => setSelectedId(e.target.value as ValidationRoundId | '')}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!selected || prepare.isPending}
              onClick={() => selected && prepare.mutate(selected.id)}
            >
              Prepare round
            </Button>
            <Link
              className="inline-flex h-9 items-center text-xs text-soe-blue underline"
              to="/soe/demo-controls"
            >
              Demo Controls
            </Link>
          </div>
          {baselineLine ? (
            <p className="mt-2 font-mono text-[11px] text-soe-ink">{baselineLine}</p>
          ) : null}
        </Card>

        <Card
          title={selected ? `R${selected.roundNumber}: ${selected.title}` : 'Round script'}
          subtitle={selected?.objective}
        >
          {!selected ? (
            <EmptyState title="Select a round" hint="Prepare resets fixtures and opens the start route." />
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-soe-navy">Decisions required</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-soe-ink">
                  {selected.decisionsRequired.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-soe-navy">Demo script</p>
                <div className="overflow-auto rounded-control border border-soe-border">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-soe-canvas text-xs text-soe-navy">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2">Route</th>
                        <th className="px-3 py-2">Action</th>
                        <th className="px-3 py-2">Expected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.steps.map((s) => (
                        <tr key={s.order} className="border-t border-soe-border">
                          <td className="px-3 py-2 tabular-nums">{s.order}</td>
                          <td className="px-3 py-2">{ROLE_LABEL[s.role]}</td>
                          <td className="px-3 py-2 font-mono text-[11px]">
                            <Link className="text-soe-blue underline" to={s.route}>
                              {s.route}
                            </Link>
                          </td>
                          <td className="px-3 py-2">{s.action}</td>
                          <td className="px-3 py-2 text-soe-slate">{s.expected}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-[11px] text-soe-slate">
                Target roles: {selected.targetRoles.map((r) => ROLE_LABEL[r]).join(' · ')} · Org{' '}
                {selected.organizationId} · {selected.reportingPeriodId}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
