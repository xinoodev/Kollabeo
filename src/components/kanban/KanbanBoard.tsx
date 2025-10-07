import React, { useEffect, useState } from 'react';
import { Project, TaskColumn, Task } from '../../types';
import { KanbanColumn } from './KanbanColumn';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { TaskCard } from './TaskCard';

interface KanbanBoardProps {
  project: Project;
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string) => void;
  refreshTrigger: number;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  project,
  onTaskClick,
  onAddTask,
  refreshTrigger,
}) => {
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
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
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeTask = tasks.find(t => t.id === activeId);
    const overTask = tasks.find(t => t.id === overId);

    if (!activeTask) return;

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

    // Moving over a column
    if (columns.find(c => c.id === overId) && activeTask.column_id !== overId) {
      setTasks(prev => 
        prev.map(task => 
          task.id === activeId 
            ? { ...task, column_id: overId as number }
            : task
        )
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);
    
    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id as number;

    if (activeId === overId) return;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const targetColumnId = columns.find(c => c.id === overId)?.id || 
                          tasks.find(t => t.id === overId)?.column_id;

    if (targetColumnId && activeTask.column_id !== targetColumnId) {
      try {
        await apiClient.updateTask(activeId, { 
          column_id: targetColumnId
        });
      } catch (error) {
        console.error('Error updating task:', error);
        // Revert the optimistic update
        fetchData();
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
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-6">
        {columns.map((column) => (
          <div key={column.id} className="min-w-0">
            <KanbanColumn
              column={column}
              tasks={tasks.filter(task => task.column_id === column.id)}
              onTaskClick={onTaskClick}
              onAddTask={(columnId: number) => onAddTask(String(columnId))}
            />
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="rotate-2">
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};