// src/components/admin/AdminDashboard.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { admin: user, profile, isAuthenticated, loading, signOut } = useAdminAuth();
  
  // Add logout modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutModalRef = useRef(null);

  useEffect(() => {
    console.log('🔄 AdminDashboard loaded:', { 
      loading, 
      isAuthenticated, 
      user: user?.email,
      role: profile?.role 
    });
    
    if (!loading && !isAuthenticated) {
      console.log('❌ Not authenticated as admin, redirecting to admin login');
      navigate('/admin/login');
    }
  }, [loading, isAuthenticated, navigate, user, profile]);

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLogoutModal && 
          logoutModalRef.current && 
          !logoutModalRef.current.contains(event.target)) {
        setShowLogoutModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLogoutModal]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };
// In AdminDashboard.jsx, update the confirmLogout function:

const confirmLogout = async () => {
  console.log('Admin logout started');
  setIsLoggingOut(true);
  
  try {
    console.log('1. Calling signOut()');
    const result = await signOut();
    
    if (result.success) {
      console.log('✅ signOut successful');
    } else {
      console.error('❌ signOut failed:', result.error);
    }
    
    // Clear any remaining local storage
    console.log('2. Clearing storage');
    localStorage.clear();
    sessionStorage.clear();
    
    // Force redirect to admin login with delay to ensure state clears
    console.log('3. Redirecting to /admin/login');
    setTimeout(() => {
      window.location.href = '/admin/login';
    }, 500);
    
  } catch (error) {
    console.error('❌ Admin logout error:', error);
    // Still redirect even if error
    setTimeout(() => {
      window.location.href = '/admin/login';
    }, 500);
  }
  // Don't set isLoggingOut to false - page will reload
};

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading admin dashboard...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div style={styles.adminContainer}>
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
                  Confirm Admin Logout
                </h3>
                <p style={{
                  margin: '5px 0 0 0',
                  color: '#7f8c8d',
                  fontSize: '14px',
                }}>
                  Are you sure you want to logout from admin panel?
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
                You will be signed out of your admin account and redirected to the admin login page.
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
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f8f9fa',
                  color: '#495057',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
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
                  gap: '8px',
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
            width: '300px',
            height: '300px',
            animation: 'pulse 1.5s infinite ease-in-out',
            marginBottom: '30px',
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
          }}>
            Logging out from Admin...
          </p>
          <p style={{
            color: '#7f8c8d',
            fontSize: '0.9rem',
            marginTop: '10px',
          }}>
            Please wait while we sign you out
          </p>
        </div>
      )}

      {/* Admin Header */}
      <header style={styles.adminHeader}>
        <div style={styles.headerContent}>
          <div style={styles.logoSection}>
            <img 
              src="/images/badge.png" 
              alt="Logo" 
              style={styles.logo}
            />
            <div>
              <h1 style={styles.adminTitle}>NLE UNIVERSITY</h1>
              <p style={styles.adminSubtitle}>Administration Portal</p>
            </div>
          </div>
          
          <div style={styles.adminUserInfo}>
            <div style={styles.userAvatar}>
              <span style={styles.avatarText}>
                {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'A'}
              </span>
            </div>
            <div>
              <p style={styles.userName}>{profile?.full_name || 'Admin User'}</p>
              <p style={styles.userRole}>
                <span style={styles.adminBadge}>ADMIN</span>
                <span style={styles.userEmail}>{user?.email}</span>
              </p>
            </div>
            <button 
              onClick={handleLogout}  // Changed from direct logout to show modal
              style={styles.logoutButton}
            >
              <span style={styles.logoutIcon}>🚪</span>
              Logout
            </button>
          </div>
        </div>
        
        {/* Admin Navigation */}
        <nav style={styles.adminNav}>
          <Link to="/admin/dashboard" style={styles.navLinkActive}>
            Dashboard
          </Link>
          <Link to="/admin/users" style={styles.navLink}>
            Users
          </Link>
          <Link to="/admin/exams" style={styles.navLink}>
            Exams
          </Link>
          <Link to="/admin/settings" style={styles.navLink}>
            Settings
          </Link>
          <div style={styles.navSpacer}></div>
          <Link to="/dashboard" style={styles.studentPortalLink}>
            Switch to Student Portal →
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main style={styles.adminMain}>
        <div style={styles.welcomeSection}>
          <h2 style={styles.welcomeTitle}>Welcome to Admin Dashboard</h2>
          <p style={styles.welcomeText}>
            You have full administrative privileges to manage the system.
          </p>
        </div>

        {/* Quick Stats */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3 style={styles.statNumber}>0</h3>
            <p style={styles.statLabel}>Active Exams</p>
          </div>
          <div style={styles.statCard}>
            <h3 style={styles.statNumber}>0</h3>
            <p style={styles.statLabel}>Total Students</p>
          </div>
          <div style={styles.statCard}>
            <h3 style={styles.statNumber}>0</h3>
            <p style={styles.statLabel}>Pending Submissions</p>
          </div>
          <div style={styles.statCard}>
            <h3 style={styles.statNumber}>0</h3>
            <p style={styles.statLabel}>System Alerts</p>
          </div>
        </div>

        {/* Debug Info (remove in production) */}
        <div style={styles.debugSection}>
          <h3 style={styles.debugTitle}>Debug Information</h3>
          <pre style={styles.debugPre}>
            {JSON.stringify({
              user: user ? { 
                email: user.email, 
                id: user.id?.substring(0, 8) + '...' 
              } : null,
              profile: profile ? {
                full_name: profile.full_name,
                role: profile.role
              } : null,
              isAuthenticated,
              loading
            }, null, 2)}
          </pre>
        </div>

        {/* Quick Links */}
        <div style={styles.quickLinks}>
          <h3 style={styles.sectionTitle}>Quick Links</h3>
          <div style={styles.linksGrid}>
            <button 
              onClick={() => navigate('/admin/login')}
              style={styles.quickLink}
            >
              Admin Login Page
            </button>
            <button 
              onClick={() => navigate('/dashboard')}
              style={styles.quickLink}
            >
              Student Dashboard
            </button>
            <button 
              onClick={() => navigate('/login')}
              style={styles.quickLink}
            >
              Student Login
            </button>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              style={{ ...styles.quickLink, backgroundColor: '#e74c3c' }}
            >
              Clear Storage & Logout
            </button>
          </div>
        </div>
      </main>

      <footer style={styles.adminFooter}>
        <p>NLE University Admin Portal v1.0</p>
        <p>Logged in as: <strong>{user?.email}</strong> | Role: <strong>{profile?.role}</strong></p>
      </footer>
    </div>
  );
};

