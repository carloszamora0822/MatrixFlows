import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/layout/Layout';
import MiniVestaboard from '../components/MiniVestaboard';

const Workflows = () => {
  const [boards, setBoards] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [activeTab, setActiveTab] = useState('workflows'); // 'workflows', 'custom-screens', or 'boards'

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

  // Auto-select first board if only one exists
  useEffect(() => {
    if (boards.length === 1 && !selectedBoard) {
      setSelectedBoard(boards[0]);
    }
  }, [boards, selectedBoard]);

  const currentBoard = selectedBoard || boards[0];
  const assignedWorkflow = currentBoard ? workflows.find(w => w.workflowId === currentBoard.defaultWorkflowId) : null;
  const isSingleBoard = boards.length === 1;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">

        {/* Tabs - Always show */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('workflows')}
                disabled={!currentBoard}
                className={`${
                  activeTab === 'workflows'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } ${!currentBoard ? 'opacity-50 cursor-not-allowed' : ''} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                🔄 Workflows
              </button>
              <button
                onClick={() => setActiveTab('custom-screens')}
                disabled={!currentBoard}
                className={`${
                  activeTab === 'custom-screens'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } ${!currentBoard ? 'opacity-50 cursor-not-allowed' : ''} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                🎨 Custom Screens
              </button>
              <button
                onClick={() => setActiveTab('boards')}
                className={`${
                  activeTab === 'boards'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                📺 Vestaboard Setup
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto">
          {activeTab === 'workflows' ? (
            currentBoard ? (
              <WorkflowsTab 
                workflows={workflows}
                boards={boards}
                fetchData={fetchData}
                selectedBoard={selectedBoard}
              />
            ) : (
              <div className="text-center py-20 bg-white rounded-lg shadow">
                <div className="text-6xl mb-4">📺</div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-2">Select a Board</h3>
                <p className="text-gray-500 mb-6">Choose a board above to manage workflows</p>
                <button 
                  onClick={() => setActiveTab('boards')}
                  className="btn-primary"
                >
                  Go to Vestaboard Setup
                </button>
              </div>
            )
          ) : activeTab === 'custom-screens' ? (
            currentBoard ? (
              <CustomScreensTab 
                boards={boards}
                selectedBoard={selectedBoard}
              />
            ) : (
              <div className="text-center py-20 bg-white rounded-lg shadow">
                <div className="text-6xl mb-4">📺</div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-2">Select a Board</h3>
                <p className="text-gray-500 mb-6">Choose a board above to create custom screens</p>
                <button 
                  onClick={() => setActiveTab('boards')}
                  className="btn-primary"
                >
                  Go to Vestaboard Setup
                </button>
              </div>
            )
          ) : (
            <BoardsTab 
              boards={boards}
              workflows={workflows}
              fetchData={fetchData}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

const BoardsTab = ({ boards, workflows, fetchData }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', locationLabel: '', vestaboardWriteKey: '', defaultWorkflowId: '' });
  const [loading, setLoading] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(null);
  const [runningSchedulers, setRunningSchedulers] = useState({});
  const [editingBoard, setEditingBoard] = useState(null);
  const schedulerRefs = React.useRef({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingBoard ? `/api/boards?id=${editingBoard}` : '/api/boards';
      const method = editingBoard ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      if (res.ok) {
        alert(editingBoard ? '✅ Board updated successfully!' : '✅ Board added successfully!');
        setForm({ name: '', locationLabel: '', vestaboardWriteKey: '', defaultWorkflowId: '' });
        setEditingBoard(null);
        setShowForm(false);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to save board:', error);
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
    
    const board = boards.find(b => b.boardId === boardId);
    if (!board || !board.defaultWorkflowId) {
      alert('No workflow assigned to this board! Edit the board to assign a workflow.');
      return;
    }
    
    const boardWorkflow = workflows.find(w => w.workflowId === board.defaultWorkflowId);
    console.log('📋 Found workflow:', boardWorkflow);
    
    if (!boardWorkflow || !boardWorkflow.steps || boardWorkflow.steps.length === 0) {
      alert('Workflow not found or has no steps!');
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
      
      const startTime = Date.now();
      const result = await handleTrigger(boardId);
      const apiDuration = Date.now() - startTime;
      
      console.log('📊 Trigger result:', result, `(took ${apiDuration}ms)`);
      
      if (result.success) {
        const currentStep = boardWorkflow.steps[currentStepIndex];
        currentStepIndex = (currentStepIndex + 1) % boardWorkflow.steps.length;
        
        // Wait for display time MINUS the API call duration
        // So total time = exactly displaySeconds
        const displayMs = (currentStep?.displaySeconds || 15) * 1000;
        const remainingMs = Math.max(100, displayMs - apiDuration);
        
        console.log(`⏰ Display time: ${displayMs}ms, API took: ${apiDuration}ms, waiting: ${remainingMs}ms`);
        
        schedulerRefs.current[boardId] = setTimeout(runNextStep, remainingMs);
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

  const handleToggleActive = async (boardId, currentStatus) => {
    try {
      const res = await fetch(`/api/boards?id=${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      
      if (res.ok) {
        fetchData(); // Refresh board list
      }
    } catch (error) {
      console.error('Failed to toggle board status:', error);
      alert('Failed to update board status');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Registered Boards</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ Add Board'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg mb-6 shadow-lg border border-gray-200">
          <h4 className="font-semibold mb-4 text-blue-600">{editingBoard ? '✏️ Edit Board' : 'Add New Board'}</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field" placeholder="Board Name (e.g., Office Lobby)" required />
            <input type="text" value={form.locationLabel} onChange={(e) => setForm({ ...form, locationLabel: e.target.value })}
              className="input-field" placeholder="Location (optional)" />
            <input type="text" value={form.vestaboardWriteKey} onChange={(e) => setForm({ ...form, vestaboardWriteKey: e.target.value })}
              className="input-field" placeholder="Vestaboard Read/Write API Key" required />
            <div>
              <label className="font-medium text-gray-700 block mb-2">Assigned Workflow</label>
              <select value={form.defaultWorkflowId} onChange={(e) => setForm({ ...form, defaultWorkflowId: e.target.value })}
                className="input-field">
                <option value="">No workflow (assign later)</option>
                {workflows.map(w => <option key={w.workflowId} value={w.workflowId}>{w.name}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">💡 You can assign the same workflow to multiple boards!</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (editingBoard ? 'Updating...' : 'Adding...') : (editingBoard ? '💾 Update Board' : 'Add Board')}
            </button>
          </form>
        </div>
      )}

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
                      <span className={`text-xs font-semibold ${board.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                        {board.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleToggleActive(board.boardId, board.isActive)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          board.isActive ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                        title={board.isActive ? 'Click to deactivate board' : 'Click to activate board'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            board.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <button 
                      onClick={async () => {
                        if (!assignedWorkflow) {
                          alert('No workflow assigned to this board');
                          return;
                        }
                        const result = await handleTrigger(board.boardId);
                        if (result.success) {
                          alert(`✅ Board updated!\nScreen: ${result.screenType}\nStep: ${result.stepIndex}`);
                        }
                      }}
                      disabled={triggerLoading === board.boardId || !assignedWorkflow}
                      className={`px-3 py-1 rounded text-sm font-semibold ${
                        !assignedWorkflow 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                      title={!assignedWorkflow ? 'Assign a workflow first' : 'Trigger board update now'}
                    >
                      {triggerLoading === board.boardId ? '⏳' : '🚀 Trigger'}
                    </button>
                    
                    <button onClick={() => {
                      setEditingBoard(board.boardId);
                      setForm({
                        name: board.name,
                        locationLabel: board.locationLabel || '',
                        vestaboardWriteKey: board.vestaboardWriteKey,
                        defaultWorkflowId: board.defaultWorkflowId || ''
                      });
                      setShowForm(true);
                    }} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
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
  );
};

const WorkflowsTab = ({ workflows, boards, fetchData, selectedBoard }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingWorkflowId, setEditingWorkflowId] = useState(null);
  const [stepDurations, setStepDurations] = useState({});
  const [stepUnits, setStepUnits] = useState({}); // Track units for each step
  const [savedScreens, setSavedScreens] = useState([]);
  
  const [form, setForm] = useState({ 
    name: '', 
    steps: [], // Start empty - user will add steps via Edit Flow interface
    schedule: {
      type: 'always',
      startTimeLocal: '00:00',
      endTimeLocal: '23:59',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
      updateIntervalMinutes: 30 // Default 30 minutes
    }
  });
  const [loading, setLoading] = useState(false);
  const [triggeringNow, setTriggeringNow] = useState(false);

  // Fetch saved screens
  useEffect(() => {
    const fetchSavedScreens = async () => {
      try {
        const response = await fetch('/api/custom-screens', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          console.log('📚 Fetched saved screens:', data);
          console.log('📚 First screen has matrix:', data[0]?.matrix ? 'YES' : 'NO');
          setSavedScreens(data);
        }
      } catch (error) {
        console.error('Failed to fetch saved screens:', error);
      }
    };
    fetchSavedScreens();
  }, []);

  const handleSubmit = async (e, triggerNow = false) => {
    e.preventDefault();
    setLoading(true);
    if (triggerNow) setTriggeringNow(true);
    
    try {
      let workflowData;
      
      if (editingId) {
        // When editing: only update name and schedule, keep existing steps
        const existingWorkflow = workflows.find(w => w.workflowId === editingId);
        workflowData = {
          name: form.name,
          schedule: form.schedule,
          steps: existingWorkflow.steps // Keep existing steps!
        };
      } else {
        // When creating: include steps
        workflowData = {
          ...form,
          steps: form.steps.map((step, idx) => ({ ...step, order: idx, isEnabled: true }))
        };
      }
      
      console.log(editingId ? 'Updating' : 'Creating', 'workflow with data:', workflowData);
      
      const url = editingId ? `/api/workflows?id=${editingId}` : '/api/workflows';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(workflowData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        const workflowId = editingId || data.workflowId;
        let successMessage = editingId 
          ? '✅ Workflow settings updated!' 
          : '✅ Workflow created!';
        
        // 🚀 TRIGGER NOW: If requested, immediately update all boards using this workflow
        if (triggerNow) {
          console.log('🚀 Triggering workflow immediately...');
          console.log('Workflow ID:', workflowId);
          console.log('All boards:', boards);
          
          // Refresh boards to get latest data
          await fetchData();
          const latestBoards = (await fetch('/api/boards', { credentials: 'include' })).json ? await (await fetch('/api/boards', { credentials: 'include' })).json() : boards;
          
          // Find all boards using this workflow
          const boardsUsingWorkflow = latestBoards.filter(b => b.defaultWorkflowId === workflowId);
          console.log('Boards using workflow:', boardsUsingWorkflow);
          
          if (boardsUsingWorkflow.length === 0) {
            successMessage += '\n\n⚠️ No boards assigned to this workflow yet. Assign it to a board in the Vestaboard Setup tab.';
          } else {
            let triggeredCount = 0;
            for (const board of boardsUsingWorkflow) {
              try {
                console.log(`Triggering board: ${board.name} (${board.boardId})`);
                const triggerRes = await fetch(`/api/workflows/trigger?boardId=${board.boardId}`, {
                  method: 'POST',
                  credentials: 'include'
                });
                
                console.log('Trigger response status:', triggerRes.status);
                const triggerData = await triggerRes.json();
                console.log('Trigger response data:', triggerData);
                
                if (triggerRes.ok) {
                  console.log(`✅ Triggered board: ${board.name}`);
                  triggeredCount++;
                } else {
                  console.error(`❌ Failed to trigger board: ${board.name}`, triggerData);
                  alert(`❌ Failed to trigger ${board.name}: ${triggerData.error?.message || 'Unknown error'}`);
                }
              } catch (triggerError) {
                console.error(`❌ Trigger error for board ${board.name}:`, triggerError);
                alert(`❌ Trigger error for ${board.name}: ${triggerError.message}`);
              }
            }
            
            successMessage += `\n\n🚀 Triggered ${triggeredCount}/${boardsUsingWorkflow.length} board(s) immediately!`;
          }
        }
        
        alert(successMessage);
        setForm({ 
          name: '', 
          steps: [],
          schedule: {
            type: 'always',
            startTimeLocal: '00:00',
            endTimeLocal: '23:59',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            updateIntervalMinutes: 30
          }
        });
        setEditingId(null);
        setShowForm(false);
        await fetchData();
      } else {
        alert(`❌ Failed:\n\n${data.error?.message}\n\nDetails: ${JSON.stringify(data.error?.details || {})}`);
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert(`❌ Network error: ${error.message}`);
    } finally {
      setLoading(false);
      setTriggeringNow(false);
    }
  };

  const handleEdit = (workflow) => {
    setEditingId(workflow.workflowId);
    setForm({
      name: workflow.name,
      steps: [], // No steps in edit form anymore!
      schedule: workflow.schedule || {
        type: 'always',
        startTimeLocal: '08:00',
        endTimeLocal: '18:00',
        daysOfWeek: [1, 2, 3, 4, 5]
      }
    });
    setShowForm(true);
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

  const convertToSeconds = (value, unit) => {
    if (unit === 'minutes') return value * 60;
    if (unit === 'hours') return value * 3600;
    return value; // seconds
  };

  const addCustomScreenToWorkflow = async (screen, workflowId) => {
    try {
      const workflow = workflows.find(w => w.workflowId === workflowId);
      if (!workflow) {
        alert('❌ Workflow not found');
        return;
      }

      console.log('📝 Adding custom screen:', screen);
      console.log('📝 Screen has matrix:', !!screen.matrix);
      console.log('📝 Matrix is array:', Array.isArray(screen.matrix));
      console.log('📝 Matrix length:', screen.matrix?.length);
      console.log('📝 Screen object keys:', Object.keys(screen));

      // Add the custom screen as a new step
      const newStep = {
        screenType: 'CUSTOM_MESSAGE',
        screenConfig: {
          name: screen.name, // Store the name for display
          message: screen.message,
          matrix: screen.matrix,
          borderColor1: screen.borderColor1,
          borderColor2: screen.borderColor2
        },
        displaySeconds: 20,
        displayValue: 20,
        displayUnit: 'seconds',
        isEnabled: true,
        order: workflow.steps.length
      };

      console.log('📝 New step being added:', JSON.stringify(newStep.screenConfig, null, 2));

      const updatedSteps = [...workflow.steps, newStep];

      // Update the workflow with all required fields
      const response = await fetch(`/api/workflows?id=${workflowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: workflow.name,
          steps: updatedSteps,
          schedule: workflow.schedule || {
            type: 'always',
            startTimeLocal: '00:00',
            endTimeLocal: '23:59',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
          }
        })
      });

      if (response.ok) {
        console.log(`✅ "${screen.name}" added to workflow!`);
        fetchData();
      } else {
        const error = await response.json();
        console.error('Add screen error:', error);
        alert(`❌ Failed: ${error.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('❌ Network error occurred');
    }
  };

  const convertFromSeconds = (seconds) => {
    if (seconds >= 3600 && seconds % 3600 === 0) {
      return { value: seconds / 3600, unit: 'hours' };
    }
    if (seconds >= 60 && seconds % 60 === 0) {
      return { value: seconds / 60, unit: 'minutes' };
    }
    return { value: seconds, unit: 'seconds' };
  };

  const addStep = () => {
    setForm({ ...form, steps: [...form.steps, { screenType: 'BIRTHDAY', displaySeconds: 15, displayValue: 15, displayUnit: 'seconds' }] });
  };

  const removeStep = (idx) => {
    setForm({ ...form, steps: form.steps.filter((_, i) => i !== idx) });
  };

  const updateStep = (idx, field, value) => {
    const newSteps = [...form.steps];
    newSteps[idx][field] = value;
    
    // Recalculate displaySeconds when value or unit changes
    if (field === 'displayValue' || field === 'displayUnit') {
      const displayValue = field === 'displayValue' ? value : newSteps[idx].displayValue;
      const displayUnit = field === 'displayUnit' ? value : newSteps[idx].displayUnit;
      newSteps[idx].displaySeconds = convertToSeconds(displayValue, displayUnit);
    }
    
    setForm({ ...form, steps: newSteps });
  };

  const handleDragStart = (e, idx) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idx);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    const dragIdx = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (dragIdx === dropIdx) return;
    
    const newSteps = [...form.steps];
    const [removed] = newSteps.splice(dragIdx, 1);
    newSteps.splice(dropIdx, 0, removed);
    
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
        <h3 className="text-lg font-semibold text-gray-800">Workflows</h3>
        <button onClick={() => {
          if (showForm) {
            setShowForm(false);
            setEditingId(null);
          } else {
            setShowForm(true);
          }
        }} className="btn-primary" disabled={boards.length === 0}>
          {showForm ? 'Cancel' : '+ Create Workflow'}
        </button>
      </div>

      {boards.length === 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">⚠️ You need to add a board first before creating workflows</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-lg mb-6 border-4 border-blue-500 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-2xl text-blue-600">
              {editingId ? '⚙️ Edit Workflow Settings' : '➕ Create New Workflow'}
            </h4>
            <button 
              type="button" 
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm({
                  name: '',
                  steps: [], // Reset to empty
                  schedule: { type: 'always', startTimeLocal: '00:00', endTimeLocal: '23:59', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], updateIntervalMinutes: 30 }
                });
              }}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Workflow Name</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg font-semibold" 
                placeholder="e.g., Morning Rotation, Weekend Display" 
                required 
              />
              <p className="text-sm text-gray-600 mt-2">
                💡 Assign this workflow to one or more boards in the Boards tab
              </p>
            </div>

            <div>
              <label className="font-medium block mb-2 text-gray-700">Schedule</label>
              <select value={form.schedule.type} onChange={(e) => setForm({...form, schedule: {...form.schedule, type: e.target.value}})} className="input-field mb-4">
                <option value="always">Always Running (24/7)</option>
                <option value="dailyWindow">Daily Time Window</option>
              </select>

              {form.schedule.type === 'dailyWindow' && (
                <>
                  <div className="flex space-x-2 mb-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <input type="time" value={form.schedule.startTimeLocal} 
                        onChange={(e) => setForm({...form, schedule: {...form.schedule, startTimeLocal: e.target.value}})}
                        className="input-field w-full" />
                    </div>
                    <div className="flex items-end pb-2">
                      <span className="text-gray-600">→</span>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                      <input type="time" value={form.schedule.endTimeLocal}
                        onChange={(e) => setForm({...form, schedule: {...form.schedule, endTimeLocal: e.target.value}})}
                        className="input-field w-full" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Active Days</label>
                    <div className="flex flex-wrap gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                        <label key={idx} className={`flex items-center space-x-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${form.schedule.daysOfWeek.includes(idx) ? 'bg-blue-100 border-blue-500 text-blue-900' : 'bg-gray-50 border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                          <input type="checkbox" 
                            checked={form.schedule.daysOfWeek.includes(idx)}
                            onChange={(e) => {
                              const newDays = e.target.checked 
                                ? [...form.schedule.daysOfWeek, idx]
                                : form.schedule.daysOfWeek.filter(d => d !== idx);
                              setForm({...form, schedule: {...form.schedule, daysOfWeek: newDays}});
                            }}
                            className="rounded" />
                          <span className="text-sm font-semibold">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Update Interval - Always enabled */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-4">
                <label className="block font-semibold text-purple-900 mb-3">⏱️ Update Interval (Time-Aligned Triggers)</label>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Trigger every:</label>
                    <input 
                      type="number" 
                      value={form.schedule.updateIntervalMinutes || 30}
                      onChange={(e) => setForm({...form, schedule: {...form.schedule, updateIntervalMinutes: parseInt(e.target.value) || 30}})}
                      min="1"
                      max="1440"
                      className="input-field w-24 text-center font-bold text-lg"
                      required
                    />
                    <span className="text-sm font-semibold text-gray-700">minutes</span>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <p className="text-sm text-purple-900 font-semibold mb-2">📍 How it works:</p>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Triggers at <strong>aligned clock times</strong> (e.g., 8:30, 9:00, 9:30...)</li>
                      <li>• <strong>Not</strong> "X minutes after last run" - always synced to the clock</li>
                      {form.schedule.type === 'dailyWindow' && (
                        <li>• Only runs between {form.schedule.startTimeLocal || '00:00'} - {form.schedule.endTimeLocal || '23:59'}</li>
                      )}
                      <li>• Example: 30 min interval → runs at :00 and :30 each hour</li>
                    </ul>
                  </div>

                  {form.schedule.updateIntervalMinutes && (
                    <div className="bg-green-50 border border-green-300 rounded-lg p-3">
                      <p className="text-sm font-semibold text-green-900 mb-1">🎯 Trigger Times {form.schedule.type === 'dailyWindow' ? 'Today' : '(24/7)'}:</p>
                      <p className="text-xs text-green-800 font-mono">
                        {(() => {
                          const startTime = form.schedule.type === 'dailyWindow' ? (form.schedule.startTimeLocal || '00:00') : '00:00';
                          const endTime = form.schedule.type === 'dailyWindow' ? (form.schedule.endTimeLocal || '23:59') : '23:59';
                          const [startHour, startMin] = startTime.split(':').map(Number);
                          const [endHour, endMin] = endTime.split(':').map(Number);
                          const interval = form.schedule.updateIntervalMinutes || 30;
                          
                          const times = [];
                          let currentMin = Math.floor(startMin / interval) * interval;
                          let currentHour = startHour;
                          
                          if (currentMin < startMin) {
                            currentMin += interval;
                            if (currentMin >= 60) {
                              currentMin -= 60;
                              currentHour++;
                            }
                          }
                          
                          while (currentHour < endHour || (currentHour === endHour && currentMin <= endMin)) {
                            const h = currentHour % 12 || 12;
                            const ampm = currentHour < 12 ? 'AM' : 'PM';
                            times.push(`${h}:${currentMin.toString().padStart(2, '0')}${ampm}`);
                            
                            currentMin += interval;
                            if (currentMin >= 60) {
                              currentMin -= 60;
                              currentHour++;
                            }
                            
                            if (times.length > 20) {
                              times.push('...');
                              break;
                            }
                          }
                          
                          return times.join(', ');
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!editingId && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-blue-900 font-semibold">📋 What happens next:</p>
                <ol className="list-decimal list-inside text-blue-800 mt-2 space-y-1">
                  <li>Click "Create Workflow" to save basic settings</li>
                  <li>Then click "⚡ Edit Flow" to add and arrange your screens</li>
                  <li>Drag screens to reorder, adjust timing, and save</li>
                </ol>
              </div>
            )}

            <div className="flex justify-between items-center">
              <button 
                type="button" 
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm({
                    name: '',
                    steps: [],
                    schedule: { type: 'always', startTimeLocal: '00:00', endTimeLocal: '23:59', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], updateIntervalMinutes: 30 }
                  });
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
              
              <div className="flex space-x-3">
                <button 
                  type="submit" 
                  disabled={loading || triggeringNow} 
                  className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {loading && !triggeringNow ? (editingId ? 'Saving...' : 'Saving...') : (editingId ? '💾 Save' : '💾 Save')}
                </button>
                
                <button 
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={loading || triggeringNow} 
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {triggeringNow ? '🚀 Triggering...' : (editingId ? '� Save & Trigger Now' : '🚀 Save & Trigger Now')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {workflows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-gray-200 shadow">
          <div className="text-6xl mb-4">🔄</div>
          <p className="text-gray-700">No workflows created yet</p>
          <p className="text-sm text-gray-500 mt-2">Create a workflow to automate your board updates</p>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl mx-auto">
          {workflows.map((workflow) => {
            const enabledSteps = workflow.steps.filter(s => s.isEnabled).sort((a, b) => a.order - b.order);
            const totalSeconds = enabledSteps.reduce((sum, s) => sum + (s.displaySeconds || 0), 0);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
            
            const schedule = workflow.schedule || { type: 'always' };
            let scheduleStr = '24/7';
            let isActive = false;
            
            // Check if this is a pinned workflow
            const isPinnedWorkflow = workflow.name?.startsWith('Pinned -');
            
            // Check if there's ANY active pinned workflow (blocks all others)
            const hasActivePinnedWorkflow = workflows.some(w => 
              w.name?.startsWith('Pinned -') && 
              w.schedule?.type === 'specificDateRange' &&
              w.isActive
            );
            
            if (schedule.type === 'dailyWindow') {
              const days = schedule.daysOfWeek?.length === 7 ? 'Daily' : 
                           schedule.daysOfWeek?.length === 5 && schedule.daysOfWeek.includes(1) ? 'Weekdays' :
                           `${schedule.daysOfWeek?.length || 0} days`;
              scheduleStr = `${days} ${schedule.startTimeLocal || '00:00'} - ${schedule.endTimeLocal || '23:59'}`;
              
              // Check if current time falls within schedule
              const now = new Date();
              const currentDay = now.getDay();
              const currentTime = now.toTimeString().slice(0, 5);
              
              const isDayActive = schedule.daysOfWeek?.includes(currentDay);
              const isTimeActive = currentTime >= (schedule.startTimeLocal || '00:00') && 
                                   currentTime <= (schedule.endTimeLocal || '23:59');
              
              // Regular workflows are active if schedule matches AND no pin is blocking
              isActive = !isPinnedWorkflow && isDayActive && isTimeActive && !hasActivePinnedWorkflow;
            } else if (schedule.type === 'specificDateRange') {
              const now = new Date();
              const currentDate = now.toISOString().split('T')[0];
              const currentTime = now.toTimeString().slice(0, 5);
              
              isActive = isPinnedWorkflow &&
                        schedule.startDate <= currentDate &&
                        schedule.endDate >= currentDate &&
                        (!schedule.startTimeLocal || currentTime >= schedule.startTimeLocal) &&
                        (!schedule.endTimeLocal || currentTime <= schedule.endTimeLocal);
              
              scheduleStr = `${schedule.startDate} - ${schedule.endDate}`;
            } else {
              // Always running, but blocked if pinned workflow exists
              isActive = !hasActivePinnedWorkflow;
            }
            
            return (
              <div key={workflow.workflowId} className={`bg-white rounded-lg border-4 shadow-lg p-6 ${isActive ? 'border-green-500 bg-green-50' : 'border-gray-200'} relative`}>
                {/* Active Badge */}
                {isActive && (
                  <div className="absolute -top-3 -right-3 px-3 py-1 bg-green-500 text-white font-bold text-xs rounded-full shadow-lg animate-pulse">
                    ✓ ACTIVE NOW
                  </div>
                )}
                
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-xl text-gray-900">{workflow.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {enabledSteps.length} steps • {timeStr} cycle • 📅 {scheduleStr}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {editingWorkflowId === workflow.workflowId ? (
                      <>
                        <button 
                          onClick={async () => {
                            // Save reordered workflow with updated durations
                            const reorderedSteps = enabledSteps.map((step, idx) => ({
                              ...step,
                              order: idx,
                              displaySeconds: stepDurations[`${workflow.workflowId}-${idx}`] || step.displaySeconds
                            }));
                            
                            try {
                              const res = await fetch(`/api/workflows?id=${workflow.workflowId}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({
                                  name: workflow.name,
                                  steps: reorderedSteps,
                                  schedule: workflow.schedule
                                })
                              });
                              
                              if (res.ok) {
                                alert('✅ Workflow order and timing saved!');
                                setEditingWorkflowId(null);
                                setStepDurations({});
                                fetchData();
                              }
                            } catch (error) {
                              alert('❌ Failed to save');
                            }
                          }}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-semibold"
                        >
                          💾 Save
                        </button>
                        <button 
                          onClick={() => setEditingWorkflowId(null)} 
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => setEditingWorkflowId(workflow.workflowId)} 
                          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-semibold"
                        >
                          ⚡ Edit Flow
                        </button>
                        <button onClick={() => handleEdit(workflow)} className="px-3 py-1 bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 text-sm">
                          ⚙️ Settings
                        </button>
                        <button onClick={() => handleDelete(workflow.workflowId)} className="px-3 py-1 bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 text-sm">
                          🗑️ Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Mini Vestaboard Previews */}
                {editingWorkflowId === workflow.workflowId && (
                  <div className="mb-4 p-3 bg-purple-50 border-2 border-purple-400 rounded-lg">
                    <p className="text-purple-800 font-semibold">🎯 Drag and drop mode active! Grab the screens to reorder them.</p>
                  </div>
                )}

                {/* Add Saved Screens Section */}
                {editingWorkflowId === workflow.workflowId && savedScreens.length > 0 && (
                  <div className="mb-6 p-4 bg-green-50 border-2 border-green-400 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-3">➕ Add Saved Custom Screen</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {savedScreens.map((screen) => {
                        const expiresDate = new Date(screen.expiresAt);
                        const now = new Date();
                        const daysUntilExpire = Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24));
                        const expiresText = daysUntilExpire > 365 
                          ? 'Never expires' 
                          : daysUntilExpire > 1 
                            ? `Expires in ${daysUntilExpire} days`
                            : daysUntilExpire === 1 
                              ? 'Expires tomorrow'
                              : 'Expires today';
                        
                        return (
                          <button
                            key={screen.screenId}
                            onClick={() => addCustomScreenToWorkflow(screen, workflow.workflowId)}
                            className="text-left p-3 bg-white border-2 border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
                          >
                            <div className="font-semibold text-gray-900">{screen.name}</div>
                            <div className="text-xs text-gray-600 truncate mb-1">{screen.message}</div>
                            <div className="text-xs text-gray-500 italic">⏱️ {expiresText}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-4 flex flex-col items-center">
                  {enabledSteps.map((step, idx) => {
                    const screenType = screenTypes.find(t => t.value === step.screenType);
                    
                    // For custom screens, show the custom name
                    let label = screenType?.label || step.screenType;
                    if (step.screenType === 'CUSTOM_MESSAGE') {
                      // First try to get name from screenConfig (newly added screens)
                      if (step.screenConfig?.name) {
                        label = `🎨 ${step.screenConfig.name}`;
                      } else {
                        // Fall back to searching in saved screens (old screens)
                        const matchingScreen = savedScreens.find(s => 
                          s.message === step.screenConfig?.message
                        );
                        label = matchingScreen?.name ? `🎨 ${matchingScreen.name}` : '🎨 Custom Screen';
                      }
                    }
                    
                    const isEditing = editingWorkflowId === workflow.workflowId;
                    
                    return (
                      <div key={idx} className="relative flex flex-col items-center w-full">
                        <MiniVestaboard
                          screenType={step.screenType}
                          screenConfig={step.screenConfig}
                          displaySeconds={stepDurations[`${workflow.workflowId}-${idx}`] || step.displaySeconds}
                          stepNumber={idx + 1}
                          isFirst={idx === 0}
                          isLast={idx === enabledSteps.length - 1}
                          draggable={isEditing}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', idx);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                            const toIndex = idx;
                            
                            if (fromIndex !== toIndex) {
                              // Reorder steps
                              const newSteps = [...enabledSteps];
                              const [movedStep] = newSteps.splice(fromIndex, 1);
                              newSteps.splice(toIndex, 0, movedStep);
                              
                              // Update order property
                              const reorderedSteps = newSteps.map((s, i) => ({ ...s, order: i }));
                              
                              // Save to backend
                              try {
                                const response = await fetch(`/api/workflows?id=${workflow.workflowId}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({
                                    name: workflow.name,
                                    steps: reorderedSteps,
                                    schedule: workflow.schedule
                                  })
                                });
                                
                                if (response.ok) {
                                  console.log('✅ Workflow order saved');
                                  fetchData();
                                } else {
                                  alert('❌ Failed to save new order');
                                }
                              } catch (error) {
                                console.error('Failed to save order:', error);
                                alert('❌ Network error');
                              }
                            }
                          }}
                        />
                        <div className="mt-2 flex items-center justify-center gap-4 w-full">
                          <div className="text-sm font-semibold text-gray-700">{label}</div>
                          {isEditing && enabledSteps.length > 1 && (
                            <button
                              onClick={async () => {
                                const isCustomMessage = step.screenType === 'CUSTOM_MESSAGE';
                                const confirmMsg = isCustomMessage 
                                  ? `Delete this custom screen ENTIRELY from the system?`
                                  : `Delete this ${label} screen from workflow?`;
                                
                                if (window.confirm(confirmMsg)) {
                                  // If it's a custom message, try to find and delete it from the library
                                  if (isCustomMessage && step.screenConfig?.message) {
                                    try {
                                      // Find matching custom screen in library
                                      const screensRes = await fetch('/api/custom-screens', { credentials: 'include' });
                                      if (screensRes.ok) {
                                        const allScreens = await screensRes.json();
                                        const matchingScreen = allScreens.find(s => s.message === step.screenConfig.message);
                                        
                                        if (matchingScreen) {
                                          // Delete from custom screens library
                                          await fetch(`/api/custom-screens?id=${matchingScreen.screenId}`, {
                                            method: 'DELETE',
                                            credentials: 'include'
                                          });
                                          console.log('✅ Custom screen deleted from library');
                                        }
                                      }
                                    } catch (error) {
                                      console.error('Failed to delete from library:', error);
                                    }
                                  }
                                  
                                  // Remove step from workflow and reorder
                                  const newSteps = enabledSteps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i }));
                                  
                                  // Save workflow update to backend
                                  try {
                                    const response = await fetch(`/api/workflows?id=${workflow.workflowId}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      credentials: 'include',
                                      body: JSON.stringify({
                                        name: workflow.name,
                                        steps: newSteps,
                                        schedule: workflow.schedule
                                      })
                                    });
                                    
                                    if (response.ok) {
                                      console.log('✅ Screen deleted from workflow');
                                      fetchData();
                                    } else {
                                      alert('❌ Failed to delete screen');
                                    }
                                  } catch (error) {
                                    console.error('Failed to delete:', error);
                                    alert('❌ Network error');
                                  }
                                }
                              }}
                              className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 font-semibold"
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                        
                        {/* Time Display/Editor - Always show, between screens */}
                        <div className="flex justify-center my-3 w-full">
                          {(() => {
                            const stepKey = `${workflow.workflowId}-${idx}`;
                            const currentSeconds = stepDurations[stepKey] || step.displaySeconds;
                            const converted = convertFromSeconds(currentSeconds);
                            const currentUnit = stepUnits[stepKey] || converted.unit;
                            const displayValue = stepUnits[stepKey] 
                              ? (currentUnit === 'hours' ? currentSeconds / 3600 : currentUnit === 'minutes' ? currentSeconds / 60 : currentSeconds)
                              : converted.value;
                            
                            return (
                              <div className={`flex flex-col items-center space-y-2 ${isEditing ? 'bg-purple-50 border-2 border-purple-400' : 'bg-gray-50 border-2 border-gray-300'} px-4 py-2 rounded-lg`}>
                                <div className="text-xs text-gray-500 font-semibold uppercase">Delay Time</div>
                                {isEditing ? (
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="number"
                                      value={Math.round(displayValue)}
                                      onChange={(e) => {
                                        const newValue = parseInt(e.target.value) || 1;
                                        const newSeconds = convertToSeconds(newValue, currentUnit);
                                        setStepDurations({
                                          ...stepDurations,
                                          [stepKey]: newSeconds
                                        });
                                        step.displaySeconds = newSeconds;
                                      }}
                                      className="w-20 px-3 py-2 border-2 border-purple-500 rounded text-center font-bold text-lg"
                                      min="1"
                                      max="999"
                                    />
                                    <select
                                      value={currentUnit}
                                      onChange={(e) => {
                                        const newUnit = e.target.value;
                                        setStepUnits({
                                          ...stepUnits,
                                          [stepKey]: newUnit
                                        });
                                      }}
                                      className="px-3 py-2 border-2 border-purple-500 rounded font-semibold bg-white"
                                    >
                                      <option value="seconds">seconds</option>
                                      <option value="minutes">minutes</option>
                                      <option value="hours">hours</option>
                                    </select>
                                  </div>
                                ) : (
                                  <div className="text-lg font-bold text-blue-600">
                                    {Math.round(displayValue)} {currentUnit}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        
                        {idx < enabledSteps.length - 1 && (
                          <div className="flex justify-center my-2">
                            <div className="text-blue-400 text-3xl">↓</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {enabledSteps.length > 1 && (
                    <div className="flex items-center justify-center p-3 bg-green-50 border-2 border-green-400 rounded-lg">
                      <span className="text-green-600 font-semibold">🔄 Loops back to step 1</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Custom Screens Tab Component
const CustomScreensTab = ({ boards, selectedBoard }) => {
  const [formData, setFormData] = useState({
    boardId: selectedBoard?.boardId || '',
    screenName: '',
    customMessage: '',
    borderColor1: 'red',
    borderColor2: 'orange',
    hasExpiration: false,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTimeLocal: '09:00',
    endTimeLocal: '17:00'
  });

  const [previewMatrix, setPreviewMatrix] = useState(null);
  const [savedScreens, setSavedScreens] = useState([]);
  const [editingScreenId, setEditingScreenId] = useState(null);

  const colorCodeMap = {
    red: 63,
    orange: 64,
    yellow: 65,
    green: 66,
    blue: 67,
    purple: 68,
    white: 69
  };

  const colorOptions = [
    { value: 'red', label: '🔴 Red', class: 'bg-red-500' },
    { value: 'orange', label: '🟠 Orange', class: 'bg-orange-500' },
    { value: 'yellow', label: '🟡 Yellow', class: 'bg-yellow-500' },
    { value: 'green', label: '🟢 Green', class: 'bg-green-500' },
    { value: 'blue', label: '🔵 Blue', class: 'bg-blue-500' },
    { value: 'purple', label: '🟣 Purple', class: 'bg-purple-500' },
    { value: 'white', label: '⚪ White', class: 'bg-white' }
  ];

  // Color mapping for preview display
  const CHAR_COLORS = {
    0: 'bg-black',
    63: 'bg-red-500',
    64: 'bg-orange-500',
    65: 'bg-yellow-500',
    66: 'bg-green-500',
    67: 'bg-blue-500',
    68: 'bg-purple-500',
    69: 'bg-white'
  };

  const CHAR_MAP = {
    1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G', 8: 'H', 9: 'I', 10: 'J',
    11: 'K', 12: 'L', 13: 'M', 14: 'N', 15: 'O', 16: 'P', 17: 'Q', 18: 'R', 19: 'S', 20: 'T',
    21: 'U', 22: 'V', 23: 'W', 24: 'X', 25: 'Y', 26: 'Z',
    27: '1', 28: '2', 29: '3', 30: '4', 31: '5', 32: '6', 33: '7', 34: '8', 35: '9', 36: '0',
    37: '!', 59: '/', 44: '-', 56: '.', 55: ',', 50: ':'
  };

  // Fetch saved screens on mount
  useEffect(() => {
    fetchSavedScreens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSavedScreens = async () => {
    try {
      const response = await fetch('/api/custom-screens', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSavedScreens(data);
      }
    } catch (error) {
      console.error('Failed to fetch saved screens:', error);
    }
  };

  const loadScreenForEditing = (screen) => {
    setFormData({
      ...formData,
      screenName: screen.name,
      customMessage: screen.message,
      borderColor1: screen.borderColor1,
      borderColor2: screen.borderColor2,
      hasExpiration: true,
      expiresAt: new Date(screen.expiresAt).toISOString().split('T')[0]
    });
    setPreviewMatrix(screen.matrix);
    setEditingScreenId(screen.screenId);
  };

  const deleteScreen = async (screenId, screenName) => {
    if (!window.confirm(`Delete "${screenName}" ENTIRELY from the system? (Will be removed from all workflows and the library)`)) return;
    
    try {
      // First, find the screen to get its message
      const screen = savedScreens.find(s => s.screenId === screenId);
      if (!screen) {
        alert('❌ Screen not found');
        return;
      }

      // Delete from custom screens library
      const response = await fetch(`/api/custom-screens?id=${screenId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        console.log(`✅ Screen "${screenName}" deleted from library`);
        
        // Now remove from all workflows
        const workflowsRes = await fetch('/api/workflows', { credentials: 'include' });
        if (workflowsRes.ok) {
          const allWorkflows = await workflowsRes.json();
          
          for (const workflow of allWorkflows) {
            const originalLength = workflow.steps.length;
            
            // Filter out steps that match this custom screen
            const newSteps = workflow.steps.filter(step => {
              if (step.screenType === 'CUSTOM_MESSAGE' && step.screenConfig?.message === screen.message) {
                return false; // Remove this step
              }
              return true; // Keep this step
            }).map((s, i) => ({ ...s, order: i })); // Reorder
            
            // If workflow changed, update it
            if (newSteps.length < originalLength) {
              await fetch(`/api/workflows?id=${workflow.workflowId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  name: workflow.name,
                  steps: newSteps,
                  schedule: workflow.schedule
                })
              });
              console.log(`✅ Removed "${screenName}" from workflow "${workflow.name}"`);
            }
          }
        }
        
        fetchSavedScreens();
        
        // Clear form if editing this screen
        if (editingScreenId === screenId) {
          setFormData({
            ...formData,
            screenName: '',
            customMessage: '',
            borderColor1: 'red',
            borderColor2: 'orange',
            hasExpiration: false,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          });
          setPreviewMatrix(null);
          setEditingScreenId(null);
        }
        
        alert(`✅ "${screenName}" deleted from library and all workflows!`);
      } else {
        alert('❌ Failed to delete screen');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('❌ Network error');
    }
  };

  // Use backend renderer - ONE ENGINE for all previews!
  useEffect(() => {
    const generatePreview = async () => {
      if (!formData.customMessage) {
        setPreviewMatrix(null);
        return;
      }

      try {
        const response = await fetch('/api/screens/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            screenType: 'CUSTOM_MESSAGE',
            screenConfig: {
              message: formData.customMessage,
              borderColor1: formData.borderColor1,
              borderColor2: formData.borderColor2
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          setPreviewMatrix(data.matrix);
        }
      } catch (error) {
        console.error('Preview error:', error);
      }
    };

    generatePreview();
  }, [formData.customMessage, formData.borderColor1, formData.borderColor2]);

  const handleSaveScreen = async (e) => {
    e.preventDefault();
    
    if (!previewMatrix) {
      alert('Please enter a message first');
      return;
    }

    try {
      // If no expiration, set to 100 years from now (effectively never expires)
      const expirationDate = formData.hasExpiration 
        ? formData.expiresAt 
        : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const screenData = {
        name: formData.screenName,
        message: formData.customMessage,
        borderColor1: formData.borderColor1,
        borderColor2: formData.borderColor2,
        matrix: previewMatrix,
        expiresAt: expirationDate
      };

      // Check if we're updating an existing screen
      const isUpdating = !!editingScreenId;
      const url = isUpdating ? `/api/custom-screens?id=${editingScreenId}` : '/api/custom-screens';
      const method = isUpdating ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(screenData)
      });

      if (response.ok) {
        const savedData = await response.json();
        console.log(`✅ Screen ${isUpdating ? 'updated' : 'saved'}:`, savedData);
        
        // If updating, also update in all workflows
        if (isUpdating) {
          const oldScreen = savedScreens.find(s => s.screenId === editingScreenId);
          if (oldScreen) {
            const workflowsRes = await fetch('/api/workflows', { credentials: 'include' });
            if (workflowsRes.ok) {
              const allWorkflows = await workflowsRes.json();
              
              for (const workflow of allWorkflows) {
                let updated = false;
                const newSteps = workflow.steps.map(step => {
                  if (step.screenType === 'CUSTOM_MESSAGE' && 
                      step.screenConfig?.message === oldScreen.message) {
                    updated = true;
                    return {
                      ...step,
                      screenConfig: {
                        name: formData.screenName,
                        message: formData.customMessage,
                        matrix: previewMatrix,
                        borderColor1: formData.borderColor1,
                        borderColor2: formData.borderColor2
                      }
                    };
                  }
                  return step;
                });

                if (updated) {
                  await fetch(`/api/workflows?id=${workflow.workflowId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                      name: workflow.name,
                      steps: newSteps,
                      schedule: workflow.schedule
                    })
                  });
                  console.log(`✅ Updated screen in workflow "${workflow.name}"`);
                }
              }
            }
          }
        }
        
        alert(`✅ Screen "${formData.screenName}" ${isUpdating ? 'updated' : 'saved'}!`);
        // Refresh saved screens list
        await fetchSavedScreens();
        console.log('📚 Saved screens after save:', savedScreens.length);
        // Reset form
        setFormData({
          ...formData,
          screenName: '',
          customMessage: '',
          borderColor1: 'red',
          borderColor2: 'orange',
          hasExpiration: false,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        setPreviewMatrix(null);
        setEditingScreenId(null);
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error?.message || 'Failed to save screen'}`);
      }
    } catch (error) {
      alert('❌ Network error occurred');
    }
  };



  const handlePinToday = async () => {
    if (!previewMatrix) {
      alert('Please enter a message first');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    try {
      const response = await fetch('/api/pin-screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          boardId: formData.boardId || selectedBoard?.boardId,
          screenConfigs: [{
            screenType: 'CUSTOM_MESSAGE',
            screenConfig: { 
              message: formData.customMessage,
              matrix: previewMatrix 
            },
            displaySeconds: 20
          }],
          startDate: today,
          endDate: today,
          startTimeLocal: '00:00',
          endTimeLocal: '23:59'
        })
      });

      if (response.ok) {
        alert(`✅ Screen pinned for today!`);
        // Reset form
        setFormData({
          ...formData,
          screenName: '',
          customMessage: '',
          borderColor1: 'red',
          borderColor2: 'orange'
        });
        setPreviewMatrix(null);
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error?.message || 'Failed to pin screen'}`);
      }
    } catch (error) {
      alert('❌ Network error occurred');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: Form */}
      <form onSubmit={handleSaveScreen} className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Create Custom Screen</h2>
          
          {/* Screen Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Screen Name
            </label>
            <input
              type="text"
              value={formData.screenName}
              onChange={(e) => setFormData({ ...formData, screenName: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
              placeholder="ex. Event Announcement"
              required
            />
          </div>

          {/* Expiration */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasExpiration}
                onChange={(e) => setFormData({ ...formData, hasExpiration: e.target.checked })}
                className="w-5 h-5 text-orange-500 border-2 border-gray-300 rounded focus:ring-2 focus:ring-orange-200"
              />
              <span className="text-sm font-semibold text-gray-700">This screen expires?</span>
            </label>
            {formData.hasExpiration && (
              <div className="mt-3">
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Screen will be auto-deleted after this date</p>
              </div>
            )}
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Message
            </label>
            <textarea
              value={formData.customMessage}
              onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
              placeholder="ex. Event today at 10/16"
              rows="4"
              maxLength="80"
              required
            />
            <p className="text-xs text-gray-500 mt-1">{formData.customMessage.length}/80 characters • Auto-wraps to 4 lines</p>
          </div>

          {/* Border Colors */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700 w-20">Color 1:</label>
              <div className="flex gap-2">
                {colorOptions.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, borderColor1: color.value })}
                    className={`w-8 h-8 rounded ${color.class} border-2 transition-all ${
                      formData.borderColor1 === color.value 
                        ? 'border-gray-900 ring-2 ring-gray-400' 
                        : 'border-gray-300 hover:border-gray-500'
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700 w-20">Color 2:</label>
              <div className="flex gap-2">
                {colorOptions.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, borderColor2: color.value })}
                    className={`w-8 h-8 rounded ${color.class} border-2 transition-all ${
                      formData.borderColor2 === color.value 
                        ? 'border-gray-900 ring-2 ring-gray-400' 
                        : 'border-gray-300 hover:border-gray-500'
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl"
            >
              Save Screen
            </button>
            <button
              type="button"
              onClick={handlePinToday}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
            >
              Pin for Today
            </button>
          </div>
        </div>
      </form>

      {/* Right: Live Preview + Saved Screens */}
      <div className="flex flex-col space-y-6">
        {/* Live Preview */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Live Preview</h2>
          {previewMatrix ? (
            <div className="bg-gray-900 p-4 rounded-lg inline-block">
              <div className="grid grid-cols-22 gap-0.5">
                {previewMatrix.map((row, rowIdx) =>
                  row.map((cell, colIdx) => {
                    const isColorCode = cell >= 63 && cell <= 70;
                    const isTextCode = cell >= 1 && cell <= 62;
                    
                    let cellClass = 'w-[14px] h-[14px] flex items-center justify-center text-xs font-mono rounded-sm';
                    let displayChar = '';
                    
                    if (isColorCode) {
                      cellClass += ` ${CHAR_COLORS[cell]}`;
                    } else if (isTextCode) {
                      cellClass += ' bg-gray-800 text-white';
                      displayChar = CHAR_MAP[cell] || '?';
                    } else {
                      cellClass += ' bg-black';
                    }
                    
                    return (
                      <div key={`${rowIdx}-${colIdx}`} className={cellClass}>
                        {!isColorCode && (
                          <span className="font-bold text-white" style={{ fontSize: '6px' }}>
                            {displayChar}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">✍️</div>
              <p>Type a message to see preview</p>
            </div>
          )}
        </div>

        {/* Saved Screens Library */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">➕ Saved Custom Screens ({savedScreens.length})</h2>
          {savedScreens.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📚</div>
              <p>No saved screens yet. Create and save a screen above!</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[230px] border-2 border-gray-300 rounded-lg p-3">
              <div className="grid grid-cols-1 gap-4">
              {savedScreens.map((screen) => {
                const expiresDate = new Date(screen.expiresAt);
                const now = new Date();
                const daysUntilExpire = Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24));
                const expiresText = daysUntilExpire > 365 
                  ? 'Never expires' 
                  : daysUntilExpire > 1 
                    ? `Expires in ${daysUntilExpire} days`
                    : daysUntilExpire === 1 
                      ? 'Expires tomorrow'
                      : 'Expires today';
                
                return (
                  <div 
                    key={screen.screenId} 
                    className={`border-2 rounded-lg p-4 transition-all ${
                      editingScreenId === screen.screenId 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900 mb-1">{screen.name}</h3>
                    <p className="text-xs text-gray-600 truncate mb-2">{screen.message}</p>
                    <p className="text-xs text-gray-500 italic mb-3">⏱️ {expiresText}</p>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadScreenForEditing(screen)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => deleteScreen(screen.screenId, screen.name)}
                        className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Workflows;
