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
import {
  calculatePTotal
} from '../services/riskCalculation.service';

const router = express.Router();

// Map risk record from database
function mapRiskFromDb(dbRow: Record<string, unknown>) {
  const mapped = { ...dbRow };
  // Remove snake_case keys and ensure camelCase
  if ('probability_p1' in dbRow) {
    mapped.probabilityP1 = dbRow.probability_p1;
    delete mapped.probability_p1;
  }
  if ('probability_p2' in dbRow) {
    mapped.probabilityP2 = dbRow.probability_p2;
    delete mapped.probability_p2;
  }
  if ('p_total_calculation_method' in dbRow) {
    mapped.pTotalCalculationMethod = dbRow.p_total_calculation_method;
    delete mapped.p_total_calculation_method;
  }
  if ('p_total' in dbRow) {
    mapped.pTotal = dbRow.p_total;
    delete mapped.p_total;
  }
  if ('residual_risk_score' in dbRow) {
    mapped.residualRiskScore = dbRow.residual_risk_score;
    delete mapped.residual_risk_score;
  }
  if ('foreseeable_sequence' in dbRow) {
    mapped.foreseeableSequence = dbRow.foreseeable_sequence;
    delete mapped.foreseeable_sequence;
  }
  return mapped;
}

// GET /api/risks - List all risks with filtering and pagination
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
      SELECT rr.id,
             rr.title,
             rr.description,
             rr.hazard,
             rr.harm,
             rr.foreseeable_sequence AS "foreseeableSequence",
             rr.severity,
             rr.probability_p1 AS "probabilityP1",
             rr.probability_p2 AS "probabilityP2",
             rr.p_total_calculation_method AS "pTotalCalculationMethod",
             rr.p_total AS "pTotal",
             rr.residual_risk_score AS "residualRiskScore",
             rr.status,
             rr.revision,
             rr.created_by AS "createdBy",
             rr.created_at AS "createdAt",
             rr.last_modified AS "lastModified",
             rr.modified_by AS "modifiedBy",
             rr.approved_at AS "approvedAt",
             rr.approved_by AS "approvedBy",
             rr.deleted_at AS "deletedAt",
             rr.approval_notes AS "approvalNotes",
             creator.full_name AS "createdByName",
             modifier.full_name AS "modifiedByName",
             approver.full_name AS "approvedByName"
      FROM risk_records rr
      LEFT JOIN users creator ON rr.created_by = creator.id
      LEFT JOIN users modifier ON rr.modified_by = modifier.id
      LEFT JOIN users approver ON rr.approved_by = approver.id
      WHERE rr.deleted_at IS NULL`;
    const queryParams: (string | number)[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND rr.status = $${paramCount}`;
      queryParams.push(status as string);
    }

    // Add search filter if provided
    if (search && search.toString().trim() !== "") {
      paramCount++;
      query += ` AND (rr.id ILIKE $${paramCount} OR rr.title ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Sort handling
    const validSortColumns = ["id", "title", "createdAt", "lastModified", "residualRiskScore", "status"];
    const validOrder = ["asc", "desc"];
    const sortColumn = validSortColumns.includes(sort as string) ? sort : "lastModified";
    const sortOrder = validOrder.includes((order as string).toLowerCase())
      ? (order as string).toUpperCase()
      : "DESC";

    const columnMap: Record<string, string> = {
      id: "rr.id",
      title: "LOWER(rr.title)",
      createdAt: "rr.created_at",
      lastModified: "COALESCE(rr.last_modified, rr.created_at)",
      residualRiskScore: "rr.residual_risk_score",
      status: "rr.status",
    };
    const mappedColumn = columnMap[sortColumn as string] || "rr.id";
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
      "SELECT COUNT(*) FROM risk_records rr WHERE rr.deleted_at IS NULL";
    const countParams: (string | number)[] = [];
    let countParamNum = 0;

    if (status) {
      countParamNum++;
      countQuery += ` AND rr.status = $${countParamNum}`;
      countParams.push(status as string);
    }

    if (search && search.toString().trim() !== "") {
      countParamNum++;
      countQuery += ` AND (rr.id ILIKE $${countParamNum} OR rr.title ILIKE $${countParamNum})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    const pages = Math.ceil(total / effectiveLimit);

    const mappedData = result.rows.map(mapRiskFromDb);

    return successResponse(res, mappedData, {
      pagination: {
        total,
        page: parseInt(page as string),
        pages,
        limit: effectiveLimit,
      },
    });
  } catch (error) {
    logger.error("Error fetching risks:", error);
    return internalServerError(res);
  }
});

