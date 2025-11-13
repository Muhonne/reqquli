import { Router, Response } from "express";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { getPool } from "../config/database";
import bcrypt from "bcrypt";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import sanitize from "sanitize-filename";
import {
  badRequest,
  unauthorized,
  notFound,
  unprocessableEntity,
  internalServerError,
  successResponse
} from '../utils/responses';

const router = Router();
const pool = getPool();

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads", "evidence");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Sanitize the original filename to prevent path traversal
    const sanitizedName = sanitize(file.originalname);

    // Generate a unique identifier using crypto for better randomness
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();

    // Create filename: timestamp_uniqueid_sanitizedname
    const uniqueName = `${timestamp}_${uniqueId}_${sanitizedName}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    // Accept common evidence file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx|xls/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// GET /api/test-runs - List all test runs
router.get(
  "/test-runs",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        status,
        creator,
        from,
        to,
        sort = "createdAt",
        order = "desc",
        page = 1,
        limit = 100,
        search,
      } = req.query;

      // Enforce max limit
      const effectiveLimit = Math.min(parseInt(limit as string), 200);
      const offset = (parseInt(page as string) - 1) * effectiveLimit;

      // Build WHERE conditions
      const conditions: string[] = [];
      const params: any[] = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        conditions.push(`tr.status = $${paramCount}`);
        params.push(status);
      }

      if (creator) {
        paramCount++;
        conditions.push(`tr.created_by = $${paramCount}`);
        params.push(creator);
      }

      if (from) {
        paramCount++;
        conditions.push(`tr.created_at >= $${paramCount}`);
        params.push(from);
      }

      if (to) {
        paramCount++;
        conditions.push(`tr.created_at <= $${paramCount}`);
        params.push(to);
      }

      if (search && search.toString().trim() !== "") {
        paramCount++;
        conditions.push(
          `(tr.id::text ILIKE $${paramCount} OR tr.name ILIKE $${paramCount})`,
        );
        params.push(`%${search}%`);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // Sort handling
      const validSortColumns = [
        "id",
        "name",
        "createdAt",
        "lastModified",
        "approvedAt",
        "status",
      ];
      const validOrder = ["asc", "desc"];
      const sortColumn = validSortColumns.includes(sort as string)
        ? sort
        : "createdAt";
      const sortOrder = validOrder.includes((order as string).toLowerCase())
        ? (order as string).toUpperCase()
        : "DESC";

      const columnMap: any = {
        id: "tr.id",
        name: "tr.name",
        createdAt: "tr.created_at",
        lastModified: "COALESCE(tr.approved_at, tr.created_at)",
        approvedAt: "tr.approved_at",
        status: "tr.status",
      };
      const mappedColumn = columnMap[sortColumn as string] || "tr.created_at";

      // Get total count for pagination
      const countQuery = `
      SELECT COUNT(*) as total
      FROM testing.test_runs tr
      ${whereClause}
    `;
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);
      const pages = Math.ceil(total / effectiveLimit);

      // Get test runs with pagination
      const query = `
      SELECT
        tr.id,
        tr.name,
        tr.description,
        tr.status,
        tr.overall_result as "overallResult",
        tr.created_at as "createdAt",
        tr.created_by as "createdBy",
        u1.full_name as "createdByName",
        tr.approved_at as "approvedAt",
        tr.approved_by as "approvedBy",
        u2.full_name as "approvedByName"
      FROM testing.test_runs tr
      LEFT JOIN users u1 ON tr.created_by = u1.id
      LEFT JOIN users u2 ON tr.approved_by = u2.id
      ${whereClause}
      ORDER BY ${mappedColumn} ${sortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

      params.push(effectiveLimit, offset);
      const result = await pool.query(query, params);

      res.json({
        success: true,
        data: result.rows,
        meta: {
          pagination: {
            total,
            page: parseInt(page as string),
            pages: pages,
            limit: effectiveLimit,
          }
        }
      });
    } catch (error) {
      console.error("Error fetching test runs:", error);
      return internalServerError(res, "Failed to fetch test runs");
    }
  },
);

// POST /api/test-runs - Create a new test run
router.post(
  "/test-runs",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, description, testCaseIds } = req.body;
      const userId = req.user?.userId;

      if (
        !name ||
        !testCaseIds ||
        !Array.isArray(testCaseIds) ||
        testCaseIds.length === 0
      ) {
        return unprocessableEntity(res, "Name and test case IDs are required");
      }

      // Verify all test cases exist and are approved
      const verifyQuery = `
      SELECT id FROM testing.test_cases
      WHERE id = ANY($1) AND status = 'approved' AND deleted_at IS NULL
    `;
      const verifyResult = await pool.query(verifyQuery, [testCaseIds]);

      if (verifyResult.rows.length !== testCaseIds.length) {
        return unprocessableEntity(res, "Some test cases are invalid or not approved");
      }

      // Begin transaction
      await pool.query("BEGIN");

      try {
        // Generate test run ID using sequence
        const idQuery = "SELECT 'TR-' || nextval('test_run_seq') as id";
        const idResult = await pool.query(idQuery);
        const testRunId = idResult.rows[0].id;

        const insertRunQuery = `
        INSERT INTO testing.test_runs (id, name, description, status, overall_result, created_by)
        VALUES ($1, $2, $3, 'not_started', 'pending', $4)
        RETURNING *
      `;
        await pool.query(insertRunQuery, [
          testRunId,
          name,
          description,
          userId,
        ]);

        // Create test run cases
        const testRunCases = [];
        for (let i = 0; i < testCaseIds.length; i++) {
          const testCaseId = testCaseIds[i];
          const testRunCaseId = crypto.randomUUID();
          const insertCaseQuery = `
          INSERT INTO testing.test_run_cases (id, test_run_id, test_case_id, status, result)
          VALUES ($1, $2, $3, 'not_started', 'pending')
          RETURNING *
        `;
          const caseResult = await pool.query(insertCaseQuery, [
            testRunCaseId,
            testRunId,
            testCaseId,
          ]);
          testRunCases.push(caseResult.rows[0]);
        }

        await pool.query("COMMIT");

        // Fetch complete test run data
        const completeQuery = `
        SELECT
          tr.id,
          tr.name,
          tr.description,
          tr.status,
          tr.overall_result as "overallResult",
          tr.created_at as "createdAt",
          tr.created_by as "createdBy",
          u.full_name as "createdByName"
        FROM testing.test_runs tr
        LEFT JOIN users u ON tr.created_by = u.id
        WHERE tr.id = $1
      `;
        const completeResult = await pool.query(completeQuery, [testRunId]);

        res.json({
          success: true,
          testRun: completeResult.rows[0],
          testRunCases,
        });
      } catch (error) {
        await pool.query("ROLLBACK");
        console.error("Error creating test run:", error);
        throw error;
      }
    } catch (error: any) {
      console.error("Error creating test run:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      return internalServerError(res, "Failed to create test run",
        process.env.NODE_ENV === 'test' ? { details: error.message } : undefined);
    }
  },
);

