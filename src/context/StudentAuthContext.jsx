// src/context/StudentAuthContext.jsx - WITH RATE LIMITING & CACHE
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { dataCache } from '../utils/dataCache';

const StudentAuthContext = createContext({});

export const useStudentAuth = () => useContext(StudentAuthContext);

// Profile cache with TTL
const profileCache = new Map();
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Debounce helper
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const StudentAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const navigate = useNavigate();
  
  // Refs for rate limiting
  const lastProfileFetch = useRef(0);
  const pendingProfileFetch = useRef(null);
  const fetchAttempts = useRef(0);
  const isRefreshing = useRef(false);
  const lastRefreshTime = useRef(0);

  const loadProfile = async (authUser, forceRefresh = false) => {
    if (!authUser?.email) {
      console.warn('No email — cannot load profile');
      return null;
    }

    const email = authUser.email.toLowerCase().trim();
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = profileCache.get(email);
      if (cached && (Date.now() - cached.timestamp < PROFILE_CACHE_TTL)) {
        console.log('📦 Using cached profile for:', email);
        return cached.data;
      }
    }

    // Rate limiting: minimum 3 seconds between profile fetches
    const now = Date.now();
    const timeSinceLastFetch = now - lastProfileFetch.current;
    if (timeSinceLastFetch < 3000) {
      console.log('⏳ Rate limited, waiting...');
      await new Promise(resolve => setTimeout(resolve, 3000 - timeSinceLastFetch));
    }

    // Prevent concurrent fetches for same email
    if (pendingProfileFetch.current) {
      console.log('🔄 Profile fetch already in progress, waiting...');
      return pendingProfileFetch.current;
    }

    const fetchPromise = (async () => {
      try {
        lastProfileFetch.current = Date.now();
        console.log('📡 Fetching profile for:', email);

        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('email', email)
          .eq('status', 'active')
          .single();

        if (error) {
          console.error('Profile fetch error:', error.message);
          // Don't cache errors
          return null;
        }

        if (!data) {
          console.warn('No active student found for email:', email);
          return null;
        }

        console.log('✅ Profile loaded successfully:', data.full_name);

        // Update last_login (non-blocking)
        supabase
          .from('students')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.id)
          .then(() => {})
          .catch(() => {});

        const profileData = {
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

        // Cache the profile
        profileCache.set(email, {
          data: profileData,
          timestamp: Date.now()
        });

        return profileData;
      } catch (err) {
        console.error('Unexpected profile error:', err);
        return null;
      } finally {
        pendingProfileFetch.current = null;
      }
    })();

    pendingProfileFetch.current = fetchPromise;
    return fetchPromise;
  };

  const processSession = async (session) => {
    if (session?.user) {
      setAuthUser(session.user);
      
      // Load profile with caching
      const profile = await loadProfile(session.user);
      setUser(profile);
    } else {
      setAuthUser(null);
      setUser(null);
      // Clear only data cache, not chat history
      dataCache.clear();
      // Clear profile cache on logout
      profileCache.clear();
    }
    setLoading(false);
  };

  // Debounced session processor to prevent rapid fire
  const debouncedProcessSession = useRef(
    debounce(async (session) => {
      await processSession(session);
    }, 500)
  ).current;

  useEffect(() => {
    let isMounted = true;
    let timeoutId;
    let refreshTimeoutId;
    let authListener = null;

    // Handle token refresh with rate limiting
    const handleTokenRefresh = async () => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTime.current;

      // Prevent multiple refreshes within 30 seconds
      if (timeSinceLastRefresh < 30000) {
        console.log('⏳ Token refresh cooldown active');
        return;
      }

      // Prevent concurrent refreshes
      if (isRefreshing.current) {
        console.log('🔄 Refresh already in progress');
        return;
      }

      try {
        isRefreshing.current = true;
        lastRefreshTime.current = now;

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (error.status === 429) {
            // Exponential backoff for rate limiting
            const backoffDelay = Math.min(Math.pow(2, fetchAttempts.current) * 1000, 60000);
            console.log(`⏳ Rate limited, backing off ${backoffDelay}ms`);
            
            refreshTimeoutId = setTimeout(() => {
              fetchAttempts.current = 0;
              handleTokenRefresh();
            }, backoffDelay);
            return;
          }
          throw error;
        }

        // Reset attempts on success
        fetchAttempts.current = 0;
        
        if (session?.user && isMounted) {
          // Refresh profile if needed (with cache check)
          const cachedProfile = profileCache.get(session.user.email.toLowerCase().trim());
          if (!cachedProfile || Date.now() - cachedProfile.timestamp > PROFILE_CACHE_TTL) {
            const profile = await loadProfile(session.user, true);
            if (isMounted) {
              setUser(profile);
            }
          }
        }
      } catch (error) {
        console.error('Token refresh error:', error);
        if (error.message?.includes('refresh_token_not_found') || 
            error.message?.includes('invalid refresh token')) {
          // Force logout on invalid refresh token
          if (isMounted) {
            await supabase.auth.signOut();
            dataCache.clear();
            profileCache.clear();
            setUser(null);
            setAuthUser(null);
            navigate('/login');
          }
        }
      } finally {
        isRefreshing.current = false;
      }
    };

    // Initialize session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await processSession(session);
      } catch (error) {
        console.error('Init auth error:', error);
        setLoading(false);
      }
    };

    initAuth();

    // Set up auth listener with debouncing
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      
      if (event === 'SIGNED_OUT') {
        dataCache.clear();
        profileCache.clear();
        setUser(null);
        setAuthUser(null);
        setLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        // Debounce token refresh to prevent multiple calls
        if (refreshTimeoutId) {
          clearTimeout(refreshTimeoutId);
        }
        refreshTimeoutId = setTimeout(() => {
          handleTokenRefresh();
        }, 1000);
        return;
      }

      // For other events, debounce the session processing
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        debouncedProcessSession(session);
      }
    });

    // Safety timeout
    timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout — forcing complete');
        setLoading(false);
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (refreshTimeoutId) clearTimeout(refreshTimeoutId);
      subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email, password) => {
    setAuthLoading(true);
    try {
      // Clear caches before new login
      dataCache.clear();
      profileCache.clear();
      
      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Sign in error:', err);
      return { success: false, error: err.message };
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    setAuthLoading(true);
    try {
      await supabase.auth.signOut();
      
      // Clear caches
      dataCache.clear();
      profileCache.clear();
      
      // Reset refs
      fetchAttempts.current = 0;
      lastRefreshTime.current = 0;
      isRefreshing.current = false;
      
      console.log('✅ All caches cleared, session ended');
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false };
    } finally {
      setAuthLoading(false);
    }
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    setAuthLoading(true);
    
    try {
      // Validate inputs
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

      // Verify current password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: authUser?.email || user?.email,
        password: currentPassword
      });
      
      if (authError) {
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      }
      
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        return {
          success: false,
          message: updateError.message || 'Failed to update password'
        };
      }
      
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
    changePassword,
    getCurrentUser: () => user,
    refreshProfile: async () => {
      if (authUser) {
        return await loadProfile(authUser, true);
      }
      return null;
    }
  };

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
};