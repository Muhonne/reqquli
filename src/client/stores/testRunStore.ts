import { create } from 'zustand';
import {
  TestRun,
  TestCase,
  TestRunCase,
  TestStep,
  TestStepResult,
  CreateTestRunRequest,
  UpdateStepResultRequest,
  CreateTestCaseRequest,
  UpdateTestCaseRequest,
  TestCaseFilters,
  TestRunFilters,
  TestRunStatus
} from '../../types/test-runs';
import { testRunApi, ApiError } from '../services/api';

interface TestRunState {
  // Data
  testRuns: TestRun[];
  testCases: TestCase[];
  currentTestRun: TestRun | null;
  currentTestRunCases: TestRunCase[];
  currentTestSteps: { [testCaseId: string]: TestStep[] };
  currentStepResults: { [testRunCaseId: string]: TestStepResult[] };

  // Filters and Pagination for Test Cases
  testCaseFilters: TestCaseFilters;
  testCasePagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };

  // Filters and Pagination for Test Runs
  testRunFilters: TestRunFilters;
  testRunPagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };

  // UI State
  loading: boolean;
  error: string | null;
  uploadingEvidence: boolean;
  savingStepResult: boolean;
  unsavedChanges: Set<string>; // Track unsaved step results
}

interface TestRunActions {
  // Test Runs
  fetchTestRuns: (filters?: Partial<TestRunFilters>) => Promise<void>;
  setTestRunFilters: (filters: Partial<TestRunFilters>) => void;
  fetchTestRun: (runId: string) => Promise<void>;
  createTestRun: (data: CreateTestRunRequest) => Promise<TestRun>;
  approveTestRun: (runId: string, password: string) => Promise<void>;

  // Test Cases
  fetchTestCases: (filters?: Partial<TestCaseFilters>) => Promise<void>;
  setTestCaseFilters: (filters: Partial<TestCaseFilters>) => void;
  createTestCase: (data: CreateTestCaseRequest) => Promise<TestCase>;
  updateTestCase: (testCaseId: string, data: UpdateTestCaseRequest) => Promise<TestCase>;
  // Note: approveTestCase is now handled by testCaseApprovalService
  // to ensure proper error encapsulation in PasswordConfirmModal
  fetchTestCaseResults: (testCaseId: string) => Promise<void>;
  deleteTestCase: (testCaseId: string) => Promise<void>;

  // Test Execution
  executeTestCase: (runId: string, testCaseId: string) => Promise<void>;
  updateStepResult: (runId: string, testCaseId: string, stepNumber: number, data: UpdateStepResultRequest) => Promise<void>;
  uploadEvidence: (runId: string, testCaseId: string, stepNumber: number, file: globalThis.File) => Promise<string>;
  downloadEvidence: (fileId: string) => Promise<void>;

  // UI State
  markStepAsUnsaved: (stepKey: string) => void;
  markStepAsSaved: (stepKey: string) => void;
  clearError: () => void;
  resetStore: () => void;
}

type TestRunStore = TestRunState & TestRunActions;

const initialState: TestRunState = {
  testRuns: [],
  testCases: [],
  currentTestRun: null,
  currentTestRunCases: [],
  currentTestSteps: {},
  currentStepResults: {},
  testCaseFilters: {
    sort: 'lastModified' as const,
    order: 'desc' as const
  },
  testCasePagination: {
    page: 1,
    limit: 50,
    total: 0,
    pages: 1
  },
  testRunFilters: {
    sort: 'lastModified' as const,
    order: 'desc' as const
  },
  testRunPagination: {
    page: 1,
    limit: 50,
    total: 0,
    pages: 1
  },
  loading: false,
  error: null,
  uploadingEvidence: false,
  savingStepResult: false,
  unsavedChanges: new Set(),
};