// GET /api/test-runs/:run_id - Get test run details
router.get(
  "/test-runs/:runId",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { runId } = req.params;

      // Get test run
      const runQuery = `
      SELECT
        tr.id,
        tr.name,
        tr.description,
        tr.status,
        tr.overall_result as "overallResult",
        tr.created_at as "createdAt",
        tr.created_by as "createdBy",
        u1.full_name as "createdByName",
        tr.approved_at as "approvedAt",
        tr.approved_by as "approvedBy",
        u2.full_name as "approvedByName"
      FROM testing.test_runs tr
      LEFT JOIN users u1 ON tr.created_by = u1.id
      LEFT JOIN users u2 ON tr.approved_by = u2.id
      WHERE tr.id = $1
    `;
      const runResult = await pool.query(runQuery, [runId]);

      if (runResult.rows.length === 0) {
        return notFound(res, "Test run not found");
      }

      // Get test run cases with test case details
      const casesQuery = `
      SELECT
        trc.id,
        trc.test_run_id as "testRunId",
        trc.test_case_id as "testCaseId",
        trc.status,
        trc.result,
        trc.started_at as "startedAt",
        trc.completed_at as "completedAt",
        trc.executed_by as "executedBy",
        u.full_name as "executedByName",
        tc.title as "testCaseTitle",
        tc.description as "testCaseDescription"
      FROM testing.test_run_cases trc
      LEFT JOIN users u ON trc.executed_by = u.id
      LEFT JOIN testing.test_cases tc ON trc.test_case_id = tc.id
      WHERE trc.test_run_id = $1
      ORDER BY tc.id
    `;
      const casesResult = await pool.query(casesQuery, [runId]);

      // Get test steps for each test case
      const testSteps: { [key: string]: any[] } = {};
      const testStepResults: { [key: string]: any[] } = {};

      for (const testRunCase of casesResult.rows) {
        // Get test steps
        const stepsQuery = `
        SELECT
          step_number as "stepNumber",
          action,
          expected_result as "expectedResult"
        FROM testing.test_steps
        WHERE test_case_id = $1
        ORDER BY step_number
      `;
        const stepsResult = await pool.query(stepsQuery, [
          testRunCase.testCaseId,
        ]);
        testSteps[testRunCase.testCaseId] = stepsResult.rows;

        // Get test step results
        const resultsQuery = `
        SELECT
          tsr.id,
          tsr.test_run_case_id as "testRunCaseId",
          tsr.step_number as "stepNumber",
          tsr.expected_result as "expectedResult",
          tsr.actual_result as "actualResult",
          tsr.status,
          tsr.evidence_file_id as "evidenceFileId",
          tsr.executed_at as "executedAt",
          tsr.executed_by as "executedBy",
          u.full_name as "executedByName"
        FROM testing.test_step_results tsr
        LEFT JOIN users u ON tsr.executed_by = u.id
        WHERE tsr.test_run_case_id = $1
        ORDER BY tsr.step_number
      `;
        const resultsResult = await pool.query(resultsQuery, [testRunCase.id]);
        testStepResults[testRunCase.id] = resultsResult.rows;
      }

      res.json({
        success: true,
        testRun: runResult.rows[0],
        testRunCases: casesResult.rows,
        testSteps,
        testStepResults,
      });
    } catch (error) {
      console.error("Error fetching test run:", error);
      return internalServerError(res, "Failed to fetch test run");
    }
  },
);

