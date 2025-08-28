# ProjectMark - Dynamic Knowledge Base System

This project is a RESTful API for a **Dynamic Knowledge Base System**, built as a response to a challenge to create a complex, version-controlled, and permission-based knowledge management system. The API is developed using Node.js, Express, and TypeScript with comprehensive Zod validation.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Database Setup](#database-setup)
- [Authentication & Authorization](#authentication--authorization)
- [Project Structure](#project-structure)
- [Advanced Design and Implementation](#advanced-design-and-implementation)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

## Features

- **Topic Management**: Full CRUD operations for topics with a robust version control system. Each update creates a new version, preserving the history.
- **Hierarchical Structure**: Topics can be organized in a parent-child hierarchy, forming a tree-like structure.
- **Resource Management**: Associate external resources (articles, videos, documents) with topics.
- **User Roles & Permissions**: A flexible permission system (Admin, Editor, Viewer) controls access to topics.
- **Topic Version Control**: Retrieve any specific version of a topic or its complete history.
- **Recursive Topic Retrieval**: Fetch a topic and all its subtopics in a nested tree structure.
- **Custom Shortest Path Algorithm**: A custom-built algorithm to find the shortest path between any two topics in the knowledge graph, implemented without external graph libraries.
- **Input Validation**: Comprehensive request validation using **Zod** to ensure data integrity.

## Technology Stack

- **Backend**: Node.js, Express.js
- **Language**: TypeScript
- **Database**: In-memory JSON database for persistence.
- **Validation**: Zod for schema validation.
- **Testing**: Jest for unit and integration testing.

## 🛠️ Development Workflow

### Available Scripts
```bash
# Development
npm run dev              # Start development server
npm run dev:watch        # Start with file watching

# Building
npm run build           # Compile TypeScript to JavaScript
npm run clean          # Remove build artifacts
npm run type-check     # Check TypeScript types without building

# Testing
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
```

## Project Structure

The codebase is organized into a modular structure to promote separation of concerns and maintainability.

```
src/
├── controllers/        # Request handlers and business logic
├── database/          # Database interfaces and implementations
├── middleware/        # Express middleware (validation, etc.)
├── models/           # Data models and factories
├── routes/           # API route definitions
├── schemas/          # Zod validation schemas
├── services/         # Business logic services
├── types/           # TypeScript type definitions
├── utils/           # Utility functions and helpers
└── server.ts        # Application entry point
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Results
- ✅ **8 test suites**: All passing
- ✅ **128 tests**: 100% success rate
- ✅ **Comprehensive coverage**: Controllers, services, and utilities

## Advanced Design and Implementation

This project demonstrates several advanced OOP concepts and design patterns as required by the challenge brief.

- **Abstract Classes and Interfaces**: The `database/` directory uses an `IDatabase` interface to decouple the application from a specific database implementation, allowing for easier future migration.
- **Factory Pattern**: `services/PermissionServiceFactory.ts` provides a singleton instance of the permission service, managing its creation and lifecycle.
- **Strategy Pattern**: The `middleware/permissions.ts` acts as a Strategy, applying different permission-checking logic based on the required role (Viewer, Editor, Admin).
- **Composite Pattern**: The `patterns/composite` directory contains a generic implementation of the Composite pattern, used by `TopicTreeService` to build hierarchical topic structures.
- **Custom Algorithm**: `services/ShortestPathService.ts` contains a from-scratch implementation of a bidirectional Breadth-First Search (BFS) algorithm to efficiently find the shortest path between two topics.

## API Documentation

The API is versioned and accessible under the `/api/v1/` prefix.

### Core Endpoints

- `GET /health`: Health check for the service.

### User Endpoints (`/api/v1/users`)

- `GET /`: Get all users.
- `GET /:id`: Get a user by ID.
- `POST /`: Create a new user.
- `PUT /:id`: Update a user.
- `DELETE /:id`: Delete a user.

### Topic Endpoints (`/api/v1/topics`)

- `GET /`: Get all topics.
- `GET /:id`: Get a topic by its unique version ID.
- `POST /`: Create a new topic.
- `PUT /:id`: Create a new version of an existing topic.
- `DELETE /:id`: Delete a topic.

#### Topic Hierarchy & Structure

- `GET /:id/tree`: Get a topic and all its descendants in a tree structure.
- `GET /:id/path`: Get the path from the root to a specific topic.
- `GET /shortest-path/:startId/:endId`: Find the shortest path between two topics.

#### Version Control

- `GET /history/:baseTopicId`: Get the full version history of a topic.
- `GET /version/:baseTopicId`: Get the latest version of a topic.
- `GET /version/:baseTopicId/:version`: Get a specific version of a topic.

### Resource Endpoints (`/api/v1/resources`)

- `GET /`: Get all resources.
- `GET /:id`: Get a resource by ID.
- `POST /`: Create a new resource and associate it with a topic.
- `PUT /:id`: Update a resource.
- `DELETE /:id`: Delete a resource.

### Permissions Endpoints (`/api/v1/topics-secure`)

These routes demonstrate permission handling.

- `POST /:id/permissions`: Grant a user permission for a topic (requires Owner role).
- `GET /:id/permissions`: View permissions for a topic (requires Owner role).
- `DELETE /:id/permissions/:userId`: Revoke a user's permission for a topic (requires Owner role).

#### Test Failures
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- TopicController.test.ts
```
--

## 🚀 Quick Start

### Prerequisites
- **Node.js**: Version 18+ (recommended: latest LTS)
- **npm**: Version 8+ (comes with Node.js)
- **Git**: For version control
- **Code Editor**: VS Code recommended with TypeScript extensions

#### System Requirements
- **OS**: macOS, Linux, or Windows
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB free space

### Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/jbrmaiden/projectmark.git
   cd projectmark
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run the Application**
   ```bash
   # Development mode with hot reload
   npm run dev
   
   # Or watch mode with automatic restart
   npm run dev:watch
   
   # Production build and run
   npm run build
   npm start
   ```

4. **Verify Installation**
   Open your browser and visit:
   - **API Root**: http://localhost:3000
   - **Health Check**: http://localhost:3000/health
   - **Database Test**: http://localhost:3000/test

## 🗄️ Database Setup

### Current Implementation: In-Memory Database
The application uses an in memory for development and testing:

- **Data is lost when the server restarts**

### Database Initialization
The database is automatically initialized when the server starts:

```typescript
// Automatic initialization in src/server.ts
const database = new InMemoryDatabase();
await database.connect({ type: 'memory' });
```


## 🔐 Authentication & Authorization

### Current Implementation: Role-Based Permissions
The application uses a **role-based permission system** without traditional authentication:

#### **User Roles**
- **🔴 Admin**: Full system access - create, read, update, delete all resources
- **🟡 Editor**: Content management - create, read, update topics and resources  
- **🟢 Viewer**: Read-only access - browse topics and resources safely

#### **Permission Architecture**
```typescript
// Hierarchical permission levels
type Permission = 'viewer' | 'editor' | 'admin';

// User role definitions
type UserRole = 'Viewer' | 'Editor' | 'Admin';

// Permission inheritance: Admin > Editor > Viewer
```

### Setting Up Users

#### Create Users via API
```bash
# Create an Admin user
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "Admin"
  }'

# Create an Editor user
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Editor User",
    "email": "editor@example.com",
    "role": "Editor"
  }'

# Create a Viewer user
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Viewer User",
    "email": "viewer@example.com",
    "role": "Viewer"
  }'
```

#### Grant Topic-Specific Permissions
```bash
# Grant specific permissions to a user for a topic
curl -X POST http://localhost:3000/api/v1/topics/{topicId}/permissions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "permission": "editor"
  }'
```

### 🛡️ Permission Enforcement

The system automatically enforces permissions across all protected endpoints:

- **Topic Operations**: Create, update, delete topics
- **Resource Operations**: Manage resources within topics
- **User Management**: Admin-only operations

