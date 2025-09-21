import axios from 'axios';
import { closePool } from '../src/server/config/database';

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('User Requirements API', () => {
  let authToken: string;
  let testRequirementId: string;

  beforeAll(async () => {
    // Login to get token
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@reqquli.com',
      password: 'salasana!123'
    });
    authToken = response.data.token;
  });

  describe('POST /api/user-requirements', () => {
    it('should create new requirement', async () => {
      const response = await axios.post(
        `${API_URL}/api/user-requirements`,
        {
          title: 'Test Requirement ' + Date.now(),
          description: 'This is a test requirement with sufficient description length to meet the minimum validation requirements.'
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
      
      testRequirementId = response.data.requirement.id;
    });

    it('should reject duplicate titles', async () => {
      const title = 'Unique Test ' + Date.now();
      
      // Create first
      await axios.post(
        `${API_URL}/api/user-requirements`,
        {
          title,
          description: 'This is a test requirement with sufficient description length to meet the minimum validation requirements.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Try duplicate
      try {
        await axios.post(
          `${API_URL}/api/user-requirements`,
          {
            title,
            description: 'Another description that is long enough to meet the minimum validation requirements for testing.'
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have rejected duplicate title');
      } catch (error: any) {
        expect(error.response.status).toBe(409);
        expect(error.response.data.error.message).toContain('already exists');
      }
    });
  });

  describe('GET /api/user-requirements', () => {
    beforeAll(async () => {
      // Create test data for sorting tests
      const testData = [
        { title: 'Alpha Requirement', description: 'First alphabetically sorted requirement for testing sorting functionality with sufficient description.' },
        { title: 'Beta Requirement', description: 'Second alphabetically sorted requirement for testing sorting functionality with sufficient description.' },
        { title: 'Gamma Requirement', description: 'Third alphabetically sorted requirement for testing sorting functionality with sufficient description.' }
      ];

      for (const data of testData) {
        await axios.post(
          `${API_URL}/api/user-requirements`,
          { title: data.title + ' ' + Date.now(), description: data.description },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      }
    });

    it('should list requirements', async () => {
      const response = await axios.get(
        `${API_URL}/api/user-requirements`,
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
        `${API_URL}/api/user-requirements?status=draft`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      response.data.data.forEach((req: any) => {
        expect(req.status).toBe('draft');
      });
    });

    it('should sort by id ascending', async () => {
      const response = await axios.get(
        `${API_URL}/api/user-requirements?sort=id&order=asc`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      const ids = response.data.data.map((r: any) => r.id);
      const sortedIds = [...ids].sort();
      expect(ids).toEqual(sortedIds);
    });

    it('should sort by id descending', async () => {
      const response = await axios.get(
        `${API_URL}/api/user-requirements?sort=id&order=desc`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      const ids = response.data.data.map((r: any) => r.id);
      const sortedIds = [...ids].sort().reverse();
      expect(ids).toEqual(sortedIds);
    });

    it('should sort by title ascending', async () => {
      const response = await axios.get(
        `${API_URL}/api/user-requirements?sort=title&order=asc`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      const titles = response.data.data.map((r: any) => r.title);
      const sortedTitles = [...titles].sort((a, b) => a.localeCompare(b));
      expect(titles).toEqual(sortedTitles);
    });

    it('should sort by title descending', async () => {
      const response = await axios.get(
        `${API_URL}/api/user-requirements?sort=title&order=desc`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      const titles = response.data.data.map((r: any) => r.title);
      const sortedTitles = [...titles].sort((a, b) => b.localeCompare(a));
      expect(titles).toEqual(sortedTitles);
    });

    it('should sort by createdAt ascending', async () => {
      const response = await axios.get(
        `${API_URL}/api/user-requirements?sort=createdAt&order=asc`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      const dates = response.data.data.map((r: any) => new Date(r.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    });

    it('should sort by createdAt descending', async () => {
      const response = await axios.get(
        `${API_URL}/api/user-requirements?sort=createdAt&order=desc`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      const dates = response.data.data.map((r: any) => new Date(r.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
      }
    });

    it('should combine filter and sort', async () => {
      const response = await axios.get(
        `${API_URL}/api/user-requirements?status=draft&sort=title&order=asc`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      // Check all are draft
      response.data.data.forEach((req: any) => {
        expect(req.status).toBe('draft');
      });
      // Check sorted by title
      const titles = response.data.data.map((r: any) => r.title);
      const sortedTitles = [...titles].sort((a, b) => a.localeCompare(b));
      expect(titles).toEqual(sortedTitles);
    });

    it('should default to descending when order not specified', async () => {
      const response = await axios.get(
        `${API_URL}/api/user-requirements?sort=id`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      const ids = response.data.data.map((r: any) => r.id);
      const sortedIds = [...ids].sort().reverse();
      expect(ids).toEqual(sortedIds);
    });
  });

  describe('PATCH /api/user-requirements/:id', () => {
    it('should update draft requirement', async () => {
      const response = await axios.patch(
        `${API_URL}/api/user-requirements/${testRequirementId}`,
        {
          description: 'Updated description that is sufficiently long to meet the minimum validation requirements for testing purposes.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.requirement.description).toContain('Updated description');
    });

    it('should reset approved requirement to draft when edited', async () => {
      // First approve a requirement
      const createRes = await axios.post(
        `${API_URL}/api/user-requirements`,
        {
          title: 'To Be Approved ' + Date.now(),
          description: 'This requirement will be approved then edited to test the reset to draft functionality properly.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const reqId = createRes.data.requirement.id;

      // Get user's password hash for approval
      await axios.post(`${API_URL}/api/auth/login`, {
        email: 'admin@reqquli.com',
        password: 'salasana!123'
      });

      // Approve it
      await axios.post(
        `${API_URL}/api/user-requirements/${reqId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Edit approved requirement
      const editRes = await axios.patch(
        `${API_URL}/api/user-requirements/${reqId}`,
        {
          description: 'Edited after approval - this should reset the requirement status back to draft for re-approval.',
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

  describe('POST /api/user-requirements/:id/approve', () => {
    it('should approve requirement with password', async () => {
      // Create requirement to approve
      const createRes = await axios.post(
        `${API_URL}/api/user-requirements`,
        {
          title: 'Approval Test ' + Date.now(),
          description: 'This requirement is created specifically to test the approval workflow with password confirmation.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const reqId = createRes.data.requirement.id;

      // Approve with password
      const approveRes = await axios.post(
        `${API_URL}/api/user-requirements/${reqId}/approve`,
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
          `${API_URL}/api/user-requirements/${testRequirementId}/approve`,
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
        await axios.post(
          `${API_URL}/api/user-requirements/${testRequirementId}/approve`,
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

  describe('DELETE /api/user-requirements/:id', () => {
    it('should soft delete requirement', async () => {
      // Create requirement to delete
      const createRes = await axios.post(
        `${API_URL}/api/user-requirements`,
        {
          title: 'To Delete ' + Date.now(),
          description: 'This requirement will be deleted to test the soft delete functionality implementation properly.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const reqId = createRes.data.requirement.id;

      // Delete it
      const deleteRes = await axios.delete(
        `${API_URL}/api/user-requirements/${reqId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(deleteRes.status).toBe(200);

      // Verify it's not in list
      const listRes = await axios.get(
        `${API_URL}/api/user-requirements`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      const found = listRes.data.data.find((r: any) => r.id === reqId);
      expect(found).toBeUndefined();
    });
  });

  afterAll(async () => {
    // Close database pool to prevent open handles
    await closePool();
  });

});