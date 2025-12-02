import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/layout/Layout';
import MiniVestaboard from '../components/MiniVestaboard';

const Workflows = () => {
  const [boards, setBoards] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [activeTab, setActiveTab] = useState('workflows'); // 'workflows' or 'custom-screens'

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
        {/* Single Board Layout */}
        {isSingleBoard ? (
          <div className="max-w-7xl mx-auto mb-8">
            <div className="relative">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                {currentBoard?.name || 'Vestaboard'}
              </h1>
              <div className="flex items-center space-x-4">
                {currentBoard?.locationLabel && (
                  <span className="px-4 py-2 bg-white rounded-full text-gray-700 text-sm font-semibold shadow-md">
                    📍 {currentBoard.locationLabel}
                  </span>
                )}
                {assignedWorkflow && (
                  <span className="px-4 py-2 bg-green-100 rounded-full text-green-700 text-sm font-semibold shadow-md">
                    🔄 {assignedWorkflow.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Multiple Boards Layout */
          <div className="max-w-7xl mx-auto mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Select a Board</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map(board => {
                const workflow = workflows.find(w => w.workflowId === board.defaultWorkflowId);
                const isSelected = currentBoard?.boardId === board.boardId;
                
                return (
                  <div
                    key={board.boardId}
                    onClick={() => setSelectedBoard(board)}
                    className={`p-6 rounded-xl cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-2xl scale-105 ring-4 ring-blue-300'
                        : 'bg-white hover:shadow-xl hover:scale-102 border-2 border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {board.name}
                      </h3>
                      {isSelected && <span className="text-2xl">✓</span>}
                    </div>
                    {board.locationLabel && (
                      <p className={`text-sm mb-2 ${isSelected ? 'text-blue-100' : 'text-gray-600'}`}>
                        📍 {board.locationLabel}
                      </p>
                    )}
                    {workflow ? (
                      <div className={`text-sm font-semibold ${isSelected ? 'text-green-200' : 'text-green-600'}`}>
                        🔄 {workflow.name}
                      </div>
                    ) : (
                      <div className={`text-sm ${isSelected ? 'text-yellow-200' : 'text-yellow-600'}`}>
                        ⚠️ No workflow assigned
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        {currentBoard && (
          <div className="max-w-7xl mx-auto mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('workflows')}
                  className={`${
                    activeTab === 'workflows'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  🔄 Workflows
                </button>
                <button
                  onClick={() => setActiveTab('custom-screens')}
                  className={`${
                    activeTab === 'custom-screens'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  🎨 Custom Screens
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {currentBoard ? (
          <div className="max-w-7xl mx-auto">
            {activeTab === 'workflows' ? (
              <WorkflowsTab 
                workflows={workflows}
                boards={boards}
                fetchData={fetchData}
                selectedBoard={selectedBoard}
              />
            ) : (
              <CustomScreensTab 
                boards={boards}
                selectedBoard={selectedBoard}
              />
            )}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto text-center py-20">
            <div className="text-6xl mb-4">📺</div>
            <h3 className="text-2xl font-semibold text-gray-700 mb-2">No Boards Found</h3>
            <p className="text-gray-500">Create a board to get started</p>
          </div>
        )}
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

  return (
    <div>
      <div className="bg-white border-2 border-blue-400 rounded-lg p-4 mb-6 shadow-lg">
        <h4 className="font-semibold text-blue-600 mb-2">🔄 Automatic Scheduler</h4>
        <p className="text-sm text-gray-700">
          Click "▶️ Start Auto" to automatically cycle through your workflow steps. Each screen displays for its configured duration (e.g., 15 seconds), then automatically advances to the next screen. Click "⏹️ Stop" to pause.
        </p>
      </div>

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
                  <div className="flex space-x-2">
                    {runningSchedulers[board.boardId] ? (
                      <button onClick={() => stopAutoScheduler(board.boardId)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                        ⏹️ Stop Auto
                      </button>
                    ) : (
                      <button onClick={() => startAutoScheduler(board.boardId)} disabled={!assignedWorkflow}
                        className={`px-3 py-1 rounded text-sm ${
                          !assignedWorkflow 
                            ? 'bg-gray-400 text-white cursor-not-allowed' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                        title={!assignedWorkflow ? 'Assign a workflow first' : 'Start automatic cycling'}>
                        ▶️ Start Auto
                      </button>
                    )}
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
    steps: [{ screenType: 'BIRTHDAY', displaySeconds: 15, displayValue: 15, displayUnit: 'seconds' }],
    schedule: {
      type: 'always',
      startTimeLocal: '08:00',
      endTimeLocal: '18:00',
      daysOfWeek: [1, 2, 3, 4, 5] // Mon-Fri
    }
  });
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
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
        const successMessage = editingId 
          ? '✅ Workflow name and schedule updated!' 
          : '✅ Workflow created! Now add steps using "Reorder Steps".';
        alert(successMessage);
        setForm({ 
          name: '', 
          steps: [{ screenType: 'BIRTHDAY', displaySeconds: 15, displayValue: 15, displayUnit: 'seconds' }],
          schedule: {
            type: 'always',
            startTimeLocal: '08:00',
            endTimeLocal: '18:00',
            daysOfWeek: [1, 2, 3, 4, 5]
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
        <div className="bg-white p-6 rounded-lg mb-6 border-2 border-blue-400 shadow-xl">
          <h4 className="font-semibold mb-4 text-lg text-blue-600">
            {editingId ? '✏️ Edit Workflow' : '➕ Create New Workflow'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-medium text-gray-700 block mb-2">Workflow Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field" placeholder="e.g., Office Hours, Weekend Display" required />
              <p className="text-xs text-gray-500 mt-1">
                💡 This workflow can be assigned to multiple boards!
              </p>
            </div>
            
            {!editingId && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="font-medium text-gray-700">Screen Steps (drag to reorder)</label>
                  <button type="button" onClick={addStep} className="text-sm text-blue-600 hover:text-blue-800 font-semibold">+ Add Step</button>
                </div>
                {form.steps.map((step, idx) => (
                  <div 
                    key={idx} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, idx)}
                    className="flex items-center space-x-2 mb-2 p-2 bg-gray-50 rounded-lg border-2 border-gray-300 hover:border-blue-400 cursor-move transition-all group"
                  >
                    <div className="flex flex-col items-center justify-center w-12 text-gray-400 group-hover:text-blue-600">
                      <span className="text-xs font-bold">#{idx + 1}</span>
                      <span className="text-lg leading-none">⋮⋮</span>
                    </div>
                    {idx === 0 && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">FIRST</span>}
                    {idx === form.steps.length - 1 && form.steps.length > 1 && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">LAST</span>}
                    <select value={step.screenType} onChange={(e) => updateStep(idx, 'screenType', e.target.value)} className="input-field flex-1">
                      {screenTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <div className="flex items-center space-x-1">
                      <input 
                        type="number" 
                        value={step.displayValue || step.displaySeconds} 
                        onChange={(e) => updateStep(idx, 'displayValue', parseInt(e.target.value))}
                        className="input-field w-16 text-center font-semibold" 
                        min="1" 
                        max="999" 
                        placeholder="15" 
                      />
                      <select 
                        value={step.displayUnit || 'seconds'} 
                        onChange={(e) => updateStep(idx, 'displayUnit', e.target.value)}
                        className="input-field w-24 text-sm"
                      >
                        <option value="seconds">sec</option>
                        <option value="minutes">min</option>
                        <option value="hours">hrs</option>
                      </select>
                    </div>
                    <button type="button" onClick={() => removeStep(idx)} className="px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="font-medium block mb-2 text-gray-700">Schedule</label>
              <select value={form.schedule.type} onChange={(e) => setForm({...form, schedule: {...form.schedule, type: e.target.value}})} className="input-field mb-2">
                <option value="always">Always Running (24/7)</option>
                <option value="dailyWindow">Daily Time Window</option>
              </select>

              {form.schedule.type === 'dailyWindow' && (
                <>
                  <div className="flex space-x-2 mb-2">
                    <input type="time" value={form.schedule.startTimeLocal} 
                      onChange={(e) => setForm({...form, schedule: {...form.schedule, startTimeLocal: e.target.value}})}
                      className="input-field" />
                    <span className="py-2">to</span>
                    <input type="time" value={form.schedule.endTimeLocal}
                      onChange={(e) => setForm({...form, schedule: {...form.schedule, endTimeLocal: e.target.value}})}
                      className="input-field" />
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                      <label key={idx} className="flex items-center space-x-1">
                        <input type="checkbox" 
                          checked={form.schedule.daysOfWeek.includes(idx)}
                          onChange={(e) => {
                            const newDays = e.target.checked 
                              ? [...form.schedule.daysOfWeek, idx]
                              : form.schedule.daysOfWeek.filter(d => d !== idx);
                            setForm({...form, schedule: {...form.schedule, daysOfWeek: newDays}});
                          }}
                          className="rounded" />
                        <span className="text-sm">{day}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? '💾 Update Workflow' : '✨ Create Workflow')}
            </button>
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
            
            if (schedule.type === 'dailyWindow') {
              const days = schedule.daysOfWeek?.length === 7 ? 'Daily' : 
                           schedule.daysOfWeek?.length === 5 && schedule.daysOfWeek.includes(1) ? 'Weekdays' :
                           schedule.daysOfWeek?.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(',');
              scheduleStr = `${days} ${schedule.startTimeLocal}-${schedule.endTimeLocal}`;
              
              // Check if currently active
              const now = new Date();
              const currentDay = now.getDay();
              const currentTime = now.toTimeString().slice(0, 5);
              isActive = schedule.daysOfWeek?.includes(currentDay) && 
                        currentTime >= schedule.startTimeLocal && 
                        currentTime <= schedule.endTimeLocal;
            } else {
              isActive = true; // Always running
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
            <div className="overflow-y-auto max-h-[225px]">
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
