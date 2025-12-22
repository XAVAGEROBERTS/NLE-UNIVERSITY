import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ExamModel from './TakeExam'; // Import the ExamModel component

const Examinations = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const { user } = useStudentAuth();
  const [isMobile, setIsMobile] = useState(false);
  
  // Exam taking states
  const [selectedExam, setSelectedExam] = useState(null);
  const [showExamModel, setShowExamModel] = useState(false);
  const [examFileUrls, setExamFileUrls] = useState([]);
  const [downloadingExamFile, setDownloadingExamFile] = useState(false);
  const [viewingExamPaper, setViewingExamPaper] = useState(false);
  const [currentExam, setCurrentExam] = useState(null);
  
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
      fetchExams();
    }
  }, [user]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get student data
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, full_name, student_id, program, year_of_study, semester, academic_year, program_id')
        .eq('email', user.email)
        .single();

      if (studentError) throw new Error(`Student data error: ${studentError.message}`);
      if (!student) throw new Error('Student not found');

      setStudentInfo(student);

      // Fetch student's enrolled courses - ONLY non-completed courses
      const { data: studentCourses, error: coursesError } = await supabase
        .from('student_courses')
        .select('course_id, status')
        .eq('student_id', student.id)
        .eq('status', 'enrolled');

      if (coursesError) throw new Error(`Courses error: ${coursesError.message}`);

      const courseIds = studentCourses?.map(sc => sc.course_id) || [];
      if (courseIds.length === 0) {
        setExams([]);
        setLoading(false);
        return;
      }

      // Fetch exams with cohort targeting
      let query = supabase
        .from('examinations')
        .select(`
          *,
          courses (id, course_code, course_name)
        `)
        .in('course_id', courseIds)
        .in('status', ['scheduled', 'published', 'active', 'completed'])
        .order('start_time', { ascending: true });

      // Apply cohort targeting
      const cleanAY = (student.academic_year || '').trim().replace(/\s/g, '');
      
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
      if (examsError) throw new Error(`Exams error: ${examsError.message}`);

    // Fetch student's exam submissions
const { data: submissionsData, error: submissionsError } = await supabase
  .from('exam_submissions')
  .select('*')
  .eq('student_id', student.id);

if (submissionsError) throw new Error(`Submissions error: ${submissionsError.message}`);

// Process exams
const processedExams = examsData ? examsData.map(exam => {
  const studentSubmission = submissionsData?.find(sub => sub.exam_id === exam.id);
const now = new Date();
const startTime = new Date(exam.start_time);
const endTime = new Date(exam.end_time);

// Correct direct comparison (both dates are in UTC internally)
const isActiveByTime = now >= startTime && now <= endTime;
const isUpcoming = now < startTime;
const isEndedByTime = now > endTime;
  
  // Determine if it's an online exam
  const isOnlineExam = exam.exam_type === 'online' || exam.exam_type === 'written_online';
  
  // Submission status - CORRECTED LOGIC
  const hasSubmission = !!studentSubmission;
  
  // Check if exam is submitted - SIMPLIFIED AND CORRECTED
  let isSubmitted = false;
  if (studentSubmission) {
    const status = studentSubmission.status?.toLowerCase();
    
    // LOGIC: Submitted if status is 'submitted' OR has submitted_at timestamp
    isSubmitted = status === 'submitted' || studentSubmission.submitted_at !== null;
    
    // Debug for this specific exam
    if (studentSubmission.exam_id === exam.id) {
      console.log(`Exam ${exam.id} submission check:`, {
        status: studentSubmission.status,
        submitted_at: studentSubmission.submitted_at,
        isSubmittedResult: isSubmitted
      });
    }
  }
  
  const isStartedButNotSubmitted = studentSubmission && studentSubmission.status === 'started' && !isSubmitted;
  
  // For resumed exams: If exam was started but not submitted
  const canResume = isStartedButNotSubmitted && (isActiveByTime || !isEndedByTime);
  
  // Can start only if: no submission AND exam is active AND it's online
  const canStart = !hasSubmission && isActiveByTime && isOnlineExam;
  
  // Final status determination
  let finalStatus = 'upcoming';
  let showAsActive = false;
  
  if (isSubmitted) {
    finalStatus = 'submitted';
  } else if (canResume) {
    finalStatus = 'active'; // Show as active for resume
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
    submission: studentSubmission || null,
    isActive: showAsActive,
    isUpcoming: isUpcoming,
    isEnded: isEndedByTime,
    canStart: canStart,
    canResume: canResume,
    hasIncompleteSubmission: isStartedButNotSubmitted,
    isOnline: isOnlineExam,
    examFiles: exam.exam_files || [],
    materialsUrl: exam.materials_url || []
  };
}) : [];

