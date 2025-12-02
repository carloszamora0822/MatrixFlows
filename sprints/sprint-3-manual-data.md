# Sprint 3: Manual Data Management

## Goal
Implement complete CRUD operations for all manual data types with validation, UI forms, and live preview functionality.

## Duration
1 Week

## Deliverables
- Database models for all manual data types
- CRUD API endpoints with validation
- UI pages for data management
- Form components with validation
- Live preview integration
- Data seeding scripts

## Requirements

### 1. Database Models

#### Birthday Model
```javascript
// backend/models/Birthday.js
const mongoose = require('mongoose');

const birthdaySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => `bd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  orgId: {
    type: String,
    required: true,
    default: 'VBT'
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String,
    required: true,
    match: /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/
  },
  createdBy: {
    type: String,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Birthday', birthdaySchema);
```

#### Checkride Model
```javascript
// backend/models/Checkride.js
const mongoose = require('mongoose');

const checkrideSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => `cr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  orgId: {
    type: String,
    required: true,
    default: 'VBT'
  },
  time: {
    type: String,
    required: true,
    match: /^([01][0-9]|2[0-3])[0-5][0-9]$/
  },
  callsign: {
    type: String,
    required: true,
    maxlength: 6,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['PPL', 'IFR']
  },
  destination: {
    type: String,
    required: true,
    maxlength: 6,
    trim: true
  },
  date: {
    type: String,
    match: /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Checkride', checkrideSchema);
```

### 2. API Endpoints

#### Birthdays API
```javascript
// backend/api/birthdays/index.js
const { connectDB } = require('../../lib/db');
const { requireAuth, requireRole } = require('../../lib/auth');
const Birthday = require('../../models/Birthday');
const { validateBirthdayInput } = require('../../lib/validation');

module.exports = async (req, res) => {
  try {
    await connectDB();

    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    switch (req.method) {
      case 'GET':
        return await getBirthdays(req, res);
      case 'POST':
        await new Promise((resolve, reject) => {
          requireRole(['admin', 'editor'])(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        return await createBirthday(req, res);
      default:
        return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
    }
  } catch (error) {
    console.error('Birthdays API error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

const getBirthdays = async (req, res) => {
  const { date } = req.query;
  const filter = { orgId: 'VBT' };
  
  if (date) {
    filter.date = date;
  }

  const birthdays = await Birthday.find(filter)
    .sort({ createdAt: -1 })
    .select('-__v');

  res.status(200).json(birthdays);
};

const createBirthday = async (req, res) => {
  const { firstName, date } = req.body;
  
  const validation = validateBirthdayInput({ firstName, date });
  if (!validation.isValid) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { fieldErrors: validation.errors }
      }
    });
  }

  const birthday = new Birthday({
    firstName: firstName.trim().toUpperCase(),
    date,
    createdBy: req.user.userId,
    orgId: 'VBT'
  });

  await birthday.save();

  res.status(201).json({
    id: birthday.id,
    firstName: birthday.firstName,
    date: birthday.date,
    createdAt: birthday.createdAt
  });
};
```

### 3. Validation Functions
```javascript
// backend/lib/validation.js (additions)
const validateBirthdayInput = ({ firstName, date }) => {
  const errors = {};

  if (!firstName || !firstName.trim()) {
    errors.firstName = 'First name is required';
  }

  if (!date) {
    errors.date = 'Date is required';
  } else if (!/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/.test(date)) {
    errors.date = 'Invalid date format. Use MM/DD';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const validateCheckrideInput = ({ time, callsign, type, destination, date }) => {
  const errors = {};

  if (!time) {
    errors.time = 'Time is required';
  } else if (!/^([01][0-9]|2[0-3])[0-5][0-9]$/.test(time)) {
    errors.time = 'Invalid time format. Use HHMM (24-hour)';
  }

  if (!callsign || !callsign.trim()) {
    errors.callsign = 'Callsign is required';
  } else if (callsign.trim().length > 6) {
    errors.callsign = 'Callsign must be 6 characters or less';
  }

  if (!type) {
    errors.type = 'Type is required';
  } else if (!['PPL', 'IFR'].includes(type)) {
    errors.type = 'Type must be PPL or IFR';
  }

  if (!destination || !destination.trim()) {
    errors.destination = 'Destination is required';
  } else if (destination.trim().length > 6) {
    errors.destination = 'Destination must be 6 characters or less';
  }

  if (date && !/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/.test(date)) {
    errors.date = 'Invalid date format. Use MM/DD';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

module.exports = {
  // ... existing validations
  validateBirthdayInput,
  validateCheckrideInput
};
```

### 4. Frontend Data Management Pages

#### Birthdays Page
```javascript
// frontend/src/pages/data/Birthdays.js
import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import BirthdayForm from '../../components/forms/BirthdayForm';
import BirthdayList from '../../components/lists/BirthdayList';
import MatrixPreview from '../../components/ui/MatrixPreview';
import { useScreenPreview } from '../../hooks/useScreenPreview';

const Birthdays = () => {
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBirthday, setSelectedBirthday] = useState(null);
  const { matrix, generatePreview } = useScreenPreview();

  useEffect(() => {
    fetchBirthdays();
    generatePreview('BIRTHDAY');
  }, [generatePreview]);

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

  const handleBirthdayCreated = (newBirthday) => {
    setBirthdays([newBirthday, ...birthdays]);
    generatePreview('BIRTHDAY');
  };

  const handlePreviewBirthday = (birthday) => {
    setSelectedBirthday(birthday);
    generatePreview('BIRTHDAY', { birthdayId: birthday.id });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Birthday Management</h1>
            <p className="mt-2 text-gray-600">Manage birthday entries for the Vestaboard display</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Column */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Birthday</h2>
                <BirthdayForm onBirthdayCreated={handleBirthdayCreated} />
              </div>
            </div>

            {/* List Column */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Birthday List</h2>
                {loading ? (
                  <div className="text-center py-4">Loading...</div>
                ) : (
                  <BirthdayList 
                    birthdays={birthdays} 
                    onPreview={handlePreviewBirthday}
                    selectedBirthday={selectedBirthday}
                  />
                )}
              </div>
            </div>

            {/* Preview Column */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Screen Preview</h2>
                <MatrixPreview matrix={matrix} />
                {selectedBirthday && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Previewing: {selectedBirthday.firstName} ({selectedBirthday.date})
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Birthdays;
```

#### Birthday Form Component
```javascript
// frontend/src/components/forms/BirthdayForm.js
import React, { useState } from 'react';

const BirthdayForm = ({ onBirthdayCreated }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    date: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/birthdays', {
        method: 'POST',
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
          setErrors({ general: data.error?.message || 'Failed to create birthday' });
        }
        return;
      }

      // Success
      setFormData({ firstName: '', date: '' });
      onBirthdayCreated(data);

    } catch (error) {
      setErrors({ general: 'Network error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.general}
        </div>
      )}

      <div>
        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
          First Name
        </label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
          className={`mt-1 block w-full px-3 py-2 border ${
            errors.firstName ? 'border-red-300' : 'border-gray-300'
          } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          placeholder="Enter first name"
        />
        {errors.firstName && (
          <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
        )}
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
          Date (MM/DD)
        </label>
        <input
          type="text"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          placeholder="MM/DD"
          className={`mt-1 block w-full px-3 py-2 border ${
            errors.date ? 'border-red-300' : 'border-gray-300'
          } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
        />
        {errors.date && (
          <p className="mt-1 text-sm text-red-600">{errors.date}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Adding...' : 'Add Birthday'}
      </button>
    </form>
  );
};

export default BirthdayForm;
```

### 5. Data Service Layer
```javascript
// backend/lib/dataService.js
const Birthday = require('../models/Birthday');
const Checkride = require('../models/Checkride');
const UpcomingEvent = require('../models/UpcomingEvent');
const Pilot = require('../models/Pilot');
const EmployeeRecognition = require('../models/EmployeeRecognition');

class DataService {
  // Birthday methods
  async getLatestBirthday() {
    return await Birthday.findOne({ orgId: 'VBT' })
      .sort({ createdAt: -1 })
      .select('-__v');
  }

  async getBirthdaysByDate(date) {
    return await Birthday.find({ orgId: 'VBT', date })
      .sort({ createdAt: -1 })
      .select('-__v');
  }

  // Checkride methods
  async getCheckridesByDate(date, limit = 5) {
    const filter = { orgId: 'VBT' };
    if (date) {
      filter.date = date;
    }

    return await Checkride.find(filter)
      .sort({ time: 1 })
      .limit(limit)
      .select('-__v');
  }

  // Current pilot
  async getCurrentPilot() {
    return await Pilot.findOne({ orgId: 'VBT', isCurrent: true })
      .sort({ createdAt: -1 })
      .select('-__v');
  }

  // Current recognition
  async getCurrentRecognition() {
    return await EmployeeRecognition.findOne({ orgId: 'VBT', isCurrent: true })
      .sort({ createdAt: -1 })
      .select('-__v');
  }
}

module.exports = new DataService();
```

### 6. Navigation Updates
```javascript
// frontend/src/components/layout/Navigation.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Navigation = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', current: location.pathname === '/' },
    { name: 'Boards', href: '/boards', current: location.pathname.startsWith('/boards') },
    {
      name: 'Data Management',
      current: location.pathname.startsWith('/data'),
      children: [
        { name: 'Birthdays', href: '/data/birthdays' },
        { name: 'Checkrides', href: '/data/checkrides' },
        { name: 'Events', href: '/data/events' },
        { name: 'Newest Pilot', href: '/data/newest-pilot' },
        { name: 'Recognition', href: '/data/recognition' },
        { name: 'Custom Messages', href: '/data/custom-messages' }
      ]
    },
    { name: 'Workflows', href: '/workflows', current: location.pathname.startsWith('/workflows') }
  ];

  return (
    <nav className="bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-white text-xl font-bold">VBT Vestaboard</h1>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigation.map((item) => (
                  <div key={item.name} className="relative group">
                    {item.children ? (
                      <>
                        <button className={`px-3 py-2 rounded-md text-sm font-medium ${
                          item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`}>
                          {item.name}
                        </button>
                        <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                          <div className="py-1">
                            {item.children.map((child) => (
                              <Link
                                key={child.name}
                                to={child.href}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <Link
                        to={item.href}
                        className={`px-3 py-2 rounded-md text-sm font-medium ${
                          item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        {item.name}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300 text-sm">{user.email}</span>
            <button
              onClick={logout}
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
```

## Testing Checklist
- [ ] All database models created and tested
- [ ] CRUD API endpoints working
- [ ] Input validation functioning
- [ ] UI forms submit correctly
- [ ] Live preview updates on data changes
- [ ] Navigation between data types works
- [ ] Error handling displays properly
- [ ] Role-based permissions enforced
- [ ] Data persistence verified

## Definition of Done
- All manual data types have CRUD operations
- UI forms with validation implemented
- Live preview integration working
- Database models properly structured
- API endpoints with proper error handling
- Navigation system updated
- Role-based access control working
- All data management pages functional
