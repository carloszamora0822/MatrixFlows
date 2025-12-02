import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';

const Workflows = () => {
  const [activeTab, setActiveTab] = useState('boards');
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
      
      if (boardsRes.ok) setBoards(await boardsRes.json());
      if (workflowsRes.ok) setWorkflows(await workflowsRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-4xl">📺</div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Registered Boards</p>
                  <p className="text-2xl font-bold text-gray-900">{boards.length}</p>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-4xl">🔄</div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Workflows</p>
                  <p className="text-2xl font-bold text-gray-900">{workflows.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="card">
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
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

            {activeTab === 'boards' && <BoardsTab boards={boards} workflows={workflows} fetchData={fetchData} />}
            {activeTab === 'workflows' && <WorkflowsTab workflows={workflows} boards={boards} fetchData={fetchData} />}
          </div>
        </div>
      </div>
    </Layout>
  );
};

const BoardsTab = ({ boards, workflows, fetchData }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', locationLabel: '', vestaboardWriteKey: '' });
  const [loading, setLoading] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(null);
  const [runningSchedulers, setRunningSchedulers] = useState({});
  const schedulerRefs = React.useRef({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setForm({ name: '', locationLabel: '', vestaboardWriteKey: '' });
        setShowForm(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create board:', error);
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

  const handleTrigger = async (boardId) => {
    setTriggerLoading(boardId);
    try {
      // Get auth token from cookie
      const authToken = document.cookie.split('; ').find(row => row.startsWith('authToken='))?.split('=')[1];
      
      const res = await fetch(`/api/workflows/trigger?boardId=${boardId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        const screenType = data.result?.screenType || 'Unknown';
        const stepIndex = (data.result?.stepIndex || 0) + 1;
        
        return { success: true, screenType, stepIndex };
      } else {
        const errorMsg = data.error?.message || 'Failed to update board';
        alert(`❌ Error: ${errorMsg}`);
        return { success: false };
      }
    } catch (error) {
      alert(`❌ Network error: ${error.message}`);
      return { success: false };
    } finally {
      setTriggerLoading(null);
    }
  };

  const startAutoScheduler = (boardId) => {
    console.log('🚀 Starting auto scheduler for board:', boardId);
    
    if (schedulerRefs.current[boardId]) {
      console.log('⚠️ Scheduler already running');
      return;
    }
    
    const boardWorkflow = workflows.find(w => w.boardId === boardId);
    console.log('📋 Found workflow:', boardWorkflow);
    
    if (!boardWorkflow || !boardWorkflow.steps || boardWorkflow.steps.length === 0) {
      alert('No workflow configured for this board!');
      return;
    }

    // Mark as running immediately in ref (not state)
    schedulerRefs.current[boardId] = true;
    setRunningSchedulers(prev => ({ ...prev, [boardId]: true }));
    
    let currentStepIndex = 0;
    
    const runNextStep = async () => {
      console.log(`🔄 Running step ${currentStepIndex + 1}/${boardWorkflow.steps.length}`);
      
      // Check ref instead of state
      if (!schedulerRefs.current[boardId]) {
        console.log('⏹️ Scheduler stopped');
        return;
      }
      
      const result = await handleTrigger(boardId);
      console.log('📊 Trigger result:', result);
      
      if (result.success) {
        const currentStep = boardWorkflow.steps[currentStepIndex];
        currentStepIndex = (currentStepIndex + 1) % boardWorkflow.steps.length;
        
        // Always wait the full display time - even if content unchanged (304)
        // People need time to read the screen!
        const delayMs = (currentStep?.displaySeconds || 15) * 1000;
        
        console.log(`⏰ Next update in ${delayMs/1000} seconds`);
        
        schedulerRefs.current[boardId] = setTimeout(runNextStep, delayMs);
      } else {
        console.error('❌ Trigger failed, stopping scheduler');
        stopAutoScheduler(boardId);
      }
    };
    
    runNextStep();
  };

  const stopAutoScheduler = (boardId) => {
    if (schedulerRefs.current[boardId]) {
      clearTimeout(schedulerRefs.current[boardId]);
      delete schedulerRefs.current[boardId];
    }
    setRunningSchedulers(prev => {
      const newState = { ...prev };
      delete newState[boardId];
      return newState;
    });
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      Object.keys(schedulerRefs.current).forEach(boardId => {
        clearTimeout(schedulerRefs.current[boardId]);
      });
    };
  }, []);

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-900 mb-2">� Automatic Scheduler</h4>
        <p className="text-sm text-blue-800">
          Click "▶️ Start Auto" to automatically cycle through your workflow steps. Each screen displays for its configured duration (e.g., 15 seconds), then automatically advances to the next screen. Click "⏹️ Stop" to pause.
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Registered Boards</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ Add Board'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h4 className="font-semibold mb-4">Add New Board</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field" placeholder="Board Name (e.g., Office Lobby)" required />
            <input type="text" value={form.locationLabel} onChange={(e) => setForm({ ...form, locationLabel: e.target.value })}
              className="input-field" placeholder="Location (optional)" />
            <input type="text" value={form.vestaboardWriteKey} onChange={(e) => setForm({ ...form, vestaboardWriteKey: e.target.value })}
              className="input-field" placeholder="Vestaboard Read/Write API Key" required />
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Adding...' : 'Add Board'}
            </button>
          </form>
        </div>
      )}

      {boards.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">📺</div>
          <p className="text-gray-600">No boards registered yet</p>
          <p className="text-sm text-gray-500 mt-2">Click "Add Board" to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {boards.map((board) => {
            const boardWorkflows = workflows.filter(w => w.boardId === board.boardId);
            const hasWorkflow = boardWorkflows.length > 0;
            
            return (
              <div key={board.boardId} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-lg">{board.name}</h4>
                    {board.locationLabel && <p className="text-sm text-gray-600">{board.locationLabel}</p>}
                    <p className="text-xs text-gray-500 mt-1">ID: {board.boardId}</p>
                    {hasWorkflow ? (
                      <p className="text-xs text-green-600 mt-1">✅ {boardWorkflows.length} workflow(s) configured</p>
                    ) : (
                      <p className="text-xs text-yellow-600 mt-1">⚠️ No workflow - create one in the Workflows tab</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {runningSchedulers[board.boardId] ? (
                      <button onClick={() => stopAutoScheduler(board.boardId)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                        ⏹️ Stop Auto
                      </button>
                    ) : (
                      <button onClick={() => startAutoScheduler(board.boardId)} disabled={!hasWorkflow}
                        className={`px-3 py-1 rounded text-sm ${
                          !hasWorkflow 
                            ? 'bg-gray-400 text-white cursor-not-allowed' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                        title={!hasWorkflow ? 'Create a workflow first' : 'Start automatic cycling'}>
                        ▶️ Start Auto
                      </button>
                    )}
                    <button onClick={() => handleDelete(board.boardId)}
                      className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const WorkflowsTab = ({ workflows, boards, fetchData }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ boardId: '', name: '', steps: [{ screenType: 'BIRTHDAY', displaySeconds: 15 }] });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const workflowData = {
        ...form,
        steps: form.steps.map((step, idx) => ({ ...step, order: idx, isEnabled: true }))
      };
      
      console.log('Creating workflow with data:', workflowData);
      
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(workflowData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert('✅ Workflow created successfully!');
        setForm({ boardId: '', name: '', steps: [{ screenType: 'BIRTHDAY', displaySeconds: 15 }] });
        setShowForm(false);
        fetchData();
      } else {
        alert(`❌ Failed to create workflow:\n\n${data.error?.message}\n\nDetails: ${JSON.stringify(data.error?.details || {})}`);
      }
    } catch (error) {
      console.error('Failed to create workflow:', error);
      alert(`❌ Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this workflow?')) return;
    try {
      const res = await fetch(`/api/workflows?id=${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const addStep = () => {
    setForm({ ...form, steps: [...form.steps, { screenType: 'BIRTHDAY', displaySeconds: 15 }] });
  };

  const removeStep = (idx) => {
    setForm({ ...form, steps: form.steps.filter((_, i) => i !== idx) });
  };

  const updateStep = (idx, field, value) => {
    const newSteps = [...form.steps];
    newSteps[idx][field] = value;
    setForm({ ...form, steps: newSteps });
  };

  const screenTypes = [
    { value: 'BIRTHDAY', label: '🎂 Birthday' },
    { value: 'CHECKRIDES', label: '✈️ Checkrides' },
    { value: 'UPCOMING_EVENTS', label: '📅 Events' },
    { value: 'NEWEST_PILOT', label: '🎓 Newest Pilot' },
    { value: 'EMPLOYEE_RECOGNITION', label: '⭐ Recognition' },
    { value: 'WEATHER', label: '🌤️ Weather' },
    { value: 'METAR', label: '🛩️ METAR' }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Workflows</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" disabled={boards.length === 0}>
          {showForm ? 'Cancel' : '+ Create Workflow'}
        </button>
      </div>

      {boards.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">⚠️ You need to add a board first before creating workflows</p>
        </div>
      )}

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h4 className="font-semibold mb-4">Create New Workflow</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <select value={form.boardId} onChange={(e) => setForm({ ...form, boardId: e.target.value })} className="input-field" required>
              <option value="">Select Board</option>
              {boards.map(b => <option key={b.boardId} value={b.boardId}>{b.name}</option>)}
            </select>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field" placeholder="Workflow Name" required />
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="font-medium">Screen Steps</label>
                <button type="button" onClick={addStep} className="text-sm text-blue-600 hover:text-blue-800">+ Add Step</button>
              </div>
              {form.steps.map((step, idx) => (
                <div key={idx} className="flex space-x-2 mb-2">
                  <select value={step.screenType} onChange={(e) => updateStep(idx, 'screenType', e.target.value)} className="input-field flex-1">
                    {screenTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input type="number" value={step.displaySeconds} onChange={(e) => updateStep(idx, 'displaySeconds', parseInt(e.target.value))}
                    className="input-field w-24" min="5" max="300" />
                  <button type="button" onClick={() => removeStep(idx)} className="text-red-600 hover:text-red-800">✕</button>
                </div>
              ))}
            </div>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating...' : 'Create Workflow'}</button>
          </form>
        </div>
      )}

      {workflows.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">�</div>
          <p className="text-gray-600">No workflows created yet</p>
          <p className="text-sm text-gray-500 mt-2">Create a workflow to automate your board updates</p>
        </div>
      ) : (
        <div className="space-y-4">
          {workflows.map((workflow) => (
            <div key={workflow.workflowId} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-lg">{workflow.name}</h4>
                  <p className="text-sm text-gray-600">{workflow.steps.filter(s => s.isEnabled).length} steps</p>
                </div>
                <button onClick={() => handleDelete(workflow.workflowId)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
              </div>
              <div className="space-y-1">
                {workflow.steps
                  .filter(s => s.isEnabled)
                  .sort((a, b) => a.order - b.order)
                  .map((step, idx) => (
                  <div key={idx} className="text-sm text-gray-700">
                    {idx + 1}. {screenTypes.find(t => t.value === step.screenType)?.label || step.screenType} ({step.displaySeconds}s)
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Workflows;
