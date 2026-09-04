// src/App.jsx - Updated with Help & Support route and modern spinners
import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StudentAuthProvider, useStudentAuth } from './context/StudentAuthContext';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Check if running on mobile
const isNative = Capacitor.isNativePlatform();

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
const Notes = React.lazy(() => import('./components/dashboard/Notes'));
const HelpSupport = React.lazy(() => import('./components/dashboard/HelpSupport'));
const Settings = React.lazy(() => import('./components/dashboard/Settings'));
const Chatbot = React.lazy(() => import('./components/dashboard/Chatbot'));
const TakeExam = React.lazy(() => import('./components/dashboard/TakeExam'));

// ============================================================================
// MODERN LOADING SPINNER COMPONENT
// ============================================================================
const ModernSpinner = ({ title = 'Loading', subtitle = 'Please wait...' }) => {
  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', marginTop: '10vh' }}>
        <div style={{ position: 'relative', width: '100px', height: '100px' }}>
          {/* Outer glow */}
          <div style={{
            position: 'absolute',
            top: '-8px',
            left: '-8px',
            width: '116px',
            height: '116px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(67,97,238,0.15) 0%, rgba(63,55,201,0.05) 50%, transparent 70%)',
            animation: 'appPulse 2s ease-in-out infinite'
          }}></div>
          
          {/* Outer ring */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTop: '3px solid #4361ee',
            borderRight: '3px solid #3f37c9',
            animation: 'appSpin 1.5s linear infinite'
          }}></div>
          
          {/* Inner ring */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            border: '3px solid transparent',
            borderBottom: '3px solid #f72585',
            borderLeft: '3px solid #4cc9f0',
            animation: 'appSpinReverse 2s linear infinite'
          }}></div>
          
          {/* Center icon */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4361ee, #3f37c9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(67,97,238,0.5), 0 0 40px rgba(63,55,201,0.3)',
            animation: 'appBounce 1.5s ease-in-out infinite'
          }}>
            <i className="fas fa-graduation-cap" style={{ color: 'white', fontSize: '16px' }}></i>
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '18px', color: '#1e293b', margin: 0, fontWeight: 600, letterSpacing: '0.5px' }}>
            {title}
          </p>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '6px 0 0 0' }}>
            {subtitle}
          </p>
        </div>
        
        {/* Dots */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4361ee', animation: 'appDots 1.2s ease-in-out infinite' }}></div>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3f37c9', animation: 'appDots 1.2s ease-in-out 0.2s infinite' }}></div>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f72585', animation: 'appDots 1.2s ease-in-out 0.4s infinite' }}></div>
        </div>
      </div>
      
      <style>{`
        @keyframes appSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes appSpinReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes appPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes appBounce {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes appDots {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// BACK BUTTON HANDLER HOOK
// ============================================================================
const useBackButton = () => {
  useEffect(() => {
    if (!isNative) return;

    let backButtonHandler;

    const setupBackButton = async () => {
      try {
        backButtonHandler = await CapacitorApp.addListener('backButton', () => {
          // PRIORITY 1: Check for open modal/dialog
          const modals = document.querySelectorAll('[role="dialog"], .modal-open, [data-modal="true"], .MuiModal-root');
          if (modals.length > 0) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            return;
          }

          // PRIORITY 2: Check for open drawer/sidebar
          const drawers = document.querySelectorAll('.drawer-open, .sidebar-open, .MuiDrawer-root');
          if (drawers.length > 0) {
            drawers.forEach(drawer => {
              const closeBtn = drawer.querySelector('[aria-label="close"], .close-btn');
              if (closeBtn) closeBtn.click();
            });
            return;
          }

          // PRIORITY 3: Navigate back in history
          if (window.history.length > 1) {
            window.history.back();
            return;
          }

          // PRIORITY 4: Exit app
          CapacitorApp.exitApp();
        });
      } catch (err) {
        console.log('Back button setup error:', err);
      }
    };

    setupBackButton();

    return () => {
      if (backButtonHandler?.remove) {
        backButtonHandler.remove();
      }
    };
  }, []);
};

const AuthGate = ({ children, requireAuth = true }) => {
  const { user, loading } = useStudentAuth();

  if (loading) {
    return <ModernSpinner title="Restoring Session" subtitle="Loading your profile..." />;
  }

  if (requireAuth && !user) return <Navigate to="/login" replace />;
  if (!requireAuth && user) return <Navigate to="/dashboard" replace />;

  return children;
};

const AppContent = () => {
  // Initialize back button handler
  useBackButton();

  return (
    <Suspense fallback={<ModernSpinner title="Loading Student Portal" subtitle="Preparing your experience..." />}>
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
          <Route path="examinations/take/:examId" element={<TakeExam />} />
          <Route path="examinations/results/:examId" element={<Results />} />
          <Route path="results" element={<Results />} />
          <Route path="finance" element={<Finance />} />
          <Route path="tutorials" element={<Tutorials />} />
          <Route path="notes" element={<Notes />} />
          <Route path="help-support" element={<HelpSupport />} />
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
};

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