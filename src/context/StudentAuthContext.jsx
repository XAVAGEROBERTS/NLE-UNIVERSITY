// src/context/StudentAuthContext.jsx - 100% FIXED: NO MORE STUCK LOADING
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

const StudentAuthContext = createContext({});

export const useStudentAuth = () => useContext(StudentAuthContext);

export const StudentAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true); // This controls the spinner
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
        .single(); // Use .single() — we'll handle error properly

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

  const value = {
    user,
    authUser,
    loading,
    authLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    getCurrentUser: () => user,
  };

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
};