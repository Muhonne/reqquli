import { 
  UserRequirementListResponse, 
  UserRequirementResponse,
  CreateUserRequirementRequest,
  UpdateUserRequirementRequest,
  ApproveUserRequirementRequest,
  UserRequirementFilters,
  DownstreamTracesResponse,
  RequirementTracesResponse,
  CreateTraceRequest,
  CreateTraceResponse,
  DeleteTraceResponse
} from '../../types/user-requirements';
import {
  SystemRequirementListResponse,
  SystemRequirementResponse,
  CreateSystemRequirementRequest,
  UpdateSystemRequirementRequest,
  ApproveSystemRequirementRequest,
  SystemRequirementFilters
} from '../../types/system-requirements';
import {
  RiskRecordListResponse,
  RiskRecordResponse,
  CreateRiskRecordRequest,
  UpdateRiskRecordRequest,
  ApproveRiskRecordRequest,
  RiskRecordFilters
} from '../../types/risks';
import {
  GetTestRunsResponse,
  CreateTestRunRequest,
  CreateTestRunResponse,
  GetTestRunResponse,
  ApproveTestRunRequest,
  ApproveTestRunResponse,
  GetTestCasesResponse,
  ExecuteTestCaseResponse,
  UpdateStepResultRequest,
  UpdateStepResultResponse,
  UploadEvidenceResponse,
  GetRequirementTestCoverageResponse,
  GetTestCaseResultsResponse,
  CreateTestCaseRequest,
  CreateTestCaseResponse,
  UpdateTestCaseRequest,
  UpdateTestCaseResponse,
  ApproveTestCaseRequest,
  ApproveTestCaseResponse
} from '../../types/test-runs';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit & { skipAuthRedirect?: boolean } = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('token');
  
  const config: RequestInit = {
    credentials: 'include', // Include cookies in requests
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }), // Keep for backward compatibility
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  
  // Handle unauthorized
  if (response.status === 401) {
    // If skipAuthRedirect is true, just throw the error without redirecting
    if (options.skipAuthRedirect) {
      let errorData: { error?: string | { message?: string } };
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: 'Unauthorized' };
      }
      // Extract message from nested error object if present
      const errorMessage = typeof errorData.error === 'object' && errorData.error?.message
        ? errorData.error.message
        : (typeof errorData.error === 'string' ? errorData.error : 'Unauthorized');
      throw new ApiError(401, errorMessage, errorData);
    }
    
    // This is a real auth failure - redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new ApiError(401, 'Unauthorized');
  }
  
  if (!response.ok) {
    let errorData: { error?: string | { message?: string } };
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    // Extract message from nested error object if present
    const errorMessage = typeof errorData.error === 'object' && errorData.error?.message
      ? errorData.error.message
      : (typeof errorData.error === 'string' ? errorData.error : `HTTP ${response.status}: ${response.statusText}`);
    throw new ApiError(response.status, errorMessage, errorData);
  }

  return response.json();
}

