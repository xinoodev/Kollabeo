import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Project } from '../../types'
import { apiClient } from '../../lib/api'
import { Trash2, AlertTriangle } from 'lucide-react'

interface ProjectSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    onUpdate: (updatedProjects: Project) => void;
    onDelete: () => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
    isOpen,
    onClose,
    project,
    onUpdate,
    onDelete,
}) => {
    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description || '');
    const [color, setColor] = useState(project.color);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const colorOptions = [
        { value: '#EF4444', label: 'Red' },
        { value: '#F59E0B', label: 'Orange' },
        { value: '#10B981', label: 'Green' },
        { value: '#3B82F6', label: 'Blue' },
        { value: '#8B5CF6', label: 'Purple' },
        { value: '#EC4899', label: 'Pink' },
        { value: '#6B7280', label: 'Gray' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const updatedProject = await apiClient.updateProject(project.id, {
                name,
                description,
                color,
            });
            onUpdate(updatedProject);
            onClose();
        } catch (error: any) {
            setError(error.message || 'Error updating project');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (deleteConfirmText !== project.name) {
            setError('Project name does not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await apiClient.deleteProject(project.id);
            onDelete();
            onClose();
        } catch (error: any) {
            setError(error.message || 'Error deleting project');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName(project.name);
        setDescription(project.description || '');
        setColor(project.color);
        setShowDeleteConfirm(false);
        setDeleteConfirmText('');
        setError('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Project Settings" size='lg'>
            <div className="space-y-6">
                {error && (
                    <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Project Name
                        </label>
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter project name"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter project description"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Project Color
                        </label>
                        <div className="grid grid-cols-7 gap-2">
                            {colorOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setColor(option.value)}
                                    className={`
                                        h-10 rounded-lg transition-all duration-200
                                        ${color === option.value ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800 scale-110' : 'hover:scale-105'}
                                    `}
                                    style={{ backgroundColor: option.value }}
                                    title={option.label}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="secondary" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="flex items-start space-x-3 mb-4">
                        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                Danger Zone
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Deleting a projects is permanent and cannot be undone. All tasks, columns, and data will be lost.
                            </p>
                        </div>
                    </div>

                    {!showDeleteConfirm ? (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full !bg-red-50 !text-red-600 hover:!bg-red-100 dark:!bg-red-900/20 dark:!text-red-400 dark:hover:!bg-red-900/30"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Project
                        </Button>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-900 dark:text-white font-medium">
                                Type <span className="font-bold text-red-600 dark:text-red-400">{project.name}</span> to confirm deletion:
                            </p>
                            <Input 
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Enter project name"
                            />
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setDeleteConfirmText('');
                                        setError('');
                                    }}
                                    fullWidth
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={loading || deleteConfirmText !== project.name}
                                >
                                    {loading ? 'Deleting...' : 'Delete Project'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}