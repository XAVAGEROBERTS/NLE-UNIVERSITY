import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { examId } = useParams();
  const [activeYear, setActiveYear] = useState('year1');
  const [resultsData, setResultsData] = useState({});
  const [cgpa, setCgpa] = useState(0.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [specificExam, setSpecificExam] = useState(null);
  const [examDetails, setExamDetails] = useState(null);
  const [examSubmission, setExamSubmission] = useState(null);
  const { user } = useStudentAuth();

  useEffect(() => {
    if (examId) {
      fetchSpecificExamData();
    } else if (location.state?.examId) {
      setSpecificExam({
        examId: location.state.examId,
        courseCode: location.state.courseCode,
        courseName: location.state.courseName,
        examTitle: location.state.examTitle,
        submission: location.state.submission
      });
      fetchSpecificExamDetails(location.state.examId);
    }
  }, [examId, location]);

  const fetchSpecificExamData = async () => {
    try {
      setLoading(true);
      
      // Get student data
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, full_name, student_id, program, year_of_study, academic_year, semester')
        .eq('email', user.email)
        .single();

      if (studentError) throw studentError;
      setStudentInfo(student);

      // Fetch exam details
      const { data: exam, error: examError } = await supabase
        .from('examinations')
        .select(`
          *,
          courses (id, course_code, course_name, credits)
        `)
        .eq('id', examId)
        .single();

      if (examError) throw examError;
      setExamDetails(exam);

      // Fetch submission data
      const { data: submission, error: subError } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', student.id)
        .single();

      if (subError && subError.code !== 'PGRST116') throw subError;
      setExamSubmission(submission || null);

      if (exam && submission) {
        setSpecificExam({
          examId: exam.id,
          courseCode: exam.courses?.course_code || 'N/A',
          courseName: exam.courses?.course_name || 'N/A',
          examTitle: exam.title || 'Exam',
          submission: submission
        });
      }
    } catch (error) {
      console.error('Error fetching specific exam data:', error);
      setError(`Failed to load exam results: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecificExamDetails = async (examId) => {
    try {
      const { data: exam, error: examError } = await supabase
        .from('examinations')
        .select(`
          *,
          courses (course_code, course_name, credits)
        `)
        .eq('id', examId)
        .single();

      if (examError) throw examError;
      setExamDetails(exam);
    } catch (error) {
      console.error('Error fetching exam details:', error);
    }
  };

  useEffect(() => {
    if (user?.email && !examId) {
      fetchResults();
    }
  }, [user, examId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, full_name, student_id, program, year_of_study, academic_year, semester')
        .eq('email', user.email)
        .single();

      if (studentError) throw new Error(`Student data error: ${studentError.message}`);
      if (!student) throw new Error('Student not found');

      setStudentInfo(student);

      // Fetch exam submissions that are graded
      const { data: examSubmissions, error: subError } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('student_id', student.id)
        .eq('status', 'graded')
        .not('total_marks_obtained', 'is', null);

      if (subError) throw new Error(`Exam submissions error: ${subError.message}`);

      // Also fetch student courses for academic results
      const { data: studentCourses, error: scError } = await supabase
        .from('student_courses')
        .select('*')
        .eq('student_id', student.id)
        .eq('status', 'completed')
        .not('grade', 'is', null);

      if (scError) throw new Error(`Student courses error: ${scError.message}`);

      if ((!examSubmissions || examSubmissions.length === 0) && 
          (!studentCourses || studentCourses.length === 0)) {
        setResultsData({});
        setCgpa(0.0);
        setLoading(false);
        return;
      }

      // Organize exam results
      if (examSubmissions && examSubmissions.length > 0) {
        // Fetch exam details for graded submissions
        const examIds = examSubmissions.map(sub => sub.exam_id);
        const { data: exams, error: examsError } = await supabase
          .from('examinations')
          .select(`
            *,
            courses (id, course_code, course_name, credits, year, semester)
          `)
          .in('id', examIds);

        if (examsError) throw new Error(`Exams error: ${examsError.message}`);

        const examMap = {};
        exams.forEach(exam => {
          examMap[exam.id] = exam;
        });

        const organizedExamResults = {};
        
        examSubmissions.forEach(sub => {
          const exam = examMap[sub.exam_id];
          if (!exam || !exam.courses) return;

          const yearKey = `year${exam.courses.year}`;
          if (!organizedExamResults[yearKey]) {
            organizedExamResults[yearKey] = {
              year: exam.courses.year,
              semester1: [],
              semester2: [],
              totalCredits: 0,
              totalPoints: 0,
              gpa: 0
            };
          }

          const gradePoints = sub.grade_points || getGradePoints(sub.grade);
          const result = {
            id: sub.id,
            examId: exam.id,
            courseId: exam.course_id,
            courseCode: exam.courses.course_code,
            courseName: exam.courses.course_name,
            examTitle: exam.title,
            grade: sub.grade || getGradeFromMarks(sub.total_marks_obtained),
            gradeLetter: sub.grade || getGradeFromMarks(sub.total_marks_obtained),
            credits: exam.courses.credits || 3,
            score: sub.total_marks_obtained || 0,
            totalMarks: exam.total_marks,
            percentage: sub.percentage || (sub.total_marks_obtained && exam.total_marks 
              ? (sub.total_marks_obtained / exam.total_marks * 100).toFixed(2)
              : 0),
            gpa: gradePoints,
            isCore: exam.courses.is_core,
            semester: exam.courses.semester,
            academicYear: exam.academic_year,
            submissionDate: sub.submitted_at,
            gradedDate: sub.graded_at,
            feedback: sub.feedback
          };

          if (exam.courses.semester === 1) {
            organizedExamResults[yearKey].semester1.push(result);
          } else if (exam.courses.semester === 2) {
            organizedExamResults[yearKey].semester2.push(result);
          }

          if (gradePoints && exam.courses.credits) {
            organizedExamResults[yearKey].totalPoints += gradePoints * exam.courses.credits;
            organizedExamResults[yearKey].totalCredits += exam.courses.credits;
          }
        });

        // Calculate GPA for each year
        Object.keys(organizedExamResults).forEach(yearKey => {
          const yearData = organizedExamResults[yearKey];
          yearData.semester1.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
          yearData.semester2.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
          if (yearData.totalCredits > 0) {
            yearData.gpa = parseFloat((yearData.totalPoints / yearData.totalCredits).toFixed(2));
          }
        });

        setResultsData(organizedExamResults);
        
        // Calculate overall CGPA from exam results
        let totalPoints = 0;
        let totalCredits = 0;
        
        Object.values(organizedExamResults).forEach(yearData => {
          totalPoints += yearData.totalPoints;
          totalCredits += yearData.totalCredits;
        });
        
        const weightedGPA = totalCredits > 0 ? totalPoints / totalCredits : 0.0;
        setCgpa(parseFloat(weightedGPA.toFixed(2)));

        if (studentInfo?.year_of_study) {
          const currentYearKey = `year${studentInfo.year_of_study}`;
          if (organizedExamResults[currentYearKey]) {
            setActiveYear(currentYearKey);
          } else if (Object.keys(organizedExamResults).length > 0) {
            const years = Object.keys(organizedExamResults).map(key => organizedExamResults[key].year);
            const maxYear = Math.max(...years);
            setActiveYear(`year${maxYear}`);
          }
        }
      }

      // Also handle student courses for academic records
      if (studentCourses && studentCourses.length > 0) {
        // This is for academic courses, not exam-specific
        const courseIds = studentCourses.map(sc => sc.course_id);
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .in('id', courseIds);

        if (coursesError) throw new Error(`Courses error: ${coursesError.message}`);

        // You can combine this data with exam results if needed
      }

    } catch (error) {
      console.error('Error fetching results:', error);
      setError(`Failed to load results: ${error.message}`);
      setResultsData({});
      setCgpa(0.0);
    } finally {
      setLoading(false);
    }
  };

  const getGradePoints = (grade) => {
    if (!grade) return 0.0;
    const gradeMap = {
      'A': 5.0, 'B+': 4.5, 'B': 4.0, 'C+': 3.5,
      'C': 3.0, 'D+': 2.5, 'D': 2.0, 'E': 1.0, 'F': 0.0
    };
    return gradeMap[grade.toUpperCase()] || 0.0;
  };

  const getGradeFromMarks = (marks) => {
    if (!marks && marks !== 0) return 'N/A';
    const numericMarks = parseFloat(marks);
    if (isNaN(numericMarks)) return 'N/A';
    
    if (numericMarks >= 70) return 'A';
    if (numericMarks >= 60) return 'B+';
    if (numericMarks >= 50) return 'B';
    if (numericMarks >= 45) return 'C+';
    if (numericMarks >= 40) return 'C';
    if (numericMarks >= 35) return 'D+';
    if (numericMarks >= 30) return 'D';
    if (numericMarks >= 20) return 'E';
    return 'F';
  };

  const calculateSemesterGPA = (semesterResults) => {
    if (!semesterResults || semesterResults.length === 0) return 0.0;
    let totalPoints = 0;
    let totalCredits = 0;
    semesterResults.forEach(course => {
      if (course.gpa && course.credits) {
        totalPoints += course.gpa * course.credits;
        totalCredits += course.credits;
      }
    });
    return totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0.0;
  };

  const getGradeColor = (grade) => {
    if (!grade || grade === 'N/A') return '#6c757d';
    switch(grade.charAt(0).toUpperCase()) {
      case 'A': return '#28a745';
      case 'B': return '#17a2b8';
      case 'C': return '#ffc107';
      case 'D': return '#fd7e14';
      case 'E': 
      case 'F': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const exportToPDF = async () => {
    try {
      const doc = new jsPDF();
      
      // Set document properties
      doc.setProperties({
        title: `Academic Transcript - ${studentInfo?.full_name}`,
        subject: 'Academic Results',
        author: 'University Examination System',
        keywords: 'transcript, results, academic',
        creator: 'Examination System'
      });

      // Add watermark
      doc.setFillColor(240, 240, 240);
      doc.rect(0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height, 'F');
      
      // Add header with institution info
      doc.setFontSize(20);
      doc.setTextColor(41, 128, 185);
      doc.text('UNIVERSITY EXAMINATION SYSTEM', 105, 20, null, null, 'center');
      
      doc.setFontSize(16);
      doc.setTextColor(52, 73, 94);
      doc.text('OFFICIAL ACADEMIC TRANSCRIPT', 105, 30, null, null, 'center');
      
      doc.setFontSize(10);
      doc.setTextColor(127, 140, 141);
      doc.text('Issued Electronically', 105, 36, null, null, 'center');
      
      // Add student info section
      doc.setFontSize(12);
      doc.setTextColor(44, 62, 80);
      
      const studentDetails = [
        ['Student Name:', studentInfo?.full_name || ''],
        ['Student ID:', studentInfo?.student_id || ''],
        ['Program:', studentInfo?.program || ''],
        ['Academic Year:', studentInfo?.academic_year || ''],
        ['Current Year:', `Year ${studentInfo?.year_of_study || ''}`],
        ['Cumulative GPA:', cgpa.toFixed(2)]
      ];
      
      autoTable(doc, {
        startY: 45,
        head: [['Student Information', '']],
        body: studentDetails,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 11 },
        styles: { fontSize: 10, cellPadding: 5 },
        margin: { left: 20, right: 20 }
      });

      // Add results for each year
      let yPos = doc.lastAutoTable.finalY + 15;
      
      Object.keys(resultsData).sort().forEach(yearKey => {
        const yearData = resultsData[yearKey];
        
        // Year header
        doc.setFontSize(14);
        doc.setTextColor(52, 152, 219);
        doc.text(`YEAR ${yearData.year} EXAM RESULTS`, 20, yPos);
        yPos += 10;
        
        // Semester 1 results
        if (yearData.semester1.length > 0) {
          doc.setFontSize(12);
          doc.setTextColor(44, 62, 80);
          doc.text(`Semester 1 (GPA: ${yearData.semester1.length > 0 ? calculateSemesterGPA(yearData.semester1).toFixed(2) : '0.00'})`, 20, yPos);
          yPos += 5;
          
          const semester1Data = yearData.semester1.map(course => [
            course.courseCode,
            course.courseName,
            course.credits.toString(),
            course.score + '/' + course.totalMarks,
            course.percentage + '%',
            course.grade,
            course.gpa.toFixed(2)
          ]);
          
          autoTable(doc, {
            startY: yPos,
            head: [['Code', 'Course', 'Credits', 'Score', 'Percentage', 'Grade', 'Points']],
            body: semester1Data,
            theme: 'striped',
            headStyles: { fillColor: [52, 152, 219], textColor: 255 },
            styles: { fontSize: 9 },
            margin: { left: 20, right: 20 }
          });
          
          yPos = doc.lastAutoTable.finalY + 10;
        }
        
        // Semester 2 results
        if (yearData.semester2.length > 0) {
          doc.setFontSize(12);
          doc.setTextColor(44, 62, 80);
          doc.text(`Semester 2 (GPA: ${yearData.semester2.length > 0 ? calculateSemesterGPA(yearData.semester2).toFixed(2) : '0.00'})`, 20, yPos);
          yPos += 5;
          
          const semester2Data = yearData.semester2.map(course => [
            course.courseCode,
            course.courseName,
            course.credits.toString(),
            course.score + '/' + course.totalMarks,
            course.percentage + '%',
            course.grade,
            course.gpa.toFixed(2)
          ]);
          
          autoTable(doc, {
            startY: yPos,
            head: [['Code', 'Course', 'Credits', 'Score', 'Percentage', 'Grade', 'Points']],
            body: semester2Data,
            theme: 'striped',
            headStyles: { fillColor: [52, 152, 219], textColor: 255 },
            styles: { fontSize: 9 },
            margin: { left: 20, right: 20 }
          });
          
          yPos = doc.lastAutoTable.finalY + 15;
        }
        
        // Year summary
        doc.setFontSize(11);
        doc.setTextColor(127, 140, 141);
        doc.text(`Year ${yearData.year} GPA: ${yearData.gpa.toFixed(2)} | Total Credits: ${yearData.totalCredits}`, 20, yPos);
        yPos += 20;
        
        // Add page if needed
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
      });

      // Add final summary
      doc.setFontSize(12);
      doc.setTextColor(39, 174, 96);
      doc.text('FINAL SUMMARY', 20, yPos);
      yPos += 10;
      
      const summaryData = [
        ['Cumulative GPA (CGPA):', cgpa.toFixed(2)],
        ['Classification:', cgpa >= 4.5 ? 'First Class' : 
                         cgpa >= 3.5 ? 'Second Class Upper' : 
                         cgpa >= 2.5 ? 'Second Class Lower' : 
                         cgpa >= 1.5 ? 'Third Class' : 'Pass'],
        ['Date Generated:', new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })],
        ['Issuing Authority:', 'University Examination Board']
      ];
      
      autoTable(doc, {
        startY: yPos,
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 10 },
        margin: { left: 20, right: 20 }
      });

      // Add footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('This is an electronically generated document. No signature required.', 105, doc.internal.pageSize.height - 10, null, null, 'center');
        doc.text(`Page ${i} of ${pageCount}`, 105, doc.internal.pageSize.height - 5, null, null, 'center');
      }

      // Save the PDF
      doc.save(`Transcript_${studentInfo?.student_id}_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const refreshResults = () => {
    fetchResults();
  };

  const renderSpecificExamResults = () => {
    if (!specificExam || !examDetails) return null;

    const submission = specificExam.submission || examSubmission;
    const totalMarks = examDetails.total_marks || 100;
    const marksObtained = submission?.total_marks_obtained || 0;
    const percentage = submission?.percentage || (marksObtained && totalMarks ? (marksObtained / totalMarks * 100).toFixed(2) : 0);
    const grade = submission?.grade || getGradeFromMarks(marksObtained);

    return (
      <div className="specific-exam-container">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h2 className="page-title">Exam Results</h2>
            <p className="page-subtitle">{specificExam.courseCode} - {specificExam.examTitle}</p>
          </div>
          <div className="action-buttons">
            <button className="btn btn-secondary" onClick={() => navigate('/examinations')}>
              <i className="fas fa-list"></i> <span className="btn-text">All Exams</span>
            </button>
            <button id="export-pdf" className="btn btn-danger" onClick={exportToPDF}>
              <i className="fas fa-file-pdf"></i> <span className="btn-text">Export Transcript</span>
            </button>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="performance-summary">
          <h3 className="section-title">
            <i className="fas fa-chart-line"></i> Exam Performance Summary
          </h3>
          
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Total Marks</div>
              <div className="stat-value">{totalMarks}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Marks Obtained</div>
              <div className="stat-value text-success">
                {marksObtained}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Percentage</div>
              <div className="stat-value text-primary">
                {percentage}%
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Grade</div>
              <div className="stat-value" style={{color: getGradeColor(grade)}}>
                {grade}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-label">Performance</span>
              <span className="progress-percentage">
                {percentage}%
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: percentage >= 50 ? '#28a745' : '#dc3545'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Exam Details */}
        <div className="exam-details">
          <h4 className="section-title">Exam Details</h4>
          
          <div className="details-grid">
            <div className="detail-section">
              <h5><i className="fas fa-info-circle"></i> Exam Information</h5>
              <div className="detail-item">
                <span className="detail-label">Course:</span>
                <span className="detail-value">{specificExam.courseCode} - {specificExam.courseName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Exam Type:</span>
                <span className="detail-value">{examDetails.exam_type}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Duration:</span>
                <span className="detail-value">{examDetails.duration_minutes} minutes</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{new Date(examDetails.start_time).toLocaleDateString()}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Time:</span>
                <span className="detail-value">
                  {new Date(examDetails.start_time).toLocaleTimeString()} - {new Date(examDetails.end_time).toLocaleTimeString()}
                </span>
              </div>
            </div>
            
            <div className="detail-section">
              <h5><i className="fas fa-user-graduate"></i> Submission Details</h5>
              <div className="detail-item">
                <span className="detail-label">Student:</span>
                <span className="detail-value">{studentInfo?.full_name} ({studentInfo?.student_id})</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Submitted:</span>
                <span className="detail-value">
                  {submission?.submitted_at 
                    ? new Date(submission.submitted_at).toLocaleString()
                    : 'N/A'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Graded:</span>
                <span className="detail-value">
                  {submission?.graded_at 
                    ? new Date(submission.graded_at).toLocaleString()
                    : 'N/A'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className={`status-badge ${submission?.status === 'graded' ? 'graded' : 'pending'}`}>
                  {submission?.status?.toUpperCase() || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {submission?.feedback && (
            <div className="feedback-section">
              <h5><i className="fas fa-comment"></i> Lecturer Feedback</h5>
              <p className="feedback-text">{submission.feedback}</p>
            </div>
          )}

          <div className="action-buttons-grid">
            <button className="btn btn-primary" onClick={() => navigate('/examinations')}>
              <i className="fas fa-arrow-left"></i> <span className="btn-text">Back to Examinations</span>
            </button>
            <button className="btn btn-success" onClick={() => window.print()}>
              <i className="fas fa-print"></i> <span className="btn-text">Print This Result</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderGeneralResults = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Loading results...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-container">
          <i className="fas fa-exclamation-triangle"></i>
          <p className="error-message">{error}</p>
          <button className="btn btn-primary" onClick={refreshResults}>
            <i className="fas fa-sync-alt"></i> <span className="btn-text">Try Again</span>
          </button>
        </div>
      );
    }

    return (
      <div className="general-results-container">
        {/* Student Info & CGPA Card */}
        <div className="student-summary-card">
          <div className="student-info">
            <div className="student-name">{studentInfo?.full_name || 'Student Name'}</div>
            <div className="student-details">
              <span className="student-id">ID: {studentInfo?.student_id || 'N/A'}</span>
              <span className="student-program">{studentInfo?.program || 'N/A'}</span>
            </div>
            <div className="student-academic">
              Year {studentInfo?.year_of_study || 'N/A'} • Semester {studentInfo?.semester || 'N/A'}
            </div>
          </div>
          
          <div className="cgpa-display">
            <div className="cgpa-label">CUMULATIVE GPA</div>
            <div className="cgpa-value">{cgpa.toFixed(2)}</div>
            <div className="cgpa-classification">
              {cgpa >= 4.5 ? 'First Class' : 
               cgpa >= 3.5 ? 'Second Class Upper' : 
               cgpa >= 2.5 ? 'Second Class Lower' : 
               cgpa >= 1.5 ? 'Third Class' : 'Pass'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="controls-row">
          <div className="year-selector">
            <label htmlFor="academic-year">Select Academic Year:</label>
            <div className="select-wrapper">
              <select 
                id="academic-year"
                value={activeYear}
                onChange={(e) => setActiveYear(e.target.value)}
              >
                {Object.keys(resultsData).sort().map(yearKey => (
                  <option key={yearKey} value={yearKey}>
                    Year {resultsData[yearKey].year}
                  </option>
                ))}
                {Object.keys(resultsData).length === 0 && (
                  <option value="">No results available</option>
                )}
              </select>
              <div className="select-arrow">
                <i className="fas fa-chevron-down"></i>
              </div>
            </div>
          </div>
          
          <button id="export-pdf" className="btn btn-danger" onClick={exportToPDF}>
            <i className="fas fa-file-pdf"></i> <span className="btn-text">Export Transcript</span>
          </button>
        </div>

        {/* Year Summary */}
        {resultsData[activeYear] && (
          <div className="year-summary">
            <h4>Year {resultsData[activeYear].year} Academic Summary</h4>
            <div className="summary-stats">
              <div className="summary-stat">
                <span className="stat-label">Total Credits:</span>
                <span className="stat-value">{resultsData[activeYear].totalCredits}</span>
              </div>
              <div className="summary-stat">
                <span className="stat-label">Year GPA:</span>
                <span className="stat-value">{resultsData[activeYear].gpa.toFixed(2)}</span>
              </div>
              <div className="summary-stat">
                <span className="stat-label">Exams:</span>
                <span className="stat-value">
                  {resultsData[activeYear].semester1.length + resultsData[activeYear].semester2.length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Semester 1 Results */}
        <div className="semester-results">
          <h3 className="semester-title">
            <i className="fas fa-calendar"></i> Semester 1 Exam Results
          </h3>
          
          {resultsData[activeYear]?.semester1?.length > 0 ? (
            <div className="results-table-container">
              <div className="table-scroll-wrapper">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Course Code</th>
                      <th>Course Name</th>
                      <th>Credits</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Grade</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultsData[activeYear].semester1.map((course, index) => (
                      <tr key={course.id || index}>
                        <td>
                          <div className="course-code">
                            {course.courseCode}
                            {course.isCore && <span className="core-badge">CORE</span>}
                          </div>
                        </td>
                        <td className="course-name">{course.courseName}</td>
                        <td className="credits">{course.credits}</td>
                        <td className="score">
                          <span className={`score-badge ${course.score >= (course.totalMarks/2) ? 'pass' : 'fail'}`}>
                            {course.score}/{course.totalMarks}
                          </span>
                        </td>
                        <td className="percentage">
                          <span className="percentage-value">
                            {course.percentage}%
                          </span>
                        </td>
                        <td className="grade">
                          <span className="grade-badge" style={{backgroundColor: getGradeColor(course.grade)}}>
                            {course.grade}
                          </span>
                        </td>
                        <td className="points">{course.gpa.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="semester-summary-footer">
                <div className="summary-info">
                  <i className="fas fa-chart-line"></i>
                  <span>Credits: {resultsData[activeYear]?.semester1.reduce((sum, course) => sum + (course.credits || 0), 0)}</span>
                </div>
                <div className="gpa-display">
                  Semester 1 GPA: <strong>{calculateSemesterGPA(resultsData[activeYear]?.semester1).toFixed(2)}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-results-message">
              <i className="fas fa-clipboard-list"></i>
              <p>No exam results available for Semester 1</p>
            </div>
          )}
        </div>

        {/* Semester 2 Results */}
        <div className="semester-results">
          <h3 className="semester-title">
            <i className="fas fa-calendar-alt"></i> Semester 2 Exam Results
          </h3>
          
          {resultsData[activeYear]?.semester2?.length > 0 ? (
            <div className="results-table-container">
              <div className="table-scroll-wrapper">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Course Code</th>
                      <th>Course Name</th>
                      <th>Credits</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Grade</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultsData[activeYear].semester2.map((course, index) => (
                      <tr key={course.id || index}>
                        <td>
                          <div className="course-code">
                            {course.courseCode}
                            {course.isCore && <span className="core-badge">CORE</span>}
                          </div>
                        </td>
                        <td className="course-name">{course.courseName}</td>
                        <td className="credits">{course.credits}</td>
                        <td className="score">
                          <span className={`score-badge ${course.score >= (course.totalMarks/2) ? 'pass' : 'fail'}`}>
                            {course.score}/{course.totalMarks}
                          </span>
                        </td>
                        <td className="percentage">
                          <span className="percentage-value">
                            {course.percentage}%
                          </span>
                        </td>
                        <td className="grade">
                          <span className="grade-badge" style={{backgroundColor: getGradeColor(course.grade)}}>
                            {course.grade}
                          </span>
                        </td>
                        <td className="points">{course.gpa.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="semester-summary-footer">
                <div className="summary-info">
                  <i className="fas fa-chart-line"></i>
                  <span>Credits: {resultsData[activeYear]?.semester2.reduce((sum, course) => sum + (course.credits || 0), 0)}</span>
                </div>
                <div className="gpa-display">
                  Semester 2 GPA: <strong>{calculateSemesterGPA(resultsData[activeYear]?.semester2).toFixed(2)}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-results-message">
              <i className="fas fa-clipboard-list"></i>
              <p>No exam results available for Semester 2</p>
            </div>
          )}
        </div>

        {Object.keys(resultsData).length === 0 && (
          <div className="empty-state">
            <i className="fas fa-graduation-cap"></i>
            <h3>No Examination Results Available</h3>
            <p>Your examination results will appear here once they have been graded and published.</p>
            <div className="empty-state-actions">
              <button className="btn btn-primary" onClick={refreshResults}>
                <i className="fas fa-sync-alt"></i> <span className="btn-text">Check Again</span>
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/examinations')}>
                <i className="fas fa-clipboard-check"></i> <span className="btn-text">View Examinations</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="results-page">
      <div className="page-header">
        <div className="header-content">
          <h2 className="page-title">
            <i className="fas fa-chart-line"></i>
            {specificExam ? 'Exam Results' : 'Examination Results'}
          </h2>
          <p className="page-subtitle">
            {studentInfo?.academic_year || 'Academic Year: 2024-2025'}
          </p>
        </div>
        {!specificExam && (
          <button className="btn btn-success" onClick={refreshResults}>
            <i className="fas fa-sync-alt"></i> <span className="btn-text">Refresh</span>
          </button>
        )}
      </div>

      {specificExam ? renderSpecificExamResults() : renderGeneralResults()}

      <style jsx>{`
        /* Base Styles */
        .results-page {
          min-height: 100vh;
          background: #f5f7fa;
          padding: 1rem;
        }

        /* Page Header */
        .page-header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e0e6ed;
        }

        .header-content {
          flex: 1;
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 0.25rem 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .page-title i {
          color: #4299e1;
        }

        .page-subtitle {
          color: #718096;
          font-size: 0.875rem;
          margin: 0;
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn i {
          font-size: 0.875rem;
        }

        .btn-text {
          display: inline;
        }

        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .btn-primary {
          background: #4299e1;
          color: white;
        }

        .btn-secondary {
          background: #a0aec0;
          color: white;
        }

        .btn-success {
          background: #48bb78;
          color: white;
        }

        .btn-danger {
          background: #f56565;
          color: white;
        }

        /* Student Summary Card */
        .student-summary-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .student-info {
          flex: 1;
        }

        .student-name {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .student-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.875rem;
          opacity: 0.9;
          margin-bottom: 0.5rem;
        }

        .student-id {
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
        }

        .student-academic {
          font-size: 0.875rem;
          opacity: 0.8;
        }

        .cgpa-display {
          text-align: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          backdrop-filter: blur(10px);
        }

        .cgpa-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.8;
          margin-bottom: 0.5rem;
        }

        .cgpa-value {
          font-size: 2.5rem;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 0.25rem;
        }

        .cgpa-classification {
          font-size: 0.75rem;
          opacity: 0.9;
        }

        /* Controls Row - Fixed Dropdown */
        .controls-row {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
          position: relative;
        }

        .year-selector {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          position: relative;
          width: 100%;
        }

        .year-selector label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #4a5568;
          white-space: nowrap;
        }

        .select-wrapper {
          position: relative;
          width: 100%;
          max-width: 100%;
        }

        .year-selector select {
          width: 100%;
          padding: 0.625rem 1rem;
          padding-right: 2.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          background: white;
          color: #1a202c;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          transition: all 0.2s ease;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
          box-sizing: border-box;
        }

        /* Fix for iOS */
        .year-selector select::-ms-expand {
          display: none;
        }

        /* Fix dropdown positioning on mobile */
        .year-selector select:focus {
          outline: none;
          border-color: #4299e1;
          box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.15);
          z-index: 100;
        }

        .select-arrow {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #718096;
          font-size: 0.875rem;
        }

        /* Fix dropdown options styling */
        .year-selector select option {
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          background: white;
          color: #1a202c;
          border: none;
          white-space: normal;
          word-wrap: break-word;
          max-width: 100%;
        }

        .year-selector select option:hover,
        .year-selector select option:focus,
        .year-selector select option:checked {
          background: #4299e1;
          color: white;
        }

        /* Year Summary */
        .year-summary {
          background: white;
          border-left: 4px solid #4299e1;
          padding: 1rem;
          margin-bottom: 1.5rem;
          border-radius: 0 0.375rem 0.375rem 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .year-summary h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #2d3748;
          margin: 0 0 0.75rem 0;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
        }

        .summary-stat {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 1.125rem;
          font-weight: 600;
          color: #2d3748;
        }

        /* Semester Results */
        .semester-results {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .semester-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: #2d3748;
          margin: 0 0 1rem 0;
        }

        .semester-title i {
          color: #4299e1;
        }

        /* Results Table */
        .results-table-container {
          overflow: hidden;
        }

        .table-scroll-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 0 -1.5rem;
          padding: 0 1.5rem;
        }

        .results-table {
          width: 100%;
          min-width: 600px;
          border-collapse: separate;
          border-spacing: 0;
        }

        .results-table thead {
          background: #f7fafc;
        }

        .results-table th {
          padding: 0.75rem 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #4a5568;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }

        .results-table td {
          padding: 1rem;
          font-size: 0.875rem;
          color: #4a5568;
          border-bottom: 1px solid #e2e8f0;
        }

        .results-table tbody tr:hover {
          background: #f7fafc;
        }

        .course-code {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
          font-weight: 500;
          color: #2d3748;
        }

        .core-badge {
          background: #f6e05e;
          color: #744210;
          padding: 0.125rem 0.5rem;
          border-radius: 1rem;
          font-size: 0.625rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .score-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 500;
          white-space: nowrap;
        }

        .score-badge.pass {
          background: #c6f6d5;
          color: #22543d;
        }

        .score-badge.fail {
          background: #fed7d7;
          color: #742a2a;
        }

        .percentage-value {
          font-weight: 500;
          color: #2d3748;
        }

        .grade-badge {
          display: inline-block;
          padding: 0.375rem 0.75rem;
          border-radius: 1rem;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          min-width: 2.5rem;
          text-align: center;
          white-space: nowrap;
        }

        .semester-summary-footer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .summary-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #48bb78;
          font-size: 0.875rem;
        }

        .gpa-display {
          font-size: 0.875rem;
          color: #4a5568;
        }

        .gpa-display strong {
          color: #2d3748;
          font-size: 1rem;
        }

        /* Empty States */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
        }

        .spinner {
          width: 3rem;
          height: 3rem;
          border: 3px solid #e2e8f0;
          border-top-color: #4299e1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        .loading-text {
          color: #718096;
          font-size: 0.875rem;
        }

        .error-container {
          text-align: center;
          padding: 3rem 1.5rem;
          background: #fff5f5;
          border-radius: 0.75rem;
          border: 1px solid #fed7d7;
        }

        .error-container i {
          font-size: 2.5rem;
          color: #f56565;
          margin-bottom: 1rem;
        }

        .error-message {
          color: #c53030;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .no-results-message {
          text-align: center;
          padding: 2rem;
          background: #f7fafc;
          border: 2px dashed #cbd5e0;
          border-radius: 0.5rem;
        }

        .no-results-message i {
          font-size: 2rem;
          color: #a0aec0;
          margin-bottom: 0.75rem;
        }

        .no-results-message p {
          color: #718096;
          margin: 0;
          font-size: 0.875rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1.5rem;
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .empty-state i {
          font-size: 3rem;
          color: #a0aec0;
          margin-bottom: 1.5rem;
        }

        .empty-state h3 {
          color: #2d3748;
          font-size: 1.25rem;
          margin-bottom: 0.75rem;
        }

        .empty-state p {
          color: #718096;
          margin-bottom: 2rem;
          font-size: 0.875rem;
          line-height: 1.6;
          max-width: 28rem;
          margin-left: auto;
          margin-right: auto;
        }

        .empty-state-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        /* Specific Exam Results */
        .specific-exam-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .performance-summary {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: #2d3748;
          margin: 0 0 1.5rem 0;
        }

        .section-title i {
          color: #4299e1;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-item {
          text-align: center;
          padding: 1rem;
          background: #f7fafc;
          border-radius: 0.5rem;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #2d3748;
        }

        .text-success {
          color: #48bb78 !important;
        }

        .text-primary {
          color: #4299e1 !important;
        }

        .progress-section {
          margin-top: 1.5rem;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          color: #4a5568;
        }

        .progress-bar {
          height: 0.75rem;
          background: #edf2f7;
          border-radius: 0.375rem;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 0.375rem;
          transition: width 0.5s ease;
        }

        .exam-details {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .details-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .detail-section h5 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: #2d3748;
          margin: 0 0 1rem 0;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 0.75rem;
        }

        .detail-label {
          font-size: 0.75rem;
          color: #718096;
          font-weight: 500;
        }

        .detail-value {
          font-size: 0.875rem;
          color: #4a5568;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 0.25rem;
        }

        .status-badge.graded {
          background: #c6f6d5;
          color: #22543d;
        }

        .status-badge.pending {
          background: #fed7d7;
          color: #742a2a;
        }

        .feedback-section {
          margin-top: 1.5rem;
          padding: 1rem;
          background: #ebf8ff;
          border-radius: 0.5rem;
          border-left: 4px solid #4299e1;
        }

        .feedback-section h5 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: #2d3748;
          margin: 0 0 0.75rem 0;
        }

        .feedback-text {
          color: #4a5568;
          font-size: 0.875rem;
          line-height: 1.6;
          margin: 0;
        }

        .action-buttons-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e2e8f0;
        }

        /* Media Queries */
        @media (min-width: 640px) {
          .results-page {
            padding: 1.5rem;
          }

          .page-title {
            font-size: 1.75rem;
          }

          .student-summary-card {
            flex-direction: row;
            align-items: center;
            padding: 2rem;
          }

          .student-details {
            flex-direction: row;
            gap: 0.75rem;
          }

          .controls-row {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
          }

          .year-selector {
            flex-direction: row;
            align-items: center;
            gap: 0.75rem;
            flex: 1;
            min-width: 0;
          }

          .year-selector label {
            flex-shrink: 0;
          }

          .select-wrapper {
            max-width: 200px;
            min-width: 150px;
          }

          .empty-state-actions {
            flex-direction: row;
            justify-content: center;
          }

          .action-buttons-grid {
            flex-direction: row;
          }

          .btn-text {
            display: inline;
          }

          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .details-grid {
            flex-direction: row;
          }

          .details-grid > * {
            flex: 1;
          }

          .semester-summary-footer {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }

          .action-buttons {
            display: flex;
            gap: 0.75rem;
          }
        }

        @media (min-width: 768px) {
          .page-header {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }

          .student-name {
            font-size: 1.75rem;
          }

          .cgpa-value {
            font-size: 3rem;
          }

          .summary-stats {
            grid-template-columns: repeat(3, auto);
            gap: 2rem;
          }

          .detail-item {
            flex-direction: row;
            gap: 0.5rem;
          }

          .detail-label {
            min-width: 6rem;
          }

          .select-wrapper {
            max-width: 250px;
          }
        }

        @media (min-width: 1024px) {
          .results-page {
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
          }

          .page-title {
            font-size: 2rem;
          }

          .student-summary-card {
            padding: 2.5rem;
          }

          .semester-results {
            padding: 2rem;
          }

          .performance-summary,
          .exam-details {
            padding: 2rem;
          }

          .select-wrapper {
            max-width: 300px;
          }
        }

        /* Animations */
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Print Styles */
        @media print {
          .btn, .no-print {
            display: none !important;
          }

          .results-page {
            padding: 0;
            background: white;
          }

          .student-summary-card {
            background: none;
            color: black;
            border: 1px solid #ddd;
          }

          .semester-results,
          .performance-summary,
          .exam-details {
            box-shadow: none;
            border: 1px solid #ddd;
          }

          table {
            break-inside: avoid;
          }

          h2, h3, h4 {
            break-after: avoid;
          }

          .table-scroll-wrapper {
            overflow: visible;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Results;