export const userRequirementApi = {
  // List user requirements with filtering and pagination
  list: async (filters: UserRequirementFilters = {}): Promise<UserRequirementListResponse> => {
    const params = new URLSearchParams();
    
    if (filters.status) {params.append('status', filters.status);}
    if (filters.sort) {params.append('sort', filters.sort);}
    if (filters.order) {params.append('order', filters.order);}
    if (filters.page) {params.append('page', filters.page.toString());}
    if (filters.limit) {params.append('limit', filters.limit.toString());}
    if (filters.search) {params.append('search', filters.search);}

    const queryString = params.toString();
    const endpoint = `/user-requirements${queryString ? `?${queryString}` : ''}`;
    
    return fetchApi<UserRequirementListResponse>(endpoint);
  },

  // Get single user requirement by ID
  get: async (id: string): Promise<UserRequirementResponse> => {
    return fetchApi<UserRequirementResponse>(`/user-requirements/${id}`);
  },

  // Create new user requirement
  create: async (data: CreateUserRequirementRequest): Promise<UserRequirementResponse> => {
    return fetchApi<UserRequirementResponse>('/user-requirements', {
      method: 'POST',
      body: JSON.stringify(data),
      // Skip auth redirect when password is provided (for password validation errors)
      skipAuthRedirect: !!data.password
    });
  },

  // Update existing user requirement
  update: async (id: string, data: UpdateUserRequirementRequest): Promise<UserRequirementResponse> => {
    return fetchApi<UserRequirementResponse>(`/user-requirements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      // Skip auth redirect when password is provided (for password validation errors)
      skipAuthRedirect: !!data.password
    });
  },

  // Approve user requirement
  approve: async (id: string, data: ApproveUserRequirementRequest): Promise<UserRequirementResponse> => {
    return fetchApi<UserRequirementResponse>(`/user-requirements/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
      // Always skip auth redirect for approve (password validation)
      skipAuthRedirect: true
    });
  },

  // Delete user requirement (soft delete)
  delete: async (id: string, password?: string): Promise<{ success: boolean; message: string }> => {
    return fetchApi(`/user-requirements/${id}`, {
      method: 'DELETE',
      body: password ? JSON.stringify({ password }) : undefined,
      // Skip auth redirect when password is provided (for password validation errors)
      skipAuthRedirect: !!password
    });
  },

  // Get downstream traces
  getDownstreamTraces: async (id: string): Promise<DownstreamTracesResponse> => {
    return fetchApi<DownstreamTracesResponse>(`/user-requirements/${id}/downstream-traces`);
  },

};

export const systemRequirementApi = {
  // List system requirements with filtering and pagination
  list: async (filters: SystemRequirementFilters = {}): Promise<SystemRequirementListResponse> => {
    const params = new URLSearchParams();
    
    if (filters.status) {params.append('status', filters.status);}
    if (filters.sort) {params.append('sort', filters.sort);}
    if (filters.order) {params.append('order', filters.order);}
    if (filters.page) {params.append('page', filters.page.toString());}
    if (filters.limit) {params.append('limit', filters.limit.toString());}
    if (filters.search) {params.append('search', filters.search);}

    const queryString = params.toString();
    const endpoint = `/system-requirements${queryString ? `?${queryString}` : ''}`;
    
    return fetchApi<SystemRequirementListResponse>(endpoint);
  },

  // Get single system requirement by ID
  get: async (id: string): Promise<SystemRequirementResponse> => {
    return fetchApi<SystemRequirementResponse>(`/system-requirements/${id}`);
  },

  // Create new system requirement
  create: async (data: CreateSystemRequirementRequest): Promise<SystemRequirementResponse> => {
    return fetchApi<SystemRequirementResponse>('/system-requirements', {
      method: 'POST',
      body: JSON.stringify(data),
      // Skip auth redirect when password is provided (for password validation errors)
      skipAuthRedirect: !!data.password
    });
  },

  // Update existing system requirement
  update: async (id: string, data: UpdateSystemRequirementRequest): Promise<SystemRequirementResponse> => {
    return fetchApi<SystemRequirementResponse>(`/system-requirements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      // Skip auth redirect when password is provided (for password validation errors)
      skipAuthRedirect: !!data.password
    });
  },

  // Approve system requirement
  approve: async (id: string, data: ApproveSystemRequirementRequest): Promise<SystemRequirementResponse> => {
    return fetchApi<SystemRequirementResponse>(`/system-requirements/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
      // Always skip auth redirect for approve (password validation)
      skipAuthRedirect: true
    });
  },

  // Delete system requirement (soft delete)
  delete: async (id: string, password?: string): Promise<{ success: boolean; message: string }> => {
    return fetchApi(`/system-requirements/${id}`, {
      method: 'DELETE',
      body: password ? JSON.stringify({ password }) : undefined,
      // Skip auth redirect when password is provided (for password validation errors)
      skipAuthRedirect: !!password
    });
  },

};

