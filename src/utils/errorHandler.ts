/**
 * Centralized error handling utilities
 */

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public details?: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with ID ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

/**
 * Wraps database operations with error handling
 */
export function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  return operation().catch((error) => {
    console.error(`Database error in ${context}:`, error);
    throw new DatabaseError(
      `Database operation failed in ${context}`,
      error instanceof Error ? error : new Error(String(error))
    );
  });
}

/**
 * Standard error response formatter
 */
export function formatErrorResponse(error: Error) {
  if (error instanceof ValidationError) {
    return {
      success: false,
      error: error.message,
      details: error.details,
      type: 'validation_error'
    };
  }

  if (error instanceof NotFoundError) {
    return {
      success: false,
      error: error.message,
      type: 'not_found_error'
    };
  }

  if (error instanceof ConflictError) {
    return {
      success: false,
      error: error.message,
      type: 'conflict_error'
    };
  }

  if (error instanceof DatabaseError) {
    return {
      success: false,
      error: 'Database operation failed',
      type: 'database_error'
    };
  }

  return {
    success: false,
    error: error.message || 'Internal server error',
    type: 'internal_error'
  };
}
