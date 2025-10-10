
import { apiClient } from '../../lib/api';
import React, { useEffect, useState } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { Button } from '../ui/Button';
import { Loader2, Plus } from 'lucide-react';
import { Project, TaskColumn, Task } from '../../types';
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
} from '@dnd-kit/core';
import { TaskCard } from './TaskCard';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';

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
  const { user } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
        } catch (error) {
          console.error('Error reordering columns:', error);
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
        } catch (error) {
          console.error('Error updating task:', error);
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

        <DragOverlay>
          {activeTask && (
            <div className="rotate-2" style={{ width: '280px' }}>
              <TaskCard task={activeTask} onClick={() => {}} />
            </div>
          )}
          {activeColumn && (
            <div className="rotate-2 opacity-90" style={{ width: '280px' }}>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-xl">
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