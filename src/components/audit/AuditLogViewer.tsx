
import React, { useState, useEffect } from 'react';
import { AuditLog, AuditLogFilters, AuditAction, AuditEntityType } from '../../types';
import { apiClient } from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditLogViewerProps {
  projectId: number;
}

const actionLabels: Record<AuditAction, string> = {
  task_created: 'Task created',
  task_updated: 'Task updated',
  task_deleted: 'Task deleted',
  task_assigned: 'Task assigned',
  task_unassigned: 'Task unassigned',
  task_moved: 'Task moved',
  task_priority_changed: 'Task priority changed',
  member_added: 'Member added',
  member_removed: 'Member removed',
  member_role_changed: 'Member role changed',
  invitation_sent: 'Invitation sent',
  invitation_accepted: 'Invitation accepted',
  invitation_rejected: 'Invitation rejected',
  invitation_cancelled: 'Invitation cancelled',
  collaborator_added: 'Collaborator added',
  collaborator_removed: 'Collaborator removed',
  column_created: 'Column created',
  column_renamed: 'Column renamed',
  column_deleted: 'Column deleted',
  project_created: 'Project created',
  project_updated: 'Project updated',
  project_deleted: 'Project deleted',
};

const entityTypeLabels: Record<AuditEntityType, string> = {
  task: 'Task',
  project_member: 'Member',
  invitation: 'Invitation',
  task_collaborator: 'Collaborator',
  column: 'Column',
  project: 'Project',
};

const getActionIcon = (action: AuditAction): string => {
  if (action.startsWith('task_')) return '📝';
  if (action.startsWith('member_')) return '👥';
  if (action.startsWith('invitation_')) return '✉️';
  if (action.startsWith('collaborator_')) return '🤝';
  if (action.startsWith('column_')) return '📊';
  if (action.startsWith('project_')) return '📁';
  return '📌';
};

const getActionColor = (action: AuditAction): string => {
  if (action.includes('created') || action.includes('added') || action.includes('accepted')) {
    return 'text-green-600 bg-green-50';
  }
  if (action.includes('deleted') || action.includes('removed') || action.includes('rejected')) {
    return 'text-red-600 bg-red-50';
  }
  if (action.includes('updated') || action.includes('changed') || action.includes('moved')) {
    return 'text-blue-600 bg-blue-50';
  }
  return 'text-gray-600 bg-gray-50';
};

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ projectId }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditLogFilters>({
    limit: 50,
    offset: 0,
  });
  const [totalLogs, setTotalLogs] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadAuditLogs();
    loadAvailableActions();
  }, [projectId, filters]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAuditLogs(projectId, filters);
      setLogs(response.logs);
      setTotalLogs(response.pagination.total);
      setHasMore(response.pagination.hasMore);
      setError(null);
    } catch (err) {
      setError('Error al cargar los registros de auditoría');
      console.error('Load audit logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableActions = async () => {
    try {
      const actions = await apiClient.getAuditActions();
      setAvailableActions(actions.all);
    } catch (err) {
      console.error('Load audit actions error:', err);
    }
  };

  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0, // Reset offset when changing filters
    }));
  };

  const handleLoadMore = () => {
    setFilters(prev => ({
      ...prev,
      offset: (prev.offset || 0) + (prev.limit || 50),
    }));
  };

  const handleExport = async () => {
    try {
      const blob = await apiClient.exportAuditLogs(projectId, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${projectId}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      alert('Error al exportar los registros');
    }
  };

  const renderLogDetails = (log: AuditLog) => {
    const details = log.details || {};
    
    return (
      <div className="mt-2 text-sm text-gray-600">
        {details.task_title && (
          <div>Tarea: <span className="font-medium">{details.task_title}</span></div>
        )}
        {details.old_assignee_id !== undefined && details.new_assignee_id !== undefined && (
          <div>
            Asignación: {details.old_assignee_id ? 'Reasignada' : 'Asignada'}
          </div>
        )}
        {details.old_priority && details.new_priority && (
          <div>
            Prioridad: <span className="line-through">{details.old_priority}</span> → 
            <span className="font-medium ml-1">{details.new_priority}</span>
          </div>
        )}
        {details.old_column_id && details.new_column_id && (
          <div>Columna cambiada</div>
        )}
        {details.role && (
          <div>Rol: <span className="font-medium">{details.role}</span></div>
        )}
        {details.invited_email && (
          <div>Email: <span className="font-medium">{details.invited_email}</span></div>
        )}
      </div>
    );
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Acción
            </label>
            <select
              value={filters.action || ''}
              onChange={(e) => handleFilterChange('action', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las acciones</option>
              {availableActions.map(action => (
                <option key={action} value={action}>
                  {actionLabels[action as AuditAction] || action}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha inicio
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha fin
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => setFilters({ limit: 50, offset: 0 })}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Limpiar filtros
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Registros de Auditoría</h3>
          <span className="text-sm text-gray-600">
            Total: {totalLogs} registros
          </span>
        </div>
      </div>

      {/* Lista de logs */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="divide-y divide-gray-200">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No se encontraron registros de auditoría
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelectedLog(log)}
              >
                <div className="flex items-start space-x-4">
                  {/* Avatar del usuario */}
                  <div className="flex-shrink-0">
                    {log.user_avatar ? (
                      <img
                        src={log.user_avatar}
                        alt={log.user_name || 'Usuario'}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                        {log.user_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  {/* Contenido del log */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getActionIcon(log.action)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {actionLabels[log.action] || log.action}
                      </span>
                      <span className="text-xs text-gray-500">
                        {entityTypeLabels[log.entity_type] || log.entity_type}
                      </span>
                    </div>

                    <div className="mt-1">
                      <span className="font-medium text-gray-900">
                        {log.user_name || log.username || 'Usuario desconocido'}
                      </span>
                      {log.user_email && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({log.user_email})
                        </span>
                      )}
                    </div>

                    {renderLogDetails(log)}

                    <div className="mt-2 text-xs text-gray-500">
                      {formatDistanceToNow(new Date(log.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </div>
                  </div>

                  {/* Indicador de más detalles */}
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Botón cargar más */}
        {hasMore && (
          <div className="p-4 border-t border-gray-200 text-center">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Cargando...' : 'Cargar más'}
            </button>
          </div>
        )}
      </div>

      {/* Modal de detalles */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Detalles del Registro</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">ID</label>
                  <p className="text-gray-900">{selectedLog.id}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Acción</label>
                  <p className="text-gray-900">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getActionColor(selectedLog.action)}`}>
                      {actionLabels[selectedLog.action] || selectedLog.action}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Tipo de Entidad</label>
                  <p className="text-gray-900">{entityTypeLabels[selectedLog.entity_type] || selectedLog.entity_type}</p>
                </div>

                {selectedLog.entity_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">ID de Entidad</label>
                    <p className="text-gray-900">{selectedLog.entity_id}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700">Usuario</label>
                  <div className="flex items-center space-x-3 mt-1">
                    {selectedLog.user_avatar ? (
                      <img
                        src={selectedLog.user_avatar}
                        alt={selectedLog.user_name || 'Usuario'}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                        {selectedLog.user_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedLog.user_name || selectedLog.username || 'Usuario desconocido'}
                      </p>
                      {selectedLog.user_email && (
                        <p className="text-sm text-gray-500">{selectedLog.user_email}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha</label>
                  <p className="text-gray-900">
                    {new Date(selectedLog.created_at).toLocaleString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </p>
                </div>

                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Detalles Adicionales</label>
                    <pre className="mt-2 p-4 bg-gray-50 rounded-md text-sm overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};