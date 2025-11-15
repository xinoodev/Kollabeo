
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
      setError('Error al cargar las estadísticas');
      console.error('Load stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error || 'No se pudieron cargar las estadísticas'}
      </div>
    );
  }

  const topActions = stats.byAction.slice(0, 10);
  const topUsers = stats.byUser.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Filtros de fecha */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Rango de Fechas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha inicio
            </label>
            <input
              type="date"
              value={dateRange.start || ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha fin
            </label>
            <input
              type="date"
              value={dateRange.end || ''}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={() => setDateRange({})}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700"
        >
          Limpiar filtros
        </button>
      </div>

      {/* Resumen general */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Acciones</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.byAction.reduce((sum, item) => sum + parseInt(item.count.toString()), 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Usuarios Activos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.byUser.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tipos de Entidades</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.byEntityType.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📁</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de acciones más frecuentes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Acciones Más Frecuentes</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topActions}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="action" 
              angle={-45}
              textAnchor="end"
              height={100}
              fontSize={12}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#3B82F6" name="Cantidad" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de distribución por tipo de entidad */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Distribución por Tipo de Entidad</h3>
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
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de usuarios más activos */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Usuarios Más Activos</h3>
        <div className="space-y-4">
          {topUsers.map((user, index) => (
            <div key={user.user_id} className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-8 text-center font-bold text-gray-500">
                #{index + 1}
              </div>
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                  {user.full_name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {user.full_name || user.username}
                </p>
                <div className="mt-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${(parseInt(user.action_count.toString()) / parseInt(topUsers[0].action_count.toString())) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-lg font-bold text-gray-900">
                  {user.action_count}
                </p>
                <p className="text-xs text-gray-500">acciones</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico de actividad por día */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Actividad por Día (Últimos 30 días)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.activityByDay.reverse()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(date) => new Date(date).toLocaleDateString('es-ES')}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="#3B82F6" 
              strokeWidth={2}
              name="Acciones"
              dot={{ fill: '#3B82F6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};