import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import MatrixPreview from '../../components/ui/MatrixPreview';
import { useScreenPreview } from '../../hooks/useScreenPreview';

const Checkrides = () => {
  const navigate = useNavigate();
  const [checkrides, setCheckrides] = useState([]);
  const [formData, setFormData] = useState({ time: '', callsign: '', type: 'PPL', destination: '', date: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const { matrix, generatePreview } = useScreenPreview();

  useEffect(() => {
    fetchCheckrides();
  }, []);

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
      const response = await fetch('/api/checkrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error?.details?.fieldErrors) {
          setErrors(data.error.details.fieldErrors);
        }
        return;
      }

      setFormData({ time: '', callsign: '', type: 'PPL', destination: '', date: '' });
      fetchCheckrides();
      generatePreview('CHECKRIDES');
    } catch (error) {
      setErrors({ general: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this checkride?')) return;
    try {
      const response = await fetch(`/api/checkrides?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) fetchCheckrides();
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
              <h3 className="text-lg font-semibold mb-4">Add Checkride</h3>
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
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className={`input-field ${errors.destination ? 'input-error' : ''}`}
                    placeholder="Destination (KVBT)"
                  />
                  {errors.destination && <p className="mt-1 text-sm text-red-600">{errors.destination}</p>}
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
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Adding...' : 'Add Checkride'}
                </button>
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
                    <div key={c.id} className="p-3 bg-gray-50 rounded">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-medium">{c.callsign}</p>
                        <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 text-sm">
                          Delete
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">{c.type} - {c.destination}</p>
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
