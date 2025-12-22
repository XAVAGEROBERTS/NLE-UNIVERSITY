import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const Examinations = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const { user } = useStudentAuth();
  const [isMobile, setIsMobile] = useState(false);

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

    console.log('Fetching exams for user:', user.email);

    // Get student data
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, full_name, student_id, program, year_of_study, semester, academic_year, program_id')
      .eq('email', user.email)
      .single();

    if (studentError) {
      console.error('Student error:', studentError);
      throw new Error(`Student data error: ${studentError.message}`);
    }

    if (!student) {
      throw new Error('Student not found');
    }

    console.log('Student found:', student.full_name);
    setStudentInfo(student);

    // Fetch student's enrolled courses - ONLY courses that are NOT completed
    const { data: studentCourses, error: coursesError } = await supabase
      .from('student_courses')
      .select('course_id, status')
      .eq('student_id', student.id)
      .eq('status', 'enrolled'); // ONLY get enrolled courses (not completed)

    if (coursesError) {
      console.error('Courses error:', coursesError);
      throw new Error(`Courses error: ${coursesError.message}`);
    }

    const courseIds = studentCourses ? studentCourses.map(sc => sc.course_id) : [];
    console.log('Enrolled course IDs (non-completed):', courseIds);

    if (courseIds.length === 0) {
      console.log('No enrolled courses found');
      setExams([]);
      setLoading(false);
      return;
    }

    // Fetch exams for these courses
    let query = supabase
      .from('examinations')
      .select(`
        *,
        courses (id, course_code, course_name)
      `)
      .in('course_id', courseIds)
      .in('status', ['scheduled', 'published', 'active', 'completed']) // Include all statuses
      .order('start_time', { ascending: true });

    // Apply cohort targeting if student has cohort data
    const cleanAY = (student.academic_year || '').trim().replace(/\s/g, '');
    
    if (cleanAY || student.year_of_study || student.semester || student.program_id) {
      const orConditions = [];
      
      // Academic year
      if (cleanAY) {
        orConditions.push(`target_academic_year.eq.${cleanAY}`);
        orConditions.push(`target_academic_year.is.null`);
      }
      
      // Year of study
      if (student.year_of_study != null) {
        orConditions.push(`target_year_of_study.eq.${student.year_of_study}`);
        orConditions.push(`target_year_of_study.is.null`);
      }
      
      // Semester
      if (student.semester != null) {
        orConditions.push(`target_semester.eq.${student.semester}`);
        orConditions.push(`target_semester.is.null`);
      }
      
      // Program
      if (student.program_id) {
        orConditions.push(`target_program_id.eq.${student.program_id}`);
        orConditions.push(`target_program_id.is.null`);
      }
      
      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
        console.log('Applied cohort filter:', orConditions.join(','));
      }
    }

    const { data: examsData, error: examsError } = await query;

    if (examsError) {
      console.error('Exams error:', examsError);
      throw new Error(`Exams error: ${examsError.message}`);
    }

    // Fetch ALL exam submissions for this student (including past ones)
    const { data: submissionsData, error: submissionsError } = await supabase
      .from('exam_submissions')
      .select('*')
      .eq('student_id', student.id);

    if (submissionsError) {
      console.error('Submissions error:', submissionsError);
      throw new Error(`Submissions error: ${submissionsError.message}`);
    }
    
    console.log('All exam submissions found:', submissionsData?.length || 0);

    // Process ALL exams regardless of current status
    const processedExams = examsData ? examsData.map(exam => {
      const studentSubmission = submissionsData?.find(
        sub => sub.exam_id === exam.id
      );

      const now = new Date();
      const startTime = new Date(exam.start_time);
      const endTime = new Date(exam.end_time);
      
      // Determine exam status based on current time
      let status = exam.status;
      let isActive = now >= startTime && now <= endTime;
      let isUpcoming = now < startTime;
      let isEnded = now > endTime;
      let canStart = false;

      // Check if student can start this exam
      if (!studentSubmission) {
        if (isActive && exam.status === 'active') {
          canStart = true;
        }
      }

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        courseId: exam.course_id,
        courseCode: exam.courses?.course_code || 'N/A',
        courseName: exam.courses?.course_name || exam.title,
        examType: exam.exam_type,
        startTime: exam.start_time,
        endTime: exam.end_time,
        duration: exam.duration_minutes,
        totalMarks: exam.total_marks,
        passingMarks: exam.passing_marks,
        location: exam.location,
        supervisor: exam.supervisor,
        instructions: exam.instructions,
        status: status,
        submitted: !!studentSubmission,
        submission: studentSubmission || null,
        isActive: isActive,
        isUpcoming: isUpcoming,
        isEnded: isEnded,
        canStart: canStart,
        // Add these for easier rendering
        rawStatus: exam.status
      };
    }) : [];

    console.log('Processed exams (all statuses):', processedExams.length);
    
    // Log breakdown by status
    const activeExams = processedExams.filter(e => e.isActive).length;
    const upcomingExams = processedExams.filter(e => e.isUpcoming).length;
    const endedExams = processedExams.filter(e => e.isEnded).length;
    const submittedExams = processedExams.filter(e => e.submitted).length;
    
    console.log('Breakdown:', {
      active: activeExams,
      upcoming: upcomingExams,
      ended: endedExams,
      submitted: submittedExams,
      total: processedExams.length
    });

    setExams(processedExams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    setError(`Failed to load examinations: ${error.message}`);
    setExams([]);
  } finally {
    setLoading(false);
  }
};

 const checkIfExamIsActive = (exam) => {
  const now = new Date();
  const startTime = new Date(exam.startTime);
  const endTime = new Date(exam.endTime);
  return now >= startTime && now <= endTime;
};

