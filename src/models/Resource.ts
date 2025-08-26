import { v4 as uuidv4 } from 'uuid';
import { Resource } from '../types';
import { isValidUUID, isValidURL } from '../utils/validation';

/**
 * Resource model class with validation and business logic
 */
export class ResourceModel {
  /**
   * Validate resource data before creation/update
   */
  static validate(resourceData: Partial<Resource>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields for creation
    if (!resourceData.topicId || resourceData.topicId.trim().length === 0) {
      errors.push('Topic ID is required');
    } else if (!isValidUUID(resourceData.topicId)) {
      errors.push('Topic ID must be a valid UUID');
    }

    if (!resourceData.url || resourceData.url.trim().length === 0) {
      errors.push('URL is required');
    } else if (!isValidURL(resourceData.url)) {
      errors.push('Invalid URL format');
    }

    if (!resourceData.description || resourceData.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (!resourceData.type || !['video', 'article', 'pdf', 'document', 'link'].includes(resourceData.type)) {
      errors.push('Type must be one of: video, article, pdf, document, link');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a new resource with default values
   */
  static create(resourceData: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>): Resource {
    const now = new Date().toISOString();
    return {
      id: this.generateId(),
      topicId: resourceData.topicId.trim(),
      url: resourceData.url.trim(),
      description: resourceData.description.trim(),
      type: resourceData.type,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Update resource data while preserving immutable fields
   */
  static update(existingResource: Resource, updateData: Partial<Omit<Resource, 'id' | 'createdAt'>>): Resource {
    return {
      ...existingResource,
      ...updateData,
      // Preserve immutable fields
      id: existingResource.id,
      createdAt: existingResource.createdAt,
      // Update timestamp
      updatedAt: new Date().toISOString(),
      // Clean data if provided
      ...(updateData.url && { url: updateData.url.trim() }),
      ...(updateData.description && { description: updateData.description.trim() }),
      ...(updateData.topicId && { topicId: updateData.topicId.trim() })
    };
  }

  private static generateId(): string {
    return uuidv4();
  }
}
