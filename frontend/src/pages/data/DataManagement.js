import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import MatrixPreview from '../../components/ui/MatrixPreview';
import { useScreenPreview } from '../../hooks/useScreenPreview';

const DataManagement = () => {
  const [activeTab, setActiveTab] = useState('birthdays');
  const { matrix, generatePreview } = useScreenPreview();

  const tabs = [
    { id: 'birthdays', name: 'Birthdays', icon: '🎂' },
    { id: 'checkrides', name: 'Checkrides', icon: '✈️' },
    { id: 'events', name: 'Events', icon: '📅' },
    { id: 'pilots', name: 'Newest Pilot', icon: '🎓' },
    { id: 'recognition', name: 'Recognition', icon: '⭐' },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Data Management</h1>
            <p className="mt-2 text-gray-600">Manage all content for your Vestaboard displays</p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'birthdays' && <BirthdaysTab matrix={matrix} generatePreview={generatePreview} />}
            {activeTab === 'checkrides' && <CheckridesTab matrix={matrix} generatePreview={generatePreview} />}
            {activeTab === 'events' && <EventsTab matrix={matrix} generatePreview={generatePreview} />}
            {activeTab === 'pilots' && <PilotsTab matrix={matrix} generatePreview={generatePreview} />}
            {activeTab === 'recognition' && <RecognitionTab matrix={matrix} generatePreview={generatePreview} />}
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Birthdays Tab Component
const BirthdaysTab = ({ matrix, generatePreview }) => {
  const [data, setData] = useState([]);
  const [form, setForm] = useState({ firstName: '', date: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/birthdays', { credentials: 'include' });
      if (response.ok) setData(await response.json());
    } catch (error) {
      console.error('Failed to fetch:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const response = await fetch('/api/birthdays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.error?.details?.fieldErrors) setErrors(result.error.details.fieldErrors);
        return;
      }
      setForm({ firstName: '', date: '' });
      fetchData();
      generatePreview('BIRTHDAY');
    } catch (error) {
      setErrors({ general: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try {
      const response = await fetch(`/api/birthdays?id=${id}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Add Birthday</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className={`input-field ${errors.firstName ? 'input-error' : ''}`} placeholder="First Name" />
            {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
          </div>
          <div>
            <input type="text" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={`input-field ${errors.date ? 'input-error' : ''}`} placeholder="MM/DD" />
            {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Adding...' : 'Add Birthday'}
          </button>
        </form>
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Current Birthdays</h3>
        {data.length === 0 ? <p className="text-gray-500 text-sm">No birthdays yet</p> : (
          <div className="space-y-2">
            {data.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div><p className="font-medium">{item.firstName}</p><p className="text-sm text-gray-600">{item.date}</p></div>
                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Preview</h3>
        {matrix ? <div className="flex justify-center"><MatrixPreview matrix={matrix} title="Birthday" /></div> :
          <p className="text-gray-500 text-sm text-center py-8">Add a birthday to see preview</p>}
      </div>
    </div>
  );
};

// Checkrides Tab Component
const CheckridesTab = ({ matrix, generatePreview }) => {
  const [data, setData] = useState([]);
  const [form, setForm] = useState({ time: '', callsign: '', type: 'PPL', destination: '', date: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/checkrides', { credentials: 'include' });
      if (response.ok) setData(await response.json());
    } catch (error) {
      console.error('Failed to fetch:', error);
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
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.error?.details?.fieldErrors) setErrors(result.error.details.fieldErrors);
        return;
      }
      setForm({ time: '', callsign: '', type: 'PPL', destination: '', date: '' });
      fetchData();
      generatePreview('CHECKRIDES');
    } catch (error) {
      setErrors({ general: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try {
      const response = await fetch(`/api/checkrides?id=${id}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Add Checkride</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
            className={`input-field ${errors.time ? 'input-error' : ''}`} placeholder="Time (HH:MM)" />
          {errors.time && <p className="mt-1 text-sm text-red-600">{errors.time}</p>}
          <input type="text" value={form.callsign} onChange={(e) => setForm({ ...form, callsign: e.target.value })}
            className={`input-field ${errors.callsign ? 'input-error' : ''}`} placeholder="Callsign" />
          {errors.callsign && <p className="mt-1 text-sm text-red-600">{errors.callsign}</p>}
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
            <option value="PPL">PPL</option><option value="IFR">IFR</option><option value="COMMERCIAL">Commercial</option>
            <option value="CFI">CFI</option><option value="CFII">CFII</option><option value="MEI">MEI</option>
          </select>
          <input type="text" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })}
            className={`input-field ${errors.destination ? 'input-error' : ''}`} placeholder="Destination" />
          {errors.destination && <p className="mt-1 text-sm text-red-600">{errors.destination}</p>}
          <input type="text" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={`input-field ${errors.date ? 'input-error' : ''}`} placeholder="Date (MM/DD)" />
          {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Adding...' : 'Add Checkride'}
          </button>
        </form>
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Upcoming Checkrides</h3>
        {data.length === 0 ? <p className="text-gray-500 text-sm">No checkrides scheduled</p> : (
          <div className="space-y-2">
            {data.map((item) => (
              <div key={item.id} className="p-3 bg-gray-50 rounded">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium">{item.callsign}</p>
                  <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
                <p className="text-sm text-gray-600">{item.type} - {item.destination}</p>
                <p className="text-sm text-gray-600">{item.date} at {item.time}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Preview</h3>
        {matrix ? <div className="flex justify-center"><MatrixPreview matrix={matrix} title="Checkride" /></div> :
          <p className="text-gray-500 text-sm text-center py-8">Add a checkride to see preview</p>}
      </div>
    </div>
  );
};

// Events Tab Component
const EventsTab = ({ matrix, generatePreview }) => {
  const [data, setData] = useState([]);
  const [form, setForm] = useState({ date: '', time: '', description: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/events', { credentials: 'include' });
      if (response.ok) setData(await response.json());
    } catch (error) {
      console.error('Failed to fetch:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.error?.details?.fieldErrors) setErrors(result.error.details.fieldErrors);
        return;
      }
      setForm({ date: '', time: '', description: '' });
      fetchData();
      generatePreview('UPCOMING_EVENTS');
    } catch (error) {
      setErrors({ general: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try {
      const response = await fetch(`/api/events?id=${id}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Add Event</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={`input-field ${errors.date ? 'input-error' : ''}`} placeholder="Date (MM/DD)" />
          {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
          <input type="text" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
            className={`input-field ${errors.time ? 'input-error' : ''}`} placeholder="Time (HH:MM)" />
          {errors.time && <p className="mt-1 text-sm text-red-600">{errors.time}</p>}
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={`input-field ${errors.description ? 'input-error' : ''}`} placeholder="Description" rows="3" />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Adding...' : 'Add Event'}
          </button>
        </form>
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
        {data.length === 0 ? <p className="text-gray-500 text-sm">No events scheduled</p> : (
          <div className="space-y-2">
            {data.map((item) => (
              <div key={item.id} className="p-3 bg-gray-50 rounded">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium">{item.description}</p>
                  <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
                <p className="text-sm text-gray-600">{item.date} at {item.time}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Preview</h3>
        {matrix ? <div className="flex justify-center"><MatrixPreview matrix={matrix} title="Event" /></div> :
          <p className="text-gray-500 text-sm text-center py-8">Add an event to see preview</p>}
      </div>
    </div>
  );
};

// Pilots Tab Component
const PilotsTab = ({ matrix, generatePreview }) => {
  const [data, setData] = useState([]);
  const [form, setForm] = useState({ name: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/pilots', { credentials: 'include' });
      if (response.ok) setData(await response.json());
    } catch (error) {
      console.error('Failed to fetch:', error);
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
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.error?.details?.fieldErrors) setErrors(result.error.details.fieldErrors);
        return;
      }
      setForm({ name: '' });
      fetchData();
      generatePreview('NEWEST_PILOT');
    } catch (error) {
      setErrors({ general: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrent = async (id) => {
    try {
      const response = await fetch(`/api/pilots?id=${id}`, { method: 'PATCH', credentials: 'include' });
      if (response.ok) {
        fetchData();
        generatePreview('NEWEST_PILOT');
      }
    } catch (error) {
      console.error('Failed to set current:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try {
      const response = await fetch(`/api/pilots?id=${id}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Add Pilot</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={`input-field ${errors.name ? 'input-error' : ''}`} placeholder="Pilot Name" />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Adding...' : 'Add Pilot'}
          </button>
        </form>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">💡 Click "Set as Current" to display on Vestaboard</p>
        </div>
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Pilots</h3>
        {data.length === 0 ? <p className="text-gray-500 text-sm">No pilots added yet</p> : (
          <div className="space-y-2">
            {data.map((item) => (
              <div key={item.id} className={`p-3 rounded ${item.isCurrent ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.isCurrent && <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">Currently Displayed</span>}
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
                {!item.isCurrent && <button onClick={() => handleSetCurrent(item.id)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Set as Current</button>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Preview</h3>
        {matrix ? <div className="flex justify-center"><MatrixPreview matrix={matrix} title="Newest Pilot" /></div> :
          <p className="text-gray-500 text-sm text-center py-8">Set a pilot as current to see preview</p>}
      </div>
    </div>
  );
};

// Recognition Tab Component
const RecognitionTab = ({ matrix, generatePreview }) => {
  const [data, setData] = useState([]);
  const [form, setForm] = useState({ firstName: '', lastName: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/recognitions', { credentials: 'include' });
      if (response.ok) setData(await response.json());
    } catch (error) {
      console.error('Failed to fetch:', error);
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
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.error?.details?.fieldErrors) setErrors(result.error.details.fieldErrors);
        return;
      }
      setForm({ firstName: '', lastName: '' });
      fetchData();
      generatePreview('EMPLOYEE_RECOGNITION');
    } catch (error) {
      setErrors({ general: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrent = async (id) => {
    try {
      const response = await fetch(`/api/recognitions?id=${id}`, { method: 'PATCH', credentials: 'include' });
      if (response.ok) {
        fetchData();
        generatePreview('EMPLOYEE_RECOGNITION');
      }
    } catch (error) {
      console.error('Failed to set current:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try {
      const response = await fetch(`/api/recognitions?id=${id}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Add Recognition</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className={`input-field ${errors.firstName ? 'input-error' : ''}`} placeholder="First Name" />
          {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
          <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className={`input-field ${errors.lastName ? 'input-error' : ''}`} placeholder="Last Name" />
          {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Adding...' : 'Add Recognition'}
          </button>
        </form>
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-800">⭐ Click "Set as Current" to display on Vestaboard</p>
        </div>
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Recognitions</h3>
        {data.length === 0 ? <p className="text-gray-500 text-sm">No recognitions added yet</p> : (
          <div className="space-y-2">
            {data.map((item) => (
              <div key={item.id} className={`p-3 rounded ${item.isCurrent ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{item.firstName} {item.lastName}</p>
                    {item.isCurrent && <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">Currently Displayed</span>}
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
                {!item.isCurrent && <button onClick={() => handleSetCurrent(item.id)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Set as Current</button>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Preview</h3>
        {matrix ? <div className="flex justify-center"><MatrixPreview matrix={matrix} title="Recognition" /></div> :
          <p className="text-gray-500 text-sm text-center py-8">Set a recognition as current to see preview</p>}
      </div>
    </div>
  );
};

export default DataManagement;
