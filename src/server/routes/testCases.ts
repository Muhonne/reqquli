import express, { Response } from 'express';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logAuditEvent } from '../utils/audit';
import logger from '../config/logger';
import {
  badRequest,
  unauthorized,
  notFound,
  conflict,
  unprocessableEntity,
  internalServerError,
  created
} from '../utils/responses';

const router = express.Router();
let pool: Pool;

export function initializeTestCaseRoutes(dbPool: Pool) {
  pool = dbPool;
  return router;
}

// GET /api/test-cases/:id - Fetch single test case
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const testCaseQuery = `
      SELECT
        tc.*,
        u1.full_name as created_by_name,
        u2.full_name as modified_by_name,
        u3.full_name as approved_by_name
      FROM testing.test_cases tc
      LEFT JOIN users u1 ON tc.created_by = u1.id
      LEFT JOIN users u2 ON tc.modified_by = u2.id
      LEFT JOIN users u3 ON tc.approved_by = u3.id
      WHERE tc.id = $1 AND tc.deleted_at IS NULL
    `;

    const testCaseResult = await pool.query(testCaseQuery, [id]);

    if (testCaseResult.rows.length === 0) {
      return notFound(res, "Test case not found");
    }

    const stepsQuery = `
      SELECT
        id,
        test_case_id,
        step_number,
        action as description,
        expected_result
      FROM testing.test_steps
      WHERE test_case_id = $1
      ORDER BY step_number
    `;

    const stepsResult = await pool.query(stepsQuery, [id]);

    res.json({
      success: true,
      testCase: testCaseResult.rows[0],
      steps: stepsResult.rows
    });
  } catch (error) {
    logger.error('Error fetching test case:', error);
    return internalServerError(res, "Failed to fetch test case");
  }
});

// POST /api/test-cases - Create new test case
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();

  try {
    const { title, description, steps = [], linkedRequirements = [] } = req.body;
    const userId = req.user?.userId;

    if (!title) {
      return unprocessableEntity(res, "Title is required");
    }

    await client.query('BEGIN');

    // Check for duplicate title
    const duplicateCheck = await client.query(
      'SELECT id FROM testing.test_cases WHERE title = $1 AND deleted_at IS NULL',
      [title]
    );

    if (duplicateCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return conflict(res, "Test case with this title already exists");
    }

    // Get next ID
    const idResult = await client.query(
      "SELECT 'TC-' || nextval('test_case_seq') as next_id"
    );
    const testCaseId = idResult.rows[0].next_id;

    // Create test case
    const insertQuery = `
      INSERT INTO testing.test_cases (
        id, title, description, status, revision,
        created_at, created_by
      ) VALUES (
        $1, $2, $3, 'draft', 0,
        NOW(), $4
      ) RETURNING *
    `;

    const result = await client.query(insertQuery, [
      testCaseId,
      title,
      description || '',
      userId
    ]);

    const testCase = result.rows[0];

    // Create steps if provided
    const testSteps = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepResult = await client.query(
        `INSERT INTO testing.test_steps (
          test_case_id, step_number, action,
          expected_result
        ) VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          testCaseId,
          i + 1,
          step.action || step.description || '',
          step.expectedResult || ''
        ]
      );
      testSteps.push(stepResult.rows[0]);
    }

    // Create linked requirements (traces) if provided
    for (const reqId of linkedRequirements) {
      await client.query(
        `INSERT INTO traces (
          from_requirement_id, to_requirement_id, created_by, created_at
        ) VALUES ($1, $2, $3, NOW())
        ON CONFLICT (from_requirement_id, to_requirement_id) DO NOTHING`,
        [reqId, testCaseId, userId]
      );
    }

    // Log audit event
    await logAuditEvent(
      client,
      'Testing',
      'TestCaseCreated',
      'TestCase',
      testCaseId,
      userId || '',
      {
        id: testCaseId,
        title,
        description,
        status: 'draft'
      }
    );

    await client.query('COMMIT');

    return created(res, {
      testCase,
      testSteps
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating test case:', error);
    return internalServerError(res, "Failed to create test case");
  } finally {
    client.release();
  }
});

// PATCH /api/test-cases/:id - Update test case
router.patch('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { title, description, steps } = req.body;
    const userId = req.user?.userId;

    await client.query('BEGIN');

    // Check if test case exists
    const existingQuery = `
      SELECT * FROM testing.test_cases
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const existing = await client.query(existingQuery, [id]);

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return notFound(res, "Test case not found");
    }

    const testCase = existing.rows[0];
    let newStatus = testCase.status;
    let newRevision = testCase.revision;

    // Reset to draft if approved and being edited
    if (testCase.status === 'approved') {
      newStatus = 'draft';
      newRevision = testCase.revision + 1;
    }

    // Update test case
    const updateQuery = `
      UPDATE testing.test_cases
      SET
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        status = $4,
        revision = $5,
        last_modified = NOW(),
        modified_by = $6
      WHERE id = $1
      RETURNING *
    `;

    const result = await client.query(updateQuery, [
      id,
      title,
      description,
      newStatus,
      newRevision,
      userId
    ]);

    // Update steps if provided
    if (steps) {
      // Delete existing steps
      await client.query('DELETE FROM testing.test_steps WHERE test_case_id = $1', [id]);

      // Insert new steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await client.query(
          `INSERT INTO testing.test_steps (
            test_case_id, step_number, action,
            expected_result
          ) VALUES ($1, $2, $3, $4)`,
          [
            id,
            i + 1,
            step.action || step.description || '',
            step.expectedResult || ''
          ]
        );
      }
    }

    // Log audit event
    await logAuditEvent(
      client,
      'Testing',
      'TestCaseUpdated',
      'TestCase',
      id,
      userId || '',
      {
        id,
        title: title || testCase.title,
        description: description || testCase.description
      }
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      testCase: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating test case:', error);
    return internalServerError(res, "Failed to update test case");
  } finally {
    client.release();
  }
});

