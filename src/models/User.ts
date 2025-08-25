import { v4 as uuidv4 } from 'uuid';
import { User } from '../types';

/**
 * User model class with validation and business logic
 */
export class UserModel {
  /**
   * Validate user data before creation/update
   */
  static validate(userData: Partial<User>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields for creation
    if (!userData.name || userData.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!userData.email || userData.email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(userData.email)) {
      errors.push('Invalid email format');
    }

    if (!userData.role || !['Admin', 'Editor', 'Viewer'].includes(userData.role)) {
      errors.push('Role must be Admin, Editor, or Viewer');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }


  static create(userData: Omit<User, 'id' | 'createdAt'>): User {
    return {
      id: this.generateId(),
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      role: userData.role,
      createdAt: new Date().toISOString()
    };
  }


  static update(existingUser: User, updateData: Partial<Omit<User, 'id' | 'createdAt'>>): User {
    return {
      ...existingUser,
      ...updateData,
      id: existingUser.id,
      createdAt: existingUser.createdAt,
      ...(updateData.email && { email: updateData.email.trim().toLowerCase() }),
      ...(updateData.name && { name: updateData.name.trim() })
    };
  }


  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }


  private static generateId(): string {
    return uuidv4();
  }
}
