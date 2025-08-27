import { PermissionServiceFactory } from '../../services/PermissionServiceFactory';
import { PermissionService } from '../../services/PermissionService';
import { MockDatabase } from '../setup';

describe('PermissionServiceFactory', () => {
  let mockDatabase: MockDatabase;

  beforeEach(() => {
    mockDatabase = new MockDatabase();
    // Reset the singleton instance before each test
    PermissionServiceFactory.reset();
  });

  afterEach(() => {
    PermissionServiceFactory.reset();
  });

  describe('initialize', () => {
    it('should initialize the singleton instance with database', () => {
      PermissionServiceFactory.initialize(mockDatabase);

      const instance = PermissionServiceFactory.getInstance();
      expect(instance).toBeInstanceOf(PermissionService);
    });

    it('should replace existing instance when initialized again', () => {
      const database1 = new MockDatabase();
      const database2 = new MockDatabase();

      PermissionServiceFactory.initialize(database1);
      const instance1 = PermissionServiceFactory.getInstance();

      PermissionServiceFactory.initialize(database2);
      const instance2 = PermissionServiceFactory.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('getInstance', () => {
    it('should return the initialized instance', () => {
      PermissionServiceFactory.initialize(mockDatabase);

      const instance1 = PermissionServiceFactory.getInstance();
      const instance2 = PermissionServiceFactory.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(PermissionService);
    });

    it('should throw error when not initialized', () => {
      expect(() => {
        PermissionServiceFactory.getInstance();
      }).toThrow('PermissionService not initialized. Call PermissionServiceFactory.initialize(database) first.');
    });
  });

  describe('create', () => {
    it('should create new instance with specific database', () => {
      const instance1 = PermissionServiceFactory.create(mockDatabase);
      const instance2 = PermissionServiceFactory.create(mockDatabase);

      expect(instance1).toBeInstanceOf(PermissionService);
      expect(instance2).toBeInstanceOf(PermissionService);
      expect(instance1).not.toBe(instance2); // Should be different instances
    });

    it('should create instance without affecting singleton', () => {
      PermissionServiceFactory.initialize(mockDatabase);
      const singletonInstance = PermissionServiceFactory.getInstance();

      const newInstance = PermissionServiceFactory.create(mockDatabase);

      expect(newInstance).not.toBe(singletonInstance);
      expect(PermissionServiceFactory.getInstance()).toBe(singletonInstance);
    });
  });

  describe('reset', () => {
    it('should reset the singleton instance', () => {
      PermissionServiceFactory.initialize(mockDatabase);
      expect(() => PermissionServiceFactory.getInstance()).not.toThrow();

      PermissionServiceFactory.reset();

      expect(() => {
        PermissionServiceFactory.getInstance();
      }).toThrow('PermissionService not initialized');
    });

    it('should allow re-initialization after reset', () => {
      PermissionServiceFactory.initialize(mockDatabase);
      const instance1 = PermissionServiceFactory.getInstance();

      PermissionServiceFactory.reset();
      PermissionServiceFactory.initialize(mockDatabase);
      const instance2 = PermissionServiceFactory.getInstance();

      expect(instance1).not.toBe(instance2);
      expect(instance2).toBeInstanceOf(PermissionService);
    });
  });

  describe('integration scenarios', () => {
    it('should support testing workflow with reset', () => {
      // Simulate test setup
      PermissionServiceFactory.initialize(mockDatabase);
      const testInstance = PermissionServiceFactory.getInstance();
      expect(testInstance).toBeInstanceOf(PermissionService);

      // Simulate test teardown
      PermissionServiceFactory.reset();

      // Simulate next test setup
      const newDatabase = new MockDatabase();
      PermissionServiceFactory.initialize(newDatabase);
      const newTestInstance = PermissionServiceFactory.getInstance();

      expect(newTestInstance).toBeInstanceOf(PermissionService);
      expect(newTestInstance).not.toBe(testInstance);
    });

    it('should support multiple service creation for different contexts', () => {
      const database1 = new MockDatabase();
      const database2 = new MockDatabase();

      const service1 = PermissionServiceFactory.create(database1);
      const service2 = PermissionServiceFactory.create(database2);

      expect(service1).toBeInstanceOf(PermissionService);
      expect(service2).toBeInstanceOf(PermissionService);
      expect(service1).not.toBe(service2);
    });
  });
});
