// src/components/layout/StudentLayout.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useStudentAuth } from '../../context/StudentAuthContext';

const StudentLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useStudentAuth();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
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
  const [aiMessages, setAiMessages] = useState([
    { id: 1, text: 'Hello! I\'m your AI assistant. How can I help you today?', sender: 'ai', time: 'Just now' }
  ]);
  const [userInput, setUserInput] = useState('');

  const notificationRef = useRef(null);
  const bellIconRef = useRef(null);
  const logoutModalRef = useRef(null);
  const aiChatRef = useRef(null);
  const logoutProgressRef = useRef(null);

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
    { id: 'settings', label: 'Settings', icon: 'fas fa-cog', path: '/settings' },
  ];

  // EMERGENCY PERSISTENCE FIX
  useEffect(() => {
    const checkAndRestoreAuth = () => {
      const storedUser = localStorage.getItem('student_user');
      const storedAuth = localStorage.getItem('student_auth');
      
      if (storedUser && storedAuth && !user) {
        try {
          const userData = JSON.parse(storedUser);
          const authData = JSON.parse(storedAuth);
          
          const now = Date.now();
          if (!authData.expires_at || authData.expires_at > now) {
            setTimeout(() => {
              if (!user) {
                window.location.reload();
              }
            }, 1000);
          }
        } catch (error) {
          console.error('Error parsing localStorage:', error);
        }
      }
    };

    const timer = setTimeout(checkAndRestoreAuth, 500);
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

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
        setShowLogoutModal(false);
      }

      if (showAIChat && 
          aiChatRef.current && 
          !aiChatRef.current.contains(event.target)) {
        setShowAIChat(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, showLogoutModal, showAIChat]);

  // Animate logout progress
  useEffect(() => {
    if (isLoggingOut && logoutProgressRef.current) {
      const interval = setInterval(() => {
        setLogoutProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2; // Increase by 2% every interval
        });
      }, 100); // Update every 100ms

      return () => clearInterval(interval);
    }
  }, [isLoggingOut]);

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    console.log('Student logout started');
    setIsLoggingOut(true);
    setLogoutProgress(0);
    
    try {
      // Start progress animation
      const progressInterval = setInterval(() => {
        setLogoutProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressInterval);
            return 80;
          }
          return prev + 10;
        });
      }, 300);

      // Show animation for at least 2 seconds
      const animationPromise = new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Calling signOut()');
      const signOutPromise = signOut();
      
      // Wait for both animation and signout
      await Promise.all([animationPromise, signOutPromise]);
      
      clearInterval(progressInterval);
      setLogoutProgress(90);
      
      console.log('✅ Student logout complete');
      
      // Clear localStorage items (just student ones)
      localStorage.removeItem('student_user');
      localStorage.removeItem('student_auth');
      
      // Final progress
      setLogoutProgress(100);
      
      // Wait a bit more for final animation
      setTimeout(() => {
        console.log('Redirecting to /login');
        window.location.href = '/login';
      }, 800);
      
    } catch (error) {
      console.error('❌ Student logout error:', error);
      setLogoutProgress(100);
      
      // Still redirect after delay
      setTimeout(() => {
        localStorage.removeItem('student_user');
        localStorage.removeItem('student_auth');
        window.location.href = '/login';
      }, 1500);
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

  const toggleAIChat = () => {
    setShowAIChat(!showAIChat);
  };

  const handleSendMessage = () => {
    if (userInput.trim() === '') return;

    const newUserMessage = {
      id: Date.now(),
      text: userInput,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const aiResponses = [
      "I can help you with course materials, assignments, and schedule information.",
      "You have upcoming lectures in Machine Learning and Internet of Things.",
      "Your attendance for this week is 80%. Keep up the good work!",
      "There are 3 new assignments posted in your course dashboard.",
      "Would you like me to help you prepare for your upcoming exams?",
      "I can assist with finding tutorial videos and study materials.",
      "Your current GPA is 3.7. You're doing great!",
      "Need help with a specific topic? Just ask!"
    ];

    const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
    
    const newAiMessage = {
      id: Date.now() + 1,
      text: randomResponse,
      sender: 'ai',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAiMessages(prev => [...prev, newUserMessage, newAiMessage]);
    setUserInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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

  return (
    <>
      {/* Logout Modal */}
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
          pointerEvents: isLoggingOut ? 'none' : 'auto',
        }}>
          <div 
            ref={logoutModalRef}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              width: '90%',
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
            }}>
              <button
                onClick={cancelLogout}
                disabled={isLoggingOut}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isLoggingOut ? '#f8f9fa' : '#f8f9fa',
                  color: isLoggingOut ? '#adb5bd' : '#495057',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
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
                  minWidth: '120px',
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
          animation: 'fadeIn 0.5s ease-out',
        }}>
          <div style={{
            position: 'relative',
            width: '300px',
            height: '300px',
            marginBottom: '30px',
          }}>
            <img 
              src="/images/badge.png" 
              alt="Logo" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            />
            <div style={{
              position: 'absolute',
              top: '-10px',
              left: '-10px',
              right: '-10px',
              bottom: '-10px',
              border: '4px solid rgba(52, 152, 219, 0.1)',
              borderTopColor: '#3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}></div>
          </div>
          
          <p style={{
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: '#3498db',
            marginTop: '20px',
            animation: 'fadeIn 1s ease-out',
          }}>
            Logging out...
          </p>
          
          <p style={{
            color: '#7f8c8d',
            fontSize: '0.9rem',
            marginTop: '10px',
            animation: 'fadeIn 1.5s ease-out',
          }}>
            Please wait while we sign you out
          </p>
          
          {/* Progress Bar */}
          <div style={{
            marginTop: '20px',
            width: '200px',
            height: '4px',
            backgroundColor: '#e9ecef',
            borderRadius: '2px',
            overflow: 'hidden',
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
          
          <p style={{
            color: '#7f8c8d',
            fontSize: '0.8rem',
            marginTop: '8px',
          }}>
            {logoutProgress}% complete
          </p>
        </div>
      )}

      {/* AI Chat Container */}
      {showAIChat && (
        <div 
          ref={aiChatRef}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '350px',
            height: '500px',
            backgroundColor: 'white',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideInUp 0.3s ease-out',
          }}
        >
          <div style={{
            padding: '15px',
            backgroundColor: '#3498db',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-robot" style={{ fontSize: '20px' }}></i>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                AI Assistant
              </h3>
            </div>
            <button
              onClick={toggleAIChat}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '5px',
                borderRadius: '4px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div style={{
            flex: 1,
            padding: '15px',
            overflowY: 'auto',
            backgroundColor: '#f9f9f9',
          }}>
            {aiMessages.map((message) => (
              <div
                key={message.id}
                style={{
                  marginBottom: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '10px 15px',
                    borderRadius: message.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    backgroundColor: message.sender === 'user' ? '#3498db' : '#e5e5ea',
                    color: message.sender === 'user' ? 'white' : '#000',
                    fontSize: '14px',
                    lineHeight: '1.4',
                  }}
                >
                  {message.text}
                </div>
                <span style={{
                  fontSize: '11px',
                  color: '#999',
                  marginTop: '5px',
                }}>
                  {message.time}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            padding: '10px',
            borderTop: '1px solid #eee',
            backgroundColor: 'white',
          }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                style={{
                  flex: 1,
                  padding: '10px 15px',
                  border: '1px solid #ddd',
                  borderRadius: '20px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#3498db'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
              <button
                onClick={handleSendMessage}
                disabled={!userInput.trim()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3498db',
                  fontSize: '18px',
                  cursor: userInput.trim() ? 'pointer' : 'not-allowed',
                  opacity: userInput.trim() ? 1 : 0.5,
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (userInput.trim()) {
                    e.currentTarget.style.backgroundColor = '#f0f7ff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (userInput.trim()) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
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
            height: '70px',
            backgroundColor: 'white',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 2rem',
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
                gap: '1rem',
              }}
            >
              <div 
                className="logo"
                style={{
                  width: '40px',
                  height: '40px',
                  position: 'relative',
                }}
              >
                <img 
                  src="/images/badge.png" 
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
                  }}
                >
                  LMS
                </span>
              </div>
              <div>
                <h1 
                  style={{
                    fontSize: '1.3rem',
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
                    fontSize: '0.75rem',
                    color: '#6c757d',
                    margin: 0,
                  }}
                >
                  Student Portal
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div 
                ref={bellIconRef}
                className="notification-icon"
                onClick={handleNotificationClick}
                style={{
                  position: 'relative',
                  fontSize: '1.2rem',
                  color: '#adb5bd',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'all 0.2s',
                  backgroundColor: showNotifications ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'}
                onMouseLeave={(e) => {
                  if (!showNotifications) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
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

              <div 
                className="user-info"
                onClick={() => navigate('/settings')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '30px',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <img 
                  src={user?.avatar || "/images/ROBERT PROFILE.jpg"} 
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
                    }}
                  >
                    {user?.name || 'Robert Mayhem'}
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
            </div>
          </div>

          {showNotifications && (
            <div 
              ref={notificationRef}
              className="notification-dropdown"
              style={{
                position: 'absolute',
                top: '70px',
                right: '2rem',
                width: '350px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                zIndex: 1000,
                border: '1px solid #e9ecef',
                overflow: 'hidden',
                animation: 'slideDown 0.2s ease-out',
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
                  <h4 style={{ margin: 0, fontSize: '16px', color: '#212529' }}>
                    Notifications
                  </h4>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6c757d' }}>
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
                        fontSize: '12px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                        fontSize: '12px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffebee'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{
                    padding: '30px 20px',
                    textAlign: 'center',
                    color: '#6c757d',
                  }}>
                    <i className="fas fa-bell-slash" style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.5 }}></i>
                    <p style={{ margin: 0 }}>No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationItemClick(notification.id)}
                      style={{
                        padding: '15px',
                        display: 'flex',
                        borderBottom: '1px solid #f5f5f5',
                        transition: 'all 0.2s',
                        backgroundColor: notification.read ? 'white' : '#f8f9fa',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f3f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = notification.read ? 'white' : '#f8f9fa'}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: getNotificationColor(notification.type) + '20',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '15px',
                        flexShrink: 0,
                      }}>
                        <i 
                          className={getNotificationIcon(notification.type)} 
                          style={{ color: getNotificationColor(notification.type), fontSize: '18px' }}
                        ></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <p style={{ 
                            margin: '0 0 5px 0', 
                            fontSize: '14px', 
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
                          fontSize: '13px', 
                          color: '#6c757d',
                          lineHeight: '1.4',
                        }}>
                          {notification.message}
                        </p>
                        <small style={{ color: '#95a5a6', fontSize: '11px' }}>
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
                      fontSize: '12px',
                      fontWeight: '500',
                      padding: '5px 10px',
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
          <aside 
            className="sidebar"
            style={{
              width: sidebarCollapsed ? '70px' : '260px',
              backgroundColor: 'white',
              borderRight: '1px solid #e9ecef',
              padding: '1.5rem 0',
              transition: 'all 0.3s',
              position: 'sticky',
              top: '70px',
              height: 'calc(100vh - 70px)',
              overflowY: 'auto',
            }}
          >
            <button 
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                position: 'absolute',
                top: '2px',
                right: '24px',
                background: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                cursor: 'pointer',
                zIndex: 95,
                fontSize: '0.8rem',
                color: '#6c757d',
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
                    }}
                  >
                    {isActive(item.path) && (
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
                    <i className={item.icon} style={{ fontSize: '1rem', width: '20px' }}></i>
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </button>
                </div>
              ))}

              <div 
                className="menu-item"
                style={{ marginBottom: '0.25rem' }}
              >
                <button
                  onClick={toggleAIChat}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    padding: '0.7rem 1.5rem',
                    color: showAIChat ? '#4361ee' : '#6c757d',
                    backgroundColor: showAIChat ? 'rgba(67, 97, 238, 0.1)' : 'transparent',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: showAIChat ? '600' : '500',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!showAIChat) {
                      e.currentTarget.style.backgroundColor = '#f1f3f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!showAIChat) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <i className="fas fa-robot" style={{ fontSize: '1rem', width: '20px' }}></i>
                  {!sidebarCollapsed && (
                    <>
                      <span>AI Chat Bot</span>
                      {showAIChat && (
                        <i className="fas fa-circle" style={{
                          fontSize: '8px',
                          color: '#4361ee',
                          marginLeft: 'auto',
                        }}></i>
                      )}
                    </>
                  )}
                </button>
              </div>

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
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(247, 37, 133, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <i className="fas fa-sign-out-alt" style={{ fontSize: '1rem', width: '20px' }}></i>
                  {!sidebarCollapsed && <span>Log Out</span>}
                </button>
              </div>
            </nav>
          </aside>

          <main 
            className="content-area"
            style={{
              flex: 1,
              padding: '2rem',
              backgroundColor: '#f5f7fb',
              overflowY: 'auto',
              minHeight: 'calc(100vh - 70px)', 
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
          
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
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
          
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
          
          @keyframes pulse {
            0% {
              transform: scale(0.95);
            }
            50% {
              transform: scale(1.05);
            }
            100% {
              transform: scale(0.95);
            }
          }
          
          @media (max-width: 1200px) {
            .sidebar {
              transform: translateX(-100%);
            }
            
            .sidebar-toggle {
              display: block !important;
            }
            
            .notification-dropdown {
              width: 300px !important;
              right: 1rem !important;
            }
          }
          
          @media (max-width: 768px) {
            .ai-chat-container {
              width: calc(100% - 40px) !important;
              height: 400px !important;
              bottom: 10px !important;
              right: 10px !important;
            }
            
            .notification-dropdown {
              width: 280px !important;
              right: 0.5rem !important;
            }
            
            .header-logo h1 {
              font-size: 1.1rem !important;
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default StudentLayout;