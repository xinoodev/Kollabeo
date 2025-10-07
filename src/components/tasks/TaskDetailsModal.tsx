import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Task } from '../../types';
import { Calendar, Tag, AlertCircle, Pencil, Trash2, User, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { EditTaskModal } from './EditTaskModal';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdate: () => void;
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
}) => {
  const [loading, setLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { user } = useAuth();

  if (!task) return null;

  const handleEdit = async () => {
    setIsEditModalOpen(true);
  };

  const handleAssignTask = async () => {
    if (!user || task.assignee_id) return;

    setAssignLoading(true);
    try {
      await apiClient.updateTask(task.id, {
        assignee_id: user.id,
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
        assignee_id: null,
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
                {assignLoading? 'Assigning...' : 'Assign to me'}
              </Button>
            ) : task.assignee_id === user?.id ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleUnassignTask}
                disabled={assignLoading}
              >
                <UserCheck className="w-4 h-4 mr-1" />
                {assignLoading? 'Unassigning...' : 'Unassign'}
              </Button>
            ) : (
              <div className='flex items-center px-3 py-1.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm'>
                <UserCheck className='w-4 h-4 mr-1' />
                Assigned to {task.assignee_name || 'Someone'}
              </div>
            )}

            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>

          {task.description && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Description</h4>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

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
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
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