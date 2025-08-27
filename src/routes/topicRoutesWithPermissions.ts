import { Router } from 'express';
import { TopicController } from '../controllers/TopicController';
import { PermissionMiddleware } from '../middleware/permissions';
import { PermissionServiceFactory } from '../services/PermissionServiceFactory';
import { IDatabase } from '../database/interfaces/IDatabase';

export function createTopicRoutesWithPermissions(database: IDatabase): Router {
  const router = Router();
  const topicController = new TopicController(database);
  const permissionService = PermissionServiceFactory.getInstance();
  const permissionMiddleware = new PermissionMiddleware(permissionService);

  // Public routes (no authentication required)
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'topics' });
  });

  // Read operations - require viewer permission
  router.get('/', async (req, res) => {
    await topicController.getAllTopics(req, res);
  });

  // Get topics by parent (including root topics) - no permission required for browsing
  router.get('/parent/:parentId', async (req, res) => {
    await topicController.getTopicsByParent(req, res);
  });

  // Get topic history (all versions) - no permission required for public topics
  router.get('/history/:baseTopicId', async (req, res) => {
    await topicController.getTopicHistory(req, res);
  });

  // Get specific version of a topic - no permission required for public access
  router.get('/version/:baseTopicId/:version', async (req, res) => {
    await topicController.getTopicVersion(req, res);
  });

  router.get('/trees/all', async (req, res) => {
    await topicController.getAllTopicTrees(req, res);
  });

  router.get('/:id', 
    permissionMiddleware.requireTopicPermission('viewer'),
    async (req, res) => {
      await topicController.getTopicById(req, res);
    }
  );

  router.get('/:id/tree', 
    permissionMiddleware.requireTopicPermission('viewer'),
    async (req, res) => {
      await topicController.getTopicTree(req, res);
    }
  );

  router.get('/:id/path', 
    permissionMiddleware.requireTopicPermission('viewer'),
    async (req, res) => {
      await topicController.getTopicPath(req, res);
    }
  );

  router.get('/:id/descendants', 
    permissionMiddleware.requireTopicPermission('viewer'),
    async (req, res) => {
      await topicController.getTopicDescendants(req, res);
    }
  );

  // Get latest version with resources - no permission required for public access
  router.get('/version/:baseTopicId/with-resources', async (req, res) => {
    await topicController.getTopicVersionWithResources(req, res);
  });

  // Get specific version with resources - no permission required for public access
  router.get('/version/:baseTopicId/:version/with-resources', async (req, res) => {
    await topicController.getTopicVersionWithResources(req, res);
  });

  router.get('/:id/with-resources', 
    permissionMiddleware.requireTopicPermission('viewer'),
    async (req, res) => {
      await topicController.getTopicWithResources(req, res);
    }
  );

  router.get('/:id/resources', 
    permissionMiddleware.requireTopicPermission('viewer'),
    async (req, res) => {
      await topicController.getTopicResources(req, res);
    }
  );

  // Write operations - topic creation requires authentication but not specific topic permissions
  router.post('/', 
    async (req, res) => {
      // Basic authentication check
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required', type: 'auth_error' });
        return;
      }
      
      // Add user info to request
      req.user = { id: userId };
      await topicController.createTopic(req, res);
    }
  );

  router.put('/:id', 
    permissionMiddleware.requireTopicPermission('editor'),
    async (req, res) => {
      await topicController.updateTopic(req, res);
    }
  );

  // Delete operations - require owner permission
  router.delete('/:id', 
    permissionMiddleware.requireTopicPermission('owner'),
    async (req, res) => {
      await topicController.deleteTopic(req, res);
    }
  );

  // Version management - require viewer for read, editor for write
  router.get('/version/:baseTopicId', 
    permissionMiddleware.requireTopicPermission('viewer'),
    async (req, res) => {
      await topicController.getTopicVersion(req, res);
    }
  );

  router.get('/version/:baseTopicId/history', 
    permissionMiddleware.requireTopicPermission('viewer'),
    async (req, res) => {
      await topicController.getTopicHistory(req, res);
    }
  );

  router.get('/version/:baseTopicId/with-resources', 
    permissionMiddleware.requireTopicPermission('viewer'),
    async (req, res) => {
      await topicController.getTopicVersionWithResources(req, res);
    }
  );

  // Permission management routes - require owner permission
  router.post('/:id/permissions', 
    permissionMiddleware.requireTopicPermission('owner'),
    async (req, res) => {
      const { userId, permission } = req.body;
      const topicId = req.params.id;
      const grantedBy = req.user!.id;

      if (!topicId) {
        res.status(400).json({ success: false, error: 'Topic ID is required' });
        return;
      }

      try {
        const permissionRecord = await permissionService.grantTopicPermission(
          userId, 
          topicId, 
          permission, 
          grantedBy
        );

        res.status(201).json({
          success: true,
          data: permissionRecord
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to grant permission'
        });
      }
    }
  );

  router.get('/:id/permissions', 
    permissionMiddleware.requireTopicPermission('owner'),
    async (req, res) => {
      const topicId = req.params.id;

      if (!topicId) {
        res.status(400).json({ success: false, error: 'Topic ID is required' });
        return;
      }

      try {
        const permissions = await permissionService.getTopicPermissions(topicId);
        res.json({
          success: true,
          data: permissions
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to get permissions'
        });
      }
    }
  );

  router.delete('/:id/permissions/:userId', 
    permissionMiddleware.requireTopicPermission('owner'),
    async (req, res) => {
      const { id: topicId, userId } = req.params;

      if (!topicId || !userId) {
        res.status(400).json({ success: false, error: 'Topic ID and User ID are required' });
        return;
      }

      try {
        const success = await permissionService.revokeTopicPermission(userId, topicId);
        res.json({
          success,
          message: success ? 'Permission revoked' : 'Permission not found'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to revoke permission'
        });
      }
    }
  );

  return router;
}
