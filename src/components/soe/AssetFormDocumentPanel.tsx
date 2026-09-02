import { ASSET_TYPE_LABEL, type AssetType } from '@/constants'
import { FormDocumentPanel } from '@/components/soe/FormDocumentPanel'
import { useSessionStore } from '@/state/session'

export function assetFormDocumentRecordId(organizationId: string, assetType: AssetType) {
  return `asset-form-${organizationId}-${assetType}`
}

export function AssetFormDocumentPanel({ assetType }: { assetType: AssetType }) {
  const organizationId = useSessionStore((s) => s.organizationId)
  const typeLabel = ASSET_TYPE_LABEL[assetType] ?? 'Asset'
  return (
    <FormDocumentPanel
      packId={`asset-${assetType}`}
      subtitle={`${typeLabel} evidence pack`}
      linkedModule="assets"
      linkedRecordType="asset_form"
      recordId={assetFormDocumentRecordId(organizationId, assetType)}
    />
  )
}
