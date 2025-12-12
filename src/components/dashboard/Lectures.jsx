import React from 'react';

const Lectures = () => {
  const lectures = [
    {
      id: 1,
      title: "Cloud Computing",
      lecturer: "Prof. Johnson",
      time: "2:00 PM - 4:00 PM",
      date: "June 20, 2025",
      status: "live",
      meetLink: "https://meet.google.com/fhi-nrsf-cxm"
    },
    {
      id: 2,
      title: "Big Data Analytics",
      lecturer: "Dr. Williams",
      time: "8:00 AM - 10:00 AM",
      date: "June 20, 2025",
      status: "live",
      meetLink: ""
    },
    {
      id: 3,
      title: "Internet of Things",
      lecturer: "Prof. Brown",
      time: "9:00 AM - 10:00 AM",
      date: "June 21, 2025",
      status: "upcoming"
    },
    {
      id: 4,
      title: "Project Management",
      lecturer: "Dr. Davis",
      time: "11:00 AM - 12:30 PM",
      date: "June 22, 2025",
      status: "upcoming"
    },
    {
      id: 5,
      title: "Machine Learning Lab",
      lecturer: "Dr. Smith",
      time: "3:00 PM - 5:00 PM",
      date: "June 23, 2025",
      status: "upcoming"
    }
  ];

  const scrollLectures = (direction) => {
    const slider = document.querySelector('.lectures-slider');
    if (slider) {
      const scrollAmount = 320;
      slider.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleJoinLecture = (lecture) => {
    if (lecture.status === 'live' && lecture.meetLink) {
      window.open(lecture.meetLink, '_blank');
    } else if (lecture.status === 'ended' || !lecture.meetLink) {
      alert('This lecture session has ended or no meeting link is available.');
    } else {
      alert(`Lecture details:\n\n${lecture.title}\n${lecture.lecturer}\n${lecture.date}\n${lecture.time}`);
    }
  };

  const addToCalendar = (lecture) => {
    // Create calendar event
    const event = {
      title: lecture.title,
      start: new Date(lecture.date + ' ' + lecture.time.split(' - ')[0]),
      end: new Date(lecture.date + ' ' + lecture.time.split(' - ')[1]),
      description: `Lecture by ${lecture.lecturer}`,
      location: 'Online'
    };
    
    // Create iCal content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${event.title}`,
      `DTSTART:${event.start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${event.end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DESCRIPTION:${event.description}`,
      `LOCATION:${event.location}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');
    
    // Create and download .ics file
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${lecture.title.replace(/\s+/g, '_')}.ics`;
    link.click();
    
    alert(`${lecture.title} added to calendar!`);
  };

  return (
    <div className="content">
      <div className="dashboard-header">
        <h2>Live Lectures</h2>
        <div className="date-display">Today's Schedule</div>
      </div>

      <div className="lectures-slider-container">
        <button className="slider-nav prev" onClick={() => scrollLectures(-1)}>
          <i className="fas fa-chevron-left"></i>
        </button>
        
        <div className="lectures-slider">
          {lectures.slice(0, 3).map(lecture => (
            <div key={lecture.id} className="lecture-card">
              <div className="lecture-header">
                <h3>{lecture.title}</h3>
                <span className={`lecture-status ${lecture.status}`}>
                  {lecture.status === 'live' ? 'Live' : 'Upcoming'}
                </span>
              </div>
              <div className="lecture-meta">
                <p><i className="fas fa-chalkboard-teacher"></i> {lecture.lecturer}</p>
                <p><i className="fas fa-clock"></i> {lecture.time}</p>
                <p><i className="fas fa-calendar-day"></i> {lecture.date}</p>
              </div>
              <div className="lecture-actions">
                <button 
                  className={`join-button ${!lecture.meetLink ? 'ended-button' : ''}`}
                  onClick={() => handleJoinLecture(lecture)}
                  data-meet-link={lecture.meetLink}
                >
                  <i className="fas fa-video"></i> 
                  {lecture.status === 'live' ? 'Attend' : 'View Details'}
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <button className="slider-nav next" onClick={() => scrollLectures(1)}>
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      <div className="upcoming-lectures">
        <h3>Upcoming Lectures This Week</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Course</th>
              <th>Lecturer</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {lectures.slice(2).map(lecture => (
              <tr key={lecture.id}>
                <td>{lecture.date.split(' ')[0]} {lecture.date.split(' ')[1].replace(',', '')}</td>
                <td>{lecture.time.split(' - ')[0]}</td>
                <td>{lecture.title}</td>
                <td>{lecture.lecturer}</td>
                <td>
                  <button 
                    className="add-calendar"
                    onClick={() => addToCalendar(lecture)}
                  >
                    Add to Calendar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Lectures;