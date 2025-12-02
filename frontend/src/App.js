import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginForm from './components/auth/LoginForm';
import Dashboard from './pages/Dashboard';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/" replace /> : children;
};

// App Routes Component
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginForm />
          </PublicRoute>
        } 
      />

      {/* Protected Routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />

      {/* Placeholder routes for future sprints */}
      <Route 
        path="/boards" 
        element={
          <ProtectedRoute>
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">Boards Management</h1>
                <p className="mt-2 text-gray-600">Coming in Sprint 5</p>
                <a href="/" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Back to Dashboard
                </a>
              </div>
            </div>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/data" 
        element={
          <ProtectedRoute>
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">Data Management</h1>
                <p className="mt-2 text-gray-600">Coming in Sprint 3</p>
                <a href="/" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Back to Dashboard
                </a>
              </div>
            </div>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/workflows" 
        element={
          <ProtectedRoute>
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">Workflow Management</h1>
                <p className="mt-2 text-gray-600">Coming in Sprint 5</p>
                <a href="/" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Back to Dashboard
                </a>
              </div>
            </div>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/pin" 
        element={
          <ProtectedRoute>
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">Pin Screen Wizard</h1>
                <p className="mt-2 text-gray-600">Coming in Sprint 6</p>
                <a href="/" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Back to Dashboard
                </a>
              </div>
            </div>
          </ProtectedRoute>
        } 
      />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
