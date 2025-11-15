import React from 'react';
import { Modal } from '../ui/Modal';
import { AuditLogViewer } from './AuditLogViewer';
import { Project } from '../../types';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Audit Log - ${project.name}`}
      size="xl"
    >
      <div className="max-h-[70vh] overflow-y-auto">
        <AuditLogViewer projectId={project.id} />
      </div>
    </Modal>
  );
};