export const APP_CONFIG = {
  APP_NAME: 'SOE-GAIP',
  APP_FULL_NAME:
    'State-Owned Enterprises Governance, Asset & Performance Intelligence Platform',
  OWNER: 'Ministry of Industries and Production',
  DEMO_MODE: true,
  DEFAULT_ROLE: 'soe_focal_person' as const,
  DEFAULT_ORGANIZATION_ID: 'org-psm',
  DEFAULT_REPORTING_PERIOD_ID: 'period-fy2027',
  ENABLE_PMO_PORTAL: true,
  ENABLE_ASSURANCE_PORTAL: true,
  MOCK_LATENCY_MS: 350,
  SIMULATED_LABEL: 'Demo Environment',
} as const
