import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';

const Timetable = () => {
  const [timetableData, setTimetableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upcomingLectures, setUpcomingLectures] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState('timetable'); // 'timetable' or 'upcoming'
  const { user } = useStudentAuth();

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setViewMode('upcoming');
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (user?.email) {
      fetchTimetable();
    }
  }, [user]);

const fetchTimetable = async () => {
  try {
    setLoading(true);

    // Get current logged-in student's details
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, program_id, academic_year, semester, year_of_study, department_code')
      .eq('email', user.email)
      .single();

    if (studentError || !student) {
      console.error('Student not found:', studentError);
      setTimetableData([]);
      setUpcomingLectures([]);
      setLoading(false);
      return;
    }

    // Fetch the active program timetable for this student
    const { data: programTimetable, error: ptError } = await supabase
      .from('program_timetables')
      .select('id')
      .eq('program_id', student.program_id)
      .eq('academic_year', student.academic_year)
      .eq('semester', student.semester)
      .eq('year_of_study', student.year_of_study)
      .eq('is_active', true)
      .single();

    if (ptError || !programTimetable) {
      console.log('No program timetable found for this student yet.');
      setTimetableData([]);
      setUpcomingLectures([]);
      setLoading(false);
      return;
    }

    // Fetch all slots for this program timetable
    const { data: timetableSlots, error: slotsError } = await supabase
      .from('program_timetable_slots')
      .select(`
        course_code,
        course_name,
        lecturer_id,
        day_of_week,
        start_time,
        end_time,
        room_number,
        building,
        slot_type,
        lecturers (full_name)
      `)
      .eq('program_timetable_id', programTimetable.id)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (slotsError) throw slotsError;

    if (!timetableSlots || timetableSlots.length === 0) {
      setTimetableData([]);
      setUpcomingLectures([]);
      setLoading(false);
      return;
    }

    // === Processing remains mostly the same from here ===
    const timeSlots = [
      "8:00 - 9:00",
      "9:00 - 10:00",
      "10:00 - 11:00",
      "11:00 - 12:00",
      "12:00 - 13:00",
      "13:00 - 14:00",
      "14:00 - 15:00",
      "15:00 - 16:00",
      "16:00 - 17:00",
      "17:00 - 18:00"
    ];

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timetable = timeSlots.map(timeSlot => {
      const row = { time: timeSlot };
      dayNames.forEach((day) => {
        row[day.toLowerCase()] = [];
      });
      return row;
    });

    const upcomingLecs = [];
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    timetableSlots.forEach(slot => {
      const dayName = dayNames[slot.day_of_week]?.toLowerCase();
      if (!dayName) return;

      const startHour = parseInt(slot.start_time.split(':')[0]);
      const endHour = parseInt(slot.end_time.split(':')[0]);

      for (let hour = startHour; hour < endHour; hour++) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`;
        const rowIndex = timeSlots.findIndex(ts => ts === timeSlot);

        if (rowIndex !== -1) {
          const lectureInfo = {
            courseCode: slot.course_code || 'N/A',
            courseName: slot.course_name || 'Unknown Course',
            room: slot.room_number ? `${slot.room_number}, ${slot.building || ''}`.trim() : 'TBA',
            lecturer: slot.lecturers?.full_name || 'Not Assigned',
            slotType: slot.slot_type === 'lab' ? 'LAB' : '',
            startTime: slot.start_time,
            endTime: slot.end_time,
            dayOfWeek: slot.day_of_week,
            dayName: dayNames[slot.day_of_week]
          };

          // Avoid duplicates
          if (!timetable[rowIndex][dayName].some(item => 
            item.courseCode === lectureInfo.courseCode && 
            item.startTime === slot.start_time
          )) {
            timetable[rowIndex][dayName].push(lectureInfo);
          }

          // Upcoming lectures logic
          const todayDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
          let daysToAdd = slot.day_of_week - todayDayIndex;
          if (daysToAdd < 0) daysToAdd += 7;

          const lectureDate = new Date(today);
          lectureDate.setDate(today.getDate() + daysToAdd);

          if (lectureDate <= nextWeek) {
            upcomingLecs.push({
              ...lectureInfo,
              date: lectureDate.toISOString().split('T')[0],
              formattedDate: formatDate(lectureDate),
              isToday: daysToAdd === 0,
              isTomorrow: daysToAdd === 1
            });
          }
        }
      }
    });

    upcomingLecs.sort((a, b) => {
      if (a.date === b.date) return a.startTime.localeCompare(b.startTime);
      return a.date.localeCompare(b.date);
    });

    setTimetableData(timetable);
    setUpcomingLectures(upcomingLecs);

  } catch (error) {
    console.error('Error fetching program timetable:', error);
    setTimetableData([]);
    setUpcomingLectures([]);
  } finally {
    setLoading(false);
  }
};

  // Helper functions
  const formatTime = (timeString) => {
    if (!timeString) return 'TBD';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (date) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const addToCalendar = (lecture) => {
    const event = {
      title: `${lecture.courseCode} - ${lecture.courseName}`,
      start: new Date(`${lecture.date}T${lecture.startTime}`),
      end: new Date(`${lecture.date}T${lecture.endTime}`),
      description: `Lecture by ${lecture.lecturer}\nRoom: ${lecture.room}`,
      location: lecture.room
    };
    
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
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${lecture.courseCode.replace(/\s+/g, '_')}_lecture.ics`;
    link.click();
    
    URL.revokeObjectURL(link.href);
    alert(`${lecture.courseCode} added to calendar!`);
  };

  // Render mobile view - upcoming lectures cards
  const renderMobileView = () => (
    <div className="upcoming-lectures-container" style={{ marginTop: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px',
        padding: '0 8px'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#333' }}>Upcoming Lectures</h3>
        <span style={{ fontSize: '0.85rem', color: '#666' }}>
          Next 7 days
        </span>
      </div>

      {upcomingLectures.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 16px', 
          backgroundColor: '#f8f9fa',
          borderRadius: '10px',
          margin: '0 8px'
        }}>
          <p style={{ color: '#666', margin: '0 0 10px 0' }}>No upcoming lectures this week</p>
          <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '5px' }}>
            Check your timetable for more details
          </p>
        </div>
      ) : (
        <div className="lecture-cards" style={{ padding: '0 8px' }}>
          {upcomingLectures.map((lecture, index) => (
            <div 
              key={index}
              className="lecture-card"
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                borderLeft: `4px solid ${lecture.isToday ? '#3498db' : lecture.isTomorrow ? '#9b59b6' : '#2ecc71'}`
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
                    {lecture.courseName}
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
                  backgroundColor: lecture.isToday ? '#e3f2fd' : lecture.isTomorrow ? '#f3e5f5' : '#f8f9fa',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  marginLeft: '8px'
                }}>
                  {lecture.formattedDate}
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
                    Room
                  </p>
                  <p style={{ 
                    margin: '0',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#333'
                  }}>
                    {lecture.room} {lecture.slotType}
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
                <div style={{ flex: 1 }}>
                  <p style={{ 
                    margin: '0 0 4px 0',
                    fontSize: '12px',
                    color: '#999'
                  }}>
                    Lecturer
                  </p>
                  <p style={{ 
                    margin: '0',
                    fontSize: '14px',
                    color: '#555',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {lecture.lecturer}
                  </p>
                </div>
                <button 
                  onClick={() => addToCalendar(lecture)}
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
                    marginLeft: '12px',
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                  }}
                >
                  <i className="fas fa-calendar-plus"></i> Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render desktop view - full timetable
  const renderDesktopView = () => (
    <div className="table-container" style={{ 
      marginTop: '20px',
      padding: '0'
    }}>
      <table style={{ margin: 0 }}>
        <thead>
          <tr>
            <th style={{ padding: '12px' }}>Time</th>
            <th style={{ padding: '12px' }}>Monday</th>
            <th style={{ padding: '12px' }}>Tuesday</th>
            <th style={{ padding: '12px' }}>Wednesday</th>
            <th style={{ padding: '12px' }}>Thursday</th>
            <th style={{ padding: '12px' }}>Friday</th>
            <th style={{ padding: '12px' }}>Saturday</th>
          </tr>
        </thead>
        <tbody>
          {timetableData.map((row, index) => (
            <tr key={index}>
              <td style={{ padding: '12px', fontWeight: '500' }}>{row.time}</td>
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => (
                <td key={day} style={{ padding: '8px' }}>
                  {row[day].length > 0 ? (
                    row[day].map((lecture, idx) => (
                      <div 
                        key={idx}
                        className="timetable-cell"
                        style={{
                          backgroundColor: '#f8f9fa',
                          padding: '10px',
                          marginBottom: '6px',
                          borderRadius: '6px',
                          borderLeft: `3px solid ${lecture.slotType === 'LAB' ? '#e74c3c' : '#3498db'}`
                        }}
                      >
                        <div style={{ fontWeight: '500', fontSize: '0.9rem', marginBottom: '4px' }}>
                          {lecture.courseCode}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '2px' }}>
                          {lecture.room} {lecture.slotType}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#999' }}>
                          {lecture.lecturer}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      color: '#ccc', 
                      textAlign: 'center',
                      padding: '10px'
                    }}>
                      -
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Loading state
 // Loading state
if (loading) {
  return (
    <div className="content" style={{ padding: '16px' }}>
      <div className="dashboard-header" style={{ padding: '0' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>My Time Table</h2>
        <div className="date-display" style={{ color: '#666' }}>Loading timetable...</div>
      </div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '200px'
      }}>
        <div className="timetable-spinner"></div>
      </div>
    </div>
  );
}

  return (
    <div className="content" style={{ 
      padding: isMobile ? '12px 8px' : '16px',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      <div className="dashboard-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '10px',
        padding: isMobile ? '0' : '0 0 10px 0',
        marginBottom: isMobile ? '0' : '10px'
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h2 style={{ 
            margin: '0 0 6px 0',
            fontSize: isMobile ? '1.3rem' : '1.5rem'
          }}>
            My Time Table
          </h2>
          <div className="date-display" style={{ 
            color: '#666',
            fontSize: isMobile ? '0.9rem' : '1rem'
          }}>
            Week: {new Date().toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </div>
        </div>
        
        {/* View Toggle for Desktop */}
        {!isMobile && (
          <div className="view-toggle" style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: '#f8f9fa',
            padding: '4px',
            borderRadius: '8px',
            flexShrink: 0
          }}>
            <button
              onClick={() => setViewMode('timetable')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'timetable' ? '#3498db' : 'transparent',
                color: viewMode === 'timetable' ? 'white' : '#666',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap'
              }}
            >
              Full Timetable
            </button>
            <button
              onClick={() => setViewMode('upcoming')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'upcoming' ? '#3498db' : 'transparent',
                color: viewMode === 'upcoming' ? 'white' : '#666',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap'
              }}
            >
              Upcoming Lectures
            </button>
          </div>
        )}
      </div>

      {timetableData.length === 0 ? (
        <div style={{ 
          textAlign: 'center',
          padding: '40px 16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '10px',
          marginTop: '20px'
        }}>
          <p style={{ color: '#666', margin: '0 0 10px 0' }}>No timetable available for the current semester.</p>
          <p style={{ fontSize: '0.9rem', color: '#999' }}>
            Please contact your department for more information.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile always shows upcoming view */}
          {isMobile ? (
            renderMobileView()
          ) : (
            // Desktop shows selected view
            viewMode === 'upcoming' ? renderMobileView() : renderDesktopView()
          )}
        </>
      )}

      {/* Responsive CSS */}
      <style>{`
        .table-container {
          overflow-x: auto;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          background: white;
          width: 100%;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }
        
        th {
          background: #f8f9fa;
          text-align: left;
          border-bottom: 2px solid #dee2e6;
          font-weight: 600;
          color: #333;
        }
        
        tr:last-child td {
          border-bottom: none;
        }
        
        .timetable-cell:hover {
          background-color: #f0f7ff;
          transform: translateY(-1px);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .lecture-card:hover {
          transform: translateY(-2px);
          transition: transform 0.3s ease;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        
        /* Loading spinner */
     /* Timetable loading spinner */
.timetable-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: timetable-spin 1s linear infinite;
}

@keyframes timetable-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
        /* Mobile optimizations */
        @media (max-width: 768px) {
          .content {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
          
          .lecture-card {
            margin-left: 0 !important;
            margin-right: 0 !important;
            width: 100%;
          }
          
          .dashboard-header {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          
          .upcoming-lectures-container {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }
        
        @media (min-width: 769px) and (max-width: 1024px) {
          .content {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
          
          table {
            min-width: 700px;
          }
          
          th, td {
            padding: 10px 12px !important;
            font-size: 0.9rem;
          }
        }
        
        @media (min-width: 1025px) {
          .content {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }
        }
        
        /* Button hover effects */
        button:hover {
          opacity: 0.9;
        }
        
        /* Scrollbar styling */
        .table-container::-webkit-scrollbar {
          height: 8px;
        }
        
        .table-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        .table-container::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        
        .table-container::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
      `}</style>
    </div>
  );
};

export default Timetable;