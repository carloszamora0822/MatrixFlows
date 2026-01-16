import { useNavigate } from 'react-router-dom';
import MiniVestaboard from '../MiniVestaboard';

const SCREEN_TYPES = [
  { value: 'BIRTHDAY', label: '🎂 Birthday' },
  { value: 'CHECKRIDES', label: '✈️ Checkrides' },
  { value: 'UPCOMING_EVENTS', label: '📅 Events' },
  { value: 'NEWEST_PILOT', label: '🎓 Newest Pilot' },
  { value: 'EMPLOYEE_RECOGNITION', label: '⭐ Recognition' },
  { value: 'WEATHER', label: '🌤️ Weather' },
  { value: 'METAR', label: '🛩️ METAR' }
];

const WorkflowCard = ({
  workflow,
  boards,
  boardStates,
  savedScreens,
  isActive,
  scheduleStr,
  enabledSteps,
  editingWorkflowId,
  setEditingWorkflowId,
  stepDurations,
  setStepDurations,
  stepUnits,
  setStepUnits,
  handleDelete,
  handleToggleActive,
  handleResyncWorkflow,
  addCustomScreenToWorkflow,
  fetchData,
  convertToSeconds,
  convertFromSeconds
}) => {
  const navigate = useNavigate();

  return (
    <div className={`bg-white rounded-lg border-4 shadow-lg p-6 ${isActive ? 'border-green-500 bg-green-50' : 'border-gray-200'} relative`}>
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

          {/* Board Assignment Info */}
          <BoardAssignmentInfo workflow={workflow} boards={boards} />

          {/* Next Trigger Time */}
          {isActive && (
            <NextTriggerDisplay workflow={workflow} boards={boards} boardStates={boardStates} />
          )}

          {/* Desync Detection */}
          <DesyncWarning
            workflow={workflow}
            boards={boards}
            boardStates={boardStates}
            handleResyncWorkflow={handleResyncWorkflow}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {editingWorkflowId === workflow.workflowId ? (
            <EditModeButtons
              workflow={workflow}
              enabledSteps={enabledSteps}
              stepDurations={stepDurations}
              savedScreens={savedScreens}
              setEditingWorkflowId={setEditingWorkflowId}
              setStepDurations={setStepDurations}
              fetchData={fetchData}
            />
          ) : (
            <ViewModeButtons
              workflow={workflow}
              handleToggleActive={handleToggleActive}
              handleDelete={handleDelete}
              navigate={navigate}
            />
          )}
        </div>
      </div>

      {/* Drag and Drop Mode Notice */}
      {editingWorkflowId === workflow.workflowId && (
        <div className="mb-4 p-3 bg-purple-50 border-2 border-purple-400 rounded-lg">
          <p className="text-purple-800 font-semibold">🎯 Drag and drop mode active! Grab the screens to reorder them.</p>
        </div>
      )}

      {/* Add Saved Screens Section */}
      {editingWorkflowId === workflow.workflowId && savedScreens.length > 0 && (
        <SavedScreensSection
          savedScreens={savedScreens}
          workflow={workflow}
          addCustomScreenToWorkflow={addCustomScreenToWorkflow}
        />
      )}

      {/* Steps List */}
      <StepsList
        workflow={workflow}
        enabledSteps={enabledSteps}
        savedScreens={savedScreens}
        editingWorkflowId={editingWorkflowId}
        stepDurations={stepDurations}
        setStepDurations={setStepDurations}
        stepUnits={stepUnits}
        setStepUnits={setStepUnits}
        fetchData={fetchData}
        convertToSeconds={convertToSeconds}
        convertFromSeconds={convertFromSeconds}
      />
    </div>
  );
};

// Sub-components

const BoardAssignmentInfo = ({ workflow, boards }) => {
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
  }

  if (inactiveBoards.length > 0) {
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
  }

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
};

const NextTriggerDisplay = ({ workflow, boards, boardStates }) => {
  const assignedBoard = boards.find(b => b.defaultWorkflowId === workflow.workflowId);

  if (!assignedBoard) {
    return (
      <p className="text-xs text-green-700 mt-1 font-semibold">
        ⏰ Next trigger: Not scheduled
      </p>
    );
  }

  const boardState = boardStates[assignedBoard.boardId];
  const nextTriggerTime = boardState?.nextScheduledTrigger
    ? new Date(boardState.nextScheduledTrigger)
    : null;

  if (!nextTriggerTime) {
    return (
      <p className="text-xs text-green-700 mt-1 font-semibold">
        ⏰ Next trigger: Pending first run
      </p>
    );
  }

  return (
    <p className="text-xs text-green-700 mt-1 font-semibold">
      ⏰ Next trigger: {nextTriggerTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Chicago'
      })}
    </p>
  );
};

