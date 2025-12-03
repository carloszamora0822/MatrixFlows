import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import MatrixPreview from '../../components/ui/MatrixPreview';
import { useScreenPreview } from '../../hooks/useScreenPreview';

const Recognition = () => {
  const navigate = useNavigate();
  const [recognitions, setRecognitions] = useState([]);
  const [formData, setFormData] = useState({ firstName: '', lastName: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [borderColor1, setBorderColor1] = useState('yellow');
  const [borderColor2, setBorderColor2] = useState('orange');
  
  const { matrix, generatePreview } = useScreenPreview();

  useEffect(() => {
    fetchRecognitions();
    generatePreview('EMPLOYEE_RECOGNITION', { borderColor1, borderColor2 });
  }, []);

  useEffect(() => {
    if (formData.firstName || formData.lastName) {
      generatePreview('EMPLOYEE_RECOGNITION', { borderColor1, borderColor2 });
    }
  }, [formData, borderColor1, borderColor2]);

  const fetchRecognitions = async () => {
    try {
      const response = await fetch('/api/recognitions', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setRecognitions(data);
      }
    } catch (error) {
      console.error('Failed to fetch recognitions:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const url = editingId ? `/api/recognitions?id=${editingId}` : '/api/recognitions';
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          borderColor1,
          borderColor2
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error?.details?.fieldErrors) {
          setErrors(data.error.details.fieldErrors);
        }
        return;
      }

      setFormData({ firstName: '', lastName: '' });
      setEditingId(null);
      await fetchRecognitions();
      generatePreview('EMPLOYEE_RECOGNITION');
    } catch (error) {
      setErrors({ general: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrent = async (id) => {
    try {
      const response = await fetch(`/api/recognitions?id=${id}`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (response.ok) {
        fetchRecognitions();
        generatePreview('EMPLOYEE_RECOGNITION');
      }
    } catch (error) {
      console.error('Failed to set current:', error);
    }
  };

  const handleEdit = (recognition) => {
    setFormData({
      firstName: recognition.firstName,
      lastName: recognition.lastName
    });
    setEditingId(recognition._id);
    // Load colors from the recognition being edited
    setBorderColor1(recognition.borderColor1 || 'yellow');
    setBorderColor2(recognition.borderColor2 || 'orange');
    generatePreview('EMPLOYEE_RECOGNITION', { 
      borderColor1: recognition.borderColor1 || 'yellow', 
      borderColor2: recognition.borderColor2 || 'orange' 
    });
  };

  const handleCancelEdit = () => {
    setFormData({ firstName: '', lastName: '' });
    setEditingId(null);
    setErrors({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recognition?')) return;
    try{
      const response = await fetch(`/api/recognitions?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) fetchRecognitions();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <button
            onClick={() => navigate('/preview')}
            className="mb-4 px-4 py-2 text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
          >
            ← Back to Screen Library
          </button>
          <div className="mb-8">
            <div className="flex items-center">
              <span className="text-4xl mr-3">⭐</span>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Employee Recognition</h1>
                <p className="mt-1 text-gray-600">Manage employee of the month</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">{editingId ? '✏️ Edit Recognition' : '➕ Add Recognition'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={`input-field ${errors.firstName ? 'input-error' : ''}`}
                    placeholder="First Name"
                  />
                  {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={`input-field ${errors.lastName ? 'input-error' : ''}`}
                    placeholder="Last Name"
                  />
                  {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
                </div>
                
                {/* Color Pickers - Only show when editing */}
                {editingId && (
                  <div className="space-y-3 pt-4 border-t">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Color 1:</label>
                      <div className="grid grid-cols-7 gap-2">
                        {['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'white'].map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setBorderColor1(color)}
                            className={`w-10 h-10 rounded border-2 ${borderColor1 === color ? 'border-gray-900 ring-2 ring-blue-500' : 'border-gray-300'}`}
                            style={{
                              backgroundColor: color === 'white' ? '#f3f4f6' : color,
                              backgroundImage: color === 'white' ? 'repeating-linear-gradient(45deg, #e5e7eb 0, #e5e7eb 2px, #f3f4f6 2px, #f3f4f6 4px)' : 'none'
                            }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Color 2:</label>
                      <div className="grid grid-cols-7 gap-2">
                        {['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'white'].map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setBorderColor2(color)}
                            className={`w-10 h-10 rounded border-2 ${borderColor2 === color ? 'border-gray-900 ring-2 ring-blue-500' : 'border-gray-300'}`}
                            style={{
                              backgroundColor: color === 'white' ? '#f3f4f6' : color,
                              backgroundImage: color === 'white' ? 'repeating-linear-gradient(45deg, #e5e7eb 0, #e5e7eb 2px, #f3f4f6 2px, #f3f4f6 4px)' : 'none'
                            }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="btn-primary flex-1">
                    {loading ? 'Saving...' : (editingId ? 'Update' : 'Add')}
                  </button>
                  {editingId && (
                    <button type="button" onClick={handleCancelEdit} className="btn-secondary">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⭐ Click "Set as Current" to display an employee on the Vestaboard. Only one can be current at a time.
                </p>
              </div>
            </div>

            {/* List */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Recognitions</h3>
              {recognitions.length === 0 ? (
                <p className="text-gray-500 text-sm">No recognitions added yet</p>
              ) : (
                <div className="space-y-2">
                  {recognitions.map((r) => (
                    <div key={r._id} className={`p-3 rounded ${editingId === r._id ? 'bg-blue-100 border-2 border-blue-500' : r.isCurrent ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{r.firstName} {r.lastName}</p>
                          {r.isCurrent && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                              Currently Displayed
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(r)} className="text-blue-600 hover:text-blue-800 text-sm font-semibold">
                            ✏️ Edit
                          </button>
                          <button onClick={() => handleDelete(r._id)} className="text-red-600 hover:text-red-800 text-sm font-semibold">
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                      {!r.isCurrent && (
                        <button
                          onClick={() => handleSetCurrent(r._id)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Set as Current
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Preview</h3>
              {matrix ? (
                <div className="flex justify-center">
                  <MatrixPreview matrix={matrix} title="Recognition" />
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">Set a recognition as current to see preview</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Recognition;
