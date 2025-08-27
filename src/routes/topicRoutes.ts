import { Router } from 'express';
import { TopicController } from '../controllers/TopicController';
import { IDatabase } from '../database/interfaces/IDatabase';

export function createTopicRoutes(database: IDatabase): Router {
  const router = Router();
  const topicController = new TopicController(database);

  // Get all topics
  router.get('/', async (req, res) => {
    await topicController.getAllTopics(req, res);
  });

  // Get topics by parent (including root topics)
  router.get('/parent/:parentId', async (req, res) => {
    await topicController.getTopicsByParent(req, res);
  });

  // Get topic history (all versions)
  router.get('/history/:baseTopicId', async (req, res) => {
    await topicController.getTopicHistory(req, res);
  });

  // Get specific version of a topic
  router.get('/version/:baseTopicId/:version', async (req, res) => {
    await topicController.getTopicVersion(req, res);
  });

  // Get latest version of a topic by baseTopicId
  router.get('/version/:baseTopicId', async (req, res) => {
    await topicController.getTopicVersion(req, res);
  });

  // Get specific version with resources
  router.get('/version/:baseTopicId/:version/with-resources', async (req, res) => {
    await topicController.getTopicVersionWithResources(req, res);
  });

  // Get latest version with resources
  router.get('/version/:baseTopicId/with-resources', async (req, res) => {
    await topicController.getTopicVersionWithResources(req, res);
  });

  // Get topic with its resources
  router.get('/:id/with-resources', async (req, res) => {
    await topicController.getTopicWithResources(req, res);
  });

  // Get resources for a specific topic
  router.get('/:id/resources', async (req, res) => {
    await topicController.getTopicResources(req, res);
  });

  // Get topic tree (hierarchical structure)
  router.get('/:id/tree', async (req, res) => {
    await topicController.getTopicTree(req, res);
  });

  // Get topic path (from root to topic)
  router.get('/:id/path', async (req, res) => {
    await topicController.getTopicPath(req, res);
  });

  // Get topic descendants (flattened list)
  router.get('/:id/descendants', async (req, res) => {
    await topicController.getTopicDescendants(req, res);
  });

  // Get all topic trees (all root topics with their hierarchies)
  router.get('/trees/all', async (req, res) => {
    await topicController.getAllTopicTrees(req, res);
  });

  // Get topic by ID
  router.get('/:id', async (req, res) => {
    await topicController.getTopicById(req, res);
  });

  // Create new topic
  router.post('/', async (req, res) => {
    await topicController.createTopic(req, res);
  });

  // Update topic
  router.put('/:id', async (req, res) => {
    await topicController.updateTopic(req, res);
  });
  
  // Delete topic
  router.delete('/:id', async (req, res) => {
    await topicController.deleteTopic(req, res);
  });

  return router;
}
