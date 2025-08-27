import { TopicTreeService } from '../../services/TopicTreeService';
import { MockDatabase, TestDataFactory, createMockRequest, createMockResponse } from '../setup';
import { Topic } from '../../types';
import { TopicComponent, TopicComposite, TopicLeaf } from '../../patterns/TopicComposite';

// Mock the TopicComposite patterns
jest.mock('../../patterns/TopicComposite', () => ({
  TopicComponentFactory: {
    createComponent: jest.fn()
  },
  TopicComposite: jest.fn(),
  TopicLeaf: jest.fn()
}));

import { TopicComponentFactory } from '../../patterns/TopicComposite';
const mockTopicComponentFactory = TopicComponentFactory as jest.Mocked<typeof TopicComponentFactory>;

describe('TopicTreeService', () => {
  let topicTreeService: TopicTreeService;
  let mockDatabase: MockDatabase;

  beforeEach(() => {
    mockDatabase = new MockDatabase();
    topicTreeService = new TopicTreeService(mockDatabase);
    
    // Setup mock component factory
    mockTopicComponentFactory.createComponent.mockImplementation((topic, hasChildren) => {
      const mockComponent = {
        getId: jest.fn().mockReturnValue(topic.id),
        getName: jest.fn().mockReturnValue(topic.name),
        getContent: jest.fn().mockReturnValue(topic.content),
        getVersion: jest.fn().mockReturnValue(topic.version),
        isLatest: jest.fn().mockReturnValue(topic.isLatest),
        isComposite: jest.fn().mockReturnValue(hasChildren),
        add: jest.fn(),
        getChildren: jest.fn().mockReturnValue([])
      };
      return mockComponent as any;
    });
  });

  afterEach(() => {
    mockDatabase.clear();
    jest.clearAllMocks();
  });

  describe('buildTopicTree', () => {
    it('should build a simple topic tree with no children', async () => {
      const rootTopic = TestDataFactory.createTopic({
        id: 'root-topic',
        name: 'Root Topic',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [rootTopic]);

      const result = await topicTreeService.buildTopicTree('root-topic');

      expect(result).toBeDefined();
      expect(mockTopicComponentFactory.createComponent).toHaveBeenCalledWith(rootTopic, false);
    });

    it('should build a topic tree with children', async () => {
      const rootTopic = TestDataFactory.createTopic({
        id: 'root-topic',
        baseTopicId: 'root-base',
        name: 'Root Topic',
        isLatest: true
      });
      
      const childTopic = TestDataFactory.createTopic({
        id: 'child-topic',
        baseTopicId: 'child-base',
        name: 'Child Topic',
        parentTopicId: 'root-base',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [rootTopic, childTopic]);

      const result = await topicTreeService.buildTopicTree('root-topic');

      expect(result).toBeDefined();
      expect(mockTopicComponentFactory.createComponent).toHaveBeenCalledWith(rootTopic, true);
    });

    it('should return null for non-existent topic', async () => {
      const result = await topicTreeService.buildTopicTree('non-existent');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockDatabase.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(topicTreeService.buildTopicTree('topic-id')).rejects.toThrow('Failed to build topic tree');
    });
  });

  describe('buildAllTopicTrees', () => {
    it('should build trees for all root topics', async () => {
      const rootTopic1 = TestDataFactory.createTopic({
        id: 'root1',
        name: 'Root 1',
        isLatest: true
      });
      
      const rootTopic2 = TestDataFactory.createTopic({
        id: 'root2',
        name: 'Root 2',
        isLatest: true
      });
      
      const childTopic = TestDataFactory.createTopic({
        id: 'child1',
        name: 'Child 1',
        parentTopicId: 'root1',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [rootTopic1, rootTopic2, childTopic]);

      const result = await topicTreeService.buildAllTopicTrees();

      expect(result).toHaveLength(2);
      expect(mockTopicComponentFactory.createComponent).toHaveBeenCalledTimes(2);
    });

    it('should filter for latest topics when onlyLatest is true', async () => {
      const latestTopic = TestDataFactory.createTopic({
        id: 'topic1',
        name: 'Latest Topic',
        isLatest: true
      });
      
      const oldTopic = TestDataFactory.createTopic({
        id: 'topic2',
        name: 'Old Topic',
        isLatest: false
      });
      
      mockDatabase.seed('topics', [latestTopic, oldTopic]);

      const result = await topicTreeService.buildAllTopicTrees(true);

      expect(result).toHaveLength(1);
    });

    it('should include all topics when onlyLatest is false', async () => {
      const latestTopic = TestDataFactory.createTopic({
        id: 'topic1',
        name: 'Latest Topic',
        isLatest: true
      });
      
      const oldTopic = TestDataFactory.createTopic({
        id: 'topic2',
        name: 'Old Topic',
        isLatest: false
      });
      
      mockDatabase.seed('topics', [latestTopic, oldTopic]);

      const result = await topicTreeService.buildAllTopicTrees(false);

      expect(result).toHaveLength(2);
    });

    it('should handle errors gracefully and continue with other trees', async () => {
      const goodTopic = TestDataFactory.createTopic({
        id: 'good-topic',
        name: 'Good Topic',
        isLatest: true
      });
      
      const badTopic = TestDataFactory.createTopic({
        id: 'bad-topic',
        name: 'Bad Topic',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [goodTopic, badTopic]);
      
      // Mock findById to fail for bad-topic
      const originalFindById = mockDatabase.findById;
      mockDatabase.findById = jest.fn().mockImplementation((collection, id) => {
        if (id === 'bad-topic') {
          throw new Error('Database error');
        }
        return originalFindById.call(mockDatabase, collection, id);
      });

      const result = await topicTreeService.buildAllTopicTrees();

      expect(result).toHaveLength(1);
    });
  });

  describe('getTopicPath', () => {
    it('should return path from root to target topic', async () => {
      const rootTopic = TestDataFactory.createTopic({
        id: 'root',
        name: 'Root',
        isLatest: true
      });
      
      const middleTopic = TestDataFactory.createTopic({
        id: 'middle',
        name: 'Middle',
        parentTopicId: 'root',
        isLatest: true
      });
      
      const leafTopic = TestDataFactory.createTopic({
        id: 'leaf',
        name: 'Leaf',
        parentTopicId: 'middle',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [rootTopic, middleTopic, leafTopic]);

      const result = await topicTreeService.getTopicPath('leaf');

      expect(result).toHaveLength(3);
      expect(result[0]?.id).toBe('root');
      expect(result[1]?.id).toBe('middle');
      expect(result[2]?.id).toBe('leaf');
    });

    it('should return single topic for root topic', async () => {
      const rootTopic = TestDataFactory.createTopic({
        id: 'root',
        name: 'Root',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [rootTopic]);

      const result = await topicTreeService.getTopicPath('root');

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('root');
    });

    it('should detect circular references', async () => {
      const topic1 = TestDataFactory.createTopic({
        id: 'topic1',
        name: 'Topic 1',
        parentTopicId: 'topic2',
        isLatest: true
      });
      
      const topic2 = TestDataFactory.createTopic({
        id: 'topic2',
        name: 'Topic 2',
        parentTopicId: 'topic1',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [topic1, topic2]);

      await expect(topicTreeService.getTopicPath('topic1')).rejects.toThrow('Circular reference detected');
    });

    it('should handle non-existent topic', async () => {
      const result = await topicTreeService.getTopicPath('non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('getTopicDescendants', () => {
    it('should return empty array for leaf topic', async () => {
      const leafTopic = TestDataFactory.createTopic({
        id: 'leaf',
        name: 'Leaf Topic',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [leafTopic]);

      const result = await topicTreeService.getTopicDescendants('leaf');

      expect(result).toEqual([]);
    });

    it('should return all descendants for composite topic', async () => {
      const rootTopic = TestDataFactory.createTopic({
        id: 'root',
        baseTopicId: 'root-base',
        name: 'Root Topic',
        isLatest: true
      });
      
      const child1 = TestDataFactory.createTopic({
        id: 'child1',
        name: 'Child 1',
        parentTopicId: 'root-base',
        isLatest: true
      });
      
      const child2 = TestDataFactory.createTopic({
        id: 'child2',
        name: 'Child 2',
        parentTopicId: 'root-base',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [rootTopic, child1, child2]);

      // Mock the composite component to return children
      mockTopicComponentFactory.createComponent.mockImplementation((topic, hasChildren) => {
        const mockComponent = {
          getId: jest.fn().mockReturnValue(topic.id),
          getName: jest.fn().mockReturnValue(topic.name),
          getContent: jest.fn().mockReturnValue(topic.content),
          getVersion: jest.fn().mockReturnValue(topic.version),
          isLatest: jest.fn().mockReturnValue(topic.isLatest),
          isComposite: jest.fn().mockReturnValue(hasChildren),
          add: jest.fn(),
          getChildren: jest.fn().mockReturnValue(hasChildren ? [
            {
              getId: () => 'child1',
              getName: () => 'Child 1',
              getContent: () => '',
              getVersion: () => 1,
              isLatest: () => true,
              isComposite: () => false
            },
            {
              getId: () => 'child2',
              getName: () => 'Child 2',
              getContent: () => '',
              getVersion: () => 1,
              isLatest: () => true,
              isComposite: () => false
            }
          ] : [])
        };
        return mockComponent as any;
      });

      const result = await topicTreeService.getTopicDescendants('root');

      expect(result).toHaveLength(2);
    });

    it('should handle database errors', async () => {
      mockDatabase.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(topicTreeService.getTopicDescendants('topic-id')).rejects.toThrow('Failed to get topic descendants');
    });
  });
});
