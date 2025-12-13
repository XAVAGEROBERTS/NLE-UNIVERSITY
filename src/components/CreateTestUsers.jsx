// src/components/CreateTestUsers.jsx
import React, { useState } from 'react';
import { supabase } from '../services/supabase';

const CreateTestUsers = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const createUsers = async () => {
    setLoading(true);
    setMessage('');

    try {
      // Create Admin
      const { data: adminData, error: adminError } = await supabase.auth.signUp({
        email: 'admin@university.edu',
        password: 'Admin123!',
        options: {
          data: {
            role: 'admin',
            full_name: 'System Administrator'
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (adminError) {
        setMessage(`Admin error: ${adminError.message}`);
      } else {
        setMessage(prev => prev + 'Admin created successfully! ');
      }

      // Create Student
      const { data: studentData, error: studentError } = await supabase.auth.signUp({
        email: 'student@university.edu',
        password: 'Student123!',
        options: {
          data: {
            role: 'student',
            full_name: 'John Student',
            registration: 'STU-2024-001'
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (studentError) {
        setMessage(prev => prev + `Student error: ${studentError.message}`);
      } else {
        setMessage(prev => prev + 'Student created successfully!');
      }

    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h2>Create Test Users</h2>
      <button 
        onClick={createUsers} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Creating...' : 'Create Test Users'}
      </button>
      
      {message && (
        <div style={{
          padding: '15px',
          backgroundColor: message.includes('error') ? '#fee' : '#e8f6ef',
          borderRadius: '6px',
          marginTop: '20px'
        }}>
          {message}
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h3>Test Credentials:</h3>
        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '6px' }}>
          <p><strong>Admin:</strong></p>
          <p>Email: admin@university.edu</p>
          <p>Password: Admin123!</p>
          <p>URL: /admin/login</p>
          
          <p style={{ marginTop: '15px' }}><strong>Student:</strong></p>
          <p>Email: student@university.edu</p>
          <p>Password: Student123!</p>
          <p>URL: /login</p>
        </div>
      </div>
    </div>
  );
};

export default CreateTestUsers;