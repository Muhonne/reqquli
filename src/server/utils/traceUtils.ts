/**
 * Utility functions for trace operations
 * Determines requirement types from ID prefixes since types are no longer stored in database
 */

export type RequirementType = 'user' | 'system' | 'testcase' | 'testresult' | 'risk';

/**
 * Determines requirement type from ID prefix
 * @param id - Requirement ID (e.g., 'UR-1', 'SR-1', 'RISK-1', 'TC-1', 'TRES-1')
 * @returns Requirement type
 */
export function getRequirementType(id: string): RequirementType {
  const upperId = id.toUpperCase();
  if (upperId.startsWith('UR-')) {
    return 'user';
  }
  if (upperId.startsWith('SR-')) {
    return 'system';
  }
  if (upperId.startsWith('RISK-')) {
    return 'risk';
  }
  if (upperId.startsWith('TC-')) {
    return 'testcase';
  }
  if (upperId.startsWith('TRES-')) {
    return 'testresult';
  }
  // Default to system for backward compatibility
  return 'system';
}

/**
 * Maps requirement type to database table name
 * @param type - Requirement type
 * @returns Database table name
 */
export function getTableName(type: RequirementType): string {
  const tableMap: Record<RequirementType, string> = {
    'user': 'user_requirements',
    'system': 'system_requirements',
    'testcase': 'testing.test_cases',
    'testresult': 'testing.test_results',
    'risk': 'risk_records'
  };
  return tableMap[type];
}

/**
 * Validates that a requirement exists and is not deleted
 * @param pool - Database connection pool
 * @param id - Requirement ID
 * @returns Promise<boolean> - True if requirement exists and is not deleted
 */
export async function validateRequirementExists(pool: any, id: string): Promise<boolean> {
  const type = getRequirementType(id);
  const table = getTableName(type);
  
  // Test results don't have deleted_at field
  if (type === 'testresult') {
    const result = await pool.query(`SELECT id FROM ${table} WHERE id = $1`, [id]);
    return result.rows.length > 0;
  }
  
  const result = await pool.query(
    `SELECT id FROM ${table} WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows.length > 0;
}

/**
 * Gets title and description for a requirement by ID
 * Handles all requirement types dynamically
 * @param pool - Database connection pool
 * @param id - Requirement ID
 * @returns Promise with title, description, and status, or null if not found
 */
export async function getRequirementDetails(
  pool: any,
  id: string
): Promise<{ title: string; description: string; status: string } | null> {
  const type = getRequirementType(id);
  const table = getTableName(type);
  
  let query: string;
  if (type === 'testresult') {
    // Test results have different structure
    query = `
      SELECT 
        'Test Result: ' || tr.result || ' - ' || trun.name as title,
        'Result from test run ' || tr.test_run_id as description,
        tr.result as status
      FROM ${table} tr
      LEFT JOIN testing.test_runs trun ON tr.test_run_id = trun.id
      WHERE tr.id = $1
    `;
  } else {
    query = `
      SELECT title, description, status
      FROM ${table}
      WHERE id = $1 AND deleted_at IS NULL
    `;
  }
  
  const result = await pool.query(query, [id]);
  if (result.rows.length === 0) {
    return null;
  }
  
  return {
    title: result.rows[0].title,
    description: result.rows[0].description || '',
    status: result.rows[0].status
  };
}

