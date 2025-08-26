import { Request, Response } from 'express';
import { IDatabase } from '../database/interfaces/IDatabase';
import { Resource, Topic } from '../types';
import { ResourceModel } from '../models/Resource';

export class ResourceController {
  constructor(private database: IDatabase) {}

  async getAllResources(req: Request, res: Response): Promise<void> {
    try {
      const resources = await this.database.find<Resource>('resources');
      res.json({
        success: true,
        data: resources,
        count: resources.length
      });
    } catch (error) {
      console.error('Error fetching resources:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getResourceById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Resource ID is required'
        });
        return;
      }
      const resource = await this.database.findById<Resource>('resources', id);

      if (!resource) {
        res.status(404).json({
          success: false,
          error: 'Resource not found'
        });
        return;
      }

      res.json({
        success: true,
        data: resource
      });
    } catch (error) {
      console.error('Error fetching resource:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getResourcesByTopic(req: Request, res: Response): Promise<void> {
    try {
      const { topicId } = req.params;
      if (!topicId) {
        res.status(400).json({
          success: false,
          error: 'Topic ID is required'
        });
        return;
      }

      // Verify topic exists
      const topic = await this.database.findById<Topic>('topics', topicId);
      if (!topic) {
        res.status(404).json({
          success: false,
          error: 'Topic not found'
        });
        return;
      }

      const resources = await this.database.find<Resource>('resources', { topicId });

      res.json({
        success: true,
        data: resources,
        count: resources.length,
        topicName: topic.name
      });
    } catch (error) {
      console.error('Error fetching resources by topic:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async createResource(req: Request, res: Response): Promise<void> {
    try {
      const resourceData = req.body;

      // Validate input
      const validation = ResourceModel.validate(resourceData);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
        return;
      }

      // Verify topic exists
      const topic = await this.database.findById<Topic>('topics', resourceData.topicId);
      if (!topic) {
        res.status(400).json({
          success: false,
          error: 'Topic not found'
        });
        return;
      }

      // Create resource
      const newResource = ResourceModel.create(resourceData);
      const createdResource = await this.database.create<Resource>('resources', newResource);

      res.status(201).json({
        success: true,
        data: createdResource
      });
    } catch (error) {
      console.error('Error creating resource:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async updateResource(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Resource ID is required'
        });
        return;
      }
      const updateData = req.body;

      // Find existing resource
      const existingResource = await this.database.findById<Resource>('resources', id);
      if (!existingResource) {
        res.status(404).json({
          success: false,
          error: 'Resource not found'
        });
        return;
      }

      // Validate update data
      const validation = ResourceModel.validate({ ...existingResource, ...updateData });
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
        return;
      }

      // If updating topicId, verify new topic exists
      if (updateData.topicId && updateData.topicId !== existingResource.topicId) {
        const topic = await this.database.findById<Topic>('topics', updateData.topicId);
        if (!topic) {
          res.status(400).json({
            success: false,
            error: 'Topic not found'
          });
          return;
        }
      }

      // Update resource
      const updatedResourceData = ResourceModel.update(existingResource, updateData);
      const updatedResource = await this.database.updateById<Resource>('resources', id, updatedResourceData);

      res.json({
        success: true,
        data: updatedResource
      });
    } catch (error) {
      console.error('Error updating resource:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async deleteResource(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Resource ID is required'
        });
        return;
      }

      // Check if resource exists
      const existingResource = await this.database.findById<Resource>('resources', id);
      if (!existingResource) {
        res.status(404).json({
          success: false,
          error: 'Resource not found'
        });
        return;
      }

      // Delete resource
      const deleted = await this.database.deleteById('resources', id);
      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete resource'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Resource deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting resource:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getResourcesByType(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      if (!type) {
        res.status(400).json({
          success: false,
          error: 'Resource type is required'
        });
        return;
      }

      // Validate type
      const validTypes = ['video', 'article', 'pdf', 'document', 'link'];
      if (!validTypes.includes(type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid resource type',
          validTypes
        });
        return;
      }

      const resources = await this.database.find<Resource>('resources', { type });

      res.json({
        success: true,
        data: resources,
        count: resources.length,
        type
      });
    } catch (error) {
      console.error('Error fetching resources by type:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
