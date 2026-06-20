import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const body: ApiResponse<T> = { success: true, data };
  res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

export function sendError(res: Response, error: string, statusCode = 400, code?: string): void {
  const body: ApiResponse = { success: false, error, code };
  res.status(statusCode).json(body);
}

export function sendPaginated<T>(res: Response, data: PaginatedResponse<T>): void {
  sendSuccess(res, data);
}
