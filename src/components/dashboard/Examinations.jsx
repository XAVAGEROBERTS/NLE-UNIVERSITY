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
        .select('id, full_name, student_id, program, year_of_study, semester, academic_year')
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

      // Fetch student's enrolled courses
      const { data: studentCourses, error: coursesError } = await supabase
        .from('student_courses')
        .select('course_id, status')
        .eq('student_id', student.id)
        .in('status', ['enrolled', 'in_progress', 'completed']);

      if (coursesError) {
        console.error('Courses error:', coursesError);
        throw new Error(`Courses error: ${coursesError.message}`);
      }

      const courseIds = studentCourses ? studentCourses.map(sc => sc.course_id) : [];
      console.log('Enrolled course IDs:', courseIds);

      if (courseIds.length === 0) {
        console.log('No enrolled courses found');
        setExams([]);
        setLoading(false);
        return;
      }

      // Fetch exams for these courses
      const { data: examsData, error: examsError } = await supabase
        .from('examinations')
        .select(`
          *,
          courses (id, course_code, course_name)
        `)
        .in('course_id', courseIds)
        .in('status', ['published', 'active', 'completed'])
        .order('start_time', { ascending: true });

      if (examsError) {
        console.error('Exams error:', examsError);
        throw new Error(`Exams error: ${examsError.message}`);
      }

      console.log('Exams fetched:', examsData?.length || 0);

      // Fetch student's exam submissions separately to avoid nested query issues
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('student_id', student.id);

      if (submissionsError) {
        console.error('Submissions error:', submissionsError);
        throw new Error(`Submissions error: ${submissionsError.message}`);
      }

      console.log('Submissions found:', submissionsData?.length || 0);

      // Process exams with submissions
      const processedExams = examsData ? examsData.map(exam => {
        const studentSubmission = submissionsData?.find(
          sub => sub.exam_id === exam.id
        );

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
          status: exam.status,
          submitted: !!studentSubmission,
          submission: studentSubmission || null,
          isActive: checkIfExamIsActive(exam),
          canStart: checkIfCanStartExam(exam, studentSubmission)
        };
      }) : [];

      console.log('Processed exams:', processedExams.length);
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
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);
    return now >= startTime && now <= endTime && exam.status === 'active';
  };

  const checkIfCanStartExam = (exam, submission) => {
    if (submission) return false; // Already submitted
    
    const now = new Date();
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);
    
    return now >= startTime && now <= endTime && exam.status === 'active';
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
    const now = new Date();
    const startTime = new Date(exam.startTime);
    const endTime = new Date(exam.endTime);

    if (exam.submitted) return 'submitted';
    if (exam.isActive) return 'active';
    if (now < startTime) return 'upcoming';
    if (exam.status === 'completed') return 'ended';
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

  const refreshExams = () => {
    fetchExams();
  };

// In the Examinations component, update the viewExamResults function:
const viewExamResults = (exam) => {
  if (exam.submission) {
    // Navigate to the Results page with the exam ID as state
    navigate('/results', { 
      state: { 
        examId: exam.id,
        courseCode: exam.courseCode,
        courseName: exam.courseName,
        examTitle: exam.title
      } 
    });
  } else {
    alert('No results available for this exam yet.');
  }
};

  if (loading) {
    return (
      <div className="content">
        <div className="dashboard-header">
          <h2><i className="fas fa-clipboard-check"></i> Examinations</h2>
          <div className="date-display">Loading examinations...</div>
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
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content">
        <div className="dashboard-header">
          <h2><i className="fas fa-clipboard-check"></i> Examinations</h2>
          <div className="date-display">Error</div>
        </div>
        <div style={{
          padding: '30px',
          backgroundColor: '#fee',
          border: '1px solid #f99',
          borderRadius: '8px',
          margin: '20px 0',
          textAlign: 'center'
        }}>
          <i className="fas fa-exclamation-triangle" style={{
            fontSize: '48px',
            color: '#dc3545',
            marginBottom: '20px'
          }}></i>
          <p style={{ color: '#d33', marginBottom: '20px', fontSize: '16px' }}>
            {error}
          </p>
          <button 
            onClick={refreshExams}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
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
    <div className="content">
      <div className="dashboard-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0' }}>
            <i className="fas fa-clipboard-check" style={{ marginRight: '10px', color: '#dc3545' }}></i>
            Examinations
          </h2>
          <div className="date-display" style={{ color: '#666', fontSize: '14px' }}>
            Academic Year: {studentInfo?.academic_year || '2024/2025'} | 
            Student ID: {studentInfo?.student_id || 'N/A'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={refreshExams}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <i className="fas fa-sync-alt"></i>
            Refresh
          </button>
          <button 
            onClick={downloadExamPermit}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <i className="fas fa-download"></i>
            Download Permit
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
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
              padding: '20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              textAlign: 'center',
              borderTop: `4px solid ${stat.color}`
            }}
          >
            <div style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: stat.color,
              marginBottom: '10px'
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
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
        padding: '25px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px',
          paddingBottom: '15px',
          borderBottom: '2px solid #dee2e6'
        }}>
          <h3 style={{ margin: 0, color: '#333' }}>
            <i className="fas fa-list-alt" style={{ marginRight: '10px', color: '#dc3545' }}></i>
            Available Examinations
          </h3>
          <div style={{ fontSize: '14px', color: '#6c757d' }}>
            Showing {exams.length} exam{exams.length !== 1 ? 's' : ''}
          </div>
        </div>

        {exams.length === 0 ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <i className="fas fa-clipboard-list" style={{
              fontSize: '64px',
              color: '#dee2e6',
              marginBottom: '20px'
            }}></i>
            <h3 style={{ color: '#6c757d', marginBottom: '15px' }}>
              No Examinations Scheduled
            </h3>
            <p style={{ color: '#999', marginBottom: '25px', maxWidth: '500px', margin: '0 auto' }}>
              Examinations will appear here once they are scheduled by your department.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {exams.map((exam, index) => {
              const status = getExamStatus(exam);
              const statusColor = getStatusColor(status);
              
              return (
                <div 
                  key={exam.id} 
                  style={{
                    border: '1px solid #dee2e6',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    borderLeft: `5px solid ${statusColor}`,
                    cursor: exam.canStart || exam.submitted ? 'pointer' : 'default'
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
                // To:
onClick={() => {
  if (exam.canStart) handleExamClick(exam);
  else if (exam.submitted) {
    // Direct navigation without separate function
    navigate('/results', { 
      state: { 
        examId: exam.id,
        courseCode: exam.courseCode,
        courseName: exam.courseName,
        examTitle: exam.title,
        submission: exam.submission
      } 
    });
  }
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
                            onClick={() => viewExamResults(exam)}
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
                      ) : exam.canStart ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#dc3545',
                            fontWeight: '500'
                          }}>
                            <i className="fas fa-exclamation-circle"></i>
                            Exam is now active
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
                            Starts in {Math.floor((new Date(exam.startTime) - new Date()) / 1000 / 3600)}h {Math.floor(((new Date(exam.startTime) - new Date()) / 1000 / 60) % 60)}m
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
            })}
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
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
        
        button:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};

export default Examinations;