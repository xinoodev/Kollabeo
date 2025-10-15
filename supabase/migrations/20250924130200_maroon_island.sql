/*
  # Kollabeo Initial Database Schema with Authentication

  1. New Tables
    - `users` - User accounts with authentication fields
      - `id` (serial, primary key)
      - `email` (varchar, unique, not null)
      - `password_hash` (varchar, not null)
      - `full_name` (varchar, not null)
      - `username` (varchar, unique, nullable)
      - `avatar_url` (varchar, nullable)
      - `email_verified` (boolean, default false)
      - `email_verification_token` (varchar, nullable)
      - `email_verification_expires` (timestamp, nullable)
      - `password_reset_token` (varchar, nullable)
      - `password_reset_expires` (timestamp, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `projects` - Project management
    - `task_columns` - Kanban columns
    - `tasks` - Task items
    - `task_comments` - Comments on tasks
    - `project_members` - Project membership

  2. Security
    - Indexes for performance on email, tokens, and foreign keys
    - Triggers for automatic timestamp updates
    - Automatic default column creation for new projects

  3. Notes
    - Email verification required before login
    - Password reset tokens expire after 1 hour
    - Email verification tokens expire after 24 hours
*/

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS task_columns CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with authentication fields
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

-- Create projects table
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create task_columns table
CREATE TABLE task_columns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tasks table
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  column_id INTEGER REFERENCES task_columns(id) ON DELETE CASCADE NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP,
  position INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create task_comments table
CREATE TABLE task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create project_members table
CREATE TABLE project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_task_columns_project_id ON task_columns(project_id);
CREATE INDEX idx_tasks_column_id ON tasks(column_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
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

-- Function to create default columns for new projects
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

-- Create trigger to automatically create default columns
CREATE TRIGGER create_default_columns_trigger
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE PROCEDURE create_default_columns();

-- Insert sample data for development
INSERT INTO users (email, password_hash, full_name, email_verified) VALUES
('demo@taskforge.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo User', TRUE);

INSERT INTO projects (name, description, color, owner_id) VALUES
('Sample Project', 'A sample project to get you started', '#3B82F6', 1);

-- Add parent_id column to task_comments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_comments' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE task_comments ADD COLUMN parent_id INTEGER REFERENCES task_comments(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index on parent_id for better query performance
CREATE INDEX IF NOT EXISTS idx_task_comments_parent_id ON task_comments(parent_id);

-- Create task_collaborators table
CREATE TABLE IF NOT EXISTS task_collaborators (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  added_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_collaborators_task_id ON task_collaborators(task_id);
CREATE INDEX IF NOT EXISTS idx_task_collaborators_user_id ON task_collaborators(user_id);