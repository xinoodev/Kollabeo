import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { ProjectList } from '../components/projects/ProjectList';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import { Project } from '../types';

interface DashboardProps {
  onProjectSelect: (project: Project) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onProjectSelect }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleProjectCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header onCreateProject={() => setIsCreateModalOpen(true)} />
      
      <main className="mx-auto px-4 sm:px-6 lg:px-[5.2rem] py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your Projects</h2>
          <p className="text-gray-600 dark:text-gray-300">Manage your tasks and collaborate with your team.</p>
        </div>

        <ProjectList 
          onProjectSelect={onProjectSelect} 
          refreshTrigger={refreshTrigger}
        />
      </main>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
};