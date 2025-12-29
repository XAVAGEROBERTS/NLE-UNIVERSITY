// components/Examinations.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { checkExamClearance } from '../../utils/clearanceUtils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './Examinations.css';

const Examinations = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [clearanceStatus, setClearanceStatus] = useState(null);
  const { user } = useStudentAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [showClearanceModal, setShowClearanceModal] = useState(false);
  const [checkingClearance, setCheckingClearance] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'upcoming', 'graded', 'submitted'
  
  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (user?.email) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get student data
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          id, 
          full_name, 
          student_id, 
          program, 
          program_code,
          year_of_study, 
          semester, 
          academic_year, 
          program_id, 
          email, 
          phone,
          department_code
        `)
        .eq('email', user.email)
        .single();

      if (studentError) throw new Error(`Student data error: ${studentError.message}`);
      if (!student) throw new Error('Student not found');

      console.log('Student data loaded:', student);
      setStudentInfo(student);

      // Check exam clearance
      setCheckingClearance(true);
      const clearance = await checkExamClearance(
        student.id,
        student.academic_year || '2025/2029',
        student.semester || 1
      );
      
      console.log('Clearance result:', clearance);
      setClearanceStatus(clearance);
      setCheckingClearance(false);

      // Always fetch exams, but mark if not cleared
      await fetchExams(student);

      // Show clearance modal if not cleared
      if (clearance && !clearance.cleared) {
        setTimeout(() => {
          setShowClearanceModal(true);
        }, 1000);
      }

    } catch (error) {
      console.error('Error fetching student data:', error);
      setError(`Failed to load examinations: ${error.message}`);
      setExams([]);
      setCheckingClearance(false);
    } finally {
      setLoading(false);
    }
  };
  

  const fetchExams = async (student) => {
    try {
      // Fetch student's enrolled courses - ONLY non-completed courses
      const { data: studentCourses, error: coursesError } = await supabase
        .from('student_courses')
        .select('course_id, status')
        .eq('student_id', student.id)
        .neq('status', 'completed');

      if (coursesError) {
        console.error('Courses error:', coursesError);
        throw new Error(`Courses error: ${coursesError.message}`);
      }

      const courseIds = studentCourses?.map(sc => sc.course_id) || [];
      console.log('Enrolled course IDs:', courseIds);

      if (courseIds.length === 0) {
        setExams([]);
        return;
      }

      // Fetch exams with cohort targeting
      let query = supabase
        .from('examinations')
        .select(`
          *,
          courses (id, course_code, course_name, credits)
        `)
        .in('course_id', courseIds)
        .in('status', ['scheduled', 'published', 'active', 'completed'])
        .order('start_time', { ascending: true });

      // Apply cohort targeting
      const cleanAY = (student.academic_year || '2025/2029').trim().replace(/\s/g, '');
      
      if (cleanAY || student.year_of_study || student.semester || student.program_id) {
        const orConditions = [];
        
        if (cleanAY) {
          orConditions.push(`target_academic_year.eq.${cleanAY}`);
          orConditions.push(`target_academic_year.is.null`);
        }
        
        if (student.year_of_study != null) {
          orConditions.push(`target_year_of_study.eq.${student.year_of_study}`);
          orConditions.push(`target_year_of_study.is.null`);
        }
        
        if (student.semester != null) {
          orConditions.push(`target_semester.eq.${student.semester}`);
          orConditions.push(`target_semester.is.null`);
        }
        
        if (student.program_id) {
          orConditions.push(`target_program_id.eq.${student.program_id}`);
          orConditions.push(`target_program_id.is.null`);
        }
        
        if (orConditions.length > 0) {
          query = query.or(orConditions.join(','));
        }
      }

      const { data: examsData, error: examsError } = await query;
      
      if (examsError) {
        console.error('Exams error:', examsError);
        throw new Error(`Exams error: ${examsError.message}`);
      }

      console.log('Exams found:', examsData?.length || 0);

      // Fetch student's exam submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('student_id', student.id);

      if (submissionsError) {
        console.error('Submissions error:', submissionsError);
      }

      // Process exams
      const processedExams = examsData ? examsData.map(exam => {
        const studentSubmission = submissionsData?.find(sub => sub.exam_id === exam.id);
        const now = new Date();
        const startTime = new Date(exam.start_time);
        const endTime = new Date(exam.end_time);

        const isActiveByTime = now >= startTime && now <= endTime;
        const isUpcoming = now < startTime;
        const isEndedByTime = now > endTime;
        
        // Determine if it's an online exam
        const isOnlineExam = exam.exam_type === 'online' || exam.exam_type === 'written_online';
        
        // Submission status
        const hasSubmission = !!studentSubmission;
        
        // Check submission status
        let isSubmitted = false;
        let isGraded = false;
        
        if (studentSubmission) {
          const status = studentSubmission.status?.toLowerCase();
          
          isSubmitted = status === 'submitted' || studentSubmission.submitted_at !== null;
          isGraded = status === 'graded' || studentSubmission.graded_at !== null;
        }
        
        const isStartedButNotSubmitted = studentSubmission && studentSubmission.status === 'started' && !isSubmitted;
        
        // For resumed exams: If exam was started but not submitted
        const canResume = isStartedButNotSubmitted && (isActiveByTime || !isEndedByTime);
        
        // Can start only if: no submission AND exam is active AND it's online
        const canStart = !hasSubmission && isActiveByTime && isOnlineExam;
        
        // Final status determination
        let finalStatus = 'upcoming';
        let showAsActive = false;
        
        if (isGraded) {
          finalStatus = 'graded';
        } else if (isSubmitted) {
          finalStatus = 'submitted';
        } else if (canResume) {
          finalStatus = 'active';
          showAsActive = true;
        } else if (isActiveByTime) {
          finalStatus = 'active';
          showAsActive = true;
        } else if (isUpcoming) {
          finalStatus = 'upcoming';
        } else if (isEndedByTime) {
          finalStatus = 'ended';
        }

        return {
          id: exam.id,
          title: exam.title === 'NA' ? `${exam.courses?.course_code || 'Exam'} Final` : exam.title,
          description: exam.description === 'NA' ? 'Final examination for the course' : exam.description,
          courseId: exam.course_id,
          courseCode: exam.courses?.course_code || 'N/A',
          courseName: exam.courses?.course_name || 'N/A',
          courseCredits: exam.courses?.credits || 0,
          examType: exam.exam_type,
          startTime: exam.start_time,
          endTime: exam.end_time,
          duration: exam.duration_minutes,
          totalMarks: exam.total_marks,
          passingMarks: exam.passing_marks,
          location: exam.location || exam.venue || 'TBA',
          supervisor: exam.supervisor,
          instructions: exam.instructions === 'NA' ? 'Complete all questions within the given time frame.' : exam.instructions,
          status: finalStatus,
          submitted: isSubmitted,
          graded: isGraded,
          submission: studentSubmission || null,
          isActive: showAsActive,
          isUpcoming: isUpcoming,
          isEnded: isEndedByTime,
          canStart: canStart,
          canResume: canResume,
          hasIncompleteSubmission: isStartedButNotSubmitted,
          isOnline: isOnlineExam,
          targetDetails: {
            academicYear: exam.target_academic_year,
            yearOfStudy: exam.target_year_of_study,
            semester: exam.target_semester,
            programId: exam.target_program_id
          }
        };
      }) : [];

      console.log('Processed exams:', processedExams);
      setExams(processedExams);
    } catch (error) {
      console.error('Error fetching exams:', error);
      setError(`Failed to load examinations: ${error.message}`);
      setExams([]);
    }
  };

  const handleStartExam = (exam) => {
    // Check clearance first
    if (clearanceStatus && !clearanceStatus.cleared) {
      setShowClearanceModal(true);
      return;
    }

    // Check if exam is online
    const isOnlineExam = exam.isOnline;
    
    if (!isOnlineExam) {
      alert('This is a physical exam. Please attend at the specified venue.');
      return;
    }

    // Navigate to the exam taking page
    navigate(`/examinations/take/${exam.id}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + ' EAT';
  };

  const getExamStatus = (exam) => {
    if (exam.graded) return 'graded';
    if (exam.submitted) return 'submitted';
    if (exam.status) return exam.status;
    if (exam.hasIncompleteSubmission) return 'active';
    if (exam.isActive) return 'active';
    if (exam.isUpcoming) return 'upcoming';
    if (exam.isEnded) return 'ended';
    return 'upcoming';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'graded': return '#6f42c1';
      case 'submitted': return '#28a745';
      case 'incomplete': return '#ffc107';
      case 'active': return '#dc3545';
      case 'upcoming': return '#007bff';
      case 'ended': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getTimeUntilStart = (exam) => {
    const now = new Date();
    const startTime = new Date(exam.startTime);
    
    if (now >= startTime) return 'Started';
    
    const diffSeconds = Math.floor((startTime - now) / 1000);
    const days = Math.floor(diffSeconds / (3600 * 24));
    const hours = Math.floor((diffSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const navigateToResults = (exam) => {
    navigate(`/examinations/results/${exam.id}`, {
      state: {
        examId: exam.id,
        courseCode: exam.courseCode,
        courseName: exam.courseName,
        examTitle: exam.title,
        submission: exam.submission
      }
    });
  };

  const refreshExams = () => {
    fetchStudentData();
  };

  const recheckClearance = async () => {
    if (!studentInfo) return;
    
    setCheckingClearance(true);
    const clearance = await checkExamClearance(
      studentInfo.id,
      studentInfo.academic_year || '2025/2029',
      studentInfo.semester || 1
    );
    
    setClearanceStatus(clearance);
    setCheckingClearance(false);
    
    if (clearance && clearance.cleared) {
      setShowClearanceModal(false);
    }
  };

  const downloadExamPermit = async () => {
    try {
      if (!studentInfo) {
        alert('Student information not available.');
        return;
      }

      // Check clearance before allowing download
      if (clearanceStatus && !clearanceStatus.cleared) {
        setShowClearanceModal(true);
        return;
      }

      // Filter exams for the permit (only upcoming and active)
      const permitExams = exams.filter(exam => 
        !exam.submitted && 
        !exam.graded && 
        (exam.status === 'upcoming' || exam.status === 'active')
      );

      const permitElement = document.createElement('div');
      permitElement.id = 'exam-permit-content';
      permitElement.style.cssText = `
        width: 800px;
        padding: 40px;
        background: white;
        font-family: Arial, sans-serif;
        color: #333;
      `;

      permitElement.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px;">
          <h1 style="color: #007bff; margin-bottom: 10px;">UNIVERSITY EXAMINATION PERMIT</h1>
          <h2 style="color: #333; margin: 0;">Academic Year: ${studentInfo.academic_year || '2025/2029'}</h2>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
          <div>
            <h3 style="color: #495057; margin-bottom: 15px; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">
              STUDENT INFORMATION
            </h3>
            <div style="margin-bottom: 10px;">
              <strong>Full Name:</strong> ${studentInfo.full_name}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Student ID:</strong> ${studentInfo.student_id}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Program:</strong> ${studentInfo.program}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Program Code:</strong> ${studentInfo.program_code || 'N/A'}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Year of Study:</strong> ${studentInfo.year_of_study}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Semester:</strong> ${studentInfo.semester}
            </div>
          </div>
          
          <div>
            <h3 style="color: #495057; margin-bottom: 15px; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">
              EXAMINATION CLEARANCE
            </h3>
            <div style="margin-bottom: 10px;">
              <strong>Clearance Status:</strong> 
              <span style="color: ${clearanceStatus?.cleared ? '#28a745' : '#dc3545'}; font-weight: bold;">
                ${clearanceStatus?.cleared ? 'CLEARED ✓' : 'NOT CLEARED ✗'}
              </span>
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Financial Status:</strong> ${clearanceStatus?.financial?.notes || 'Checking...'}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Attendance Status:</strong> ${clearanceStatus?.attendance?.notes || 'Checking...'}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Issued Date:</strong> ${new Date().toLocaleDateString()}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Valid Until:</strong> End of Semester
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #495057; margin-bottom: 15px; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">
            SCHEDULED EXAMINATIONS (${permitExams.length})
          </h3>
          ${permitExams.length > 0 ? `
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Course</th>
                  <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Exam Title</th>
                  <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Date & Time</th>
                  <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Location</th>
                  <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${permitExams.map(exam => `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${exam.courseCode}</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${exam.title}</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${formatDate(exam.startTime)}</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">${exam.location || 'TBA'}</td>
                    <td style="padding: 10px; border: 1px solid #dee2e6;">
                      <span style="
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        font-weight: bold;
                        background-color: ${getStatusColor(getExamStatus(exam))};
                        color: white;
                      ">
                        ${getExamStatus(exam).toUpperCase()}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <div style="text-align: center; padding: 40px; background-color: #f8f9fa; border-radius: 8px;">
              <i class="fas fa-clipboard-list" style="font-size: 48px; color: #6c757d; margin-bottom: 20px;"></i>
              <p>No upcoming exams scheduled for download.</p>
            </div>
          `}
        </div>
        
        <div style="
          padding: 20px;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          margin-bottom: 30px;
        ">
          <h4 style="color: #495057; margin-bottom: 10px;">IMPORTANT INSTRUCTIONS</h4>
          <ul style="margin: 0; padding-left: 20px; color: #666;">
            <li>Bring this permit and student ID to all examinations</li>
            <li>Arrive at least 30 minutes before exam start time</li>
            <li>No electronic devices allowed unless specified</li>
            <li>Follow all examination rules and regulations</li>
            <li>Report any issues to the examination supervisor immediately</li>
          </ul>
        </div>
        
        <div style="text-align: center; border-top: 2px solid #007bff; padding-top: 20px;">
          <div style="margin-bottom: 15px; color: #666;">
            <strong>Registrar's Office</strong><br/>
            University Examination Department
          </div>
          <div style="color: #999; font-size: 12px;">
            Generated on: ${new Date().toLocaleString()}<br/>
            Permit ID: PERMIT-${studentInfo.student_id}-${Date.now().toString().slice(-8)}
          </div>
        </div>
      `;

      document.body.appendChild(permitElement);

      // Generate PDF
      const canvas = await html2canvas(permitElement, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      
      const fileName = `Exam_Permit_${studentInfo.student_id}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      // Clean up
      document.body.removeChild(permitElement);

      alert('Examination permit downloaded successfully!');
    } catch (error) {
      console.error('Error generating permit:', error);
      alert('Failed to generate examination permit. Please try again.');
    }
  };

  // Filter exams based on active tab
  const filteredExams = exams.filter(exam => {
    switch(activeTab) {
      case 'upcoming':
        return exam.status === 'upcoming' || exam.isUpcoming;
      case 'active':
        return exam.status === 'active' || exam.canStart || exam.canResume;
      case 'submitted':
        return exam.submitted && !exam.graded;
      case 'graded':
        return exam.graded;
      default:
        return true; // 'all'
    }
  });

  // Render Clearance Modal
  const renderClearanceModal = () => {
    if (!showClearanceModal || !clearanceStatus) return null;

    return (
      <div className="clearance-modal-overlay">
        <div className="clearance-modal">
          <div className="clearance-modal-header">
            <i className="fas fa-ban"></i>
            <h3>Exam Access Restricted</h3>
            <button 
              className="clearance-modal-close"
              onClick={() => setShowClearanceModal(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="clearance-modal-body">
            <div className="clearance-status-summary">
              <div className={`clearance-status-badge ${clearanceStatus.cleared ? 'cleared' : 'not-cleared'}`}>
                <i className={`fas ${clearanceStatus.cleared ? 'fa-check-circle' : 'fa-ban'}`}></i>
                <span>{clearanceStatus.cleared ? 'CLEARED' : 'NOT CLEARED'}</span>
              </div>
              <p className="clearance-modal-message">
                {clearanceStatus.cleared 
                  ? 'You are cleared to take examinations.'
                  : 'You are not cleared to take examinations due to the following:'
                }
              </p>
            </div>
            
            {!clearanceStatus.cleared && (
              <>
                <div className="clearance-issues">
                  {!clearanceStatus.financial?.cleared && (
                    <div className="clearance-issue financial-issue">
                      <div className="clearance-issue-header">
                        <i className="fas fa-money-bill-wave"></i>
                        <h4>Financial Clearance Failed</h4>
                        <span className="issue-status">NOT CLEARED</span>
                      </div>
                      <p className="issue-notes">{clearanceStatus.financial?.notes}</p>
                      <div className="clearance-details">
                        {clearanceStatus.financial?.details?.map((detail, idx) => (
                          <div key={idx} className="clearance-detail">{detail}</div>
                        ))}
                      </div>
                      {clearanceStatus.financial?.outstandingBalance > 0 && (
                        <div className="outstanding-amount">
                          <i className="fas fa-exclamation-circle"></i>
                          <span>Outstanding Balance: $${clearanceStatus.financial.outstandingBalance.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!clearanceStatus.attendance?.cleared && (
                    <div className="clearance-issue attendance-issue">
                      <div className="clearance-issue-header">
                        <i className="fas fa-user-check"></i>
                        <h4>Attendance Clearance Failed</h4>
                        <span className="issue-status">NOT CLEARED</span>
                      </div>
                      <p className="issue-notes">{clearanceStatus.attendance?.notes}</p>
                      <div className="clearance-details">
                        {clearanceStatus.attendance?.details?.map((detail, idx) => (
                          <div key={idx} className="clearance-detail">{detail}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="clearance-requirements">
                  <h4><i className="fas fa-list-check"></i> Requirements to be Cleared:</h4>
                  <ul>
                    <li>
                      <i className="fas fa-money-check"></i>
                      <span>All semester fees must be paid in full</span>
                    </li>
                    <li>
                      <i className="fas fa-calendar-check"></i>
                      <span>Minimum attendance of {clearanceStatus.requirements?.minimum_attendance_percentage || 75}%</span>
                    </li>
                    <li>
                      <i className="fas fa-file-contract"></i>
                      <span>No disciplinary issues on record</span>
                    </li>
                  </ul>
                </div>
                
                <div className="clearance-instructions">
                  <h4><i className="fas fa-lightbulb"></i> What to Do:</h4>
                  <div className="instructions-grid">
                    {!clearanceStatus.financial?.cleared && (
                      <div className="instruction-card">
                        <i className="fas fa-building-columns"></i>
                        <h5>Visit Finance Office</h5>
                        <p>Clear any outstanding fees and get a clearance certificate</p>
                      </div>
                    )}
                    {!clearanceStatus.attendance?.cleared && (
                      <div className="instruction-card">
                        <i className="fas fa-user-graduate"></i>
                        <h5>Contact Department</h5>
                        <p>Submit absence excuses or check attendance records</p>
                      </div>
                    )}
                    <div className="instruction-card">
                      <i className="fas fa-headset"></i>
                      <h5>Get Help</h5>
                      <p>Contact your academic advisor for assistance</p>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            <div className="clearance-actions">
              <button 
                className="clearance-action-btn recheck-btn"
                onClick={recheckClearance}
                disabled={checkingClearance}
              >
                {checkingClearance ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Rechecking...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sync-alt"></i>
                    Recheck Clearance
                  </>
                )}
              </button>
              
              {!clearanceStatus.financial?.cleared && (
                <button 
                  className="clearance-action-btn contact-btn"
                  onClick={() => {
                    const subject = encodeURIComponent(`Exam Clearance Issue - ${studentInfo?.student_id}`);
                    const body = encodeURIComponent(
                      `Student ID: ${studentInfo?.student_id}\n` +
                      `Name: ${studentInfo?.full_name}\n` +
                      `Program: ${studentInfo?.program}\n` +
                      `Issue: ${clearanceStatus.financial?.notes}\n` +
                      `Outstanding Balance: $${clearanceStatus.financial?.outstandingBalance || 0}`
                    );
                    window.location.href = `mailto:finance@university.edu?subject=${subject}&body=${body}`;
                  }}
                >
                  <i className="fas fa-envelope"></i>
                  Contact Finance
                </button>
              )}
              
              <button 
                className="clearance-action-btn close-btn"
                onClick={() => setShowClearanceModal(false)}
              >
                <i className="fas fa-times"></i>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Clearance Status Banner
  const renderClearanceBanner = () => {
    if (!clearanceStatus) return null;

    const isCleared = clearanceStatus.cleared;

    return (
      <div className={`clearance-banner ${isCleared ? 'cleared' : 'not-cleared'}`}>
        <div className="clearance-banner-content">
          <div className="clearance-status">
            <i className={`fas ${isCleared ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
            <div>
              <h4>{isCleared ? 'EXAM CLEARANCE: GRANTED' : 'EXAM CLEARANCE: REQUIRED'}</h4>
              <p>{isCleared ? 'You are cleared to take examinations' : 'Clearance required to access examinations'}</p>
            </div>
          </div>
          
          <div className="clearance-details">
            <div className={`clearance-detail ${clearanceStatus.financial?.cleared ? 'success' : 'error'}`}>
              <i className={`fas ${clearanceStatus.financial?.cleared ? 'fa-check' : 'fa-times'}`}></i>
              <div>
                <span className="detail-label">Financial</span>
                <span className="detail-value">{clearanceStatus.financial?.cleared ? 'Cleared' : 'Pending'}</span>
              </div>
            </div>
            <div className={`clearance-detail ${clearanceStatus.attendance?.cleared ? 'success' : 'error'}`}>
              <i className={`fas ${clearanceStatus.attendance?.cleared ? 'fa-check' : 'fa-times'}`}></i>
              <div>
                <span className="detail-label">Attendance</span>
                <span className="detail-value">{clearanceStatus.attendance?.cleared ? 'Cleared' : 'Pending'}</span>
              </div>
            </div>
          </div>
          
          {!isCleared && (
            <button 
              className="clearance-banner-btn"
              onClick={() => setShowClearanceModal(true)}
            >
              <i className="fas fa-info-circle"></i>
              View Details
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render Mobile Exam Card
  const renderMobileExamCard = (exam) => {
    const status = getExamStatus(exam);
    const statusColor = getStatusColor(status);
    const timeUntilStart = getTimeUntilStart(exam);
    const isOnlineExam = exam.isOnline;
    const isCleared = clearanceStatus?.cleared;
    
    return (
      <div className="mobile-exam-card" key={exam.id}>
        <div className="mobile-exam-header">
          <div className="mobile-exam-status-row">
            <span 
              className="mobile-status-badge"
              style={{ backgroundColor: statusColor }}
            >
              {status.toUpperCase()}
            </span>
            <span className="mobile-type-badge">
              {exam.examType.toUpperCase()}
            </span>
          </div>
          
          <h4 className="mobile-exam-title">
            {exam.title}
          </h4>
          
          <div className="mobile-course-info">
            <i className="fas fa-book"></i>
            <span>{exam.courseCode}: {exam.courseName}</span>
            <span className="mobile-course-credits">({exam.courseCredits} credits)</span>
          </div>
        </div>

        <div className="mobile-exam-body">
          <div className="mobile-exam-details-grid">
            <div className="mobile-exam-detail">
              <div className="mobile-detail-label">
                <i className="far fa-calendar-alt"></i> Start
              </div>
              <div className="mobile-detail-value">
                {formatDate(exam.startTime)}
              </div>
            </div>
            <div className="mobile-exam-detail">
              <div className="mobile-detail-label">
                <i className="fas fa-clock"></i> Duration
              </div>
              <div className="mobile-detail-value">
                {exam.duration} min
              </div>
            </div>
            <div className="mobile-exam-detail">
              <div className="mobile-detail-label">
                <i className="fas fa-chart-bar"></i> Marks
              </div>
              <div className="mobile-detail-value">
                {exam.totalMarks} marks
                {exam.passingMarks && ` (Pass: ${exam.passingMarks})`}
              </div>
            </div>
            <div className="mobile-exam-detail">
              <div className="mobile-detail-label">
                <i className="fas fa-map-marker-alt"></i> Location
              </div>
              <div className="mobile-detail-value">
                {exam.location || 'TBA'}
              </div>
            </div>
          </div>

          <div className="mobile-exam-button-group">
            {exam.graded ? (
              <button 
                onClick={() => navigateToResults(exam)}
                className="mobile-view-results-btn"
              >
                <i className="fas fa-chart-line"></i>
                View Results
              </button>
            ) : exam.submitted ? (
              <button 
                disabled
                className="mobile-disabled-btn"
              >
                <i className="fas fa-check-circle"></i>
                Awaiting Grading
              </button>
            ) : exam.canResume ? (
              <button 
                onClick={() => handleStartExam(exam)}
                className="mobile-resume-exam-btn"
                disabled={!isCleared}
              >
                <i className="fas fa-history"></i>
                {isCleared ? 'RESUME EXAM' : 'CLEARANCE REQUIRED'}
              </button>
            ) : exam.canStart && isOnlineExam ? (
              <button 
                onClick={() => handleStartExam(exam)}
                className="mobile-start-exam-btn"
                disabled={!isCleared}
              >
                <i className="fas fa-play"></i>
                {isCleared ? 'START ONLINE EXAM' : 'CLEARANCE REQUIRED'}
              </button>
            ) : status === 'upcoming' ? (
              <button 
                disabled
                className="mobile-disabled-btn"
              >
                <i className="fas fa-clock"></i>
                Starts in {timeUntilStart}
              </button>
            ) : (
              <button 
                disabled
                className="mobile-disabled-btn"
              >
                <i className="fas fa-times-circle"></i>
                Exam {isOnlineExam ? 'Closed' : 'Physical'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Desktop Exam Card
  const renderDesktopExamCard = (exam) => {
    const status = getExamStatus(exam);
    const statusColor = getStatusColor(status);
    const timeUntilStart = getTimeUntilStart(exam);
    const isOnlineExam = exam.isOnline;
    const isCleared = clearanceStatus?.cleared;
    
    return (
      <div 
        className="desktop-exam-card"
        key={exam.id}
        style={{ borderLeft: `5px solid ${statusColor}` }}
      >
        <div className="desktop-exam-header">
          <div>
            <div className="desktop-exam-status-row">
              <span 
                className="desktop-status-badge"
                style={{ backgroundColor: statusColor }}
              >
                {status.toUpperCase()}
              </span>
              <span className="desktop-type-badge">
                {exam.examType.toUpperCase()}
              </span>
              <span className="desktop-course-code">
                {exam.courseCode} ({exam.courseCredits} credits)
              </span>
            </div>
            <h4 className="desktop-exam-title">
              {exam.title}
            </h4>
            <p className="desktop-course-name">
              {exam.courseName}
            </p>
          </div>
          <div className="desktop-exam-header-right">
            <div className="desktop-exam-id">
              Exam ID: {exam.id.slice(0, 8).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="desktop-exam-body">
          {exam.description && (
            <p className="desktop-exam-description">
              {exam.description}
            </p>
          )}

          <div className="desktop-exam-details-grid">
            <div className="desktop-exam-detail">
              <div className="desktop-detail-label">
                <i className="far fa-calendar-alt"></i>
                Start Time
              </div>
              <div className="desktop-detail-value">
                {formatDate(exam.startTime)}
              </div>
            </div>
            <div className="desktop-exam-detail">
              <div className="desktop-detail-label">
                <i className="far fa-calendar-times"></i>
                End Time
              </div>
              <div className="desktop-detail-value">
                {formatDate(exam.endTime)}
              </div>
            </div>
            <div className="desktop-exam-detail">
              <div className="desktop-detail-label">
                <i className="fas fa-clock"></i>
                Duration
              </div>
              <div className="desktop-detail-value">
                {exam.duration} minutes
              </div>
            </div>
            <div className="desktop-exam-detail">
              <div className="desktop-detail-label">
                <i className="fas fa-chart-bar"></i>
                Total Marks
              </div>
              <div className="desktop-detail-value">
                {exam.totalMarks} marks
                {exam.passingMarks && ` (Pass: ${exam.passingMarks})`}
              </div>
            </div>
            {exam.location && (
              <div className="desktop-exam-detail">
                <div className="desktop-detail-label">
                  <i className="fas fa-map-marker-alt"></i>
                  Location
                </div>
                <div className="desktop-detail-value">
                  {exam.location}
                </div>
              </div>
            )}
          </div>

          <div className="desktop-exam-action-area">
            <div className="desktop-exam-right-actions">
              {exam.graded ? (
                <>
                  <div className="desktop-graded-info">
                    <i className="fas fa-check-double"></i>
                    <div>
                      <div className="graded-status">
                        Graded {exam.submission?.graded_at ? 
                          `on ${new Date(exam.submission.graded_at).toLocaleDateString()}` : 
                          'and ready to view'}
                      </div>
                      <div className="graded-score">
                        Score: {exam.submission?.total_marks_obtained || 'N/A'} / {exam.totalMarks}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigateToResults(exam)}
                    className="desktop-view-results-btn"
                  >
                    <i className="fas fa-chart-line"></i>
                    View Results
                  </button>
                </>
              ) : exam.submitted ? (
                <>
                  <div className="desktop-submitted-info">
                    <i className="fas fa-check-circle"></i>
                    <div>
                      <div className="submitted-status">
                        Submitted {exam.submission?.submitted_at ? 
                          `on ${new Date(exam.submission.submitted_at).toLocaleDateString()}` : 
                          'successfully'}
                      </div>
                      <div className="submitted-waiting">
                        Awaiting grading
                      </div>
                    </div>
                  </div>
                  <button 
                    disabled
                    className="desktop-disabled-btn"
                  >
                    <i className="fas fa-hourglass-half"></i>
                    Awaiting Grading
                  </button>
                </>
              ) : exam.canResume ? (
                <>
                  <div className="desktop-resume-info">
                    <i className="fas fa-history"></i>
                    <div>
                      <div className="resume-status">Exam Incomplete</div>
                      <div className="resume-detail">Resume Available</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleStartExam(exam)}
                    className="desktop-resume-exam-btn"
                    disabled={!isCleared}
                  >
                    <i className="fas fa-history"></i>
                    {isCleared ? 'RESUME EXAM' : 'CLEARANCE REQUIRED'}
                  </button>
                </>
              ) : exam.canStart && isOnlineExam ? (
                <>
                  <div className="desktop-active-info">
                    <i className="fas fa-exclamation-triangle"></i>
                    <div>
                      <div className="active-status">Exam is ACTIVE</div>
                      <div className="active-detail">Click to start</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleStartExam(exam)}
                    className="desktop-start-exam-btn"
                    disabled={!isCleared}
                  >
                    <i className="fas fa-play"></i>
                    {isCleared ? 'START ONLINE EXAM' : 'CLEARANCE REQUIRED'}
                  </button>
                </>
              ) : status === 'upcoming' ? (
                <>
                  <div className="desktop-upcoming-info">
                    <i className="fas fa-clock"></i>
                    <div>
                      <div className="upcoming-status">Starts in {timeUntilStart}</div>
                      <div className="upcoming-detail">
                        {isOnlineExam ? 'Online Exam' : 'Physical Exam'}
                      </div>
                    </div>
                  </div>
                  <button 
                    disabled
                    className="desktop-disabled-btn"
                  >
                    <i className="fas fa-lock"></i>
                    {isOnlineExam ? 'Not Available Yet' : 'Physical Exam'}
                  </button>
                </>
              ) : (
                <>
                  <div className="desktop-ended-info">
                    <i className="fas fa-ban"></i>
                    <div>
                      <div className="ended-status">
                        {isOnlineExam ? 'Exam period has ended' : 'Physical Exam'}
                      </div>
                      <div className="ended-detail">
                        {isOnlineExam ? 'Closed' : 'Attend at Venue'}
                      </div>
                    </div>
                  </div>
                  <button 
                    disabled
                    className="desktop-disabled-btn"
                  >
                    <i className="fas fa-times-circle"></i>
                    {isOnlineExam ? 'Closed' : 'Physical'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading State
  if (loading) {
    return (
      <div className="examinations-container">
        <div className="examinations-header">
          <h2>
            <i className="fas fa-clipboard-check"></i>
            Examinations
          </h2>
          <div className="examinations-loading">
            Loading examinations...
          </div>
        </div>
        <div className="examinations-loading-spinner">
          <div className="loading-spinner"></div>
          <p>Checking your exam clearance status...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="examinations-container">
        <div className="examinations-header">
          <h2>
            <i className="fas fa-clipboard-check"></i>
            Examinations
          </h2>
        </div>
        <div className="examinations-error-container">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <button 
            onClick={refreshExams}
            className="examinations-retry-btn"
          >
            <i className="fas fa-sync-alt"></i>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="examinations-container">
      {/* Header */}
      <div className="examinations-header-container">
        <div className="examinations-header-content">
          <div className={`examinations-header-row ${isMobile ? 'mobile' : 'desktop'}`}>
            <div>
              <h2 className="examinations-main-title">
                <i className="fas fa-clipboard-check"></i>
                Examinations
              </h2>
              <div className="examinations-student-info">
                <span>Academic Year: {studentInfo?.academic_year || '2025/2029'}</span>
                <span>Student ID: {studentInfo?.student_id || 'N/A'}</span>
                <span>Program: {studentInfo?.program || 'N/A'}</span>
                {studentInfo?.program_code && (
                  <span>Program Code: {studentInfo.program_code}</span>
                )}
              </div>
            </div>
            <div className="examinations-header-buttons">
              <button 
                onClick={refreshExams}
                className="examinations-refresh-btn"
                disabled={checkingClearance}
              >
                {checkingClearance ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Checking...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sync-alt"></i>
                    Refresh
                  </>
                )}
              </button>
              <button 
                onClick={downloadExamPermit}
                className="examinations-download-permit-btn"
                disabled={!clearanceStatus?.cleared}
              >
                <i className="fas fa-download"></i>
                Download Permit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Clearance Status Banner */}
      {renderClearanceBanner()}

      {/* Stats Overview */}
      <div className="examinations-stats-grid">
        {[
          { 
            label: 'All Exams', 
            value: exams.length,
            icon: 'fas fa-clipboard-list',
            color: '#6c757d'
          },
          { 
            label: 'Upcoming', 
            value: exams.filter(e => e.status === 'upcoming' || e.isUpcoming).length,
            icon: 'fas fa-calendar-alt',
            color: '#007bff'
          },
          { 
            label: 'Active Now', 
            value: exams.filter(e => e.status === 'active' || e.canStart || e.canResume).length,
            icon: 'fas fa-play-circle',
            color: '#dc3545'
          },
          { 
            label: 'Graded', 
            value: exams.filter(e => e.graded === true).length,
            icon: 'fas fa-check-double',
            color: '#6f42c1'
          },
          { 
            label: 'Submitted', 
            value: exams.filter(e => e.submitted === true && !e.graded).length,
            icon: 'fas fa-check-circle',
            color: '#28a745'
          },
          { 
            label: 'Clearance', 
            value: clearanceStatus?.cleared ? '✓ Cleared' : '✗ Required',
            icon: clearanceStatus?.cleared ? 'fas fa-check' : 'fas fa-ban',
            color: clearanceStatus?.cleared ? '#28a745' : '#dc3545'
          }
        ].map((stat, index) => (
          <div 
            key={index}
            className="examinations-stat-card"
          >
            <div className="examinations-stat-value" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="examinations-stat-label">
              <i className={stat.icon} style={{ color: stat.color }}></i>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Exams Filter Tabs */}
      <div className="examinations-tabs">
        <button 
          className={`exam-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <i className="fas fa-list"></i>
          All Exams ({exams.length})
        </button>
        <button 
          className={`exam-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <i className="fas fa-calendar-alt"></i>
          Upcoming ({exams.filter(e => e.status === 'upcoming' || e.isUpcoming).length})
        </button>
        <button 
          className={`exam-tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <i className="fas fa-play-circle"></i>
          Active ({exams.filter(e => e.status === 'active' || e.canStart || e.canResume).length})
        </button>
        <button 
          className={`exam-tab ${activeTab === 'submitted' ? 'active' : ''}`}
          onClick={() => setActiveTab('submitted')}
        >
          <i className="fas fa-check-circle"></i>
          Submitted ({exams.filter(e => e.submitted && !e.graded).length})
        </button>
        <button 
          className={`exam-tab ${activeTab === 'graded' ? 'active' : ''}`}
          onClick={() => setActiveTab('graded')}
        >
          <i className="fas fa-check-double"></i>
          Graded ({exams.filter(e => e.graded).length})
        </button>
      </div>

      {/* Exams List */}
      <div className="examinations-list-container">
        <div className="examinations-list-header">
          <h3 className="examinations-list-title">
            <i className="fas fa-list-alt"></i>
            {activeTab === 'all' && 'All Examinations'}
            {activeTab === 'upcoming' && 'Upcoming Examinations'}
            {activeTab === 'active' && 'Active Examinations'}
            {activeTab === 'submitted' && 'Submitted Examinations'}
            {activeTab === 'graded' && 'Graded Examinations'}
          </h3>
          <div className="examinations-count">
            {clearanceStatus && !clearanceStatus.cleared ? (
              <span className="clearance-warning">
                <i className="fas fa-exclamation-triangle"></i>
                Clearance Required
              </span>
            ) : (
              <span>
                Showing {filteredExams.length} of {exams.length} exam{exams.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {filteredExams.length === 0 ? (
          <div className="examinations-empty-state">
            <i className="fas fa-clipboard-list"></i>
            <h3 className="examinations-empty-state-title">
              {activeTab === 'all' && 'No Examinations Found'}
              {activeTab === 'upcoming' && 'No Upcoming Examinations'}
              {activeTab === 'active' && 'No Active Examinations'}
              {activeTab === 'submitted' && 'No Submitted Examinations'}
              {activeTab === 'graded' && 'No Graded Examinations'}
            </h3>
            <p className="examinations-empty-state-message">
              {clearanceStatus && !clearanceStatus.cleared 
                ? 'Please resolve clearance issues to view examinations.'
                : activeTab === 'all'
                ? 'No examinations scheduled for your courses.'
                : `No ${activeTab} examinations found.`
              }
            </p>
            {clearanceStatus && !clearanceStatus.cleared && (
              <button 
                onClick={() => setShowClearanceModal(true)}
                className="examinations-clearance-btn"
              >
                <i className="fas fa-info-circle"></i>
                View Clearance Issues
              </button>
            )}
            <button 
              onClick={refreshExams}
              className="examinations-empty-state-btn"
            >
              <i className="fas fa-sync-alt"></i>
              Refresh List
            </button>
          </div>
        ) : (
          <div className="examinations-list">
            {filteredExams.map((exam) => (
              isMobile ? 
                renderMobileExamCard(exam) : 
                renderDesktopExamCard(exam)
            ))}
          </div>
        )}
      </div>

      {/* Clearance Modal */}
      {renderClearanceModal()}
    </div>
  );
};

export default Examinations;