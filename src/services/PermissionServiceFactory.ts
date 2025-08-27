import { IDatabase } from '../database/interfaces/IDatabase';
import { PermissionService } from './PermissionService';

/**
 * Factory for creating PermissionService instances with proper database injection
 */
export class PermissionServiceFactory {
  private static instance: PermissionService | null = null;

  /**
   * Initialize the global PermissionService instance with database
   */
  static initialize(database: IDatabase): void {
    this.instance = new PermissionService(database);
  }

  /**
   * Get the initialized PermissionService instance
   */
  static getInstance(): PermissionService {
    if (!this.instance) {
      throw new Error('PermissionService not initialized. Call PermissionServiceFactory.initialize(database) first.');
    }
    return this.instance;
  }

  /**
   * Create a new PermissionService instance with specific database
   */
  static create(database: IDatabase): PermissionService {
    return new PermissionService(database);
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
  }
}
