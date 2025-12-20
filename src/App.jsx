// src/App.jsx - FINAL
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StudentAuthProvider, useStudentAuth } from './context/StudentAuthContext';

// Lazy components
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

const AuthGate = ({ children, requireAuth = true }) => {
  const { user, loading } = useStudentAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Restoring your session...</p>
        <style>{`
          .loading-screen {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #f5f7fb;
            gap: 20px;
            font-family: system-ui, sans-serif;
          }
          .spinner {
            width: 60px;
            height: 60px;
            border: 5px solid #f3f3f3;
            border-top: 5px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (requireAuth && !user) return <Navigate to="/login" replace />;
  if (!requireAuth && user) return <Navigate to="/dashboard" replace />;

  return children;
};

const AppContent = () => (
  <Suspense fallback={
    <div className="loading-screen">
      <div className="spinner" style={{ borderTopColor: '#2ecc71' }}></div>
      <p>Loading Student Portal...</p>
      <style>{`
        .loading-screen { /* same as above */ }
        .spinner { /* same */ }
        @keyframes spin { /* same */ }
      `}</style>
    </div>
  }>
    <Routes>
      <Route path="/login" element={<AuthGate requireAuth={false}><StudentLogin /></AuthGate>} />

      <Route path="/" element={<AuthGate requireAuth={true}><StudentLayout /></AuthGate>}>
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

      <Route path="*" element={
        <div className="not-found">
          <h1>404</h1>
          <h2>Page Not Found</h2>
          <button onClick={() => window.location.href = '/login'}>Go to Login</button>
          <style>{`
            .not-found {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              text-align: center;
              background: #f8f9fa;
            }
            button {
              margin-top: 20px;
              padding: 12px 24px;
              background: #3498db;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
            }
          `}</style>
        </div>
      } />
    </Routes>
  </Suspense>
);

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