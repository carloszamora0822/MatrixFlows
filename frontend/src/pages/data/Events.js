import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import MatrixPreview from '../../components/ui/MatrixPreview';
import { useScreenPreview } from '../../hooks/useScreenPreview';

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [formData, setFormData] = useState({ date: '', time: '', description: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [borderColor1, setBorderColor1] = useState('green');
  
  const { matrix, generatePreview } = useScreenPreview();

  useEffect(() => {
    fetchEvents();
    generatePreview('UPCOMING_EVENTS', { borderColor1 });
  }, []);

  useEffect(() => {
    if (formData.date || formData.time || formData.description) {
      generatePreview('UPCOMING_EVENTS', { borderColor1 });
    }
  }, [formData, borderColor1]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const url = editingId ? `/api/events?id=${editingId}` : '/api/events';
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
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

      setFormData({ date: '', time: '', description: '' });
      setEditingId(null);
      await fetchEvents();
      generatePreview('UPCOMING_EVENTS');
    } catch (error) {
      setErrors({ general: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event) => {
    setFormData({
      date: event.date,
      time: event.time,
      description: event.description
    });
    setEditingId(event._id);
    generatePreview('UPCOMING_EVENTS');
  };

  const handleCancelEdit = () => {
    setFormData({ date: '', time: '', description: '' });
    setEditingId(null);
    setErrors({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      const response = await fetch(`/api/events?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        await fetchEvents();
        generatePreview('UPCOMING_EVENTS');
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
              <span className="text-4xl mr-3">📅</span>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Events Management</h1>
                <p className="mt-1 text-gray-600">Manage upcoming events and activities</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">{editingId ? '✏️ Edit Event' : '➕ Add Event'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (max 16 characters)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 16);
                      setFormData({ ...formData, description: value });
                    }}
                    className={`input-field ${errors.description ? 'input-error' : ''}`}
                    placeholder="Description"
                    rows="3"
                    maxLength={16}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.description.length}/16 characters
                  </p>
                  {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
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
              <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
              {events.length === 0 ? (
                <p className="text-gray-500 text-sm">No events scheduled</p>
              ) : (
                <div className="space-y-2">
                  {events.map((e) => (
                    <div key={e._id} className={`p-3 rounded ${editingId === e._id ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-start gap-3 mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium break-words">{e.description}</p>
                          <p className="text-sm text-gray-600 mt-1">{e.date} at {e.time}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => handleEdit(e)} className="text-blue-600 hover:text-blue-800 text-sm font-semibold whitespace-nowrap">
                            ✏️ Edit
                          </button>
                          <button onClick={() => handleDelete(e._id)} className="text-red-600 hover:text-red-800 text-sm font-semibold whitespace-nowrap">
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
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
                  <MatrixPreview matrix={matrix} title="Event" />
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">Add an event to see preview</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Events;
