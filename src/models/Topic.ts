import { v4 as uuidv4 } from 'uuid';
import { Topic } from '../types';
import { isValidUUID } from '../utils/validation';

/**
 * Topic model class with validation and versioning business logic
 */
export class TopicModel {
  /**
   * Validate topic data before creation/update
   */
  static validate(topicData: Partial<Topic>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields for creation
    if (!topicData.name || topicData.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!topicData.content || topicData.content.trim().length === 0) {
      errors.push('Content is required');
    }

    // Validate version if provided
    if (topicData.version !== undefined && (topicData.version < 1 || !Number.isInteger(topicData.version))) {
      errors.push('Version must be a positive integer');
    }

    // Validate parentTopicId format if provided
    if (topicData.parentTopicId && !isValidUUID(topicData.parentTopicId)) {
      errors.push('Parent topic ID must be a valid UUID');
    }

    // Validate baseTopicId format if provided
    if (topicData.baseTopicId && !isValidUUID(topicData.baseTopicId)) {
      errors.push('Base topic ID must be a valid UUID');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a new topic (version 1) with default values
   * Supports both auto-generated IDs and provided IDs
   */
  static create(topicData: Partial<Topic>): Topic {
    try {
      // Validate required fields
      if (!topicData.name || typeof topicData.name !== 'string') {
        throw new Error('Topic name is required and must be a string');
      }
      
      if (!topicData.content || typeof topicData.content !== 'string') {
        throw new Error('Topic content is required and must be a string');
      }
      
      // Validate name and content are not empty after trimming
      const trimmedName = topicData.name.trim();
      const trimmedContent = topicData.content.trim();
      
      if (!trimmedName) {
        throw new Error('Topic name cannot be empty');
      }
      
      if (!trimmedContent) {
        throw new Error('Topic content cannot be empty');
      }
      
      // Validate optional fields
      if (topicData.description && typeof topicData.description !== 'string') {
        throw new Error('Topic description must be a string');
      }
      
      if (topicData.parentTopicId && typeof topicData.parentTopicId !== 'string') {
        throw new Error('Parent topic ID must be a string');
      }
      
      if (topicData.createdBy && typeof topicData.createdBy !== 'string') {
        throw new Error('Created by must be a string');
      }
      
      const now = new Date().toISOString();
      
      // Strategy: Use provided IDs if available, otherwise generate them
      const id = topicData.id || this.generateId();
      const baseTopicId = topicData.baseTopicId || topicData.id || this.generateId();
      
      return {
        id,
        baseTopicId,
        name: trimmedName,
        content: trimmedContent,
        createdAt: now,
        updatedAt: now,
        version: topicData.version || 1,
        isLatest: topicData.isLatest !== false,
        ...(topicData.description && { description: topicData.description.trim() }),
        ...(topicData.parentTopicId && { parentTopicId: topicData.parentTopicId }),
        ...(topicData.createdBy && { createdBy: topicData.createdBy })
      };
    } catch (error) {
      console.error('Error creating topic:', error);
      throw new Error(`Failed to create topic: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new version of an existing topic
   */
  static createVersion(
    existingTopic: Topic, 
    updateData: Partial<Omit<Topic, 'id' | 'baseTopicId' | 'createdAt' | 'version' | 'isLatest'>>,
    createdBy?: string
  ): Topic {
    try {
      if (!existingTopic) {
        throw new Error('Existing topic is required');
      }
      
      if (!existingTopic.baseTopicId) {
        throw new Error('Existing topic must have a baseTopicId');
      }
      
      // Validate update data if provided
      if (updateData.name && (typeof updateData.name !== 'string' || !updateData.name.trim())) {
        throw new Error('Topic name must be a non-empty string');
      }
      
      if (updateData.content && (typeof updateData.content !== 'string' || !updateData.content.trim())) {
        throw new Error('Topic content must be a non-empty string');
      }
      
      if (updateData.description && typeof updateData.description !== 'string') {
        throw new Error('Topic description must be a string');
      }
      
      if (updateData.parentTopicId && typeof updateData.parentTopicId !== 'string') {
        throw new Error('Parent topic ID must be a string');
      }
      
      if (createdBy && typeof createdBy !== 'string') {
        throw new Error('Created by must be a string');
      }
      
      const now = new Date().toISOString();
      
      const newVersion: Topic = {
        ...existingTopic,
        ...updateData,
        // New unique ID for this version
        id: this.generateId(),
        // Keep the same baseTopicId to link versions
        baseTopicId: existingTopic.baseTopicId,
        // Increment version number
        version: existingTopic.version + 1,
        // This becomes the latest version
        isLatest: true,
        // Update timestamps
        updatedAt: now,
        // Keep original creation time
        createdAt: existingTopic.createdAt,
        // Update creator if provided
        ...(createdBy && { createdBy })
      };
      
      // Trim string fields
      if (newVersion.name) newVersion.name = newVersion.name.trim();
      if (newVersion.content) newVersion.content = newVersion.content.trim();
      if (newVersion.description) newVersion.description = newVersion.description.trim();
      
      return newVersion;
    } catch (error) {
      console.error('Error creating topic version:', error);
      throw new Error(`Failed to create topic version: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mark a topic version as no longer the latest
   */
  static markAsOldVersion(topic: Topic): Topic {
    return {
      ...topic,
      isLatest: false,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Update topic data (legacy method - now creates new version)
   * @deprecated Use createVersion instead for proper versioning
   */
  static update(existingTopic: Topic, updateData: Partial<Omit<Topic, 'id' | 'createdAt' | 'version'>>): Topic {
    return this.createVersion(existingTopic, updateData);
  }

  private static generateId(): string {
    return uuidv4();
  }
}
