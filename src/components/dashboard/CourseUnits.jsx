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

  // Helper function to normalize program names
  const normalizeProgramName = (programName) => {
    if (!programName) return '';
    
    const normalized = programName.toLowerCase();
    
    if (normalized.includes('computer science') || normalized.includes('bsc computer science')) {
      return 'Computer Science';
    } else if (normalized.includes('computer engineering') || normalized.includes('bsc computer engineering')) {
      return 'Computer Engineering';
    } else if (normalized.includes('software engineering') || normalized.includes('bsc software engineering')) {
      return 'Software Engineering';
    } else if (normalized.includes('information technology') || normalized.includes('bit')) {
      return 'Information Technology';
    } else if (normalized.includes('it')) {
      return 'Information Technology';
    }
    
    // Try to extract just the main program name
    const match = programName.match(/Bachelor of (?:Science in )?(.+)/i);
    return match ? match[1].trim() : programName;
  };

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching data for user:', user.email);

      // Get student with year of study and program
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, year_of_study, semester, academic_year, program')
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

      // Normalize the program name for course lookup
      const normalizedProgram = normalizeProgramName(student.program);
      console.log('Original program:', student.program, 'Normalized to:', normalizedProgram);

      // Try different program name variations to find courses
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .or(`program.eq.${normalizedProgram},program.eq.${student.program}`)
        .order('year', { ascending: true })
        .order('semester', { ascending: true });

      if (coursesError) {
        console.error('Courses error:', coursesError);
        throw new Error(`Courses error: ${coursesError.message}`);
      }

      console.log('Courses fetched:', courses?.length || 0, 'for normalized program:', normalizedProgram);

      // If no courses found, try a more flexible search
      let finalCourses = courses;
      if (!finalCourses || finalCourses.length === 0) {
        console.log('No courses found with exact program match, trying broader search...');
        
        // Try to find courses that match the program name partially
        const { data: partialCourses } = await supabase
          .from('courses')
          .select('*')
          .ilike('program', `%${normalizedProgram}%`)
          .order('year', { ascending: true })
          .order('semester', { ascending: true });
        
        if (partialCourses && partialCourses.length > 0) {
          finalCourses = partialCourses;
          console.log('Found', finalCourses.length, 'courses with partial match');
        }
      }

      // If still no courses, try to get any Computer Science courses
      if (!finalCourses || finalCourses.length === 0) {
        console.log('Trying default Computer Science courses...');
        const { data: defaultCourses } = await supabase
          .from('courses')
          .select('*')
          .or('program.eq.Computer Science,program.eq.Computer Engineering,program.eq.Software Engineering,program.eq.Information Technology')
          .order('year', { ascending: true })
          .order('semester', { ascending: true })
          .limit(20);
        
        if (defaultCourses && defaultCourses.length > 0) {
          finalCourses = defaultCourses;
          console.log('Using', finalCourses.length, 'default courses');
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

      // Create completed courses map
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

      // Merge with localStorage
      const saved = localStorage.getItem('completedCourses');
      const savedMap = saved ? JSON.parse(saved) : {};
      const mergedCompleted = { ...savedMap, ...completedMap };
      setCompletedCourses(mergedCompleted);

      // Get current year from student data
      const currentYear = student.year_of_study || 1;
      console.log('Current year of study:', currentYear);

      // Organize courses by year - dynamic approach
      const organizedData = {};
      
      // First, find all unique years in the courses
      const allYears = [];
      if (finalCourses && finalCourses.length > 0) {
        const uniqueCourseYears = [...new Set(finalCourses.map(course => course.year))];
        uniqueCourseYears.sort((a, b) => b - a);
        
        console.log('Unique years in courses:', uniqueCourseYears);
        
        // Create tab keys and titles based on actual data
        uniqueCourseYears.forEach((year, index) => {
          let tabKey = '';
          let title = '';
          
          if (year === currentYear) {
            tabKey = 'current';
            title = `Year ${year} (Current)`;
          } else if (index === 0 && year !== currentYear) {
            tabKey = 'previous1';
            title = `Year ${year}`;
          } else if (index === 1) {
            tabKey = 'previous2';
            title = `Year ${year}`;
          } else if (index === 2) {
            tabKey = 'previous3';
            title = `Year ${year}`;
          } else {
            tabKey = `year${year}`;
            title = `Year ${year}`;
          }
          
          organizedData[tabKey] = {
            title: title,
            yearNumber: year,
            semesters: [],
            academicYear: year === currentYear ? student.academic_year : null
          };
          
          allYears.push({ key: tabKey, year: year, title: title });
        });
        
        // Set active tab to current year if it exists
        const currentYearKey = allYears.find(y => y.year === currentYear)?.key || allYears[0]?.key;
        if (currentYearKey && !activeTab) {
          setActiveTab(currentYearKey);
        }
      }

      // Group courses by year and semester
      if (finalCourses && finalCourses.length > 0) {
        finalCourses.forEach(course => {
          // Find the tab key for this course's year
          const tabEntry = Object.entries(organizedData).find(([key, data]) => 
            data.yearNumber === course.year
          );
          
          if (tabEntry) {
            const [tabKey, yearData] = tabEntry;
            
            let semesterGroup = organizedData[tabKey].semesters.find(s => 
              s.semesterNumber === course.semester
            );
            
            if (!semesterGroup) {
              semesterGroup = {
                semesterNumber: course.semester,
                semester: `Semester ${course.semester}`,
                courses: []
              };
              organizedData[tabKey].semesters.push(semesterGroup);
            }
            
            // Check if course already exists in this semester to avoid duplicates
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
                program: course.program
              };

              // Add grade if completed
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
        });
      }

      // Sort semesters by semester number and remove empty semesters
      Object.keys(organizedData).forEach(key => {
        // Sort semesters
        organizedData[key].semesters.sort((a, b) => a.semesterNumber - b.semesterNumber);
        
        // Sort courses within each semester
        organizedData[key].semesters.forEach(semester => {
          semester.courses.sort((a, b) => {
            return a.code.localeCompare(b.code);
          });
        });
        
        // Filter out semesters with no courses
        organizedData[key].semesters = organizedData[key].semesters.filter(
          semester => semester.courses.length > 0
        );
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

  const toggleCourse = async (courseId) => {
    try {
      if (!user?.email) return;

      // Get student ID
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('email', user.email)
        .single();

      const isCurrentlyCompleted = completedCourses[courseId]?.completed || false;
      const newStatus = !isCurrentlyCompleted;

      // Update in database
      const { error: updateError } = await supabase
        .from('student_courses')
        .upsert({
          student_id: student.id,
          course_id: courseId,
          status: newStatus ? 'completed' : 'in_progress',
          completion_date: newStatus ? new Date().toISOString().split('T')[0] : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'student_id, course_id'
        });

      if (updateError) throw updateError;

      // Update local state
      setCompletedCourses(prev => {
        const newState = {
          ...prev,
          [courseId]: {
            ...prev[courseId],
            completed: newStatus,
            grade: newStatus ? 'A' : null,
            marks: newStatus ? 85 : null
          }
        };
        localStorage.setItem('completedCourses', JSON.stringify(newState));
        return newState;
      });

      // Refresh data
      fetchStudentData();
    } catch (error) {
      console.error('Error updating course status:', error);
      alert('Failed to update course status. Please try again.');
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
          <button 
            onClick={() => toggleCourse(course.id)}
            style={{
              padding: '6px 12px',
              backgroundColor: isCompleted ? '#28a745' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              minWidth: '100px',
              justifyContent: 'center'
            }}
          >
            {isCompleted ? (
              <>
                <i className="fas fa-check" style={{ fontSize: '12px' }}></i>
                <span>Done</span>
              </>
            ) : (
              <>
                <i className="fas fa-lock" style={{ fontSize: '12px' }}></i>
                <span>In Progress</span>
              </>
            )}
          </button>
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
              {course.program}
            </span>
            {course.isCore && <span className="course-core" style={{
              backgroundColor: '#ffc107',
              color: '#212529',
              padding: '4px 10px',
              borderRadius: '12px',
              fontWeight: '500'
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
        <button 
          className={`course-toggle ${isCompleted ? 'completed' : ''}`}
          onClick={() => toggleCourse(course.id)}
          title={isCompleted ? 'Mark as in progress' : 'Mark as completed'}
          style={{
            padding: 'clamp(8px, 1.5vw, 10px) clamp(12px, 2vw, 16px)',
            backgroundColor: isCompleted ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background-color 0.3s',
            minWidth: 'clamp(120px, 15vw, 140px)',
            justifyContent: 'center',
            fontSize: 'clamp(13px, 1.6vw, 14px)',
            whiteSpace: 'nowrap'
          }}
        >
          {isCompleted ? (
            <>
              <i className="fas fa-check"></i>
              <span className="toggle-text">Completed</span>
            </>
          ) : (
            <>
              <i className="fas fa-lock"></i>
              <span className="toggle-text">In Progress</span>
            </>
          )}
        </button>
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
                {currentYearData?.title || 'Year Information'}, 
                Semester {currentYearData?.semesters?.[0]?.semesterNumber || 'N/A'} 
                ({currentYearData?.academicYear || 'N/A'})
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
                <strong>Program:</strong> {studentInfo.program}
              </p>
              <p style={{ 
                margin: '0', 
                fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', 
                color: '#856404',
                lineHeight: '1.4'
              }}>
                The system couldn't find courses matching your exact program name.
                This might be due to a mismatch between how your program is named in the database.
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
                    fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)'
                  }}>
                    {courseData[activeTab].title}, {semester.semester}
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
          
          .course-toggle:hover {
            background-color: ${completed => completed ? '#dc3545' : '#28a745'} !important;
          }
          
          .course-item:hover {
            transform: translateY(-2px);
            transition: transform 0.3s ease;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          }
        }
        
        /* Improve touch targets on mobile */
        @media (max-width: 768px) {
          button, .course-toggle {
            min-height: 44px;
            min-width: 44px;
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