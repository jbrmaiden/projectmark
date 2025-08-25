import { DatabaseConfig, EntityType } from '../../types';

/**
 * Database interface for basic operations
 * This interface can be implemented by different database providers
 */
export interface IDatabase {
  connect(config: DatabaseConfig): Promise<boolean>;
  disconnect(): Promise<boolean>;
  create<T>(collection: EntityType, data: Partial<T>): Promise<T>;
  findById<T>(collection: EntityType, id: string): Promise<T | null>;
  find<T>(collection: EntityType, criteria?: Record<string, any>): Promise<T[]>;
  updateById<T>(collection: EntityType, id: string, data: Partial<T>): Promise<T | null>;
  deleteById(collection: EntityType, id: string): Promise<boolean>;
}
