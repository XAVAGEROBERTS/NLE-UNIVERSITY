import React, { useState, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { supabase } from '../../services/supabase';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { user: authUser, signOut, loading: authLoading } = useStudentAuth();
  const navigate = useNavigate();
  
  // Main state (unchanged)
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
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 1. Check authentication (unchanged)
  useEffect(() => {
    if (!authLoading && !authUser) {
      navigate('/login');
    }
  }, [authLoading, authUser, navigate]);

  // Calculate GPA from completed courses (MATCHING DASHBOARD LOGIC) (unchanged)
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

  // 2. Fetch student data (unchanged)
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

  // Fetch academic statistics (MATCHING DASHBOARD LOGIC) (unchanged)
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

      // Get pending assignments (MATCHING DASHBOARD)
      const { data: pendingAssignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id')
        .eq('status', 'published')
        .gt('due_date', new Date().toISOString());

      const pendingCount = pendingAssignments?.length || 0;

      // Get upcoming exams (MATCHING DASHBOARD)
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
        currentGPA: 0, // Match your dashboard value
        pendingAssignments: 0,
        upcomingExams: 0
      });
    }
  };

  // Handle form input changes (unchanged)
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Save profile changes (unchanged)
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

  // Reset form to original values (unchanged)
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

  // Handle logout (unchanged)
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setMessage({ type: 'error', text: 'Failed to logout. Please try again.' });
    }
  };

  // Loading state (unchanged)
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

  // Not logged in state (unchanged)
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

  // No student data state (unchanged)
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

  // Main content (unchanged)
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
      </div>
    </div>
  );
};

