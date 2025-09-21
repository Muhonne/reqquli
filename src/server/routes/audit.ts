import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import logger from '../config/logger';
import {
  internalServerError,
  successResponse
} from '../utils/responses';

const router = express.Router();
let pool: Pool;

export function initializeAuditRoutes(dbPool: Pool) {
  pool = dbPool;
  return router;
}

interface AuditFilters {
  event_type?: string;
  event_name?: string;
  aggregate_type?: string;
  aggregate_id?: string;
  user_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

router.get('/events', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filters: AuditFilters = {
      event_type: req.query.event_type as string,
      event_name: req.query.event_name as string,
      aggregate_type: req.query.aggregate_type as string,
      aggregate_id: req.query.aggregate_id as string,
      user_id: req.query.user_id as string,
      from_date: req.query.from_date as string,
      to_date: req.query.to_date as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50
    };

    const offset = (filters.page! - 1) * filters.limit!;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters.event_type) {
      conditions.push(`event_type = $${paramCount++}`);
      params.push(filters.event_type);
    }

    if (filters.event_name) {
      conditions.push(`event_name = $${paramCount++}`);
      params.push(filters.event_name);
    }

    if (filters.aggregate_type) {
      conditions.push(`aggregate_type = $${paramCount++}`);
      params.push(filters.aggregate_type);
    }

    if (filters.aggregate_id) {
      conditions.push(`aggregate_id = $${paramCount++}`);
      params.push(filters.aggregate_id);
    }

    if (filters.user_id) {
      conditions.push(`user_id = $${paramCount++}`);
      params.push(filters.user_id);
    }

    if (filters.from_date) {
      conditions.push(`occurred_at >= $${paramCount++}`);
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      conditions.push(`occurred_at <= $${paramCount++}`);
      params.push(filters.to_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) FROM audit_events ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(filters.limit);
    params.push(offset);

    const eventsQuery = `
      SELECT
        id,
        event_type,
        event_name,
        aggregate_type,
        aggregate_id,
        user_id,
        user_email,
        user_name,
        event_data,
        metadata,
        occurred_at,
        ip_address,
        user_agent,
        session_id
      FROM audit_events
      ${whereClause}
      ORDER BY occurred_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    const eventsResult = await pool.query(eventsQuery, params);

    return successResponse(res, eventsResult.rows, { pagination: {
        page: filters.page!,
        limit: filters.limit!,
        total,
        pages: Math.ceil(total / filters.limit!)
      } });
  } catch (error) {
    logger.error('Error fetching audit events:', error);
    return internalServerError(res, "Failed to fetch audit events");
  }
});

router.get('/events/aggregate/:type/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const query = `
      SELECT
        id,
        event_type,
        event_name,
        aggregate_type,
        aggregate_id,
        user_id,
        user_email,
        user_name,
        event_data,
        metadata,
        occurred_at
      FROM audit_events
      WHERE aggregate_type = $1 AND aggregate_id = $2
      ORDER BY occurred_at DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [type, id, limit]);

    res.json({
      success: true,
      aggregate: {
        type,
        id
      },
      events: result.rows
    });
  } catch (error) {
    logger.error('Error fetching aggregate events:', error);
    return internalServerError(res, "Failed to fetch aggregate events");
  }
});

router.get('/events/user/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const query = `
      SELECT
        id,
        event_type,
        event_name,
        aggregate_type,
        aggregate_id,
        user_id,
        user_email,
        user_name,
        event_data,
        metadata,
        occurred_at
      FROM audit_events
      WHERE user_id = $1
      ORDER BY occurred_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);

    const countQuery = `SELECT COUNT(*) FROM audit_events WHERE user_id = $1`;
    const countResult = await pool.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      userId,
      events: result.rows,
      total
    });
  } catch (error) {
    logger.error('Error fetching user events:', error);
    return internalServerError(res, "Failed to fetch user events");
  }
});

router.get('/activity/users', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        user_id,
        user_name,
        user_email,
        total_events,
        active_days,
        first_activity,
        last_activity,
        events_by_type
      FROM user_activity
      ORDER BY last_activity DESC
      LIMIT 100
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    logger.error('Error fetching user activity:', error);
    return internalServerError(res, "Failed to fetch user activity");
  }
});

router.get('/metrics/system', authenticateToken, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const query = `
      SELECT
        date,
        total_events,
        active_users,
        items_created,
        items_approved,
        items_deleted,
        test_activities,
        trace_activities
      FROM system_metrics
      WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY date DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      metrics: result.rows
    });
  } catch (error) {
    logger.error('Error fetching system metrics:', error);
    return internalServerError(res, "Failed to fetch system metrics");
  }
});

router.get('/timeline', authenticateToken, async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;

    const query = `
      SELECT
        DATE_TRUNC('hour', occurred_at) as hour,
        COUNT(*) as events_count,
        COUNT(DISTINCT user_id) as unique_users,
        jsonb_object_agg(event_type, type_count) as events_by_type
      FROM (
        SELECT
          occurred_at,
          user_id,
          event_type,
          COUNT(*) OVER (PARTITION BY DATE_TRUNC('hour', occurred_at), event_type) as type_count
        FROM audit_events
        WHERE occurred_at >= NOW() - INTERVAL '${hours} hours'
      ) subquery
      GROUP BY hour
      ORDER BY hour DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      timeline: result.rows
    });
  } catch (error) {
    logger.error('Error fetching timeline:', error);
    return internalServerError(res, "Failed to fetch timeline");
  }
});

router.post('/events/log', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      event_type,
      event_name,
      aggregate_type,
      aggregate_id,
      event_data,
      metadata
    } = req.body;

    const user_id = req.user?.userId;
    const ip_address = req.ip;
    const user_agent = req.headers['user-agent'];
    const session_id = req.user?.jti;

    const query = `
      SELECT log_audit_event($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    const result = await pool.query(query, [
      event_type,
      event_name,
      aggregate_type,
      aggregate_id,
      user_id,
      event_data,
      metadata,
      ip_address,
      user_agent,
      session_id
    ]);

    res.json({
      success: true,
      event_id: result.rows[0].log_audit_event
    });
  } catch (error) {
    logger.error('Error logging audit event:', error);
    return internalServerError(res, "Failed to log audit event");
  }
});

export default router;