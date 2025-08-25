import { Router, Request, Response } from 'express';
import { IDatabase } from '../database/interfaces/IDatabase';

export function createCoreRoutes(database: IDatabase): Router {
  const router = Router();

  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  });

  router.get('/', (req: Request, res: Response) => {
    res.json({
      message: 'Knowledge Base API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        test: '/test',
        users: '/api/v1/users'
      }
    });
  });

  router.get('/test', async (req: Request, res: Response) => {
    try {
      const testUser = {
        name: 'Test User',
        email: 'test@example.com',
        role: 'Viewer' as const
      };
      
      const created = await database.create('users', testUser);
      const retrieved = await database.findById('users', (created as any).id);
      
      res.json({
        success: true,
        message: 'Database test successful',
        data: { created, retrieved }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}
