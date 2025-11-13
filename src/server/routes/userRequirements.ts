import express, { Response } from "express";
import bcrypt from "bcrypt";
import { getPool } from "../config/database";
import logger from "../config/logger";
import { AuthenticatedRequest } from "../middleware/auth";
import {
  badRequest,
  unauthorized,
  notFound,
  conflict,
  unprocessableEntity,
  internalServerError,
  successResponse
} from '../utils/responses';

const router = express.Router();

// GET /api/user-requirements - List all user requirements with filtering and pagination
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res);
    }

    const pool = getPool();
    const {
      status,
      sort = "lastModified",
      order = "desc",
      page = 1,
      limit = 100,
      search,
    } = req.query;

    // Enforce max limit
    const effectiveLimit = Math.min(parseInt(limit as string), 200);

    let query = `
      SELECT ur.id,
             ur.title,
             ur.description,
             ur.status,
             ur.revision,
             ur.created_by AS "createdBy",
             ur.created_at AS "createdAt",
             ur.last_modified AS "lastModified",
             ur.modified_by AS "modifiedBy",
             ur.approved_at AS "approvedAt",
             ur.approved_by AS "approvedBy",
             ur.deleted_at AS "deletedAt",
             ur.approval_notes AS "approvalNotes",
             creator.full_name AS "createdByName",
             modifier.full_name AS "modifiedByName",
             approver.full_name AS "approvedByName"
      FROM user_requirements ur
      LEFT JOIN users creator ON ur.created_by = creator.id
      LEFT JOIN users modifier ON ur.modified_by = modifier.id
      LEFT JOIN users approver ON ur.approved_by = approver.id
      WHERE ur.deleted_at IS NULL`;
    const queryParams: (string | number)[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND ur.status = $${paramCount}`;
      queryParams.push(status as string);
    }

    // Add search filter if provided
    if (search && search.toString().trim() !== "") {
      paramCount++;
      query += ` AND (ur.id ILIKE $${paramCount} OR ur.title ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Sort handling - add lastModified as a valid sort column
    const validSortColumns = ["id", "title", "createdAt", "lastModified", "approvedAt", "status"];
    const validOrder = ["asc", "desc"];
    const sortColumn = validSortColumns.includes(sort as string) ? sort : "id";
    const sortOrder = validOrder.includes((order as string).toLowerCase())
      ? (order as string).toUpperCase()
      : "ASC";

    const columnMap: Record<string, string> = {
      id: "ur.id",
      title: "LOWER(ur.title)",
      createdAt: "ur.created_at",
      lastModified: "COALESCE(ur.last_modified, ur.created_at)",
      approvedAt: "ur.approved_at",
      status: "ur.status",
    };
    const mappedColumn = columnMap[sortColumn as string] || "ur.id";
    query += ` ORDER BY ${mappedColumn} ${sortOrder}`;

    // Pagination
    const offset = (parseInt(page as string) - 1) * effectiveLimit;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(effectiveLimit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery =
      "SELECT COUNT(*) FROM user_requirements ur WHERE ur.deleted_at IS NULL";
    const countParams: (string | number)[] = [];
    let countParamNum = 0;

    if (status) {
      countParamNum++;
      countQuery += ` AND ur.status = $${countParamNum}`;
      countParams.push(status as string);
    }

    if (search && search.toString().trim() !== "") {
      countParamNum++;
      countQuery += ` AND (ur.id ILIKE $${countParamNum} OR ur.title ILIKE $${countParamNum})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    const pages = Math.ceil(total / effectiveLimit);

    return successResponse(res, result.rows, {
      pagination: {
        total,
        page: parseInt(page as string),
        pages,
        limit: effectiveLimit,
      },
    });
  } catch (error) {
    logger.error("Error fetching user requirements:", error);
    return internalServerError(res);
  }
});

// GET /api/user-requirements/:id - Get single user requirement
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res);
    }

    const pool = getPool();
    const { id } = req.params;
    const normalizedId = id.toUpperCase();

    const result = await pool.query(
      `
      SELECT ur.id,
             ur.title,
             ur.description,
             ur.status,
             ur.revision,
             ur.created_by AS "createdBy",
             ur.created_at AS "createdAt",
             ur.last_modified AS "lastModified",
             ur.modified_by AS "modifiedBy",
             ur.approved_at AS "approvedAt",
             ur.approved_by AS "approvedBy",
             ur.deleted_at AS "deletedAt",
             ur.approval_notes AS "approvalNotes",
             creator.full_name AS "createdByName",
             modifier.full_name AS "modifiedByName",
             approver.full_name AS "approvedByName"
      FROM user_requirements ur
      LEFT JOIN users creator ON ur.created_by = creator.id
      LEFT JOIN users modifier ON ur.modified_by = modifier.id
      LEFT JOIN users approver ON ur.approved_by = approver.id
      WHERE ur.id = $1 AND ur.deleted_at IS NULL
    `,
      [normalizedId],
    );

    if (result.rows.length === 0) {
      return notFound(res, "Requirement not found");
    }

    res.json({
      success: true,
      requirement: result.rows[0],
    });
  } catch (error) {
    logger.error("Error fetching user requirement:", error);
    return internalServerError(res);
  }
});

// POST /api/user-requirements - Create new user requirement
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res);
    }

    const { title, description, status, password, approvalNotes } = req.body;

    // Validation
    if (!title || !description) {
      return unprocessableEntity(res, "Title and description are required");
    }

    // If status is approved, password is required
    if (status === "approved" && !password) {
      return badRequest(res, "Password is required to create in approved status");
    }

    if (typeof title !== "string") {
      return unprocessableEntity(res, "Title must be a string");
    }

    if (typeof description !== "string") {
      return unprocessableEntity(res, "Description must be a string");
    }

    if (typeof title === "string" && title.trim() === "") {
      return unprocessableEntity(res, "Title cannot be empty or whitespace only");
    }

    if (typeof description === "string" && description.trim() === "") {
      return unprocessableEntity(res, "Description cannot be empty or whitespace only");
    }

    if (title.length > 200) {
      return unprocessableEntity(res, "Title exceeds maximum length");
    }

    if (description.length === 0) {
      return unprocessableEntity(res, "Description cannot be empty");
    }

    const pool = getPool();

    // Verify password if creating as approved
    if (status === "approved") {
      const bcrypt = await import("bcrypt");
      const userResult = await pool.query(
        'SELECT password_hash AS "passwordHash" FROM users WHERE id = $1',
        [req.user.id],
      );

      if (userResult.rows.length === 0) {
        return unauthorized(res, "User not found");
      }

      const isValid = await bcrypt.compare(
        password,
        userResult.rows[0].passwordHash,
      );
      if (!isValid) {
        return unauthorized(res, "Invalid password");
      }
    }

    // Check for duplicate title
    const duplicateCheck = await pool.query(
      "SELECT id FROM user_requirements WHERE LOWER(title) = LOWER($1) AND deleted_at IS NULL",
      [title],
    );

    if (duplicateCheck.rows.length > 0) {
      return conflict(res, "A requirement with this title already exists");
    }

    // Generate ID using sequence
    let requirementId;
    try {
      const idQuery = "SELECT 'UR-' || nextval('user_requirement_seq') as id";
      const idResult = await pool.query(idQuery);
      requirementId = idResult.rows[0].id;
    } catch (error) {
      logger.error("Error generating requirement ID:", error);
      return internalServerError(res, "Error generating requirement ID");
    }

    // Determine status and approval fields
    const finalStatus = status === "approved" ? "approved" : "draft";
    const revision = status === "approved" ? 1 : 0;
    const approvedAt = status === "approved" ? new Date() : null;
    const approvedBy = status === "approved" ? req.user.id : null;

    const insertResult = await pool.query(
      `
      INSERT INTO user_requirements (
        id, title, description, status, revision, created_by, created_at,
        last_modified, modified_by, approved_at, approved_by, deleted_at, approval_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id,
                title,
                description,
                status,
                revision,
                created_by AS "createdBy",
                created_at AS "createdAt",
                last_modified AS "lastModified",
                modified_by AS "modifiedBy",
                approved_at AS "approvedAt",
                approved_by AS "approvedBy",
                deleted_at AS "deletedAt",
                approval_notes AS "approvalNotes"
    `,
      [
        requirementId,
        title,
        description,
        finalStatus,
        revision,
        req.user.id,
        new Date(),
        null,
        null,
        approvedAt,
        approvedBy,
        null,
        approvalNotes || null,
      ],
    );

    res.status(201).json({
      success: true,
      requirement: insertResult.rows[0],
    });
  } catch (error) {
    logger.error("Error creating user requirement:", error);
    return internalServerError(res);
  }
});

// PATCH /api/user-requirements/:id - Update user requirement
router.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res);
    }

    const { id } = req.params;
    const normalizedId = id.toUpperCase();
    const { title, description, password, status, approvalNotes } = req.body;

    const pool = getPool();

    // Check if requirement exists and is not deleted
    const existingResult = await pool.query(
      'SELECT id,\n              title,\n              description,\n              status,\n              revision,\n              created_by AS "createdBy",\n              created_at AS "createdAt",\n              last_modified AS "lastModified",\n              modified_by AS "modifiedBy",\n              approved_at AS "approvedAt",\n              approved_by AS "approvedBy",\n              deleted_at AS "deletedAt",\n              approval_notes AS "approvalNotes"\n       FROM user_requirements WHERE id = $1 AND deleted_at IS NULL',
      [normalizedId],
    );

    if (existingResult.rows.length === 0) {
      return notFound(res, "Requirement not found");
    }

    const existing = existingResult.rows[0];

    // Password validation scenarios:
    // 1. Editing an approved requirement
    // 2. Changing status to approved
    const wasApproved = existing.status === "approved";
    const wantsToApprove =
      status === "approved" && existing.status !== "approved";

    if ((wasApproved || wantsToApprove) && !password) {
      return badRequest(res, "Password required");
    }

    if ((wasApproved || wantsToApprove) && password) {
      const bcrypt = await import("bcrypt");
      const userResult = await pool.query(
        'SELECT password_hash AS "passwordHash" FROM users WHERE id = $1',
        [req.user.id],
      );

      if (userResult.rows.length === 0) {
        return unauthorized(res, "User not found");
      }

      const isValid = await bcrypt.compare(
        password,
        userResult.rows[0].passwordHash,
      );
      if (!isValid) {
        return unauthorized(res, "Invalid password");
      }
    }

    // Validation
    if (title && title.length > 200) {
      return unprocessableEntity(res, "Title exceeds maximum length");
    }

    if (description && description.length === 0) {
      return unprocessableEntity(res, "Description cannot be empty");
    }

    // Check for duplicate title if title is being changed
    if (title) {
      const duplicateCheck = await pool.query(
        "SELECT id FROM user_requirements WHERE LOWER(title) = LOWER($1) AND id != $2 AND deleted_at IS NULL",
        [title, normalizedId],
      );

      if (duplicateCheck.rows.length > 0) {
        return conflict(res, "A requirement with this title already exists");
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | number | Date | null)[] = [];
    let paramCount = 0;

    if (title) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      values.push(title);
    }

    if (description) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }

    if (updates.length === 0) {
      return badRequest(res, "No valid fields to update");
    }

    // Handle status changes
    if (wantsToApprove) {
      // Approving the requirement
      paramCount++;
      updates.push(`status = $${paramCount}`);
      values.push("approved");

      // Increment revision on approval
      updates.push(`revision = revision + 1`);

      paramCount++;
      updates.push(`approved_at = $${paramCount}`);
      values.push(new Date());

      paramCount++;
      updates.push(`approved_by = $${paramCount}`);
      values.push(req.user.id);

      if (approvalNotes) {
        paramCount++;
        updates.push(`approval_notes = $${paramCount}`);
        values.push(approvalNotes);
      }
    } else if (wasApproved && !status) {
      // Editing an approved requirement without status change - reset to draft
      paramCount++;
      updates.push(`status = $${paramCount}`);
      values.push("draft");

      paramCount++;
      updates.push(`approved_at = $${paramCount}`);
      values.push(null);

      paramCount++;
      updates.push(`approved_by = $${paramCount}`);
      values.push(null);
    }

    paramCount++;
    updates.push(`last_modified = $${paramCount}`);
    values.push(new Date());

    paramCount++;
    updates.push(`modified_by = $${paramCount}`);
    values.push(req.user.id);

    paramCount++;
    values.push(normalizedId);

    const updateQuery = `
      UPDATE user_requirements
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id,
                title,
                description,
                status,
                revision,
                created_by AS "createdBy",
                created_at AS "createdAt",
                last_modified AS "lastModified",
                modified_by AS "modifiedBy",
                approved_at AS "approvedAt",
                approved_by AS "approvedBy",
                deleted_at AS "deletedAt",
                approval_notes AS "approvalNotes"
    `;

    const updateResult = await pool.query(updateQuery, values);

    res.json({
      success: true,
      requirement: updateResult.rows[0],
    });
  } catch (error) {
    logger.error("Error updating user requirement:", error);
    return internalServerError(res);
  }
});

// POST /api/user-requirements/:id/approve - Approve user requirement
router.post("/:id/approve", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res);
    }

    const { id } = req.params;
    const normalizedId = id.toUpperCase();
    const { password, approvalNotes } = req.body;

    if (!password) {
      return badRequest(res, "Password is required");
    }

    const pool = getPool();

    // Check if requirement exists and is not already approved
    const existingResult = await pool.query(
      'SELECT id,\n              title,\n              description,\n              status,\n              revision,\n              created_by AS "createdBy",\n              created_at AS "createdAt",\n              last_modified AS "lastModified",\n              modified_by AS "modifiedBy",\n              approved_at AS "approvedAt",\n              approved_by AS "approvedBy",\n              deleted_at AS "deletedAt",\n              approval_notes AS "approvalNotes"\n       FROM user_requirements WHERE id = $1 AND deleted_at IS NULL',
      [normalizedId],
    );

    if (
      existingResult.rows.length === 0 ||
      existingResult.rows[0].status === "approved"
    ) {
      return badRequest(res, "Requirement not found or already approved");
    }

    // Verify password
    const userResult = await pool.query(
      'SELECT password_hash AS "passwordHash" FROM users WHERE id = $1',
      [req.user.id],
    );

    if (userResult.rows.length === 0) {
      return unauthorized(res, "User not found");
    }

    const validPassword = await bcrypt.compare(
      password,
      userResult.rows[0].passwordHash,
    );
    if (!validPassword) {
      return unauthorized(res, "Invalid password");
    }

    // Update requirement with approval
    const updateResult = await pool.query(
      `UPDATE user_requirements
       SET status = 'approved',
           revision = revision + 1,
           approved_at = CURRENT_TIMESTAMP,
           approved_by = $2,
           approval_notes = $3
       WHERE id = $1
       RETURNING id,
                 title,
                 description,
                 status,
                 revision,
                 created_by AS "createdBy",
                 created_at AS "createdAt",
                 last_modified AS "lastModified",
                 modified_by AS "modifiedBy",
                 approved_at AS "approvedAt",
                 approved_by AS "approvedBy",
                 deleted_at AS "deletedAt",
                 approval_notes AS "approvalNotes"`,
      [normalizedId, req.user.id, approvalNotes || null],
    );

    // Audit logging removed - table doesn't exist yet

    res.json({
      success: true,
      requirement: updateResult.rows[0],
    });
  } catch (error) {
    logger.error("Error approving user requirement:", error);
    return internalServerError(res);
  }
});

// DELETE /api/user-requirements/:id - Soft delete user requirement
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res);
    }

    const { id } = req.params;
    const { password } = req.body || {};
    const normalizedId = id.toUpperCase();
    const pool = getPool();

    // If password is provided, validate it
    if (password) {
      const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
        req.user.id,
      ]);

      if (userResult.rows.length === 0) {
        return unauthorized(res, "User not found");
      }

      const user = userResult.rows[0];
      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash,
      );

      if (!isPasswordValid) {
        return unauthorized(res, "Invalid password");
      }
    }

    // Check if requirement exists and is not already deleted
    const existingResult = await pool.query(
      "SELECT id FROM user_requirements WHERE id = $1 AND deleted_at IS NULL",
      [normalizedId],
    );

    if (existingResult.rows.length === 0) {
      return notFound(res, "Requirement not found");
    }

    // Soft delete
    await pool.query(
      "UPDATE user_requirements SET deleted_at = $1, modified_by = $2 WHERE id = $3",
      [new Date(), req.user.id, normalizedId],
    );

    res.json({
      success: true,
      message: "Requirement deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting user requirement:", error);
    return internalServerError(res);
  }
});

// GET /api/user-requirements/:id/downstream-traces - Get system requirements that trace from this user requirement
router.get("/:id/downstream-traces", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res);
    }

    const { id } = req.params;
    const normalizedId = id.toUpperCase();
    const pool = getPool();

    // Check if user requirement exists
    const userReqResult = await pool.query(
      "SELECT id FROM user_requirements WHERE id = $1 AND deleted_at IS NULL",
      [normalizedId],
    );

    if (userReqResult.rows.length === 0) {
      return notFound(res, "User requirement not found");
    }

    // Get downstream traces
    const tracesResult = await pool.query(
      `
      SELECT sr.id, sr.title, sr.status
      FROM system_requirements sr
      INNER JOIN traces rt ON sr.id = rt.to_requirement_id
      WHERE rt.from_requirement_id = $1
        AND rt.from_type = 'user'
        AND rt.to_type = 'system'
        AND sr.deleted_at IS NULL
      ORDER BY sr.id
    `,
      [normalizedId],
    );

    res.json({
      success: true,
      traces: tracesResult.rows,
    });
  } catch (error) {
    logger.error("Error fetching downstream traces:", error);
    return internalServerError(res);
  }
});

export default router;
