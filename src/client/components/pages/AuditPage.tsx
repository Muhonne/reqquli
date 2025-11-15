import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  User,
  FileText,
  TrendingUp,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { Button, Input, Select, Badge } from '../atoms';
import { EmptyState, LoadingState } from '../molecules';
import { AppLayout } from '../templates';

interface AuditEvent {
  id: string;
  event_type: string;
  event_name: string;
  aggregate_type: string;
  aggregate_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  event_data: any;
  metadata: any;
  occurred_at: string;
}

interface SystemMetric {
  date: string;
  total_events: number;
  active_users: number;
  items_created: number;
  items_approved: number;
  items_deleted: number;
  test_activities: number;
  trace_activities: number;
}

interface UserActivity {
  user_id: string;
  user_name: string;
  user_email: string;
  total_events: number;
  active_days: number;
  first_activity: string;
  last_activity: string;
  events_by_type: Record<string, number>;
}

export const AuditPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'metrics' | 'users'>('events');
  const [filters, setFilters] = useState({
    event_type: '',
    aggregate_type: '',
    user_id: '',
    from_date: '',
    to_date: '',
    search: ''
  });
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      };

      if (activeTab === 'events') {
        const params = new URLSearchParams({
          ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')),
          page: page.toString(),
          limit: '50'
        });
        const response = await fetch(`/api/audit/events?${params}`, { headers });
        const data = await response.json();
        if (data.success) {
          setEvents(data.data);
          setTotalPages(data.meta?.pagination?.pages || data.pagination?.pages || 1);
        }
      } else if (activeTab === 'metrics') {
        const response = await fetch('/api/audit/metrics/system?days=30', { headers });
        const data = await response.json();
        if (data.success) {
          setMetrics(data.metrics);
        }
      } else if (activeTab === 'users') {
        const response = await fetch('/api/audit/activity/users', { headers });
        const data = await response.json();
        if (data.success) {
          setUserActivity(data.users);
        }
      }
    } catch {
      // Error handling is done by the API service
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const getEventTypeVariant = (type: string): 'success' | 'error' | 'warning' | 'pending' | 'neutral' => {
    switch (type) {
      case 'Authentication': return 'pending';
      case 'Requirements': return 'success';
      case 'Testing': return 'warning';
      case 'Traceability': return 'neutral';
      default: return 'neutral';
    }
  };

  const getEventIcon = (eventName: string) => {
    if (eventName.includes('Login') || eventName.includes('Logout')) {return '🔐';}
    if (eventName.includes('Created')) {return '➕';}
    if (eventName.includes('Updated')) {return '✏️';}
    if (eventName.includes('Deleted')) {return '🗑️';}
    if (eventName.includes('Approved')) {return '✅';}
    if (eventName.includes('Test')) {return '🧪';}
    if (eventName.includes('Trace')) {return '🔗';}
    return '📋';
  };

  const renderEventsTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Select
            value={filters.event_type}
            onChange={(e) => setFilters({ ...filters, event_type: e.target.value })}
          >
            <option value="">All Event Types</option>
            <option value="Authentication">Authentication</option>
            <option value="Requirements">Requirements</option>
            <option value="Testing">Testing</option>
            <option value="Traceability">Traceability</option>
          </Select>

          <Select
            value={filters.aggregate_type}
            onChange={(e) => setFilters({ ...filters, aggregate_type: e.target.value })}
          >
            <option value="">All Aggregates</option>
            <option value="User">User</option>
            <option value="UserRequirement">User Requirement</option>
            <option value="SystemRequirement">System Requirement</option>
            <option value="TestCase">Test Case</option>
            <option value="TestRun">Test Run</option>
            <option value="Trace">Trace</option>
          </Select>

          <Input
            type="date"
            placeholder="From Date"
            value={filters.from_date}
            onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
          />

          <Input
            type="date"
            placeholder="To Date"
            value={filters.to_date}
            onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
          />

          <Input
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />

          <Button onClick={() => setFilters({
            event_type: '',
            aggregate_type: '',
            user_id: '',
            from_date: '',
            to_date: '',
            search: ''
          })}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <LoadingState />
        ) : events.length === 0 ? (
          <EmptyState
            title="No audit events found"
            description="Events will appear here as users interact with the system"
            icon={Activity}
          />
        ) : (
          <div className="divide-y divide-gray-200">
            {events.map((event) => (
              <div key={event.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleEventExpansion(event.id)}
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {expandedEvents.has(event.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-2xl">{getEventIcon(event.event_name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {event.event_name}
                        </span>
                        <Badge variant={getEventTypeVariant(event.event_type)}>
                          {event.event_type}
                        </Badge>
                        <Badge variant="neutral">
                          {event.aggregate_type}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        {event.aggregate_id} • {event.user_name || 'System'} • {formatDate(event.occurred_at)}
                      </div>
                    </div>
                  </div>
                </div>

                {expandedEvents.has(event.id) && (
                  <div className="mt-4 ml-11 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">User:</span>
                        <span className="ml-2 text-sm text-gray-600">
                          {event.user_name} ({event.user_email})
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Event Data:</span>
                        <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
                          {JSON.stringify(event.event_data, null, 2)}
                        </pre>
                      </div>
                      {event.metadata && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Metadata:</span>
                          <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex justify-between items-center">
            <Button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderMetricsTab = () => (
    <div className="space-y-4">
      {loading ? (
        <LoadingState />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Events (30d)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.reduce((sum, m) => sum + m.total_events, 0).toLocaleString()}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Users (30d)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {[...new Set(metrics.flatMap(m => Array(m.active_users).fill(null)))].length}
                  </p>
                </div>
                <User className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Items Created (30d)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.reduce((sum, m) => sum + m.items_created, 0).toLocaleString()}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Items Approved (30d)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.reduce((sum, m) => sum + m.items_approved, 0).toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Daily Metrics Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Daily Activity</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Events
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Active Users
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approved
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deleted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test Activities
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trace Activities
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.map((metric) => (
                    <tr key={metric.date} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Date(metric.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {metric.total_events.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {metric.active_users}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {metric.items_created}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {metric.items_approved}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {metric.items_deleted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {metric.test_activities}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {metric.trace_activities}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderUsersTab = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">User Activity</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Events
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    First Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Breakdown
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userActivity.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.user_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.user_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.total_events.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.active_days}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.first_activity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.last_activity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {Object.entries(user.events_by_type || {}).map(([type, count]) => (
                          <Badge key={type} variant={getEventTypeVariant(type)}>
                            {type}: {count}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
          <p className="mt-2 text-sm text-gray-600">
            Comprehensive event tracking and system activity monitoring
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('events')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'events'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Event Stream</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'metrics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>System Metrics</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>User Activity</span>
            </div>
          </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'events' && renderEventsTab()}
        {activeTab === 'metrics' && renderMetricsTab()}
        {activeTab === 'users' && renderUsersTab()}
      </div>
    </AppLayout>
  );
}