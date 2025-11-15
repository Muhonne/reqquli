import { Router, Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { getPool } from '../config/database';
import {
  badRequest,
  notFound,
  conflict,
  unprocessableEntity,
  internalServerError
} from '../utils/responses';
import { getRequirementType, validateRequirementExists } from '../utils/traceUtils';

const router = Router();

// Helper function to build a query that joins all possible requirement tables
// Returns title, description, status, and last_modified for a requirement ID
function buildRequirementDetailsQuery(alias: string, _idColumn: string): string {
  return `
    COALESCE(
      NULLIF(ur_${alias}.title, ''),
      NULLIF(sr_${alias}.title, ''),
      NULLIF(tc_${alias}.title, ''),
      NULLIF(rr_${alias}.title, ''),
      'Test Result: ' || tr_${alias}.result || ' - ' || trun_${alias}.name
    ) as title_${alias},
    COALESCE(
      NULLIF(ur_${alias}.description, ''),
      NULLIF(sr_${alias}.description, ''),
      NULLIF(tc_${alias}.description, ''),
      NULLIF(rr_${alias}.description, ''),
      'Result from test run ' || tr_${alias}.test_run_id
    ) as description_${alias},
    COALESCE(
      ur_${alias}.status,
      sr_${alias}.status,
      tc_${alias}.status,
      rr_${alias}.status,
      tr_${alias}.result
    ) as status_${alias},
    COALESCE(
      ur_${alias}.last_modified,
      sr_${alias}.last_modified,
      tc_${alias}.last_modified,
      rr_${alias}.last_modified,
      tr_${alias}.executed_at
    ) as last_modified_${alias}
  `;
}

// Get all traces in the system
router.get('/traces', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const pool = getPool();

    const query = `
      SELECT
        t.id,
        t.from_requirement_id as "fromId",
        t.to_requirement_id as "toId",
        t.created_at as "createdAt",
        t.is_system_generated as "isSystemGenerated",
        u.full_name as "createdByName",
        ${buildRequirementDetailsQuery('from', 't.from_requirement_id')},
        ${buildRequirementDetailsQuery('to', 't.to_requirement_id')}
      FROM traces t
      LEFT JOIN users u ON t.created_by = u.id
      -- Join for from requirements (all possible types)
      LEFT JOIN user_requirements ur_from ON t.from_requirement_id = ur_from.id
      LEFT JOIN system_requirements sr_from ON t.from_requirement_id = sr_from.id
      LEFT JOIN testing.test_cases tc_from ON t.from_requirement_id = tc_from.id
      LEFT JOIN risk_records rr_from ON t.from_requirement_id = rr_from.id
      LEFT JOIN testing.test_results tr_from ON t.from_requirement_id = tr_from.id
      LEFT JOIN testing.test_runs trun_from ON tr_from.test_run_id = trun_from.id
      -- Join for to requirements (all possible types)
      LEFT JOIN user_requirements ur_to ON t.to_requirement_id = ur_to.id
      LEFT JOIN system_requirements sr_to ON t.to_requirement_id = sr_to.id
      LEFT JOIN testing.test_cases tc_to ON t.to_requirement_id = tc_to.id
      LEFT JOIN risk_records rr_to ON t.to_requirement_id = rr_to.id
      LEFT JOIN testing.test_results tr_to ON t.to_requirement_id = tr_to.id
      LEFT JOIN testing.test_runs trun_to ON tr_to.test_run_id = trun_to.id
      WHERE
        -- Exclude traces where from requirement is deleted (test results don't have deleted_at)
        (
          (ur_from.id IS NULL OR ur_from.deleted_at IS NULL) AND
          (sr_from.id IS NULL OR sr_from.deleted_at IS NULL) AND
          (tc_from.id IS NULL OR tc_from.deleted_at IS NULL) AND
          (rr_from.id IS NULL OR rr_from.deleted_at IS NULL) AND
          (tr_from.id IS NOT NULL OR ur_from.id IS NOT NULL OR sr_from.id IS NOT NULL OR tc_from.id IS NOT NULL OR rr_from.id IS NOT NULL)
        ) AND
        -- Exclude traces where to requirement is deleted
        (
          (ur_to.id IS NULL OR ur_to.deleted_at IS NULL) AND
          (sr_to.id IS NULL OR sr_to.deleted_at IS NULL) AND
          (tc_to.id IS NULL OR tc_to.deleted_at IS NULL) AND
          (rr_to.id IS NULL OR rr_to.deleted_at IS NULL) AND
          (tr_to.id IS NOT NULL OR ur_to.id IS NOT NULL OR sr_to.id IS NOT NULL OR tc_to.id IS NOT NULL OR rr_to.id IS NOT NULL)
        )
      ORDER BY t.created_at DESC
    `;

    const result = await pool.query(query);

    // Add type information based on ID prefixes
    const traces = result.rows.map(row => ({
      id: row.id,
      fromId: row.fromId,
      toId: row.toId,
      fromType: getRequirementType(row.fromId),
      toType: getRequirementType(row.toId),
      createdAt: row.createdAt,
      isSystemGenerated: row.isSystemGenerated,
      createdByName: row.createdByName,
      fromTitle: row.title_from,
      fromStatus: row.status_from,
      toTitle: row.title_to,
      toStatus: row.status_to
    }));

    res.json({
      success: true,
      traces
    });
  } catch (error) {
    console.error('Error fetching all traces:', error);
    return internalServerError(res, "Failed to fetch traces");
  }
});

