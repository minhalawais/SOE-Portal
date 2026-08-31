import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/design-system/components/Card'
import { Button } from '@/design-system/components/Button'
import { Alert, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { FormActions } from '@/design-system/components/FormActions'
import { ConfirmDialog } from '@/design-system/components/Overlays'
import { mockSoePortalService } from '@/mock-services'
import { useSessionStore } from '@/state/session'
import { useUiStore } from '@/state/ui'
import { AppError } from '@/utils'
import { hasPermission, PERMISSION } from '@/permissions'

export function SubmissionReadinessPage() {
  const organizationId = useSessionStore((s) => s.organizationId)
  const reportingPeriodId = useSessionStore((s) => s.reportingPeriodId)
  const role = useSessionStore((s) => s.role)
  const pushToast = useUiStore((s) => s.pushToast)
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const canSubmit = hasPermission(role, PERMISSION.SUBMISSION_SUBMIT)

  const query = useQuery({
    queryKey: ['submission-readiness', organizationId, reportingPeriodId],
    queryFn: () =>
      mockSoePortalService.getSubmissionReadiness(organizationId, reportingPeriodId),
  })

  const mutation = useMutation({
    mutationFn: () =>
      mockSoePortalService.confirmPeriodSubmission(organizationId, reportingPeriodId, role),
    onSuccess: (r) => {
      setConfirmOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['submission-readiness'] })
      void queryClient.invalidateQueries({ queryKey: ['soe-dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['reporting-workspace'] })
      void queryClient.invalidateQueries({ queryKey: ['moip-finance-queue'] })
      pushToast({
        title: `Submitted ${r.submittedModuleIds.length} certified module(s) to MoIP.`,
        tone: 'success',
      })
    },
    onError: (err: unknown) => {
      setConfirmOpen(false)
      pushToast({
        title: err instanceof AppError ? err.message : 'Submission failed',
        tone: 'critical',
      })
    },
  })

  if (query.isLoading) return <LoadingBlock />
  if (query.isError || !query.data) {
    return <ErrorState title="Unable to load submission readiness" />
  }

  const r = query.data

  return (
    <div>
      <PageHeader
        title="Submission readiness"
        subtitle={`${r.organization.abbreviation} · ${r.period.label} · v${r.version}`}
      />

      <Alert
        className="mb-4"
        tone={r.canSubmit ? 'success' : 'warning'}
        title={
          r.canSubmit
            ? 'Ready for period submission (subject to confirmation).'
            : 'Submission disabled while blocking conditions remain.'
        }
      >
        Completion {r.overallCompletion}% · Modules complete {r.modulesComplete}/{r.modulesTotal}
      </Alert>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Blocking errors">
          {r.blockingErrors.length === 0 ? (
            <p className="text-sm text-soe-slate">None</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {r.blockingErrors.map((i) => (
                <li key={i.id}>
                  <Link className="text-soe-blue underline" to={i.route}>
                    {i.message}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Missing evidence">
          {r.missingEvidence.length === 0 ? (
            <p className="text-sm text-soe-slate">None</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {r.missingEvidence.map((i) => (
                <li key={i.id}>{i.message}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Warnings (non-blocking)">
          {r.warnings.length === 0 ? (
            <p className="text-sm text-soe-slate">None</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {r.warnings.map((i) => (
                <li key={i.id}>{i.message}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Outstanding clarifications">
          {r.outstandingClarifications.length === 0 ? (
            <p className="text-sm text-soe-slate">None</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {r.outstandingClarifications.map((c) => (
                <li key={c.id}>
                  <Link className="text-soe-blue underline" to="/soe/submissions?tab=clarifications">
                    {c.question}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Certification requirements">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {r.certificationRequirements.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-soe-slate">
            Certifiers: {r.certifiers.join(', ')}
          </p>
        </Card>
      </div>

      <FormActions className="mt-4">
        <div className="mr-auto">
          {!canSubmit ? (
            <p className="text-xs text-soe-slate">
              Current role cannot submit. Switch to SOE Contributor or CEO.
            </p>
          ) : null}
        </div>
        <Button disabled={!canSubmit || !r.canSubmit} onClick={() => setConfirmOpen(true)}>
          Confirm period submission
        </Button>
      </FormActions>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm submission to MoIP"
        message={`${r.organization.name} · ${r.period.label} · version ${r.version}. Unresolved non-blocking warnings may remain. This is a demo submission statement.`}
        confirmLabel="Submit to MoIP"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => mutation.mutate()}
      />
    </div>
  )
}
