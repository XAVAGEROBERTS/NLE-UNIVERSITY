import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';

const CourseUnits = () => {
  const [activeTab, setActiveTab] = useState('current');
  const [completedCourses, setCompletedCourses] = useState({});
  const [courseData, setCourseData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useStudentAuth();
  const [studentInfo, setStudentInfo] = useState(null);
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
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching data for user:', user.email);

      // Get student with year of study, semester, program_code, and program_duration_years
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, year_of_study, semester, academic_year, program, program_code, program_duration_years, program_total_semesters')
        .eq('email', user.email)
        .single();

      if (studentError) {
        console.error('Student error:', studentError);
        throw new Error(`Student data error: ${studentError.message}`);
      }

      if (!student) {
        throw new Error('Student not found');
      }

      console.log('Student found:', student);
      setStudentInfo(student);

      // Calculate total semesters based on program duration
      const isEngineering = student.program_code === 'BSCE';
      const totalYears = student.program_duration_years || (isEngineering ? 4 : 3);
      const totalSemesters = student.program_total_semesters || totalYears * 2;
      
      console.log('Program:', student.program_code, 'Total years:', totalYears, 'Total semesters:', totalSemesters);

      // Fetch ALL courses for the student's program
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('program_code', student.program_code)
        .eq('is_active', true)
        .order('year', { ascending: true })
        .order('semester', { ascending: true })
        .order('course_code', { ascending: true });

      if (coursesError) {
        console.error('Courses error:', coursesError);
        throw new Error(`Courses error: ${coursesError.message}`);
      }

      console.log('Courses fetched:', courses?.length || 0, 'for program:', student.program_code);

      // If no courses found with exact match, try fallback
      let finalCourses = courses;
      if (!finalCourses || finalCourses.length === 0) {
        console.log('No courses found with exact match, trying broader search...');
        
        const departmentCode = isEngineering ? 'ENG' : 'SCT';
        const { data: deptCourses } = await supabase
          .from('courses')
          .select('*')
          .eq('department_code', departmentCode)
          .eq('is_active', true)
          .limit(30)
          .order('course_code', { ascending: true });
        
        if (deptCourses && deptCourses.length > 0) {
          finalCourses = deptCourses;
          console.log('Using', finalCourses.length, 'department courses as fallback');
        }
      }

      if (!finalCourses || finalCourses.length === 0) {
        console.warn('No courses found at all');
        setCourseData({});
        setLoading(false);
        return;
      }

      // Fetch student's course enrollments and grades
      const { data: studentCourses, error: scError } = await supabase
        .from('student_courses')
        .select('course_id, status, grade, marks')
        .eq('student_id', student.id);

      if (scError) {
        console.error('Student courses error:', scError);
        throw new Error(`Student courses error: ${scError.message}`);
      }

      console.log('Student courses:', studentCourses?.length || 0);

      // Create completed courses map from database only
      const completedMap = {};
      if (studentCourses) {
        studentCourses.forEach(sc => {
          if (sc.status === 'completed') {
            completedMap[sc.course_id] = {
              completed: true,
              grade: sc.grade,
              marks: sc.marks
            };
          }
        });
      }

      // Use only database data
      setCompletedCourses(completedMap);

      // Get current year from student data
      const currentYear = student.year_of_study || 1;
      const currentSemester = student.semester || 1;
      console.log('Current year of study:', currentYear, 'Semester:', currentSemester);

      // Create tabs for ALL years in the program
      const organizedData = {};
      
      for (let year = 1; year <= totalYears; year++) {
        let tabKey = '';
        let title = '';
        
        if (year === currentYear) {
          tabKey = 'current';
          title = `Year ${year} (Current)`;
        } else if (year === currentYear - 1) {
          tabKey = 'previous1';
          title = `Year ${year}`;
        } else if (year === currentYear - 2) {
          tabKey = 'previous2';
          title = `Year ${year}`;
        } else if (year === currentYear - 3) {
          tabKey = 'previous3';
          title = `Year ${year}`;
        } else if (year < currentYear) {
          tabKey = `past${year}`;
          title = `Year ${year}`;
        } else if (year > currentYear) {
          tabKey = `future${year}`;
          title = `Year ${year}`;
        } else {
          tabKey = `year${year}`;
          title = `Year ${year}`;
        }
        
        organizedData[tabKey] = {
          title: title,
          yearNumber: year,
          semesters: [],
          academicYear: year === currentYear ? student.academic_year : null,
          isCurrent: year === currentYear,
          isPast: year < currentYear,
          isFuture: year > currentYear
        };
      }
      
      const currentYearKey = Object.keys(organizedData).find(key => 
        organizedData[key].yearNumber === currentYear
      ) || Object.keys(organizedData)[0];
      
      if (currentYearKey && !activeTab) {
        setActiveTab(currentYearKey);
      }

      // Group courses by year and semester
      if (finalCourses && finalCourses.length > 0) {
        finalCourses.forEach(course => {
          if (course.year >= 1 && course.year <= totalYears) {
            const tabEntry = Object.entries(organizedData).find(([key, data]) => 
              data.yearNumber === course.year
            );
            
           if (tabEntry) {
  const [tabKey, yearData] = tabEntry;

  // Skip non-current semester courses in the current year
  // if (yearData.isCurrent && course.semester !== currentSemester) {
  //   return; // Do not add Semester 2 courses to current tab
  // }

  let semesterGroup = yearData.semesters.find(s => 
    s.semesterNumber === course.semester
  );
  
  if (!semesterGroup) {
    semesterGroup = {
      semesterNumber: course.semester,
      semester: `Semester ${course.semester}`,
      courses: []
    };
    yearData.semesters.push(semesterGroup);
  }
  
  const courseExists = semesterGroup.courses.some(c => c.id === course.id);
  
  if (!courseExists) {
    const courseInfo = {
      id: course.id,
      code: course.course_code,
      name: course.course_name,
      credits: course.credits,
      isCore: course.is_core,
      year: course.year,
      semester: course.semester,
      program: course.program,
      program_code: course.program_code,
      department: course.department
    };

    if (completedMap[course.id]) {
      courseInfo.grade = completedMap[course.id].grade;
      courseInfo.marks = completedMap[course.id].marks;
      courseInfo.completed = true;
    } else {
      courseInfo.completed = false;
    }

    semesterGroup.courses.push(courseInfo);
  }
}
          }
        });
      }

      // Add empty semesters for UI completeness
      Object.keys(organizedData).forEach(key => {
        const yearData = organizedData[key];
        const yearNumber = yearData.yearNumber;
        
        for (let semester = 1; semester <= 2; semester++) {
          const hasSemester = yearData.semesters.some(s => s.semesterNumber === semester);
          
          if (!hasSemester) {
            yearData.semesters.push({
              semesterNumber: semester,
              semester: `Semester ${semester}`,
              courses: [],
              isEmpty: true
            });
          }
        }
        
        yearData.semesters.sort((a, b) => a.semesterNumber - b.semesterNumber);
        
        yearData.semesters.forEach(semester => {
          semester.courses.sort((a, b) => {
            return a.code.localeCompare(b.code);
          });
        });
        
        const hasCourses = yearData.semesters.some(semester => semester.courses.length > 0);
        if (!hasCourses) {
          delete organizedData[key];
        }
      });

      console.log('Organized data:', organizedData);
      setCourseData(organizedData);
    } catch (err) {
      console.error('Error fetching student data:', err);
      setError(`Failed to load course data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Render mobile-friendly course card
  const renderMobileCourseCard = (course) => {
    const isCompleted = completedCourses[course.id]?.completed || false;
    const grade = completedCourses[course.id]?.grade;
    const marks = completedCourses[course.id]?.marks;

    return (
      <div key={course.id} className="mobile-course-card" style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        borderLeft: `4px solid ${isCompleted ? '#28a745' : '#007bff'}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <i className="fa-solid fa-folder-minus" style={{ 
                color: isCompleted ? '#28a745' : '#6c757d',
                marginRight: '10px',
                fontSize: '16px'
              }}></i>
              <span style={{
                fontWeight: 'bold',
                color: '#007bff',
                fontSize: '14px',
                marginRight: '8px'
              }}>{course.code}</span>
            </div>
            <h4 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '16px',
              color: '#333',
              lineHeight: '1.3'
            }}>
              {course.name}
            </h4>
          </div>
          <div style={{
            padding: '6px 12px',
            backgroundColor: isCompleted ? '#28a745' : '#f8f9fa',
            color: isCompleted ? 'white' : '#6c757d',
            border: isCompleted ? 'none' : '1px solid #dee2e6',
            borderRadius: '6px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            minWidth: '100px',
            justifyContent: 'center',
            cursor: isCompleted ? 'default' : 'not-allowed' 

          }}>
            {isCompleted ? (
              <>
                <i className="fas fa-check" style={{ fontSize: '12px' }}></i>
                <span>Completed</span>
              </>
            ) : (
              <>
                <i className="fas fa-clock" style={{ fontSize: '12px' }}></i>
                <span>In Progress</span>
              </>
            )}
          </div>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '8px',
          marginBottom: '12px'
        }}>
          <div>
            <p style={{ 
              margin: '0 0 2px 0',
              fontSize: '11px',
              color: '#999',
              textTransform: 'uppercase'
            }}>
              Credits
            </p>
            <p style={{ 
              margin: '0',
              fontSize: '14px',
              fontWeight: '500',
              color: '#333'
            }}>
              {course.credits} Credits
            </p>
          </div>
          <div>
            <p style={{ 
              margin: '0 0 2px 0',
              fontSize: '11px',
              color: '#999',
              textTransform: 'uppercase'
            }}>
              Type
            </p>
            <p style={{ 
              margin: '0',
              fontSize: '14px',
              fontWeight: '500',
              color: course.isCore ? '#ffc107' : '#333'
            }}>
              {course.isCore ? 'Core' : 'Elective'}
            </p>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '6px',
          marginBottom: '8px',
          fontSize: '11px'
        }}>
          <span style={{
            backgroundColor: '#e9ecef',
            padding: '2px 6px',
            borderRadius: '4px',
            color: '#666'
          }}>
            Prog: {course.program_code}
          </span>
          <span style={{
            backgroundColor: '#e9ecef',
            padding: '2px 6px',
            borderRadius: '4px',
            color: '#666'
          }}>
            Dept: {course.department}
          </span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '6px',
          paddingTop: '8px',
          borderTop: '1px solid #eee'
        }}>
          {grade && (
            <span style={{
              backgroundColor: grade === 'A' ? '#28a745' : 
                            grade === 'B+' ? '#20c997' : 
                            grade === 'B' ? '#17a2b8' : '#6c757d',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              Grade: {grade} {marks && `(${marks}%)`}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Render desktop course item
  const renderDesktopCourseItem = (course, courseIndex) => {
    const isCompleted = completedCourses[course.id]?.completed || false;
    const grade = completedCourses[course.id]?.grade;
    const marks = completedCourses[course.id]?.marks;

    return (
      <div key={`${course.id}-${courseIndex}`} className="course-item" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'clamp(12px, 2vw, 16px)',
        marginBottom: 'clamp(10px, 2vw, 12px)',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        borderLeft: `4px solid ${isCompleted ? '#28a745' : '#007bff'}`
      }}>
        <div className="course-info" style={{ flex: 1 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: 'clamp(6px, 1.2vw, 8px)',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <i className="fa-solid fa-folder-minus course-folder-icon" style={{ 
              color: isCompleted ? '#28a745' : '#6c757d',
              marginRight: 'clamp(8px, 1.5vw, 10px)',
              fontSize: 'clamp(16px, 2vw, 18px)'
            }}></i>
            <span className="course-code" style={{
              fontWeight: 'bold',
              color: '#007bff',
              marginRight: 'clamp(8px, 1.5vw, 10px)',
              minWidth: '80px',
              fontSize: 'clamp(14px, 1.8vw, 16px)'
            }}>{course.code}</span>
            <h4 style={{ 
              margin: 0, 
              fontSize: 'clamp(15px, 2vw, 17px)',
              lineHeight: '1.3'
            }}>{course.name}</h4>
          </div>
          <div className="course-details" style={{ 
            display: 'flex',
            gap: 'clamp(6px, 1.2vw, 8px)',
            flexWrap: 'wrap',
            fontSize: 'clamp(13px, 1.6vw, 14px)',
            color: '#666',
            marginLeft: 'clamp(30px, 4vw, 34px)'
          }}>
            <span className="course-credits" style={{
              backgroundColor: '#f8f9fa',
              padding: '4px 10px',
              borderRadius: '12px'
            }}>{course.credits} Credits</span>
            <span className="course-program" style={{
              backgroundColor: '#e7f3ff',
              padding: '4px 10px',
              borderRadius: '12px'
            }}>
              {course.program_code}
            </span>
            <span className="course-dept" style={{
              backgroundColor: '#e9ecef',
              padding: '4px 10px',
              borderRadius: '12px',
              color: '#666'
            }}>
              {course.department}
            </span>
            {course.isCore && <span className="course-core" style={{
              backgroundColor: '#ffc107',
              color: '#212529',
              padding: '4px 10px',
              borderRadius: '12px',
              fontWeight: '500',
              display: 'none'
            }}>Core</span>}
            {grade && (
              <span className={`course-grade grade-${grade}`} style={{
                backgroundColor: grade === 'A' ? '#28a745' : 
                                grade === 'B+' ? '#20c997' : 
                                grade === 'B' ? '#17a2b8' : '#6c757d',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '12px',
                fontWeight: '500'
              }}>
                Grade: {grade} {marks && `(${marks}%)`}
              </span>
            )}
          </div>
        </div>
        <div 
          className={`course-status-display ${isCompleted ? 'completed' : ''}`}
          style={{
            padding: 'clamp(8px, 1.5vw, 10px) clamp(12px, 2vw, 16px)',
            backgroundColor: isCompleted ? '#28a745' : '#f8f9fa',
            color: isCompleted ? 'white' : '#6c757d',
            border: isCompleted ? 'none' : '1px solid #dee2e6',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: 'clamp(120px, 15vw, 140px)',
            justifyContent: 'center',
            fontSize: 'clamp(13px, 1.6vw, 14px)',
            whiteSpace: 'nowrap',
            cursor: isCompleted ? 'default' : 'not-allowed' 
          }}
        >
          {isCompleted ? (
            <>
              <i className="fas fa-check"></i>
              <span className="status-text">Completed</span>
            </>
          ) : (
            <>
              <i className="fas fa-clock"></i>
              <span className="status-text">In Progress</span>
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="content">
        <div className="dashboard-header" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)' }}>Course Units</h2>
          <div className="date-display" style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
            Loading courses...
          </div>
        </div>
        <div className="loading-spinner" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content">
        <div className="dashboard-header" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)' }}>Course Units</h2>
          <div className="date-display" style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
            Error
          </div>
        </div>
        <div className="error-message" style={{
          padding: '20px',
          backgroundColor: '#fee',
          border: '1px solid #f99',
          borderRadius: '8px',
          margin: '20px 0'
        }}>
          <p style={{ color: '#d33', margin: '0 0 15px 0' }}>{error}</p>
          <button 
            onClick={fetchStudentData}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currentYearData = Object.values(courseData).find(data => data.title.includes('Current')) || 
                         Object.values(courseData)[0];

  return (
    <div className="content" style={{ padding: 'clamp(10px, 3vw, 20px)' }}>
      <div className="dashboard-header" style={{ 
        marginBottom: 'clamp(20px, 4vw, 30px)',
        padding: isMobile ? '10px 0' : '0'
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 'clamp(6px, 1.5vw, 10px)',
          width: '100%'
        }}>
          <h2 style={{ 
            margin: '0',
            fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)',
            lineHeight: '1.2'
          }}>
            Course Units
          </h2>
          {studentInfo && (
            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row',
              gap: 'clamp(8px, 1.5vw, 12px)',
              flexWrap: 'wrap'
            }}>
              <div style={{
                fontSize: 'clamp(0.85rem, 2vw, 1rem)',
                color: '#666',
                backgroundColor: '#f8f9fa',
                padding: 'clamp(6px, 1.2vw, 8px) clamp(10px, 2vw, 12px)',
                borderRadius: '6px',
                flex: isMobile ? '1' : '0 1 auto'
              }}>
               Year {studentInfo.year_of_study} (Current), Semester {studentInfo.semester} 
                ({studentInfo.academic_year || 'N/A'})
              </div>
              <div style={{ 
                fontSize: 'clamp(0.85rem, 2vw, 1rem)',
                color: '#666',
                backgroundColor: '#e9f7fe',
                padding: 'clamp(6px, 1.2vw, 8px) clamp(10px, 2vw, 12px)',
                borderRadius: '6px',
                flex: isMobile ? '1' : '0 1 auto'
              }}>
                <strong>Program:</strong> {studentInfo.program}
              </div>
              <div style={{ 
                fontSize: 'clamp(0.85rem, 2vw, 1rem)',
                color: '#666',
                backgroundColor: '#e9ecef',
                padding: 'clamp(6px, 1.2vw, 8px) clamp(10px, 2vw, 12px)',
                borderRadius: '6px',
                flex: isMobile ? '1' : '0 1 auto'
              }}>
                <strong>Code:</strong> {studentInfo.program_code}
              </div>
            </div>
          )}
        </div>
      </div>

      {Object.keys(courseData).length === 0 ? (
        <div className="no-courses" style={{
          textAlign: 'center',
          padding: 'clamp(30px, 6vw, 40px)',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <i className="fas fa-book-open" style={{
            fontSize: 'clamp(2.5rem, 6vw, 3rem)',
            color: '#dee2e6',
            marginBottom: '20px'
          }}></i>
          <p style={{ 
            margin: '0 0 10px 0',
            fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)',
            color: '#333'
          }}>
            No course data available for your program
          </p>
          {studentInfo && (
            <div style={{ 
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '8px',
              padding: 'clamp(12px, 2.5vw, 16px)',
              margin: '20px 0',
              maxWidth: '600px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              <p style={{ margin: '0 0 8px 0', color: '#856404' }}>
                <strong>Student Info:</strong> {studentInfo.program} ({studentInfo.program_code})
              </p>
              <p style={{ margin: '0 0 8px 0', color: '#856404' }}>
                <strong>Year:</strong> {studentInfo.year_of_study}, <strong>Semester:</strong> {studentInfo.semester}
              </p>
              <p style={{ 
                margin: '0', 
                fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', 
                color: '#856404',
                lineHeight: '1.4'
              }}>
                The system couldn't find courses for your program code: <strong>{studentInfo.program_code}</strong>
                in Year {studentInfo.year_of_study}, Semester {studentInfo.semester}.
                Please contact your department if this seems incorrect.
              </p>
            </div>
          )}
          <button 
            onClick={fetchStudentData}
            style={{
              padding: 'clamp(10px, 2vw, 12px) clamp(20px, 3vw, 24px)',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: 'clamp(14px, 2vw, 16px)',
              fontWeight: '500'
            }}
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Tabs - Responsive */}
          <div className="tabs" style={{
            display: 'flex',
            overflowX: 'auto',
            gap: 'clamp(4px, 1vw, 8px)',
            padding: 'clamp(8px, 1.5vw, 10px) 0',
            marginBottom: 'clamp(20px, 3vw, 25px)',
            WebkitOverflowScrolling: 'touch'
          }}>
            {Object.keys(courseData).map(key => (
              <div 
                key={key}
                className={`tab ${activeTab === key ? 'active' : ''}`}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: 'clamp(8px, 1.5vw, 12px) clamp(12px, 2vw, 16px)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)',
                  backgroundColor: activeTab === key ? '#007bff' : '#f8f9fa',
                  color: activeTab === key ? 'white' : '#666',
                  border: `1px solid ${activeTab === key ? '#007bff' : '#dee2e6'}`,
                  transition: 'all 0.3s ease',
                  flexShrink: '0'

                }}
              >
                {courseData[key].title}
              </div>
            ))}
          </div>

          <div className="tab-content active">
            {courseData[activeTab]?.semesters?.length === 0 ? (
              <div className="no-courses" style={{
                textAlign: 'center',
                padding: 'clamp(30px, 5vw, 40px)',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                <p style={{ 
                  margin: 0,
                  fontSize: 'clamp(1rem, 2.2vw, 1.1rem)',
                  color: '#666'
                }}>
                  No courses found for {courseData[activeTab].title}
                </p>
              </div>
            ) : (
              courseData[activeTab]?.semesters?.map((semester, semIndex) => (
                <div key={semIndex} style={{ 
                  marginBottom: 'clamp(25px, 4vw, 35px)'
                }}>
<h3 style={{ 
  marginBottom: 'clamp(12px, 2.5vw, 16px)', 
  marginTop: semIndex > 0 ? 'clamp(25px, 4vw, 35px)' : '0',
  color: '#333',
  borderBottom: '2px solid #eee',
  paddingBottom: 'clamp(8px, 1.5vw, 12px)',
  fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
}}>
  <span>{semester.semester}</span>
  {courseData[activeTab].isCurrent && semester.semesterNumber === studentInfo.semester && (
    <span style={{
      backgroundColor: '#28a745',
      color: 'white',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '0.8em',
      fontWeight: 'bold'
    }}>
      CURRENT SEMESTER
    </span>
  )}
  {courseData[activeTab].isCurrent && semester.semesterNumber !== studentInfo.semester && (
    <span style={{
      backgroundColor: '#ffc107',
      color: '#212529',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '0.8em',
      fontWeight: 'bold',
      display: 'none'
      
    }}>
      NEXT SEMESTER
    </span>
  )}
</h3>
                  <div className="courses-list">
                    {isMobile ? (
                      // Mobile View: Compact Cards
                      semester.courses.map((course, courseIndex) => 
                        renderMobileCourseCard(course, courseIndex)
                      )
                    ) : (
                      // Desktop View: Full Items
                      semester.courses.map((course, courseIndex) => 
                        renderDesktopCourseItem(course, courseIndex)
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Responsive CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .tabs::-webkit-scrollbar {
          height: 4px;
        }
        
        .tabs::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 2px;
        }
        
        .tabs::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 2px;
        }
        
        .tabs::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* Mobile-specific optimizations */
        @media (max-width: 768px) {
          .mobile-course-card:hover {
            transform: translateY(-2px);
            transition: transform 0.3s ease;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          }
          
          .tabs {
            margin-left: -10px;
            margin-right: -10px;
            padding-left: 10px;
            padding-right: 10px;
          }
        }
        
        @media (max-width: 480px) {
          .dashboard-header {
            padding: 0 !important;
          }
          
          .mobile-course-card {
            padding: 14px !important;
          }
          
          .tabs div {
            padding: 8px 12px !important;
            font-size: 14px !important;
          }
        }
        
        /* Hover effects for desktop */
        @media (hover: hover) {
          .tab:hover {
            background-color: #e9ecef !important;
            color: #333 !important;
            border-color: #dee2e6 !important;
          }
          
          .course-item:hover {
            transform: translateY(-2px);
            transition: transform 0.3s ease;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          }
        }
        
        /* Improve touch targets on mobile */
        @media (max-width: 768px) {
          button, .course-status-display {
            min-height: 44px;
          }
          
          .tab {
            min-height: 40px;
            display: flex;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};

export default CourseUnits;