// New traces API for many-to-many relationships
export const tracesApi = {
  // Get all traces in the system
  getAllTraces: async (): Promise<{ traces: unknown[] }> => {
    return fetchApi<{ traces: unknown[] }>('/traces');
  },

  // Get all traces for a requirement (upstream and downstream)
  getRequirementTraces: async (requirementId: string): Promise<RequirementTracesResponse> => {
    return fetchApi<RequirementTracesResponse>(`/requirements/${requirementId}/traces`);
  },

  // Create a new trace relationship
  createTrace: async (data: CreateTraceRequest): Promise<CreateTraceResponse> => {
    return fetchApi<CreateTraceResponse>('/traces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Delete a trace relationship
  deleteTrace: async (fromId: string, toId: string): Promise<DeleteTraceResponse> => {
    return fetchApi<DeleteTraceResponse>(`/traces/${fromId}/${toId}`, {
      method: 'DELETE',
    });
  },
};

// Test Run and Test Case API
export const testRunApi = {
  // List test runs
  listTestRuns: async (filters: { status?: string; creator?: string; from?: string; to?: string; page?: number; limit?: number; sort?: string; order?: string; search?: string } = {}): Promise<GetTestRunsResponse> => {
    const params = new URLSearchParams();
    if (filters.status) {params.append('status', filters.status);}
    if (filters.creator) {params.append('creator', filters.creator);}
    if (filters.from) {params.append('from', filters.from);}
    if (filters.to) {params.append('to', filters.to);}
    if (filters.page) {params.append('page', filters.page.toString());}
    if (filters.limit) {params.append('limit', filters.limit.toString());}
    if (filters.sort) {params.append('sort', filters.sort);}
    if (filters.order) {params.append('order', filters.order);}
    if (filters.search) {params.append('search', filters.search);}

    const queryString = params.toString();
    return fetchApi<GetTestRunsResponse>(`/test-runs${queryString ? `?${queryString}` : ''}`);
  },

  // Create test run
  createTestRun: async (data: CreateTestRunRequest): Promise<CreateTestRunResponse> => {
    return fetchApi<CreateTestRunResponse>('/test-runs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get test run details
  getTestRun: async (runId: string): Promise<GetTestRunResponse> => {
    return fetchApi<GetTestRunResponse>(`/test-runs/${runId}`);
  },

  // Approve test run
  approveTestRun: async (runId: string, data: ApproveTestRunRequest): Promise<ApproveTestRunResponse> => {
    return fetchApi<ApproveTestRunResponse>(`/test-runs/${runId}/approve`, {
      method: 'PUT',
      body: JSON.stringify(data),
      skipAuthRedirect: true
    });
  },

  // List test cases with filters
  listTestCases: async (filters: {
    status?: string;
    search?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<GetTestCasesResponse> => {
    const params = new URLSearchParams();
    if (filters.status) {params.append('status', filters.status);}
    if (filters.search) {params.append('search', filters.search);}
    if (filters.sort) {params.append('sort', filters.sort);}
    if (filters.order) {params.append('order', filters.order);}
    if (filters.page) {params.append('page', filters.page.toString());}
    if (filters.limit) {params.append('limit', filters.limit.toString());}

    const queryString = params.toString();
    return fetchApi<GetTestCasesResponse>(`/test-cases${queryString ? `?${queryString}` : ''}`);
  },

  // Create test case
  createTestCase: async (data: CreateTestCaseRequest): Promise<CreateTestCaseResponse> => {
    return fetchApi<CreateTestCaseResponse>('/test-cases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update test case
  updateTestCase: async (testCaseId: string, data: UpdateTestCaseRequest): Promise<UpdateTestCaseResponse> => {
    return fetchApi<UpdateTestCaseResponse>(`/test-cases/${testCaseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      // Skip auth redirect when password is provided (for password validation errors)
      skipAuthRedirect: !!data.password
    });
  },

  // Approve test case
  approveTestCase: async (testCaseId: string, data: ApproveTestCaseRequest): Promise<ApproveTestCaseResponse> => {
    return fetchApi<ApproveTestCaseResponse>(`/test-cases/${testCaseId}/approve`, {
      method: 'PUT',
      body: JSON.stringify(data),
      skipAuthRedirect: true
    });
  },

  // Get test case results
  getTestCaseResults: async (testCaseId: string): Promise<GetTestCaseResultsResponse> => {
    return fetchApi<GetTestCaseResultsResponse>(`/test-cases/${testCaseId}/results`);
  },

  // Execute test case
  executeTestCase: async (runId: string, testCaseId: string): Promise<ExecuteTestCaseResponse> => {
    return fetchApi<ExecuteTestCaseResponse>(`/test-runs/${runId}/test-cases/${testCaseId}/execute`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  // Update step result
  updateStepResult: async (runId: string, testCaseId: string, stepNumber: number, data: UpdateStepResultRequest): Promise<UpdateStepResultResponse> => {
    return fetchApi<UpdateStepResultResponse>(`/test-runs/${runId}/test-cases/${testCaseId}/steps/${stepNumber}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Upload evidence
  uploadEvidence: async (runId: string, testCaseId: string, stepNumber: number, file: File): Promise<UploadEvidenceResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/test-runs/${runId}/test-cases/${testCaseId}/steps/${stepNumber}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(response.status, errorData.error, errorData);
    }

    return response.json();
  },

  // Download evidence
  downloadEvidence: async (fileId: string): Promise<Blob> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/evidence/${fileId}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to download evidence');
    }

    return response.blob();
  },

  // Get requirement test coverage
  getRequirementTestCoverage: async (reqId: string): Promise<GetRequirementTestCoverageResponse> => {
    return fetchApi<GetRequirementTestCoverageResponse>(`/requirements/${reqId}/test-coverage`);
  },

  // Delete test case
  deleteTestCase: async (testCaseId: string, password?: string): Promise<{ success: boolean; message: string }> => {
    return fetchApi<{ success: boolean; message: string }>(`/test-cases/${testCaseId}`, {
      method: 'DELETE',
      body: password ? JSON.stringify({ password }) : undefined,
      // Skip auth redirect when password is provided (for password validation errors)
      skipAuthRedirect: !!password
    });
  },
};

export { ApiError };
export const riskApi = {
  // List risks with filtering and pagination
  list: async (filters: RiskRecordFilters = {}): Promise<RiskRecordListResponse> => {
    const params = new URLSearchParams();
    
    if (filters.status) {params.append('status', filters.status);}
    if (filters.sort) {params.append('sort', filters.sort);}
    if (filters.order) {params.append('order', filters.order);}
    if (filters.page) {params.append('page', filters.page.toString());}
    if (filters.limit) {params.append('limit', filters.limit.toString());}
    if (filters.search) {params.append('search', filters.search);}

    const queryString = params.toString();
    const endpoint = `/risks${queryString ? `?${queryString}` : ''}`;
    
    return fetchApi<RiskRecordListResponse>(endpoint);
  },

  // Get single risk record by ID
  get: async (id: string): Promise<RiskRecordResponse> => {
    return fetchApi<RiskRecordResponse>(`/risks/${id}`);
  },

  // Create new risk record
  create: async (data: CreateRiskRecordRequest): Promise<RiskRecordResponse> => {
    return fetchApi<RiskRecordResponse>('/risks', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuthRedirect: !!data.password
    });
  },

  // Update existing risk record
  update: async (id: string, data: UpdateRiskRecordRequest): Promise<RiskRecordResponse> => {
    return fetchApi<RiskRecordResponse>(`/risks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      skipAuthRedirect: !!data.password
    });
  },

  // Approve risk record
  approve: async (id: string, data: ApproveRiskRecordRequest): Promise<RiskRecordResponse> => {
    return fetchApi<RiskRecordResponse>(`/risks/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuthRedirect: true
    });
  },

  // Delete risk record (soft delete)
  delete: async (id: string, password?: string): Promise<{ success: boolean; message: string }> => {
    return fetchApi(`/risks/${id}`, {
      method: 'DELETE',
      body: password ? JSON.stringify({ password }) : undefined,
      skipAuthRedirect: !!password
    });
  },

  // Get downstream traces (system requirements linked as control measures)
  getDownstreamTraces: async (id: string): Promise<{ success: boolean; traces: unknown[] }> => {
    return fetchApi<{ success: boolean; traces: unknown[] }>(`/risks/${id}/downstream-traces`);
  },
};

export default { userRequirementApi, systemRequirementApi, riskApi, tracesApi, testRunApi };