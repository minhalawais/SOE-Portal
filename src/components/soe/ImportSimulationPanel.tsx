import { useState } from 'react'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { MockFileControl } from '@/design-system/components/Fields'
import { Alert } from '@/design-system/components/Feedback'
import { mockSoePortalService } from '@/mock-services'
import type { ModuleId } from '@/constants'
import { useUiStore } from '@/state/ui'
import { AppError } from '@/utils'

/** Demo Excel/CSV import — no real parsing */
export function ImportSimulationPanel({
  organizationId,
  moduleId,
  title = 'Bulk import',
}: {
  organizationId: string
  moduleId: ModuleId
  title?: string
}) {
  const pushToast = useUiStore((s) => s.pushToast)
  const [fileName, setFileName] = useState('template-import.xlsx')
  const [result, setResult] = useState<{
    accepted: number
    warnings: number
    rejected: number
    message: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <Card title={title} subtitle="Download template → select mock file → validate → confirm">
      <div className="space-y-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            pushToast({
              title: 'Template download prepared for this demo.',
              tone: 'info',
            })
          }
        >
          Download template
        </Button>
        <MockFileControl label="Select mock file" />
        <label className="block text-xs text-soe-slate">
          File name
          <input
            className="mt-1 h-9 w-full rounded-control border border-soe-border px-2 text-sm"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
          />
        </label>
        <Button
          size="sm"
          loading={loading}
          onClick={async () => {
            setLoading(true)
            try {
              const r = await mockSoePortalService.simulateImport(
                organizationId,
                moduleId,
                fileName,
              )
              setResult(r)
              pushToast({ title: 'Import validation complete.', tone: 'success' })
            } catch (err) {
              pushToast({
                title: err instanceof AppError ? err.message : 'Import failed',
                tone: 'critical',
              })
            } finally {
              setLoading(false)
            }
          }}
        >
          Run validation
        </Button>
        {result ? (
          <Alert tone="info" title={result.message}>
            Accepted {result.accepted} · Warnings {result.warnings} · Rejected {result.rejected}
          </Alert>
        ) : null}
      </div>
    </Card>
  )
}
