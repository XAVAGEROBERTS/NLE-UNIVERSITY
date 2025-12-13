// src/context/AdminAuthContext.jsx - Updated signOut function
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AdminAuthContext = createContext({});

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Check if it's an admin by email (temporary)
          const isAdmin = session.user.email === 'admin@university.edu';
          
          if (isAdmin) {
            setAdmin(session.user);
            setProfile({
              full_name: 'Admin User',
              role: 'admin'
            });
          } else {
            // Not an admin, clear session
            await supabase.auth.signOut();
          }
        }
      } catch (error) {
        console.error('Admin session check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Check if it's an admin by email (temporary)
          const isAdmin = session.user.email === 'admin@university.edu';
          
          if (isAdmin) {
            setAdmin(session.user);
            setProfile({
              full_name: 'Admin User',
              role: 'admin'
            });
          } else {
            setAdmin(null);
            setProfile(null);
          }
        } else {
          setAdmin(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      
      if (error) throw error;
      
      // Check if admin by email (temporary)
      if (email === 'admin@university.edu') {
        setAdmin(data.user);
        setProfile({
          full_name: 'Admin User',
          role: 'admin'
        });
        
        return { 
          success: true, 
          admin: data.user,
          profile: { full_name: 'Admin User', role: 'admin' }
        };
      } else {
        await supabase.auth.signOut();
        return { 
          success: false, 
          error: 'Access denied. Admin account required.' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Updated signOut function
  const signOut = async () => {
    try {
      console.log('Admin signOut called');
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase signOut error:', error);
        throw error;
      }
      
      console.log('Supabase signOut successful');
      
      // Clear local state
      setAdmin(null);
      setProfile(null);
      
      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();
      
      console.log('Admin signOut completed successfully');
      return { success: true };
      
    } catch (error) {
      console.error('Admin signOut error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    admin,
    profile,
    loading,
    isAuthenticated: !!admin,
    signIn,
    signOut,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};