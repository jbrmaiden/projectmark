import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../services/PermissionService';
import { PermissionServiceFactory } from '../services/PermissionServiceFactory';
import { Permission } from '../types';
import { formatErrorResponse } from '../utils/errorHandler';

/**
 * Permission middleware for protecting routes
 */
export class PermissionMiddleware {
  constructor(private permissionService: PermissionService) {}

  /**
   * Require topic permission middleware
   */
  requireTopicPermission(permission: Permission) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.headers['x-user-id'] as string; // Simple auth header
        const topicId = req.params.id || req.params.topicId || req.body.topicId;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: 'Authentication required',
            type: 'auth_error'
          });
          return;
        }

        if (!topicId) {
          res.status(400).json({
            success: false,
            error: 'Topic ID required',
            type: 'validation_error'
          });
          return;
        }

        const hasPermission = await this.permissionService.hasTopicPermission(
          userId, 
          topicId, 
          permission
        );

        if (!hasPermission) {
          res.status(403).json({
            success: false,
            error: `Insufficient permissions. Required: ${permission}`,
            type: 'permission_error'
          });
          return;
        }

        // Add user info to request for use in controllers
        req.user = { id: userId };
        next();
      } catch (error) {
        const errorResponse = formatErrorResponse(error as Error);
        res.status(500).json(errorResponse);
      }
    };
  }

  /**
   * Require resource permission middleware
   */
  requireResourcePermission(permission: Permission) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.headers['x-user-id'] as string;
        const resourceId = req.params.id || req.params.resourceId || req.body.resourceId;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: 'Authentication required',
            type: 'auth_error'
          });
          return;
        }

        if (!resourceId) {
          res.status(400).json({
            success: false,
            error: 'Resource ID required',
            type: 'validation_error'
          });
          return;
        }

        const hasPermission = await this.permissionService.hasResourcePermission(
          userId, 
          resourceId, 
          permission
        );

        if (!hasPermission) {
          res.status(403).json({
            success: false,
            error: `Insufficient permissions. Required: ${permission}`,
            type: 'permission_error'
          });
          return;
        }

        req.user = { id: userId };
        next();
      } catch (error) {
        const errorResponse = formatErrorResponse(error as Error);
        res.status(500).json(errorResponse);
      }
    };
  }

  /**
   * Require admin role middleware
   */
  requireAdmin() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.headers['x-user-id'] as string;

        if (!userId) {
          res.status(401).json({
            success: false,
            error: 'Authentication required',
            type: 'auth_error'
          });
          return;
        }

        // Check if user is admin (simplified - would use proper auth service)
        const hasPermission = await this.permissionService.hasTopicPermission(
          userId, 
          'any', // Special case for admin check
          'owner'
        );

        if (!hasPermission) {
          res.status(403).json({
            success: false,
            error: 'Admin access required',
            type: 'permission_error'
          });
          return;
        }

        req.user = { id: userId };
        next();
      } catch (error) {
        const errorResponse = formatErrorResponse(error as Error);
        res.status(500).json(errorResponse);
      }
    };
  }
}

// Export convenience functions that use the global PermissionService instance
export const requireTopicPermission = (permission: Permission) => {
  const permissionService = PermissionServiceFactory.getInstance();
  const middleware = new PermissionMiddleware(permissionService);
  return middleware.requireTopicPermission(permission);
};

export const requireResourcePermission = (permission: Permission) => {
  const permissionService = PermissionServiceFactory.getInstance();
  const middleware = new PermissionMiddleware(permissionService);
  return middleware.requireResourcePermission(permission);
};

export const requireAdminRole = () => {
  const permissionService = PermissionServiceFactory.getInstance();
  const middleware = new PermissionMiddleware(permissionService);
  return middleware.requireAdmin();
};

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}
