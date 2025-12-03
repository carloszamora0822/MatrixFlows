import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import MatrixPreview from '../../components/ui/MatrixPreview';
import { useScreenPreview } from '../../hooks/useScreenPreview';

const Birthdays = () => {
  const navigate = useNavigate();
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ firstName: '', date: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const { matrix, generatePreview, loading: previewLoading } = useScreenPreview();

  useEffect(() => {
    fetchBirthdays();
    generatePreview('BIRTHDAY');
  }, []);

  useEffect(() => {
    if (formData.firstName || formData.date) {
      generatePreview('BIRTHDAY');
    }
  }, [formData]);

  const fetchBirthdays = async () => {
    try {
      const response = await fetch('/api/birthdays', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setBirthdays(data);
      }
    } catch (error) {
      console.error('Failed to fetch birthdays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const url = editingId ? `/api/birthdays/${editingId}` : '/api/birthdays';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.details?.fieldErrors) {
          setErrors(data.error.details.fieldErrors);
        } else {
          setErrors({ general: data.error?.message || 'Operation failed' });
        }
        return;
      }

      // Success - reset form and refresh list
      setFormData({ firstName: '', date: '' });
      setEditingId(null);
      fetchBirthdays();
      
      // Generate preview for the new/updated birthday
      generatePreview('BIRTHDAY');

    } catch (error) {
      setErrors({ general: 'Network error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (birthday) => {
    setFormData({
      firstName: birthday.firstName,
      date: birthday.date
    });
    setEditingId(birthday.id);
    setErrors({});
  };

  const handleSetCurrent = async (id) => {
    try {
      const response = await fetch(`/api/birthdays?id=${id}`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (response.ok) {
        fetchBirthdays();
        generatePreview('BIRTHDAY');
      }
    } catch (error) {
      console.error('Failed to set current:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this birthday?')) {
      return;
    }

    try {
      const response = await fetch(`/api/birthdays?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        fetchBirthdays();
      }
    } catch (error) {
      console.error('Failed to delete birthday:', error);
    }
  };

  const handleCancel = () => {
    setFormData({ firstName: '', date: '' });
    setEditingId(null);
    setErrors({});
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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Birthday Management</h1>
            <p className="mt-2 text-gray-600">
              Manage team member birthdays for Vestaboard display
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {editingId ? 'Edit Birthday' : 'Add New Birthday'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errors.general && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                      {errors.general}
                    </div>
                  )}

                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className={`input-field ${errors.firstName ? 'input-error' : ''}`}
                      placeholder="John"
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                      Date (MM/DD)
                    </label>
                    <input
                      type="text"
                      id="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className={`input-field ${errors.date ? 'input-error' : ''}`}
                      placeholder="12/25"
                    />
                    {errors.date && (
                      <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Format: MM/DD (e.g., 12/25)</p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary"
                    >
                      {isSubmitting ? 'Saving...' : (editingId ? 'Update Birthday' : 'Add Birthday')}
                    </button>
                    
                    {editingId && (
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Preview */}
              {matrix && (
                <div className="card">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Live Preview</h2>
                  <div className="flex justify-center">
                    <MatrixPreview matrix={matrix} title="Birthday Screen" />
                  </div>
                </div>
              )}
            </div>

            {/* List */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Birthdays List</h2>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading birthdays...</p>
                </div>
              ) : birthdays.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No birthdays</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding a new birthday.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {birthdays.map((birthday) => {
                    const today = new Date();
                    const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
                    const isToday = birthday.date === todayStr;
                    
                    return (
                      <div
                        key={birthday._id}
                        className={`p-4 rounded-lg transition-all ${
                          editingId === birthday._id 
                            ? 'bg-blue-100 border-2 border-blue-500' 
                            : isToday
                              ? 'bg-gradient-to-r from-pink-100 via-purple-100 to-pink-100 border-4 border-pink-400 shadow-lg animate-pulse'
                              : birthday.isCurrent
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300'
                                : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-orange-200 hover:border-orange-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{birthday.firstName}</h3>
                              {isToday && <span className="text-2xl">🎉🎂</span>}
                              {birthday.isCurrent && (
                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                                  Currently Displayed
                                </span>
                              )}
                            </div>
                            <p className={`text-sm ${isToday ? 'text-pink-700 font-semibold' : 'text-gray-600'}`}>
                              {birthday.date} {isToday && '• TODAY!'}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(birthday)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDelete(birthday._id)}
                              className="text-red-600 hover:text-red-800 text-sm font-semibold"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                        {!birthday.isCurrent && (
                          <button
                            onClick={() => handleSetCurrent(birthday._id)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Set as Current
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Birthdays;
