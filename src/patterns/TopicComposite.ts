import { Topic } from '../types';

/**
 * Abstract base class for the Composite pattern
 */
export abstract class TopicComponent {
  abstract getId(): string;
  abstract getName(): string;
  abstract getContent(): string;
  abstract getVersion(): number;
  abstract isLatest(): boolean;
  abstract toJSON(): any;
  
  // Default implementations for composite operations
  add(component: TopicComponent): void {
    throw new Error('Operation not supported');
  }
  
  remove(component: TopicComponent): void {
    throw new Error('Operation not supported');
  }
  
  getChildren(): TopicComponent[] {
    throw new Error('Operation not supported');
  }
  
  isComposite(): boolean {
    return false;
  }
}

/**
 * Leaf node - represents a single topic without children
 */
export class TopicLeaf extends TopicComponent {
  constructor(private topic: Topic) {
    super();
  }
  
  getId(): string {
    return this.topic.id;
  }
  
  getName(): string {
    return this.topic.name;
  }
  
  getContent(): string {
    return this.topic.content;
  }
  
  getVersion(): number {
    return this.topic.version;
  }
  
  isLatest(): boolean {
    return this.topic.isLatest;
  }
  
  toJSON(): any {
    return {
      ...this.topic,
      children: [],
      isComposite: false,
      childCount: 0
    };
  }
}

/**
 * Composite node - represents a topic that can contain subtopics
 */
export class TopicComposite extends TopicComponent {
  private children: TopicComponent[] = [];
  
  constructor(private topic: Topic) {
    super();
  }
  
  getId(): string {
    return this.topic.id;
  }
  
  getName(): string {
    return this.topic.name;
  }
  
  getContent(): string {
    return this.topic.content;
  }
  
  getVersion(): number {
    return this.topic.version;
  }
  
  isLatest(): boolean {
    return this.topic.isLatest;
  }
  
  add(component: TopicComponent): void {
    this.children.push(component);
  }
  
  remove(component: TopicComponent): void {
    const index = this.children.indexOf(component);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
  }
  
  getChildren(): TopicComponent[] {
    return [...this.children];
  }
  
  isComposite(): boolean {
    return true;
  }
  
  /**
   * Get total count of all descendants (recursive)
   */
  getTotalDescendantCount(): number {
    let count = this.children.length;
    for (const child of this.children) {
      if (child.isComposite()) {
        count += (child as TopicComposite).getTotalDescendantCount();
      }
    }
    return count;
  }
  
  /**
   * Find a child by ID (recursive)
   */
  findChildById(id: string): TopicComponent | null {
    for (const child of this.children) {
      if (child.getId() === id) {
        return child;
      }
      if (child.isComposite()) {
        const found = (child as TopicComposite).findChildById(id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }
  
  /**
   * Get all leaf nodes (topics without children)
   */
  getLeafNodes(): TopicLeaf[] {
    const leaves: TopicLeaf[] = [];
    for (const child of this.children) {
      if (child.isComposite()) {
        leaves.push(...(child as TopicComposite).getLeafNodes());
      } else {
        leaves.push(child as TopicLeaf);
      }
    }
    return leaves;
  }
  
  toJSON(): any {
    return {
      ...this.topic,
      children: this.children.map(child => child.toJSON()),
      isComposite: true,
      childCount: this.children.length,
      totalDescendants: this.getTotalDescendantCount()
    };
  }
}

/**
 * Factory for creating topic components
 */
export class TopicComponentFactory {
  /**
   * Create a topic component (leaf or composite based on whether it has children)
   */
  static createComponent(topic: Topic, hasChildren: boolean = false): TopicComponent {
    return hasChildren ? new TopicComposite(topic) : new TopicLeaf(topic);
  }
  
  /**
   * Create a composite from a topic (always creates a composite, even if no children yet)
   */
  static createComposite(topic: Topic): TopicComposite {
    return new TopicComposite(topic);
  }
  
  /**
   * Create a leaf from a topic
   */
  static createLeaf(topic: Topic): TopicLeaf {
    return new TopicLeaf(topic);
  }
}
