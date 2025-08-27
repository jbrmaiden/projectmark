import { UserController } from '../../controllers/UserController';
import { MockDatabase, TestDataFactory, createMockRequest, createMockResponse } from '../setup';
import { User } from '../../types';
import * as UserModel from '../../models/User';

describe('UserController', () => {
  let userController: UserController;
  let mockDatabase: MockDatabase;

  beforeEach(() => {
    mockDatabase = new MockDatabase();
    userController = new UserController(mockDatabase);
  });

  afterEach(() => {
    mockDatabase.clear();
  });

  describe('getAllUsers', () => {
    it('should return all users successfully', async () => {

      const users = [
        TestDataFactory.createUser({ id: 'user1', name: 'User 1' }),
        TestDataFactory.createUser({ id: 'user2', name: 'User 2' })
      ];
      mockDatabase.seed('users', users);

      const req = createMockRequest();
      const res = createMockResponse();

      await userController.getAllUsers(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'User 1' }),
          expect.objectContaining({ name: 'User 2' })
        ]),
        total: 2
      });
    });

    it('should handle database errors', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      jest.spyOn(mockDatabase, 'find').mockRejectedValue(new Error('Database error'));

      await userController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getUserById', () => {
    it('should return user by ID successfully', async () => {
      const user = TestDataFactory.createUser({ id: 'user1', name: 'Test User' });
      mockDatabase.seed('users', [user]);

      const req = createMockRequest({ params: { id: 'user1' } });
      const res = createMockResponse();

      await userController.getUserById(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ name: 'Test User' })
      });
    });

    it('should return 400 when ID is missing', async () => {
      const req = createMockRequest({ params: {} });
      const res = createMockResponse();

      await userController.getUserById(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User ID is required'
      });
    });

    it('should return 404 when user not found', async () => {
      const req = createMockRequest({ params: { id: 'nonexistent' } });
      const res = createMockResponse();

      await userController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      });
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const userData = {
        name: 'New User',
        email: 'new@example.com',
        role: 'Editor' as const
      };

      const req = createMockRequest({ body: userData });
      const res = createMockResponse();

      const mockValidate = jest.fn().mockReturnValue({ isValid: true, errors: [] });
      const mockCreate = jest.fn().mockReturnValue({
        id: 'new-user-id',
        ...userData,
        createdAt: new Date().toISOString()
      });

      jest.doMock('../../models/User', () => ({
        UserModel: {
          validate: mockValidate,
          create: mockCreate
        }
      }));

      await userController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          name: 'New User',
          email: 'new@example.com'
        })
      });
    });

    it('should return 400 for validation errors', async () => {
      const userData = {
        name: '',
        email: 'invalid-email',
        role: 'InvalidRole'
      };

      const req = createMockRequest({ body: userData });
      const res = createMockResponse();

      const mockValidate = jest.fn().mockReturnValue({
        isValid: false,
        errors: ['Name is required', 'Invalid email format', 'Role must be Admin, Editor, or Viewer']
      });

      jest.doMock('../../models/User', () => ({
        UserModel: {
          validate: mockValidate
        }
      }));

      await userController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: ['Name is required', 'Invalid email format', 'Role must be Admin, Editor, or Viewer']
      });
    });

    it('should return 409 for duplicate email', async () => {
      const existingUser = TestDataFactory.createUser({ email: 'existing@example.com' });
      mockDatabase.seed('users', [existingUser]);

      const userData = {
        name: 'New User',
        email: 'existing@example.com',
        role: 'Editor' as const
      };

      const req = createMockRequest({ body: userData });
      const res = createMockResponse();

      const mockValidate = jest.fn().mockReturnValue({ isValid: true, errors: [] });
      jest.doMock('../../models/User', () => ({
        UserModel: {
          validate: mockValidate
        }
      }));

      await userController.createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User with this email already exists'
      });
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const existingUser = TestDataFactory.createUser({ 
        id: 'user1', 
        name: 'Original Name',
        email: 'original@example.com'
      });
      mockDatabase.seed('users', [existingUser]);

      const updateData = { name: 'Updated Name' };
      const req = createMockRequest({ 
        params: { id: 'user1' },
        body: updateData
      });
      const res = createMockResponse();

      const mockValidate = jest.fn().mockReturnValue({ isValid: true, errors: [] });
      const mockUpdate = jest.fn().mockReturnValue({
        ...existingUser,
        ...updateData,
        updatedAt: new Date().toISOString()
      });

      jest.doMock('../../models/User', () => ({
        UserModel: {
          validate: mockValidate,
          update: mockUpdate
        }
      }));

      await userController.updateUser(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          name: 'Updated Name'
        })
      });
    });

    it('should return 400 when ID is missing', async () => {
      const req = createMockRequest({ params: {}, body: { name: 'Updated' } });
      const res = createMockResponse();

      await userController.updateUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User ID is required'
      });
    });

    it('should return 404 when user not found', async () => {
      const req = createMockRequest({ 
        params: { id: 'nonexistent' },
        body: { name: 'Updated' }
      });
      const res = createMockResponse();

      await userController.updateUser(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const user = TestDataFactory.createUser({ id: 'user1' });
      mockDatabase.seed('users', [user]);

      const req = createMockRequest({ params: { id: 'user1' } });
      const res = createMockResponse();

      await userController.deleteUser(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully'
      });
    });

    it('should return 400 when ID is missing', async () => {
      const req = createMockRequest({ params: {} });
      const res = createMockResponse();

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User ID is required'
      });
    });

    it('should return 404 when user not found', async () => {
      const req = createMockRequest({ params: { id: 'nonexistent' } });
      const res = createMockResponse();

      await userController.deleteUser(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      });
    });
  });
});
