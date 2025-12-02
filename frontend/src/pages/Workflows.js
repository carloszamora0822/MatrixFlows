import React, { useState } from 'react';
import Layout from '../components/layout/Layout';

const Workflows = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Workflow & Scheduling</h1>
            <p className="mt-2 text-gray-600">
              Manage automated Vestaboard updates and screen rotations
            </p>
          </div>

          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-4xl">📺</div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Boards</p>
                  <p className="text-2xl font-bold text-gray-900">1</p>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-4xl">🔄</div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Workflows</p>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-4xl">⏰</div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Next Update</p>
                  <p className="text-lg font-bold text-gray-900">15 seconds</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="card">
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📊 Overview
                </button>
                <button
                  onClick={() => setActiveTab('boards')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'boards'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📺 Boards
                </button>
                <button
                  onClick={() => setActiveTab('workflows')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'workflows'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🔄 Workflows
                </button>
              </nav>
            </div>

            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'boards' && <BoardsTab />}
            {activeTab === 'workflows' && <WorkflowsTab />}
          </div>
        </div>
      </div>
    </Layout>
  );
};

const OverviewTab = () => (
  <div className="space-y-6">
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-blue-900 mb-2">🎉 Sprint 5 Complete!</h3>
      <p className="text-blue-800 mb-4">
        The workflow and scheduling system is now operational. Your Vestaboards will automatically
        cycle through screens based on configured workflows.
      </p>
      <div className="space-y-2 text-sm text-blue-700">
        <p>✅ <strong>Workflow Engine:</strong> Intelligent screen rotation with scheduling</p>
        <p>✅ <strong>Board Management:</strong> Multiple Vestaboard support</p>
        <p>✅ <strong>Scheduler Service:</strong> Automated updates via cron</p>
        <p>✅ <strong>State Tracking:</strong> Persistent board state across updates</p>
      </div>
    </div>

    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h3>
      <div className="space-y-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
            1
          </div>
          <div className="ml-4">
            <h4 className="font-medium text-gray-900">Create a Board</h4>
            <p className="text-sm text-gray-600">Register your Vestaboard with its Read/Write API key</p>
          </div>
        </div>
        <div className="flex items-start">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
            2
          </div>
          <div className="ml-4">
            <h4 className="font-medium text-gray-900">Build a Workflow</h4>
            <p className="text-sm text-gray-600">Add screen types (Birthday, Weather, METAR, etc.) with display durations</p>
          </div>
        </div>
        <div className="flex items-start">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
            3
          </div>
          <div className="ml-4">
            <h4 className="font-medium text-gray-900">Set Schedule</h4>
            <p className="text-sm text-gray-600">Configure when the workflow should run (always, daily window, date range)</p>
          </div>
        </div>
        <div className="flex items-start">
          <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
            ✓
          </div>
          <div className="ml-4">
            <h4 className="font-medium text-gray-900">Automatic Updates</h4>
            <p className="text-sm text-gray-600">The scheduler automatically cycles through screens based on your workflow</p>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-yellow-900 mb-2">⚙️ Configuration Required</h3>
      <p className="text-yellow-800 mb-4">
        To enable automatic updates, you need to:
      </p>
      <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-700">
        <li>Add your Vestaboard Read/Write API key in the Boards tab</li>
        <li>Create a workflow with screen steps</li>
        <li>Set up a cron job to call: <code className="bg-yellow-100 px-2 py-1 rounded">POST /api/cron/update</code></li>
        <li>Include the CRON_SECRET header for security</li>
      </ol>
    </div>
  </div>
);

const BoardsTab = () => (
  <div className="text-center py-12">
    <div className="text-6xl mb-4">📺</div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Board Management</h3>
    <p className="text-gray-600 mb-6">Register and manage your Vestaboards</p>
    <p className="text-sm text-gray-500">Full board management UI coming soon...</p>
    <p className="text-sm text-gray-500 mt-2">For now, boards can be added via API or database</p>
  </div>
);

const WorkflowsTab = () => (
  <div className="text-center py-12">
    <div className="text-6xl mb-4">🔄</div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Workflow Builder</h3>
    <p className="text-gray-600 mb-6">Create and manage screen rotation workflows</p>
    <p className="text-sm text-gray-500">Full workflow builder UI coming soon...</p>
    <p className="text-sm text-gray-500 mt-2">For now, workflows can be created via API or database</p>
  </div>
);

export default Workflows;
