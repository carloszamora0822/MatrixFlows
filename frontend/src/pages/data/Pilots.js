import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import MatrixPreview from '../../components/ui/MatrixPreview';
import { useScreenPreview } from '../../hooks/useScreenPreview';

const Pilots = () => {
  const navigate = useNavigate();
  const [pilots, setPilots] = useState([]);
  const [formData, setFormData] = useState({ name: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const { matrix, generatePreview } = useScreenPreview();

  useEffect(() => {
    fetchPilots();
  }, []);

  const fetchPilots = async () => {
    try {
      const response = await fetch('/api/pilots', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setPilots(data);
      }
    } catch (error) {
      console.error('Failed to fetch pilots:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const response = await fetch('/api/pilots', {
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

      setFormData({ name: '' });
      fetchPilots();
      generatePreview('NEWEST_PILOT');
    } catch (error) {
      setErrors({ general: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrent = async (id) => {
    try {
      const response = await fetch(`/api/pilots?id=${id}`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (response.ok) {
        fetchPilots();
        generatePreview('NEWEST_PILOT');
      }
    } catch (error) {
      console.error('Failed to set current:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this pilot?')) return;
    try {
      const response = await fetch(`/api/pilots?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) fetchPilots();
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
              <span className="text-4xl mr-3">🎓</span>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Newest Pilot Management</h1>
                <p className="mt-1 text-gray-600">Manage newest pilot announcements</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Add Pilot</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`input-field ${errors.name ? 'input-error' : ''}`}
                    placeholder="Pilot Name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Adding...' : 'Add Pilot'}
                </button>
              </form>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 Click "Set as Current" to display a pilot on the Vestaboard. Only one pilot can be current at a time.
                </p>
              </div>
            </div>

            {/* List */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Pilots</h3>
              {pilots.length === 0 ? (
                <p className="text-gray-500 text-sm">No pilots added yet</p>
              ) : (
                <div className="space-y-2">
                  {pilots.map((p) => (
                    <div key={p.id} className={`p-3 rounded ${p.isCurrent ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{p.name}</p>
                          {p.isCurrent && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                              Currently Displayed
                            </span>
                          )}
                        </div>
                        <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800 text-sm">
                          Delete
                        </button>
                      </div>
                      {!p.isCurrent && (
                        <button
                          onClick={() => handleSetCurrent(p.id)}
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
                  <MatrixPreview matrix={matrix} title="Newest Pilot" />
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">Set a pilot as current to see preview</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Pilots;
