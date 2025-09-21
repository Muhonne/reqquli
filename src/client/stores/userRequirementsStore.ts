import { create } from 'zustand';
import { 
  UserRequirement, 
  UserRequirementFilters,
  CreateUserRequirementRequest,
  UpdateUserRequirementRequest
} from '../../types/user-requirements';
import { userRequirementApi, ApiError } from '../services/api';

interface PaginationInfo {
  total: number;
  page: number;
  pages: number;
}

interface UserRequirementsState {
  requirements: UserRequirement[];
  selectedRequirement: UserRequirement | null;
  pagination: PaginationInfo | null;
  filters: UserRequirementFilters;
  loading: boolean;
  error: string | null;
}

interface UserRequirementsActions {
  // Data fetching
  fetchRequirements: (filters?: UserRequirementFilters) => Promise<void>;
  fetchRequirement: (id: string) => Promise<void>;
  
  // CRUD operations
  createRequirement: (data: CreateUserRequirementRequest) => Promise<UserRequirement>;
  updateRequirement: (id: string, data: UpdateUserRequirementRequest) => Promise<UserRequirement>;
  deleteRequirement: (id: string) => Promise<void>;
  
  // State management
  setSelectedRequirement: (requirement: UserRequirement | null) => void;
  setFilters: (filters: UserRequirementFilters) => void;
  clearError: () => void;
  resetStore: () => void;
}

type UserRequirementsStore = UserRequirementsState & UserRequirementsActions;

const initialState: UserRequirementsState = {
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

const useUserRequirementsStore = create<UserRequirementsStore>((set, get) => ({
  ...initialState,

  fetchRequirements: async (filters?: UserRequirementFilters) => {
    set({ loading: true, error: null });
    
    try {
      const currentFilters = filters || get().filters;
      const response = await userRequirementApi.list(currentFilters);
      
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
      const response = await userRequirementApi.get(id);
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

  createRequirement: async (data: CreateUserRequirementRequest) => {
    set({ loading: true, error: null });
    
    try {
      const response = await userRequirementApi.create(data);
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

  updateRequirement: async (id: string, data: UpdateUserRequirementRequest) => {
    set({ loading: true, error: null });
    
    try {
      const response = await userRequirementApi.update(id, data);
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
      await userRequirementApi.delete(id);
      
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

  setSelectedRequirement: (requirement: UserRequirement | null) => {
    set({ selectedRequirement: requirement });
  },

  setFilters: (filters: UserRequirementFilters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  clearError: () => {
    set({ error: null });
  },

  resetStore: () => {
    set(initialState);
  },
}));

// Selector hooks for performance optimization
export const useUserRequirements = () => 
  useUserRequirementsStore((state) => state.requirements);

export const useSelectedUserRequirement = () => 
  useUserRequirementsStore((state) => state.selectedRequirement);

export const useUserRequirementsPagination = () => 
  useUserRequirementsStore((state) => state.pagination);

export const useUserRequirementsFilters = () => 
  useUserRequirementsStore((state) => state.filters);

export const useUserRequirementsLoading = () => 
  useUserRequirementsStore((state) => state.loading);

export const useUserRequirementsError = () => 
  useUserRequirementsStore((state) => state.error);

// Individual action selectors for better performance
export const useFetchRequirements = () => 
  useUserRequirementsStore((state) => state.fetchRequirements);

export const useFetchRequirement = () => 
  useUserRequirementsStore((state) => state.fetchRequirement);

export const useCreateRequirement = () => 
  useUserRequirementsStore((state) => state.createRequirement);

export const useUpdateRequirement = () => 
  useUserRequirementsStore((state) => state.updateRequirement);


export const useDeleteRequirement = () => 
  useUserRequirementsStore((state) => state.deleteRequirement);

export const useSetSelectedRequirement = () => 
  useUserRequirementsStore((state) => state.setSelectedRequirement);

export const useSetFilters = () => 
  useUserRequirementsStore((state) => state.setFilters);

export const useClearError = () => 
  useUserRequirementsStore((state) => state.clearError);

export const useResetStore = () => 
  useUserRequirementsStore((state) => state.resetStore);

// Composite hook for convenience - returns individual selectors to avoid re-renders
export const useUserRequirementsActions = () => {
  const fetchRequirements = useFetchRequirements();
  const fetchRequirement = useFetchRequirement();
  const createRequirement = useCreateRequirement();
  const updateRequirement = useUpdateRequirement();
  const deleteRequirement = useDeleteRequirement();
  const setSelectedRequirement = useSetSelectedRequirement();
  const setFilters = useSetFilters();
  const clearError = useClearError();
  const resetStore = useResetStore();

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

export default useUserRequirementsStore;