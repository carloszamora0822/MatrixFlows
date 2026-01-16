import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/layout/Layout';
import MatrixPreview from '../components/ui/MatrixPreview';

const Dashboard = () => {
  useAuth(); // Auth check only
  const [stats, setStats] = useState(null);
  const [, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        fetch('/api/dashboard/stats', { credentials: 'include' }),
        fetch('/api/dashboard/activity', { credentials: 'include' })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivity(activityData);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <p className="mt-4 text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Today at OZ1</h1>
            <p className="text-sm text-gray-600">Manage your Vestaboard displays and workflows</p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4 mb-8 max-w-2xl">
            <a href="/workflows" className="btn-primary text-center py-4 flex items-center justify-center gap-2">
              <span className="text-lg">+</span>
              <span>Create Workflow</span>
            </a>
            <a href="/preview" className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-center py-4 flex items-center justify-center gap-2 transition-colors">
              <span className="text-lg">+</span>
              <span>New Custom Screen</span>
            </a>
          </div>

          {/* Main Grid - Boards & Workflows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Available Boards */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Boards</h2>
              {stats?.boards && stats.boards.length > 0 ? (
                <div className="space-y-4">
                  {stats.boards.map((board) => (
                    <div key={board._id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{board.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {board.defaultWorkflowId ? (
                              <span className="text-gray-700">Assigned: {board.defaultWorkflowId.name}</span>
                            ) : (
                              <span className="text-orange-600">No workflow assigned</span>
                            )}
                          </div>
                          {board.lastUpdateAt && (
                            <div className="text-xs text-gray-400 mt-1">
                              Last updated: {new Date(board.lastUpdateAt).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Vestaboard Preview */}
                      {board.lastMatrix ? (
                        <div className="mt-3 flex justify-center">
                          <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}>
                            <MatrixPreview matrix={board.lastMatrix} />
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic mt-2">No screen displayed yet</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No boards configured</p>
              )}
            </div>

            {/* Workflows Overview */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Workflows</h2>
              {stats?.workflows && stats.workflows.length > 0 ? (
                <div className="space-y-2">
                  {stats.workflows.map((workflow) => (
                    <a key={workflow.workflowId} href={`/workflows`} className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{workflow.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {workflow.schedule?.type === 'dailyWindow' ? (
                              <span>{workflow.schedule.daysOfWeek?.length || 0} days • {workflow.schedule.startTimeLocal || '00:00'}-{workflow.schedule.endTimeLocal || '23:59'}</span>
                            ) : (
                              <span>24/7</span>
                            )}
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">Active</span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No active workflows</p>
              )}
            </div>
          </div>

          {/* This Week */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">This Week</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Birthdays */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">🎂 Birthdays</h3>
                {stats?.thisWeekBirthdays && stats.thisWeekBirthdays.length > 0 ? (
                  <div className="space-y-2">
                    {stats.thisWeekBirthdays.map((birthday, idx) => (
                      <div key={idx} className="text-sm text-gray-600">
                        {birthday.firstName} – {birthday.date}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">None this week</p>
                )}
              </div>

              {/* Checkrides */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">✈️ Checkrides</h3>
                {stats?.todaysCheckrides && stats.todaysCheckrides.length > 0 ? (
                  <div className="space-y-2">
                    {stats.todaysCheckrides.map((cr, idx) => (
                      <div key={idx} className="text-sm text-gray-600">
                        {cr.callsign} – {cr.time}
                        <div className="text-xs text-gray-500">{cr.name} • {cr.type}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">None today</p>
                )}
              </div>

              {/* Events */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">📅 Events</h3>
                {stats?.upcomingEvents && stats.upcomingEvents.length > 0 ? (
                  <div className="space-y-2">
                    {stats.upcomingEvents.map((event, idx) => (
                      <div key={idx} className="text-sm text-gray-600">
                        {event.description}
                        <div className="text-xs text-gray-500">{event.date} at {event.time}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">None upcoming</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
