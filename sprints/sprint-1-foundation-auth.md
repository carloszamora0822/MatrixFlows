# Sprint 1: Foundation & Authentication

## Goal
Establish the foundational project structure, authentication system, and user management capabilities.

## Duration
1 Week

## Deliverables
- Complete project setup with development and deployment commands
- Working authentication system (login/logout)
- User management with role-based authorization
- Basic dashboard with user info
- MongoDB connection and user schema
- Basic UI components with Tailwind CSS

## Requirements

### 1. Project Structure Setup
```
MatrixFlow/
├── package.json                    # Root package.json with scripts
├── .env.example                    # Environment variables template
├── .env.local                      # Local development environment
├── .gitignore                      # Git ignore file
├── vercel.json                     # Vercel deployment config
├── frontend/
│   ├── package.json
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                 # Reusable UI components
│   │   │   ├── layout/             # Layout components
│   │   │   └── auth/               # Authentication components
│   │   ├── pages/                  # Page components
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── utils/                  # Frontend utilities
│   │   ├── App.js
│   │   └── index.js
│   └── tailwind.config.js
├── backend/
│   ├── package.json
│   ├── api/                        # Vercel serverless functions
│   │   ├── auth/
│   │   │   ├── login.js
│   │   │   └── logout.js
│   │   ├── users/
│   │   │   ├── me.js
│   │   │   └── index.js
│   │   └── health.js
│   ├── lib/
│   │   ├── db.js                   # MongoDB connection
│   │   ├── auth.js                 # Authentication utilities
│   │   ├── middleware.js           # Express middleware
│   │   └── validation.js           # Input validation
│   ├── models/
│   │   ├── User.js
│   │   └── Organization.js
│   └── utils/
│       ├── constants.js
│       └── helpers.js
└── shared/
    ├── constants.js                # Shared constants
    └── types.js                    # Shared type definitions
```

### 2. Environment Variables
**Required Environment Variables:**
```bash
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=your-jwt-secret-key

# Application
NODE_ENV=development|production
FRONTEND_URL=http://localhost:3000

# Organization
ORG_ID=VBT
ORG_NAME=VBT

# API Keys (for later sprints)
OPENWEATHER_API_KEY=your-key
OPENWEATHER_LOCATION=Bentonville,US
VESTABOARD_TEST_API_KEY=your-test-key
VESTABOARD_PROD_API_KEY=your-prod-key
```

### 3. Package.json Scripts
**Root package.json:**
```json
{
  "name": "vbt-vestaboard-system",
  "version": "1.0.0",
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:frontend": "cd frontend && npm start",
    "dev:backend": "cd backend && npm run dev",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "cd backend && npm run build",
    "deploy": "vercel --prod",
    "install:all": "npm install && cd frontend && npm install && cd ../backend && npm install"
  }
}
```

### 4. Database Models

#### Organization Model
```javascript
// backend/models/Organization.js
const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  orgId: {
    type: String,
    required: true,
    unique: true,
    default: 'VBT'
  },
  name: {
    type: String,
    required: true,
    default: 'VBT'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Organization', organizationSchema);
```

#### User Model
```javascript
// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  orgId: {
    type: String,
    required: true,
    default: 'VBT'
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'editor', 'viewer'],
    default: 'editor'
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
```

### 5. Authentication System

#### JWT Utilities
```javascript
// backend/lib/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies.authToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const decoded = verifyToken(token);
    const user = await User.findOne({ userId: decoded.userId });
    
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid authentication'
        }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid authentication'
      }
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }
    next();
  };
};

module.exports = {
  generateToken,
  verifyToken,
  requireAuth,
  requireRole
};
```

### 6. API Endpoints

#### Login Endpoint
```javascript
// backend/api/auth/login.js
const { connectDB } = require('../../lib/db');
const User = require('../../models/User');
const { generateToken } = require('../../lib/auth');
const { validateLoginInput } = require('../../lib/validation');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  }

  try {
    await connectDB();

    const { email, password } = req.body;
    
    // Validate input
    const validation = validateLoginInput({ email, password });
    if (!validation.isValid) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: { fieldErrors: validation.errors }
        }
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials'
        }
      });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials'
        }
      });
    }

    // Generate token
    const token = generateToken(user.userId);

    // Set HTTP-only cookie
    res.setHeader('Set-Cookie', `authToken=${token}; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/`);

    // Return user data
    res.status(200).json({
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};
```

#### Logout Endpoint
```javascript
// backend/api/auth/logout.js
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  }

  // Clear auth cookie
  res.setHeader('Set-Cookie', 'authToken=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/');
  
  res.status(200).json({ message: 'Logged out successfully' });
};
```

#### Me Endpoint
```javascript
// backend/api/users/me.js
const { connectDB } = require('../../lib/db');
const { requireAuth } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
  }

  try {
    await connectDB();
    
    // Apply auth middleware
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.status(200).json({
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role
    });

  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};
```

### 7. Frontend Components

#### Login Component
```javascript
// frontend/src/components/auth/LoginForm.js
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const LoginForm = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      await login(formData.email, formData.password);
    } catch (error) {
      if (error.details?.fieldErrors) {
        setErrors(error.details.fieldErrors);
      } else {
        setErrors({ general: error.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            VBT Vestaboard System
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.general}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
```

#### Dashboard Component
```javascript
// frontend/src/pages/Dashboard.js
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/layout/Layout';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to VBT Vestaboard System
            </h1>
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">User Information</h2>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{user.role}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">User ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.userId}</dd>
                </div>
              </dl>
            </div>
            
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900">Boards</h3>
                  <p className="mt-2 text-sm text-gray-500">Manage Vestaboard displays</p>
                  <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                    View Boards
                  </button>
                </div>
                
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900">Data Management</h3>
                  <p className="mt-2 text-sm text-gray-500">Manage birthdays, events, and more</p>
                  <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700">
                    Manage Data
                  </button>
                </div>
                
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900">Workflows</h3>
                  <p className="mt-2 text-sm text-gray-500">Configure display workflows</p>
                  <button className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700">
                    Manage Workflows
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
```

### 8. Custom Hooks

#### useAuth Hook
```javascript
// frontend/src/hooks/useAuth.js
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/users/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw data.error;
    }

    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 9. Validation Utilities
```javascript
// backend/lib/validation.js
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateLoginInput = ({ email, password }) => {
  const errors = {};

  if (!email || !email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(email.trim())) {
    errors.email = 'Invalid email format';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

module.exports = {
  validateEmail,
  validateLoginInput
};
```

### 10. Database Connection
```javascript
// backend/lib/db.js
const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = db.connections[0].readyState === 1;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

module.exports = { connectDB };
```

## Testing Checklist
- [ ] `npm run dev` starts both frontend and backend
- [ ] Login form renders correctly
- [ ] Login with valid credentials works
- [ ] Login with invalid credentials shows error
- [ ] Dashboard shows user information
- [ ] Logout functionality works
- [ ] Protected routes redirect to login
- [ ] Role-based authorization works
- [ ] Database connection established
- [ ] JWT tokens generated and validated

## Definition of Done
- All authentication flows working
- User can login/logout successfully
- Dashboard displays user information
- Database models created and tested
- Basic UI components with Tailwind styling
- Error handling implemented
- Development environment fully functional
- Code follows project structure standards
