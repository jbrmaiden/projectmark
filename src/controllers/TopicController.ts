import { Request, Response } from 'express';
import { IDatabase } from '../database/interfaces/IDatabase';
import { Topic, Resource, TopicHistory } from '../types';
import { TopicModel } from '../models/Topic';
import { TopicTreeService } from '../services/TopicTreeService';
import { ShortestPathService } from '../services/ShortestPathService';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  formatErrorResponse,
  withDatabaseErrorHandling 
} from '../utils/errorHandler';

export class TopicController {
  private topicTreeService: TopicTreeService;
  private shortestPathService: ShortestPathService;

  constructor(private database: IDatabase) {
    this.topicTreeService = new TopicTreeService(database);
    this.shortestPathService = new ShortestPathService(database);
  }

  async getAllTopics(req: Request, res: Response): Promise<void> {
    try {
      const onlyLatest = req.query.onlyLatest !== 'false'; // Default to true
      const includeResourceCount = req.query.includeResourceCount === 'true';
      
      // Get topics (latest versions only by default)
      const criteria = onlyLatest ? { isLatest: true } : {};
      const topics = await this.database.find<Topic>('topics', criteria);
      
      if (includeResourceCount) {
        const topicsWithResourceCount = await Promise.all(
          topics.map(async (topic) => {
            const resources = await this.database.find<Resource>('resources', { topicId: topic.baseTopicId });
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
        throw new ValidationError('Topic ID is required');
      }

      const topic = await withDatabaseErrorHandling(
        () => this.database.findById<Topic>('topics', id),
        'getTopicById'
      );

      if (!topic) {
        throw new NotFoundError('Topic', id);
      }

      res.json({
        success: true,
        data: topic
      });
    } catch (error) {
      const errorResponse = formatErrorResponse(error as Error);
      const statusCode = error instanceof ValidationError ? 400 :
                        error instanceof NotFoundError ? 404 : 500;
      res.status(statusCode).json(errorResponse);
    }
  }

  async createTopic(req: Request, res: Response): Promise<void> {
    try {
      const topicData = req.body;

      // Validate input
      const validation = TopicModel.validate(topicData);
      if (!validation.isValid) {
        throw new ValidationError('Validation failed', validation.errors);
      }

      // Validate parent topic exists if provided
      if (topicData.parentTopicId) {
        const parentTopic = await withDatabaseErrorHandling(
          () => this.database.findById<Topic>('topics', topicData.parentTopicId),
          'validateParentTopic'
        );
        if (!parentTopic) {
          throw new NotFoundError('Parent topic', topicData.parentTopicId);
        }
      }

      // Create topic using strategy pattern - handles both provided and auto-generated IDs
      const newTopic = TopicModel.create(topicData);
      const createdTopic = await withDatabaseErrorHandling(
        () => this.database.create<Topic>('topics', newTopic),
        'createTopic'
      );

      res.status(201).json({
        success: true,
        data: createdTopic
      });
    } catch (error) {
      const errorResponse = formatErrorResponse(error as Error);
      const statusCode = error instanceof ValidationError ? 400 :
                        error instanceof NotFoundError ? 404 : 500;
      res.status(statusCode).json(errorResponse);
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
      const { createdBy } = req.body;

      // Find existing topic (should be latest version)
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
        if (updateData.parentTopicId === existingTopic.baseTopicId) {
          res.status(400).json({
            success: false,
            error: 'Topic cannot be its own parent'
          });
          return;
        }

        const parentTopic = await this.database.find<Topic>('topics', { baseTopicId: updateData.parentTopicId, isLatest: true });
        if (parentTopic.length === 0) {
          res.status(400).json({
            success: false,
            error: 'Parent topic not found'
          });
          return;
        }
      }

      // Create new version instead of updating
      const newVersion = TopicModel.createVersion(existingTopic, updateData, createdBy);
      
      // Mark old version as no longer latest
      const oldVersion = TopicModel.markAsOldVersion(existingTopic);
      await this.database.updateById<Topic>('topics', existingTopic.id, oldVersion);
      
      // Create new version
      const createdVersion = await this.database.create<Topic>('topics', newVersion);

      res.json({
        success: true,
        data: createdVersion,
        versionInfo: {
          previousVersion: existingTopic.version,
          newVersion: newVersion.version,
          createdBy: createdBy
        },
        changes: {
          name: {
            from: existingTopic.name,
            to: newVersion.name,
            changed: existingTopic.name !== newVersion.name
          },
          content: {
            from: existingTopic.content,
            to: newVersion.content,
            changed: existingTopic.content !== newVersion.content
          },
          description: {
            from: existingTopic.description ?? '',
            to: newVersion.description ?? '',
            changed: existingTopic.description !== newVersion.description
          },
        }
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

  async getTopicVersion(req: Request, res: Response): Promise<void> {
    try {
      const { baseTopicId, version } = req.params;
      if (!baseTopicId) {
        res.status(400).json({
          success: false,
          error: 'Base topic ID is required'
        });
        return;
      }

      const versionNumber = version ? parseInt(version, 10) : undefined;
      if (version && (isNaN(versionNumber!) || versionNumber! < 1)) {
        res.status(400).json({
          success: false,
          error: 'Version must be a positive integer'
        });
        return;
      }

      // Find specific version or latest
      const criteria = versionNumber 
        ? { baseTopicId, version: versionNumber }
        : { baseTopicId, isLatest: true };
      
      const topics = await this.database.find<Topic>('topics', criteria);
      
      if (topics.length === 0) {
        res.status(404).json({
          success: false,
          error: versionNumber ? `Version ${versionNumber} not found` : 'Topic not found'
        });
        return;
      }

      res.json({
        success: true,
        data: topics[0]
      });
    } catch (error) {
      console.error('Error fetching topic version:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTopicHistory(req: Request, res: Response): Promise<void> {
    try {
      const { baseTopicId } = req.params;
      if (!baseTopicId) {
        res.status(400).json({
          success: false,
          error: 'Base topic ID is required'
        });
        return;
      }

      // Get all versions of this topic
      const allVersions = await this.database.find<Topic>('topics', { baseTopicId });
      
      if (allVersions.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Topic not found'
        });
        return;
      }

      // Sort by version number
      allVersions.sort((a, b) => a.version - b.version);
      
      const latestVersion = allVersions.find(v => v.isLatest);
      const lastVersion = allVersions[allVersions.length - 1];
      const currentVersion = latestVersion ? latestVersion.version : (lastVersion ? lastVersion.version : 1);

      const history: TopicHistory = {
        baseTopicId,
        currentVersion,
        versions: allVersions.map(topic => ({
          baseTopicId: topic.baseTopicId,
          version: topic.version,
          topic
        }))
      };

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error fetching topic history:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getTopicVersionWithResources(req: Request, res: Response): Promise<void> {
    try {
      const { baseTopicId, version } = req.params;
      if (!baseTopicId) {
        res.status(400).json({
          success: false,
          error: 'Base topic ID is required'
        });
        return;
      }

      const versionNumber = version ? parseInt(version, 10) : undefined;
      if (version && (isNaN(versionNumber!) || versionNumber! < 1)) {
        res.status(400).json({
          success: false,
          error: 'Version must be a positive integer'
        });
        return;
      }

      // Find specific version or latest
      const criteria = versionNumber 
        ? { baseTopicId, version: versionNumber }
        : { baseTopicId, isLatest: true };
      
      const topics = await this.database.find<Topic>('topics', criteria);
      
      if (topics.length === 0) {
        res.status(404).json({
          success: false,
          error: versionNumber ? `Version ${versionNumber} not found` : 'Topic not found'
        });
        return;
      }

      const topic = topics[0];
      
      // Get resources linked to this base topic (resources are linked to baseTopicId, not version-specific)
      const resources = await this.database.find<Resource>('resources', { topicId: baseTopicId });

      res.json({
        success: true,
        data: {
          ...topic,
          resources
        },
        resourceCount: resources.length
      });
    } catch (error) {
      console.error('Error fetching topic version with resources:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get topic tree - retrieves a topic and all its subtopics recursively
   */
  async getTopicTree(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const onlyLatest = req.query.onlyLatest !== 'false';
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Topic ID is required'
        });
        return;
      }

      const topicTree = await this.topicTreeService.buildTopicTree(id, onlyLatest);
      
      if (!topicTree) {
        res.status(404).json({
          success: false,
          error: 'Topic not found'
        });
        return;
      }

      res.json({
        success: true,
        data: topicTree.toJSON()
      });
    } catch (error) {
      console.error('Error fetching topic tree:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get all topic trees - retrieves all root topics and their hierarchies
   */
  async getAllTopicTrees(req: Request, res: Response): Promise<void> {
    try {
      const onlyLatest = req.query.onlyLatest !== 'false';
      
      const topicTrees = await this.topicTreeService.buildAllTopicTrees(onlyLatest);
      
      res.json({
        success: true,
        data: topicTrees.map(tree => tree.toJSON()),
        count: topicTrees.length
      });
    } catch (error) {
      console.error('Error fetching all topic trees:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get topic path - retrieves the path from root to the specified topic
   */
  async getTopicPath(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const onlyLatest = req.query.onlyLatest !== 'false';
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Topic ID is required'
        });
        return;
      }

      const path = await this.topicTreeService.getTopicPath(id, onlyLatest);
      
      res.json({
        success: true,
        data: path,
        depth: path.length
      });
    } catch (error) {
      console.error('Error fetching topic path:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get topic descendants - retrieves all descendants of a topic (flattened)
   */
  async getTopicDescendants(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const onlyLatest = req.query.onlyLatest !== 'false';
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Topic ID is required'
        });
        return;
      }

      const descendants = await this.topicTreeService.getTopicDescendants(id, onlyLatest);
      
      res.json({
        success: true,
        data: descendants,
        count: descendants.length
      });
    } catch (error) {
      console.error('Error fetching topic descendants:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Find shortest path between two topics
   */
  async findShortestPath(req: Request, res: Response): Promise<void> {
    try {
      const { startTopicId, endTopicId } = req.params;
      const onlyLatest = req.query.onlyLatest !== 'false';
      
      if (!startTopicId || !endTopicId) {
        res.status(400).json({
          success: false,
          error: 'Both startTopicId and endTopicId are required'
        });
        return;
      }

      const result = await this.shortestPathService.findShortestPath(
        startTopicId, 
        endTopicId, 
        onlyLatest
      );
      
      res.json({
        success: true,
        data: {
          pathExists: result.pathExists,
          distance: result.distance,
          path: result.path,
          searchStats: result.searchStats
        }
      });
    } catch (error) {
      console.error('Error finding shortest path:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }


}
