import { z } from 'zod'

export const organizationProfileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  abbreviation: z.string().min(2).max(12),
  headOfficeAddress: z.string().min(3, 'Address is required'),
})

export type OrganizationProfileInput = z.infer<typeof organizationProfileSchema>
