import { IDatabase } from '../database/interfaces/IDatabase';
import { Topic } from '../types';

/**
 * Custom Queue implementation for efficient BFS operations
 * Uses array with head pointer to avoid O(n) shift operations
 */
class Queue<T> {
  private items: T[] = [];
  private head = 0;

  /**
   * Add item to the end of the queue
   */
  enqueue(item: T): void {
    this.items.push(item);
  }

  /**
   * Remove and return item from the front of the queue
   * O(1) operation using head pointer instead of array.shift()
   */
  dequeue(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    
    const item = this.items[this.head];
    this.head++;
    
    // Reset array when it gets too sparse for memory efficiency
    if (this.head > this.items.length / 2) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    
    return item;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.head >= this.items.length;
  }

  /**
   * Get current queue size
   */
  size(): number {
    return this.items.length - this.head;
  }

  /**
   * Peek at the front item without removing it
   */
  peek(): T | undefined {
    return this.isEmpty() ? undefined : this.items[this.head];
  }
}

/**
 * Result of shortest path calculation
 */
export interface ShortestPathResult {
  path: Topic[];
  distance: number;
  pathExists: boolean;
  searchStats: {
    nodesExplored: number;
    maxDepth: number;
    algorithmUsed: 'unidirectional-bfs';
    executionTimeMs: number;
    queueMaxSize?: number; // Optional queue efficiency metric
  };
}

/**
 * Service for finding shortest paths between topics using custom algorithms
 */
export class ShortestPathService {
  constructor(private database: IDatabase) {}

  /**
   * Find shortest path between two topics using BFS
   */
  async findShortestPath(
    startTopicId: string, 
    endTopicId: string,
    onlyLatest: boolean = true
  ): Promise<ShortestPathResult> {
    const startTime = Date.now();
    
    try {
      // Validate input topics exist
      const startTopic = await this.getTopicById(startTopicId, onlyLatest);
      const endTopic = await this.getTopicById(endTopicId, onlyLatest);
      
      if (!startTopic || !endTopic) {
        return this.createEmptyResult(startTime, 'unidirectional-bfs');
      }

      // Same topic case
      if (startTopicId === endTopicId) {
        return {
          path: [startTopic],
          distance: 0,
          pathExists: true,
          searchStats: {
            nodesExplored: 1,
            maxDepth: 0,
            algorithmUsed: 'unidirectional-bfs',
            executionTimeMs: Date.now() - startTime
          }
        };
      }

      // Use BFS
      return await this.bfs(startTopic, endTopic, onlyLatest, startTime);
      
    } catch (error) {
      console.error('Error finding shortest path:', error);
      return this.createEmptyResult(startTime, 'unidirectional-bfs');
    }
  }


