export interface User {
  id: number;
  email: string;
  full_name: string;
  email_verified: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  color: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface TaskColumn {
  id: number;
  name: string;
  position: number;
  project_id: number;
  color: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  column_id: number;
  project_id: number;
  assignee_id?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  position: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  created_at: string;
  user?: User;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

export type DragEndEvent = {
  active: {
    id: string | number;
    data: {
      current: any;
    };
  };
  over: {
    id: string | number;
    data: {
      current: any;
    };
  } | null;
}