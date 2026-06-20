import { Request } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    phone?: string;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type TripStatus = 'active' | 'completed' | 'emergency';

export type ContactRelationship = 'spouse' | 'parent' | 'sibling' | 'friend' | 'colleague' | 'other';
