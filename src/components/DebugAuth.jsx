// src/components/DebugAuth.jsx
import React, { useEffect } from 'react';
import { useStudentAuth } from '../context/StudentAuthContext';

const DebugAuth = () => {
  const { isAuthenticated, user, loading } = useStudentAuth();
  
  useEffect(() => {
    console.log('=== DEBUG AUTH ===');
    console.log('Context state:', { isAuthenticated, user, loading });
    console.log('localStorage student_user:', localStorage.getItem('student_user'));
    console.log('localStorage student_auth:', localStorage.getItem('student_auth'));
    
    // Parse and check expiration
    try {
      const auth = localStorage.getItem('student_auth');
      if (auth) {
        const authData = JSON.parse(auth);
        const now = Date.now();
        console.log('Auth expires at:', new Date(authData.expires_at).toLocaleString());
        console.log('Current time:', new Date(now).toLocaleString());
        console.log('Is expired?', authData.expires_at && authData.expires_at < now);
      }
    } catch (error) {
      console.error('Error parsing auth:', error);
    }
  }, [isAuthenticated, user, loading]);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Auth Debug Info</h2>
      <pre>
        {JSON.stringify({
          isAuthenticated,
          user,
          loading,
          localStorage: {
            student_user: localStorage.getItem('student_user'),
            student_auth: localStorage.getItem('student_auth')
          }
        }, null, 2)}
      </pre>
      
      <button 
        onClick={() => {
          localStorage.removeItem('student_user');
          localStorage.removeItem('student_auth');
          window.location.reload();
        }}
        style={{ marginTop: '20px', padding: '10px' }}
      >
        Clear localStorage and reload
      </button>
    </div>
  );
};

export default DebugAuth;