// PUT /api/test-runs/:run_id/approve - Approve test run and create result traces
router.put(
  "/test-runs/:runId/approve",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const { runId } = req.params;
    const { password } = req.body;
    const userId = req.user?.userId;

    if (!password) {
      return badRequest(res, "Password is required");
    }

    const client = await pool.connect();

    try {
      // Verify password
      const userQuery = 'SELECT password_hash FROM users WHERE id = $1';
      const userResult = await client.query(userQuery, [userId]);

      if (!userResult.rows[0]) {
        return unauthorized(res, "User not found");
      }

      const validPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);
      if (!validPassword) {
        return unauthorized(res, "Invalid password");
      }

      // Check test run exists and is complete
      const runQuery = `
        SELECT status, overall_result
        FROM testing.test_runs
        WHERE id = $1
      `;
      const runResult = await client.query(runQuery, [runId]);

      if (!runResult.rows[0]) {
        return notFound(res, "Test run not found");
      }

      if (runResult.rows[0].status === 'approved') {
        return badRequest(res, "Test run is already approved");
      }

      if (runResult.rows[0].status !== 'complete') {
        return badRequest(res, "Test run must be complete before approval");
      }

      await client.query('BEGIN');

      // Get all test case results from this run
      const casesQuery = `
        SELECT
          trc.test_case_id,
          trc.result,
          trc.executed_by,
          trc.completed_at
        FROM testing.test_run_cases trc
        WHERE trc.test_run_id = $1 AND trc.status = 'complete'
      `;
      const casesResult = await client.query(casesQuery, [runId]);

      // Create test results and traces for each completed test case
      for (const testCase of casesResult.rows) {
        // Generate test result ID
        const resultIdQuery = "SELECT 'TRES-' || nextval('test_result_seq') as id";
        const resultIdResult = await client.query(resultIdQuery);
        const testResultId = resultIdResult.rows[0].id;

        // Create test result record
        await client.query(`
          INSERT INTO testing.test_results
          (id, test_run_id, test_case_id, result, executed_by, executed_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          testResultId,
          runId,
          testCase.test_case_id,
          testCase.result,
          testCase.executed_by,
          testCase.completed_at
        ]);

        // Create system-generated trace from test case to test result (test result is downstream)
        await client.query(`
          INSERT INTO traces
          (from_requirement_id, to_requirement_id, created_by, is_system_generated)
          VALUES ($1, $2, $3, TRUE)
          ON CONFLICT (from_requirement_id, to_requirement_id) DO NOTHING
        `, [testCase.test_case_id, testResultId, userId]);
      }

      // Approve the test run
      await client.query(`
        UPDATE testing.test_runs
        SET status = 'approved',
            approved_at = NOW(),
            approved_by = $1
        WHERE id = $2
      `, [userId, runId]);

      await client.query('COMMIT');

      // Return updated test run
      const updatedRunQuery = `
        SELECT
          tr.id,
          tr.name,
          tr.description,
          tr.status,
          tr.overall_result as "overallResult",
          tr.created_at as "createdAt",
          tr.created_by as "createdBy",
          u1.full_name as "createdByName",
          tr.approved_at as "approvedAt",
          tr.approved_by as "approvedBy",
          u2.full_name as "approvedByName"
        FROM testing.test_runs tr
        LEFT JOIN users u1 ON tr.created_by = u1.id
        LEFT JOIN users u2 ON tr.approved_by = u2.id
        WHERE tr.id = $1
      `;
      const updatedResult = await client.query(updatedRunQuery, [runId]);

      res.json({
        success: true,
        testRun: updatedResult.rows[0],
        message: `Test run approved. Created ${casesResult.rows.length} test result traces.`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error approving test run:', error);
      return internalServerError(res, "Failed to approve test run");
    } finally {
      client.release();
    }
  },
);

// GET /api/test-cases - List all test cases
router.get(
  "/test-cases",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        status,
        search,
        sort = "lastModified",
        order = "desc",
        page = 1,
        limit = 100,
      } = req.query;

      // Enforce max limit to match requirements pattern
      const effectiveLimit = Math.min(parseInt(limit as string), 200);
      const offset = (parseInt(page as string) - 1) * effectiveLimit;

      // Build WHERE conditions
      const conditions = ["tc.deleted_at IS NULL"];
      const params: any[] = [];
      let paramIndex = 1;

      if (status && status !== "all") {
        conditions.push(`tc.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (search && search.toString().trim() !== "") {
        conditions.push(
          `(tc.title ILIKE $${paramIndex} OR tc.description ILIKE $${paramIndex} OR tc.id ILIKE $${paramIndex})`,
        );
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Sort handling with validation
      const validSortColumns = [
        "id",
        "title",
        "createdAt",
        "lastModified",
        "approvedAt",
        "status",
      ];
      const validOrder = ["asc", "desc"];
      const sortColumn = validSortColumns.includes(sort as string)
        ? sort
        : "lastModified";
      const sortOrder = validOrder.includes((order as string).toLowerCase())
        ? (order as string).toUpperCase()
        : "DESC";

      const columnMap: any = {
        id: "tc.id",
        title: "tc.title",
        createdAt: "tc.created_at",
        lastModified: "COALESCE(tc.last_modified, tc.created_at)",
        approvedAt: "tc.approved_at",
        status: "tc.status",
      };
      const mappedColumn = columnMap[sortColumn as string] || "tc.created_at";

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // Get total count
      const countQuery = `
      SELECT COUNT(*) as total
      FROM testing.test_cases tc
      ${whereClause}
    `;
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);
      const pages = Math.ceil(total / effectiveLimit);

      // Get test cases with pagination
      const query = `
      SELECT
        tc.id,
        tc.title,
        tc.description,
        tc.status,
        tc.revision,
        tc.created_at as "createdAt",
        tc.created_by as "createdBy",
        u1.full_name as "createdByName",
        tc.last_modified as "lastModified",
        tc.modified_by as "modifiedBy",
        u3.full_name as "modifiedByName",
        tc.approved_at as "approvedAt",
        tc.approved_by as "approvedBy",
        u2.full_name as "approvedByName"
      FROM testing.test_cases tc
      LEFT JOIN users u1 ON tc.created_by = u1.id
      LEFT JOIN users u2 ON tc.approved_by = u2.id
      LEFT JOIN users u3 ON tc.modified_by = u3.id
      ${whereClause}
      ORDER BY ${mappedColumn} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

      params.push(effectiveLimit, offset);
      const result = await pool.query(query, params);

      // Get test steps for each test case
      const testSteps: { [key: string]: any[] } = {};
      for (const testCase of result.rows) {
        const stepsQuery = `
        SELECT
          id,
          step_number as "stepNumber",
          action,
          expected_result as "expectedResult"
        FROM testing.test_steps
        WHERE test_case_id = $1
        ORDER BY step_number
      `;
        const stepsResult = await pool.query(stepsQuery, [testCase.id]);
        testSteps[testCase.id] = stepsResult.rows;
      }

      return successResponse(res, result.rows.map((tc) => ({
          ...tc,
          steps: testSteps[tc.id] || [],
        })), {
        pagination: {
          total,
          page: parseInt(page as string),
          pages: pages,
          limit: effectiveLimit,
        }
      });
    } catch (error: any) {
      console.error("Error fetching test cases:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      return internalServerError(res, "Failed to fetch test cases",
        process.env.NODE_ENV === 'test' ? { details: error.message } : undefined);
    }
  },
);

// GET /api/test-cases/:id - Get single test case
// router.get("/test-cases/:id", authenticateToken, async (req: Request, res: Response) => {
//   const { id } = req.params;
// 
//   try {
//     // Get test case details
//     const testCaseResult = await pool.query(
//       `SELECT
//         tc.id,
//         tc.title,
//         tc.description,
//         tc.status,
//         tc.revision,
//         tc.created_at as "createdAt",
//         tc.created_by as "createdBy",
//         u1.full_name as "createdByName",
//         tc.last_modified as "lastModified",
//         tc.modified_by as "modifiedBy",
//         u2.full_name as "modifiedByName",
//         tc.approved_at as "approvedAt",
//         tc.approved_by as "approvedBy",
//         u3.full_name as "approvedByName",
//         tc.deleted_at as "deletedAt"
//       FROM testing.test_cases tc
//       LEFT JOIN users u1 ON tc.created_by = u1.id
//       LEFT JOIN users u2 ON tc.modified_by = u2.id
//       LEFT JOIN users u3 ON tc.approved_by = u3.id
//       WHERE tc.id = $1`,
//       [id]
//     );
// 
//     if (testCaseResult.rows.length === 0) {
//       return notFound(res, "Test case not found");
//     }
// 
//     const testCase = testCaseResult.rows[0];
// 
//     // Get test steps
//     const stepsResult = await pool.query(
//       `SELECT step_number as "stepNumber", action, expected_result as "expectedResult"
//        FROM testing.test_steps
//        WHERE test_case_id = $1
//        ORDER BY step_number`,
//       [id]
//     );
// 
//     // Get linked requirements from traces table
//     const linkedReqsResult = await pool.query(
//       `SELECT from_requirement_id as system_requirement_id
//        FROM traces
//        WHERE to_requirement_id = $1 AND from_type = 'system' AND to_type = 'testcase'`,
//       [id]
//     );
// 
//     const linkedRequirements = linkedReqsResult.rows.map(row => row.system_requirement_id);
// 
//     return res.json({
//       success: true,
//       testCase: {
//         ...testCase,
//         linkedRequirements,
//         steps: stepsResult.rows
//       }
//     });
//   } catch (error) {
//     console.error("Error fetching test case:", error);
//     return internalServerError(res, "Failed to fetch test case");
//   }
// });

// GET /api/test-cases/:id/traces - Get traces for test case
// router.get("/test-cases/:id/traces", authenticateToken, async (req: Request, res: Response) => {
//   const { id } = req.params;
// 
//   try {
//     // Get upstream traces (system requirements that trace TO this test case)
//     const upstreamQuery = `
//       SELECT
//         rt.from_requirement_id AS id,
//         sr.title,
//         sr.description,
//         sr.status,
//         'system' as type
//       FROM traces rt
//       INNER JOIN system_requirements sr ON rt.from_requirement_id = sr.id
//       WHERE rt.to_requirement_id = $1 AND rt.to_type = 'testcase'
//         AND sr.deleted_at IS NULL
//       ORDER BY sr.last_modified DESC
//     `;
// 
//     const upstreamResult = await pool.query(upstreamQuery, [id]);
// 
//     // Get downstream traces (test results that trace FROM this test case)
//     const downstreamQuery = `
//       SELECT
//         tres.id,
//         tres.test_run_id as "testRunId",
//         tr.name as "testRunName",
//         tr.name as title,
//         CONCAT('Approved on ', TO_CHAR(tr.approved_at, 'MM/DD/YYYY'), ' by ', COALESCE(u2.full_name, 'Unknown')) as description,
//         tres.result,
//         tr.approved_at as "approvedAt",
//         tr.approved_by as "approvedBy",
//         u2.full_name as "approvedByName",
//         'testresult' as type
//       FROM traces t
//       INNER JOIN testing.test_results tres ON t.to_requirement_id = tres.id
//       INNER JOIN testing.test_runs tr ON tres.test_run_id = tr.id
//       LEFT JOIN users u2 ON tr.approved_by = u2.id
//       WHERE t.from_requirement_id = $1 AND t.from_type = 'testcase' AND t.to_type = 'testresult'
//       ORDER BY tr.approved_at DESC
//     `;
// 
//     const downstreamResult = await pool.query(downstreamQuery, [id]);
// 
//     return res.json({
//       success: true,
//       upstreamTraces: upstreamResult.rows,  // Only system requirements are upstream
//       downstreamTraces: downstreamResult.rows  // Test results are downstream
//     });
//   } catch (error) {
//     console.error("Error fetching test case traces:", error);
//     return internalServerError(res, "Failed to fetch test case traces");
//   }
// });

// POST /api/test-runs/:run_id/test-cases/:test_case_id/execute - Start or re-run test case
router.post(
  "/test-runs/:runId/test-cases/:testCaseId/execute",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { runId, testCaseId } = req.params;
      const userId = req.user?.userId;

      // Check test run is not approved
      const runQuery = "SELECT status FROM testing.test_runs WHERE id = $1";
      const runResult = await pool.query(runQuery, [runId]);

      if (runResult.rows.length === 0) {
        return notFound(res, "Test run not found");
      }

      if (runResult.rows[0].status === "approved") {
        return badRequest(res, "Cannot modify approved test run");
      }

      // Get test run case
      const caseQuery = `
      SELECT id FROM testing.test_run_cases
      WHERE test_run_id = $1 AND test_case_id = $2
    `;
      const caseResult = await pool.query(caseQuery, [runId, testCaseId]);

      if (caseResult.rows.length === 0) {
        return notFound(res, "Test case not found in test run");
      }

      const testRunCaseId = caseResult.rows[0].id;

      // Begin transaction
      await pool.query("BEGIN");

      try {
        // Delete existing step results
        await pool.query(
          "DELETE FROM testing.test_step_results WHERE test_run_case_id = $1",
          [testRunCaseId],
        );

        // Update test run case
        const updateCaseQuery = `
        UPDATE testing.test_run_cases
        SET status = 'in_progress', result = 'pending', started_at = NOW(), executed_by = $1
        WHERE id = $2
        RETURNING *
      `;
        await pool.query(updateCaseQuery, [userId, testRunCaseId]);

        // Update test run status if needed
        const updateRunQuery = `
        UPDATE testing.test_runs
        SET status = 'in_progress'
        WHERE id = $1 AND status = 'not_started'
      `;
        await pool.query(updateRunQuery, [runId]);

        await pool.query("COMMIT");

        // Fetch updated test run case
        const completeQuery = `
        SELECT
          trc.id,
          trc.test_run_id as "testRunId",
          trc.test_case_id as "testCaseId",
          trc.status,
          trc.result,
          trc.started_at as "startedAt",
          trc.executed_by as "executedBy",
          u.full_name as "executedByName"
        FROM testing.test_run_cases trc
        LEFT JOIN users u ON trc.executed_by = u.id
        WHERE trc.id = $1
      `;
        const completeResult = await pool.query(completeQuery, [testRunCaseId]);

        res.json({
          success: true,
          testRunCase: completeResult.rows[0],
        });
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    } catch (error) {
      console.error("Error executing test case:", error);
      return internalServerError(res, "Failed to execute test case");
    }
  },
);

// PUT /api/test-runs/:run_id/test-cases/:test_case_id/steps/:step_number - Update step result
router.put(
  "/test-runs/:runId/test-cases/:testCaseId/steps/:stepNumber",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { runId, testCaseId, stepNumber } = req.params;
      const { status, actualResult, evidenceFileId } = req.body;
      const userId = req.user?.userId;

      if (!status || !actualResult) {
        return unprocessableEntity(res, "Status and actual result are required");
      }

      // Validate status value
      if (status !== 'pass' && status !== 'fail') {
        return unprocessableEntity(res, "Invalid status. Status must be 'pass' or 'fail'");
      }

      // Check test run is not approved
      const runQuery = "SELECT status FROM testing.test_runs WHERE id = $1";
      const runResult = await pool.query(runQuery, [runId]);

      if (runResult.rows.length === 0) {
        return notFound(res, "Test run not found");
      }

      if (runResult.rows[0].status === "approved") {
        return badRequest(res, "Cannot modify approved test run");
      }

      // Get test run case
      const caseQuery = `
      SELECT id FROM testing.test_run_cases
      WHERE test_run_id = $1 AND test_case_id = $2
    `;
      const caseResult = await pool.query(caseQuery, [runId, testCaseId]);

      if (caseResult.rows.length === 0) {
        return notFound(res, "Test case not found in test run");
      }

      const testRunCaseId = caseResult.rows[0].id;

      // Get expected result from test step
      const stepQuery = `
      SELECT expected_result FROM testing.test_steps
      WHERE test_case_id = $1 AND step_number = $2
    `;
      const stepResult = await pool.query(stepQuery, [testCaseId, stepNumber]);

      if (stepResult.rows.length === 0) {
        return notFound(res, "Test step not found");
      }

      // Get a client from the pool for transaction
      const client = await pool.connect();

      try {
        // Begin transaction
        await client.query("BEGIN");

        // Insert or update step result
        const upsertQuery = `
        INSERT INTO testing.test_step_results
        (test_run_case_id, step_number, expected_result, actual_result, status, evidence_file_id, executed_at, executed_by)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
        ON CONFLICT (test_run_case_id, step_number)
        DO UPDATE SET
          actual_result = $4,
          status = $5,
          evidence_file_id = $6,
          executed_at = NOW(),
          executed_by = $7
        RETURNING *
      `;

        const insertResult = await client.query(upsertQuery, [
          testRunCaseId,
          stepNumber,
          stepResult.rows[0].expected_result,
          actualResult,
          status,
          evidenceFileId,
          userId,
        ]);

        if (!insertResult.rows[0]) {
          throw new Error(
            "Failed to insert/update step result - no data returned",
          );
        }

        // Store the inserted/updated step result and format it properly
        const savedStepResult = {
          id: insertResult.rows[0].id,
          testRunCaseId: insertResult.rows[0].test_run_case_id,
          stepNumber: insertResult.rows[0].step_number,
          expectedResult: insertResult.rows[0].expected_result,
          actualResult: insertResult.rows[0].actual_result,
          status: insertResult.rows[0].status,
          evidenceFileId: insertResult.rows[0].evidence_file_id,
          executedAt: insertResult.rows[0].executed_at,
          executedBy: insertResult.rows[0].executed_by,
        };

        // Check if all steps have been executed (have results)
        const allStepsQuery = `
        SELECT
          ts.step_number,
          tsr.status as result_status
        FROM testing.test_steps ts
        LEFT JOIN testing.test_step_results tsr
          ON tsr.test_run_case_id = $1
          AND tsr.step_number = ts.step_number
        WHERE ts.test_case_id = $2
        ORDER BY ts.step_number
      `;
        const allStepsResult = await client.query(allStepsQuery, [testRunCaseId, testCaseId]);

        // Check if all steps have results (not just exist)
        const allStepsHaveResults = allStepsResult.rows.every(row =>
          row.result_status === 'pass' || row.result_status === 'fail'
        );

        if (allStepsHaveResults && allStepsResult.rows.length > 0) {
          // All steps complete - calculate overall test case result
          const hasFailure = allStepsResult.rows.some(row => row.result_status === 'fail');
          const testCaseResult = hasFailure ? 'fail' : 'pass';

          // Update test run case to complete
          await client.query(`
            UPDATE testing.test_run_cases
            SET status = 'complete',
                result = $1,
                completed_at = NOW()
            WHERE id = $2
          `, [testCaseResult, testRunCaseId]);
        } else {
          // Not all steps complete yet
          await client.query(`
            UPDATE testing.test_run_cases
            SET status = 'in_progress'
            WHERE id = $1
          `, [testRunCaseId]);
        }

        // Check if all test cases in the run are complete
        const allCasesQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'complete' THEN 1 END) as completed,
          COUNT(CASE WHEN result = 'fail' THEN 1 END) as failed
        FROM testing.test_run_cases
        WHERE test_run_id = $1
      `;
        const allCasesResult = await client.query(allCasesQuery, [runId]);
        const { total, completed, failed } = allCasesResult.rows[0];

        if (parseInt(total) === parseInt(completed) && parseInt(total) > 0) {
          // All test cases complete - calculate overall result
          const overallResult = parseInt(failed) > 0 ? 'fail' : 'pass';

          // Update test run to complete
          await client.query(`
            UPDATE testing.test_runs
            SET status = 'complete',
                overall_result = $1
            WHERE id = $2
          `, [overallResult, runId]);
        }

        // Get the user's full name for the step result
        const userQuery = `SELECT full_name FROM users WHERE id = $1`;
        const userResult = await pool.query(userQuery, [userId]);
        const executedByName = userResult.rows[0]?.full_name || null;

        // Add executedByName to the saved step result
        const stepResultWithUser = {
          ...savedStepResult,
          executedByName,
        };

        await client.query("COMMIT");

        const testRunCaseQuery = `
        SELECT
          trc.id,
          trc.test_run_id as "testRunId",
          trc.test_case_id as "testCaseId",
          trc.status,
          trc.result,
          trc.started_at as "startedAt",
          trc.completed_at as "completedAt",
          trc.executed_by as "executedBy",
          u.full_name as "executedByName"
        FROM testing.test_run_cases trc
        LEFT JOIN users u ON trc.executed_by = u.id
        WHERE trc.id = $1
      `;
        const testRunCaseResult = await pool.query(testRunCaseQuery, [
          testRunCaseId,
        ]);

        const response = {
          success: true,
          stepResult: stepResultWithUser,
          testRunCase: testRunCaseResult.rows[0],
        };

        res.json(response);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating step result:", error);
      return internalServerError(res, "Failed to update step result");
    }
  },
);

// POST /api/test-runs/:run_id/test-cases/:test_case_id/steps/:step_number/upload - Upload evidence
router.post(
  "/test-runs/:runId/test-cases/:testCaseId/steps/:stepNumber/upload",
  authenticateToken,
  upload.single("file"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return badRequest(res, "No file uploaded");
      }

      const userId = req.user?.userId;

      // Calculate file checksum
      const fileBuffer = fs.readFileSync(req.file.path);
      const checksum = crypto
        .createHash("sha256")
        .update(fileBuffer)
        .digest("hex");

      // Save evidence file record
      const query = `
      INSERT INTO testing.evidence_files
      (file_name, file_path, file_size, mime_type, uploaded_by, checksum)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

      const result = await pool.query(query, [
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        userId,
        checksum,
      ]);

      // Fetch with user info
      const completeQuery = `
      SELECT
        ef.id,
        ef.file_name as "fileName",
        ef.file_path as "filePath",
        ef.file_size as "fileSize",
        ef.mime_type as "mimeType",
        ef.uploaded_by as "uploadedBy",
        u.full_name as "uploadedByName",
        ef.uploaded_at as "uploadedAt",
        ef.checksum
      FROM testing.evidence_files ef
      LEFT JOIN users u ON ef.uploaded_by = u.id
      WHERE ef.id = $1
    `;
      const completeResult = await pool.query(completeQuery, [
        result.rows[0].id,
      ]);

      res.json({
        success: true,
        evidenceFile: completeResult.rows[0],
      });
    } catch (error) {
      console.error("Error uploading evidence:", error);
      return internalServerError(res, "Failed to upload evidence");
    }
  },
);

