import { create } from 'zustand';
import { 
  RiskRecord, 
  RiskRecordFilters,
  CreateRiskRecordRequest,
  UpdateRiskRecordRequest
} from '../../types/risks';
import { riskApi, ApiError } from '../services/api';

interface PaginationInfo {
  total: number;
  page: number;
  pages: number;
}

interface RiskStoreState {
  risks: RiskRecord[];
  selectedRisk: RiskRecord | null;
  pagination: PaginationInfo | null;
  filters: RiskRecordFilters;
  loading: boolean;
  error: string | null;
}

interface RiskStoreActions {
  // Data fetching
  fetchRisks: (filters?: RiskRecordFilters) => Promise<void>;
  fetchRisk: (id: string) => Promise<void>;
  
  // CRUD operations
  createRisk: (data: CreateRiskRecordRequest) => Promise<RiskRecord>;
  updateRisk: (id: string, data: UpdateRiskRecordRequest) => Promise<RiskRecord>;
  deleteRisk: (id: string) => Promise<void>;
  
  // Trace operations
  fetchDownstreamTraces: (riskId: string) => Promise<unknown[]>;
  
  // State management
  setSelectedRisk: (risk: RiskRecord | null) => void;
  setFilters: (filters: RiskRecordFilters) => void;
  clearError: () => void;
  resetStore: () => void;
}

type RiskStore = RiskStoreState & RiskStoreActions;

const initialState: RiskStoreState = {
  risks: [],
  selectedRisk: null,
  pagination: null,
  filters: {
    sort: 'lastModified',
    order: 'desc',
    page: 1,
    limit: 100,
  },
  loading: false,
  error: null,
};

const useRiskStore = create<RiskStore>((set, get) => ({
  ...initialState,

  fetchRisks: async (filters?: RiskRecordFilters) => {
    set({ loading: true, error: null });
    
    try {
      const currentFilters = filters || get().filters;
      const response = await riskApi.list(currentFilters);
      
      set({
        risks: response.data,
        pagination: response.meta?.pagination || null,
        filters: currentFilters,
        loading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch risks';
      set({ error: errorMessage, loading: false });
    }
  },

  fetchRisk: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      const response = await riskApi.get(id);
      set({
        selectedRisk: response.requirement,
        loading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch risk';
      set({ error: errorMessage, loading: false });
    }
  },

  createRisk: async (data: CreateRiskRecordRequest) => {
    set({ loading: true, error: null });
    
    try {
      const response = await riskApi.create(data);
      const newRisk = response.requirement;
      
      set((state) => ({
        risks: [newRisk, ...state.risks],
        selectedRisk: newRisk,
        loading: false,
      }));
      
      return newRisk;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to create risk';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  updateRisk: async (id: string, data: UpdateRiskRecordRequest) => {
    set({ loading: true, error: null });
    
    try {
      const response = await riskApi.update(id, data);
      const updatedRisk = response.requirement;
      
      set((state) => ({
        risks: state.risks.map((risk) =>
          risk.id === id ? updatedRisk : risk
        ),
        selectedRisk: state.selectedRisk?.id === id 
          ? updatedRisk 
          : state.selectedRisk,
        loading: false,
      }));
      
      return updatedRisk;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  deleteRisk: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      await riskApi.delete(id);
      
      set((state) => ({
        risks: state.risks.filter((risk) => risk.id !== id),
        selectedRisk: state.selectedRisk?.id === id 
          ? null 
          : state.selectedRisk,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to delete risk';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  setSelectedRisk: (risk: RiskRecord | null) => {
    set({ selectedRisk: risk });
  },

  setFilters: (filters: RiskRecordFilters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  clearError: () => {
    set({ error: null });
  },

  resetStore: () => {
    set(initialState);
  },

  fetchDownstreamTraces: async (riskId: string) => {
    try {
      const response = await riskApi.getDownstreamTraces(riskId);
      return response.traces;
    } catch {
      // Error is logged by the API layer
      return [];
    }
  },
}));

// Selector hooks for performance optimization
export const useRisks = () => 
  useRiskStore((state) => state.risks);

export const useSelectedRisk = () => 
  useRiskStore((state) => state.selectedRisk);

export const useRisksPagination = () => 
  useRiskStore((state) => state.pagination);

export const useRisksFilters = () => 
  useRiskStore((state) => state.filters);

export const useRisksLoading = () => 
  useRiskStore((state) => state.loading);

export const useRisksError = () => 
  useRiskStore((state) => state.error);

// Individual action selectors for better performance
export const useFetchRisks = () => 
  useRiskStore((state) => state.fetchRisks);

export const useFetchRisk = () => 
  useRiskStore((state) => state.fetchRisk);

export const useCreateRisk = () => 
  useRiskStore((state) => state.createRisk);

export const useUpdateRisk = () => 
  useRiskStore((state) => state.updateRisk);

export const useDeleteRisk = () => 
  useRiskStore((state) => state.deleteRisk);

export const useSetSelectedRisk = () => 
  useRiskStore((state) => state.setSelectedRisk);

export const useSetRiskFilters = () => 
  useRiskStore((state) => state.setFilters);

export const useClearRiskError = () => 
  useRiskStore((state) => state.clearError);

export const useResetRiskStore = () => 
  useRiskStore((state) => state.resetStore);

// Composite hook for convenience
export const useRiskActions = () => {
  const fetchRisks = useFetchRisks();
  const fetchRisk = useFetchRisk();
  const createRisk = useCreateRisk();
  const updateRisk = useUpdateRisk();
  const deleteRisk = useDeleteRisk();
  const setSelectedRisk = useSetSelectedRisk();
  const setFilters = useSetRiskFilters();
  const clearError = useClearRiskError();
  const resetStore = useResetRiskStore();

  return {
    fetchRisks,
    fetchRisk,
    createRisk,
    updateRisk,
    deleteRisk,
    setSelectedRisk,
    setFilters,
    clearError,
    resetStore,
  };
};

export { useRiskStore };
export default useRiskStore;