// Keep all your existing styles from before...
const styles = {
  adminContainer: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  adminHeader: {
    backgroundColor: 'white',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    borderBottom: '3px solid #3498db'
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 30px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  logo: {
    width: '50px',
    height: '50px',
    objectFit: 'contain'
  },
  adminTitle: {
    fontSize: '24px',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(90deg, #3498db, #2c3e50)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  adminSubtitle: {
    fontSize: '14px',
    color: '#7f8c8d',
    margin: '5px 0 0 0'
  },
  adminUserInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  userAvatar: {
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    backgroundColor: '#3498db',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '18px'
  },
  avatarText: {
    textTransform: 'uppercase'
  },
  userName: {
    margin: 0,
    fontWeight: '600',
    color: '#2c3e50',
    fontSize: '16px'
  },
  userRole: {
    margin: '5px 0 0 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  adminBadge: {
    backgroundColor: '#27ae60',
    color: 'white',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  userEmail: {
    fontSize: '12px',
    color: '#7f8c8d'
  },
  logoutButton: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    padding: '8px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    marginLeft: '15px'
  },
  logoutIcon: {
    fontSize: '16px'
  },
  adminNav: {
    backgroundColor: '#2c3e50',
    padding: '0 30px',
    display: 'flex',
    alignItems: 'center',
    gap: '30px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  navLink: {
    color: '#bdc3c7',
    textDecoration: 'none',
    padding: '15px 0',
    fontSize: '15px',
    fontWeight: '500',
    borderBottom: '3px solid transparent',
    transition: 'all 0.3s'
  },
  navLinkActive: {
    color: 'white',
    textDecoration: 'none',
    padding: '15px 0',
    fontSize: '15px',
    fontWeight: '600',
    borderBottom: '3px solid #3498db'
  },
  navSpacer: {
    flex: 1
  },
  studentPortalLink: {
    color: '#3498db',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    padding: '8px 15px',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: '6px'
  },
  adminMain: {
    maxWidth: '1400px',
    margin: '30px auto',
    padding: '0 30px'
  },
  welcomeSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '30px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
    borderLeft: '4px solid #3498db'
  },
  welcomeTitle: {
    fontSize: '28px',
    color: '#2c3e50',
    margin: '0 0 10px 0'
  },
  welcomeText: {
    color: '#7f8c8d',
    fontSize: '16px',
    margin: 0
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '25px',
    textAlign: 'center',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
    borderTop: '4px solid #3498db'
  },
  statNumber: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#2c3e50',
    margin: '0 0 10px 0'
  },
  statLabel: {
    color: '#7f8c8d',
    fontSize: '14px',
    margin: 0
  },
  debugSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '30px',
    color: 'white'
  },
  debugTitle: {
    color: '#3498db',
    margin: '0 0 15px 0'
  },
  debugPre: {
    backgroundColor: '#2d2d2d',
    padding: '15px',
    borderRadius: '8px',
    overflow: 'auto',
    fontSize: '12px',
    margin: 0
  },
  quickLinks: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
  },
  sectionTitle: {
    color: '#2c3e50',
    margin: '0 0 20px 0'
  },
  linksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px'
  },
  quickLink: {
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  adminFooter: {
    backgroundColor: '#2c3e50',
    color: 'white',
    textAlign: 'center',
    padding: '20px',
    marginTop: '50px',
    fontSize: '14px'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  loadingText: {
    color: '#7f8c8d',
    fontSize: '16px'
  }
};

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
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
  
  @keyframes pulse {
    0% { transform: scale(0.95); }
    50% { transform: scale(1.05); }
    100% { transform: scale(0.95); }
  }
  
  .nav-link:hover {
    color: white;
    border-bottom-color: rgba(52, 152, 219, 0.5);
  }
  
  .quick-link:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(52, 152, 219, 0.3);
  }
`;
document.head.appendChild(style);

export default AdminDashboard;