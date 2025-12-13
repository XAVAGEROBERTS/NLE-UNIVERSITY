// src/components/auth/StudentProtectedRoute.jsx
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStudentAuth } from '../../context/StudentAuthContext';

const StudentProtectedRoute = ({ children }) => {
  const { user, loading } = useStudentAuth();
  const location = useLocation();

  // Debug logging
  useEffect(() => {
    console.log('🔐 Protected Route Debug:', {
      loading,
      user: user ? 'User exists' : 'No user',
      path: location.pathname,
      timestamp: new Date().toISOString()
    });
  }, [user, loading, location]);

  if (loading) {
    console.log('⏳ Showing loading screen in protected route...');
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Checking authentication...</p>
        <p style={styles.debugText}>
          {window.location.href.includes('localhost') ? 'Local dev mode' : 'Production mode'}
        </p>
      </div>
    );
  }

  if (!user) {
    console.log('🚫 No user found, redirecting to login');
    console.log('📍 Current path:', location.pathname);
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  console.log('✅ User authenticated, rendering protected content');
  return children;
};

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    padding: '20px'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  loadingText: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '10px'
  },
  debugText: {
    fontSize: '12px',
    color: '#999',
    marginTop: '20px'
  }
};

// Add CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default StudentProtectedRoute;