// PUT /api/test-cases/:id/approve - Approve test case
router.put('/:id/approve', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { password } = req.body;
    const userId = req.user?.userId;

    if (!password) {
      return badRequest(res, "Password is required for approval");
    }

    await client.query('BEGIN');

    // Verify password
    const userQuery = `
      SELECT password_hash FROM users WHERE id = $1
    `;
    const userResult = await client.query(userQuery, [userId]);

    const bcrypt = require('bcrypt');
    const isValid = await bcrypt.compare(password, userResult.rows[0].password_hash);

    if (!isValid) {
      await client.query('ROLLBACK');
      return unauthorized(res, "Invalid password");
    }

    // Check if test case exists and is not already approved
    const existingQuery = `
      SELECT * FROM testing.test_cases
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const existing = await client.query(existingQuery, [id]);

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return notFound(res, "Test case not found");
    }

    if (existing.rows[0].status === 'approved') {
      await client.query('ROLLBACK');
      return badRequest(res, "Test case is already approved");
    }

    // Approve test case
    const updateQuery = `
      UPDATE testing.test_cases
      SET
        status = 'approved',
        approved_at = NOW(),
        approved_by = $2,
        revision = revision + 1
      WHERE id = $1
      RETURNING *
    `;

    const result = await client.query(updateQuery, [id, userId]);

    // Log audit event
    await logAuditEvent(
      client,
      'Testing',
      'TestCaseApproved',
      'TestCase',
      id,
      userId || '',
      {
        id,
        approvedBy: userId
      }
    );

    await client.query('COMMIT');

    // Format the response to include all necessary fields
    const testCase = result.rows[0];
    res.json({
      success: true,
      testCase: {
        ...testCase,
        approvedBy: testCase.approved_by,
        approvedAt: testCase.approved_at
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error approving test case:', error);
    return internalServerError(res, "Failed to approve test case");
  } finally {
    client.release();
  }
});

// DELETE /api/test-cases/:id - Delete test case
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    await client.query('BEGIN');

    // Check if test case exists
    const existingQuery = `
      SELECT * FROM testing.test_cases
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const existing = await client.query(existingQuery, [id]);

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return notFound(res, "Test case not found");
    }

    // Soft delete
    const deleteQuery = `
      UPDATE testing.test_cases
      SET
        deleted_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await client.query(deleteQuery, [id]);

    // Log audit event
    await logAuditEvent(
      client,
      'Testing',
      'TestCaseDeleted',
      'TestCase',
      id,
      userId || '',
      {
        id
      }
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Test case deleted successfully',
      testCase: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error deleting test case:', error);
    return internalServerError(res, "Failed to delete test case");
  } finally {
    client.release();
  }
});

// GET /api/test-cases/:id/traces - Get test case traces
router.get('/:id/traces', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if test case exists
    const existingQuery = `
      SELECT id FROM testing.test_cases
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const existing = await pool.query(existingQuery, [id]);

    if (existing.rows.length === 0) {
      return notFound(res, "Test case not found");
    }

    // Get upstream traces (requirements that trace TO this test case)
    // Types are determined from ID prefixes, so we join all possible source tables
    const upstreamQuery = `
      SELECT
        t.id,
        t.from_requirement_id,
        t.to_requirement_id,
        t.created_at,
        t.is_system_generated,
        COALESCE(
          NULLIF(sr.title, ''),
          NULLIF(ur.title, ''),
          NULLIF(rr.title, '')
        ) as from_title,
        tc.title as to_title,
        COALESCE(
          sr.description,
          ur.description,
          rr.description
        ) as description,
        COALESCE(
          sr.status,
          ur.status,
          rr.status
        ) as status
      FROM traces t
      LEFT JOIN system_requirements sr ON t.from_requirement_id = sr.id
      LEFT JOIN user_requirements ur ON t.from_requirement_id = ur.id
      LEFT JOIN risk_records rr ON t.from_requirement_id = rr.id
      LEFT JOIN testing.test_cases tc ON t.to_requirement_id = tc.id
      WHERE t.to_requirement_id = $1
        AND (
          (sr.id IS NULL OR sr.deleted_at IS NULL) AND
          (ur.id IS NULL OR ur.deleted_at IS NULL) AND
          (rr.id IS NULL OR rr.deleted_at IS NULL) AND
          (sr.id IS NOT NULL OR ur.id IS NOT NULL OR rr.id IS NOT NULL)
        )
      ORDER BY t.created_at DESC
    `;

    const upstreamResult = await pool.query(upstreamQuery, [id]);

    // Get downstream traces (test results that trace FROM this test case)
    const downstreamQuery = `
      SELECT
        t.id,
        t.from_requirement_id,
        t.to_requirement_id,
        t.created_at,
        t.is_system_generated,
        tc.title as from_title,
        tres.test_run_id as "testRunId",
        tr.name as "testRunName",
        tr.name as to_title,
        CONCAT('Approved on ', TO_CHAR(tr.approved_at, 'MM/DD/YYYY'), ' by ', COALESCE(u2.full_name, 'Unknown')) as description,
        tres.result,
        'testresult' as trace_type
      FROM traces t
      LEFT JOIN testing.test_cases tc ON t.from_requirement_id = tc.id
      LEFT JOIN testing.test_results tres ON t.to_requirement_id = tres.id
      LEFT JOIN testing.test_runs tr ON tres.test_run_id = tr.id
      LEFT JOIN users u2 ON tr.approved_by = u2.id
      WHERE t.from_requirement_id = $1
      ORDER BY t.created_at DESC
    `;

    const downstreamResult = await pool.query(downstreamQuery, [id]);

    res.json({
      success: true,
      upstreamTraces: upstreamResult.rows,
      downstreamTraces: downstreamResult.rows
    });
  } catch (error) {
    logger.error('Error fetching test case traces:', error);
    return internalServerError(res, "Failed to fetch test case traces");
  }
});

