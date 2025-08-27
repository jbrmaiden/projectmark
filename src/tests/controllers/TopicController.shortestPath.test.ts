import { Request, Response } from 'express';
import { TopicController } from '../../controllers/TopicController';
import { MockDatabase, TestDataFactory } from '../setup';
import { Topic } from '../../types';

// Mock the ShortestPathService
jest.mock('../../services/ShortestPathService', () => {
  return {
    ShortestPathService: jest.fn().mockImplementation(() => ({
      findShortestPath: jest.fn()
    }))
  };
});

describe('TopicController - Shortest Path Endpoints', () => {
  let topicController: TopicController;
  let mockDatabase: MockDatabase;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockShortestPathService: any;

  beforeEach(() => {
    mockDatabase = new MockDatabase();
    topicController = new TopicController(mockDatabase);
    
    // Get the mocked service instance
    mockShortestPathService = (topicController as any).shortestPathService;
    
    mockRequest = {
      params: {},
      query: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    mockDatabase.clear();
  });

  describe('findShortestPath', () => {
    it('should find shortest path between two topics successfully', async () => {
      const startTopic = TestDataFactory.createTopic({
        id: 'start-topic',
        name: 'Start Topic',
        isLatest: true
      });
      
      const endTopic = TestDataFactory.createTopic({
        id: 'end-topic',
        name: 'End Topic',
        isLatest: true
      });

      const mockResult = {
        pathExists: true,
        distance: 2,
        path: [startTopic, endTopic],
        searchStats: {
          nodesExplored: 5,
          maxDepth: 2,
          algorithmUsed: 'bidirectional-bfs' as const,
          executionTimeMs: 10
        }
      };

      mockShortestPathService.findShortestPath.mockResolvedValue(mockResult);

      mockRequest.params = {
        startTopicId: 'start-topic',
        endTopicId: 'end-topic'
      };

      await topicController.findShortestPath(mockRequest as Request, mockResponse as Response);

      expect(mockShortestPathService.findShortestPath).toHaveBeenCalledWith(
        'start-topic',
        'end-topic',
        true // onlyLatest default
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          pathExists: true,
          distance: 2,
          path: [startTopic, endTopic],
          searchStats: mockResult.searchStats
        }
      });
    });

    it('should handle onlyLatest query parameter', async () => {
      const mockResult = {
        pathExists: false,
        distance: -1,
        path: [],
        searchStats: {
          nodesExplored: 0,
          maxDepth: 0,
          algorithmUsed: 'bidirectional-bfs' as const,
          executionTimeMs: 5
        }
      };

      mockShortestPathService.findShortestPath.mockResolvedValue(mockResult);

      mockRequest.params = {
        startTopicId: 'start-topic',
        endTopicId: 'end-topic'
      };
      mockRequest.query = { onlyLatest: 'false' };

      await topicController.findShortestPath(mockRequest as Request, mockResponse as Response);

      expect(mockShortestPathService.findShortestPath).toHaveBeenCalledWith(
        'start-topic',
        'end-topic',
        false
      );
    });

    it('should return 400 when startTopicId is missing', async () => {
      mockRequest.params = {
        endTopicId: 'end-topic'
      };

      await topicController.findShortestPath(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Both startTopicId and endTopicId are required'
      });
    });

    it('should return 400 when endTopicId is missing', async () => {
      mockRequest.params = {
        startTopicId: 'start-topic'
      };

      await topicController.findShortestPath(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Both startTopicId and endTopicId are required'
      });
    });

    it('should handle service errors gracefully', async () => {
      mockShortestPathService.findShortestPath.mockRejectedValue(new Error('Service error'));

      mockRequest.params = {
        startTopicId: 'start-topic',
        endTopicId: 'end-topic'
      };

      await topicController.findShortestPath(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error'
      });
    });
  });


});
