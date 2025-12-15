// src/components/dashboard/Chatbot.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { supabase } from '../../services/supabase';

const Chatbot = () => {
  const { user } = useStudentAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [studentStats, setStudentStats] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [greetingTypes, setGreetingTypes] = useState([]);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const quickQuestionsRef = useRef(null);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Define all possible greetings and responses
  useEffect(() => {
    const greetings = [
      "hi", "hello", "hey", "good morning", "good afternoon", "good evening",
      "greetings", "what's up", "howdy", "yo", "sup", "hi there", "hello there",
      "good day", "morning", "afternoon", "evening", "hola", "bonjour", "namaste",
      "aloha", "ciao", "salam", "shalom", "how are you", "how's it going",
      "what's happening", "what's new", "long time no see", "nice to see you",
      "pleased to meet you", "how have you been", "good to see you", "hiya", "hey there",
      "greetings", "salutations", "what's good", "what's poppin", "how's everything",
      "how's life", "how's your day", "how's your day going", "good to see you again",
      "lovely to see you", "great to see you", "welcome back"
    ];
    setGreetingTypes(greetings);
  }, []);

  // Enhanced AI knowledge base
  const knowledgeBase = {
    // Greeting responses
    greetings: [
      "Great to see you! How can I assist with your studies today? 📚",
      "Hello! Ready to help you with your academic journey! 🎓",
      "Hi there! What would you like to know about your progress? 📈",
      "Welcome back! How can I make your study day better? 🌟",
      "Hey! Let's work on your academic success together! 💪"
    ],
    
    // Thank you responses
    thanks: [
      "You're welcome! Always happy to help with your studies! 😊",
      "No problem at all! Let me know if you need anything else! 👍",
      "Glad I could help! Keep up the great work! 🎯",
      "Anytime! Remember, I'm here 24/7 for your academic needs! ⏰",
      "My pleasure! Wishing you success in all your courses! 🏆"
    ],
    
    // Encouragement responses
    encouragement: [
      "You're doing amazing! Keep pushing forward! 🚀",
      "Stay focused and you'll achieve all your academic goals! 🎯",
      "Remember, every small step counts toward your success! 👣",
      "You've got this! Your dedication will pay off! 💯",
      "Keep up the great work! Your progress is impressive! 📊"
    ],
    
    // Study tips
    studyTips: [
      "**Pomodoro Technique**: Study for 25 minutes, break for 5 minutes ⏰",
      "**Active Recall**: Test yourself instead of just rereading notes 🧠",
      "**Spaced Repetition**: Review material at increasing intervals 📅",
      "**Teach Others**: Explain concepts to solidify your understanding 👨‍🏫",
      "**Practice Problems**: Apply knowledge through practical exercises ✍️",
      "**Healthy Breaks**: Take regular breaks to maintain focus 🧘",
      "**Consistency**: Study regularly instead of cramming 📚",
      "**Goal Setting**: Set specific, measurable academic goals 🎯"
    ]
  };

  // CORRECTED GPA CALCULATION (Matches Dashboard.jsx)
  const calculateGPA = (studentCourses) => {
    if (!studentCourses || studentCourses.length === 0) return 0;
    
    // Filter completed courses with grade_points
    const completedCourses = studentCourses.filter(
      course => course.status === 'completed' && course.grade_points
    );
    
    if (completedCourses.length === 0) return 0;
    
    // Calculate weighted GPA (grade_points * credits) / total credits
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

  // Format time like Dashboard
  const formatTime = (timeString) => {
    if (!timeString) return 'TBD';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Format date like Dashboard
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // FIXED: Fetch upcoming lectures (same as Dashboard.jsx)
  const fetchUpcomingLectures = async () => {
    try {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      const { data: lectures, error } = await supabase
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

      if (error) throw error;

      return lectures?.map(lecture => {
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
      }) || [];
    } catch (error) {
      console.error('Error fetching lectures:', error);
      return [];
    }
  };

  // Fetch all student data
  const fetchAllStudentData = useCallback(async () => {
    if (!user?.email) return;

    try {
      setIsLoadingInitial(true);
      
      // 1. Fetch student basic information
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('email', user.email)
        .single();

      if (studentError) throw studentError;
      if (!student) throw new Error('Student not found');

      setStudentData(student);

      // 2. Fetch student's courses with credits for GPA calculation
      const { data: studentCourses, error: coursesError } = await supabase
        .from('student_courses')
        .select(`
          *,
          courses (
            id,
            course_code,
            course_name,
            credits
          )
        `)
        .eq('student_id', student.id);

      if (coursesError) throw coursesError;

      // Process courses with credits
      const coursesWithGrades = (studentCourses || []).map(sc => ({
        ...sc,
        credits: sc.courses?.credits || 3,
        grade_points: sc.grade_points || 0,
        course_code: sc.courses?.course_code || 'N/A',
        course_name: sc.courses?.course_name || 'Unknown Course'
      }));

      // Calculate GPA using the same method as Dashboard
      const gpa = calculateGPA(coursesWithGrades);

      // 3. FIXED: Fetch upcoming lectures (same as Dashboard)
      const lectures = await fetchUpcomingLectures();

      // 4. Fetch assignments
      const courseIds = coursesWithGrades.map(c => c.course_id).filter(Boolean);
      
      const { data: assignments } = await supabase
        .from('assignments')
        .select(`
          *,
          courses (*),
          assignment_submissions!left (*)
        `)
        .in('course_id', courseIds)
        .eq('status', 'published');

      // 5. Fetch exams
      const { data: exams } = await supabase
        .from('examinations')
        .select(`
          *,
          courses (*),
          exam_submissions!left (*)
        `)
        .in('course_id', courseIds)
        .eq('status', 'published');

      // 6. Fetch financial records
      const { data: finance } = await supabase
        .from('financial_records')
        .select('*')
        .eq('student_id', student.id)
        .eq('academic_year', student.academic_year)
        .order('payment_date', { ascending: false });

      // 7. Fetch attendance records
      const { data: attendance } = await supabase
        .from('attendance_records')
        .select(`
          *,
          courses (*)
        `)
        .eq('student_id', student.id)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });

      // 8. Fetch timetable slots
      const { data: timetable } = await supabase
        .from('timetable_slots')
        .select(`
          *,
          courses (*),
          lecturers (*)
        `)
        .in('course_id', courseIds)
        .eq('is_active', true);

      // 9. Fetch library books
      const { data: libraryBooks } = await supabase
        .from('library_books')
        .select('*')
        .eq('status', 'available')
        .limit(5);

      // 10. Fetch campus events
      const { data: events } = await supabase
        .from('campus_events')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(5);

      // 11. Fetch academic calendar
      const { data: academicCalendar } = await supabase
        .from('academic_calendar')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(5);

      // Calculate statistics
      const processedStats = {
        // Basic student info
        studentInfo: {
          name: student.full_name,
          id: student.student_id,
          program: student.program,
          year: student.year_of_study,
          semester: student.semester,
          email: student.email,
          phone: student.phone,
          intake: student.intake,
          academicYear: student.academic_year
        },

        courses: {
          total: coursesWithGrades.length || 0,
          completed: coursesWithGrades.filter(c => c.status === 'completed').length || 0,
          inProgress: coursesWithGrades.filter(c => c.status === 'in_progress').length || 0,
          list: coursesWithGrades.map(c => ({
            id: c.course_id,
            code: c.course_code,
            name: c.course_name,
            status: c.status,
            grade: c.grade,
            marks: c.marks,
            gradePoints: c.grade_points,
            credits: c.credits,
            lecturer: c.lecturer_name,
            department: c.department
          })) || []
        },

        // GPA calculation (matches Dashboard)
        gpa: parseFloat(gpa.toFixed(2)),

        // FIXED: Lectures (same as Dashboard)
        lectures: lectures,

        // Assignment statistics
        assignments: {
          total: assignments?.length || 0,
          submitted: assignments?.filter(a => 
            a.assignment_submissions?.some(s => s.student_id === student.id)
          ).length || 0,
          pending: assignments?.filter(a => {
            const submission = a.assignment_submissions?.find(s => s.student_id === student.id);
            return !submission && new Date(a.due_date) > new Date();
          }).length || 0,
          graded: assignments?.filter(a => {
            const submission = a.assignment_submissions?.find(s => s.student_id === student.id);
            return submission?.status === 'graded';
          }).length || 0,
          overdue: assignments?.filter(a => {
            const submission = a.assignment_submissions?.find(s => s.student_id === student.id);
            return !submission && new Date(a.due_date) < new Date();
          }).length || 0,
          upcoming: assignments?.filter(a => {
            const submission = a.assignment_submissions?.find(s => s.student_id === student.id);
            return !submission && new Date(a.due_date) > new Date();
          }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 5),
          recentGrades: assignments?.filter(a => {
            const submission = a.assignment_submissions?.find(s => s.student_id === student.id);
            return submission?.status === 'graded';
          }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 3)
        },

        // Exam statistics
        exams: {
          total: exams?.length || 0,
          completed: exams?.filter(e => {
            const submission = e.exam_submissions?.find(s => s.student_id === student.id);
            return submission && submission.status === 'graded';
          }).length || 0,
          upcoming: exams?.filter(e => {
            const submission = e.exam_submissions?.find(s => s.student_id === student.id);
            return !submission && new Date(e.start_time) > new Date();
          }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time)).slice(0, 5),
          performance: calculateExamPerformance(exams?.filter(e => 
            e.exam_submissions?.some(s => s.student_id === student.id && s.status === 'graded')
          ) || [])
        },

        // Financial statistics (matches Dashboard)
        finance: {
          totalPaid: finance?.filter(f => f.status === 'paid').reduce((sum, f) => sum + (f.amount || 0), 0) || 0,
          totalPending: finance?.filter(f => f.status === 'pending').reduce((sum, f) => sum + (f.amount || 0), 0) || 0,
          totalPartial: finance?.filter(f => f.status === 'partial').reduce((sum, f) => sum + (f.balance_due || 0), 0) || 0,
          overdue: finance?.filter(f => 
            f.due_date && 
            new Date(f.due_date) < new Date() && 
            f.status !== 'paid'
          ).length || 0,
          recent: finance?.slice(0, 5) || [],
          scholarships: finance?.filter(f => f.type === 'scholarship').reduce((sum, f) => sum + (f.amount || 0), 0) || 0,
          fines: finance?.filter(f => f.type === 'fine').reduce((sum, f) => sum + (f.amount || 0), 0) || 0
        },

        // Attendance statistics
        attendance: {
          total: attendance?.length || 0,
          present: attendance?.filter(a => a.status === 'present').length || 0,
          absent: attendance?.filter(a => a.status === 'absent').length || 0,
          late: attendance?.filter(a => a.status === 'late').length || 0,
          rate: attendance?.length > 0 ? 
            (attendance.filter(a => a.status === 'present').length / attendance.length * 100).toFixed(1) : 0,
          recent: attendance?.slice(0, 10) || [],
          byCourse: groupAttendanceByCourse(attendance || []),
          trend: calculateAttendanceTrend(attendance || [])
        },

        // Timetable statistics
        timetable: {
          total: timetable?.length || 0,
          today: timetable?.filter(slot => {
            const today = new Date().getDay();
            return slot.day_of_week === (today === 0 ? 6 : today - 1);
          }).sort((a, b) => {
            const timeA = a.start_time?.split(':').map(Number) || [0, 0];
            const timeB = b.start_time?.split(':').map(Number) || [0, 0];
            return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
          }) || [],
          byDay: groupTimetableByDay(timetable || []),
          currentClass: getCurrentClass(timetable || [])
        },

        // Additional data
        library: {
          available: libraryBooks?.length || 0,
          books: libraryBooks || [],
          recommended: libraryBooks?.filter(b => 
            b.category?.toLowerCase().includes('computer') || 
            b.category?.toLowerCase().includes('technology')
          ).slice(0, 3) || []
        },

        events: {
          upcoming: events || [],
          today: events?.filter(e => 
            new Date(e.date).toDateString() === new Date().toDateString()
          ) || []
        },

        academicCalendar: academicCalendar || []
      };

      setStudentStats(processedStats);

      // Initialize welcome message
      const welcomeMessage = {
        id: 1,
        text: generateWelcomeMessage(student, processedStats),
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages([welcomeMessage]);
      
    } catch (error) {
      console.error('Error in fetchAllStudentData:', error);
      setMessages([{
        id: 1,
        text: `⚠️ Error loading your data: ${error.message}. Please try refreshing the page or contact support.`,
        sender: 'ai',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoadingInitial(false);
    }
  }, [user?.email]);

  // Enhanced Helper functions
  const calculateExamPerformance = (gradedExams) => {
    if (gradedExams.length === 0) return { average: 0, highest: 0, lowest: 0, grades: [] };
    
    const percentages = gradedExams.map(exam => {
      const submission = exam.exam_submissions?.find(s => s.student_id === studentData?.id);
      return submission?.percentage || 0;
    }).filter(p => p > 0);

    if (percentages.length === 0) return { average: 0, highest: 0, lowest: 0, grades: [] };

    const average = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    
    // Calculate grade distribution
    const grades = percentages.map(p => {
      if (p >= 80) return 'A';
      if (p >= 70) return 'B';
      if (p >= 60) return 'C';
      if (p >= 50) return 'D';
      return 'F';
    });

    const gradeCounts = grades.reduce((acc, grade) => {
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {});

    return {
      average: average.toFixed(1),
      highest: highest.toFixed(1),
      lowest: lowest.toFixed(1),
      grades: gradeCounts,
      totalExams: gradedExams.length
    };
  };

  const groupTimetableByDay = (timetable) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return timetable.reduce((acc, slot) => {
      const day = days[slot.day_of_week] || 'Unknown';
      if (!acc[day]) acc[day] = [];
      acc[day].push(slot);
      return acc;
    }, {});
  };

  const groupAttendanceByCourse = (attendance) => {
    return attendance.reduce((acc, record) => {
      const courseName = record.courses?.course_name || 'General';
      if (!acc[courseName]) {
        acc[courseName] = { present: 0, absent: 0, late: 0, total: 0 };
      }
      acc[courseName][record.status]++;
      acc[courseName].total++;
      return acc;
    }, {});
  };

  const calculateAttendanceTrend = (attendance) => {
    if (attendance.length < 2) return 'stable';
    
    const recent = attendance.slice(0, Math.min(5, attendance.length));
    const older = attendance.slice(Math.min(5, attendance.length), Math.min(10, attendance.length));
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentRate = recent.filter(a => a.status === 'present').length / recent.length;
    const olderRate = older.filter(a => a.status === 'present').length / older.length;
    
    if (recentRate > olderRate + 0.1) return 'improving';
    if (recentRate < olderRate - 0.1) return 'declining';
    return 'stable';
  };

  const getCurrentClass = (timetable) => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    const todaySlots = timetable.filter(slot => {
      const day = slot.day_of_week;
      return day === (currentDay === 0 ? 6 : currentDay - 1);
    });
    
    for (const slot of todaySlots) {
      const [startHour, startMinute] = (slot.start_time || '00:00').split(':').map(Number);
      const [endHour, endMinute] = (slot.end_time || '00:00').split(':').map(Number);
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;
      
      if (currentTime >= startTime && currentTime <= endTime) {
        return slot;
      }
    }
    
    return null;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const generateWelcomeMessage = (student, stats) => {
    const currentClass = stats.timetable.currentClass;
    const nextAssignment = stats.assignments.upcoming[0];
    
    return `👋 **${getGreeting()} ${student.full_name.split(' ')[0]}!** 

I'm your AI Student Assistant, connected to your personal academic database. Here's your current status:

**📚 Academic Summary:**
• **CGPA:** ${stats.gpa} (calculated from ${stats.courses.completed} completed courses)
• **Courses:** ${stats.courses.completed} completed, ${stats.courses.inProgress} in progress
• **Year:** ${student.year_of_study || 'N/A'}.${student.semester || 'N/A'}

${currentClass ? `**📅 Current Class:**\n• **${currentClass.courses?.course_name || 'Class'}** until ${formatTime(currentClass.end_time)} in ${currentClass.room_number}\n` : ''}

${nextAssignment ? `**📝 Next Assignment:**\n• **${nextAssignment.title}** due ${formatDate(nextAssignment.due_date)}\n` : ''}

**🎯 Quick Stats:**
• **Attendance Rate:** ${stats.attendance.rate}%
• **Pending Assignments:** ${stats.assignments.pending}
• **Upcoming Exams:** ${stats.exams.upcoming.length}
• **Financial Balance:** $${(stats.finance.totalPending + stats.finance.totalPartial).toFixed(2)}

**How can I help you today?** Here are some things you can ask:
1. "How's my GPA looking?"
2. "What assignments are due?"
3. "Show me today's schedule"
4. "What's my attendance status?"
5. "Any upcoming exams?"
6. "Check my financial balance"
7. "Recommend study tips"
8. "What library books are available?"
9. "Any campus events this week?"
10. "How can I improve my grades?"`;
  };

  // Enhanced query detection
  const detectQueryType = (query) => {
    const q = query.toLowerCase();
    
    // Greetings
    if (greetingTypes.some(g => q.includes(g))) {
      return 'greeting';
    }
    
    // Thanks
    if (q.includes('thank') || q.includes('thanks') || q.includes('appreciate')) {
      return 'thanks';
    }
    
    // Courses & GPA
    if (q.includes('gpa') || q.includes('cgpa') || q.includes('grade point') || 
        q.includes('academic standing') || q.includes('cumulative')) {
      return 'gpa';
    }
    
    if (q.includes('course') || q.includes('subject') || q.includes('unit')) {
      return 'courses';
    }
    
    if (q.includes('grade') || q.includes('mark') || q.includes('score')) {
      return 'grades';
    }
    
    // Assignments
    if (q.includes('assignment') || q.includes('homework') || q.includes('project')) {
      return 'assignments';
    }
    
    if (q.includes('deadline') || q.includes('due date') || q.includes('submission')) {
      return 'deadlines';
    }
    
    // Exams
    if (q.includes('exam') || q.includes('test') || q.includes('midterm') || 
        q.includes('final') || q.includes('quiz')) {
      return 'exams';
    }
    
    // Schedule & Lectures
    if (q.includes('lecture') || q.includes('class') || q.includes('schedule') || 
        q.includes('timetable') || q.includes('routine')) {
      return 'schedule';
    }
    
    if (q.includes('today') || q.includes('now') || q.includes('current')) {
      return 'today';
    }
    
    if (q.includes('tomorrow') || q.includes('next day')) {
      return 'tomorrow';
    }
    
    if (q.includes('week') || q.includes('upcoming')) {
      return 'week';
    }
    
    // Finance
    if (q.includes('fee') || q.includes('payment') || q.includes('finance') || 
        q.includes('balance') || q.includes('money') || q.includes('tuition')) {
      return 'finance';
    }
    
    // Attendance
    if (q.includes('attendance') || q.includes('present') || q.includes('absent') || 
        q.includes('late') || q.includes('attended')) {
      return 'attendance';
    }
    
    // Library
    if (q.includes('library') || q.includes('book') || q.includes('resource') || 
        q.includes('study material')) {
      return 'library';
    }
    
    // Events
    if (q.includes('event') || q.includes('activity') || q.includes('campus') || 
        q.includes('extra curricular')) {
      return 'events';
    }
    
    // Study help
    if (q.includes('study') || q.includes('learn') || q.includes('prepar') || 
        q.includes('improve') || q.includes('tip') || q.includes('advice')) {
      return 'study';
    }
    
    // Progress & Performance
    if (q.includes('progress') || q.includes('performance') || q.includes('how am i') || 
        q.includes('summary') || q.includes('overview') || q.includes('report')) {
      return 'progress';
    }
    
    // Help
    if (q.includes('help') || q.includes('what can') || q.includes('capabilities') || 
        q.includes('assist') || q.includes('how to use')) {
      return 'help';
    }
    
    // University info
    if (q.includes('university') || q.includes('campus') || q.includes('faculty') || 
        q.includes('department') || q.includes('program')) {
      return 'university';
    }
    
    // Personal info
    if (q.includes('my info') || q.includes('profile') || q.includes('details') || 
        q.includes('who am i') || q.includes('student info')) {
      return 'profile';
    }
    
    return 'unknown';
  };

  // Check if query is a greeting
  const isGreeting = (query) => {
    return greetingTypes.some(greeting => 
      query.toLowerCase().includes(greeting.toLowerCase())
    );
  };

  // ENHANCED AI Response Generator
  const generateAIResponse = (userQuery) => {
    if (!studentStats || !studentData) {
      return "I'm still loading your data. Please wait a moment...";
    }

    const query = userQuery.toLowerCase();
    const queryType = detectQueryType(query);
    
    // Handle greetings
    if (queryType === 'greeting') {
      const randomGreeting = knowledgeBase.greetings[
        Math.floor(Math.random() * knowledgeBase.greetings.length)
      ];
      return randomGreeting;
    }
    
    // Handle thanks
    if (queryType === 'thanks') {
      const randomThanks = knowledgeBase.thanks[
        Math.floor(Math.random() * knowledgeBase.thanks.length)
      ];
      return randomThanks;
    }
    
    // GPA query
    if (queryType === 'gpa') {
      const topCourses = studentStats.courses.list
        .filter(c => c.gradePoints)
        .sort((a, b) => b.gradePoints - a.gradePoints)
        .slice(0, 5);
      
      const improvement = studentStats.gpa < 3.0 ? 
        "Consider focusing more on your current courses to improve your GPA." :
        studentStats.gpa < 3.5 ?
        "Good work! Aim for a 3.5+ GPA for better opportunities." :
        "Excellent! Maintain this strong academic performance.";
      
      return `📊 **Your Academic Performance:**

**Overall CGPA:** ${studentStats.gpa.toFixed(2)}
**Calculation:** Weighted average from ${studentStats.courses.completed} completed courses
**Credits Completed:** ${studentStats.courses.list.filter(c => c.status === 'completed').reduce((sum, c) => sum + c.credits, 0)} credits
**Academic Standing:** ${studentStats.gpa >= 3.5 ? 'Excellent' : studentStats.gpa >= 3.0 ? 'Good' : 'Needs Improvement'}

**Top Performing Courses:**
${topCourses.length > 0 ? 
  topCourses.map(c => `• **${c.code}** - ${c.name}\n  Grade: ${c.grade || 'N/A'} | Points: ${c.gradePoints} | Credits: ${c.credits}`).join('\n\n') : 
  'No completed courses yet'}

**Recommendation:** ${improvement}

**Note:** CGPA = (Σ grade_points × credits) / (Σ credits)`;
    }
    
    // Courses query
    if (queryType === 'courses') {
      const currentCourses = studentStats.courses.list
        .filter(c => c.status === 'in_progress');
      
      const completedCourses = studentStats.courses.list
        .filter(c => c.status === 'completed');
      
      return `📚 **Your Course Information:**

**Current Semester Courses (${currentCourses.length}):**
${currentCourses.length > 0 ? 
  currentCourses.map(c => `• **${c.code}** - ${c.name}\n  Credits: ${c.credits} | Lecturer: ${c.lecturer || 'TBA'}`).join('\n\n') : 
  'No courses currently in progress'}

**Completed Courses (${completedCourses.length}):**
${completedCourses.length > 0 ? 
  completedCourses.slice(0, 5).map(c => `• **${c.code}** - ${c.name}\n  Grade: ${c.grade || 'N/A'} | Credits: ${c.credits}`).join('\n\n') : 
  'No courses completed yet'}

**Total Credits This Semester:** ${currentCourses.reduce((sum, c) => sum + c.credits, 0)}`;
    }
    
    // Assignments query
    if (queryType === 'assignments') {
      const upcomingAssignments = studentStats.assignments.upcoming;
      const overdueAssignments = studentStats.assignments.overdue;
      const recentGrades = studentStats.assignments.recentGrades;
      
      return `📝 **Your Assignments:**

**Summary:**
• **Total:** ${studentStats.assignments.total}
• **Submitted:** ${studentStats.assignments.submitted}
• **Pending:** ${studentStats.assignments.pending}
• **Overdue:** ${overdueAssignments}
• **Graded:** ${studentStats.assignments.graded}

${overdueAssignments > 0 ? `**⚠️ Overdue Assignments:** ${overdueAssignments} assignment(s) need immediate attention!\n` : ''}

**Upcoming Deadlines:**
${upcomingAssignments.length > 0 ? 
  upcomingAssignments.map(a => {
    const dueDate = new Date(a.due_date);
    const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
    return `• **${a.title}**\n  Course: ${a.courses?.course_name || 'Unknown'}\n  Due: ${dueDate.toLocaleDateString()} (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)\n  Total Marks: ${a.total_marks}`;
  }).join('\n\n') : 
  'No upcoming assignments! Great job keeping up!'}

${recentGrades.length > 0 ? `**Recent Grades:**\n${recentGrades.map(a => {
  const submission = a.assignment_submissions?.find(s => s.student_id === studentData.id);
  return `• **${a.title}**: ${submission?.marks_obtained || 0}/${a.total_marks} (${submission?.percentage || 0}%)`;
}).join('\n')}` : ''}`;
    }
    
    // Deadlines query
    if (queryType === 'deadlines') {
      const upcomingAssignments = studentStats.assignments.upcoming;
      const upcomingExams = studentStats.exams.upcoming;
      
      const allDeadlines = [
        ...upcomingAssignments.map(a => ({ ...a, type: 'assignment', date: a.due_date })),
        ...upcomingExams.map(e => ({ ...e, type: 'exam', date: e.start_time }))
      ].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      return `⏰ **All Upcoming Deadlines:**

${allDeadlines.length > 0 ? 
  allDeadlines.slice(0, 8).map(item => {
    const date = new Date(item.date);
    const daysLeft = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
    const typeIcon = item.type === 'assignment' ? '📝' : '📋';
    return `${typeIcon} **${item.title}**\n  Type: ${item.type === 'assignment' ? 'Assignment' : 'Exam'}\n  Date: ${date.toLocaleDateString()}\n  Time: ${formatTime(item.type === 'assignment' ? '23:59' : item.start_time?.split(' ')[0] || '09:00')}\n  Days left: ${daysLeft}`;
  }).join('\n\n') : 
  'No upcoming deadlines! Well done!'}

**Tip:** Start working on assignments at least 3 days before the deadline for best results!`;
    }
    
    // Exams query
    if (queryType === 'exams') {
      const upcomingExams = studentStats.exams.upcoming;
      const performance = studentStats.exams.performance;
      
      return `📋 **Your Exam Information:**

**Performance Summary:**
• **Average Score:** ${performance.average}%
• **Highest Score:** ${performance.highest}%
• **Lowest Score:** ${performance.lowest}%
• **Total Exams:** ${performance.totalExams}
${performance.grades && Object.keys(performance.grades).length > 0 ? `• **Grade Distribution:** ${Object.entries(performance.grades).map(([grade, count]) => `${grade}: ${count}`).join(', ')}` : ''}

**Upcoming Exams:**
${upcomingExams.length > 0 ? 
  upcomingExams.map(e => {
    const examDate = new Date(e.start_time);
    const daysLeft = Math.ceil((examDate - new Date()) / (1000 * 60 * 60 * 24));
    const time = formatTime(e.start_time?.split(' ')[0] || '09:00');
    return `• **${e.title}**\n  Course: ${e.courses?.course_name || 'Unknown'}\n  Date: ${examDate.toLocaleDateString()} at ${time}\n  Location: ${e.location || 'TBA'}\n  Duration: ${e.duration || '2 hours'} (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)\n  Type: ${e.exam_type || 'Written'}`;
  }).join('\n\n') : 
  'No upcoming exams scheduled'}

**Exam Preparation Tips:**
1. Review past papers and sample questions
2. Create summary notes for each topic
3. Practice with mock tests
4. Get adequate rest before the exam
5. Arrive at least 30 minutes early`;
    }
    
    // Today's schedule query
    if (queryType === 'today') {
      const todayLectures = studentStats.lectures.filter(l => 
        new Date(l.date).toDateString() === new Date().toDateString()
      );
      
      const currentClass = studentStats.timetable.currentClass;
      const nextClass = studentStats.timetable.today.find(slot => {
        const [hour, minute] = (slot.start_time || '00:00').split(':').map(Number);
        const currentTime = new Date().getHours() * 60 + new Date().getMinutes();
        return hour * 60 + minute > currentTime;
      });
      
      const todayEvents = studentStats.events.today;
      
      return `📅 **Today's Schedule:**

**Current Time:** ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

${currentClass ? `**🟢 Currently In Class:**\n• **${currentClass.courses?.course_name}**\n  Time: ${formatTime(currentClass.start_time)} - ${formatTime(currentClass.end_time)}\n  Room: ${currentClass.room_number}\n  Lecturer: ${currentClass.lecturers?.full_name || 'TBA'}\n` : ''}

${nextClass ? `**⏭️ Next Class:**\n• **${nextClass.courses?.course_name}** at ${formatTime(nextClass.start_time)} in ${nextClass.room_number}\n` : ''}

**📚 Lectures Today (${todayLectures.length}):**
${todayLectures.length > 0 ? 
  todayLectures.map(lecture => 
    `• **${lecture.courseCode} - ${lecture.title}**\n  Time: ${formatTime(lecture.time)} - ${formatTime(lecture.endTime)}\n  Lecturer: ${lecture.lecturer}\n  Duration: ${lecture.duration} min\n  Status: ${lecture.status === 'ongoing' ? '🟢 Live Now' : 'Scheduled'}${lecture.google_meet_link ? `\n  Link: ${lecture.google_meet_link}` : ''}`
  ).join('\n\n') : 
  'No lectures scheduled for today! 🎉'}

${todayEvents.length > 0 ? `**🎉 Campus Events Today:**\n${todayEvents.map(e => `• **${e.title}** at ${e.location} (${formatTime(e.time)})`).join('\n')}` : ''}`;
    }
    
    // This week's schedule
    if (queryType === 'week') {
      const weekLectures = studentStats.lectures.slice(0, 15);
      const upcomingEvents = studentStats.events.upcoming.slice(0, 5);
      
      return `📅 **This Week's Schedule:**

**Upcoming Lectures (${weekLectures.length}):**
${weekLectures.length > 0 ? 
  weekLectures.map(lecture => 
    `• **${formatDate(lecture.date)}** - ${lecture.courseCode}\n  ${lecture.title}\n  ${formatTime(lecture.time)} | ${lecture.lecturer}`
  ).join('\n\n') : 
  'No upcoming lectures scheduled for this week.'}

**Weekly Timetable:**
${Object.entries(studentStats.timetable.byDay).map(([day, slots]) => 
  `**${day}:**\n${slots.map(slot => 
    `• ${slot.start_time} - ${slot.end_time}: ${slot.courses?.course_name || 'Unknown'} (${slot.room_number})`
  ).join('\n')}`
).join('\n\n')}

${upcomingEvents.length > 0 ? `**📢 Upcoming Events:**\n${upcomingEvents.map(e => `• **${formatDate(e.date)}**: ${e.title} at ${e.location}`).join('\n')}` : ''}`;
    }
    
    // Finance query
    if (queryType === 'finance') {
      const finance = studentStats.finance;
      
      return `💰 **Your Financial Status:**

**Balance Summary:**
• **Total Paid This Year:** $${finance.totalPaid.toFixed(2)}
• **Pending Balance:** $${finance.totalPending.toFixed(2)}
• **Partial Payments Outstanding:** $${finance.totalPartial.toFixed(2)}
• **Total Outstanding:** $${(finance.totalPending + finance.totalPartial).toFixed(2)}
• **Overdue Payments:** ${finance.overdue}
${finance.scholarships > 0 ? `• **Scholarships Awarded:** $${finance.scholarships.toFixed(2)}` : ''}
${finance.fines > 0 ? `• **Fines/Charges:** $${finance.fines.toFixed(2)}` : ''}

**Recent Transactions:**
${finance.recent.length > 0 ? 
  finance.recent.map(f => {
    const date = f.payment_date ? new Date(f.payment_date) : f.due_date ? new Date(f.due_date) : null;
    return `• **${f.description || 'Transaction'}**\n  Amount: $${f.amount.toFixed(2)} | Status: ${f.status}\n  Date: ${date ? date.toLocaleDateString() : 'N/A'}${f.balance_due > 0 ? `\n  Balance Due: $${f.balance_due.toFixed(2)}` : ''}`;
  }).join('\n\n') : 
  'No recent transactions found'}

**Payment Methods Accepted:**
• Credit/Debit Cards
• Bank Transfer
• Mobile Money
• Cash at Finance Office

**Contact Finance Office:** finance@nleuniversity.edu | Ext: 1234`;
    }
    
    // Attendance query
    if (queryType === 'attendance') {
      const attendance = studentStats.attendance;
      const trend = attendance.trend;
      const byCourse = attendance.byCourse;
      
      return `📊 **Your Attendance Records:**

**Last 30 Days Summary:**
• **Total Classes:** ${attendance.total}
• **Present:** ${attendance.present} days (${attendance.rate}%)
• **Absent:** ${attendance.absent} days
• **Late:** ${attendance.late} times
• **Trend:** ${trend === 'improving' ? '📈 Improving' : trend === 'declining' ? '📉 Declining' : '➡️ Stable'}

**Attendance by Course:**
${Object.keys(byCourse).length > 0 ? 
  Object.entries(byCourse).map(([course, stats]) => {
    const rate = ((stats.present / stats.total) * 100).toFixed(1);
    return `• **${course}**: ${stats.present}/${stats.total} (${rate}%)`;
  }).join('\n') : 
  'No course-specific attendance data'}

**Recent Attendance:**
${attendance.recent.length > 0 ? 
  attendance.recent.slice(0, 5).map(a => 
    `• **${new Date(a.date).toLocaleDateString()}**\n  Course: ${a.courses?.course_name || 'General'}\n  Status: ${a.status === 'present' ? '✅ Present' : a.status === 'late' ? '⚠️ Late' : '❌ Absent'}${a.check_in_time ? ` | Check-in: ${a.check_in_time}` : ''}`
  ).join('\n\n') : 
  'No recent attendance records'}

**University Policy:** Minimum 75% attendance required in each course.`;
    }
    
    // Library query
    if (queryType === 'library') {
      const library = studentStats.library;
      
      return `📚 **Library Resources:**

**Available Books:** ${library.available} books currently available

${library.recommended.length > 0 ? `**Recommended for Your Program:**\n${library.recommended.map(b => `• **${b.title}** by ${b.author}\n  ISBN: ${b.isbn} | Category: ${b.category}`).join('\n\n')}\n` : ''}

**Library Services:**
• **Hours:** 8:00 AM - 10:00 PM (Weekdays), 9:00 AM - 6:00 PM (Weekends)
• **E-Resources:** Access online journals and databases
• **Study Rooms:** Book private study rooms (max 4 hours)
• **Research Help:** Librarians available for assistance
• **Inter-library Loan:** Request books from other libraries

**Popular Categories:**
• Computer Science & Engineering
• Business & Management
• Science & Mathematics
• Literature & Arts
• Reference Materials

**Contact Library:** library@nleuniversity.edu | Ext: 5678`;
    }
    
    // Events query
    if (queryType === 'events') {
      const events = studentStats.events.upcoming;
      
      return `🎉 **Campus Events & Activities:**

**Upcoming Events (${events.length}):**
${events.length > 0 ? 
  events.map(e => {
    const date = new Date(e.date);
    const daysLeft = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
    return `• **${e.title}**\n  Date: ${date.toLocaleDateString()} at ${formatTime(e.time)}\n  Location: ${e.location}\n  Type: ${e.type || 'General'}\n  ${daysLeft > 0 ? `Starts in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'Today!'}\n  Description: ${e.description || 'No description available'}`;
  }).join('\n\n') : 
  'No upcoming campus events'}

**Regular Activities:**
• **Sports:** Football, Basketball, Swimming (Daily 4-6 PM)
• **Clubs:** Coding Club, Debate Society, Music Club
• **Workshops:** Weekly skill development sessions
• **Guest Lectures:** Industry experts every Friday
• **Cultural Events:** Monthly performances and exhibitions

**Get Involved:** Visit Student Affairs Office or check notice boards!`;
    }
    
    // Study tips query
    if (queryType === 'study') {
      const randomTips = [...knowledgeBase.studyTips]
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);
      
      return `🧠 **Study Tips & Strategies:**

**Effective Study Techniques:**
${randomTips.map((tip, i) => `${i + 1}. ${tip}`).join('\n')}

**Time Management:**
• Create a weekly study schedule
• Prioritize difficult subjects during peak focus times
• Use digital calendars with reminders
• Break large tasks into smaller chunks

**Exam Preparation:**
1. Start studying at least 2 weeks before exams
2. Create summary sheets for each subject
3. Practice with past exam papers
4. Form study groups for difficult topics
5. Get 7-8 hours of sleep before exam day

**Resource Recommendations:**
• **Online:** Khan Academy, Coursera, edX
• **Apps:** Anki (flashcards), Forest (focus), Todoist (planning)
• **Books:** "A Mind for Numbers", "Make It Stick", "Deep Work"

**Need help with a specific subject?** Tell me which course you're struggling with!`;
    }
    
    // Progress report query
    if (queryType === 'progress') {
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      
      return `📈 **Comprehensive Academic Progress Report:**

**Academic Performance:**
• **CGPA:** ${studentStats.gpa.toFixed(2)} (from ${studentStats.courses.completed} completed courses)
• **Courses Completed:** ${studentStats.courses.completed}/${studentStats.courses.total}
• **Attendance Rate:** ${studentStats.attendance.rate}% (${studentStats.attendance.trend} trend)
• **Current Semester:** Year ${studentData.year_of_study}, Semester ${studentData.semester}
• **Program:** ${studentData.program}

**Current Status (${currentMonth}):**
• **Pending Assignments:** ${studentStats.assignments.pending}
• **Overdue Assignments:** ${studentStats.assignments.overdue}
• **Upcoming Exams:** ${studentStats.exams.upcoming.length}
• **Upcoming Lectures:** ${studentStats.lectures.length}
• **Financial Balance:** $${(studentStats.finance.totalPending + studentStats.finance.totalPartial).toFixed(2)}
• **Library Books Available:** ${studentStats.library.available}

**Top Priorities This Week:**
${studentStats.assignments.upcoming.length > 0 ? `1. **${studentStats.assignments.upcoming[0]?.title}** - Due ${formatDate(studentStats.assignments.upcoming[0]?.due_date)}` : '1. No urgent assignments'}
${studentStats.exams.upcoming.length > 0 ? `2. **${studentStats.exams.upcoming[0]?.title}** - Exam on ${formatDate(studentStats.exams.upcoming[0]?.start_time)}` : '2. No upcoming exams'}
${studentStats.finance.overdue > 0 ? '3. **Clear overdue payments** - Financial clearance required' : '3. Financial status is good'}
${studentStats.lectures.length > 0 ? `4. **Attend ${studentStats.lectures[0]?.courseCode} lecture** - ${formatDate(studentStats.lectures[0]?.date)} at ${formatTime(studentStats.lectures[0]?.time)}` : '4. No lectures scheduled'}

**Recommendations:**
1. ${studentStats.attendance.rate >= 75 ? 'Maintain good attendance' : 'Improve attendance to meet 75% requirement'}
2. ${studentStats.assignments.pending > 0 ? 'Complete pending assignments this week' : 'Great job staying on top of assignments'}
3. ${studentStats.gpa < 3.0 ? 'Focus on improving grades in current courses' : 'Maintain strong academic performance'}
4. ${studentStats.finance.overdue > 0 ? 'Clear overdue payments immediately' : 'Financial status is satisfactory'}
5. ${studentStats.library.recommended.length > 0 ? 'Check out recommended library books' : 'Utilize library resources for better learning'}

**Projected Graduation:** Based on current progress, you're on track to graduate as scheduled!`;
    }
    
    // Profile query
    if (queryType === 'profile') {
      return `👤 **Your Student Profile:**

**Personal Information:**
• **Full Name:** ${studentData.full_name}
• **Student ID:** ${studentData.student_id}
• **Email:** ${studentData.email}
• **Phone:** ${studentData.phone || 'Not provided'}

**Academic Information:**
• **Program:** ${studentData.program}
• **Year of Study:** Year ${studentData.year_of_study}, Semester ${studentData.semester}
• **Intake:** ${studentData.intake || 'Not specified'}
• **Academic Year:** ${studentData.academic_year || 'Current'}

**Contact Information:**
• **Student Portal:** portal.nleuniversity.edu
• **Email:** ${studentData.email}
• **Phone:** ${studentData.phone || 'Not available'}
• **Emergency Contact:** Update in Student Services

**Important Dates:**
• **Enrollment Date:** ${new Date(studentData.created_at).toLocaleDateString()}
• **Expected Graduation:** Calculate based on program duration

**Need to update your information?** Visit the Student Affairs office or update through the portal.`;
    }
    
    // University info query
    if (queryType === 'university') {
      return `🏛️ **NLE University Information:**

**About NLE University:**
NLE University is a premier institution dedicated to academic excellence and innovation in education. We provide world-class education across various disciplines.

**Key Departments:**
• **Computer Science & Engineering**
• **Business & Management**
• **Health Sciences**
• **Arts & Humanities**
• **Science & Technology**

**Campus Facilities:**
• **Library:** State-of-the-art digital and physical resources
• **Labs:** Modern computer and science laboratories
• **Sports Complex:** Indoor and outdoor sports facilities
• **Student Center:** Cafeteria, study spaces, and lounge areas
• **Medical Center:** 24/7 health services

**Academic Calendar Highlights:**
• **Semester Start:** September & February
• **Examination Periods:** December & May
• **Breaks:** Summer (June-August), Winter (December-January)
• **Graduation Ceremony:** Annual ceremony in July

**Contact Information:**
• **Main Office:** +1 (555) 123-4567
• **Email:** info@nleuniversity.edu
• **Address:** 123 Education Street, Knowledge City
• **Website:** www.nleuniversity.edu

**Vision:** To be a globally recognized center of excellence in education and research.`;
    }
    
    // Help query
    if (queryType === 'help') {
      return `🤖 **AI Student Assistant - Complete Guide**

**What I Can Help You With:**

**📚 Academic Information:**
• Course grades, GPA calculations, and academic standing
• Current and completed courses with details
• Program requirements and progress tracking
• Lecturer information and course materials

**📝 Assignments & Coursework:**
• Upcoming assignment deadlines and requirements
• Submission status and grades received
• Project guidelines and resources
• Time management for coursework

**📋 Exams & Assessments:**
• Exam schedules, locations, and formats
• Past exam results and performance analysis
• Study preparation tips and resources
• Grade calculations and projections

**💰 Financial Matters:**
• Tuition fees and payment status
• Outstanding balances and due dates
• Scholarship information and applications
• Financial aid and payment plans

**📅 Schedule & Attendance:**
• Daily, weekly, and monthly timetable
• Lecture schedules and room locations
• Attendance records and percentage
• Class cancellations and rescheduling

**🎓 Student Life:**
• Campus events and activities
• Club and society information
• Library resources and book availability
• Campus facilities and services

**📈 Performance & Progress:**
• Comprehensive progress reports
• GPA trends and improvement suggestions
• Study habit recommendations
• Goal setting and achievement tracking

**🏛️ University Information:**
• University policies and procedures
• Important dates and deadlines
• Contact information for departments
• Campus news and updates

**Try These Sample Questions:**
• "What's my current GPA?"
• "Show me assignments due this week"
• "What exams do I have coming up?"
• "How much do I owe in tuition?"
• "What's my attendance percentage?"
• "What lectures do I have today?"
• "Recommend some study tips"
• "What library books are available?"
• "Any campus events this month?"
• "How can I improve my grades?"
• "Tell me about my program"
• "What's my class schedule for tomorrow?"
• "Check my financial balance"
• "How many credits have I completed?"
• "What's my academic standing?"

**Pro Tip:** Be specific in your questions for more detailed answers!`;
    }
    
    // Default response
    const randomEncouragement = knowledgeBase.encouragement[
      Math.floor(Math.random() * knowledgeBase.encouragement.length)
    ];
    
    return `🤔 **I'm not sure I understood your question.**

${randomEncouragement}

**Here's what I can help you with:**

• **Academic Performance** - Grades, GPA, courses, progress
• **Assignments & Exams** - Deadlines, submissions, results
• **Financial Status** - Fees, payments, balances
• **Schedule** - Timetable, lectures, classes
• **Attendance** - Records, percentage, trends
• **Library** - Books, resources, availability
• **Campus Life** - Events, activities, clubs
• **Study Help** - Tips, strategies, resources
• **University Info** - Policies, contacts, facilities

**Try asking me one of these:**
"What's my current GPA?"
"What assignments are due this week?"
"What's my attendance percentage?"
"How much do I owe in fees?"
"What lectures do I have today?"
"Recommend study tips for exams"
"Check my academic progress"
"What library books are available?"`;
  };

  // Handle chat scroll
  const handleChatScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      setIsScrolledToBottom(scrollHeight - scrollTop - clientHeight < 100);
    }
  };

  // Event handlers
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    setTimeout(() => {
      const aiResponse = generateAIResponse(inputText);
      
      const aiMessage = {
        id: messages.length + 2,
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 600);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (studentData && studentStats) {
      setMessages([{
        id: 1,
        text: generateWelcomeMessage(studentData, studentStats),
        sender: 'ai',
        timestamp: new Date()
      }]);
    }
  };

  const quickQuestions = [
    "What's my GPA?",
    "Assignments due?",
    "How much do I owe?",
    "Lectures today?",
    "My attendance?",
    "Study tips",
    "Exam schedule",
    "Library books",
    "Campus events",
    "Progress report"
  ];

  // Scroll to bottom
  useEffect(() => {
    if (isScrolledToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isScrolledToBottom]);

  // Add scroll listener
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleChatScroll);
      return () => container.removeEventListener('scroll', handleChatScroll);
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchAllStudentData();
  }, [fetchAllStudentData]);

  // Loading state
  if (isLoadingInitial) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '2rem auto'
        }}></div>
        <h3 style={{ color: '#2c3e50', marginBottom: '1rem' }}>
          Loading your personal AI assistant...
        </h3>
        <p style={{ color: '#7f8c8d' }}>
          Fetching your academic data from the database
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: isMobile ? '0.5rem' : '1rem',
      minHeight: 'calc(100vh - 100px)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
        borderRadius: '12px',
        padding: isMobile ? '1.5rem' : '2rem',
        color: 'white',
        marginBottom: isMobile ? '1.5rem' : '2rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center', 
          justifyContent: 'space-between',
          gap: isMobile ? '1rem' : '0'
        }}>
          <div>
            <h1 style={{ 
              fontSize: isMobile ? '1.5rem' : '2rem', 
              fontWeight: 'bold', 
              margin: '0 0 0.5rem 0',
              lineHeight: '1.2'
            }}>
              🤖 AI Student Assistant
            </h1>
            <p style={{ 
              opacity: 0.9, 
              margin: 0,
              fontSize: isMobile ? '0.9rem' : '1.1rem',
              lineHeight: '1.4'
            }}>
              Personalized assistance for {studentData?.full_name || 'Student'}
            </p>
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              marginTop: '0.75rem',
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              flexWrap: 'wrap'
            }}>
              <span style={{ 
                background: 'rgba(255,255,255,0.2)', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '20px' 
              }}>
                ID: {studentData?.student_id || 'N/A'}
              </span>
              <span style={{ 
                background: 'rgba(255,255,255,0.2)', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '20px' 
              }}>
                {studentData?.program || 'N/A'}
              </span>
              <span style={{ 
                background: 'rgba(255,255,255,0.2)', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '20px' 
              }}>
                Y{studentData?.year_of_study || 'N/A'}.S{studentData?.semester || 'N/A'}
              </span>
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: isMobile ? '0.75rem' : '1rem',
            borderRadius: '10px',
            textAlign: 'center',
            minWidth: isMobile ? '100px' : '120px',
            marginTop: isMobile ? '0.5rem' : '0',
            alignSelf: isMobile ? 'stretch' : 'auto'
          }}>
            <div style={{ 
              fontSize: isMobile ? '0.8rem' : '0.9rem', 
              opacity: 0.8,
              marginBottom: '0.25rem'
            }}>
              Current CGPA
            </div>
            <div style={{ 
              fontSize: isMobile ? '1.75rem' : '2rem', 
              fontWeight: 'bold',
              lineHeight: '1'
            }}>
              {studentStats?.gpa?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Interface - With increased height */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: isMobile ? 'calc(100vh - 250px)' : '70vh',
        minHeight: isMobile ? '500px' : '600px',
        flex: '1'
      }}>
        {/* Chat Header */}
        <div style={{
          padding: isMobile ? '1rem' : '1.5rem',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8f9fa',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.75rem' : '1rem' }}>
            <div style={{
              width: isMobile ? '32px' : '40px',
              height: isMobile ? '32px' : '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              flexShrink: 0
            }}>
              🤖
            </div>
            <div>
              <h2 style={{ 
                fontSize: isMobile ? '1rem' : '1.25rem', 
                fontWeight: '600', 
                margin: 0,
                color: '#2c3e50',
                lineHeight: '1.2'
              }}>
                Personal Assistant
              </h2>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                color: '#7f8c8d'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#4CAF50'
                }}></div>
                <span>Connected to your academic database</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClearChat}
            style={{
              background: 'none',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1rem',
              color: '#e74c3c',
              cursor: 'pointer',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <span>🗑️</span>
            {isMobile ? 'Clear' : 'Clear Chat'}
          </button>
        </div>

        {/* Messages Container - Increased height and better scrolling */}
        <div 
          ref={chatContainerRef}
          style={{
            flex: 1,
            padding: isMobile ? '1rem' : '1.5rem',
            overflowY: 'auto',
            background: '#fafafa',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}
        >
          <div style={{ flex: 1 }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  marginBottom: isMobile ? '0.75rem' : '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: isMobile ? '0.5rem' : '0.75rem',
                  maxWidth: '95%'
                }}>
                  {message.sender === 'ai' && (
                    <div style={{
                      width: isMobile ? '28px' : '32px',
                      height: isMobile ? '28px' : '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '0.25rem'
                    }}>
                      <span style={{ 
                        color: 'white',
                        fontSize: isMobile ? '0.8rem' : '0.9rem'
                      }}>🤖</span>
                    </div>
                  )}
                  <div style={{
                    background: message.sender === 'user' ? '#4361ee' : 'white',
                    color: message.sender === 'user' ? 'white' : '#2c3e50',
                    padding: isMobile ? '0.75rem' : '1rem',
                    borderRadius: message.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    maxWidth: '100%',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-line',
                    fontSize: isMobile ? '0.875rem' : '0.9375rem',
                    lineHeight: '1.6'
                  }}>
                    <div style={{ 
                      lineHeight: '1.6',
                      fontWeight: message.sender === 'user' ? '400' : '500'
                    }}>
                      {message.text}
                    </div>
                    <div style={{
                      fontSize: isMobile ? '0.7rem' : '0.75rem',
                      opacity: 0.7,
                      marginTop: '0.5rem',
                      textAlign: 'right'
                    }}>
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                  {message.sender === 'user' && (
                    <div style={{
                      width: isMobile ? '28px' : '32px',
                      height: isMobile ? '28px' : '32px',
                      borderRadius: '50%',
                      background: '#f72585',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '0.25rem'
                    }}>
                      <span style={{ 
                        color: 'white',
                        fontSize: isMobile ? '0.8rem' : '0.9rem'
                      }}>👤</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '0.75rem' : '1rem',
                marginTop: '1rem'
              }}>
                <div style={{
                  width: isMobile ? '28px' : '32px',
                  height: isMobile ? '28px' : '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ 
                    color: 'white',
                    fontSize: isMobile ? '0.8rem' : '0.9rem'
                  }}>🤖</span>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#4361ee',
                    animation: 'bounce 1.4s infinite'
                  }}></div>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#4361ee',
                    animation: 'bounce 1.4s infinite',
                    animationDelay: '0.2s'
                  }}></div>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#4361ee',
                    animation: 'bounce 1.4s infinite',
                    animationDelay: '0.4s'
                  }}></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Questions - FIXED with proper spacing */}
        <div 
          ref={quickQuestionsRef}
          style={{
            padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
            borderTop: '1px solid #e9ecef',
            background: '#f8f9fa',
            flexShrink: 0,
            minHeight: '80px', // Ensure minimum height
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
        >
          <div style={{ 
            fontSize: isMobile ? '0.75rem' : '0.875rem', 
            color: '#7f8c8d',
            marginBottom: isMobile ? '0.5rem' : '0.75rem',
            fontWeight: '500',
            paddingLeft: '4px'
          }}>
            Quick questions:
          </div>
          <div style={{
            display: 'flex',
            gap: isMobile ? '0.5rem' : '0.6rem',
            flexWrap: 'wrap',
            overflowX: 'auto',
            paddingBottom: '8px', // Extra padding for scrollbar
            WebkitOverflowScrolling: 'touch',
            alignItems: 'center',
            minHeight: '36px' // Minimum height for buttons area
          }}>
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setInputText(question)}
                style={{
                  padding: isMobile ? '0.5rem 0.9rem' : '0.6rem 1rem',
                  background: 'rgba(67, 97, 238, 0.1)',
                  color: '#4361ee',
                  border: '1px solid rgba(67, 97, 238, 0.2)',
                  borderRadius: '20px',
                  fontSize: isMobile ? '0.75rem' : '0.8125rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: '1',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(67, 97, 238, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(67, 97, 238, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(67, 97, 238, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area - Responsive */}
        <div style={{
          padding: isMobile ? '1rem' : '1.5rem',
          borderTop: '1px solid #e9ecef',
          background: 'white',
          flexShrink: 0
        }}>
          <div style={{ 
            display: 'flex', 
            gap: isMobile ? '0.75rem' : '1rem',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            <div style={{ 
              flex: 1, 
              position: 'relative',
              minHeight: isMobile ? '50px' : '60px'
            }}>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your academics..."
                style={{
                  width: '100%',
                  padding: isMobile ? '0.75rem 0.75rem 0.75rem 2.5rem' : '1rem 1rem 1rem 3rem',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem',
                  minHeight: isMobile ? '50px' : '60px',
                  maxHeight: '120px',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  lineHeight: '1.5'
                }}
                rows="2"
              />
              <div style={{
                position: 'absolute',
                left: isMobile ? '0.75rem' : '1rem',
                top: isMobile ? '0.75rem' : '1rem',
                color: '#adb5bd',
                fontSize: isMobile ? '1rem' : '1.1rem'
              }}>
                💬
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              style={{
                background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: isMobile ? '0.75rem 1.5rem' : '0 2rem',
                cursor: !inputText.trim() || isLoading ? 'not-allowed' : 'pointer',
                opacity: !inputText.trim() || isLoading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: isMobile ? '0.875rem' : '0.9375rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px rgba(67, 97, 238, 0.4)',
                minWidth: isMobile ? '100%' : 'auto',
                height: isMobile ? '44px' : 'auto',
                minHeight: isMobile ? '44px' : 'auto'
              }}
              onMouseEnter={(e) => {
                if (inputText.trim() && !isLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(67, 97, 238, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (inputText.trim() && !isLoading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(67, 97, 238, 0.4)';
                }
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: isMobile ? '14px' : '16px',
                    height: isMobile ? '14px' : '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  {isMobile ? '...' : 'Processing...'}
                </>
              ) : (
                <>
                  <span style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>📤</span>
                  {isMobile ? 'Send' : 'Send Message'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: isMobile ? '1rem' : '1.5rem',
        textAlign: 'center',
        color: '#7f8c8d',
        fontSize: isMobile ? '0.75rem' : '0.875rem',
        padding: '0.5rem'
      }}>
        <p style={{ margin: 0 }}>
          AI Assistant • Connected to your academic database • Data updates in real-time
        </p>
        <p style={{ 
          margin: '0.25rem 0 0 0', 
          fontSize: isMobile ? '0.7rem' : '0.75rem',
          opacity: 0.7
        }}>
          Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 1;
          }
          30% {
            transform: translateY(-6px);
            opacity: 0.7;
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Custom scrollbar for chat */
        .chat-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .chat-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .chat-container::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        
        .chat-container::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
        
        /* Custom scrollbar for quick questions */
        .quick-questions-container::-webkit-scrollbar {
          height: 4px;
        }
        
        .quick-questions-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 2px;
          margin: 0 4px;
        }
        
        .quick-questions-container::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 2px;
        }
        
        .quick-questions-container::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
        
        /* Mobile-specific optimizations */
        @media (max-width: 480px) {
          .quick-questions {
            padding: 0.75rem !important;
          }
          
          .message-input textarea {
            font-size: 16px !important; /* Prevents zoom on iOS */
          }
          
          .quick-question-button {
            padding: 0.4rem 0.8rem !important;
            font-size: 0.7rem !important;
          }
        }
        
        /* Tablet optimizations */
        @media (max-width: 768px) and (min-width: 481px) {
          .chat-container {
            height: 65vh !important;
          }
          
          .quick-questions {
            padding: 1rem !important;
          }
        }
        
        /* Large screen optimizations */
        @media (min-width: 1200px) {
          .chat-container {
            height: 75vh !important;
          }
        }
        
        /* Improve touch targets */
        button, 
        .quick-question-button,
        .send-button {
          min-height: 44px;
          min-width: 44px;
        }
        
        /* Focus styles for accessibility */
        button:focus,
        textarea:focus {
          outline: 2px solid #4361ee;
          outline-offset: 2px;
        }
        
        /* Smooth transitions */
        * {
          transition: background-color 0.2s ease, transform 0.2s ease;
        }
        
        /* Print styles */
        @media print {
          .chat-container {
            height: auto !important;
            box-shadow: none !important;
          }
          
          .input-area,
          .quick-questions,
          .clear-button {
            display: none !important;
          }
        }
        
        /* Fix for scrollbar in Firefox */
        .quick-questions-container {
          scrollbar-width: thin;
          scrollbar-color: #c1c1c1 #f1f1f1;
        }
        
        /* Ensure quick questions are always visible */
        .quick-questions-section {
          position: relative;
          z-index: 1;
          background: #f8f9fa;
        }
        
        /* Add subtle gradient fade to indicate more questions */
        .quick-questions-container::after {
          content: '';
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 30px;
          background: linear-gradient(to right, transparent, #f8f9fa);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default Chatbot;