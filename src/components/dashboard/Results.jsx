import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeYear, setActiveYear] = useState('year1');
  const [resultsData, setResultsData] = useState({});
  const [cgpa, setCgpa] = useState(0.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [specificExam, setSpecificExam] = useState(null);
  const [examDetails, setExamDetails] = useState(null);
  const { user } = useStudentAuth();

  // Check if we came from an exam click
  useEffect(() => {
    if (location.state?.examId) {
      setSpecificExam({
        examId: location.state.examId,
        courseCode: location.state.courseCode,
        courseName: location.state.courseName,
        examTitle: location.state.examTitle,
        submission: location.state.submission
      });
      fetchSpecificExamDetails(location.state.examId);
    }
  }, [location]);

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
    if (user?.email) {
      fetchResults();
    }
  }, [user]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching results for user:', user.email);

      // Get student data
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, full_name, student_id, program, year_of_study, academic_year, semester')
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

      // Fetch student's completed courses
      const { data: studentCourses, error: scError } = await supabase
        .from('student_courses')
        .select('*')
        .eq('student_id', student.id)
        .eq('status', 'completed')
        .not('grade', 'is', null);

      if (scError) {
        console.error('Student courses error:', scError);
        throw new Error(`Student courses error: ${scError.message}`);
      }

      console.log('Completed courses found:', studentCourses?.length || 0);

      if (!studentCourses || studentCourses.length === 0) {
        setResultsData({});
        setCgpa(0.0);
        setLoading(false);
        return;
      }

      // Get all course IDs
      const courseIds = studentCourses.map(sc => sc.course_id);

      // Fetch course details for these IDs
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .in('id', courseIds)
        .order('year', { ascending: true })
        .order('semester', { ascending: true });

      if (coursesError) {
        console.error('Courses error:', coursesError);
        throw new Error(`Courses error: ${coursesError.message}`);
      }

      console.log('Course details found:', courses?.length || 0);

      // Create a map of course_id -> course details
      const courseMap = {};
      courses.forEach(course => {
        courseMap[course.id] = course;
      });

      // Organize results by year
      const organizedData = {};
      let totalPoints = 0;
      let totalCredits = 0;
      let weightedGPA = 0;

      // Process each student course
      studentCourses.forEach(sc => {
        const course = courseMap[sc.course_id];
        if (!course) {
          console.warn(`Course not found for ID: ${sc.course_id}`);
          return;
        }

        const yearKey = `year${course.year}`;
        
        if (!organizedData[yearKey]) {
          organizedData[yearKey] = {
            year: course.year,
            semester1: [],
            semester2: [],
            totalCredits: 0,
            totalPoints: 0,
            gpa: 0
          };
        }

        const gradePoints = sc.grade_points || getGradePoints(sc.grade);
        const result = {
          id: sc.id,
          courseId: course.id,
          courseCode: course.course_code,
          courseName: course.course_name,
          grade: sc.grade || getGradeFromMarks(sc.marks),
          gradeLetter: sc.grade || getGradeFromMarks(sc.marks),
          credits: course.credits || 3,
          score: sc.marks || 0,
          gpa: gradePoints,
          isCore: course.is_core,
          semester: course.semester,
          academicYear: course.academic_year
        };

        if (course.semester === 1) {
          organizedData[yearKey].semester1.push(result);
        } else if (course.semester === 2) {
          organizedData[yearKey].semester2.push(result);
        }

        // Calculate semester totals
        if (gradePoints && course.credits) {
          organizedData[yearKey].totalPoints += gradePoints * course.credits;
          organizedData[yearKey].totalCredits += course.credits;
          
          // Calculate CGPA
          totalPoints += gradePoints * course.credits;
          totalCredits += course.credits;
        }
      });

      // Sort courses within semesters by course code
      Object.keys(organizedData).forEach(yearKey => {
        const yearData = organizedData[yearKey];
        
        yearData.semester1.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
        yearData.semester2.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
        
        if (yearData.totalCredits > 0) {
          yearData.gpa = parseFloat((yearData.totalPoints / yearData.totalCredits).toFixed(2));
        }
      });

      // Calculate CGPA
      weightedGPA = totalCredits > 0 ? totalPoints / totalCredits : 0.0;
      
      console.log('Organized data:', organizedData);
      console.log('Calculated CGPA:', weightedGPA.toFixed(2));

      setCgpa(parseFloat(weightedGPA.toFixed(2)));
      setResultsData(organizedData);
      
      // Set default active year
      if (studentInfo?.year_of_study) {
        const currentYearKey = `year${studentInfo.year_of_study}`;
        if (organizedData[currentYearKey]) {
          setActiveYear(currentYearKey);
        } else if (Object.keys(organizedData).length > 0) {
          const years = Object.keys(organizedData).map(key => organizedData[key].year);
          const maxYear = Math.max(...years);
          setActiveYear(`year${maxYear}`);
        }
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
      'A': 5.0,
      'B+': 4.5,
      'B': 4.0,
      'C+': 3.5,
      'C': 3.0,
      'D+': 2.5,
      'D': 2.0,
      'E': 1.0,
      'F': 0.0
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
      const exportButton = document.getElementById('export-pdf');
      if (exportButton) {
        exportButton.disabled = true;
        exportButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Transcript...';
      }

      // Create PDF
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      
      // Add university header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 51, 102); // Dark blue
      pdf.text('UNIVERSITY ACADEMIC TRANSCRIPT', pageWidth / 2, 50, { align: 'center' });
      
      // Add decorative line
      pdf.setLineWidth(1);
      pdf.line(50, 65, pageWidth - 50, 65);
      
      // Add student information section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      
      let yPosition = 90;
      
      if (studentInfo) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('STUDENT INFORMATION', 50, yPosition);
        yPosition += 20;
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Full Name: ${studentInfo.full_name || 'N/A'}`, 50, yPosition);
        pdf.text(`Student ID: ${studentInfo.student_id || 'N/A'}`, pageWidth - 200, yPosition);
        yPosition += 20;
        
        pdf.text(`Program: ${studentInfo.program || 'N/A'}`, 50, yPosition);
        pdf.text(`Academic Year: ${studentInfo.academic_year || 'N/A'}`, pageWidth - 200, yPosition);
        yPosition += 20;
        
        pdf.text(`Current Year: ${studentInfo.year_of_study || 'N/A'}`, 50, yPosition);
        pdf.text(`Semester: ${studentInfo.semester || 'N/A'}`, pageWidth - 200, yPosition);
        yPosition += 25;
        
        // Add CGPA in a highlighted box
        pdf.setFillColor(41, 128, 185); // Blue background
        pdf.rect(50, yPosition - 10, pageWidth - 100, 30, 'F');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255); // White text
        pdf.text('CUMULATIVE GPA (CGPA)', pageWidth / 2, yPosition, { align: 'center' });
        pdf.setFontSize(24);
        pdf.text(cgpa.toFixed(2).toString(), pageWidth / 2, yPosition + 20, { align: 'center' });
        
        yPosition += 40;
      }
      
      // Add classification
      let classification = '';
      if (cgpa >= 4.5) classification = 'FIRST CLASS HONORS';
      else if (cgpa >= 3.5) classification = 'SECOND CLASS HONORS (UPPER DIVISION)';
      else if (cgpa >= 2.5) classification = 'SECOND CLASS HONORS (LOWER DIVISION)';
      else if (cgpa >= 1.5) classification = 'THIRD CLASS HONORS';
      else classification = 'PASS';
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`CLASSIFICATION: ${classification}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 30;
      
      // Sort years in ascending order
      const sortedYears = Object.keys(resultsData).sort();
      
      // Add transcript date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Transcript Generated: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, pageWidth - 70, 40, { align: 'right' });
      
      // Loop through each year and add tables
      sortedYears.forEach((yearKey, yearIndex) => {
        const yearData = resultsData[yearKey];
        
        // Check if we need a new page
        if (yPosition > pageHeight - 150 && yearIndex > 0) {
          pdf.addPage();
          yPosition = 50;
        }
        
        // Year header with background
        pdf.setFillColor(240, 240, 240);
        pdf.rect(50, yPosition - 10, pageWidth - 100, 30, 'F');
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(`ACADEMIC YEAR ${yearData.year} RESULTS`, 60, yPosition);
        
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Year GPA: ${yearData.gpa.toFixed(2)} | Credits: ${yearData.totalCredits}`, pageWidth - 70, yPosition, { align: 'right' });
        
        yPosition += 40;
        
        // Prepare data for the table
        const tableData = [];
        
        // Semester 1 results
        if (yearData.semester1.length > 0) {
          tableData.push([{ 
            content: `SEMESTER 1`, 
            colSpan: 6, 
            styles: { 
              fillColor: [41, 128, 185], 
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 11 
            } 
          }]);
          
          yearData.semester1.forEach(course => {
            tableData.push([
              course.courseCode,
              { content: course.courseName, styles: { cellWidth: 180 } },
              course.credits.toString(),
              `${course.score}%`,
              course.grade,
              course.gpa.toFixed(2)
            ]);
          });
          
          // Add semester 1 summary row
          const sem1GPA = calculateSemesterGPA(yearData.semester1);
          tableData.push([
            { 
              content: 'Semester 1 Summary', 
              colSpan: 3, 
              styles: { fontStyle: 'bold' } 
            },
            `${yearData.semester1.reduce((sum, c) => sum + c.credits, 0)} Credits`,
            `GPA: ${sem1GPA.toFixed(2)}`,
            { content: '', styles: { fillColor: [240, 240, 240] } }
          ]);
          
          // Add spacing row
          tableData.push([{ content: '', colSpan: 6, styles: { fillColor: [255, 255, 255], cellHeight: 10 } }]);
        }
        
        // Semester 2 results
        if (yearData.semester2.length > 0) {
          tableData.push([{ 
            content: `SEMESTER 2`, 
            colSpan: 6, 
            styles: { 
              fillColor: [39, 174, 96], 
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 11 
            } 
          }]);
          
          yearData.semester2.forEach(course => {
            tableData.push([
              course.courseCode,
              { content: course.courseName, styles: { cellWidth: 180 } },
              course.credits.toString(),
              `${course.score}%`,
              course.grade,
              course.gpa.toFixed(2)
            ]);
          });
          
          // Add semester 2 summary row
          const sem2GPA = calculateSemesterGPA(yearData.semester2);
          tableData.push([
            { 
              content: 'Semester 2 Summary', 
              colSpan: 3, 
              styles: { fontStyle: 'bold' } 
            },
            `${yearData.semester2.reduce((sum, c) => sum + c.credits, 0)} Credits`,
            `GPA: ${sem2GPA.toFixed(2)}`,
            { content: '', styles: { fillColor: [240, 240, 240] } }
          ]);
          
          // Add year summary row
          tableData.push([
            { 
              content: `YEAR ${yearData.year} SUMMARY`, 
              colSpan: 3, 
              styles: { 
                fontStyle: 'bold',
                fillColor: [52, 73, 94],
                textColor: [255, 255, 255]
              } 
            },
            { 
              content: `${yearData.totalCredits} Total Credits`, 
              styles: { 
                fontStyle: 'bold',
                fillColor: [52, 73, 94],
                textColor: [255, 255, 255]
              } 
            },
            { 
              content: `Year GPA: ${yearData.gpa.toFixed(2)}`, 
              styles: { 
                fontStyle: 'bold',
                fillColor: [52, 73, 94],
                textColor: [255, 255, 255]
              } 
            },
            { 
              content: '', 
              styles: { 
                fillColor: [52, 73, 94],
                textColor: [255, 255, 255]
              } 
            }
          ]);
        }
        
        // Add table to PDF
        autoTable(pdf, {
          startY: yPosition,
          head: [[
            { content: 'Course Code', styles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold' } },
            { content: 'Course Name', styles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold' } },
            { content: 'Credits', styles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold' } },
            { content: 'Score %', styles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold' } },
            { content: 'Grade', styles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold' } },
            { content: 'Grade Points', styles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold' } }
          ]],
          body: tableData,
          margin: { left: 50, right: 50 },
          styles: { 
            fontSize: 10,
            cellPadding: 5,
            overflow: 'linebreak'
          },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 180 },
            2: { cellWidth: 50 },
            3: { cellWidth: 60 },
            4: { cellWidth: 50 },
            5: { cellWidth: 70 }
          },
          theme: 'grid',
          didDrawPage: function(data) {
            // Add page number
            pdf.setFontSize(10);
            pdf.setTextColor(150, 150, 150);
            pdf.text(
              `Page ${pdf.internal.getNumberOfPages()}`,
              pageWidth / 2,
              pageHeight - 20,
              { align: 'center' }
            );
          }
        });
        
        // Update position for next year
        yPosition = pdf.lastAutoTable.finalY + 30;
      });
      
      // Add final summary on last page
      if (yPosition > pageHeight - 100) {
        pdf.addPage();
        yPosition = 50;
      }
      
      // Add final summary box
      pdf.setFillColor(245, 245, 245);
      pdf.rect(50, yPosition, pageWidth - 100, 80, 'F');
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('ACADEMIC SUMMARY', pageWidth / 2, yPosition + 20, { align: 'center' });
      
      const totalCourses = sortedYears.reduce((total, yearKey) => {
        return total + resultsData[yearKey].semester1.length + resultsData[yearKey].semester2.length;
      }, 0);
      
      const totalCredits = sortedYears.reduce((total, yearKey) => {
        return total + resultsData[yearKey].totalCredits;
      }, 0);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total Courses Completed: ${totalCourses}`, 60, yPosition + 45);
      pdf.text(`Total Credits Earned: ${totalCredits}`, 60, yPosition + 65);
      pdf.text(`Cumulative GPA (CGPA): ${cgpa.toFixed(2)}`, pageWidth - 150, yPosition + 45);
      pdf.text(`Classification: ${classification}`, pageWidth - 150, yPosition + 65);
      
      // Add university seal and signature area
      yPosition += 110;
      
      pdf.setLineWidth(0.5);
      pdf.line(60, yPosition, pageWidth - 60, yPosition);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(100, 100, 100);
      pdf.text('This is an official academic transcript issued by the University.', pageWidth / 2, yPosition + 15, { align: 'center' });
      pdf.text('Any alteration or forgery of this document is strictly prohibited.', pageWidth / 2, yPosition + 30, { align: 'center' });
      
      // Add signature lines
      const signatureY = yPosition + 60;
      pdf.line(100, signatureY, 250, signatureY);
      pdf.line(pageWidth - 250, signatureY, pageWidth - 100, signatureY);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Registrar\'s Signature', 175, signatureY + 15, { align: 'center' });
      pdf.text('University Seal', pageWidth - 175, signatureY + 15, { align: 'center' });
      
      // Add footer on all pages
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        
        // Footer border
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.5);
        pdf.line(50, pageHeight - 40, pageWidth - 50, pageHeight - 40);
        
        // Footer text
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('UNIVERSITY OF EXCELLENCE', pageWidth / 2, pageHeight - 30, { align: 'center' });
        pdf.text('123 University Avenue, City, Country | Tel: +1 (234) 567-8900 | Email: registrar@university.edu', pageWidth / 2, pageHeight - 20, { align: 'center' });
      }
      
      // Save PDF
      const fileName = `Academic_Transcript_${studentInfo?.student_id}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      alert('Academic transcript exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export transcript. Please try again.');
    } finally {
      // Reset button
      const exportButton = document.getElementById('export-pdf');
      if (exportButton) {
        exportButton.disabled = false;
        exportButton.innerHTML = '<i class="fas fa-file-pdf"></i> Export Transcript';
      }
    }
  };

  const refreshResults = () => {
    fetchResults();
  };

  // Render specific exam results
  const renderSpecificExamResults = () => {
    if (!specificExam || !examDetails) return null;

    return (
      <div id="specific-exam-results">
        {/* Specific Exam Header */}
        <div className="dashboard-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div>
            <h2 style={{ margin: '0 0 5px 0' }}>Exam Results</h2>
            <div className="date-display" style={{ color: '#666', fontSize: '14px' }}>
              {specificExam.courseCode} - {specificExam.examTitle}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setSpecificExam(null)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
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
              <i className="fas fa-list"></i>
              All Results
            </button>
            <button 
              id="export-pdf" 
              className="export-button" 
              onClick={exportToPDF}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
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
              <i className="fas fa-file-pdf"></i>
              Export Transcript
            </button>
          </div>
        </div>

        {/* Exam Performance Summary */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '25px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ marginBottom: '25px', color: '#333' }}>
            <i className="fas fa-chart-line" style={{ marginRight: '10px', color: '#007bff' }}></i>
            Exam Performance Summary
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>Total Marks</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{examDetails.total_marks}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>Marks Obtained</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                {specificExam.submission?.total_marks_obtained || 'N/A'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>Percentage</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                {specificExam.submission?.percentage || 
                  (specificExam.submission?.total_marks_obtained && examDetails.total_marks 
                    ? ((specificExam.submission.total_marks_obtained / examDetails.total_marks) * 100).toFixed(2) + '%'
                    : 'N/A')}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>Grade</div>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: getGradeColor(specificExam.submission?.grade)
              }}>
                {specificExam.submission?.grade || 'N/A'}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ margin: '30px 0' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span>Performance</span>
              <span>{specificExam.submission?.percentage || 
                (specificExam.submission?.total_marks_obtained && examDetails.total_marks 
                  ? ((specificExam.submission.total_marks_obtained / examDetails.total_marks) * 100).toFixed(2) + '%'
                  : '0%')}</span>
            </div>
            <div style={{
              height: '20px',
              backgroundColor: '#e9ecef',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div 
                style={{
                  height: '100%',
                  width: `${specificExam.submission?.percentage || 
                    (specificExam.submission?.total_marks_obtained && examDetails.total_marks 
                      ? ((specificExam.submission.total_marks_obtained / examDetails.total_marks) * 100).toFixed(2)
                      : 0)}%`,
                  backgroundColor: (specificExam.submission?.percentage || 
                    (specificExam.submission?.total_marks_obtained && examDetails.total_marks 
                      ? (specificExam.submission.total_marks_obtained / examDetails.total_marks) * 100
                      : 0)) >= 50 ? '#28a745' : '#dc3545',
                  borderRadius: '10px',
                  transition: 'width 0.5s ease'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Exam Details Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '25px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ marginBottom: '20px', color: '#333' }}>Exam Details</h4>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '30px'
          }}>
            <div>
              <h5 style={{ color: '#495057', marginBottom: '15px' }}>
                <i className="fas fa-info-circle" style={{ marginRight: '8px', color: '#007bff' }}></i>
                Exam Information
              </h5>
              <p style={{ margin: '10px 0' }}>
                <strong>Course:</strong> {specificExam.courseCode} - {specificExam.courseName}
              </p>
              <p style={{ margin: '10px 0' }}>
                <strong>Exam Type:</strong> {examDetails.exam_type}
              </p>
              <p style={{ margin: '10px 0' }}>
                <strong>Duration:</strong> {examDetails.duration_minutes} minutes
              </p>
              <p style={{ margin: '10px 0' }}>
                <strong>Date:</strong> {new Date(examDetails.start_time).toLocaleDateString()}
              </p>
              <p style={{ margin: '10px 0' }}>
                <strong>Time:</strong> {new Date(examDetails.start_time).toLocaleTimeString()} - {new Date(examDetails.end_time).toLocaleTimeString()}
              </p>
            </div>
            
            <div>
              <h5 style={{ color: '#495057', marginBottom: '15px' }}>
                <i className="fas fa-user-graduate" style={{ marginRight: '8px', color: '#007bff' }}></i>
                Submission Details
              </h5>
              <p style={{ margin: '10px 0' }}>
                <strong>Student:</strong> {studentInfo?.full_name} ({studentInfo?.student_id})
              </p>
              <p style={{ margin: '10px 0' }}>
                <strong>Submitted:</strong> {specificExam.submission?.submitted_at 
                  ? new Date(specificExam.submission.submitted_at).toLocaleString()
                  : 'N/A'}
              </p>
              <p style={{ margin: '10px 0' }}>
                <strong>Time Spent:</strong> {specificExam.submission?.time_spent_minutes || 'N/A'} minutes
              </p>
              <p style={{ margin: '10px 0' }}>
                <strong>Status:</strong> 
                <span style={{
                  marginLeft: '8px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: specificExam.submission?.status === 'graded' ? '#d4edda' : '#f8d7da',
                  color: specificExam.submission?.status === 'graded' ? '#155724' : '#721c24'
                }}>
                  {specificExam.submission?.status?.toUpperCase() || 'N/A'}
                </span>
              </p>
            </div>
          </div>

          {/* Feedback Section */}
          {specificExam.submission?.feedback && (
            <div style={{
              marginTop: '30px',
              padding: '25px',
              backgroundColor: '#e8f4fc',
              borderRadius: '8px',
              borderLeft: '4px solid #17a2b8'
            }}>
              <h5 style={{ marginBottom: '15px', color: '#495057' }}>
                <i className="fas fa-comment" style={{ marginRight: '8px', color: '#17a2b8' }}></i>
                Lecturer Feedback
              </h5>
              <p style={{ color: '#666', lineHeight: '1.6', margin: 0 }}>
                {specificExam.submission.feedback}
              </p>
            </div>
          )}

          {/* Graded By Section */}
          {specificExam.submission?.graded_by && (
            <div style={{
              marginTop: '25px',
              paddingTop: '25px',
              borderTop: '1px solid #dee2e6',
              textAlign: 'right'
            }}>
              <p style={{ color: '#6c757d', margin: 0 }}>
                <small>
                  Graded by: Lecturer | 
                  Date: {specificExam.submission?.graded_at 
                    ? new Date(specificExam.submission.graded_at).toLocaleDateString()
                    : 'N/A'}
                </small>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '15px',
            marginTop: '35px',
            paddingTop: '25px',
            borderTop: '1px solid #dee2e6'
          }}>
            <button 
              onClick={() => navigate('/examinations')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px'
              }}
            >
              <i className="fas fa-arrow-left"></i>
              Back to Examinations
            </button>
            <button 
              onClick={() => window.print()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px'
              }}
            >
              <i className="fas fa-print"></i>
              Print This Result
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render general results view
  const renderGeneralResults = () => {
    if (loading) {
      return (
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
      );
    }

    if (error) {
      return (
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
            onClick={refreshResults}
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
      );
    }

    return (
      <div id="results-content">
        {/* Summary Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '25px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '5px' }}>
              Student Information
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>
              {studentInfo?.full_name || 'Student Name'}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              ID: {studentInfo?.student_id || 'N/A'} | {studentInfo?.program || 'N/A'} | Year {studentInfo?.year_of_study || 'N/A'} Semester {studentInfo?.semester || 'N/A'}
            </div>
          </div>
          
          <div style={{ 
            backgroundColor: '#007bff',
            color: 'white',
            padding: '15px 25px',
            borderRadius: '8px',
            textAlign: 'center',
            minWidth: '150px'
          }}>
            <div style={{ fontSize: '12px', marginBottom: '5px' }}>CUMULATIVE GPA</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{cgpa.toFixed(2)}</div>
            <div style={{ fontSize: '11px', opacity: 0.9 }}>
              {cgpa >= 4.5 ? 'First Class' : 
               cgpa >= 3.5 ? 'Second Class Upper' : 
               cgpa >= 2.5 ? 'Second Class Lower' : 
               cgpa >= 1.5 ? 'Third Class' : 'Pass'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="tabs" style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '25px',
          alignItems: 'center'
        }}>
          <div style={{ flex: 1 }}>
            <div className="year-selector" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label htmlFor="academic-year" style={{ 
                fontWeight: '500',
                color: '#495057',
                whiteSpace: 'nowrap'
              }}>
                Select Academic Year:
              </label>
              <div style={{ position: 'relative', flex: 1, maxWidth: '200px' }}>
                <select 
                  id="academic-year" 
                  className="form-control"
                  value={activeYear}
                  onChange={(e) => setActiveYear(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 15px',
                    border: '2px solid #dee2e6',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    fontSize: '14px',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
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
                <div style={{
                  position: 'absolute',
                  right: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#6c757d'
                }}>
                  ▼
                </div>
              </div>
            </div>
          </div>
          
          <button 
            id="export-pdf" 
            className="export-button" 
            onClick={exportToPDF}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
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
            <i className="fas fa-file-pdf"></i>
            Export Transcript
          </button>
        </div>

        {/* Results Content */}
        <div className="tab-content active">
          {Object.keys(resultsData).length > 0 ? (
            <div className="year-results">
              {/* Year Summary */}
              {resultsData[activeYear] && (
                <div style={{
                  backgroundColor: '#e8f4fc',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '25px',
                  borderLeft: '4px solid #007bff'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', color: '#0056b3' }}>
                        Year {resultsData[activeYear].year} Academic Summary
                      </h4>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        Total Credits: {resultsData[activeYear].totalCredits} | 
                        Year GPA: {resultsData[activeYear].gpa.toFixed(2)} | 
                        Courses: {resultsData[activeYear].semester1.length + resultsData[activeYear].semester2.length}
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      Year GPA: {resultsData[activeYear].gpa.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {/* Semester 1 */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{
                  margin: '0 0 15px 0',
                  color: '#333',
                  paddingBottom: '10px',
                  borderBottom: '2px solid #007bff'
                }}>
                  <i className="fas fa-calendar" style={{ marginRight: '10px', color: '#007bff' }}></i>
                  Semester 1 Results
                </h3>
                
                {resultsData[activeYear]?.semester1?.length > 0 ? (
                  <div className="table-container" style={{
                    overflowX: 'auto',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6'
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      minWidth: '600px'
                    }}>
                      <thead>
                        <tr style={{ 
                          backgroundColor: '#f8f9fa',
                          borderBottom: '2px solid #dee2e6'
                        }}>
                          <th style={{ 
                            padding: '12px 15px',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: '#495057',
                            borderRight: '1px solid #dee2e6'
                          }}>Course Code</th>
                          <th style={{ 
                            padding: '12px 15px',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: '#495057',
                            borderRight: '1px solid #dee2e6'
                          }}>Course Name</th>
                          <th style={{ 
                            padding: '12px 15px',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: '#495057',
                            borderRight: '1px solid #dee2e6'
                          }}>Credits</th>
                          <th style={{ 
                            padding: '12px 15px',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: '#495057',
                            borderRight: '1px solid #dee2e6'
                          }}>Score (%)</th>
                          <th style={{ 
                            padding: '12px 15px',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: '#495057',
                            borderRight: '1px solid #dee2e6'
                          }}>Grade</th>
                          <th style={{ 
                            padding: '12px 15px',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Grade Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultsData[activeYear].semester1.map((course, index) => (
                          <tr 
                            key={course.id || index} 
                            style={{
                              borderBottom: '1px solid #dee2e6',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            <td style={{ 
                              padding: '12px 15px',
                              borderRight: '1px solid #dee2e6',
                              fontWeight: '500',
                              fontFamily: 'monospace'
                            }}>
                              {course.courseCode}
                              {course.isCore && (
                                <span style={{
                                  fontSize: '10px',
                                  backgroundColor: '#ffc107',
                                  color: '#212529',
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  marginLeft: '8px'
                                }}>
                                  CORE
                                </span>
                              )}
                            </td>
                            <td style={{ 
                              padding: '12px 15px',
                              borderRight: '1px solid #dee2e6'
                            }}>
                              {course.courseName}
                            </td>
                            <td style={{ 
                              padding: '12px 15px',
                              borderRight: '1px solid #dee2e6',
                              textAlign: 'center',
                              fontWeight: '500'
                            }}>
                              {course.credits}
                            </td>
                            <td style={{ 
                              padding: '12px 15px',
                              borderRight: '1px solid #dee2e6',
                              textAlign: 'center'
                            }}>
                              <div style={{
                                display: 'inline-block',
                                padding: '2px 10px',
                                borderRadius: '20px',
                                backgroundColor: course.score >= 50 ? '#d4edda' : '#f8d7da',
                                color: course.score >= 50 ? '#155724' : '#721c24',
                                fontWeight: '500',
                                fontSize: '13px'
                              }}>
                                {course.score}%
                              </div>
                            </td>
                            <td style={{ 
                              padding: '12px 15px',
                              borderRight: '1px solid #dee2e6',
                              textAlign: 'center'
                            }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                backgroundColor: getGradeColor(course.grade),
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                minWidth: '40px'
                              }}>
                                {course.grade}
                              </span>
                            </td>
                            <td style={{ 
                              padding: '12px 15px',
                              textAlign: 'center',
                              fontWeight: '500'
                            }}>
                              {course.gpa.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ 
                          backgroundColor: '#f8f9fa',
                          fontWeight: 'bold'
                        }}>
                          <td colSpan="3" style={{ padding: '15px', textAlign: 'right' }}>
                            Semester 1 GPA:
                          </td>
                          <td style={{ padding: '15px', textAlign: 'center' }}>
                            {calculateSemesterGPA(resultsData[activeYear]?.semester1).toFixed(2)}
                          </td>
                          <td colSpan="2" style={{ padding: '15px', textAlign: 'center', color: '#28a745' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                              <i className="fas fa-chart-line"></i>
                              <span>Semester Credits: {resultsData[activeYear]?.semester1.reduce((sum, course) => sum + (course.credits || 0), 0)}</span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '2px dashed #dee2e6'
                  }}>
                    <i className="fas fa-clipboard-list" style={{
                      fontSize: '48px',
                      color: '#6c757d',
                      marginBottom: '20px'
                    }}></i>
                    <p style={{ color: '#6c757d', fontSize: '16px', margin: '0' }}>
                      No results available for Semester 1
                    </p>
                  </div>
                )}
              </div>

              {/* Semester 2 */}
              <div>
                <h3 style={{
                  margin: '0 0 15px 0',
                  color: '#333',
                  paddingBottom: '10px',
                  borderBottom: '2px solid #28a745'
                }}>
                  <i className="fas fa-calendar-alt" style={{ marginRight: '10px', color: '#28a745' }}></i>
                  Semester 2 Results
                </h3>
                
                {resultsData[activeYear]?.semester2?.length > 0 ? (
                  <div className="table-container" style={{
                    overflowX: 'auto',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6'
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      minWidth: '600px'
                    }}>
                      <thead>
                        <tr style={{ 
                          backgroundColor: '#f8f9fa',
                          borderBottom: '2px solid #dee2e6'
                        }}>
                          <th style={{ 
                            padding: '12px 15px',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: '#495057',
                            borderRight: '1px solid #dee2e6'
                          }}>Course Code</th>
                          <th style={{ 
                            padding: '12px 15px',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: '#495057',
                            borderRight: '1px solid #dee2e6'
                          }}>Course Name</th>
                          <th style={{ 
                            padding: '12px 15px',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: '#495057',
                            borderRight: '1px solid #dee2e6'
                          }}>Credits</th>
                          <th style={{ 
                            padding: '12px 15px',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: '#495057',
                            borderRight: '1px solid #dee2e6'
                          }}>Score (%)</th>
                          <th style={{ 
                            padding: '12px 15px',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: '#495057',
                            borderRight: '1px solid #dee2e6'
                          }}>Grade</th>
                          <th style={{ 
                            padding: '12px 15px',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: '#495057'
                          }}>Grade Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultsData[activeYear].semester2.map((course, index) => (
                          <tr 
                            key={course.id || index} 
                            style={{
                              borderBottom: '1px solid #dee2e6',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            <td style={{ 
                              padding: '12px 15px',
                              borderRight: '1px solid #dee2e6',
                              fontWeight: '500',
                              fontFamily: 'monospace'
                            }}>
                              {course.courseCode}
                              {course.isCore && (
                                <span style={{
                                  fontSize: '10px',
                                  backgroundColor: '#ffc107',
                                  color: '#212529',
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  marginLeft: '8px'
                                }}>
                                  CORE
                                </span>
                              )}
                            </td>
                            <td style={{ 
                              padding: '12px 15px',
                              borderRight: '1px solid #dee2e6'
                            }}>
                              {course.courseName}
                            </td>
                            <td style={{ 
                              padding: '12px 15px',
                              borderRight: '1px solid #dee2e6',
                              textAlign: 'center',
                              fontWeight: '500'
                            }}>
                              {course.credits}
                            </td>
                            <td style={{ 
                              padding: '12px 15px',
                              borderRight: '1px solid #dee2e6',
                              textAlign: 'center'
                            }}>
                              <div style={{
                                display: 'inline-block',
                                padding: '2px 10px',
                                borderRadius: '20px',
                                backgroundColor: course.score >= 50 ? '#d4edda' : '#f8d7da',
                                color: course.score >= 50 ? '#155724' : '#721c24',
                                fontWeight: '500',
                                fontSize: '13px'
                              }}>
                                {course.score}%
                              </div>
                            </td>
                            <td style={{ 
                              padding: '12px 15px',
                              borderRight: '1px solid #dee2e6',
                              textAlign: 'center'
                            }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                backgroundColor: getGradeColor(course.grade),
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                minWidth: '40px'
                              }}>
                                {course.grade}
                              </span>
                            </td>
                            <td style={{ 
                              padding: '12px 15px',
                              textAlign: 'center',
                              fontWeight: '500'
                            }}>
                              {course.gpa.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ 
                          backgroundColor: '#f8f9fa',
                          fontWeight: 'bold'
                        }}>
                          <td colSpan="3" style={{ padding: '15px', textAlign: 'right' }}>
                            Semester 2 GPA:
                          </td>
                          <td style={{ padding: '15px', textAlign: 'center' }}>
                            {calculateSemesterGPA(resultsData[activeYear]?.semester2).toFixed(2)}
                          </td>
                          <td colSpan="2" style={{ padding: '15px', textAlign: 'center', color: '#28a745' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                              <i className="fas fa-chart-line"></i>
                              <span>Semester Credits: {resultsData[activeYear]?.semester2.reduce((sum, course) => sum + (course.credits || 0), 0)}</span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '2px dashed #dee2e6'
                  }}>
                    <i className="fas fa-clipboard-list" style={{
                      fontSize: '48px',
                      color: '#6c757d',
                      marginBottom: '20px'
                    }}></i>
                    <p style={{ color: '#6c757d', fontSize: '16px', margin: '0' }}>
                      No results available for Semester 2
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="no-results" style={{
              padding: '60px 20px',
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <i className="fas fa-graduation-cap" style={{
                fontSize: '64px',
                color: '#dee2e6',
                marginBottom: '20px'
              }}></i>
              <h3 style={{ color: '#6c757d', marginBottom: '15px' }}>
                No Examination Results Available
              </h3>
              <p style={{ color: '#999', marginBottom: '25px', maxWidth: '500px', margin: '0 auto 25px' }}>
                Your examination results will appear here once they have been processed and published by the examination office.
              </p>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button 
                  onClick={refreshResults}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px'
                  }}
                >
                  <i className="fas fa-sync-alt"></i>
                  Check Again
                </button>
                <button 
                  onClick={() => navigate('/courses')}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px'
                  }}
                >
                  <i className="fas fa-book"></i>
                  View Courses
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

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
            <i className="fas fa-chart-line" style={{ marginRight: '10px', color: '#007bff' }}></i>
            {specificExam ? 'Exam Results' : 'Examination Results'}
          </h2>
          <div className="date-display" style={{ color: '#666', fontSize: '14px' }}>
            {studentInfo?.academic_year || 'Academic Year: 2024-2025'}
          </div>
        </div>
        {!specificExam && (
          <button 
            onClick={refreshResults}
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
        )}
      </div>

      {specificExam ? renderSpecificExamResults() : renderGeneralResults()}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        tr:hover {
          background-color: #f8f9fa !important;
        }
        
        select:focus {
          outline: none;
          border-color: #007bff !important;
          box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
        }
        
        button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
        
        button:active:not(:disabled) {
          transform: translateY(0);
        }
        
        .export-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        @media print {
          .dashboard-header button,
          .tabs select,
          .export-button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Results;