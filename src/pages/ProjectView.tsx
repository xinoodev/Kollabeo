import React, { useState, useEffect } from 'react';
import { Project, Task, TaskColumn } from '../types';
import { Header } from '../components/layout/Header';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { TaskDetailsModal } from '../components/tasks/TaskDetailsModal';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { CreateColumnModal } from '../components/columns/CreateColumnModal';
import { EditColumnModal } from '../components/columns/EditColumnModal';
import { MembersModal } from '../components/members/MembersModal';
import { ArrowLeft, Users } from 'lucide-react';
import { apiClient } from '../lib/api';

interface ProjectViewProps {
  project: Project;
  onBack: () => void;
}

export const ProjectView: React.FC<ProjectViewProps> = ({ project, onBack }) => {
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCreateColumnModalOpen, setIsCreateColumnModalOpen] = useState(false);
  const [isEditColumnModalOpen, setIsEditColumnModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<number>(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<TaskColumn | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userRole, setUserRole] = useState<{ role: string; isOwner: boolean } | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    loadUserRole();
  }, [project.id]);

  const loadUserRole = async () => {
    try {
      setLoadingRole(true);
      const roleData = await apiClient.getProjectMemberRole(project.id);
      setUserRole(roleData);
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole({ role: 'member', isOwner: false });
    } finally {
      setLoadingRole(false);
    }
  };

  const canManageProject = (): boolean => {
    if (!userRole) return false;
    return userRole.isOwner || userRole.role === 'admin';
  };

  const handleAddTask = (columnId: number) => {
    setSelectedColumnId(columnId);
    setIsCreateTaskModalOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDetailsModalOpen(true);
  };

  const handleTaskUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleProjectCreated = () => {
    // Handle project creation if needed
  };

  const handleAddColumn = () => {
    setIsCreateColumnModalOpen(true);
  };

  const handleEditColumn = (column: TaskColumn) => {
    setSelectedColumn(column);
    setIsEditColumnModalOpen(true);
  };

  const handleDeleteColumn = async (column: TaskColumn) => {
    if (!confirm(`Are you sure you want to delete the "${column.name}" column? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.deleteColumn(column.id);
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      alert(error.message || 'Failed to delete column');
    }
  };

  const handleColumnUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <Header onCreateProject={() => setIsCreateProjectModalOpen(true)} />
        
        <main className="w-full px-4 sm:px-6 lg:px-8 pt-8">
          <div className="mb-6">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 mb-7"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </button>
            
            <div className="flex items-center justify-between mb-7">
              <div className="flex items-center space-x-3">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: project.color }}
                ></div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
                  {project.description && (
                    <p className="text-gray-600 dark:text-gray-300 mt-1">{project.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsMembersModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
              >
                <Users className="h-4 w-4" />
                <span>Members</span>
              </button>
            </div>
          </div>

          <KanbanBoard
            project={project}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
            onAddColumn={handleAddColumn}
            onEditColumn={handleEditColumn}
            onDeleteColumn={handleDeleteColumn}
            refreshTrigger={refreshTrigger}
            canManageProject={canManageProject()}
          />
        </main>

        <CreateTaskModal
          isOpen={isCreateTaskModalOpen}
          onClose={() => setIsCreateTaskModalOpen(false)}
          onSuccess={handleTaskUpdate}
          projectId={project.id}
          columnId={selectedColumnId}
        />

        <TaskDetailsModal
          isOpen={isTaskDetailsModalOpen}
          onClose={() => setIsTaskDetailsModalOpen(false)}
          task={selectedTask}
          onUpdate={handleTaskUpdate}
          canManageProject={canManageProject()}
        />

        <CreateProjectModal
          isOpen={isCreateProjectModalOpen}
          onClose={() => setIsCreateProjectModalOpen(false)}
          onSuccess={handleProjectCreated}
        />
      </div>

      <CreateColumnModal
        isOpen={isCreateColumnModalOpen}
        onClose={() => setIsCreateColumnModalOpen(false)}
        onSuccess={handleColumnUpdate}
        projectId={project.id}
      />

      <EditColumnModal
        isOpen={isEditColumnModalOpen}
        onClose={() => setIsEditColumnModalOpen(false)}
        onSuccess={handleColumnUpdate}
        column={selectedColumn}
      />

      <MembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        project={project}
      />
    </>
  );
};