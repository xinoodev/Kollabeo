import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TaskColumn } from '../../types';
import { apiClient } from '../../lib/api';

interface EditColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  column: TaskColumn | null;
}

const COLUMN_COLORS = [
  '#6B7280', // Gray
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EC4899', // Pink
];

export const EditColumnModal: React.FC<EditColumnModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  column,
}) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLUMN_COLORS[0]);
  const [loading, setLoading] = useState(false);

  // Populate form when column changes
  useEffect(() => {
    if (column) {
      setName(column.name);
      setSelectedColor(column.color);
    }
  }, [column]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!column) return;

    setLoading(true);
    try {
      await apiClient.updateColumn(column.id, {
        name,
        color: selectedColor,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating column:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form when closing
    if (column) {
      setName(column.name);
      setSelectedColor(column.color);
    }
  };

  if (!column) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Column" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Column Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter column name"
          required
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Column Color
          </label>
          <div className="flex space-x-2">
            {COLUMN_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-full border-2 ${
                  selectedColor === color ? 'border-gray-400 dark:border-gray-500' : 'border-gray-200 dark:border-gray-600'
                } hover:border-gray-400 transition-colors duration-200`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Updating...' : 'Update Column'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};