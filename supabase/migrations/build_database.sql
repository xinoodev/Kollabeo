
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS task_collaborators CASCADE;
DROP TABLE IF EXISTS project_invitation_links CASCADE;
DROP TABLE IF EXISTS project_invitations CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS task_columns CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE,
  avatar_url VARCHAR(500),
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  email_verification_expires TIMESTAMP,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_columns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  column_id INTEGER REFERENCES task_columns(id) ON DELETE CASCADE NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP,
  position INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  checkbox_states JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_id INTEGER REFERENCES task_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);

CREATE TABLE task_collaborators (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, user_id)
);

CREATE TABLE project_invitations (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'rejected')),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  UNIQUE(project_id, email, status)
);

CREATE TABLE project_invitation_links (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  project_id INTEGER,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_task_columns_project_id ON task_columns(project_id);
CREATE INDEX idx_tasks_column_id ON tasks(column_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_checkbox_states ON tasks USING gin(checkbox_states);
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_parent_id ON task_comments(parent_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_task_collaborators_task_id ON task_collaborators(task_id);
CREATE INDEX idx_task_collaborators_user_id ON task_collaborators(user_id);
CREATE INDEX idx_project_invitations_token ON project_invitations(token);
CREATE INDEX idx_project_invitations_email ON project_invitations(email);
CREATE INDEX idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX idx_project_invitations_status ON project_invitations(status);
CREATE INDEX idx_project_invitation_links_token ON project_invitation_links(token);
CREATE INDEX idx_project_invitation_links_project_id ON project_invitation_links(project_id);
CREATE INDEX idx_project_invitation_links_active ON project_invitation_links(project_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_audit_logs_project_action ON audit_logs(project_id, action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_task_columns_updated_at
  BEFORE UPDATE ON task_columns
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE FUNCTION create_default_columns()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO task_columns (name, position, project_id, color) VALUES
    ('To Do', 0, NEW.id, '#6B7280'),
    ('In Progress', 1, NEW.id, '#3B82F6'),
    ('Review', 2, NEW.id, '#F59E0B'),
    ('Done', 3, NEW.id, '#10B981');
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_default_columns_trigger
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE PROCEDURE create_default_columns();

CREATE OR REPLACE FUNCTION log_task_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
    VALUES (
      NEW.project_id,
      NEW.created_by,
      'task_created',
      'task',
      NEW.id,
      jsonb_build_object(
        'task_title', NEW.title,
        'column_id', NEW.column_id,
        'priority', NEW.priority
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
      VALUES (
        NEW.project_id,
        COALESCE(NEW.assignee_id, OLD.assignee_id),
        CASE 
          WHEN NEW.assignee_id IS NOT NULL THEN 'task_assigned'
          ELSE 'task_unassigned'
        END,
        'task',
        NEW.id,
        jsonb_build_object(
          'task_title', NEW.title,
          'old_assignee_id', OLD.assignee_id,
          'new_assignee_id', NEW.assignee_id
        )
      );
    END IF;
    
    IF OLD.column_id IS DISTINCT FROM NEW.column_id THEN
      INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
      VALUES (
        NEW.project_id,
        NULL,
        'task_moved',
        'task',
        NEW.id,
        jsonb_build_object(
          'task_title', NEW.title,
          'old_column_id', OLD.column_id,
          'new_column_id', NEW.column_id
        )
      );
    END IF;
    
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
      VALUES (
        NEW.project_id,
        NULL,
        'task_priority_changed',
        'task',
        NEW.id,
        jsonb_build_object(
          'task_title', NEW.title,
          'old_priority', OLD.priority,
          'new_priority', NEW.priority
        )
      );
    END IF;
    
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
      VALUES (
        NEW.project_id,
        NULL,
        'task_updated',
        'task',
        NEW.id,
        jsonb_build_object(
          'old_title', OLD.title,
          'new_title', NEW.title
        )
      );
    END IF;
    ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
    VALUES (
      OLD.project_id,
      NULL,
      'task_deleted',
      'task',
      OLD.id,
      jsonb_build_object(
        'task_title', OLD.title,
        'column_id', OLD.column_id
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER task_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE PROCEDURE log_task_audit();

CREATE OR REPLACE FUNCTION log_column_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
    VALUES (
      NEW.project_id,
      NULL,
      'column_created',
      'column',
      NEW.id,
      jsonb_build_object(
        'column_name', NEW.name,
        'position', NEW.position
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
      VALUES (
        NEW.project_id,
        NULL,
        'column_renamed',
        'column',
        NEW.id,
        jsonb_build_object(
          'old_name', OLD.name,
          'new_name', NEW.name
        )
      );
    END IF;
    
    IF OLD.position IS DISTINCT FROM NEW.position THEN
      INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
      VALUES (
        NEW.project_id,
        NULL,
        'column_moved',
        'column',
        NEW.id,
        jsonb_build_object(
          'column_name', NEW.name,
          'old_position', OLD.position,
          'new_position', NEW.position
        )
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
    VALUES (
      OLD.project_id,
      NULL,
      'column_deleted',
      'column',
      OLD.id,
      jsonb_build_object(
        'column_name', OLD.name,
        'position', OLD.position
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER column_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON task_columns
  FOR EACH ROW
  EXECUTE PROCEDURE log_column_audit();

CREATE OR REPLACE FUNCTION log_comment_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id INTEGER;
  v_task_title VARCHAR(255);
BEGIN
  SELECT t.project_id, t.title INTO v_project_id, v_task_title
  FROM tasks t
  WHERE t.id = COALESCE(NEW.task_id, OLD.task_id);
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
    VALUES (
      v_project_id,
      NEW.user_id,
      'comment_added',
      'comment',
      NEW.id,
      jsonb_build_object(
        'task_id', NEW.task_id,
        'task_title', v_task_title,
        'is_reply', NEW.parent_id IS NOT NULL
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
    VALUES (
      v_project_id,
      NEW.user_id,
      'comment_updated',
      'comment',
      NEW.id,
      jsonb_build_object(
        'task_id', NEW.task_id,
        'task_title', v_task_title
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
    VALUES (
      v_project_id,
      OLD.user_id,
      'comment_deleted',
      'comment',
      OLD.id,
      jsonb_build_object(
        'task_id', OLD.task_id,
        'task_title', v_task_title
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER comment_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON task_comments
  FOR EACH ROW
  EXECUTE PROCEDURE log_comment_audit();

CREATE OR REPLACE FUNCTION log_member_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
    VALUES (
      NEW.project_id,
      NEW.user_id,
      'member_added',
      'member',
      NEW.id,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'role', NEW.role
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
      VALUES (
        NEW.project_id,
        NEW.user_id,
        'member_role_changed',
        'member',
        NEW.id,
        jsonb_build_object(
          'user_id', NEW.user_id,
          'old_role', OLD.role,
          'new_role', NEW.role
        )
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
    VALUES (
      OLD.project_id,
      OLD.user_id,
      'member_removed',
      'member',
      OLD.id,
      jsonb_build_object(
        'user_id', OLD.user_id,
        'role', OLD.role
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER member_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON project_members
  FOR EACH ROW
  EXECUTE PROCEDURE log_member_audit();

CREATE OR REPLACE FUNCTION log_invitation_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
    VALUES (
      NEW.project_id,
      NEW.invited_by,
      'invitation_sent',
      'invitation',
      NEW.id,
      jsonb_build_object(
        'invited_email', NEW.email,
        'role', NEW.role
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
      VALUES (
        NEW.project_id,
        NEW.invited_by,
        CASE NEW.status
          WHEN 'accepted' THEN 'invitation_accepted'
          WHEN 'rejected' THEN 'invitation_rejected'
          WHEN 'expired' THEN 'invitation_expired'
          ELSE 'invitation_status_changed'
        END,
        'invitation',
        NEW.id,
        jsonb_build_object(
          'invited_email', NEW.email,
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER invitation_audit_trigger
  AFTER INSERT OR UPDATE ON project_invitations
  FOR EACH ROW
  EXECUTE PROCEDURE log_invitation_audit();

CREATE OR REPLACE FUNCTION log_project_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
    VALUES (
      OLD.id,
      OLD.owner_id,
      'project_deleted',
      'project',
      OLD.id,
      jsonb_build_object(
        'project_name', OLD.name
      )
    );
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
    VALUES (
      NEW.id,
      NEW.owner_id,
      'project_created',
      'project',
      NEW.id,
      jsonb_build_object(
        'project_name', NEW.name
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
      VALUES (
        NEW.id,
        NEW.owner_id,
        'project_renamed',
        'project',
        NEW.id,
        jsonb_build_object(
          'old_name', OLD.name,
          'new_name', NEW.name
        )
      );
    END IF;
    
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
      VALUES (
        NEW.id,
        NEW.owner_id,
        'project_updated',
        'project',
        NEW.id,
        jsonb_build_object(
          'project_name', NEW.name,
          'field_changed', 'description'
        )
      );
    END IF;
    RETURN NEW;
  END IF;
END;
$$ language 'plpgsql';

CREATE TRIGGER project_audit_trigger
  BEFORE DELETE ON projects
  FOR EACH ROW
  EXECUTE PROCEDURE log_project_audit();

CREATE TRIGGER project_audit_trigger_after
  AFTER INSERT OR UPDATE ON projects
  FOR EACH ROW
  EXECUTE PROCEDURE log_project_audit();

CREATE OR REPLACE FUNCTION log_task_collaborator_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id INTEGER;
  v_task_title VARCHAR(255);
BEGIN
  SELECT t.project_id, t.title INTO v_project_id, v_task_title
  FROM tasks t
  WHERE t.id = COALESCE(NEW.task_id, OLD.task_id);
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
    VALUES (
      v_project_id,
      NEW.added_by,
      'collaborator_added',
      'task_collaborator',
      NEW.id,
      jsonb_build_object(
        'task_id', NEW.task_id,
        'task_title', v_task_title,
                'collaborator_id', NEW.user_id
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (project_id, user_id, action, entity_type, entity_id, details)
    VALUES (
      v_project_id,
      OLD.added_by,
      'collaborator_removed',
      'task_collaborator',
      OLD.id,
      jsonb_build_object(
        'task_id', OLD.task_id,
        'task_title', v_task_title,
        'collaborator_id', OLD.user_id
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER task_collaborator_audit_trigger
  AFTER INSERT OR DELETE ON task_collaborators
  FOR EACH ROW
  EXECUTE PROCEDURE log_task_collaborator_audit();

INSERT INTO users (email, password_hash, full_name, email_verified) VALUES
('demo@taskforge.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo User', TRUE);

INSERT INTO projects (name, description, color, owner_id) VALUES
('Sample Project', 'A sample project to get you started', '#3B82F6', 1);

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;