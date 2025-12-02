import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import MatrixPreview from '../../components/ui/MatrixPreview';
import { useScreenPreview } from '../../hooks/useScreenPreview';

const Recognition = () => {
  const [recognitions, setRecognitions] = useState([]);
  const [formData, setFormData] = useState({ firstName: '', lastName: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const { matrix, generatePreview } = useScreenPreview();

  useEffect(() => {
    fetchRecognitions();
  }, []);

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
      const response = await fetch('/api/recognitions', {
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

      setFormData({ firstName: '', lastName: '' });
      fetchRecognitions();
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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recognition?')) return;
    try {
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
              <h3 className="text-lg font-semibold mb-4">Add Recognition</h3>
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
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Adding...' : 'Add Recognition'}
                </button>
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
                    <div key={r.id} className={`p-3 rounded ${r.isCurrent ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{r.firstName} {r.lastName}</p>
                          {r.isCurrent && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                              Currently Displayed
                            </span>
                          )}
                        </div>
                        <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:text-red-800 text-sm">
                          Delete
                        </button>
                      </div>
                      {!r.isCurrent && (
                        <button
                          onClick={() => handleSetCurrent(r.id)}
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
