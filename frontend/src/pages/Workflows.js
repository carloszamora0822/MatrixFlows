import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { WorkflowCard } from '../components/workflows';

const Workflows = () => {
  const [boards, setBoards] = useState([]);
  const [boardStates, setBoardStates] = useState({});
  const [workflows, setWorkflows] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);

  const fetchBoardStates = useCallback(async () => {
    try {
      const res = await fetch('/api/board-states');
      const states = await res.json();
      // Create a map of boardId -> state for easy lookup
      const stateMap = {};
      states.forEach(state => {
        stateMap[state.boardId] = state;
      });
      setBoardStates(stateMap);
    } catch (error) {
      console.error('Error fetching board states:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [boardsRes, workflowsRes] = await Promise.all([
        fetch('/api/boards', { credentials: 'include' }),
        fetch('/api/workflows', { credentials: 'include' })
      ]);

      if (boardsRes.ok) setBoards(await boardsRes.json());
      if (workflowsRes.ok) setWorkflows(await workflowsRes.json());

      // Fetch board states
      await fetchBoardStates();
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  }, [fetchBoardStates]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll board states every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBoardStates();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchBoardStates]);

  // Auto-select first board if only one exists
  useEffect(() => {
    if (boards.length === 1 && !selectedBoard) {
      setSelectedBoard(boards[0]);
    }
  }, [boards, selectedBoard]);

  const currentBoard = selectedBoard || boards[0];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {currentBoard ? (
            <WorkflowsTab
              workflows={workflows}
              boards={boards}
              boardStates={boardStates}
              fetchData={fetchData}
              fetchBoardStates={fetchBoardStates}
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


const WorkflowsTab = ({ workflows, boards, boardStates, fetchData, fetchBoardStates }) => {
  const navigate = useNavigate();
  const [editingWorkflowId, setEditingWorkflowId] = useState(null);
  const [stepDurations, setStepDurations] = useState({});
  const [stepUnits, setStepUnits] = useState({});
  const [savedScreens, setSavedScreens] = useState([]);

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

  // ✅ FIX #5: Handle board resynchronization
  const handleResyncWorkflow = async (workflowId) => {
    if (!window.confirm('Resynchronize all boards for this workflow? They will all trigger on the next cron run.')) return;

    try {
      const res = await fetch(`/api/workflows/trigger-now?workflowId=${workflowId}`, {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        // ✅ Immediate refresh
        await fetchBoardStates();
        await fetchData();
        alert('✅ Boards synchronized! All will trigger within 60 seconds.');
      } else {
        const data = await res.json();
        alert(`❌ Failed: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to resync:', error);
      alert('❌ Network error');
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

            const schedule = workflow.schedule || { type: 'always' };
            let scheduleStr = '24/7';

            // FIX #3: Use backend-computed isActiveNow instead of browser time
            // Backend computes this in Central Time, preventing timezone mismatches
            // Look for any board using this workflow that has isActiveNow=true
            const boardsWithThisWorkflow = boards.filter(b => b.isActive && b.defaultWorkflowId === workflow.workflowId);
            const isActive = boardsWithThisWorkflow.some(board => {
              const state = boardStates[board.boardId];
              return state?.isActiveNow === true;
            });

            // Build schedule string for display (no time computation, just formatting)
            if (schedule.type === 'dailyWindow' || schedule.type === 'timeWindow') {
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
            } else if (schedule.type === 'specificDateRange') {
              scheduleStr = `${schedule.startDate} - ${schedule.endDate}`;
            }

            return (
              <WorkflowCard
                key={workflow.workflowId}
                workflow={workflow}
                boards={boards}
                boardStates={boardStates}
                savedScreens={savedScreens}
                isActive={isActive}
                scheduleStr={scheduleStr}
                enabledSteps={enabledSteps}
                editingWorkflowId={editingWorkflowId}
                setEditingWorkflowId={setEditingWorkflowId}
                stepDurations={stepDurations}
                setStepDurations={setStepDurations}
                stepUnits={stepUnits}
                setStepUnits={setStepUnits}
                handleDelete={handleDelete}
                handleToggleActive={handleToggleActive}
                handleResyncWorkflow={handleResyncWorkflow}
                addCustomScreenToWorkflow={addCustomScreenToWorkflow}
                fetchData={fetchData}
                convertToSeconds={convertToSeconds}
                convertFromSeconds={convertFromSeconds}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Workflows;
