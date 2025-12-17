// src/context/StudentAuthContext.jsx - FINAL WORKING VERSION
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

const StudentAuthContext = createContext({});

export const useStudentAuth = () => useContext(StudentAuthContext);

export const StudentAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check existing session
  useEffect(() => {
    const userStr = localStorage.getItem('student_user');
    if (userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
      } catch (e) {
        localStorage.removeItem('student_user');
      }
    }
  }, []);

  // SIMPLE LOGIN - NOW IT WILL WORK!
  const signIn = async (email, password) => {
    console.log('🔐 Login attempt for:', email);
    console.log('🔑 Using password:', password);
    
    setLoading(true);
    
    try {
      // Get student from database
      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !student) {
        console.log('❌ Student not found');
        throw new Error('Student not found. Check email.');
      }

      console.log('✅ Found student:', student.full_name);
      console.log('📝 DB password:', student.password_hash);
      console.log('🔍 Comparing with:', password);

      // PLAIN TEXT COMPARISON - NOW IT WILL MATCH!
      if (student.password_hash !== password) {
        console.log('❌ Password mismatch');
        console.log('💡 Try: Test1234');
        throw new Error('Wrong password. Try "Test1234"');
      }

      console.log('✅ Password correct!');
      
      // Create user session
      const userData = {
        id: student.id,
        email: student.email,
        name: student.full_name,
        studentId: student.student_id,
        program: student.program,
        yearOfStudy: student.year_of_study,
        semester: student.semester,
        phone: student.phone || '',
        createdAt: student.created_at,
        lastLogin: new Date().toISOString()
      };

      // Save to localStorage
      localStorage.setItem('student_user', JSON.stringify(userData));
      setUser(userData);
      
      console.log('🎉 Login successful!');
      
      return { 
        success: true, 
        user: userData,
        message: 'Login successful' 
      };
      
    } catch (error) {
      console.error('Login error:', error.message);
      return { 
        success: false, 
        error: error.message.includes('Test1234') 
          ? 'Wrong password. Try "Test1234"' 
          : error.message
      };
    } finally {
      setLoading(false);
    }
  };

  // PASSWORD CHANGE FUNCTION - NOW IT WILL WORK!
  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    console.log('🔄 Changing password for:', user?.email);
    
    if (!user || !user.email) {
      throw new Error('Please login first');
    }

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new Error('All password fields are required');
    }

    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    if (newPassword !== confirmPassword) {
      throw new Error('New passwords do not match');
    }

    if (currentPassword === newPassword) {
      throw new Error('New password must be different from current password');
    }

    try {
      // Get current user data
      const { data: student, error: fetchError } = await supabase
        .from('students')
        .select('password_hash')
        .eq('email', user.email)
        .single();

      if (fetchError || !student) {
        throw new Error('Failed to fetch user data');
      }

      console.log('🔐 Verifying current password...');
      console.log('  Stored in DB:', student.password_hash);
      console.log('  User entered:', currentPassword);

      // Verify current password (plain text comparison)
      if (student.password_hash !== currentPassword) {
        console.log('❌ Current password incorrect');
        throw new Error('Current password is incorrect. Try "Test1234"');
      }

      // Update to new password (plain text)
      const { error: updateError } = await supabase
        .from('students')
        .update({ 
          password_hash: newPassword,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email);

      if (updateError) {
        console.error('❌ Update error:', updateError);
        throw new Error('Failed to update password. Please try again.');
      }

      console.log('✅ Password updated successfully!');
      
      return {
        success: true,
        message: 'Password changed successfully! Use your new password next time.'
      };
      
    } catch (error) {
      console.error('❌ Password change error:', error);
      throw error;
    }
  };

  // Sign out
  const signOut = () => {
    console.log('🚪 Signing out...');
    localStorage.removeItem('student_user');
    setUser(null);
    navigate('/login');
    return { success: true };
  };

  // Check auth status
  const checkAuth = () => {
    return !!user;
  };

  // Get user data
  const getUserData = () => {
    return user;
  };

  const value = {
    user,
    loading,
    isAuthenticated: checkAuth(),
    signIn,
    signOut,
    changePassword,
    getUserData,
    checkAuth
  };

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
};