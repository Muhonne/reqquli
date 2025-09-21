import { RequirementTrace } from './traces';

export interface UserRequirement {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'approved';
  revision: number;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  lastModified?: string;
  modifiedBy?: string;
  modifiedByName?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvalNotes?: string;
  deletedAt?: string;
  upstreamTraces?: RequirementTrace[];
  downstreamTraces?: RequirementTrace[];
}

export interface UserRequirementListResponse {
  success: boolean;
  data: UserRequirement[];
  pagination?: {
    total: number;
    page: number;
    pages: number;
  };
  meta?: {
    pagination: {
      total: number;
      page: number;
      pages: number;
    };
  };
}

export interface UserRequirementResponse {
  success: boolean;
  requirement: UserRequirement;
}

export interface CreateUserRequirementRequest {
  title: string;
  description: string;
  status?: 'approved';
  password?: string;
  approvalNotes?: string;
}

export interface UpdateUserRequirementRequest {
  title?: string;
  description?: string;
  password?: string;
  status?: 'approved';
  approvalNotes?: string;
}

export interface ApproveUserRequirementRequest {
  approvalNotes?: string;
  password: string;
}

export interface UserRequirementFilters {
  status?: 'draft' | 'approved';
  sort?: 'lastModified' | 'createdAt' | 'approvedAt';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string;
}

// Re-export trace types for backward compatibility
export type {
  RequirementTracesResponse,
  DownstreamTracesResponse,
  CreateTraceRequest,
  CreateTraceResponse,
  DeleteTraceResponse,
  TraceRelationship
} from './traces';