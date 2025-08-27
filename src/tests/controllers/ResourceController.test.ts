import { ResourceController } from '../../controllers/ResourceController';
import { MockDatabase, TestDataFactory, createMockRequest, createMockResponse } from '../setup';
import { Resource, Topic } from '../../types';

// Mock the ResourceModel
jest.mock('../../models/Resource', () => ({
  ResourceModel: {
    validate: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
}));

// Mock the TopicModel for topic validation
jest.mock('../../models/Topic', () => ({
  TopicModel: {
    validate: jest.fn()
  }
}));

// Import the mocked modules
import { ResourceModel } from '../../models/Resource';
import { TopicModel } from '../../models/Topic';

const mockResourceModel = ResourceModel as jest.Mocked<typeof ResourceModel>;
const mockTopicModel = TopicModel as jest.Mocked<typeof TopicModel>;

describe('ResourceController', () => {
  let resourceController: ResourceController;
  let mockDatabase: MockDatabase;

  beforeEach(() => {
    mockDatabase = new MockDatabase();
    resourceController = new ResourceController(mockDatabase);
  });

  afterEach(() => {
    mockDatabase.clear();
    jest.clearAllMocks();
  });

  describe('getAllResources', () => {
    it('should return all resources successfully', async () => {
      // Arrange
      const resources = [
        TestDataFactory.createResource({ id: 'resource1', name: 'Resource 1' }),
        TestDataFactory.createResource({ id: 'resource2', name: 'Resource 2' })
      ];
      mockDatabase.seed('resources', resources);

      const req = createMockRequest();
      const res = createMockResponse();

      // Act
      await resourceController.getAllResources(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'Resource 1' }),
          expect.objectContaining({ name: 'Resource 2' })
        ]),
        count: 2
      });
    });

    it('should handle database errors', async () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      
      jest.spyOn(mockDatabase, 'find').mockRejectedValue(new Error('Database error'));

      // Act
      await resourceController.getAllResources(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error'
      });
    });
  });

  describe('getResourceById', () => {
    it('should return resource by ID successfully', async () => {
      // Arrange
      const resource = TestDataFactory.createResource({ 
        id: 'resource1', 
        name: 'Test Resource' 
      });
      mockDatabase.seed('resources', [resource]);

      const req = createMockRequest({ params: { id: 'resource1' } });
      const res = createMockResponse();

      // Act
      await resourceController.getResourceById(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ name: 'Test Resource' })
      });
    });

    it('should return 400 when ID is missing', async () => {
      // Arrange
      const req = createMockRequest({ params: {} });
      const res = createMockResponse();

      // Act
      await resourceController.getResourceById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource ID is required'
      });
    });

    it('should return 404 when resource not found', async () => {
      // Arrange
      const req = createMockRequest({ params: { id: 'nonexistent' } });
      const res = createMockResponse();

      // Act
      await resourceController.getResourceById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource not found'
      });
    });
  });

  describe('getResourcesByTopic', () => {
    it('should return resources for a specific topic', async () => {
      // Arrange
      const topic = TestDataFactory.createTopic({ id: 'topic1', name: 'Test Topic' });
      const resources = [
        TestDataFactory.createResource({ topicId: 'topic1', name: 'Resource 1' }),
        TestDataFactory.createResource({ topicId: 'topic1', name: 'Resource 2' }),
        TestDataFactory.createResource({ topicId: 'topic2', name: 'Resource 3' })
      ];
      
      mockDatabase.seed('topics', [topic]);
      mockDatabase.seed('resources', resources);

      const req = createMockRequest({ params: { topicId: 'topic1' } });
      const res = createMockResponse();

      // Act
      await resourceController.getResourcesByTopic(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ topicId: 'topic1', name: 'Resource 1' }),
          expect.objectContaining({ topicId: 'topic1', name: 'Resource 2' })
        ]),
        count: 2,
        topicName: 'Test Topic'
      });
    });

    it('should return 400 when topicId is missing', async () => {
      // Arrange
      const req = createMockRequest({ params: {} });
      const res = createMockResponse();

      // Act
      await resourceController.getResourcesByTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Topic ID is required'
      });
    });

    it('should return 404 when topic not found', async () => {
      // Arrange
      const req = createMockRequest({ params: { topicId: 'nonexistent' } });
      const res = createMockResponse();

      // Act
      await resourceController.getResourcesByTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Topic not found'
      });
    });
  });

  describe('createResource', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
      mockResourceModel.validate.mockReturnValue({ isValid: true, errors: [] });
      mockResourceModel.create.mockImplementation((data) => ({
        id: 'new-resource-id',
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    });

    it('should create resource successfully', async () => {
      const topic = TestDataFactory.createTopic();
      mockDatabase.seed('topics', [topic]);

      const resourceData = {
        name: 'New Resource',
        type: 'document' as const,
        url: 'https://example.com/resource',
        description: 'Test resource',
        topicId: topic.id
      };

      const req = createMockRequest({ body: resourceData });
      const res = createMockResponse();

      await resourceController.createResource(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          name: 'New Resource',
          type: 'document'
        })
      });
    });

    it('should return 400 for validation errors', async () => {
      // Mock validation failure
      mockResourceModel.validate.mockReturnValue({
        isValid: false,
        errors: ['Name is required', 'Invalid URL format']
      });

      const resourceData = {
        name: '', // Invalid empty name
        type: 'document' as const,
        url: 'invalid-url', // Invalid URL
        topicId: 'topic1'
      };

      const req = createMockRequest({ body: resourceData });
      const res = createMockResponse();

      await resourceController.createResource(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed'
        })
      );
    });

    it('should return 400 when topic not found', async () => {
      const resourceData = {
        name: 'New Resource',
        type: 'document' as const,
        url: 'https://example.com/resource',
        description: 'Test resource',
        topicId: 'nonexistent-topic'
      };

      const req = createMockRequest({ body: resourceData });
      const res = createMockResponse();

      await resourceController.createResource(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });
  });

  describe('updateResource', () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
      mockResourceModel.validate.mockReturnValue({ isValid: true, errors: [] });
      mockResourceModel.update.mockImplementation((existing, updates) => ({
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      }));
    });

    it('should update resource successfully', async () => {
      const existingResource = TestDataFactory.createResource({ 
        name: 'Original Name'
      });
      const topic = TestDataFactory.createTopic();
      
      mockDatabase.seed('resources', [existingResource]);
      mockDatabase.seed('topics', [topic]);

      const updateData = { name: 'Updated Name' };
      const req = createMockRequest({ 
        params: { id: existingResource.id },
        body: updateData
      });
      const res = createMockResponse();

      await resourceController.updateResource(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            name: 'Updated Name'
          })
        })
      );
    });

    it('should return 400 when ID is missing', async () => {
      // Arrange
      const req = createMockRequest({ params: {}, body: { name: 'Updated' } });
      const res = createMockResponse();

      // Act
      await resourceController.updateResource(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource ID is required'
      });
    });

    it('should return 404 when resource not found', async () => {
      // Arrange
      const req = createMockRequest({ 
        params: { id: 'nonexistent' },
        body: { name: 'Updated' }
      });
      const res = createMockResponse();

      // Act
      await resourceController.updateResource(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource not found'
      });
    });

    it('should validate new topic when updating topicId', async () => {
      const existingResource = TestDataFactory.createResource({ 
        topicId: 'topic1'
      });
      mockDatabase.seed('resources', [existingResource]);

      const updateData = { topicId: 'nonexistent-topic' };
      const req = createMockRequest({ 
        params: { id: existingResource.id },
        body: updateData
      });
      const res = createMockResponse();

      await resourceController.updateResource(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Topic not found'
      });
    });
  });

  describe('deleteResource', () => {
    it('should delete resource successfully', async () => {
      // Arrange
      const resource = TestDataFactory.createResource({ id: 'resource1' });
      mockDatabase.seed('resources', [resource]);

      const req = createMockRequest({ params: { id: 'resource1' } });
      const res = createMockResponse();

      // Act
      await resourceController.deleteResource(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Resource deleted successfully'
      });
    });

    it('should return 400 when ID is missing', async () => {
      // Arrange
      const req = createMockRequest({ params: {} });
      const res = createMockResponse();

      // Act
      await resourceController.deleteResource(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource ID is required'
      });
    });

    it('should return 404 when resource not found', async () => {
      // Arrange
      const req = createMockRequest({ params: { id: 'nonexistent' } });
      const res = createMockResponse();

      // Act
      await resourceController.deleteResource(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource not found'
      });
    });
  });

  describe('getResourcesByType', () => {
    it('should return resources filtered by type', async () => {
      // Arrange
      const resources = [
        TestDataFactory.createResource({ type: 'video', name: 'Video 1' }),
        TestDataFactory.createResource({ type: 'video', name: 'Video 2' }),
        TestDataFactory.createResource({ type: 'document', name: 'Doc 1' })
      ];
      mockDatabase.seed('resources', resources);

      const req = createMockRequest({ params: { type: 'video' } });
      const res = createMockResponse();

      // Act
      await resourceController.getResourcesByType(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ type: 'video', name: 'Video 1' }),
          expect.objectContaining({ type: 'video', name: 'Video 2' })
        ]),
        count: 2,
        type: 'video'
      });
    });

    it('should return 400 when type is missing', async () => {
      // Arrange
      const req = createMockRequest({ params: {} });
      const res = createMockResponse();

      // Act
      await resourceController.getResourcesByType(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource type is required'
      });
    });

    it('should return 400 for invalid resource type', async () => {
      // Arrange
      const req = createMockRequest({ params: { type: 'invalid-type' } });
      const res = createMockResponse();

      // Act
      await resourceController.getResourcesByType(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid resource type',
        validTypes: ['video', 'article', 'pdf', 'document', 'link']
      });
    });

    it('should return empty array for valid type with no resources', async () => {
      // Arrange
      const req = createMockRequest({ params: { type: 'video' } });
      const res = createMockResponse();

      // Act
      await resourceController.getResourcesByType(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        count: 0,
        type: 'video'
      });
    });
  });
});