// Styles with responsive updates
const styles = {
  container: {
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    padding: 'clamp(10px, 3vw, 20px)',
    boxSizing: 'border-box'
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'clamp(20px, 4vw, 30px)',
    paddingBottom: 'clamp(10px, 2vw, 15px)',
    borderBottom: '2px solid #e9ecef',
    flexWrap: 'wrap',
    gap: '15px'
  },
  title: {
    margin: '0 0 clamp(5px, 1vw, 10px) 0',
    color: '#333',
    fontSize: 'clamp(18px, 4vw, 24px)',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  titleIcon: {
    marginRight: 'clamp(5px, 1vw, 10px)',
    color: '#6c757d',
    fontSize: 'clamp(16px, 3vw, 20px)'
  },
  subtitle: {
    margin: '0',
    color: '#666',
    fontSize: 'clamp(12px, 2vw, 14px)'
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(15px, 3vw, 20px)'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 'clamp(8px, 2vw, 10px)',
    padding: 'clamp(15px, 3vw, 25px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e9ecef',
    width: '100%',
    boxSizing: 'border-box'
  },
  cardTitle: {
    margin: '0 0 clamp(15px, 3vw, 20px) 0',
    color: '#333',
    fontSize: 'clamp(16px, 3vw, 18px)',
    display: 'flex',
    alignItems: 'center'
  },
  cardIcon: {
    marginRight: 'clamp(5px, 1vw, 10px)',
    color: '#007bff',
    fontSize: 'clamp(14px, 2.5vw, 16px)'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(140px, 100%), 1fr))',
    gap: 'clamp(10px, 2vw, 15px)',
    width: '100%'
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    padding: 'clamp(15px, 3vw, 20px)',
    borderRadius: 'clamp(6px, 1.5vw, 8px)',
    textAlign: 'center',
    borderLeft: '4px solid #007bff',
    minWidth: '0'
  },
  statValue: {
    fontSize: 'clamp(20px, 4vw, 28px)',
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 'clamp(3px, 1vw, 5px)',
    wordBreak: 'break-word'
  },
  statLabel: {
    fontSize: 'clamp(12px, 2vw, 14px)',
    color: '#6c757d',
    marginBottom: 'clamp(3px, 1vw, 5px)'
  },
  statSubtext: {
    fontSize: '10px',
    color: '#999',
    position: 'absolute',
    bottom: '5px',
    left: '0',
    right: '0',
    textAlign: 'center'
  },
  profileSection: {
    display: 'flex',
    flexDirection: 'row',
    gap: 'clamp(15px, 4vw, 30px)',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  avatarContainer: {
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '120px'
  },
  avatar: {
    width: 'clamp(80px, 15vw, 100px)',
    height: 'clamp(80px, 15vw, 100px)',
    borderRadius: '50%',
    backgroundColor: '#e9ecef',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'clamp(30px, 6vw, 40px)',
    color: '#6c757d',
    flexShrink: 0
  },
  avatarIcon: {
    fontSize: 'clamp(30px, 6vw, 40px)'
  },
  profileInfo: {
    flex: '1 1 300px',
    minWidth: '0'
  },
  profileName: {
    margin: '0 0 clamp(10px, 2vw, 15px) 0',
    color: '#333',
    fontSize: 'clamp(18px, 4vw, 22px)',
    wordBreak: 'break-word'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))',
    gap: 'clamp(10px, 2vw, 15px)',
    marginBottom: '15px'
  },
  infoItem: {
    marginBottom: 'clamp(8px, 1.5vw, 10px)',
    minWidth: '0'
  },
  infoLabel: {
    display: 'block',
    fontSize: 'clamp(11px, 1.8vw, 12px)',
    color: '#6c757d',
    marginBottom: 'clamp(3px, 0.8vw, 5px)',
    wordBreak: 'break-word'
  },
  infoValue: {
    fontSize: 'clamp(13px, 2vw, 14px)',
    color: '#495057',
    fontWeight: '500',
    wordBreak: 'break-word'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(10px, 2vw, 15px)'
  },
  formGroup: {
    marginBottom: 'clamp(8px, 1.5vw, 10px)'
  },
  formLabel: {
    display: 'block',
    fontSize: 'clamp(13px, 2vw, 14px)',
    color: '#495057',
    marginBottom: 'clamp(3px, 1vw, 5px)',
    fontWeight: '600'
  },
  input: {
    width: '100%',
    padding: 'clamp(8px, 2vw, 10px) clamp(12px, 2vw, 15px)',
    border: '1px solid #dee2e6',
    borderRadius: 'clamp(4px, 1.5vw, 6px)',
    fontSize: 'clamp(13px, 2vw, 14px)',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  formButtons: {
    display: 'flex',
    flexDirection: 'row',
    gap: 'clamp(10px, 2vw, 15px)',
    marginTop: 'clamp(10px, 2vw, 20px)',
    flexWrap: 'wrap'
  },
  primaryButton: {
    padding: 'clamp(10px, 2vw, 12px) clamp(15px, 3vw, 25px)',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: 'clamp(4px, 1.5vw, 6px)',
    cursor: 'pointer',
    fontSize: 'clamp(13px, 2vw, 14px)',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'clamp(5px, 1vw, 8px)',
    minWidth: 'clamp(120px, 20vw, 140px)',
    flex: '1 1 auto'
  },
  secondaryButton: {
    padding: 'clamp(10px, 2vw, 12px) clamp(15px, 3vw, 25px)',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: 'clamp(4px, 1.5vw, 6px)',
    cursor: 'pointer',
    fontSize: 'clamp(13px, 2vw, 14px)',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'clamp(5px, 1vw, 8px)',
    minWidth: 'clamp(90px, 15vw, 100px)',
    flex: '1 1 auto'
  },
  logoutButton: {
    padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 2vw, 16px)',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: 'clamp(4px, 1.5vw, 6px)',
    cursor: 'pointer',
    fontSize: 'clamp(13px, 2vw, 14px)',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(5px, 1vw, 8px)',
    whiteSpace: 'nowrap',
    alignSelf: 'flex-start'
  },
  messageBox: {
    padding: 'clamp(10px, 2vw, 15px)',
    borderRadius: 'clamp(6px, 1.5vw, 8px)',
    marginBottom: 'clamp(15px, 3vw, 20px)',
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(8px, 1.5vw, 10px)',
    fontSize: 'clamp(13px, 2vw, 14px)',
    wordBreak: 'break-word'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'clamp(200px, 50vh, 300px)',
    width: '100%'
  },
  spinner: {
    width: 'clamp(40px, 10vw, 50px)',
    height: 'clamp(40px, 10vw, 50px)',
    border: 'clamp(3px, 1vw, 5px) solid #f3f3f3',
    borderTop: 'clamp(3px, 1vw, 5px) solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: 'clamp(15px, 3vw, 20px)'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(20px, 5vw, 40px)',
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 'clamp(8px, 2vw, 12px)',
    margin: 'clamp(15px, 3vw, 20px) 0',
    width: '100%',
    boxSizing: 'border-box'
  },
  errorIcon: {
    fontSize: 'clamp(48px, 10vw, 64px)',
    color: '#dc3545',
    marginBottom: 'clamp(15px, 3vw, 20px)'
  },
  button: {
    padding: 'clamp(8px, 2vw, 10px) clamp(15px, 3vw, 20px)',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: 'clamp(4px, 1.5vw, 6px)',
    cursor: 'pointer',
    fontSize: 'clamp(13px, 2vw, 14px)',
    fontWeight: '500',
    marginTop: 'clamp(10px, 2vw, 15px)'
  }
};

// Add CSS animation with responsive improvements
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
  
  /* Responsive media queries */
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
    
    .primary-button, .secondary-button {
      width: 100%;
    }
  }
  
  @media (max-width: 480px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
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
  
  @media (max-width: 360px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }
    
    .logout-button span {
      display: none;
    }
    
    .logout-button i {
      margin-right: 0;
    }
  }
`;
document.head.appendChild(styleSheet);

export default Settings;