import React, { useState } from 'react';
import { AuditLogViewer } from '../components/audit/AuditLogViewer';
import { AuditStats } from '../components/audit/AuditStats';
import { useParams, Navigate } from 'react-router-dom';
import { FileText, BarChart3 } from 'lucide-react';

type TabType = 'logs' | 'stats';

export const AuditPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('logs');

  if (!projectId) {
    return <Navigate to="/dashboard" replace />;
  }

  const tabs: Array<{ id: TabType; label: string; icon: React.ElementType }> = [
    { id: 'logs', label: 'Logs', icon: FileText },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Project Audit</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View and analyze all actions performed in the project
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                      ${
                        activeTab === tab.id
                          ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div>
          {activeTab === 'logs' && <AuditLogViewer projectId={parseInt(projectId)} />}
          {activeTab === 'stats' && <AuditStats projectId={parseInt(projectId)} />}
        </div>
      </div>
    </div>
  );
};