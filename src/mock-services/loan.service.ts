import { db } from '@/mock-data'
import type { Grant, Guarantee, Loan, LoanRepayment } from '@/types/domain'
import { AppError, simulateLatency, simulateMutation } from '@/utils'

export interface LoanService {
  getLoans(organizationId?: string): Promise<Loan[]>
  getLoan(id: string): Promise<Loan>
  getRepayments(loanId: string): Promise<LoanRepayment[]>
  updateLoan(id: string, patch: Partial<Loan>): Promise<Loan>
}

export interface GrantService {
  getGrants(organizationId?: string): Promise<Grant[]>
  getGuarantees(organizationId?: string): Promise<Guarantee[]>
  updateGrant(id: string, patch: Partial<Grant>): Promise<Grant>
}

export const mockLoanService: LoanService = {
  async getLoans(organizationId) {
    let items = [...db.loans]
    if (organizationId) items = items.filter((l) => l.organizationId === organizationId)
    return simulateLatency(items)
  },
  async getLoan(id) {
    const row = db.loans.find((l) => l.id === id)
    if (!row) throw new AppError('Loan not found', 'NOT_FOUND')
    return simulateLatency(row)
  },
  async getRepayments(loanId) {
    return simulateLatency(
      db.loanRepayments
        .filter((r) => r.loanId === loanId)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    )
  },
  async updateLoan(id, patch) {
    const idx = db.loans.findIndex((l) => l.id === id)
    if (idx < 0) throw new AppError('Loan not found', 'NOT_FOUND')
    if (patch.outstanding !== undefined && patch.outstanding < 0) {
      throw new AppError('Outstanding cannot be negative', 'VALIDATION')
    }
    db.loans[idx] = { ...db.loans[idx], ...patch, id }
    return simulateMutation(db.loans[idx])
  },
}

export const mockGrantService: GrantService = {
  async getGrants(organizationId) {
    let items = [...db.grants]
    if (organizationId) items = items.filter((g) => g.organizationId === organizationId)
    return simulateLatency(items)
  },
  async getGuarantees(organizationId) {
    let items = [...db.guarantees]
    if (organizationId) items = items.filter((g) => g.organizationId === organizationId)
    return simulateLatency(items)
  },
  async updateGrant(id, patch) {
    const idx = db.grants.findIndex((g) => g.id === id)
    if (idx < 0) throw new AppError('Grant not found', 'NOT_FOUND')
    if (patch.utilized !== undefined && patch.utilized < 0) {
      throw new AppError('Utilized cannot be negative', 'VALIDATION')
    }
    db.grants[idx] = { ...db.grants[idx], ...patch, id }
    return simulateMutation(db.grants[idx])
  },
}
