import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/layout/Layout';
import MiniVestaboard from '../components/MiniVestaboard';
import MatrixPreview from '../components/ui/MatrixPreview';

const Workflows = () => {
  const [boards, setBoards] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState(null);
  // Removed activeTab state - Boards moved to separate page

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
        <div className="max-w-7xl mx-auto">
          {currentBoard ? (
            <WorkflowsTab 
              workflows={workflows}
              boards={boards}
              fetchData={fetchData}
              selectedBoard={currentBoard}
            />
          ) : (
            <div className="text-center py-20 bg-white rounded-lg shadow">
              <div className="text-6xl mb-4">📺</div>
              <h3 className="text-2xl font-semibold text-gray-700 mb-2">Select a Board</h3>
              <p className="text-gray-500 mb-6">Choose a board above to manage workflows</p>
              <a 
                href="/boards"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Go to Boards Setup
              </a>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};


const WorkflowsTab = ({ workflows, boards, fetchData, selectedBoard }) => {
  const navigate = useNavigate();
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
                console.log(`Triggering board: ${board.name} (${board.boardId}) - Running complete workflow`);
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

  const handleDelete = async (workflowId) => {
    if (!window.confirm('Delete this workflow? This cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/workflows?id=${workflowId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const handleToggleActive = async (workflow) => {
    try {
      const res = await fetch(`/api/workflows?id=${workflow.workflowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: workflow.name,
          schedule: workflow.schedule,
          steps: workflow.steps,
          isActive: !workflow.isActive
        })
      });
      
      if (res.ok) {
        await fetchData();
      } else {
        const data = await res.json();
        alert(`Failed to toggle workflow: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
      alert('Failed to update workflow status');
    }
  };

  const convertToSeconds = (value, unit) => {
    let seconds = value;
    if (unit === 'minutes') seconds = value * 60;
    if (unit === 'hours') seconds = value * 3600;
    
    // Enforce minimum 15 seconds to avoid Vestaboard rate limiting
    if (seconds < 15) seconds = 15;
    
    return seconds;
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
      // Store ONLY the customScreenId - screen library is the source of truth!
      const newStep = {
        screenType: 'CUSTOM_MESSAGE',
        screenConfig: {
          customScreenId: screen.screenId, // ✅ Reference to library (source of truth)
          name: screen.name, // Store name for display in workflow editor
          hasExpiration: false, // Can override screen library expiration
          expiresAt: null, // Workflow-specific expiration
          expiresAtTime: null
        },
        displaySeconds: 20,
        displayValue: 20,
        displayUnit: 'seconds',
        isEnabled: true,
        order: workflow.steps.length
      };

      console.log('📝 New step being added with customScreenId:', screen.screenId);

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
        <button 
          onClick={() => navigate('/create-workflow')} 
          className="btn-primary" 
          disabled={boards.length === 0}
        >
          + Create Workflow
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
            </div>

            {/* Board Assignment - Read Only */}
            <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-gray-700">📺 Assigned to Boards</label>
                {editingId && (
                  <span className="text-xs text-gray-600">
                    {boards.filter(b => b.isActive && b.defaultWorkflowId === editingId).length} board(s)
                  </span>
                )}
              </div>
              
              {editingId ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {boards.filter(b => b.isActive && b.defaultWorkflowId === editingId).map(board => (
                      <span key={board.boardId} className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700">
                        📺 {board.name}
                      </span>
                    ))}
                    {boards.filter(b => b.isActive && b.defaultWorkflowId === editingId).length === 0 && (
                      <span className="text-sm text-gray-500 italic">No boards assigned</span>
                    )}
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-gray-700">
                      💡 To assign or unassign boards, go to the <a href="/boards" className="text-blue-600 hover:underline font-semibold">Boards page</a>
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800 font-medium">💡 Save the workflow first, then assign boards in the Boards page</p>
                </div>
              )}
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
            
            // Check if workflow is assigned to any ACTIVE board
            const isAssignedToBoard = boards.some(board => board.isActive && board.defaultWorkflowId === workflow.workflowId);
            
            // Check if this is a pinned workflow
            const isPinnedWorkflow = workflow.name?.startsWith('Pinned -');
            
            // Check if there's ANY active pinned workflow (blocks all others)
            const hasActivePinnedWorkflow = workflows.some(w => 
              w.name?.startsWith('Pinned -') && 
              w.schedule?.type === 'specificDateRange' &&
              w.isActive
            );
            
            if (schedule.type === 'dailyWindow' || schedule.type === 'timeWindow') {
              // Check if it's truly 24/7 (all 7 days, 00:00-23:59)
              const isAll7Days = schedule.daysOfWeek?.length === 7;
              const isFullDay = (schedule.startTimeLocal === '00:00' || !schedule.startTimeLocal) && 
                               (schedule.endTimeLocal === '23:59' || !schedule.endTimeLocal);
              
              if (isAll7Days && isFullDay) {
                scheduleStr = '24/7';
              } else {
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                let daysStr = '';
                
                if (schedule.daysOfWeek?.length === 7) {
                  daysStr = 'Daily';
                } else if (schedule.daysOfWeek?.length === 5 && schedule.daysOfWeek.includes(1) && schedule.daysOfWeek.includes(5)) {
                  daysStr = 'Weekdays';
                } else if (schedule.daysOfWeek?.length === 2 && schedule.daysOfWeek.includes(0) && schedule.daysOfWeek.includes(6)) {
                  daysStr = 'Weekends';
                } else if (schedule.daysOfWeek?.length) {
                  daysStr = schedule.daysOfWeek.map(d => dayNames[d]).join(', ');
                } else {
                  daysStr = 'No days';
                }
                
                scheduleStr = `${daysStr} ${schedule.startTimeLocal || '00:00'}-${schedule.endTimeLocal || '23:59'}`;
              }
              
              // Check if current time falls within schedule
              const now = new Date();
              const currentDay = now.getDay();
              const currentTime = now.toTimeString().slice(0, 5);
              
              const isDayActive = schedule.daysOfWeek?.includes(currentDay);
              const isTimeActive = currentTime >= (schedule.startTimeLocal || '00:00') && 
                                   currentTime <= (schedule.endTimeLocal || '23:59');
              
              // Regular workflows are active if schedule matches AND no pin is blocking AND assigned to a board AND workflow.isActive is true
              isActive = !isPinnedWorkflow && isDayActive && isTimeActive && !hasActivePinnedWorkflow && isAssignedToBoard && workflow.isActive !== false;
            } else if (schedule.type === 'specificDateRange') {
              const now = new Date();
              const currentDate = now.toISOString().split('T')[0];
              const currentTime = now.toTimeString().slice(0, 5);
              
              isActive = isPinnedWorkflow &&
                        schedule.startDate <= currentDate &&
                        schedule.endDate >= currentDate &&
                        (!schedule.startTimeLocal || currentTime >= schedule.startTimeLocal) &&
                        (!schedule.endTimeLocal || currentTime <= schedule.endTimeLocal) &&
                        workflow.isActive !== false;
              
              scheduleStr = `${schedule.startDate} - ${schedule.endDate}`;
            } else {
              // Always running, but blocked if pinned workflow exists AND must be assigned to a board AND workflow.isActive is true
              isActive = !hasActivePinnedWorkflow && isAssignedToBoard && workflow.isActive !== false;
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
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xl text-gray-900">{workflow.name}</h4>
                      {workflow.isActive === false && (
                        <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-semibold rounded">
                          OFF
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {enabledSteps.length} steps • ⏱️ Triggers every {workflow.schedule?.updateIntervalMinutes || 30} min • 📅 {scheduleStr}
                    </p>
                    {(() => {
                      const assignedBoards = boards.filter(board => board.isActive && board.defaultWorkflowId === workflow.workflowId);
                      const inactiveBoards = boards.filter(board => !board.isActive && board.defaultWorkflowId === workflow.workflowId);
                      
                      if (assignedBoards.length > 0) {
                        return (
                          <div className="mt-2">
                            <div className="text-xs text-gray-600">
                              📺 {assignedBoards.map(b => b.name).join(', ')}
                              {inactiveBoards.length > 0 && ` (+${inactiveBoards.length} inactive)`}
                            </div>
                          </div>
                        );
                      } else if (inactiveBoards.length > 0) {
                        return (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-300">
                            <p className="text-xs text-gray-600 mb-1">
                              ⚠️ {inactiveBoards.length} inactive board(s) assigned
                            </p>
                            <a href="/boards" className="text-xs text-blue-600 hover:underline font-medium">
                              → Manage in Boards page
                            </a>
                          </div>
                        );
                      } else {
                        return (
                          <div className="mt-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-xs text-orange-700 font-medium mb-1">
                              ⚠️ No boards assigned to this workflow
                            </p>
                            <a href="/boards" className="text-xs text-blue-600 hover:underline font-medium">
                              → Go to Boards page to assign workflows
                            </a>
                          </div>
                        );
                      }
                    })()}
                    {isActive && (() => {
                      // Find a board assigned to this workflow to get last update time
                      const assignedBoard = boards.find(b => b.defaultWorkflowId === workflow.workflowId);
                      const schedule = workflow.schedule || {};
                      const intervalMinutes = schedule.updateIntervalMinutes || 30;
                      
                      let nextTriggerTime;
                      
                      if (!assignedBoard || !assignedBoard.lastUpdateAt) {
                        // Never run before - check if we're in the time window NOW
                        const now = new Date();
                        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                        
                        if (schedule.type === 'dailyWindow' && schedule.startTimeLocal && schedule.endTimeLocal) {
                          if (currentTime >= schedule.startTimeLocal && currentTime <= schedule.endTimeLocal) {
                            // We're in window now - will trigger on next cron run
                            nextTriggerTime = new Date(now.getTime() + 60000); // Next minute
                          } else if (currentTime < schedule.startTimeLocal) {
                            // Before window - trigger at start time today
                            const [startHour, startMin] = schedule.startTimeLocal.split(':').map(Number);
                            nextTriggerTime = new Date();
                            nextTriggerTime.setHours(startHour, startMin, 0, 0);
                          } else {
                            // After window - trigger at start time tomorrow
                            const [startHour, startMin] = schedule.startTimeLocal.split(':').map(Number);
                            nextTriggerTime = new Date();
                            nextTriggerTime.setDate(nextTriggerTime.getDate() + 1);
                            nextTriggerTime.setHours(startHour, startMin, 0, 0);
                          }
                        } else {
                          // Always schedule - trigger on next cron run
                          nextTriggerTime = new Date(now.getTime() + 60000);
                        }
                      } else {
                        // Has run before - calculate based on last update + interval
                        const lastUpdate = new Date(assignedBoard.lastUpdateAt);
                        nextTriggerTime = new Date(lastUpdate.getTime() + intervalMinutes * 60 * 1000);
                        
                        // Check if next trigger is outside time window
                        if (schedule.type === 'dailyWindow' && schedule.startTimeLocal && schedule.endTimeLocal) {
                          const triggerTime = `${String(nextTriggerTime.getHours()).padStart(2, '0')}:${String(nextTriggerTime.getMinutes()).padStart(2, '0')}`;
                          
                          if (triggerTime < schedule.startTimeLocal || triggerTime > schedule.endTimeLocal) {
                            // Next trigger is outside window - move to next day's start time
                            const [startHour, startMin] = schedule.startTimeLocal.split(':').map(Number);
                            nextTriggerTime = new Date(nextTriggerTime);
                            nextTriggerTime.setDate(nextTriggerTime.getDate() + 1);
                            nextTriggerTime.setHours(startHour, startMin, 0, 0);
                          }
                        }
                      }
                      
                      return (
                        <p className="text-xs text-green-700 mt-1 font-semibold">
                          ⏰ Next trigger: {nextTriggerTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </p>
                      );
                    })()}
                  </div>
                  <div className="flex space-x-2">
                    {editingWorkflowId === workflow.workflowId ? (
                      <>
                        {/* Duration vs Frequency Warning */}
                        {(() => {
                          const currentTotalSeconds = enabledSteps.reduce((sum, step, idx) => {
                            const stepKey = `${workflow.workflowId}-${idx}`;
                            return sum + (stepDurations[stepKey] || step.displaySeconds || 0);
                          }, 0);
                          const currentTotalMinutes = Math.ceil(currentTotalSeconds / 60);
                          const frequencyMinutes = workflow.schedule?.updateIntervalMinutes || 30;
                          
                          if (currentTotalSeconds > frequencyMinutes * 60) {
                            return (
                              <div className="w-full mb-4 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
                                <p className="text-red-800 font-bold text-sm mb-2">
                                  ⚠️  Warning: Workflow Duration Exceeds Frequency!
                                </p>
                                <p className="text-red-700 text-xs mb-2">
                                  Total duration: <strong>{currentTotalMinutes} minutes</strong> | 
                                  Update frequency: <strong>{frequencyMinutes} minutes</strong>
                                </p>
                                <p className="text-red-700 text-xs">
                                  Your workflow will take longer to complete than the time between updates. 
                                  Please reduce screen delays or increase the frequency to at least <strong>{currentTotalMinutes} minutes</strong>.
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <button 
                          onClick={async () => {
                            // Save reordered workflow with updated durations and expiration
                            const reorderedSteps = enabledSteps.map((step, idx) => ({
                              ...step,
                              order: idx,
                              displaySeconds: stepDurations[`${workflow.workflowId}-${idx}`] || step.displaySeconds
                            }));
                            
                            try {
                              // First, update any custom screens that have been modified
                              for (const step of reorderedSteps) {
                                if (step.screenType === 'CUSTOM_MESSAGE' && step.screenConfig?.customScreenId) {
                                  // Check if screen content was modified (message, colors, etc.)
                                  const originalScreen = savedScreens.find(s => s.screenId === step.screenConfig.customScreenId);
                                  if (originalScreen && step.screenConfig.message && step.screenConfig.message !== originalScreen.message) {
                                    // Update the custom screen in the library
                                    await fetch(`/api/custom-screens?id=${step.screenConfig.customScreenId}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      credentials: 'include',
                                      body: JSON.stringify({
                                        name: step.screenConfig.name || originalScreen.name,
                                        message: step.screenConfig.message,
                                        borderColor1: step.screenConfig.borderColor1 || originalScreen.borderColor1,
                                        borderColor2: step.screenConfig.borderColor2 || originalScreen.borderColor2,
                                        expiresAt: originalScreen.expiresAt
                                      })
                                    });
                                  }
                                }
                              }
                              
                              // Then save the workflow
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
                                alert('✅ Workflow saved!');
                                setEditingWorkflowId(null);
                                setStepDurations({});
                                await fetchData();
                              }
                            } catch (error) {
                              console.error('Save error:', error);
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
                        {/* Workflow Active/Inactive Toggle */}
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-semibold ${workflow.isActive !== false ? 'text-green-600' : 'text-gray-500'}`}>
                            {workflow.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={() => handleToggleActive(workflow)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              workflow.isActive !== false ? 'bg-green-600' : 'bg-gray-300'
                            }`}
                            title={workflow.isActive !== false ? 'Click to disable workflow - stops all automatic updates' : 'Click to enable workflow - resumes automatic updates'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                workflow.isActive !== false ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        <button 
                          onClick={() => navigate(`/workflow-editor/${workflow.workflowId}`)} 
                          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-semibold"
                        >
                          ⚡ Edit Flow
                        </button>
                        <button 
                          onClick={() => handleDelete(workflow.workflowId)} 
                          className="w-8 h-8 flex items-center justify-center bg-red-100 hover:bg-red-200 border border-red-300 rounded text-sm transition-colors"
                        >
                          ❌
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
                                const confirmMsg = `Remove this ${isCustomMessage ? 'custom screen' : label} from workflow?`;
                                
                                if (window.confirm(confirmMsg)) {
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
                                      console.log('✅ Screen removed from workflow');
                                      fetchData();
                                    } else {
                                      alert('❌ Failed to remove screen');
                                    }
                                  } catch (error) {
                                    console.error('Failed to remove:', error);
                                    alert('❌ Network error');
                                  }
                                }
                              }}
                              className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 font-semibold"
                            >
                              🗑️ Remove
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

                        {/* Color Customization - For Checkrides, Events, Recognition */}
                        {(step.screenType === 'CHECKRIDES' || step.screenType === 'UPCOMING_EVENTS' || step.screenType === 'EMPLOYEE_RECOGNITION') && isEditing && (
                          <div className="flex justify-center my-3 w-full">
                            <div className="bg-purple-50 border-2 border-purple-400 px-4 py-3 rounded-lg w-full max-w-md">
                              <p className="text-sm font-semibold text-gray-700 mb-3">🎨 Border Colors</p>
                              <div className={`grid ${step.screenType === 'EMPLOYEE_RECOGNITION' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    {step.screenType === 'EMPLOYEE_RECOGNITION' ? 'Color 1' : 'Border Color'}
                                  </label>
                                  <select
                                    value={step.screenConfig?.borderColor1 || (step.screenType === 'CHECKRIDES' ? 'red' : step.screenType === 'UPCOMING_EVENTS' ? 'green' : 'yellow')}
                                    onChange={(e) => {
                                      if (!step.screenConfig) step.screenConfig = {};
                                      step.screenConfig.borderColor1 = e.target.value;
                                    }}
                                    className="w-full px-2 py-1 border-2 border-gray-200 rounded text-sm"
                                  >
                                    <option value="red">🔴 Red</option>
                                    <option value="orange">🟠 Orange</option>
                                    <option value="yellow">🟡 Yellow</option>
                                    <option value="green">🟢 Green</option>
                                    <option value="blue">🔵 Blue</option>
                                    <option value="purple">🟣 Purple</option>
                                    <option value="white">⚪ White</option>
                                  </select>
                                </div>
                                {step.screenType === 'EMPLOYEE_RECOGNITION' && (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Color 2</label>
                                    <select
                                      value={step.screenConfig?.borderColor2 || 'orange'}
                                      onChange={(e) => {
                                        if (!step.screenConfig) step.screenConfig = {};
                                        step.screenConfig.borderColor2 = e.target.value;
                                      }}
                                      className="w-full px-2 py-1 border-2 border-gray-200 rounded text-sm"
                                    >
                                      <option value="red">🔴 Red</option>
                                      <option value="orange">🟠 Orange</option>
                                      <option value="yellow">🟡 Yellow</option>
                                      <option value="green">🟢 Green</option>
                                      <option value="blue">🔵 Blue</option>
                                      <option value="purple">🟣 Purple</option>
                                      <option value="white">⚪ White</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Expiration Settings - Only for CUSTOM_MESSAGE screens */}
                        {step.screenType === 'CUSTOM_MESSAGE' && isEditing && (
                          <div className="flex justify-center my-3 w-full">
                            <div className="bg-orange-50 border-2 border-orange-400 px-4 py-3 rounded-lg w-full max-w-md">
                              <label className="flex items-center gap-2 cursor-pointer mb-2">
                                <input
                                  type="checkbox"
                                  checked={step.screenConfig?.hasExpiration || false}
                                  onChange={(e) => {
                                    // Update step config directly
                                    step.screenConfig = {
                                      ...step.screenConfig,
                                      hasExpiration: e.target.checked,
                                      expiresAt: e.target.checked ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
                                      expiresAtTime: e.target.checked ? '23:59' : null
                                    };
                                  }}
                                  className="w-4 h-4 text-orange-500 border-2 border-gray-300 rounded"
                                />
                                <span className="text-sm font-semibold text-gray-700">⏱️ This screen expires?</span>
                              </label>
                              {step.screenConfig?.hasExpiration && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                                    <input
                                      type="date"
                                      value={step.screenConfig?.expiresAt || ''}
                                      onChange={(e) => {
                                        // Update step config directly
                                        step.screenConfig.expiresAt = e.target.value;
                                      }}
                                      min={new Date().toISOString().split('T')[0]}
                                      className="w-full px-2 py-1 border-2 border-gray-200 rounded text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                                    <input
                                      type="time"
                                      value={step.screenConfig?.expiresAtTime || ''}
                                      onChange={(e) => {
                                        // Update step config directly
                                        step.screenConfig.expiresAtTime = e.target.value;
                                      }}
                                      className="w-full px-2 py-1 border-2 border-gray-200 rounded text-sm"
                                    />
                                  </div>
                                </div>
                              )}
                              <p className="text-xs text-gray-500 mt-1">Screen will be removed from workflow after this date/time</p>
                            </div>
                          </div>
                        )}
                        
                        {idx < enabledSteps.length - 1 && (
                          <div className="flex justify-center my-2">
                            <div className="text-blue-400 text-3xl">↓</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Workflows;
