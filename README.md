# Dynamic Knowledge Base System

This project is a RESTful API for a **Dynamic Knowledge Base System**, built as a response to a challenge to create a complex, version-controlled, and permission-based knowledge management system. The API is developed using Node.js, Express, and TypeScript.

This document provides a comprehensive overview of the project, its architecture, features, and instructions for setup and usage, as developed according to the requirements of the challenge.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Advanced Design and Implementation](#advanced-design-and-implementation)
- [API Documentation](#api-documentation)
- [Getting Started](#getting-started)
- [Running the Application](#running-the-application)
- [Running Tests](#running-tests)

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

## Project Structure

The codebase is organized into a modular structure to promote separation of concerns and maintainability.

```
src/
├── controllers/    # Request handling and business logic
├── database/       # In-memory database implementation
├── middleware/     # Express middleware (permissions, validation)
├── models/         # Data models with business logic (e.g., Topic versioning)
├── patterns/       # Implementations of design patterns (e.g., Composite)
├── routes/         # API route definitions
├── schemas/        # Zod validation schemas
├── services/       # Core services (e.g., Shortest Path, Permissions)
├── tests/          # Unit and integration tests
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

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

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1.  Clone the repository:
    ```sh
    git clone <repository-url>
    ```
2.  Navigate to the project directory:
    ```sh
    cd projectmark
    ```
3.  Install dependencies:
    ```sh
    npm install
    ```

## Running the Application

To start the Express server, run:

```sh
npm start
```

The API will be available at `http://localhost:3000`.

## Running Tests

To run the Jest test suite, use the following command:

```sh
npm test
```

To run tests in watch mode:

```sh
npm run test:watch
```

To generate a test coverage report:

```sh
npm run test:coverage
