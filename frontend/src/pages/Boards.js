import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';

const Boards = () => {
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [boardsRes, workflowsRes] = await Promise.all([
        fetch('/api/boards', { credentials: 'include' }),
        fetch('/api/workflows', { credentials: 'include' })
      ]);
      
      const [boardsData, workflowsData] = await Promise.all([
        boardsRes.json(),
        workflowsRes.json()
      ]);

      setBoards(boardsData);
      setWorkflows(workflowsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleDelete = async (id) => {
    if (!window.confirm('Delete this board?')) return;
    try {
      const res = await fetch(`/api/boards?id=${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleToggleActive = async (boardId, currentStatus) => {
    try {
      const res = await fetch(`/api/boards?id=${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to toggle board status:', error);
      alert('Failed to update board status');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading boards...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">📺 Vestaboard Setup</h1>
            <p className="mt-2 text-gray-600">
              Register and manage your Vestaboard displays
            </p>
          </div>

          {/* Add Board Button */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Registered Boards</h3>
            <button 
              onClick={() => navigate('/boards/new')} 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              + Add Board
            </button>
          </div>

          {boards.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-gray-200 shadow">
              <div className="text-6xl mb-4">📺</div>
              <p className="text-gray-700">No boards registered yet</p>
              <p className="text-sm text-gray-500 mt-2">Click "Add Board" to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {boards.map((board) => {
                const assignedWorkflow = workflows.find(w => w.workflowId === board.defaultWorkflowId);
                
                return (
                  <div key={board.boardId} className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900">{board.name}</h4>
                        {board.locationLabel && <p className="text-sm text-gray-600">{board.locationLabel}</p>}
                        <p className="text-xs text-gray-500 mt-1">ID: {board.boardId}</p>
                        {assignedWorkflow ? (
                          <p className="text-xs text-green-600 mt-1">✅ Workflow: {assignedWorkflow.name}</p>
                        ) : (
                          <p className="text-xs text-yellow-600 mt-1">⚠️ No workflow assigned - edit board to assign one</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        {/* Active/Inactive Toggle */}
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-semibold ${board.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                            {board.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={() => handleToggleActive(board.boardId, board.isActive)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              board.isActive ? 'bg-green-600' : 'bg-gray-300'
                            }`}
                            title={board.isActive ? 'Click to deactivate board - stops all automatic updates' : 'Click to activate board - enables automatic updates'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                board.isActive ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        
                        <button 
                          onClick={() => navigate(`/boards/edit/${board.boardId}`)} 
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDelete(board.boardId)}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">🗑️ Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Boards;