// GET /api/evidence/:file_id - Download evidence file
router.get(
  "/evidence/:fileId",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fileId } = req.params;

      const query = `
      SELECT file_name, file_path, mime_type
      FROM testing.evidence_files
      WHERE id = $1
    `;
      const result = await pool.query(query, [fileId]);

      if (result.rows.length === 0) {
        return notFound(res, "File not found");
      }

      const { file_name, file_path, mime_type } = result.rows[0];

      if (!fs.existsSync(file_path)) {
        return notFound(res, "File not found on disk");
      }

      res.setHeader("Content-Type", mime_type);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${file_name}"`,
      );

      const fileStream = fs.createReadStream(file_path);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading evidence:", error);
      return internalServerError(res, "Failed to download evidence");
    }
  },
);

// GET /api/requirements/:req_id/test-coverage - Get test coverage for requirement
router.get(
  "/requirements/:reqId/test-coverage",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reqId } = req.params;

      // Get test cases linked to requirement
      const testCasesQuery = `
      SELECT
        tc.id,
        tc.title,
        tc.description,
        tc.status,
        tc.revision,
        tc.created_at as "createdAt",
        tc.created_by as "createdBy",
        u1.full_name as "createdByName",
        tc.last_modified as "lastModified",
        tc.modified_by as "modifiedBy",
        u3.full_name as "modifiedByName",
        tc.approved_at as "approvedAt",
        tc.approved_by as "approvedBy",
        u2.full_name as "approvedByName"
      FROM traces rtl
      JOIN testing.test_cases tc ON rtl.to_requirement_id = tc.id
      LEFT JOIN users u1 ON tc.created_by = u1.id
      LEFT JOIN users u2 ON tc.approved_by = u2.id
      LEFT JOIN users u3 ON tc.modified_by = u3.id
      WHERE rtl.from_requirement_id = $1 AND rtl.to_requirement_id LIKE 'TC-%' AND tc.deleted_at IS NULL
      ORDER BY tc.id
    `;
      const testCasesResult = await pool.query(testCasesQuery, [reqId]);

      // Get latest test results for each test case
      const latestResults = [];
      for (const testCase of testCasesResult.rows) {
        const resultQuery = `
        SELECT
          trc.result,
          trc.completed_at as "executedAt",
          tr.id as "testRunId",
          tr.name as "testRunName"
        FROM testing.test_run_cases trc
        JOIN testing.test_runs tr ON trc.test_run_id = tr.id
        WHERE trc.test_case_id = $1 AND trc.status = 'complete'
        ORDER BY trc.completed_at DESC
        LIMIT 1
      `;
        const resultResult = await pool.query(resultQuery, [testCase.id]);

        if (resultResult.rows.length > 0) {
          latestResults.push({
            testCase,
            testRun: {
              id: resultResult.rows[0].testRunId,
              name: resultResult.rows[0].testRunName,
            },
            result: resultResult.rows[0].result,
            executedAt: resultResult.rows[0].executedAt,
          });
        }
      }

      // Calculate coverage statistics
      const totalTests = testCasesResult.rows.length;
      const passedTests = latestResults.filter(r => r.result === 'pass').length;
      const failedTests = latestResults.filter(r => r.result === 'fail').length;
      const pendingTests = totalTests - latestResults.length;

      res.json({
        success: true,
        requirementId: reqId,
        testCases: testCasesResult.rows,
        latestResults,
        coverageStats: {
          totalTests,
          passedTests,
          failedTests,
          pendingTests,
          coveragePercentage: totalTests > 0 ? Math.round((latestResults.length / totalTests) * 100) : 0
        }
      });
    } catch (error) {
      console.error("Error fetching test coverage:", error);
      return internalServerError(res, "Failed to fetch test coverage");
    }
  },
);

