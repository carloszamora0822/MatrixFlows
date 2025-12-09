import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WorkflowEditor from '../components/WorkflowEditor';

const WorkflowPage = ({ mode, initialWorkflow }) => {
  const navigate = useNavigate();
  const isEditMode = mode === 'edit';
  
  // Form state - seeded from initialWorkflow in edit mode
  const [workflowName, setWorkflowName] = useState(initialWorkflow?.name || '');
  const [schedule, setSchedule] = useState(initialWorkflow?.schedule || {
    type: 'always',
    startTimeLocal: '00:00',
    endTimeLocal: '23:59',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    updateIntervalMinutes: 30
  });
  const [steps, setSteps] = useState(initialWorkflow?.steps || []);
  const [intervalValue, setIntervalValue] = useState(30);
  const [intervalUnit, setIntervalUnit] = useState('minutes');
  const [boards, setBoards] = useState([]);
  const [selectedBoards, setSelectedBoards] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  // Track if step 1 is complete
  const isStep1Complete = workflowName.trim().length > 0 && (isEditMode || selectedBoards.length > 0);

  // Fetch boards
  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const response = await fetch('/api/boards', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setBoards(data);
          
          // In edit mode, pre-select boards that have this workflow assigned
          if (isEditMode && initialWorkflow) {
            const assignedBoardIds = data
              .filter(b => b.defaultWorkflowId === initialWorkflow.workflowId)
              .map(b => b.boardId || b._id);
            setSelectedBoards(assignedBoardIds);
          }
        }
      } catch (error) {
        console.error('Failed to fetch boards:', error);
      }
    };
    fetchBoards();
  }, [isEditMode, initialWorkflow]);

  // Set interval value/unit from schedule
  useEffect(() => {
    const mins = schedule.updateIntervalMinutes;
    if (mins >= 60 && mins % 60 === 0) {
      setIntervalValue(mins / 60);
      setIntervalUnit('hours');
    } else {
      setIntervalValue(mins);
      setIntervalUnit('minutes');
    }
  }, []);

  const handleSave = async (updatedSteps) => {
    if (!workflowName.trim()) {
      alert('❌ Please enter a workflow name');
      return;
    }

    if (!isEditMode && selectedBoards.length === 0) {
      alert('❌ Please assign the workflow to at least one board');
      return;
    }

    if (updatedSteps.length === 0) {
      alert('❌ Please add at least one screen to the workflow');
      return;
    }

    // Note: Backend will auto-adjust frequency if needed (duration + 1 min buffer)

    try {
      const url = isEditMode 
        ? `/api/workflows?id=${initialWorkflow.workflowId}`
        : '/api/workflows';
      
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: workflowName,
          steps: updatedSteps,
          schedule
        })
      });

      if (response.ok) {
        const savedWorkflow = await response.json();
        
        // Handle board assignments (both create and edit mode)
        const allBoards = await fetch('/api/boards', { credentials: 'include' }).then(r => r.json());
        
        for (const board of allBoards) {
          const boardId = board.boardId || board._id;
          const shouldBeAssigned = selectedBoards.includes(boardId);
          const isCurrentlyAssigned = isEditMode 
            ? board.defaultWorkflowId === initialWorkflow.workflowId
            : false;
          
          if (shouldBeAssigned && !isCurrentlyAssigned) {
            // Assign this workflow to the board (reassigns if already assigned elsewhere)
            await fetch(`/api/boards?id=${boardId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                defaultWorkflowId: savedWorkflow.workflowId
              })
            });
          } else if (!shouldBeAssigned && isCurrentlyAssigned) {
            // Unassign this workflow from the board (edit mode only)
            await fetch(`/api/boards?id=${boardId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                defaultWorkflowId: null
              })
            });
          }
        }
        
        alert(isEditMode ? '✅ Workflow updated successfully!' : '✅ Workflow created successfully!');
        navigate('/workflows');
      } else {
        const errorData = await response.json();
        console.error('❌ Save failed:', errorData);
        alert(`❌ Failed to ${isEditMode ? 'update' : 'create'} workflow`);
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('❌ Network error occurred');
    }
  };

  const handleCancel = () => {
    navigate('/workflows');
  };

  const tempWorkflow = {
    workflowId: initialWorkflow?.workflowId || 'new',
    name: workflowName || 'New Workflow',
    steps: steps,
    schedule: schedule
  };

  const pageTitle = isEditMode ? 'Edit workflow' : 'Create workflow';
  const primaryButtonText = isEditMode ? 'Save changes' : 'Create workflow';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/workflows')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span className="text-xl">←</span>
              <span className="text-sm font-medium">Back</span>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
            {isEditMode && initialWorkflow?.isActive && (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">Active</span>
            )}
          </div>
        </div>
      </div>

      {/* Setup Section */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stepper */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className={`h-6 w-6 rounded-full text-white text-xs flex items-center justify-center font-semibold transition-all ${
              isStep1Complete ? 'bg-green-500' : 'bg-blue-600'
            }`}>
              {isStep1Complete ? '✓' : '1'}
            </span>
            <span className="font-semibold text-gray-900">Setup</span>
          </div>
          <div className={`h-px w-8 transition-all duration-500 ${
            isStep1Complete ? 'bg-blue-600' : 'bg-gray-300'
          }`}></div>
          <div className={`flex items-center gap-2 transition-all ${
            isStep1Complete ? 'text-gray-900' : 'text-gray-400'
          }`}>
            <span className={`h-6 w-6 rounded-full text-xs flex items-center justify-center font-semibold transition-all duration-500 ${
              isStep1Complete 
                ? 'bg-blue-600 text-white' 
                : 'border-2 border-gray-300'
            }`}>2</span>
            <span className="font-medium">Build workflow</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Card 1: Workflow details */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm" style={{borderTop: '3px solid #2563EB'}}>
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">1. Workflow details</h3>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="Weekend rotation"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Assign to Boards
                </label>
                <div className="space-y-2">
                  {boards.filter(b => b.isActive).map((board) => {
                    const boardId = board.boardId || board._id;
                    const isSelected = selectedBoards.includes(boardId);
                    const isAssignedToOther = board.defaultWorkflowId && board.defaultWorkflowId !== initialWorkflow?.workflowId;
                    
                    return (
                      <label
                        key={boardId}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                          isSelected ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const boardId = board.boardId || board._id;
                            setSelectedBoards(prev =>
                              e.target.checked
                                ? [...prev, boardId]
                                : prev.filter(id => id !== boardId)
                            );
                          }}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{board.name}</div>
                          {isAssignedToOther && !isSelected && (
                            <div className="text-xs text-orange-600 mt-1">
                              ⚠️ Currently assigned to another workflow (will be reassigned)
                            </div>
                          )}
                          {isSelected && (
                            <div className="text-xs text-green-700 mt-1">
                              ✓ Will be assigned to this workflow
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                  {boards.filter(b => b.isActive).length === 0 && (
                    <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded">
                      No active boards available
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Multiple boards can use the same workflow - they'll update simultaneously
                </p>
              </div>
            </div>
          </div>
          
          {/* Card 2: Schedule & Interval */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm" style={{borderTop: '3px solid #2563EB'}}>
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">2. Schedule & interval</h3>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Schedule</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSchedule({ ...schedule, type: 'always' })}
                    className={`flex-1 px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                      schedule.type === 'always'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Always running
                  </button>
                  <button
                    onClick={() => setSchedule({ ...schedule, type: 'timeWindow' })}
                    className={`flex-1 px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                      schedule.type === 'timeWindow'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Daily time window
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Update interval</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Every</span>
                  <input
                    type="number"
                    value={intervalValue}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setIntervalValue(val);
                      const minutes = intervalUnit === 'seconds' ? Math.max(1, Math.floor(val / 60)) 
                                    : intervalUnit === 'hours' ? val * 60 
                                    : val;
                      setSchedule({ ...schedule, updateIntervalMinutes: minutes });
                    }}
                    min="1"
                    className="w-16 px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <select
                    value={intervalUnit}
                    onChange={(e) => {
                      setIntervalUnit(e.target.value);
                      const minutes = e.target.value === 'seconds' ? Math.max(1, Math.floor(intervalValue / 60))
                                    : e.target.value === 'hours' ? intervalValue * 60
                                    : intervalValue;
                      setSchedule({ ...schedule, updateIntervalMinutes: minutes });
                    }}
                    className="px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                  >
                    <option value="seconds">seconds</option>
                    <option value="minutes">minutes</option>
                    <option value="hours">hours</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  <span className="inline-flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Time-aligned updates
                  </span>
                  {' '}— Triggers at clock times (:00, :30). <button onClick={() => setShowSettings(!showSettings)} className="text-blue-600 hover:underline">Learn more ›</button>
                </p>
              </div>

              {schedule.type === 'timeWindow' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start time</label>
                      <input
                        type="time"
                        value={schedule.startTimeLocal}
                        onChange={(e) => setSchedule({ ...schedule, startTimeLocal: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End time</label>
                      <input
                        type="time"
                        value={schedule.endTimeLocal}
                        onChange={(e) => setSchedule({ ...schedule, endTimeLocal: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Days</label>
                    <div className="flex gap-1">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const newDays = schedule.daysOfWeek.includes(idx)
                              ? schedule.daysOfWeek.filter(d => d !== idx)
                              : [...schedule.daysOfWeek, idx].sort();
                            setSchedule({ ...schedule, daysOfWeek: newDays });
                          }}
                          className={`w-8 h-8 text-xs rounded font-medium transition-colors ${
                            schedule.daysOfWeek.includes(idx)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {showSettings && (
                <div className="mt-4 p-3 bg-white border border-blue-200 rounded-md">
                  <p className="text-xs font-medium text-gray-900 mb-1">How it works</p>
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    <li>• Triggers at aligned clock times (8:30, 9:00, 9:30...)</li>
                    <li>• Not "X minutes after last run" - synced to the clock</li>
                    <li>• Example: 30 min → runs at :00 and :30 each hour</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Builder Section */}
        <div className="flex items-center gap-2 mb-4">
          <span className="h-6 w-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold">2</span>
          <h2 className="text-base font-semibold text-gray-900">Build workflow</h2>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm" style={{borderTop: '3px solid #2563EB'}}>
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-600">Drag screens from the right to build your rotation</p>
          </div>
          <div className="p-6">
            <WorkflowEditor
              workflow={tempWorkflow}
              onSave={(updatedSteps) => {
                console.log('📝 Steps updated from WorkflowEditor:', updatedSteps);
                setSteps(updatedSteps);
              }}
              onCancel={handleCancel}
              hideHeader={true}
              showButtons={false}
            />
          </div>
        </div>
        
        {/* Hero CTA */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              console.log('🔍 Current steps state:', steps);
              handleSave(steps);
            }}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all transform hover:scale-105"
          >
            {primaryButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowPage;