// Get all traces for a requirement (both upstream and downstream)
router.get('/requirements/:id/traces', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Validate that the requirement exists
    const exists = await validateRequirementExists(pool, id);
    if (!exists) {
      return notFound(res, "Requirement not found");
    }
    
    // Get upstream traces (items that trace TO this requirement)
    const upstreamQuery = `
      SELECT
        rt.id as trace_id,
        rt.from_requirement_id AS id,
        rt.is_system_generated as "isSystemGenerated",
        ${buildRequirementDetailsQuery('item', 'rt.from_requirement_id')},
        tr_item.executed_at,
        tr_item.test_run_id
      FROM traces rt
      LEFT JOIN user_requirements ur_item ON rt.from_requirement_id = ur_item.id
      LEFT JOIN system_requirements sr_item ON rt.from_requirement_id = sr_item.id
      LEFT JOIN testing.test_cases tc_item ON rt.from_requirement_id = tc_item.id
      LEFT JOIN testing.test_results tr_item ON rt.from_requirement_id = tr_item.id
      LEFT JOIN testing.test_runs trun_item ON tr_item.test_run_id = trun_item.id
      LEFT JOIN risk_records rr_item ON rt.from_requirement_id = rr_item.id
      WHERE rt.to_requirement_id = $1
      AND (
        (ur_item.id IS NULL OR ur_item.deleted_at IS NULL) AND
        (sr_item.id IS NULL OR sr_item.deleted_at IS NULL) AND
        (tc_item.id IS NULL OR tc_item.deleted_at IS NULL) AND
        (rr_item.id IS NULL OR rr_item.deleted_at IS NULL) AND
        (tr_item.id IS NOT NULL OR ur_item.id IS NOT NULL OR sr_item.id IS NOT NULL OR tc_item.id IS NOT NULL OR rr_item.id IS NOT NULL)
      )
      ORDER BY last_modified_item DESC NULLS LAST
    `;
    
    // Get downstream traces (items that trace FROM this requirement)
    const downstreamQuery = `
      SELECT
        rt.id as trace_id,
        rt.to_requirement_id AS id,
        ${buildRequirementDetailsQuery('item', 'rt.to_requirement_id')}
      FROM traces rt
      LEFT JOIN user_requirements ur_item ON rt.to_requirement_id = ur_item.id
      LEFT JOIN system_requirements sr_item ON rt.to_requirement_id = sr_item.id
      LEFT JOIN testing.test_cases tc_item ON rt.to_requirement_id = tc_item.id
      LEFT JOIN testing.test_results tr_item ON rt.to_requirement_id = tr_item.id
      LEFT JOIN testing.test_runs trun_item ON tr_item.test_run_id = trun_item.id
      LEFT JOIN risk_records rr_item ON rt.to_requirement_id = rr_item.id
      WHERE rt.from_requirement_id = $1
      AND (
        (ur_item.id IS NULL OR ur_item.deleted_at IS NULL) AND
        (sr_item.id IS NULL OR sr_item.deleted_at IS NULL) AND
        (tc_item.id IS NULL OR tc_item.deleted_at IS NULL) AND
        (rr_item.id IS NULL OR rr_item.deleted_at IS NULL) AND
        (tr_item.id IS NOT NULL OR ur_item.id IS NOT NULL OR sr_item.id IS NOT NULL OR tc_item.id IS NOT NULL OR rr_item.id IS NOT NULL)
      )
      ORDER BY last_modified_item DESC NULLS LAST
    `;
    
    const [upstreamResult, downstreamResult] = await Promise.all([
      pool.query(upstreamQuery, [id]),
      pool.query(downstreamQuery, [id])
    ]);
    
    const upstreamTraces = upstreamResult.rows.map(row => {
      const type = getRequirementType(row.id);
      return {
        id: row.id,
        title: row.title_item,
        description: row.description_item,
        status: row.status_item,
        type,
        isSystemGenerated: row.isSystemGenerated,
        executedAt: row.executed_at,
        testRunId: row.test_run_id
      };
    });

    const downstreamTraces = downstreamResult.rows.map(row => {
      const type = getRequirementType(row.id);
      return {
        id: row.id,
        title: row.title_item,
        description: row.description_item,
        status: row.status_item,
        type
      };
    });
    
    res.json({
      success: true,
      upstreamTraces,
      downstreamTraces
    });
    
  } catch (error) {
    console.error('Error fetching requirement traces:', error);
    return internalServerError(res, "Failed to fetch requirement traces");
  }
});

