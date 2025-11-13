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

// GET /api/system-requirements - List all system requirements with filtering and pagination
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res, "Authentication required");
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

    // Enforce max limit per spec
    const effectiveLimit = Math.min(parseInt(limit as string), 200);

    let query = `
      SELECT sr.id,
             sr.title,
             sr.description,
             sr.status,
             sr.revision,
             sr.created_by AS "createdBy",
             sr.created_at AS "createdAt",
             sr.last_modified AS "lastModified",
             sr.modified_by AS "modifiedBy",
             sr.approved_at AS "approvedAt",
             sr.approved_by AS "approvedBy",
             sr.deleted_at AS "deletedAt",
             sr.approval_notes AS "approvalNotes",
             creator.full_name AS "createdByName",
             modifier.full_name AS "modifiedByName",
             approver.full_name AS "approvedByName"
      FROM system_requirements sr
      LEFT JOIN users creator ON sr.created_by = creator.id
      LEFT JOIN users modifier ON sr.modified_by = modifier.id
      LEFT JOIN users approver ON sr.approved_by = approver.id
      WHERE sr.deleted_at IS NULL
    `;
    const queryParams: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND sr.status = $${paramCount}`;
      queryParams.push(status);
    }

    // Add search filter if provided
    if (search && search.toString().trim() !== "") {
      paramCount++;
      query += ` AND (sr.id ILIKE $${paramCount} OR sr.title ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Sort handling - add lastModified and approvedAt as valid sort columns
    const validSortColumns = ["id", "title", "createdAt", "lastModified", "approvedAt", "status"];
    const validOrder = ["asc", "desc"];
    const sortColumn = validSortColumns.includes(sort as string) ? sort : "lastModified";
    const sortOrder = validOrder.includes((order as string).toLowerCase())
      ? (order as string).toUpperCase()
      : "DESC";

    const columnMap: any = {
      id: "sr.id",
      title: "LOWER(sr.title)",
      createdAt: "sr.created_at",
      lastModified: "COALESCE(sr.last_modified, sr.created_at)",
      approvedAt: "sr.approved_at",
      status: "sr.status",
    };
    const mappedColumn = columnMap[sortColumn as string] || "sr.id";
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
      "SELECT COUNT(*) FROM system_requirements WHERE deleted_at IS NULL";
    const countParams: any[] = [];
    let countParamNum = 0;

    if (status) {
      countParamNum++;
      countQuery += ` AND status = $${countParamNum}`;
      countParams.push(status);
    }

    if (search && search.toString().trim() !== "") {
      countParamNum++;
      countQuery += ` AND (id ILIKE $${countParamNum} OR title ILIKE $${countParamNum})`;
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
    logger.error("Error fetching system requirements:", error);
    return internalServerError(res, "Internal server error");
  }
});

// GET /api/system-requirements/trace-from/:userRequirementId - Get system requirements tracing from a user requirement
router.get("/trace-from/:userRequirementId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res, "Authentication required");
    }

    const pool = getPool();
    const { userRequirementId } = req.params;
    // User requirements now use hyphen format in DB (UR-123)
    const normalizedId = userRequirementId.toUpperCase();

    const result = await pool.query(
      `SELECT sr.id,
              sr.title,
              sr.description,
              sr.status,
              sr.revision,
              sr.created_by AS "createdBy",
              sr.created_at AS "createdAt",
              sr.last_modified AS "lastModified",
              sr.modified_by AS "modifiedBy",
              sr.approved_at AS "approvedAt",
              sr.approved_by AS "approvedBy",
              sr.deleted_at AS "deletedAt",
              sr.approval_notes AS "approvalNotes"
       FROM system_requirements sr
       WHERE sr.deleted_at IS NULL
       AND EXISTS (
         SELECT 1 FROM traces rt
         WHERE rt.to_requirement_id = sr.id
         AND rt.from_requirement_id = $1
         AND rt.from_type = 'user'
         AND rt.to_type = 'system'
       )
       ORDER BY sr.id ASC`,
      [normalizedId],
    );

    return successResponse(res, result.rows);
  } catch (error) {
    logger.error("Error fetching traced system requirements:", error);
    return internalServerError(res, "Internal server error");
  }
});

