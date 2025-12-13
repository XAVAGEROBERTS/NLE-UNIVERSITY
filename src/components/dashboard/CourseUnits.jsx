import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';

const CourseUnits = () => {
  const [activeTab, setActiveTab] = useState('current');
  const [completedCourses, setCompletedCourses] = useState({});
  const [courseData, setCourseData] = useState({
    current: { title: "Year 4", semesters: [] },
    previous3: { title: "Year 3", semesters: [] },
    previous2: { title: "Year 2", semesters: [] },
    previous1: { title: "Year 1", semesters: [] }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useStudentAuth();

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

      // Get student with year of study
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, year_of_study, semester, academic_year')
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

      // Fetch all courses for Computer Engineering
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('program', 'Computer Engineering') // Changed from 'Bachelor of Science in Computer Engineering'
        .order('year', { ascending: false })
        .order('semester', { ascending: true });

      if (coursesError) {
        console.error('Courses error:', coursesError);
        throw new Error(`Courses error: ${coursesError.message}`);
      }

      console.log('Courses fetched:', courses?.length || 0);

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
      const currentYear = student.year_of_study || 4;
      console.log('Current year of study:', currentYear);

      // Organize courses by year
      const organizedData = {
        current: { 
          title: `Year ${currentYear}`, 
          semesters: [],
          academicYear: student.academic_year 
        },
        previous3: { 
          title: `Year ${Math.max(1, currentYear - 1)}`, // Ensure year doesn't go below 1
          semesters: [] 
        },
        previous2: { 
          title: `Year ${Math.max(1, currentYear - 2)}`, 
          semesters: [] 
        },
        previous1: { 
          title: `Year ${Math.max(1, currentYear - 3)}`, 
          semesters: [] 
        }
      };

      // Group courses by year and semester
      if (courses && courses.length > 0) {
        courses.forEach(course => {
          const yearKey = getYearKey(course.year, currentYear);
          if (organizedData[yearKey]) {
            let semesterGroup = organizedData[yearKey].semesters.find(s => 
              s.semesterNumber === course.semester
            );
            
            if (!semesterGroup) {
              semesterGroup = {
                semesterNumber: course.semester,
                semester: `Semester ${course.semester}`,
                courses: []
              };
              organizedData[yearKey].semesters.push(semesterGroup);
            }
            
            const courseInfo = {
              id: course.id,
              code: course.course_code,
              name: course.course_name,
              credits: course.credits,
              isCore: course.is_core,
              year: course.year
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
        });
      }

      // Sort semesters by semester number
      Object.keys(organizedData).forEach(key => {
        organizedData[key].semesters.sort((a, b) => a.semesterNumber - b.semesterNumber);
        // Sort courses within each semester
        organizedData[key].semesters.forEach(semester => {
          semester.courses.sort((a, b) => a.code.localeCompare(b.code));
        });
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

  const getYearKey = (courseYear, currentYear) => {
    if (courseYear === currentYear) return 'current';
    if (courseYear === currentYear - 1) return 'previous3';
    if (courseYear === currentYear - 2) return 'previous2';
    return 'previous1'; // All older years
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

  if (loading) {
    return (
      <div className="content">
        <div className="dashboard-header">
          <h2>Course Units</h2>
          <div className="date-display">Loading courses...</div>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content">
        <div className="dashboard-header">
          <h2>Course Units</h2>
          <div className="date-display">Error</div>
        </div>
        <div className="error-message">
          <p>{error}</p>
          <button 
            onClick={fetchStudentData}
            className="retry-button"
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="dashboard-header">
        <h2>Course Units</h2>
        <div className="date-display" id="semesterDisplay">
          {courseData.current.title}, Semester {courseData.current.semesters[0]?.semesterNumber || '2'} 
          ({courseData.current.academicYear || '2024/2025'})
        </div>
      </div>

      <div className="tabs">
        {Object.keys(courseData).map(key => (
          <div 
            key={key}
            className={`tab ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {courseData[key].title}
          </div>
        ))}
      </div>

      <div className="tab-content active">
        {courseData[activeTab]?.semesters?.length === 0 ? (
          <div className="no-courses">
            <p>No courses found for {courseData[activeTab].title}</p>
            <p>Current year of study: {courseData.current.title.replace('Year ', '')}</p>
            <button 
              onClick={fetchStudentData}
              className="refresh-button"
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Refresh Data
            </button>
          </div>
        ) : (
          courseData[activeTab]?.semesters?.map((semester, semIndex) => (
            <div key={semIndex}>
              <h3 style={{ 
                marginBottom: '1rem', 
                marginTop: semIndex > 0 ? '2rem' : '0',
                color: '#333',
                borderBottom: '2px solid #eee',
                paddingBottom: '0.5rem'
              }}>
                {courseData[activeTab].title}, {semester.semester}
              </h3>
              <div className="courses-list">
                {semester.courses.map((course, courseIndex) => {
                  const isCompleted = completedCourses[course.id]?.completed || false;
                  const grade = completedCourses[course.id]?.grade;
                  const marks = completedCourses[course.id]?.marks;
                  
                  return (
                    <div key={courseIndex} className="course-item" style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      marginBottom: '1rem',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      borderLeft: `4px solid ${isCompleted ? '#28a745' : '#007bff'}`
                    }}>
                      <div className="course-info" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <i className="fa-solid fa-folder-minus course-folder-icon" style={{ 
                            color: isCompleted ? '#28a745' : '#6c757d',
                            marginRight: '10px',
                            fontSize: '1.2rem'
                          }}></i>
                          <span className="course-code" style={{
                            fontWeight: 'bold',
                            color: '#007bff',
                            marginRight: '10px'
                          }}>{course.code}</span>
                          <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{course.name}</h4>
                        </div>
                        <div className="course-details" style={{ 
                          display: 'flex',
                          gap: '10px',
                          flexWrap: 'wrap',
                          fontSize: '0.9rem',
                          color: '#666'
                        }}>
                          <span className="course-credits" style={{
                            backgroundColor: '#f8f9fa',
                            padding: '2px 8px',
                            borderRadius: '12px'
                          }}>{course.credits} Credits</span>
                          {course.isCore && <span className="course-core" style={{
                            backgroundColor: '#ffc107',
                            color: '#212529',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 'bold'
                          }}>Core</span>}
                          {grade && (
                            <span className={`course-grade grade-${grade}`} style={{
                              backgroundColor: grade === 'A' ? '#28a745' : 
                                             grade === 'B+' ? '#20c997' : 
                                             grade === 'B' ? '#17a2b8' : '#6c757d',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontWeight: 'bold'
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
                          padding: '8px 16px',
                          backgroundColor: isCompleted ? '#28a745' : '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'background-color 0.3s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = isCompleted ? '#dc3545' : '#28a745';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = isCompleted ? '#28a745' : '#6c757d';
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
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CourseUnits;