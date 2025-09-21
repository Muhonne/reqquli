import { AUTH_TOKEN_KEY } from '../constants'

class AuthService {
  private static instance: AuthService
  
  private constructor() {}
  
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }
  
  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  }
  
  setToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
  }
  
  removeToken(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY)
  }
  
  isAuthenticated(): boolean {
    return !!this.getToken()
  }
  
  getAuthHeaders(): HeadersInit {
    const token = this.getToken()
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  }
}

export const authService = AuthService.getInstance()