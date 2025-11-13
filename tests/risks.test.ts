import axios from 'axios';
import { closePool } from '../src/server/config/database';

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('Risks API', () => {
  let authToken: string;
  let testRiskId: string;

  beforeAll(async () => {
    // Login to get token
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@reqquli.com',
      password: 'salasana!123'
    });
    authToken = response.data.token;
  });

  describe('POST /api/risks', () => {
    it('should create new risk record', async () => {
      const response = await axios.post(
        `${API_URL}/api/risks`,
        {
          title: 'Test Risk ' + Date.now(),
          description: 'This is a test risk record with sufficient description length.',
          hazard: 'Electrical shock from exposed wiring',
          harm: 'Severe injury or death',
          severity: 4,
          probabilityP1: 2,
          probabilityP2: 3,
          pTotalCalculationMethod: 'P_total = max(P₁, P₂) = max(2, 3) = 3'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.requirement).toBeDefined();
      expect(response.data.requirement.status).toBe('draft');
      expect(response.data.requirement.revision).toBe(0);
      expect(response.data.requirement.severity).toBe(4);
      expect(response.data.requirement.probabilityP1).toBe(2);
      expect(response.data.requirement.probabilityP2).toBe(3);
      expect(response.data.requirement.pTotal).toBeDefined();
      
      testRiskId = response.data.requirement.id;
    });

    it('should reject duplicate titles', async () => {
      const title = 'Unique Risk Test ' + Date.now();
      
      // Create first
      await axios.post(
        `${API_URL}/api/risks`,
        {
          title,
          description: 'First risk with this title',
          hazard: 'Test hazard',
          harm: 'Test harm',
          severity: 1,
          probabilityP1: 1,
          probabilityP2: 1,
          pTotalCalculationMethod: 'P_total = 1'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Try duplicate
      try {
        await axios.post(
          `${API_URL}/api/risks`,
          {
            title,
            description: 'Second risk with same title',
            hazard: 'Test hazard 2',
            harm: 'Test harm 2',
            severity: 2,
            probabilityP1: 2,
            probabilityP2: 2,
            pTotalCalculationMethod: 'P_total = 2'
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have rejected duplicate title');
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
          expect(error.response.status).toBe(409);
          expect(error.response.data.error.message).toContain('already exists');
        } else {
          fail('Expected axios error');
        }
      }
    });

    it('should validate required fields', async () => {
      try {
        await axios.post(
          `${API_URL}/api/risks`,
          {
            title: 'Incomplete Risk',
            // Missing required fields
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have rejected missing required fields');
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
          expect(error.response.status).toBe(422);
        } else {
          fail('Expected axios error');
        }
      }
    });

    it('should validate severity range (1-5)', async () => {
      try {
        await axios.post(
          `${API_URL}/api/risks`,
          {
            title: 'Invalid Severity Risk',
            description: 'Test description',
            hazard: 'Test hazard',
            harm: 'Test harm',
            severity: 6, // Invalid
            probabilityP1: 1,
            probabilityP2: 1,
            pTotalCalculationMethod: 'P_total = 1'
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have rejected invalid severity');
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
          expect(error.response.status).toBe(422);
        } else {
          fail('Expected axios error');
        }
      }
    });

    it('should validate probability ranges (1-5)', async () => {
      try {
        await axios.post(
          `${API_URL}/api/risks`,
          {
            title: 'Invalid Probability Risk',
            description: 'Test description',
            hazard: 'Test hazard',
            harm: 'Test harm',
            severity: 1,
            probabilityP1: 0, // Invalid
            probabilityP2: 1,
            pTotalCalculationMethod: 'P_total = 1'
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have rejected invalid probability');
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
          expect(error.response.status).toBe(422);
        } else {
          fail('Expected axios error');
        }
      }
    });

    it('should create risk with optional foreseeableSequence', async () => {
      const response = await axios.post(
        `${API_URL}/api/risks`,
        {
          title: 'Risk with Sequence ' + Date.now(),
          description: 'Test description',
          hazard: 'Test hazard',
          harm: 'Test harm',
          foreseeableSequence: 'Step 1: Event occurs, Step 2: Harm results',
          severity: 3,
          probabilityP1: 2,
          probabilityP2: 2,
          pTotalCalculationMethod: 'P_total = max(P₁, P₂)'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.requirement.foreseeableSequence).toBe('Step 1: Event occurs, Step 2: Harm results');
    });
  });

  describe('GET /api/risks', () => {
    beforeAll(async () => {
      // Create test data for sorting tests
      const testData = [
        {
          title: 'Alpha Risk',
          description: 'First risk',
          hazard: 'Hazard A',
          harm: 'Harm A',
          severity: 1,
          probabilityP1: 1,
          probabilityP2: 1,
          pTotalCalculationMethod: 'P_total = 1'
        },
        {
          title: 'Beta Risk',
          description: 'Second risk',
          hazard: 'Hazard B',
          harm: 'Harm B',
          severity: 2,
          probabilityP1: 2,
          probabilityP2: 2,
          pTotalCalculationMethod: 'P_total = 2'
        },
        {
          title: 'Gamma Risk',
          description: 'Third risk',
          hazard: 'Hazard C',
          harm: 'Harm C',
          severity: 3,
          probabilityP1: 3,
          probabilityP2: 3,
          pTotalCalculationMethod: 'P_total = 3'
        }
      ];

      for (const data of testData) {
        await axios.post(
          `${API_URL}/api/risks`,
          { ...data, title: data.title + ' ' + Date.now() },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      }
    });

    it('should list risks', async () => {
      const response = await axios.get(
        `${API_URL}/api/risks`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.meta.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      const response = await axios.get(
        `${API_URL}/api/risks?status=draft`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      response.data.data.forEach((risk: { status: string }) => {
        expect(risk.status).toBe('draft');
      });
    });

    it('should sort by id ascending', async () => {
      const response = await axios.get(
        `${API_URL}/api/risks?sort=id&order=asc`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      const ids = response.data.data.map((r: { id: string }) => r.id);
      const sortedIds = [...ids].sort();
      expect(ids).toEqual(sortedIds);
    });

    it('should sort by title ascending', async () => {
      const response = await axios.get(
        `${API_URL}/api/risks?sort=title&order=asc`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      const titles = response.data.data.map((r: { title: string }) => r.title);
      const sortedTitles = [...titles].sort((a, b) => a.localeCompare(b));
      expect(titles).toEqual(sortedTitles);
    });

    it('should sort by residualRiskScore', async () => {
      const response = await axios.get(
        `${API_URL}/api/risks?sort=residualRiskScore&order=desc`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      // Verify response is valid
      expect(response.data.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/risks/:id', () => {
    it('should get risk by id', async () => {
      const response = await axios.get(
        `${API_URL}/api/risks/${testRiskId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.requirement.id).toBe(testRiskId);
      expect(response.data.requirement.title).toBeDefined();
      expect(response.data.requirement.hazard).toBeDefined();
      expect(response.data.requirement.harm).toBeDefined();
    });

    it('should return 404 for non-existent risk', async () => {
      try {
        await axios.get(
          `${API_URL}/api/risks/RISK-99999`,
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have returned 404');
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
          expect(error.response.status).toBe(404);
        } else {
          fail('Expected axios error');
        }
      }
    });
  });

  describe('PATCH /api/risks/:id', () => {
    it('should update draft risk', async () => {
      const response = await axios.patch(
        `${API_URL}/api/risks/${testRiskId}`,
        {
          description: 'Updated description for test risk',
          severity: 5
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.requirement.description).toContain('Updated description');
      expect(response.data.requirement.severity).toBe(5);
    });

    it('should reset approved risk to draft when edited', async () => {
      // First approve a risk
      const createRes = await axios.post(
        `${API_URL}/api/risks`,
        {
          title: 'To Be Approved ' + Date.now(),
          description: 'This risk will be approved then edited',
          hazard: 'Test hazard',
          harm: 'Test harm',
          severity: 2,
          probabilityP1: 2,
          probabilityP2: 2,
          pTotalCalculationMethod: 'P_total = 2'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const riskId = createRes.data.requirement.id;

      // Approve it
      await axios.post(
        `${API_URL}/api/risks/${riskId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Edit approved risk
      const editRes = await axios.patch(
        `${API_URL}/api/risks/${riskId}`,
        {
          description: 'Edited after approval',
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(editRes.status).toBe(200);
      expect(editRes.data.requirement.status).toBe('draft');
      expect(editRes.data.requirement.revision).toBe(1); // Revision stays
    });
  });

  describe('POST /api/risks/:id/approve', () => {
    it('should approve risk with password', async () => {
      // Create risk to approve
      const createRes = await axios.post(
        `${API_URL}/api/risks`,
        {
          title: 'Approval Test ' + Date.now(),
          description: 'This risk is created to test approval workflow',
          hazard: 'Test hazard',
          harm: 'Test harm',
          severity: 3,
          probabilityP1: 2,
          probabilityP2: 3,
          pTotalCalculationMethod: 'P_total = max(P₁, P₂)'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const riskId = createRes.data.requirement.id;

      // Approve with password
      const approveRes = await axios.post(
        `${API_URL}/api/risks/${riskId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(approveRes.status).toBe(200);
      expect(approveRes.data.success).toBe(true);
      expect(approveRes.data.requirement.status).toBe('approved');
      expect(approveRes.data.requirement.revision).toBe(1); // 0 -> 1
    });

    it('should reject approval without password', async () => {
      try {
        await axios.post(
          `${API_URL}/api/risks/${testRiskId}/approve`,
          {},
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have required password');
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
          expect(error.response.status).toBe(400);
          expect(error.response.data.error.message).toContain('Password');
        } else {
          fail('Expected axios error');
        }
      }
    });

    it('should reject approval with wrong password', async () => {
      try {
        await axios.post(
          `${API_URL}/api/risks/${testRiskId}/approve`,
          {
            password: 'wrongpassword'
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have rejected wrong password');
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
          expect(error.response.status).toBe(401);
          expect(error.response.data.error.message).toContain('password');
        } else {
          fail('Expected axios error');
        }
      }
    });
  });

  describe('Revision Management', () => {
    it('should start with revision 0 on creation', async () => {
      const createRes = await axios.post(
        `${API_URL}/api/risks`,
        {
          title: 'Revision Test ' + Date.now(),
          description: 'This risk tests that new risks start with revision 0',
          hazard: 'Test hazard',
          harm: 'Test harm',
          severity: 1,
          probabilityP1: 1,
          probabilityP2: 1,
          pTotalCalculationMethod: 'P_total = 1'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(createRes.data.requirement.revision).toBe(0);
    });

    it('should increment revision on first approval (0 -> 1)', async () => {
      const createRes = await axios.post(
        `${API_URL}/api/risks`,
        {
          title: 'First Approval Test ' + Date.now(),
          description: 'This risk tests that revision increments from 0 to 1 on first approval',
          hazard: 'Test hazard',
          harm: 'Test harm',
          severity: 2,
          probabilityP1: 2,
          probabilityP2: 2,
          pTotalCalculationMethod: 'P_total = 2'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const riskId = createRes.data.requirement.id;
      expect(createRes.data.requirement.revision).toBe(0);

      const approveRes = await axios.post(
        `${API_URL}/api/risks/${riskId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(approveRes.data.requirement.revision).toBe(1);
      expect(approveRes.data.requirement.status).toBe('approved');
    });

    it('should increment revision on re-approval after edit (1 -> 2)', async () => {
      // Create, approve, edit
      const createRes = await axios.post(
        `${API_URL}/api/risks`,
        {
          title: 'Re-approval Test ' + Date.now(),
          description: 'This risk tests that revision increments on re-approval after editing',
          hazard: 'Test hazard',
          harm: 'Test harm',
          severity: 2,
          probabilityP1: 2,
          probabilityP2: 2,
          pTotalCalculationMethod: 'P_total = 2'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const riskId = createRes.data.requirement.id;

      // First approval (0 -> 1)
      await axios.post(
        `${API_URL}/api/risks/${riskId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Edit (resets to draft, revision stays 1)
      await axios.patch(
        `${API_URL}/api/risks/${riskId}`,
        {
          description: 'Edited to test re-approval revision increment',
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Re-approve (1 -> 2)
      const reapproveRes = await axios.post(
        `${API_URL}/api/risks/${riskId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(reapproveRes.data.requirement.revision).toBe(2);
      expect(reapproveRes.data.requirement.status).toBe('approved');
    });
  });

  describe('DELETE /api/risks/:id', () => {
    it('should soft delete risk', async () => {
      // Create risk to delete
      const createRes = await axios.post(
        `${API_URL}/api/risks`,
        {
          title: 'To Delete ' + Date.now(),
          description: 'This risk will be deleted to test soft delete functionality',
          hazard: 'Test hazard',
          harm: 'Test harm',
          severity: 1,
          probabilityP1: 1,
          probabilityP2: 1,
          pTotalCalculationMethod: 'P_total = 1'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const riskId = createRes.data.requirement.id;

      // Delete it
      const deleteRes = await axios.delete(
        `${API_URL}/api/risks/${riskId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: { password: 'salasana!123' }
        }
      );

      expect(deleteRes.status).toBe(200);

      // Verify it's not in list
      const listRes = await axios.get(
        `${API_URL}/api/risks`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      const found = listRes.data.data.find((r: { id: string }) => r.id === riskId);
      expect(found).toBeUndefined();
    });
  });

  afterAll(async () => {
    // Close database pool to prevent open handles
    await closePool();
  });
});

