import { create } from 'zustand'
import type { ValidationRoundId } from '@/mock-data/validationRounds'

interface ToastItem {
  id: string
  title: string
  tone: 'info' | 'success' | 'warning' | 'critical'
}

interface UiState {
  toasts: ToastItem[]
  pushToast: (toast: Omit<ToastItem, 'id'>) => void
  dismissToast: (id: string) => void
  /** Phase 24 — facilitator presentation mode (hides prototype noise in chrome). */
  presentationMode: boolean
  activeValidationRoundId: ValidationRoundId | null
  setPresentationMode: (on: boolean) => void
  setActiveValidationRound: (id: ValidationRoundId | null) => void
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  pushToast: (toast) =>
    set((s) => ({
      toasts: [...s.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  presentationMode: false,
  activeValidationRoundId: null,
  setPresentationMode: (presentationMode) => set({ presentationMode }),
  setActiveValidationRound: (activeValidationRoundId) => set({ activeValidationRoundId }),
}))
