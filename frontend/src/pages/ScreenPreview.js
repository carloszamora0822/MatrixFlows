import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import MatrixPreview from '../components/ui/MatrixPreview';

// Custom Screens Section Component
const CustomScreensSection = ({ savedScreens, loadSavedScreens }) => {
  const [formData, setFormData] = useState({
    screenName: '',
    customMessage: '',
    borderColor1: 'red',
    borderColor2: 'orange',
    hasExpiration: false,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [previewMatrix, setPreviewMatrix] = useState(null);
  const [editingScreenId, setEditingScreenId] = useState(null);

  const colorOptions = [
    { value: 'red', label: '🔴 Red', class: 'bg-red-500' },
    { value: 'orange', label: '🟠 Orange', class: 'bg-orange-500' },
    { value: 'yellow', label: '🟡 Yellow', class: 'bg-yellow-500' },
    { value: 'green', label: '🟢 Green', class: 'bg-green-500' },
    { value: 'blue', label: '🔵 Blue', class: 'bg-blue-500' },
    { value: 'purple', label: '🟣 Purple', class: 'bg-purple-500' },
    { value: 'white', label: '⚪ White', class: 'bg-white' }
  ];

  const loadScreenForEditing = (screen) => {
    setFormData({
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
    if (!window.confirm(`Delete "${screenName}" from library?`)) return;
    
    try {
      const response = await fetch(`/api/custom-screens?id=${screenId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        alert(`✅ "${screenName}" deleted!`);
        loadSavedScreens();
        
        if (editingScreenId === screenId) {
          setFormData({
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
      } else {
        alert('❌ Failed to delete screen');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('❌ Network error');
    }
  };

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
        alert(`✅ Screen "${formData.screenName}" ${isUpdating ? 'updated' : 'saved'}!`);
        loadSavedScreens();
        setFormData({
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
          <button
            type="submit"
            className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl"
          >
            {editingScreenId ? '✏️ Update Screen' : '💾 Save Screen'}
          </button>
        </div>
      </form>

      {/* Right: Live Preview + Saved Screens */}
      <div className="flex flex-col space-y-6">
        {/* Live Preview */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex-shrink-0">
          {previewMatrix ? (
            <div className="flex justify-center">
              <MatrixPreview matrix={previewMatrix} />
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
            <div className="overflow-y-auto max-h-[400px] border-2 border-gray-300 rounded-lg p-3">
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

const ScreenPreview = () => {
  const [screenPreviews, setScreenPreviews] = useState({});
  const [savedScreens, setSavedScreens] = useState([]);
  const [loading, setLoading] = useState(true);

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

          {/* Custom Screens */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Custom Screens</h2>
            <CustomScreensSection 
              savedScreens={savedScreens}
              loadSavedScreens={loadSavedScreens}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ScreenPreview;
