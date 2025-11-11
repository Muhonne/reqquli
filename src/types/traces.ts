// Traceability types - single source of truth for all trace-related interfaces

export interface RequirementTrace {
  id: string;
  title: string;
  status: 'draft' | 'approved';
  type: 'user' | 'system' | 'testcase' | 'testrun' | 'risk';
}

export interface TraceRelationship {
  id: string;
  fromId: string;
  toId: string;
  fromType: 'user' | 'system' | 'testcase' | 'testrun' | 'risk';
  toType: 'user' | 'system' | 'testcase' | 'testrun' | 'risk';
  createdAt: string;
  createdBy: string;
  createdByName?: string;
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
  fromType: 'user' | 'system' | 'testcase' | 'testrun' | 'risk';
  toType: 'user' | 'system' | 'testcase' | 'testrun' | 'risk';
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