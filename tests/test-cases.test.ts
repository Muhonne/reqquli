import axios from 'axios';
import { closePool } from '../src/server/config/database';

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('Test Case Management API', () => {
  let authToken: string;
  let testCaseId: string;
  let testRunId: string;

  beforeAll(async () => {
    // Login to get token
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@reqquli.com',
      password: 'salasana!123'
    });
    authToken = response.data.token;
  });

  describe('POST /api/test-cases', () => {
    it('should create a new test case', async () => {
      const response = await axios.post(
        `${API_URL}/api/test-cases`,
        {
          title: 'Test Case ' + Date.now(),
          description: 'This test case verifies the user login functionality',
          steps: [
            {
              action: 'Navigate to login page',
              expectedResult: 'Login page is displayed'
            },
            {
              action: 'Enter valid credentials',
              expectedResult: 'Credentials are accepted'
            },
            {
              action: 'Click login button',
              expectedResult: 'User is logged in and redirected to dashboard'
            }
          ]
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.testCase).toBeDefined();
      expect(response.data.testCase.status).toBe('draft');

      testCaseId = response.data.testCase.id;
    });

    it('should reject test case without title', async () => {
      try {
        await axios.post(
          `${API_URL}/api/test-cases`,
          {
            description: 'Missing title',
            steps: []
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have rejected missing title');
      } catch (error: any) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.error.message).toContain('required');
      }
    });

    it('should reject duplicate test case titles', async () => {
      const title = 'Unique TC ' + Date.now() + Math.random();

      try {
        // Create first
        await axios.post(
          `${API_URL}/api/test-cases`,
          {
            title,
            description: 'First test case',
            steps: []
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
      } catch (error: any) {
        console.error('First create failed:', error.response?.data);
        throw error;
      }

      // Try duplicate
      try {
        await axios.post(
          `${API_URL}/api/test-cases`,
          {
            title,
            description: 'Duplicate test case',
          steps: []
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have rejected duplicate title');
      } catch (error: any) {
        expect(error.response.status).toBe(409);
        expect(error.response.data.error.message).toContain('exists');
      }
    });
  });

  describe('GET /api/test-cases/:id', () => {
    it('should fetch single test case', async () => {
      const response = await axios.get(
        `${API_URL}/api/test-cases/${testCaseId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.testCase).toBeDefined();
      expect(response.data.testCase.id).toBe(testCaseId);
      expect(response.data.steps).toBeDefined();
      expect(Array.isArray(response.data.steps)).toBe(true);
    });

    it('should return 404 for non-existent test case', async () => {
      try {
        await axios.get(
          `${API_URL}/api/test-cases/TC-999999`,
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have returned 404');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error.message).toContain('not found');
      }
    });

    it('should require authentication', async () => {
      try {
        await axios.get(`${API_URL}/api/test-cases/${testCaseId}`);
        fail('Should have required authentication');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('PATCH /api/test-cases/:testCaseId', () => {
    it('should update test case', async () => {
      const response = await axios.patch(
        `${API_URL}/api/test-cases/${testCaseId}`,
        {
          description: 'Updated test case description with more details',
          steps: [
            {
              action: 'Updated step 1',
              expectedResult: 'Updated result 1'
            }
          ]
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.testCase.description).toContain('Updated');
    });

    it('should reset approved test case to draft on edit', async () => {
      // Create and approve a test case
      const createRes = await axios.post(
        `${API_URL}/api/test-cases`,
        {
          title: 'TC to Approve ' + Date.now(),
          description: 'Will be approved then edited',
          steps: []
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const tcId = createRes.data.testCase.id;

      // Approve it
      await axios.put(
        `${API_URL}/api/test-cases/${tcId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Edit it
      const editRes = await axios.patch(
        `${API_URL}/api/test-cases/${tcId}`,
        {
          description: 'Edited after approval',
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(editRes.status).toBe(200);
      expect(editRes.data.testCase.status).toBe('draft');
    });
  });

  describe('PUT /api/test-cases/:testCaseId/approve', () => {
    it('should approve test case', async () => {
      // Create test case to approve
      const createRes = await axios.post(
        `${API_URL}/api/test-cases`,
        {
          title: 'TC Approval Test ' + Date.now(),
          description: 'Test case for approval workflow',
          steps: []
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const tcId = createRes.data.testCase.id;

      const response = await axios.put(
        `${API_URL}/api/test-cases/${tcId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.testCase.status).toBe('approved');
      expect(response.data.testCase.approvedBy).toBeDefined();
      expect(response.data.testCase.approvedAt).toBeDefined();
    });

    it('should reject approval without password', async () => {
      try {
        await axios.put(
          `${API_URL}/api/test-cases/${testCaseId}/approve`,
          {},
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have required password');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error.message).toContain('Password');
      }
    });

    it('should reject approval with wrong password', async () => {
      try {
        await axios.put(
          `${API_URL}/api/test-cases/${testCaseId}/approve`,
          {
            password: 'wrongpassword'
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have rejected wrong password');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error.message).toContain('password');
      }
    });
  });

  describe('DELETE /api/test-cases/:testCaseId', () => {
    it('should delete test case', async () => {
      // Create test case to delete
      const createRes = await axios.post(
        `${API_URL}/api/test-cases`,
        {
          title: 'TC to Delete ' + Date.now(),
          description: 'Will be deleted',
          steps: []
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const tcId = createRes.data.testCase.id;

      const response = await axios.delete(
        `${API_URL}/api/test-cases/${tcId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      // Verify it's gone
      try {
        await axios.get(
          `${API_URL}/api/test-cases/${tcId}`,
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have been deleted');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });

    it('should handle deleting non-existent test case', async () => {
      try {
        await axios.delete(
          `${API_URL}/api/test-cases/TC-999999`,
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have returned error');
      } catch (error: any) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('GET /api/test-cases/:id/traces', () => {
    it('should fetch test case traces', async () => {
      const response = await axios.get(
        `${API_URL}/api/test-cases/TC-1/traces`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('upstreamTraces');
      expect(response.data).toHaveProperty('downstreamTraces');
      expect(Array.isArray(response.data.upstreamTraces)).toBe(true);
      expect(Array.isArray(response.data.downstreamTraces)).toBe(true);
    });

    it('should return empty traces for unconnected test case', async () => {
      // Create isolated test case
      const createRes = await axios.post(
        `${API_URL}/api/test-cases`,
        {
          title: 'Isolated TC ' + Date.now(),
          description: 'No traces',
          steps: []
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const tcId = createRes.data.testCase.id;

      const response = await axios.get(
        `${API_URL}/api/test-cases/${tcId}/traces`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.upstreamTraces).toEqual([]);
      expect(response.data.downstreamTraces).toEqual([]);
    });
  });

  describe('PUT /api/test-runs/:runId/approve', () => {
    beforeAll(async () => {
      // Create a test run for approval testing
      const runResponse = await axios.post(
        `${API_URL}/api/test-runs`,
        {
          name: 'Test Run for Approval ' + Date.now(),
          description: 'Testing approval workflow',
          testCaseIds: ['TC-1', 'TC-2']
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      testRunId = runResponse.data.testRun.id;
    });

    it('should approve test run', async () => {
      // First, we need to execute the test cases to complete the test run
      // Execute TC-1
      await axios.post(
        `${API_URL}/api/test-runs/${testRunId}/test-cases/TC-1/execute`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Update step results for TC-1

      // Get the steps for TC-1
      const tc1Response = await axios.get(
        `${API_URL}/api/test-cases/TC-1`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Update each step result
      for (const step of tc1Response.data.steps) {
        await axios.put(
          `${API_URL}/api/test-runs/${testRunId}/test-cases/TC-1/steps/${step.step_number}`,
          {
            status: 'pass',
            actualResult: 'Test passed'
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
      }

      // Execute TC-2
      await axios.post(
        `${API_URL}/api/test-runs/${testRunId}/test-cases/TC-2/execute`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Get the steps for TC-2
      const tc2Response = await axios.get(
        `${API_URL}/api/test-cases/TC-2`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Update each step result for TC-2
      for (const step of tc2Response.data.steps) {
        await axios.put(
          `${API_URL}/api/test-runs/${testRunId}/test-cases/TC-2/steps/${step.step_number}`,
          {
            status: 'pass',
            actualResult: 'Test passed'
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
      }

      // Now the test run should be complete and we can approve it
      const response = await axios.put(
        `${API_URL}/api/test-runs/${testRunId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.testRun).toBeDefined();
      expect(response.data.testRun.approvedAt).toBeDefined();
      expect(response.data.testRun.approvedBy).toBeDefined();
    });

    it('should reject approval without password', async () => {
      // Create another test run
      const runRes = await axios.post(
        `${API_URL}/api/test-runs`,
        {
          name: 'Another Test Run ' + Date.now(),
          description: 'Test',
          testCaseIds: ['TC-1']
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const runId = runRes.data.testRun.id;

      try {
        await axios.put(
          `${API_URL}/api/test-runs/${runId}/approve`,
          {},
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have required password');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error.message).toContain('Password');
      }
    });
  });

  describe('PUT /api/test-runs/:runId/test-cases/:testCaseId/steps/:stepNumber', () => {
    let runId: string;
    let caseId: string;

    beforeAll(async () => {
      // Create a test run and start execution
      const runRes = await axios.post(
        `${API_URL}/api/test-runs`,
        {
          name: 'Test Run for Step Update ' + Date.now(),
          description: 'Testing step updates',
          testCaseIds: ['TC-1']
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      runId = runRes.data.testRun.id;
      caseId = 'TC-1';

      // Start execution
      await axios.post(
        `${API_URL}/api/test-runs/${runId}/test-cases/${caseId}/execute`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
    });

    it('should update test step result', async () => {
      const response = await axios.put(
        `${API_URL}/api/test-runs/${runId}/test-cases/${caseId}/steps/1`,
        {
          actualResult: 'Login page displayed successfully',
          status: 'pass'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.stepResult).toBeDefined();
      expect(response.data.stepResult.status).toBe('pass');
    });

    it('should reject invalid step status', async () => {
      try {
        await axios.put(
          `${API_URL}/api/test-runs/${runId}/test-cases/${caseId}/steps/2`,
          {
            actualResult: 'Test result',
            status: 'invalid-status'
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have rejected invalid status');
      } catch (error: any) {
        expect(error.response.status).toBe(422);
        expect(error.response.data.error.message).toContain('Invalid status');
      }
    });
  });

  describe('GET /api/requirements/:reqId/test-coverage', () => {
    it('should fetch test coverage for system requirement', async () => {
      const response = await axios.get(
        `${API_URL}/api/requirements/SR-1/test-coverage`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('requirementId', 'SR-1');
      expect(response.data).toHaveProperty('testCases');
      expect(response.data).toHaveProperty('coverageStats');
      expect(Array.isArray(response.data.testCases)).toBe(true);
    });

    it('should handle requirement with no test coverage', async () => {
      // Create a system requirement with no tests
      const srRes = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: 'SR No Coverage ' + Date.now(),
          description: 'No test coverage'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const srId = srRes.data.requirement.id;

      const response = await axios.get(
        `${API_URL}/api/requirements/${srId}/test-coverage`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.testCases).toEqual([]);
      expect(response.data.coverageStats.totalTests).toBe(0);
      expect(response.data.coverageStats.passedTests).toBe(0);
    });
  });

  describe('GET /api/test-cases/:testCaseId/results', () => {
    it('should fetch all results for a test case', async () => {
      const response = await axios.get(
        `${API_URL}/api/test-cases/TC-1/results`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('testCaseId', 'TC-1');
      expect(response.data).toHaveProperty('results');
      expect(Array.isArray(response.data.results)).toBe(true);

      if (response.data.results.length > 0) {
        const result = response.data.results[0];
        expect(result).toHaveProperty('testRunId');
        expect(result).toHaveProperty('testRunName');
        expect(result).toHaveProperty('result');
        expect(result).toHaveProperty('executedAt');
      }
    });

    it('should handle test case with no results', async () => {
      // Create a test case that hasn't been executed
      const createRes = await axios.post(
        `${API_URL}/api/test-cases`,
        {
          title: 'TC Never Executed ' + Date.now(),
          description: 'Never been run',
          steps: []
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const tcId = createRes.data.testCase.id;

      const response = await axios.get(
        `${API_URL}/api/test-cases/${tcId}/results`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.results).toEqual([]);
    });
  });

  afterAll(async () => {
    await closePool();
  });
});