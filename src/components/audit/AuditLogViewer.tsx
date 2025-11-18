import React, { useState, useEffect } from 'react';
import { AuditLog, AuditLogFilters, AuditAction, AuditEntityType } from '../../types';
import { apiClient } from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  FileText, 
  Users, 
  Mail, 
  UserPlus, 
  BarChart3, 
  FolderOpen,
  Filter,
  Download,
  ChevronRight,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

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
  column_moved: 'Column moved',
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

const getActionIcon = (action: AuditAction) => {
  if (action.startsWith('task_')) return FileText;
  if (action.startsWith('member_')) return Users;
  if (action.startsWith('invitation_')) return Mail;
  if (action.startsWith('collaborator_')) return UserPlus;
  if (action.startsWith('column_')) return BarChart3;
  if (action.startsWith('project_')) return FolderOpen;
  return FileText;
};

const getActionColor = (action: AuditAction): string => {
  if (action.includes('created') || action.includes('added') || action.includes('accepted')) {
    return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
  }
  if (action.includes('deleted') || action.includes('removed') || action.includes('rejected')) {
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
  }
  if (action.includes('updated') || action.includes('changed') || action.includes('moved')) {
    return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
  }
  return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
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
      setError('Error loading audit logs');
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
      offset: 0,
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
      alert('Error exporting logs');
    }
  };

  const renderLogDetails = (log: AuditLog) => {
    const details = log.details || {};
    
    return (
      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {details.task_title && (
          <div>Task: <span className="font-medium text-gray-900 dark:text-white">{details.task_title}</span></div>
        )}
        {details.old_assignee_id !== undefined && details.new_assignee_id !== undefined && (
          <div>
            Assignment: {details.old_assignee_id ? 'Reassigned' : 'Assigned'}
          </div>
        )}
        {details.old_priority && details.new_priority && (
          <div>
            Priority: <span className="line-through">{details.old_priority}</span> → 
            <span className="font-medium ml-1 text-gray-900 dark:text-white">{details.new_priority}</span>
          </div>
        )}
        {details.old_column_id && details.new_column_id && (
          <div>Column changed</div>
        )}
        {details.role && (
          <div>Role: <span className="font-medium text-gray-900 dark:text-white">{details.role}</span></div>
        )}
        {details.invited_email && (
          <div>Email: <span className="font-medium text-gray-900 dark:text-white">{details.invited_email}</span></div>
        )}
      </div>
    );
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Action
            </label>
            <select
              value={filters.action || ''}
              onChange={(e) => handleFilterChange('action', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">All actions</option>
              {availableActions.map(action => (
                <option key={action} value={action}>
                  {actionLabels[action as AuditAction] || action}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start date
            </label>
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End date
            </label>
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <Button
            variant="secondary"
            onClick={() => setFilters({ limit: 50, offset: 0 })}
          >
            Clear filters
          </Button>
          <Button
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Audit Logs</h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Total: {totalLogs} records
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No audit logs found
            </div>
          ) : (
            logs.map((log) => {
              const ActionIcon = getActionIcon(log.action);
              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {log.user_avatar ? (
                        <img
                          src={log.user_avatar}
                          alt={log.user_name || 'User'}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
                          {log.user_name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <ActionIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {actionLabels[log.action] || log.action}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {entityTypeLabels[log.entity_type] || log.entity_type}
                        </span>
                      </div>

                      <div className="mt-1">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {log.user_name || log.username || 'Unknown user'}
                        </span>
                        {log.user_email && (
                          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                            ({log.user_email})
                          </span>
                        )}
                      </div>

                      {renderLogDetails(log)}

                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(log.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {hasMore && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
            <Button
              onClick={handleLoadMore}
              disabled={loading}
              variant="secondary"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load more'
              )}
            </Button>
          </div>
        )}
      </div>

      {selectedLog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Log Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ID</label>
                  <p className="text-gray-900 dark:text-white">{selectedLog.id}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Action</label>
                  <p className="text-gray-900 dark:text-white">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getActionColor(selectedLog.action)}`}>
                      {actionLabels[selectedLog.action] || selectedLog.action}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Entity Type</label>
                  <p className="text-gray-900 dark:text-white">{entityTypeLabels[selectedLog.entity_type] || selectedLog.entity_type}</p>
                </div>

                {selectedLog.entity_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Entity ID</label>
                    <p className="text-gray-900 dark:text-white">{selectedLog.entity_id}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">User</label>
                  <div className="flex items-center space-x-3 mt-1">
                    {selectedLog.user_avatar ? (
                      <img
                        src={selectedLog.user_avatar}
                        alt={selectedLog.user_name || 'User'}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
                        {selectedLog.user_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedLog.user_name || selectedLog.username || 'Unknown user'}
                      </p>
                      {selectedLog.user_email && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{selectedLog.user_email}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(selectedLog.created_at).toLocaleString('en-US', {
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
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Details</label>
                    <pre className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-md text-sm overflow-x-auto text-gray-900 dark:text-white">
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