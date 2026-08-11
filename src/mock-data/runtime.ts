import { APP_CONFIG } from '@/app/config/app.config'
import { AppError } from '@/utils'

export type MockLatencyMode = 'normal' | 'slow' | 'none'
export type MockErrorMode =
  | 'none'
  | 'query_failure'
  | 'save_failure'
  | 'validation_failure'
  | 'permission_failure'
  | 'empty_result'

interface MockRuntimeState {
  latencyMode: MockLatencyMode
  errorMode: MockErrorMode
  scenarioFilter: string | 'all'
}

const state: MockRuntimeState = {
  latencyMode: 'normal',
  errorMode: 'none',
  scenarioFilter: 'all',
}

export function getMockRuntime(): Readonly<MockRuntimeState> {
  return { ...state }
}

export function setMockLatencyMode(mode: MockLatencyMode): void {
  state.latencyMode = mode
}

export function setMockErrorMode(mode: MockErrorMode): void {
  state.errorMode = mode
}

export function setMockScenarioFilter(scenarioId: string | 'all'): void {
  state.scenarioFilter = scenarioId
}

export function resetMockRuntime(): void {
  state.latencyMode = 'normal'
  state.errorMode = 'none'
  state.scenarioFilter = 'all'
}

function latencyMs(): number {
  if (state.latencyMode === 'none') return 0
  if (state.latencyMode === 'slow') return Math.max(APP_CONFIG.MOCK_LATENCY_MS, 1200)
  return APP_CONFIG.MOCK_LATENCY_MS
}

/** Apply configured latency + read-path error modes */
export async function withMockRuntime<T>(
  value: T | (() => T),
  options?: { mutation?: boolean },
): Promise<T> {
  const ms = latencyMs()
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms))

  const mutation = options?.mutation ?? false
  const mode = state.errorMode

  if (!mutation && mode === 'query_failure') {
    throw new AppError('Demo query failure', 'UNKNOWN')
  }
  if (mutation && mode === 'save_failure') {
    throw new AppError('Demo save failure', 'UNKNOWN')
  }
  if (mutation && mode === 'validation_failure') {
    throw new AppError('Demo validation failure', 'VALIDATION')
  }
  if (mode === 'permission_failure') {
    throw new AppError('Demo permission denied', 'PERMISSION')
  }

  const resolved = typeof value === 'function' ? (value as () => T)() : value

  if (!mutation && mode === 'empty_result') {
    if (Array.isArray(resolved)) return [] as T
    if (
      resolved &&
      typeof resolved === 'object' &&
      'items' in resolved &&
      Array.isArray((resolved as { items: unknown[] }).items)
    ) {
      return {
        ...(resolved as object),
        items: [],
        total: 0,
      } as T
    }
  }

  return resolved
}
