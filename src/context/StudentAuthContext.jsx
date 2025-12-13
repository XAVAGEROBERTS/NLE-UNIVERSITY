// src/context/StudentAuthContext.jsx - FIXED VERSION
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

const StudentAuthContext = createContext();

export const useStudentAuth = () => {
  const context = useContext(StudentAuthContext);
  if (!context) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
};

export const StudentAuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    console.log('StudentAuth: Initializing from localStorage...');
    
    const initAuth = () => {
      try {
        const storedUser = localStorage.getItem('student_user');
        const storedAuth = localStorage.getItem('student_auth');
        
        console.log('StudentAuth: Stored data found?', { 
          user: !!storedUser, 
          auth: !!storedAuth 
        });
        
        if (storedUser && storedAuth) {
          const userData = JSON.parse(storedUser);
          const authData = JSON.parse(storedAuth);
          
          // Check if auth is still valid
          const now = Date.now();
          if (!authData.expires_at || authData.expires_at > now) {
            console.log('StudentAuth: Setting user from localStorage');
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            console.log('StudentAuth: Session expired, clearing localStorage');
            localStorage.removeItem('student_user');
            localStorage.removeItem('student_auth');
          }
        } else {
          console.log('StudentAuth: No stored auth found');
        }
      } catch (error) {
        console.error('StudentAuth: Error initializing:', error);
        // Clear corrupted data
        localStorage.removeItem('student_user');
        localStorage.removeItem('student_auth');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Check Supabase session
  useEffect(() => {
    const checkSupabaseSession = async () => {
      try {
        console.log('StudentAuth: Checking Supabase session...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('StudentAuth: Supabase session found for:', session.user.email);
          const userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Student',
            avatar: '/images/ROBERT PROFILE.jpg'
          };
          
          // Update localStorage
          localStorage.setItem('student_user', JSON.stringify(userData));
          localStorage.setItem('student_auth', JSON.stringify({
            expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000),
            last_updated: Date.now()
          }));
          
          // Update state if not already set
          if (!user) {
            setUser(userData);
            setIsAuthenticated(true);
          }
        } else {
          console.log('StudentAuth: No active Supabase session');
        }
      } catch (error) {
        console.error('StudentAuth: Supabase check error:', error);
      }
    };

    if (!loading) {
      checkSupabaseSession();
    }
  }, [loading, user]);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('StudentAuth: Auth state changed:', event);
        
        if (session?.user) {
          console.log('StudentAuth: User authenticated:', session.user.email);
          const userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Student',
            avatar: '/images/ROBERT PROFILE.jpg'
          };
          
          // Save to localStorage
          localStorage.setItem('student_user', JSON.stringify(userData));
          localStorage.setItem('student_auth', JSON.stringify({
            expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000),
            last_updated: Date.now()
          }));
          
          setUser(userData);
          setIsAuthenticated(true);
        } else if (event === 'SIGNED_OUT') {
          console.log('StudentAuth: SIGNED_OUT event received');
          setIsAuthenticated(false);
          setUser(null);
        } else if (event === 'USER_UPDATED') {
          console.log('StudentAuth: User updated');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // FIXED: Sign in function - REMOVED setLoading calls
  const signIn = useCallback(async (email, password) => {
    try {
      console.log('StudentAuth: Attempting sign in with email:', email);
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { 
          success: false, 
          error: 'Please enter a valid email address' 
        };
      }

      // Trim and lowercase email for consistency
      const cleanEmail = email.trim().toLowerCase();
      
      console.log('StudentAuth: Calling Supabase signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      console.log('StudentAuth: Supabase response:', { 
        hasData: !!data, 
        hasError: !!error,
        userEmail: data?.user?.email 
      });

      if (error) {
        console.error('StudentAuth: Supabase error:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        
        // Handle specific error cases
        if (error.message.includes('Invalid login credentials') || 
            error.message.includes('Invalid email or password')) {
          return { 
            success: false, 
            error: 'Incorrect email or password. Please try again.' 
          };
        }
        
        if (error.message.includes('Email not confirmed')) {
          return { 
            success: false, 
            error: 'Please verify your email address before logging in.' 
          };
        }
        
        if (error.message.includes('User not found')) {
          return { 
            success: false, 
            error: 'No account found with this email address.' 
          };
        }
        
        return { 
          success: false, 
          error: 'Login failed. Please try again.' 
        };
      }

      if (data?.user) {
        console.log('StudentAuth: Login successful for user:', data.user.email);
        
        const userData = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Student',
          avatar: '/images/ROBERT PROFILE.jpg'
        };
        
        // Save to localStorage
        localStorage.setItem('student_user', JSON.stringify(userData));
        localStorage.setItem('student_auth', JSON.stringify({
          expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000),
          last_updated: Date.now()
        }));
        
        // Update state
        setUser(userData);
        setIsAuthenticated(true);
        
        return { 
          success: true, 
          user: userData,
          message: 'Login successful!' 
        };
      }
      
      console.warn('StudentAuth: No user data returned from Supabase');
      return { 
        success: false, 
        error: 'Login failed. No user data received.' 
      };
      
    } catch (error) {
      console.error('StudentAuth: Unexpected error during sign in:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      };
    }
  }, []);

  // FIXED: Sign out function - REMOVED setLoading calls
  const signOut = useCallback(async () => {
    try {
      console.log('StudentAuth: Signing out...');
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('StudentAuth: Supabase sign out error:', error);
      }
      
      // Clear local state
      setIsAuthenticated(false);
      setUser(null);
      
      // Clear all auth-related localStorage
      localStorage.removeItem('student_user');
      localStorage.removeItem('student_auth');
      localStorage.removeItem('student_credentials');
      localStorage.removeItem('student_remember_me');
      
      console.log('StudentAuth: Sign out completed');
      return { success: true };
      
    } catch (error) {
      console.error('StudentAuth: Error during sign out:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Update user profile
  const updateUser = useCallback((updates) => {
    setUser(prev => {
      if (!prev) return prev;
      
      const updatedUser = { ...prev, ...updates };
      
      // Update localStorage
      localStorage.setItem('student_user', JSON.stringify(updatedUser));
      
      return updatedUser;
    });
  }, []);

  // Get current session
  const getSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('StudentAuth: Error getting session:', error);
      return null;
    }
  }, []);

  // Refresh session if needed
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('StudentAuth: Error refreshing session:', error);
        return { success: false, error };
      }
      
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Student',
          avatar: '/images/ROBERT PROFILE.jpg'
        };
        
        localStorage.setItem('student_user', JSON.stringify(userData));
        localStorage.setItem('student_auth', JSON.stringify({
          expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000),
          last_updated: Date.now()
        }));
        
        setUser(userData);
        setIsAuthenticated(true);
        
        return { success: true, session };
      }
      
      return { success: false, error: 'No session after refresh' };
    } catch (error) {
      console.error('StudentAuth: Exception refreshing session:', error);
      return { success: false, error };
    }
  }, []);

  const value = {
    isAuthenticated,
    user,
    loading,
    signIn,
    signOut,
    updateUser,
    getSession,
    refreshSession
  };

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
};