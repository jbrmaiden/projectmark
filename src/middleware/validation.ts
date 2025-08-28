import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Validation middleware factory for request validation
 */
export const validate = (schema: {
  body?: z.ZodSchema;
  params?: z.ZodSchema;
  query?: z.ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // Validate route parameters
      if (schema.params) {
        req.params = schema.params.parse(req.params) as any;
      }

      // Validate query parameters
      if (schema.query) {
        req.query = schema.query.parse(req.query) as any;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors,
        });
        return;
      }

      // Handle unexpected errors
      console.error('Validation middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
};

/**
 * Async validation helper for use within controllers
 */
export const validateAsync = async <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<T> => {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof ZodError) {
      // Re-throw the original ZodError to be caught in the controller
      throw error;
    }
    throw error;
  }
};

/**
 * Format Zod validation errors into a readable string
 */
export const formatZodError = (error: ZodError): string[] => {
  return error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`);
};

/**
 * Middleware to validate UUID parameters
 */
export const validateUuidParam = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    
    if (!value) {
      res.status(400).json({
        success: false,
        error: `Missing required parameter: ${paramName}`,
      });
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(value)) {
      res.status(400).json({
        success: false,
        error: `Invalid UUID format for parameter: ${paramName}`,
        details: [{
          field: paramName,
          message: 'Must be a valid UUID',
          received: value,
        }],
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to validate pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    if (isNaN(page) || page < 1) {
      res.status(400).json({
        success: false,
        error: 'Invalid page parameter',
        details: [{
          field: 'page',
          message: 'Must be a positive integer',
          received: req.query.page,
        }],
      });
      return;
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        error: 'Invalid limit parameter',
        details: [{
          field: 'limit',
          message: 'Must be a positive integer between 1 and 100',
          received: req.query.limit,
        }],
      });
      return;
    }

    // Add validated values to request
    req.query.page = page.toString();
    req.query.limit = limit.toString();

    next();
  } catch (error) {
    console.error('Pagination validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
