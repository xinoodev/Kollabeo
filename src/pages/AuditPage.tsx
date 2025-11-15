import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { AuditLogViewer } from '../components/audit/AuditLogViewer';
import { AuditStats } from '../components/audit/AuditStats';

type TabType = 'logs' | 'stats';

export const AuditPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('logs');

  if (!projectId) {
    return <Navigate to="/dashboard" replace />;
  }

  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: 'logs', label: 'Registros', icon: '📋' },
    { id: 'stats', label: 'Estadísticas', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Auditoría del Proyecto</h1>
          <p className="mt-2 text-gray-600">
            Visualiza y analiza todas las acciones realizadas en el proyecto
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'logs' && <AuditLogViewer projectId={parseInt(projectId)} />}
          {activeTab === 'stats' && <AuditStats projectId={parseInt(projectId)} />}
        </div>
      </div>
    </div>
  );
};