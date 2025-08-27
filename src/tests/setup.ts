import { IDatabase } from '../database/interfaces/IDatabase';
import { User, Topic, Resource, EntityType } from '../types';

/**
 * Mock database implementation for testing
 */
export class MockDatabase implements IDatabase {
  private data: Map<string, Map<string, any>> = new Map();

  constructor() {
    // Initialize collections
    this.data.set('users', new Map());
    this.data.set('topics', new Map());
    this.data.set('resources', new Map());
  }

  async connect(): Promise<boolean> {
    // Mock implementation - no actual connection needed
    return true;
  }

  async disconnect(): Promise<boolean> {
    // Mock implementation - no actual disconnection needed
    return true;
  }

  async create<T>(collection: EntityType, data: Partial<T>): Promise<T> {
    const collectionData = this.data.get(collection) || new Map();
    const id = (data as any).id || `${collection}-${Date.now()}-${Math.random()}`;
    const fullData = { ...data, id } as T;
    collectionData.set(id, fullData);
    this.data.set(collection, collectionData);
    return fullData;
  }

  async find<T>(collection: EntityType, criteria?: Record<string, any>): Promise<T[]> {
    const collectionData = this.data.get(collection) || new Map();
    const items = Array.from(collectionData.values()) as T[];
    
    if (!criteria) {
      return items;
    }

    return items.filter(item => {
      return Object.entries(criteria).every(([key, value]) => {
        if (value === undefined) {
          return (item as any)[key] === undefined || (item as any)[key] === null;
        }
        return (item as any)[key] === value;
      });
    });
  }

  async findById<T>(collection: EntityType, id: string): Promise<T | null> {
    const collectionData = this.data.get(collection) || new Map();
    return collectionData.get(id) || null;
  }

  async updateById<T>(collection: EntityType, id: string, data: Partial<T>): Promise<T | null> {
    const collectionData = this.data.get(collection) || new Map();
    const existing = collectionData.get(id);
    
    if (!existing) {
      return null;
    }

    const updated = { ...existing, ...data };
    collectionData.set(id, updated);
    return updated;
  }

  async deleteById(collection: EntityType, id: string): Promise<boolean> {
    const collectionData = this.data.get(collection) || new Map();
    return collectionData.delete(id);
  }

  async count(collection: EntityType, criteria?: any): Promise<number> {
    const items = await this.find(collection, criteria);
    return items.length;
  }

  // Test utility methods
  clear(): void {
    this.data.clear();
    this.data.set('users', new Map());
    this.data.set('topics', new Map());
    this.data.set('resources', new Map());
  }

  seed(collection: string, items: any[]): void {
    const collectionData = new Map();
    items.forEach(item => {
      collectionData.set(item.id, item);
    });
    this.data.set(collection, collectionData);
  }
}

/**
 * Generate a valid UUID for testing
 */
const generateTestUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Test data factories
 */
export const TestDataFactory = {
  createUser: (overrides: Partial<User> = {}): User => ({
    id: generateTestUUID(),
    name: 'Test User',
    email: 'test@example.com',
    role: 'Editor',
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  createTopic: (overrides: Partial<Topic> = {}): Topic => ({
    id: generateTestUUID(),
    baseTopicId: generateTestUUID(),
    name: 'Test Topic',
    content: 'Test content',
    description: 'Test description',
    version: 1,
    isLatest: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: generateTestUUID(),
    ...overrides
  }),

  createResource: (overrides: Partial<Resource> = {}): Resource => ({
    id: generateTestUUID(),
    name: 'Test Resource',
    type: 'document',
    url: 'https://example.com/resource',
    description: 'Test resource description',
    topicId: generateTestUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  })
};

/**
 * Mock Express request/response objects
 */
export const createMockRequest = (overrides: any = {}) => ({
  params: {},
  body: {},
  query: {},
  headers: {},
  ...overrides
});

export const createMockResponse = () => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  };
  return res;
};
