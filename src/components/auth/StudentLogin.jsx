// src/pages/StudentLogin.jsx - UPDATED
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '../../context/StudentAuthContext';

const StudentLogin = () => {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, loading: authLoading } = useStudentAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  
  const formRef = useRef(null);
  const submitButtonRef = useRef(null);

  // Load saved EMAIL only (not password) on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('student_email');
    const savedRememberMe = localStorage.getItem('student_remember_me');
    
    if (savedEmail && savedRememberMe === 'true') {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Prevent multiple submissions
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple clicks
    if (isSubmitting) {
      console.log('⚠️ Already submitting, ignoring...');
      return;
    }
    
    console.log('📝 Form submission started');
    
    // Disable submit button
    if (submitButtonRef.current) {
      submitButtonRef.current.disabled = true;
    }
    
    setError('');
    setIsSubmitting(true);

    // Basic validation
    if (!email.trim()) {
      setError('Please enter your email address');
      setIsSubmitting(false);
      if (submitButtonRef.current) submitButtonRef.current.disabled = false;
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setIsSubmitting(false);
      if (submitButtonRef.current) submitButtonRef.current.disabled = false;
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      setIsSubmitting(false);
      if (submitButtonRef.current) submitButtonRef.current.disabled = false;
      return;
    }

    try {
      console.log('🔐 Calling signIn function...');
      const result = await signIn(email, password);
      
      if (result.success) {
        console.log('✅ Login successful, saving email only');
        
        // Save ONLY email if "Remember Me" is checked (NEVER save password)
        if (rememberMe) {
          localStorage.setItem('student_email', email);
          localStorage.setItem('student_remember_me', 'true');
        } else {
          localStorage.removeItem('student_email');
          localStorage.setItem('student_remember_me', 'false');
        }
        
        // Clear password field
        setPassword('');
        
        // Navigate to dashboard
        navigate('/dashboard', { replace: true });
      } else {
        // Show error message
        console.error('❌ Login failed:', result.error);
        setError(result.error || 'Invalid email or password');
      }
    } catch (error) {
      console.error('❌ Login exception:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
      // Re-enable submit button after delay
      setTimeout(() => {
        if (submitButtonRef.current) {
          submitButtonRef.current.disabled = false;
        }
      }, 1000);
    }
  };

  // Handle input changes
  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (error) setError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setShowForgotPassword(true);
    setError('');
  };

  const handleSendVerificationCode = async (e) => {
    e.preventDefault();
    setIsSendingCode(true);
    setError('');
    
    // Validate email
    if (!recoveryEmail || !recoveryEmail.includes('@')) {
      setError('Please enter a valid email address');
      setIsSendingCode(false);
      return;
    }
    
    try {
      // Simulate API call for password recovery
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success
      setCodeSent(true);
      
      // Auto-reset after 5 seconds
      setTimeout(() => {
        setShowForgotPassword(false);
        setRecoveryEmail('');
        setCodeSent(false);
      }, 5000);
      
    } catch (error) {
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setRecoveryEmail('');
    setCodeSent(false);
    setError('');
  };

  const handleRememberMeChange = (e) => {
    const isChecked = e.target.checked;
    setRememberMe(isChecked);
    
    // Save preference immediately
    localStorage.setItem('student_remember_me', isChecked.toString());
    
    // Save or remove email based on preference
    if (isChecked && email) {
      localStorage.setItem('student_email', email);
    } else if (!isChecked) {
      localStorage.removeItem('student_email');
    }
  };

  // Show loading state
  if (authLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.loginContainer}>
      {/* Background Image */}
      <div style={styles.bgImage}>
        <img 
          src="/images/back G login.jpg" 
          alt="University Campus" 
          style={styles.bgImageImg}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.style.backgroundColor = '#1a365d';
          }}
        />
      </div>

      {/* Main Form Container */}
      <div style={styles.formContainer}>
        <div style={styles.formWrapper} ref={formRef}>
          {/* Password Recovery Modal */}
          {showForgotPassword ? (
            <div style={styles.recoveryModal}>
              <div style={styles.recoveryContent}>
                <h2 style={styles.recoveryTitle}>NLE UNIVERSITY</h2>
                <h3 style={styles.recoverySubtitle}>Student Password Recovery</h3>
                <p style={styles.recoveryText}>
                  Enter your account's email and we'll send you an email to reset the password
                </p>
                
                {!codeSent ? (
                  <>
                    <form onSubmit={handleSendVerificationCode} style={styles.recoveryForm}>
                      <div style={styles.formGroup}>
                        <label htmlFor="recoveryEmail" style={styles.label}>Your email</label>
                        <input
                          id="recoveryEmail"
                          name="recoveryEmail"
                          type="email"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          placeholder="student@nleuniversity.edu"
                          style={styles.input}
                          required
                          disabled={isSendingCode}
                          autoComplete="email"
                        />
                      </div>
                      
                      {error && (
                        <div style={styles.errorModal}>
                          <p style={styles.errorText}>
                            <i className="fa-solid fa-circle-exclamation" style={{ color: '#f39c12', marginRight: '8px' }}></i>
                            {error}
                          </p>
                        </div>
                      )}
                      
                      <button 
                        type="submit" 
                        id="sendVerificationCode"
                        style={{
                          ...styles.recoveryButton,
                          ...(isSendingCode ? styles.buttonDisabled : {})
                        }}
                        disabled={isSendingCode}
                      >
                        {isSendingCode ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
                            Sending...
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-paper-plane" style={{ marginRight: '10px' }}></i>
                            Send Verification Code
                          </>
                        )}
                      </button>
                    </form>
                  </>
                ) : (
                  <div style={styles.successMessage}>
                    <div style={styles.successIcon}>
                      <i className="fa-solid fa-check-circle"></i>
                    </div>
                    <h4 style={styles.successTitle}>Verification Code Sent!</h4>
                    <p style={styles.successText}>
                      We've sent a password reset link to <strong>{recoveryEmail}</strong>. 
                      Please check your email and follow the instructions.
                    </p>
                    <div style={styles.successNote}>
                      <i className="fa-solid fa-info-circle" style={{ marginRight: '8px', color: '#3498db' }}></i>
                      You will be redirected to login page in a few seconds...
                    </div>
                  </div>
                )}
                
                <div style={styles.recoveryFooter}>
                  <button 
                    onClick={handleBackToLogin}
                    style={styles.backToLogin}
                    id="backToLogin"
                  >
                    <i className="fa-solid fa-arrow-left" style={{ marginRight: '8px' }}></i>
                    Back to login
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Regular Login Form */
            <div style={styles.loginForm}>
              <div style={styles.logo}>
                <img 
                  src="https://cbveousvfihjgtnuvnpo.supabase.co/storage/v1/object/sign/UNIVERSITY%20IMAGES/badge.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84MjgwZTIyMC1kYTBmLTQ2ZDctYTNmNS05YTc1N2IwZTViYWMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJVTklWRVJTSVRZIElNQUdFUy9iYWRnZS5wbmciLCJpYXQiOjE3NjU4MjQzNTAsImV4cCI6NDkxOTQyNDM1MH0.5ACcLQ7wUW67uJRoqjFxg4nXjgDC_QEg1R_BBZvdmlM" 
                  alt="NLE University Logo" 
                  style={styles.logoImg}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div style="font-size: 2rem; color: #1a365d">🎓</div>';
                  }}
                />
              </div>
              <h1 style={styles.title}>NLE UNIVERSITY</h1>
              <p style={styles.subtitle}>Students Portal</p>
              
              {/* Simple Error Message Display */}
              {error && (
                <div style={styles.errorModal}>
                  <p style={styles.errorText}>
                    <i className="fa-solid fa-circle-exclamation" style={{ color: '#ff3333', marginRight: '8px' }}></i>
                    {error}
                  </p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                  <label htmlFor="studentEmail" style={styles.label}>Enter your email to login</label>
                  <input
                    id="studentEmail"
                    name="studentEmail"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="User email"
                    style={styles.input}
                    required
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label htmlFor="studentPassword" style={styles.label}>Password</label>
                  <div style={styles.passwordInputContainer}>
                    <input
                      id="studentPassword"
                      name="studentPassword"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={handlePasswordChange}
                      placeholder="User password"
                      style={styles.input}
                      required
                      disabled={isSubmitting}
                      autoComplete="current-password"
                    />
                    <button 
                      type="button"
                      id="togglePassword"
                      onClick={togglePasswordVisibility}
                      style={styles.togglePasswordButton}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <i className={`fas ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                    </button>
                  </div>
                </div>
                
                <div style={styles.loginOptions}>
                  <div style={styles.rememberMe}>
                    <input
                      id="rememberMe"
                      name="rememberMe"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={handleRememberMeChange}
                      style={styles.checkbox}
                      disabled={isSubmitting}
                    />
                    <label htmlFor="rememberMe" style={styles.checkboxLabel}>Remember me</label>
                  </div>
                  <button 
                    type="button"
                    id="forgotPassword"
                    style={styles.forgotPassword}
                    onClick={handleForgotPassword}
                    disabled={isSubmitting}
                  >
                    Forgot password?
                  </button>
                </div>
                
                <button 
                  type="submit" 
                  id="loginButton"
                  ref={submitButtonRef}
                  style={{
                    ...styles.button,
                    ...(isSubmitting ? styles.buttonDisabled : {})
                  }}
                  disabled={isSubmitting}
                  aria-label="Login to student portal"
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
                      Logging in...
                    </>
                  ) : 'Login'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  // Main Container
  loginContainer: {
    height: '100vh',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },

  // Background Image
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
    backgroundColor: '#1a365d',
  },

  bgImageImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: 0.8,
  },

  // Form Container
  formContainer: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },

  formWrapper: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: '450px',
  },

  // Login Form
  loginForm: {
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '40px',
    borderRadius: '15px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    textAlign: 'center',
    backdropFilter: 'blur(10px)',
  },

  // Password Recovery Modal
  recoveryModal: {
    background: 'rgba(255, 255, 255, 0.95)',
    padding: '40px',
    borderRadius: '15px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(10px)',
  },

  recoveryContent: {
    textAlign: 'center',
  },

  recoveryTitle: {
    color: '#1a365d',
    fontSize: '1.8rem',
    marginBottom: '0.5rem',
    fontWeight: '700',
  },

  recoverySubtitle: {
    color: '#2c3e50',
    fontSize: '1.3rem',
    marginBottom: '1.2rem',
    fontWeight: '600',
  },

  recoveryText: {
    color: '#4a5568',
    fontSize: '0.95rem',
    lineHeight: '1.5',
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #e2e8f0',
  },

  recoveryForm: {
    marginTop: '1rem',
  },

  recoveryButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#38a169',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '1rem',
  },

  // Success Message
  successMessage: {
    textAlign: 'center',
    padding: '1.5rem 0',
  },

  successIcon: {
    fontSize: '3rem',
    color: '#38a169',
    marginBottom: '1.5rem',
  },

  successTitle: {
    color: '#1a365d',
    fontSize: '1.4rem',
    marginBottom: '1rem',
    fontWeight: '600',
  },

  successText: {
    color: '#4a5568',
    fontSize: '0.95rem',
    lineHeight: '1.5',
    marginBottom: '1.5rem',
    padding: '0 1rem',
  },

  successNote: {
    backgroundColor: '#ebf8ff',
    padding: '0.8rem',
    borderRadius: '6px',
    fontSize: '0.9rem',
    color: '#2b6cb0',
    marginTop: '1.5rem',
  },

  // Recovery Footer
  recoveryFooter: {
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e2e8f0',
  },

  backToLogin: {
    background: 'none',
    border: 'none',
    color: '#0066cc',
    fontSize: '0.95rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5px 10px',
  },

  // Logo
  logo: {
    margin: '0 auto 1.5rem',
  },

  logoImg: {
    width: '120px',
    height: '120px',
    objectFit: 'cover',
    borderRadius: '5%',
    border: '3px solid #1a365d',
  },

  // Title
  title: {
    marginBottom: '0.5rem',
    color: '#1a365d',
    fontSize: '2rem',
    fontWeight: '700',
  },

  // Subtitle
  subtitle: {
    opacity: 0.7,
    marginBottom: '2rem',
    fontSize: '1.1rem',
    color: '#4a5568',
  },

  // Error Modal
  errorModal: {
    backgroundColor: 'rgba(255, 87, 87, 0.1)',
    border: '1px solid #ff5757',
    borderRadius: '8px',
    padding: '12px 15px',
    margin: '15px 0',
  },

  errorText: {
    fontWeight: '600',
    color: '#d32f2f',
    margin: 0,
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Form Elements
  form: {
    display: 'flex',
    flexDirection: 'column',
  },

  formGroup: {
    marginBottom: '1.5rem',
    textAlign: 'left',
  },

  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    color: '#2c3e50',
    fontSize: '0.95rem',
  },

  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '16px',
    transition: 'all 0.3s',
    boxSizing: 'border-box',
  },

  // Password Input Container
  passwordInputContainer: {
    position: 'relative',
  },

  togglePasswordButton: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    padding: '5px',
    fontSize: '16px',
  },

  // Login Options
  loginOptions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '15px 0 25px',
    fontSize: '14px',
  },

  rememberMe: {
    display: 'flex',
    alignItems: 'center',
  },

  checkbox: {
    marginRight: '8px',
    cursor: 'pointer',
    width: '16px',
    height: '16px',
  },

  checkboxLabel: {
    cursor: 'pointer',
    color: '#555',
    fontWeight: 'normal',
    userSelect: 'none',
  },

  forgotPassword: {
    background: 'none',
    border: 'none',
    color: '#0066cc',
    fontSize: '0.9rem',
    cursor: 'pointer',
    padding: '0',
  },

  // Button
  button: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#1a365d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },

  buttonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
    backgroundColor: '#4a5568',
  },

  // Loading State
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
  },

  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Focus styles */
  input:focus {
    border-color: #3498db;
    outline: none;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
  }
  
  button:not(:disabled):hover {
    opacity: 0.9;
  }
  
  button[type="button"]:hover {
    text-decoration: underline;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .login-form,
    .recovery-modal {
      padding: 30px 20px;
    }
    
    .form-container {
      padding: 10px;
    }
    
    .logo img {
      width: 100px;
      height: 100px;
    }
    
    h1 {
      font-size: 1.6rem;
    }
    
    .subtitle {
      font-size: 1rem;
      margin-bottom: 1.5rem;
    }
  }
  
  @media (max-width: 480px) {
    .login-form,
    .recovery-modal {
      padding: 25px 15px;
    }
    
    .recovery-title {
      font-size: 1.5rem;
    }
    
    .recovery-subtitle {
      font-size: 1.1rem;
    }
  }
`;
document.head.appendChild(style);

export default StudentLogin;