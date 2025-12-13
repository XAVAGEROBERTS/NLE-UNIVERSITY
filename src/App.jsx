// src/App.jsx
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StudentAuthProvider, useStudentAuth } from './context/StudentAuthContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';

// Layout Components
const StudentLayout = React.lazy(() => import('./components/layout/StudentLayout'));
const StudentLogin = React.lazy(() => import('./components/auth/StudentLogin'));
const AdminLogin = React.lazy(() => import('./components/admin/AdminLogin'));

// Student Dashboard Components
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
const DebugAuth = React.lazy(() => import('./components/DebugAuth'));

// Admin Components
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard'));

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
      <p style={{ color: '#666', margin: 0 }}>Loading...</p>
    </div>
  </div>
);

// FIXED: Student Protected Route
const StudentRoute = ({ children }) => {
  const { isAuthenticated, loading } = useStudentAuth();
  
  // Direct localStorage check for immediate auth
  const checkLocalStorage = () => {
    try {
      const storedUser = localStorage.getItem('student_user');
      const storedAuth = localStorage.getItem('student_auth');
      
      if (storedUser && storedAuth) {
        const authData = JSON.parse(storedAuth);
        const now = Date.now();
        if (!authData.expires_at || authData.expires_at > now) {
          return true;
        } else {
          // Clear expired session
          localStorage.removeItem('student_user');
          localStorage.removeItem('student_auth');
        }
      }
    } catch (error) {
      console.error('Error checking localStorage:', error);
    }
    return false;
  };

  const hasLocalAuth = checkLocalStorage();

  // If we have local auth but context is still loading, show spinner
  if (loading && !hasLocalAuth) {
    return <LoadingSpinner />;
  }

  // Allow access if authenticated OR if localStorage has valid auth
  if (isAuthenticated || hasLocalAuth) {
    return children;
  }

  // If not authenticated and no local auth, redirect to login
  return <Navigate to="/login" replace />;
};

// FIXED: Student Public Route
const StudentPublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useStudentAuth();

  // Direct localStorage check
  const checkLocalStorage = () => {
    try {
      const storedUser = localStorage.getItem('student_user');
      const storedAuth = localStorage.getItem('student_auth');
      
      if (storedUser && storedAuth) {
        const authData = JSON.parse(storedAuth);
        const now = Date.now();
        if (!authData.expires_at || authData.expires_at > now) {
          return true;
        }
      }
    } catch (error) {
      console.error('Error checking localStorage:', error);
    }
    return false;
  };

  const hasLocalAuth = checkLocalStorage();

  // Show spinner only if no local auth and still loading
  if (loading && !hasLocalAuth) {
    return <LoadingSpinner />;
  }

  // Redirect to dashboard if authenticated OR if localStorage has valid auth
  if (isAuthenticated || hasLocalAuth) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Admin Protected Route
const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

// Admin Public Route
const AdminPublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

// FIXED: Main route handler
const RootRedirect = () => {
  const { isAuthenticated, loading } = useStudentAuth();
  
  // Direct localStorage check
  const checkLocalStorage = () => {
    try {
      const storedUser = localStorage.getItem('student_user');
      const storedAuth = localStorage.getItem('student_auth');
      
      if (storedUser && storedAuth) {
        const authData = JSON.parse(storedAuth);
        const now = Date.now();
        if (!authData.expires_at || authData.expires_at > now) {
          return true;
        }
      }
    } catch (error) {
      console.error('Error checking localStorage:', error);
    }
    return false;
  };

  const hasLocalAuth = checkLocalStorage();

  if (loading && !hasLocalAuth) {
    return <LoadingSpinner />;
  }

  // Redirect to dashboard if authenticated or has local auth
  if (isAuthenticated || hasLocalAuth) {
    return <Navigate to="/" replace />;
  }

  // Otherwise go to login
  return <Navigate to="/login" replace />;
};

const NotFound = () => {
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
      <div style={{ display: 'flex', gap: '10px' }}>
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
        <button 
          onClick={() => window.location.href = '/admin/login'}
          style={{
            padding: '12px 24px',
            backgroundColor: '#2c3e50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          Go to Admin Login
        </button>
      </div>
    </div>
  );
};

// Main App Component - FIXED ROUTING STRUCTURE
function App() {
  return (
    <Router>
      <StudentAuthProvider>
        <AdminAuthProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Debug Route */}
              <Route path="/debug-auth" element={<DebugAuth />} />
              
              {/* Root redirect */}
              <Route path="/" element={<RootRedirect />} />
              
              {/* Student Login - Public */}
              <Route path="/login" element={
                <StudentPublicRoute>
                  <StudentLogin />
                </StudentPublicRoute>
              } />
              
              {/* Student Dashboard - All student routes go through StudentLayout */}
              <Route path="/*" element={
                <StudentRoute>
                  <StudentLayout />
                </StudentRoute>
              }>
                {/* Dashboard routes - These will render inside StudentLayout's Outlet */}
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
              </Route>
              
              {/* Admin Login - Public */}
              <Route path="/admin/login" element={
                <AdminPublicRoute>
                  <AdminLogin />
                </AdminPublicRoute>
              } />
              
              {/* Admin Dashboard */}
              <Route path="/admin/dashboard" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              
              {/* Admin root redirect */}
              <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
              
              {/* Admin wildcard redirect */}
              <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
              
              {/* Catch all - 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AdminAuthProvider>
      </StudentAuthProvider>
    </Router>
  );
}

export default App;