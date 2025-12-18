import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';

const Lectures = () => {
  const [liveLectures, setLiveLectures] = useState([]);
  const [recentlyEndedLectures, setRecentlyEndedLectures] = useState([]); // 4-hour grace
  const [endedLast4, setEndedLast4] = useState([]); // Last 4 ended
  const [upcomingLectures, setUpcomingLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPrevButton, setShowPrevButton] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useStudentAuth();
  const sliderRef = useRef(null);

  // Custom Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '' });
  const timeoutRef = useRef(null);

  const openModal = (title, message) => {
    setModalContent({ title, message });
    setModalOpen(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setModalOpen(false);
    }, 3000);
  };

  const closeModal = () => {
    setModalOpen(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (user?.email) {
      fetchAllLectures();
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
      const handleResize = () => checkScrollButtons();
      window.addEventListener('resize', handleResize);
      slider.addEventListener('scroll', checkScrollButtons);
      return () => {
        window.removeEventListener('resize', handleResize);
        if (slider) slider.removeEventListener('scroll', checkScrollButtons);
      };
    }
  }, [liveLectures, recentlyEndedLectures, checkScrollButtons]);

  const fetchAllLectures = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, department_code, email, program')
        .eq('email', user.email)
        .single();

      if (studentError) throw new Error(`Student error: ${studentError.message}`);
      if (!student) throw new Error('Student not found');

      try {
        const { data: allData, error: rpcError } = await supabase
          .rpc('get_student_lectures', { p_student_id: student.id });
        if (!rpcError && allData && allData.length > 0) {
          processAllLectures(allData);
          return;
        }
      } catch {}

      await fetchCurrentLectures(student.id, student.department_code);
      await fetchEndedLast4(student.id, student.department_code);

    } catch (err) {
      setError(`Failed to load lectures: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentLectures = async (studentId, studentDeptCode) => {
    const { data: studentCourses } = await supabase
      .from('student_courses')
      .select('course_id, status')
      .eq('student_id', studentId)
      .in('status', ['enrolled', 'in_progress']);

    if (!studentCourses || studentCourses.length === 0) return;

    const courseIds = studentCourses.map(sc => sc.course_id);
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekFormatted = nextWeek.toISOString().split('T')[0];

    const { data } = await supabase
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

    let filtered = data || [];
    if (studentDeptCode) {
      filtered = filtered.filter(l => l.courses?.department_code === studentDeptCode);
    }

    processCurrentAndGraceLectures(filtered);
  };

  const fetchEndedLast4 = async (studentId, studentDeptCode) => {
    const { data: studentCourses } = await supabase
      .from('student_courses')
      .select('course_id, status')
      .eq('student_id', studentId)
      .in('status', ['enrolled', 'in_progress']);

    if (!studentCourses || studentCourses.length === 0) {
      setEndedLast4([]);
      return;
    }

    const courseIds = studentCourses.map(sc => sc.course_id);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('lectures')
      .select(`
        *,
        courses (id, course_code, course_name, department_code),
        lecturers (full_name, google_meet_link)
      `)
      .in('course_id', courseIds)
      .or(`status.eq.completed,and(scheduled_date.gte.${thirtyDaysAgoStr},scheduled_date.lt.${today})`)
      .order('scheduled_date', { ascending: false })
      .order('end_time', { ascending: false })
      .limit(20);

    let filtered = data || [];
    if (studentDeptCode) {
      filtered = filtered.filter(l => l.courses?.department_code === studentDeptCode);
    }

    const now = new Date();
    const sorted = filtered
      .map(lecture => ({
        ...formatLecture(lecture),
        endDateTime: new Date(`${lecture.scheduledDate}T${lecture.endTime}:00`)
      }))
      .filter(l => l.endDateTime < now)
      .sort((a, b) => b.endDateTime - a.endDateTime)
      .slice(0, 4)
      .map(l => ({ ...l, displayStatus: 'ended' }));

    setEndedLast4(sorted);
  };

  const processCurrentAndGraceLectures = (data) => {
    const now = new Date();
    const live = [];
    const grace = [];
    const upcoming = [];

    data.forEach(item => {
      const lecture = formatLecture(item);

      const isLiveNow = lecture.status === 'ongoing' ||
        (lecture.scheduledDate === now.toISOString().split('T')[0] &&
         isTimeInRange(now, lecture.startTime, lecture.endTime));

      const within4HourGrace = isWithinGracePeriod(lecture, now);

      if (isLiveNow) {
        lecture.displayStatus = 'live';
        live.push(lecture);
      } else if (within4HourGrace) {
        lecture.displayStatus = 'recently-ended';
        grace.push(lecture);
      } else {
        lecture.displayStatus = 'upcoming';
        upcoming.push(lecture);
      }
    });

    setLiveLectures(live);
    setRecentlyEndedLectures(grace);
    setUpcomingLectures(upcoming);
  };

  const formatLecture = (item) => {
    const isFunction = 'lecture_id' in item;
    const lecture = {
      id: isFunction ? item.lecture_id : item.id,
      title: isFunction ? item.lecture_title : item.title,
      lecturer: isFunction ? item.lecturer_name : item.lecturers?.full_name || 'Unknown',
      meetLink: isFunction ? item.google_meet_link : item.google_meet_link || item.lecturers?.google_meet_link,
      scheduledDate: isFunction ? item.scheduled_date : item.scheduled_date,
      startTime: isFunction ? item.start_time : item.start_time,
      endTime: isFunction ? item.end_time : item.end_time,
      status: isFunction ? item.status : item.status,
      courseCode: isFunction ? item.course_code : item.courses?.course_code,
      courseName: isFunction ? item.course_name : item.courses?.course_name,
      description: isFunction ? item.description : item.description,
    };

    const date = new Date(lecture.scheduledDate);
    lecture.formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    lecture.formattedShortDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    lecture.formattedTime = `${formatTime(lecture.startTime)} - ${formatTime(lecture.endTime)}`;

    return lecture;
  };

  const isTimeInRange = (now, start, end) => {
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const startMins = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
    const endMins = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
    return nowMins >= startMins && nowMins <= endMins;
  };

  const isWithinGracePeriod = (lecture, now) => {
    const endDateTime = new Date(`${lecture.scheduledDate}T${lecture.endTime}:00`);
    const fourHoursLater = new Date(endDateTime.getTime() + 4 * 60 * 60 * 1000);
    return now > endDateTime && now < fourHoursLater;
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'TBD';
    const [hours, minutes = '00'] = timeString.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${minutes.padStart(2, '0')} ${ampm}`;
  };

  const scrollLectures = (direction) => {
    const slider = sliderRef.current;
    if (slider) {
      const scrollAmount = slider.clientWidth * 0.8;
      slider.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    }
  };

  const handleJoinLecture = (lecture) => {
    if (lecture.displayStatus === 'live' || lecture.displayStatus === 'recently-ended') {
      if (lecture.meetLink) {
        window.open(lecture.meetLink, '_blank', 'noopener,noreferrer');
      } else {
        openModal('No Link Available', 'This lecture does not have a meeting link yet.');
      }
    } else if (lecture.displayStatus === 'upcoming') {
      openModal(
        lecture.title,
        `📚 Course: ${lecture.courseCode} - ${lecture.courseName}\n👨‍🏫 Lecturer: ${lecture.lecturer}\n📅 Date: ${lecture.formattedDate}\n⏰ Time: ${lecture.formattedTime}\n${lecture.meetLink ? `🔗 Link: ${lecture.meetLink}` : '🔗 No meeting link yet'}`
      );
    } else {
      openModal('Lecture Ended', 'Too late to attend this lecture');
    }
  };

  const addToCalendar = (lecture) => {
    try {
      const startDate = new Date(`${lecture.scheduledDate}T${lecture.startTime}`);
      const endDate = new Date(`${lecture.scheduledDate}T${lecture.endTime}`);
      const icsContent = [
        'BEGIN:VCALENDAR','VERSION:2.0','CALSCALE:GREGORIAN','BEGIN:VEVENT',
        `SUMMARY:${lecture.title}`,
        `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DESCRIPTION:${lecture.description || ''}\\nCourse: ${lecture.courseCode}`,
        `LOCATION:${lecture.meetLink || 'Online Lecture'}`,`UID:${lecture.id}@university.edu`,
        'SEQUENCE:0','DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
        'END:VEVENT','END:VCALENDAR'
      ].join('\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Lecture_${lecture.courseCode}_${lecture.scheduledDate}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      openModal('Success', `"${lecture.title}" has been added to your calendar!`);
    } catch (err) {
      openModal('Error', 'Failed to add lecture to calendar.');
    }
  };

  const refreshLectures = () => fetchAllLectures();

  if (loading) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <h2>Live Lectures</h2>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '1rem' }}>
        <h2>Live Lectures</h2>
        <div style={{ padding: '20px', backgroundColor: '#fee', border: '1px solid #f99', borderRadius: '8px', marginBottom: '20px' }}>
          <p style={{ color: '#d33', margin: '0 0 15px 0' }}>{error}</p>
          <button onClick={refreshLectures} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Refresh Lectures
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0' }}>Live Lectures</h2>
          <div style={{ color: '#7f8c8d' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            Total: {liveLectures.length + recentlyEndedLectures.length + upcomingLectures.length} lectures
          </div>
          <button onClick={refreshLectures} style={{ padding: '10px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Live & Grace Period Lectures */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>
          <span style={{ marginRight: '8px' }}>🎥</span>
          Live & Ongoing Lectures
        </h3>

        {(liveLectures.length > 0 || recentlyEndedLectures.length > 0) ? (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {showPrevButton && (
              <button onClick={() => scrollLectures(-1)} style={{ position: 'absolute', left: isMobile ? '4px' : '-12px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '50%', width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', cursor: 'pointer', zIndex: '10', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                ←
              </button>
            )}

            <div ref={sliderRef} style={{ display: 'flex', overflowX: 'auto', gap: '12px', padding: '4px', scrollBehavior: 'smooth', width: '100%' }}>
              {[...liveLectures, ...recentlyEndedLectures].map(lecture => (
                <div key={lecture.id} style={{
                  flex: '0 0 auto',
                  width: isMobile ? 'calc(100vw - 2.5rem)' : '320px',
                  backgroundColor: lecture.displayStatus === 'recently-ended' ? '#fff4f4' : 'white',
                  borderRadius: '10px',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                  padding: '16px',
                  borderTop: '4px solid #e74c3c',
                  transition: 'transform 0.2s ease'
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h4 style={{ margin: '0', fontSize: '1.05rem', color: '#2c3e50', lineHeight: '1.3' }}>{lecture.title}</h4>
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
                      <span style={{ fontSize: '0.9rem' }}>●</span>
                      {lecture.displayStatus === 'recently-ended' ? 'ENDED (Late Join)' : 'LIVE'}
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
                    <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px', fontSize: '0.9rem', color: '#666' }}>
                      {lecture.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleJoinLecture(lecture)} style={{
                      flex: '1',
                      padding: '10px',
                      backgroundColor: lecture.meetLink 
                        ? (lecture.displayStatus === 'recently-ended' ? '#c0392b' : '#28a745')
                        : '#95a5a6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: lecture.meetLink ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontWeight: '500'
                    }}>
                      {lecture.displayStatus === 'recently-ended' ? '⏰ Too Late? Join Anyway' : '🎥 Join Now'}
                    </button>

                    <button onClick={() => addToCalendar(lecture)} style={{
                      padding: '10px 12px',
                      backgroundColor: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: '500'
                    }}>
                      📅 Add
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {showNextButton && (
              <button onClick={() => scrollLectures(1)} style={{ position: 'absolute', right: isMobile ? '4px' : '-12px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '50%', width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', cursor: 'pointer', zIndex: '10', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                →
              </button>
            )}
          </div>
        ) : (
          <div style={{ padding: '25px 16px', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '10px', border: '2px dashed #dee2e6' }}>
            <div style={{ fontSize: '2.5rem', color: '#95a5a6', marginBottom: '12px' }}>🎥</div>
            <p style={{ color: '#7f8c8d', margin: '0 0 8px 0' }}>No live lectures at the moment.</p>
            <p style={{ color: '#95a5a6', margin: 0 }}>Check back later or view upcoming lectures below.</p>
          </div>
        )}
      </div>

      {/* Last 4 Ended Lectures - Cards */}
      {endedLast4.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 15px 0' }}>
            <span style={{ marginRight: '8px' }}>✅</span>
            Recently Ended Lectures (Last 4)
          </h3>

          <div style={{ display: 'flex', overflowX: 'auto', gap: '12px', padding: '4px' }}>
            {endedLast4.map(lecture => (
              <div 
                key={lecture.id} 
                style={{
                  flex: '0 0 auto',
                  width: isMobile ? 'calc(100vw - 2.5rem)' : '320px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '10px',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                  padding: '16px',
                  borderTop: '4px solid #95a5a6',
                  transition: 'transform 0.2s ease',
                  cursor: 'not-allowed'
                }}
                onClick={(e) => {
                  // Prevent action if clicking the badge
                  if (e.target.tagName === 'SPAN' && e.target.innerText.includes('ENDED')) {
                    e.stopPropagation();
                    return;
                  }
                  openModal('Lecture Ended', 'Too late to attend this lecture');
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <h4 style={{ margin: '0', fontSize: '1.05rem', color: '#2c3e50', lineHeight: '1.3' }}>{lecture.title}</h4>
                  <span 
                    style={{
                      backgroundColor: '#95a5a6',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      pointerEvents: 'none' // Makes badge non-interactive
                    }}
                  >
                    ENDED
                  </span>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ marginRight: '8px', color: '#7f8c8d', minWidth: '20px' }}>👨‍🏫</span>
                    <span style={{ fontSize: '0.95rem', color: '#666' }}>{lecture.lecturer}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ marginRight: '8px', color: '#7f8c8d', minWidth: '20px' }}>🕐</span>
                    <span style={{ fontSize: '0.95rem', color: '#666' }}>{lecture.formattedTime}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '8px', color: '#7f8c8d', minWidth: '20px' }}>📚</span>
                    <span style={{ fontSize: '0.95rem', color: '#666' }}>{lecture.courseCode} - {lecture.courseName}</span>
                  </div>
                </div>

                {lecture.description && (
                  <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#ffffff', borderRadius: '6px', fontSize: '0.9rem', color: '#777' }}>
                    {lecture.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Lectures */}
      <div style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
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
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '12px', color: '#666', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '15px', color: '#dee2e6' }}>📅</div>
            <p style={{ margin: '0 0 10px 0' }}>No upcoming lectures scheduled for this week.</p>
            <p style={{ color: '#95a5a6' }}>Check back later for updates</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', backgroundColor: 'white' }}>
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
                  <tr key={lecture.id} style={{ borderBottom: '1px solid #e9ecef', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>{lecture.formattedShortDate}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>{lecture.scheduledDate}</div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>{formatTime(lecture.startTime)}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>to {formatTime(lecture.endTime)}</div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>{lecture.title}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>{lecture.courseCode} - {lecture.courseName}</div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontSize: '0.95rem' }}>{lecture.lecturer}</div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <span style={{ backgroundColor: '#e8f4fd', color: '#3498db', padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '500', display: 'inline-block' }}>
                        Scheduled
                      </span>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleJoinLecture(lecture)} style={{
                          backgroundColor: '#f4f4f4',
                          color: '#333',
                          border: '1px solid #ddd',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.9rem'
                        }}>
                          ℹ️ Details
                        </button>
                        <button onClick={() => addToCalendar(lecture)} style={{
                          backgroundColor: '#3498db',
                          color: 'white',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.9rem'
                        }}>
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

      {/* Custom Modal - No Overlay, Auto-close after 3s */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '400px',
          padding: '24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#2c3e50' }}>{modalContent.title}</h3>
            <button 
              onClick={closeModal}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#666',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>
          <p style={{ margin: 0, color: '#555', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
            {modalContent.message}
          </p>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -60%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </div>
  );
};

export default Lectures;