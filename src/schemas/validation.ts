import { z } from 'zod';

// Base entity schema
const EntityDataSchema = z.object({
  id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// User schemas
export const UserRoleSchema = z.enum(['Admin', 'Editor', 'Viewer']);

export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
  role: UserRoleSchema,
});

export const UpdateUserSchema = CreateUserSchema.partial();

export const UserSchema = EntityDataSchema.extend({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  createdAt: z.string().datetime(),
});

// Permission schemas
export const PermissionSchema = z.enum(['owner', 'editor', 'viewer']);

export const UserTopicPermissionSchema = EntityDataSchema.extend({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  topicId: z.string().uuid(),
  permission: PermissionSchema,
  createdAt: z.string().datetime(),
  grantedBy: z.string().uuid(),
});

export const CreateUserTopicPermissionSchema = z.object({
  userId: z.string().uuid(),
  topicId: z.string().uuid(),
  permission: PermissionSchema,
  grantedBy: z.string().uuid(),
});

// Topic schemas
export const CreateTopicSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  content: z.string().min(1, 'Content is required'),
  description: z.string().max(500, 'Description too long').optional(),
  parentTopicId: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
});

export const UpdateTopicSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  description: z.string().max(500).optional(),
  parentTopicId: z.string().uuid().optional(),
});

export const TopicSchema = EntityDataSchema.extend({
  id: z.string().uuid(),
  baseTopicId: z.string().uuid(),
  name: z.string(),
  content: z.string(),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
  parentTopicId: z.string().uuid().optional(),
  isLatest: z.boolean(),
  createdBy: z.string().uuid().optional(),
});

// Resource schemas
export const ResourceTypeSchema = z.enum(['video', 'article', 'pdf', 'document', 'link']);

export const CreateResourceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  url: z.string().url('Invalid URL format'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  type: ResourceTypeSchema,
  topicId: z.string().uuid(),
});

export const UpdateResourceSchema = CreateResourceSchema.partial().omit({ topicId: true });

export const ResourceSchema = EntityDataSchema.extend({
  id: z.string().uuid(),
  name: z.string(),
  url: z.string().url(),
  description: z.string(),
  type: ResourceTypeSchema,
  topicId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Query parameter schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const TopicQuerySchema = z.object({
  onlyLatest: z.coerce.boolean().default(true),
  includeResources: z.coerce.boolean().default(false),
  parentTopicId: z.string().uuid().optional(),
});

export const ShortestPathQuerySchema = z.object({
  onlyLatest: z.preprocess((val) => {
    if (val === 'false') return false;
    if (val === 'true') return true;
    return val !== undefined ? true : true; // default to true
  }, z.boolean()).default(true),
});

// Route parameter schemas
export const UuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});

export const ShortestPathParamsSchema = z.object({
  startTopicId: z.string().uuid('Invalid start topic ID'),
  endTopicId: z.string().uuid('Invalid end topic ID'),
});

// Permission request schemas
export const GrantPermissionSchema = z.object({
  userId: z.string().uuid(),
  permission: PermissionSchema,
});

export const RevokePermissionSchema = z.object({
  userId: z.string().uuid(),
});

// Type inference exports
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type User = z.infer<typeof UserSchema>;
export type CreateTopic = z.infer<typeof CreateTopicSchema>;
export type UpdateTopic = z.infer<typeof UpdateTopicSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type CreateResource = z.infer<typeof CreateResourceSchema>;
export type UpdateResource = z.infer<typeof UpdateResourceSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
export type UserTopicPermission = z.infer<typeof UserTopicPermissionSchema>;
export type CreateUserTopicPermission = z.infer<typeof CreateUserTopicPermissionSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type TopicQuery = z.infer<typeof TopicQuerySchema>;
export type ShortestPathQuery = z.infer<typeof ShortestPathQuerySchema>;
export type UuidParam = z.infer<typeof UuidParamSchema>;
export type ShortestPathParams = z.infer<typeof ShortestPathParamsSchema>;
export type GrantPermission = z.infer<typeof GrantPermissionSchema>;
export type RevokePermission = z.infer<typeof RevokePermissionSchema>;