  /**
   * Enhanced BFS implementation using custom queue
   * More efficient than array.shift() with O(1) dequeue operations
   */
  private async bfs(
    startTopic: Topic,
    endTopic: Topic,
    onlyLatest: boolean,
    startTime: number
  ): Promise<ShortestPathResult> {
    const queue = new Queue<string>();
    const visited = new Set([startTopic.id]);
    const parent = new Map<string, string>();
    let nodesExplored = 0;
    let maxDepth = 0;

    // Initialize queue with starting topic
    queue.enqueue(startTopic.id);

    while (!queue.isEmpty()) {
      const currentId = queue.dequeue()!;
      nodesExplored++;

      // Found target?
      if (currentId === endTopic.id) {
        const distance = this.getDistance(parent, startTopic.id, endTopic.id);
        return {
          path: await this.buildPath(parent, startTopic.id, endTopic.id, onlyLatest),
          distance,
          pathExists: true,
          searchStats: {
            nodesExplored,
            maxDepth: Math.max(maxDepth, distance),
            algorithmUsed: 'unidirectional-bfs',
            executionTimeMs: Date.now() - startTime,
            queueMaxSize: queue.size() + nodesExplored // Track queue efficiency
          }
        };
      }

      // Add neighbors to queue
      const currentTopic = await this.getTopicById(currentId, onlyLatest);
      if (currentTopic) {
        const currentDistance = this.getDistance(parent, startTopic.id, currentId);
        maxDepth = Math.max(maxDepth, currentDistance);

        const neighbors = await this.getTopicNeighbors(currentTopic, onlyLatest);
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor.id)) {
            visited.add(neighbor.id);
            parent.set(neighbor.id, currentId);
            queue.enqueue(neighbor.id);
          }
        }
      }
    }

    return this.createEmptyResult(startTime, 'unidirectional-bfs', nodesExplored, maxDepth);
  }

  /**
   * Build path from parent map
   */
  private async buildPath(
    parent: Map<string, string>, 
    start: string, 
    end: string,
    onlyLatest: boolean
  ): Promise<Topic[]> {
    const pathIds = [];
    let current = end;
    
    while (current) {
      pathIds.unshift(current);
      current = parent.get(current) || '';
      if (current === start) {
        pathIds.unshift(start);
        break;
      }
    }
    
    const path = [];
    for (const id of pathIds) {
      const topic = await this.getTopicById(id, onlyLatest);
      if (topic) path.push(topic);
    }
    
    return path;
  }

  /**
   * Calculate distance from parent map
   */
  private getDistance(parent: Map<string, string>, start: string, end: string): number {
    let distance = 0;
    let current = end;
    
    while (current && current !== start) {
      distance++;
      current = parent.get(current) || '';
    }
    
    return distance;
  }



  /**
   * Get all neighboring topics (parents and children)
   */
  private async getTopicNeighbors(topic: Topic, onlyLatest: boolean): Promise<Topic[]> {
    const neighbors: Topic[] = [];
    
    try {
      // Get parent topic - need to find by baseTopicId if parentTopicId is a baseTopicId
      if (topic.parentTopicId) {
        // First try to find by exact ID
        let parent = await this.getTopicById(topic.parentTopicId, onlyLatest);
        
        // If not found and onlyLatest is true, try to find by baseTopicId
        if (!parent && onlyLatest) {
          const parentCandidates = await this.database.find<Topic>('topics', {
            baseTopicId: topic.parentTopicId,
            isLatest: true
          });
          if (parentCandidates.length > 0) {
            parent = parentCandidates[0] || null;
          }
        }
        
        if (parent) {
          neighbors.push(parent);
        }
      }

      // Get child topics - search by both baseTopicId and id
      const baseId = topic.baseTopicId || topic.id;
      const childCriteria = onlyLatest 
        ? { parentTopicId: baseId, isLatest: true }
        : { parentTopicId: baseId };
      
      const children = await this.database.find<Topic>('topics', childCriteria);
      neighbors.push(...children);

      // Also check if any topics have this topic's ID as parentTopicId
      if (topic.id !== baseId) {
        const directChildren = await this.database.find<Topic>('topics', 
          onlyLatest 
            ? { parentTopicId: topic.id, isLatest: true }
            : { parentTopicId: topic.id }
        );
        neighbors.push(...directChildren);
      }

    } catch (error) {
      console.error(`Error getting neighbors for topic ${topic.id}:`, error);
    }

    return neighbors;
  }



  /**
   * Get topic by ID with caching consideration
   */
  private async getTopicById(topicId: string, onlyLatest: boolean): Promise<Topic | null> {
    try {
      if (onlyLatest) {
        const topic = await this.database.findById<Topic>('topics', topicId);
        if (topic && topic.isLatest) {
          return topic;
        }
        
        // Find latest version if current is not latest
        if (topic) {
          const latestVersions = await this.database.find<Topic>('topics', {
            baseTopicId: topic.baseTopicId,
            isLatest: true
          });
          return latestVersions[0] || null;
        }
        
        return null;
      } else {
        return await this.database.findById<Topic>('topics', topicId);
      }
    } catch (error) {
      console.error(`Error getting topic ${topicId}:`, error);
      return null;
    }
  }

  /**
   * Create empty result for failed searches
   */
  private createEmptyResult(
    startTime: number,
    algorithm: 'unidirectional-bfs',
    nodesExplored: number = 0,
    maxDepth: number = 0
  ): ShortestPathResult {
    return {
      path: [],
      distance: -1,
      pathExists: false,
      searchStats: {
        nodesExplored,
        maxDepth,
        algorithmUsed: algorithm,
        executionTimeMs: Date.now() - startTime
      }
    };
  }


}
