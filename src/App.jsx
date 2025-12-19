// src/App.jsx - UPDATED
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StudentAuthProvider, useStudentAuth } from './context/StudentAuthContext';
import LogoutLoader from './components/auth/LogoutLoader';

// Student components only
const StudentLayout = React.lazy(() => import('./components/layout/StudentLayout'));
const StudentLogin = React.lazy(() => import('./components/auth/StudentLogin'));
const Dashboard = React.lazy(() => import('./components/dashboard/Dashboard'));
const CourseUnits = React.lazy(() => import('./components/dashboard/CourseUnits'));
const Lectures = React.lazy(() => import('./components/dashboard/Lectures'));
const Timetable = React.lazy(() => import('./components/dashboard/Timetable'));
const Coursework = React.lazy(() => import('./components/dashboard/Coursework'));
const Examinations = React.lazy(() => import('./components/dashboard/Examinations'));
const Results = React.lazy(() => import('./components/dashboard/Results'));
const Finance = React.lazy(() => import('./components/dashboard/Finance'));
const Tutorials = React.lazy(() => import('./components/dashboard/Tutorials'));
const Settings = React.lazy(() => import('./components/dashboard/Settings'));
const Chatbot = React.lazy(() => import('./components/dashboard/Chatbot'));

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useStudentAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f7fb'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <p style={{ color: '#7f8c8d', fontSize: '14px' }}>Loading...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Component (redirects if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useStudentAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f7fb'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <p style={{ color: '#7f8c8d', fontSize: '14px' }}>Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// App Content Component (to access auth context)
const AppContent = () => {
  const { logoutLoading, logoutProgress } = useStudentAuth();

  return (
    <>
      {logoutLoading && <LogoutLoader progress={logoutProgress} />}
      
      <Suspense fallback={
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#f5f7fb'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }}></div>
          <p style={{ color: '#7f8c8d', fontSize: '14px' }}>Loading Student Portal...</p>
        </div>
      }>
        <Routes>
          {/* Student Login - Public Route */}
          <Route path="/login" element={
            <PublicRoute>
              <StudentLogin />
            </PublicRoute>
          } />
          
          {/* Protected Student Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <StudentLayout />
            </ProtectedRoute>
          }>
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
            <Route path="chatbot" element={<Chatbot />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* 404 - Public Route */}
          <Route path="*" element={
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
              <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>Page Not Found</h2>
              <button 
                onClick={() => window.location.href = '/login'}
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
                Go to Student Login
              </button>
            </div>
          } />
        </Routes>
      </Suspense>
    </>
  );
};

// Main App Component
function App() {
  return (
    <Router>
      <StudentAuthProvider>
        <AppContent />
      </StudentAuthProvider>
    </Router>
  );
}

export default App;