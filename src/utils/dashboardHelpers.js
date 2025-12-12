import { MANUAL_SEMESTER } from './dashboardConstants';

export const calculateProgress = () => {
  const totalSemesters = 8;
  const completedSemesters = ((MANUAL_SEMESTER.year - 1) * 2) + MANUAL_SEMESTER.semester - 1;
  
  if (MANUAL_SEMESTER.year === 4 && MANUAL_SEMESTER.semester === 2) {
    return 85;
  }
  
  return Math.round((completedSemesters / totalSemesters) * 100);
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const formatDateForICS = (date) => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export const createCalendarHTML = () => {
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
  
  return calendarHTML;
};