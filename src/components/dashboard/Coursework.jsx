import React from 'react';

const Coursework = () => {
  const assignments = [
    {
      id: 1,
      courseCode: "01303 FST",
      title: "Cw - Bcp: Assignment 1",
      assignedDate: "11th Nov 2024",
      dueDate: "15th Nov 2024 at 11:59PM EAT",
      status: "not submitted",
      marks: "9/20"
    },
    {
      id: 2,
      courseCode: "01303 FST",
      title: "Cw - Bcp: Assignment 2",
      assignedDate: "18th Nov 2024",
      dueDate: "25th Nov 2024 at 11:59PM EAT",
      status: "submitted",
      marks: "25/30"
    },
    {
      id: 3,
      courseCode: "01S02 FHS",
      title: "Scientific Writing: Research Paper",
      assignedDate: "11th Dec 2024",
      dueDate: "20th Dec 2024 at 11:59PM EAT",
      status: "submitted",
      marks: "38/40"
    },
    {
      id: 4,
      courseCode: "01S01 FST",
      title: "Physics 2: Lab Report 1",
      assignedDate: "24th Jan 2025",
      dueDate: "30th Jan 2025 at 11:59PM EAT",
      status: "submitted",
      marks: ""
    }
  ];

  const getMarksColor = (marks) => {
    if (!marks) return '';
    const [obtained, total] = marks.split('/').map(Number);
    const percentage = (obtained / total) * 100;
    
    if (percentage >= 90) return 'excellent';
    if (percentage >= 75) return 'good';
    if (percentage >= 50) return 'average';
    return 'poor';
  };

  return (
    <div className="content">
      <div className="dashboard-header">
        <h2>Course Work</h2>
        <div className="date-display">Available Course Work</div>
      </div>

      <div className="coursework-grid">
        {assignments.map(assignment => {
          const marksColor = getMarksColor(assignment.marks);
          
          return (
            <div key={assignment.id} className="assignment-card">
              <div className="assignment-info">
                <div className="course-code">{assignment.courseCode}</div>
                <h3 className="assignment-title">{assignment.title}</h3>
                <div className="assignment-dates">
                  <div className="date-item">
                    <i className="fas fa-calendar-check"></i>
                    <span>Assigned: {assignment.assignedDate}</span>
                  </div>
                  <div className="date-item">
                    <i className="fas fa-calendar-times"></i>
                    <span>Due: {assignment.dueDate}</span>
                  </div>
                </div>
                <div className="assignment-status">
                  <i className={`fas fa-${assignment.status === 'submitted' ? 'check-circle' : 'times-circle'}`} 
                     style={{ color: assignment.status === 'submitted' ? '#4CAF50' : '#F44336' }}></i>
                  <span style={{ color: assignment.status === 'submitted' ? '#4CAF50' : '#F44336' }}>
                    {assignment.status === 'submitted' ? 'Already Submitted' : 'Not Submitted'}
                  </span>
                </div>
              </div>
              <div className="assignment-marks">
                <div className={`marks-display ${marksColor}`}>
                  {assignment.marks || <i className="fas fa-book-open"></i>}
                </div>
                {assignment.status === 'submitted' ? (
                  assignment.marks ? (
                    <button className="view-results">
                      <i className="fas fa-download"></i> View Results
                    </button>
                  ) : (
                    <button className="submitted-btn">
                      Submitted
                    </button>
                  )
                ) : (
                  <button className="not-submitted-btn">
                    Not Submitted
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Coursework;