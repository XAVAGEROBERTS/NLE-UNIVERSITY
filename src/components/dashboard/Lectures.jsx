import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';

const Lectures = () => {
  const [liveLectures, setLiveLectures] = useState([]);
  const [upcomingLectures, setUpcomingLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useStudentAuth();

  useEffect(() => {
    if (user?.email) {
      fetchLectures();
    }
  }, [user]);

  const fetchLectures = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching lectures for user:', user.email);

      // Get student data
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, academic_year, semester')
        .eq('email', user.email)
        .single();

      if (studentError) {
        console.error('Student error:', studentError);
        throw new Error(`Student data error: ${studentError.message}`);
      }

      if (!student) {
        throw new Error('Student not found');
      }

      console.log('Student found:', student.id);

      // Fetch student's enrolled courses
      const { data: studentCourses, error: coursesError } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', student.id)
        .in('status', ['enrolled', 'in_progress']);

      if (coursesError) {
        console.error('Student courses error:', coursesError);
        throw new Error(`Courses error: ${coursesError.message}`);
      }

      console.log('Student enrolled in', studentCourses?.length || 0, 'courses');

      // If no courses, return empty arrays
      if (!studentCourses || studentCourses.length === 0) {
        console.log('No enrolled courses found');
        setLiveLectures([]);
        setUpcomingLectures([]);
        setLoading(false);
        return;
      }

      const courseIds = studentCourses.map(sc => sc.course_id);
      console.log('Course IDs:', courseIds);

      // Fetch lectures for these courses
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekFormatted = nextWeek.toISOString().split('T')[0];

      console.log('Date range:', today, 'to', nextWeekFormatted);

      const { data: lecturesData, error: lecturesError } = await supabase
        .from('lectures')
        .select(`
          *,
          courses (course_code, course_name),
          lecturers (full_name, google_meet_link)
        `)
        .in('course_id', courseIds)
        .gte('scheduled_date', today)
        .lte('scheduled_date', nextWeekFormatted)
        .in('status', ['scheduled', 'ongoing'])
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (lecturesError) {
        console.error('Lectures fetch error:', lecturesError);
        throw new Error(`Lectures error: ${lecturesError.message}`);
      }

      console.log('Lectures fetched:', lecturesData?.length || 0);

      // Separate live (ongoing) and upcoming lectures
      const now = new Date();
      const live = [];
      const upcoming = [];

      if (lecturesData && lecturesData.length > 0) {
        lecturesData.forEach(lecture => {
          const lectureDate = new Date(lecture.scheduled_date);
          const startTime = new Date(`${lecture.scheduled_date}T${lecture.start_time}`);
          const endTime = new Date(`${lecture.scheduled_date}T${lecture.end_time}`);
          
          const formattedLecture = {
            id: lecture.id,
            title: lecture.title || lecture.courses?.course_name || 'Untitled Lecture',
            lecturer: lecture.lecturers?.full_name || 'Unknown Lecturer',
            time: `${formatTime(lecture.start_time)} - ${formatTime(lecture.end_time)}`,
            date: lectureDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            shortDate: lectureDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            }),
            status: lecture.status,
            meetLink: lecture.google_meet_link || lecture.lecturers?.google_meet_link,
            courseCode: lecture.courses?.course_code || 'N/A',
            courseName: lecture.courses?.course_name || 'N/A',
            description: lecture.description || 'No description available',
            startTime: lecture.start_time,
            endTime: lecture.end_time,
            rawDate: lecture.scheduled_date,
            startDateTime: startTime,
            endDateTime: endTime,
            isLiveNow: lecture.status === 'ongoing' || (now >= startTime && now <= endTime)
          };

          // Check if lecture is currently live
          if (formattedLecture.isLiveNow) {
            formattedLecture.status = 'live';
            live.push(formattedLecture);
          } else {
            formattedLecture.status = 'upcoming';
            upcoming.push(formattedLecture);
          }
        });
      }

      console.log('Live lectures:', live.length);
      console.log('Upcoming lectures:', upcoming.length);

      setLiveLectures(live);
      setUpcomingLectures(upcoming);
    } catch (error) {
      console.error('Error fetching lectures:', error);
      setError(`Failed to load lectures: ${error.message}`);
      setLiveLectures([]);
      setUpcomingLectures([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

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
      window.open(lecture.meetLink, '_blank', 'noopener,noreferrer');
    } else if (lecture.status === 'upcoming') {
      const details = `
        ${lecture.title}
        Course: ${lecture.courseCode} - ${lecture.courseName}
        Lecturer: ${lecture.lecturer}
        Date: ${lecture.date}
        Time: ${lecture.time}
        ${lecture.description ? `Description: ${lecture.description}` : ''}
        ${lecture.meetLink ? `Meeting Link: ${lecture.meetLink}` : ''}
      `;
      alert(details.trim());
    } else {
      alert('This lecture session has ended or no meeting link is available.');
    }
  };

  const addToCalendar = (lecture) => {
    try {
      // Format dates for calendar
      const startDate = new Date(`${lecture.rawDate}T${lecture.startTime}`);
      const endDate = new Date(`${lecture.rawDate}T${lecture.endTime}`);
      
      // Create iCal content
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `SUMMARY:${lecture.title}`,
        `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DESCRIPTION:${lecture.description}\\nCourse: ${lecture.courseCode}\\nLecturer: ${lecture.lecturer}`,
        `LOCATION:${lecture.meetLink || 'Online Lecture'}`,
        `UID:${lecture.id}@university.edu`,
        'SEQUENCE:0',
        'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\n');
      
      // Create and download .ics file
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Lecture_${lecture.courseCode}_${lecture.rawDate}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert(`"${lecture.title}" added to calendar!`);
    } catch (err) {
      console.error('Error creating calendar event:', err);
      alert('Failed to add to calendar. Please try again.');
    }
  };

  const refreshLectures = () => {
    fetchLectures();
  };

  if (loading) {
    return (
      <div className="content">
        <div className="dashboard-header">
          <h2>Live Lectures</h2>
          <div className="date-display">Loading lectures...</div>
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
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content">
        <div className="dashboard-header">
          <h2>Live Lectures</h2>
          <div className="date-display">Error</div>
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
            onClick={refreshLectures}
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
            <i className="fas fa-sync-alt" style={{ marginRight: '8px' }}></i>
            Refresh Lectures
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="dashboard-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0' }}>Live Lectures</h2>
          <div className="date-display" style={{ color: '#666', fontSize: '14px' }}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
        <button 
          onClick={refreshLectures}
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
      </div>

      {/* Live Lectures Section */}
      <div className="live-lectures-section" style={{ marginBottom: '40px' }}>
        <h3 style={{ 
          margin: '0 0 20px 0',
          color: '#333',
          borderBottom: '2px solid #007bff',
          paddingBottom: '10px'
        }}>
          <i className="fas fa-video" style={{ marginRight: '10px', color: '#007bff' }}></i>
          Live & Ongoing Lectures
        </h3>
        
        {liveLectures.length > 0 ? (
          <div className="lectures-slider-container" style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <button 
              className="slider-nav prev" 
              onClick={() => scrollLectures(-1)}
              style={{
                position: 'absolute',
                left: '-25px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                zIndex: '2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            
            <div className="lectures-slider" style={{
              display: 'flex',
              overflowX: 'auto',
              gap: '20px',
              padding: '10px',
              scrollBehavior: 'smooth',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}>
              {liveLectures.map(lecture => (
                <div 
                  key={lecture.id} 
                  className="lecture-card"
                  style={{
                    minWidth: '300px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    padding: '20px',
                    borderTop: '4px solid #dc3545'
                  }}
                >
                  <div className="lecture-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '15px'
                  }}>
                    <h4 style={{ 
                      margin: '0',
                      fontSize: '16px',
                      color: '#333',
                      lineHeight: '1.4'
                    }}>
                      {lecture.title}
                    </h4>
                    <span className={`lecture-status live`} style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}>
                      <i className="fas fa-circle" style={{ 
                        fontSize: '8px',
                        marginRight: '6px',
                        animation: 'pulse 1.5s infinite'
                      }}></i>
                      LIVE NOW
                    </span>
                  </div>
                  
                  <div className="lecture-meta" style={{ marginBottom: '15px' }}>
                    {[
                      { icon: 'fa-chalkboard-teacher', text: lecture.lecturer },
                      { icon: 'fa-clock', text: lecture.time },
                      { icon: 'fa-calendar-day', text: lecture.date },
                      { icon: 'fa-book', text: lecture.courseCode }
                    ].map((item, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '8px',
                        fontSize: '14px',
                        color: '#555'
                      }}>
                        <i className={`fas ${item.icon}`} style={{ 
                          width: '16px',
                          marginRight: '10px',
                          color: '#007bff'
                        }}></i>
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="lecture-actions" style={{
                    display: 'flex',
                    gap: '10px',
                    marginTop: '20px'
                  }}>
                    <button 
                      className="join-button"
                      onClick={() => handleJoinLecture(lecture)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        backgroundColor: lecture.meetLink ? '#28a745' : '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}
                    >
                      <i className="fas fa-video"></i>
                      {lecture.meetLink ? 'Join Lecture' : 'No Link Available'}
                    </button>
                    
                    <button 
                      className="calendar-button"
                      onClick={() => addToCalendar(lecture)}
                      style={{
                        padding: '10px 15px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '14px'
                      }}
                    >
                      <i className="fas fa-calendar-plus"></i>
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              className="slider-nav next" 
              onClick={() => scrollLectures(1)}
              style={{
                position: 'absolute',
                right: '-25px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                zIndex: '2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        ) : (
          <div className="no-lectures" style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '2px dashed #dee2e6'
          }}>
            <i className="fas fa-video-slash" style={{
              fontSize: '48px',
              color: '#6c757d',
              marginBottom: '20px'
            }}></i>
            <p style={{ 
              color: '#6c757d', 
              fontSize: '16px',
              margin: '0 0 10px 0'
            }}>
              No live lectures at the moment.
            </p>
            <p style={{ 
              color: '#999', 
              fontSize: '14px',
              margin: 0
            }}>
              Check back later or view upcoming lectures below.
            </p>
          </div>
        )}
      </div>

      {/* Upcoming Lectures Section */}
      <div className="upcoming-lectures" style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '25px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0',
          color: '#333',
          borderBottom: '2px solid #28a745',
          paddingBottom: '10px'
        }}>
          <i className="fas fa-calendar-alt" style={{ marginRight: '10px', color: '#28a745' }}></i>
          Upcoming Lectures This Week
        </h3>
        
        {upcomingLectures.length === 0 ? (
          <div style={{ 
            padding: '30px', 
            textAlign: 'center',
            color: '#6c757d'
          }}>
            <i className="fas fa-calendar-times" style={{
              fontSize: '36px',
              marginBottom: '15px',
              color: '#dee2e6'
            }}></i>
            <p style={{ margin: '0 0 10px 0' }}>No upcoming lectures scheduled this week.</p>
            <p style={{ fontSize: '14px', color: '#999' }}>
              New lectures will appear here when scheduled.
            </p>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
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
                    borderBottom: '2px solid #dee2e6'
                  }}>Date</th>
                  <th style={{ 
                    padding: '12px 15px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057'
                  }}>Time</th>
                  <th style={{ 
                    padding: '12px 15px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057'
                  }}>Course</th>
                  <th style={{ 
                    padding: '12px 15px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057'
                  }}>Lecturer</th>
                  <th style={{ 
                    padding: '12px 15px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#495057'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingLectures.map(lecture => (
                  <tr key={lecture.id} style={{
                    borderBottom: '1px solid #dee2e6',
                    transition: 'background-color 0.2s'
                  }}>
                    <td style={{ 
                      padding: '12px 15px',
                      whiteSpace: 'nowrap'
                    }}>
                      <div style={{ fontWeight: '500' }}>{lecture.shortDate}</div>
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ fontWeight: '500' }}>{formatTime(lecture.startTime)}</div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>{formatTime(lecture.endTime)}</div>
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ fontWeight: '500' }}>{lecture.title}</div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>{lecture.courseCode}</div>
                    </td>
                    <td style={{ padding: '12px 15px' }}>{lecture.lecturer}</td>
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="details-button"
                          onClick={() => handleJoinLecture(lecture)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <i className="fas fa-info-circle"></i>
                          Details
                        </button>
                        <button 
                          className="calendar-button-small"
                          onClick={() => addToCalendar(lecture)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <i className="fas fa-calendar-plus"></i>
                          Calendar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add CSS for scrollbar and animations */}
      <style>{`
        .lectures-slider::-webkit-scrollbar {
          display: none;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        .lecture-card:hover {
          transform: translateY(-4px);
          transition: transform 0.3s ease;
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        .slider-nav:hover {
          background-color: #0056b3 !important;
          transform: scale(1.1);
          transition: all 0.2s ease;
        }
        
        button:hover {
          opacity: 0.9;
          transition: opacity 0.2s;
        }
        
        tr:hover {
          background-color: #f8f9fa !important;
        }
      `}</style>
    </div>
  );
};

export default Lectures;