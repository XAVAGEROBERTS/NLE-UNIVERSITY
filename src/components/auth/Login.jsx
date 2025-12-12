import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [registration, setRegistration] = useState('NLE-BSCE-2403-0763-DAY');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved credentials on component mount
  useEffect(() => {
    const savedRegistration = localStorage.getItem('rememberedRegistration');
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    
    if (savedRememberMe && savedRegistration) {
      setRegistration(savedRegistration);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (rememberMe) {
      localStorage.setItem('rememberedRegistration', registration);
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberedRegistration');
      localStorage.removeItem('rememberMe');
    }
    
    login();
    navigate('/dashboard');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleRememberMeChange = (e) => {
    setRememberMe(e.target.checked);
  };

  const handleForgotPasswordClick = () => {
    setShowForgotPassword(true);
    setRecoveryEmail('');
    setIsEmailSent(false);
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setIsEmailSent(false);
  };

  const handleSendVerificationCode = async (e) => {
    e.preventDefault();
    if (!recoveryEmail) {
      alert('Please enter your email address');
      return;
    }

    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsEmailSent(true);
    } catch (error) {
      alert('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.background}>
        <img src="/images/back G login.jpg" alt="Campus" style={styles.bgImage} />
      </div>

      {/* Main Login Page */}
      {!showForgotPassword && (
        <div style={styles.loginPage}>
          <div style={styles.loginContainer}>
            <div style={styles.header}>
              <div style={styles.logoContainer}>
                <img src="/images/badge.png" alt="Logo" style={styles.logo} />
                <span style={styles.badge}>STUDENT</span>
              </div>
              <h1 style={styles.title}>NLE UNIVERSITY</h1>
              <p style={styles.subtitle}>Students Portal</p>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Registration Number</label>
                <input
                  type="text"
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value)}
                  placeholder="Enter registration number"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    style={{ ...styles.input, paddingRight: '40px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    style={styles.passwordToggle}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
                  </button>
                </div>
              </div>

              <div style={styles.rememberForgotContainer}>
                <label style={styles.rememberMeLabel}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={handleRememberMeChange}
                    style={styles.checkbox}
                  />
                  <span style={styles.rememberMeText}>Remember Me</span>
                </label>
                
                <button
                  type="button"
                  onClick={handleForgotPasswordClick}
                  style={styles.forgotPasswordLink}
                >
                  Forgot Password?
                </button>
              </div>

              <button type="submit" style={styles.button}>
                <i className="fas fa-sign-in-alt"></i> Login
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Full Page Forgot Password - No overflow, no scroll */}
      {showForgotPassword && (
        <div style={styles.fullPage}>
          <div style={styles.fullPageContent}>
            {/* Header */}
            <div style={styles.fullPageHeader}>
              <div style={styles.headerContent}>
                <div style={styles.universityInfo}>
                  <h1 style={styles.universityName}>NLE UNIVERSITY</h1>
                  <p style={styles.universityLocation}>Students Portal</p>
                </div>
                <button 
                  onClick={handleCloseForgotPassword}
                  style={styles.fullPageCloseButton}
                >
                  <i className="fas fa-times"></i> Close
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div style={styles.mainContent}>
              <div style={styles.recoveryCard}>
                <div style={styles.recoveryHeader}>
                  <div style={styles.recoveryIcon}>
                    <i className="fas fa-key" style={styles.iconStyle}></i>
                  </div>
                  <h2 style={styles.recoveryTitle}>Password Recovery</h2>
                  <p style={styles.recoveryDescription}>
                    Enter your account's email and we'll send you a verification code to reset your password
                  </p>
                </div>

                {isEmailSent ? (
                  <div style={styles.successContainer}>
                    <div style={styles.successIcon}>
                      <i className="fas fa-check-circle" style={styles.successIconStyle}></i>
                    </div>
                    <h3 style={styles.successTitle}>Verification Code Sent!</h3>
                    <p style={styles.successText}>
                      We've sent a verification code to: <strong>{recoveryEmail}</strong>
                    </p>
                    <p style={styles.successInstructions}>
                      Please check your email inbox (and spam folder) for the verification code.
                      The code will expire in 15 minutes.
                    </p>
                    <div style={styles.successActions}>
                      <button
                        onClick={handleCloseForgotPassword}
                        style={styles.backButton}
                      >
                        <i className="fas fa-arrow-left"></i> Back to Login
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <form onSubmit={handleSendVerificationCode} style={styles.recoveryForm}>
                      <div style={styles.inputContainer}>
                        <label style={styles.emailLabel}>Your Email Address</label>
                        <div style={styles.emailInputWrapper}>
                          <i className="fas fa-envelope" style={styles.inputIcon}></i>
                          <input
                            type="email"
                            value={recoveryEmail}
                            onChange={(e) => setRecoveryEmail(e.target.value)}
                            placeholder="Enter your registered email address"
                            style={styles.emailInput}
                            required
                          />
                        </div>
                        <p style={styles.emailHint}>
                          Enter the email address associated with your student account
                        </p>
                      </div>

                      <button 
                        type="submit" 
                        style={styles.sendCodeButton}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i> Sending Code...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-paper-plane"></i> Send Verification Code
                          </>
                        )}
                      </button>
                    </form>

                    <div style={styles.recoveryFooter}>
                      <p style={styles.rememberPassword}>
                        Remembered your password?
                      </p>
                      <button 
                        onClick={handleCloseForgotPassword}
                        style={styles.loginInsteadButton}
                      >
                        <i className="fas fa-arrow-left"></i> Back to Login
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Info Panel */}
              <div style={styles.infoPanel}>
                <div style={styles.infoContent}>
                  <h3 style={styles.infoTitle}>
                    <i className="fas fa-info-circle"></i> Important Information
                  </h3>
                  <ul style={styles.infoList}>
                    <li style={styles.infoItem}>
                      <i className="fas fa-clock"></i>
                      <span>Verification codes expire after 15 minutes</span>
                    </li>
                    <li style={styles.infoItem}>
                      <i className="fas fa-envelope"></i>
                      <span>Check your spam folder if you don't see the email</span>
                    </li>
                    <li style={styles.infoItem}>
                      <i className="fas fa-user-check"></i>
                      <span>Use the email associated with your student account</span>
                    </li>
                    <li style={styles.infoItem}>
                      <i className="fas fa-hourglass-half"></i>
                      <span>Allow a few minutes for the email to arrive</span>
                    </li>
                  </ul>
                  
                  <div style={styles.supportSection}>
                    <h4 style={styles.supportTitle}>
                      <i className="fas fa-headset"></i> Need Help?
                    </h4>
                    <p style={styles.supportText}>
                      Contact IT Support at{' '}
                      <a href="mailto:support@nleuniversity.edu" style={styles.supportLink}>
                        support@nleuniversity.edu
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={styles.fullPageFooter}>
              <div style={styles.footerContent}>
                <p style={styles.footerText}>
                  © {new Date().getFullYear()} NLE UNIVERSITY. All rights reserved.
                </p>
                <div style={styles.footerLinks}>
                  <a href="/privacy" style={styles.footerLink}>Privacy Policy</a>
                  <span style={styles.footerSeparator}>•</span>
                  <a href="/terms" style={styles.footerLink}>Terms of Service</a>
                  <span style={styles.footerSeparator}>•</span>
                  <a href="/help" style={styles.footerLink}>Help Center</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  bgImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: 1,
  },
  loginPage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    zIndex: 2,
    padding: '1rem',
  },
  loginContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    padding: '2rem',
    width: '400px',
    maxWidth: '90%',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logoContainer: {
    position: 'relative',
    width: '80px',
    height: '80px',
    margin: '0 auto 1rem',
  },
  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  badge: {
    position: 'absolute',
    bottom: '-5px',
    right: '-5px',
    background: '#f72585',
    color: 'white',
    fontSize: '0.6rem',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '10px',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    background: 'linear-gradient(90deg, #4361ee, #3f37c9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: '#6c757d',
    fontSize: '0.9rem',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '500',
    color: '#495057',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
  },
  passwordToggle: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#6c757d',
    cursor: 'pointer',
    padding: '5px',
    fontSize: '1rem',
  },
  rememberForgotContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  rememberMeLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkbox: {
    marginRight: '8px',
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  rememberMeText: {
    color: '#495057',
    fontSize: '0.9rem',
  },
  forgotPasswordLink: {
    background: 'none',
    border: 'none',
    color: '#4361ee',
    fontSize: '0.9rem',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
  button: {
    width: '100%',
    padding: '0.75rem',
    background: '#4361ee',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },

  // Full Page Forgot Password Styles
  fullPage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f5f7fb',
    zIndex: 3,
    overflow: 'hidden',
  },
  fullPageContent: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  fullPageHeader: {
    background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
    color: 'white',
    padding: '1rem 2rem',
    flexShrink: 0,
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  universityInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  universityName: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '700',
  },
  universityLocation: {
    margin: '0.25rem 0 0 0',
    fontSize: '0.9rem',
    opacity: 0.9,
  },
  fullPageCloseButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%',
    gap: '2rem',
  },
  recoveryCard: {
    flex: 1,
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
    maxWidth: '500px',
  },
  recoveryHeader: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  recoveryIcon: {
    marginBottom: '1rem',
  },
  iconStyle: {
    fontSize: '40px',
    color: '#4361ee',
  },
  recoveryTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1a237e',
    marginBottom: '0.75rem',
  },
  recoveryDescription: {
    color: '#666',
    fontSize: '0.95rem',
    lineHeight: '1.5',
  },
  recoveryForm: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: '1.5rem',
  },
  emailLabel: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '500',
    color: '#333',
  },
  emailInputWrapper: {
    position: 'relative',
    marginBottom: '0.5rem',
  },
  inputIcon: {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#666',
  },
  emailInput: {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 3rem',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  },
  emailHint: {
    color: '#777',
    fontSize: '0.8rem',
  },
  sendCodeButton: {
    width: '100%',
    padding: '0.75rem',
    background: '#4361ee',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  recoveryFooter: {
    marginTop: '1.5rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #eee',
    textAlign: 'center',
  },
  rememberPassword: {
    color: '#666',
    fontSize: '0.9rem',
    marginBottom: '0.75rem',
  },
  loginInsteadButton: {
    background: 'none',
    border: '1px solid #4361ee',
    color: '#4361ee',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  infoPanel: {
    flex: '0 0 300px',
    background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
    color: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
  },
  infoContent: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  infoTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  infoList: {
    listStyle: 'none',
    padding: 0,
    marginBottom: '1.5rem',
    flex: 1,
  },
  infoItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    marginBottom: '1rem',
    fontSize: '0.85rem',
    lineHeight: '1.4',
  },
  supportSection: {
    marginTop: 'auto',
  },
  supportTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  supportText: {
    fontSize: '0.8rem',
    lineHeight: '1.4',
    opacity: 0.9,
  },
  supportLink: {
    color: '#4fc3f7',
    textDecoration: 'none',
  },
  successContainer: {
    textAlign: 'center',
    padding: '1rem 0',
  },
  successIcon: {
    marginBottom: '1rem',
  },
  successIconStyle: {
    fontSize: '48px',
    color: '#4caf50',
  },
  successTitle: {
    fontSize: '1.3rem',
    fontWeight: '600',
    color: '#4caf50',
    marginBottom: '0.75rem',
  },
  successText: {
    fontSize: '0.95rem',
    color: '#666',
    marginBottom: '0.5rem',
  },
  successInstructions: {
    fontSize: '0.85rem',
    color: '#777',
    marginBottom: '1.5rem',
    lineHeight: '1.4',
  },
  successActions: {
    display: 'flex',
    justifyContent: 'center',
  },
  backButton: {
    padding: '0.75rem 1.5rem',
    background: '#4361ee',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  fullPageFooter: {
    background: '#f1f3f9',
    padding: '1rem 2rem',
    borderTop: '1px solid #ddd',
    flexShrink: 0,
  },
  footerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  footerText: {
    color: '#666',
    fontSize: '0.8rem',
  },
  footerLinks: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  footerLink: {
    color: '#4361ee',
    textDecoration: 'none',
    fontSize: '0.8rem',
  },
  footerSeparator: {
    color: '#999',
  },
};

export default Login;