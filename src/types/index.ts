
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



export type EntityType = 'users';
