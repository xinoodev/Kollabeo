import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { FileText, BarChart3 } from 'lucide-react';
import { AuditLogViewer } from './AuditLogViewer';
import { AuditStats } from './AuditStats';
import { Project } from '../../types';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

type TabType = 'logs' | 'stats';

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('logs');

  const tabs: Array<{ id: TabType; label: string; icon: React.ElementType }> = [
    { id: 'logs', label: 'Logs', icon: FileText },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
  ];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Audit Log - ${project.name}`}
      size="xl"
    >
      <div className="mb-4">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-custom">
        {activeTab === 'logs' && <AuditLogViewer projectId={project.id} />}
        {activeTab === 'stats' && <AuditStats projectId={project.id} />}
      </div>
    </Modal>
  );
};