import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import MatrixPreview from '../components/ui/MatrixPreview';


const ScreenPreview = () => {
  const navigate = useNavigate();
  const [screenPreviews, setScreenPreviews] = useState({});
  const [savedScreens, setSavedScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const screenTypes = [
    { value: 'BIRTHDAY', label: '🎂 Birthday', dataPath: '/data/birthdays' },
    { value: 'CHECKRIDES', label: '✈️ Checkrides', dataPath: '/data/checkrides' },
    { value: 'UPCOMING_EVENTS', label: '📅 Events', dataPath: '/data/events' },
    { value: 'NEWEST_PILOT', label: '🎓 Newest Pilot', dataPath: '/data/pilots' },
    { value: 'EMPLOYEE_RECOGNITION', label: '⭐ Recognition', dataPath: '/data/recognition' },
    { value: 'WEATHER', label: '🌤️ Weather', dataPath: null },
    { value: 'METAR', label: '🛩️ METAR', dataPath: null }
  ];

  useEffect(() => {
    loadAllPreviews();
    loadSavedScreens();
    
    // Auto-refresh all built-in screens every hour
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing built-in screens...');
      loadAllPreviews();
    }, 60 * 60 * 1000); // 1 hour in milliseconds
    
    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval);
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
    setLastRefresh(new Date());
    setLoading(false);
  };

  const loadSavedScreens = async () => {
    try {
      const response = await fetch('/api/custom-screens', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setSavedScreens(data);
      }
    } catch (error) {
      console.error('Failed to load saved screens:', error);
    }
  };

  const deleteScreen = async (screenId, screenName) => {
    if (!window.confirm(`Delete "${screenName}" from library?\n\nThis will also remove it from any workflows.`)) return;
    
    try {
      const response = await fetch(`/api/custom-screens?id=${screenId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        alert(`✅ "${screenName}" deleted successfully!`);
        loadSavedScreens(); // Reload the list
      } else {
        alert('❌ Failed to delete screen');
      }
    } catch (error) {
      alert('❌ Network error occurred');
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
              Create custom screens and browse all available screen types
            </p>
          </div>

          {/* Custom Screens - FIRST! */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">🎨 Saved Custom Screens ({savedScreens.length})</h2>
              <button
                onClick={() => navigate('/custom-screen/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
              >
                + Create New
              </button>
            </div>
            
            {savedScreens.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-6xl mb-4">🎨</div>
                <p className="text-gray-700 font-semibold">No custom screens yet</p>
                <p className="text-sm text-gray-500 mt-2">Click "Create New" to design your first custom screen!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">{screen.name}</h3>
                      <p className="text-xs text-gray-500 italic mb-4 text-center">⏱️ {expiresText}</p>
                      
                      {/* Preview Matrix */}
                      <div className="flex justify-center mb-4">
                        {screen.matrix ? (
                          <MatrixPreview matrix={screen.matrix} />
                        ) : (
                          <div className="text-gray-400 text-sm">Preview unavailable</div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/custom-screen/edit/${screen.screenId}`)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-semibold"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => deleteScreen(screen.screenId, screen.name)}
                          className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-semibold"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Built-in Screens */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">🏗️ Built-in Screens</h2>
              <button
                onClick={() => {
                  console.log('🔄 Manual refresh triggered');
                  loadAllPreviews();
                }}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>{loading ? '⏳' : '🔄'}</span>
                {loading ? 'Refreshing...' : 'Refresh All'}
              </button>
            </div>
            {lastRefresh && (
              <p className="text-sm text-gray-500 mb-6">
                Last updated: {lastRefresh.toLocaleTimeString()} • Auto-refreshes every hour
              </p>
            )}
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
                    <div className="flex justify-center mb-4">
                      {screenPreviews[screen.value] ? (
                        <MatrixPreview matrix={screenPreviews[screen.value]} />
                      ) : (
                        <div className="text-gray-400 text-sm">Preview unavailable</div>
                      )}
                    </div>
                    {screen.dataPath && (
                      <div className="flex justify-center">
                        <a
                          href={screen.dataPath}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm"
                        >
                          ✏️ Edit Data
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ScreenPreview;
