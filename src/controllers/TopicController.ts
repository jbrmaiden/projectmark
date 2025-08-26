import { Request, Response } from 'express';
import { IDatabase } from '../database/interfaces/IDatabase';
import { Topic, Resource } from '../types';
import { TopicModel } from '../models/Topic';

export class TopicController {
  constructor(private database: IDatabase) {}

  async getAllTopics(req: Request, res: Response): Promise<void> {
    try {
      const topics = await this.database.find<Topic>('topics');
      
      // Optionally include resource counts
      const includeResourceCount = req.query.includeResourceCount === 'true';
      
      if (includeResourceCount) {
        const topicsWithResourceCount = await Promise.all(
          topics.map(async (topic) => {
            const resources = await this.database.find<Resource>('resources', { topicId: topic.id });
            return {
              ...topic,
              resourceCount: resources.length
            };
          })
        );
        
        res.json({
          success: true,
          data: topicsWithResourceCount,
          count: topics.length
        });
      } else {
        res.json({
          success: true,
          data: topics,
          count: topics.length
        });
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTopicById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Topic ID is required'
        });
        return;
      }
      const topic = await this.database.findById<Topic>('topics', id);

      if (!topic) {
        res.status(404).json({
          success: false,
          error: 'Topic not found'
        });
        return;
      }

      res.json({
        success: true,
        data: topic
      });
    } catch (error) {
      console.error('Error fetching topic:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async createTopic(req: Request, res: Response): Promise<void> {
    try {
      const topicData = req.body;

      // Validate input
      const validation = TopicModel.validate(topicData);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
        return;
      }

      // If parentTopicId is provided, verify it exists
      if (topicData.parentTopicId) {
        const parentTopic = await this.database.findById<Topic>('topics', topicData.parentTopicId);
        if (!parentTopic) {
          res.status(400).json({
            success: false,
            error: 'Parent topic not found'
          });
          return;
        }
      }

      // Create topic
      const newTopic = TopicModel.create(topicData);
      const createdTopic = await this.database.create<Topic>('topics', newTopic);

      res.status(201).json({
        success: true,
        data: createdTopic
      });
    } catch (error) {
      console.error('Error creating topic:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async updateTopic(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Topic ID is required'
        });
        return;
      }
      const updateData = req.body;

      // Find existing topic
      const existingTopic = await this.database.findById<Topic>('topics', id);
      if (!existingTopic) {
        res.status(404).json({
          success: false,
          error: 'Topic not found'
        });
        return;
      }

      // Validate update data
      const validation = TopicModel.validate({ ...existingTopic, ...updateData });
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
        return;
      }

      // If updating parentTopicId, verify it exists and isn't creating a circular reference
      if (updateData.parentTopicId && updateData.parentTopicId !== existingTopic.parentTopicId) {
        if (updateData.parentTopicId === id) {
          res.status(400).json({
            success: false,
            error: 'Topic cannot be its own parent'
          });
          return;
        }

        const parentTopic = await this.database.findById<Topic>('topics', updateData.parentTopicId);
        if (!parentTopic) {
          res.status(400).json({
            success: false,
            error: 'Parent topic not found'
          });
          return;
        }
      }

      // Update topic
      const updatedTopicData = TopicModel.update(existingTopic, updateData);
      const updatedTopic = await this.database.updateById<Topic>('topics', id, updatedTopicData);

      res.json({
        success: true,
        data: updatedTopic
      });
    } catch (error) {
      console.error('Error updating topic:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async deleteTopic(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Topic ID is required'
        });
        return;
      }

      // Check if topic exists
      const existingTopic = await this.database.findById<Topic>('topics', id);
      if (!existingTopic) {
        res.status(404).json({
          success: false,
          error: 'Topic not found'
        });
        return;
      }

      // Check if topic has child topics
      const childTopics = await this.database.find<Topic>('topics', { parentTopicId: id });
      if (childTopics.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete topic with child topics',
          details: `Topic has ${childTopics.length} child topic(s)`
        });
        return;
      }

      // Delete topic
      const deleted = await this.database.deleteById('topics', id);
      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete topic'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Topic deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting topic:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTopicsByParent(req: Request, res: Response): Promise<void> {
    try {
      const { parentId } = req.params;

      // If parentId is 'root', get topics with no parent
      const criteria = parentId === 'root' 
        ? { parentTopicId: undefined }
        : { parentTopicId: parentId };

      const topics = await this.database.find<Topic>('topics', criteria);

      res.json({
        success: true,
        data: topics,
        count: topics.length
      });
    } catch (error) {
      console.error('Error fetching topics by parent:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTopicWithResources(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Topic ID is required'
        });
        return;
      }

      // Get the topic
      const topic = await this.database.findById<Topic>('topics', id);
      if (!topic) {
        res.status(404).json({
          success: false,
          error: 'Topic not found'
        });
        return;
      }

      // Get associated resources
      const resources = await this.database.find<Resource>('resources', { topicId: id });

      res.json({
        success: true,
        data: {
          ...topic,
          resources
        },
        resourceCount: resources.length
      });
    } catch (error) {
      console.error('Error fetching topic with resources:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTopicResources(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Topic ID is required'
        });
        return;
      }

      // Verify topic exists
      const topic = await this.database.findById<Topic>('topics', id);
      if (!topic) {
        res.status(404).json({
          success: false,
          error: 'Topic not found'
        });
        return;
      }

      // Get resources for this topic
      const resources = await this.database.find<Resource>('resources', { topicId: id });

      res.json({
        success: true,
        data: resources,
        count: resources.length,
        topic: {
          id: topic.id,
          name: topic.name
        }
      });
    } catch (error) {
      console.error('Error fetching topic resources:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