// GET /api/test-cases/:test_case_id/results - Get all results for a test case
router.get(
  "/test-cases/:testCaseId/results",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { testCaseId } = req.params;

      // Get test case
      const testCaseQuery = `
      SELECT
        tc.id,
        tc.title,
        tc.description,
        tc.status,
        tc.revision,
        tc.created_at as "createdAt",
        tc.created_by as "createdBy",
        u1.full_name as "createdByName",
        tc.last_modified as "lastModified",
        tc.modified_by as "modifiedBy",
        u3.full_name as "modifiedByName",
        tc.approved_at as "approvedAt",
        tc.approved_by as "approvedBy",
        u2.full_name as "approvedByName"
      FROM testing.test_cases tc
      LEFT JOIN users u1 ON tc.created_by = u1.id
      LEFT JOIN users u2 ON tc.approved_by = u2.id
      LEFT JOIN users u3 ON tc.modified_by = u3.id
      WHERE tc.id = $1
    `;
      const testCaseResult = await pool.query(testCaseQuery, [testCaseId]);

      if (testCaseResult.rows.length === 0) {
        return notFound(res, "Test case not found");
      }

      // Get all executions
      const executionsQuery = `
      SELECT
        trc.id as "testRunCaseId",
        trc.status,
        trc.result,
        trc.started_at as "startedAt",
        trc.completed_at as "completedAt",
        trc.executed_by as "executedBy",
        u.full_name as "executedByName",
        tr.id as "testRunId",
        tr.name as "testRunName",
        tr.status as "testRunStatus"
      FROM testing.test_run_cases trc
      JOIN testing.test_runs tr ON trc.test_run_id = tr.id
      LEFT JOIN users u ON trc.executed_by = u.id
      WHERE trc.test_case_id = $1
      ORDER BY trc.started_at DESC
    `;
      const executionsResult = await pool.query(executionsQuery, [testCaseId]);

      // Get step results for each execution
      const executions = [];
      for (const execution of executionsResult.rows) {
        const stepResultsQuery = `
        SELECT
          tsr.id,
          tsr.step_number as "stepNumber",
          tsr.expected_result as "expectedResult",
          tsr.actual_result as "actualResult",
          tsr.status,
          tsr.evidence_file_id as "evidenceFileId",
          tsr.executed_at as "executedAt",
          tsr.executed_by as "executedBy",
          u.full_name as "executedByName"
        FROM testing.test_step_results tsr
        LEFT JOIN users u ON tsr.executed_by = u.id
        WHERE tsr.test_run_case_id = $1
        ORDER BY tsr.step_number
      `;
        const stepResultsResult = await pool.query(stepResultsQuery, [
          execution.testRunCaseId,
        ]);

        executions.push({
          testRun: {
            id: execution.testRunId,
            name: execution.testRunName,
            status: execution.testRunStatus,
          },
          testRunCase: {
            id: execution.testRunCaseId,
            status: execution.status,
            result: execution.result,
            startedAt: execution.startedAt,
            completedAt: execution.completedAt,
            executedBy: execution.executedBy,
            executedByName: execution.executedByName,
          },
          stepResults: stepResultsResult.rows,
        });
      }

      // Transform executions into the expected format
      const results = executions.map(exec => ({
        testRunId: exec.testRun.id,
        testRunName: exec.testRun.name,
        testRunStatus: exec.testRun.status,
        result: exec.testRunCase.result,
        executedAt: exec.testRunCase.completedAt || exec.testRunCase.startedAt,
        executedBy: exec.testRunCase.executedBy,
        executedByName: exec.testRunCase.executedByName
      }));

      res.json({
        success: true,
        testCaseId,
        testCase: testCaseResult.rows[0],
        results,
        executions,
      });
    } catch (error) {
      console.error("Error fetching test case results:", error);
      return internalServerError(res, "Failed to fetch test case results");
    }
  },
);

