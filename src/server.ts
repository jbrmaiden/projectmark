import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { InMemoryDatabase } from './database/implementations/InMemoryDatabase';
import { createUserRoutes } from './routes/userRoutes';
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

// Initialize database
async function initDatabase() {
  await database.connect({ type: 'memory' });
  console.log('✅ Database connected');
}

// Routes
app.use('/', createCoreRoutes(database));
app.use('/api/v1/users', createUserRoutes(database));

// Start server
async function startServer() {
  try {
    await initDatabase();
    
    app.listen(port, () => {
      console.log(`🚀 Knowledge Base API running on http://localhost:${port}`);
      console.log(`🏥 Health check: http://localhost:${port}/health`);
      console.log(`🧪 Database test: http://localhost:${port}/test`);
      console.log(`👥 Users API: http://localhost:${port}/api/v1/users`);
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
