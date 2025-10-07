import React from 'react';
import { Project } from '../../types';
import { Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        <div
          className="w-4 h-4 rounded-full flex-shrink-0 ml-3"
          style={{ backgroundColor: project.color }}
        ></div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span>{format(new Date(project.created_at), 'MMM dd')}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span>1 member</span>
          </div>
        </div>
      </div>
    </div>
  );
};