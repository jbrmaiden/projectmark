import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { IDatabase } from '../database/interfaces/IDatabase';


export function createUserRoutes(database: IDatabase): Router {
  const router = Router();
  const userController = new UserController(database);

  router.get('/', async (req, res) => {
    await userController.getAllUsers(req, res);
  });

  router.get('/:id', async (req, res) => {
    await userController.getUserById(req, res);
  });

  router.post('/', async (req, res) => {
    await userController.createUser(req, res);
  });

  router.put('/:id', async (req, res) => {
    await userController.updateUser(req, res);
  });
  
  router.delete('/:id', async (req, res) => {
    await userController.deleteUser(req, res);
  });

  return router;
}
