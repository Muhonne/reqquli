import { create } from 'zustand'

interface AuthStore {
  isAuthenticated: boolean
  checkSession: () => void
  updateLastActivity: () => void
}

const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  checkSession: () => {
    // Basic session check
    set({ isAuthenticated: false })
  },
  updateLastActivity: () => {
    // Activity tracking placeholder
  }
}))

export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
export const useAuthActions = () => ({
  checkSession: useAuthStore((state) => state.checkSession),
  updateLastActivity: useAuthStore((state) => state.updateLastActivity)
})