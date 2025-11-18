import React, { useState, useEffect } from 'react';
import { AuditLogStats } from '../../types';
import { apiClient } from '../../lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { BarChart3, Users, FolderOpen, Calendar, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface AuditStatsProps {
  projectId: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const AuditStats: React.FC<AuditStatsProps> = ({ projectId }) => {
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  useEffect(() => {
    loadStats();
  }, [projectId, dateRange]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAuditStats(projectId, dateRange.start, dateRange.end);
      setStats(data);
      setError(null);
    } catch (err) {
      setError('Error loading statistics');
      console.error('Load stats error:', err);
    } finally {
            setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
        {error || 'Could not load statistics'}
      </div>
    );
  }

  const topActions = stats.byAction.slice(0, 10);
  const topUsers = stats.byUser.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Date Range</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start date
            </label>
            <Input
              type="date"
              value={dateRange.start || ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value || undefined }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End date
            </label>
            <Input
              type="date"
              value={dateRange.end || ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value || undefined }))}
            />
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => setDateRange({})}
          className="mt-4"
        >
          Clear filters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Actions</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.byAction.reduce((sum, item) => sum + parseInt(item.count.toString()), 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.byUser.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Entity Types</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.byEntityType.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <FolderOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Most Frequent Actions</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topActions}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis 
              dataKey="action" 
              angle={-45}
              textAnchor="end"
              height={100}
              fontSize={12}
              stroke="#6B7280"
            />
            <YAxis stroke="#6B7280" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#F9FAFB'
              }}
            />
            <Legend />
            <Bar dataKey="count" fill="#3B82F6" name="Count" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Distribution by Entity Type</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={stats.byEntityType}
              dataKey="count"
              nameKey="entity_type"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={(entry: any) => `${entry.entity_type}: ${entry.count}`}
            >
              {stats.byEntityType.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#F9FAFB'
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Most Active Users</h3>
        <div className="space-y-4">
          {topUsers.map((user, index) => (
            <div key={user.user_id} className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-8 text-center font-bold text-gray-500 dark:text-gray-400">
                #{index + 1}
              </div>
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
                  {user.full_name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {user.full_name || user.username}
                </p>
                <div className="mt-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(parseInt(user.action_count.toString()) / parseInt(topUsers[0].action_count.toString())) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {user.action_count}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">actions</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Activity by Day (Last 30 days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.activityByDay.reverse()}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              stroke="#6B7280"
            />
            <YAxis stroke="#6B7280" />
            <Tooltip 
              labelFormatter={(date) => new Date(date).toLocaleDateString('en-US')}
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#F9FAFB'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="#3B82F6"
              strokeWidth={2}
              name="Actions"
              dot={{ fill: '#3B82F6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};