const useTestRunStore = create<TestRunStore>((set, get) => ({
  ...initialState,

  fetchTestRuns: async (filters) => {
    set({ loading: true, error: null });
    try {
      const { testRunFilters, testRunPagination } = get();
      const mergedFilters = { ...testRunFilters, ...filters };

      const response = await testRunApi.listTestRuns({
        ...mergedFilters,
        page: filters?.page || testRunPagination.page,
        limit: testRunPagination.limit
      });

      set({
        testRuns: response.data || [],
        testRunPagination: response.meta?.pagination || response.pagination || {
          page: 1,
          limit: 50,
          total: 0,
          pages: 1
        },
        loading: false
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to fetch test runs';
      set({ error: errorMessage, loading: false });
    }
  },

  setTestRunFilters: (filters) => {
    set({ testRunFilters: { ...get().testRunFilters, ...filters } });
  },

  fetchTestRun: async (runId) => {
    set({ loading: true, error: null });
    try {
      const response = await testRunApi.getTestRun(runId);

      // Deduce test run status from test cases if not approved
      let testRun = response.testRun;
      if (testRun.status !== 'approved' && response.testRunCases) {
        const allComplete = response.testRunCases.every(trc => trc.status === 'complete');
        const anyInProgress = response.testRunCases.some(trc => trc.status === 'in_progress');
        const anyStarted = response.testRunCases.some(trc => trc.status !== 'not_started');

        // Determine status based on test cases
        let deducedStatus: TestRunStatus;
        if (allComplete) {
          deducedStatus = 'complete';
        } else if (anyInProgress || anyStarted) {
          deducedStatus = 'in_progress';
        } else {
          deducedStatus = 'not_started';
        }

        // Calculate overall result
        const hasFailure = response.testRunCases.some(trc => trc.result === 'fail');

        testRun = {
          ...testRun,
          status: deducedStatus,
          overallResult: hasFailure ? 'fail' as const : 'pass' as const
        };
      }

      // Also update the test run in the testRuns list
      const { testRuns } = get();
      const updatedTestRuns = testRuns.map(tr =>
        tr.id === runId ? testRun : tr
      );

      set({
        currentTestRun: testRun,
        currentTestRunCases: response.testRunCases,
        currentTestSteps: response.testSteps || {},
        currentStepResults: response.testStepResults || {},
        testRuns: updatedTestRuns,
        loading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to fetch test run';
      set({ error: errorMessage, loading: false });
    }
  },

  createTestRun: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await testRunApi.createTestRun(data);
      const { testRuns } = get();
      set({
        testRuns: [response.testRun, ...testRuns],
        loading: false
      });
      return response.testRun;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to create test run';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  approveTestRun: async (runId, password) => {
    set({ loading: true, error: null });
    try {
      const response = await testRunApi.approveTestRun(runId, { password });

      // Also update the test run in the testRuns list
      const { testRuns } = get();
      const updatedTestRuns = testRuns.map(tr =>
        tr.id === runId ? response.testRun : tr
      );

      set({
        currentTestRun: response.testRun,
        testRuns: updatedTestRuns,
        loading: false
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to approve test run';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  fetchTestCases: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const { testCaseFilters, testCasePagination } = get();
      const mergedFilters = { ...testCaseFilters, ...filters };

      const response = await testRunApi.listTestCases({
        ...mergedFilters,
        page: filters.page || testCasePagination.page,
        limit: testCasePagination.limit
      });

      // Extract steps from each test case
      const stepsMap: { [key: string]: TestStep[] } = {};
      if (response.data) {
        response.data.forEach((tc: any) => {
          if (tc.steps) {
            stepsMap[tc.id] = tc.steps;
          }
        });
      }

      set({
        testCases: response.data || [],
        currentTestSteps: stepsMap,
        testCasePagination: response.meta?.pagination || response.pagination || {
          page: 1,
          limit: 50,
          total: 0,
          pages: 1
        },
        loading: false
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to fetch test cases';
      set({ error: errorMessage, loading: false });
    }
  },

  setTestCaseFilters: (filters) => {
    set({ testCaseFilters: filters });
  },

  createTestCase: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await testRunApi.createTestCase(data);
      const { testCases, currentTestSteps } = get();

      // Add test steps to currentTestSteps if they exist
      const updatedTestSteps = { ...currentTestSteps };
      if (response.testSteps && response.testSteps.length > 0) {
        // Add missing fields to match TestStep interface
        updatedTestSteps[response.testCase.id] = response.testSteps.map((step: any, index: number) => ({
          id: `${response.testCase.id}-step-${index + 1}`, // Generate temporary ID
          testCaseId: response.testCase.id,
          stepNumber: step.stepNumber,
          action: step.action,
          expectedResult: step.expectedResult
        }));
      }

      set({
        testCases: [response.testCase, ...testCases],
        currentTestSteps: updatedTestSteps,
        loading: false
      });
      return response.testCase;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to create test case';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  updateTestCase: async (testCaseId, data) => {
    set({ loading: true, error: null });
    try {
      const response = await testRunApi.updateTestCase(testCaseId, data);
      const { testCases, currentTestSteps } = get();

      // Update the test case in the list
      const updatedTestCases = testCases.map(tc =>
        tc.id === testCaseId ? response.testCase : tc
      );

      // Update the test steps for this test case
      const updatedSteps = {
        ...currentTestSteps,
        [testCaseId]: response.steps
      };

      set({
        testCases: updatedTestCases,
        currentTestSteps: updatedSteps,
        loading: false
      });

      return response.testCase;
    } catch (error) {
      // Don't set error in state for password operations to avoid double error display
      set({ loading: false });
      throw error;
    }
  },

  // Note: approveTestCase is removed - use testCaseApprovalService instead

  fetchTestCaseResults: async (testCaseId) => {
    set({ loading: true, error: null });
    try {
      await testRunApi.getTestCaseResults(testCaseId);
      // Store results in appropriate state
      set({ loading: false });
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to fetch test case results';
      set({ error: errorMessage, loading: false });
    }
  },

  deleteTestCase: async (testCaseId) => {
    set({ loading: true, error: null });
    try {
      await testRunApi.deleteTestCase(testCaseId);
      const { testCases, currentTestSteps } = get();

      // Remove from testCases array
      const updatedTestCases = testCases.filter(tc => tc.id !== testCaseId);

      // Remove from currentTestSteps
      const updatedTestSteps = { ...currentTestSteps };
      delete updatedTestSteps[testCaseId];

      set({
        testCases: updatedTestCases,
        currentTestSteps: updatedTestSteps,
        loading: false
      });
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to delete test case';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  executeTestCase: async (runId, testCaseId) => {
    set({ loading: true, error: null });
    try {
      const response = await testRunApi.executeTestCase(runId, testCaseId);

      // Update the test run case in state
      const { currentTestRunCases } = get();
      const updatedTestRunCases = currentTestRunCases.map(trc =>
        trc.testCaseId === testCaseId ? response.testRunCase : trc
      );

      // Deduce test run status from test cases
      let updatedTestRun = get().currentTestRun;
      if (updatedTestRun && updatedTestRun.status !== 'approved') {
        const allComplete = updatedTestRunCases.every(trc => trc.status === 'complete');
        const anyInProgress = updatedTestRunCases.some(trc => trc.status === 'in_progress');
        const anyStarted = updatedTestRunCases.some(trc => trc.status !== 'not_started');

        // Determine status based on test cases
        let newStatus: TestRunStatus;
        if (allComplete) {
          newStatus = 'complete';
        } else if (anyInProgress || anyStarted) {
          newStatus = 'in_progress';
        } else {
          newStatus = 'not_started';
        }

        // Calculate overall result
        const hasFailure = updatedTestRunCases.some(trc => trc.result === 'fail');

        updatedTestRun = {
          ...updatedTestRun,
          status: newStatus,
          overallResult: hasFailure ? 'fail' as const : 'pass' as const
        };
      }

      // Update test run in the testRuns list
      const updatedTestRuns = get().testRuns.map(tr =>
        tr.id === runId ? (updatedTestRun || get().currentTestRun || tr) : tr
      );

      set({
        currentTestRunCases: updatedTestRunCases,
        currentTestRun: updatedTestRun,
        testRuns: updatedTestRuns,
        loading: false
      });

      // Clear any existing step results for this test case
      const testRunCaseId = response.testRunCase.id;
      const { currentStepResults } = get();
      delete currentStepResults[testRunCaseId];
      set({ currentStepResults: { ...currentStepResults } });
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to execute test case';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  updateStepResult: async (runId, testCaseId, stepNumber, data) => {
    const stepKey = `${runId}-${testCaseId}-${stepNumber}`;
    set({ savingStepResult: true, error: null });

    try {
      const response = await testRunApi.updateStepResult(runId, testCaseId, stepNumber, data);

      // Update step result in state
      const { currentStepResults, currentTestRunCases, unsavedChanges } = get();
      const testRunCase = currentTestRunCases.find(trc => trc.testCaseId === testCaseId);

      if (testRunCase) {
        const stepResults = currentStepResults[testRunCase.id] || [];
        const updatedResults = stepResults.map(sr =>
          sr.stepNumber === stepNumber ? response.stepResult : sr
        );

        // Add if not exists
        if (!updatedResults.find(sr => sr.stepNumber === stepNumber)) {
          updatedResults.push(response.stepResult);
          updatedResults.sort((a, b) => a.stepNumber - b.stepNumber);
        }

        // Update test run cases with the response
        const updatedTestRunCases = currentTestRunCases.map(trc =>
          trc.id === testRunCase.id ? response.testRunCase : trc
        );

        // Deduce test run status from test cases
        let updatedTestRun = get().currentTestRun;
        if (updatedTestRun && updatedTestRun.status !== 'approved') {
          const allComplete = updatedTestRunCases.every(trc => trc.status === 'complete');
          const anyInProgress = updatedTestRunCases.some(trc => trc.status === 'in_progress');
          const anyStarted = updatedTestRunCases.some(trc => trc.status !== 'not_started');

          // Determine status based on test cases
          let newStatus: TestRunStatus;
          if (allComplete) {
            newStatus = 'complete';
          } else if (anyInProgress || anyStarted) {
            newStatus = 'in_progress';
          } else {
            newStatus = 'not_started';
          }

          // Calculate overall result
          const hasFailure = updatedTestRunCases.some(trc => trc.result === 'fail');

          updatedTestRun = {
            ...updatedTestRun,
            status: newStatus,
            overallResult: hasFailure ? 'fail' as const : 'pass' as const
          };
        }

        // Also update the test run in the testRuns list
        const updatedTestRuns = get().testRuns.map(tr =>
          tr.id === runId ? (updatedTestRun || get().currentTestRun || tr) : tr
        );

        set({
          currentStepResults: {
            ...currentStepResults,
            [testRunCase.id]: [...updatedResults] // Create a new array reference
          },
          currentTestRunCases: updatedTestRunCases,
          currentTestRun: updatedTestRun,
          testRuns: updatedTestRuns,
          savingStepResult: false
        });
      }

      // Remove from unsaved changes
      unsavedChanges.delete(stepKey);
      set({ unsavedChanges: new Set(unsavedChanges) });
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to update step result';
      set({ error: errorMessage, savingStepResult: false });
      throw error;
    }
  },

  uploadEvidence: async (runId, testCaseId, stepNumber, file) => {
    set({ uploadingEvidence: true, error: null });
    try {
      const response = await testRunApi.uploadEvidence(runId, testCaseId, stepNumber, file);
      set({ uploadingEvidence: false });
      return response.evidenceFile.id;
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to upload evidence';
      set({ error: errorMessage, uploadingEvidence: false });
      throw error;
    }
  },

  downloadEvidence: async (fileId) => {
    try {
      const blob = await testRunApi.downloadEvidence(fileId);
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence_${fileId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to download evidence';
      set({ error: errorMessage });
    }
  },

  markStepAsUnsaved: (stepKey) => {
    const { unsavedChanges } = get();
    unsavedChanges.add(stepKey);
    set({ unsavedChanges: new Set(unsavedChanges) });
  },

  markStepAsSaved: (stepKey) => {
    const { unsavedChanges } = get();
    unsavedChanges.delete(stepKey);
    set({ unsavedChanges: new Set(unsavedChanges) });
  },

  clearError: () => set({ error: null }),

  resetStore: () => set(initialState),
}));

export default useTestRunStore;