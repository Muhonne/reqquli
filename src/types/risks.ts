import { RequirementTrace } from './traces';

export interface RiskRecord {
  id: string;
  title: string;
  description: string;
  hazard: string;
  harm: string;
  foreseeableSequence?: string;
  severity: number; // 1-5
  probabilityP1: number; // 1-5
  probabilityP2: number; // 1-5
  pTotalCalculationMethod: string;
  pTotal: number; // 1-5, calculated from P1 and P2
  residualRiskScore?: string; // Format: "{severity}{pTotal}"
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

export interface ControlMeasure {
  id: string;
  riskRecordId: string;
  description: string;
  controlType: 'design' | 'protective' | 'information';
  effectiveness?: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
}

export interface RiskAcceptabilityMatrix {
  id: string;
  severity: number; // 1-5
  pTotal: number; // 1-5
  acceptability: 'acceptable' | 'unacceptable';
  createdAt: string;
  updatedAt?: string;
}

export interface RiskRecordListResponse {
  success: boolean;
  data: RiskRecord[];
  meta?: {
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
}

export interface RiskRecordResponse {
  success: boolean;
  requirement: RiskRecord;
}

export interface CreateRiskRecordRequest {
  title: string;
  description: string;
  hazard: string;
  harm: string;
  foreseeableSequence?: string;
  severity: number;
  probabilityP1: number;
  probabilityP2: number;
  pTotalCalculationMethod: string;
  status?: 'draft' | 'approved';
  password?: string;
  approvalNotes?: string;
}

export interface UpdateRiskRecordRequest {
  title?: string;
  description?: string;
  hazard?: string;
  harm?: string;
  foreseeableSequence?: string;
  severity?: number;
  probabilityP1?: number;
  probabilityP2?: number;
  pTotalCalculationMethod?: string;
  password?: string;
  status?: 'draft' | 'approved';
  approvalNotes?: string;
}

export interface ApproveRiskRecordRequest {
  approvalNotes?: string;
  password: string;
}

export interface RiskRecordFilters {
  status?: 'draft' | 'approved';
  sort?: 'id' | 'title' | 'createdAt' | 'lastModified' | 'residualRiskScore';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateControlMeasureRequest {
  description: string;
  controlType: 'design' | 'protective' | 'information';
  effectiveness?: string;
}

export interface UpdateControlMeasureRequest {
  description?: string;
  controlType?: 'design' | 'protective' | 'information';
  effectiveness?: string;
}

export interface ControlMeasureResponse {
  success: boolean;
  controlMeasure: ControlMeasure;
}

export interface RiskAcceptabilityMatrixResponse {
  success: boolean;
  matrix: RiskAcceptabilityMatrix[];
}

