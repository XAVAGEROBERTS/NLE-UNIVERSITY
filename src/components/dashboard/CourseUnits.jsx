import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';
import './CourseUnits.css';

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
    const gradeClass = grade === 'B+' ? 'b-plus' : grade === 'B' ? 'b' : 'other';

    return (
      <div key={course.id} className={`cu-mobile-course-card ${isCompleted ? 'completed' : ''}`}>
        <div className="cu-mobile-card-header">
          <div className="cu-mobile-card-left">
            <div className="cu-mobile-code-row">
              <i className={`fa-solid fa-folder-minus cu-mobile-folder-icon ${isCompleted ? 'completed' : ''}`}></i>
              <span className="cu-mobile-course-code">{course.code}</span>
            </div>
            <h4 className="cu-mobile-course-title">{course.name}</h4>
          </div>
          <div className={`cu-mobile-status-badge ${isCompleted ? 'completed' : ''}`}>
            {isCompleted ? (
              <>
                <i className="fas fa-check"></i>
                <span>Completed</span>
              </>
            ) : (
              <>
                <i className="fas fa-clock"></i>
                <span>In Progress</span>
              </>
            )}
          </div>
        </div>
        
        <div className="cu-mobile-stats-grid">
          <div>
            <p className="cu-mobile-stat-label">Credits</p>
            <p className="cu-mobile-stat-value">{course.credits} Credits</p>
          </div>
          <div style={{ display: 'none' }}>
            <p className="cu-mobile-stat-label">Type</p>
            <p className="cu-mobile-stat-value" style={{ color: course.isCore ? '#ffc107' : '#333' }}>
              {course.isCore ? 'Core' : 'Elective'}
            </p>
          </div>
        </div>
        
        <div className="cu-mobile-tags-container">
          <span className="cu-mobile-tag">
            Prog: {course.program_code}
          </span>
          <span className="cu-mobile-tag">
            Dept: {course.department}
          </span>
        </div>
        
        <div className="cu-mobile-grade-container">
          {grade && (
            <span className={`cu-mobile-grade-badge ${gradeClass}`}>
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
    const gradeClass = grade === 'B+' ? 'b-plus' : grade === 'B' ? 'b' : 'other';

    return (
      <div key={`${course.id}-${courseIndex}`} className={`cu-desktop-course-item ${isCompleted ? 'completed' : ''}`}>
        <div className="cu-desktop-course-info">
          <div className="cu-desktop-header-row">
            <i className={`fa-solid fa-folder-minus cu-desktop-folder-icon ${isCompleted ? 'completed' : ''}`}></i>
            <span className="cu-desktop-course-code">{course.code}</span>
            <h4 className="cu-desktop-course-title">{course.name}</h4>
          </div>
          <div className="cu-desktop-details-container">
            <span className="cu-desktop-detail-badge cu-desktop-credits-badge">
              {course.credits} Credits
            </span>
            <span className="cu-desktop-detail-badge cu-desktop-program-badge">
              {course.program_code}
            </span>
            <span className="cu-desktop-detail-badge cu-desktop-dept-badge">
              {course.department}
            </span>
            {course.isCore && <span className="cu-desktop-detail-badge cu-desktop-core-badge">Core</span>}
            {grade && (
              <span className={`cu-desktop-detail-badge cu-desktop-grade-badge ${gradeClass}`}>
                Grade: {grade} {marks && `(${marks}%)`}
              </span>
            )}
          </div>
        </div>
        <div className={`cu-desktop-status-display ${isCompleted ? 'completed' : ''}`}>
          {isCompleted ? (
            <>
              <i className="fas fa-check"></i>
              <span>Completed</span>
            </>
          ) : (
            <>
              <i className="fas fa-clock"></i>
              <span>In Progress</span>
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="course-units-page">
        <div className="cu-dashboard-header">
          <h2 className="cu-header-title">Course Units</h2>
          <div className="cu-loading-text">
            Loading courses...
          </div>
        </div>
        <div className="cu-loading-spinner">
          <div className="cu-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="course-units-page">
        <div className="cu-dashboard-header">
          <h2 className="cu-header-title">Course Units</h2>
          <div className="cu-loading-text">
            Error
          </div>
        </div>
        <div className="cu-error-container">
          <p className="cu-error-message">{error}</p>
          <button 
            onClick={fetchStudentData}
            className="cu-retry-button"
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
    <div className="course-units-page">
      <div className="cu-dashboard-header">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 'clamp(6px, 1.5vw, 10px)',
          width: '100%'
        }}>
          <h2 className="cu-header-title">
            Course Units
          </h2>
          {studentInfo && (
            <div className="cu-header-info-row">
              <div className="cu-info-card cu-info-year">
               Year {studentInfo.year_of_study} (Current), Semester {studentInfo.semester} 
                ({studentInfo.academic_year || 'N/A'})
              </div>
              <div className="cu-info-card cu-info-program">
                <strong>Program:</strong> {studentInfo.program}
              </div>
              <div className="cu-info-card cu-info-code">
                <strong>Code:</strong> {studentInfo.program_code}
              </div>
            </div>
          )}
        </div>
      </div>

      {Object.keys(courseData).length === 0 ? (
        <div className="cu-no-courses-container">
          <i className="fas fa-book-open cu-no-courses-icon"></i>
          <p className="cu-no-courses-title">
            No course data available for your program
          </p>
          {studentInfo && (
            <div className="cu-no-courses-info">
              <p>
                <strong>Student Info:</strong> {studentInfo.program} ({studentInfo.program_code})
              </p>
              <p>
                <strong>Year:</strong> {studentInfo.year_of_study}, <strong>Semester:</strong> {studentInfo.semester}
              </p>
              <p>
                The system couldn't find courses for your program code: <strong>{studentInfo.program_code}</strong>
                in Year {studentInfo.year_of_study}, Semester {studentInfo.semester}.
                Please contact your department if this seems incorrect.
              </p>
            </div>
          )}
          <button 
            onClick={fetchStudentData}
            className="cu-try-again-button"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Tabs - Responsive */}
          <div className="cu-tabs-container">
            {Object.keys(courseData).map(key => (
              <div 
                key={key}
                className={`cu-tab ${activeTab === key ? 'cu-tab-active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                {courseData[key].title}
              </div>
            ))}
          </div>

          <div className="tab-content active">
            {courseData[activeTab]?.semesters?.length === 0 ? (
              <div className="cu-no-courses-container">
                <p className="cu-no-courses-title">
                  No courses found for {courseData[activeTab].title}
                </p>
              </div>
            ) : (
              courseData[activeTab]?.semesters?.map((semester, semIndex) => (
                <div key={semIndex} className="cu-semester-section">
                  <h3 className="cu-semester-header">
                    <span>{semester.semester}</span>
                    {courseData[activeTab].isCurrent && semester.semesterNumber === studentInfo.semester && (
                      <span className="cu-current-badge">
                        CURRENT SEMESTER
                      </span>
                    )}
                    {courseData[activeTab].isCurrent && semester.semesterNumber !== studentInfo.semester && (
                      <span className="cu-next-badge">
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
    </div>
  );
};

export default CourseUnits;