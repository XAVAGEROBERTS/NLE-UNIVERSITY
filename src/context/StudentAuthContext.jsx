// src/context/StudentAuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

const StudentAuthContext = createContext({});

export const useStudentAuth = () => useContext(StudentAuthContext);

export const StudentAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const navigate = useNavigate();

  // Initialize auth and listen for state changes
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔍 Initializing student authentication...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session) {
          console.log('✅ Active session found for:', session.user.email);
          setUser({ tempSession: session }); // Placeholder to trigger data load
        } else {
          console.log('ℹ️ No active session found');
          setUser(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setUser(null);
      } finally {
        setLoading(false); // Ensure loading ends even on error
      }
    };

    initializeAuth();

    // Listen for auth state changes (must be synchronous)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth state changed:', event);

      if (session) {
        setUser({ tempSession: session }); // Trigger student data load in separate effect
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Separate effect to load student data when session is available
  useEffect(() => {
    if (user?.tempSession) {
      loadStudentData(user.tempSession.user.email);
    }
  }, [user?.tempSession]);

  // Load student data
  const loadStudentData = async (email) => {
    try {
      console.log('📋 Loading student data for:', email);

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (studentError) {
        console.error('Error fetching student data:', studentError);
        await supabase.auth.signOut();
        setUser(null);
        return;
      }

      if (!student) {
        console.error('❌ Student record not found for:', email);
        await supabase.auth.signOut();
        setUser(null);
        return;
      }

      // Create user object
      const userData = {
        id: student.id,
        email: student.email,
        name: student.full_name,
        studentId: student.student_id,
        program: student.program,
        yearOfStudy: student.year_of_study,
        semester: student.semester,
        phone: student.phone || '',
        status: student.status || 'active',
        createdAt: student.created_at,
        lastLogin: new Date().toISOString(),
      };

      console.log('✅ Student data loaded:', userData);
      setUser(userData);

      // Update last login time
      await supabase
        .from('students')
        .update({ last_login: new Date().toISOString() })
        .eq('id', student.id);
    } catch (error) {
      console.error('Error loading student data:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // SIGN IN
  const signIn = async (email, password) => {
    console.log('🔐 Attempting sign in for:', email);
    setAuthLoading(true);

    try {
      // Try direct authentication first
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (!authError) {
        console.log('✅ Auth successful, checking student record...');
        await loadStudentData(email.toLowerCase().trim());
        return { success: true, message: 'Login successful!' };
      }

      console.error('Auth failed:', authError.message);

      // Check if student exists
      const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (!student) {
        return { success: false, error: 'Student not found. Please check your email.' };
      }

      // Create auth user if student exists but no auth record
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            full_name: student.full_name,
            student_id: student.student_id,
            role: 'student',
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          return { success: false, error: 'Incorrect password. Please try again.' };
        }
        return { success: false, error: 'Account setup failed. Please contact support.' };
      }

      // Auto-login after sign up
      const { error: retryError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (retryError) {
        return { success: false, error: 'Account created. Please try logging in again.' };
      }

      await loadStudentData(email.toLowerCase().trim());
      return { success: true, message: 'Login successful!' };
    } catch (error) {
      console.error('Unexpected login error:', error);
      return { success: false, error: 'An unexpected error occurred.' };
    } finally {
      setAuthLoading(false);
    }
  };

  // SIGN OUT
  const signOut = async () => {
    console.log('🚪 Signing out...');
    setAuthLoading(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      navigate('/login', { replace: true });
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    } finally {
      setAuthLoading(false);
    }
  };

  // CHANGE PASSWORD
  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    if (!user?.email) throw new Error('Please login first');

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new Error('All password fields are required');
    }
    if (newPassword.length < 6) throw new Error('New password must be at least 6 characters');
    if (newPassword !== confirmPassword) throw new Error('New passwords do not match');
    if (currentPassword === newPassword) throw new Error('New password must be different');

    try {
      // Verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (verifyError) throw new Error('Current password is incorrect');

      // Update auth password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw new Error(`Failed to update password: ${updateError.message}`);

      // Update students table (optional)
      await supabase
        .from('students')
        .update({
          password_hash: newPassword,
          updated_at: new Date().toISOString(),
        })
        .eq('email', user.email);

      return { success: true, message: 'Password changed successfully!' };
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  };

  // RESET PASSWORD
  const resetPassword = async (email) => {
    try {
      const { data: student } = await supabase
        .from('students')
        .select('email')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (!student) throw new Error('No student found with this email');

      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;

      return { success: true, message: 'Password reset email sent.' };
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    authLoading,
    isAuthenticated: !!user && !user.tempSession,
    signIn,
    signOut,
    changePassword,
    resetPassword,
  };

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
};