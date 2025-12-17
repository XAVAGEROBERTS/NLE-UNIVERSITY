// EnhancedLectures.jsx - Updated to match admin dashboard logic
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

// Fetch lectures using the new department-based function
const fetchLectures = async () => {
  try {
    setLoading(true);
    setError(null);

    console.log('=== DEBUG: START FETCH LECTURES ===');
    console.log('Student email:', user.email);
    console.log('Current time:', new Date().toLocaleString());

    // Get student ID
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, department_code, email, program')
      .eq('email', user.email)
      .single();

    if (studentError) {
      console.error('DEBUG: Error fetching student:', studentError);
      throw new Error(`Student error: ${studentError.message}`);
    }
    if (!student) {
      console.error('DEBUG: Student not found for email:', user.email);
      throw new Error('Student not found');
    }

    console.log('DEBUG: Student found:', {
      id: student.id,
      email: student.email,
      department_code: student.department_code,
      program: student.program
    });

    // TRY NEW FUNCTION FIRST
    try {
      console.log('DEBUG: Trying get_student_lectures function...');
      const { data: lecturesData, error: funcError } = await supabase
        .rpc('get_student_lectures', { p_student_id: student.id });

      if (funcError) {
        console.error('DEBUG: Function error:', funcError);
      }
      
      console.log('DEBUG: Function returned:', {
        hasData: !!lecturesData,
        count: lecturesData?.length || 0,
        data: lecturesData || []
      });
      
      if (!funcError && lecturesData && lecturesData.length > 0) {
        console.log('✅ Using department-filtered function, found:', lecturesData.length, 'lectures');
        processLecturesData(lecturesData);
        return;
      } else {
        console.log('⚠️ Function returned no data or empty array');
      }
    } catch (funcError) {
      console.log('DEBUG: Function not available or error:', funcError);
    }

    // FALLBACK: Original method with updated logic
    console.log('DEBUG: Using fallback method...');
    await fetchLecturesFallback(student.id, student.department_code);
    
  } catch (error) {
    console.error('Error fetching lectures:', error);
    setError(`Failed to load lectures: ${error.message}`);
    setLiveLectures([]);
    setUpcomingLectures([]);
  } finally {
    setLoading(false);
    console.log('=== DEBUG: END FETCH LECTURES ===');
  }
};
  // Fallback method with updated status logic
const fetchLecturesFallback = async (studentId, studentDeptCode) => {
  try {
    console.log('DEBUG: Starting fallback method');
    console.log('Student ID:', studentId, 'Department:', studentDeptCode);

    // Get enrolled courses
    const { data: studentCourses, error: coursesError } = await supabase
      .from('student_courses')
      .select('course_id, status')
      .eq('student_id', studentId)
      .in('status', ['enrolled', 'in_progress']);

    if (coursesError) {
      console.error('DEBUG: Error fetching student courses:', coursesError);
      throw coursesError;
    }

    console.log('DEBUG: Student courses found:', {
      count: studentCourses?.length || 0,
      courses: studentCourses || []
    });

    // ========== YOUR ADDED CODE ==========
    // After getting student courses, check what courses they're enrolled in
    if (studentCourses && studentCourses.length > 0) {
      // Get course details to see what they're enrolled in
      const { data: courseDetails } = await supabase
        .from('courses')
        .select('id, course_code, course_name, department_code')
        .in('id', studentCourses.map(sc => sc.course_id));
      
      console.log('DEBUG: Student is enrolled in these courses:', courseDetails);
      
      // Check specifically for Physics courses
      const physicsCourses = courseDetails?.filter(c => 
        c.course_name?.toLowerCase().includes('physics') || 
        c.course_code?.toLowerCase().includes('phys')
      );
      
      console.log('DEBUG: Physics courses in enrollment:', physicsCourses);
    }
    // ========== END OF YOUR CODE ==========

    if (!studentCourses || studentCourses.length === 0) {
      console.log('DEBUG: No enrolled courses found for student');
      setLiveLectures([]);
      setUpcomingLectures([]);
      return;
    }

    const courseIds = studentCourses.map(sc => sc.course_id);
    console.log('DEBUG: Course IDs to fetch lectures for:', courseIds);
    
    // Get lectures for these courses
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekFormatted = nextWeek.toISOString().split('T')[0];

    console.log('DEBUG: Date range for lectures:', {
      today: today,
      nextWeek: nextWeekFormatted
    });

    const { data: lecturesData, error: lecturesError } = await supabase
      .from('lectures')
      .select(`
        *,
        courses (id, course_code, course_name, department_code),
        lecturers (full_name, google_meet_link)
      `)
      .in('course_id', courseIds)
      .gte('scheduled_date', today)
      .lte('scheduled_date', nextWeekFormatted)
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (lecturesError) {
      console.error('DEBUG: Error fetching lectures:', lecturesError);
      throw lecturesError;
    }

    console.log('DEBUG: Raw lectures found:', {
      count: lecturesData?.length || 0,
      lectures: lecturesData || []
    });

    // Apply department filtering manually
    let filteredLectures = lecturesData || [];
    
    console.log('DEBUG: Before department filter:', filteredLectures.length, 'lectures');
    
    if (studentDeptCode) {
      filteredLectures = filteredLectures.filter(lecture => {
        const courseDept = lecture.courses?.department_code;
        const matches = courseDept === studentDeptCode;
        console.log('DEBUG: Lecture department check:', {
          lectureTitle: lecture.title,
          courseDept: courseDept,
          studentDept: studentDeptCode,
          matches: matches
        });
        return matches;
      });
      
      console.log(`DEBUG: Filtered to ${filteredLectures.length} lectures by department`);
    }

    console.log('DEBUG: Final lectures to process:', {
      count: filteredLectures.length,
      lectures: filteredLectures.map(l => ({
        title: l.title,
        course: l.courses?.course_code,
        date: l.scheduled_date,
        department: l.courses?.department_code
      }))
    });

    processLecturesData(filteredLectures);
    
  } catch (error) {
    console.error('DEBUG: Fallback error:', error);
    throw error;
  }
};

