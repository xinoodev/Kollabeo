import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Task } from '../../types';
import { Calendar, Tag, AlertCircle, Pencil, Trash2, User, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { EditTaskModal } from './EditTaskModal';
import { TaskComments } from './TaskComments';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdate: () => void;
  canManageProject: boolean;
}

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-yellow-100 text-yellow-700',
  urgent: 'bg-red-100 text-red-700',
};

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  isOpen,
  onClose,
  task,
  onUpdate,
  canManageProject,
}) => {
  const [loading, setLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { user } = useAuth();
  const descriptionRef = useRef<HTMLDivElement>(null);
  const isUpdatingCheckboxes = useRef(false);

  const updateCheckboxStates = useCallback(async (event: Event) => {
    if (!descriptionRef.current || !task || isUpdatingCheckboxes.current) return;

    isUpdatingCheckboxes.current = true;

    const target = event.target as HTMLInputElement;
    const checkboxId = target.getAttribute('data-checkbox-id');
    
    if (!checkboxId) {
      isUpdatingCheckboxes.current = false;
      return;
    }

    const checkboxes = descriptionRef.current.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-checkbox-id]');
    const states: Record<string, boolean> = { ...(task.checkbox_states || {}) };

    checkboxes.forEach(checkbox => {
      const id = checkbox.getAttribute('data-checkbox-id');
      if (id) {
        states[id] = checkbox.checked;
      }
    });

    try {
      await apiClient.updateTask(task.id, {
        checkbox_states: states
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating checkbox states:', error);
      target.checked = !target.checked;
    } finally {
      isUpdatingCheckboxes.current = false;
    }
  }, [task, onUpdate]);

  useEffect(() => {
    if (!descriptionRef.current || !task?.description || !isOpen) return;

    const timeoutId = setTimeout(() => {
      if (!descriptionRef.current) return;

      const checkboxes = descriptionRef.current.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-checkbox-id]');

      checkboxes.forEach(checkbox => {
        const id = checkbox.getAttribute('data-checkbox-id');
        if (id && task.checkbox_states && task.checkbox_states[id] !== undefined) {
          checkbox.checked = task.checkbox_states[id];
        }

        checkbox.removeEventListener('change', updateCheckboxStates);
        checkbox.addEventListener('change', updateCheckboxStates);
      });
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      if (!descriptionRef.current) return;
      
      const checkboxes = descriptionRef.current.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-checkbox-id]');
      checkboxes.forEach(checkbox => {
        checkbox.removeEventListener('change', updateCheckboxStates);
      });
    };
  }, [task?.description, task?.checkbox_states, task?.id, isOpen, updateCheckboxStates]);

  if (!task) return null;

  const handleEdit = async () => {
    setIsEditModalOpen(true);
  };

  const handleAssignTask = async () => {
    if (!user || task.assignee_id) return;

    setAssignLoading(true);
    try {
      await apiClient.updateTask(task.id, {
        assignee_id: user.id
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error assigning task:', error);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassignTask = async () => {
    if (!user || task.assignee_id !== user.id) return;

    setAssignLoading(true);
    try {
      await apiClient.updateTask(task.id, {
        assignee_id: null
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error unassigning task:', error);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setLoading(true);
    try {
      await apiClient.deleteTask(task.id);

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = () => {
    onUpdate();
    setIsEditModalOpen(false);
    onClose();
  };

  const handleCommentAdded = () => {
    onUpdate();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={task.title} size="lg">
        <div className="space-y-6">
          <div>
            <span className={`px-3 py-1 text-sm rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
              <AlertCircle className="inline w-4 h-4 mr-1" />
              {task.priority} priority
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEdit}
              disabled={loading}
            >
              <Pencil className="w-4 h-4 mr-1" />
              Edit
            </Button>
            
            {!task.assignee_id ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAssignTask}
                disabled={assignLoading}
              >
                <User className="w-4 h-4 mr-1" />
                {assignLoading ? 'Assigning...' : 'Assign to me'}
              </Button>
            ) : task.assignee_id === user?.id ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleUnassignTask}
                disabled={assignLoading}
              >
                <UserCheck className="w-4 h-4 mr-1" />
                {assignLoading ? 'Unassigning...' : 'Unassign'}
              </Button>
            ) : (
              <div className="flex items-center px-3 py-1.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
                <UserCheck className="w-4 h-4 mr-1" />
                Assigned to {task.assignee_name || 'Someone'}
              </div>
            )}
            
            {canManageProject && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            )}
          </div>

          {task.description && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Description</h4>
              <div
                ref={descriptionRef}
                className="text-gray-700 dark:text-gray-300 prose dark:prose-invert max-w-none task-card-content"
                dangerouslySetInnerHTML={{ __html: task.description }}
              />
            </div>
          )}

          <style>{`
            .task-card-content ul,
            .task-card-content ol {
              padding-left: 1.75rem !important;
              margin: 0.5rem 0 !important;
              list-style-position: outside !important;
            }
            .task-card-content ul {
              list-style-type: disc !important;
            }
            .task-card-content ol {
              list-style-type: decimal !important;
            }
            .task-card-content li {
              margin: 0.25rem 0 !important;
              display: list-item !important;
              margin-left: 0 !important;
            }
            .task-card-content ul li {
              list-style-type: disc !important;
            }
            .task-card-content ol li {
              list-style-type: decimal !important;
            }
          `}</style>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {task.due_date && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-1 text-gray-600 dark:text-gray-400" />
                  Due Date
                </h4>
                <p className="text-gray-700 dark:text-gray-300">
                  {format(new Date(task.due_date), 'PPP')}
                </p>
              </div>
            )}

            {task.tags.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                  <Tag className="w-4 h-4 mr-1 text-gray-600 dark:text-gray-400" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {task.assignee_id && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                  <User className="w-4 h-4 mr-1 text-gray-600 dark:text-gray-400" />
                  Assigned to
                </h4>
                <div className="flex items-center space-x-2">
                  {user?.avatar_url ? (
                    <>
                      <img
                        src={user.avatar_url}
                        alt={user?.username || user?.full_name}
                        className="h-8 w-8 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                      />
                      <span className="text-gray-700 dark:text-gray-300">
                        {task.assignee_name || 'Unknown User'}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">
                        {task.assignee_name || 'Unknown User'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <TaskComments taskId={task.id} onCommentAdded={handleCommentAdded} />
          </div>

          <div className="border-t pt-4">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Created {format(new Date(task.created_at), 'PPp')}
              {task.updated_at !== task.created_at && (
                <span> • Updated {format(new Date(task.updated_at), 'PPp')}</span>
              )}
            </p>
          </div>
        </div>
      </Modal>

      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        task={task}
      />
    </>
  );
};