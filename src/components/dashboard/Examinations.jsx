import React from 'react';

const Examinations = () => {
  const exams = [
    {
      id: 1,
      title: "Database Systems - Midterm",
      date: "June 20, 2025",
      time: "2:00 PM - 4:00 PM",
      venue: "CS Building - Room 301",
      status: "submitted"
    },
    {
      id: 2,
      title: "Data Structures - Final",
      date: "June 25, 2025",
      time: "9:00 AM - 12:00 PM",
      venue: "Main Hall - Block A",
      status: "available"
    },
    {
      id: 3,
      title: "Computer Architecture - Final",
      date: "June 27, 2025",
      time: "10:00 AM - 1:00 PM",
      venue: "Engineering Hall - Room 205",
      status: "submitted"
    },
    {
      id: 4,
      title: "Operating Systems - Midterm",
      date: "June 30, 2025",
      time: "3:00 PM - 5:00 PM",
      venue: "CS Building - Room 302",
      status: "submitted"
    },
    {
      id: 5,
      title: "Software Engineering - Final",
      date: "July 2, 2025",
      time: "2:00 PM - 5:00 PM",
      venue: "Main Hall - Block B",
      status: "submitted"
    },
    {
      id: 6,
      title: "Web Technologies - Practical",
      date: "July 4, 2025",
      time: "9:00 AM - 12:00 PM",
      venue: "Lab Complex - Lab 3",
      status: "available"
    }
  ];

  const handleBeginExam = (exam) => {
    if (exam.status === 'available') {
      if (window.confirm(`Are you ready to begin ${exam.title}?`)) {
        alert(`Starting ${exam.title} exam...`);
        // In a real app, this would navigate to the exam page
      }
    }
  };

  return (
    <div className="content">
      <div className="dashboard-header">
        <h2>Examinations</h2>
      </div>

      <div className="exam-cards-container">
        {exams.map(exam => (
          <div key={exam.id} className="exam-card">
            <div className="exam-content">
              <h3>{exam.title}</h3>
              <div className="exam-meta">
                <span><i className="far fa-calendar-alt"></i> {exam.date}</span>
                <span><i className="far fa-clock"></i> {exam.time}</span>
                <span><i className="fas fa-map-marker-alt"></i> {exam.venue}</span>
              </div>
            </div>
            <div className="exam-footer">
              <button 
                className={`exam-btn ${exam.status}`}
                onClick={() => handleBeginExam(exam)}
                disabled={exam.status === 'submitted'}
              >
                {exam.status === 'submitted' ? (
                  <>
                    <i className="fas fa-check-circle"></i> Submitted
                  </>
                ) : (
                  <>
                    <i className="fas fa-play-circle"></i> Begin Exam
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Examinations;