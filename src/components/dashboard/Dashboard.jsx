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

  const calendarContainerRef = useRef(null);
  const chartRef = useRef(null);
  const chartCanvasRef = useRef(null);

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

 // ============ REPLACE YOUR EXISTING getProgramDuration FUNCTION WITH THIS ============
  // Determine program duration based on program type
  const getProgramDuration = (program) => {
    if (!program) return { years: 4, semesters: 8 };
    
    const programLower = program.toLowerCase();
    
    // Match the exact program names
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
    
    return { years: 4, semesters: 8 }; // Default
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

        console.log('Fetching dashboard data for:', user.email);

        // 1. Fetch complete student details from database
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('email', user.email)
          .single();

        if (studentError) {
          console.error('Error fetching student:', studentError);
          throw studentError;
        }

        if (!student) {
          console.error('Student not found');
          throw new Error('Student not found in database');
        }

        console.log('Student data loaded:', student.full_name);
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
          // Calculate GPA
          const coursesWithGrades = studentCourses.map(sc => ({
            ...sc,
            credits: sc.courses?.credits || 3,
            grade_points: sc.grade_points || 0
          }));
          
          const gpa = calculateGPA(coursesWithGrades);
          
          // 3. Calculate program progress based on completed semesters
          const programDuration = getProgramDuration(student.program);
          const calculateProgramProgress = () => {
            const completedSemesters = ((student.year_of_study - 1) * 2) + (student.semester - 1);
            const progress = (completedSemesters / programDuration.semesters) * 100;
            return Math.min(Math.round(progress), 85); // Cap at 85% until final project
          };

          // 4. Fetch attendance data for the last 5 days
          const { data: attendanceRecords, error: attendanceError } = await supabase
            .from('attendance_records')
            .select('date, status')
            .eq('student_id', student.id)
            .order('date', { ascending: false })
            .limit(5);

          let attendanceArray = [1, 1, 0, 1, 1]; // Default data
          
          if (!attendanceError && attendanceRecords && attendanceRecords.length > 0) {
            attendanceArray = attendanceRecords.reverse().map(record => 
              record.status === 'present' ? 1 : 0
            );
          }

          // 5. Fetch pending assignments count
          const { data: assignments, error: assignmentsError } = await supabase
            .from('assignments')
            .select('id, due_date')
            .eq('status', 'published')
            .gt('due_date', new Date().toISOString());

          // 6. Fetch upcoming exams count
          const { data: exams, error: examsError } = await supabase
            .from('examinations')
            .select('id, start_time')
            .eq('status', 'published')
            .gt('start_time', new Date().toISOString());

          // 7. Fetch financial summary
          const { data: financial, error: financialError } = await supabase
            .from('financial_records')
            .select('amount, balance_due, status, academic_year')
            .eq('student_id', student.id)
            .eq('academic_year', student.academic_year);

          let financialSummary = { paid: 0, balance: 0 };
          if (!financialError && financial) {
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

          const { data: lectures, error: lecturesError } = await supabase
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
          if (!lecturesError && lectures) {
            console.log('Fetched lectures:', lectures);
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
            console.log('Formatted lectures:', formattedLectures);
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
          console.log('Dashboard data loaded successfully', {
            gpa: gpa.toFixed(2),
            lectures: formattedLectures.length,
            programProgress: calculateProgramProgress()
          });

        } else {
          throw new Error('Failed to fetch student courses');
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Use default data if fetch fails
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
      // Generate labels for last 5 days
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
      <div class="calendar-header">
        <h4>${monthNames[currentMonth]} ${currentYear}</h4>
      </div>
      <table class="calendar-table">
        <thead>
          <tr>
    `;
    
    dayNames.forEach(day => {
      calendarHTML += `<th>${day}</th>`;
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
          calendarHTML += '<td></td>';
        } else if (day > lastDay.getDate()) {
          calendarHTML += '<td></td>';
        } else {
          const isToday = day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
          const cellClass = isToday ? 'class="current-day"' : '';
          calendarHTML += `<td ${cellClass}>${day}</td>`;
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
    `;
    
    calendarContainerRef.current.innerHTML = calendarHTML;
  }, []);

  // Handle attendance toggle
  const handleToggleDayAttendance = useCallback((index) => {
    if (!studentDetails?.id) return;

    const newData = [...attendanceData];
    newData[index] = newData[index] === 1 ? 0 : 1;
    
    // Update in database
    const date = new Date();
    date.setDate(date.getDate() - (4 - index)); // Adjust for last 5 days
    
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
    <div className="content">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <h2>{getGreeting()}, {studentName}</h2>
        <div className="date-display" id="currentDate">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="dashboard-cards">
        {/* Program Progress Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">My Program</h3>
            <div className="card-icon primary">
              <i className="fas fa-graduation-cap"></i>
            </div>
          </div>
          <div className="card-content">
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#333' }}>
              {studentDetails?.program || 'Bachelor of Science in Computer Engineering'}
            </h3>
            <p style={{ margin: '5px 0' }}>
              Duration: {programDuration.years} years ({programDuration.semesters} semesters)
            </p>
            <p style={{ margin: '5px 0' }}>
              Intake: <span id="intakeType">{studentDetails?.intake || 'August'}</span>
            </p>
            <p style={{ margin: '5px 0' }}>
              Academic Year: <span id="academicYear">{studentDetails?.academic_year || '2024/2025'}</span>
            </p>
            <div className="course-progress" style={{ marginTop: '15px' }}>
              <p style={{ margin: '5px 0' }}>
                Progress: Year <span id="currentYear">{studentDetails?.year_of_study || 4}</span>, 
                Semester <span id="currentSemester">{studentDetails?.semester || 2}</span> 
                (<span id="progressPercentage">{dashboardStats.programProgress}</span>%)
              </p>
              <div className="progress-bar" style={{
                height: '8px',
                backgroundColor: '#e9ecef',
                borderRadius: '4px',
                overflow: 'hidden',
                margin: '10px 0'
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
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Lecture Attendance</h3>
            <div className="card-icon success">
              <i className="fas fa-user-check"></i>
            </div>
            <button 
              className="btn btn-sm btn-warning" 
              onClick={() => setShowAdminControls(!showAdminControls)}
              style={{
                backgroundColor: '#ffc107',
                color: '#212529',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <i className="fas fa-edit"></i> {showAdminControls ? 'Hide Controls' : 'Edit Attendance'}
            </button>
          </div>
          <div className="card-content">
            <p id="attendanceSummary" style={{ marginBottom: '15px', fontWeight: '500' }}>
              {attendanceStats.summary}
            </p>
            
            {chartError ? (
              <div style={{
                height: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                color: '#dc3545',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <p style={{ textAlign: 'center' }}>{chartError}</p>
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
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="attendance-chart" style={{ height: '200px', position: 'relative' }}>
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
                padding: '15px',
                borderRadius: '8px',
                marginTop: '15px',
                border: '1px solid #e9ecef'
              }}>
                <p className="text-muted" style={{ color: '#6c757d', marginBottom: '10px' }}>
                  Toggle days attended:
                </p>
                <div className="day-toggles" style={{
                  display: 'flex',
                  gap: '10px',
                  margin: '10px 0'
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
                          padding: '8px 16px',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          transition: 'all 0.3s ease',
                          backgroundColor: attendance === 1 ? '#2ecc71' : '#e74c3c',
                          color: 'white',
                          flex: 1
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
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    marginTop: '10px'
                  }}
                >
                  <i className="fas fa-save"></i> Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Calendar Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Academic Calendar</h3>
            <div className="card-icon secondary">
              <i className="fas fa-calendar-alt"></i>
            </div>
          </div>
          <div 
            className="card-content" 
            id="calendarContainer"
            ref={calendarContainerRef}
            style={{ minHeight: '300px' }}
          >
            {/* Calendar will be inserted here */}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="stats-row" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginTop: '30px'
      }}>
        <div className="stat-card" style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ margin: '0 0 5px 0', color: '#666' }}>Pending Assignments</h4>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>
                {dashboardStats.pendingAssignments}
              </p>
              {dashboardStats.pendingAssignments > 0 && (
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                  Due soon
                </p>
              )}
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#ffebee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-tasks" style={{ color: '#e74c3c', fontSize: '20px' }}></i>
            </div>
          </div>
        </div>

        <div className="stat-card" style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ margin: '0 0 5px 0', color: '#666' }}>Upcoming Exams</h4>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
                {dashboardStats.upcomingExams}
              </p>
              {dashboardStats.upcomingExams > 0 && (
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                  This week
                </p>
              )}
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#e3f2fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-clipboard-list" style={{ color: '#3498db', fontSize: '20px' }}></i>
            </div>
          </div>
        </div>

        <div className="stat-card" style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ margin: '0 0 5px 0', color: '#666' }}>Fees Paid</h4>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
                ${dashboardStats.financialPaid.toLocaleString()}
              </p>
              <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                Balance: ${dashboardStats.financialBalance.toLocaleString()}
              </p>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#e8f6ef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-money-bill-wave" style={{ color: '#27ae60', fontSize: '20px' }}></i>
            </div>
          </div>
        </div>

        <div className="stat-card" style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ margin: '0 0 5px 0', color: '#666' }}>Current CGPA</h4>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#9b59b6' }}>
                {dashboardStats.cgpa.toFixed(2)}
              </p>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#f3e5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-chart-line" style={{ color: '#9b59b6', fontSize: '20px' }}></i>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Lectures */}
      <div className="upcoming-lectures" style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Upcoming Lectures This Week</h3>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {upcomingLectures.length} lecture{upcomingLectures.length !== 1 ? 's' : ''} found
          </span>
        </div>
        {upcomingLectures.length === 0 ? (
          <p style={{ 
            textAlign: 'center', 
            padding: '20px', 
            backgroundColor: 'white',
            borderRadius: '8px',
            color: '#666'
          }}>
            No upcoming lectures scheduled for this week.
          </p>
        ) : (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Time</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Course</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Lecturer</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Duration</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {upcomingLectures.map((lecture) => (
                <tr 
                  key={lecture.id}
                  style={{ 
                    borderBottom: '1px solid #dee2e6',
                    backgroundColor: new Date(lecture.date) < new Date() ? '#fff9e6' : 'white'
                  }}
                >
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '500' }}>{formatDate(lecture.date)}</div>
                    {new Date(lecture.date) < new Date() && (
                      <span style={{ fontSize: '12px', color: '#e74c3c' }}>Today</span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div>{formatTime(lecture.time)}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      to {formatTime(lecture.endTime)}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '500' }}>{lecture.title}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{lecture.courseCode}</div>
                  </td>
                  <td style={{ padding: '12px' }}>{lecture.lecturer}</td>
                  <td style={{ padding: '12px' }}>{lecture.duration} min</td>
                  <td style={{ padding: '12px' }}>
                    <button 
                      className="add-calendar"
                      onClick={() => addToCalendar(lecture)}
                      style={{
                        backgroundColor: '#f4f4f4',
                        color: '#333',
                        border: '1px solid #ddd',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <i className="fas fa-calendar-plus"></i> Add to Calendar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .current-day {
          background-color: #3498db;
          color: white;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .calendar-table {
          width: 100%;
          border-collapse: collapse;
        }
        .calendar-table th {
          padding: 8px;
          text-align: center;
          border-bottom: 1px solid #ddd;
          color: #666;
        }
        .calendar-table td {
          padding: 8px;
          text-align: center;
          height: 40px;
          cursor: pointer;
        }
        .calendar-table td:hover {
          background-color: #f5f5f5;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;