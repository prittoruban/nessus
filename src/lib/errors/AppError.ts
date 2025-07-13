/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database related errors
 */
export class DatabaseError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(`Database Error: ${message}`, statusCode);
  }
}

/**
 * Validation related errors
 */
export class ValidationError extends AppError {
  public readonly details: Record<string, string>;

  constructor(message: string, details: Record<string, string> = {}) {
    super(message, 400);
    this.details = details;
  }
}

/**
 * File upload related errors
 */
export class FileUploadError extends AppError {
  constructor(message: string) {
    super(`File Upload Error: ${message}`, 400);
  }
}

/**
 * Not found errors
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(message, 404);
  }
}
