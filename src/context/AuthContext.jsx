// src/context/AuthContext.jsx - UPDATED
import React, { createContext, useContext, useState, useEffect } from 'react';

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Start as true
  const [isInitialized, setIsInitialized] = useState(false);

  // Load user from localStorage on app start
  useEffect(() => {
    const savedUser = localStorage.getItem('lms_user');
    
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('lms_user');
      }
    }
    
    // Mark initialization as complete after a small delay
    const timer = setTimeout(() => {
      setLoading(false);
      setIsInitialized(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Simple login
  const login = (email, password) => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockUser = {
        id: '123',
        email: email,
        name: 'Robert Mayhem',
        role: 'student',
        avatar: '/images/ROBERT PROFILE.jpg',
        program: 'Computer Engineering',
        semester: 4,
        studentId: 'NLE-BSCE-2403-0763-DAY',
      };
      
      setUser(mockUser);
      localStorage.setItem('lms_user', JSON.stringify(mockUser));
      setLoading(false);
    }, 500);
  };

  // Simple logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem('lms_user');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isInitialized // Add this
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};