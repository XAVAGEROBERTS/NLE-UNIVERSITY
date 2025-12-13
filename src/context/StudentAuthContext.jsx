// src/context/StudentAuthContext.jsx - SIMPLIFIED VERSION
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const StudentAuthContext = createContext({});

export const StudentAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // SIMPLE initialization - check localStorage only
  useEffect(() => {
    console.log('🔄 StudentAuth init - checking localStorage');
    
    // Check localStorage for cached user
    const cachedUser = localStorage.getItem('student_user');
    if (cachedUser) {
      try {
        const userData = JSON.parse(cachedUser);
        console.log('✅ Found cached user:', userData.email);
        setUser(userData);
      } catch (error) {
        console.error('❌ Error parsing cached user:', error);
        localStorage.removeItem('student_user');
      }
    }
    
    // Set loading to false after a short delay
    const timer = setTimeout(() => {
      console.log('🏁 Auth init complete');
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // SIMPLE login function
  const signIn = async (email, password) => {
    try {
      console.log('🔐 Attempting login for:', email);
      setLoading(true);
      
      const cleanEmail = email.trim().toLowerCase();
      
      // Use RPC authentication
      const { data, error } = await supabase.rpc('authenticate_user', {
        user_email: cleanEmail,
        user_password: password
      });

      if (error) {
        console.error('❌ Auth error:', error);
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'Invalid email or password' };
      }

      const authResult = data[0];
      
      // Verify it's a student
      if (authResult.role !== 'student') {
        return { success: false, error: 'Not a student account' };
      }

      // Get complete student data
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('email', cleanEmail)
        .single();

      if (studentError || !studentData) {
        return { success: false, error: 'Student data not found' };
      }

      // Create user object
      const userObj = {
        id: studentData.id,
        email: studentData.email,
        name: studentData.full_name,
        studentId: studentData.student_id,
        program: studentData.program,
        yearOfStudy: studentData.year_of_study,
        semester: studentData.semester,
        avatar: '/images/ROBERT PROFILE.jpg',
        role: 'student'
      };

      // Save to state and localStorage
      setUser(userObj);
      localStorage.setItem('student_user', JSON.stringify(userObj));
      
      console.log('✅ Login successful:', userObj.name);
      
      return { 
        success: true, 
        user: userObj,
        message: 'Login successful!' 
      };

    } catch (error) {
      console.error('❌ Login exception:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    console.log('🚪 Signing out...');
    setUser(null);
    localStorage.removeItem('student_user');
    window.location.href = '/login';
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    signIn,
    signOut
  };

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => {
  const context = useContext(StudentAuthContext);
  if (!context) {
    throw new Error('useStudentAuth must be used within StudentAuthProvider');
  }
  return context;
};