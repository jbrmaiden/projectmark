import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { InMemoryDatabase } from './database/implementations/InMemoryDatabase';
import { PermissionServiceFactory } from './services/PermissionServiceFactory';
import { createUserRoutes } from './routes/userRoutes';
import { createTopicRoutes } from './routes/topicRoutes';
import { createTopicRoutesWithPermissions } from './routes/topicRoutesWithPermissions';
import { createResourceRoutes } from './routes/resourceRoutes';
import { createCoreRoutes } from './routes/coreRoutes';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3000');
const database = new InMemoryDatabase();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Initialize database and services
async function initDatabase() {
  await database.connect({ type: 'memory' });
  console.log('✅ Database connected');
  
  // Initialize PermissionService with real database
  PermissionServiceFactory.initialize(database);
  console.log('✅ PermissionService initialized');
}

// Start server
async function startServer() {
  try {
    await initDatabase();
    
    // Setup routes after database and services are initialized
    app.use('/', createCoreRoutes(database));
    app.use('/api/v1/users', createUserRoutes(database));
    app.use('/api/v1/topics', createTopicRoutesWithPermissions(database));
    app.use('/api/v1/resources', createResourceRoutes(database));
    
    app.listen(port, () => {
      console.log(`🚀 Knowledge Base API running on http://localhost:${port}`);
      console.log(`🏥 Health check: http://localhost:${port}/health`);
      console.log(`🧪 Database test: http://localhost:${port}/test`);
      console.log(`👥 Users API: http://localhost:${port}/api/v1/users`);
      console.log(`📚 Topics API: http://localhost:${port}/api/v1/topics`);
      console.log(`🔗 Resources API: http://localhost:${port}/api/v1/resources`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await database.disconnect();
  process.exit(0);
});

startServer();
