import React, { useState, useEffect, Fragment } from 'react';
import MiniVestaboard from './MiniVestaboard';

const WorkflowEditor = ({ workflow, onSave, onCancel, hideHeader = false, showButtons = false, onCreateWorkflow, onSaveAndTrigger }) => {
  const [steps, setSteps] = useState(workflow?.steps || []);
  
  // Track the display unit for each step (seconds, minutes, hours)
  const [stepUnits, setStepUnits] = useState({});

  // Auto-sync steps to parent when they change (only when buttons are hidden)
  useEffect(() => {
    if (onSave && !showButtons) {
      console.log('🔄 Auto-syncing steps to parent:', steps.length, 'steps');
      onSave(steps);
    }
  }, [steps]);
  const [availableScreens, setAvailableScreens] = useState({
    builtin: [],
    custom: []
  });
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedFromWorkflow, setDraggedFromWorkflow] = useState(false);
  const [dropPreviewIndex, setDropPreviewIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mouseY, setMouseY] = useState(0);

  const builtinScreenTypes = [
    { value: 'BIRTHDAY', label: '🎂 Birthday', emoji: '🎂' },
    { value: 'CHECKRIDES', label: '✈️ Checkrides', emoji: '✈️' },
    { value: 'UPCOMING_EVENTS', label: '📅 Events', emoji: '📅' },
    { value: 'NEWEST_PILOT', label: '🎓 Newest Pilot', emoji: '🎓' },
    { value: 'EMPLOYEE_RECOGNITION', label: '⭐ Recognition', emoji: '⭐' },
    { value: 'WEATHER', label: '🌤️ Weather', emoji: '🌤️' },
    { value: 'METAR', label: '🛩️ METAR', emoji: '🛩️' }
  ];

  useEffect(() => {
    loadAvailableScreens();
  }, []);

  // Track mouse position globally when dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      setMouseY(e.clientY);
    };

    document.addEventListener('dragover', handleMouseMove);
    return () => document.removeEventListener('dragover', handleMouseMove);
  }, [isDragging]);

  // Auto-scroll effect when dragging
  useEffect(() => {
    if (!isDragging) return;

    const scrollInterval = setInterval(() => {
      const scrollThreshold = 150;
      const scrollSpeed = 20;

      // Scroll down if near bottom
      if (mouseY > window.innerHeight - scrollThreshold) {
        window.scrollBy(0, scrollSpeed);
        console.log('⬇️ Scrolling down, mouseY:', mouseY);
      }
      // Scroll up if near top
      else if (mouseY < scrollThreshold && mouseY > 0) {
        window.scrollBy(0, -scrollSpeed);
        console.log('⬆️ Scrolling up, mouseY:', mouseY);
      }
    }, 50);

    return () => clearInterval(scrollInterval);
  }, [isDragging, mouseY]);

  const loadAvailableScreens = async () => {
    // Load custom screens
    try {
      const response = await fetch('/api/custom-screens', { credentials: 'include' });
      if (response.ok) {
        const customScreens = await response.json();
        setAvailableScreens(prev => ({
          ...prev,
          custom: customScreens
        }));
      }
    } catch (error) {
      console.error('Failed to load custom screens:', error);
    }

    // Built-in screens are already defined
    setAvailableScreens(prev => ({
      ...prev,
      builtin: builtinScreenTypes
    }));
  };

  const handleDragStart = (e, item, fromWorkflow = false) => {
    console.log('🎯 Drag started:', item);
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.setData('fromWorkflow', fromWorkflow.toString());
    setDraggedItem(item);
    setDraggedFromWorkflow(fromWorkflow);
    setIsDragging(true);
    setMouseY(e.clientY);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDropPreviewIndex(index);
    setMouseY(e.clientY); // Update mouse position for scrolling
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Don't clear preview immediately - let the next dragover handle it
    // This prevents glitching when moving between zones
  };

  const handleDragEnd = () => {
    console.log('🏁 Drag ended');
    setIsDragging(false);
    setDropPreviewIndex(null);
  };

  const handleDropOnWorkflow = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDropPreviewIndex(null);
    
    if (!draggedItem) {
      console.log('❌ No dragged item');
      return;
    }

    console.log('📦 Dropping item at index:', dropIndex);
    console.log('📦 Dragged item:', draggedItem);
    console.log('📦 From workflow:', draggedFromWorkflow);

    if (draggedFromWorkflow) {
      // Reordering within workflow
      const newSteps = [...steps];
      const draggedStep = newSteps[draggedItem.index];
      newSteps.splice(draggedItem.index, 1);
      newSteps.splice(dropIndex, 0, draggedStep);
      
      // Update order
      newSteps.forEach((step, idx) => {
        step.order = idx;
      });
      
      console.log('✅ Reordered steps:', newSteps.length);
      setSteps(newSteps);
    } else {
      // Adding new screen to workflow
      const newStep = {
        stepId: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        screenType: draggedItem.screenType || draggedItem.value,
        screenConfig: draggedItem.screenConfig || {},
        displaySeconds: 20,
        isEnabled: true,
        order: dropIndex
      };

      console.log('➕ Adding new step:', newStep);

      const newSteps = [...steps];
      newSteps.splice(dropIndex, 0, newStep);
      
      // Update order
      newSteps.forEach((step, idx) => {
        step.order = idx;
      });
      
      console.log('✅ New steps array:', newSteps.length, 'steps');
      setSteps(newSteps);
    }

    setDraggedItem(null);
    setDraggedFromWorkflow(false);
    setIsDragging(false);
    setDropPreviewIndex(null);
  };

  const handleRemoveStep = (index) => {
    const newSteps = steps.filter((_, idx) => idx !== index);
    newSteps.forEach((step, idx) => {
      step.order = idx;
    });
    setSteps(newSteps);
  };

  // Helper to get the current unit for a step
  const getStepUnit = (index, step) => {
    // Use stored unit if available, otherwise infer from displaySeconds
    if (stepUnits[index]) {
      return stepUnits[index];
    }
    // Infer unit from displaySeconds
    if (step.displaySeconds >= 3600) return 'hours';
    if (step.displaySeconds >= 60) return 'minutes';
    return 'seconds';
  };

  const handleDurationChange = (index, value, unit) => {
    const newSteps = [...steps];
    let seconds = parseInt(value);
    
    // Convert to seconds based on unit
    if (unit === 'minutes') seconds = seconds * 60;
    if (unit === 'hours') seconds = seconds * 3600;
    
    newSteps[index].displaySeconds = seconds;
    setSteps(newSteps);
    
    // Store the unit for this step
    setStepUnits(prev => ({ ...prev, [index]: unit }));
  };

  const incrementDelay = (index, unit) => {
    const step = steps[index];
    let currentValue = step.displaySeconds;
    
    if (unit === 'minutes') currentValue = Math.floor(currentValue / 60);
    if (unit === 'hours') currentValue = Math.floor(currentValue / 3600);
    
    handleDurationChange(index, currentValue + 1, unit);
  };

  const decrementDelay = (index, unit) => {
    const step = steps[index];
    let currentValue = step.displaySeconds;
    
    if (unit === 'minutes') currentValue = Math.floor(currentValue / 60);
    if (unit === 'hours') currentValue = Math.floor(currentValue / 3600);
    
    if (currentValue > 1) {
      handleDurationChange(index, currentValue - 1, unit);
    }
  };

  const handleSaveWorkflow = async () => {
    onSave(steps);
  };

  return (
    <div className={`relative ${hideHeader ? '' : 'min-h-screen bg-gradient-to-br from-gray-50 to-blue-50'}`}>
      {/* Global dim overlay when dragging */}
      {isDragging && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-10 pointer-events-none" />
      )}
      {/* Header */}
      {!hideHeader && (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">✨ Workflow Editor</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Drag screens from the right panel into your workflow on the left
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveWorkflow}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-lg"
                >
                  💾 Save Workflow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* LEFT: Current Workflow */}
          <div className="col-span-1 flex flex-col">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">📋 Your Workflow ({steps.length} screens)</h3>
              <p className="text-xs text-gray-500">Drag to reorder • Click ⏱️ to change duration</p>
            </div>
            
            <div className="flex-1 space-y-4">
              {steps.length === 0 ? (
                <div
                  onDragOver={(e) => handleDragOver(e, 0)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropOnWorkflow(e, 0)}
                  className={`min-h-[400px] border-4 border-dashed rounded-xl flex items-center justify-center transition-all ${
                    dropPreviewIndex === 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  {dropPreviewIndex === 0 && isDragging && draggedItem ? (
                    <div className="text-center">
                      <div className="text-blue-600 font-bold text-lg mb-4">Drop here to add</div>
                      <div className="opacity-60">
                        <MiniVestaboard
                          screenType={draggedItem.screenType || draggedItem.value}
                          screenConfig={draggedItem.screenConfig || {}}
                          displaySeconds={20}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <div className="text-6xl mb-3">👈</div>
                      <p className="font-semibold">Drag screens here to build your workflow</p>
                      <p className="text-sm mt-1">Start by dragging a screen from the right panel</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {steps.map((step, index) => (
                    <React.Fragment key={step.stepId}>
                      {/* Drop zone - ALWAYS present */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          handleDragOver(e, index);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropOnWorkflow(e, index);
                        }}
                        className="min-h-[20px]"
                      >
                        {/* Preview - shows when hovering */}
                        {dropPreviewIndex === index && isDragging && draggedItem && (
                          <div className="mb-4 border-4 border-dashed border-blue-500 bg-white rounded-xl p-6 shadow-2xl">
                            <div className="text-blue-600 font-bold text-center mb-4">Drop here</div>
                            <div className="flex justify-center">
                              <MiniVestaboard
                                screenType={draggedItem.screenType || draggedItem.value}
                                screenConfig={draggedItem.screenConfig || {}}
                                displaySeconds={20}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* BOARD */}
                      <div>

                        {/* BOARD - Matches original workflow viewer */}
                        <div 
                          className="bg-white rounded-lg shadow-md border border-gray-200 p-3 relative z-0 transition-opacity cursor-move"
                          style={{ opacity: isDragging && draggedFromWorkflow && draggedItem?.index === index ? 0.3 : 1 }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, { ...step, index }, true)}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-lg font-bold text-gray-400">
                              {index + 1}
                            </div>
                            <button
                              onClick={() => handleRemoveStep(index)}
                              className="w-6 h-6 flex items-center justify-center bg-red-100 hover:bg-red-200 border border-red-300 rounded text-sm transition-colors"
                            >
                              ❌
                            </button>
                          </div>
                          
                          <MiniVestaboard
                            screenType={step.screenType}
                            screenConfig={step.screenConfig}
                            displaySeconds={step.displaySeconds}
                          />
                          
                          <div className="mt-2 text-center">
                            <p className="text-xs font-semibold text-gray-500">
                              {index === 0 && 'FIRST'}
                              {index === steps.length - 1 && index !== 0 && 'LAST'}
                            </p>
                            <p className="text-xs font-semibold text-gray-700 mt-0.5">
                              {step.screenConfig?.name || 
                               builtinScreenTypes.find(s => s.value === step.screenType)?.label || 
                               step.screenType}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* DELAY TIME - Editable with dropdown */}
                      <div className="flex flex-col items-center py-2">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">DELAY TIME</p>
                        <div className="flex items-center gap-2 bg-blue-50 border-2 border-blue-200 rounded-lg px-2 py-1.5">
                          <input
                            type="number"
                            value={(() => {
                              const unit = getStepUnit(index, step);
                              if (unit === 'hours') return Math.floor(step.displaySeconds / 3600);
                              if (unit === 'minutes') return Math.floor(step.displaySeconds / 60);
                              return step.displaySeconds;
                            })()}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              const unit = getStepUnit(index, step);
                              handleDurationChange(index, value, unit);
                            }}
                            min="1"
                            className="w-16 px-2 py-1 border border-blue-300 rounded text-center font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                          <select
                            value={getStepUnit(index, step)}
                            onChange={(e) => {
                              const currentUnit = getStepUnit(index, step);
                              let currentValue = step.displaySeconds;
                              if (currentUnit === 'hours') currentValue = Math.floor(currentValue / 3600);
                              if (currentUnit === 'minutes') currentValue = Math.floor(currentValue / 60);
                              handleDurationChange(index, currentValue, e.target.value);
                            }}
                            className="px-2 py-1 border border-blue-300 rounded font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                          >
                            <option value="seconds">seconds</option>
                            <option value="minutes">minutes</option>
                            <option value="hours">hours</option>
                          </select>
                        </div>
                        {index !== steps.length - 1 && (
                          <div className="mt-1.5 text-gray-400 text-base">↓</div>
                        )}
                      </div>
                    </React.Fragment>
                  ))}

                  {/* Final drop zone - ALWAYS present */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      handleDragOver(e, steps.length);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnWorkflow(e, steps.length);
                    }}
                    className="min-h-[40px] mt-4"
                  >
                    {/* Preview - shows when hovering */}
                    {dropPreviewIndex === steps.length && isDragging && draggedItem && (
                      <div className="border-4 border-dashed border-blue-500 bg-white rounded-xl p-6 shadow-2xl">
                        <div className="text-blue-600 font-bold text-center mb-4">Drop here</div>
                        <div className="flex justify-center">
                          <MiniVestaboard
                            screenType={draggedItem.screenType || draggedItem.value}
                            screenConfig={draggedItem.screenConfig || {}}
                            displaySeconds={20}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons for Create Workflow Page */}
                  {showButtons && (
                    <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col gap-3">
                      <button
                        onClick={() => {
                          console.log('💾 Saving workflow with steps:', steps);
                          console.log('💾 Workflow object:', workflow);
                          if (onCreateWorkflow) {
                            onCreateWorkflow(steps);
                          } else if (onSave) {
                            onSave(steps);
                          }
                        }}
                        className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 font-bold shadow-xl text-lg transition-all transform hover:scale-105"
                      >
                        💾 {workflow?.workflowId && workflow.workflowId !== 'new' ? 'Save Workflow' : 'Create Workflow'}
                      </button>
                      {onSaveAndTrigger && workflow?.workflowId && workflow.workflowId !== 'new' && (
                        <button
                          onClick={() => {
                            console.log('🚀 Saving and triggering workflow with steps:', steps);
                            onSaveAndTrigger(steps);
                          }}
                          className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-bold shadow-xl text-lg transition-all transform hover:scale-105"
                        >
                          🚀 Save & Trigger Now
                        </button>
                      )}
                      <button
                        onClick={onCancel}
                        className="w-full px-6 py-4 text-gray-600 hover:text-gray-800 font-semibold text-lg border-2 border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* RIGHT: Available Screens (2 columns) */}
          <div className="col-span-2 flex flex-col border-l-4 border-gray-300 pl-6">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">🎨 Available Screens</h3>
              <p className="text-xs text-gray-500">Drag any screen to add it to your workflow</p>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Custom Screens */}
              {availableScreens.custom.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-4">📚 Custom Screens</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {availableScreens.custom.map((screen) => (
                      <div
                        key={screen.screenId}
                        draggable
                        onDragStart={(e) => handleDragStart(e, {
                          screenType: 'CUSTOM_MESSAGE',
                          screenConfig: { customScreenId: screen.screenId, name: screen.name }
                        })}
                        onDragEnd={handleDragEnd}
                        className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 cursor-move hover:border-orange-400 hover:shadow-lg transition-all"
                      >
                        <p className="text-sm font-semibold text-center mb-3">{screen.name}</p>
                        <div className="flex justify-center">
                          <MiniVestaboard
                            screenType="CUSTOM_MESSAGE"
                            screenConfig={{ customScreenId: screen.screenId }}
                            displaySeconds={20}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Built-in Screens */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h4 className="text-sm font-bold text-gray-700 mb-4">🏗️ Built-in Screens</h4>
                <div className="grid grid-cols-2 gap-4">
                  {availableScreens.builtin.map((screen) => (
                    <div
                      key={screen.value}
                      draggable
                      onDragStart={(e) => handleDragStart(e, {
                        screenType: screen.value,
                        screenConfig: {}
                      })}
                      onDragEnd={handleDragEnd}
                      className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 cursor-move hover:border-blue-400 hover:shadow-lg transition-all"
                    >
                      <p className="text-sm font-semibold text-center mb-3">{screen.label}</p>
                      <div className="flex justify-center">
                        <MiniVestaboard
                          screenType={screen.value}
                          screenConfig={{}}
                          displaySeconds={20}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowEditor;
