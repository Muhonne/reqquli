import { useCallback } from 'react'

interface Filters {
  search?: string
  status?: 'draft' | 'approved'
  page?: number
  sort?: 'lastModified' | 'createdAt' | 'approvedAt'
  order?: 'asc' | 'desc'
}

interface UseRequirementFiltersProps {
  /** Current filter state */
  filters: Filters | undefined
  /** Function to update filters in store */
  setFilters: (filters: Filters) => void
  /** Function to fetch requirements with filters */
  fetchRequirements: (filters?: Filters) => void
}

/**
 * Hook for managing requirement list filters
 * 
 * Provides consistent filter handling across requirement list pages,
 * including search, status, pagination, and sorting. Automatically
 * resets to page 1 when filters change (except page changes).
 * 
 * @example
 * ```tsx
 * const {
 *   handleSearchChange,   // Update search term
 *   handleStatusChange,   // Filter by status
 *   handlePageChange,     // Navigate pages
 *   handleSortChange      // Change sort order
 * } = useRequirementFilters({
 *   filters,
 *   setFilters,
 *   fetchRequirements
 * })
 * ```
 */
export function useRequirementFilters({
  filters,
  setFilters,
  fetchRequirements
}: UseRequirementFiltersProps) {
  
  const updateFilters = useCallback((updates: Partial<Filters>, resetPage = true) => {
    const newFilters = {
      ...filters,
      ...updates,
      ...(resetPage ? { page: 1 } : {})
    }
    setFilters(newFilters)
    fetchRequirements(newFilters)
  }, [filters, setFilters, fetchRequirements])

  const handleSearchChange = useCallback((search: string | undefined) => {
    updateFilters({ search })
  }, [updateFilters])

  const handleStatusChange = useCallback((status: 'draft' | 'approved' | undefined) => {
    updateFilters({ status })
  }, [updateFilters])

  const handlePageChange = useCallback((page: number) => {
    updateFilters({ page }, false)
  }, [updateFilters])

  const handleSortChange = useCallback(
    (sort: 'lastModified' | 'createdAt' | 'approvedAt', order: 'asc' | 'desc') => {
      updateFilters({ sort, order })
    },
    [updateFilters]
  )

  return {
    handleSearchChange,
    handleStatusChange,
    handlePageChange,
    handleSortChange
  }
}