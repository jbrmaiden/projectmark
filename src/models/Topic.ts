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
   */
  static create(topicData: Omit<Topic, 'id' | 'baseTopicId' | 'createdAt' | 'updatedAt' | 'version' | 'isLatest'>): Topic {
    const now = new Date().toISOString();
    const baseTopicId = this.generateId();
    
    return {
      id: this.generateId(),
      baseTopicId: baseTopicId,
      name: topicData.name.trim(),
      content: topicData.content.trim(),
      createdAt: now,
      updatedAt: now,
      version: 1,
      isLatest: true,
      ...(topicData.description && { description: topicData.description.trim() }),
      ...(topicData.parentTopicId && { parentTopicId: topicData.parentTopicId }),
      ...(topicData.createdBy && { createdBy: topicData.createdBy })
    };
  }

  /**
   * Create a new version of an existing topic
   */
  static createVersion(
    existingTopic: Topic, 
    updateData: Partial<Omit<Topic, 'id' | 'baseTopicId' | 'createdAt' | 'version' | 'isLatest'>>,
    createdBy?: string
  ): Topic {
    const now = new Date().toISOString();
    
    const newVersion: Topic = {
      ...existingTopic,
      ...updateData,
      // New unique ID for this version
      id: this.generateId(),
      // Keep same baseTopicId to link versions
      baseTopicId: existingTopic.baseTopicId,
      // Increment version
      version: existingTopic.version + 1,
      // This becomes the latest version
      isLatest: true,
      // Update timestamps
      createdAt: now,
      updatedAt: now,
      // Clean data if provided
      ...(updateData.name && { name: updateData.name.trim() }),
      ...(updateData.content && { content: updateData.content.trim() }),
      ...(updateData.description && { description: updateData.description.trim() })
    };

    // Only add createdBy if provided
    if (createdBy) {
      newVersion.createdBy = createdBy;
    }

    return newVersion;
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
