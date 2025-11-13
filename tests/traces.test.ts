import axios from "axios";
import { closePool } from "../src/server/config/database";

const API_URL = process.env.API_URL || "http://localhost:3000";

describe("Trace Management API", () => {
  let authToken: string;
  let testUserReq1: string;
  let testUserReq2: string;
  let testSystemReq1: string;
  let testSystemReq2: string;

  beforeAll(async () => {
    // Login to get token
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: "admin@reqquli.com",
      password: "salasana!123",
    });
    authToken = response.data.token;

    // Create test user requirements
    const ur1Response = await axios.post(
      `${API_URL}/api/user-requirements`,
      {
        title: "Trace Test UR1 " + Date.now(),
        description:
          "This user requirement is used for testing trace functionality and relationship management between requirements.",
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
    testUserReq1 = ur1Response.data.requirement.id;

    const ur2Response = await axios.post(
      `${API_URL}/api/user-requirements`,
      {
        title: "Trace Test UR2 " + Date.now(),
        description:
          "This is another user requirement for testing complex trace relationships and validation scenarios.",
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
    testUserReq2 = ur2Response.data.requirement.id;

    // Create test system requirements
    const sr1Response = await axios.post(
      `${API_URL}/api/system-requirements`,
      {
        title: "Trace Test SR1 " + Date.now(),
        description:
          "This system requirement implements functionality to test trace relationship management and API endpoints.",
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
    testSystemReq1 = sr1Response.data.requirement.id;

    const sr2Response = await axios.post(
      `${API_URL}/api/system-requirements`,
      {
        title: "Trace Test SR2 " + Date.now(),
        description:
          "This system requirement provides additional functionality for testing multiple trace relationships.",
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
    testSystemReq2 = sr2Response.data.requirement.id;

    // Create some initial traces for testing
    // UR1 -> SR1
    await axios.post(
      `${API_URL}/api/traces`,
      {
        fromId: testUserReq1,
        toId: testSystemReq1,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    // UR1 -> SR2
    await axios.post(
      `${API_URL}/api/traces`,
      {
        fromId: testUserReq1,
        toId: testSystemReq2,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    // UR2 -> SR1
    await axios.post(
      `${API_URL}/api/traces`,
      {
        fromId: testUserReq2,
        toId: testSystemReq1,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
  });

  describe("POST /api/traces", () => {
    it("should create trace relationship from user requirement to system requirement", async () => {
      // Create a new UR for this test to avoid conflicts
      const urResponse = await axios.post(
        `${API_URL}/api/user-requirements`,
        {
          title: "New UR for Trace Test " + Date.now(),
          description: "Creating a new user requirement for trace test",
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
      const newUR = urResponse.data.requirement.id;

      const response = await axios.post(
        `${API_URL}/api/traces`,
        {
          fromId: newUR,
          toId: testSystemReq1,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.trace).toBeDefined();
      expect(response.data.trace.fromId).toBe(newUR);
      expect(response.data.trace.toId).toBe(testSystemReq1);
      // Types are computed from ID prefixes in the backend
      expect(response.data.trace.fromType).toBe("user");
      expect(response.data.trace.toType).toBe("system");
      expect(response.data.trace.createdAt).toBeDefined();
      expect(response.data.trace.createdBy).toBeDefined();
    });

    it("should reject duplicate trace relationships", async () => {
      // Try to create the same trace relationship again
      try {
        await axios.post(
          `${API_URL}/api/traces`,
          {
            fromId: testUserReq1,
            toId: testSystemReq1,
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );
        fail("Should have rejected duplicate trace relationship");
      } catch (error: any) {
        expect(error.response.status).toBe(409);
        expect(error.response.data.error.message).toContain("already exists");
      }
    });

    it("should reject trace with non-existent requirement IDs", async () => {
      try {
        await axios.post(
          `${API_URL}/api/traces`,
          {
            fromId: "INVALID-99999",
            toId: testSystemReq1,
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );
        fail("Should have rejected invalid requirement ID");
      } catch (error: any) {
        // Should reject because the ID doesn't match any known prefix or doesn't exist
        expect([404, 422]).toContain(error.response.status);
      }
    });

    it("should reject trace with non-existent requirements", async () => {
      try {
        await axios.post(
          `${API_URL}/api/traces`,
          {
            fromId: "UR-99999",
            toId: testSystemReq1,
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );
        fail("Should have rejected non-existent requirement");
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error.message).toContain("not found");
      }
    });
  });

  describe("GET /api/requirements/:id/traces", () => {
    it("should get downstream traces for user requirement", async () => {
      const response = await axios.get(
        `${API_URL}/api/requirements/${testUserReq1}/traces`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.upstreamTraces).toEqual([]);
      expect(Array.isArray(response.data.downstreamTraces)).toBe(true);
      expect(response.data.downstreamTraces.length).toBe(2); // Should have SR1 and SR2

      const traceIds = response.data.downstreamTraces.map(
        (trace: any) => trace.id,
      );
      expect(traceIds).toContain(testSystemReq1);
      expect(traceIds).toContain(testSystemReq2);
    });

    it("should get upstream traces for system requirement", async () => {
      // Use testSystemReq2 which only has traces from UR1 (created in beforeAll)
      const response = await axios.get(
        `${API_URL}/api/requirements/${testSystemReq2}/traces`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.upstreamTraces)).toBe(true);
      expect(response.data.downstreamTraces).toEqual([]);
      expect(response.data.upstreamTraces.length).toBe(1); // Should have UR1 only

      const traceIds = response.data.upstreamTraces.map(
        (trace: any) => trace.id,
      );
      expect(traceIds).toContain(testUserReq1);
    });

    it("should return empty arrays for requirement with no traces", async () => {
      // Create a new requirement with no traces
      const urResponse = await axios.post(
        `${API_URL}/api/user-requirements`,
        {
          title: "Untraced UR " + Date.now(),
          description:
            "This user requirement has no trace relationships for testing empty trace responses.",
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
      const untracedId = urResponse.data.requirement.id;

      const response = await axios.get(
        `${API_URL}/api/requirements/${untracedId}/traces`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.upstreamTraces).toEqual([]);
      expect(response.data.downstreamTraces).toEqual([]);
    });

    it("should return 404 for non-existent requirement", async () => {
      try {
        await axios.get(`${API_URL}/api/requirements/UR-99999/traces`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        fail("Should have rejected non-existent requirement");
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error.message).toContain("not found");
      }
    });
  });

  describe("DELETE /api/traces/:fromId/:toId", () => {
    it("should delete trace relationship", async () => {
      // First verify the trace exists
      const beforeResponse = await axios.get(
        `${API_URL}/api/requirements/${testUserReq2}/traces`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
      expect(
        beforeResponse.data.downstreamTraces.some(
          (trace: any) => trace.id === testSystemReq1,
        ),
      ).toBe(true);

      // Delete the trace
      const deleteResponse = await axios.delete(
        `${API_URL}/api/traces/${testUserReq2}/${testSystemReq1}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.data.success).toBe(true);
      expect(deleteResponse.data.message).toContain("deleted successfully");

      // Verify the trace is gone
      const afterResponse = await axios.get(
        `${API_URL}/api/requirements/${testUserReq2}/traces`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
      expect(
        afterResponse.data.downstreamTraces.some(
          (trace: any) => trace.id === testSystemReq1,
        ),
      ).toBe(false);
    });

    it("should return 404 for non-existent trace relationship", async () => {
      try {
        await axios.delete(`${API_URL}/api/traces/UR-99999/SR-99999`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        fail("Should have rejected non-existent requirement");
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.error.message).toContain("not found");
      }
    });
  });

  describe("GET /api/system-requirements/trace-from/:userRequirementId", () => {
    it("should find system requirements traced from user requirement", async () => {
      const response = await axios.get(
        `${API_URL}/api/system-requirements/trace-from/${testUserReq1}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBe(2); // SR1 and SR2

      const srIds = response.data.data.map((sr: any) => sr.id);
      expect(srIds).toContain(testSystemReq1);
      expect(srIds).toContain(testSystemReq2);
    });

    it("should return empty array for user requirement with no downstream traces", async () => {
      const response = await axios.get(
        `${API_URL}/api/system-requirements/trace-from/${testUserReq2}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBe(0); // No traces left after deletion
    });
  });

  describe("Trace Relationship Integrity", () => {
    it("should maintain trace relationships when requirements are edited", async () => {
      // Edit the user requirement
      await axios.patch(
        `${API_URL}/api/user-requirements/${testUserReq1}`,
        {
          description:
            "Updated description to test trace relationship persistence during requirement editing.",
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      // Verify traces still exist
      const tracesResponse = await axios.get(
        `${API_URL}/api/requirements/${testUserReq1}/traces`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      expect(tracesResponse.data.downstreamTraces.length).toBe(2);
    });

    it("should maintain trace relationships when requirements are approved", async () => {
      // Approve the user requirement
      await axios.post(
        `${API_URL}/api/user-requirements/${testUserReq1}/approve`,
        {
          password: "salasana!123",
          approvalNotes: "Approved for trace relationship testing",
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      // Verify traces still exist
      const tracesResponse = await axios.get(
        `${API_URL}/api/requirements/${testUserReq1}/traces`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      expect(tracesResponse.data.downstreamTraces.length).toBe(2);
    });

    it("should handle soft-deleted requirements in trace queries", async () => {
      // Soft delete a system requirement
      await axios.delete(
        `${API_URL}/api/system-requirements/${testSystemReq2}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      // Verify it no longer appears in trace results
      const tracesResponse = await axios.get(
        `${API_URL}/api/requirements/${testUserReq1}/traces`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      const traceIds = tracesResponse.data.downstreamTraces.map(
        (trace: any) => trace.id,
      );
      expect(traceIds).not.toContain(testSystemReq2);
      expect(traceIds).toContain(testSystemReq1); // SR1 should still be there
    });
  });

  describe("GET /api/traces", () => {
    it("should fetch all traces in the system", async () => {
      const response = await axios.get(
        `${API_URL}/api/traces`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success');
      expect(response.data.success).toBe(true);
      expect(response.data).toHaveProperty('traces');
      expect(Array.isArray(response.data.traces)).toBe(true);

      // Should have at least the traces we created in setup
      expect(response.data.traces.length).toBeGreaterThan(0);

      // Verify trace structure
      if (response.data.traces.length > 0) {
        const trace = response.data.traces[0];
        expect(trace).toHaveProperty('id');
        expect(trace).toHaveProperty('fromId');
        expect(trace).toHaveProperty('toId');
        expect(trace).toHaveProperty('fromType');
        expect(trace).toHaveProperty('toType');
        expect(trace).toHaveProperty('fromTitle');
        expect(trace).toHaveProperty('toTitle');
        expect(trace).toHaveProperty('createdAt');
      }
    });

    it("should exclude traces where requirements are deleted", async () => {
      // Create a requirement and trace, then delete the requirement
      const urResponse = await axios.post(
        `${API_URL}/api/user-requirements`,
        {
          title: "UR to Delete for Trace Test " + Date.now(),
          description: "This will be deleted to test trace filtering",
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
      const tempURId = urResponse.data.requirement.id;

      const srResponse = await axios.post(
        `${API_URL}/api/system-requirements`,
        {
          title: "SR for Deleted UR Test " + Date.now(),
          description: "Tests trace filtering when requirement is deleted",
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
      const tempSRId = srResponse.data.requirement.id;

      // Create trace
      await axios.post(
        `${API_URL}/api/traces`,
        {
          fromId: tempURId,
          toId: tempSRId,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      // Get traces before deletion
      const beforeResponse = await axios.get(
        `${API_URL}/api/traces`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
      const beforeCount = beforeResponse.data.traces.filter(
        (t: any) => t.fromId === tempURId && t.toId === tempSRId
      ).length;
      expect(beforeCount).toBe(1);

      // Delete the user requirement
      await axios.delete(
        `${API_URL}/api/user-requirements/${tempURId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      // Get traces after deletion
      const afterResponse = await axios.get(
        `${API_URL}/api/traces`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
      const afterCount = afterResponse.data.traces.filter(
        (t: any) => t.fromId === tempURId && t.toId === tempSRId
      ).length;
      expect(afterCount).toBe(0); // Trace should be excluded

      // Clean up
      await axios.delete(
        `${API_URL}/api/system-requirements/${tempSRId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );
    });

    it("should require authentication to get all traces", async () => {
      try {
        await axios.get(`${API_URL}/api/traces`);
        fail("Should have required authentication");
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe("Authentication and Authorization", () => {
    it("should require authentication for trace operations", async () => {
      try {
        await axios.post(`${API_URL}/api/traces`, {
          fromId: testUserReq1,
          toId: testSystemReq1,
        });
        fail("Should have required authentication");
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });

    it("should require authentication for trace queries", async () => {
      try {
        await axios.get(`${API_URL}/api/requirements/${testUserReq1}/traces`);
        fail("Should have required authentication");
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });

    it("should require authentication for trace deletion", async () => {
      try {
        await axios.delete(
          `${API_URL}/api/traces/${testUserReq1}/${testSystemReq1}`,
        );
        fail("Should have required authentication");
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  afterAll(async () => {
    // Clean up test data if needed
    if (authToken) {
      try {
        // Delete test requirements to clean up
        await axios.delete(`${API_URL}/api/user-requirements/${testUserReq1}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        await axios.delete(`${API_URL}/api/user-requirements/${testUserReq2}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        await axios.delete(
          `${API_URL}/api/system-requirements/${testSystemReq1}`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );
        await axios.delete(
          `${API_URL}/api/system-requirements/${testSystemReq2}`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );
      } catch (err) {
        console.log("Cleanup failed", err.message);
        // Ignore cleanup errors
      }
    }

    // Close database pool to prevent open handles
    await closePool();
  });
});
