import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { db, resetMockDb } from '@/mock-data'
import { mockGisService, setMockLatencyMode } from '@/mock-services'
import { ALL_SOE_FOOTPRINTS, SoeFootprintMap } from '@/components/gis/SoeFootprintMap'

const mapMocks = vi.hoisted(() => ({
  setView: vi.fn(),
  fitBounds: vi.fn(),
  flyTo: vi.fn(),
  getZoom: vi.fn(() => 7),
}))

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div aria-label="Map canvas">{children}</div>,
  TileLayer: () => null,
  Tooltip: ({
    children,
    eventHandlers,
  }: {
    children: ReactNode
    eventHandlers?: { click?: () => void }
  }) => (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        eventHandlers?.click?.()
      }}
    >
      {children}
    </button>
  ),
  Polygon: ({
    children,
    eventHandlers,
  }: {
    children: ReactNode
    eventHandlers?: { click?: () => void }
  }) => <div onClick={eventHandlers?.click}>{children}</div>,
  useMap: () => mapMocks,
}))

describe('SoeFootprintMap', () => {
  beforeEach(() => {
    resetMockDb()
    setMockLatencyMode('none')
    mapMocks.flyTo.mockClear()
    mapMocks.getZoom.mockReturnValue(7)
  })

  it('renders every mapped SOE when the aggregate option is selected', async () => {
    const assets = await mockGisService.queryAssets({ portfolioScope: true, pageSize: 500 })
    const soes = db.organizations.slice(0, 5).map((organization) => ({
      organizationId: organization.id,
      abbreviation: organization.abbreviation,
      name: organization.name,
      sector: organization.sector,
    }))

    render(
      <SoeFootprintMap
        soes={soes}
        locations={db.locations}
        assets={assets.items}
        selectedSoeId={ALL_SOE_FOOTPRINTS}
        onSelectSoe={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('SOE footprint')).toHaveValue(ALL_SOE_FOOTPRINTS)
    expect(screen.getByRole('option', { name: 'All SOEs' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'NFC Head Office - Lahore' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PSM Industrial Unit - Karachi' })).toBeInTheDocument()
    expect(screen.getByText(/units · \d+ SOEs · \d+ regions/)).toBeInTheDocument()
  })

  it('changes the selected SOE and opens formatted unit details', async () => {
    const assets = await mockGisService.queryAssets({ portfolioScope: true, pageSize: 500 })
    const soes = db.organizations.slice(0, 5).map((organization) => ({
      organizationId: organization.id,
      abbreviation: organization.abbreviation,
      name: organization.name,
      sector: organization.sector,
    }))
    const selected = soes.find((soe) => soe.organizationId === 'org-nfc')!
    const onSelectSoe = vi.fn()

    render(
      <SoeFootprintMap
        soes={soes}
        locations={db.locations}
        assets={assets.items}
        selectedSoeId={selected.organizationId}
        onSelectSoe={onSelectSoe}
      />,
    )

    const selector = screen.getByLabelText('SOE footprint')
    expect(selector).toHaveValue('org-nfc')
    fireEvent.change(selector, { target: { value: 'org-psm' } })
    expect(onSelectSoe).toHaveBeenCalledWith('org-psm')

    fireEvent.click(screen.getByRole('button', { name: 'NFC Head Office - Lahore' }))
    expect(mapMocks.flyTo).toHaveBeenCalledWith(
      [31.5204, 74.3587],
      12,
      { animate: true, duration: 0.55 },
    )
    expect(screen.getByRole('complementary', { name: 'NFC Head Office - Lahore details' })).toBeInTheDocument()
    expect(screen.getByText('Registered assets')).toBeInTheDocument()
    expect(screen.getByText('Registry flags')).toBeInTheDocument()
    expect(screen.queryByText('None')).not.toBeInTheDocument()
  })
})