// GET /api/risks/:id - Get single risk record
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
      SELECT rr.id,
             rr.title,
             rr.description,
             rr.hazard,
             rr.harm,
             rr.foreseeable_sequence AS "foreseeableSequence",
             rr.severity,
             rr.probability_p1 AS "probabilityP1",
             rr.probability_p2 AS "probabilityP2",
             rr.p_total_calculation_method AS "pTotalCalculationMethod",
             rr.p_total AS "pTotal",
             rr.residual_risk_score AS "residualRiskScore",
             rr.status,
             rr.revision,
             rr.created_by AS "createdBy",
             rr.created_at AS "createdAt",
             rr.last_modified AS "lastModified",
             rr.modified_by AS "modifiedBy",
             rr.approved_at AS "approvedAt",
             rr.approved_by AS "approvedBy",
             rr.deleted_at AS "deletedAt",
             rr.approval_notes AS "approvalNotes",
             creator.full_name AS "createdByName",
             modifier.full_name AS "modifiedByName",
             approver.full_name AS "approvedByName"
      FROM risk_records rr
      LEFT JOIN users creator ON rr.created_by = creator.id
      LEFT JOIN users modifier ON rr.modified_by = modifier.id
      LEFT JOIN users approver ON rr.approved_by = approver.id
      WHERE rr.id = $1 AND rr.deleted_at IS NULL
    `,
      [normalizedId],
    );

    if (result.rows.length === 0) {
      return notFound(res, "Risk record not found");
    }

    res.json({
      success: true,
      requirement: mapRiskFromDb(result.rows[0]),
    });
  } catch (error) {
    logger.error("Error fetching risk record:", error);
    return internalServerError(res);
  }
});

// POST /api/risks - Create new risk record
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res);
    }

    const {
      title,
      description,
      hazard,
      harm,
      foreseeableSequence,
      severity,
      probabilityP1,
      probabilityP2,
      pTotalCalculationMethod,
      status,
      password,
      approvalNotes
    } = req.body;

    // Validation
    if (!title || !description || !hazard || !harm) {
      return unprocessableEntity(res, "Title, description, hazard, and harm are required");
    }

    if (!severity || !probabilityP1 || !probabilityP2 || !pTotalCalculationMethod) {
      return unprocessableEntity(res, "Severity, P₁, P₂, and P_total calculation method are required");
    }

    if (typeof title !== "string" || title.length > 200) {
      return unprocessableEntity(res, "Title must be a string with max 200 characters");
    }

    if (typeof description !== "string" || description.length === 0) {
      return unprocessableEntity(res, "Description cannot be empty");
    }

    if (typeof severity !== "number" || severity < 1 || severity > 5) {
      return unprocessableEntity(res, "Severity must be between 1 and 5");
    }

    if (typeof probabilityP1 !== "number" || probabilityP1 < 1 || probabilityP1 > 5) {
      return unprocessableEntity(res, "P₁ must be between 1 and 5");
    }

    if (typeof probabilityP2 !== "number" || probabilityP2 < 1 || probabilityP2 > 5) {
      return unprocessableEntity(res, "P₂ must be between 1 and 5");
    }

    if (typeof pTotalCalculationMethod !== "string" || pTotalCalculationMethod.trim().length === 0) {
      return unprocessableEntity(res, "P_total calculation method must be documented");
    }

    const pool = getPool();

    // If status is approved, password is required
    if (status === "approved" && !password) {
      return badRequest(res, "Password is required to create in approved status");
    }

    // Verify password if creating as approved
    if (status === "approved") {
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
      "SELECT id FROM risk_records WHERE LOWER(title) = LOWER($1) AND deleted_at IS NULL",
      [title],
    );

    if (duplicateCheck.rows.length > 0) {
      return conflict(res, "A risk record with this title already exists");
    }

    // Calculate P_total from P₁ and P₂
    const pTotal = calculatePTotal(probabilityP1, probabilityP2, pTotalCalculationMethod);

    // Remove: await checkRiskAcceptability(severity, pTotal);
    const finalStatus = status === "approved" ? "approved" : "draft";

    // Generate ID using sequence
    let riskId: string;
    try {
      const idQuery = "SELECT 'RISK-' || nextval('risk_requirement_seq') as id";
      const idResult = await pool.query(idQuery);
      riskId = idResult.rows[0].id;
    } catch (error) {
      logger.error("Error generating risk ID:", error);
      return internalServerError(res, "Error generating risk ID");
    }

    // Determine revision and approval fields
    const revision = status === "approved" ? 1 : 0;
    const approvedAt = status === "approved" ? new Date() : null;
    const approvedBy = status === "approved" ? req.user.id : null;

    const insertResult = await pool.query(
      `
      INSERT INTO risk_records (
        id, title, description, hazard, harm, foreseeable_sequence,
        severity, probability_p1, probability_p2, p_total_calculation_method, p_total,
        residual_risk_score, status, revision,
        created_by, created_at, last_modified, modified_by,
        approved_at, approved_by, deleted_at, approval_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING id,
                title,
                description,
                hazard,
                harm,
                foreseeable_sequence AS "foreseeableSequence",
                severity,
                probability_p1 AS "probabilityP1",
                probability_p2 AS "probabilityP2",
                p_total_calculation_method AS "pTotalCalculationMethod",
                p_total AS "pTotal",
                residual_risk_score AS "residualRiskScore",
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
        riskId,
        title,
        description,
        hazard,
        harm,
        foreseeableSequence || null,
        severity,
        probabilityP1,
        probabilityP2,
        pTotalCalculationMethod,
        pTotal,
        null, // residual_risk_score
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
      requirement: mapRiskFromDb(insertResult.rows[0]),
    });
  } catch (error) {
    logger.error("Error creating risk record:", error);
    return internalServerError(res);
  }
});

