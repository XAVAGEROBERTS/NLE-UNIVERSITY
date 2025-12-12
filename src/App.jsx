// src/App.jsx - UPDATED WITH AUTH FIXES
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext'; 

// Components
import Layout from './components/layout/Layout';
import Login from './components/auth/Login'; 
import Dashboard from './components/dashboard/Dashboard'; 
import CourseUnits from './components/dashboard/CourseUnits';
import Lectures from './components/dashboard/Lectures';
import Timetable from './components/dashboard/Timetable';
import Coursework from './components/dashboard/Coursework'; 
import Examinations from './components/dashboard/Examinations'; 
import Results from './components/dashboard/Results'; 
import Finance from './components/dashboard/Finance'; 
import Tutorials from './components/dashboard/Tutorials'; 
import Settings from './components/dashboard/Settings'; 

// Loading Component
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f8f9fa'
  }}>
    <div style={{
      textAlign: 'center',
      padding: '40px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 20px'
      }}></div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <p style={{ color: '#666', margin: 0 }}>Loading application...</p>
    </div>
  </div>
);

// 404 Component
const NotFound = () => {
  const { user } = useAuth();
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      textAlign: 'center',
      backgroundColor: '#f8f9fa',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '48px', color: '#e74c3c', marginBottom: '10px' }}>404</h1>
      <h2 style={{ color: '#2c3e50', marginBottom: '15px' }}>Page Not Found</h2>
      <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button 
        onClick={() => window.location.href = user ? '/dashboard' : '/'}
        style={{
          padding: '12px 24px',
          backgroundColor: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '600'
        }}
      >
        {user ? 'Go to Dashboard' : 'Go to Homepage'}
      </button>
    </div>
  );
};

// Protected Layout - WITH LOADING HANDLING
const ProtectedLayout = () => {
  const { user, loading } = useAuth();
  
  // Show loading while checking auth
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout />;
};

// Public Route - WITH LOADING HANDLING
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // If user is logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingSpinner />}>
        <Router>
          <Routes>
            {/* Login - Public Route */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            
            {/* All Protected Routes */}
            <Route path="/*" element={<ProtectedLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="courses" element={<CourseUnits />} />
              <Route path="lectures" element={<Lectures />} />
              <Route path="timetable" element={<Timetable />} />
              <Route path="coursework" element={<Coursework />} />
              <Route path="examinations" element={<Examinations />} />
              <Route path="results" element={<Results />} />
              <Route path="finance" element={<Finance />} />
              <Route path="tutorials" element={<Tutorials />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            
            {/* Root Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </Suspense>
    </AuthProvider>
  );
}

export default App;