const DesyncWarning = ({ workflow, boards, boardStates, handleResyncWorkflow }) => {
  const boardsWithWorkflow = boards.filter(b =>
    b.isActive && b.defaultWorkflowId === workflow.workflowId
  );

  if (boardsWithWorkflow.length < 2) return null;

  const triggerTimes = boardsWithWorkflow.map(b => {
    const state = boardStates[b.boardId];
    return state?.nextScheduledTrigger ? new Date(state.nextScheduledTrigger).getTime() : null;
  }).filter(t => t !== null);

  const isDesynchronized = triggerTimes.length > 1 &&
    !triggerTimes.every(t => t === triggerTimes[0]);

  if (!isDesynchronized) return null;

  const maxDiff = Math.max(...triggerTimes) - Math.min(...triggerTimes);
  const diffSeconds = Math.round(maxDiff / 1000);

  return (
    <div className="mt-2 p-2 bg-red-50 border border-red-300 rounded text-xs">
      <div className="flex items-center justify-between">
        <span className="text-red-800 font-semibold">
          ⚠️ Boards out of sync! ({diffSeconds}s difference)
        </span>
        <button
          onClick={() => handleResyncWorkflow(workflow.workflowId)}
          className="ml-2 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
        >
          Fix Now
        </button>
      </div>
    </div>
  );
};

