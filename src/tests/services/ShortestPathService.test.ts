import { ShortestPathService, ShortestPathResult } from '../../services/ShortestPathService';
import { MockDatabase, TestDataFactory } from '../setup';
import { Topic } from '../../types';

describe('ShortestPathService', () => {
  let shortestPathService: ShortestPathService;
  let mockDatabase: MockDatabase;

  beforeEach(() => {
    mockDatabase = new MockDatabase();
    shortestPathService = new ShortestPathService(mockDatabase);
  });

  afterEach(() => {
    mockDatabase.clear();
    jest.clearAllMocks();
  });

  describe('findShortestPath - Basic Cases', () => {
    it('should return path with distance 0 for same topic', async () => {
      const topic = TestDataFactory.createTopic({
        id: 'topic1',
        name: 'Same Topic',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [topic]);

      const result = await shortestPathService.findShortestPath('topic1', 'topic1');

      expect(result.pathExists).toBe(true);
      expect(result.distance).toBe(0);
      expect(result.path).toHaveLength(1);
      expect(result.path[0]?.id).toBe('topic1');
      expect(result.searchStats.algorithmUsed).toBe('unidirectional-bfs');
      expect(result.searchStats.nodesExplored).toBe(1);
    });

    it('should return empty path when start topic does not exist', async () => {
      const endTopic = TestDataFactory.createTopic({
        id: 'topic2',
        name: 'End Topic',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [endTopic]);

      const result = await shortestPathService.findShortestPath('nonexistent', 'topic2');

      expect(result.pathExists).toBe(false);
      expect(result.distance).toBe(-1);
      expect(result.path).toHaveLength(0);
    });

    it('should return empty path when end topic does not exist', async () => {
      const startTopic = TestDataFactory.createTopic({
        id: 'topic1',
        name: 'Start Topic',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [startTopic]);

      const result = await shortestPathService.findShortestPath('topic1', 'nonexistent');

      expect(result.pathExists).toBe(false);
      expect(result.distance).toBe(-1);
      expect(result.path).toHaveLength(0);
    });
  });

  describe('findShortestPath - Linear Hierarchy', () => {
    it('should find direct parent-child path', async () => {
      const parent = TestDataFactory.createTopic({
        id: 'parent',
        baseTopicId: 'parent-base',
        name: 'Parent Topic',
        isLatest: true
      });
      
      const child = TestDataFactory.createTopic({
        id: 'child',
        name: 'Child Topic',
        parentTopicId: 'parent-base',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [parent, child]);

      const result = await shortestPathService.findShortestPath('parent', 'child');

      expect(result.pathExists).toBe(true);
      expect(result.distance).toBe(1);
      expect(result.path).toHaveLength(2);
      expect(result.path[0]?.id).toBe('parent');
      expect(result.path[1]?.id).toBe('child');
      expect(result.searchStats.nodesExplored).toBeGreaterThan(0);
    });

    it('should find path in deep linear hierarchy', async () => {
      const topics = [
        TestDataFactory.createTopic({
          id: 'root',
          baseTopicId: 'root-base',
          name: 'Root',
          isLatest: true
        }),
        TestDataFactory.createTopic({
          id: 'level1',
          baseTopicId: 'level1-base',
          name: 'Level 1',
          parentTopicId: 'root-base',
          isLatest: true
        }),
        TestDataFactory.createTopic({
          id: 'level2',
          baseTopicId: 'level2-base',
          name: 'Level 2',
          parentTopicId: 'level1-base',
          isLatest: true
        }),
        TestDataFactory.createTopic({
          id: 'level3',
          name: 'Level 3',
          parentTopicId: 'level2-base',
          isLatest: true
        })
      ];
      
      mockDatabase.seed('topics', topics);

      const result = await shortestPathService.findShortestPath('root', 'level3');

      expect(result.pathExists).toBe(true);
      expect(result.distance).toBe(3);
      expect(result.path).toHaveLength(4);
      expect(result.path[0]?.id).toBe('root');
      expect(result.path[1]?.id).toBe('level1');
      expect(result.path[2]?.id).toBe('level2');
      expect(result.path[3]?.id).toBe('level3');
    });

    it('should find reverse path (child to parent)', async () => {
      const parent = TestDataFactory.createTopic({
        id: 'parent',
        baseTopicId: 'parent-base',
        name: 'Parent Topic',
        isLatest: true
      });
      
      const child = TestDataFactory.createTopic({
        id: 'child',
        name: 'Child Topic',
        parentTopicId: 'parent-base',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [parent, child]);

      const result = await shortestPathService.findShortestPath('child', 'parent');

      expect(result.pathExists).toBe(true);
      expect(result.distance).toBe(1);
      expect(result.path).toHaveLength(2);
      expect(result.path[0]?.id).toBe('child');
      expect(result.path[1]?.id).toBe('parent');
    });
  });

  describe('findShortestPath - Complex Hierarchies', () => {
    it('should find shortest path between siblings', async () => {
      const parent = TestDataFactory.createTopic({
        id: 'parent',
        baseTopicId: 'parent-base',
        name: 'Parent',
        isLatest: true
      });
      
      const sibling1 = TestDataFactory.createTopic({
        id: 'sibling1',
        name: 'Sibling 1',
        parentTopicId: 'parent-base',
        isLatest: true
      });
      
      const sibling2 = TestDataFactory.createTopic({
        id: 'sibling2',
        name: 'Sibling 2',
        parentTopicId: 'parent-base',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [parent, sibling1, sibling2]);

      const result = await shortestPathService.findShortestPath('sibling1', 'sibling2');

      expect(result.pathExists).toBe(true);
      expect(result.distance).toBe(2);
      expect(result.path).toHaveLength(3);
      expect(result.path[0]?.id).toBe('sibling1');
      expect(result.path[1]?.id).toBe('parent');
      expect(result.path[2]?.id).toBe('sibling2');
    });

    it('should find path between cousins', async () => {
      const grandparent = TestDataFactory.createTopic({
        id: 'grandparent',
        baseTopicId: 'grandparent-base',
        name: 'Grandparent',
        isLatest: true
      });
      
      const parent1 = TestDataFactory.createTopic({
        id: 'parent1',
        baseTopicId: 'parent1-base',
        name: 'Parent 1',
        parentTopicId: 'grandparent-base',
        isLatest: true
      });
      
      const parent2 = TestDataFactory.createTopic({
        id: 'parent2',
        baseTopicId: 'parent2-base',
        name: 'Parent 2',
        parentTopicId: 'grandparent-base',
        isLatest: true
      });
      
      const cousin1 = TestDataFactory.createTopic({
        id: 'cousin1',
        name: 'Cousin 1',
        parentTopicId: 'parent1-base',
        isLatest: true
      });
      
      const cousin2 = TestDataFactory.createTopic({
        id: 'cousin2',
        name: 'Cousin 2',
        parentTopicId: 'parent2-base',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [grandparent, parent1, parent2, cousin1, cousin2]);

      const result = await shortestPathService.findShortestPath('cousin1', 'cousin2');

      expect(result.pathExists).toBe(true);
      expect(result.distance).toBe(4);
      expect(result.path).toHaveLength(5);
      expect(result.path[0]?.id).toBe('cousin1');
      expect(result.path[1]?.id).toBe('parent1');
      expect(result.path[2]?.id).toBe('grandparent');
      expect(result.path[3]?.id).toBe('parent2');
      expect(result.path[4]?.id).toBe('cousin2');
    });

    it('should handle disconnected components', async () => {
      const tree1Root = TestDataFactory.createTopic({
        id: 'tree1-root',
        name: 'Tree 1 Root',
        isLatest: true
      });
      
      const tree2Root = TestDataFactory.createTopic({
        id: 'tree2-root',
        name: 'Tree 2 Root',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [tree1Root, tree2Root]);

      const result = await shortestPathService.findShortestPath('tree1-root', 'tree2-root');

      expect(result.pathExists).toBe(false);
      expect(result.distance).toBe(-1);
      expect(result.path).toHaveLength(0);
    });
  });

  describe('findShortestPath - Version Handling', () => {
    it('should find path using only latest versions when onlyLatest=true', async () => {
      const parent = TestDataFactory.createTopic({
        id: 'parent-v1',
        baseTopicId: 'parent-base',
        name: 'Parent V1',
        version: 1,
        isLatest: false
      });
      
      const parentLatest = TestDataFactory.createTopic({
        id: 'parent-v2',
        baseTopicId: 'parent-base',
        name: 'Parent V2',
        version: 2,
        isLatest: true
      });
      
      const child = TestDataFactory.createTopic({
        id: 'child',
        name: 'Child',
        parentTopicId: 'parent-base',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [parent, parentLatest, child]);

      const result = await shortestPathService.findShortestPath('parent-v1', 'child', true);

      expect(result.pathExists).toBe(true);
      expect(result.path[0]?.id).toBe('parent-v2'); // Should use latest version
      expect(result.path[1]?.id).toBe('child');
    });

    it('should find path using all versions when onlyLatest=false', async () => {
      const parent = TestDataFactory.createTopic({
        id: 'parent-v1',
        baseTopicId: 'parent-base',
        name: 'Parent V1',
        version: 1,
        isLatest: false
      });
      
      const parentLatest = TestDataFactory.createTopic({
        id: 'parent-v2',
        baseTopicId: 'parent-base',
        name: 'Parent V2',
        version: 2,
        isLatest: true
      });
      
      const child = TestDataFactory.createTopic({
        id: 'child',
        name: 'Child',
        parentTopicId: 'parent-base',
        isLatest: true
      });
      
      mockDatabase.seed('topics', [parent, parentLatest, child]);

      const result = await shortestPathService.findShortestPath('parent-v1', 'child', false);

      expect(result.pathExists).toBe(true);
      expect(result.path[0]?.id).toBe('parent-v1'); // Should use exact version requested
    });
  });



  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDatabase.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await shortestPathService.findShortestPath('topic1', 'topic2');

      expect(result.pathExists).toBe(false);
      expect(result.distance).toBe(-1);
      expect(result.path).toHaveLength(0);
      expect(result.searchStats.executionTimeMs).toBeGreaterThan(0);
    });

    it('should handle malformed topic data', async () => {
      const malformedTopic = {
        id: 'malformed',
        name: 'Malformed Topic',
        // Missing required fields
      } as Topic;
      
      mockDatabase.seed('topics', [malformedTopic]);

      const result = await shortestPathService.findShortestPath('malformed', 'nonexistent');

      expect(result.pathExists).toBe(false);
    });

    it('should handle circular references without infinite loops', async () => {
      const topic1 = TestDataFactory.createTopic({
        id: 'topic1',
        baseTopicId: 'topic1-base',
        name: 'Topic 1',
        parentTopicId: 'topic2-base', // Points to topic2
        isLatest: true
      });
      
      const topic2 = TestDataFactory.createTopic({
        id: 'topic2',
        baseTopicId: 'topic2-base',
        name: 'Topic 2',
        parentTopicId: 'topic1-base', // Points to topic1 - circular!
        isLatest: true
      });
      
      mockDatabase.seed('topics', [topic1, topic2]);

      const result = await shortestPathService.findShortestPath('topic1', 'topic2');

      // Should complete without hanging and find the direct connection
      expect(result.pathExists).toBe(true);
      expect(result.distance).toBe(1);
      expect(result.searchStats.executionTimeMs).toBeLessThan(1000); // Should complete quickly
    });
  });

  describe('Performance and Statistics', () => {
    it('should track search statistics correctly', async () => {
      const topics = [
        TestDataFactory.createTopic({
          id: 'start',
          baseTopicId: 'start-base',
          name: 'Start',
          isLatest: true
        }),
        TestDataFactory.createTopic({
          id: 'middle',
          baseTopicId: 'middle-base',
          name: 'Middle',
          parentTopicId: 'start-base',
          isLatest: true
        }),
        TestDataFactory.createTopic({
          id: 'end',
          name: 'End',
          parentTopicId: 'middle-base',
          isLatest: true
        })
      ];
      
      mockDatabase.seed('topics', topics);

      const result = await shortestPathService.findShortestPath('start', 'end');

      expect(result.searchStats.nodesExplored).toBeGreaterThan(0);
      expect(result.searchStats.maxDepth).toBeGreaterThanOrEqual(0);
      expect(result.searchStats.algorithmUsed).toBe('unidirectional-bfs');
      expect(result.searchStats.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should complete search within reasonable time limits', async () => {
      const topics: Topic[] = [];
      
      // Create moderately complex hierarchy
      for (let i = 0; i < 50; i++) {
        const topicData: any = {
          id: `topic-${i}`,
          baseTopicId: `topic-${i}-base`,
          name: `Topic ${i}`,
          isLatest: true
        };
        if (i > 0) {
          topicData.parentTopicId = `topic-${Math.floor(i/2)}-base`;
        }
        topics.push(TestDataFactory.createTopic(topicData) as Topic);
      }
      
      mockDatabase.seed('topics', topics);

      const startTime = Date.now();
      const result = await shortestPathService.findShortestPath('topic-0', 'topic-49');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.pathExists).toBe(true);
      expect(result.searchStats.executionTimeMs).toBeLessThan(1000);
    });
  });
});
