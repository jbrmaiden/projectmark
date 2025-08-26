import { v4 as uuidv4 } from 'uuid';
import { Topic } from '../types';
import { isValidUUID } from '../utils/validation';

/**
 * Topic model class with validation and business logic
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

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a new topic with default values
   */
  static create(topicData: Omit<Topic, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Topic {
    const now = new Date().toISOString();
    return {
      id: this.generateId(),
      name: topicData.name.trim(),
      content: topicData.content.trim(),
      createdAt: now,
      updatedAt: now,
      version: 1,
      ...(topicData.parentTopicId && { parentTopicId: topicData.parentTopicId })
    };
  }

  /**
   * Update topic data while preserving immutable fields and incrementing version
   */
  static update(existingTopic: Topic, updateData: Partial<Omit<Topic, 'id' | 'createdAt' | 'version'>>): Topic {
    return {
      ...existingTopic,
      ...updateData,
      // Preserve immutable fields
      id: existingTopic.id,
      createdAt: existingTopic.createdAt,
      // Increment version on update
      version: existingTopic.version + 1,
      // Update timestamp
      updatedAt: new Date().toISOString(),
      // Clean data if provided
      ...(updateData.name && { name: updateData.name.trim() }),
      ...(updateData.content && { content: updateData.content.trim() })
    };
  }

 
  private static generateId(): string {
    return uuidv4();
  }
}
