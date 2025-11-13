// Traceability types - single source of truth for all trace-related interfaces

export interface RequirementTrace {
  id: string;
  title: string;
  status: 'draft' | 'approved';
  type: 'user' | 'system' | 'testcase' | 'testresult' | 'risk';
  isSystemGenerated?: boolean;
  executedAt?: string;
  testRunId?: string;
}

export interface TraceRelationship {
  id: string;
  fromId: string;
  toId: string;
  // Types are computed dynamically from ID prefixes in API responses, not stored in DB
  fromType?: 'user' | 'system' | 'testcase' | 'testresult' | 'risk';
  toType?: 'user' | 'system' | 'testcase' | 'testresult' | 'risk';
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
  isSystemGenerated?: boolean;
  fromTitle?: string;
  fromStatus?: string;
  toTitle?: string;
  toStatus?: string;
}

export interface RequirementTracesResponse {
  success: boolean;
  upstreamTraces: RequirementTrace[];
  downstreamTraces: RequirementTrace[];
}

export interface DownstreamTracesResponse {
  success: boolean;
  downstreamTraces: RequirementTrace[];
}

export interface CreateTraceRequest {
  fromId: string;
  toId: string;
  // Types are determined from ID prefixes on the backend, no need to send them
}

export interface CreateTraceResponse {
  success: boolean;
  trace: TraceRelationship;
}

export interface DeleteTraceResponse {
  success: boolean;
  message: string;
}

export interface GetTracesResponse {
  success: boolean;
  traces: TraceRelationship[];
}