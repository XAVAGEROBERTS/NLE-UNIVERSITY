// src/App.jsx - STUDENT PORTAL ONLY
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StudentAuthProvider } from './context/StudentAuthContext';

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

const LoadingSpinner = () => (
  <div style={styles.loadingContainer}>
    <div style={styles.spinner}></div>
    <p style={styles.loadingText}>Loading Student Portal...</p>
  </div>
);

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f5f7fb'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  loadingText: {
    color: '#7f8c8d',
    fontSize: '14px'
  }
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

function App() {
  return (
    <Router>
      <StudentAuthProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Student Login */}
            <Route path="/login" element={<StudentLogin />} />
            
            {/* Student Dashboard Routes */}
            <Route path="/*" element={<StudentLayout />}>
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
            
            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* 404 */}
            <Route path="*" element={
              <div style={styles.notFoundContainer}>
                <h1 style={styles.notFoundTitle}>404</h1>
                <h2 style={styles.notFoundSubtitle}>Page Not Found</h2>
                <button 
                  onClick={() => window.location.href = '/login'}
                  style={styles.homeButton}
                >
                  Go to Student Login
                </button>
              </div>
            } />
          </Routes>
        </Suspense>
      </StudentAuthProvider>
    </Router>
  );
}

// Add these styles
Object.assign(styles, {
  notFoundContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
    padding: '20px'
  },
  notFoundTitle: {
    fontSize: '48px',
    color: '#e74c3c',
    marginBottom: '10px'
  },
  notFoundSubtitle: {
    color: '#2c3e50',
    marginBottom: '20px'
  },
  homeButton: {
    padding: '12px 24px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600'
  }
});

export default App;