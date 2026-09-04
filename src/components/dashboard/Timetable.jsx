// src/components/dashboard/Timetable.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useCachedData } from '../../hooks/useCachedData';

const Timetable = () => {
  const [gridData, setGridData] = useState({ days: [], timeColumns: [], matrix: {} });
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useStudentAuth();

  // ---------- responsive ----------
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ---------- helpers ----------
  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = String(t).split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${(m || '00').padStart(2, '0')}${ampm}`;
  };

  const timeToMinutes = (t) => {
    if (!t) return 0;
    const [h, m] = String(t).split(':');
    return parseInt(h, 10) * 60 + parseInt(m || '0', 10);
  };

  // ---------- fetch ----------
  const fetchTimetableData = useCallback(async () => {
    if (!user?.email) throw new Error('No user logged in');

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, program_id, academic_year, semester, year_of_study')
      .eq('email', user.email)
      .single();

    if (studentError || !student) {
      return { days: [], timeColumns: [], matrix: {} };
    }

    const { data: programTimetable } = await supabase
      .from('program_timetables')
      .select('id')
      .eq('program_id', student.program_id)
      .eq('academic_year', student.academic_year)
      .eq('semester', student.semester)
      .eq('year_of_study', student.year_of_study)
      .eq('is_active', true)
      .maybeSingle();

    if (!programTimetable) {
      return { days: [], timeColumns: [], matrix: {} };
    }

    const { data: slots, error: slotsError } = await supabase
      .from('program_timetable_slots')
      .select(`
        id,
        course_code,
        course_name,
        day_of_week,
        start_time,
        end_time,
        room_number,
        building,
        slot_type,
        lecturers ( full_name )
      `)
      .eq('program_timetable_id', programTimetable.id)
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time');

    if (slotsError) throw slotsError;
    if (!slots || slots.length === 0) {
      return { days: [], timeColumns: [], matrix: {} };
    }

    // ---------- Build unique time columns from real data ----------
    const timeSet = new Map(); // key = "start-end"

    slots.forEach((s) => {
      const start = String(s.start_time).slice(0, 5);
      const end = String(s.end_time).slice(0, 5);
      const key = `${start}-${end}`;
      if (!timeSet.has(key)) {
        timeSet.set(key, { start, end, label: `${formatTime(start)}-${formatTime(end)}` });
      }
    });

    // Sort time columns by start time
    const timeColumns = Array.from(timeSet.values()).sort(
      (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
    );

    // Fixed days
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const allDays = dayNames.map((name, idx) => ({
      name,
      dayOfWeek: idx + 1, // Admin uses 1=Mon … 6=Sat
    }));

    // ---------- Build matrix: matrix[dayOfWeek][timeKey] = lecture ----------
    const matrix = {};
    allDays.forEach((d) => {
      matrix[d.dayOfWeek] = {};
      timeColumns.forEach((tc) => {
        matrix[d.dayOfWeek][`${tc.start}-${tc.end}`] = null;
      });
    });

    slots.forEach((slot) => {
      const day = slot.day_of_week;
      if (day < 1 || day > 6) return;

      const start = String(slot.start_time).slice(0, 5);
      const end = String(slot.end_time).slice(0, 5);
      const key = `${start}-${end}`;

      if (matrix[day] && matrix[day][key] !== undefined) {
        matrix[day][key] = {
          courseCode: slot.course_code || 'N/A',
          courseName: slot.course_name || '',
          lecturer: slot.lecturers?.full_name || 'Not Assigned',
          room: slot.room_number
            ? `${slot.room_number}${slot.building ? ', ' + slot.building : ''}`
            : 'TBA',
          slotType: slot.slot_type === 'lab' ? 'LAB' : '',
          startTime: slot.start_time,
          endTime: slot.end_time,
        };
      }
    });

    // ---------- Only keep days that have at least one lecture ----------
    const days = allDays.filter((day) => {
      const daySlots = matrix[day.dayOfWeek] || {};
      return Object.values(daySlots).some((lecture) => lecture !== null);
    });

    return { days, timeColumns, matrix };
  }, [user?.email]);

  // ---------- cache ----------
  const {
    data: cached,
    loading,
    error,
    refetch,
  } = useCachedData(
    `timetable-grid-${user?.id || user?.email}`,
    fetchTimetableData,
    { ttl: 30 * 60 * 1000, enabled: !!user?.email, dependencies: [user?.email] }
  );

  useEffect(() => {
    if (cached) setGridData(cached);
  }, [cached]);

  // ---------- Loading / Error ----------
  if (loading) {
    return (
      <div style={{ padding: '24px', minHeight: '100vh', background: '#f8f9fa', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', marginTop: '10vh' }}>
          <div style={{ position: 'relative', width: '100px', height: '100px' }}>
            {/* Outer glow */}
            <div style={{
              position: 'absolute',
              top: '-8px',
              left: '-8px',
              width: '116px',
              height: '116px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(30,136,229,0.15) 0%, rgba(25,118,210,0.05) 50%, transparent 70%)',
              animation: 'timetablePulse 2s ease-in-out infinite'
            }}></div>
            
            {/* Outer ring */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: '3px solid transparent',
              borderTop: '3px solid #1e88e5',
              borderRight: '3px solid #1976d2',
              animation: 'timetableSpin 1.5s linear infinite'
            }}></div>
            
            {/* Inner ring */}
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              border: '3px solid transparent',
              borderBottom: '3px solid #43a047',
              borderLeft: '3px solid #fb8c00',
              animation: 'timetableSpinReverse 2s linear infinite'
            }}></div>
            
            {/* Center icon */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e88e5, #1976d2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(30,136,229,0.5), 0 0 40px rgba(25,118,210,0.3)',
              animation: 'timetableBounce 1.5s ease-in-out infinite'
            }}>
              <i className="fas fa-calendar-alt" style={{ color: 'white', fontSize: '16px' }}></i>
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '18px', color: '#1e293b', margin: 0, fontWeight: 600, letterSpacing: '0.5px' }}>
              Loading Timetable
            </p>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '6px 0 0 0' }}>
              Fetching your schedule...
            </p>
          </div>
          
          {/* Dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1e88e5', animation: 'timetableDots 1.2s ease-in-out infinite' }}></div>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1976d2', animation: 'timetableDots 1.2s ease-in-out 0.2s infinite' }}></div>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#43a047', animation: 'timetableDots 1.2s ease-in-out 0.4s infinite' }}></div>
          </div>
        </div>
        
        <style>{`
          @keyframes timetableSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes timetableSpinReverse {
            0% { transform: rotate(360deg); }
            100% { transform: rotate(0deg); }
          }
          @keyframes timetablePulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
          }
          @keyframes timetableBounce {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.08); }
          }
          @keyframes timetableDots {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.5); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content" style={{ padding: 16 }}>
        <h2>My Time Table</h2>
        <p style={{ color: '#d33' }}>{error.message || error}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  const { days: rawDays, timeColumns, matrix } = gridData;

  // Extra safety: filter again on the client so even old cached data is cleaned
  const days = (rawDays || []).filter((day) => {
    const daySlots = matrix?.[day.dayOfWeek] || {};
    return Object.values(daySlots).some((lecture) => lecture !== null);
  });

  // ---------- Render ----------
  return (
    <div className="content" style={{ padding: isMobile ? '12px 8px' : 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0 }}>My Time Table</h2>
          <div style={{ color: '#666', fontSize: 14 }}>
            Week of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
             <button
          onClick={() => {
            if (user?.id) {
              localStorage.removeItem(`timetable-grid-${user.id}`);
              localStorage.removeItem(`timetable-grid-${user.email}`);
            }
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('timetable-grid-')) {
                localStorage.removeItem(key);
              }
            });
            refetch();
          }}
          style={{
            width: '28px',
            height: '28px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            fontSize: '11px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
            e.currentTarget.style.transform = 'rotate(90deg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
            e.currentTarget.style.transform = 'rotate(0deg)';
          }}
          title="Refresh timetable"
        >
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      {days.length === 0 || timeColumns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: '#f8f9fa', borderRadius: 10 }}>
          <p>No timetable available for the current semester.</p>
        </div>
      ) : (
        <div className="table-container" style={{ overflowX: 'auto', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr>
                <th
                  style={{
                    background: '#1e88e5',
                    color: 'white',
                    padding: '12px 10px',
                    textAlign: 'left',
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                    minWidth: 100,
                  }}
                >
                  Day
                </th>
                {timeColumns.map((tc) => (
                  <th
                    key={tc.start + tc.end}
                    style={{
                      background: '#1e88e5',
                      color: 'white',
                      padding: '12px 10px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tc.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day, dayIdx) => (
                <tr key={day.dayOfWeek} style={{ background: dayIdx % 2 === 0 ? '#ffffff' : '#e3f2fd' }}>
                  <td
                    style={{
                      padding: '14px 12px',
                      fontWeight: 600,
                      borderBottom: '1px solid #e0e0e0',
                      position: 'sticky',
                      left: 0,
                      background: dayIdx % 2 === 0 ? '#ffffff' : '#e3f2fd',
                      zIndex: 1,
                    }}
                  >
                    {day.name}
                  </td>

                  {timeColumns.map((tc) => {
                    const key = `${tc.start}-${tc.end}`;
                    const lecture = matrix[day.dayOfWeek]?.[key];

                    return (
                      <td
                        key={key}
                        style={{
                          padding: 8,
                          borderBottom: '1px solid #e0e0e0',
                          verticalAlign: 'top',
                          minWidth: 160,
                        }}
                      >
                        {lecture ? (
                          <div
                            style={{
                              background: lecture.slotType === 'LAB' ? '#fff5f5' : '#f0f7ff',
                              borderLeft: `4px solid ${lecture.slotType === 'LAB' ? '#e74c3c' : '#3498db'}`,
                              borderRadius: 6,
                              padding: '10px 8px',
                              fontSize: 13,
                              lineHeight: 1.35,
                            }}
                          >
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>
                              {lecture.courseCode}
                              {lecture.slotType && (
                                <span style={{ color: '#e74c3c', marginLeft: 4, fontSize: 11 }}>
                                  {lecture.slotType}
                                </span>
                              )}
                            </div>
                            <div style={{ color: '#555', fontSize: 12, marginBottom: 2 }}>
                              {lecture.courseName}
                            </div>
                            <div style={{ color: '#666', fontSize: 12 }}>
                              {lecture.lecturer}
                            </div>
                            <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
                              {lecture.room}
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: '#ccc', textAlign: 'center', padding: 12 }}>—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default Timetable;