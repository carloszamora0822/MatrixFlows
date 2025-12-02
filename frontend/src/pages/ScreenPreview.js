import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import MatrixPreview from '../components/ui/MatrixPreview';
import { useScreenPreview } from '../hooks/useScreenPreview';

const ScreenPreview = () => {
  const [selectedScreenType, setSelectedScreenType] = useState('BIRTHDAY');
  const { matrix, loading, error, generatePreview, clearPreview, hasPreview } = useScreenPreview();

  const screenTypes = [
    { value: 'BIRTHDAY', label: '🎂 Birthday', description: 'Celebrate team member birthdays' },
    { value: 'CHECKRIDES', label: '✈️ Checkrides', description: 'Display upcoming flight checkrides' },
    { value: 'UPCOMING_EVENTS', label: '📅 Upcoming Events', description: 'Show scheduled events and activities' },
    { value: 'NEWEST_PILOT', label: '🎓 Newest Pilot', description: 'Congratulate new pilots' },
    { value: 'EMPLOYEE_RECOGNITION', label: '⭐ Employee Recognition', description: 'Highlight employee achievements' },
    { value: 'WEATHER', label: '🌤️ Weather', description: 'Display current weather conditions' },
    { value: 'METAR', label: '🛩️ METAR', description: 'Display aviation weather reports' }
  ];

  const handleGeneratePreview = () => {
    generatePreview(selectedScreenType);
  };

  const handleClearPreview = () => {
    clearPreview();
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Screen Preview</h1>
            <p className="mt-2 text-gray-600">
              Test the Vestaboard screen rendering engine with different screen types
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Controls */}
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Screen Configuration</h2>
                
                {/* Screen Type Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Screen Type
                  </label>
                  <div className="space-y-3">
                    {screenTypes.map((type) => (
                      <label key={type.value} className="flex items-start">
                        <input
                          type="radio"
                          name="screenType"
                          value={type.value}
                          checked={selectedScreenType === type.value}
                          onChange={(e) => setSelectedScreenType(e.target.value)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {type.label}
                          </div>
                          <div className="text-sm text-gray-500">
                            {type.description}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={handleGeneratePreview}
                    disabled={loading}
                    className="btn-primary flex items-center"
                  >
                    {loading && (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {loading ? 'Generating...' : 'Generate Preview'}
                  </button>
                  
                  {hasPreview && (
                    <button
                      onClick={handleClearPreview}
                      className="btn-secondary"
                    >
                      Clear Preview
                    </button>
                  )}
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Preview Error</h3>
                        <p className="mt-1 text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info Panel */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">How it works</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Select a screen type to preview</li>
                    <li>• Click "Generate Preview" to render the matrix</li>
                    <li>• The preview shows exactly what appears on the Vestaboard</li>
                    <li>• Colors represent different character codes (63-70)</li>
                    <li>• Text characters appear as letters/numbers on dark background</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Preview Display */}
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Matrix Preview</h2>
                
                {!hasPreview && !loading && !error && (
                  <div className="text-center py-12">
                    <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-gray-100 mb-4">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Preview</h3>
                    <p className="text-gray-500">Select a screen type and click "Generate Preview" to see the matrix</p>
                  </div>
                )}

                {loading && (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Preview</h3>
                    <p className="text-gray-500">Rendering {selectedScreenType} screen...</p>
                  </div>
                )}

                {hasPreview && (
                  <div className="flex justify-center">
                    <MatrixPreview 
                      matrix={matrix} 
                      title={`${screenTypes.find(t => t.value === selectedScreenType)?.label} Preview`}
                    />
                  </div>
                )}
              </div>

              {/* Screen Type Info */}
              {selectedScreenType && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {screenTypes.find(t => t.value === selectedScreenType)?.label}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {screenTypes.find(t => t.value === selectedScreenType)?.description}
                  </p>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Sample Data Used</h4>
                    <div className="text-sm text-gray-600">
                      {selectedScreenType === 'BIRTHDAY' && (
                        <div>Name: John, Date: Dec 15</div>
                      )}
                      {selectedScreenType === 'CHECKRIDES' && (
                        <div>Time: 10:00 AM, Callsign: N123AB, Type: PPL Checkride</div>
                      )}
                      {selectedScreenType === 'UPCOMING_EVENTS' && (
                        <div>Date: Dec 20, Time: 6:00 PM, Event: Holiday Party</div>
                      )}
                      {selectedScreenType === 'NEWEST_PILOT' && (
                        <div>Name: Sarah Johnson</div>
                      )}
                      {selectedScreenType === 'EMPLOYEE_RECOGNITION' && (
                        <div>Name: Mike Davis</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ScreenPreview;
