import type { GisMarkerRole } from '@/mock-services/gis.service'

/** Design-system GIS marker colors (SOE-GAIP-DESIGN-SYSTEM). */
export const GIS_ROLE_COLOR: Record<GisMarkerRole, string> = {
  standard: '#1D5D8F',
  opportunity: '#148F77',
  attention: '#D97706',
  critical: '#C0392B',
  unavailable: '#94A3B8',
}

export function GisMapLegend() {
  const items: Array<{ role: GisMarkerRole; label: string }> = [
    { role: 'standard', label: 'Standard asset' },
    { role: 'opportunity', label: 'Available / opportunity' },
    { role: 'attention', label: 'Attention (idle / encroachment)' },
    { role: 'critical', label: 'Litigation / critical' },
    { role: 'unavailable', label: 'Unverified / missing evidence' },
  ]
  return (
    <ul className="flex flex-wrap gap-3 text-[11px] text-soe-slate">
      {items.map((i) => (
        <li key={i.role} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: GIS_ROLE_COLOR[i.role] }}
            aria-hidden
          />
          {i.label}
        </li>
      ))}
    </ul>
  )
}
