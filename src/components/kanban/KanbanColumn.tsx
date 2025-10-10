import React, { useEffect, useState, useRef } from 'react';
import { TaskColumn, Task } from '../../types';
import { TaskCard } from './TaskCard';
import { Plus, MoreVertical, CreditCard as Edit2, Trash2 } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface KanbanColumnProps {
  column: TaskColumn;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: number) => void;
  onEditColumn: (columnId: TaskColumn) => void;
  onDeleteColumn: (columnId: TaskColumn) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  onTaskClick,
  onAddTask,
  onEditColumn,
  onDeleteColumn,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  return (
    <div className="rounded-lg p-4 flex flex-col transition-colors duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          ></div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{column.name}</h3>
          <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onAddTask(column.id)}
            className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 p-1 rounded"
            title="Add task"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200 p-1 rounded"
              title="Column options"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onEditColumn(column);
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit column
                  </button>
                  <button
                    onClick={() => {
                      onDeleteColumn(column);
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete column
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`space-y-3 ${isOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''} rounded-lg transition-colors duration-200 min-h-[600px]`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};