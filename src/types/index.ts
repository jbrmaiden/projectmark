
export interface DatabaseConfig {
  type: 'memory' | 'file' | 'mongodb' | 'postgresql' | 'mysql';
  connectionString?: string | undefined;
  host?: string | undefined;
  port?: number | undefined;
  database?: string | undefined;
  username?: string | undefined;
  password?: string | undefined;
  options?: Record<string, any>;
}

export interface EntityData {
  id?: string;
  created_at?: string;
  updated_at?: string;
}


export interface User extends EntityData {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  createdAt: string;
}

// User-Topic relationship with permissions
export interface UserTopicPermission extends EntityData {
  id: string;
  userId: string;
  topicId: string; // Can be baseTopicId for all versions
  permission: 'owner' | 'editor' | 'viewer';
  createdAt: string;
  grantedBy: string; // User ID who granted this permission
}

// User-Resource relationship
export interface UserResourcePermission extends EntityData {
  id: string;
  userId: string;
  resourceId: string;
  permission: 'owner' | 'editor' | 'viewer';
  createdAt: string;
  grantedBy: string;
}

export interface Topic extends EntityData {
  id: string;
  baseTopicId: string; // Links all versions of the same topic
  name: string;
  content: string;
  description?: string; // Optional description field
  createdAt: string;
  updatedAt: string;
  version: number;
  parentTopicId?: string;
  isLatest: boolean; // Indicates if this is the current version
  createdBy?: string; // User who created this version
}

export interface TopicWithResources extends Topic {
  resources: Resource[];
}

export interface Resource extends EntityData {
  id: string;
  topicId: string;
  url: string;
  description: string;
  type: 'video' | 'article' | 'pdf' | 'document' | 'link';
  createdAt: string;
  updatedAt: string;
}

export interface TopicVersion {
  baseTopicId: string;
  version: number;
  topic: Topic;
}

export interface TopicHistory {
  baseTopicId: string;
  currentVersion: number;
  versions: TopicVersion[];
}

export interface Resource extends EntityData {
  id: string;
  name: string;
  url: string;
  description: string;
  type: 'video' | 'article' | 'pdf' | 'document' | 'link';
  topicId: string;
  createdAt: string;
  updatedAt: string;
}

// Permission levels
export type Permission = 'owner' | 'editor' | 'viewer';

// Global user roles
export type UserRole = 'Admin' | 'Editor' | 'Viewer';

export type EntityType = 'users' | 'topics' | 'resources' | 'userTopicPermissions' | 'userResourcePermissions';
