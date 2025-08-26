import { Router } from 'express';
import { ResourceController } from '../controllers/ResourceController';
import { IDatabase } from '../database/interfaces/IDatabase';

export function createResourceRoutes(database: IDatabase): Router {
  const router = Router();
  const resourceController = new ResourceController(database);

  // Get all resources
  router.get('/', async (req, res) => {
    await resourceController.getAllResources(req, res);
  });

  // Get resources by topic
  router.get('/topic/:topicId', async (req, res) => {
    await resourceController.getResourcesByTopic(req, res);
  });

  // Get resources by type
  router.get('/type/:type', async (req, res) => {
    await resourceController.getResourcesByType(req, res);
  });

  // Get resource by ID
  router.get('/:id', async (req, res) => {
    await resourceController.getResourceById(req, res);
  });

  // Create new resource
  router.post('/', async (req, res) => {
    await resourceController.createResource(req, res);
  });

  // Update resource
  router.put('/:id', async (req, res) => {
    await resourceController.updateResource(req, res);
  });
  
  // Delete resource
  router.delete('/:id', async (req, res) => {
    await resourceController.deleteResource(req, res);
  });

  return router;
}
