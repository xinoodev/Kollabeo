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
import { Project, TaskColumn, Task } from '../../types';
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
  canManageProject: boolean;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  project,
  onTaskClick,
  onAddTask,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  refreshTrigger,
  canManageProject,
}) => {
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<TaskColumn | null>(null);
  const [originalColumnId, setOriginalColumnId] = useState<number | null>(null);
  const { user } = useAuth();

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
      // Fetch columns
      const columnsData = await apiClient.getColumns(project.id);

      // Fetch tasks
      const tasksData = await apiClient.getTasks(project.id);

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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    
    // Check if dragging a column
    const column = columns.find(c => `column-${c.id}` === active.id);
    if (column) {
      setActiveColumn(column);
      return;
    }

    // Check if dragging a task
    const task = tasks.find(t => t.id === active.id);
    if (task) {
      setActiveTask(task);
      setOriginalColumnId(task.column_id);
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
    
    const draggedTask = activeTask;
    
    setActiveTask(null);
    setActiveColumn(null);
    
    if (!over) {
      if (draggedTask && originalColumnId) {
        setTasks(prev => 
          prev.map(task => 
            task.id === draggedTask.id 
              ? { ...task, column_id: originalColumnId }
              : task
          )
        );
      }
      setOriginalColumnId(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    // Handle column reordering
    const activeColumnMatch = String(activeId).match(/^column-(\d+)$/);
    const overColumnMatch = String(overId).match(/^column-(\d+)$/);

    if (activeColumnMatch && overColumnMatch) {
      const activeColumnId = Number(activeColumnMatch[1]);
      const overColumnId = Number(overColumnMatch[1]);

      if (activeColumnId === overColumnId) return;

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
        } catch (error) {
          console.error('Error reordering columns:', error);
          // Revert the optimistic update
          fetchData();
        }
      }
      setOriginalColumnId(null);
      return;
    }

    // Handle task movement
    if (draggedTask && originalColumnId !== null) {
      const overTask = tasks.find(t => t.id === overId);
      const overColumnMatch = String(overId).match(/^column-(\d+)$/);
      
      let targetColumnId: number | undefined;

      if (overTask) {
        targetColumnId = overTask.column_id;
      } else if (overColumnMatch) {
        targetColumnId = Number(overColumnMatch[1]);
      }

      if (targetColumnId !== undefined && originalColumnId !== targetColumnId) {
        try {
          await apiClient.updateTask(draggedTask.id, { 
            column_id: targetColumnId
          });
        } catch (error) {
          console.error('Error updating task:', error);
          // Revert the optimistic update
          setTasks(prev => 
            prev.map(task => 
              task.id === draggedTask.id 
                ? { ...task, column_id: originalColumnId }
                : task
            )
          );
        }
      } else if (targetColumnId === undefined) {
        setTasks(prev => 
          prev.map(task => 
            task.id === draggedTask.id 
              ? { ...task, column_id: originalColumnId }
              : task
          )
        );
      }
      
      setOriginalColumnId(null);
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
      {canManageProject && (
        <div className="flex items-center justify-between">
          <Button onClick={onAddColumn} size="sm" variant="secondary">
            <Plus className="mr-2 h-4 w-4" />
            Add Column
          </Button>
        </div>
      )}

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
          {activeColumn && (
            <div style={{ width: '280px' }}>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-blue-400">
                <KanbanColumn
                  column={activeColumn}
                  tasks={tasks.filter(task => task.column_id === activeColumn.id)}
                  onTaskClick={() => {}}
                  onAddTask={() => {}}
                  onEditColumn={() => {}}
                  onDeleteColumn={() => {}}
                />
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};