// GET /api/system-requirements/:id - Get single system requirement
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res, "Authentication required");
    }

    const pool = getPool();
    // System requirements already use hyphenated format in DB (SR-123)
    const { id } = req.params;
    const normalizedId = id.toUpperCase();

    const result = await pool.query(
      `SELECT sr.id,
              sr.title,
              sr.description,
              sr.status,
              sr.revision,
              sr.created_by AS "createdBy",
              sr.created_at AS "createdAt",
              sr.last_modified AS "lastModified",
              sr.modified_by AS "modifiedBy",
              sr.approved_at AS "approvedAt",
              sr.approved_by AS "approvedBy",
              sr.deleted_at AS "deletedAt",
              sr.approval_notes AS "approvalNotes"
       FROM system_requirements sr
       WHERE sr.id = $1 AND sr.deleted_at IS NULL`,
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
    logger.error("Error fetching system requirement:", error);
    return internalServerError(res, "Internal server error");
  }
});

// POST /api/system-requirements - Create new system requirement
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res, "Authentication required");
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

    if (typeof title !== "string" || title.length > 200) {
      return unprocessableEntity(res, "Title must be a string with max 200 characters");
    }

    if (typeof description !== "string" || description.length === 0) {
      return unprocessableEntity(res, "Description is required");
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

    // Check if title is unique
    const existingTitle = await pool.query(
      "SELECT id FROM system_requirements WHERE title = $1 AND deleted_at IS NULL",
      [title],
    );

    if (existingTitle.rows.length > 0) {
      return conflict(res, "Title must be unique");
    }

    // Generate ID using sequence
    let requirementId: string;
    try {
      const idQuery = "SELECT 'SR-' || nextval('system_requirement_seq') as id";
      const idResult = await pool.query(idQuery);
      requirementId = idResult.rows[0].id;
    } catch (error) {
      logger.error("Error generating system requirement ID:", error);
      return internalServerError(res, "Error generating requirement ID");
    }

    // Determine status and approval fields
    const finalStatus = status === "approved" ? "approved" : "draft";
    const revision = status === "approved" ? 1 : 0;
    const approvedAt = status === "approved" ? new Date() : null;
    const approvedBy = status === "approved" ? req.user.id : null;

    // Insert new requirement
    const insertResult = await pool.query(
      `INSERT INTO system_requirements
       (id, title, description, status, revision, created_by, created_at, approved_at, approved_by, approval_notes)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, $9)
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
      [
        requirementId,
        title,
        description,
        finalStatus,
        revision,
        req.user.id,
        approvedAt,
        approvedBy,
        approvalNotes || null,
      ],
    );

    res.status(201).json({
      success: true,
      requirement: insertResult.rows[0],
    });
  } catch (error) {
    logger.error("Error creating system requirement:", error);
    return internalServerError(res, "Internal server error");
  }
});

// POST /api/system-requirements/:id/approve - Approve system requirement
router.post("/:id/approve", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res, "Authentication required");
    }

    const { id } = req.params;
    const normalizedId = id.toUpperCase();
    const { password, approvalNotes } = req.body;

    if (!password) {
      return badRequest(res, "Password is required");
    }

    const pool = getPool();

    // Get current requirement
    const currentResult = await pool.query(
      `
      SELECT sr.id,
             sr.title,
             sr.description,
             sr.status,
             sr.revision,
             sr.created_by AS "createdBy",
             sr.created_at AS "createdAt",
             sr.last_modified AS "lastModified",
             sr.modified_by AS "modifiedBy",
             sr.approved_at AS "approvedAt",
             sr.approved_by AS "approvedBy",
             sr.deleted_at AS "deletedAt",
             sr.approval_notes AS "approvalNotes",
             creator.full_name AS "createdByName",
             modifier.full_name AS "modifiedByName",
             approver.full_name AS "approvedByName"
      FROM system_requirements sr
      LEFT JOIN users creator ON sr.created_by = creator.id
      LEFT JOIN users modifier ON sr.modified_by = modifier.id
      LEFT JOIN users approver ON sr.approved_by = approver.id
      WHERE sr.id = $1 AND sr.deleted_at IS NULL
    `,
      [normalizedId],
    );

    if (currentResult.rows.length === 0) {
      return notFound(res, "Requirement not found");
    }

    const current = currentResult.rows[0];

    // Validate status
    if (current.status !== "draft") {
      return badRequest(res, "Only draft requirements can be approved");
    }

    // Validate completeness
    if (!current.title || !current.description) {
      return badRequest(res, "Requirement has incomplete fields");
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

    // Update requirement
    const updateResult = await pool.query(
      `UPDATE system_requirements
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

    res.json({
      success: true,
      requirement: updateResult.rows[0],
    });
  } catch (error) {
    logger.error("Error approving system requirement:", error);
    return internalServerError(res, "Internal server error");
  }
});

