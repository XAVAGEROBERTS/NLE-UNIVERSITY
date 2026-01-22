// src/components/layout/StudentLayout.jsx - CLEANED VERSION
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { supabase } from '../../services/supabase';

const StudentLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, logoutLoading } = useStudentAuth();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const logoutModalRef = useRef(null);
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

  // Check if current path is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Check mobile on mount and resize - RESTORED TO 1024px
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
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
    if (user) {
      setIsLoadingUser(true);
      fetchStudentData();
    }
  }, [user, fetchStudentData]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLogoutModal && 
          logoutModalRef.current && 
          !logoutModalRef.current.contains(event.target)) {
        if (!logoutLoading) {
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
  }, [showLogoutModal, logoutLoading, mobileMenuOpen]);

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

  // SIMPLIFIED LOGOUT FUNCTION - auth context handles loading
  const confirmLogout = async () => {
    console.log('Starting logout process');
    
    try {
      // Call signOut from context - it will handle the loading animation
      await signOut();
      // Hide modal - logout loader will be shown by auth context
      setShowLogoutModal(false);
    } catch (error) {
      console.error('Logout error:', error);
      // Hide logout modal on error
      setShowLogoutModal(false);
    }
  };

  const cancelLogout = () => {
    if (!logoutLoading) {
      setShowLogoutModal(false);
    }
  };

  // If logout is loading, auth context will show the loader globally
  if (logoutLoading) {
    return null; // Return nothing - LogoutLoader will be shown by App.jsx
  }

  return (
    <>
      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div 
            ref={logoutModalRef}
            className="logout-modal"
          >
            <div className="logout-modal-header">
              <div className="university-badge">
                <img 
                  src="/badge.png" 
                  alt="University Badge" 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `
                      <div class="badge-fallback">
                        🎓
                      </div>
                    `;
                  }}
                />
              </div>
              <div className="university-info">
                <h3>NLE University</h3>
                <p>Student Portal</p>
              </div>
            </div>

            <div className="logout-modal-body">
              <div className="logout-warning">
                <div className="warning-icon">
                  <i className="fas fa-sign-out-alt"></i>
                </div>
                <div className="warning-content">
                  <h4>Confirm Logout</h4>
                  <p>Are you sure you want to logout from your student account?</p>
                </div>
              </div>

              <div className="user-info-card">
                <div className="user-info-item">
                  <i className="fas fa-user"></i>
                  <span>{studentData?.full_name || user?.name || 'Student'}</span>
                </div>
                <div className="user-info-item">
                  <i className="fas fa-id-card"></i>
                  <span>{studentData?.student_id || user?.studentId || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="logout-modal-footer">
              <button
                onClick={cancelLogout}
                disabled={logoutLoading}
                className="logout-cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                disabled={logoutLoading}
                className="logout-confirm-btn"
              >
                {logoutLoading ? (
                  <>
                    <div className="logout-spinner"></div>
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

      {/* Main Layout Container */}
      <div className={`layout-container ${logoutLoading ? 'logging-out' : ''}`}>
        <header className="layout-header">
          <div className="header-content">
            <div className="header-logo">
              {isMobile && (
                <button
                  className="mobile-menu-toggle"
                  onClick={toggleMobileMenu}
                  aria-label="Toggle mobile menu"
                >
                  <i className={mobileMenuOpen ? 'fas fa-times' : 'fas fa-bars'}></i>
                </button>
              )}
              
              <div className="logo">
                <img 
                  src="/badge.png" 
                  alt="Logo" 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `
                      <div class="logo-fallback-small">
                        🎓
                      </div>
                    `;
                  }}
                />
                <span className="logo-badge">ERP</span>
              </div>
              <div>
                <h1>NLE UNIVERSITY</h1>
                <p>Student Portal</p>
              </div>
            </div>

            <div className="header-actions">
              {!isMobile && (
                <div 
                  className="user-info"
                  onClick={() => navigate('/settings')}
                  role="button"
                  tabIndex="0"
                  aria-label="Go to settings"
                >
                  {isLoadingUser && (
                    <div className="user-loading-indicator">
                      <div className="user-loading-spinner"></div>
                    </div>
                  )}
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(studentData?.full_name || user?.name || 'Student')}&background=3498db&color=fff&size=128`} 
                    alt="User"
                  />
                  <div>
                    <div className="user-name">
                      {studentData?.full_name || user?.name || 'Loading...'}
                      {isLoadingUser && (
                        <div className="name-loading-spinner"></div>
                      )}
                    </div>
                    <div className="user-role">
                      Student
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="main-content">
          {/* Desktop Sidebar */}
          {!isMobile && (
            <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
              <button 
                className="sidebar-toggle"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <i className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'}`}></i>
              </button>

              <nav className="sidebar-nav">
                {menuItems.map((item) => (
                  <div 
                    key={item.id}
                    className="menu-item"
                  >
                    <button
                      onClick={() => handleNavigation(item.path)}
                      className={`nav-button ${isActive(item.path) ? 'active' : ''}`}
                      style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                      aria-label={item.label}
                    >
                      {isActive(item.path) && !sidebarCollapsed && (
                        <div className="active-indicator" />
                      )}
                      <i className={item.icon}></i>
                      {!sidebarCollapsed && <span>{item.label}</span>}
                      {sidebarCollapsed && isActive(item.path) && (
                        <div className="collapsed-active-indicator"></div>
                      )}
                    </button>
                  </div>
                ))}

                <div className="menu-item">
                  <button
                    onClick={handleLogout}
                    className="logout-button"
                    style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                    aria-label="Log out"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    {!sidebarCollapsed && <span>Log Out</span>}
                  </button>
                </div>
              </nav>
            </aside>
          )}

          {/* Mobile Menu Overlay */}
          {isMobile && mobileMenuOpen && (
            <>
              <div 
                className="mobile-menu-backdrop"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              />
              
              <div 
                ref={mobileMenuRef}
                className="mobile-menu"
              >
                <div className="mobile-user-info">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(studentData?.full_name || user?.name || 'Student')}&background=3498db&color=fff&size=128`} 
                    alt="User"
                  />
                  <div>
                    <div className="mobile-user-name">
                      {studentData?.full_name || user?.name || 'Loading...'}
                    </div>
                    <div className="mobile-user-role">
                      Student
                    </div>
                  </div>
                </div>

                <nav className="mobile-nav" aria-label="Main navigation">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.path)}
                      className={`mobile-nav-button ${isActive(item.path) ? 'active' : ''}`}
                      aria-label={item.label}
                      aria-current={isActive(item.path) ? "page" : undefined}
                    >
                      <i className={item.icon}></i>
                      <span>{item.label}</span>
                      {isActive(item.path) && (
                        <i className="fas fa-circle active-dot" aria-hidden="true"></i>
                      )}
                    </button>
                  ))}

                  <div className="mobile-logout-section">
                    <button
                      onClick={handleLogout}
                      className="mobile-logout-button"
                      aria-label="Log out"
                    >
                      <i className="fas fa-sign-out-alt"></i>
                      <span>Log Out</span>
                    </button>
                  </div>
                </nav>
              </div>
            </>
          )}

          {/* Main Content Area */}
          <main className="content-area">
            <Outlet />
          </main>
        </div>
      </div>

      {/* CSS Styles - RESTORED PROPER BREAKPOINTS */}
      <style jsx="true">{`
        /* Global Styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
          background-color: #f5f7fb;
        }
        
        button {
          font-family: inherit;
          transition: all 0.2s;
          outline: none;
          cursor: pointer;
        }
        
        img {
          max-width: 100%;
          height: auto;
        }
        
        /* Animations */
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
        
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        /* Logout Modal - RESTORED STYLES */
        .logout-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
          animation: fadeIn 0.3s ease-out;
          padding: 1rem;
        }
        
        .logout-modal {
          background-color: white;
          border-radius: 12px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          animation: slideUp 0.3s ease-out;
        }
        
        .logout-modal-header {
          padding: 25px 20px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }
        
        .university-badge {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 3px solid #4361ee;
          padding: 5px;
          background-color: white;
        }
        
        .university-badge img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 50%;
        }
        
        .badge-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #4361ee, #3f37c9);
          color: white;
          font-size: 32px;
          border-radius: 50%;
        }
        
        .university-info {
          text-align: center;
        }
        
        .university-info h3 {
          margin: 0;
          color: #2c3e50;
          font-size: 18px;
          font-weight: 600;
        }
        
        .university-info p {
          margin: 5px 0 0 0;
          color: #7f8c8d;
          font-size: 14px;
          font-weight: 500;
        }
        
        .logout-modal-body {
          padding: 25px 20px;
        }
        
        .logout-warning {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
        }
        
        .warning-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background-color: #e74c3c20;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e74c3c;
          font-size: 20px;
          flex-shrink: 0;
        }
        
        .warning-content h4 {
          margin: 0;
          color: #2c3e50;
          font-size: 16px;
          font-weight: 600;
        }
        
        .warning-content p {
          margin: 5px 0 0 0;
          color: #666;
          font-size: 14px;
          line-height: 1.4;
        }
        
        .user-info-card {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-top: 20px;
          border: 1px solid #e9ecef;
        }
        
        .user-info-item {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        
        .user-info-item:last-child {
          margin-bottom: 0;
        }
        
        .user-info-item i {
          color: #4361ee;
          font-size: 14px;
        }
        
        .user-info-item span {
          font-size: 14px;
          color: #2c3e50;
        }
        
        .user-info-item:last-child span {
          color: #7f8c8d;
        }
        
        .logout-modal-footer {
          padding: 15px 20px;
          border-top: 1px solid #e9ecef;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .logout-cancel-btn {
          padding: 12px 24px;
          background-color: #f8f9fa;
          color: #495057;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          flex: 1;
          min-width: 120px;
        }
        
        .logout-cancel-btn:hover:not(:disabled) {
          background-color: #e9ecef;
        }
        
        .logout-cancel-btn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }
        
        .logout-confirm-btn {
          padding: 12px 24px;
          background-color: #e74c3c;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex: 1;
          min-width: 120px;
        }
        
        .logout-confirm-btn:hover:not(:disabled) {
          background-color: #c0392b;
        }
        
        .logout-confirm-btn:disabled {
          background-color: #95a5a6;
          cursor: not-allowed;
        }
        
        .logout-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        /* Layout Container */
        .layout-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          position: relative;
          opacity: 1;
          transition: opacity 0.3s ease;
        }
        
        .layout-container.logging-out {
          opacity: 0.5;
          pointer-events: none;
        }
        
        /* Header - RESTORED TO ORIGINAL WITH IMPROVEMENTS */
        .layout-header {
          height: 70px;
          background-color: white;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          padding: 0 2rem;
          position: sticky;
          top: 0;
          z-index: 100;
          border-bottom: 1px solid #e9ecef;
        }
        
        /* Tablet and Mobile */
        @media (max-width: 1024px) {
          .layout-header {
            height: 60px;
            padding: 0 1rem;
          }
        }
        
        /* Small mobile devices - ADDED FOR EXTRA SMALL SCREENS */
        @media (max-width: 480px) {
          .layout-header {
            height: 56px;
            padding: 0 0.75rem;
          }
        }
        
        .header-content {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .header-logo {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        @media (max-width: 1024px) {
          .header-logo {
            gap: 0.75rem;
          }
        }
        
        @media (max-width: 480px) {
          .header-logo {
            gap: 0.5rem;
          }
        }
        
        .mobile-menu-toggle {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #4361ee;
          cursor: pointer;
          padding: 5px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          margin-right: 0.5rem;
        }
        
        @media (max-width: 1024px) {
          .mobile-menu-toggle {
            width: 36px;
            height: 36px;
            font-size: 1.25rem;
          }
        }
        
        @media (max-width: 480px) {
          .mobile-menu-toggle {
            width: 32px;
            height: 32px;
            font-size: 1.1rem;
          }
        }
        
        .mobile-menu-toggle:hover {
          background-color: #f1f3f5;
        }
        
        .logo {
          width: 40px;
          height: 40px;
          position: relative;
        }
        
        @media (max-width: 1024px) {
          .logo {
            width: 36px;
            height: 36px;
          }
        }
        
        @media (max-width: 480px) {
          .logo {
            width: 32px;
            height: 32px;
          }
        }
        
        .logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .logo-fallback-small {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #4361ee, #3f37c9);
          color: white;
          font-size: 20px;
          border-radius: 50%;
        }
        
        @media (max-width: 1024px) {
          .logo-fallback-small {
            font-size: 18px;
          }
        }
        
        @media (max-width: 480px) {
          .logo-fallback-small {
            font-size: 16px;
          }
        }
        
        .logo-badge {
          position: absolute;
          bottom: -5px;
          right: -5px;
          background-color: #f72585;
          color: white;
          font-size: 0.6rem;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 10px;
        }
        
        @media (max-width: 1024px) {
          .logo-badge {
            font-size: 0.5rem;
            padding: 1px 4px;
            bottom: -3px;
            right: -3px;
          }
        }
        
        @media (max-width: 480px) {
          .logo-badge {
            display: none;
          }
        }
        
        .header-logo h1 {
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(90deg, #4361ee, #3f37c9);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        @media (max-width: 1024px) {
          .header-logo h1 {
            font-size: 1.1rem;
          }
        }
        
        @media (max-width: 480px) {
          .header-logo h1 {
            font-size: 0.9rem;
          }
        }
        
        .header-logo p {
          font-size: 0.75rem;
          color: #6c757d;
          margin: 0;
        }
        
        @media (max-width: 1024px) {
          .header-logo p {
            font-size: 0.7rem;
          }
        }
        
        @media (max-width: 480px) {
          .header-logo p {
            display: none;
          }
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          position: relative;
        }
        
        @media (max-width: 1024px) {
          .header-actions {
            gap: 1rem;
          }
        }
        
        /* User Info - RESTORED */
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.5rem 0.8rem;
          border-radius: 30px;
          cursor: pointer;
          position: relative;
        }
        
        .user-info:hover {
          background-color: #f1f3f5;
        }
        
        .user-loading-indicator {
          position: absolute;
          top: -5px;
          right: -5px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: #3498db;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          border: 2px solid white;
        }
        
        .user-loading-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .user-info img {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e9ecef;
        }
        
        .user-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #212529;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .name-loading-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid #e9ecef;
          border-top-color: #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .user-role {
          font-size: 0.7rem;
          color: #adb5bd;
          text-transform: uppercase;
        }
        
        /* Main Content */
        .main-content {
          display: flex;
          flex: 1;
          position: relative;
          min-height: calc(100vh - 70px);
        }
        
        @media (max-width: 1024px) {
          .main-content {
            min-height: calc(100vh - 60px);
          }
        }
        
        /* Sidebar - RESTORED AND FIXED */
        .sidebar {
          width: 260px;
          background-color: white;
          border-right: 1px solid #e9ecef;
          padding: 1.5rem 0;
          padding-right: 5px;
          transition: all 0.3s;
          position: sticky;
          top: 70px;
          height: calc(100vh - 70px);
          overflow-y: auto;
          z-index: 90;
        }
        
        @media (max-width: 1024px) {
          .sidebar {
            display: none; /* Hide sidebar on mobile/tablet */
          }
        }
        
        .sidebar.collapsed {
          width: 70px;
        }
        
        .sidebar-toggle {
          position: absolute;
          top: 6px;
          right: 22px;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          z-index: 95;
          font-size: 0.8rem;
          color: #6c757d;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .sidebar-toggle:hover {
          background-color: #f8f9fa;
        }
        
        .sidebar-nav {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .menu-item {
          margin-bottom: 0.6rem;
          margin-top: 0.5rem;
        }
        
        .nav-button {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.5rem 1.5rem;
          color: #6c757d;
          background-color: transparent;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          position: relative;
          border-radius: 0 30px 30px 0;
          transition: all 0.2s;
          margin-right: 10px;
        }
        
        .nav-button:hover {
          background-color: #f1f3f5;
        }
        
        .nav-button.active {
          color: #4361ee;
          background-color: rgba(67, 97, 238, 0.1);
          font-weight: 600;
        }
        
        .active-indicator {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background-color: #4361ee;
          border-radius: 0 3px 3px 0;
        }
        
        .collapsed-active-indicator {
          position: absolute;
          right: 5px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #4361ee;
        }
        
        .nav-button i {
          font-size: 1rem;
          width: 20px;
        }
        
        .logout-button {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.7rem 1.5rem;
          color: #f72585;
          background-color: transparent;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          border-radius: 0 30px 30px 0;
          transition: all 0.2s;
          margin-right: 10px;
        }
        
        .logout-button:hover {
          background-color: #f8f9fa;
        }
        
        /* Mobile Menu - IMPROVED */
        .mobile-menu-backdrop {
          position: fixed;
          top: 60px;
          left: 0;
          width: 100%;
          height: calc(100vh - 60px);
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 98;
          animation: fadeIn 0.3s ease-out;
        }
        
        @media (max-width: 480px) {
          .mobile-menu-backdrop {
            top: 56px;
            height: calc(100vh - 56px);
          }
        }
        
        .mobile-menu {
          position: fixed;
          top: 60px;
          left: 0;
          width: 80%;
          max-width: 300px;
          height: calc(100vh - 60px);
          background-color: white;
          z-index: 99;
          overflow-y: auto;
          animation: slideInLeft 0.3s ease-out;
          box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
        }
        
        @media (max-width: 767px) and (min-width: 481px) {
          .mobile-menu {
            width: 75%;
            max-width: 320px;
          }
        }
        
        @media (max-width: 480px) {
          .mobile-menu {
            top: 56px;
            height: calc(100vh - 56px);
            width: 85%;
            max-width: 280px;
          }
        }
        
        .mobile-user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem 1rem;
          background-color: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }
        
        @media (max-width: 480px) {
          .mobile-user-info {
            padding: 1rem;
          }
        }
        
        .mobile-user-info img {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e9ecef;
        }
        
        @media (max-width: 480px) {
          .mobile-user-info img {
            width: 40px;
            height: 40px;
          }
        }
        
        .mobile-user-name {
          font-size: 1rem;
          font-weight: 600;
          color: #212529;
          margin-bottom: 4px;
        }
        
        @media (max-width: 480px) {
          .mobile-user-name {
            font-size: 0.9rem;
          }
        }
        
        .mobile-user-role {
          font-size: 0.8rem;
          color: #adb5bd;
          text-transform: uppercase;
        }
        
        @media (max-width: 480px) {
          .mobile-user-role {
            font-size: 0.7rem;
          }
        }
        
        .mobile-nav {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 1rem 0;
          flex: 1;
        }
        
        .mobile-nav-button {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.9rem 1rem;
          color: #6c757d;
          background-color: transparent;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          border-left: 3px solid transparent;
          transition: all 0.2s;
        }
        
        @media (max-width: 480px) {
          .mobile-nav-button {
            padding: 0.75rem 1rem;
            font-size: 0.85rem;
            gap: 0.75rem;
          }
        }
        
        .mobile-nav-button:hover {
          background-color: #f1f3f5;
        }
        
        .mobile-nav-button.active {
          color: #4361ee;
          background-color: rgba(67, 97, 238, 0.1);
          border-left: 3px solid #4361ee;
          font-weight: 600;
        }
        
        .mobile-nav-button i {
          font-size: 1rem;
          width: 24px;
          text-align: center;
        }
        
        @media (max-width: 480px) {
          .mobile-nav-button i {
            font-size: 0.9rem;
            width: 20px;
          }
        }
        
        .active-dot {
          font-size: 8px;
          color: #4361ee;
          margin-left: auto;
          margin-right: 10px;
        }
        
        .mobile-logout-section {
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }
        
        .mobile-logout-button {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.9rem 1rem;
          color: #f72585;
          background-color: transparent;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          margin-top: 0.5rem;
          border-left: 3px solid transparent;
          transition: all 0.2s;
        }
        
        @media (max-width: 480px) {
          .mobile-logout-button {
            padding: 0.75rem 1rem;
            font-size: 0.85rem;
          }
        }
        
        .mobile-logout-button:hover {
          background-color: #f8f9fa;
        }
        
        /* Content Area - RESTORED */
        .content-area {
          flex: 1;
          padding: 2rem;
          background-color: #f5f7fb;
          overflow-y: auto;
          min-height: calc(100vh - 70px);
          position: relative;
          z-index: 1;
        }
        
        @media (max-width: 1024px) {
          .content-area {
            padding: 1rem;
            min-height: calc(100vh - 60px);
          }
        }
        
        @media (max-width: 480px) {
          .content-area {
            padding: 0.75rem;
            min-height: calc(100vh - 56px);
          }
        }
        
        /* Tablet-specific improvements (769px-1024px) */
        @media (min-width: 769px) and (max-width: 1024px) {
          .content-area {
            padding: 1.5rem;
          }
          
          .sidebar {
            display: block; /* Show sidebar on tablet */
            width: 220px;
          }
          
          .sidebar.collapsed {
            width: 70px;
          }
          
          .sidebar-toggle {
            right: 15px;
          }
        }
        
        /* Additional responsive improvements */
        @media (max-width: 768px) {
          /* Better touch targets for mobile */
          .mobile-nav-button,
          .mobile-menu-toggle {
            min-height: 44px;
            min-width: 44px;
          }
        }
        
        /* Scrollbar Styling - RESTORED */
        .sidebar::-webkit-scrollbar {
          width: 4px;
        }
        
        .sidebar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        
        .sidebar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 2px;
        }
        
        /* Body class for mobile menu open */
        body.mobile-menu-open {
          overflow: hidden;
        }
      `}</style>
    </>
  );
};

export default StudentLayout;