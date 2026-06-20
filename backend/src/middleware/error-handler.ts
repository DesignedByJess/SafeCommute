import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { logger } from '../services/audit.service';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code);
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
