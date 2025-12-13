import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '../../context/StudentAuthContext';

const StudentLogin = () => {
  const navigate = useNavigate();
  const { signIn, isAuthenticated, loading } = useStudentAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  // Load saved credentials on component mount
  useEffect(() => {
    const savedCredentials = localStorage.getItem('student_credentials');
    const savedRememberMe = localStorage.getItem('student_remember_me');
    
    if (savedCredentials && savedRememberMe === 'true') {
      try {
        const credentials = JSON.parse(savedCredentials);
        setEmail(credentials.email || '');
        setPassword(credentials.password || '');
        setRememberMe(true);
      } catch (error) {
        console.error('Error loading saved credentials:', error);
      }
    } else if (savedRememberMe === 'false') {
      setRememberMe(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Handle email change
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  // Handle password change
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (!email.trim()) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      setIsLoading(false);
      return;
    }

    // Password length validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn(email, password);
      
      if (result.success) {
        // Save credentials if "Remember Me" is checked
        if (rememberMe) {
          const credentials = {
            email: email,
            password: password
          };
          localStorage.setItem('student_credentials', JSON.stringify(credentials));
          localStorage.setItem('student_remember_me', 'true');
        } else {
          clearSavedCredentials();
        }
        
        navigate('/dashboard');
      } else {
        // Show simple error message
        setError('Incorrect credentials');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
      
    } catch (err) {
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
    
    // Clear credentials if user unchecks "Remember Me"
    if (!isChecked) {
      clearSavedCredentials();
    }
  };

  const clearSavedCredentials = () => {
    localStorage.removeItem('student_credentials');
    setEmail('');
    setPassword('');
    setRememberMe(false);
    localStorage.setItem('student_remember_me', 'false');
  };

  if (loading) {
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
        />
      </div>

      {/* Main Form Container */}
      <div style={styles.formContainer}>
        <div style={styles.formWrapper}>
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
                        <label style={styles.label}>Your email</label>
                        <input
                          type="email"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          placeholder="student@nleuniversity.edu"
                          style={styles.input}
                          required
                          disabled={isSendingCode}
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
                  <a 
                    href="#" 
                    onClick={handleBackToLogin}
                    style={styles.backToLogin}
                  >
                    <i className="fa-solid fa-arrow-left" style={{ marginRight: '8px' }}></i>
                    Back to login
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* Regular Login Form */
            <div style={styles.loginForm}>
              <div style={styles.logo}>
                <img 
                  src="/images/badge.png" 
                  alt="NLE University Logo" 
                  style={styles.logoImg}
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
                  <label style={styles.label}>Enter your email to login</label>
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="student@nleuniversity.edu"
                    style={styles.input}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Password</label>
                  <div style={styles.passwordInputContainer}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={handlePasswordChange}
                      placeholder="Enter your password"
                      style={styles.input}
                      required
                      disabled={isLoading}
                    />
                    <i 
                      className={`fas ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`}
                      style={styles.togglePassword}
                      onClick={togglePasswordVisibility}
                    ></i>
                  </div>
                </div>
                
                <div style={styles.loginOptions}>
                  <div style={styles.rememberMe}>
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={handleRememberMeChange}
                      style={styles.checkbox}
                    />
                    <label htmlFor="rememberMe" style={styles.checkboxLabel}>Remember me</label>
                  </div>
                  <a 
                    href="#" 
                    style={styles.forgotPassword}
                    onClick={handleForgotPassword}
                  >
                    Forgot password?
                  </a>
                </div>
                
                <button 
                  type="submit" 
                  style={{
                    ...styles.button,
                    ...(isLoading ? styles.buttonDisabled : {})
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
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
  },

  bgImageImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  // Form Container
  formContainer: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '15%',
  },

  formWrapper: {
    position: 'relative',
    zIndex: 2,
  },

  // Login Form
  loginForm: {
    background: 'white',
    padding: '2rem',
    borderRadius: '10px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    width: '400px',
    textAlign: 'center',
  },

  // Password Recovery Modal
  recoveryModal: {
    background: 'white',
    padding: '2.5rem',
    borderRadius: '10px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
    width: '450px',
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
    padding: '1rem',
    backgroundColor: '#38a169',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
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
    color: '#0066cc',
    textDecoration: 'none',
    fontSize: '0.95rem',
    transition: 'color 0.3s',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Logo
  logo: {
    margin: '0 auto 1.5rem',
  },

  logoImg: {
    width: '200px',
    height: '100px',
    borderRadius: '50%',
    objectFit: 'cover',
  },

  // Title
  title: {
    marginBottom: '1.5rem',
    color: '#2c3e50',
    fontSize: '1.8rem',
  },

  // Subtitle
  subtitle: {
    opacity: 0.5,
    lineHeight: 1,
    marginBottom: '4rem',
    fontSize: '1.1rem',
  },

  // Error Modal - Simple
  errorModal: {
    backgroundColor: 'rgba(255, 87, 87, 0.1)',
    border: '1px solid #ff5757',
    borderRadius: '6px',
    padding: '10px 15px',
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
    padding: '0.8rem',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '1rem',
    transition: 'border 0.3s',
  },

  // Password Input Container
  passwordInputContainer: {
    position: 'relative',
  },

  togglePassword: {
    position: 'absolute',
    right: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    cursor: 'pointer',
    color: '#666',
    zIndex: 2,
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
  },

  checkboxLabel: {
    cursor: 'pointer',
    color: '#555',
    fontWeight: 'normal',
  },

  forgotPassword: {
    color: '#0066cc',
    textDecoration: 'none',
    fontSize: '0.9rem',
    transition: 'color 0.3s',
    cursor: 'pointer',
  },

  // Button
  button: {
    width: '100%',
    padding: '0.8rem',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },

  buttonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
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
  
  /* Hover effects */
  input:focus {
    border-color: #3498db;
    outline: none;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
  }
  
  button:not(:disabled):hover {
    background-color: #2980b9;
  }
  
  .recovery-button:not(:disabled):hover {
    background-color: #2f855a;
  }
  
  a:hover {
    text-decoration: underline;
  }
  
  /* Responsive */
  @media (max-width: 1024px) {
    .form-container {
      padding-left: 10%;
    }
  }
  
  @media (max-width: 768px) {
    .form-container {
      padding-left: 5%;
      justify-content: center;
    }
    
    .login-form,
    .recovery-modal {
      width: 90%;
      max-width: 400px;
      margin: 0 auto;
    }
  }
  
  @media (max-width: 480px) {
    .login-form,
    .recovery-modal {
      padding: 1.5rem;
    }
    
    .logo img {
      width: 150px;
      height: 75px;
    }
    
    h1,
    .recovery-title {
      font-size: 1.5rem;
    }
    
    .recovery-subtitle {
      font-size: 1.1rem;
    }
    
    .subtitle {
      font-size: 1rem;
      margin-bottom: 3rem;
    }
    
    .success-icon {
      font-size: 2.5rem;
    }
    
    .success-title {
      font-size: 1.2rem;
    }
  }
`;
document.head.appendChild(style);

export default StudentLogin;