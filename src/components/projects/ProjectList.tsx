import React, { useEffect, useState } from 'react';
import { Project } from '../../types';
import { ProjectCard } from './ProjectCard';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, FolderOpen } from 'lucide-react';

interface ProjectListProps {
  onProjectSelect: (project: Project) => void;
  refreshTrigger: number;
}

export const ProjectList: React.FC<ProjectListProps> = ({ onProjectSelect, refreshTrigger }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchProjects = async () => {

    try {
      const data = await apiClient.getProjects();
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No projects yet</h3>
        <p className="text-gray-500 dark:text-gray-400">Create your first project to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => onProjectSelect(project)}
        />
      ))}
    </div>
  );
};