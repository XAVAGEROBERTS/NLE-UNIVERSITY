// src/components/auth/ProtectedRoute.jsx - FINAL VERSION
import { Navigate, useLocation } from 'react-router-dom';
import { useStudentAuth } from '../../context/StudentAuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useStudentAuth();
  const location = useLocation();

  // Show loading spinner briefly during session restore
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#f5f7fb',
          gap: '20px',
        }}
      >
        <div
          style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ color: '#7f8c8d', fontSize: '16px', margin: 0 }}>
          Restoring your session...
        </p>
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If loading is done and no user → redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated → show protected page
  return children;
};

export default ProtectedRoute;