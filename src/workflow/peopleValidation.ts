import type { Consultant, DailyWager, Employee, SanctionedPost } from '@/types/domain'
import { EMPLOYMENT_TYPE } from '@/constants'

export interface PeopleValidationIssue {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export function validateSanctionedPost(post: Partial<SanctionedPost>): PeopleValidationIssue[] {
  const issues: PeopleValidationIssue[] = []
  if (post.sanctioned != null && post.filled != null && post.filled > post.sanctioned) {
    issues.push({
      field: 'filled',
      message: 'Filled posts exceed sanctioned — provide explanation before lock.',
      severity: 'warning',
    })
  }
  if (post.sanctioned != null && post.sanctioned < 0) {
    issues.push({ field: 'sanctioned', message: 'Sanctioned count cannot be negative.', severity: 'error' })
  }
  return issues
}

export function validateEmployee(emp: Partial<Employee>): PeopleValidationIssue[] {
  const issues: PeopleValidationIssue[] = []
  if (!emp.name?.trim()) {
    issues.push({ field: 'name', message: 'Employee name is required.', severity: 'error' })
  }
  if (
    emp.employmentType &&
    !(Object.values(EMPLOYMENT_TYPE) as string[]).includes(emp.employmentType)
  ) {
    issues.push({
      field: 'employmentType',
      message: 'Employment type must use a controlled value.',
      severity: 'error',
    })
  }
  if (emp.joiningDate && emp.retirementDate) {
    if (new Date(emp.retirementDate) < new Date(emp.joiningDate)) {
      issues.push({
        field: 'retirementDate',
        message: 'Retirement date must be after joining date.',
        severity: 'error',
      })
    }
  }
  if (emp.salaryPkr != null && emp.salaryPkr < 0) {
    issues.push({ field: 'salaryPkr', message: 'Salary cannot be negative.', severity: 'error' })
  }
  if (emp.assetDeclarationStatus === 'overdue') {
    issues.push({
      field: 'assetDeclarationStatus',
      message: 'Asset declaration overdue.',
      severity: 'warning',
    })
  }
  return issues
}

export function validateDailyWager(row: Partial<DailyWager>): PeopleValidationIssue[] {
  const issues: PeopleValidationIssue[] = []
  if (!row.name?.trim()) {
    issues.push({ field: 'name', message: 'Name is required.', severity: 'error' })
  }
  if (!row.roleLabel?.trim()) {
    issues.push({ field: 'roleLabel', message: 'Role is required.', severity: 'error' })
  }
  if (row.durationMonths != null && row.durationMonths <= 0) {
    issues.push({ field: 'durationMonths', message: 'Duration must be positive.', severity: 'error' })
  }
  if (row.dailyRatePkr != null && row.dailyRatePkr < 0) {
    issues.push({ field: 'dailyRatePkr', message: 'Daily rate cannot be negative.', severity: 'error' })
  }
  return issues
}

export function validateConsultant(row: Partial<Consultant>): PeopleValidationIssue[] {
  const issues: PeopleValidationIssue[] = []
  if (!row.name?.trim()) {
    issues.push({ field: 'name', message: 'Consultant name is required.', severity: 'error' })
  }
  if (!row.project?.trim()) {
    issues.push({ field: 'project', message: 'Project is required.', severity: 'error' })
  }
  if (row.contractStart && row.contractEnd) {
    if (new Date(row.contractEnd) < new Date(row.contractStart)) {
      issues.push({
        field: 'contractEnd',
        message: 'Contract end must be after start.',
        severity: 'error',
      })
    }
  }
  if (row.monthlyRemunerationPkr != null && row.monthlyRemunerationPkr < 0) {
    issues.push({
      field: 'monthlyRemunerationPkr',
      message: 'Remuneration cannot be negative.',
      severity: 'error',
    })
  }
  return issues
}
