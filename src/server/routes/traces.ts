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

const router = Router();

// Get all traces in the system
router.get('/traces', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const pool = getPool();

    const query = `
      SELECT
        t.id,
        t.from_requirement_id as "fromId",
        t.to_requirement_id as "toId",
        t.from_type as "fromType",
        t.to_type as "toType",
        t.created_at as "createdAt",
        t.is_system_generated as "isSystemGenerated",
        u.full_name as "createdByName",
        -- From requirement details
        CASE
          WHEN t.from_type = 'user' THEN ur_from.title
          WHEN t.from_type = 'system' THEN sr_from.title
          WHEN t.from_type = 'testcase' THEN tc_from.title
          WHEN t.from_type = 'risk' THEN rr_from.title
        END as "fromTitle",
        CASE
          WHEN t.from_type = 'user' THEN ur_from.status
          WHEN t.from_type = 'system' THEN sr_from.status
          WHEN t.from_type = 'testcase' THEN tc_from.status
          WHEN t.from_type = 'risk' THEN rr_from.status
        END as "fromStatus",
        -- To requirement details
        CASE
          WHEN t.to_type = 'user' THEN ur_to.title
          WHEN t.to_type = 'system' THEN sr_to.title
          WHEN t.to_type = 'testcase' THEN tc_to.title
          WHEN t.to_type = 'risk' THEN rr_to.title
        END as "toTitle",
        CASE
          WHEN t.to_type = 'user' THEN ur_to.status
          WHEN t.to_type = 'system' THEN sr_to.status
          WHEN t.to_type = 'testcase' THEN tc_to.status
          WHEN t.to_type = 'risk' THEN rr_to.status
        END as "toStatus"
      FROM traces t
      LEFT JOIN users u ON t.created_by = u.id
      -- Join for from requirements
      LEFT JOIN user_requirements ur_from ON t.from_type = 'user' AND t.from_requirement_id = ur_from.id
      LEFT JOIN system_requirements sr_from ON t.from_type = 'system' AND t.from_requirement_id = sr_from.id
      LEFT JOIN testing.test_cases tc_from ON t.from_type = 'testcase' AND t.from_requirement_id = tc_from.id
      LEFT JOIN risk_records rr_from ON t.from_type = 'risk' AND t.from_requirement_id = rr_from.id
      -- Join for to requirements
      LEFT JOIN user_requirements ur_to ON t.to_type = 'user' AND t.to_requirement_id = ur_to.id
      LEFT JOIN system_requirements sr_to ON t.to_type = 'system' AND t.to_requirement_id = sr_to.id
      LEFT JOIN testing.test_cases tc_to ON t.to_type = 'testcase' AND t.to_requirement_id = tc_to.id
      LEFT JOIN risk_records rr_to ON t.to_type = 'risk' AND t.to_requirement_id = rr_to.id
      WHERE
        -- Exclude traces where from requirement is deleted
        (t.from_type != 'user' OR ur_from.deleted_at IS NULL) AND
        (t.from_type != 'system' OR sr_from.deleted_at IS NULL) AND
        (t.from_type != 'testcase' OR tc_from.deleted_at IS NULL) AND
        (t.from_type != 'risk' OR rr_from.deleted_at IS NULL) AND
        -- Exclude traces where to requirement is deleted
        (t.to_type != 'user' OR ur_to.deleted_at IS NULL) AND
        (t.to_type != 'system' OR sr_to.deleted_at IS NULL) AND
        (t.to_type != 'testcase' OR tc_to.deleted_at IS NULL) AND
        (t.to_type != 'risk' OR rr_to.deleted_at IS NULL)
      ORDER BY t.created_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      traces: result.rows
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
    
    // Determine requirement type from ID format
    const requirementType = id.startsWith('UR-') ? 'user' :
                           id.startsWith('TC-') ? 'testcase' :
                           id.startsWith('TRES-') ? 'testresult' :
                           id.startsWith('RISK-') ? 'risk' : 'system';

    // Validate that the requirement exists and is not deleted
    const pool = getPool();

    // Whitelist valid table names to prevent SQL injection
    const validTables: { [key: string]: string } = {
      'user': 'user_requirements',
      'system': 'system_requirements',
      'testcase': 'testing.test_cases',
      'testresult': 'testing.test_results',
      'risk': 'risk_records'
    };

    const table = validTables[requirementType];
    if (!table) {
      return unprocessableEntity(res, "Invalid requirement type");
    }

    // Test results don't have deleted_at field
    const existsQuery = requirementType === 'testresult'
      ? `SELECT id FROM ${table} WHERE id = $1`
      : `SELECT id FROM ${table} WHERE id = $1 AND deleted_at IS NULL`;
    const existsResult = await pool.query(existsQuery, [id]);

    if (existsResult.rows.length === 0) {
      return notFound(res, "Requirement not found");
    }
    
    // Get upstream traces (items that trace TO this requirement)
    const upstreamQuery = `
      SELECT
        rt.id as trace_id,
        rt.from_requirement_id AS id,
        rt.from_type AS "fromType",
        rt.is_system_generated as "isSystemGenerated",
        CASE
          WHEN rt.from_type = 'user' THEN ur.title
          WHEN rt.from_type = 'system' THEN sr.title
          WHEN rt.from_type = 'testcase' THEN tc.title
          WHEN rt.from_type = 'testresult' THEN 'Test Result: ' || tr.result || ' - ' || trun.name
          WHEN rt.from_type = 'risk' THEN rr.title
        END as title,
        CASE
          WHEN rt.from_type = 'user' THEN ur.description
          WHEN rt.from_type = 'system' THEN sr.description
          WHEN rt.from_type = 'testcase' THEN tc.description
          WHEN rt.from_type = 'testresult' THEN 'Result from test run ' || tr.test_run_id
          WHEN rt.from_type = 'risk' THEN rr.description
        END as description,
        CASE
          WHEN rt.from_type = 'user' THEN ur.status
          WHEN rt.from_type = 'system' THEN sr.status
          WHEN rt.from_type = 'testcase' THEN tc.status
          WHEN rt.from_type = 'testresult' THEN tr.result
          WHEN rt.from_type = 'risk' THEN rr.status
        END as status,
        rt.from_type as type,
        tr.executed_at,
        tr.test_run_id
      FROM traces rt
      LEFT JOIN user_requirements ur ON rt.from_requirement_id = ur.id AND rt.from_type = 'user'
      LEFT JOIN system_requirements sr ON rt.from_requirement_id = sr.id AND rt.from_type = 'system'
      LEFT JOIN testing.test_cases tc ON rt.from_requirement_id = tc.id AND rt.from_type = 'testcase'
      LEFT JOIN testing.test_results tr ON rt.from_requirement_id = tr.id AND rt.from_type = 'testresult'
      LEFT JOIN testing.test_runs trun ON tr.test_run_id = trun.id
      LEFT JOIN risk_records rr ON rt.from_requirement_id = rr.id AND rt.from_type = 'risk'
      WHERE rt.to_requirement_id = $1 AND rt.to_type = $2
      AND ((rt.from_type = 'user' AND ur.deleted_at IS NULL)
           OR (rt.from_type = 'system' AND sr.deleted_at IS NULL)
           OR (rt.from_type = 'testcase' AND tc.deleted_at IS NULL)
           OR (rt.from_type = 'testresult')
           OR (rt.from_type = 'risk' AND rr.deleted_at IS NULL))
      ORDER BY
        CASE
          WHEN rt.from_type = 'user' THEN ur.last_modified
          WHEN rt.from_type = 'system' THEN sr.last_modified
          WHEN rt.from_type = 'testcase' THEN tc.last_modified
          WHEN rt.from_type = 'testresult' THEN tr.executed_at
          WHEN rt.from_type = 'risk' THEN rr.last_modified
        END DESC
    `;
    
    // Get downstream traces (items that trace FROM this requirement)
    const downstreamQuery = `
      SELECT
        rt.id as trace_id,
        rt.to_requirement_id AS id,
        rt.to_type AS "toType",
        CASE
          WHEN rt.to_type = 'user' THEN ur.title
          WHEN rt.to_type = 'system' THEN sr.title
          WHEN rt.to_type = 'testcase' THEN tc.title
          WHEN rt.to_type = 'risk' THEN rr.title
        END as title,
        CASE
          WHEN rt.to_type = 'user' THEN ur.description
          WHEN rt.to_type = 'system' THEN sr.description
          WHEN rt.to_type = 'testcase' THEN tc.description
          WHEN rt.to_type = 'risk' THEN rr.description
        END as description,
        CASE
          WHEN rt.to_type = 'user' THEN ur.status
          WHEN rt.to_type = 'system' THEN sr.status
          WHEN rt.to_type = 'testcase' THEN tc.status
          WHEN rt.to_type = 'risk' THEN rr.status
        END as status,
        rt.to_type as type
      FROM traces rt
      LEFT JOIN user_requirements ur ON rt.to_requirement_id = ur.id AND rt.to_type = 'user'
      LEFT JOIN system_requirements sr ON rt.to_requirement_id = sr.id AND rt.to_type = 'system'
      LEFT JOIN testing.test_cases tc ON rt.to_requirement_id = tc.id AND rt.to_type = 'testcase'
      LEFT JOIN risk_records rr ON rt.to_requirement_id = rr.id AND rt.to_type = 'risk'
      WHERE rt.from_requirement_id = $1 AND rt.from_type = $2
      AND ((rt.to_type = 'user' AND ur.deleted_at IS NULL)
           OR (rt.to_type = 'system' AND sr.deleted_at IS NULL)
           OR (rt.to_type = 'testcase' AND tc.deleted_at IS NULL)
           OR (rt.to_type = 'risk' AND rr.deleted_at IS NULL))
      ORDER BY
        CASE
          WHEN rt.to_type = 'user' THEN ur.last_modified
          WHEN rt.to_type = 'system' THEN sr.last_modified
          WHEN rt.to_type = 'testcase' THEN tc.last_modified
          WHEN rt.to_type = 'risk' THEN rr.last_modified
        END DESC
    `;
    
    const [upstreamResult, downstreamResult] = await Promise.all([
      pool.query(upstreamQuery, [id, requirementType]),
      pool.query(downstreamQuery, [id, requirementType])
    ]);
    
    const upstreamTraces = upstreamResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      type: row.type,
      isSystemGenerated: row.isSystemGenerated,
      executedAt: row.executed_at,
      testRunId: row.test_run_id
    }));

    const downstreamTraces = downstreamResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      type: row.type
    }));
    
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
    const { fromId, toId, fromType, toType } = req.body;
    const userId = req.user?.id || '';

    // Validate input
    if (!fromId || !toId || !fromType || !toType) {
      return unprocessableEntity(res, "All trace relationship fields are required");
    }

    // Prevent manual creation of testresult traces
    if (fromType === 'testresult' || toType === 'testresult') {
      return badRequest(res, "Test result traces cannot be created manually. They are generated automatically when test runs are approved.");
    }

    // Validate types
    if (!['user', 'system', 'testcase', 'risk'].includes(fromType) || !['user', 'system', 'testcase', 'risk'].includes(toType)) {
      return unprocessableEntity(res, "Invalid type");
    }
    
    // Validate items exist and are not deleted
    // Whitelist valid table names to prevent SQL injection
    const validTables: { [key: string]: string } = {
      'user': 'user_requirements',
      'system': 'system_requirements',
      'testcase': 'testing.test_cases',
      'risk': 'risk_records'
    };

    const fromTable = validTables[fromType];
    const toTable = validTables[toType];

    if (!fromTable || !toTable) {
      return unprocessableEntity(res, "Invalid type");
    }

    const pool = getPool();
    const [fromExists, toExists] = await Promise.all([
      pool.query(`SELECT id FROM ${fromTable} WHERE id = $1 AND deleted_at IS NULL`, [fromId]),
      pool.query(`SELECT id FROM ${toTable} WHERE id = $1 AND deleted_at IS NULL`, [toId])
    ]);

    if (fromExists.rows.length === 0) {
      return notFound(res, "Source ${fromType} not found");
    }

    if (toExists.rows.length === 0) {
      return notFound(res, "Target ${toType} not found");
    }
    
    // Create trace relationship
    const insertQuery = `
      INSERT INTO traces (
        from_requirement_id, to_requirement_id, from_type, to_type, created_by
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (from_requirement_id, to_requirement_id, from_type, to_type) DO NOTHING
      RETURNING id,
                from_requirement_id AS "fromId",
                to_requirement_id AS "toId",
                from_type AS "fromType",
                to_type AS "toType",
                created_at AS "createdAt",
                created_by AS "createdBy"
    `;

    const result = await pool.query(insertQuery, [
      fromId, toId, fromType, toType, userId
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
        fromType: result.rows[0].fromType,
        toType: result.rows[0].toType,
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
    
    // Determine types from ID formats
    const fromType = fromId.startsWith('UR-') ? 'user' : 
                     fromId.startsWith('TC-') ? 'testcase' : 
                     fromId.startsWith('TRES-') ? 'testresult' :
                     fromId.startsWith('RISK-') ? 'risk' : 'system';
    const toType = toId.startsWith('UR-') ? 'user' : 
                   toId.startsWith('TC-') ? 'testcase' : 
                   toId.startsWith('TRES-') ? 'testresult' :
                   toId.startsWith('RISK-') ? 'risk' : 'system';
    
    const deleteQuery = `
      DELETE FROM traces
      WHERE from_requirement_id = $1 AND to_requirement_id = $2
        AND from_type = $3 AND to_type = $4
      RETURNING *
    `;
    
    const pool = getPool();
    const result = await pool.query(deleteQuery, [fromId, toId, fromType, toType]);
    
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