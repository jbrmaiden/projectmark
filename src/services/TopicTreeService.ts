import { IDatabase } from '../database/interfaces/IDatabase';
import { Topic } from '../types';
import { TopicComponent, TopicComposite, TopicLeaf, TopicComponentFactory } from '../patterns/TopicComposite';

/**
 * Service for building and managing hierarchical topic trees
 */
export class TopicTreeService {
  constructor(private database: IDatabase) {}

  /**
   * Build a complete topic tree starting from a root topic
   */
  async buildTopicTree(rootTopicId: string, onlyLatest: boolean = true): Promise<TopicComponent | null> {
    // Get the root topic
    const rootTopic = await this.getTopicById(rootTopicId, onlyLatest);
    if (!rootTopic) {
      return null;
    }

    // Check if this topic has children
    const hasChildren = await this.hasChildren(rootTopic.baseTopicId || rootTopic.id);
    
    // Create appropriate component
    const rootComponent = TopicComponentFactory.createComponent(rootTopic, hasChildren);
    
    // If it's a composite, recursively build children
    if (rootComponent.isComposite()) {
      await this.buildChildren(rootComponent as TopicComposite, onlyLatest);
    }
    
    return rootComponent;
  }

  /**
   * Build all topic trees (topics without parents)
   */
  async buildAllTopicTrees(onlyLatest: boolean = true): Promise<TopicComponent[]> {
    // Get all topics first, then filter for root topics (no parentTopicId)
    const allTopics = onlyLatest 
      ? await this.database.find<Topic>('topics', { isLatest: true })
      : await this.database.find<Topic>('topics', {});
    
    // Filter for root topics (topics without parentTopicId)
    const rootTopics = allTopics.filter(topic => !topic.parentTopicId);
    
    const trees: TopicComponent[] = [];
    
    for (const rootTopic of rootTopics) {
      const tree = await this.buildTopicTree(rootTopic.id, onlyLatest);
      if (tree) {
        trees.push(tree);
      }
    }
    
    return trees;
  }

  /**
   * Get topic path from root to specified topic
   */
  async getTopicPath(topicId: string, onlyLatest: boolean = true): Promise<Topic[]> {
    const path: Topic[] = [];
    let currentTopic = await this.getTopicById(topicId, onlyLatest);
    
    while (currentTopic) {
      path.unshift(currentTopic);
      
      if (currentTopic.parentTopicId) {
        currentTopic = await this.getTopicByBaseId(currentTopic.parentTopicId, onlyLatest);
      } else {
        break;
      }
    }
    
    return path;
  }

  /**
   * Get all descendants of a topic (flattened list)
   */
  async getTopicDescendants(topicId: string, onlyLatest: boolean = true): Promise<Topic[]> {
    const tree = await this.buildTopicTree(topicId, onlyLatest);
    if (!tree || !tree.isComposite()) {
      return [];
    }
    
    const descendants: Topic[] = [];
    this.collectDescendants(tree as TopicComposite, descendants);
    return descendants;
  }

  /**
   * Recursively build children for a composite topic
   */
  private async buildChildren(composite: TopicComposite, onlyLatest: boolean): Promise<void> {
    const parentBaseId = composite.getId();
    
    // Find all children of this topic
    const criteria = onlyLatest
      ? { parentTopicId: parentBaseId, isLatest: true }
      : { parentTopicId: parentBaseId };
    
    const children = await this.database.find<Topic>('topics', criteria);
    
    for (const child of children) {
      // Check if this child has its own children
      const hasGrandChildren = await this.hasChildren(child.baseTopicId || child.id);
      
      // Create appropriate component
      const childComponent = TopicComponentFactory.createComponent(child, hasGrandChildren);
      
      // Add to parent
      composite.add(childComponent);
      
      // Recursively build grandchildren if it's a composite
      if (childComponent.isComposite()) {
        await this.buildChildren(childComponent as TopicComposite, onlyLatest);
      }
    }
  }

  /**
   * Check if a topic has children
   */
  private async hasChildren(baseTopicId: string): Promise<boolean> {
    const children = await this.database.find<Topic>('topics', { 
      parentTopicId: baseTopicId,
      isLatest: true 
    });
    return children.length > 0;
  }

  /**
   * Get topic by ID (latest version by default)
   */
  private async getTopicById(topicId: string, onlyLatest: boolean): Promise<Topic | null> {
    if (onlyLatest) {
      // First try to find by ID directly
      let topic = await this.database.findById<Topic>('topics', topicId);
      if (topic && topic.isLatest) {
        return topic;
      }
      
      // If not latest, find the latest version of this topic
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
  }

  /**
   * Get topic by base ID (latest version)
   */
  private async getTopicByBaseId(baseTopicId: string, onlyLatest: boolean): Promise<Topic | null> {
    const criteria = onlyLatest
      ? { baseTopicId: baseTopicId, isLatest: true }
      : { baseTopicId: baseTopicId };
    
    const topics = await this.database.find<Topic>('topics', criteria);
    
    if (onlyLatest) {
      return topics.find(t => t.isLatest) || topics[0] || null;
    } else {
      // Return the highest version
      return topics.sort((a, b) => b.version - a.version)[0] || null;
    }
  }

  /**
   * Recursively collect all descendants into a flat array
   */
  private collectDescendants(composite: TopicComposite, descendants: Topic[]): void {
    for (const child of composite.getChildren()) {
      // Add the child topic to descendants
      const childTopic = {
        id: child.getId(),
        name: child.getName(),
        content: child.getContent(),
        version: child.getVersion(),
        isLatest: child.isLatest()
      } as Topic;
      
      descendants.push(childTopic);
      
      // Recursively collect from composite children
      if (child.isComposite()) {
        this.collectDescendants(child as TopicComposite, descendants);
      }
    }
  }
}
