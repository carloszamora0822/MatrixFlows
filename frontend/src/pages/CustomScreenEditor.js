import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import MatrixPreview from '../components/ui/MatrixPreview';

const CustomScreenEditor = () => {
  const navigate = useNavigate();
  const { screenId } = useParams(); // If editing, screenId will be present
  const isEditing = !!screenId;

  const [formData, setFormData] = useState({
    screenName: '',
    customMessage: '',
    borderColor1: 'red',
    borderColor2: 'orange',
    hasExpiration: false,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [previewMatrix, setPreviewMatrix] = useState(null);
  const [loading, setLoading] = useState(false);

  const colorOptions = [
    { value: 'red', label: '🔴 Red', class: 'bg-red-500' },
    { value: 'orange', label: '🟠 Orange', class: 'bg-orange-500' },
    { value: 'yellow', label: '🟡 Yellow', class: 'bg-yellow-500' },
    { value: 'green', label: '🟢 Green', class: 'bg-green-500' },
    { value: 'blue', label: '🔵 Blue', class: 'bg-blue-500' },
    { value: 'purple', label: '🟣 Purple', class: 'bg-purple-500' },
    { value: 'white', label: '⚪ White', class: 'bg-white' }
  ];

  // Load screen data if editing
  useEffect(() => {
    if (isEditing) {
      loadScreenData();
    }
  }, [screenId]);

  const loadScreenData = async () => {
    try {
      const response = await fetch('/api/custom-screens', { credentials: 'include' });
      if (response.ok) {
        const screens = await response.json();
        const screen = screens.find(s => s.screenId === screenId);
        if (screen) {
          setFormData({
            screenName: screen.name,
            customMessage: screen.message,
            borderColor1: screen.borderColor1,
            borderColor2: screen.borderColor2,
            hasExpiration: true,
            expiresAt: new Date(screen.expiresAt).toISOString().split('T')[0]
          });
          setPreviewMatrix(screen.matrix);
        }
      }
    } catch (error) {
      console.error('Failed to load screen:', error);
    }
  };

  // Generate preview when message or colors change
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

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!previewMatrix) {
      alert('Please enter a message first');
      return;
    }

    setLoading(true);
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

      const url = isEditing ? `/api/custom-screens?id=${screenId}` : '/api/custom-screens';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(screenData)
      });

      if (response.ok) {
        alert(`✅ Screen "${formData.screenName}" ${isEditing ? 'updated' : 'created'}!`);
        navigate('/preview'); // Go back to Screen Library
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error?.message || 'Failed to save screen'}`);
      }
    } catch (error) {
      alert('❌ Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/preview')}
              className="mb-4 px-4 py-2 text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
            >
              ← Back to Screen Library
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? '✏️ Edit Custom Screen' : '🎨 Create Custom Screen'}
            </h1>
            <p className="mt-2 text-gray-600">
              {isEditing ? 'Update your custom screen' : 'Design a custom message for your Vestaboard'}
            </p>
          </div>

          {/* Form and Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Form */}
            <form onSubmit={handleSave} className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Screen Details</h2>
                
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
                    Your Message (Use \ for new line)
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
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : (isEditing ? '💾 Update Screen' : '💾 Save Screen')}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/preview')}
                    className="px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>

            {/* Right: Live Preview */}
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8 self-start">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Live Preview</h2>
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
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CustomScreenEditor;
