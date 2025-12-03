import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';

const EditBoard = () => {
  const navigate = useNavigate();
  const { boardId } = useParams(); // If boardId exists, we're editing; otherwise, creating
  const isEditing = !!boardId;
  
  const [workflows, setWorkflows] = useState([]);
  const [form, setForm] = useState({ 
    name: '', 
    locationLabel: '', 
    vestaboardWriteKey: '', 
    defaultWorkflowId: '', 
    isActive: true 
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);

  useEffect(() => {
    fetchWorkflows();
    if (isEditing) {
      fetchBoard();
    }
  }, [boardId]);

  const fetchWorkflows = async () => {
    try {
      const res = await fetch('/api/workflows', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    }
  };

  const fetchBoard = async () => {
    try {
      const res = await fetch('/api/boards', { credentials: 'include' });
      if (res.ok) {
        const boards = await res.json();
        const board = boards.find(b => b.boardId === boardId);
        if (board) {
          setForm({
            name: board.name,
            locationLabel: board.locationLabel || '',
            vestaboardWriteKey: board.vestaboardWriteKey,
            defaultWorkflowId: board.defaultWorkflowId || '',
            isActive: board.isActive !== false
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch board:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEditing ? `/api/boards?id=${boardId}` : '/api/boards';
      const method = isEditing ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      
      if (res.ok) {
        alert(isEditing ? '✅ Board updated successfully!' : '✅ Board created successfully!');
        navigate('/boards');
      } else {
        alert('Failed to save board');
      }
    } catch (error) {
      console.error('Failed to save board:', error);
      alert('Error saving board');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600">Loading board...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/boards')}
            className="text-blue-600 hover:text-blue-800 font-medium mb-4 inline-flex items-center gap-2"
          >
            ← Back to Boards
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Edit Board' : 'Add New Board'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEditing 
              ? 'Update your Vestaboard configuration and workflow assignment' 
              : 'Connect a new Vestaboard to your system'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Board Details Card */}
          <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Board Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Board Name *
                </label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg" 
                  placeholder="e.g., Office Lobby, Conference Room" 
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location (optional)
                </label>
                <input 
                  type="text" 
                  value={form.locationLabel} 
                  onChange={(e) => setForm({ ...form, locationLabel: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none" 
                  placeholder="e.g., Building A, 2nd Floor" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vestaboard API Key *
                </label>
                <input 
                  type="text" 
                  value={form.vestaboardWriteKey} 
                  onChange={(e) => setForm({ ...form, vestaboardWriteKey: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-mono text-sm" 
                  placeholder="Read/Write API Key from Vestaboard" 
                  required 
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get this from your Vestaboard settings → Installables → Read/Write API
                </p>
              </div>
            </div>
          </div>

          {/* Active Status Card (only when editing) */}
          {isEditing && (
            <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">⚡ Board Status</h2>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <div className="font-medium text-gray-900">
                    {form.isActive ? '✅ Board Active' : '⏸️ Board Inactive'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {form.isActive ? 'Scheduler will update this board' : 'Scheduler will skip this board'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    form.isActive ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      form.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Workflow Assignment Card */}
          <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🎬 Workflow Assignment</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned Workflow
              </label>
              <select 
                value={form.defaultWorkflowId} 
                onChange={(e) => setForm({ ...form, defaultWorkflowId: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                disabled={isEditing && !form.isActive}
              >
                <option value="">No workflow (assign later)</option>
                {workflows
                  .filter(w => !w.name?.startsWith('Pinned -'))
                  .map(w => (
                    <option key={w.workflowId} value={w.workflowId}>
                      {w.name}
                    </option>
                  ))}
              </select>
              
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-700">
                  💡 <strong>Tip:</strong> Multiple boards can use the same workflow - they'll update simultaneously!
                </p>
              </div>
              
              {isEditing && !form.isActive && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ Activate this board to assign workflows
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => navigate('/boards')}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 transition-colors shadow-lg"
            >
              {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? '💾 Update Board' : '✨ Create Board')}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default EditBoard;