const EditModeButtons = ({
  workflow,
  enabledSteps,
  stepDurations,
  savedScreens,
  setEditingWorkflowId,
  setStepDurations,
  fetchData
}) => {
  const handleSave = async () => {
    const reorderedSteps = enabledSteps.map((step, idx) => ({
      ...step,
      order: idx,
      displaySeconds: stepDurations[`${workflow.workflowId}-${idx}`] || step.displaySeconds
    }));

    try {
      // Update custom screens if modified
      for (const step of reorderedSteps) {
        if (step.screenType === 'CUSTOM_MESSAGE' && step.screenConfig?.customScreenId) {
          const originalScreen = savedScreens.find(s => s.screenId === step.screenConfig.customScreenId);
          if (originalScreen && step.screenConfig.message && step.screenConfig.message !== originalScreen.message) {
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

      // Save workflow
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
  };

  // Duration warning
  const currentTotalSeconds = enabledSteps.reduce((sum, step, idx) => {
    const stepKey = `${workflow.workflowId}-${idx}`;
    return sum + (stepDurations[stepKey] || step.displaySeconds || 0);
  }, 0);
  const currentTotalMinutes = Math.ceil(currentTotalSeconds / 60);
  const frequencyMinutes = workflow.schedule?.updateIntervalMinutes || 30;

  return (
    <>
      {currentTotalSeconds > frequencyMinutes * 60 && (
        <div className="w-full mb-4 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
          <p className="text-red-800 font-bold text-sm mb-2">
            ⚠️ Warning: Workflow Duration Exceeds Frequency!
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
      )}
      <button
        onClick={handleSave}
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
  );
};

const ViewModeButtons = ({ workflow, handleToggleActive, handleDelete, navigate }) => (
  <>
    <div className="flex items-center space-x-2">
      <span className={`text-sm font-semibold ${workflow.isActive !== false ? 'text-green-600' : 'text-gray-500'}`}>
        {workflow.isActive !== false ? 'Active' : 'Inactive'}
      </span>
      <button
        onClick={() => handleToggleActive(workflow)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          workflow.isActive !== false ? 'bg-green-600' : 'bg-gray-300'
        }`}
        title={workflow.isActive !== false ? 'Click to disable workflow' : 'Click to enable workflow'}
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
);

const SavedScreensSection = ({ savedScreens, workflow, addCustomScreenToWorkflow }) => (
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
);

const StepsList = ({
  workflow,
  enabledSteps,
  savedScreens,
  editingWorkflowId,
  stepDurations,
  setStepDurations,
  stepUnits,
  setStepUnits,
  fetchData,
  convertToSeconds,
  convertFromSeconds
}) => {
  const isEditing = editingWorkflowId === workflow.workflowId;

  return (
    <div className="space-y-4 flex flex-col items-center">
      {enabledSteps.map((step, idx) => (
        <StepItem
          key={idx}
          step={step}
          idx={idx}
          workflow={workflow}
          enabledSteps={enabledSteps}
          savedScreens={savedScreens}
          isEditing={isEditing}
          stepDurations={stepDurations}
          setStepDurations={setStepDurations}
          stepUnits={stepUnits}
          setStepUnits={setStepUnits}
          fetchData={fetchData}
          convertToSeconds={convertToSeconds}
          convertFromSeconds={convertFromSeconds}
        />
      ))}
    </div>
  );
};

const StepItem = ({
  step,
  idx,
  workflow,
  enabledSteps,
  savedScreens,
  isEditing,
  stepDurations,
  setStepDurations,
  stepUnits,
  setStepUnits,
  fetchData,
  convertToSeconds,
  convertFromSeconds
}) => {
  const screenType = SCREEN_TYPES.find(t => t.value === step.screenType);
  let label = screenType?.label || step.screenType;

  if (step.screenType === 'CUSTOM_MESSAGE') {
    if (step.screenConfig?.name) {
      label = `🎨 ${step.screenConfig.name}`;
    } else {
      const matchingScreen = savedScreens.find(s => s.message === step.screenConfig?.message);
      label = matchingScreen?.name ? `🎨 ${matchingScreen.name}` : '🎨 Custom Screen';
    }
  }

  const stepKey = `${workflow.workflowId}-${idx}`;
  const currentSeconds = stepDurations[stepKey] || step.displaySeconds;
  const converted = convertFromSeconds(currentSeconds);
  const currentUnit = stepUnits[stepKey] || converted.unit;
  const displayValue = stepUnits[stepKey]
    ? (currentUnit === 'hours' ? currentSeconds / 3600 : currentUnit === 'minutes' ? currentSeconds / 60 : currentSeconds)
    : converted.value;

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idx);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const toIndex = idx;

    if (fromIndex !== toIndex) {
      const newSteps = [...enabledSteps];
      const [movedStep] = newSteps.splice(fromIndex, 1);
      newSteps.splice(toIndex, 0, movedStep);
      const reorderedSteps = newSteps.map((s, i) => ({ ...s, order: i }));

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
          fetchData();
        } else {
          alert('❌ Failed to save new order');
        }
      } catch (error) {
        console.error('Failed to save order:', error);
        alert('❌ Network error');
      }
    }
  };

  const handleRemoveStep = async () => {
    const isCustomMessage = step.screenType === 'CUSTOM_MESSAGE';
    const confirmMsg = `Remove this ${isCustomMessage ? 'custom screen' : label} from workflow?`;

    if (window.confirm(confirmMsg)) {
      const newSteps = enabledSteps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i }));

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
          fetchData();
        } else {
          alert('❌ Failed to remove screen');
        }
      } catch (error) {
        console.error('Failed to remove:', error);
        alert('❌ Network error');
      }
    }
  };

  return (
    <div className="relative flex flex-col items-center w-full">
      <MiniVestaboard
        screenType={step.screenType}
        screenConfig={step.screenConfig}
        displaySeconds={currentSeconds}
        stepNumber={idx + 1}
        isFirst={idx === 0}
        isLast={idx === enabledSteps.length - 1}
        draggable={isEditing}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />

      <div className="mt-2 flex items-center justify-center gap-4 w-full">
        <div className="text-sm font-semibold text-gray-700">{label}</div>
        {isEditing && enabledSteps.length > 1 && (
          <button
            onClick={handleRemoveStep}
            className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 font-semibold"
          >
            🗑️ Remove
          </button>
        )}
      </div>

      {/* Duration Editor */}
      <DurationEditor
        step={step}
        isEditing={isEditing}
        stepKey={stepKey}
        displayValue={displayValue}
        currentUnit={currentUnit}
        stepDurations={stepDurations}
        setStepDurations={setStepDurations}
        stepUnits={stepUnits}
        setStepUnits={setStepUnits}
        convertToSeconds={convertToSeconds}
      />

      {/* Color Customization */}
      {(step.screenType === 'CHECKRIDES' || step.screenType === 'UPCOMING_EVENTS' || step.screenType === 'EMPLOYEE_RECOGNITION') && isEditing && (
        <ColorCustomization step={step} />
      )}

      {/* Expiration Settings */}
      {step.screenType === 'CUSTOM_MESSAGE' && isEditing && (
        <ExpirationSettings step={step} />
      )}

      {/* Arrow */}
      {idx < enabledSteps.length - 1 && (
        <div className="flex justify-center my-2">
          <div className="text-blue-400 text-3xl">↓</div>
        </div>
      )}
    </div>
  );
};

const DurationEditor = ({
  step,
  isEditing,
  stepKey,
  displayValue,
  currentUnit,
  stepDurations,
  setStepDurations,
  stepUnits,
  setStepUnits,
  convertToSeconds
}) => (
  <div className="flex justify-center my-3 w-full">
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
              setStepUnits({
                ...stepUnits,
                [stepKey]: e.target.value
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
  </div>
);

const ColorCustomization = ({ step }) => (
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
);

const ExpirationSettings = ({ step }) => (
  <div className="flex justify-center my-3 w-full">
    <div className="bg-orange-50 border-2 border-orange-400 px-4 py-3 rounded-lg w-full max-w-md">
      <label className="flex items-center gap-2 cursor-pointer mb-2">
        <input
          type="checkbox"
          checked={step.screenConfig?.hasExpiration || false}
          onChange={(e) => {
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
);

export default WorkflowCard;
