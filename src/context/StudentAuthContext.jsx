// src/context/StudentAuthContext.jsx - 100% FIXED: WITH PASSWORD CHANGE FUNCTION
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

const StudentAuthContext = createContext({});

export const useStudentAuth = () => useContext(StudentAuthContext);

export const StudentAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const navigate = useNavigate();

  const loadProfile = async (authUser) => {
    if (!authUser?.email) {
      console.warn('No email — cannot load profile');
      return null;
    }

    try {
      console.log('Fetching profile for:', authUser.email);

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('email', authUser.email.toLowerCase().trim())
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Profile fetch error:', error.message);
        return null;
      }

      if (!data) {
        console.warn('No active student found for email:', authUser.email);
        return null;
      }

      console.log('✅ Profile loaded successfully:', data.full_name);

      // Update last_login
      supabase
        .from('students')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);

      return {
        id: data.id,
        authId: authUser.id,
        studentId: data.student_id,
        email: data.email,
        name: data.full_name,
        phone: data.phone || '',
        dateOfBirth: data.date_of_birth || '',
        program: data.program || '',
        yearOfStudy: data.year_of_study || 1,
        semester: data.semester || 1,
        intake: data.intake || '',
        academicYear: data.academic_year || '',
        programCode: data.program_code || '',
        department: data.department || '',
        departmentCode: data.department_code || '',
        programDurationYears: data.program_duration_years,
        programTotalSemesters: data.program_total_semesters,
        status: data.status,
        createdAt: data.created_at,
        lastLogin: new Date().toISOString(),
      };
    } catch (err) {
      console.error('Unexpected profile error:', err);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const processSession = async (session) => {
      if (!isMounted) return;

      if (session?.user) {
        setAuthUser(session.user);
        const profile = await loadProfile(session.user);
        if (isMounted) {
          setUser(profile);
        }
      } else {
        setAuthUser(null);
        setUser(null);
      }

      // Final: stop loading
      if (isMounted) {
        setLoading(false);
      }
    };

    // Start with current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      processSession(session);
    });

    // Listen to changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      processSession(session);
    });

    // Safety net: if stuck >8 seconds, force stop loading
    timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout — forcing complete');
        setLoading(false);
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      listener?.subscription?.unsubscribe();
    };
  }, [navigate]);

  const signIn = async (email, password) => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    setAuthLoading(true);
    try {
      await supabase.auth.signOut();
      return { success: true };
    } catch (err) {
      return { success: false };
    } finally {
      setAuthLoading(false);
    }
  };

  // ADD THIS FUNCTION - Password Change Functionality
  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    setAuthLoading(true);
    
    try {
      // 1. Validate inputs
      if (!currentPassword || !newPassword || !confirmPassword) {
        return { 
          success: false, 
          message: 'All password fields are required' 
        };
      }

      if (newPassword.length < 6) {
        return { 
          success: false, 
          message: 'New password must be at least 6 characters long' 
        };
      }

      if (newPassword !== confirmPassword) {
        return { 
          success: false, 
          message: 'New passwords do not match' 
        };
      }

      if (currentPassword === newPassword) {
        return { 
          success: false, 
          message: 'New password must be different from current password' 
        };
      }

      // 2. Verify current password by re-authenticating
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: authUser?.email || user?.email,
        password: currentPassword
      });
      
      if (authError) {
        console.error('Current password verification failed:', authError);
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      }
      
      // 3. Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        console.error('Password update failed:', updateError);
        return {
          success: false,
          message: updateError.message || 'Failed to update password'
        };
      }
      
      // 4. Show success message
      return {
        success: true,
        message: 'Password changed successfully!'
      };
      
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: error.message || 'An unexpected error occurred'
      };
    } finally {
      setAuthLoading(false);
    }
  };

  const value = {
    user,
    authUser,
    loading,
    authLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    changePassword, // ADD THIS LINE
    getCurrentUser: () => user,
  };

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
};