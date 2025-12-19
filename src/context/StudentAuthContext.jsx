// src/context/StudentAuthContext.jsx - UPDATED FOR PERSISTENT SESSIONS
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

const StudentAuthContext = createContext({});

export const useStudentAuth = () => useContext(StudentAuthContext);

export const StudentAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const navigate = useNavigate();

  // Session timeout (24 hours)
  const SESSION_DURATION = 24 * 60 * 60 * 1000;

  // Create user object from database student data
  const createUserObject = useCallback((student) => {
    return {
      id: student.id,
      studentId: student.student_id,
      email: student.email,
      name: student.full_name,
      phone: student.phone || '',
      dateOfBirth: student.date_of_birth || '',
      program: student.program,
      yearOfStudy: student.year_of_study,
      semester: student.semester,
      intake: student.intake || '',
      academicYear: student.academic_year || '',
      programCode: student.program_code || '',
      department: student.department || '',
      departmentCode: student.department_code || '',
      status: student.status,
      createdAt: student.created_at,
      lastLogin: new Date().toISOString(),
    };
  }, []);

  // Store session in localStorage
  const storeSession = useCallback((userData) => {
    const session = {
      user: userData,
      expiresAt: new Date(Date.now() + SESSION_DURATION).toISOString(),
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('student_session', JSON.stringify(session));
  }, [SESSION_DURATION]);

  // Clear session from localStorage
  const clearSession = useCallback(() => {
    localStorage.removeItem('student_session');
  }, []);

  // Get session from localStorage
  const getSession = useCallback(() => {
    try {
      const session = localStorage.getItem('student_session');
      return session ? JSON.parse(session) : null;
    } catch (error) {
      console.error('Error parsing session:', error);
      return null;
    }
  }, []);

  // Check if session is valid
  const isSessionValid = useCallback((session) => {
    if (!session || !session.user) return false;
    
    // Check if session has expired
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      clearSession();
      return false;
    }
    
    return true;
  }, [clearSession]);

  // Restore session from localStorage on page load/refresh
  const restoreSession = useCallback(async () => {
    console.log('🔄 Restoring session from localStorage...');
    const session = getSession();
    
    if (!isSessionValid(session)) {
      console.log('❌ No valid session found in localStorage');
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      console.log('✅ Valid session found, verifying with database...');
      
      // Verify user still exists in database
      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', session.user.id)
        .eq('status', 'active')
        .single();

      if (error || !student) {
        console.log('❌ Student no longer exists or is inactive');
        clearSession();
        setUser(null);
        setLoading(false);
        return;
      }

      // Update user data with latest from database
      const updatedUser = {
        ...session.user,
        ...createUserObject(student)
      };
      
      setUser(updatedUser);
      storeSession(updatedUser); // Refresh the session
      console.log('✅ Session restored successfully for:', updatedUser.email);
      
    } catch (error) {
      console.error('Error restoring session:', error);
      clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [getSession, isSessionValid, clearSession, createUserObject, storeSession]);

  // Initialize auth on mount
  useEffect(() => {
    console.log('🔍 Initializing student authentication...');
    restoreSession();
    
    // Set up auto-logout on window close/tab close
    const handleBeforeUnload = () => {
      // Don't clear session on refresh - only on actual close
      console.log('Window closing...');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [restoreSession]);

  // Verify password (handles plain text and bcrypt)
  const verifyPassword = async (inputPassword, storedHash) => {
    try {
      // Check if password is hashed with bcrypt (starts with $2a$, $2b$, or $2y$)
      if (storedHash && storedHash.match(/^\$2[aby]\$/)) {
        // For bcrypt, we need to import it dynamically
        const bcrypt = await import('bcryptjs');
        return await bcrypt.compare(inputPassword, storedHash);
      } else {
        // Password is plain text (legacy) - compare directly
        return inputPassword === storedHash;
      }
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  };

  // Hash password with bcrypt
  const hashPassword = async (password) => {
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  };

  // SIGN IN - Direct authentication against students table
  const signIn = async (email, password) => {
    console.log('🔐 Attempting sign in for:', email);
    setAuthLoading(true);

    try {
      // Query the students table directly
      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Database error:', error);
        return { 
          success: false, 
          error: 'Invalid email or password'
        };
      }

      if (!student) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Check if student has password_hash
      if (!student.password_hash) {
        return { 
          success: false, 
          error: 'Please contact administrator to set your password',
          needsPasswordReset: true 
        };
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, student.password_hash);
      
      if (!isValidPassword) {
        return { success: false, error: 'Invalid email or password' };
      }

      // If password is plain text (legacy), upgrade it to bcrypt
      if (student.password_hash && !student.password_hash.match(/^\$2[aby]\$/)) {
        console.log('🔄 Upgrading plain text password to bcrypt hash');
        const hashedPassword = await hashPassword(password);
        
        await supabase
          .from('students')
          .update({ 
            password_hash: hashedPassword,
            updated_at: new Date().toISOString()
          })
          .eq('id', student.id);
      }

      // Create user object
      const userData = createUserObject(student);
      
      // Store session
      setUser(userData);
      storeSession(userData);

      // Update last login time
      await supabase
        .from('students')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', student.id);

      console.log('✅ Login successful:', userData.name);
      return { 
        success: true, 
        message: 'Login successful!',
        user: userData 
      };

    } catch (error) {
      console.error('Unexpected login error:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      };
    } finally {
      setAuthLoading(false);
    }
  };

  // SIGN OUT
  const signOut = async () => {
    console.log('🚪 Signing out...');
    setAuthLoading(true);

    try {
      clearSession();
      setUser(null);
      navigate('/login', { replace: true });
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    } finally {
      setAuthLoading(false);
    }
  };

  // CHANGE PASSWORD
  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    if (!user?.email) {
      throw new Error('Please login first');
    }

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new Error('All password fields are required');
    }

    if (newPassword !== confirmPassword) {
      throw new Error('New passwords do not match');
    }

    if (currentPassword === newPassword) {
      throw new Error('New password must be different from current password');
    }

    // Check password strength
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (newPassword.length < minLength || !hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new Error(
        'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters'
      );
    }

    try {
      // Get current student data
      const { data: student, error: fetchError } = await supabase
        .from('students')
        .select('password_hash')
        .eq('id', user.id)
        .eq('status', 'active')
        .single();

      if (fetchError || !student) {
        throw new Error('Student not found or inactive');
      }

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(currentPassword, student.password_hash);
      
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password in database
      const { error: updateError } = await supabase
        .from('students')
        .update({
          password_hash: newPasswordHash,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`);
      }

      return { 
        success: true, 
        message: 'Password changed successfully!' 
      };
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  };

  // RESET PASSWORD REQUEST
  const requestPasswordReset = async (email) => {
    try {
      const { data: student, error } = await supabase
        .from('students')
        .select('id, email, full_name, student_id')
        .eq('email', email.toLowerCase().trim())
        .eq('status', 'active')
        .single();

      if (error || !student) {
        // Don't reveal if email exists or not (security best practice)
        console.log('Password reset requested for non-existent email:', email);
        return { 
          success: true, 
          message: 'If an account exists with this email, you will receive password reset instructions.' 
        };
      }

      // In a real implementation, you would send an email
      console.log(`Password reset requested for ${email}`);
      
      return { 
        success: true, 
        message: 'If an account exists with this email, you will receive password reset instructions.'
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      return { 
        success: true, 
        message: 'If an account exists with this email, you will receive password reset instructions.' 
      };
    }
  };

  // UPDATE PROFILE
  const updateProfile = async (updates) => {
    if (!user?.id) {
      throw new Error('Please login first');
    }

    try {
      const { error } = await supabase
        .from('students')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      // Update local user state
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      storeSession(updatedUser);

      return { 
        success: true, 
        message: 'Profile updated successfully!',
        user: updatedUser 
      };
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  // Check if user is authenticated
  const checkAuth = () => {
    return isSessionValid(getSession());
  };

  const value = {
    user,
    loading,
    authLoading,
    isAuthenticated: !!user && checkAuth(),
    signIn,
    signOut,
    changePassword,
    requestPasswordReset,
    updateProfile,
    refreshSession: () => {
      if (user) {
        storeSession(user);
      }
    },
    getCurrentUser: () => user
  };

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
};