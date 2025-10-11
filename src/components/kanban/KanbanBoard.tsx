import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Loader2, Plus } from 'lucide-react';
import { KanbanColumn } from './KanbanColumn';
import { useAuth } from '../../contexts/AuthContext';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  MeasuringStrategy,
} from '@dnd-kit/core';
import React, { useEffect, useState } from 'react';
import { Project, TaskColumn, Task, ProjectMember } from '../../types';
import { Button } from '../ui/Button';
import { TaskCard } from './TaskCard';
import { apiClient } from '../../lib/api';

interface KanbanBoardProps {
  project: Project;
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: number) => void;
  onAddColumn: () => void;
  onEditColumn: (column: TaskColumn) => void;
  onDeleteColumn: (column: TaskColumn) => void;
  refreshTrigger: number;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  project,
  onTaskClick,
  onAddTask,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  refreshTrigger,
}) => {
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<TaskColumn | null>(null);
  const [error, setError] = useState<string>('');
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member'>('member');
  const { user } = useAuth();

  const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const measuring = {
    droppable: {
      strategy: MeasuringStrategy.Always,
    },
  };

  const fetchData = async () => {
    try {
      const columnsData = await apiClient.getColumns(project.id);
      const tasksData = await apiClient.getTasks(project.id);
      const membersData = await apiClient.getMembers(project.id);
      
      const isOwner = project.owner_id === user?.id;
      if (isOwner) {
        setUserRole('owner');
      } else {
        const currentMember = membersData.find((m: ProjectMember) => m.user_id === user?.id);
        setUserRole(currentMember?.role || 'member');
      }

      setColumns(columnsData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching kanban data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [project.id, user, refreshTrigger]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    
    // Check if dragging a column
    const column = columns.find(c => `column-${c.id}` === active.id);
    if (column) {
      if (!isAdminOrOwner) {
        setError('Only admins and owners can reorder columns');
        return;
      }
      setActiveColumn(column);
      return;
    }

    // Check if dragging a task
    const task = tasks.find(t => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    // Only handle task dragging in dragOver
    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const overTask = tasks.find(t => t.id === overId);

    // Moving over another task
    if (overTask && activeTask.column_id !== overTask.column_id) {
      setTasks(prev => 
        prev.map(task => 
          task.id === activeId 
            ? { ...task, column_id: overTask.column_id }
            : task
        )
      );
    }

    // Moving over a column droppable area
    const overColumnMatch = String(overId).match(/^column-(\d+)$/);
    if (overColumnMatch) {
      const overColumnId = Number(overColumnMatch[1]);
      if (activeTask.column_id !== overColumnId) {
        setTasks(prev => 
          prev.map(task => 
            task.id === activeId 
              ? { ...task, column_id: overColumnId }
              : task
          )
        );
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);
    setActiveColumn(null);
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    // Handle column reordering
    const activeColumnMatch = String(activeId).match(/^column-(\d+)$/);
    const overColumnMatch = String(overId).match(/^column-(\d+)$/);

    if (activeColumnMatch && overColumnMatch) {
      if (!isAdminOrOwner) {
        setError('Only admins and owners can reorder columns');
        fetchData();
        return;
      }

      const activeColumnId = Number(activeColumnMatch[1]);
      const overColumnId = Number(overColumnMatch[1]);

      const oldIndex = columns.findIndex(c => c.id === activeColumnId);
      const newIndex = columns.findIndex(c => c.id === overColumnId);

      if (oldIndex !== newIndex) {
        const newColumns = arrayMove(columns, oldIndex, newIndex);
        setColumns(newColumns);

        try {
          const reorderedColumns = newColumns.map((col, index) => ({
            id: col.id,
            position: index + 1
          }));

          await apiClient.reorderColumns(project.id, reorderedColumns);
        } catch (error: any) {
          console.error('Error reordering columns:', error);
          setError(error.message || 'Failed to reorder columns');
          // Revert the optimistic update
          fetchData();
        }
      }
      return;
    }

    // Handle task reordering
    const activeTask = tasks.find(t => t.id === activeId);
    if (activeTask) {
      const overTask = tasks.find(t => t.id === overId);
      const overColumnMatch = String(overId).match(/^column-(\d+)$/);
      
      let targetColumnId: number | undefined;

      if (overTask) {
        targetColumnId = overTask.column_id;
      } else if (overColumnMatch) {
        targetColumnId = Number(overColumnMatch[1]);
      }

      if (targetColumnId && activeTask.column_id !== targetColumnId) {
        try {
          await apiClient.updateTask(Number(activeId), { 
            column_id: targetColumnId
          });
        } catch (error: any) {
          console.error('Error updating task:', error);
          setError(error.message || 'Failed to move task');
          // Revert the optimistic update
          fetchData();
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button onClick={onAddColumn} size="sm" variant="secondary">
          <Plus className="mr-2 h-4 w-4" />
          Add Column
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        measuring={measuring}
      >
        <div className="overflow-x-auto -mx-1 scrollbar-custom">
          <SortableContext 
            items={columns.map(col => `column-${col.id}`)} 
            strategy={horizontalListSortingStrategy}
            disabled={!isAdminOrOwner}
          >
            <div className="flex gap-6 px-1">
              {columns.map((column) => (
                <div 
                  key={column.id} 
                  style={{ width: 'calc((100% - 4.5rem) / 4)', minWidth: '280px' }}
                >
                  <KanbanColumn
                    column={column}
                    tasks={tasks.filter(task => task.column_id === column.id)}
                    onTaskClick={onTaskClick}
                    onAddTask={onAddTask}
                    onEditColumn={onEditColumn}
                    onDeleteColumn={onDeleteColumn}
                    isAdminOrOwner={isAdminOrOwner}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        </div>

        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
          {activeTask && (
            <div style={{ width: '280px' }}>
              <TaskCard task={activeTask} onClick={() => {}} />
            </div>
          )}
          {activeColumn && isAdminOrOwner && (
            <div style={{ width: '280px' }}>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-blue-400">
                <KanbanColumn
                  column={activeColumn}
                  tasks={tasks.filter(task => task.column_id === activeColumn.id)}
                  onTaskClick={() => {}}
                  onAddTask={() => {}}
                  onEditColumn={() => {}}
                  onDeleteColumn={() => {}}
                  isAdminOrOwner={isAdminOrOwner}
                />
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};