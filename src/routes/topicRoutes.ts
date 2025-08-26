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

  // Get topic with its resources
  router.get('/:id/with-resources', async (req, res) => {
    await topicController.getTopicWithResources(req, res);
  });

  // Get resources for a specific topic
  router.get('/:id/resources', async (req, res) => {
    await topicController.getTopicResources(req, res);
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