// GET /api/test-cases/:id/results - Get test case results
router.get('/:id/results', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if test case exists
    const testCaseQuery = `
      SELECT * FROM testing.test_cases
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const testCaseResult = await pool.query(testCaseQuery, [id]);

    if (testCaseResult.rows.length === 0) {
      return notFound(res, "Test case not found");
    }

    // Get all executions
    const executionsQuery = `
      SELECT
        trc.*,
        tr.name as test_run_name,
        tr.status as test_run_status,
        u.full_name as executed_by_name
      FROM testing.test_run_cases trc
      JOIN testing.test_runs tr ON trc.test_run_id = tr.id
      LEFT JOIN users u ON trc.executed_by = u.id
      WHERE trc.test_case_id = $1
      ORDER BY trc.started_at DESC
    `;

    const executionsResult = await pool.query(executionsQuery, [id]);

    // Get step results for each execution
    const results = await Promise.all(executionsResult.rows.map(async (execution) => {
      const stepsQuery = `
        SELECT * FROM testing.test_step_results
        WHERE test_run_case_id = $1
        ORDER BY step_number
      `;
      const stepsResult = await pool.query(stepsQuery, [execution.id]);

      return {
        testRunId: execution.test_run_id,
        testRunName: execution.test_run_name,
        testRunStatus: execution.test_run_status,
        result: execution.result,
        status: execution.status,
        executedAt: execution.completed_at || execution.started_at,
        executedBy: execution.executed_by,
        executedByName: execution.executed_by_name,
        startedAt: execution.started_at,
        completedAt: execution.completed_at,
        stepResults: stepsResult.rows
      };
    }));

    res.json({
      success: true,
      testCaseId: id,
      results: results
    });
  } catch (error) {
    logger.error('Error fetching test case results:', error);
    return internalServerError(res, "Failed to fetch test case results");
  }
});

export default router;