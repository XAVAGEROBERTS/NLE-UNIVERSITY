// src/components/layout/StudentLayout.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { supabase } from '../../services/supabase';

const StudentLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, loading: authLoading } = useStudentAuth();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'New Assignment Posted',
      message: 'Machine Learning Lab assignment is now available',
      time: '2 hours ago',
      read: false,
      type: 'assignment'
    },
    {
      id: 2,
      title: 'Lecture Reminder',
      message: 'Internet of Things lecture starts in 30 minutes',
      time: '1 day ago',
      read: false,
      type: 'lecture'
    },
    {
      id: 3,
      title: 'Payment Due',
      message: 'Semester fees payment deadline is approaching',
      time: '2 days ago',
      read: true,
      type: 'finance'
    }
  ]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutProgress, setLogoutProgress] = useState(0);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const notificationRef = useRef(null);
  const bellIconRef = useRef(null);
  const logoutModalRef = useRef(null);
  const logoutProgressRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: 'fas fa-home', path: '/dashboard' },
    { id: 'courses', label: 'Course Units', icon: 'fas fa-book', path: '/courses' },
    { id: 'lectures', label: 'Lectures', icon: 'fas fa-video', path: '/lectures' },
    { id: 'timetable', label: 'My Time Table', icon: 'fas fa-calendar-alt', path: '/timetable' },
    { id: 'coursework', label: 'Course Work', icon: 'fas fa-tasks', path: '/coursework' },
    { id: 'examinations', label: 'Examination', icon: 'fas fa-clipboard-list', path: '/examinations' },
    { id: 'results', label: 'Examination Results', icon: 'fas fa-chart-bar', path: '/results' },
    { id: 'finance', label: 'Financial Statements', icon: 'fas fa-money-bill-wave', path: '/finance' },
    { id: 'tutorials', label: 'Tutorials', icon: 'fas fa-chalkboard-teacher', path: '/tutorials' },
    { id: 'chatbot', label: 'Student Assistant', icon: 'fas fa-robot', path: '/chatbot' },
    { id: 'settings', label: 'Settings', icon: 'fas fa-cog', path: '/settings' },
  ];

  // Check mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
        setMobileMenuOpen(false);
      } else {
        setMobileMenuOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch detailed student data
  const fetchStudentData = useCallback(async () => {
    try {
      if (!user?.email) {
        console.log('No user email found');
        setIsLoadingUser(false);
        return;
      }

      console.log('📊 Fetching detailed student data for:', user.email);
      
      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error) {
        console.error('Error fetching student data:', error);
        // Use auth user data as fallback
        if (user) {
          setStudentData({
            full_name: user.name || 'Student',
            student_id: user.studentId || 'N/A',
            program: user.program || 'Unknown Program',
            year_of_study: user.yearOfStudy || 1,
            semester: user.semester || 1,
            phone: user.phone || '',
            email: user.email || ''
          });
        }
        return;
      }

      if (student) {
        console.log('✅ Student data loaded from database:', student.full_name);
        setStudentData(student);
      }
    } catch (error) {
      console.error('Error in fetchStudentData:', error);
    } finally {
      setIsLoadingUser(false);
    }
  }, [user]);

  // Initialize user data
  useEffect(() => {
    if (!authLoading && user) {
      setIsLoadingUser(true);
      fetchStudentData();
    } else if (!authLoading && !user) {
      setIsLoadingUser(false);
      // Check if we're already on login page
      if (location.pathname !== '/login' && !location.pathname.includes('/auth')) {
        console.log('🚫 No user found, redirecting to login');
        navigate('/login', { replace: true });
      }
    }
  }, [user, authLoading, fetchStudentData, navigate, location]);

  // Update unread count
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && 
          notificationRef.current && 
          !notificationRef.current.contains(event.target) &&
          bellIconRef.current && 
          !bellIconRef.current.contains(event.target)) {
        setShowNotifications(false);
      }

      if (showLogoutModal && 
          logoutModalRef.current && 
          !logoutModalRef.current.contains(event.target)) {
        if (!isLoggingOut) {
          setShowLogoutModal(false);
        }
      }

      if (mobileMenuOpen && 
          mobileMenuRef.current && 
          !mobileMenuRef.current.contains(event.target) &&
          !event.target.closest('.mobile-menu-toggle')) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, showLogoutModal, isLoggingOut, mobileMenuOpen]);

  // Animate logout progress
  useEffect(() => {
    if (isLoggingOut && logoutProgressRef.current) {
      const interval = setInterval(() => {
        setLogoutProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isLoggingOut]);

  // Close mobile menu on route change
  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [location.pathname]);

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // FIXED LOGOUT FUNCTION
  const confirmLogout = async () => {
    console.log('Starting logout process');
    setIsLoggingOut(true);
    setLogoutProgress(0);
    
    try {
      // Start progress animation
      const progressInterval = setInterval(() => {
        setLogoutProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      // Call signOut from context
      const result = await signOut();
      
      clearInterval(progressInterval);
      setLogoutProgress(100);
      
      console.log('Logout result:', result);
      
      // Wait for animation to complete
      setTimeout(() => {
        setIsLoggingOut(false);
        setShowLogoutModal(false);
      }, 500);
      
    } catch (error) {
      console.error('Logout error:', error);
      setLogoutProgress(100);
      
      // Fallback redirect
      setTimeout(() => {
        setIsLoggingOut(false);
        setShowLogoutModal(false);
        localStorage.removeItem('student_user');
        window.location.href = '/login';
      }, 800);
    }
  };

  const cancelLogout = () => {
    if (!isLoggingOut) {
      setShowLogoutModal(false);
    }
  };

  const handleNotificationClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    setShowNotifications(!showNotifications);
  };

  const handleNotificationItemClick = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setShowNotifications(false);
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'assignment':
        return 'fas fa-file-alt';
      case 'lecture':
        return 'fas fa-video';
      case 'finance':
        return 'fas fa-money-bill-wave';
      default:
        return 'fas fa-bell';
    }
  };

  const getNotificationColor = (type) => {
    switch(type) {
      case 'assignment':
        return '#4CAF50';
      case 'lecture':
        return '#2196F3';
      case 'finance':
        return '#FF9800';
      default:
        return '#9C27B0';
    }
  };

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f7fb',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <img 
          src="/images/badge.png" 
          alt="Logo" 
          style={{
            width: '100px',
            height: '100px',
            objectFit: 'contain',
          }}
        />
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #f3f3f3',
          borderTop: '5px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#666', fontSize: '16px' }}>Loading application...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If no user and auth is done loading, don't render layout
  if (!user && !authLoading) {
    return null; // Will redirect in useEffect
  }

  return (
    <>
      {/* Logout Modal - Mobile Responsive */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          animation: 'fadeIn 0.3s ease-out',
          padding: '1rem',
        }}>
          <div 
            ref={logoutModalRef}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <div style={{
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #e9ecef',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: '#e74c3c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '24px',
                flexShrink: 0,
              }}>
                <i className="fas fa-sign-out-alt"></i>
              </div>
              <div>
                <h3 style={{
                  margin: 0,
                  color: '#2c3e50',
                  fontSize: '18px',
                  fontWeight: '600',
                }}>
                  Confirm Logout
                </h3>
                <p style={{
                  margin: '5px 0 0 0',
                  color: '#7f8c8d',
                  fontSize: '14px',
                }}>
                  Are you sure you want to logout?
                </p>
              </div>
            </div>

            <div style={{ padding: '20px' }}>
              <p style={{
                margin: 0,
                color: '#666',
                fontSize: '15px',
                lineHeight: '1.5',
              }}>
                You will be signed out of your student account and redirected to the login page.
              </p>
            </div>

            <div style={{
              padding: '15px 20px',
              borderTop: '1px solid #e9ecef',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={cancelLogout}
                disabled={isLoggingOut}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f8f9fa',
                  color: '#495057',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  flex: '1',
                  minWidth: '120px',
                  minHeight: 'auto !important',
                }}
                onMouseEnter={(e) => {
                  if (!isLoggingOut) {
                    e.currentTarget.style.backgroundColor = '#e9ecef';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoggingOut) {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                disabled={isLoggingOut}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isLoggingOut ? '#95a5a6' : '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  flex: '1',
                  minWidth: '120px',
                  minHeight: 'auto !important',
                }}
                onMouseEnter={(e) => {
                  if (!isLoggingOut) {
                    e.currentTarget.style.backgroundColor = '#c0392b';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoggingOut) {
                    e.currentTarget.style.backgroundColor = '#e74c3c';
                  }
                }}
              >
                {isLoggingOut ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}></div>
                    Logging out...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-out-alt"></i>
                    Yes, Logout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Loading Screen */}
      {isLoggingOut && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 3000,
        }}>
          <div style={{
            position: 'relative',
            width: '200px',
            height: '200px',
            marginBottom: '20px',
          }}>
            <img 
              src="/images/badge.png" 
              alt="Logo" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
          
          <p style={{
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: '#3498db',
            marginBottom: '10px',
          }}>
            Logging out...
          </p>
          
          <div style={{
            width: '200px',
            height: '4px',
            backgroundColor: '#e9ecef',
            borderRadius: '2px',
            overflow: 'hidden',
            marginTop: '20px',
          }}>
            <div 
              ref={logoutProgressRef}
              style={{
                width: `${logoutProgress}%`,
                height: '100%',
                backgroundColor: '#3498db',
                borderRadius: '2px',
                transition: 'width 0.3s ease',
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Main Layout Container */}
      <div 
        className="layout-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          opacity: isLoggingOut ? '0.5' : '1',
          pointerEvents: isLoggingOut ? 'none' : 'auto',
          transition: 'opacity 0.3s ease',
        }}
      >
        <header 
          className="layout-header"
          style={{
            height: isMobile ? '60px' : '70px',
            backgroundColor: 'white',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            padding: isMobile ? '0 1rem' : '0 2rem',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            borderBottom: '1px solid #e9ecef',
          }}
        >
          <div 
            className="header-content"
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div 
              className="header-logo"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '0.75rem' : '1rem',
              }}
            >
              {/* Mobile Menu Toggle */}
              {isMobile && (
                <button
                  className="mobile-menu-toggle"
                  onClick={toggleMobileMenu}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    color: '#4361ee',
                    cursor: 'pointer',
                    padding: '5px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 'auto !important',
                    minWidth: 'auto !important',
                    width: '40px',
                    height: '40px',
                  }}
                >
                  <i className={mobileMenuOpen ? 'fas fa-times' : 'fas fa-bars'}></i>
                </button>
              )}
              
              <div 
                className="logo"
                style={{
                  width: isMobile ? '32px' : '40px',
                  height: isMobile ? '32px' : '40px',
                  position: 'relative',
                }}
              >
                <img 
                  src="/public/badge.png" 
                  alt="Logo" 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
                <span 
                  style={{
                    position: 'absolute',
                    bottom: '-5px',
                    right: '-5px',
                    backgroundColor: '#f72585',
                    color: 'white',
                    fontSize: '0.6rem',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    display: isMobile ? 'none' : 'block',
                  }}
                >
                  ERP
                </span>
              </div>
              <div>
                <h1 
                  style={{
                    fontSize: isMobile ? '1rem' : '1.3rem',
                    fontWeight: '700',
                    margin: 0,
                    background: 'linear-gradient(90deg, #4361ee, #3f37c9)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  NLE UNIVERSITY
                </h1>
                <p 
                  style={{
                    fontSize: isMobile ? '0.65rem' : '0.75rem',
                    color: '#6c757d',
                    margin: 0,
                  }}
                >
                  Student Portal
                </p>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '1rem' : '1.5rem' 
            }}>
              <div 
                ref={bellIconRef}
                className="notification-icon"
                onClick={handleNotificationClick}
                style={{
                  position: 'relative',
                  fontSize: isMobile ? '1.1rem' : '1.2rem',
                  color: '#adb5bd',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'all 0.2s',
                  backgroundColor: showNotifications ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                  minHeight: 'auto !important',
                  minWidth: 'auto !important',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                }}
              >
                <i className="fas fa-bell"></i>
                {unreadCount > 0 && (
                  <span 
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      backgroundColor: '#f72585',
                      color: 'white',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>

              {!isMobile && (
                <div 
                  className="user-info"
                  onClick={() => navigate('/settings')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    padding: '0.5rem 0.8rem',
                    borderRadius: '30px',
                    cursor: 'pointer',
                    position: 'relative',
                    minHeight: 'auto !important',
                  }}
                >
                  {isLoadingUser && (
                    <div style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#3498db',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '10px',
                      border: '2px solid white',
                    }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}></div>
                    </div>
                  )}
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(studentData?.full_name || user?.name || 'Student')}&background=3498db&color=fff&size=128`} 
                    alt="User"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #e9ecef',
                    }}
                  />
                  <div>
                    <div 
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: '#212529',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {studentData?.full_name || user?.name || 'Loading...'}
                      {isLoadingUser && (
                        <div style={{
                          width: '12px',
                          height: '12px',
                          border: '2px solid #e9ecef',
                          borderTopColor: '#3498db',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                        }}></div>
                      )}
                    </div>
                    <div 
                      style={{
                        fontSize: '0.7rem',
                        color: '#adb5bd',
                        textTransform: 'uppercase',
                      }}
                    >
                      Student
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notifications Dropdown - Mobile Responsive */}
          {showNotifications && (
            <div 
              ref={notificationRef}
              className="notification-dropdown"
              style={{
                position: 'absolute',
                top: isMobile ? '60px' : '70px',
                right: isMobile ? '0.5rem' : '2rem',
                width: isMobile ? 'calc(100% - 1rem)' : '350px',
                maxWidth: isMobile ? '400px' : '350px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                zIndex: 1000,
                border: '1px solid #e9ecef',
                overflow: 'hidden',
                maxHeight: isMobile ? '70vh' : '400px',
              }}
            >
              <div style={{
                padding: '15px',
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8f9fa',
              }}>
                <div>
                  <h4 style={{ 
                    margin: 0, 
                    fontSize: isMobile ? '15px' : '16px', 
                    color: '#212529' 
                  }}>
                    Notifications
                  </h4>
                  <p style={{ 
                    margin: '5px 0 0 0', 
                    fontSize: isMobile ? '11px' : '12px', 
                    color: '#6c757d' 
                  }}>
                    {unreadCount} unread {unreadCount === 1 ? 'message' : 'messages'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3498db',
                        cursor: 'pointer',
                        fontSize: isMobile ? '11px' : '12px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        minHeight: 'auto !important',
                      }}
                    >
                      Mark all as read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#e74c3c',
                        cursor: 'pointer',
                        fontSize: isMobile ? '11px' : '12px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        minHeight: 'auto !important',
                      }}
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              <div style={{ 
                maxHeight: isMobile ? 'calc(70vh - 80px)' : '320px', 
                overflowY: 'auto' 
              }}>
                {notifications.length === 0 ? (
                  <div style={{
                    padding: '30px 20px',
                    textAlign: 'center',
                    color: '#6c757d',
                  }}>
                    <i className="fas fa-bell-slash" style={{ 
                      fontSize: isMobile ? '1.5rem' : '2rem', 
                      marginBottom: '10px', 
                      opacity: 0.5 
                    }}></i>
                    <p style={{ margin: 0 }}>No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationItemClick(notification.id)}
                      style={{
                        padding: isMobile ? '12px' : '15px',
                        display: 'flex',
                        borderBottom: '1px solid #f5f5f5',
                        backgroundColor: notification.read ? 'white' : '#f8f9fa',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        width: isMobile ? '32px' : '40px',
                        height: isMobile ? '32px' : '40px',
                        borderRadius: '50%',
                        backgroundColor: getNotificationColor(notification.type) + '20',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: isMobile ? '10px' : '15px',
                        flexShrink: 0,
                      }}>
                        <i 
                          className={getNotificationIcon(notification.type)} 
                          style={{ 
                            color: getNotificationColor(notification.type), 
                            fontSize: isMobile ? '16px' : '18px' 
                          }}
                        ></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start' 
                        }}>
                          <p style={{ 
                            margin: '0 0 5px 0', 
                            fontSize: isMobile ? '13px' : '14px', 
                            fontWeight: notification.read ? '400' : '600',
                            color: notification.read ? '#6c757d' : '#212529',
                          }}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: '#f72585',
                              flexShrink: 0,
                              marginLeft: '10px',
                              marginTop: '5px',
                            }}></span>
                          )}
                        </div>
                        <p style={{ 
                          margin: '0 0 5px 0', 
                          fontSize: isMobile ? '12px' : '13px', 
                          color: '#6c757d',
                          lineHeight: '1.4',
                        }}>
                          {notification.message}
                        </p>
                        <small style={{ 
                          color: '#95a5a6', 
                          fontSize: isMobile ? '10px' : '11px' 
                        }}>
                          {notification.time}
                        </small>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div style={{
                  padding: '10px 15px',
                  borderTop: '1px solid #eee',
                  textAlign: 'center',
                  backgroundColor: '#f8f9fa',
                }}>
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4361ee',
                      cursor: 'pointer',
                      fontSize: isMobile ? '11px' : '12px',
                      fontWeight: '500',
                      padding: '5px 10px',
                      minHeight: 'auto !important',
                    }}
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </header>

        <div 
          className="main-content"
          style={{
            display: 'flex',
            flex: 1,
          }}
        >
          {/* Desktop Sidebar */}
          {!isMobile && (
            <aside 
              className="sidebar"
              style={{
                width: sidebarCollapsed ? '70px' : '260px',
                backgroundColor: 'white',
                borderRight: '1px solid #e9ecef',
                padding: '1.5rem 0',
                transition: 'all 0.3s',
                position: 'sticky',
                top: isMobile ? '60px' : '70px',
                height: `calc(100vh - ${isMobile ? '60px' : '70px'})`,
                overflowY: 'auto',
                display: isMobile ? 'none' : 'block',
              }}
            >
              <button 
                className="sidebar-toggle"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '22px',
                  background: 'white',
                  border: '1px solid #dee2e6',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  zIndex: 95,
                  fontSize: '0.8rem',
                  color: '#6c757d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 'auto !important',
                  minWidth: 'auto !important',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <i className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'}`}></i>
              </button>

              <nav 
                className="sidebar-nav"
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                {menuItems.map((item) => (
                  <div 
                    key={item.id}
                    className="menu-item"
                    style={{
                      marginBottom: '0.25rem',
                    }}
                  >
                    <button
                      onClick={() => handleNavigation(item.path)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem',
                        padding: '0.7rem 1.5rem',
                        color: isActive(item.path) ? '#4361ee' : '#6c757d',
                        backgroundColor: isActive(item.path) ? 'rgba(67, 97, 238, 0.1)' : 'transparent',
                        border: 'none',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: isActive(item.path) ? '600' : '500',
                        position: 'relative',
                        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                        minHeight: 'auto !important',
                      }}
                    >
                      {isActive(item.path) && !sidebarCollapsed && (
                        <div 
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: '3px',
                            backgroundColor: '#4361ee',
                            borderRadius: '0 3px 3px 0',
                          }}
                        />
                      )}
                      <i className={item.icon} style={{ 
                        fontSize: '1rem', 
                        width: '20px' 
                      }}></i>
                      {!sidebarCollapsed && <span>{item.label}</span>}
                      {sidebarCollapsed && isActive(item.path) && (
                        <div style={{
                          position: 'absolute',
                          right: '5px',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#4361ee',
                        }}></div>
                      )}
                    </button>
                  </div>
                ))}

                <div 
                  className="menu-item"
                  style={{ marginBottom: '0.25rem' }}
                >
                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.8rem',
                      padding: '0.7rem 1.5rem',
                      color: '#f72585',
                      backgroundColor: 'transparent',
                      border: 'none',
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      minHeight: 'auto !important',
                    }}
                  >
                    <i className="fas fa-sign-out-alt" style={{ 
                      fontSize: '1rem', 
                      width: '20px' 
                    }}></i>
                    {!sidebarCollapsed && <span>Log Out</span>}
                  </button>
                </div>
              </nav>
            </aside>
          )}

          {/* Mobile Menu Overlay - Now covers half of the screen */}
          {isMobile && mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <div 
                style={{
                  position: 'fixed',
                  top: '60px',
                  left: 0,
                  width: '100%',
                  height: 'calc(100vh - 60px)',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 98,
                  animation: 'fadeIn 0.3s ease-out',
                }}
                onClick={() => setMobileMenuOpen(false)}
              />
              
              {/* Mobile Menu Sidebar */}
              <div 
                ref={mobileMenuRef}
                style={{
                  position: 'fixed',
                  top: '60px',
                  left: 0,
                  width: '80%',
                  maxWidth: '300px',
                  height: 'calc(100vh - 60px)',
                  backgroundColor: 'white',
                  zIndex: 99,
                  overflowY: 'auto',
                  animation: 'slideInLeft 0.3s ease-out',
                  boxShadow: '2px 0 10px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.5rem 1rem',
                  backgroundColor: '#f8f9fa',
                  borderBottom: '1px solid #e9ecef',
                }}>
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(studentData?.full_name || user?.name || 'Student')}&background=3498db&color=fff&size=128`} 
                    alt="User"
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #e9ecef',
                    }}
                  />
                  <div>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#212529',
                      marginBottom: '4px',
                    }}>
                      {studentData?.full_name || user?.name || 'Loading...'}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#adb5bd',
                      textTransform: 'uppercase',
                    }}>
                      Student
                    </div>
                  </div>
                </div>

                <nav style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  padding: '1rem 0',
                  flex: 1,
                }}>
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.path)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.9rem 1rem',
                        color: isActive(item.path) ? '#4361ee' : '#6c757d',
                        backgroundColor: isActive(item.path) ? 'rgba(67, 97, 238, 0.1)' : 'transparent',
                        border: 'none',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: isActive(item.path) ? '600' : '500',
                        borderLeft: isActive(item.path) ? '3px solid #4361ee' : '3px solid transparent',
                        minHeight: 'auto !important',
                      }}
                    >
                      <i className={item.icon} style={{ 
                        fontSize: '1rem', 
                        width: '24px',
                        textAlign: 'center',
                      }}></i>
                      <span>{item.label}</span>
                      {isActive(item.path) && (
                        <i className="fas fa-circle" style={{
                          fontSize: '8px',
                          color: '#4361ee',
                          marginLeft: 'auto',
                          marginRight: '10px',
                        }}></i>
                      )}
                    </button>
                  ))}

                  <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
                    <button
                      onClick={handleLogout}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.9rem 1rem',
                        color: '#f72585',
                        backgroundColor: 'transparent',
                        border: 'none',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        marginTop: '0.5rem',
                        borderLeft: '3px solid transparent',
                        minHeight: 'auto !important',
                      }}
                    >
                      <i className="fas fa-sign-out-alt" style={{ 
                        fontSize: '1rem', 
                        width: '24px',
                        textAlign: 'center',
                      }}></i>
                      <span>Log Out</span>
                    </button>
                  </div>
                </nav>
              </div>
            </>
          )}

          {/* Main Content Area */}
          <main 
            className="content-area"
            style={{
              flex: 1,
              padding: isMobile ? '1rem' : '2rem',
              backgroundColor: '#f5f7fb',
              overflowY: 'auto',
              minHeight: `calc(100vh - ${isMobile ? '60px' : '70px'})`,
              transition: 'filter 0.3s ease',
              filter: isMobile && mobileMenuOpen ? 'brightness(0.95)' : 'none',
            }}
          >
            <Outlet />
          </main>
        </div>

        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', sans-serif;
          }
          
          button {
            font-family: inherit;
            transition: all 0.2s;
          }
          
          button:hover {
            opacity: 0.9;
          }
          
          .menu-item button:hover {
            background-color: #f1f3f5 !important;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
          
          /* PROTECTED ELEMENTS - Override Chatbot CSS */
          .sidebar-toggle,
          .mobile-menu-toggle,
          .notification-icon,
          .menu-item button,
          .notification-dropdown button,
          .logout-modal button {
            min-height: auto !important;
            min-width: auto !important;
          }
          
          /* Desktop */
          @media (min-width: 1024px) {
            .mobile-menu-toggle {
              display: none !important;
            }
          }
          
          /* Tablet */
          @media (max-width: 1024px) and (min-width: 768px) {
            .sidebar {
              width: 70px !important;
            }
            
            .sidebar-toggle {
              display: block !important;
            }
            
            .notification-dropdown {
              width: 300px !important;
              right: 1rem !important;
            }
            
            .header-logo h1 {
              font-size: 1.1rem !important;
            }
            
            .user-info div:first-child {
              font-size: 0.8rem !important;
            }
          }
          
          /* Mobile */
          @media (max-width: 767px) {
            .notification-dropdown {
              width: calc(100% - 1rem) !important;
              right: 0.5rem !important;
            }
            
            .header-logo h1 {
              font-size: 1rem !important;
            }
            
            .header-logo p {
              display: none !important;
            }
            
            .user-info {
              padding: 0.3rem !important;
            }
            
            .content-area {
              padding: 1rem !important;
            }
            
            /* Mobile menu takes half of the screen */
            .mobile-menu {
              width: 80% !important;
              max-width: 300px !important;
            }
          }
          
          /* Small Mobile */
          @media (max-width: 480px) {
            .layout-header {
              padding: 0 0.75rem !important;
            }
            
            .header-logo {
              gap: 0.5rem !important;
            }
            
            .header-logo h1 {
              font-size: 0.9rem !important;
            }
            
            .notification-dropdown {
              width: calc(100% - 0.5rem) !important;
              right: 0.25rem !important;
            }
            
            /* Mobile menu even smaller on very small screens */
            .mobile-menu {
              width: 85% !important;
              max-width: 280px !important;
            }
          }
          
          /* Medium Mobile */
          @media (max-width: 767px) and (min-width: 481px) {
            .mobile-menu {
              width: 75% !important;
              max-width: 320px !important;
            }
          }
          
          /* Prevent scrolling when mobile menu is open */
          body.mobile-menu-open {
            overflow: hidden;
          }
        `}</style>
      </div>
    </>
  );
};

export default StudentLayout;