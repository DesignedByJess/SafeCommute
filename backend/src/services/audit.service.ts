import winston from 'winston';
import { AuditLog } from '../models/audit.model';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Record an audit event in the database and write to system logs.
 */
export async function auditLog(
  userId: string | null,
  eventType: string,
  eventData: any = {},
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<void> {
  try {
    // 1. Write to database audit log table
    await AuditLog.create({
      user_id: userId,
      event_type: eventType,
      event_data: eventData,
      ip_address: ipAddress || null,
      user_agent: userAgent || null
    });

    // 2. Log using Winston
    logger.info({
      message: `Audit Event: ${eventType}`,
      userId,
      eventData,
      ipAddress,
      userAgent
    });
  } catch (err) {
    // Fallback: log to console if DB fails
    logger.error('Failed to write audit log to database', {
      error: err,
      userId,
      eventType,
      eventData
    });
  }
}

export { logger };
