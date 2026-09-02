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
      <div className="content" style={{ padding: 16 }}>
        <h2>My Time Table</h2>
        <div style={{ display: 'flex', justifyContent: 'center', height: 200, alignItems: 'center' }}>
          <div className="timetable-spinner" />
        </div>
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
          onClick={() => refetch()}
          style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            padding: '8px 14px',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          <i className="fas fa-sync-alt"></i> Refresh
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

      <style>{`
        .timetable-spinner {
          width: 40px; height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .table-container::-webkit-scrollbar { height: 8px; }
        .table-container::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default Timetable;