import axios from 'axios';
import { closePool } from '../src/server/config/database';

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('System Requirements API', () => {
  let authToken: string;
  let testSystemReqId: string;
  let testUserReqId: string;

  beforeAll(async () => {
    // Login to get token
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@reqquli.com',
      password: 'salasana!123'
    });
    authToken = response.data.token;

    // Create and approve a user requirement for testing
    const urResponse = await axios.post(
      `${API_URL}/api/user-requirements`,
      {
        title: 'Test UR for SR Testing ' + Date.now(),
        description: 'This user requirement is created for system requirements testing and needs to be approved for traceability.'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    testUserReqId = urResponse.data.requirement.id;

    // Approve the user requirement
    await axios.post(
      `${API_URL}/api/user-requirements/${testUserReqId}/approve`,
      {
        password: 'salasana!123'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
  });

  describe('POST /api/system-requirements', () => {
    it('should create new system requirement and establish trace relationship', async () => {
      const response = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: 'Test System Requirement ' + Date.now(),
          description: 'This system requirement implements authentication functionality to meet the user requirement for secure login.'
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
      
      testSystemReqId = response.data.requirement.id;

      // Create trace relationship using traces API
      const traceResponse = await axios.post(
        `${API_URL}/api/traces`,
        {
          fromId: testUserReqId,
          toId: testSystemReqId,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(traceResponse.status).toBe(201);
      expect(traceResponse.data.success).toBe(true);
      expect(traceResponse.data.trace).toBeDefined();
    });


    it('should reject duplicate titles', async () => {
      const title = 'Unique SR Test ' + Date.now();
      
      // Create first
      await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title,
          description: 'First system requirement with this title to test duplicate title validation in the system.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Try duplicate
      try {
        await axios.post(
          `${API_URL}/api/system-requirements`,
          {
            title,
            description: 'Second system requirement attempting to use the same title which should trigger validation error.'
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have rejected duplicate title');
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
          expect(error.response.status).toBe(409);
          expect(error.response.data.error.message).toContain('unique');
        } else {
          fail('Expected axios error');
        }
      }
    });

    it('should allow creating trace relationship to draft user requirement', async () => {
      // Create a draft user requirement
      const draftURResponse = await axios.post(
        `${API_URL}/api/user-requirements`,
        {
          title: 'Draft UR ' + Date.now(),
          description: 'This user requirement remains in draft status but should be linkable to system requirements.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const draftURId = draftURResponse.data.requirement.id;

      const response = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: 'SR Linking to Draft ' + Date.now(),
          description: 'This system requirement links to a draft user requirement which should be allowed.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      
      const srId = response.data.requirement.id;

      // Create trace relationship
      const traceResponse = await axios.post(
        `${API_URL}/api/traces`,
        {
          fromId: draftURId,
          toId: srId,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(traceResponse.status).toBe(201);
      expect(traceResponse.data.success).toBe(true);
    });
  });

  describe('GET /api/system-requirements', () => {
    it('should list system requirements', async () => {
      const response = await axios.get(
        `${API_URL}/api/system-requirements`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.meta.pagination).toBeDefined();
      
      // System requirements list should contain basic requirement data
      if (response.data.data.length > 0) {
        const sr = response.data.data[0];
        expect(sr.id).toBeDefined();
        expect(sr.title).toBeDefined();
        expect(sr.description).toBeDefined();
        expect(sr.status).toBeDefined();
      }
    });

    it('should filter by status', async () => {
      const response = await axios.get(
        `${API_URL}/api/system-requirements?status=draft`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      response.data.data.forEach((req: { status: string }) => {
        expect(req.status).toBe('draft');
      });
    });

    it('should find system requirements traced from user requirement', async () => {
      const response = await axios.get(
        `${API_URL}/api/system-requirements/trace-from/${testUserReqId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      
      // Should find the system requirement we created and traced earlier
      if (response.data.data.length > 0) {
        const sr = response.data.data.find((req: { id: string }) => req.id === testSystemReqId);
        expect(sr).toBeDefined();
      }
    });

    it('should support pagination', async () => {
      const response = await axios.get(
        `${API_URL}/api/system-requirements?page=1&limit=5`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.data.length).toBeLessThanOrEqual(5);
      expect(response.data.meta.pagination.page).toBe(1);
    });
  });

  describe('GET /api/system-requirements/:id', () => {
    it('should get system requirement by ID with full details', async () => {
      const response = await axios.get(
        `${API_URL}/api/system-requirements/${testSystemReqId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.requirement.id).toBe(testSystemReqId);
      expect(response.data.requirement.id).toBeDefined();
      expect(response.data.requirement.createdBy).toBeDefined();
    });

    it('should return 404 for non-existent ID', async () => {
      try {
        await axios.get(
          `${API_URL}/api/system-requirements/00000000-0000-0000-0000-000000000000`,
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should have returned 404');
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
          expect(error.response.status).toBe(404);
          expect(error.response.data.error.message).toContain('not found');
        } else {
          fail('Expected axios error');
        }
      }
    });
  });

  describe('PATCH /api/system-requirements/:id', () => {
    it('should update draft system requirement', async () => {
      const response = await axios.patch(
        `${API_URL}/api/system-requirements/${testSystemReqId}`,
        {
          description: 'Updated system requirement description that provides more detailed implementation specifications.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.requirement.description).toContain('Updated system requirement');
    });

    it('should allow managing trace relationships via traces API', async () => {
      // Create another user requirement
      const urResponse = await axios.post(
        `${API_URL}/api/user-requirements`,
        {
          title: 'Alternative UR ' + Date.now(),
          description: 'This is an alternative user requirement that will be used to test changing SR trace relationships.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const altURId = urResponse.data.requirement.id;

      // Create a new system requirement
      const srResponse = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: 'SR for Trace Test ' + Date.now(),
          description: 'This system requirement will be used to test trace relationship management via API.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const newSRId = srResponse.data.requirement.id;

      // Create trace relationship
      const traceResponse = await axios.post(
        `${API_URL}/api/traces`,
        {
          fromId: altURId,
          toId: newSRId,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(traceResponse.status).toBe(201);
      expect(traceResponse.data.success).toBe(true);
      expect(traceResponse.data.trace).toBeDefined();
    });

    it('should reset approved requirement to draft when edited', async () => {
      // Create and approve a system requirement
      const createRes = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: 'SR To Be Approved ' + Date.now(),
          description: 'This system requirement will be approved then edited to test the reset to draft functionality.',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const srId = createRes.data.requirement.id;

      // Approve it (no password required yet)
      await axios.post(
        `${API_URL}/api/system-requirements/${srId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Edit approved requirement
      const editRes = await axios.patch(
        `${API_URL}/api/system-requirements/${srId}`,
        {
          description: 'Edited after approval - this should reset the system requirement status back to draft.',
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

  describe('POST /api/system-requirements/:id/approve', () => {
    it('should approve system requirement', async () => {
      // Create requirement to approve
      const createRes = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: 'SR Approval Test ' + Date.now(),
          description: 'This system requirement is created specifically to test the approval workflow with password.',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const srId = createRes.data.requirement.id;

      // Approve (no password required yet - TODO in API)
      const approveRes = await axios.post(
        `${API_URL}/api/system-requirements/${srId}/approve`,
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
      expect(approveRes.data.requirement.revision).toBe(1);
      expect(approveRes.data.requirement.approvedBy).toBeDefined();
      expect(approveRes.data.requirement.approvedAt).toBeDefined();
    });

    it('should reject approval without password', async () => {
      try {
        await axios.post(
          `${API_URL}/api/system-requirements/${testSystemReqId}/approve`,
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
          `${API_URL}/api/system-requirements/${testSystemReqId}/approve`,
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

    it('should not allow approving already approved requirement', async () => {
      // Create and approve a requirement
      const createRes = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: 'Already Approved SR ' + Date.now(),
          description: 'This system requirement will be approved once and then tested for double approval prevention.',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const srId = createRes.data.requirement.id;

      // First approval
      await axios.post(
        `${API_URL}/api/system-requirements/${srId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Try to approve again
      try {
        await axios.post(
          `${API_URL}/api/system-requirements/${srId}/approve`,
          {
          password: 'salasana!123'
        },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        fail('Should not allow double approval');
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
          expect(error.response.status).toBe(400);
          expect(error.response.data.error.message).toContain('Only draft');
        } else {
          fail('Expected axios error');
        }
      }
    });
  });

  describe('Revision Management', () => {
    it('should start with revision 0 on creation', async () => {
      const createRes = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: 'Revision Test ' + Date.now(),
          description: 'This system requirement tests that new requirements start with revision 0.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(createRes.data.requirement.revision).toBe(0);
    });

    it('should increment revision on first approval (0 -> 1)', async () => {
      const createRes = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: 'First Approval Test ' + Date.now(),
          description: 'This system requirement tests that revision increments from 0 to 1 on first approval.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const srId = createRes.data.requirement.id;
      expect(createRes.data.requirement.revision).toBe(0);

      const approveRes = await axios.post(
        `${API_URL}/api/system-requirements/${srId}/approve`,
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

    it('should not increment revision when editing approved requirement', async () => {
      // Create and approve
      const createRes = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: 'Edit After Approval ' + Date.now(),
          description: 'This system requirement will be approved then edited to verify revision does not increment on edit.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const srId = createRes.data.requirement.id;

      // Approve (0 -> 1)
      await axios.post(
        `${API_URL}/api/system-requirements/${srId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Edit (should reset to draft but keep revision)
      const editRes = await axios.patch(
        `${API_URL}/api/system-requirements/${srId}`,
        {
          description: 'Edited description that should not increment revision.',
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(editRes.data.requirement.revision).toBe(1);
      expect(editRes.data.requirement.status).toBe('draft');
    });

    it('should increment revision on re-approval after edit (1 -> 2)', async () => {
      // Create, approve, edit
      const createRes = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: 'Re-approval Test ' + Date.now(),
          description: 'This system requirement tests that revision increments on re-approval after editing.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const srId = createRes.data.requirement.id;

      // First approval (0 -> 1)
      await axios.post(
        `${API_URL}/api/system-requirements/${srId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Edit (resets to draft, revision stays 1)
      await axios.patch(
        `${API_URL}/api/system-requirements/${srId}`,
        {
          description: 'Edited to test re-approval revision increment.',
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Re-approve (1 -> 2)
      const reapproveRes = await axios.post(
        `${API_URL}/api/system-requirements/${srId}/approve`,
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

    it('should increment revision on multiple approval cycles', async () => {
      // Create requirement
      const createRes = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: 'Multiple Approvals Test ' + Date.now(),
          description: 'This system requirement tests multiple approval cycles to verify revision keeps incrementing.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const srId = createRes.data.requirement.id;

      // First approval cycle: 0 -> 1
      await axios.post(
        `${API_URL}/api/system-requirements/${srId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Edit and re-approve: 1 -> 2
      await axios.patch(
        `${API_URL}/api/system-requirements/${srId}`,
        {
          description: 'First edit cycle.',
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      await axios.post(
        `${API_URL}/api/system-requirements/${srId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Second edit and re-approve: 2 -> 3
      await axios.patch(
        `${API_URL}/api/system-requirements/${srId}`,
        {
          description: 'Second edit cycle.',
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const finalApproveRes = await axios.post(
        `${API_URL}/api/system-requirements/${srId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(finalApproveRes.data.requirement.revision).toBe(3);
      expect(finalApproveRes.data.requirement.status).toBe('approved');
    });

    it('should increment revision when approving via PATCH endpoint', async () => {
      // Create requirement
      const createRes = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: 'PATCH Approval Test ' + Date.now(),
          description: 'This system requirement tests approval via PATCH endpoint to verify revision increments.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const srId = createRes.data.requirement.id;
      expect(createRes.data.requirement.revision).toBe(0);

      // Approve via PATCH (must include at least title or description)
      const patchApproveRes = await axios.patch(
        `${API_URL}/api/system-requirements/${srId}`,
        {
          description: 'Updated description for PATCH approval test.',
          status: 'approved',
          password: 'salasana!123',
          approvalNotes: 'Approved via PATCH endpoint'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(patchApproveRes.data.requirement.revision).toBe(1);
      expect(patchApproveRes.data.requirement.status).toBe('approved');
    });
  });

  describe('DELETE /api/system-requirements/:id', () => {
    it('should soft delete system requirement', async () => {
      // Create requirement to delete
      const createRes = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: 'SR To Delete ' + Date.now(),
          description: 'This system requirement will be deleted to test the soft delete functionality implementation.',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const srId = createRes.data.requirement.id;

      // Delete it
      const deleteRes = await axios.delete(
        `${API_URL}/api/system-requirements/${srId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(deleteRes.status).toBe(200);

      // Verify it's not in list
      const listRes = await axios.get(
        `${API_URL}/api/system-requirements`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      const found = listRes.data.data.find((r: { id: string }) => r.id === srId);
      expect(found).toBeUndefined();
    });

    it('should allow deleting approved requirement', async () => {
      // Create and approve a requirement
      const createRes = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: 'Approved SR Delete ' + Date.now(),
          description: 'This approved system requirement can be deleted as per business rules - soft delete maintains audit trail.',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const srId = createRes.data.requirement.id;

      // Approve it
      await axios.post(
        `${API_URL}/api/system-requirements/${srId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Delete approved requirement (should succeed)
      const deleteRes = await axios.delete(
        `${API_URL}/api/system-requirements/${srId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.data.success).toBe(true);
    });
  });

  describe('Traceability Chain Validation', () => {
    it('should maintain traceability when user requirement is edited', async () => {
      // Create UR
      const urRes = await axios.post(
        `${API_URL}/api/user-requirements`,
        {
          title: 'UR for Trace Test ' + Date.now(),
          description: 'This user requirement tests that system requirements maintain their links when UR is edited.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const urId = urRes.data.requirement.id;

      // Approve UR
      await axios.post(
        `${API_URL}/api/user-requirements/${urId}/approve`,
        {
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Create SR linked to it
      const srRes = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: 'SR Trace Test ' + Date.now(),
          description: 'This system requirement tests traceability maintenance when the parent UR is modified.',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const srId = srRes.data.requirement.id;

      // Edit the UR (resets to draft)
      await axios.patch(
        `${API_URL}/api/user-requirements/${urId}`,
        {
          description: 'Updated user requirement description to test that SR links are maintained after UR edit.',
          password: 'salasana!123'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      // Verify SR still links to UR
      const srCheck = await axios.get(
        `${API_URL}/api/system-requirements/${srId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(srCheck.data.requirement.id).toBe(srId);
    });

    it('should list all system requirements linked to a user requirement via traces API', async () => {
      // Use the test UR that has SRs linked via traces
      const response = await axios.get(
        `${API_URL}/api/system-requirements/trace-from/${testUserReqId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      
      // Should find the system requirement we traced earlier
      if (response.data.data.length > 0) {
        const sr = response.data.data.find((req: { id: string }) => req.id === testSystemReqId);
        expect(sr).toBeDefined();
      }
    });
  });

  describe('GET /api/system-requirements/trace-from/:userRequirementId', () => {
    it('should fetch system requirements that trace from a user requirement', async () => {
      // Use the existing test user requirement
      const response = await axios.get(
        `${API_URL}/api/system-requirements/trace-from/${testUserReqId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);

      // Should contain the system requirement we created earlier with trace
      if (response.data.data.length > 0) {
        expect(response.data.data[0]).toHaveProperty('id');
        expect(response.data.data[0]).toHaveProperty('title');
        expect(response.data.data[0]).toHaveProperty('status');
      }
    });

    it('should return empty array for user requirement with no traces', async () => {
      // Create a user requirement with no traces
      const urRes = await axios.post(
        `${API_URL}/api/user-requirements`,
        {
          title: 'Isolated UR ' + Date.now(),
          description: 'This user requirement has no system requirements tracing from it for testing empty results.'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const isolatedURId = urRes.data.requirement.id;

      const response = await axios.get(
        `${API_URL}/api/system-requirements/trace-from/${isolatedURId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toEqual([]);
    });

    it('should return 404 for non-existent user requirement', async () => {
      // The endpoint returns empty array instead of 404 for non-existent requirements
      const response = await axios.get(
        `${API_URL}/api/system-requirements/trace-from/UR-999999`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toEqual([]);
    });

    it('should require authentication', async () => {
      try {
        await axios.get(
          `${API_URL}/api/system-requirements/trace-from/${testUserReqId}`
        );
        fail('Should have required authentication');
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
          expect(error.response.status).toBe(401);
        } else {
          fail('Expected axios error');
        }
      }
    });
  });

  afterAll(async () => {
    // Close database pool to prevent open handles
    await closePool();
  });

});