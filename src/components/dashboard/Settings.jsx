import React, { useState, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { supabase } from '../../services/supabase';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { 
    user: authUser, 
    signOut, 
    loading: authLoading,
    changePassword 
  } = useStudentAuth();
  const navigate = useNavigate();
  
  // Main state
  const [isLoading, setIsLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [academicStats, setAcademicStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    currentGPA: 0.0,
    pendingAssignments: 0,
    upcomingExams: 0
  });
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    city: '',
    country: 'Uganda',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });
  
  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Show password state
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // 1. Check authentication
  useEffect(() => {
    if (!authLoading && !authUser) {
      navigate('/login');
    }
  }, [authLoading, authUser, navigate]);

  // Calculate GPA from completed courses
  const calculateGPA = (studentCourses) => {
    if (!studentCourses || studentCourses.length === 0) return 0;
    
    const completedCourses = studentCourses.filter(
      course => course.status === 'completed' && course.grade_points
    );
    
    if (completedCourses.length === 0) return 0;
    
    const totalPoints = completedCourses.reduce(
      (sum, course) => sum + (course.grade_points * course.credits), 
      0
    );
    
    const totalCredits = completedCourses.reduce(
      (sum, course) => sum + course.credits, 
      0
    );
    
    return totalCredits > 0 ? totalPoints / totalCredits : 0;
  };

  // 2. Fetch student data
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!authUser?.email) return;
      
      try {
        setIsLoading(true);
        
        // Fetch student record
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('email', authUser.email)
          .single();

        if (studentError) throw studentError;
        if (!student) throw new Error('Student not found');

        setStudentData(student);
        
        // Set initial form data
        setFormData(prev => ({
          ...prev,
          phone: student.phone || ''
        }));

        // Fetch profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', student.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.log('Profile error:', profileError.message);
        }

        if (profile) {
          setProfileData(profile);
          setFormData(prev => ({
            ...prev,
            address: profile.address || '',
            city: profile.city || '',
            country: profile.country || 'Uganda',
            emergency_contact_name: profile.emergency_contact_name || '',
            emergency_contact_phone: profile.emergency_contact_phone || ''
          }));
        }

        // Fetch academic statistics
        await fetchAcademicStats(student.id);

      } catch (error) {
        console.error('Error fetching student data:', error);
        setMessage({ type: 'error', text: 'Failed to load data: ' + error.message });
      } finally {
        setIsLoading(false);
      }
    };

    if (authUser) {
      fetchStudentData();
    }
  }, [authUser]);

  // Fetch academic statistics
  const fetchAcademicStats = async (studentId) => {
    try {
      // Get course statistics with proper join for credits
      const { data: studentCourses, error: coursesError } = await supabase
        .from('student_courses')
        .select(`
          *,
          courses (
            id,
            credits
          )
        `)
        .eq('student_id', studentId);

      if (coursesError) throw coursesError;

      const totalCourses = studentCourses?.length || 0;
      const completedCourses = studentCourses?.filter(c => c.status === 'completed').length || 0;
      
      // Calculate GPA (same as dashboard)
      const coursesWithGrades = (studentCourses || []).map(sc => ({
        ...sc,
        credits: sc.courses?.credits || 3,
        grade_points: sc.grade_points || 0
      }));
      
      const currentGPA = calculateGPA(coursesWithGrades);

      // Get pending assignments
      const { data: pendingAssignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id')
        .eq('status', 'published')
        .gt('due_date', new Date().toISOString());

      const pendingCount = pendingAssignments?.length || 0;

      // Get upcoming exams
      const { data: upcomingExams, error: examsError } = await supabase
        .from('examinations')
        .select('id')
        .eq('status', 'published')
        .gt('start_time', new Date().toISOString());

      const examsCount = upcomingExams?.length || 0;

      setAcademicStats({
        totalCourses,
        completedCourses,
        currentGPA: parseFloat(currentGPA.toFixed(2)),
        pendingAssignments: pendingCount,
        upcomingExams: examsCount
      });

    } catch (error) {
      console.error('Error fetching academic stats:', error);
      // Set default values on error
      setAcademicStats({
        totalCourses: 0,
        completedCourses: 0,
        currentGPA: 0,
        pendingAssignments: 0,
        upcomingExams: 0
      });
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Handle password input changes
  const handlePasswordChange = (e) => {
    const { id, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [id]: value }));
    // Clear messages when user starts typing
    if (passwordMessage.text) {
      setPasswordMessage({ type: '', text: '' });
    }
  };

  // Toggle show/hide password
  const toggleShowPassword = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!authUser?.email || !studentData?.id) {
      setMessage({ type: 'error', text: 'Please login to save changes' });
      return;
    }

    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Update phone in students table
      if (formData.phone !== (studentData?.phone || '')) {
        const { error: phoneError } = await supabase
          .from('students')
          .update({ 
            phone: formData.phone,
            updated_at: new Date().toISOString()
          })
          .eq('id', studentData.id);

        if (phoneError) throw phoneError;
      }

      // Update or create profile
      const profileDataToUpdate = {
        user_id: studentData.id,
        user_type: 'student',
        address: formData.address,
        city: formData.city,
        country: formData.country,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        updated_at: new Date().toISOString()
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileDataToUpdate, {
          onConflict: 'user_id'
        });

      if (profileError) throw profileError;

      // Update local state
      setProfileData(prev => ({
        ...prev,
        ...profileDataToUpdate
      }));

      setMessage({ type: 'success', text: 'Profile updated successfully!' });

    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to update profile. Please try again.' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle password change with current password verification
  const handleChangePassword = async () => {
    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'All password fields are required' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    // Check if new password is different from current
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordMessage({ type: 'error', text: 'New password must be different from current password' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordMessage({ type: '', text: '' });

    try {
      // Use the changePassword function from context
      const result = await changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword
      );

      if (result.success) {
        // Clear password form
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        // Hide all passwords after successful change
        setShowPasswords({
          current: false,
          new: false,
          confirm: false
        });

        setPasswordMessage({ 
          type: 'success', 
          text: result.message 
        });

        // Clear success message after 5 seconds
        setTimeout(() => {
          setPasswordMessage({ type: '', text: '' });
        }, 5000);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      
      // More specific error messages
      let errorMessage = error.message;
      if (error.message.includes('Current password is incorrect') || 
          error.message.includes('Test1234')) {
        errorMessage = 'Current password is incorrect. Try "Test1234" (default password)';
      }
      
      setPasswordMessage({ 
        type: 'error', 
        text: errorMessage 
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Reset password form
  const handleResetPasswordForm = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
    setPasswordMessage({ type: '', text: '' });
  };

  // Reset profile form to original values
  const handleResetForm = () => {
    if (profileData) {
      setFormData({
        phone: studentData?.phone || '',
        address: profileData.address || '',
        city: profileData.city || '',
        country: profileData.country || 'Uganda',
        emergency_contact_name: profileData.emergency_contact_name || '',
        emergency_contact_phone: profileData.emergency_contact_phone || ''
      });
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setMessage({ type: 'error', text: 'Failed to logout. Please try again.' });
    }
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2><i className="fas fa-cog"></i> Settings</h2>
        </div>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Not logged in state
  if (!authUser) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2><i className="fas fa-cog"></i> Settings</h2>
        </div>
        <div style={styles.errorContainer}>
          <i className="fas fa-exclamation-circle" style={styles.errorIcon}></i>
          <h3>Not Logged In</h3>
          <p>Please login to access settings</p>
          <button 
            style={styles.button}
            onClick={() => navigate('/login')}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // No student data state
  if (!studentData) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2><i className="fas fa-cog"></i> Settings</h2>
        </div>
        <div style={styles.errorContainer}>
          <i className="fas fa-exclamation-circle" style={styles.errorIcon}></i>
          <h3>No Data Available</h3>
          <p>Unable to load student information</p>
          <button 
            style={styles.button}
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            <i className="fas fa-cog" style={styles.titleIcon}></i>
            Settings & Account
          </h2>
          <p style={styles.subtitle}>
            Student ID: {studentData.student_id} | {studentData.program}
          </p>
        </div>
        <button 
          style={styles.logoutButton}
          onClick={handleLogout}
        >
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>

      {/* Message Display */}
      {message.text && (
        <div style={{
          ...styles.messageBox,
          backgroundColor: message.type === 'success' ? '#d4edda' : 
                         message.type === 'error' ? '#f8d7da' : '#d1ecf1',
          color: message.type === 'success' ? '#155724' : 
                message.type === 'error' ? '#721c24' : '#0c5460',
          borderColor: message.type === 'success' ? '#c3e6cb' : 
                      message.type === 'error' ? '#f5c6cb' : '#bee5eb'
        }}>
          <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
          <span>{message.text}</span>
        </div>
      )}

      <div style={styles.content}>
        {/* Academic Stats */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <i className="fas fa-chart-bar" style={styles.cardIcon}></i>
            Academic Overview
          </h3>
          
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{academicStats.totalCourses}</div>
              <div style={styles.statLabel}>Total Courses</div>
            </div>
            
            <div style={styles.statCard}>
              <div style={styles.statValue}>{academicStats.completedCourses}</div>
              <div style={styles.statLabel}>Completed</div>
            </div>
            
            <div style={styles.statCard}>
              <div style={styles.statValue}>{academicStats.currentGPA.toFixed(2)}</div>
              <div style={styles.statLabel}>Current GPA</div>
            </div>
            
            <div style={styles.statCard}>
              <div style={styles.statValue}>{academicStats.pendingAssignments}</div>
              <div style={styles.statLabel}>Pending Assignments</div>
            </div>
            
            <div style={styles.statCard}>
              <div style={styles.statValue}>{academicStats.upcomingExams}</div>
              <div style={styles.statLabel}>Upcoming Exams</div>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <i className="fas fa-user" style={styles.cardIcon}></i>
            Profile Information
          </h3>
          
          <div style={styles.profileSection}>
            <div style={styles.avatarContainer}>
              <div style={styles.avatar}>
                <i className="fas fa-user-graduate" style={styles.avatarIcon}></i>
              </div>
            </div>
            
            <div style={styles.profileInfo}>
              <h4 style={styles.profileName}>{studentData.full_name}</h4>
              
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <label style={styles.infoLabel}>Email</label>
                  <div style={styles.infoValue}>{studentData.email}</div>
                </div>
                
                <div style={styles.infoItem}>
                  <label style={styles.infoLabel}>Student ID</label>
                  <div style={styles.infoValue}>{studentData.student_id}</div>
                </div>
                
                <div style={styles.infoItem}>
                  <label style={styles.infoLabel}>Program</label>
                  <div style={styles.infoValue}>{studentData.program}</div>
                </div>
                
                <div style={styles.infoItem}>
                  <label style={styles.infoLabel}>Year/Semester</label>
                  <div style={styles.infoValue}>
                    Year {studentData.year_of_study}, Semester {studentData.semester}
                  </div>
                </div>
                
                <div style={styles.infoItem}>
                  <label style={styles.infoLabel}>Academic Year</label>
                  <div style={styles.infoValue}>{studentData.academic_year}</div>
                </div>
                
                <div style={styles.infoItem}>
                  <label style={styles.infoLabel}>Intake</label>
                  <div style={styles.infoValue}>{studentData.intake}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Update Information Form */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <i className="fas fa-edit" style={styles.cardIcon}></i>
            Update Personal Information
          </h3>
          
          <div style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Phone Number</label>
              <input 
                type="tel" 
                id="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+256 XXX XXX XXX"
                style={styles.input}
                disabled={isSaving}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Address</label>
              <input 
                type="text" 
                id="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter your residential address"
                style={styles.input}
                disabled={isSaving}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>City</label>
              <input 
                type="text" 
                id="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Enter your city"
                style={styles.input}
                disabled={isSaving}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Country</label>
              <select 
                id="country"
                value={formData.country}
                onChange={handleInputChange}
                style={styles.input}
                disabled={isSaving}
              >
                <option value="Uganda">Uganda</option>
                <option value="Kenya">Kenya</option>
                <option value="Tanzania">Tanzania</option>
                <option value="Rwanda">Rwanda</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Emergency Contact Name</label>
              <input 
                type="text" 
                id="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleInputChange}
                placeholder="Name of emergency contact"
                style={styles.input}
                disabled={isSaving}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Emergency Contact Phone</label>
              <input 
                type="tel" 
                id="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleInputChange}
                placeholder="Emergency contact phone number"
                style={styles.input}
                disabled={isSaving}
              />
            </div>
            
            <div style={styles.formButtons}>
              <button 
                style={styles.primaryButton}
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i> Save Changes
                  </>
                )}
              </button>
              
              <button 
                style={styles.secondaryButton}
                onClick={handleResetForm}
                disabled={isSaving}
              >
                <i className="fas fa-undo"></i> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Change Password Section */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            <i className="fas fa-key" style={styles.cardIcon}></i>
            Change Password
          </h3>

          {/* Password Change Message */}
          {passwordMessage.text && (
            <div style={{
              ...styles.messageBox,
              backgroundColor: passwordMessage.type === 'success' ? '#d4edda' : 
                            passwordMessage.type === 'error' ? '#f8d7da' : 
                            passwordMessage.type === 'warning' ? '#fff3cd' : '#d1ecf1',
              color: passwordMessage.type === 'success' ? '#155724' : 
                    passwordMessage.type === 'error' ? '#721c24' : 
                    passwordMessage.type === 'warning' ? '#856404' : '#0c5460',
              borderColor: passwordMessage.type === 'success' ? '#c3e6cb' : 
                          passwordMessage.type === 'error' ? '#f5c6cb' : 
                          passwordMessage.type === 'warning' ? '#ffeaa7' : '#bee5eb',
              marginBottom: '20px'
            }}>
              <i className={`fas fa-${passwordMessage.type === 'success' ? 'check-circle' : 
                               passwordMessage.type === 'warning' ? 'exclamation-triangle' : 
                               'exclamation-circle'}`}></i>
              <span>{passwordMessage.text}</span>
            </div>
          )}

          <div style={styles.form}>
            {/* Current Password Field */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Current Password</label>
              <div style={styles.passwordInputWrapper}>
                <input 
                  type={showPasswords.current ? "text" : "password"}
                  id="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter your current password"
                  style={styles.passwordInput}
                  disabled={isChangingPassword}
                  autoComplete="current-password"
                />
                <button 
                  type="button"
                  style={styles.showPasswordButton}
                  onClick={() => toggleShowPassword('current')}
                  disabled={isChangingPassword}
                >
                  <i className={`fas fa-${showPasswords.current ? 'eye-slash' : 'eye'}`}></i>
                </button>
              </div>
              <div style={styles.passwordHint}>
                <i className="fas fa-info-circle"></i>
                <span>Default password for all students is "Test1234"</span>
              </div>
            </div>
            
            {/* New Password Field */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>New Password</label>
              <div style={styles.passwordInputWrapper}>
                <input 
                  type={showPasswords.new ? "text" : "password"}
                  id="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password (min. 6 characters)"
                  style={styles.passwordInput}
                  disabled={isChangingPassword}
                  autoComplete="new-password"
                />
                <button 
                  type="button"
                  style={styles.showPasswordButton}
                  onClick={() => toggleShowPassword('new')}
                  disabled={isChangingPassword}
                >
                  <i className={`fas fa-${showPasswords.new ? 'eye-slash' : 'eye'}`}></i>
                </button>
              </div>
              <div style={styles.passwordHint}>
                <i className="fas fa-info-circle"></i>
                <span>Password must be at least 6 characters long</span>
              </div>
            </div>
            
            {/* Confirm Password Field */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Confirm New Password</label>
              <div style={styles.passwordInputWrapper}>
                <input 
                  type={showPasswords.confirm ? "text" : "password"}
                  id="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm your new password"
                  style={styles.passwordInput}
                  disabled={isChangingPassword}
                  autoComplete="new-password"
                />
                <button 
                  type="button"
                  style={styles.showPasswordButton}
                  onClick={() => toggleShowPassword('confirm')}
                  disabled={isChangingPassword}
                >
                  <i className={`fas fa-${showPasswords.confirm ? 'eye-slash' : 'eye'}`}></i>
                </button>
              </div>
            </div>
            
            <div style={styles.formButtons}>
              <button 
                style={styles.dangerButton}
                onClick={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Changing Password...
                  </>
                ) : (
                  <>
                    <i className="fas fa-key"></i> Change Password
                  </>
                )}
              </button>
              
              <button 
                style={styles.secondaryButton}
                onClick={handleResetPasswordForm}
                disabled={isChangingPassword}
              >
                <i className="fas fa-times"></i> Clear
              </button>
            </div>

            <div style={styles.securityNote}>
              <i className="fas fa-shield-alt"></i>
              <div>
                <strong>Password Change Instructions:</strong>
                <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px', fontSize: '13px', color: '#666' }}>
        
                  <li>If you don't remember your current password, try the default</li>
                  <li>New password must be at least 6 characters long</li>

                  <li>You will need to use your new password on next login</li>
                  <li>For security reasons, never share your password with anyone</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    padding: '20px',
    boxSizing: 'border-box'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e9ecef',
    flexWrap: 'wrap',
    gap: '15px'
  },
  title: {
    margin: '0 0 5px 0',
    color: '#333',
    fontSize: '24px',
    display: 'flex',
    alignItems: 'center'
  },
  titleIcon: {
    marginRight: '10px',
    color: '#6c757d',
    fontSize: '20px'
  },
  subtitle: {
    margin: '0',
    color: '#666',
    fontSize: '14px'
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e9ecef'
  },
  cardTitle: {
    margin: '0 0 20px 0',
    color: '#333',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center'
  },
  cardIcon: {
    marginRight: '10px',
    color: '#007bff',
    fontSize: '16px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '15px'
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
    borderLeft: '4px solid #007bff'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: '5px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6c757d'
  },
  profileSection: {
    display: 'flex',
    gap: '30px',
    alignItems: 'flex-start'
  },
  avatarContainer: {
    flexShrink: 0
  },
  avatar: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: '#e9ecef',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px',
    color: '#6c757d'
  },
  avatarIcon: {
    fontSize: '40px'
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    margin: '0 0 15px 0',
    color: '#333',
    fontSize: '22px'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px'
  },
  infoItem: {
    marginBottom: '10px'
  },
  infoLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#6c757d',
    marginBottom: '5px'
  },
  infoValue: {
    fontSize: '14px',
    color: '#495057',
    fontWeight: '500'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  formGroup: {
    marginBottom: '10px'
  },
  formLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#495057',
    marginBottom: '5px',
    fontWeight: '600'
  },
  input: {
    width: '100%',
    padding: '10px 15px',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  passwordInputWrapper: {
    position: 'relative',
    width: '100%'
  },
  passwordInput: {
    width: '100%',
    padding: '10px 40px 10px 15px',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  showPasswordButton: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#6c757d',
    cursor: 'pointer',
    padding: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px'
  },
  formButtons: {
    display: 'flex',
    gap: '15px',
    marginTop: '20px'
  },
  primaryButton: {
    padding: '12px 25px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '140px'
  },
  secondaryButton: {
    padding: '12px 25px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '100px'
  },
  dangerButton: {
    padding: '12px 25px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '160px'
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap'
  },
  messageBox: {
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px'
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
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    margin: '20px 0'
  },
  errorIcon: {
    fontSize: '64px',
    color: '#dc3545',
    marginBottom: '20px'
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    marginTop: '15px'
  },
  passwordHint: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '5px',
    fontSize: '12px',
    color: '#6c757d'
  },
  securityNote: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    borderLeft: '4px solid #17a2b8',
    display: 'flex',
    gap: '15px'
  }
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  button:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
    transition: all 0.2s ease;
  }
  
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  input:focus, select:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0,123,255,.1);
    transition: all 0.2s ease;
  }
  
  input:disabled, select:disabled {
    background-color: #f8f9fa;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    .header {
      flex-direction: column;
      align-items: stretch;
    }
    
    .logout-button {
      align-self: flex-end;
      margin-top: 10px;
    }
    
    .profile-section {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    
    .avatar-container {
      margin-bottom: 15px;
    }
    
    .form-buttons {
      flex-direction: column;
    }
    
    .primary-button, .secondary-button, .danger-button {
      width: 100%;
    }
    
    .security-note {
      flex-direction: column;
      text-align: center;
    }
    
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  @media (max-width: 480px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }
    
    .info-grid {
      grid-template-columns: 1fr;
    }
    
    .card {
      padding: 15px;
    }
    
    .header {
      gap: 10px;
    }
    
    .title {
      font-size: 20px;
    }
  }
`;
document.head.appendChild(styleSheet);

export default Settings;