const checkIfCanStartExam = (exam, submission) => {
  if (submission) return false; // Already submitted
  if (!exam.isActive) return false; // Not active
  return true;
};
  const handleExamClick = async (exam) => {
    if (exam.submitted) {
      // Navigate to results view
      navigate(`/examinations/results/${exam.id}`);
    } else if (exam.canStart) {
      // Start exam - show confirmation
      const confirmed = window.confirm(
        `Are you ready to start the ${exam.title} exam?\n\n` +
        `Duration: ${exam.duration} minutes\n` +
        `Total Marks: ${exam.totalMarks}\n\n` +
        `Once you start, the timer will begin and you cannot pause the exam.\n\n` +
        `Do you want to continue?`
      );
      
      if (confirmed) {
        // Create initial submission record
        try {
          const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('email', user.email)
            .single();

          const { error } = await supabase
            .from('exam_submissions')
            .insert({
              exam_id: exam.id,
              student_id: student.id,
              status: 'started',
              started_at: new Date().toISOString()
            });

          if (error) throw error;

          // Navigate to exam interface
          navigate(`/examinations/take/${exam.id}`);
        } catch (error) {
          console.error('Error starting exam:', error);
          alert('Failed to start exam. Please try again.');
        }
      }
    } else if (exam.isActive) {
      alert('This exam is currently active. Please start the exam from the main interface.');
    } else {
      const now = new Date();
      const startTime = new Date(exam.startTime);
      
      if (now < startTime) {
        const timeUntil = Math.floor((startTime - now) / 1000);
        const hours = Math.floor(timeUntil / 3600);
        const minutes = Math.floor((timeUntil % 3600) / 60);
        
        alert(
          `Exam starts on ${formatDate(exam.startTime)}\n\n` +
          `Time remaining: ${hours}h ${minutes}m\n\n` +
          `Please come back when the exam starts.`
        );
      } else {
        alert('Exam period has ended. You can no longer take this exam.');
      }
    }
  };

  const downloadExamPermit = async () => {
    try {
      if (!studentInfo) {
        alert('Student information not available. Please try again.');
        return;
      }



      // Create permit element
      const permitElement = document.createElement('div');
      permitElement.id = 'exam-permit-content';
      permitElement.style.cssText = `
        width: 800px;
        padding: 40px;
        background: white;
        font-family: Arial, sans-serif;
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isMobile) {
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + ' EAT';
  };

  // FIXED: Use the correct property names (camelCase instead of snake_case)
 const getExamStatus = (exam) => {
  if (exam.submitted) return 'submitted';
  if (exam.isActive) return 'active';
  if (exam.isUpcoming) return 'upcoming';
  if (exam.isEnded) return 'ended';
  return 'upcoming';
};
  const getStatusColor = (status) => {
    switch(status) {
      case 'submitted': return '#28a745';
      case 'active': return '#dc3545';
      case 'upcoming': return '#007bff';
      case 'ended': return '#6c757d';
      default: return '#6c757d';
    }
  };

  // FIXED: Get time until start with correct property names
  const getTimeUntilStart = (exam) => {
    const now = new Date();
    const startTime = new Date(exam.startTime); // Changed from exam.start_time
    
    if (now >= startTime) return 'Started';
    
    const diffSeconds = Math.floor((startTime - now) / 1000);
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const refreshExams = () => {
    fetchExams();
  };

  // Render mobile exam card
  const renderMobileExamCard = (exam, index) => {
    const status = getExamStatus(exam);
    const statusColor = getStatusColor(status);
    const timeUntilStart = getTimeUntilStart(exam);
    
    return (
      <div 
        key={exam.id} 
        style={{
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '16px',
          borderLeft: `5px solid ${statusColor}`,
          backgroundColor: 'white'
        }}
      >
        {/* Exam Header */}
        <div style={{
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '10px',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{
              padding: '4px 12px',
              backgroundColor: statusColor,
              color: 'white',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              flexShrink: '0'
            }}>
              {status.toUpperCase()}
            </div>
            <div style={{
              padding: '4px 10px',
              backgroundColor: '#e9ecef',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '500',
              color: '#495057',
              flexShrink: '0'
            }}>
              {exam.examType.toUpperCase()}
            </div>
          </div>
          
          <h4 style={{ 
            margin: '0 0 6px 0',
            fontSize: '16px',
            color: '#333',
            lineHeight: '1.3'
          }}>
            {exam.title}
          </h4>
          
          <div style={{
            fontSize: '14px',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <i className="fas fa-book"></i>
            <span>{exam.courseCode}: {exam.courseName}</span>
          </div>
        </div>

        {/* Exam Details */}
        <div style={{ padding: '16px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>
                <i className="far fa-calendar-alt"></i> Start
              </div>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: '500', 
                color: '#495057',
                lineHeight: '1.3'
              }}>
                {formatDate(exam.startTime)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>
                <i className="fas fa-clock"></i> Duration
              </div>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: '500', 
                color: '#495057' 
              }}>
                {exam.duration} min
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>
                <i className="fas fa-chart-bar"></i> Marks
              </div>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: '500', 
                color: '#495057' 
              }}>
                {exam.totalMarks} marks
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>
                <i className="fas fa-map-marker-alt"></i> Location
              </div>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: '500', 
                color: '#495057',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {exam.location || 'TBA'}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div>
            {exam.submitted ? (
              <button 
                onClick={() => navigate('/results', { 
                  state: { 
                    examId: exam.id,
                    courseCode: exam.courseCode,
                    courseName: exam.courseName,
                    examTitle: exam.title,
                    submission: exam.submission
                  } 
                })}
                style={{
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
                }}
              >
                <i className="fas fa-chart-line"></i>
                View Results
              </button>
            ) : exam.canStart ? (
              <button 
                onClick={() => handleExamClick(exam)}
                style={{
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
                }}
              >
                <i className="fas fa-play"></i>
                START EXAM
              </button>
            ) : status === 'upcoming' ? (
              <button 
                disabled
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#e9ecef',
                  color: '#6c757d',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'not-allowed'
                }}
              >
                <i className="fas fa-clock"></i>
                Starts in {timeUntilStart}
              </button>
            ) : (
              <button 
                disabled
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#e9ecef',
                  color: '#6c757d',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'not-allowed'
                }}
              >
                <i className="fas fa-times-circle"></i>
                Exam Closed
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
    
    return (
      <div 
        key={exam.id} 
        style={{
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '20px',
          borderLeft: `5px solid ${statusColor}`,
          backgroundColor: 'white',
          cursor: exam.canStart || exam.submitted ? 'pointer' : 'default',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (exam.canStart || exam.submitted) {
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
        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              marginBottom: '10px'
            }}>
              <span style={{
                padding: '4px 12px',
                backgroundColor: statusColor,
                color: 'white',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {status.toUpperCase()}
              </span>
              <span style={{
                padding: '4px 12px',
                backgroundColor: '#e9ecef',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                color: '#495057'
              }}>
                {exam.examType.toUpperCase()}
              </span>
            </div>
            <h4 style={{ 
              margin: 0,
              fontSize: '18px',
              color: '#333'
            }}>
              {exam.title}
            </h4>
          </div>
          <div style={{
            textAlign: 'right'
          }}>
            <div style={{
              fontSize: '14px',
              color: '#666',
              marginBottom: '5px'
            }}>
              <i className="fas fa-book" style={{ marginRight: '8px' }}></i>
              {exam.courseCode}: {exam.courseName}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6c757d'
            }}>
              Exam ID: {exam.id.slice(0, 8).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Exam Details */}
        <div style={{ padding: '20px' }}>
          {exam.description && (
            <p style={{ 
              color: '#666', 
              marginBottom: '20px',
              lineHeight: '1.6'
            }}>
              {exam.description}
            </p>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                <i className="far fa-calendar-alt" style={{ marginRight: '8px' }}></i>
                Start Time
              </div>
              <div style={{ fontWeight: '500', color: '#495057' }}>
                {formatDate(exam.startTime)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                <i className="far fa-calendar-times" style={{ marginRight: '8px' }}></i>
                End Time
              </div>
              <div style={{ fontWeight: '500', color: '#495057' }}>
                {formatDate(exam.endTime)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                <i className="fas fa-clock" style={{ marginRight: '8px' }}></i>
                Duration
              </div>
              <div style={{ fontWeight: '500', color: '#495057' }}>
                {exam.duration} minutes
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                <i className="fas fa-chart-bar" style={{ marginRight: '8px' }}></i>
                Total Marks
              </div>
              <div style={{ fontWeight: '500', color: '#495057' }}>
                {exam.totalMarks} marks
                {exam.passingMarks && ` (Pass: ${exam.passingMarks})`}
              </div>
            </div>
            {exam.location && (
              <div>
                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
                  <i className="fas fa-map-marker-alt" style={{ marginRight: '8px' }}></i>
                  Location
                </div>
                <div style={{ fontWeight: '500', color: '#495057' }}>
                  {exam.location}
                </div>
              </div>
            )}
          </div>

          {/* Action Area */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '20px',
            borderTop: '1px solid #dee2e6'
          }}>
            {exam.submitted ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#28a745'
                }}>
                  <i className="fas fa-check-circle" style={{ fontSize: '20px' }}></i>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>
                      Submitted on {new Date(exam.submission.submitted_at).toLocaleDateString()}
                    </div>
                    {exam.submission.grade && (
                      <div style={{ fontSize: '14px', color: '#495057' }}>
                        Grade: {exam.submission.grade} | 
                        Marks: {exam.submission.total_marks_obtained || 'N/A'}/{exam.totalMarks}
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/results', { 
                    state: { 
                      examId: exam.id,
                      courseCode: exam.courseCode,
                      courseName: exam.courseName,
                      examTitle: exam.title,
                      submission: exam.submission
                    } 
                  })}
                  style={{
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
                  }}
                >
                  <i className="fas fa-chart-line"></i>
                  View Results
                </button>
              </div>
            ) : status === 'active' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#dc3545',
                  fontWeight: 'bold'
                }}>
                  <i className="fas fa-exclamation-triangle"></i>
                  Exam is ONGOING
                </div>
                <button 
                  onClick={() => handleExamClick(exam)}
                  style={{
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
                  }}
                >
                  <i className="fas fa-play"></i>
                  START EXAM
                </button>
              </div>
            ) : status === 'upcoming' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#007bff'
                }}>
                  <i className="fas fa-clock"></i>
                  Starts in {timeUntilStart}
                </div>
                <button 
                  disabled
                  style={{
                    padding: '10px 25px',
                    backgroundColor: '#e9ecef',
                    color: '#6c757d',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'not-allowed'
                  }}
                >
                  <i className="fas fa-lock"></i>
                  Not Available Yet
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#6c757d'
                }}>
                  <i className="fas fa-ban"></i>
                  Exam period has ended
                </div>
                <button 
                  disabled
                  style={{
                    padding: '10px 25px',
                    backgroundColor: '#e9ecef',
                    color: '#6c757d',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'not-allowed'
                  }}
                >
                  <i className="fas fa-times-circle"></i>
                  Closed
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="content" style={{ padding: 'clamp(10px, 3vw, 20px)' }}>
        <div className="dashboard-header" style={{ marginBottom: 'clamp(20px, 4vw, 30px)' }}>
          <h2 style={{ 
            margin: '0',
            fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)',
            lineHeight: '1.2'
          }}>
            <i className="fas fa-clipboard-check" style={{ marginRight: '10px', color: '#dc3545' }}></i>
            Examinations
          </h2>
          <div className="date-display" style={{ 
            color: '#666', 
            fontSize: 'clamp(0.85rem, 2vw, 1rem)',
            marginTop: '5px'
          }}>
            Loading examinations...
          </div>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '300px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content" style={{ padding: 'clamp(10px, 3vw, 20px)' }}>
        <div className="dashboard-header" style={{ marginBottom: 'clamp(20px, 4vw, 30px)' }}>
          <h2 style={{ 
            margin: '0',
            fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)',
            lineHeight: '1.2'
          }}>
            <i className="fas fa-clipboard-check" style={{ marginRight: '10px', color: '#dc3545' }}></i>
            Examinations
          </h2>
          <div className="date-display" style={{ 
            color: '#666', 
            fontSize: 'clamp(0.85rem, 2vw, 1rem)',
            marginTop: '5px'
          }}>
            Error
          </div>
        </div>
        <div style={{
          padding: '30px',
          backgroundColor: '#fee',
          border: '1px solid #f99',
          borderRadius: '12px',
          margin: '20px 0',
          textAlign: 'center'
        }}>
          <i className="fas fa-exclamation-triangle" style={{
            fontSize: '48px',
            color: '#dc3545',
            marginBottom: '20px'
          }}></i>
          <p style={{ 
            color: '#d33', 
            marginBottom: '20px', 
            fontSize: 'clamp(14px, 2vw, 16px)',
            lineHeight: '1.4'
          }}>
            {error}
          </p>
          <button 
            onClick={refreshExams}
            style={{
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
            }}
          >
            <i className="fas fa-sync-alt"></i>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content" style={{ padding: 'clamp(10px, 3vw, 20px)' }}>
      {/* Header */}
      <div style={{ 
        marginBottom: 'clamp(20px, 4vw, 30px)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(8px, 1.5vw, 12px)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: '15px'
          }}>
            <div>
              <h2 style={{ 
                margin: '0 0 5px 0',
                fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)',
                lineHeight: '1.2'
              }}>
                <i className="fas fa-clipboard-check" style={{ marginRight: '10px', color: '#dc3545' }}></i>
                Examinations
              </h2>
              <div style={{ 
                color: '#666', 
                fontSize: 'clamp(0.85rem, 2vw, 1rem)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <span>Academic Year: {studentInfo?.academic_year || '2024/2025'}</span>
                <span>Student ID: {studentInfo?.student_id || 'N/A'}</span>
              </div>
            </div>
            <div style={{ 
              display: 'flex', 
              gap: 'clamp(8px, 1.5vw, 10px)',
              flexDirection: isMobile ? 'column' : 'row',
              width: isMobile ? '100%' : 'auto'
            }}>
              <button 
                onClick={refreshExams}
                style={{
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
                  width: isMobile ? '100%' : 'auto',
                  minHeight: '44px'
                }}
              >
                <i className="fas fa-sync-alt"></i>
                Refresh
              </button>
              <button 
                onClick={downloadExamPermit}
                style={{
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
                  width: isMobile ? '100%' : 'auto',
                  minHeight: '44px'
                }}
              >
                <i className="fas fa-download"></i>
                Download Permit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
        gap: 'clamp(12px, 2.5vw, 15px)',
        marginBottom: 'clamp(25px, 4vw, 30px)'
      }}>
        {[
          { 
            label: 'Upcoming Exams', 
            value: exams.filter(e => getExamStatus(e) === 'upcoming').length,
            icon: 'fas fa-calendar-alt',
            color: '#007bff'
          },
          { 
            label: 'Active Now', 
            value: exams.filter(e => getExamStatus(e) === 'active').length,
            icon: 'fas fa-play-circle',
            color: '#dc3545'
          },
          { 
            label: 'Submitted', 
            value: exams.filter(e => getExamStatus(e) === 'submitted').length,
            icon: 'fas fa-check-circle',
            color: '#28a745'
          },
          { 
            label: 'Ended', 
            value: exams.filter(e => getExamStatus(e) === 'ended').length,
            icon: 'fas fa-clock',
            color: '#6c757d'
          }
        ].map((stat, index) => (
          <div 
            key={index}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: 'clamp(15px, 3vw, 20px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              textAlign: 'center',
              borderTop: `4px solid ${stat.color}`
            }}
          >
            <div style={{
              fontSize: 'clamp(24px, 5vw, 36px)',
              fontWeight: 'bold',
              color: stat.color,
              marginBottom: '8px'
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: 'clamp(12px, 2vw, 14px)',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <i className={stat.icon} style={{ color: stat.color }}></i>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Exams List */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: 'clamp(15px, 3vw, 25px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          marginBottom: 'clamp(15px, 3vw, 25px)',
          paddingBottom: 'clamp(12px, 2.5vw, 15px)',
          borderBottom: '2px solid #dee2e6',
          gap: isMobile ? '10px' : '0'
        }}>
          <h3 style={{ 
            margin: 0, 
            color: '#333',
            fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)'
          }}>
            <i className="fas fa-list-alt" style={{ marginRight: '10px', color: '#dc3545' }}></i>
            Available Examinations
          </h3>
          <div style={{ 
            fontSize: 'clamp(13px, 2vw, 14px)', 
            color: '#6c757d' 
          }}>
            Showing {exams.length} exam{exams.length !== 1 ? 's' : ''}
          </div>
        </div>

        {exams.length === 0 ? (
          <div style={{
            padding: 'clamp(40px, 8vw, 60px) clamp(20px, 4vw, 30px)',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px'
          }}>
            <i className="fas fa-clipboard-list" style={{
              fontSize: 'clamp(48px, 10vw, 64px)',
              color: '#dee2e6',
              marginBottom: '20px'
            }}></i>
            <h3 style={{ 
              color: '#6c757d', 
              marginBottom: '15px',
              fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)'
            }}>
              No Examinations Scheduled
            </h3>
            <p style={{ 
              color: '#999', 
              marginBottom: '25px', 
              maxWidth: '500px', 
              margin: '0 auto',
              fontSize: 'clamp(14px, 2vw, 16px)',
              lineHeight: '1.5'
            }}>
              Examinations will appear here once they are scheduled by your department.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(16px, 3vw, 20px)'
          }}>
            {exams.map((exam, index) => (
              isMobile ? 
                renderMobileExamCard(exam, index) : 
                renderDesktopExamCard(exam, index)
            ))}
          </div>
        )}
      </div>

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

export default Examinations;