// ENHANCED Debug logging
console.log('=== DEBUG: Exam Submission Analysis ===');
console.log('Total submissions found:', submissionsData?.length || 0);
console.log('Total exams to process:', examsData?.length || 0);

// Count submissions by status
if (submissionsData) {
  const statusCount = {};
  submissionsData.forEach(sub => {
    const status = sub.status || 'unknown';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });
  console.log('Submission status counts:', statusCount);
  
  // Log detailed submission info
  submissionsData.forEach((sub, idx) => {
    console.log(`📝 Submission ${idx + 1}:`, {
      exam_id: sub.exam_id,
      status: sub.status,
      submitted_at: sub.submitted_at,
      started_at: sub.started_at,
      isSubmitted: sub.status === 'submitted' || sub.submitted_at !== null
    });
  });
}

// Check each exam's submission status
console.log('=== DEBUG: Exam Submission Matching ===');
processedExams.forEach((exam, idx) => {
  const submission = submissionsData?.find(sub => sub.exam_id === exam.id);
  console.log(`📊 Exam ${idx + 1}: ${exam.title}`, {
    exam_id: exam.id,
    hasSubmission: !!submission,
    submissionStatus: submission?.status || 'none',
    submitted_at: submission?.submitted_at || 'none',
    isMarkedAsSubmitted: exam.submitted,
    finalStatus: exam.status
  });
});

// Debug logging - ENHANCED
console.log('=== DEBUG: Exam Submission Data ===');
console.log('Submissions found:', submissionsData?.length || 0);
if (submissionsData) {
  submissionsData.forEach((sub, idx) => {
    console.log(`Submission ${idx + 1}:`, {
      exam_id: sub.exam_id,
      status: sub.status,
      submitted_at: sub.submitted_at,
      hasAnswers: !!(sub.answers && Object.keys(sub.answers).length > 0),
      hasAnswerText: !!sub.answer_text,
      hasAnswerFiles: !!(sub.answer_files && sub.answer_files.length > 0)
    });
  });
}

console.log('=== DEBUG: Processed Exams ===');
processedExams.forEach((exam, idx) => {
  console.log(`Exam ${idx + 1}:`, {
    id: exam.id,
    title: exam.title,
    status: exam.status,
    submitted: exam.submitted,
    submission: exam.submission ? {
      status: exam.submission.status,
      submitted_at: exam.submission.submitted_at
    } : null
  });
});

