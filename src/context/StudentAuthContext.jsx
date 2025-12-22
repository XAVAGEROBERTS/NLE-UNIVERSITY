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
    // Fetch student profile
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('email', authUser.email.toLowerCase().trim())
      .eq('status', 'active')
      .single();

    if (error || !student) {
      console.warn('No active student found');
      return null;
    }

    // === SINGLE DEVICE VALIDATION ===
    const storedToken = localStorage.getItem('active_device_token');
    const dbToken = student.active_device_token;

    // If there's a token in DB but it doesn't match the one in localStorage → old session
    if (dbToken && storedToken && dbToken !== storedToken) {
      console.warn('Session invalid: logged in from another device');
      await supabase.auth.signOut();
      localStorage.removeItem('active_device_token');
      // Optional: show message on login page later
      return null;
    }
    // === END VALIDATION ===

    console.log('✅ Profile loaded successfully:', student.full_name);

    // Update last_login as before
    supabase
      .from('students')
      .update({ last_login: new Date().toISOString() })
      .eq('id', student.id);

    return {
      id: student.id,
      authId: authUser.id,
      studentId: student.student_id,
      email: student.email,
      name: student.full_name,
      phone: student.phone || '',
      dateOfBirth: student.date_of_birth || '',
      program: student.program || '',
      yearOfStudy: student.year_of_study || 1,
      semester: student.semester || 1,
      intake: student.intake || '',
      academicYear: student.academic_year || '',
      programCode: student.program_code || '',
      department: student.department || '',
      departmentCode: student.department_code || '',
      programDurationYears: student.program_duration_years,
      programTotalSemesters: student.program_total_semesters,
      status: student.status,
      createdAt: student.created_at,
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
    const { data: { session }, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) throw error;

    // === SINGLE DEVICE LOGIC START ===
    // Generate a unique token for this device/session
    const deviceToken = crypto.randomUUID();

    // Save this token in localStorage (so we can check it later)
    localStorage.setItem('active_device_token', deviceToken);

    // Update the student's row: overwrite any previous token
    const { error: updateError } = await supabase
      .from('students')
      .update({
        active_device_token: deviceToken,
        last_active_at: new Date().toISOString(), // optional: track last activity
      })
      .eq('email', email.toLowerCase().trim());

    if (updateError) {
      console.warn('Could not update device token (non-critical):', updateError.message);
      // Don't block login — just means single-device won't be fully enforced
    }
    // === SINGLE DEVICE LOGIC END ===

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