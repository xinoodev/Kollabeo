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
  member_count?: number;
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
  assignee_name?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  position: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  comments_count?: number;
  checkbox_states?: Record<string, boolean>;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  parent_id?: number | null;
  created_at: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  email?: string;
  replies?: TaskComment[];
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
  username?: string;
}

export interface TaskCollaborator {
  id: number;
  task_id: number;
  user_id: number;
  added_by?: number;
  added_at: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  username?: string;
}

export interface AuditLog {
  id: number;
  project_id: number;
  user_id?: number;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id?: number;
  details: Record<string, any>;
  created_at: string;
  user_name?: string;
  username?: string;
  user_email?: string;
  user_avatar?: string;
}

export type AuditAction =
  // Task actions
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_assigned'
  | 'task_unassigned'
  | 'task_moved'
  | 'task_priority_changed'
  // Member actions
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  // Invitation actions
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'invitation_rejected'
  | 'invitation_cancelled'
  // Collaborator actions
  | 'collaborator_added'
  | 'collaborator_removed'
  // Column actions
  | 'column_created'
  | 'column_renamed'
  | 'column_moved'
  | 'column_deleted'
  // Project actions
  | 'project_created'
  | 'project_updated'
  | 'project_deleted';

export type AuditEntityType =
  | 'task'
  | 'project_member'
  | 'invitation'
  | 'task_collaborator'
  | 'column'
  | 'project';

export interface AuditLogFilters {
  limit?: number;
  offset?: number;
  action?: AuditAction;
  entityType?: AuditEntityType;
  userId?: number;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogStats {
  byAction: Array<{ action: string; count: number }>;
  byUser: Array<{
    user_id: number;
    full_name: string;
    username: string;
    avatar_url: string;
    action_count: number;
  }>;
  byEntityType: Array<{ entity_type: string; count: number }>;
  activityByDay: Array<{ date: string; count: number }>;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
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