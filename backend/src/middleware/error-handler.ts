import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { logger } from '../services/audit.service';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    const body: Record<string, unknown> = { success: false, error: err.message, code: err.code };
    if (err.details) {
      body._debug = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  if (err.name === 'CSRF token mismatch' || (err as any).code === 'EBADCSRFTOKEN') {
    sendError(res, 'Invalid CSRF token', 403, 'CSRF_ERROR');
    return;
  }

  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  sendError(res, 'Internal server error', 500, 'INTERNAL_ERROR');
}
