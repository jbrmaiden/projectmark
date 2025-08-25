import { v4 as uuidv4 } from 'uuid';
import { DatabaseConfig, EntityType } from '../../types';
import { IDatabase } from '../interfaces/IDatabase';

/**
 * Simple in-memory database implementation
 * Stores data in memory - data is lost when the process stops
 */
export class InMemoryDatabase implements IDatabase {
  private data: Record<string, Record<string, any>> = {};
  private connected: boolean = false;

  async connect(config: DatabaseConfig): Promise<boolean> {
    this.connected = true;
    console.log('Connected to simple in-memory database');
    return true;
  }

  async disconnect(): Promise<boolean> {
    this.connected = false;
    this.data = {};
    console.log('Disconnected from simple in-memory database');
    return true;
  }

  async create<T>(collection: EntityType, data: Partial<T>): Promise<T> {
    if (!this.data[collection]) {
      this.data[collection] = {};
    }

    const id = (data as any).id || this.generateId();
    const timestamp = new Date().toISOString();
    
    const record = {
      ...data,
      id,
      created_at: timestamp,
      updated_at: timestamp
    } as T;

    this.data[collection][id] = record;
    return record;
  }

  async findById<T>(collection: EntityType, id: string): Promise<T | null> {
    if (!this.data[collection] || !this.data[collection][id]) {
      return null;
    }
    return this.data[collection][id] as T;
  }

  async find<T>(collection: EntityType, criteria?: Record<string, any>): Promise<T[]> {
    if (!this.data[collection]) {
      return [];
    }

    const records = Object.values(this.data[collection]) as T[];
    
    if (!criteria) {
      return records;
    }

    return records.filter(record => {
      return Object.entries(criteria).every(([key, value]) => {
        return (record as any)[key] === value;
      });
    });
  }

  async updateById<T>(collection: EntityType, id: string, data: Partial<T>): Promise<T | null> {
    if (!this.data[collection] || !this.data[collection][id]) {
      return null;
    }

    const existing = this.data[collection][id];
    const updated = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString()
    } as T;

    this.data[collection][id] = updated;
    return updated;
  }

  async deleteById(collection: EntityType, id: string): Promise<boolean> {
    if (!this.data[collection] || !this.data[collection][id]) {
      return false;
    }

    delete this.data[collection][id];
    return true;
  }

  private generateId(): string {
    return uuidv4();
  }
}
