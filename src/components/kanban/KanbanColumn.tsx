
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { TaskCard } from './TaskCard';
import React, { useEffect, useState, useRef } from 'react';
import { Plus, MoreVertical, CreditCard as Edit2, Trash2, GripVertical } from 'lucide-react';
import { Task, TaskColumn } from '../../types';

interface KanbanColumnProps {
  column: TaskColumn;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: number) => void;
  onEditColumn: (column: TaskColumn) => void;
  onDeleteColumn: (column: TaskColumn) => void;
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

  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${column.id}`,
    data: {
      type: 'column',
      column,
    },
    transition: {
      duration: 200,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: {
      type: 'column',
      column,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
    opacity: isDragging ? 0.4 : 1,
  };

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
    <div
      ref={setSortableNodeRef}
      style={style}
      className="flex-shrink-0"
      {...attributes}
    >
      <div className={`rounded-lg px-4 pb-4 flex flex-col transition-all duration-200 ${
        isDragging ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 flex-1">
            <button
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Drag to reorder column"
            >
              <GripVertical className="h-5 w-5" />
            </button>
            <div
              className="w-3 h-3 rounded-full flex-shrink-0 transition-transform duration-200"
              style={{ backgroundColor: column.color }}
            ></div>
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{column.name}</h3>
            <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full flex-shrink-0 transition-colors duration-200">
              {tasks.length}
            </span>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0">
            <button
              onClick={() => onAddTask(column.id)}
              className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
              title="Add task"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Column options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onEditColumn(column);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit column
                    </button>
                    <button
                      onClick={() => {
                        onDeleteColumn(column);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
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
          ref={setDroppableNodeRef}
          className={`space-y-3 rounded-lg transition-all duration-200 min-h-[630px] ${
            isOver ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300 dark:ring-blue-600' : ''
          }`}
        >
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))}
          </SortableContext>
        </div>
      </div>
    </div>
  );
};