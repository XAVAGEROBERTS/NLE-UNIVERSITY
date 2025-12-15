import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';

const Lectures = () => {
  const [liveLectures, setLiveLectures] = useState([]);
  const [upcomingLectures, setUpcomingLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPrevButton, setShowPrevButton] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useStudentAuth();
  const sliderRef = useRef(null);

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
      fetchLectures();
    }
  }, [user]);

  const checkScrollButtons = useCallback(() => {
    const slider = sliderRef.current;
    if (!slider) return;

    const hasHorizontalScroll = slider.scrollWidth > slider.clientWidth;
    const isAtStart = slider.scrollLeft <= 0;
    const isAtEnd = slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 1;

    setShowPrevButton(hasHorizontalScroll && !isAtStart);
    setShowNextButton(hasHorizontalScroll && !isAtEnd);
  }, []);

  useEffect(() => {
    const slider = sliderRef.current;
    if (slider) {
      checkScrollButtons();
      
      // Add resize listener
      const handleResize = () => {
        checkScrollButtons();
      };
      
      window.addEventListener('resize', handleResize);
      slider.addEventListener('scroll', checkScrollButtons);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        if (slider) {
          slider.removeEventListener('scroll', checkScrollButtons);
        }
      };
    }
  }, [liveLectures, checkScrollButtons]);

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
    if (!timeString) return 'TBD';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const scrollLectures = (direction) => {
    const slider = sliderRef.current;
    if (slider) {
      const scrollAmount = slider.clientWidth * 0.8;
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Render mobile-friendly lecture cards for upcoming lectures
  const renderMobileUpcomingCards = () => {
    return upcomingLectures.map((lecture) => (
      <div 
        key={lecture.id}
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          borderLeft: '4px solid #3498db'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '12px' 
        }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ 
              margin: '0 0 6px 0', 
              fontSize: '16px',
              color: '#333',
              lineHeight: '1.3'
            }}>
              {lecture.title}
            </h4>
            <p style={{ 
              margin: '0',
              fontSize: '14px',
              color: '#666',
              fontWeight: '500'
            }}>
              {lecture.courseCode}
            </p>
          </div>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}>
            {formatDate(lecture.rawDate)}
          </div>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div>
            <p style={{ 
              margin: '0 0 4px 0',
              fontSize: '12px',
              color: '#999',
              textTransform: 'uppercase'
            }}>
              Time
            </p>
            <p style={{ 
              margin: '0',
              fontSize: '14px',
              fontWeight: '500',
              color: '#333'
            }}>
              {formatTime(lecture.startTime)} - {formatTime(lecture.endTime)}
            </p>
          </div>
          <div>
            <p style={{ 
              margin: '0 0 4px 0',
              fontSize: '12px',
              color: '#999',
              textTransform: 'uppercase'
            }}>
              Lecturer
            </p>
            <p style={{ 
              margin: '0',
              fontSize: '14px',
              fontWeight: '500',
              color: '#333'
            }}>
              {lecture.lecturer}
            </p>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          paddingTop: '12px',
          borderTop: '1px solid #eee'
        }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Status: <span style={{ 
              color: lecture.status === 'live' ? '#e74c3c' : '#3498db',
              fontWeight: '500'
            }}>
              {lecture.status === 'live' ? 'Live Now' : 'Scheduled'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => handleJoinLecture(lecture)}
              style={{
                backgroundColor: '#f4f4f4',
                color: '#333',
                border: '1px solid #ddd',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <i className="fas fa-info-circle"></i> Details
            </button>
            <button 
              onClick={() => addToCalendar(lecture)}
              style={{
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <i className="fas fa-calendar-plus"></i> Add
            </button>
          </div>
        </div>
      </div>
    ));
  };

  // Render desktop table for upcoming lectures
  const renderDesktopUpcomingTable = () => (
    <div style={{
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      backgroundColor: 'white'
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        minWidth: '650px'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f8f9fa' }}>
            <th style={{ 
              padding: 'clamp(12px, 2.5vw, 15px)', 
              textAlign: 'left', 
              borderBottom: '2px solid #dee2e6',
              fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
              whiteSpace: 'nowrap'
            }}>Date</th>
            <th style={{ 
              padding: 'clamp(12px, 2.5vw, 15px)', 
              textAlign: 'left', 
              borderBottom: '2px solid #dee2e6',
              fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
              whiteSpace: 'nowrap'
            }}>Time</th>
            <th style={{ 
              padding: 'clamp(12px, 2.5vw, 15px)', 
              textAlign: 'left', 
              borderBottom: '2px solid #dee2e6',
              fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
              whiteSpace: 'nowrap'
            }}>Course</th>
            <th style={{ 
              padding: 'clamp(12px, 2.5vw, 15px)', 
              textAlign: 'left', 
              borderBottom: '2px solid #dee2e6',
              fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
              whiteSpace: 'nowrap'
            }}>Lecturer</th>
            <th style={{ 
              padding: 'clamp(12px, 2.5vw, 15px)', 
              textAlign: 'left', 
              borderBottom: '2px solid #dee2e6',
              fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
              whiteSpace: 'nowrap'
            }}>Status</th>
            <th style={{ 
              padding: 'clamp(12px, 2.5vw, 15px)', 
              textAlign: 'left', 
              borderBottom: '2px solid #dee2e6',
              fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
              whiteSpace: 'nowrap'
            }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {upcomingLectures.map((lecture) => (
            <tr 
              key={lecture.id}
              style={{ 
                borderBottom: '1px solid #e9ecef'
              }}
            >
              <td style={{ 
                padding: 'clamp(12px, 2.5vw, 15px)',
                fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
              }}>
                <div style={{ fontWeight: '500', whiteSpace: 'nowrap' }}>{formatDate(lecture.rawDate)}</div>
              </td>
              <td style={{ 
                padding: 'clamp(12px, 2.5vw, 15px)',
                fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
              }}>
                <div style={{ whiteSpace: 'nowrap' }}>{formatTime(lecture.startTime)}</div>
                <div style={{ 
                  fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', 
                  color: '#666',
                  whiteSpace: 'nowrap'
                }}>
                  to {formatTime(lecture.endTime)}
                </div>
              </td>
              <td style={{ 
                padding: 'clamp(12px, 2.5vw, 15px)',
                fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
              }}>
                <div style={{ 
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '150px'
                }}>
                  {lecture.title}
                </div>
                <div style={{ 
                  fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', 
                  color: '#666' 
                }}>
                  {lecture.courseCode}
                </div>
              </td>
              <td style={{ 
                padding: 'clamp(12px, 2.5vw, 15px)',
                fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
              }}>
                <div style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '120px'
                }}>
                  {lecture.lecturer}
                </div>
              </td>
              <td style={{ 
                padding: 'clamp(12px, 2.5vw, 15px)',
                fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
                whiteSpace: 'nowrap'
              }}>
                <span style={{
                  backgroundColor: lecture.status === 'live' ? '#fee' : '#e8f4fd',
                  color: lecture.status === 'live' ? '#e74c3c' : '#3498db',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)',
                  fontWeight: '500'
                }}>
                  {lecture.status === 'live' ? 'Live' : 'Scheduled'}
                </span>
              </td>
              <td style={{ 
                padding: 'clamp(12px, 2.5vw, 15px)',
                fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
              }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleJoinLecture(lecture)}
                    style={{
                      backgroundColor: '#f4f4f4',
                      color: '#333',
                      border: '1px solid #ddd',
                      padding: 'clamp(6px, 1.5vw, 8px) clamp(10px, 2vw, 12px)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: 'clamp(0.8rem, 1.8vw, 0.9rem)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <i className="fas fa-info-circle"></i> Details
                  </button>
                  <button 
                    onClick={() => addToCalendar(lecture)}
                    style={{
                      backgroundColor: '#3498db',
                      color: 'white',
                      border: 'none',
                      padding: 'clamp(6px, 1.5vw, 8px) clamp(10px, 2vw, 12px)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: 'clamp(0.8rem, 1.8vw, 0.9rem)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <i className="fas fa-calendar-plus"></i> Add
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        padding: '1rem',
        maxWidth: '100%',
        overflowX: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div>
            <h2 style={{ 
              margin: '0 0 5px 0', 
              fontSize: 'clamp(1.5rem, 4vw, 1.8rem)',
              fontWeight: '600',
              color: '#2c3e50'
            }}>Live Lectures</h2>
            <div style={{ 
              color: '#7f8c8d', 
              fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)'
            }}>
              Loading lectures...
            </div>
          </div>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
      <div style={{
        padding: '1rem',
        maxWidth: '100%',
        overflowX: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div>
            <h2 style={{ 
              margin: '0 0 5px 0', 
              fontSize: 'clamp(1.5rem, 4vw, 1.8rem)',
              fontWeight: '600',
              color: '#2c3e50'
            }}>Live Lectures</h2>
            <div style={{ 
              color: '#7f8c8d', 
              fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)'
            }}>
              Error
            </div>
          </div>
        </div>
        <div style={{
          padding: '20px',
          backgroundColor: '#fee',
          border: '1px solid #f99',
          borderRadius: '8px',
          marginBottom: '20px'
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
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-sync-alt"></i>
            Refresh Lectures
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '1rem',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ 
            margin: '0 0 5px 0', 
            fontSize: 'clamp(1.5rem, 4vw, 1.8rem)',
            fontWeight: '600',
            color: '#2c3e50'
          }}>Live Lectures</h2>
          <div style={{ 
            color: '#7f8c8d', 
            fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)'
          }}>
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
            padding: '10px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            whiteSpace: 'nowrap',
            fontWeight: '500'
          }}
        >
          <i className="fas fa-sync-alt"></i>
          Refresh
        </button>
      </div>

      {/* Live Lectures Section */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ 
          margin: '0 0 15px 0',
          color: '#2c3e50',
          fontSize: 'clamp(1.1rem, 3vw, 1.3rem)',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className="fas fa-video" style={{ color: '#3498db' }}></i>
          Live & Ongoing Lectures
        </h3>
        
        {liveLectures.length > 0 ? (
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            width: '100%'
          }}>
            {/* Previous Button - FIXED SIZE for small screens */}
            {showPrevButton && (
              <button 
                onClick={() => scrollLectures(-1)}
                style={{
                  position: 'absolute',
                  left: isMobile ? '4px' : '-12px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: isMobile ? '28px' : '32px',
                  height: isMobile ? '28px' : '32px',
                  cursor: 'pointer',
                  zIndex: '10',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  opacity: '0.9',
                  fontSize: isMobile ? '12px' : '14px'
                }}
                aria-label="Previous lectures"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
            )}
            
            {/* Lectures Slider */}
            <div 
              ref={sliderRef}
              style={{
                display: 'flex',
                overflowX: 'auto',
                gap: '12px',
                padding: '4px',
                scrollBehavior: 'smooth',
                msOverflowStyle: 'none',
                width: '100%',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none'
              }}
            >
              {liveLectures.map(lecture => (
                <div 
                  key={lecture.id} 
                  style={{
                    flex: '0 0 auto',
                    width: isMobile ? 'calc(100vw - 2.5rem)' : 'calc(100vw - 4rem)',
                    maxWidth: '320px',
                    backgroundColor: 'white',
                    borderRadius: '10px',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                    padding: '16px',
                    borderTop: '4px solid #e74c3c',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '250px'
                  }}
                >
                  {/* Lecture Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '10px',
                    gap: '8px'
                  }}>
                    <h4 style={{ 
                      margin: '0',
                      fontSize: 'clamp(0.95rem, 2.5vw, 1.05rem)',
                      color: '#2c3e50',
                      lineHeight: '1.3',
                      flex: '1',
                      minWidth: '0',
                      fontWeight: '600'
                    }}>
                      <span style={{
                        display: '-webkit-box',
                        WebkitLineClamp: '2',
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {lecture.title}
                      </span>
                    </h4>
                    <span style={{
                      backgroundColor: '#e74c3c',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: 'clamp(0.65rem, 2vw, 0.75rem)',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      flexShrink: '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <i className="fas fa-circle" style={{ 
                        fontSize: '6px',
                        animation: 'pulse 1.5s infinite'
                      }}></i>
                      LIVE
                    </span>
                  </div>
                  
                  {/* Lecture Meta Info */}
                  <div style={{ 
                    marginBottom: '12px',
                    flex: '1'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '6px',
                      fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                      color: '#555'
                    }}>
                      <i className="fas fa-chalkboard-teacher" style={{ 
                        width: '16px',
                        marginRight: '8px',
                        color: '#3498db',
                        flexShrink: '0'
                      }}></i>
                      <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{lecture.lecturer}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '6px',
                      fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                      color: '#555'
                    }}>
                      <i className="fas fa-clock" style={{ 
                        width: '16px',
                        marginRight: '8px',
                        color: '#3498db',
                        flexShrink: '0'
                      }}></i>
                      <span>{lecture.time}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '6px',
                      fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                      color: '#555'
                    }}>
                      <i className="fas fa-book" style={{ 
                        width: '16px',
                        marginRight: '8px',
                        color: '#3498db',
                        flexShrink: '0'
                      }}></i>
                      <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{lecture.courseCode}</span>
                    </div>
                  </div>
                  
                  {/* Lecture Actions */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: 'auto'
                  }}>
                    <button 
                      onClick={() => handleJoinLecture(lecture)}
                      style={{
                        flex: '1',
                        padding: '10px',
                        backgroundColor: lecture.meetLink ? '#28a745' : '#95a5a6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: '500',
                        fontSize: 'clamp(0.8rem, 2vw, 0.9rem)'
                      }}
                    >
                      <i className="fas fa-video"></i>
                      {lecture.meetLink ? 'Join Now' : 'No Link'}
                    </button>
                    
                    <button 
                      onClick={() => addToCalendar(lecture)}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                        flexShrink: '0'
                      }}
                    >
                      <i className="fas fa-calendar-plus"></i>
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Next Button - FIXED SIZE for small screens */}
            {showNextButton && (
              <button 
                onClick={() => scrollLectures(1)}
                style={{
                  position: 'absolute',
                  right: isMobile ? '4px' : '-12px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: isMobile ? '28px' : '32px',
                  height: isMobile ? '28px' : '32px',
                  cursor: 'pointer',
                  zIndex: '10',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  opacity: '0.9',
                  fontSize: isMobile ? '12px' : '14px'
                }}
                aria-label="Next lectures"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            )}
          </div>
        ) : (
          <div style={{
            padding: '25px 16px',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: '10px',
            border: '2px dashed #dee2e6'
          }}>
            <i className="fas fa-video-slash" style={{
              fontSize: 'clamp(2rem, 6vw, 2.5rem)',
              color: '#95a5a6',
              marginBottom: '12px'
            }}></i>
            <p style={{ 
              color: '#7f8c8d', 
              fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)',
              margin: '0 0 8px 0',
              fontWeight: '500'
            }}>
              No live lectures at the moment.
            </p>
            <p style={{ 
              color: '#95a5a6', 
              fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
              margin: 0
            }}>
              Check back later or view upcoming lectures below.
            </p>
          </div>
        )}
      </div>

      {/* Upcoming Lectures Section - Improved like Dashboard */}
      <div style={{ 
        marginTop: 'clamp(20px, 4vw, 30px)',
        overflow: 'hidden'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 'clamp(12px, 2.5vw, 15px)',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <h3 style={{ 
            margin: 0,
            fontSize: 'clamp(1.1rem, 2.8vw, 1.3rem)',
            fontWeight: '600',
            color: '#2c3e50',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fas fa-calendar-alt" style={{ color: '#2ecc71' }}></i>
            Upcoming Lectures This Week
          </h3>
          <span style={{ 
            fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', 
            color: '#7f8c8d',
            whiteSpace: 'nowrap'
          }}>
            {upcomingLectures.length} lecture{upcomingLectures.length !== 1 ? 's' : ''} scheduled
          </span>
        </div>
        
        {upcomingLectures.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 'clamp(25px, 5vw, 40px)', 
            backgroundColor: 'white',
            borderRadius: '12px',
            color: '#666',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <i className="fas fa-calendar-times" style={{
              fontSize: 'clamp(2rem, 5vw, 2.5rem)',
              marginBottom: '15px',
              color: '#dee2e6'
            }}></i>
            <p style={{ 
              margin: '0 0 10px 0',
              fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)'
            }}>
              No upcoming lectures scheduled for this week.
            </p>
            <p style={{ 
              fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', 
              color: '#95a5a6' 
            }}>
              Check back later for updates
            </p>
          </div>
        ) : isMobile ? (
          // Mobile View: Compact Cards (Like Dashboard)
          <div>
            {renderMobileUpcomingCards()}
          </div>
        ) : (
          // Desktop View: Full Table
          renderDesktopUpcomingTable()
        )}
      </div>

      {/* Responsive CSS */}
      <style>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        div[style*="overflow-x: auto"]::-webkit-scrollbar {
          display: none;
        }
        
        /* Pulse animation for live indicator */
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Hover effects for larger screens */
        @media (hover: hover) and (pointer: fine) {
          div[style*="border-top: 4px solid #e74c3c"]:hover {
            transform: translateY(-3px);
            transition: transform 0.2s ease;
            box-shadow: 0 6px 20px rgba(0,0,0,0.12);
          }
          
          button[style*="background-color: #3498db"]:hover {
            background-color: #2980b9 !important;
            transition: background-color 0.2s ease;
          }
          
          button[style*="background-color: #28a745"]:hover {
            background-color: #218838 !important;
            transition: background-color 0.2s ease;
          }
          
          button[style*="background-color: #e74c3c"]:hover {
            background-color: #c0392b !important;
            transition: background-color 0.2s ease;
          }
          
          tr:hover {
            background-color: #f8f9fa !important;
            transition: background-color 0.2s ease;
          }
        }
        
        /* Mobile-specific adjustments */
        @media (max-width: 768px) {
          div[style*="display: flex"][style*="flex-direction: row"] {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          
          div[style*="display: flex"][style*="flex-direction: row"] button {
            width: 100%;
            justify-content: center;
          }
          
          /* Make table scroll horizontally on mobile */
          div[style*="overflow-x: auto"] table {
            min-width: 700px;
          }
          
          /* Improved mobile lecture cards */
          div[style*="border-left: 4px solid #3498db"]:hover {
            transform: translateY(-2px);
            transition: transform 0.3s ease;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          }
        }
        
        /* Very small mobile screens */
        @media (max-width: 480px) {
          div[style*="border-top: 4px solid #e74c3c"] {
            padding: 12px !important;
            min-height: 220px !important;
          }
          
          h2 {
            font-size: 1.3rem !important;
          }
          
          h3 {
            font-size: 1rem !important;
          }
          
          /* Navigation buttons on very small screens */
          button[style*="position: absolute"][style*="left: 4px"],
          button[style*="position: absolute"][style*="right: 4px"] {
            width: 26px !important;
            height: 26px !important;
            font-size: 11px !important;
          }
        }
        
        /* Small mobile screens - landscape */
        @media (max-width: 767px) and (orientation: landscape) {
          div[style*="border-top: 4px solid #e74c3c"] {
            min-height: 200px !important;
          }
          
          div[style*="display: flex"][style*="flex-direction: row"] {
            flex-direction: row !important;
            align-items: center !important;
          }
          
          div[style*="display: flex"][style*="flex-direction: row"] button {
            width: auto !important;
          }
        }
        
        /* Fix for iOS Safari */
        @supports (-webkit-touch-callout: none) {
          div[style*="overflow-x: auto"] {
            -webkit-overflow-scrolling: touch;
          }
        }
        
        /* Improve touch targets on mobile */
        @media (max-width: 768px) {
          button, 
          button[style*="background-color: #3498db"],
          button[style*="background-color: #28a745"] {
            min-height: 44px;
            min-width: 44px;
          }
          
          table td {
            padding: 12px 8px !important;
          }
        }
        
        /* Tablet and larger screens */
        @media (min-width: 768px) {
          div[style*="width: calc(100vw - 2.5rem)"],
          div[style*="width: calc(100vw - 4rem)"] {
            width: 320px !important;
          }
        }
        
        /* Desktop screens */
        @media (min-width: 1024px) {
          div[style*="width: calc(100vw - 2.5rem)"],
          div[style*="width: calc(100vw - 4rem)"] {
            width: 350px !important;
          }
          
          div[style*="display: flex"][style*="overflow-x: auto"] {
            gap: 16px !important;
            padding: 8px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Lectures;