import React from 'react';

const CourseUnits = () => {
  const [activeTab, setActiveTab] = React.useState('current');
  
  // Initialize state from localStorage directly
  const [completedCourses, setCompletedCourses] = React.useState(() => {
    const saved = localStorage.getItem('completedCourses');
    return saved ? JSON.parse(saved) : {};
  });

  // Course data organized by year
  const courseData = {
    current: {
      title: "Year 4",
      semesters: [
        {
          semester: "Semester 1",
          courses: [
            { code: "CS-401", name: "MACHINE LEARNING" },
            { code: "CS-402", name: "CLOUD COMPUTING" },
            { code: "CS-403", name: "BIG DATA ANALYTICS" },
            { code: "CS-404", name: "INTERNET OF THINGS" },
            { code: "CS-405", name: "PROJECT MANAGEMENT" },
            { code: "CS-406L", name: "MACHINE LEARNING LAB" }
          ]
        },
        {
          semester: "Semester 2",
          courses: [
            { code: "CS-407", name: "DEEP LEARNING" },
            { code: "CS-408", name: "CYBER SECURITY" },
            { code: "CS-409", name: "BLOCKCHAIN TECHNOLOGY" },
            { code: "CS-410P", name: "FINAL YEAR PROJECT" },
            { code: "CS-411", name: "INDUSTRIAL TRAINING" }
          ]
        }
      ]
    },
    previous3: {
      title: "Year 3",
      semesters: [
        {
          semester: "Semester 1",
          courses: [
            { code: "CS-301", name: "ADVANCED DATABASE SYSTEMS" },
            { code: "CS-302", name: "SOFTWARE ENGINEERING" },
            { code: "CS-303", name: "WEB TECHNOLOGIES" },
            { code: "CS-304", name: "MOBILE APPLICATION DEVELOPMENT" },
            { code: "CS-305", name: "OPERATING SYSTEM CONCEPTS" },
            { code: "CS-306L", name: "WEB DEVELOPMENT LAB" }
          ]
        },
        {
          semester: "Semester 2",
          courses: [
            { code: "CS-307", name: "DATA MINING" },
            { code: "CS-308", name: "COMPUTER GRAPHICS" },
            { code: "CS-309", name: "SOFTWARE TESTING" },
            { code: "CS-310", name: "DISTRIBUTED SYSTEMS" },
            { code: "CS-311", name: "HUMAN COMPUTER INTERACTION" },
            { code: "CS-312P", name: "SOFTWARE DEVELOPMENT PROJECT" }
          ]
        }
      ]
    },
    previous2: {
      title: "Year 2",
      semesters: [
        {
          semester: "Semester 1",
          courses: [
            { code: "MATH-201", name: "ENGINEERING MATHEMATICS-III" },
            { code: "CS-201", name: "COMPUTER ARCHITECTURE" },
            { code: "CS-202", name: "DATABASE MANAGEMENT SYSTEMS" },
            { code: "CS-203", name: "OBJECT ORIENTED PROGRAMMING USING JAVA" },
            { code: "CS-204", name: "MICROPROCESSOR & PC HARDWARE" },
            { code: "CS-205L", name: "JAVA PROGRAMMING LAB" },
            { code: "CS-206L", name: "DATABASE DEVELOPMENT LAB" }
          ]
        },
        {
          semester: "Semester 2",
          courses: [
            { code: "MATH-202", name: "ENGINEERING MATHEMATICS-IV" },
            { code: "CS-207", name: "ARTIFICIAL INTELLIGENCE" },
            { code: "CS-208", name: "PYTHON PROGRAMMING" },
            { code: "CS-209", name: "COMPUTER NETWORKS" },
            { code: "CS-210", name: "SOFTWARE ENGINEERING PRACTICE" },
            { code: "CS-211L", name: "PYTHON APPLICATION LAB" },
            { code: "CS-212L", name: "NETWORKING LAB" }
          ]
        }
      ]
    },
    previous1: {
      title: "Year 1",
      semesters: [
        {
          semester: "Semester 1",
          courses: [
            { code: "MATH-101", name: "ENGINEERING MATHEMATICS-I" },
            { code: "EE-101", name: "FUNDAMENTALS OF ELECTRICAL ENGINEERING" },
            { code: "PHY-101", name: "ENGINEERING PHYSICS" },
            { code: "CS-101", name: "PROBLEM SOLVING USING C" },
            { code: "GEN-101", name: "ENGINEERING PROFESSIONAL SKILLS" },
            { code: "CS-102L", name: "C PROGRAMMING LAB" }
          ]
        },
        {
          semester: "Semester 2",
          courses: [
            { code: "MATH-102", name: "ENGINEERING MATHEMATICS-II" },
            { code: "CS-103", name: "OPERATING SYSTEMS" },
            { code: "CHEM-101", name: "ENGINEERING CHEMISTRY" },
            { code: "CS-104", name: "DIGITAL SYSTEMS" },
            { code: "CS-105", name: "DATA STRUCTURES AND ALGORITHMS" },
            { code: "CS-106L", name: "DATA STRUCTURES LAB" }
          ]
        }
      ]
    }
  };

  const toggleCourse = (courseId) => {
    setCompletedCourses(prev => {
      const newState = {
        ...prev,
        [courseId]: !prev[courseId]
      };
      localStorage.setItem('completedCourses', JSON.stringify(newState));
      return newState;
    });
  };

  return (
    <div className="content">
      <div className="dashboard-header">
        <h2>Course Units</h2>
        <div className="date-display" id="semesterDisplay">
          Year 4, Semester 2 (August - November) | 2024/2025
        </div>
      </div>

      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'current' ? 'active' : ''}`}
          onClick={() => setActiveTab('current')}
          data-course-tab="current"
        >
          Year 4
        </div>
        <div 
          className={`tab ${activeTab === 'previous3' ? 'active' : ''}`}
          onClick={() => setActiveTab('previous3')}
          data-course-tab="previous3"
        >
          Year 3
        </div>
        <div 
          className={`tab ${activeTab === 'previous2' ? 'active' : ''}`}
          onClick={() => setActiveTab('previous2')}
          data-course-tab="previous2"
        >
          Year 2
        </div>
        <div 
          className={`tab ${activeTab === 'previous1' ? 'active' : ''}`}
          onClick={() => setActiveTab('previous1')}
          data-course-tab="previous1"
        >
          Year 1
        </div>
      </div>

      <div className="tab-content active" id={`${activeTab}-courses`}>
        {courseData[activeTab].semesters.map((semester, semIndex) => (
          <div key={semIndex}>
            <h3 style={{ marginBottom: '1rem', marginTop: semIndex > 0 ? '2rem' : '0' }}>
              {courseData[activeTab].title}, {semester.semester}
            </h3>
            {semester.courses.map((course, courseIndex) => {
              const courseId = `${course.code}-${course.name}`;
              const isCompleted = completedCourses[courseId];
              
              return (
                <div key={courseIndex} className="course-item">
                  <div className="course-info">
                    <i className="fa-solid fa-folder-minus course-folder-icon"></i>
                    <span className="course-code">{course.code}</span>
                    <h4>{course.name}</h4>
                  </div>
                  <button 
                    className={`course-toggle ${isCompleted ? 'completed' : ''}`}
                    data-course={course.name}
                    onClick={() => toggleCourse(courseId)}
                  >
                    {isCompleted ? (
                      <i className="fas fa-check"></i>
                    ) : (
                      <i className="fas fa-lock"></i>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourseUnits;