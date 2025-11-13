import { Response } from 'express';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    pagination?: {
      total: number;
      page: number;
      limit: number;
      pages?: number;
    };
    [key: string]: any;
  };
}

export const errorResponse = (
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: any
): Response => {
  const response: ErrorResponse = {
    error: {
      code,
      message,
      ...(details && { details })
    }
  };
  return res.status(status).json(response);
};

export const successResponse = <T>(
  res: Response,
  data: T,
  meta?: SuccessResponse<T>['meta']
): Response => {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(meta && { meta })
  };
  return res.json(response);
};

export const badRequest = (res: Response, message: string, details?: any): Response => {
  return errorResponse(res, 400, 'BAD_REQUEST', message, details);
};

export const unauthorized = (res: Response, message = 'Authentication required', details?: any): Response => {
  return errorResponse(res, 401, 'UNAUTHORIZED', message, details);
};

export const forbidden = (res: Response, message = 'Access denied', details?: any): Response => {
  return errorResponse(res, 403, 'FORBIDDEN', message, details);
};

export const notFound = (res: Response, message = 'Resource not found', details?: any): Response => {
  return errorResponse(res, 404, 'NOT_FOUND', message, details);
};

export const conflict = (res: Response, message: string, details?: any): Response => {
  return errorResponse(res, 409, 'CONFLICT', message, details);
};

export const unprocessableEntity = (res: Response, message: string, details?: any): Response => {
  return errorResponse(res, 422, 'UNPROCESSABLE_ENTITY', message, details);
};

export const internalServerError = (res: Response, message = 'Internal server error', details?: any): Response => {
  return errorResponse(res, 500, 'INTERNAL_ERROR', message, details);
};

export const serviceUnavailable = (res: Response, message = 'Service temporarily unavailable', details?: any): Response => {
  return errorResponse(res, 503, 'SERVICE_UNAVAILABLE', message, details);
};

export const created = (res: Response, data: any): Response => {
  return res.status(201).json({
    success: true,
    ...data
  });
};