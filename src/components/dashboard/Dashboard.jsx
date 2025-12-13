import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext'; // CHANGED from useAuth

// Import Chart.js correctly
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

// Register ALL ChartJS components properly
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

// Mock data outside component
const MOCK_LECTURES = [
  {
    id: 1,
    title: 'Internet of Things',
    date: '2025-06-21',
    time: '09:00',
    lecturer: 'Prof. Brown',
    duration: 60
  },
  {
    id: 2,
    title: 'Project Management',
    date: '2025-06-22',
    time: '11:00',
    lecturer: 'Dr. Davis',
    duration: 90
  },
  {
    id: 3,
    title: 'Machine Learning Lab',
    date: '2025-06-23',
    time: '15:00',
    lecturer: 'Dr. Smith',
    duration: 120
  }
];

// Program progress configuration
const MANUAL_SEMESTER = {
  year: 4,
  semester: 2,
  intake: 'August',
  academicYear: '2024/2025'
};

// Helper functions outside component
const calculateProgress = () => {
  const totalSemesters = 8;
  const completedSemesters = ((MANUAL_SEMESTER.year - 1) * 2) + MANUAL_SEMESTER.semester - 1;
  
  if (MANUAL_SEMESTER.year === 4 && MANUAL_SEMESTER.semester === 2) {
    return 85;
  }
  
  return Math.round((completedSemesters / totalSemesters) * 100);
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const formatDateForICS = (date) => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

// Calculate attendance stats - Pure function
const calculateAttendanceStats = (data) => {
  const presentDays = data.filter(day => day === 1).length;
  const rate = Math.round((presentDays / 5) * 100);
  return {
    presentDays,
    rate,
    summary: `Last 5 lecture days: ${rate}% (${presentDays}/5 days)`
  };
};

// Load attendance data from localStorage - Pure function
const loadAttendanceData = () => {
  try {
    const savedAttendance = localStorage.getItem('lectureAttendance');
    if (savedAttendance) {
      return JSON.parse(savedAttendance);
    }
  } catch (error) {
    console.error('Error loading attendance data:', error);
  }
  return [1, 1, 0, 1, 1]; // Default data
};

const Dashboard = () => {
  const { user } = useStudentAuth(); // CHANGED: from profile to user
  const [loading, setLoading] = useState(true);
  const [showAdminControls, setShowAdminControls] = useState(false);
  
  // Initialize state with data from localStorage directly
  const [attendanceData, setAttendanceData] = useState(() => loadAttendanceData());
  
  // Calculate stats from attendanceData
  const attendanceStats = calculateAttendanceStats(attendanceData);
  
  // Chart state
  const [chartError, setChartError] = useState(null);
  
  const calendarContainerRef = useRef(null);
  const chartRef = useRef(null);
  const chartCanvasRef = useRef(null);

  // Initialize attendance chart - WITHOUT setState inside
  const initializeAttendanceChart = useCallback(() => {
    // Destroy existing chart if it exists
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = chartCanvasRef.current;
    if (!ctx) {
      console.error('Canvas element not found');
      return false;
    }

    try {
      // Create new chart
      const chart = new ChartJS(ctx, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
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
            legend: {
              display: false
            },
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
              grid: {
                drawBorder: false
              }
            },
            x: {
              grid: {
                display: false
              }
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
    
    // Add day headers
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
    
    // Create calendar rows
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

  // Handle day attendance toggle
  const handleToggleDayAttendance = useCallback((index) => {
    setAttendanceData(prev => {
      const newData = [...prev];
      newData[index] = newData[index] === 1 ? 0 : 1;
      
      // Save to localStorage
      try {
        localStorage.setItem('lectureAttendance', JSON.stringify(newData));
      } catch (error) {
        console.error('Error saving attendance:', error);
      }
      
      // Update chart immediately
      if (chartRef.current) {
        setTimeout(() => {
          if (chartRef.current) {
            chartRef.current.data.datasets[0].data = newData;
            chartRef.current.data.datasets[0].pointBackgroundColor = newData.map(val => 
              val === 1 ? 'rgba(46, 204, 113, 1)' : 'rgba(231, 76, 60, 1)'
            );
            chartRef.current.update();
          }
        }, 0);
      }
      
      return newData;
    });
  }, []);

  // Save attendance changes
  const saveAttendanceChanges = useCallback(() => {
    alert('Attendance updated successfully!');
    setShowAdminControls(false);
  }, []);

  // Show custom alert
  const showCustomAlert = useCallback((message, isError = true) => {
    // Check if alert already exists
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) {
      existingAlert.remove();
    }

    const alert = document.createElement('div');
    alert.className = 'custom-alert';
    alert.style.cssText = `
      position: fixed;
      top: 80px;
      right: 30px;
      z-index: 2000;
      background-color: ${isError ? '#e74c3c' : '#27ae60'};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-width: 300px;
      animation: slideIn 0.3s ease-out;
    `;
    
    alert.innerHTML = `
      <span id="alertMessage">${message}</span>
      <button class="close-alert" style="
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        margin-left: 10px;
      ">&times;</button>
    `;
    
    document.body.appendChild(alert);
    
    // Add close functionality
    const closeBtn = alert.querySelector('.close-alert');
    closeBtn.addEventListener('click', () => {
      alert.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (alert.parentNode) {
          alert.remove();
        }
      }, 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (alert.parentNode) {
        alert.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
          if (alert.parentNode) {
            alert.remove();
          }
        }, 300);
      }
    }, 5000);
  }, []);

  // Add to calendar
  const addToCalendar = useCallback((lecture) => {
    // Create calendar event
    const event = {
      title: lecture.title,
      start: new Date(`${lecture.date}T${lecture.time}`),
      end: new Date(new Date(`${lecture.date}T${lecture.time}`).getTime() + (lecture.duration * 60000)),
      description: `Lecture by ${lecture.lecturer}`,
      location: 'Online'
    };
    
    // Create iCal content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${event.title}`,
      `DTSTART:${formatDateForICS(event.start)}`,
      `DTEND:${formatDateForICS(event.end)}`,
      `DESCRIPTION:${event.description}`,
      `LOCATION:${event.location}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');
    
    // Create and download .ics file
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${lecture.title.replace(/\s+/g, '_')}.ics`;
    link.click();
    
    // Clean up
    URL.revokeObjectURL(link.href);
    
    // Show success message
    showCustomAlert(`${lecture.title} added to calendar!`, false);
  }, [showCustomAlert]);

  // Initialize components on mount
  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      // Clean up chart on unmount
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  // Initialize chart after data is loaded and component mounts - FIXED
  useEffect(() => {
    if (!loading && chartCanvasRef.current) {
      const chartCreated = initializeAttendanceChart();
      if (!chartCreated) {
        // Set chart error state AFTER the effect is complete
        setTimeout(() => {
          setChartError('Failed to create attendance chart. Please refresh the page.');
        }, 0);
      } else {
        setTimeout(() => {
          setChartError(null);
        }, 0);
      }
    }
  }, [loading, initializeAttendanceChart]);

  // Initialize calendar after component mounts
  useEffect(() => {
    if (!loading) {
      initializeCalendar();
    }
  }, [loading, initializeCalendar]);

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

  const greeting = getGreeting();
  const progress = calculateProgress();

  return (
    <div className="content">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <h2>{greeting}, {user?.name || 'Robert Mayhem'}</h2> {/* CHANGED: from profile to user */}
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
        {/* Program Progress Card - FIXED HTML */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">My Program</h3>
            <div className="card-icon primary">
              <i className="fas fa-graduation-cap"></i>
            </div>
          </div>
          <div className="card-content">
            {/* FIXED: Removed <p> tag around <h3> */}
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#333' }}>
              Bachelor of Science in Computer Engineering
            </h3>
            <p style={{ margin: '5px 0' }}>Duration: 4 years (8 semesters)</p>
            <p style={{ margin: '5px 0' }}>Intake: <span id="intakeType">{MANUAL_SEMESTER.intake}</span></p>
            <p style={{ margin: '5px 0' }}>Academic Year: <span id="academicYear">{MANUAL_SEMESTER.academicYear}</span></p>
            <div className="course-progress" style={{ marginTop: '15px' }}>
              <p style={{ margin: '5px 0' }}>
                Progress: Year <span id="currentYear">{MANUAL_SEMESTER.year}</span>, 
                Semester <span id="currentSemester">{MANUAL_SEMESTER.semester}</span> 
                (<span id="progressPercentage">{progress}</span>%)
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
                    width: `${progress}%`,
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
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, index) => (
                    <button
                      key={index}
                      data-day={index}
                      className={`day-toggle ${attendanceData[index] === 1 ? 'btn-present' : 'btn-absent'}`}
                      onClick={() => handleToggleDayAttendance(index)}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.3s ease',
                        backgroundColor: attendanceData[index] === 1 ? '#2ecc71' : '#e74c3c',
                        color: 'white',
                        flex: 1
                      }}
                    >
                      {day}
                    </button>
                  ))}
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

      {/* Upcoming Lectures */}
      <div className="upcoming-lectures" style={{ marginTop: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>Upcoming Lectures This Week</h3>
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
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_LECTURES.map((lecture) => (
              <tr 
                key={lecture.id}
                style={{ borderBottom: '1px solid #dee2e6' }}
              >
                <td style={{ padding: '12px' }}>
                  {new Date(lecture.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </td>
                <td style={{ padding: '12px' }}>{lecture.time}</td>
                <td style={{ padding: '12px' }}>{lecture.title}</td>
                <td style={{ padding: '12px' }}>{lecture.lecturer}</td>
                <td style={{ padding: '12px' }}>
                  <button 
                    className="add-calendar"
                    onClick={() => addToCalendar(lecture)}
                    style={{
                      backgroundColor: '#4285f4',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Add to Calendar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;