import { Link } from 'react-router-dom'
import { RELATIONSHIP_TYPE_LABEL, SOE_STATUS_LABEL } from '@/constants'
import { StatusBadge } from '@/design-system/components/StatusBadge'
import type { HierarchyNode } from '@/types/domain'

interface HierarchyTreeProps {
  node: HierarchyNode
  linkBase?: string
  depth?: number
}

export function HierarchyTree({ node, linkBase, depth = 0 }: HierarchyTreeProps) {
  const rel =
    node.relationshipType != null
      ? `${RELATIONSHIP_TYPE_LABEL[node.relationshipType]}${
          node.ownershipPercentage != null ? ` · ${node.ownershipPercentage}%` : ''
        }`
      : 'Root'

  return (
    <li className={depth === 0 ? 'list-none' : undefined}>
      <div
        className="flex flex-wrap items-center gap-2 border-l-2 border-soe-border py-1.5 pl-3"
        style={{ marginLeft: depth * 12 }}
      >
        {linkBase ? (
          <Link
            className="text-sm font-medium text-soe-navy hover:underline"
            to={`${linkBase}/${node.organizationId}`}
          >
            {node.abbreviation} — {node.name}
          </Link>
        ) : (
          <span className="text-sm font-medium text-soe-navy">
            {node.abbreviation} — {node.name}
          </span>
        )}
        <span className="text-xs text-soe-slate">{rel}</span>
        <StatusBadge status={node.status} label={SOE_STATUS_LABEL[node.status]} />
      </div>
      {node.children.length > 0 ? (
        <ul className="list-none">
          {node.children.map((child) => (
            <HierarchyTree
              key={`${node.organizationId}-${child.organizationId}-${child.relationshipType}`}
              node={child}
              linkBase={linkBase}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function flattenHierarchy(
  node: HierarchyNode,
  rows: Array<{
    organizationId: string
    name: string
    abbreviation: string
    relationshipType: string
    ownershipPercentage: number | null
    status: string
    level: number
  }> = [],
  level = 0,
) {
  rows.push({
    organizationId: node.organizationId,
    name: node.name,
    abbreviation: node.abbreviation,
    relationshipType: node.relationshipType
      ? RELATIONSHIP_TYPE_LABEL[node.relationshipType]
      : 'Root',
    ownershipPercentage: node.ownershipPercentage ?? null,
    status: node.status,
    level,
  })
  node.children.forEach((c) => flattenHierarchy(c, rows, level + 1))
  return rows
}
