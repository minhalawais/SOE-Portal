import type { ModuleId } from '@/constants'
import type { ModulePermissionGrant } from '@/mock-services/administration.service'
import { REPORTING_MODULES } from '@/workflow/moduleCatalog'
import { cn } from '@/utils'

const ACTIONS = ['view', 'create', 'edit', 'delete'] as const
type ActionKey = (typeof ACTIONS)[number]

const ACTION_LABEL: Record<ActionKey, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
}

export function emptyModulePermissionGrants(): ModulePermissionGrant[] {
  return REPORTING_MODULES.map((module) => ({
    moduleId: module.id,
    view: false,
    create: false,
    edit: false,
    delete: false,
  }))
}

export function mergeModulePermissionGrants(
  existing?: ModulePermissionGrant[],
): ModulePermissionGrant[] {
  const byId = new Map((existing ?? []).map((grant) => [grant.moduleId, grant]))
  return REPORTING_MODULES.map((module) => {
    const current = byId.get(module.id)
    return {
      moduleId: module.id,
      view: Boolean(current?.view),
      create: Boolean(current?.create),
      edit: Boolean(current?.edit),
      delete: Boolean(current?.delete),
    }
  })
}

export function hasAnyModulePermission(grants: ModulePermissionGrant[]): boolean {
  return grants.some((grant) => grant.view || grant.create || grant.edit || grant.delete)
}

export function formatAssignedRoles(
  roles: string[],
  customRoleEnabled: boolean,
  roleLabel: (role: string) => string,
): string {
  const labels = roles.map(roleLabel)
  if (customRoleEnabled) labels.push('Custom')
  return labels.join(', ') || '—'
}

export function CustomModulePermissionMatrix({
  value,
  onChange,
  className,
}: {
  value: ModulePermissionGrant[]
  onChange: (next: ModulePermissionGrant[]) => void
  className?: string
}) {
  const rows = mergeModulePermissionGrants(value)

  const toggle = (moduleId: ModuleId, action: ActionKey) => {
    onChange(
      rows.map((row) =>
        row.moduleId === moduleId ? { ...row, [action]: !row[action] } : row,
      ),
    )
  }

  const setRow = (moduleId: ModuleId, enabled: boolean) => {
    onChange(
      rows.map((row) =>
        row.moduleId === moduleId
          ? { ...row, view: enabled, create: enabled, edit: enabled, delete: enabled }
          : row,
      ),
    )
  }

  return (
    <div className={cn('overflow-x-auto rounded-control border border-soe-border', className)}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-soe-canvas text-[10px] uppercase tracking-wide text-soe-slate">
          <tr>
            <th className="px-3 py-2 font-semibold">Module</th>
            {ACTIONS.map((action) => (
              <th key={action} className="px-2 py-2 text-center font-semibold">
                {ACTION_LABEL[action]}
              </th>
            ))}
            <th className="px-2 py-2 text-center font-semibold">All</th>
          </tr>
        </thead>
        <tbody>
          {REPORTING_MODULES.map((module) => {
            const grant = rows.find((row) => row.moduleId === module.id)!
            const allOn = grant.view && grant.create && grant.edit && grant.delete
            return (
              <tr key={module.id} className="border-t border-soe-border">
                <td className="px-3 py-2 font-medium text-soe-navy">{module.label}</td>
                {ACTIONS.map((action) => (
                  <td key={action} className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-soe-blue"
                      checked={grant[action]}
                      onChange={() => toggle(module.id, action)}
                      aria-label={`${module.label} ${ACTION_LABEL[action]}`}
                    />
                  </td>
                ))}
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-soe-blue"
                    checked={allOn}
                    onChange={() => setRow(module.id, !allOn)}
                    aria-label={`${module.label} all actions`}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
