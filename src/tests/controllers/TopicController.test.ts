import { TopicController } from '../../controllers/TopicController';
import { MockDatabase, TestDataFactory, createMockRequest, createMockResponse } from '../setup';
import { Topic, Resource } from '../../types';

// Mock the TopicModel
jest.mock('../../models/Topic', () => ({
  TopicModel: {
    validate: jest.fn(),
    create: jest.fn(),
    createVersion: jest.fn(),
    markAsOldVersion: jest.fn()
  }
}));

// Mock the TopicTreeService
jest.mock('../../services/TopicTreeService', () => ({
  TopicTreeService: jest.fn().mockImplementation(() => ({
    getTopicTree: jest.fn(),
    getTopicPath: jest.fn(),
    getChildTopics: jest.fn()
  }))
}));

// Import the mocked modules
import { TopicModel } from '../../models/Topic';
const mockTopicModel = TopicModel as jest.Mocked<typeof TopicModel>;

describe('TopicController', () => {
  let topicController: TopicController;
  let mockDatabase: MockDatabase;

  beforeEach(() => {
    mockDatabase = new MockDatabase();
    topicController = new TopicController(mockDatabase);
    
    // Setup default mock implementations
    mockTopicModel.validate.mockReturnValue({ isValid: true, errors: [] });
    mockTopicModel.create.mockImplementation((data) => ({
      id: 'new-topic-id',
      baseTopicId: 'base-topic-id',
      name: 'New Topic',
      content: '',
      description: '',
      parentTopicId: null,
      createdBy: 'user1',
      version: 1,
      isLatest: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    } as Topic));
    mockTopicModel.createVersion.mockImplementation((existing, updates) => ({
      ...existing,
      ...updates,
      id: 'new-version-id',
      version: existing.version + 1,
      updatedAt: new Date().toISOString()
    } as Topic));
    mockTopicModel.markAsOldVersion.mockImplementation((topic) => ({
      ...topic,
      isLatest: false
    } as Topic));
  });

  afterEach(() => {
    mockDatabase.clear();
    jest.clearAllMocks();
  });

  describe('getAllTopics', () => {
    it('should return all latest topics by default', async () => {
      // Arrange
      const topics = [
        TestDataFactory.createTopic({ id: 'topic1', name: 'Topic 1', isLatest: true }),
        TestDataFactory.createTopic({ id: 'topic2', name: 'Topic 2', isLatest: true }),
        TestDataFactory.createTopic({ id: 'topic3', name: 'Topic 3', isLatest: false })
      ];
      mockDatabase.seed('topics', topics);

      const req = createMockRequest({ query: {} });
      const res = createMockResponse();

      // Act
      await topicController.getAllTopics(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'Topic 1', isLatest: true }),
          expect.objectContaining({ name: 'Topic 2', isLatest: true })
        ]),
        count: 2
      });
    });

    it('should return all topics when onlyLatest is false', async () => {
      // Arrange
      const topics = [
        TestDataFactory.createTopic({ id: 'topic1', isLatest: true }),
        TestDataFactory.createTopic({ id: 'topic2', isLatest: false })
      ];
      mockDatabase.seed('topics', topics);

      const req = createMockRequest({ query: { onlyLatest: 'false' } });
      const res = createMockResponse();

      // Act
      await topicController.getAllTopics(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ isLatest: true }),
          expect.objectContaining({ isLatest: false })
        ]),
        count: 2
      });
    });

    it('should include resource count when requested', async () => {
      // Arrange
      const topic = TestDataFactory.createTopic({ id: 'topic1', baseTopicId: 'base1' });
      const resources = [
        TestDataFactory.createResource({ topicId: 'base1' }),
        TestDataFactory.createResource({ topicId: 'base1' })
      ];
      
      mockDatabase.seed('topics', [topic]);
      mockDatabase.seed('resources', resources);

      const req = createMockRequest({ query: { includeResourceCount: 'true' } });
      const res = createMockResponse();

      // Act
      await topicController.getAllTopics(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ resourceCount: 2 })
        ]),
        count: 1
      });
    });
  });

  describe('getTopicById', () => {
    it('should return topic by ID successfully', async () => {
      // Arrange
      const topic = TestDataFactory.createTopic({ id: 'topic1', name: 'Test Topic' });
      mockDatabase.seed('topics', [topic]);

      const req = createMockRequest({ params: { id: 'topic1' } });
      const res = createMockResponse();

      // Act
      await topicController.getTopicById(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ name: 'Test Topic' })
      });
    });

    it('should return 400 when ID is missing', async () => {
      // Arrange
      const req = createMockRequest({ params: {} });
      const res = createMockResponse();

      // Act
      await topicController.getTopicById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when topic not found', async () => {
      // Arrange
      const req = createMockRequest({ params: { id: 'nonexistent' } });
      const res = createMockResponse();

      // Act
      await topicController.getTopicById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createTopic', () => {
    it('should create topic successfully', async () => {
      // Arrange
      const topicData = {
        name: 'New Topic',
        content: 'Topic content',
        description: 'Topic description'
      };

      const req = createMockRequest({ body: topicData });
      const res = createMockResponse();

      // Mock TopicModel methods
      const mockValidate = jest.fn().mockReturnValue({ isValid: true, errors: [] });
      const mockCreate = jest.fn().mockReturnValue({
        id: 'new-topic-id',
        baseTopicId: 'base-topic-id',
        ...topicData,
        version: 1,
        isLatest: true,
        createdAt: new Date().toISOString()
      });

      jest.doMock('../../models/Topic', () => ({
        TopicModel: {
          validate: mockValidate,
          create: mockCreate
        }
      }));

      // Act
      await topicController.createTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          name: 'New Topic',
          content: 'Topic content'
        })
      });
    });

    it('should return 400 for validation errors', async () => {
      // Mock validation failure
      mockTopicModel.validate.mockReturnValue({
        isValid: false,
        errors: ['Name is required', 'Content is required']
      });

      const topicData = { name: '', content: '' };
      const req = createMockRequest({ body: topicData });
      const res = createMockResponse();

      await topicController.createTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should validate parent topic exists', async () => {
      const topicData = {
        name: 'Child Topic',
        content: 'Content',
        parentTopicId: 'nonexistent-parent'
      };

      const req = createMockRequest({ body: topicData });
      const res = createMockResponse();

      await topicController.createTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Parent topic with ID nonexistent-parent not found',
        type: 'not_found_error'
      });
    });
  });

  describe('updateTopic', () => {
    it('should create new version when updating topic', async () => {
      const existingTopic = TestDataFactory.createTopic({ 
        name: 'Original Name',
        version: 1,
        isLatest: true
      });
      mockDatabase.seed('topics', [existingTopic]);

      const updateData = { 
        name: 'Updated Name',
        createdBy: existingTopic.createdBy
      };

      const req = createMockRequest({ 
        params: { id: existingTopic.id },
        body: updateData
      });
      const res = createMockResponse();

      await topicController.updateTopic(req, res);

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
      await topicController.updateTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Topic ID is required'
      });
    });

    it('should prevent circular parent reference', async () => {
      const existingTopic = TestDataFactory.createTopic();
      mockDatabase.seed('topics', [existingTopic]);

      const updateData = { parentTopicId: existingTopic.baseTopicId };
      const req = createMockRequest({ 
        params: { id: existingTopic.id },
        body: updateData
      });
      const res = createMockResponse();

      await topicController.updateTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Topic cannot be its own parent'
      });
    });
  });

  describe('deleteTopic', () => {
    it('should delete topic successfully', async () => {
      // Arrange
      const topic = TestDataFactory.createTopic({ id: 'topic1' });
      mockDatabase.seed('topics', [topic]);

      const req = createMockRequest({ params: { id: 'topic1' } });
      const res = createMockResponse();

      // Act
      await topicController.deleteTopic(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Topic deleted successfully'
      });
    });

    it('should prevent deletion of topic with children', async () => {
      // Arrange
      const parentTopic = TestDataFactory.createTopic({ id: 'parent' });
      const childTopic = TestDataFactory.createTopic({ 
        id: 'child',
        parentTopicId: 'parent'
      });
      
      mockDatabase.seed('topics', [parentTopic, childTopic]);

      const req = createMockRequest({ params: { id: 'parent' } });
      const res = createMockResponse();

      // Act
      await topicController.deleteTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot delete topic with child topics',
        details: 'Topic has 1 child topic(s)'
      });
    });
  });

  describe('getTopicsByParent', () => {
    it('should return root topics when parentId is "root"', async () => {
      // Arrange
      const rootTopic = TestDataFactory.createTopic({ 
        id: 'root1'
      });
      delete (rootTopic as any).parentTopicId;
      const childTopic = TestDataFactory.createTopic({ 
        id: 'child1',
        parentTopicId: 'root1'
      });
      
      mockDatabase.seed('topics', [rootTopic, childTopic]);

      const req = createMockRequest({ params: { parentId: 'root' } });
      const res = createMockResponse();

      // Act
      await topicController.getTopicsByParent(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'root1' })
        ]),
        count: 1
      });
    });

    it('should return child topics for specific parent', async () => {
      // Arrange
      const parentTopic = TestDataFactory.createTopic({ id: 'parent1' });
      const childTopic = TestDataFactory.createTopic({ 
        id: 'child1',
        parentTopicId: 'parent1'
      });
      
      mockDatabase.seed('topics', [parentTopic, childTopic]);

      const req = createMockRequest({ params: { parentId: 'parent1' } });
      const res = createMockResponse();

      // Act
      await topicController.getTopicsByParent(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({ parentTopicId: 'parent1' })
        ]),
        count: 1
      });
    });
  });

  describe('getTopicWithResources', () => {
    it('should return topic with associated resources', async () => {
      // Arrange
      const topic = TestDataFactory.createTopic({ id: 'topic1' });
      const resources = [
        TestDataFactory.createResource({ topicId: 'topic1' }),
        TestDataFactory.createResource({ topicId: 'topic1' })
      ];
      
      mockDatabase.seed('topics', [topic]);
      mockDatabase.seed('resources', resources);

      const req = createMockRequest({ params: { id: 'topic1' } });
      const res = createMockResponse();

      // Act
      await topicController.getTopicWithResources(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          ...topic,
          resources: expect.arrayContaining([
            expect.objectContaining({ topicId: 'topic1' }),
            expect.objectContaining({ topicId: 'topic1' })
          ])
        }),
        resourceCount: 2
      });
    });
  });

  describe('getTopicVersion', () => {
    it('should return latest version when no version specified', async () => {
      // Arrange
      const topics = [
        TestDataFactory.createTopic({ 
          baseTopicId: 'base1',
          version: 1,
          isLatest: false
        }),
        TestDataFactory.createTopic({ 
          baseTopicId: 'base1',
          version: 2,
          isLatest: true
        })
      ];
      mockDatabase.seed('topics', topics);

      const req = createMockRequest({ params: { baseTopicId: 'base1' } });
      const res = createMockResponse();

      // Act
      await topicController.getTopicVersion(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ version: 2, isLatest: true })
      });
    });

    it('should return specific version when requested', async () => {
      // Arrange
      const topics = [
        TestDataFactory.createTopic({ 
          baseTopicId: 'base1',
          version: 1,
          isLatest: false
        }),
        TestDataFactory.createTopic({ 
          baseTopicId: 'base1',
          version: 2,
          isLatest: true
        })
      ];
      mockDatabase.seed('topics', topics);

      const req = createMockRequest({ 
        params: { baseTopicId: 'base1', version: '1' }
      });
      const res = createMockResponse();

      // Act
      await topicController.getTopicVersion(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ version: 1 })
      });
    });

    it('should return 400 for invalid version number', async () => {
      // Arrange
      const req = createMockRequest({ 
        params: { baseTopicId: 'base1', version: 'invalid' }
      });
      const res = createMockResponse();

      // Act
      await topicController.getTopicVersion(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Version must be a positive integer'
      });
    });
  });

  describe('getTopicHistory', () => {
    it('should return all versions of a topic', async () => {
      // Arrange
      const topics = [
        TestDataFactory.createTopic({ 
          baseTopicId: 'base1',
          version: 1,
          isLatest: false,
          name: 'Version 1'
        }),
        TestDataFactory.createTopic({ 
          baseTopicId: 'base1',
          version: 2,
          isLatest: true,
          name: 'Version 2'
        })
      ];
      mockDatabase.seed('topics', topics);

      const req = createMockRequest({ params: { baseTopicId: 'base1' } });
      const res = createMockResponse();

      // Act
      await topicController.getTopicHistory(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          baseTopicId: 'base1',
          currentVersion: 2,
          versions: expect.arrayContaining([
            expect.objectContaining({ version: 1 }),
            expect.objectContaining({ version: 2 })
          ])
        })
      });
    });

    it('should return 404 when topic not found', async () => {
      // Arrange
      const req = createMockRequest({ params: { baseTopicId: 'nonexistent' } });
      const res = createMockResponse();

      // Act
      await topicController.getTopicHistory(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Topic not found'
      });
    });
  });
});