// Create a new trace relationship
router.post('/traces', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fromId, toId } = req.body;
    const userId = req.user?.id || '';

    // Validate input
    if (!fromId || !toId) {
      return unprocessableEntity(res, "fromId and toId are required");
    }

    // Determine types from ID prefixes
    const fromType = getRequirementType(fromId);
    const toType = getRequirementType(toId);

    // Prevent manual creation of testresult traces
    if (fromType === 'testresult' || toType === 'testresult') {
      return badRequest(res, "Test result traces cannot be created manually. They are generated automatically when test runs are approved.");
    }

    const pool = getPool();
    
    // Validate items exist and are not deleted
    const [fromExists, toExists] = await Promise.all([
      validateRequirementExists(pool, fromId),
      validateRequirementExists(pool, toId)
    ]);

    if (!fromExists) {
      return notFound(res, `Source requirement not found`);
    }

    if (!toExists) {
      return notFound(res, `Target requirement not found`);
    }
    
    // Create trace relationship
    const insertQuery = `
      INSERT INTO traces (
        from_requirement_id, to_requirement_id, created_by
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (from_requirement_id, to_requirement_id) DO NOTHING
      RETURNING id,
                from_requirement_id AS "fromId",
                to_requirement_id AS "toId",
                created_at AS "createdAt",
                created_by AS "createdBy"
    `;

    const result = await pool.query(insertQuery, [
      fromId, toId, userId
    ]);
    
    if (result.rows.length === 0) {
      return conflict(res, "Trace relationship already exists");
    }
    
    res.status(201).json({
      success: true,
      trace: {
        id: result.rows[0].id,
        fromId: result.rows[0].fromId,
        toId: result.rows[0].toId,
        fromType,
        toType,
        createdAt: result.rows[0].createdAt,
        createdBy: result.rows[0].createdBy
      }
    });
    
  } catch (error) {
    console.error('Error creating trace relationship:', error);
    return internalServerError(res, "Failed to create trace relationship");
  }
});

// Delete a trace relationship
router.delete('/traces/:fromId/:toId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fromId, toId } = req.params;
    
    const deleteQuery = `
      DELETE FROM traces
      WHERE from_requirement_id = $1 AND to_requirement_id = $2
      RETURNING *
    `;
    
    const pool = getPool();
    const result = await pool.query(deleteQuery, [fromId, toId]);
    
    if (result.rows.length === 0) {
      return notFound(res, "Trace relationship not found");
    }
    
    res.json({
      success: true,
      message: 'Trace relationship deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting trace relationship:', error);
    return internalServerError(res, "Failed to delete trace relationship");
  }
});

export default router;
