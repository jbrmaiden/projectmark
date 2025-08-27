import { PermissionService } from '../../services/PermissionService';
import { MockDatabase, TestDataFactory } from '../setup';
import { User, UserTopicPermission, UserResourcePermission, Permission, UserRole } from '../../types';

// Mock the PermissionStrategies
jest.mock('../../patterns/PermissionStrategies', () => ({
  PermissionStrategyFactory: {
    createBestStrategy: jest.fn()
  }
}));

import { PermissionStrategyFactory } from '../../patterns/PermissionStrategies';
const mockPermissionStrategyFactory = PermissionStrategyFactory as jest.Mocked<typeof PermissionStrategyFactory>;

describe('PermissionService', () => {
  let permissionService: PermissionService;
  let mockDatabase: MockDatabase;
  let mockStrategy: any;

  beforeEach(() => {
    mockDatabase = new MockDatabase();
    permissionService = new PermissionService(mockDatabase);
    
    // Setup mock strategy
    mockStrategy = {
      canPerform: jest.fn(),
      getRole: jest.fn(),
      getDescription: jest.fn()
    };
    
    mockPermissionStrategyFactory.createBestStrategy.mockReturnValue(mockStrategy);
  });

  afterEach(() => {
    mockDatabase.clear();
    jest.clearAllMocks();
  });

  describe('hasTopicPermission', () => {
    it('should return true when user has required permission', async () => {
      const user = TestDataFactory.createUser({
        id: 'user1',
        role: 'Editor' as UserRole
      });
      
      const permission: UserTopicPermission = {
        id: 'perm1',
        userId: 'user1',
        topicId: 'topic1',
        permission: 'editor' as Permission,
        createdAt: new Date().toISOString(),
        grantedBy: 'admin1'
      };
      
      mockDatabase.seed('users', [user]);
      mockDatabase.seed('userTopicPermissions', [permission]);
      mockStrategy.canPerform.mockReturnValue(true);

      const result = await permissionService.hasTopicPermission('user1', 'topic1', 'editor');

      expect(result).toBe(true);
      expect(mockPermissionStrategyFactory.createBestStrategy).toHaveBeenCalledWith('Editor', 'editor');
      expect(mockStrategy.canPerform).toHaveBeenCalledWith('editor');
    });

    it('should return false when user has insufficient permission', async () => {
      const user = TestDataFactory.createUser({
        id: 'user1',
        role: 'Viewer' as UserRole
      });
      
      mockDatabase.seed('users', [user]);
      mockStrategy.canPerform.mockReturnValue(false);

      const result = await permissionService.hasTopicPermission('user1', 'topic1', 'editor');

      expect(result).toBe(false);
      expect(mockStrategy.canPerform).toHaveBeenCalledWith('editor');
    });

    it('should return false when user does not exist', async () => {
      const result = await permissionService.hasTopicPermission('nonexistent', 'topic1', 'viewer');

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockDatabase.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await permissionService.hasTopicPermission('user1', 'topic1', 'viewer');

      expect(result).toBe(false);
    });

    it('should work with global role permissions when no specific permissions exist', async () => {
      const user = TestDataFactory.createUser({
        id: 'user1',
        role: 'Admin' as UserRole
      });
      
      mockDatabase.seed('users', [user]);
      mockStrategy.canPerform.mockReturnValue(true);

      const result = await permissionService.hasTopicPermission('user1', 'topic1', 'owner');

      expect(result).toBe(true);
      expect(mockPermissionStrategyFactory.createBestStrategy).toHaveBeenCalledWith('Admin', undefined);
    });
  });

  describe('hasResourcePermission', () => {
    it('should return true when user has required resource permission', async () => {
      const user = TestDataFactory.createUser({
        id: 'user1',
        role: 'Editor' as UserRole
      });
      
      const permission: UserResourcePermission = {
        id: 'perm1',
        userId: 'user1',
        resourceId: 'resource1',
        permission: 'editor' as Permission,
        createdAt: new Date().toISOString(),
        grantedBy: 'admin1'
      };
      
      mockDatabase.seed('users', [user]);
      mockDatabase.seed('userResourcePermissions', [permission]);
      mockStrategy.canPerform.mockReturnValue(true);

      const result = await permissionService.hasResourcePermission('user1', 'resource1', 'editor');

      expect(result).toBe(true);
      expect(mockStrategy.canPerform).toHaveBeenCalledWith('editor');
    });

    it('should return false when user has insufficient resource permission', async () => {
      const user = TestDataFactory.createUser({
        id: 'user1',
        role: 'Viewer' as UserRole
      });
      
      mockDatabase.seed('users', [user]);
      mockStrategy.canPerform.mockReturnValue(false);

      const result = await permissionService.hasResourcePermission('user1', 'resource1', 'editor');

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockDatabase.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await permissionService.hasResourcePermission('user1', 'resource1', 'viewer');

      expect(result).toBe(false);
    });
  });

  describe('grantTopicPermission', () => {
    it('should create and return new topic permission', async () => {
      const result = await permissionService.grantTopicPermission('user1', 'topic1', 'editor', 'admin1');

      expect(result).toMatchObject({
        userId: 'user1',
        topicId: 'topic1',
        permission: 'editor',
        grantedBy: 'admin1'
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it('should store permission in database', async () => {
      await permissionService.grantTopicPermission('user1', 'topic1', 'editor', 'admin1');

      const permissions = await mockDatabase.find<UserTopicPermission>('userTopicPermissions', {
        userId: 'user1',
        topicId: 'topic1'
      });

      expect(permissions).toHaveLength(1);
      expect(permissions[0]?.permission).toBe('editor');
    });
  });

  describe('grantResourcePermission', () => {
    it('should create and return new resource permission', async () => {
      const result = await permissionService.grantResourcePermission('user1', 'resource1', 'editor', 'admin1');

      expect(result).toMatchObject({
        userId: 'user1',
        resourceId: 'resource1',
        permission: 'editor',
        grantedBy: 'admin1'
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it('should store resource permission in database', async () => {
      await permissionService.grantResourcePermission('user1', 'resource1', 'editor', 'admin1');

      const permissions = await mockDatabase.find<UserResourcePermission>('userResourcePermissions', {
        userId: 'user1',
        resourceId: 'resource1'
      });

      expect(permissions).toHaveLength(1);
      expect(permissions[0]?.permission).toBe('editor');
    });
  });

  describe('revokeTopicPermission', () => {
    it('should remove existing topic permission', async () => {
      const permission: UserTopicPermission = {
        id: 'perm1',
        userId: 'user1',
        topicId: 'topic1',
        permission: 'editor' as Permission,
        createdAt: new Date().toISOString(),
        grantedBy: 'admin1'
      };
      
      mockDatabase.seed('userTopicPermissions', [permission]);

      const result = await permissionService.revokeTopicPermission('user1', 'topic1');

      expect(result).toBe(true);
      
      const permissions = await mockDatabase.find<UserTopicPermission>('userTopicPermissions', {
        userId: 'user1',
        topicId: 'topic1'
      });
      expect(permissions).toHaveLength(0);
    });

    it('should return false when no permission exists to revoke', async () => {
      const result = await permissionService.revokeTopicPermission('user1', 'topic1');

      expect(result).toBe(false);
    });
  });

  describe('getUserTopicPermissions', () => {
    it('should return all topic permissions for user', async () => {
      const permissions: UserTopicPermission[] = [
        {
          id: 'perm1',
          userId: 'user1',
          topicId: 'topic1',
          permission: 'editor' as Permission,
          createdAt: new Date().toISOString(),
          grantedBy: 'admin1'
        },
        {
          id: 'perm2',
          userId: 'user1',
          topicId: 'topic2',
          permission: 'viewer' as Permission,
          createdAt: new Date().toISOString(),
          grantedBy: 'admin1'
        }
      ];
      
      mockDatabase.seed('userTopicPermissions', permissions);

      const result = await permissionService.getUserTopicPermissions('user1');

      expect(result).toHaveLength(2);
      expect(result[0]?.topicId).toBe('topic1');
      expect(result[1]?.topicId).toBe('topic2');
    });

    it('should return empty array when user has no permissions', async () => {
      const result = await permissionService.getUserTopicPermissions('user1');

      expect(result).toEqual([]);
    });
  });

  describe('getTopicPermissions', () => {
    it('should return all users with permissions on topic', async () => {
      const permissions: UserTopicPermission[] = [
        {
          id: 'perm1',
          userId: 'user1',
          topicId: 'topic1',
          permission: 'editor' as Permission,
          createdAt: new Date().toISOString(),
          grantedBy: 'admin1'
        },
        {
          id: 'perm2',
          userId: 'user2',
          topicId: 'topic1',
          permission: 'viewer' as Permission,
          createdAt: new Date().toISOString(),
          grantedBy: 'admin1'
        }
      ];
      
      mockDatabase.seed('userTopicPermissions', permissions);

      const result = await permissionService.getTopicPermissions('topic1');

      expect(result).toHaveLength(2);
      expect(result[0]?.userId).toBe('user1');
      expect(result[1]?.userId).toBe('user2');
    });
  });

  describe('getUserPermissionStrategy', () => {
    it('should return permission strategy for user and topic', async () => {
      const user = TestDataFactory.createUser({
        id: 'user1',
        role: 'Editor' as UserRole
      });
      
      const permission: UserTopicPermission = {
        id: 'perm1',
        userId: 'user1',
        topicId: 'topic1',
        permission: 'owner' as Permission,
        createdAt: new Date().toISOString(),
        grantedBy: 'admin1'
      };
      
      mockDatabase.seed('users', [user]);
      mockDatabase.seed('userTopicPermissions', [permission]);

      const result = await permissionService.getUserPermissionStrategy('user1', 'topic1');

      expect(result).toBe(mockStrategy);
      expect(mockPermissionStrategyFactory.createBestStrategy).toHaveBeenCalledWith('Editor', 'owner');
    });

    it('should return strategy without specific permission when no topic specified', async () => {
      const user = TestDataFactory.createUser({
        id: 'user1',
        role: 'Admin' as UserRole
      });
      
      mockDatabase.seed('users', [user]);

      const result = await permissionService.getUserPermissionStrategy('user1');

      expect(result).toBe(mockStrategy);
      expect(mockPermissionStrategyFactory.createBestStrategy).toHaveBeenCalledWith('Admin', undefined);
    });

    it('should return null when user does not exist', async () => {
      const result = await permissionService.getUserPermissionStrategy('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockDatabase.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await permissionService.getUserPermissionStrategy('user1');

      expect(result).toBeNull();
    });
  });

  describe('getPermissionSummary', () => {
    it('should return comprehensive permission summary', async () => {
      const user = TestDataFactory.createUser({
        id: 'user1',
        role: 'Editor' as UserRole
      });
      
      mockDatabase.seed('users', [user]);
      mockStrategy.getRole.mockReturnValue('Editor');
      mockStrategy.getDescription.mockReturnValue('Can edit content');
      mockStrategy.canPerform.mockImplementation((permission: Permission) => {
        return permission === 'viewer' || permission === 'editor';
      });

      const result = await permissionService.getPermissionSummary('user1');

      expect(result).toEqual({
        strategy: mockStrategy.constructor.name,
        role: 'Editor',
        description: 'Can edit content',
        canView: true,
        canEdit: true,
        canOwn: false
      });
    });

    it('should return null when user does not exist', async () => {
      const result = await permissionService.getPermissionSummary('nonexistent');

      expect(result).toBeNull();
    });
  });
});
