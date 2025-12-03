import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import MatrixPreview from '../components/ui/MatrixPreview';

const ScreenPreview = () => {
  const [screenPreviews, setScreenPreviews] = useState({});
  const [savedScreens, setSavedScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customForm, setCustomForm] = useState({
    screenName: '',
    customMessage: '',
    borderColor1: 'red',
    borderColor2: 'orange'
  });
  const [customPreview, setCustomPreview] = useState(null);

  const screenTypes = [
    { value: 'BIRTHDAY', label: '🎂 Birthday' },
    { value: 'CHECKRIDES', label: '✈️ Checkrides' },
    { value: 'UPCOMING_EVENTS', label: '📅 Events' },
    { value: 'NEWEST_PILOT', label: '🎓 Newest Pilot' },
    { value: 'EMPLOYEE_RECOGNITION', label: '⭐ Recognition' },
    { value: 'WEATHER', label: '🌤️ Weather' },
    { value: 'METAR', label: '🛩️ METAR' }
  ];

  useEffect(() => {
    loadAllPreviews();
    loadSavedScreens();
  }, []);

  const loadAllPreviews = async () => {
    setLoading(true);
    const previews = {};
    
    for (const screen of screenTypes) {
      try {
        const res = await fetch('/api/screens/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ screenType: screen.value, screenConfig: {} })
        });
        const data = await res.json();
        if (data.matrix) {
          previews[screen.value] = data.matrix;
        }
      } catch (error) {
        console.error(`Failed to load ${screen.value}:`, error);
      }
    }
    
    setScreenPreviews(previews);
    setLoading(false);
  };

  const loadSavedScreens = async () => {
    try {
      const res = await fetch('/api/custom-screens', { credentials: 'include' });
      if (res.ok) {
        const screens = await res.json();
        setSavedScreens(screens);
      }
    } catch (error) {
      console.error('Failed to load saved screens:', error);
    }
  };

  const handleCustomPreview = async () => {
    if (!customForm.customMessage) return;
    
    try {
      const res = await fetch('/api/screens/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          screenType: 'CUSTOM_MESSAGE',
          screenConfig: {
            message: customForm.customMessage,
            borderColor1: customForm.borderColor1,
            borderColor2: customForm.borderColor2
          }
        })
      });
      const data = await res.json();
      if (data.matrix) {
        setCustomPreview(data.matrix);
      }
    } catch (error) {
      console.error('Failed to generate preview:', error);
    }
  };

  const handleSaveCustom = async () => {
    if (!customForm.screenName || !customForm.customMessage || !customPreview) {
      alert('Please fill in all fields and generate a preview first');
      return;
    }

    try {
      const res = await fetch('/api/custom-screens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: customForm.screenName,
          message: customForm.customMessage,
          borderColor1: customForm.borderColor1,
          borderColor2: customForm.borderColor2,
          matrix: customPreview
        })
      });

      if (res.ok) {
        alert('✅ Custom screen saved!');
        setCustomForm({ screenName: '', customMessage: '', borderColor1: 'red', borderColor2: 'orange' });
        setCustomPreview(null);
        loadSavedScreens();
      }
    } catch (error) {
      console.error('Failed to save custom screen:', error);
      alert('❌ Failed to save screen');
    }
  };

  const handleDeleteCustom = async (screenId, screenName) => {
    if (!window.confirm(`Delete "${screenName}" from library?`)) return;

    try {
      const res = await fetch(`/api/custom-screens?id=${screenId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        alert('✅ Screen deleted');
        loadSavedScreens();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('❌ Failed to delete screen');
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">📺 Screen Library</h1>
            <p className="mt-2 text-gray-600">
              Browse all available screen types, create custom screens, and manage your library
            </p>
          </div>

          {/* All Built-in Screens */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Built-in Screens</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading screens...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {screenTypes.map((screen) => (
                  <div key={screen.value} className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">{screen.label}</h3>
                    <div className="flex justify-center">
                      {screenPreviews[screen.value] ? (
                        <MatrixPreview matrix={screenPreviews[screen.value]} />
                      ) : (
                        <div className="text-gray-400 text-sm">Preview unavailable</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Custom Screen */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Custom Screen</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Screen Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Screen Name</label>
                    <input
                      type="text"
                      value={customForm.screenName}
                      onChange={(e) => setCustomForm({ ...customForm, screenName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Holiday Greeting"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Custom Message</label>
                    <textarea
                      value={customForm.customMessage}
                      onChange={(e) => {
                        setCustomForm({ ...customForm, customMessage: e.target.value });
                        if (e.target.value) handleCustomPreview();
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Type your message..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Border Color 1</label>
                      <select
                        value={customForm.borderColor1}
                        onChange={(e) => {
                          setCustomForm({ ...customForm, borderColor1: e.target.value });
                          if (customForm.customMessage) handleCustomPreview();
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="red">🔴 Red</option>
                        <option value="orange">🟠 Orange</option>
                        <option value="yellow">🟡 Yellow</option>
                        <option value="green">🟢 Green</option>
                        <option value="blue">🔵 Blue</option>
                        <option value="violet">🟣 Violet</option>
                        <option value="white">⚪ White</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Border Color 2</label>
                      <select
                        value={customForm.borderColor2}
                        onChange={(e) => {
                          setCustomForm({ ...customForm, borderColor2: e.target.value });
                          if (customForm.customMessage) handleCustomPreview();
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="red">🔴 Red</option>
                        <option value="orange">🟠 Orange</option>
                        <option value="yellow">🟡 Yellow</option>
                        <option value="green">🟢 Green</option>
                        <option value="blue">🔵 Blue</option>
                        <option value="violet">🟣 Violet</option>
                        <option value="white">⚪ White</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleSaveCustom}
                    disabled={!customPreview}
                    className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    💾 Save Custom Screen
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h3>
                <div className="flex justify-center">
                  {customPreview ? (
                    <MatrixPreview matrix={customPreview} />
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-4xl mb-2">✍️</div>
                      <p>Type a message to see preview</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Saved Custom Screens */}
          {savedScreens.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Saved Custom Screens ({savedScreens.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedScreens.map((screen) => (
                  <div key={screen.screenId} className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{screen.name}</h3>
                      <button
                        onClick={() => handleDeleteCustom(screen.screenId, screen.name)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                    <div className="flex justify-center">
                      {screen.matrix ? (
                        <MatrixPreview matrix={screen.matrix} />
                      ) : (
                        <div className="text-gray-400 text-sm">Preview unavailable</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ScreenPreview;