// PATCH /api/risks/:id - Update risk record
router.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res);
    }

    const { id } = req.params;
    const normalizedId = id.toUpperCase();
    const {
      title,
      description,
      hazard,
      harm,
      foreseeableSequence,
      severity,
      probabilityP1,
      probabilityP2,
      pTotalCalculationMethod,
      password,
      status,
      approvalNotes
    } = req.body;

    const pool = getPool();

    // Check if risk exists and is not deleted
    const existingResult = await pool.query(
      `SELECT id, title, description, hazard, harm, foreseeable_sequence AS "foreseeableSequence",
              severity, probability_p1 AS "probabilityP1", probability_p2 AS "probabilityP2",
              p_total_calculation_method AS "pTotalCalculationMethod", p_total AS "pTotal",
              residual_risk_score AS "residualRiskScore",
              status, revision, created_by AS "createdBy", created_at AS "createdAt",
              last_modified AS "lastModified", modified_by AS "modifiedBy",
              approved_at AS "approvedAt", approved_by AS "approvedBy",
              deleted_at AS "deletedAt", approval_notes AS "approvalNotes"
       FROM risk_records WHERE id = $1 AND deleted_at IS NULL`,
      [normalizedId],
    );

    if (existingResult.rows.length === 0) {
      return notFound(res, "Risk record not found");
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
    if (title && (typeof title !== "string" || title.length > 200)) {
      return unprocessableEntity(res, "Title must be a string with max 200 characters");
    }

    if (description && (typeof description !== "string" || description.length === 0)) {
      return unprocessableEntity(res, "Description cannot be empty");
    }

    if (severity !== undefined && (typeof severity !== "number" || severity < 1 || severity > 5)) {
      return unprocessableEntity(res, "Severity must be between 1 and 5");
    }

    if (probabilityP1 !== undefined && (typeof probabilityP1 !== "number" || probabilityP1 < 1 || probabilityP1 > 5)) {
      return unprocessableEntity(res, "P₁ must be between 1 and 5");
    }

    if (probabilityP2 !== undefined && (typeof probabilityP2 !== "number" || probabilityP2 < 1 || probabilityP2 > 5)) {
      return unprocessableEntity(res, "P₂ must be between 1 and 5");
    }

    // Check for duplicate title if title is being changed
    if (title) {
      const duplicateCheck = await pool.query(
        "SELECT id FROM risk_records WHERE LOWER(title) = LOWER($1) AND id != $2 AND deleted_at IS NULL",
        [title, normalizedId],
      );

      if (duplicateCheck.rows.length > 0) {
        return conflict(res, "A risk record with this title already exists");
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | number | Date | null)[] = [];
    let paramCount = 0;

    // Determine if we need to recalculate P_total and risk scores
    const needsRecalculation = 
      severity !== undefined || 
      probabilityP1 !== undefined || 
      probabilityP2 !== undefined || 
      pTotalCalculationMethod !== undefined;

    // Get current values for calculation
    const currentP1 = probabilityP1 !== undefined ? probabilityP1 : existing.probabilityP1;
    const currentP2 = probabilityP2 !== undefined ? probabilityP2 : existing.probabilityP2;
    const currentMethod = pTotalCalculationMethod !== undefined ? pTotalCalculationMethod : existing.pTotalCalculationMethod;

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

    if (hazard) {
      paramCount++;
      updates.push(`hazard = $${paramCount}`);
      values.push(hazard);
    }

    if (harm) {
      paramCount++;
      updates.push(`harm = $${paramCount}`);
      values.push(harm);
    }

    if (foreseeableSequence !== undefined) {
      paramCount++;
      updates.push(`foreseeable_sequence = $${paramCount}`);
      values.push(foreseeableSequence || null);
    }

    if (severity !== undefined) {
      paramCount++;
      updates.push(`severity = $${paramCount}`);
      values.push(severity);
    }

    if (probabilityP1 !== undefined) {
      paramCount++;
      updates.push(`probability_p1 = $${paramCount}`);
      values.push(probabilityP1);
    }

    if (probabilityP2 !== undefined) {
      paramCount++;
      updates.push(`probability_p2 = $${paramCount}`);
      values.push(probabilityP2);
    }

    if (pTotalCalculationMethod !== undefined) {
      paramCount++;
      updates.push(`p_total_calculation_method = $${paramCount}`);
      values.push(pTotalCalculationMethod);
    }

    // Recalculate P_total and risk scores if needed
    if (needsRecalculation) {
      const newPTotal = calculatePTotal(currentP1, currentP2, currentMethod);
      
      paramCount++;
      updates.push(`p_total = $${paramCount}`);
      values.push(newPTotal);

      // Remove: await checkRiskAcceptability(currentSeverity, newPTotal);
      
      // Only update status if it's not being explicitly set and risk was draft
      if (status === undefined && existing.status === 'draft') {
        // Keep status as draft (don't auto-update based on risk score)
        // Status can only be changed to approved via the approve endpoint
      }
    }

    if (updates.length === 0) {
      return badRequest(res, "No valid fields to update");
    }

    // Handle status changes
    if (wantsToApprove) {
      // Approving the risk
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
      // Editing an approved risk without status change - reset to draft
      paramCount++;
      updates.push(`status = $${paramCount}`);
      values.push("draft");

      paramCount++;
      updates.push(`approved_at = $${paramCount}`);
      values.push(null);

      paramCount++;
      updates.push(`approved_by = $${paramCount}`);
      values.push(null);
    } else if (status) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      values.push(status);
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
      UPDATE risk_records
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id,
                title,
                description,
                hazard,
                harm,
                foreseeable_sequence AS "foreseeableSequence",
                severity,
                probability_p1 AS "probabilityP1",
                probability_p2 AS "probabilityP2",
                p_total_calculation_method AS "pTotalCalculationMethod",
                p_total AS "pTotal",
                residual_risk_score AS "residualRiskScore",
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
      requirement: mapRiskFromDb(updateResult.rows[0]),
    });
  } catch (error) {
    logger.error("Error updating risk record:", error);
    return internalServerError(res);
  }
});