// Debug logging
console.log('Processed exams:', processedExams.map(e => ({
  id: e.id,
  title: e.title,
  status: e.status,
  submitted: e.submitted,
  canResume: e.canResume,
  isActive: e.isActive,
  submission: e.submission
})));

      setExams(processedExams);
    } catch (error) {
      console.error('Error fetching exams:', error);
      setError(`Failed to load examinations: ${error.message}`);
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  // Start/resume exam function
// Change the handleStartExam function to navigate to the new route
const handleStartExam = (exam) => {
  // Check if exam is online
  const isOnlineExam = exam.examType === 'online' || exam.examType === 'written_online';
  
  if (!isOnlineExam) {
    // For physical exams, only allow downloading exam paper
    if (exam.examFiles && exam.examFiles.length > 0) {
      handleDownloadExamPaper(exam);
    } else {
      alert('This is a physical exam. Please attend at the specified venue.');
    }
    return;
  }

  // Navigate to the exam taking page
  navigate(`/examinations/take/${exam.id}`);
};

  // Load exam files from bucket
  const loadExamFiles = async (exam) => {
    try {
      const files = [];
      
      // Check if exam has file references
      if (exam.examFiles && exam.examFiles.length > 0) {
        for (const filePath of exam.examFiles) {
          const { data: publicUrlData } = supabase.storage
            .from('exam_papers')
            .getPublicUrl(filePath);
          
          if (publicUrlData?.publicUrl) {
            files.push({
              name: filePath.split('/').pop(),
              url: publicUrlData.publicUrl,
              type: getFileType(filePath)
            });
          }
        }
      }
      
      setExamFileUrls(files);
    } catch (error) {
      console.error('Error loading exam files:', error);
    }
  };

  // Download exam paper
  const handleDownloadExamPaper = async (exam) => {
    try {
      setDownloadingExamFile(true);
      
      if (!exam.examFiles || exam.examFiles.length === 0) {
        alert('No exam paper available for download.');
        return;
      }

      // For multiple files, let user choose
      if (exam.examFiles.length > 1) {
        setViewingExamPaper(true);
        setCurrentExam(exam);
        await loadExamFiles(exam);
        return;
      }

      // For single file, download directly
      const filePath = exam.examFiles[0];
      const { data: publicUrlData } = supabase.storage
        .from('exam_papers')
        .getPublicUrl(filePath);
      
      if (!publicUrlData?.publicUrl) {
        alert('Exam paper not found.');
        return;
      }

      // Create download link
      const a = document.createElement('a');
      a.href = publicUrlData.publicUrl;
      a.download = `${exam.title.replace(/[^a-z0-9]/gi, '_')}_Exam.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      alert('Exam paper downloaded successfully!');
    } catch (error) {
      console.error('Error downloading exam paper:', error);
      alert('Failed to download exam paper.');
    } finally {
      setDownloadingExamFile(false);
    }
  };

  // Format date
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
// Get exam status
const getExamStatus = (exam) => {
  // First, check if it's submitted (using the submitted property we calculated)
  if (exam.submitted) return 'submitted';
  
  // Then check status from exam object
  if (exam.status) return exam.status;
  
  // Fallback logic
  if (exam.hasIncompleteSubmission) return 'active';
  if (exam.isActive) return 'active';
  if (exam.isUpcoming) return 'upcoming';
  if (exam.isEnded) return 'ended';
  
  return 'upcoming';
};
  // Get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'submitted': return '#28a745';
      case 'incomplete': return '#ffc107';
      case 'active': return '#dc3545';
      case 'upcoming': return '#007bff';
      case 'ended': return '#6c757d';
      default: return '#6c757d';
    }
  };

  // Get time until start
  const getTimeUntilStart = (exam) => {
    const now = new Date();
    const startTime = new Date(exam.startTime);
    
    if (now >= startTime) return 'Started';
    
    const diffSeconds = Math.floor((startTime - now) / 1000);
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Get file type from extension
  const getFileType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'document';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    return 'file';
  };

  // Get file icon
  const getFileIcon = (filename) => {
    const type = getFileType(filename);
    switch(type) {
      case 'pdf': return '📕';
      case 'document': return '📝';
      case 'image': return '🖼️';
      default: return '📄';
    }
  };

  // Download exam permit
  const downloadExamPermit = async () => {
    try {
      if (!studentInfo) {
        alert('Student information not available.');
        return;
      }

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
          <h2 style="color: #333; margin: 0;">Academic Year: ${studentInfo.academic_year || '2024/2025'}</h2>
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
              <strong>Year of Study:</strong> ${studentInfo.year_of_study}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Semester:</strong> ${studentInfo.semester}
            </div>
          </div>
          
          <div>
            <h3 style="color: #495057; margin-bottom: 15px; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">
              EXAMINATION DETAILS
            </h3>
            <div style="margin-bottom: 10px;">
              <strong>Issued Date:</strong> ${new Date().toLocaleDateString()}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Valid Until:</strong> End of Semester
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Total Exams:</strong> ${exams.filter(e => !e.submitted && new Date(e.startTime) > new Date()).length}
            </div>
            <div style="margin-bottom: 10px;">
              <strong>Status:</strong> Cleared for Examination
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #495057; margin-bottom: 15px; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">
            SCHEDULED EXAMINATIONS
          </h3>
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
              ${exams
                .filter(e => !e.submitted)
                .map(exam => `
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

  const refreshExams = () => {
    fetchExams();
  };

  // =================== EXAM PAPER VIEWER MODAL ===================
  const ExamPaperViewerModal = () => {
    if (!viewingExamPaper || !currentExam) return null;

    return (
      <div style={styles.modalOverlay}>
        <div style={styles.paperViewerContainer}>
          <div style={styles.paperViewerHeader}>
            <h3 style={styles.paperViewerTitle}>
              <i className="fas fa-file-pdf" style={{ marginRight: '10px' }}></i>
              {currentExam.title} - Exam Papers
            </h3>
            <button
              onClick={() => setViewingExamPaper(false)}
              style={styles.paperCloseButton}
            >
              ×
            </button>
          </div>
          
          <div style={styles.paperGrid}>
            {examFileUrls.map((file, index) => (
              <div key={index} style={styles.paperCard}>
                <div style={styles.paperCardHeader}>
                  <div style={styles.paperIcon}>
                    {getFileIcon(file.name)}
                  </div>
                  <div style={styles.paperName}>
                    {file.name}
                  </div>
                  <div style={styles.paperType}>
                    {file.type.toUpperCase()}
                  </div>
                </div>
                
                <div style={styles.paperCardBody}>
                  <div style={styles.paperButtons}>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.viewButton}
                    >
                      <i className="fas fa-eye"></i>
                      View in Browser
                    </a>
                    
                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = file.url;
                        a.download = file.name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      style={styles.downloadButton}
                    >
                      <i className="fas fa-download"></i>
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // =================== RENDER EXAM CARDS ===================
  const renderMobileExamCard = (exam, index) => {
    const status = getExamStatus(exam);
    const statusColor = getStatusColor(status);
    const timeUntilStart = getTimeUntilStart(exam);
    const isOnlineExam = exam.isOnline;
    
    return (
      <div 
        key={exam.id} 
        style={styles.mobileCard}
      >
        {/* Exam Header */}
        <div style={styles.mobileCardHeader}>
          <div style={styles.mobileCardStatusRow}>
            <span style={{...styles.statusBadge, backgroundColor: statusColor}}>
              {status.toUpperCase()}
            </span>
            <span style={styles.typeBadge}>
              {exam.examType.toUpperCase()}
            </span>
            {exam.examFiles && exam.examFiles.length > 0 && (
              <span style={styles.filesBadge}>
                <i className="fas fa-file-pdf" style={{ marginRight: '4px' }}></i>
                {exam.examFiles.length} file{exam.examFiles.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          <h4 style={styles.mobileCardTitle}>
            {exam.title}
          </h4>
          
          <div style={styles.mobileCourseInfo}>
            <i className="fas fa-book"></i>
            <span>{exam.courseCode}: {exam.courseName}</span>
          </div>
        </div>

        {/* Exam Details */}
        <div style={styles.mobileCardBody}>
          <div style={styles.mobileDetailsGrid}>
            <div>
              <div style={styles.mobileDetailLabel}>
                <i className="far fa-calendar-alt"></i> Start
              </div>
              <div style={styles.mobileDetailValue}>
                {formatDate(exam.startTime)}
              </div>
            </div>
            <div>
              <div style={styles.mobileDetailLabel}>
                <i className="fas fa-clock"></i> Duration
              </div>
              <div style={styles.mobileDetailValue}>
                {exam.duration} min
              </div>
            </div>
            <div>
              <div style={styles.mobileDetailLabel}>
                <i className="fas fa-chart-bar"></i> Marks
              </div>
              <div style={styles.mobileDetailValue}>
                {exam.totalMarks} marks
              </div>
            </div>
            <div>
              <div style={styles.mobileDetailLabel}>
                <i className="fas fa-map-marker-alt"></i> Location
              </div>
              <div style={styles.mobileDetailValue}>
                {exam.location || 'TBA'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.mobileButtonGroup}>
            {/* Exam Paper Download Button */}
            {exam.examFiles && exam.examFiles.length > 0 && (
              <button 
                onClick={() => handleDownloadExamPaper(exam)}
                disabled={downloadingExamFile}
                style={styles.downloadPaperButton}
              >
                <i className="fas fa-download"></i>
                {downloadingExamFile ? 'Downloading...' : `Download Exam Paper`}
              </button>
            )}

            {/* Main Action Button */}
         {exam.submitted ? (
  <button 
    onClick={() => navigate(`/examinations/results/${exam.id}`)}
    style={styles.viewResultsButton}
  >
    <i className="fas fa-chart-line"></i>
    View Results
  </button>
) : exam.canResume ? (
  <button 
    onClick={() => handleStartExam(exam)}
    style={styles.resumeExamButton}
  >
    <i className="fas fa-history"></i>
    RESUME EXAM
  </button>
) : exam.canStart && isOnlineExam ? (
  <button 
    onClick={() => handleStartExam(exam)}
    style={styles.startExamButton}
  >
    <i className="fas fa-play"></i>
    START ONLINE EXAM
  </button>
) : status === 'upcoming' ? (
  <button 
    disabled
    style={styles.disabledButton}
  >
    <i className="fas fa-clock"></i>
    Starts in {timeUntilStart}
  </button>
) : (
  <button 
    disabled
    style={styles.disabledButton}
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

  // Render desktop exam card
  const renderDesktopExamCard = (exam, index) => {
    const status = getExamStatus(exam);
    const statusColor = getStatusColor(status);
    const timeUntilStart = getTimeUntilStart(exam);
    const isOnlineExam = exam.isOnline;
    
    return (
      <div 
        key={exam.id} 
        style={{
          ...styles.desktopCard,
          borderLeft: `5px solid ${statusColor}`,
          cursor: ((exam.canStart || exam.canResume) && isOnlineExam) || exam.submitted ? 'pointer' : 'default',
        }}
        onMouseEnter={(e) => {
          if (((exam.canStart || exam.canResume) && isOnlineExam) || exam.submitted) {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Exam Header */}
        <div style={styles.desktopCardHeader}>
          <div>
            <div style={styles.desktopStatusRow}>
              <span style={{...styles.desktopStatusBadge, backgroundColor: statusColor}}>
                {status.toUpperCase()}
              </span>
              <span style={styles.desktopTypeBadge}>
                {exam.examType.toUpperCase()}
              </span>
              {exam.examFiles && exam.examFiles.length > 0 && (
                <span style={styles.desktopFilesBadge}>
                  <i className="fas fa-file-pdf"></i>
                  {exam.examFiles.length} file{exam.examFiles.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <h4 style={styles.desktopCardTitle}>
              {exam.title}
            </h4>
          </div>
          <div style={styles.desktopCardHeaderRight}>
            <div style={styles.desktopCourseInfo}>
              <i className="fas fa-book" style={{ marginRight: '8px' }}></i>
              {exam.courseCode}: {exam.courseName}
            </div>
            <div style={styles.examId}>
              Exam ID: {exam.id.slice(0, 8).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Exam Details */}
        <div style={styles.desktopCardBody}>
          {exam.description && (
            <p style={styles.examDescription}>
              {exam.description}
            </p>
          )}

          <div style={styles.desktopDetailsGrid}>
            <div>
              <div style={styles.desktopDetailLabel}>
                <i className="far fa-calendar-alt" style={{ marginRight: '8px' }}></i>
                Start Time
              </div>
              <div style={styles.desktopDetailValue}>
                {formatDate(exam.startTime)}
              </div>
            </div>
            <div>
              <div style={styles.desktopDetailLabel}>
                <i className="far fa-calendar-times" style={{ marginRight: '8px' }}></i>
                End Time
              </div>
              <div style={styles.desktopDetailValue}>
                {formatDate(exam.endTime)}
              </div>
            </div>
            <div>
              <div style={styles.desktopDetailLabel}>
                <i className="fas fa-clock" style={{ marginRight: '8px' }}></i>
                Duration
              </div>
              <div style={styles.desktopDetailValue}>
                {exam.duration} minutes
              </div>
            </div>
            <div>
              <div style={styles.desktopDetailLabel}>
                <i className="fas fa-chart-bar" style={{ marginRight: '8px' }}></i>
                Total Marks
              </div>
              <div style={styles.desktopDetailValue}>
                {exam.totalMarks} marks
                {exam.passingMarks && ` (Pass: ${exam.passingMarks})`}
              </div>
            </div>
            {exam.location && (
              <div>
                <div style={styles.desktopDetailLabel}>
                  <i className="fas fa-map-marker-alt" style={{ marginRight: '8px' }}></i>
                  Location
                </div>
                <div style={styles.desktopDetailValue}>
                  {exam.location}
                </div>
              </div>
            )}
          </div>

          {/* Action Area */}
          <div style={styles.desktopActionArea}>
            <div style={styles.leftActions}>
           
            </div>
            
            <div style={styles.rightActions}>
      {exam.submitted ? (
  <>
    <div style={styles.submittedInfo}>
      <i className="fas fa-check-circle" style={{ fontSize: '20px', color: '#28a745' }}></i>
      <div>
        <div style={{ fontWeight: 'bold' }}>
          Submitted {exam.submission?.submitted_at ? 
            `on ${new Date(exam.submission.submitted_at).toLocaleDateString()}` : 
            'successfully'}
        </div>
      </div>
    </div>
    <button 
      onClick={() => navigate(`/examinations/results/${exam.id}`)}
      style={styles.viewResultsButtonDesktop}
    >
      <i className="fas fa-chart-line"></i>
      View Results
    </button>
  </>
) : exam.canResume ? (
  <>
    <div style={styles.resumeInfo}>
      <i className="fas fa-history"></i>
      Exam Incomplete - Resume Available
    </div>
    <button 
      onClick={() => handleStartExam(exam)}
      style={styles.resumeExamButtonDesktop}
    >
      <i className="fas fa-history"></i>
      RESUME EXAM
    </button>
  </>
) : exam.canStart && isOnlineExam ? (
  <>
    <div style={styles.activeInfo}>
      <i className="fas fa-exclamation-triangle"></i>
      Exam is ACTIVE
    </div>
    <button 
      onClick={() => handleStartExam(exam)}
      style={styles.startExamButtonDesktop}
    >
      <i className="fas fa-play"></i>
      START ONLINE EXAM
    </button>
  </>
) : status === 'upcoming' ? (
  <>
    <div style={styles.upcomingInfo}>
      <i className="fas fa-clock"></i>
      Starts in {timeUntilStart}
    </div>
    <button 
      disabled
      style={styles.disabledButtonDesktop}
    >
      <i className="fas fa-lock"></i>
      {isOnlineExam ? 'Not Available Yet' : 'Physical Exam'}
    </button>
  </>
) : (
  <>
    <div style={styles.endedInfo}>
      <i className="fas fa-ban"></i>
      {isOnlineExam ? 'Exam period has ended' : 'Physical Exam - Attend at Venue'}
    </div>
    <button 
      disabled
      style={styles.disabledButtonDesktop}
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

  // =================== LOADING STATE ===================
  if (loading) {
    return (
      <div className="content" style={styles.content}>
        <div className="dashboard-header" style={styles.dashboardHeader}>
          <h2 style={styles.pageTitle}>
            <i className="fas fa-clipboard-check" style={{ marginRight: '10px', color: '#dc3545' }}></i>
            Examinations
          </h2>
          <div className="date-display" style={styles.dateDisplay}>
            Loading examinations...
          </div>
        </div>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content" style={styles.content}>
        <div className="dashboard-header" style={styles.dashboardHeader}>
          <h2 style={styles.pageTitle}>
            <i className="fas fa-clipboard-check" style={{ marginRight: '10px', color: '#dc3545' }}></i>
            Examinations
          </h2>
          <div className="date-display" style={styles.dateDisplay}>
            Error
          </div>
        </div>
        <div style={styles.errorContainer}>
          <i className="fas fa-exclamation-triangle" style={styles.errorIcon}></i>
          <p style={styles.errorMessage}>
            {error}
          </p>
          <button 
            onClick={refreshExams}
            style={styles.retryButton}
          >
            <i className="fas fa-sync-alt"></i>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content" style={styles.content}>
      {/* Header */}
      <div style={styles.headerContainer}>
        <div style={styles.headerContent}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: '15px'
          }}>
            <div>
              <h2 style={styles.mainTitle}>
                <i className="fas fa-clipboard-check" style={{ marginRight: '10px', color: '#dc3545' }}></i>
                Examinations
              </h2>
              <div style={styles.studentInfo}>
                <span>Academic Year: {studentInfo?.academic_year || '2024/2025'}</span>
                <span>Student ID: {studentInfo?.student_id || 'N/A'}</span>
                <span>Program: {studentInfo?.program || 'N/A'}</span>
              </div>
            </div>
            <div style={styles.headerButtons}>
              <button 
                onClick={refreshExams}
                style={styles.refreshButton}
              >
                <i className="fas fa-sync-alt"></i>
                Refresh
              </button>
              <button 
                onClick={downloadExamPermit}
                style={styles.downloadPermitButton}
              >
                <i className="fas fa-download"></i>
                Download Permit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div style={styles.statsGrid}>
       {[
  { 
    label: 'Upcoming Exams', 
    value: exams.filter(e => e.status === 'upcoming').length,
    icon: 'fas fa-calendar-alt',
    color: '#007bff'
  },
  { 
    label: 'Active Now', 
    value: exams.filter(e => e.status === 'active').length,
    icon: 'fas fa-play-circle',
    color: '#dc3545'
  },
{ 
  label: 'Submitted', 
  value: exams.filter(e => e.submitted === true).length, // Explicit check for true
  icon: 'fas fa-check-circle',
  color: '#28a745'
},
  { 
    label: 'Incomplete', 
    value: exams.filter(e => e.hasIncompleteSubmission && !e.submitted).length,
    icon: 'fas fa-history',
    color: '#ffc107'
  },
  { 
    label: 'Online Exams', 
    value: exams.filter(e => e.isOnline).length,
    icon: 'fas fa-laptop',
    color: '#17a2b8'
  }
].map((stat, index) => (
  <div 
    key={index}
    style={styles.statCard}
  >
    <div style={{...styles.statValue, color: stat.color}}>
      {stat.value}
    </div>
    <div style={styles.statLabel}>
      <i className={stat.icon} style={{ color: stat.color }}></i>
      {stat.label}
    </div>
  </div>
))}
      </div>

      {/* Exams List */}
      <div style={styles.examsListContainer}>
        <div style={styles.examsListHeader}>
          <h3 style={styles.examsListTitle}>
            <i className="fas fa-list-alt" style={{ marginRight: '10px', color: '#dc3545' }}></i>
            Available Examinations
          </h3>
          <div style={styles.examsCount}>
            Showing {exams.length} exam{exams.length !== 1 ? 's' : ''}
          </div>
        </div>

        {exams.length === 0 ? (
          <div style={styles.emptyState}>
            <i className="fas fa-clipboard-list" style={styles.emptyStateIcon}></i>
            <h3 style={styles.emptyStateTitle}>
              No Examinations Scheduled
            </h3>
            <p style={styles.emptyStateMessage}>
              Examinations will appear here once they are scheduled by your department.
            </p>
            <button 
              onClick={refreshExams}
              style={styles.emptyStateButton}
            >
              <i className="fas fa-sync-alt"></i>
              Refresh List
            </button>
          </div>
        ) : (
          <div style={styles.examsList}>
            {exams.map((exam, index) => (
              isMobile ? 
                renderMobileExamCard(exam, index) : 
                renderDesktopExamCard(exam, index)
            ))}
          </div>
        )}
      </div>

      {/* Exam Model Component */}
      {showExamModel && selectedExam && (
        <ExamModel
          exam={selectedExam}
          onClose={() => {
            setShowExamModel(false);
            setSelectedExam(null);
            fetchExams(); // Refresh to update status
          }}
          onComplete={() => {
            fetchExams(); // Refresh the exam list
            setShowExamModel(false);
            setSelectedExam(null);
          }}
        />
      )}

      {/* Exam Paper Viewer Modal */}
      <ExamPaperViewerModal />

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-2px);
          transition: all 0.2s ease;
        }
        
        button:active:not(:disabled) {
          transform: translateY(0);
        }
        
        /* Mobile-specific optimizations */
        @media (max-width: 480px) {
          .stats-grid {
            gap: 10px !important;
          }
          
          .stats-grid > div {
            padding: 12px !important;
          }
        }
        
        /* Improve touch targets on mobile */
        @media (max-width: 768px) {
          button {
            min-height: 44px;
            min-width: 44px;
          }
          
          .mobile-exam-card button {
            width: 100%;
          }
        }
        
        /* Hover effects only on desktop */
        @media (hover: hover) {
          .desktop-exam-card:hover {
            transform: translateY(-4px);
            transition: transform 0.2s ease;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          }
        }
      `}</style>
    </div>
  );
};

// Styles
const styles = {
  content: {
    padding: 'clamp(10px, 3vw, 20px)'
  },
  dashboardHeader: {
    marginBottom: 'clamp(20px, 4vw, 30px)'
  },
  pageTitle: {
    margin: '0',
    fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)',
    lineHeight: '1.2'
  },
  dateDisplay: {
    color: '#666',
    fontSize: 'clamp(0.85rem, 2vw, 1rem)',
    marginTop: '5px'
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '300px'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    padding: '30px',
    backgroundColor: '#fee',
    border: '1px solid #f99',
    borderRadius: '12px',
    margin: '20px 0',
    textAlign: 'center'
  },
  errorIcon: {
    fontSize: '48px',
    color: '#dc3545',
    marginBottom: '20px'
  },
  errorMessage: {
    color: '#d33',
    marginBottom: '20px',
    fontSize: 'clamp(14px, 2vw, 16px)',
    lineHeight: '1.4'
  },
  retryButton: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: 'clamp(14px, 2vw, 16px)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  headerContainer: {
    marginBottom: 'clamp(20px, 4vw, 30px)'
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(8px, 1.5vw, 12px)'
  },
  mainTitle: {
    margin: '0 0 5px 0',
    fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)',
    lineHeight: '1.2'
  },
  studentInfo: {
    color: '#666',
    fontSize: 'clamp(0.85rem, 2vw, 1rem)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px'
  },
  headerButtons: {
    display: 'flex',
    gap: 'clamp(8px, 1.5vw, 10px)',
    flexDirection: window.innerWidth < 768 ? 'column' : 'row',
    width: window.innerWidth < 768 ? '100%' : 'auto'
  },
  refreshButton: {
    padding: 'clamp(10px, 1.8vw, 12px) clamp(16px, 2.5vw, 20px)',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: 'clamp(14px, 1.8vw, 16px)',
    width: window.innerWidth < 768 ? '100%' : 'auto',
    minHeight: '44px'
  },
  downloadPermitButton: {
    padding: 'clamp(10px, 1.8vw, 12px) clamp(16px, 2.5vw, 20px)',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: 'clamp(14px, 1.8vw, 16px)',
    fontWeight: '500',
    width: window.innerWidth < 768 ? '100%' : 'auto',
    minHeight: '44px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: window.innerWidth < 768 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
    gap: 'clamp(12px, 2.5vw, 15px)',
    marginBottom: 'clamp(25px, 4vw, 30px)'
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: 'clamp(15px, 3vw, 20px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    textAlign: 'center',
    borderTop: '4px solid'
  },
  statValue: {
    fontSize: 'clamp(24px, 5vw, 36px)',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: 'clamp(12px, 2vw, 14px)',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  examsListContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: 'clamp(15px, 3vw, 25px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  examsListHeader: {
    display: 'flex',
    flexDirection: window.innerWidth < 768 ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: window.innerWidth < 768 ? 'flex-start' : 'center',
    marginBottom: 'clamp(15px, 3vw, 25px)',
    paddingBottom: 'clamp(12px, 2.5vw, 15px)',
    borderBottom: '2px solid #dee2e6',
    gap: window.innerWidth < 768 ? '10px' : '0'
  },
  examsListTitle: {
    margin: 0,
    color: '#333',
    fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)'
  },
  examsCount: {
    fontSize: 'clamp(13px, 2vw, 14px)',
    color: '#6c757d'
  },
  emptyState: {
    padding: 'clamp(40px, 8vw, 60px) clamp(20px, 4vw, 30px)',
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px'
  },
  emptyStateIcon: {
    fontSize: 'clamp(48px, 10vw, 64px)',
    color: '#dee2e6',
    marginBottom: '20px'
  },
  emptyStateTitle: {
    color: '#6c757d',
    marginBottom: '15px',
    fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)'
  },
  emptyStateMessage: {
    color: '#999',
    marginBottom: '25px',
    maxWidth: '500px',
    margin: '0 auto',
    fontSize: 'clamp(14px, 2vw, 16px)',
    lineHeight: '1.5'
  },
  emptyStateButton: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    margin: '0 auto'
  },
  examsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(16px, 3vw, 20px)'
  },
  // Mobile Card Styles
  mobileCard: {
    border: '1px solid #dee2e6',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '16px',
    backgroundColor: 'white'
  },
  mobileCardHeader: {
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #dee2e6'
  },
  mobileCardStatusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
    flexWrap: 'wrap',
    gap: '8px'
  },
  statusBadge: {
    padding: '4px 12px',
    color: 'white',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
    flexShrink: '0'
  },
  typeBadge: {
    padding: '4px 10px',
    backgroundColor: '#e9ecef',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '500',
    color: '#495057',
    flexShrink: '0'
  },
  filesBadge: {
    padding: '4px 10px',
    backgroundColor: '#d4edda',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '500',
    color: '#155724',
    flexShrink: '0'
  },
  mobileCardTitle: {
    margin: '0 0 6px 0',
    fontSize: '16px',
    color: '#333',
    lineHeight: '1.3'
  },
  mobileCourseInfo: {
    fontSize: '14px',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  mobileCardBody: {
    padding: '16px'
  },
  mobileDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '16px'
  },
  mobileDetailLabel: {
    fontSize: '11px',
    color: '#6c757d',
    marginBottom: '4px'
  },
  mobileDetailValue: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#495057',
    lineHeight: '1.3'
  },
  mobileButtonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  downloadPaperButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  viewResultsButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  resumeExamButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#ffc107',
    color: '#212529',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  startExamButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  disabledButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#e9ecef',
    color: '#6c757d',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'not-allowed'
  },
  // Desktop Card Styles
  desktopCard: {
    border: '1px solid #dee2e6',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '20px',
    backgroundColor: 'white',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  desktopCardHeader: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  desktopStatusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '10px'
  },
  desktopStatusBadge: {
    padding: '4px 12px',
    color: 'white',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  desktopTypeBadge: {
    padding: '4px 12px',
    backgroundColor: '#e9ecef',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#495057'
  },
  desktopFilesBadge: {
    padding: '4px 12px',
    backgroundColor: '#d4edda',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#155724',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  desktopCardTitle: {
    margin: 0,
    fontSize: '18px',
    color: '#333'
  },
  desktopCardHeaderRight: {
    textAlign: 'right'
  },
  desktopCourseInfo: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '5px'
  },
  examId: {
    fontSize: '12px',
    color: '#6c757d'
  },
  desktopCardBody: {
    padding: '20px'
  },
  examDescription: {
    color: '#666',
    marginBottom: '20px',
    lineHeight: '1.6'
  },
  desktopDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  },
  desktopDetailLabel: {
    fontSize: '12px',
    color: '#6c757d',
    marginBottom: '5px'
  },
  desktopDetailValue: {
    fontWeight: '500',
    color: '#495057'
  },
  desktopActionArea: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: '1px solid #dee2e6'
  },
  leftActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  downloadPaperButtonDesktop: {
    padding: '8px 20px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500'
  },
  rightActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  submittedInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#28a745'
  },
  viewResultsButtonDesktop: {
    padding: '8px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500'
  },
  resumeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#ffc107',
    fontWeight: 'bold'
  },
  activeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#dc3545',
    fontWeight: 'bold'
  },
  resumeExamButtonDesktop: {
    padding: '10px 25px',
    backgroundColor: '#ffc107',
    color: '#212529',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  startExamButtonDesktop: {
    padding: '10px 25px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  upcomingInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#007bff'
  },
  disabledButtonDesktop: {
    padding: '10px 25px',
    backgroundColor: '#e9ecef',
    color: '#6c757d',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'not-allowed'
  },
  endedInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#6c757d'
  },
  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  paperViewerContainer: {
    width: '90%',
    maxWidth: '1200px',
    height: '90%',
    backgroundColor: 'white',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  paperViewerHeader: {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  paperViewerTitle: {
    margin: 0
  },
  paperCloseButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%'
  },
  paperGrid: {
    flex: 1,
    padding: '30px',
    overflowY: 'auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  paperCard: {
    border: '1px solid #dee2e6',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: 'white',
    transition: 'transform 0.2s',
    cursor: 'pointer'
  },
  paperCardHeader: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    textAlign: 'center',
    borderBottom: '1px solid #dee2e6'
  },
  paperIcon: {
    fontSize: '48px',
    marginBottom: '10px'
  },
  paperName: {
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '5px'
  },
  paperType: {
    fontSize: '12px',
    color: '#666'
  },
  paperCardBody: {
    padding: '20px'
  },
  paperButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  viewButton: {
    padding: '12px',
    backgroundColor: '#3498db',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    textAlign: 'center',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  downloadButton: {
    padding: '12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  }
};

export default Examinations;