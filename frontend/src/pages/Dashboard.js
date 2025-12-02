import React from 'react';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/layout/Layout';

const Dashboard = () => {
  const { user } = useAuth();

  const quickActions = [
    {
      title: 'Boards',
      description: 'Manage Vestaboard displays',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
        </svg>
      ),
      href: '/boards',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      title: 'Data Management',
      description: 'Manage birthdays, events, and more',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      href: '/data',
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      title: 'Workflows',
      description: 'Configure display workflows',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      href: '/workflows',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      title: 'Pin Screen',
      description: 'Temporarily override displays',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
      href: '/pin',
      color: 'bg-orange-600 hover:bg-orange-700'
    }
  ];

  const stats = [
    { name: 'Active Boards', value: '2', change: '+0', changeType: 'neutral' },
    { name: 'Running Workflows', value: '3', change: '+1', changeType: 'positive' },
    { name: 'Data Entries', value: '24', change: '+4', changeType: 'positive' },
    { name: 'System Uptime', value: '99.9%', change: '+0.1%', changeType: 'positive' }
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.email?.split('@')[0]}!
            </h1>
            <p className="mt-2 text-gray-600">
              Manage your VBT Vestaboard displays and workflows
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.name} className="card">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 truncate">{stat.name}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`text-sm ${
                    stat.changeType === 'positive' ? 'text-green-600' : 
                    stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {stat.change}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* User Information Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-1">
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user?.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Role</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        user?.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user?.role === 'editor' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user?.role}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Organization</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user?.orgId}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Login</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'N/A'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* System Status */}
            <div className="lg:col-span-2">
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Database Connection</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
                      Connected
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">External APIs</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
                      Operational
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Scheduler Service</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
                      Running
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action) => (
                <a
                  key={action.title}
                  href={action.href}
                  className="group relative card hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 p-3 rounded-lg text-white ${action.color} group-hover:scale-110 transition-transform duration-200`}>
                      {action.icon}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900 group-hover:text-gray-700">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-500">{action.description}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Recent Activity Placeholder */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
              <p className="mt-1 text-sm text-gray-500">
                Activity will appear here as you use the system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
