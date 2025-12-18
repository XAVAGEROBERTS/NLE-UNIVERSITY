import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { supabase } from '../../services/supabase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  LineController
} from 'chart.js';

ChartJS.register(
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const { user } = useStudentAuth();
  const [loading, setLoading] = useState(true);
  const [showAdminControls, setShowAdminControls] = useState(false);
  const [attendanceData, setAttendanceData] = useState([1, 1, 0, 1, 1]);
  const [dashboardStats, setDashboardStats] = useState({
    programProgress: 85,
    pendingAssignments: 3,
    upcomingExams: 2,
    financialPaid: 7500,
    financialBalance: 2550,
    cgpa: 4.5,
    attendanceRate: 80
  });
  const [upcomingLectures, setUpcomingLectures] = useState([]);
  const [studentDetails, setStudentDetails] = useState(null);
  const [chartError, setChartError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const calendarContainerRef = useRef(null);
  const chartRef = useRef(null);
  const chartCanvasRef = useRef(null);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate GPA from completed courses
  const calculateGPA = (studentCourses) => {
    if (!studentCourses || studentCourses.length === 0) return 0;
    
    const completedCourses = studentCourses.filter(
      course => course.status === 'completed' && course.grade_points
    );
    
    if (completedCourses.length === 0) return 0;
    
    const totalPoints = completedCourses.reduce(
      (sum, course) => sum + (course.grade_points * course.credits), 
      0
    );
    
    const totalCredits = completedCourses.reduce(
      (sum, course) => sum + course.credits, 
      0
    );
    
    return totalCredits > 0 ? totalPoints / totalCredits : 0;
  };

  // Determine program duration based on program type
  const getProgramDuration = (program) => {
    if (!program) return { years: 4, semesters: 8 };
    
    const programLower = program.toLowerCase();
    
    if (programLower.includes('bachelor of science in computer engineering')) {
      return { years: 4, semesters: 8 };
    } else if (programLower.includes('bachelor of science in computer science')) {
      return { years: 3, semesters: 6 };
    } else if (programLower.includes('bachelor of science in software engineering')) {
      return { years: 4, semesters: 8 };
    } else if (programLower.includes('bachelor of information technology')) {
      return { years: 3, semesters: 6 };
    } else if (programLower.includes('diploma')) {
      return { years: 2, semesters: 4 };
    } else if (programLower.includes('certificate')) {
      return { years: 1, semesters: 2 };
    } else if (programLower.includes('master') || programLower.includes('msc') || programLower.includes('m.eng')) {
      return { years: 2, semesters: 4 };
    } else if (programLower.includes('phd') || programLower.includes('doctor')) {
      return { years: 3, semesters: 6 };
    }
    
    return { years: 4, semesters: 8 };
  };

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        if (!user?.email) {
          console.error('No user logged in');
          setLoading(false);
          return;
        }

        // 1. Fetch complete student details
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('email', user.email)
          .single();

        if (studentError) throw studentError;
        if (!student) throw new Error('Student not found');

        setStudentDetails(student);

        // 2. Fetch student's courses with grades for GPA calculation
        const { data: studentCourses, error: coursesError } = await supabase
          .from('student_courses')
          .select(`
            *,
            courses (
              id,
              credits
            )
          `)
          .eq('student_id', student.id);

        if (!coursesError && studentCourses) {
          const coursesWithGrades = studentCourses.map(sc => ({
            ...sc,
            credits: sc.courses?.credits || 3,
            grade_points: sc.grade_points || 0
          }));
          
          const gpa = calculateGPA(coursesWithGrades);
          
          // 3. Calculate program progress
          const programDuration = getProgramDuration(student.program);
          const calculateProgramProgress = () => {
            const completedSemesters = ((student.year_of_study - 1) * 2) + (student.semester - 1);
            const progress = (completedSemesters / programDuration.semesters) * 100;
            return Math.min(Math.round(progress), 85);
          };

          // 4. Fetch attendance data
          const { data: attendanceRecords, error: attendanceError } = await supabase
            .from('attendance_records')
            .select('date, status')
            .eq('student_id', student.id)
            .order('date', { ascending: false })
            .limit(5);

          let attendanceArray = [1, 1, 0, 1, 1];
          
          if (!attendanceError && attendanceRecords && attendanceRecords.length > 0) {
            attendanceArray = attendanceRecords.reverse().map(record => 
              record.status === 'present' ? 1 : 0
            );
          }

          // 5. Fetch pending assignments
          const { data: assignments } = await supabase
            .from('assignments')
            .select('id, due_date')
            .eq('status', 'published')
            .gt('due_date', new Date().toISOString());

          // 6. Fetch upcoming exams
          const { data: exams } = await supabase
            .from('examinations')
            .select('id, start_time')
            .eq('status', 'published')
            .gt('start_time', new Date().toISOString());

          // 7. Fetch financial summary
          const { data: financial } = await supabase
            .from('financial_records')
            .select('amount, balance_due, status, academic_year')
            .eq('student_id', student.id)
            .eq('academic_year', student.academic_year);

          let financialSummary = { paid: 0, balance: 0 };
          if (financial) {
            financialSummary = {
              paid: financial
                .filter(f => f.status === 'paid')
                .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0),
              balance: financial
                .filter(f => f.status === 'partial')
                .reduce((sum, f) => sum + parseFloat(f.balance_due || 0), 0) +
                financial
                  .filter(f => f.status === 'pending')
                  .reduce((sum, f) => sum + parseFloat(f.amount || 0), 0)
            };
          }

          // 8. Fetch upcoming lectures for the week
          const today = new Date();
          const nextWeek = new Date();
          nextWeek.setDate(today.getDate() + 7);

          const { data: lectures } = await supabase
            .from('lectures')
            .select(`
              *,
              courses (course_code, course_name),
              lecturers (full_name)
            `)
            .gte('scheduled_date', today.toISOString().split('T')[0])
            .lte('scheduled_date', nextWeek.toISOString().split('T')[0])
            .in('status', ['scheduled', 'ongoing'])
            .order('scheduled_date', { ascending: true })
            .order('start_time', { ascending: true });

          let formattedLectures = [];
          if (lectures) {
            formattedLectures = lectures.map(lecture => {
              const startTime = lecture.start_time || '09:00';
              const endTime = lecture.end_time || '11:00';
              const startDate = new Date(`2000-01-01T${startTime}`);
              const endDate = new Date(`2000-01-01T${endTime}`);
              const duration = Math.round((endDate - startDate) / 60000);
              
              return {
                id: lecture.id,
                title: lecture.courses?.course_name || lecture.title || 'Untitled Lecture',
                date: lecture.scheduled_date,
                time: startTime,
                endTime: endTime,
                lecturer: lecture.lecturers?.full_name || 'Unknown Lecturer',
                duration: duration,
                courseCode: lecture.courses?.course_code || 'N/A',
                google_meet_link: lecture.google_meet_link,
                status: lecture.status
              };
            });
          }

          // Update all states
          setDashboardStats({
            programProgress: calculateProgramProgress(),
            pendingAssignments: assignments?.length || 0,
            upcomingExams: exams?.length || 0,
            financialPaid: financialSummary.paid,
            financialBalance: financialSummary.balance,
            cgpa: parseFloat(gpa.toFixed(2)),
            attendanceRate: Math.round((attendanceArray.filter(val => val === 1).length / attendanceArray.length) * 100)
          });

          setAttendanceData(attendanceArray);
          setUpcomingLectures(formattedLectures);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setDashboardStats({
          programProgress: 85,
          pendingAssignments: 3,
          upcomingExams: 2,
          financialPaid: 7500,
          financialBalance: 2550,
          cgpa: 4.5,
          attendanceRate: 80
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Initialize attendance chart
  const initializeAttendanceChart = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = chartCanvasRef.current;
    if (!ctx) return false;

    try {
      const labels = [];
      for (let i = 4; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      }

      const chart = new ChartJS(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Attendance',
            data: attendanceData,
            backgroundColor: 'rgba(46, 204, 113, 0.3)',
            borderColor: 'rgba(46, 204, 113, 1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: attendanceData.map(val => 
              val === 1 ? 'rgba(46, 204, 113, 1)' : 'rgba(231, 76, 60, 1)'
            ),
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.parsed.y === 1 ? 'Present' : 'Absent';
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 1,
              ticks: {
                stepSize: 1,
                callback: function(value) {
                  return value === 1 ? 'Present' : 'Absent';
                }
              },
              grid: { drawBorder: false }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });

      chartRef.current = chart;
      return true;
    } catch (error) {
      console.error('Error creating chart:', error);
      return false;
    }
  }, [attendanceData]);

  // Initialize calendar
  const initializeCalendar = useCallback(() => {
    if (!calendarContainerRef.current) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    let calendarHTML = `
      <div class="calendar-header" style="margin-bottom: 15px;">
        <h4 style="margin: 0; font-size: clamp(1rem, 2.5vw, 1.2rem);">${monthNames[currentMonth]} ${currentYear}</h4>
      </div>
      <div style="overflow-x: auto;">
        <table class="calendar-table" style="width: 100%; border-collapse: collapse; min-width: 300px;">
          <thead>
            <tr>
    `;
    
    dayNames.forEach(day => {
      calendarHTML += `<th style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd; color: #666; font-size: clamp(0.7rem, 2vw, 0.85rem);">${day}</th>`;
    });
    
    calendarHTML += `
            </tr>
          </thead>
          <tbody>
    `;
    
    let day = 1;
    let startingCell = firstDay.getDay();
    
    for (let row = 0; row < 6; row++) {
      calendarHTML += '<tr>';
      
      for (let col = 0; col < 7; col++) {
        if (row === 0 && col < startingCell) {
          calendarHTML += '<td style="padding: 8px;"></td>';
        } else if (day > lastDay.getDate()) {
          calendarHTML += '<td style="padding: 8px;"></td>';
        } else {
          const isToday = day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
          const cellClass = isToday ? 'current-day' : '';
          calendarHTML += `<td style="padding: 8px; text-align: center; height: clamp(35px, 8vw, 40px); cursor: pointer;" class="${cellClass}">${day}</td>`;
          day++;
        }
      }
      
      calendarHTML += '</tr>';
      
      if (day > lastDay.getDate()) {
        break;
      }
    }
    
    calendarHTML += `
          </tbody>
        </table>
      </div>
    `;
    
    calendarContainerRef.current.innerHTML = calendarHTML;
  }, []);

  // Handle attendance toggle
  const handleToggleDayAttendance = useCallback((index) => {
    if (!studentDetails?.id) return;

    const newData = [...attendanceData];
    newData[index] = newData[index] === 1 ? 0 : 1;
    
    const date = new Date();
    date.setDate(date.getDate() - (4 - index));
    
    supabase
      .from('attendance_records')
      .upsert({
        student_id: studentDetails.id,
        date: date.toISOString().split('T')[0],
        status: newData[index] === 1 ? 'present' : 'absent',
        day_of_week: date.getDay(),
        recorded_by: studentDetails.id
      }, {
        onConflict: 'student_id, date'
      })
      .then(({ error }) => {
        if (error) {
          console.error('Error updating attendance:', error);
        } else {
          setAttendanceData(newData);
        }
      });
  }, [attendanceData, studentDetails]);

  // Save attendance changes
  const saveAttendanceChanges = useCallback(() => {
    alert('Attendance updated successfully!');
    setShowAdminControls(false);
  }, []);

  // Initialize chart
  useEffect(() => {
    if (!loading && chartCanvasRef.current) {
      const chartCreated = initializeAttendanceChart();
      if (!chartCreated) {
        setChartError('Failed to create attendance chart. Please refresh the page.');
      } else {
        setChartError(null);
      }
    }
  }, [loading, initializeAttendanceChart]);

  // Initialize calendar
  useEffect(() => {
    if (!loading) {
      initializeCalendar();
    }
  }, [loading, initializeCalendar]);

  // Helper functions
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'TBD';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const calculateAttendanceStats = (data) => {
    const presentDays = data.filter(day => day === 1).length;
    const rate = Math.round((presentDays / data.length) * 100);
    return {
      presentDays,
      rate,
      summary: `Last ${data.length} lecture days: ${rate}% (${presentDays}/${data.length} days)`
    };
  };

  const attendanceStats = calculateAttendanceStats(attendanceData);

  const addToCalendar = (lecture) => {
    const event = {
      title: `${lecture.courseCode} - ${lecture.title}`,
      start: new Date(`${lecture.date}T${lecture.time}`),
      end: new Date(`${lecture.date}T${lecture.endTime}`),
      description: `Lecture by ${lecture.lecturer}`,
      location: lecture.google_meet_link || 'Online'
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

  // Render mobile-friendly lecture cards
  const renderMobileLectureCards = () => {
    return upcomingLectures.map((lecture) => (
      <div 
        key={lecture.id}
        className="mobile-lecture-card"
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          borderLeft: '4px solid #3498db'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
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
            backgroundColor: new Date(lecture.date) < new Date() ? '#fff9e6' : '#f8f9fa',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}>
            {formatDate(lecture.date)}
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
              {formatTime(lecture.time)} - {formatTime(lecture.endTime)}
            </p>
          </div>
          <div>
            <p style={{ 
              margin: '0 0 4px 0',
              fontSize: '12px',
              color: '#999',
              textTransform: 'uppercase'
            }}>
              Duration
            </p>
            <p style={{ 
              margin: '0',
              fontSize: '14px',
              fontWeight: '500',
              color: '#333'
            }}>
              {lecture.duration} min
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
          <div>
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
              color: '#555'
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
              whiteSpace: 'nowrap'
            }}
          >
            <i className="fas fa-calendar-plus"></i> Add
          </button>
        </div>
      </div>
    ));
  };

  // Render desktop table
  const renderDesktopTable = () => (
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
            }}>Duration</th>
            <th style={{ 
              padding: 'clamp(12px, 2.5vw, 15px)', 
              textAlign: 'left', 
              borderBottom: '2px solid #dee2e6',
              fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
              whiteSpace: 'nowrap'
            }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {upcomingLectures.map((lecture) => (
            <tr 
              key={lecture.id}
              style={{ 
                borderBottom: '1px solid #e9ecef',
                backgroundColor: new Date(lecture.date) < new Date() ? '#fff9e6' : 'white'
              }}
            >
              <td style={{ 
                padding: 'clamp(12px, 2.5vw, 15px)',
                fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
              }}>
                <div style={{ fontWeight: '500', whiteSpace: 'nowrap' }}>{formatDate(lecture.date)}</div>
                {new Date(lecture.date) < new Date() && (
                  <span style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', color: '#e74c3c' }}>Today</span>
                )}
              </td>
              <td style={{ 
                padding: 'clamp(12px, 2.5vw, 15px)',
                fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
              }}>
                <div style={{ whiteSpace: 'nowrap' }}>{formatTime(lecture.time)}</div>
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
                {lecture.duration} min
              </td>
              <td style={{ 
                padding: 'clamp(12px, 2.5vw, 15px)',
                fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
              }}>
                <button 
                  className="add-calendar"
                  onClick={() => addToCalendar(lecture)}
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
                    justifyContent: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <i className="fas fa-calendar-plus"></i> Calendar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-spinner" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div className="spinner" style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '20px', color: '#666' }}>Loading dashboard...</p>
      </div>
    );
  }

  // Get student name from database or context
  const studentName = studentDetails?.full_name || user?.name || 'Student';
  const programDuration = getProgramDuration(studentDetails?.program);

  return (
    <div className="content" style={{ padding: 'clamp(10px, 3vw, 20px)' }}>
      {/* Dashboard Header */}
      <div className="dashboard-header" style={{
        marginBottom: 'clamp(20px, 4vw, 30px)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <h2 style={{ 
            margin: '0',
            fontSize: 'clamp(1.3rem, 4vw, 1.8rem)',
            lineHeight: '1.2'
          }}>
            {getGreeting()}, {studentName}
          </h2>
          <div className="date-display" style={{ 
            color: '#666', 
            fontSize: 'clamp(0.85rem, 2.5vw, 1rem)'
          }}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>

      {/* Dashboard Cards - Responsive Grid */}
      <div className="dashboard-cards" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))',
        gap: 'clamp(15px, 3vw, 20px)',
        marginBottom: 'clamp(20px, 4vw, 30px)'
      }}>
        {/* Program Progress Card */}
        <div className="card" style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          padding: 'clamp(15px, 3vw, 20px)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          <div className="card-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '15px'
          }}>
            <h3 className="card-title" style={{ 
              margin: '0',
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
              color: '#333'
            }}>
              My Program
            </h3>
            <div className="card-icon primary" style={{
              width: 'clamp(36px, 8vw, 44px)',
              height: 'clamp(36px, 8vw, 44px)',
              borderRadius: '50%',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-graduation-cap" style={{ color: '#3498db', fontSize: 'clamp(16px, 3vw, 20px)' }}></i>
            </div>
          </div>
          <div className="card-content" style={{ flex: '1' }}>
            <h3 style={{ 
              margin: '0 0 clamp(8px, 2vw, 12px) 0', 
              fontSize: 'clamp(0.95rem, 2.2vw, 1.1rem)',
              color: '#333',
              lineHeight: '1.3'
            }}>
              {studentDetails?.program || 'Bachelor of Science in Computer Engineering'}
            </h3>
            <p style={{ 
              margin: '4px 0',
              fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
              color: '#555'
            }}>
              Duration: {programDuration.years} years ({programDuration.semesters} semesters)
            </p>
            <p style={{ 
              margin: '4px 0',
              fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
              color: '#555'
            }}>
              Intake: <span id="intakeType">{studentDetails?.intake || 'August'}</span>
            </p>
            <p style={{ 
              margin: '4px 0',
              fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
              color: '#555'
            }}>
              Academic Year: <span id="academicYear">{studentDetails?.academic_year || '2024/2025'}</span>
            </p>
            <div className="course-progress" style={{ marginTop: 'clamp(12px, 2.5vw, 15px)' }}>
              <p style={{ 
                margin: '4px 0',
                fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
                color: '#555'
              }}>
                Progress: Year <span id="currentYear" style={{ fontWeight: '600' }}>{studentDetails?.year_of_study || 4}</span>, 
                Semester <span id="currentSemester" style={{ fontWeight: '600' }}>{studentDetails?.semester || 2}</span> 
                (<span id="progressPercentage" style={{ fontWeight: '600' }}>{dashboardStats.programProgress}</span>%)
              </p>
              <div className="progress-bar" style={{
                height: 'clamp(6px, 1.5vw, 8px)',
                backgroundColor: '#e9ecef',
                borderRadius: '4px',
                overflow: 'hidden',
                margin: 'clamp(8px, 2vw, 10px) 0'
              }}>
                <div 
                  className="progress-fill" 
                  id="progressFill" 
                  style={{ 
                    width: `${dashboardStats.programProgress}%`,
                    height: '100%',
                    backgroundColor: '#3498db',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Card */}
        <div className="card" style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          padding: 'clamp(15px, 3vw, 20px)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          <div className="card-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '15px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 className="card-title" style={{ 
                margin: '0',
                fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
                color: '#333'
              }}>
                Lecture Attendance
              </h3>
              <div className="card-icon success" style={{
                width: 'clamp(36px, 8vw, 44px)',
                height: 'clamp(36px, 8vw, 44px)',
                borderRadius: '50%',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="fas fa-user-check" style={{ color: '#2ecc71', fontSize: 'clamp(16px, 3vw, 20px)' }}></i>
              </div>
            </div>
            <button 
              className="btn btn-sm btn-warning" 
              onClick={() => setShowAdminControls(!showAdminControls)}
              style={{
                backgroundColor: '#ffc107',
                color: '#212529',
                border: 'none',
                padding: 'clamp(6px, 1.5vw, 8px) clamp(10px, 2vw, 12px)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                flexShrink: '0',
                display: showAdminControls ? 'flex' : 'none'

              }}
            >
              <i className="fas fa-edit"></i> {showAdminControls ? 'Hide Controls' : 'Edit'}
            </button>
          </div>
          <div className="card-content" style={{ flex: '1' }}>
            <p id="attendanceSummary" style={{ 
              marginBottom: 'clamp(12px, 2.5vw, 15px)', 
              fontWeight: '500',
              fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
              lineHeight: '1.4'
            }}>
              {attendanceStats.summary}
            </p>
            
            {chartError ? (
              <div style={{
                height: 'clamp(180px, 40vw, 200px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                color: '#dc3545',
                flexDirection: 'column',
                gap: '10px',
                padding: '20px'
              }}>
                <p style={{ 
                  textAlign: 'center',
                  fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                }}>{chartError}</p>
                <button 
                  onClick={() => {
                    setChartError(null);
                    const chartCreated = initializeAttendanceChart();
                    if (!chartCreated) {
                      setChartError('Still having issues. Please refresh the page.');
                    }
                  }}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: 'clamp(8px, 1.5vw, 10px) clamp(12px, 2vw, 16px)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: 'clamp(0.8rem, 1.8vw, 0.9rem)'
                  }}
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="attendance-chart" style={{ 
                height: 'clamp(180px, 40vw, 200px)', 
                position: 'relative' 
              }}>
                <canvas 
                  ref={chartCanvasRef}
                  id="attendanceChart"
                ></canvas>
              </div>
            )}
            
            {/* Admin controls */}
            {showAdminControls && (
              <div id="adminControls" className="admin-controls" style={{
                backgroundColor: '#f8f9fa',
                padding: 'clamp(12px, 2.5vw, 15px)',
                borderRadius: '8px',
                marginTop: 'clamp(12px, 2.5vw, 15px)',
                border: '1px solid #e9ecef'
              }}>
                <p className="text-muted" style={{ 
                  color: '#6c757d', 
                  marginBottom: '10px',
                  fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                }}>
                  Toggle days attended:
                </p>
                <div className="day-toggles" style={{
                  display: 'flex',
                  gap: 'clamp(6px, 1.5vw, 8px)',
                  margin: '10px 0',
                  flexWrap: 'wrap'
                }}>
                  {attendanceData.map((attendance, index) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (attendanceData.length - 1 - index));
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    
                    return (
                      <button
                        key={index}
                        className={`day-toggle ${attendance === 1 ? 'btn-present' : 'btn-absent'}`}
                        onClick={() => handleToggleDayAttendance(index)}
                        style={{
                          padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 2vw, 16px)',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          transition: 'all 0.3s ease',
                          backgroundColor: attendance === 1 ? '#2ecc71' : '#e74c3c',
                          color: 'white',
                          flex: '1 0 auto',
                          minWidth: '60px',
                          fontSize: 'clamp(0.8rem, 1.8vw, 0.9rem)'
                        }}
                      >
                        {dayName}
                      </button>
                    );
                  })}
                </div>
                <button 
                  id="saveAttendance" 
                  className="btn btn-success mt-2"
                  onClick={saveAttendanceChanges}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: 'clamp(8px, 1.5vw, 10px) clamp(12px, 2vw, 16px)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    marginTop: '10px',
                    width: '100%',
                    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                  }}
                >
                  <i className="fas fa-save"></i> Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Calendar Card */}
        <div className="card" style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          padding: 'clamp(15px, 3vw, 20px)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: '300px'
        }}>
          <div className="card-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '15px'
          }}>
            <h3 className="card-title" style={{ 
              margin: '0',
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
              color: '#333'
            }}>
              Academic Calendar
            </h3>
            <div className="card-icon secondary" style={{
              width: 'clamp(36px, 8vw, 44px)',
              height: 'clamp(36px, 8vw, 44px)',
              borderRadius: '50%',
              backgroundColor: 'rgba(155, 89, 182, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-calendar-alt" style={{ color: '#9b59b6', fontSize: 'clamp(16px, 3vw, 20px)' }}></i>
            </div>
          </div>
          <div 
            className="card-content" 
            id="calendarContainer"
            ref={calendarContainerRef}
            style={{ flex: '1', display: 'flex', flexDirection: 'column' }}
          >
            {/* Calendar will be inserted here */}
          </div>
        </div>
      </div>

      {/* Quick Stats Row - Responsive Grid */}
      <div className="stats-row" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
        gap: 'clamp(12px, 2.5vw, 15px)',
        marginTop: 'clamp(20px, 4vw, 30px)',
        marginBottom: 'clamp(20px, 4vw, 30px)'
      }}>
        {/* Pending Assignments */}
        <div className="stat-card" style={{
          backgroundColor: 'white',
          padding: 'clamp(15px, 3vw, 20px)',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ 
                margin: '0 0 5px 0', 
                color: '#666',
                fontSize: 'clamp(0.9rem, 2.2vw, 1rem)'
              }}>
                Pending Assignments
              </h4>
              <p style={{ 
                margin: 0, 
                fontSize: 'clamp(1.5rem, 4vw, 1.8rem)', 
                fontWeight: 'bold', 
                color: '#e74c3c' 
              }}>
                {dashboardStats.pendingAssignments}
              </p>
              {dashboardStats.pendingAssignments > 0 && (
                <p style={{ 
                  margin: '5px 0 0 0', 
                  fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', 
                  color: '#666' 
                }}>
                  Due soon
                </p>
              )}
            </div>
            <div style={{
              width: 'clamp(36px, 8vw, 44px)',
              height: 'clamp(36px, 8vw, 44px)',
              borderRadius: '50%',
              backgroundColor: '#ffebee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: '0'
            }}>
              <i className="fas fa-tasks" style={{ 
                color: '#e74c3c', 
                fontSize: 'clamp(16px, 3vw, 20px)' 
              }}></i>
            </div>
          </div>
        </div>

        {/* Upcoming Exams */}
        <div className="stat-card" style={{
          backgroundColor: 'white',
          padding: 'clamp(15px, 3vw, 20px)',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ 
                margin: '0 0 5px 0', 
                color: '#666',
                fontSize: 'clamp(0.9rem, 2.2vw, 1rem)'
              }}>
                Upcoming Exams
              </h4>
              <p style={{ 
                margin: 0, 
                fontSize: 'clamp(1.5rem, 4vw, 1.8rem)', 
                fontWeight: 'bold', 
                color: '#3498db' 
              }}>
                {dashboardStats.upcomingExams}
              </p>
              {dashboardStats.upcomingExams > 0 && (
                <p style={{ 
                  margin: '5px 0 0 0', 
                  fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', 
                  color: '#666' 
                }}>
                  This week
                </p>
              )}
            </div>
            <div style={{
              width: 'clamp(36px, 8vw, 44px)',
              height: 'clamp(36px, 8vw, 44px)',
              borderRadius: '50%',
              backgroundColor: '#e3f2fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: '0'
            }}>
              <i className="fas fa-clipboard-list" style={{ 
                color: '#3498db', 
                fontSize: 'clamp(16px, 3vw, 20px)' 
              }}></i>
            </div>
          </div>
        </div>

        {/* Fees Paid */}
        <div className="stat-card" style={{
          backgroundColor: 'white',
          padding: 'clamp(15px, 3vw, 20px)',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ 
                margin: '0 0 5px 0', 
                color: '#666',
                fontSize: 'clamp(0.9rem, 2.2vw, 1rem)'
              }}>
                Fees Paid
              </h4>
              <p style={{ 
                margin: 0, 
                fontSize: 'clamp(1.5rem, 4vw, 1.8rem)', 
                fontWeight: 'bold', 
                color: '#27ae60' 
              }}>
                ${dashboardStats.financialPaid.toLocaleString()}
              </p>
              <p style={{ 
                margin: '5px 0 0 0', 
                fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', 
                color: '#666' 
              }}>
                Balance: ${dashboardStats.financialBalance.toLocaleString()}
              </p>
            </div>
            <div style={{
              width: 'clamp(36px, 8vw, 44px)',
              height: 'clamp(36px, 8vw, 44px)',
              borderRadius: '50%',
              backgroundColor: '#e8f6ef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: '0'
            }}>
              <i className="fas fa-money-bill-wave" style={{ 
                color: '#27ae60', 
                fontSize: 'clamp(16px, 3vw, 20px)' 
              }}></i>
            </div>
          </div>
        </div>

        {/* Current CGPA */}
        <div className="stat-card" style={{
          backgroundColor: 'white',
          padding: 'clamp(15px, 3vw, 20px)',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ 
                margin: '0 0 5px 0', 
                color: '#666',
                fontSize: 'clamp(0.9rem, 2.2vw, 1rem)'
              }}>
                Current CGPA
              </h4>
              <p style={{ 
                margin: 0, 
                fontSize: 'clamp(1.5rem, 4vw, 1.8rem)', 
                fontWeight: 'bold', 
                color: '#9b59b6' 
              }}>
                {dashboardStats.cgpa.toFixed(2)}
              </p>
            </div>
            <div style={{
              width: 'clamp(36px, 8vw, 44px)',
              height: 'clamp(36px, 8vw, 44px)',
              borderRadius: '50%',
              backgroundColor: '#f3e5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: '0'
            }}>
              <i className="fas fa-chart-line" style={{ 
                color: '#9b59b6', 
                fontSize: 'clamp(16px, 3vw, 20px)' 
              }}></i>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Lectures - Responsive View */}
      <div className="upcoming-lectures" style={{ 
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
            fontSize: 'clamp(1.1rem, 2.8vw, 1.3rem)'
          }}>
            Upcoming Lectures This Week
          </h3>
          <span style={{ 
            fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', 
            color: '#666',
            whiteSpace: 'nowrap'
          }}>
            {upcomingLectures.length} lecture{upcomingLectures.length !== 1 ? 's' : ''} found
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
            <p style={{ margin: '0 0 10px 0' }}>No upcoming lectures scheduled for this week.</p>
            <p style={{ fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', color: '#999' }}>
              Check back later for updates
            </p>
          </div>
        ) : isMobile ? (
          // Mobile View: Compact Cards
          <div className="mobile-lectures-container">
            {renderMobileLectureCards()}
          </div>
        ) : (
          // Desktop View: Full Table
          renderDesktopTable()
        )}
      </div>

      {/* Responsive CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .current-day {
          background-color: #3498db !important;
          color: white !important;
          border-radius: 50%;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: clamp(30px, 7vw, 36px) !important;
          height: clamp(30px, 7vw, 36px) !important;
          margin: 0 auto;
        }
        
        .calendar-table td:hover {
          background-color: #f5f5f5;
        }
        
        /* Mobile-specific optimizations */
        @media (max-width: 768px) {
          .dashboard-cards {
            grid-template-columns: 1fr;
          }
          
          .stats-row {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .card-header {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 12px;
          }
          
          .card-header button {
            width: 100%;
            justify-content: center;
          }
          
          .mobile-lecture-card:hover {
            transform: translateY(-2px);
            transition: transform 0.3s ease;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          }
        }
        
        @media (max-width: 480px) {
          .stats-row {
            grid-template-columns: 1fr;
          }
          
          .day-toggles button {
            flex: 1 0 45%;
          }
          
          .mobile-lecture-card {
            padding: 14px;
          }
        }
        
        /* Table responsive behavior */
        @media (max-width: 768px) {
          table {
            font-size: 14px;
          }
          
          table td, table th {
            padding: 10px 8px;
          }
        }
        
        /* Hover effects for desktop */
        @media (hover: hover) {
          .stat-card:hover {
            transform: translateY(-2px);
            transition: transform 0.3s ease;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          }
          
          .card:hover {
            transform: translateY(-2px);
            transition: transform 0.3s ease;
            box-shadow: 0 8px 25px rgba(0,0,0,0.12);
          }
          
          .add-calendar:hover,
          .mobile-lecture-card button:hover {
            background-color: #007bff !important;
            color: white !important;
            border-color: #007bff !important;
            transition: all 0.3s ease;
          }
        }
        
        /* Remove blue focus outlines and use better ones */
        button:focus {
          outline: 2px solid #3498db;
          outline-offset: 2px;
        }
        
        /* Improve touch targets on mobile */
        @media (max-width: 768px) {
          button, .add-calendar {
            min-height: 44px;
            min-width: 44px;
          }
          
          table td {
            padding: 12px 8px !important;
          }
        }
        
        /* Loading spinner */
        .spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;