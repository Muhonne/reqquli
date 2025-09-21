import { create } from 'zustand';
import { 
  SystemRequirement, 
  SystemRequirementFilters,
  CreateSystemRequirementRequest,
  UpdateSystemRequirementRequest
} from '../../types/system-requirements';
import { systemRequirementApi, userRequirementApi, ApiError } from '../services/api';

interface PaginationInfo {
  total: number;
  page: number;
  pages: number;
}

interface SystemRequirementsState {
  requirements: SystemRequirement[];
  selectedRequirement: SystemRequirement | null;
  pagination: PaginationInfo | null;
  filters: SystemRequirementFilters;
  loading: boolean;
  error: string | null;
}

interface SystemRequirementsActions {
  // Data fetching
  fetchRequirements: (filters?: SystemRequirementFilters) => Promise<void>;
  fetchRequirement: (id: string) => Promise<void>;
  
  // CRUD operations
  createRequirement: (data: CreateSystemRequirementRequest) => Promise<SystemRequirement>;
  updateRequirement: (id: string, data: UpdateSystemRequirementRequest) => Promise<SystemRequirement>;
  deleteRequirement: (id: string) => Promise<void>;
  
  // Trace operations
  fetchDownstreamTraces: (userRequirementId: string) => Promise<any[]>;
  
  // State management
  setSelectedRequirement: (requirement: SystemRequirement | null) => void;
  setFilters: (filters: SystemRequirementFilters) => void;
  clearError: () => void;
  resetStore: () => void;
}

type SystemRequirementsStore = SystemRequirementsState & SystemRequirementsActions;

const initialState: SystemRequirementsState = {
  requirements: [],
  selectedRequirement: null,
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

const useSystemRequirementStore = create<SystemRequirementsStore>((set, get) => ({
  ...initialState,

  fetchRequirements: async (filters?: SystemRequirementFilters) => {
    set({ loading: true, error: null });
    
    try {
      const currentFilters = filters || get().filters;
      const response = await systemRequirementApi.list(currentFilters);
      
      set({
        requirements: response.data,
        pagination: response.meta?.pagination || response.pagination,
        filters: currentFilters,
        loading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch requirements';
      set({ error: errorMessage, loading: false });
    }
  },

  fetchRequirement: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      const response = await systemRequirementApi.get(id);
      set({
        selectedRequirement: response.requirement,
        loading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to fetch requirement';
      set({ error: errorMessage, loading: false });
    }
  },

  createRequirement: async (data: CreateSystemRequirementRequest) => {
    set({ loading: true, error: null });
    
    try {
      const response = await systemRequirementApi.create(data);
      const newRequirement = response.requirement;
      
      set((state) => ({
        requirements: [newRequirement, ...state.requirements],
        selectedRequirement: newRequirement,
        loading: false,
      }));
      
      return newRequirement;
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to create requirement';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  updateRequirement: async (id: string, data: UpdateSystemRequirementRequest) => {
    set({ loading: true, error: null });
    
    try {
      const response = await systemRequirementApi.update(id, data);
      const updatedRequirement = response.requirement;
      
      set((state) => ({
        requirements: state.requirements.map((req) =>
          req.id === id ? updatedRequirement : req
        ),
        selectedRequirement: state.selectedRequirement?.id === id 
          ? updatedRequirement 
          : state.selectedRequirement,
        loading: false,
      }));
      
      return updatedRequirement;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  deleteRequirement: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      await systemRequirementApi.delete(id);
      
      set((state) => ({
        requirements: state.requirements.filter((req) => req.id !== id),
        selectedRequirement: state.selectedRequirement?.id === id 
          ? null 
          : state.selectedRequirement,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to delete requirement';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  setSelectedRequirement: (requirement: SystemRequirement | null) => {
    set({ selectedRequirement: requirement });
  },

  setFilters: (filters: SystemRequirementFilters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  clearError: () => {
    set({ error: null });
  },

  resetStore: () => {
    set(initialState);
  },


  fetchDownstreamTraces: async (userRequirementId: string) => {
    try {
      const response = await userRequirementApi.getDownstreamTraces(userRequirementId);
      return response.downstreamTraces;
    } catch (error) {
      console.error('Error fetching downstream traces:', error);
      return [];
    }
  },
}));

// Selector hooks for performance optimization
export const useSystemRequirements = () => 
  useSystemRequirementStore((state) => state.requirements);

export const useSelectedSystemRequirement = () => 
  useSystemRequirementStore((state) => state.selectedRequirement);

export const useSystemRequirementsPagination = () => 
  useSystemRequirementStore((state) => state.pagination);

export const useSystemRequirementsFilters = () => 
  useSystemRequirementStore((state) => state.filters);

export const useSystemRequirementsLoading = () => 
  useSystemRequirementStore((state) => state.loading);

export const useSystemRequirementsError = () => 
  useSystemRequirementStore((state) => state.error);

// Individual action selectors for better performance
export const useFetchSystemRequirements = () => 
  useSystemRequirementStore((state) => state.fetchRequirements);

export const useFetchSystemRequirement = () => 
  useSystemRequirementStore((state) => state.fetchRequirement);

export const useCreateSystemRequirement = () => 
  useSystemRequirementStore((state) => state.createRequirement);

export const useUpdateSystemRequirement = () => 
  useSystemRequirementStore((state) => state.updateRequirement);


export const useDeleteSystemRequirement = () => 
  useSystemRequirementStore((state) => state.deleteRequirement);

export const useSetSelectedSystemRequirement = () => 
  useSystemRequirementStore((state) => state.setSelectedRequirement);

export const useSetSystemFilters = () => 
  useSystemRequirementStore((state) => state.setFilters);

export const useClearSystemError = () => 
  useSystemRequirementStore((state) => state.clearError);

export const useResetSystemStore = () => 
  useSystemRequirementStore((state) => state.resetStore);

// Composite hook for convenience - returns individual selectors to avoid re-renders
export const useSystemRequirementsActions = () => {
  const fetchRequirements = useFetchSystemRequirements();
  const fetchRequirement = useFetchSystemRequirement();
  const createRequirement = useCreateSystemRequirement();
  const updateRequirement = useUpdateSystemRequirement();
  const deleteRequirement = useDeleteSystemRequirement();
  const setSelectedRequirement = useSetSelectedSystemRequirement();
  const setFilters = useSetSystemFilters();
  const clearError = useClearSystemError();
  const resetStore = useResetSystemStore();

  return {
    fetchRequirements,
    fetchRequirement,
    createRequirement,
    updateRequirement,
    deleteRequirement,
    setSelectedRequirement,
    setFilters,
    clearError,
    resetStore,
  };
};

export { useSystemRequirementStore };
export default useSystemRequirementStore;