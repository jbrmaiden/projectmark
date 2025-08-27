import { Permission, UserRole } from '../types';

/**
 * Strategy interface for permission checking
 */
export interface IPermissionStrategy {
  canPerform(requiredPermission: Permission): boolean;
  getRole(): UserRole;
  getDescription(): string;
}

/**
 * Admin permission strategy - can do everything
 */
export class AdminPermissionStrategy implements IPermissionStrategy {
  canPerform(requiredPermission: Permission): boolean {
    return true; // Admins can do everything
  }

  getRole(): UserRole {
    return 'Admin';
  }

  getDescription(): string {
    return 'Full administrative access to all resources';
  }
}

/**
 * Editor permission strategy - can view and edit but not own
 */
export class EditorPermissionStrategy implements IPermissionStrategy {
  canPerform(requiredPermission: Permission): boolean {
    const allowedPermissions: Permission[] = ['viewer', 'editor'];
    return allowedPermissions.includes(requiredPermission);
  }

  getRole(): UserRole {
    return 'Editor';
  }

  getDescription(): string {
    return 'Can create, read, and update content but cannot delete or manage permissions';
  }
}

/**
 * Viewer permission strategy - can only view
 */
export class ViewerPermissionStrategy implements IPermissionStrategy {
  canPerform(requiredPermission: Permission): boolean {
    return requiredPermission === 'viewer';
  }

  getRole(): UserRole {
    return 'Viewer';
  }

  getDescription(): string {
    return 'Read-only access to content';
  }
}

/**
 * Specific permission strategy - based on granted permissions
 */
export class SpecificPermissionStrategy implements IPermissionStrategy {
  constructor(private grantedPermission: Permission) {}

  canPerform(requiredPermission: Permission): boolean {
    const permissionHierarchy: Record<Permission, number> = {
      'viewer': 1,
      'editor': 2,
      'owner': 3
    };

    return permissionHierarchy[this.grantedPermission] >= permissionHierarchy[requiredPermission];
  }

  getRole(): UserRole {
    // Map permission to closest role
    switch (this.grantedPermission) {
      case 'owner':
        return 'Admin';
      case 'editor':
        return 'Editor';
      case 'viewer':
      default:
        return 'Viewer';
    }
  }

  getDescription(): string {
    return `Specific ${this.grantedPermission} permission granted`;
  }

  getGrantedPermission(): Permission {
    return this.grantedPermission;
  }
}

/**
 * Factory for creating permission strategies
 */
export class PermissionStrategyFactory {
  /**
   * Create strategy based on user role
   */
  static createRoleStrategy(role: UserRole): IPermissionStrategy {
    switch (role) {
      case 'Admin':
        return new AdminPermissionStrategy();
      case 'Editor':
        return new EditorPermissionStrategy();
      case 'Viewer':
        return new ViewerPermissionStrategy();
      default:
        return new ViewerPermissionStrategy(); // Default to most restrictive
    }
  }

  /**
   * Create strategy based on specific permission
   */
  static createPermissionStrategy(permission: Permission): IPermissionStrategy {
    return new SpecificPermissionStrategy(permission);
  }

  /**
   * Create the most permissive strategy between role and specific permission
   */
  static createBestStrategy(role: UserRole, specificPermission?: Permission): IPermissionStrategy {
    const roleStrategy = this.createRoleStrategy(role);
    
    // Admin role always takes precedence - they have full access
    if (role === 'Admin') {
      return roleStrategy;
    }
    
    if (!specificPermission) {
      return roleStrategy;
    }

    const permissionStrategy = this.createPermissionStrategy(specificPermission);
    
    // Return the strategy that allows more permissions
    // Test with a high-level permission to see which is more permissive
    if (permissionStrategy.canPerform('owner') && !roleStrategy.canPerform('owner')) {
      return permissionStrategy;
    }
    
    if (permissionStrategy.canPerform('editor') && !roleStrategy.canPerform('editor')) {
      return permissionStrategy;
    }

    return roleStrategy;
  }
}
