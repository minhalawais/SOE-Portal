import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/layout/PageHeader'
import { MapPreview } from '@/components/data-display/MapPreview'
import { ChartContainer } from '@/design-system/components/ChartContainer'
import { Card } from '@/design-system/components/Card'
import { EmptyState, ErrorState, LoadingBlock } from '@/design-system/components/Feedback'
import { Button } from '@/design-system/components/Button'
import { mockGisService, mockOrganizationService } from '@/mock-services'

export function MapFoundationPage() {
  const [selectedId, setSelectedId] = useState<string>()
  const [forceEmpty, setForceEmpty] = useState(false)
  const [forceError, setForceError] = useState(false)

  const query = useQuery({
    queryKey: ['gis-features', forceEmpty, forceError],
    queryFn: async () => {
      if (forceError) throw new Error('Demo GIS failure')
      const data = await mockGisService.getFeatures()
      return forceEmpty ? [] : data
    },
  })

  if (query.isLoading) return <LoadingBlock label="Loading map" />
  if (query.isError) {
    return (
      <div className="space-y-3">
        <ErrorState title="Map failed to load" detail="Demonstrates service error state." />
        <Button variant="secondary" onClick={() => { setForceError(false); query.refetch() }}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="GIS Foundation"
        subtitle="Foundation lab — use National Industrial Asset Map for decision-support GIS"
        actions={
          <div className="flex gap-2">
            <Link to="/soe/assets/map">
              <Button size="sm" variant="primary">
                Open asset map
              </Button>
            </Link>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setForceEmpty((v) => !v)
                query.refetch()
              }}
            >
              Toggle empty
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setForceError(true)
                query.refetch()
              }}
            >
              Simulate error
            </Button>
          </div>
        }
      />
      {query.data && query.data.length === 0 ? (
        <EmptyState title="No geospatial features available." hint="Toggle empty off to restore fixtures." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <MapPreview
            features={query.data ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <Card title="Feature list" subtitle="Accessible alternative to map markers">
            <ul className="space-y-2 text-sm">
              {(query.data ?? []).map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className="text-left text-soe-blue hover:underline"
                    onClick={() => setSelectedId(f.id)}
                  >
                    {f.label}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  )
}

export function FoundationLabPage() {
  const orgs = useQuery({
    queryKey: ['organizations'],
    queryFn: () => mockOrganizationService.getOrganizations({ pageSize: 50 }),
  })

  const chartData = useMemo(
    () =>
      (orgs.data?.items ?? []).map((o) => ({
        name: o.abbreviation,
        count: o.name.length,
      })),
    [orgs.data],
  )

  return (
    <div>
      <PageHeader
        title="Foundation Lab"
        subtitle="Chart wrapper, loading/empty patterns — not a final dashboard"
      />
      <ChartContainer
        title="SOE name-length comparison"
        subtitle="Illustrative chart wrapper only"
        summary="Bar chart comparing abbreviation groups by name length"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke="#DDE3E8" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#1D5D8F" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}
