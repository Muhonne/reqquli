// Test run types - single source of truth for manual test execution

export type TestRunStatus =
  | "not_started"
  | "in_progress"
  | "complete"
  | "approved";
export type TestCaseStatus = "not_started" | "in_progress" | "complete";
export type TestResultValue = "pass" | "fail" | "pending";
export type StepStatus = "pass" | "fail" | "not_executed";

export interface TestCase {
  id: string;
  title: string;
  description: string;
  status: "draft" | "approved";
  revision: number;
  linkedRequirements?: string[];
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  lastModified?: string;
  modifiedBy?: string;
  modifiedByName?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  deletedAt?: string;
}

export interface TestStep {
  id?: string; // Optional - generated client-side when needed
  stepNumber: number;
  action: string;
  expectedResult: string;
  testCaseId?: string; // Optional - not always provided by API
}

export interface TestRun {
  id: string;
  name: string;
  description: string;
  status: TestRunStatus;
  overallResult: TestResultValue;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
}

export interface TestRunCase {
  id: string;
  testRunId: string;
  testCaseId: string;
  testCase?: TestCase;
  status: TestCaseStatus;
  result: TestResultValue;
  startedAt?: string;
  completedAt?: string;
  executedBy?: string;
  executedByName?: string;
}

export interface TestStepResult {
  id: string;
  testRunCaseId: string;
  stepNumber: number;
  expectedResult: string;
  actualResult?: string;
  status: StepStatus;
  evidenceFileId?: string;
  executedAt?: string;
  executedBy?: string;
  executedByName?: string;
}

export interface EvidenceFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
  checksum: string;
}

// Note: RequirementTestLink is deprecated - using traces table instead
// Links between system requirements and test cases are now handled
// via the unified traces table with from_type='system' and to_type='testcase'

// Filter types
export interface TestCaseFilters {
  status?: 'draft' | 'approved';
  sort?: 'lastModified' | 'createdAt' | 'approvedAt';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string;
}

export interface TestRunFilters {
  status?: TestRunStatus;
  sort?: 'createdAt' | 'lastModified' | 'approvedAt';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string;
}

// API Request/Response types
export interface CreateTestRunRequest {
  name: string;
  description: string;
  testCaseIds: string[];
}

export interface CreateTestRunResponse {
  success: boolean;
  testRun: TestRun;
  testRunCases: TestRunCase[];
}

export interface GetTestRunsResponse {
  success: boolean;
  data: TestRun[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  meta?: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface GetTestRunResponse {
  success: boolean;
  testRun: TestRun;
  testRunCases: TestRunCase[];
  testSteps?: { [testCaseId: string]: TestStep[] };
  testStepResults?: { [testRunCaseId: string]: TestStepResult[] };
}

export interface GetTestCasesResponse {
  success: boolean;
  data: TestCase[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  meta?: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface ExecuteTestCaseRequest {
  // Empty - just triggers reset of test case
}

export interface ExecuteTestCaseResponse {
  success: boolean;
  testRunCase: TestRunCase;
}

export interface UpdateStepResultRequest {
  status: StepStatus;
  actualResult: string;
  evidenceFileId?: string;
}

export interface UpdateStepResultResponse {
  success: boolean;
  stepResult: TestStepResult;
  testRunCase: TestRunCase;
}

export interface UploadEvidenceRequest {
  file: File;
}

export interface UploadEvidenceResponse {
  success: boolean;
  evidenceFile: EvidenceFile;
}

export interface TestResult {
  id: string; // TRES-N format
  testRunId: string;
  testCaseId: string;
  result: 'pass' | 'fail';
  executedBy: string;
  executedByName?: string;
  executedAt: string;
  createdAt: string;
}

export interface ApproveTestRunRequest {
  password: string;
}

export interface ApproveTestRunResponse {
  success: boolean;
  testRun: TestRun;
  message: string;
}

export interface GetRequirementTestCoverageResponse {
  success: boolean;
  testCases: TestCase[];
  latestResults: Array<{
    testCase: TestCase;
    testRun: TestRun;
    result: TestResultValue;
    executedAt?: string;
  }>;
}

export interface GetTestCaseResultsResponse {
  success: boolean;
  testCase: TestCase;
  executions: Array<{
    testRun: TestRun;
    testRunCase: TestRunCase;
    stepResults: TestStepResult[];
  }>;
}

export interface CreateTestCaseRequest {
  title: string;
  description: string;
  steps: Array<{
    action: string;
    expectedResult: string;
  }>;
  linkedRequirements?: string[];
}

export interface CreateTestCaseResponse {
  success: boolean;
  testCase: TestCase;
  testSteps: TestStep[];
}

export interface UpdateTestCaseRequest {
  title: string;
  description: string;
  steps: Array<{
    action: string;
    expectedResult: string;
  }>;
  linkedRequirements?: string[];
  password?: string; // Required if test case is approved
}

export interface UpdateTestCaseResponse {
  success: boolean;
  testCase: TestCase;
  steps: TestStep[];
}

export interface ApproveTestCaseRequest {
  password: string;
}

export interface ApproveTestCaseResponse {
  success: boolean;
  testCase: TestCase;
}
