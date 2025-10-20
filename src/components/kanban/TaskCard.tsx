
import React from 'react';
import { Task } from '../../types';
import { Calendar, MessageSquare, User, Tag, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-600 dark:text-blue-200',
  high: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-600 dark:text-yellow-200',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-600 dark:text-red-200',
};

const PRIORITY_CARD_COLORS = {
  low: 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 border-l-4 border-l-gray-400',
  medium: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 border-l-4 border-l-blue-500',
  high: 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 border-l-4 border-l-yellow-500',
  urgent: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 border-l-4 border-l-red-500',
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
    transition: {
      duration: 200,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
    opacity: isDragging ? 0.5 : 1,
  };

  const commentsCount = task.comments_count ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${PRIORITY_CARD_COLORS[task.priority]} rounded-lg p-4 hover:shadow-md dark:hover:shadow-lg transition-all duration-200 cursor-pointer group ${
        isDragging ? 'ring-2 ring-blue-400 shadow-lg scale-105' : ''
      }`}
      onClick={onClick}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 line-clamp-2">
            {task.title}
          </h3>
          <span className={`px-2 py-1 text-xs rounded-full font-medium flex items-center gap-1 ${PRIORITY_COLORS[task.priority]}`}>
            <AlertCircle className="h-3 w-3" />
            {task.priority}
          </span>
        </div>

        {task.description && (
          <div
            className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: task.description }}
          />
        )}

        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-md flex items-center gap-1"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">+{task.tags.length - 3} more</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            {task.due_date && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                <span>{format(new Date(task.due_date), 'MMM dd')}</span>
              </div>
            )}
            {task.assignee_id && (
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                <span className="text-green-600 dark:text-green-400">
                  {task.assignee_name || 'Assigned'}
                </span>
              </div>
            )}
          </div>
          {commentsCount > 0 ? (
            <div className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-md">
              <MessageSquare className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-600 dark:text-blue-400 font-medium">{commentsCount}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <MessageSquare className="h-3 w-3 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-400 dark:text-gray-500">0</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};