// // POST /api/test-cases - Create a new test case
// // COMMENTED OUT: This is now handled in testCases.ts
// /*
// router.post(
//   "/test-cases",
//   authenticateToken,
//   async (req: AuthenticatedRequest, res: Response) => {
//     try {
//       const { title, description, steps, linkedRequirements } = req.body;
//       const userId = req.user?.userId;
// 
//       if (
//         !title ||
//         !description ||
//         !steps ||
//         !Array.isArray(steps) ||
//         steps.length === 0
//       ) {
//         return res
//           .status(400)
//           .json({ error: "Title, description, and steps are required" });
//       }
// 
//       // Generate test case ID
//       const idQuery = "SELECT 'TC-' || nextval('test_case_seq') as id";
//       const idResult = await pool.query(idQuery);
//       const testCaseId = idResult.rows[0].id;
// 
//       // Begin transaction
//       await pool.query("BEGIN");
// 
//       try {
//         // Create test case
//         const insertCaseQuery = `
//         INSERT INTO testing.test_cases (id, title, description, status, revision, created_by)
//         VALUES ($1, $2, $3, 'draft', 0, $4)
//         RETURNING *
//       `;
//         await pool.query(insertCaseQuery, [
//           testCaseId,
//           title,
//           description,
//           userId,
//         ]);
// 
//         // Create test steps
//         const testSteps = [];
//         for (let i = 0; i < steps.length; i++) {
//           const step = steps[i];
//           const insertStepQuery = `
//           INSERT INTO testing.test_steps (test_case_id, step_number, action, expected_result)
//           VALUES ($1, $2, $3, $4)
//           RETURNING *
//         `;
//           await pool.query(insertStepQuery, [
//             testCaseId,
//             i + 1,
//             step.action,
//             step.expectedResult,
//           ]);
//           testSteps.push({
//             stepNumber: i + 1,
//             action: step.action,
//             expectedResult: step.expectedResult,
//           });
//         }
// 
//         // Link to requirements if provided using traces table
//         if (linkedRequirements && Array.isArray(linkedRequirements)) {
//           for (const reqId of linkedRequirements) {
//             const linkQuery = `
//             INSERT INTO traces (from_requirement_id, to_requirement_id, from_type, to_type, created_by)
//             VALUES ($1, $2, 'system', 'testcase', $3)
//             ON CONFLICT (from_requirement_id, to_requirement_id, from_type, to_type) DO NOTHING
//           `;
//             await pool.query(linkQuery, [reqId, testCaseId, userId]);
//           }
//         }
// 
//         await pool.query("COMMIT");
// 
//         // Fetch complete test case data
//         const completeQuery = `
//         SELECT
//           tc.id,
//           tc.title,
//           tc.description,
//           tc.status,
//           tc.revision,
//           tc.created_at as "createdAt",
//           tc.created_by as "createdBy",
//           u.full_name as "createdByName",
//           tc.last_modified as "lastModified",
//           tc.modified_by as "modifiedBy",
//           u2.full_name as "modifiedByName",
//           tc.approved_at as "approvedAt",
//           tc.approved_by as "approvedBy",
//           u3.full_name as "approvedByName"
//         FROM testing.test_cases tc
//         LEFT JOIN users u ON tc.created_by = u.id
//         LEFT JOIN users u2 ON tc.modified_by = u2.id
//         LEFT JOIN users u3 ON tc.approved_by = u3.id
//         WHERE tc.id = $1
//       `;
//         const completeResult = await pool.query(completeQuery, [testCaseId]);
// 
//         res.json({
//           success: true,
//           testCase: completeResult.rows[0],
//           testSteps,
//         });
//       } catch (error) {
//         await pool.query("ROLLBACK");
//         throw error;
//       }
//     } catch (error) {
//       console.error("Error creating test case:", error);
//       return internalServerError(res, "Failed to create test case");
//     }
//   },
// );
// */
// 
// // PATCH /api/test-cases/:test_case_id - Update a test case
// // COMMENTED OUT: This is now handled in testCases.ts
// /*
// router.patch(
//   "/test-cases/:testCaseId",
//   authenticateToken,
//   async (req: AuthenticatedRequest, res: Response) => {
//     try {
//       const { testCaseId } = req.params;
//       const { title, description, steps, linkedRequirements, password } =
//         req.body;
//       const userId = req.user?.userId || req.user?.id;
// 
//       // Check if at least one field is being updated
//       if (!title && !description && !steps && !linkedRequirements) {
//         return res.status(400).json({
//           error: "At least one field must be provided for update",
//         });
//       }
// 
//       // Validate steps if provided
//       if (steps !== undefined) {
//         if (!Array.isArray(steps) || steps.length === 0) {
//           return res.status(400).json({
//             error: "Steps must be a non-empty array",
//           });
//         }
//         for (const step of steps) {
//           if (!step.action || !step.expectedResult) {
//             return res.status(400).json({
//               error: "Each step must have an action and expected result",
//             });
//           }
//         }
//       }
// 
//       // Check if test case exists and get its status
//       const checkQuery =
//         "SELECT status, revision FROM testing.test_cases WHERE id = $1 AND deleted_at IS NULL";
//       const checkResult = await pool.query(checkQuery, [testCaseId]);
// 
//       if (checkResult.rows.length === 0) {
//         return notFound(res, "Test case not found");
//       }
// 
//       const currentStatus = checkResult.rows[0].status;
//       const currentRevision = checkResult.rows[0].revision;
// 
//       // If test case is approved, require password to revert to draft
//       if (currentStatus === "approved") {
//         if (!password) {
//           return res
//             .status(400)
//             .json({ error: "Password required to edit approved test case" });
//         }
// 
//         // Verify password
//         const userQuery = "SELECT password_hash FROM users WHERE id = $1";
//         const userResult = await pool.query(userQuery, [userId]);
// 
//         if (userResult.rows.length === 0) {
//           return unauthorized(res, "User not found");
//         }
// 
//         console.log("Debug: Checking password for user:", userId);
//         console.log(
//           "Debug: Password hash exists:",
//           !!userResult.rows[0].password_hash,
//         );
//         console.log("Debug: Password provided:", !!password);
// 
//         const isValidPassword = await bcrypt.compare(
//           password,
//           userResult.rows[0].password_hash,
//         );
// 
//         console.log("Debug: Password validation result:", isValidPassword);
// 
//         if (!isValidPassword) {
//           return unauthorized(res, "Invalid password");
//         }
//       }
// 
//       // Begin transaction
//       await pool.query("BEGIN");
// 
//       try {
//         // Build dynamic update query
//         const updates: string[] = [];
//         const values: any[] = [];
//         let paramCount = 0;
// 
//         if (title !== undefined) {
//           paramCount++;
//           updates.push(`title = $${paramCount}`);
//           values.push(title);
//         }
// 
//         if (description !== undefined) {
//           paramCount++;
//           updates.push(`description = $${paramCount}`);
//           values.push(description);
//         }
// 
//         // Always update modification tracking
//         paramCount++;
//         updates.push(`last_modified = $${paramCount}`);
//         values.push(new Date());
// 
//         paramCount++;
//         updates.push(`modified_by = $${paramCount}`);
//         values.push(userId);
// 
//         // If was approved, revert to draft
//         if (currentStatus === "approved") {
//           updates.push(`status = 'draft'`);
//           updates.push(`approved_at = NULL`);
//           updates.push(`approved_by = NULL`);
//           paramCount++;
//           updates.push(`revision = $${paramCount}`);
//           values.push(currentRevision + 1);
//         }
// 
//         paramCount++;
//         values.push(testCaseId);
// 
//         const updateQuery = `
//           UPDATE testing.test_cases
//           SET ${updates.join(", ")}
//           WHERE id = $${paramCount}
//           RETURNING *
//         `;
//         await pool.query(updateQuery, values);
// 
//         // Update steps if provided
//         if (steps !== undefined) {
//           // Delete existing test steps
//           await pool.query(
//             "DELETE FROM testing.test_steps WHERE test_case_id = $1",
//             [testCaseId],
//           );
// 
//           // Insert new test steps
//           for (let i = 0; i < steps.length; i++) {
//             const stepQuery = `
//             INSERT INTO testing.test_steps (test_case_id, step_number, action, expected_result)
//             VALUES ($1, $2, $3, $4)
//           `;
//             await pool.query(stepQuery, [
//               testCaseId,
//               i + 1,
//               steps[i].action,
//               steps[i].expectedResult,
//             ]);
//           }
//         }
// 
//         // Update linked requirements if provided using traces table
//         if (linkedRequirements && Array.isArray(linkedRequirements)) {
//           // Delete existing links
//           await pool.query(
//             "DELETE FROM traces WHERE to_requirement_id = $1 AND from_type = 'system' AND to_type = 'testcase'",
//             [testCaseId],
//           );
// 
//           // Insert new links
//           for (const reqId of linkedRequirements) {
//             const linkQuery = `
//             INSERT INTO traces (from_requirement_id, to_requirement_id, from_type, to_type, created_by)
//             VALUES ($1, $2, 'system', 'testcase', $3)
//             ON CONFLICT (from_requirement_id, to_requirement_id, from_type, to_type) DO NOTHING
//           `;
//             await pool.query(linkQuery, [reqId, testCaseId, userId]);
//           }
//         }
// 
//         await pool.query("COMMIT");
// 
//         // Fetch updated test case with steps
//         const fetchQuery = `
//         SELECT
//           tc.id,
//           tc.title,
//           tc.description,
//           tc.status,
//           tc.revision,
//           tc.created_at as "createdAt",
//           tc.created_by as "createdBy",
//           u.full_name as "createdByName",
//           tc.last_modified as "lastModified",
//           tc.modified_by as "modifiedBy",
//           u2.full_name as "modifiedByName",
//           tc.approved_at as "approvedAt",
//           tc.approved_by as "approvedBy",
//           u3.full_name as "approvedByName"
//         FROM testing.test_cases tc
//         LEFT JOIN users u ON tc.created_by = u.id
//         LEFT JOIN users u2 ON tc.modified_by = u2.id
//         LEFT JOIN users u3 ON tc.approved_by = u3.id
//         WHERE tc.id = $1
//       `;
//         const fetchResult = await pool.query(fetchQuery, [testCaseId]);
// 
//         // Get test steps
//         const stepsQuery = `
//         SELECT
//           id,
//           step_number as "stepNumber",
//           action,
//           expected_result as "expectedResult"
//         FROM testing.test_steps
//         WHERE test_case_id = $1
//         ORDER BY step_number
//       `;
//         const stepsResult = await pool.query(stepsQuery, [testCaseId]);
// 
//         res.json({
//           success: true,
//           testCase: fetchResult.rows[0],
//           steps: stepsResult.rows,
//         });
//       } catch (error) {
//         await pool.query("ROLLBACK");
//         throw error;
//       }
//     } catch (error) {
//       console.error("Error updating test case:", error);
//       return internalServerError(res, "Failed to update test case");
//     }
//   },
// );
// */
// 
// // PUT /api/test-cases/:test_case_id/approve - Approve a test case
// // COMMENTED OUT: This is now handled in testCases.ts
// /*
// router.put(
//   "/test-cases/:testCaseId/approve",
//   authenticateToken,
//   async (req: AuthenticatedRequest, res: Response) => {
//     try {
//       const { testCaseId } = req.params;
//       const { password } = req.body;
//       const userId = req.user?.userId;
// 
//       if (!password) {
//         return res
//           .status(400)
//           .json({ error: "Password confirmation required" });
//       }
// 
//       // Verify password
//       const userQuery = "SELECT password_hash FROM users WHERE id = $1";
//       const userResult = await pool.query(userQuery, [userId]);
// 
//       if (userResult.rows.length === 0) {
//         return unauthorized(res, "User not found");
//       }
// 
//       const isValidPassword = await bcrypt.compare(
//         password,
//         userResult.rows[0].password_hash,
//       );
//       if (!isValidPassword) {
//         return unauthorized(res, "Invalid password");
//       }
// 
//       // Check test case exists
//       const caseQuery = "SELECT status FROM testing.test_cases WHERE id = $1 AND deleted_at IS NULL";
//       const caseResult = await pool.query(caseQuery, [testCaseId]);
// 
//       if (caseResult.rows.length === 0) {
//         return notFound(res, "Test case not found");
//       }
// 
//       if (caseResult.rows[0].status === "approved") {
//         return badRequest(res, "Test case is already approved");
//       }
// 
//       // Update test case
//       const updateQuery = `
//       UPDATE testing.test_cases
//       SET status = 'approved', approved_at = NOW(), approved_by = $1, revision = revision + 1
//       WHERE id = $2
//       RETURNING *
//     `;
//       await pool.query(updateQuery, [userId, testCaseId]);
// 
//       // Fetch complete data
//       const completeQuery = `
//       SELECT
//         tc.id,
//         tc.title,
//         tc.description,
//         tc.status,
//         tc.revision,
//         tc.created_at as "createdAt",
//         tc.created_by as "createdBy",
//         u1.full_name as "createdByName",
//         tc.last_modified as "lastModified",
//         tc.modified_by as "modifiedBy",
//         u3.full_name as "modifiedByName",
//         tc.approved_at as "approvedAt",
//         tc.approved_by as "approvedBy",
//         u2.full_name as "approvedByName"
//       FROM testing.test_cases tc
//       LEFT JOIN users u1 ON tc.created_by = u1.id
//       LEFT JOIN users u2 ON tc.approved_by = u2.id
//       LEFT JOIN users u3 ON tc.modified_by = u3.id
//       WHERE tc.id = $1
//     `;
//       const completeResult = await pool.query(completeQuery, [testCaseId]);
// 
//       res.json({
//         success: true,
//         testCase: completeResult.rows[0],
//       });
//     } catch (error) {
//       console.error("Error approving test case:", error);
//       return internalServerError(res, "Failed to approve test case");
//     }
//   },
// );
//
// // DELETE /api/test-cases/:test_case_id - Delete a test case
// COMMENTED OUT: This is now handled in testCases.ts
/*
router.delete(
  "/test-cases/:testCaseId",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
     try {
       const { testCaseId } = req.params;
 
       // Check if test case exists
       const checkQuery = `
       SELECT status FROM testing.test_cases WHERE id = $1 AND deleted_at IS NULL
     `;
       const checkResult = await pool.query(checkQuery, [testCaseId]);
 
       if (checkResult.rows.length === 0) {
         return notFound(res, "Test case not found");
       }
 
       // Allow soft deletion of any test case
       const userId = req.user?.userId || req.user?.id;
 
       // Check if test case is used in any test runs
       const runCheckQuery = `
       SELECT COUNT(*) as count
       FROM testing.test_run_cases
       WHERE test_case_id = $1
     `;
       const runCheckResult = await pool.query(runCheckQuery, [testCaseId]);
 
       if (parseInt(runCheckResult.rows[0].count) > 0) {
         return badRequest(res, "Cannot delete test case that is used in test runs");
       }
 
       // Perform soft delete
       const deleteQuery = `
         UPDATE testing.test_cases
         SET deleted_at = NOW(),
             last_modified = NOW(),
             modified_by = $1
         WHERE id = $2 AND deleted_at IS NULL
         RETURNING id
       `;
 
       const result = await pool.query(deleteQuery, [userId, testCaseId]);
 
       if (result.rows.length === 0) {
         return notFound(res, "Test case not found or already deleted");
       }
 
       res.json({
         success: true,
         message: "Test case deleted successfully",
       });
     } catch (error) {
       console.error("Error deleting test case:", error);
       return internalServerError(res, "Failed to delete test case");
    }
  },
);
*/

export default router;
