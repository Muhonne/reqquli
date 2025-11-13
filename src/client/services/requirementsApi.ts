import { SystemRequirement } from '../../types/system-requirements'
import { authService } from './auth'

const API_BASE = '/api'

export const requirementsApi = {
  async getTracedSystemRequirements(userRequirementId: string): Promise<SystemRequirement[]> {
    try {
      const response = await fetch(
        `${API_BASE}/system-requirements/trace-from/${userRequirementId}`,
        {
          headers: authService.getAuthHeaders()
        }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch traced requirements: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.data || []
    } catch {
      return []
    }
  }
}