// PATCH /api/system-requirements/:id - Update system requirement
router.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res, "Authentication required");
    }

    const { id } = req.params;
    const normalizedId = id.toUpperCase();
    const { title, description, password, status, approvalNotes } = req.body;

    if (!title && !description && !status) {
      return badRequest(res, "No fields to update");
    }

    if (title && (typeof title !== "string" || title.length > 200)) {
      return unprocessableEntity(res, "Title must be a string with max 200 characters");
    }

    if (
      description &&
      (typeof description !== "string" || description.length === 0)
    ) {
      return unprocessableEntity(res, "Description cannot be empty");
    }

    const pool = getPool();

    // Get current requirement
    const currentResult = await pool.query(
      `
      SELECT sr.id,
             sr.title,
             sr.description,
             sr.status,
             sr.revision,
             sr.created_by AS "createdBy",
             sr.created_at AS "createdAt",
             sr.last_modified AS "lastModified",
             sr.modified_by AS "modifiedBy",
             sr.approved_at AS "approvedAt",
             sr.approved_by AS "approvedBy",
             sr.deleted_at AS "deletedAt",
             sr.approval_notes AS "approvalNotes",
             creator.full_name AS "createdByName",
             modifier.full_name AS "modifiedByName",
             approver.full_name AS "approvedByName"
      FROM system_requirements sr
      LEFT JOIN users creator ON sr.created_by = creator.id
      LEFT JOIN users modifier ON sr.modified_by = modifier.id
      LEFT JOIN users approver ON sr.approved_by = approver.id
      WHERE sr.id = $1 AND sr.deleted_at IS NULL
    `,
      [normalizedId],
    );

    if (currentResult.rows.length === 0) {
      return notFound(res, "Requirement not found");
    }

    const current = currentResult.rows[0];

    // Password validation scenarios:
    // 1. Editing an approved requirement
    // 2. Changing status to approved
    const wasApproved = current.status === "approved";
    const wantsToApprove =
      status === "approved" && current.status !== "approved";

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

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (title) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      params.push(title);
    }

    if (description) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }

    // Handle status changes
    if (wantsToApprove) {
      // Approving the requirement
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push("approved");

      paramCount++;
      updates.push(`revision = $${paramCount}`);
      params.push(current.revision === 0 ? 1 : current.revision);

      paramCount++;
      updates.push(`approved_at = $${paramCount}`);
      params.push(new Date());

      paramCount++;
      updates.push(`approved_by = $${paramCount}`);
      params.push(req.user.id);

      if (approvalNotes) {
        paramCount++;
        updates.push(`approval_notes = $${paramCount}`);
        params.push(approvalNotes);
      }
    } else if (wasApproved && !status) {
      // Editing an approved requirement without status change - reset to draft
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push("draft");

      paramCount++;
      updates.push(`approved_at = $${paramCount}`);
      params.push(null);

      paramCount++;
      updates.push(`approved_by = $${paramCount}`);
      params.push(null);
    }

    paramCount++;
    updates.push(`last_modified = $${paramCount}`);
    params.push(new Date());

    paramCount++;
    updates.push(`modified_by = $${paramCount}`);
    params.push(req.user.id);

    paramCount++;
    params.push(normalizedId);

    // Update requirement
    const updateResult = await pool.query(
      `UPDATE system_requirements
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
                 approval_notes AS "approvalNotes"`,
      params,
    );

    res.json({
      success: true,
      requirement: updateResult.rows[0],
    });
  } catch (error) {
    logger.error("Error updating system requirement:", error);
    return internalServerError(res, "Internal server error");
  }
});

// DELETE /api/system-requirements/:id - Soft delete system requirement
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res, "Authentication required");
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

    // Check if requirement exists
    const checkResult = await pool.query(
      "SELECT id FROM system_requirements WHERE id = $1 AND deleted_at IS NULL",
      [normalizedId],
    );

    if (checkResult.rows.length === 0) {
      return notFound(res, "Requirement not found");
    }

    // Soft delete
    await pool.query(
      "UPDATE system_requirements SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1",
      [normalizedId],
    );

    res.json({ success: true, message: "Requirement deleted successfully" });
  } catch (error) {
    logger.error("Error deleting system requirement:", error);
    return internalServerError(res, "Internal server error");
  }
});

export default router;
