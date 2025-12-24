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
    currentCGPA: 0.0,
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

  // Grade calculation functions
  const getGradePoints = (grade) => {
    if (!grade) return 0.0;
    const gradeMap = {
      'A+': 5.0,
      'A': 5.0,
      'B+': 4.5,
      'B': 4.0,
      'C+': 3.5,
      'C': 3.0,
      'D+': 2.5,
      'D': 2.0,
      'F': 0.0
    };
    return gradeMap[grade.toUpperCase()] || 0.0;
  };

  const getGradeFromMarks = (marks) => {
    if (!marks && marks !== 0) return null;
    const numericMarks = parseFloat(marks);
    if (isNaN(numericMarks)) return null;

    if (numericMarks >= 90) return 'A+';
    if (numericMarks >= 80) return 'A';
    if (numericMarks >= 75) return 'B+';
    if (numericMarks >= 70) return 'B';
    if (numericMarks >= 65) return 'C+';
    if (numericMarks >= 60) return 'C';
    if (numericMarks >= 55) return 'D+';
    if (numericMarks >= 50) return 'D';
    return 'F';
  };

  // NEW: Simplified CGPA calculation - Try multiple data sources
  const calculateCGPA = async (studentId) => {
    console.log('🔢 Starting CGPA calculation for student:', studentId);
    
    let totalPoints = 0;
    let totalCredits = 0;
    
    try {
      // OPTION 1: Try to get grades from student_courses table
      console.log('📋 Checking student_courses table...');
      const { data: studentCourses, error: scError } = await supabase
        .from('student_courses')
        .select('grade, grade_points, marks, course_id')
        .eq('student_id', studentId)
        .not('grade', 'is', null);

      if (!scError && studentCourses && studentCourses.length > 0) {
        console.log(`✅ Found ${studentCourses.length} courses with grades in student_courses`);
        
        // Get course credits for these courses
        const courseIds = studentCourses.map(sc => sc.course_id);
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('id, credits')
          .in('id', courseIds);

        if (!coursesError && courses) {
          // Create a map for quick lookup
          const courseMap = {};
          courses.forEach(course => {
            courseMap[course.id] = course.credits || 3;
          });

          // Calculate points
          studentCourses.forEach(sc => {
            const grade = sc.grade;
            const gradePoints = sc.grade_points || getGradePoints(grade);
            const credits = courseMap[sc.course_id] || 3;

            if (grade && gradePoints && credits) {
              totalPoints += gradePoints * credits;
              totalCredits += credits;
              console.log(`📚 Course: ${grade} (${gradePoints}) × ${credits} credits`);
            }
          });
        }
      } else {
        console.log('📭 No grades found in student_courses table');
      }

      // OPTION 2: Try to get grades from exam_submissions table if we still don't have data
      if (totalCredits === 0) {
        console.log('📝 Checking exam_submissions table...');
        const { data: examSubmissions, error: esError } = await supabase
          .from('exam_submissions')
          .select('grade, grade_points, total_marks_obtained, exam_id')
          .eq('student_id', studentId)
          .eq('status', 'graded');

        if (!esError && examSubmissions && examSubmissions.length > 0) {
          console.log(`✅ Found ${examSubmissions.length} graded exam submissions`);
          
          // Get exam details for credits
          const examIds = examSubmissions.map(es => es.exam_id);
          const { data: exams, error: examsError } = await supabase
            .from('examinations')
            .select('id, course_id')
            .in('id', examIds);

        if (!examsError && exams) {
          // Get course IDs
          const courseIds = exams.map(exam => exam.course_id);
          const { data: courses, error: coursesError } = await supabase
            .from('courses')
            .select('id, credits')
            .in('id', courseIds);

          if (!coursesError && courses) {
            // Create maps
            const examMap = {};
            exams.forEach(exam => {
              examMap[exam.id] = exam.course_id;
            });

            const courseMap = {};
            courses.forEach(course => {
              courseMap[course.id] = course.credits || 3;
            });

            // Calculate points
            examSubmissions.forEach(sub => {
              const grade = sub.grade || getGradeFromMarks(sub.total_marks_obtained);
              if (!grade) return;

              const gradePoints = sub.grade_points || getGradePoints(grade);
              const courseId = examMap[sub.exam_id];
              const credits = courseMap[courseId] || 3;

              if (gradePoints && credits) {
                totalPoints += gradePoints * credits;
                totalCredits += credits;
                console.log(`📝 Exam: ${grade} (${gradePoints}) × ${credits} credits`);
              }
            });
          }
        }
        } else {
          console.log('📭 No graded exam submissions found');
        }
      }

      // OPTION 3: Try to get grades directly from marks in student_courses
      if (totalCredits === 0) {
        console.log('📊 Checking for marks in student_courses...');
        const { data: studentMarks, error: smError } = await supabase
          .from('student_courses')
          .select('marks, course_id')
          .eq('student_id', studentId)
          .not('marks', 'is', null);

        if (!smError && studentMarks && studentMarks.length > 0) {
          console.log(`✅ Found ${studentMarks.length} courses with marks`);
          
          // Get course credits
          const courseIds = studentMarks.map(sm => sm.course_id);
          const { data: courses, error: coursesError } = await supabase
            .from('courses')
            .select('id, credits')
            .in('id', courseIds);

          if (!coursesError && courses) {
            const courseMap = {};
            courses.forEach(course => {
              courseMap[course.id] = course.credits || 3;
            });

            // Calculate points from marks
            studentMarks.forEach(sm => {
              const grade = getGradeFromMarks(sm.marks);
              if (!grade) return;

              const gradePoints = getGradePoints(grade);
              const credits = courseMap[sm.course_id] || 3;

              if (gradePoints && credits) {
                totalPoints += gradePoints * credits;
                totalCredits += credits;
                console.log(`📊 Marks: ${sm.marks}% → ${grade} (${gradePoints}) × ${credits} credits`);
              }
            });
          }
        }
      }

      // Calculate final CGPA
      if (totalCredits > 0) {
        const cgpa = parseFloat((totalPoints / totalCredits).toFixed(2));
        console.log(`🎓 CGPA Calculation Summary:`);
        console.log(`   Total Points: ${totalPoints}`);
        console.log(`   Total Credits: ${totalCredits}`);
        console.log(`   CGPA: ${cgpa}`);
        return cgpa;
      } else {
        console.log('📭 No academic records found for CGPA calculation');
        return 0.0;
      }

    } catch (error) {
      console.error('❌ Error calculating CGPA:', error);
      return 0.0;
    }
  };

  // 2. Fetch student data
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!authUser?.email) return;
      
      try {
        setIsLoading(true);
        
        // Fetch student record
        console.log('👤 Fetching student data for email:', authUser.email);
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('email', authUser.email)
          .single();

        if (studentError) {
          console.error('❌ Student fetch error:', studentError);
          throw studentError;
        }
        
        if (!student) throw new Error('Student not found');

        console.log('✅ Student data loaded:', student.full_name);
        setStudentData(student);
        
        // Set initial form data
        setFormData(prev => ({
          ...prev,
          phone: student.phone || ''
        }));

        // Fetch profile data (handle 406 error)
        console.log('👤 Fetching profile data...');
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', student.id)
            .maybeSingle(); // Use maybeSingle to handle no rows

          if (profileError) {
            console.log('⚠️ Profile fetch issue (may not exist):', profileError.message);
            // Create empty profile object
            setProfileData({
              user_id: student.id,
              user_type: 'student',
              address: '',
              city: '',
              country: 'Uganda',
              emergency_contact_name: '',
              emergency_contact_phone: '',
              notification_preferences: {},
              theme_preferences: {},
              privacy_settings: {}
            });
          } else if (profile) {
            console.log('✅ Profile data loaded');
            setProfileData(profile);
            setFormData(prev => ({
              ...prev,
              address: profile.address || '',
              city: profile.city || '',
              country: profile.country || 'Uganda',
              emergency_contact_name: profile.emergency_contact_name || '',
              emergency_contact_phone: profile.emergency_contact_phone || ''
            }));
          } else {
            // No profile exists
            console.log('📭 No profile found, creating empty structure');
            setProfileData({
              user_id: student.id,
              user_type: 'student',
              address: '',
              city: '',
              country: 'Uganda',
              emergency_contact_name: '',
              emergency_contact_phone: '',
              notification_preferences: {},
              theme_preferences: {},
              privacy_settings: {}
            });
          }
        } catch (profileErr) {
          console.log('⚠️ Profile fetch failed:', profileErr.message);
          // Create empty profile object on error
          setProfileData({
            user_id: student.id,
            user_type: 'student',
            address: '',
            city: '',
            country: 'Uganda',
            emergency_contact_name: '',
            emergency_contact_phone: '',
            notification_preferences: {},
            theme_preferences: {},
            privacy_settings: {}
          });
        }

        // Fetch academic statistics
        console.log('📊 Fetching academic statistics...');
        await fetchAcademicStats(student.id);

      } catch (error) {
        console.error('❌ Error fetching student data:', error);
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
      console.log('📈 Starting academic stats fetch for student:', studentId);
      
      // Get student's program
      const { data: studentInfo, error: studentError } = await supabase
        .from('students')
        .select('program_code, year_of_study, semester')
        .eq('id', studentId)
        .single();

      if (studentError) {
        console.error('❌ Student info error:', studentError);
        throw studentError;
      }

      console.log('✅ Student info loaded:', studentInfo);

      // Get ALL courses for the student's program
      const { data: programCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('program_code', studentInfo.program_code)
        .eq('is_active', true);

      if (coursesError) {
        console.error('❌ Program courses error:', coursesError);
        throw coursesError;
      }

      const totalCourses = programCourses?.length || 0;
      console.log(`📚 Total courses in program: ${totalCourses}`);

      // Get courses student is enrolled in
      const { data: enrolledCourses, error: enrolledError } = await supabase
        .from('student_courses')
        .select('*')
        .eq('student_id', studentId);

      if (enrolledError) {
        console.error('❌ Enrolled courses error:', enrolledError);
        throw enrolledError;
      }

      // Filter completed courses
      const completedCourses = enrolledCourses?.filter(c => 
        c.status === 'completed' || c.status === 'passed'
      ).length || 0;
      
      console.log(`✅ Completed courses: ${completedCourses}`);

      // Filter active/enrolled courses (not completed)
      const activeCourses = enrolledCourses?.filter(c => 
        c.status !== 'completed' && c.status !== 'passed'
      ) || [];
      const enrolledCoursesCount = activeCourses.length;
      
      console.log(`📝 Currently enrolled courses: ${enrolledCoursesCount}`);

      // Get course IDs for ACTIVE courses only
      const activeCourseIds = activeCourses.map(sc => sc.course_id) || [];
      
      // Calculate CGPA from ALL completed courses with grades
      console.log('🎓 Calculating CGPA...');
      const currentCGPA = await calculateCGPA(studentId);
      console.log(`🎓 Final CGPA: ${currentCGPA}`);

      // Get pending assignments
      let pendingCount = 0;
      if (activeCourseIds.length > 0) {
        console.log('📋 Fetching assignments...');
        const { data: allAssignments, error: assignmentsError } = await supabase
          .from('assignments')
          .select('id, course_id')
          .eq('status', 'published')
          .gt('due_date', new Date().toISOString());

        if (assignmentsError) {
          console.error('❌ Assignments error:', assignmentsError);
        } else if (allAssignments) {
          const pendingAssignments = allAssignments.filter(assignment => 
            activeCourseIds.includes(assignment.course_id)
          );
          pendingCount = pendingAssignments.length;
          console.log(`📋 Pending assignments: ${pendingCount}`);
        }
      }

      // Get upcoming exams
      let examsCount = 0;
      if (activeCourseIds.length > 0) {
        console.log('📝 Fetching exams...');
        const { data: allExams, error: examsError } = await supabase
          .from('examinations')
          .select('id, course_id')
          .eq('status', 'published')
          .gt('start_time', new Date().toISOString());

        if (examsError) {
          console.error('❌ Exams error:', examsError);
        } else if (allExams) {
          const upcomingExams = allExams.filter(exam => 
            activeCourseIds.includes(exam.course_id)
          );
          examsCount = upcomingExams.length;
          console.log(`📝 Upcoming exams: ${examsCount}`);
        }
      }

      // Set final stats
      const finalStats = {
        totalCourses: totalCourses,
        enrolledCourses: enrolledCoursesCount,
        completedCourses,
        currentCGPA: currentCGPA,
        pendingAssignments: pendingCount,
        upcomingExams: examsCount
      };

      console.log('📊 Final academic stats:', finalStats);
      setAcademicStats(finalStats);

    } catch (error) {
      console.error('❌ Error fetching academic stats:', error);
      setAcademicStats({
        totalCourses: 0,
        enrolledCourses: 0,
        completedCourses: 0,
        currentCGPA: 0.0,
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
      console.log('💾 Saving profile changes...');
      
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

      // Prepare profile data
      const profileDataToUpdate = {
        user_id: studentData.id,
        user_type: 'student',
        address: formData.address || '',
        city: formData.city || '',
        country: formData.country || 'Uganda',
        emergency_contact_name: formData.emergency_contact_name || '',
        emergency_contact_phone: formData.emergency_contact_phone || '',
        updated_at: new Date().toISOString()
      };

      // Check if profile exists
      console.log('🔍 Checking if profile exists...');
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', studentData.id)
        .maybeSingle(); // Use maybeSingle to handle no rows

      let operationError;
      
      if (checkError) {
        console.log('⚠️ Profile check error, attempting insert:', checkError.message);
        // Try to insert anyway
        profileDataToUpdate.created_at = new Date().toISOString();
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([profileDataToUpdate]);
        operationError = insertError;
      } else if (!existingProfile) {
        // Profile doesn't exist, insert new
        console.log('📝 Profile does not exist, inserting new...');
        profileDataToUpdate.created_at = new Date().toISOString();
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([profileDataToUpdate]);
        operationError = insertError;
      } else {
        // Profile exists, update it
        console.log('✏️ Profile exists, updating...');
        const { error: updateError } = await supabase
          .from('profiles')
          .update(profileDataToUpdate)
          .eq('user_id', studentData.id);
        operationError = updateError;
      }

      if (operationError) {
        console.error('❌ Profile operation error:', operationError);
        throw operationError;
      }

      // Update local state
      setProfileData(prev => ({
        ...prev,
        ...profileDataToUpdate
      }));

      setStudentData(prev => ({
        ...prev,
        phone: formData.phone
      }));

      console.log('✅ Profile saved successfully');
      setMessage({ type: 'success', text: 'Profile updated successfully!' });

      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);

    } catch (error) {
      console.error('❌ Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to update profile. Please try again.' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle change password
  const handleChangePassword = async () => {
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

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordMessage({ type: 'error', text: 'New password must be different from current password' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordMessage({ type: '', text: '' });

    try {
      const userEmail = authUser?.email || studentData?.email;
      
      if (!userEmail) {
        throw new Error('User email not found');
      }

      // Verify current password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: passwordForm.currentPassword
      });
      
      if (authError) {
        console.error('Current password verification failed:', authError);
        throw new Error('Current password is incorrect');
      }
      
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });
      
      if (updateError) {
        console.error('Password update failed:', updateError);
        throw updateError;
      }
      
      // Clear form
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

      setPasswordMessage({ 
        type: 'success', 
        text: 'Password changed successfully! You can now use your new password for future logins.' 
      });

    } catch (error) {
      console.error('Error changing password:', error);
      
      let errorMessage = error.message;
      if (error.message.includes('Current password is incorrect') || 
          error.message.includes('invalid_credentials')) {
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

  // Reset profile form
  const handleResetForm = () => {
    setFormData({
      phone: studentData?.phone || '',
      address: profileData?.address || '',
      city: profileData?.city || '',
      country: profileData?.country || 'Uganda',
      emergency_contact_name: profileData?.emergency_contact_name || '',
      emergency_contact_phone: profileData?.emergency_contact_phone || ''
    });
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
      <div className="settings-container">
        <div className="settings-header">
          <h2><i className="fas fa-cog"></i> Settings</h2>
        </div>
        <div className="settings-loading-container">
          <div className="settings-spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Not logged in state
  if (!authUser) {
    return (
      <div className="settings-container">
        <div className="settings-header">
          <h2><i className="fas fa-cog"></i> Settings</h2>
        </div>
        <div className="settings-error-container">
          <i className="fas fa-exclamation-circle settings-error-icon"></i>
          <h3>Not Logged In</h3>
          <p>Please login to access settings</p>
          <button 
            className="settings-button"
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
      <div className="settings-container">
        <div className="settings-header">
          <h2><i className="fas fa-cog"></i> Settings</h2>
        </div>
        <div className="settings-error-container">
          <i className="fas fa-exclamation-circle settings-error-icon"></i>
          <h3>No Data Available</h3>
          <p>Unable to load student information</p>
          <button 
            className="settings-button"
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
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-header-left">
          <h2 className="settings-title">
            <i className="fas fa-cog settings-title-icon"></i>
            Settings & Account
          </h2>
          <p className="settings-subtitle">
            Student ID: {studentData.student_id} | {studentData.program}
          </p>
        </div>
        <button 
          className="settings-logout-button"
          onClick={handleLogout}
        >
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`settings-message-box settings-message-${message.type}`}>
          <i className={`fas fa-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
          <span>{message.text}</span>
        </div>
      )}

      <div className="settings-content">
        {/* Academic Stats */}
        <div className="settings-card">
          <h3 className="settings-card-title">
            <i className="fas fa-chart-bar settings-card-icon"></i>
            Academic Overview
          </h3>
          
          <div className="settings-stats-grid">
            <div className="settings-stat-card">
              <div className="settings-stat-value">{academicStats.totalCourses}</div>
              <div className="settings-stat-label">Total Courses</div>
            </div>
            
            <div className="settings-stat-card">
              <div className="settings-stat-value">{academicStats.completedCourses}</div>
              <div className="settings-stat-label">Completed Courses</div>
            </div>
            
            <div className="settings-stat-card">
              <div className="settings-stat-value">{academicStats.currentCGPA.toFixed(2)}</div>
              <div className="settings-stat-label">CGPA</div>
            </div>
            
            <div className="settings-stat-card">
              <div className="settings-stat-value">{academicStats.pendingAssignments}</div>
              <div className="settings-stat-label">Pending</div>
            </div>
            
            <div className="settings-stat-card">
              <div className="settings-stat-value">{academicStats.upcomingExams}</div>
              <div className="settings-stat-label">Exams</div>
            </div>
          </div>
          
          {/* CGPA Status Indicator */}
          <div className={`settings-cgpa-status ${academicStats.currentCGPA >= 2.0 ? 'settings-cgpa-good' : 'settings-cgpa-warning'}`}>
            <i className={`fas fa-${academicStats.currentCGPA >= 2.0 ? 'graduation-cap' : 'exclamation-triangle'}`}></i>
            <span>
              {academicStats.currentCGPA >= 2.0 
                ? 'Your CGPA is in good standing!'
                : academicStats.currentCGPA > 0
                ? 'Your CGPA needs improvement. Focus on upcoming assignments and exams.'
                : 'No academic records found. CGPA will update when you complete courses.'}
            </span>
          </div>
        </div>

        {/* Profile Information */}
        <div className="settings-card">
          <h3 className="settings-card-title">
            <i className="fas fa-user settings-card-icon"></i>
            Profile Information
          </h3>
          
          <div className="settings-profile-section">
            <div className="settings-avatar-container">
              <div className="settings-avatar">
                <i className="fas fa-user-graduate settings-avatar-icon"></i>
              </div>
            </div>
            
            <div className="settings-profile-info">
              <h4 className="settings-profile-name">{studentData.full_name}</h4>
              
              <div className="settings-info-grid">
                <div className="settings-info-item">
                  <label className="settings-info-label">Email</label>
                  <div className="settings-info-value">{studentData.email}</div>
                </div>
                
                <div className="settings-info-item">
                  <label className="settings-info-label">Student ID</label>
                  <div className="settings-info-value">{studentData.student_id}</div>
                </div>
                
                <div className="settings-info-item">
                  <label className="settings-info-label">Program</label>
                  <div className="settings-info-value">{studentData.program}</div>
                </div>
                
                <div className="settings-info-item">
                  <label className="settings-info-label">Year/Semester</label>
                  <div className="settings-info-value">
                    Year {studentData.year_of_study}, Semester {studentData.semester}
                  </div>
                </div>
                
                <div className="settings-info-item">
                  <label className="settings-info-label">Academic Year</label>
                  <div className="settings-info-value">{studentData.academic_year}</div>
                </div>
                
                <div className="settings-info-item">
                  <label className="settings-info-label">Intake</label>
                  <div className="settings-info-value">{studentData.intake}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Update Information Form */}
        <div className="settings-card">
          <h3 className="settings-card-title">
            <i className="fas fa-edit settings-card-icon"></i>
            Update Personal Information
          </h3>
          
          <div className="settings-form">
            <div className="settings-form-group">
              <label className="settings-form-label">Phone Number</label>
              <input 
                type="tel" 
                id="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+256 XXX XXX XXX"
                className="settings-input"
                disabled={isSaving}
              />
            </div>
            
            <div className="settings-form-group">
              <label className="settings-form-label">Address</label>
              <input 
                type="text" 
                id="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter your residential address"
                className="settings-input"
                disabled={isSaving}
              />
            </div>
            
            <div className="settings-form-group">
              <label className="settings-form-label">City</label>
              <input 
                type="text" 
                id="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="Enter your city"
                className="settings-input"
                disabled={isSaving}
              />
            </div>
            
            <div className="settings-form-group">
              <label className="settings-form-label">Country</label>
              <select 
                id="country"
                value={formData.country}
                onChange={handleInputChange}
                className="settings-input"
                disabled={isSaving}
              >
                <option value="Uganda">Uganda</option>
                <option value="Kenya">Kenya</option>
                <option value="Tanzania">Tanzania</option>
                <option value="Rwanda">Rwanda</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="settings-form-group">
              <label className="settings-form-label">Emergency Contact Name</label>
              <input 
                type="text" 
                id="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleInputChange}
                placeholder="Name of emergency contact"
                className="settings-input"
                disabled={isSaving}
              />
            </div>
            
            <div className="settings-form-group">
              <label className="settings-form-label">Emergency Contact Phone</label>
              <input 
                type="tel" 
                id="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleInputChange}
                placeholder="Emergency contact phone number"
                className="settings-input"
                disabled={isSaving}
              />
            </div>
            
            <div className="settings-form-buttons">
              <button 
                className="settings-primary-button"
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
                className="settings-secondary-button"
                onClick={handleResetForm}
                disabled={isSaving}
              >
                <i className="fas fa-undo"></i> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="settings-card">
          <h3 className="settings-card-title">
            <i className="fas fa-key settings-card-icon"></i>
            Change Password
          </h3>

          {/* Password Change Message */}
          {passwordMessage.text && (
            <div className={`settings-message-box settings-message-${passwordMessage.type}`}>
              <i className={`fas fa-${passwordMessage.type === 'success' ? 'check-circle' : 
                               passwordMessage.type === 'warning' ? 'exclamation-triangle' : 
                               'exclamation-circle'}`}></i>
              <span>{passwordMessage.text}</span>
            </div>
          )}

          <div className="settings-form">
            {/* Current Password Field */}
            <div className="settings-form-group">
              <label className="settings-form-label">Current Password</label>
              <div className="settings-password-input-wrapper">
                <input 
                  type={showPasswords.current ? "text" : "password"}
                  id="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter your current password"
                  className="settings-password-input"
                  disabled={isChangingPassword}
                  autoComplete="current-password"
                />
                <button 
                  type="button"
                  className="settings-show-password-button"
                  onClick={() => toggleShowPassword('current')}
                  disabled={isChangingPassword}
                >
                  <i className={`fas fa-${showPasswords.current ? 'eye-slash' : 'eye'}`}></i>
                </button>
              </div>
              <div className="settings-password-hint">
                <i className="fas fa-info-circle"></i>
                <span>Default password: Test1234</span>
              </div>
            </div>
            
            {/* New Password Field */}
            <div className="settings-form-group">
              <label className="settings-form-label">New Password</label>
              <div className="settings-password-input-wrapper">
                <input 
                  type={showPasswords.new ? "text" : "password"}
                  id="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password (min. 6 characters)"
                  className="settings-password-input"
                  disabled={isChangingPassword}
                  autoComplete="new-password"
                />
                <button 
                  type="button"
                  className="settings-show-password-button"
                  onClick={() => toggleShowPassword('new')}
                  disabled={isChangingPassword}
                >
                  <i className={`fas fa-${showPasswords.new ? 'eye-slash' : 'eye'}`}></i>
                </button>
              </div>
              <div className="settings-password-hint">
                <i className="fas fa-info-circle"></i>
                <span>Password must be at least 6 characters long</span>
              </div>
            </div>
            
            {/* Confirm Password Field */}
            <div className="settings-form-group">
              <label className="settings-form-label">Confirm New Password</label>
              <div className="settings-password-input-wrapper">
                <input 
                  type={showPasswords.confirm ? "text" : "password"}
                  id="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm your new password"
                  className="settings-password-input"
                  disabled={isChangingPassword}
                  autoComplete="new-password"
                />
                <button 
                  type="button"
                  className="settings-show-password-button"
                  onClick={() => toggleShowPassword('confirm')}
                  disabled={isChangingPassword}
                >
                  <i className={`fas fa-${showPasswords.confirm ? 'eye-slash' : 'eye'}`}></i>
                </button>
              </div>
            </div>
            
            <div className="settings-form-buttons">
              <button 
                className="settings-danger-button"
                onClick={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Changing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-key"></i> Change Password
                  </>
                )}
              </button>
              
              <button 
                className="settings-secondary-button"
                onClick={handleResetPasswordForm}
                disabled={isChangingPassword}
              >
                <i className="fas fa-times"></i> Clear
              </button>
            </div>

            <div className="settings-security-note">
              <i className="fas fa-shield-alt"></i>
              <div>
                <strong>Password Security Tips:</strong>
                <ul>
                  <li>Use a mix of uppercase, lowercase, numbers, and symbols</li>
                  <li>Don't reuse passwords across different sites</li>
                  <li>Change your password regularly</li>
                  <li>Never share your password with anyone</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Base Container */
        .settings-container {
          background-color: #f8f9fa;
          min-height: 100vh;
          padding: 20px;
          box-sizing: border-box;
          width: 100%;
          overflow-x: hidden;
        }

        /* Header */
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e9ecef;
        }

        .settings-header-left {
          flex: 1;
          min-width: 250px;
        }

        .settings-title {
          margin: 0 0 5px 0;
          color: #333;
          font-size: 24px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
        }

        .settings-title-icon {
          margin-right: 10px;
          color: #6c757d;
          font-size: 20px;
        }

        .settings-subtitle {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .settings-logout-button {
          padding: 10px 20px;
          background-color: #dc3545;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .settings-logout-button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .settings-logout-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Content */
        .settings-content {
          display: flex;
          flex-direction: column;
          gap: 25px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        /* Card */
        .settings-card {
          background-color: white;
          border-radius: 12px;
          padding: 25px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          border: 1px solid #e9ecef;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .settings-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        }

        .settings-card-title {
          margin: 0 0 20px 0;
          color: #333;
          font-size: 18px;
          display: flex;
          align-items: center;
        }

        .settings-card-icon {
          margin-right: 10px;
          color: #007bff;
          font-size: 16px;
        }

        /* Stats Grid */
        .settings-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .settings-stat-card {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          text-align: center;
          border-left: 4px solid #007bff;
          transition: all 0.2s ease;
        }

        .settings-stat-card:hover {
          background-color: #e9ecef;
          transform: translateY(-2px);
        }

        .settings-stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #007bff;
          margin-bottom: 5px;
        }

        .settings-stat-label {
          font-size: 14px;
          color: #6c757d;
        }

        /* CGPA Status */
        .settings-cgpa-status {
          margin-top: 20px;
          padding: 15px;
          border-radius: 4px;
          font-size: 14px;
          display: flex;
          align-items: center;
        }

        .settings-cgpa-good {
          background-color: #d4edda;
          border-left: 4px solid #28a745;
        }

        .settings-cgpa-warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
        }

        /* Profile Section */
        .settings-profile-section {
          display: flex;
          align-items: flex-start;
          gap: 30px;
        }

        .settings-avatar-container {
          flex-shrink: 0;
        }

        .settings-avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background-color: #e9ecef;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          color: #6c757d;
          transition: all 0.2s ease;
        }

        .settings-avatar:hover {
          background-color: #dee2e6;
          transform: scale(1.05);
        }

        .settings-avatar-icon {
          font-size: 40px;
        }

        .settings-profile-info {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .settings-profile-name {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 22px;
          word-break: break-word;
        }

        .settings-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .settings-info-item {
          margin-bottom: 10px;
        }

        .settings-info-label {
          display: block;
          font-size: 12px;
          color: #6c757d;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .settings-info-value {
          font-size: 14px;
          color: #495057;
          font-weight: 500;
          word-break: break-word;
        }

        /* Form */
        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .settings-form-group {
          margin-bottom: 5px;
        }

        .settings-form-label {
          display: block;
          font-size: 14px;
          color: #495057;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .settings-input {
          width: 100%;
          padding: 12px 15px;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }

        .settings-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0,123,255,.1);
        }

        .settings-input:disabled {
          background-color: #f8f9fa;
          cursor: not-allowed;
        }

        /* Password Input */
        .settings-password-input-wrapper {
          position: relative;
          width: 100%;
        }

        .settings-password-input {
          width: 100%;
          padding: 12px 45px 12px 15px;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }

        .settings-password-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0,123,255,.1);
        }

        .settings-password-input:disabled {
          background-color: #f8f9fa;
          cursor: not-allowed;
        }

        .settings-show-password-button {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6c757d;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: color 0.2s ease;
        }

        .settings-show-password-button:hover {
          color: #007bff;
        }

        .settings-show-password-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Form Buttons */
        .settings-form-buttons {
          display: flex;
          gap: 15px;
          margin-top: 25px;
          flex-wrap: wrap;
        }

        .settings-primary-button,
        .settings-secondary-button,
        .settings-danger-button {
          padding: 14px 28px;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-width: 160px;
          transition: all 0.2s ease;
        }

        .settings-primary-button {
          background-color: #28a745;
        }

        .settings-primary-button:hover:not(:disabled) {
          background-color: #218838;
          transform: translateY(-1px);
        }

        .settings-secondary-button {
          background-color: #6c757d;
          min-width: 120px;
        }

        .settings-secondary-button:hover:not(:disabled) {
          background-color: #5a6268;
          transform: translateY(-1px);
        }

        .settings-danger-button {
          background-color: #dc3545;
          min-width: 180px;
        }

        .settings-danger-button:hover:not(:disabled) {
          background-color: #c82333;
          transform: translateY(-1px);
        }

        .settings-primary-button:disabled,
        .settings-secondary-button:disabled,
        .settings-danger-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Message Box */
        .settings-message-box {
          padding: 16px 20px;
          border-radius: 10px;
          margin-bottom: 25px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          animation: slideDown 0.3s ease;
        }

        .settings-message-success {
          background-color: #d4edda;
          color: #155724;
          border-color: #c3e6cb;
        }

        .settings-message-error {
          background-color: #f8d7da;
          color: #721c24;
          border-color: #f5c6cb;
        }

        .settings-message-warning {
          background-color: #fff3cd;
          color: #856404;
          border-color: #ffeaa7;
        }

        /* Loading State */
        .settings-loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
          text-align: center;
        }

        .settings-spinner {
          width: 50px;
          height: 50px;
          border: 5px solid #f3f3f3;
          border-top: 5px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        /* Error State */
        .settings-error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          margin: 20px 0;
        }

        .settings-error-icon {
          font-size: 64px;
          color: #dc3545;
          margin-bottom: 20px;
        }

        .settings-button {
          padding: 12px 24px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          margin-top: 15px;
          transition: all 0.2s ease;
        }

        .settings-button:hover {
          background-color: #0056b3;
          transform: translateY(-1px);
        }

        /* Password Hint */
        .settings-password-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          font-size: 12px;
          color: #6c757d;
        }

        /* Security Note */
        .settings-security-note {
          margin-top: 25px;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 10px;
          border-left: 4px solid #17a2b8;
          display: flex;
          gap: 15px;
          align-items: flex-start;
        }

        .settings-security-note ul {
          margin: 5px 0 0 0;
          padding-left: 20px;
          font-size: 13px;
          color: #666;
        }

        /* Animations */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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

        /* Responsive Styles */
        @media (max-width: 768px) {
          .settings-container {
            padding: 15px;
          }
          
          .settings-header {
            flex-direction: column;
            align-items: stretch;
            gap: 15px;
          }
          
          .settings-header-left {
            width: 100%;
          }
          
          .settings-logout-button {
            align-self: flex-end;
            margin-top: 10px;
          }
          
          .settings-card {
            padding: 20px;
          }
          
          .settings-profile-section {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 20px;
          }
          
          .settings-avatar {
            width: 90px;
            height: 90px;
          }
          
          .settings-avatar-icon {
            font-size: 36px;
          }
          
          .settings-profile-name {
            font-size: 20px;
            margin-bottom: 12px;
          }
          
          .settings-info-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
          }
          
          .settings-stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          
          .settings-stat-card {
            padding: 16px;
          }
          
          .settings-stat-value {
            font-size: 24px;
          }
          
          .settings-form-buttons {
            flex-direction: column;
          }
          
          .settings-primary-button,
          .settings-secondary-button,
          .settings-danger-button {
            width: 100%;
            min-width: auto;
            padding: 12px 24px;
          }
          
          .settings-security-note {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 16px;
          }
        }
        
        @media (max-width: 640px) {
          .settings-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .settings-info-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .settings-card {
            padding: 16px;
          }
          
          .settings-title {
            font-size: 22px;
          }
          
          .settings-card-title {
            font-size: 17px;
            margin-bottom: 16px;
          }
        }
        
        @media (max-width: 480px) {
          .settings-container {
            padding: 12px;
          }
          
          .settings-card {
            padding: 14px;
            border-radius: 10px;
          }
          
          .settings-title {
            font-size: 20px;
          }
          
          .settings-title-icon {
            font-size: 18px;
          }
          
          .settings-subtitle {
            font-size: 13px;
          }
          
          .settings-logout-button {
            width: 100%;
            justify-content: center;
            padding: 12px 20px;
          }
          
          .settings-avatar {
            width: 80px;
            height: 80px;
          }
          
          .settings-avatar-icon {
            font-size: 32px;
          }
          
          .settings-profile-name {
            font-size: 18px;
            margin-bottom: 10px;
          }
          
          .settings-stats-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          
          .settings-stat-card {
            padding: 14px;
          }
          
          .settings-stat-value {
            font-size: 22px;
          }
          
          .settings-stat-label {
            font-size: 13px;
          }
          
          .settings-info-label {
            font-size: 11px;
          }
          
          .settings-info-value {
            font-size: 13px;
          }
          
          .settings-input,
          .settings-password-input {
            padding: 10px 12px;
            font-size: 13px;
          }
          
          .settings-password-input {
            padding: 10px 40px 10px 12px;
          }
          
          .settings-show-password-button {
            font-size: 15px;
            right: 10px;
          }
          
          .settings-message-box {
            padding: 14px 16px;
            font-size: 13px;
            margin-bottom: 20px;
          }
          
          .settings-form-label {
            font-size: 13px;
            margin-bottom: 6px;
          }
          
          .settings-password-hint {
            font-size: 11px;
          }
          
          .settings-security-note {
            padding: 14px;
            margin-top: 20px;
          }
          
          .settings-security-note ul {
            font-size: 12px;
            padding-left: 18px;
          }
        }
        
        @media (max-width: 360px) {
          .settings-container {
            padding: 10px;
          }
          
          .settings-card {
            padding: 12px;
          }
          
          .settings-title {
            font-size: 18px;
          }
          
          .settings-card-title {
            font-size: 16px;
            margin-bottom: 14px;
          }
          
          .settings-avatar {
            width: 70px;
            height: 70px;
          }
          
          .settings-avatar-icon {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
};

export default Settings;