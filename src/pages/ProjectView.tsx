import React, { useState } from 'react';
import { Project, Task } from '../types';
import { Header } from '../components/layout/Header';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { TaskDetailsModal } from '../components/tasks/TaskDetailsModal';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { ArrowLeft } from 'lucide-react';

interface ProjectViewProps {
  project: Project;
  onBack: () => void;
}

export const ProjectView: React.FC<ProjectViewProps> = ({ project, onBack }) => {
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isTaskDetailsModalOpen, setIsTaskDetailsModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<number>(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header onCreateProject={() => setIsCreateProjectModalOpen(true)} />
      
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </button>
          
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
        </div>

        <KanbanBoard
          project={project}
          onTaskClick={handleTaskClick}
          onAddTask={(columnId: string) => handleAddTask(Number(columnId))}
          refreshTrigger={refreshTrigger}
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
      />

      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
};