// Process lectures data with updated status logic
const processLecturesData = (lecturesData) => {
  const now = new Date();
  const live = [];
  const upcoming = [];

  if (lecturesData && lecturesData.length > 0) {
    lecturesData.forEach(item => {
      // Handle both function return format and direct query format
      const isFunctionFormat = 'lecture_id' in item;
      
      const lecture = {
        id: isFunctionFormat ? item.lecture_id : item.id,
        title: isFunctionFormat ? item.lecture_title : item.title,
        lecturer: isFunctionFormat ? item.lecturer_name : item.lecturers?.full_name,
        meetLink: isFunctionFormat ? item.google_meet_link : item.google_meet_link || item.lecturers?.google_meet_link,
        scheduledDate: isFunctionFormat ? item.scheduled_date : item.scheduled_date,
        startTime: isFunctionFormat ? item.start_time : item.start_time,
        endTime: isFunctionFormat ? item.end_time : item.end_time,
        status: isFunctionFormat ? item.status : item.status,
        courseCode: isFunctionFormat ? item.course_code : item.courses?.course_code,
        courseName: isFunctionFormat ? item.course_name : item.courses?.course_name,
        description: isFunctionFormat ? item.description : item.description,
      };

      // Calculate if lecture is live now (matching admin dashboard logic)
      const today = now.toISOString().split('T')[0];
      const isToday = lecture.scheduledDate === today;
      let displayStatus = lecture.status || 'scheduled';
      let isLiveNow = false;

      // Parse times for comparison
      const parseTimeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const startMinutes = parseTimeToMinutes(lecture.startTime);
      const endMinutes = parseTimeToMinutes(lecture.endTime);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      // Check if lecture should be live now (matching admin logic)
      // IMPORTANT: Check for 'ongoing' status from database
      if (displayStatus === 'ongoing') {
        isLiveNow = true;
      } 
      // Only auto-detect if status is 'scheduled' and it's today
      else if (isToday && displayStatus === 'scheduled') {
        if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) {
          isLiveNow = true;
          displayStatus = 'ongoing';
        }
      }
      // Don't automatically mark as completed - let the lecturer do that manually
      // Only mark as completed if database says so
      else if (displayStatus === 'completed') {
        isLiveNow = false;
      }

      // Format date and time
      const lectureDate = new Date(lecture.scheduledDate);
      lecture.formattedDate = lectureDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      lecture.formattedShortDate = lectureDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      lecture.formattedTime = `${formatTime(lecture.startTime)} - ${formatTime(lecture.endTime)}`;

      // Add debug info
      lecture._debug =
      {
        scheduledDate: lecture.scheduledDate,
        startTime: lecture.startTime,
        endTime: lecture.endTime,
        dbStatus: lecture.status,
        displayStatus: displayStatus,
        isLiveNow: isLiveNow,
        now: now.toLocaleString(),
        today: today,
        isToday: isToday,
        startMinutes: startMinutes,
        endMinutes: endMinutes,
        nowMinutes: nowMinutes
      };

      // Categorize - IMPORTANT CHANGE HERE
      if (isLiveNow) {
        lecture.status = 'live';
        lecture.isLiveNow = true;
        live.push(lecture);
      } else if (displayStatus === 'completed') {
        // Don't show completed lectures in either list
        // Or you could create a "past lectures" section if needed
      } else {
        lecture.status = 'upcoming';
        lecture.isLiveNow = false;
        upcoming.push(lecture);
      }
    });
  }

  console.log(`Processed: ${live.length} live, ${upcoming.length} upcoming`);
  live.forEach(l => console.log('Live lecture:', l.title, l._debug));
  upcoming.forEach(u => console.log('Upcoming lecture:', u.title, u._debug));
  
  setLiveLectures(live);
  setUpcomingLectures(upcoming);
};
  const formatTime = (timeString) => {
    if (!timeString) return 'TBD';
    // Handle both "HH:MM" and "HH:MM:SS" formats
    const timeParts = timeString.split(':');
    const hours = parseInt(timeParts[0]);
    const minutes = timeParts[1] || '00';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHour = hours % 12 || 12;
    return `${formattedHour}:${minutes.padStart(2, '0')} ${ampm}`;
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

  // Handle join lecture - goes directly to Google Meet link
  const handleJoinLecture = (lecture) => {
    if ((lecture.status === 'live' || lecture.status === 'ongoing') && lecture.meetLink) {
      // Direct to the exact Google Meet link the lecturer posted
      window.open(lecture.meetLink, '_blank', 'noopener,noreferrer');
    } else if (lecture.status === 'upcoming' || lecture.status === 'scheduled') {
      // Show details for upcoming lectures
      alert(`📅 ${lecture.title}\n📚 ${lecture.courseCode}\n👨‍🏫 ${lecture.lecturer}\n📅 ${lecture.formattedDate}\n⏰ ${lecture.formattedTime}\n${lecture.meetLink ? `🔗 ${lecture.meetLink}` : 'No meeting link yet'}`);
    } else {
      alert('Lecture has ended or no meeting link available.');
    }
  };

  const addToCalendar = (lecture) => {
    // Your existing calendar function
    try {
      const startDate = new Date(`${lecture.scheduledDate}T${lecture.startTime}`);
      const endDate = new Date(`${lecture.scheduledDate}T${lecture.endTime}`);
      
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `SUMMARY:${lecture.title}`,
        `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DESCRIPTION:${lecture.description || ''}\\nCourse: ${lecture.courseCode}`,
        `LOCATION:${lecture.meetLink || 'Online Lecture'}`,
        `UID:${lecture.id}@university.edu`,
        'SEQUENCE:0',
        'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\n');
      
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Lecture_${lecture.courseCode}_${lecture.scheduledDate}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert(`"${lecture.title}" added to calendar!`);
    } catch (err) {
      console.error('Calendar error:', err);
      alert('Failed to add to calendar.');
    }
  };

  const refreshLectures = () => {
    fetchLectures();
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <h2>Live Lectures</h2>
        <div style={{ 
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
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ padding: '1rem' }}>
        <h2>Live Lectures</h2>
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
              cursor: 'pointer'
            }}
          >
            Refresh Lectures
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0' }}>Live Lectures</h2>
          <div style={{ color: '#7f8c8d' }}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            Total: {liveLectures.length + upcomingLectures.length} lectures
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
              gap: '8px'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Live Lectures Section */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>
          <span style={{ marginRight: '8px' }}>🎥</span>
          Live & Ongoing Lectures
        </h3>
        
        {liveLectures.length > 0 ? (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {/* Previous Button */}
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
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                ←
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
                width: '100%',
                '&::-webkit-scrollbar': {
                  height: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                  borderRadius: '10px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#888',
                  borderRadius: '10px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: '#555',
                }
              }}
            >
              {liveLectures.map(lecture => (
                <div 
                  key={lecture.id} 
                  style={{
                    flex: '0 0 auto',
                    width: isMobile ? 'calc(100vw - 2.5rem)' : '320px',
                    backgroundColor: 'white',
                    borderRadius: '10px',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                    padding: '16px',
                    borderTop: '4px solid #e74c3c',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '10px'
                  }}>
                    <h4 style={{ 
                      margin: '0',
                      fontSize: '1.05rem',
                      color: '#2c3e50',
                      lineHeight: '1.3'
                    }}>
                      {lecture.title}
                    </h4>
                    <span style={{
                      backgroundColor: '#e74c3c',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ fontSize: '0.9rem' }}>●</span> LIVE
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ marginRight: '8px', color: '#3498db', minWidth: '20px' }}>👨‍🏫</span>
                      <span style={{ fontSize: '0.95rem' }}>{lecture.lecturer}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ marginRight: '8px', color: '#3498db', minWidth: '20px' }}>🕐</span>
                      <span style={{ fontSize: '0.95rem' }}>{lecture.formattedTime}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: '8px', color: '#3498db', minWidth: '20px' }}>📚</span>
                      <span style={{ fontSize: '0.95rem' }}>{lecture.courseCode} - {lecture.courseName}</span>
                    </div>
                  </div>
                  
                  {lecture.description && (
                    <div style={{ 
                      marginBottom: '12px', 
                      padding: '8px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      color: '#666'
                    }}>
                      {lecture.description}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleJoinLecture(lecture)}
                      style={{
                        flex: '1',
                        padding: '10px',
                        backgroundColor: lecture.meetLink ? '#28a745' : '#95a5a6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: lecture.meetLink ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: '500',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (lecture.meetLink) e.currentTarget.style.backgroundColor = '#218838';
                      }}
                      onMouseLeave={(e) => {
                        if (lecture.meetLink) e.currentTarget.style.backgroundColor = '#28a745';
                      }}
                    >
                      🎥 {lecture.meetLink ? 'Join Now' : 'No Link'}
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
                        gap: '6px',
                        fontWeight: '500',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#258cd1'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3498db'}
                    >
                      📅 Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Next Button */}
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
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                →
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
            <div style={{ fontSize: '2.5rem', color: '#95a5a6', marginBottom: '12px' }}>🎥</div>
            <p style={{ color: '#7f8c8d', margin: '0 0 8px 0' }}>
              No live lectures at the moment.
            </p>
            <p style={{ color: '#95a5a6', margin: 0 }}>
              Check back later or view upcoming lectures below.
            </p>
          </div>
        )}
      </div>

      {/* Upcoming Lectures Section */}
      <div style={{ marginTop: '30px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '15px'
        }}>
          <h3 style={{ margin: 0 }}>
            <span style={{ marginRight: '8px' }}>📅</span>
            Upcoming Lectures This Week
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#7f8c8d' }}>
              {upcomingLectures.length} lecture{upcomingLectures.length !== 1 ? 's' : ''} scheduled
            </span>
          </div>
        </div>
        
        {upcomingLectures.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            backgroundColor: 'white',
            borderRadius: '12px',
            color: '#666',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '15px', color: '#dee2e6' }}>📅</div>
            <p style={{ margin: '0 0 10px 0' }}>
              No upcoming lectures scheduled for this week.
            </p>
            <p style={{ color: '#95a5a6' }}>
              Check back later for updates
            </p>
          </div>
        ) : (
          <div style={{
            overflowX: 'auto',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            backgroundColor: 'white'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Date</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Time</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Course</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Lecturer</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Status</th>
                  <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingLectures.map((lecture, index) => (
                  <tr 
                    key={lecture.id} 
                    style={{ 
                      borderBottom: '1px solid #e9ecef',
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                    }}
                  >
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>{lecture.formattedShortDate}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                        {lecture.scheduledDate}
                      </div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>{formatTime(lecture.startTime)}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                        to {formatTime(lecture.endTime)}
                      </div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>{lecture.title}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                        {lecture.courseCode} - {lecture.courseName}
                      </div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontSize: '0.95rem' }}>{lecture.lecturer}</div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <span style={{
                        backgroundColor: '#e8f4fd',
                        color: '#3498db',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                        display: 'inline-block'
                      }}>
                        Scheduled
                      </span>
                    </td>
                    <td style={{ padding: '15px' }}>
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
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#e9ecef';
                            e.currentTarget.style.borderColor = '#adb5bd';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f4f4f4';
                            e.currentTarget.style.borderColor = '#ddd';
                          }}
                        >
                          ℹ️ Details
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
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.9rem',
                            transition: 'background-color 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#258cd1'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3498db'}
                        >
                          📅 Add
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
    </div>
    
  );
};

export default Lectures;