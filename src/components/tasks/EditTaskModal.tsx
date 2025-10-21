import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { RichTextEditor } from '../ui/RichTextEditor';
import { Task, TaskCollaborator, ProjectMember } from '../../types';
import { apiClient } from '../../lib/api';
import { X, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task: Task | null;
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
] as const;

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  task,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<TaskCollaborator[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
      setTags(task.tags.join(', '));
      loadCollaborators();
      loadProjectMembers();
    }
  }, [task]);

  const loadCollaborators = async () => {
    if (!task) return;
    try {
      const data = await apiClient.getCollaborators(task.id);
      setCollaborators(data);
    } catch (error) {
      console.error('Error loading collaborators:', error);
    }
  };

  const loadProjectMembers = async () => {
    if (!task) return;
    try {
      const data = await apiClient.getMembers(task.project_id);
      setProjectMembers(data);
    } catch (error) {
      console.error('Error loading project members:', error);
    }
  };

  const handleAddCollaborator = async () => {
    if (!task || !selectedMemberId) return;
    try {
      await apiClient.addCollaborator(task.id, selectedMemberId);
      await loadCollaborators();
      setShowAddCollaborator(false);
      setSelectedMemberId(null);
    } catch (error: any) {
      alert(error.message || 'Error adding collaborator');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: number) => {
    try {
      await apiClient.removeCollaborator(collaboratorId);
      await loadCollaborators();
    } catch (error: any) {
      alert(error.message || 'Error removing collaborator');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    setLoading(true);
    try {
      await apiClient.updateTask(task.id, {
        title,
        description: description || undefined,
        priority,
        due_date: dueDate || undefined,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form when closing
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
      setTags(task.tags.join(', '));
    }
  };

  if (!task) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Task" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Task Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title"
          required
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description (optional)
          </label>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Enter task description"
            minHeight="150px"
            checkboxStates={task.checkbox_states}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Due Date (optional)"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <Input
          label="Tags (optional)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Enter tags separated by commas"
        />

        {task?.assignee_id === user?.id && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Collaborators
              </label>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAddCollaborator(!showAddCollaborator)}
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            {showAddCollaborator && (
              <div className="flex space-x-2">
                <select
                  value={selectedMemberId || ''}
                  onChange={(e) => setSelectedMemberId(Number(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a member</option>
                  {projectMembers
                    .filter(m => m.user_id !== task?.assignee_id && !collaborators.some(c => c.user_id === m.user_id))
                    .map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.username || member.full_name || member.email}
                      </option>
                    ))}
                </select>
                <Button
                  type="button"
                  onClick={handleAddCollaborator}
                  disabled={!selectedMemberId}
                >
                  Add
                </Button>
              </div>
            )}

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    {collaborator.avatar_url ? (
                      <img
                        src={collaborator.avatar_url}
                        alt={collaborator.full_name}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                        {(collaborator.username || collaborator.full_name || collaborator.email)?.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {collaborator.username || collaborator.full_name || collaborator.email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCollaborator(collaborator.id)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {collaborators.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                  No collaborators yet
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !title.trim()}>
            {loading ? 'Updating...' : 'Update Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};