import { PoolClient } from 'pg';

export async function logAuditEvent(
  client: PoolClient,
  eventType: string,
  eventName: string,
  aggregateType: string,
  aggregateId: string,
  userId: string,
  eventData: any,
  metadata?: any
) {
  const query = `
    SELECT log_audit_event($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `;

  const result = await client.query(query, [
    eventType,
    eventName,
    aggregateType,
    aggregateId,
    userId,
    eventData,
    metadata || null,
    null, // ip_address
    null, // user_agent
    null  // session_id
  ]);

  return result.rows[0].log_audit_event;
}