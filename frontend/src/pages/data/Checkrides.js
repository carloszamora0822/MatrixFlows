import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import MatrixPreview from '../../components/ui/MatrixPreview';
import { useScreenPreview } from '../../hooks/useScreenPreview';

const Checkrides = () => {
  const navigate = useNavigate();
  const [checkrides, setCheckrides] = useState([]);
  const [formData, setFormData] = useState({ time: '', name: '', callsign: '', type: 'PPL', date: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [borderColor1, setBorderColor1] = useState('red');
  
  const { matrix, generatePreview } = useScreenPreview();

  useEffect(() => {
    fetchCheckrides();
    generatePreview('CHECKRIDES', { borderColor1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-generate preview when form data changes
  useEffect(() => {
    if (formData.time || formData.name || formData.callsign || formData.type || formData.date) {
      generatePreview('CHECKRIDES', { borderColor1 });
    }
  }, [formData, borderColor1, generatePreview]);

  const fetchCheckrides = async () => {
    try {
      const response = await fetch('/api/checkrides', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCheckrides(data);
      }
    } catch (error) {
      console.error('Failed to fetch checkrides:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const url = editingId ? `/api/checkrides?id=${editingId}` : '/api/checkrides';
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          borderColor1
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error?.details?.fieldErrors) {
          setErrors(data.error.details.fieldErrors);
        }
        return;
      }

      setFormData({ time: '', name: '', callsign: '', type: 'PPL', date: '' });
      setEditingId(null);
      await fetchCheckrides();
      generatePreview('CHECKRIDES', { borderColor1 });
    } catch (error) {
      setErrors({ general: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (checkride) => {
    setFormData({
      time: checkride.time,
      name: checkride.name,
      callsign: checkride.callsign,
      type: checkride.type,
      date: checkride.date
    });
    setEditingId(checkride._id);
    setBorderColor1(checkride.borderColor1 || 'red');
    generatePreview('CHECKRIDES', { borderColor1: checkride.borderColor1 || 'red' });
  };

  const handleCancelEdit = () => {
    setFormData({ time: '', name: '', callsign: '', type: 'PPL', date: '' });
    setEditingId(null);
    setErrors({});
    setBorderColor1('red');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this checkride?')) return;
    try {
      const response = await fetch(`/api/checkrides?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        await fetchCheckrides();
        generatePreview('CHECKRIDES');
      }
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
              <span className="text-4xl mr-3">✈️</span>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Checkride Management</h1>
                <p className="mt-1 text-gray-600">Manage flight checkride schedules</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">{editingId ? '✏️ Edit Checkride' : '➕ Add Checkride'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className={`input-field ${errors.time ? 'input-error' : ''}`}
                    placeholder="Time (HH:MM)"
                  />
                  {errors.time && <p className="mt-1 text-sm text-red-600">{errors.time}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`input-field ${errors.name ? 'input-error' : ''}`}
                    placeholder="Person Name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.callsign}
                    onChange={(e) => setFormData({ ...formData, callsign: e.target.value })}
                    className={`input-field ${errors.callsign ? 'input-error' : ''}`}
                    placeholder="Callsign (N123AB)"
                  />
                  {errors.callsign && <p className="mt-1 text-sm text-red-600">{errors.callsign}</p>}
                </div>
                <div>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className={`input-field ${errors.type ? 'input-error' : ''}`}
                  >
                    <option value="PPL">PPL</option>
                    <option value="IFR">IFR</option>
                    <option value="COMMERCIAL">Commercial</option>
                    <option value="CFI">CFI</option>
                    <option value="CFII">CFII</option>
                    <option value="MEI">MEI</option>
                  </select>
                  {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className={`input-field ${errors.date ? 'input-error' : ''}`}
                    placeholder="Date (MM/DD)"
                  />
                  {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
                </div>

                {/* Color Picker - Only show when editing */}
                {editingId && (
                  <div className="pt-4 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Border Color:</label>
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
            </div>

            {/* List */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Upcoming Checkrides</h3>
              {checkrides.length === 0 ? (
                <p className="text-gray-500 text-sm">No checkrides scheduled</p>
              ) : (
                <div className="space-y-2">
                  {checkrides.map((c) => (
                    <div key={c._id} className={`p-3 rounded ${editingId === c._id ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-sm text-gray-600">{c.callsign} - {c.type}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(c)} className="text-blue-600 hover:text-blue-800 text-sm font-semibold">
                            ✏️ Edit
                          </button>
                          <button onClick={() => handleDelete(c._id)} className="text-red-600 hover:text-red-800 text-sm font-semibold">
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{c.date} at {c.time}</p>
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
                  <MatrixPreview matrix={matrix} title="Checkride" />
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">Add a checkride to see preview</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Checkrides;
