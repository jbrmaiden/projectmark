import { Request, Response } from 'express';
import { IDatabase } from '../database/interfaces/IDatabase';
import { User } from '../types';
import { UserModel } from '../models/User';

/**
 * User controller handling CRUD operations
 */
export class UserController {
  constructor(private database: IDatabase) {}

  /**
   * Get all users
   */
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await this.database.find<User>('users');
      res.json({
        success: true,
        data: users,
        total: users.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }
      const user = await this.database.findById<User>('users', id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create new user
   */
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, role } = req.body;

      // Validate input
      const validation = UserModel.validate({ name, email, role });
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
        return;
      }

      // Check if email already exists
      const existingUsers = await this.database.find<User>('users', { email: email.toLowerCase() });
      if (existingUsers.length > 0) {
        res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        });
        return;
      }

      // Create user
      const userData = UserModel.create({ name, email, role });
      const createdUser = await this.database.create<User>('users', userData);

      res.status(201).json({
        success: true,
        data: createdUser
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update user by ID
   */
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }
      const updateData = req.body;

      // Get existing user
      const existingUser = await this.database.findById<User>('users', id);
      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Validate update data
      const validation = UserModel.validate({ ...existingUser, ...updateData });
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
        return;
      }

      // Check email uniqueness if email is being updated
      if (updateData.email && updateData.email !== existingUser.email) {
        const existingUsers = await this.database.find<User>('users', { email: updateData.email.toLowerCase() });
        if (existingUsers.length > 0) {
          res.status(409).json({
            success: false,
            error: 'User with this email already exists'
          });
          return;
        }
      }

      // Update user
      const updatedUserData = UserModel.update(existingUser, updateData);
      const updatedUser = await this.database.updateById<User>('users', id, updatedUserData);

      res.json({
        success: true,
        data: updatedUser
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete user by ID
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const deleted = await this.database.deleteById('users', id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
