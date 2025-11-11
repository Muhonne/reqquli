import { getPool } from '../config/database';
import logger from '../config/logger';
import { RiskRecord } from '../../types/risks';

/**
 * Calculate Total Probability (P_total) from individual probabilities P₁ and P₂
 * The calculation method is manufacturer-defined and must be documented
 * 
 * @param p1 - Individual probability P₁ (1-5 scale)
 * @param p2 - Individual probability P₂ (1-5 scale)
 * @param method - Documentation of the calculation method
 * @returns P_total value (1-5 scale)
 * 
 * Default implementation: Uses the maximum of P₁ and P₂
 * This can be customized per manufacturer requirements
 */
export function calculatePTotal(p1: number, p2: number, method: string): number {
  // Validate inputs
  if (p1 < 1 || p1 > 5 || p2 < 1 || p2 > 5) {
    throw new Error('Probability values must be between 1 and 5');
  }

  // Default calculation: Use maximum of P₁ and P₂
  // This is a conservative approach - manufacturers can override this logic
  // based on their documented method
  const pTotal = Math.max(p1, p2);

  // Log the calculation for audit purposes
  logger.debug(`Calculated P_total: ${pTotal} from P₁: ${p1}, P₂: ${p2} using method: ${method.substring(0, 50)}...`);

  return pTotal;
}

/**
 * Calculate risk score from severity and P_total
 * Format: "{severity}{pTotal}" (e.g., "35" for severity=3, pTotal=5)
 * 
 * @param severity - Severity value (1-5 scale)
 * @param pTotal - Total Probability (1-5 scale)
 * @returns Risk score string
 */
export function calculateRiskScore(severity: number, pTotal: number): string {
  if (severity < 1 || severity > 5 || pTotal < 1 || pTotal > 5) {
    throw new Error('Severity and P_total must be between 1 and 5');
  }

  return `${severity}${pTotal}`;
}

/**
 * Check if a risk is acceptable based on the risk acceptability matrix
 * 
 * @param severity - Severity value (1-5 scale)
 * @param pTotal - Total Probability (1-5 scale)
 * @returns 'acceptable' | 'unacceptable'
 */
export async function checkRiskAcceptability(
  severity: number,
  pTotal: number
): Promise<'acceptable' | 'unacceptable'> {
  const pool = getPool();

  try {
    const result = await pool.query(
      'SELECT acceptability FROM risk_acceptability_matrix WHERE severity = $1 AND p_total = $2',
      [severity, pTotal]
    );

    if (result.rows.length === 0) {
      // Default to unacceptable if not found in matrix (conservative approach)
      logger.warn(`Risk acceptability not found for severity=${severity}, p_total=${pTotal}, defaulting to unacceptable`);
      return 'unacceptable';
    }

    return result.rows[0].acceptability as 'acceptable' | 'unacceptable';
  } catch (error) {
    logger.error('Error checking risk acceptability:', error);
    // Default to unacceptable on error (conservative approach)
    return 'unacceptable';
  }
}

/**
 * Update risk status based on current risk record state
 * Note: Status can only be 'draft' or 'approved'. This function returns 'draft' by default.
 * Status can only be changed to 'approved' via the approve endpoint.
 * 
 * @param riskRecord - The risk record to evaluate
 * @returns Updated status string ('draft' or 'approved')
 */
export async function updateRiskStatus(riskRecord: RiskRecord): Promise<string> {
  // Status is always 'draft' unless explicitly approved
  // Risk acceptability is checked for informational purposes but doesn't affect status
  return riskRecord.status === 'approved' ? 'approved' : 'draft';
}

