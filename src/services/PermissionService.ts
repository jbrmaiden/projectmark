import { IDatabase } from '../database/interfaces/IDatabase';
import { User, UserTopicPermission, UserResourcePermission, Permission, UserRole } from '../types';
import { IPermissionStrategy, PermissionStrategyFactory } from '../patterns/PermissionStrategies';

/**
 * Service for managing user permissions on topics and resources
 */
export class PermissionService {
  constructor(private database: IDatabase) {}

  /**
   * Check if user has permission to perform action on topic
   */
  async hasTopicPermission(userId: string, topicId: string, requiredPermission: Permission): Promise<boolean> {
    try {
      // Get user to check global role
      const user = await this.database.findById<User>('users', userId);
      if (!user) return false;

      // Check specific topic permission
      const permissions = await this.database.find<UserTopicPermission>('userTopicPermissions', {
        userId,
        topicId
      });

      // Get the appropriate strategy
      const specificPermission = permissions.length > 0 ? permissions[0]?.permission : undefined;
      const strategy = this.getPermissionStrategy(user.role, specificPermission);
      
      return strategy.canPerform(requiredPermission);
    } catch (error) {
      console.error('Error checking topic permission:', error);
      return false;
    }
  }

  /**
   * Check if user has permission to perform action on resource
   */
  async hasResourcePermission(userId: string, resourceId: string, requiredPermission: Permission): Promise<boolean> {
    try {
      const user = await this.database.findById<User>('users', userId);
      if (!user) return false;

      // Check specific resource permission
      const permissions = await this.database.find<UserResourcePermission>('userResourcePermissions', {
        userId,
        resourceId
      });

      // Get the appropriate strategy
      const strategy = this.getPermissionStrategy(user.role, permissions[0]?.permission);
      
      return strategy.canPerform(requiredPermission);
    } catch (error) {
      console.error('Error checking resource permission:', error);
      return false;
    }
  }

  /**
   * Grant topic permission to user
   */
  async grantTopicPermission(
    userId: string, 
    topicId: string, 
    permission: Permission, 
    grantedBy: string
  ): Promise<UserTopicPermission> {
    const permissionRecord: UserTopicPermission = {
      id: this.generateId(),
      userId,
      topicId,
      permission,
      createdAt: new Date().toISOString(),
      grantedBy
    };

    return await this.database.create<UserTopicPermission>('userTopicPermissions', permissionRecord);
  }

  /**
   * Grant resource permission to user
   */
  async grantResourcePermission(
    userId: string, 
    resourceId: string, 
    permission: Permission, 
    grantedBy: string
  ): Promise<UserResourcePermission> {
    const permissionRecord: UserResourcePermission = {
      id: this.generateId(),
      userId,
      resourceId,
      permission,
      createdAt: new Date().toISOString(),
      grantedBy
    };

    return await this.database.create<UserResourcePermission>('userResourcePermissions', permissionRecord);
  }

  /**
   * Revoke topic permission from user
   */
  async revokeTopicPermission(userId: string, topicId: string): Promise<boolean> {
    const permissions = await this.database.find<UserTopicPermission>('userTopicPermissions', {
      userId,
      topicId
    });

    if (permissions.length > 0 && permissions[0]) {
      return await this.database.deleteById('userTopicPermissions', permissions[0].id);
    }

    return false;
  }

  /**
   * Get all topic permissions for a user
   */
  async getUserTopicPermissions(userId: string): Promise<UserTopicPermission[]> {
    return await this.database.find<UserTopicPermission>('userTopicPermissions', { userId });
  }

  /**
   * Get all users with permissions on a topic
   */
  async getTopicPermissions(topicId: string): Promise<UserTopicPermission[]> {
    return await this.database.find<UserTopicPermission>('userTopicPermissions', { topicId });
  }

  /**
   * Get appropriate permission strategy based on role and specific permissions
   */
  private getPermissionStrategy(role: UserRole, specificPermission?: Permission): IPermissionStrategy {
    return PermissionStrategyFactory.createBestStrategy(role, specificPermission);
  }

  /**
   * Get user's permission strategy for debugging/logging
   */
  async getUserPermissionStrategy(userId: string, topicId?: string): Promise<IPermissionStrategy | null> {
    try {
      const user = await this.database.findById<User>('users', userId);
      if (!user) return null;

      let specificPermission: Permission | undefined;
      
      if (topicId) {
        const permissions = await this.database.find<UserTopicPermission>('userTopicPermissions', {
          userId,
          topicId
        });
        specificPermission = permissions[0]?.permission;
      }

      return this.getPermissionStrategy(user.role, specificPermission);
    } catch (error) {
      console.error('Error getting user permission strategy:', error);
      return null;
    }
  }

  /**
   * Get permission summary for user
   */
  async getPermissionSummary(userId: string, topicId?: string): Promise<{
    strategy: string;
    role: UserRole;
    description: string;
    canView: boolean;
    canEdit: boolean;
    canOwn: boolean;
  } | null> {
    const strategy = await this.getUserPermissionStrategy(userId, topicId);
    if (!strategy) return null;

    return {
      strategy: strategy.constructor.name,
      role: strategy.getRole(),
      description: strategy.getDescription(),
      canView: strategy.canPerform('viewer'),
      canEdit: strategy.canPerform('editor'),
      canOwn: strategy.canPerform('owner')
    };
  }

  /**
   * Generate unique ID for permission records
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}