// POST /api/risks/:id/approve - Approve risk record
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

    // Check if risk exists and is not already approved
    const existingResult = await pool.query(
      `SELECT id, title, description, hazard, harm, foreseeable_sequence AS "foreseeableSequence",
              severity, probability_p1 AS "probabilityP1", probability_p2 AS "probabilityP2",
              p_total_calculation_method AS "pTotalCalculationMethod", p_total AS "pTotal",
              residual_risk_score AS "residualRiskScore",
              status, revision, created_by AS "createdBy", created_at AS "createdAt",
              last_modified AS "lastModified", modified_by AS "modifiedBy",
              approved_at AS "approvedAt", approved_by AS "approvedBy",
              deleted_at AS "deletedAt", approval_notes AS "approvalNotes"
       FROM risk_records WHERE id = $1 AND deleted_at IS NULL`,
      [normalizedId],
    );

    if (existingResult.rows.length === 0) {
      return notFound(res, "Risk record not found");
    }

    const existing = existingResult.rows[0];

    if (existing.status === "approved") {
      return badRequest(res, "Risk record is already approved");
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

    // Update risk with approval
    const updateResult = await pool.query(
      `UPDATE risk_records
       SET status = 'approved',
           revision = revision + 1,
           approved_at = CURRENT_TIMESTAMP,
           approved_by = $2,
           approval_notes = $3
       WHERE id = $1
       RETURNING id,
                 title,
                 description,
                 hazard,
                 harm,
                 foreseeable_sequence AS "foreseeableSequence",
                 severity,
                 probability_p1 AS "probabilityP1",
                 probability_p2 AS "probabilityP2",
                 p_total_calculation_method AS "pTotalCalculationMethod",
                 p_total AS "pTotal",
                 residual_risk_score AS "residualRiskScore",
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
      requirement: mapRiskFromDb(updateResult.rows[0]),
    });
  } catch (error) {
    logger.error("Error approving risk record:", error);
    return internalServerError(res);
  }
});

// DELETE /api/risks/:id - Soft delete risk record
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

    // Check if risk exists and is not already deleted
    const existingResult = await pool.query(
      "SELECT id FROM risk_records WHERE id = $1 AND deleted_at IS NULL",
      [normalizedId],
    );

    if (existingResult.rows.length === 0) {
      return notFound(res, "Risk record not found");
    }

    // Soft delete
    await pool.query(
      "UPDATE risk_records SET deleted_at = $1, modified_by = $2, last_modified = $3 WHERE id = $4",
      [new Date(), req.user.id, new Date(), normalizedId],
    );

    res.json({
      success: true,
      message: "Risk record deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting risk record:", error);
    return internalServerError(res);
  }
});

// GET /api/risks/:id/downstream-traces - Get system requirements that trace from this risk record
router.get("/:id/downstream-traces", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return unauthorized(res);
    }

    const { id } = req.params;
    const normalizedId = id.toUpperCase();
    const pool = getPool();

    // Check if risk record exists
    const riskResult = await pool.query(
      "SELECT id FROM risk_records WHERE id = $1 AND deleted_at IS NULL",
      [normalizedId],
    );

    if (riskResult.rows.length === 0) {
      return notFound(res, "Risk record not found");
    }

    // Get downstream traces (system requirements linked as control measures)
    const tracesResult = await pool.query(
      `
      SELECT sr.id, sr.title, sr.status
      FROM system_requirements sr
      INNER JOIN traces rt ON sr.id = rt.to_requirement_id
      WHERE rt.from_requirement_id = $1
        AND rt.to_requirement_id LIKE 'SR-%'
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

