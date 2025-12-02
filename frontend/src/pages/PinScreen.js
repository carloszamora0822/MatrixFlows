import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';

const PinScreen = () => {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    boardId: '',
    workflowId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTimeLocal: '09:00',
    endTimeLocal: '17:00'
  });

  useEffect(() => {
    fetchData();
    
    // Check for workflow parameter in URL
    const params = new URLSearchParams(window.location.search);
    const workflowId = params.get('workflow');
    if (workflowId) {
      setFormData(prev => ({ ...prev, workflowId }));
    }
  }, []);

  const fetchData = async () => {
    try {
      const [boardsRes, workflowsRes] = await Promise.all([
        fetch('/api/boards', { credentials: 'include' }),
        fetch('/api/workflows', { credentials: 'include' })
      ]);

      if (boardsRes.ok) setBoards(await boardsRes.json());
      if (workflowsRes.ok) setWorkflows(await workflowsRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Get selected workflow's steps
    const selectedWorkflow = workflows.find(w => w.workflowId === formData.workflowId);
    if (!selectedWorkflow) {
      alert('Please select a workflow');
      return;
    }

    // Convert workflow steps to screen configs
    const screenConfigs = selectedWorkflow.steps
      .filter(s => s.isEnabled)
      .sort((a, b) => a.order - b.order)
      .map(step => ({
        screenType: step.screenType,
        screenConfig: step.screenConfig || {},
        displaySeconds: step.displaySeconds
      }));

    try {
      const response = await fetch('/api/pin-screen/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          boardId: formData.boardId,
          screenConfigs,
          startDate: formData.startDate,
          endDate: formData.endDate,
          startTimeLocal: formData.startTimeLocal,
          endTimeLocal: formData.endTimeLocal
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.message}\n\nWorkflow: ${data.name}\nSteps: ${data.stepsCount}`);
        navigate('/workflows');
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error?.message || 'Failed to create pinned screen'}`);
      }
    } catch (error) {
      alert('❌ Network error occurred');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  const selectedBoard = boards.find(b => b.boardId === formData.boardId);
  const selectedWorkflow = workflows.find(w => w.workflowId === formData.workflowId);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Pin Screen
          </h1>
          <p className="text-gray-600">Temporarily override a board's workflow for a specific time period</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          {/* Board Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Board
            </label>
            <select
              value={formData.boardId}
              onChange={(e) => setFormData({ ...formData, boardId: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              required
            >
              <option value="">Choose a board...</option>
              {boards.map(board => (
                <option key={board.boardId} value={board.boardId}>
                  {board.name} {board.locationLabel && `- ${board.locationLabel}`}
                </option>
              ))}
            </select>
          </div>

          {/* Workflow Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Workflow to Pin
            </label>
            <select
              value={formData.workflowId}
              onChange={(e) => setFormData({ ...formData, workflowId: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              required
            >
              <option value="">Choose a workflow...</option>
              {workflows.map(workflow => (
                <option key={workflow.workflowId} value={workflow.workflowId}>
                  {workflow.name} ({workflow.steps.filter(s => s.isEnabled).length} steps)
                </option>
              ))}
            </select>
            {selectedWorkflow && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 font-semibold">
                  Steps: {selectedWorkflow.steps.filter(s => s.isEnabled).map(s => s.screenType).join(' → ')}
                </p>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.startDate}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                required
              />
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={formData.startTimeLocal}
                onChange={(e) => setFormData({ ...formData, startTimeLocal: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={formData.endTimeLocal}
                onChange={(e) => setFormData({ ...formData, endTimeLocal: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                required
              />
            </div>
          </div>

          {/* Summary */}
          {selectedBoard && selectedWorkflow && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p><strong>Board:</strong> {selectedBoard.name}</p>
                <p><strong>Workflow:</strong> {selectedWorkflow.name}</p>
                <p><strong>Period:</strong> {formData.startDate} to {formData.endDate}</p>
                <p><strong>Time:</strong> {formData.startTimeLocal} - {formData.endTimeLocal}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex space-x-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              📌 Pin Screen
            </button>
            <button
              type="button"
              onClick={() => navigate('/workflows')}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default PinScreen;
