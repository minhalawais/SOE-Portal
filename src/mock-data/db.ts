import { createSeedDataset, type SeedDataset } from '@/mock-data/seed'

function cloneSeed(): SeedDataset {
  return structuredClone(createSeedDataset())
}

/** Mutable in-memory store — all mock services read/write here */
export const db: SeedDataset = cloneSeed()

export function resetMockDb(): void {
  const fresh = cloneSeed()
  ;(Object.keys(fresh) as Array<keyof SeedDataset>).forEach((key) => {
    const target = db[key] as unknown[]
    const source = fresh[key] as unknown[]
    target.splice(0, target.length, ...source)
  })
}

export function getSeedSnapshot(): SeedDataset {
  return cloneSeed()
}
