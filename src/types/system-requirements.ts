import { RequirementTrace, TraceRelationship } from './traces';

export interface SystemRequirement {
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

// Re-export for backward compatibility
export type { TraceRelationship };

export interface SystemRequirementListResponse {
  success: boolean;
  data: SystemRequirement[];
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

export interface SystemRequirementResponse {
  success: boolean;
  requirement: SystemRequirement;
}

export interface CreateSystemRequirementRequest {
  title: string;
  description: string;
  status?: 'approved';
  password?: string;
  approvalNotes?: string;
}

export interface UpdateSystemRequirementRequest {
  title?: string;
  description?: string;
  password?: string;
  status?: 'approved';
  approvalNotes?: string;
}

export interface ApproveSystemRequirementRequest {
  approvalNotes?: string;
  password: string;
}

export interface SystemRequirementFilters {
  status?: 'draft' | 'approved';
  sort?: 'lastModified' | 'createdAt' | 'approvedAt';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string;
}

