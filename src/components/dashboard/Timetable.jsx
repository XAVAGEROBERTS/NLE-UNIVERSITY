import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';

const Timetable = () => {
  const [timetableData, setTimetableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useStudentAuth();

  useEffect(() => {
    if (user?.email) {
      fetchTimetable();
    }
  }, [user]);

  const fetchTimetable = async () => {
    try {
      setLoading(true);

      // Get student data
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, academic_year, semester')
        .eq('email', user.email)
        .single();

      if (studentError) throw studentError;

      // Fetch student's enrolled courses
      const { data: studentCourses, error: coursesError } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', student.id)
        .in('status', ['enrolled', 'in_progress']);

      if (coursesError) throw coursesError;

      const courseIds = studentCourses.map(sc => sc.course_id);

      if (courseIds.length === 0) {
        setTimetableData([]);
        setLoading(false);
        return;
      }

      // Fetch timetable slots for these courses
      const { data: timetableSlots, error: timetableError } = await supabase
        .from('timetable_slots')
        .select(`
          *,
          courses (course_code, course_name),
          lecturers (full_name)
        `)
        .in('course_id', courseIds)
        .eq('academic_year', student.academic_year)
        .eq('semester', student.semester)
        .eq('is_active', true)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (timetableError) throw timetableError;

      // Group timetable by time slots
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
        dayNames.forEach((day, dayIndex) => {
          row[day.toLowerCase()] = '';
        });
        return row;
      });

      // Populate timetable with data
      timetableSlots.forEach(slot => {
        const dayName = dayNames[slot.day_of_week]?.toLowerCase();
        if (!dayName) return;

        const startHour = parseInt(slot.start_time.split(':')[0]);
        const endHour = parseInt(slot.end_time.split(':')[0]);
        
        // Find matching time slots
        for (let hour = startHour; hour < endHour; hour++) {
          const timeSlot = `${hour}:00 - ${hour + 1}:00`;
          const rowIndex = timeSlots.findIndex(ts => ts === timeSlot);
          
          if (rowIndex !== -1) {
            const courseCode = slot.courses?.course_code || 'N/A';
            const courseName = slot.courses?.course_name || 'Unknown Course';
            const room = slot.room_number || 'TBA';
            const slotType = slot.slot_type === 'lab' ? 'LAB' : '';
            
            const existing = timetable[rowIndex][dayName];
            if (!existing) {
              timetable[rowIndex][dayName] = 
                `${courseCode} (${courseName})<br>${room} ${slotType}`;
            }
          }
        }
      });

      setTimetableData(timetable);
    } catch (error) {
      console.error('Error fetching timetable:', error);
      setTimetableData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="content">
        <div className="dashboard-header">
          <h2>My Time Table</h2>
          <div className="date-display">Loading timetable...</div>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="dashboard-header">
        <h2>My Time Table</h2>
        <div className="date-display">
          Week: {new Date().toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </div>
      </div>

      {timetableData.length === 0 ? (
        <div className="no-timetable">
          <p>No timetable available for the current semester.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Monday</th>
                <th>Tuesday</th>
                <th>Wednesday</th>
                <th>Thursday</th>
                <th>Friday</th>
                <th>Saturday</th>
              </tr>
            </thead>
            <tbody>
              {timetableData.map((row, index) => (
                <tr key={index}>
                  <td>{row.time}</td>
                  <td dangerouslySetInnerHTML={{ __html: row.monday }}></td>
                  <td dangerouslySetInnerHTML={{ __html: row.tuesday }}></td>
                  <td dangerouslySetInnerHTML={{ __html: row.wednesday }}></td>
                  <td dangerouslySetInnerHTML={{ __html: row.thursday }}></td>
                  <td dangerouslySetInnerHTML={{ __html: row.friday }}></td>
                  <td dangerouslySetInnerHTML={{ __html: row.saturday }}></td>
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