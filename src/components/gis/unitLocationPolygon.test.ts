import { describe, expect, it } from 'vitest'
import { filterUnitPlaces } from '@/components/gis/unitLocationPolygon'

describe('unit location place search', () => {
  it('returns matching city polygons for a search term', () => {
    const matches = filterUnitPlaces('lahore')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches.some((place) => place.district === 'Lahore')).toBe(true)
  })

  it('ignores one-character queries', () => {
    expect(filterUnitPlaces('l')).toEqual([])
  })
})
