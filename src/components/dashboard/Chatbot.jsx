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
  const [activeCourseIds, setActiveCourseIds] = useState([]);
  
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

  // Enhanced AI knowledge base with more responses
  const knowledgeBase = {
    // Greeting responses
    greetings: [
      "Great to see you! How can I assist with your studies today? 📚",
      "Hello! Ready to help you with your academic journey! 🎓",
      "Hi there! What would you like to know about your progress? 📈",
      "Welcome back! How can I make your study day better? 🌟",
      "Hey! Let's work on your academic success together! 💪",
      "Greetings! I'm here to help you ace your courses! 🏆",
      "Hello there! Ready to tackle your academic challenges? 💯",
      "Hi! How's your learning journey going? Let me help! 🚀",
      "Good to see you! What academic goals can we work on today? 🎯",
      "Welcome! I'm excited to help you succeed in your studies! ✨"
    ],
    
    // Thank you responses
    thanks: [
      "You're welcome! Always happy to help with your studies! 😊",
      "No problem at all! Let me know if you need anything else! 👍",
      "Glad I could help! Keep up the great work! 🎯",
      "Anytime! Remember, I'm here 24/7 for your academic needs! ⏰",
      "My pleasure! Wishing you success in all your courses! 🏆",
      "Happy to assist! Your success is my priority! 💫",
      "You're very welcome! Keep crushing those academic goals! 💪",
      "No thanks needed! Just doing my part to help you succeed! 😄",
      "Always here for you! Don't hesitate to ask more questions! 🤝",
      "The pleasure is mine! Watching you succeed makes my day! 🌟"
    ],
    
    // Encouragement responses
    encouragement: [
      "You're doing amazing! Keep pushing forward! 🚀",
      "Stay focused and you'll achieve all your academic goals! 🎯",
      "Remember, every small step counts toward your success! 👣",
      "You've got this! Your dedication will pay off! 💯",
      "Keep up the great work! Your progress is impressive! 📊",
      "Believe in yourself! You're capable of great things! 🌟",
      "Consistency is key! Keep showing up and you'll succeed! 🔑",
      "Your hard work is paying off! Stay on this path! 💪",
      "Learning is a journey! Enjoy every step of the way! 🛣️",
      "You're growing every day! That's something to celebrate! 🎉"
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
      "**Goal Setting**: Set specific, measurable academic goals 🎯",
      "**Mind Mapping**: Create visual diagrams to connect ideas 🗺️",
      "**Study Groups**: Collaborate with peers for better understanding 👥",
      "**Note Summaries**: Create concise summaries of key points 📝",
      "**Real-World Application**: Connect theory to practical examples 🌍",
      "**Digital Tools**: Use apps for flashcards and organization 📱",
      "**Regular Review**: Revisit material weekly to retain information 🔄",
      "**Ask Questions**: Don't hesitate to seek clarification ❓"
    ],

    // Motivational quotes
    motivational: [
      "Education is the most powerful weapon which you can use to change the world. - Nelson Mandela",
      "The beautiful thing about learning is that no one can take it away from you. - B.B. King",
      "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
      "The expert in anything was once a beginner. - Helen Hayes",
      "Don't let what you cannot do interfere with what you can do. - John Wooden",
      "Believe you can and you're halfway there. - Theodore Roosevelt",
      "Your education is a dress rehearsal for a life that is yours to lead. - Nora Ephron",
      "The only way to learn mathematics is to do mathematics. - Paul Halmos",
      "Learning never exhausts the mind. - Leonardo da Vinci",
      "Education is not preparation for life; education is life itself. - John Dewey"
    ],

    // Exam preparation tips
    examTips: [
      "**Start Early**: Begin studying at least 2 weeks before exams 📅",
      "**Past Papers**: Practice with previous exam questions 📋",
      "**Study Groups**: Collaborate with classmates for difficult topics 👥",
      "**Healthy Habits**: Get adequate sleep and nutrition before exams 🍎",
      "**Time Management**: Allocate specific times for each subject ⏱️",
      "**Mock Tests**: Take practice tests under exam conditions ✍️",
      "**Active Review**: Explain concepts out loud to reinforce learning 🗣️",
      "**Organization**: Keep all study materials in one place 📚",
      "**Breaks**: Take regular breaks to maintain concentration 🧠",
      "**Positive Mindset**: Stay calm and confident during exams 🧘"
    ],

    // Assignment help
    assignmentHelp: [
      "**Understand Requirements**: Read the assignment brief carefully 📖",
      "**Plan Ahead**: Break the assignment into manageable tasks 📋",
      "**Research Thoroughly**: Use reliable academic sources 🔍",
      "**Outline First**: Create a structure before writing 📝",
      "**Proofread**: Check for errors before submission ✅",
      "**Cite Sources**: Always give credit to original authors 📚",
      "**Ask Questions**: Clarify doubts with your lecturer early ❓",
      "**Peer Review**: Get feedback from classmates 👥",
      "**Time Management**: Set deadlines for each section ⏰",
      "**Quality Over Quantity**: Focus on depth rather than length 🎯"
    ],

    // General advice
    advice: [
      "**Stay Organized**: Use planners or digital calendars 📅",
      "**Ask for Help**: Don't struggle alone - seek assistance when needed 🤝",
      "**Balance**: Maintain a healthy work-life balance ⚖️",
      "**Network**: Connect with classmates and professors 👥",
      "**Resources**: Utilize all available campus resources 📚",
      "**Health First**: Prioritize physical and mental health 🧘",
      "**Curiosity**: Stay curious and ask questions in class ❓",
      "**Feedback**: Act on feedback to improve performance 🔄",
      "**Goals**: Set both short-term and long-term academic goals 🎯",
      "**Enjoy Learning**: Find joy in the learning process itself 😊"
    ]
  };

  // CORRECTED GPA CALCULATION (Matches Results and Dashboard)
  const getGradePoints = (grade) => {
    if (!grade) return 0.0;
    const gradeMap = {
      'A': 5.0, 'B+': 4.5, 'B': 4.0, 'C+': 3.5,
      'C': 3.0, 'D+': 2.5, 'D': 2.0, 'E': 1.0, 'F': 0.0
    };
    return gradeMap[grade.toUpperCase()] || 0.0;
  };

  const getGradeFromMarks = (marks) => {
    if (!marks && marks !== 0) return 'N/A';
    const numericMarks = parseFloat(marks);
    if (isNaN(numericMarks)) return 'N/A';
    
    if (numericMarks >= 70) return 'A';
    if (numericMarks >= 60) return 'B+';
    if (numericMarks >= 50) return 'B';
    if (numericMarks >= 45) return 'C+';
    if (numericMarks >= 40) return 'C';
    if (numericMarks >= 35) return 'D+';
    if (numericMarks >= 30) return 'D';
    if (numericMarks >= 20) return 'E';
    return 'F';
  };

  const calculateGPA = (studentCourses) => {
    if (!studentCourses || studentCourses.length === 0) return 0.0;
    
    // Filter completed courses with grades
    const completedCourses = studentCourses.filter(
      course => course.status === 'completed' && (course.grade || course.marks)
    );
    
    if (completedCourses.length === 0) return 0.0;
    
    let totalPoints = 0;
    let totalCredits = 0;
    
    completedCourses.forEach(course => {
      const grade = course.grade || getGradeFromMarks(course.marks);
      const gradePoints = course.grade_points || getGradePoints(grade);
      const credits = course.credits || 3;
      
      if (gradePoints && credits) {
        totalPoints += gradePoints * credits;
        totalCredits += credits;
      }
    });
    
    return totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0.0;
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

  // CORRECTED: Fetch upcoming lectures (filtered for active courses only)
  const fetchUpcomingLectures = async (activeCourseIds) => {
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

      // Filter lectures for active courses only
      const filteredLectures = lectures?.filter(lecture => 
        activeCourseIds.includes(lecture.course_id)
      ) || [];

      return filteredLectures.map(lecture => {
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
    } catch (error) {
      console.error('Error fetching lectures:', error);
      return [];
    }
  };

  // CORRECTED: Fetch assignments for active courses only
// CORRECTED: Fetch assignments for active courses only with student-specific submissions
const fetchAssignments = async (activeCourseIds, studentId) => {
  try {
    if (!activeCourseIds.length) return [];
    if (!studentId) return [];

    const { data: assignments, error } = await supabase
      .from('assignments')
      .select(`
        *,
        courses (*),
        assignment_submissions (
          *
        ).filter(student_id.eq.${studentId})
      `)
      .in('course_id', activeCourseIds)
      .eq('status', 'published')
      .order('due_date', { ascending: true });

    if (error) throw error;

    // Process assignments data
    return assignments?.map(assignment => ({
      ...assignment,
      submissions: assignment.assignment_submissions || []
    })) || [];

  } catch (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }
};

// CORRECTED: Fetch exams for active courses only with student-specific submissions
const fetchExams = async (activeCourseIds, studentId) => {
  try {
    if (!activeCourseIds.length) return [];
    if (!studentId) return [];

    const { data: exams, error } = await supabase
      .from('examinations')
      .select(`
        *,
        courses (*),
        exam_submissions (
          *
        ).filter(student_id.eq.${studentId})
      `)
      .in('course_id', activeCourseIds)
      .eq('status', 'published')
      .order('start_time', { ascending: true });

    if (error) throw error;

    // Process exams data
    return exams?.map(exam => ({
      ...exam,
      submissions: exam.exam_submissions || []
    })) || [];

  } catch (error) {
    console.error('Error fetching exams:', error);
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
            credits,
            year,
            semester
          )
        `)
        .eq('student_id', student.id);

      if (coursesError) throw coursesError;

      // Process courses with credits
      const coursesWithGrades = (studentCourses || []).map(sc => {
        const grade = sc.grade || getGradeFromMarks(sc.marks);
        return {
          ...sc,
          grade: grade,
          grade_points: sc.grade_points || getGradePoints(grade),
          credits: sc.courses?.credits || 3,
          course_code: sc.courses?.course_code || 'N/A',
          course_name: sc.courses?.course_name || 'Unknown Course',
          status: sc.status || 'in_progress'
        };
      });

      // Calculate GPA using the updated method
      const gpa = calculateGPA(coursesWithGrades);

      // 3. Get active courses (not completed)
      const activeCourses = coursesWithGrades.filter(c => c.status !== 'completed') || [];
      const activeCourseIds = activeCourses.map(sc => sc.course_id).filter(Boolean);
      setActiveCourseIds(activeCourseIds);

      // 4. CORRECTED: Fetch data for active courses only
      const lectures = await fetchUpcomingLectures(activeCourseIds);
      const assignments = await fetchAssignments(activeCourseIds, student.id);
      const exams = await fetchExams(activeCourseIds, student.id);

      // 5. Fetch financial records
      const { data: finance } = await supabase
        .from('financial_records')
        .select('*')
        .eq('student_id', student.id)
        .eq('academic_year', student.academic_year)
        .order('payment_date', { ascending: false });

      // 6. Fetch attendance records
      const { data: attendance } = await supabase
        .from('attendance_records')
        .select(`
          *,
          courses (*)
        `)
        .eq('student_id', student.id)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });

      // 7. Fetch timetable slots for active courses
      const { data: timetable } = activeCourseIds.length > 0 ? await supabase
        .from('timetable_slots')
        .select(`
          *,
          courses (*),
          lecturers (*)
        `)
        .in('course_id', activeCourseIds)
        .eq('is_active', true) : { data: [] };

      // 8. Fetch library books
      const { data: libraryBooks } = await supabase
        .from('library_books')
        .select('*')
        .eq('status', 'available')
        .limit(5);

      // 9. Fetch campus events
      const { data: events } = await supabase
        .from('campus_events')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(5);

      // 10. Fetch academic calendar
      const { data: academicCalendar } = await supabase
        .from('academic_calendar')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(5);

      // Calculate statistics
      const processedStats = {
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
          inProgress: activeCourses.length || 0,
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

        // GPA calculation (matches Dashboard and Results)
        gpa: gpa,

        // Lectures for active courses only
        lectures: lectures,

        // CORRECTED: Assignment statistics for active courses only
        assignments: {
          total: assignments?.length || 0,
          submitted: assignments?.filter(a => 
            a.submissions?.some(s => s.student_id === student.id)
          ).length || 0,
          pending: assignments?.filter(a => {
            const submission = a.submissions?.find(s => s.student_id === student.id);
            return !submission && new Date(a.due_date) > new Date();
          }).length || 0,
          graded: assignments?.filter(a => {
            const submission = a.submissions?.find(s => s.student_id === student.id);
            return submission?.status === 'graded';
          }).length || 0,
          overdue: assignments?.filter(a => {
            const submission = a.submissions?.find(s => s.student_id === student.id);
            return !submission && new Date(a.due_date) < new Date();
          }).length || 0,
          upcoming: assignments?.filter(a => {
            const submission = a.submissions?.find(s => s.student_id === student.id);
            return !submission && new Date(a.due_date) > new Date();
          }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 5),
          recentGrades: assignments?.filter(a => {
            const submission = a.submissions?.find(s => s.student_id === student.id);
            return submission?.status === 'graded';
          }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 3)
        },

        // CORRECTED: Exam statistics for active courses only
        exams: {
          total: exams?.length || 0,
          completed: exams?.filter(e => {
            const submission = e.submissions?.find(s => s.student_id === student.id);
            return submission && submission.status === 'graded';
          }).length || 0,
          upcoming: exams?.filter(e => {
            const submission = e.submissions?.find(s => s.student_id === student.id);
            return !submission && new Date(e.start_time) > new Date();
          }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time)).slice(0, 5),
          performance: calculateExamPerformance(exams?.filter(e => 
            e.submissions?.some(s => s.student_id === student.id && s.status === 'graded')
          ) || [])
        },

        // Financial statistics
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

        // Timetable statistics for active courses
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
      const submission = exam.submissions?.find(s => s.student_id === studentData?.id);
      return submission?.percentage || 0;
    }).filter(p => p > 0);

    if (percentages.length === 0) return { average: 0, highest: 0, lowest: 0, grades: [] };

    const average = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    
    // Calculate grade distribution
    const grades = percentages.map(p => {
      if (p >= 70) return 'A';
      if (p >= 60) return 'B+';
      if (p >= 50) return 'B';
      if (p >= 45) return 'C+';
      if (p >= 40) return 'C';
      if (p >= 35) return 'D+';
      if (p >= 30) return 'D';
      if (p >= 20) return 'E';
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

  // Enhanced welcome message generator
  const generateWelcomeMessage = (student, stats) => {
    const currentClass = stats.timetable.currentClass;
    const nextAssignment = stats.assignments.upcoming[0];
    const nextExam = stats.exams.upcoming[0];
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Random motivational quote
    const randomQuote = knowledgeBase.motivational[
      Math.floor(Math.random() * knowledgeBase.motivational.length)
    ];

    return `👋 **${getGreeting()} ${student.full_name.split(' ')[0]}!** 

I'm your AI Student Assistant, connected to your personal academic database. Happy ${dayOfWeek}! 😊

**📚 Academic Summary:**
• **CGPA:** ${stats.gpa.toFixed(2)} (calculated from ${stats.courses.completed} completed courses)
• **Courses:** ${stats.courses.completed} completed, ${stats.courses.inProgress} in progress
• **Year:** ${student.year_of_study || 'N/A'}.${student.semester || 'N/A'}

${currentClass ? `**📅 Current Class:**\n• **${currentClass.courses?.course_name || 'Class'}** until ${formatTime(currentClass.end_time)} in ${currentClass.room_number}\n` : ''}

${nextAssignment ? `**📝 Next Assignment:**\n• **${nextAssignment.title}** due ${formatDate(nextAssignment.due_date)}\n` : ''}

${nextExam ? `**📋 Next Exam:**\n• **${nextExam.title}** on ${formatDate(nextExam.start_time)}\n` : ''}

**🎯 Quick Stats:**
• **Attendance Rate:** ${stats.attendance.rate}%
• **Pending Assignments:** ${stats.assignments.pending}
• **Upcoming Exams:** ${stats.exams.upcoming.length}
• **Financial Balance:** $${(stats.finance.totalPending + stats.finance.totalPartial).toFixed(2)}

**💭 Motivational Quote:**
"${randomQuote}"

**How can I help you today?** Here are some things you can ask:
1. "How's my GPA looking?"
2. "What assignments are due this week?"
3. "Show me today's schedule"
4. "What's my attendance status?"
5. "Any upcoming exams?"
6. "Check my financial balance"
7. "Recommend study tips"
8. "What library books are available?"
9. "Any campus events this week?"
10. "How can I improve my grades?"

Or just chat with me about anything academic! I'm here to help! 🤖`;
  };

  // Enhanced query detection with more patterns
  const detectQueryType = (query) => {
    const q = query.toLowerCase();
    
    // Enhanced greetings detection
    if (/(hi|hello|hey|greetings|good\s*(morning|afternoon|evening|day)|what'?s\s*up|howdy|yo|sup|hi\s*there|hello\s*there|morning|afternoon|evening|hola|bonjour|namaste|aloha|ciao|salam|shalom|how\s*are\s*you|how'?s\s*it\s*going|how'?s\s*(everything|life|your\s*day)|what'?s\s*(happening|new|good|poppin)|long\s*time\s*no\s*see|nice\s*to\s*see\s*you|pleased\s*to\s*meet\s*you|how\s*have\s*you\s*been|good\s*to\s*see\s*you|hiya|hey\s*there|salutations|welcome\s*back|lovely\s*to\s*see\s*you|great\s*to\s*see\s*you)/.test(q)) {
      return 'greeting';
    }
    
    // Thanks detection
    if (/(thank|thanks|thankyou|appreciate|grateful|obliged|cheers|ta|much\s*obliged)/.test(q)) {
      return 'thanks';
    }
    
    // Courses & GPA
    if (/(gpa|cgpa|grade\s*point|academic\s*standing|cumulative|grades?|marks?|scores?|academic\s*performance)/.test(q)) {
      return q.includes('gpa') || q.includes('cgpa') || q.includes('grade point') ? 'gpa' : 'grades';
    }
    
    if (/(course|subject|unit|module|class)/.test(q)) {
      return 'courses';
    }
    
    // Assignments
    if (/(assignment|homework|project|coursework|essay|report|paper|dissertation|thesis|portfolio)/.test(q)) {
      return 'assignments';
    }
    
    if (/(deadline|due\s*date|submission|hand\s*in|submit|when\s*is)/.test(q)) {
      return 'deadlines';
    }
    
    // Exams
    if (/(exam|test|midterm|final|quiz|assessment|evaluation|paper|examination)/.test(q)) {
      return 'exams';
    }
    
    // Schedule & Lectures
    if (/(lecture|class|schedule|timetable|routine|when\s*do\s*i|what\s*time)/.test(q)) {
      return 'schedule';
    }
    
    if (/(today|now|current)/.test(q)) {
      return 'today';
    }
    
    if (/(tomorrow|next\s*day)/.test(q)) {
      return 'tomorrow';
    }
    
    if (/(week|upcoming|next\s*week|this\s*week)/.test(q)) {
      return 'week';
    }
    
    // Finance
    if (/(fee|payment|finance|balance|money|tuition|fees|bill|invoice|payment|scholarship|loan)/.test(q)) {
      return 'finance';
    }
    
    // Attendance
    if (/(attendance|present|absent|late|attended|punctual|late|missing)/.test(q)) {
      return 'attendance';
    }
    
    // Library
    if (/(library|book|resource|study\s*material|reading|textbook|journal|publication)/.test(q)) {
      return 'library';
    }
    
    // Events
    if (/(event|activity|campus|extra\s*curricular|club|society|workshop|seminar|conference)/.test(q)) {
      return 'events';
    }
    
    // Study help
    if (/(study|learn|prepar|improve|tip|advice|suggestion|how\s*to|method|technique|strategy)/.test(q)) {
      return 'study';
    }
    
    // Progress & Performance
    if (/(progress|performance|how\s*am\s*i|summary|overview|report|status|update)/.test(q)) {
      return 'progress';
    }
    
    // Help
    if (/(help|what\s*can|capabilities|assist|how\s*to\s*use|guide|manual|tutorial)/.test(q)) {
      return 'help';
    }
    
    // University info
    if (/(university|campus|faculty|department|program|college|school|institution)/.test(q)) {
      return 'university';
    }
    
    // Personal info
    if (/(my\s*info|profile|details|who\s*am\s*i|student\s*info|information\s*about\s*me)/.test(q)) {
      return 'profile';
    }
    
    // Motivational/Encouragement
    if (/(motivat|inspire|encourage|cheer\s*up|feeling\s*(down|sad|stressed|overwhelmed))/i.test(q)) {
      return 'motivation';
    }
    
    // Goodbye
    if (/(bye|goodbye|see\s*you|farewell|take\s*care|later|ciao|adios)/i.test(q)) {
      return 'goodbye';
    }
    
    // How are you
    if (/(how\s*are\s*you|how\s*do\s*you\s*do|how'?s\s*it\s*going)/i.test(q)) {
      return 'howareyou';
    }
    
    return 'unknown';
  };

  // ENHANCED AI Response Generator with more intelligent responses
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
      const randomTip = knowledgeBase.studyTips[
        Math.floor(Math.random() * knowledgeBase.studyTips.length)
      ];
      
      return `${randomGreeting}

**Quick Tip:** ${randomTip}

What would you like to know about your academic progress today?`;
    }
    
    // Handle thanks
    if (queryType === 'thanks') {
      const randomThanks = knowledgeBase.thanks[
        Math.floor(Math.random() * knowledgeBase.thanks.length)
      ];
      const randomEncouragement = knowledgeBase.encouragement[
        Math.floor(Math.random() * knowledgeBase.encouragement.length)
      ];
      
      return `${randomThanks}

${randomEncouragement}`;
    }
    
    // Handle "how are you"
    if (queryType === 'howareyou') {
      return `I'm doing great, thank you for asking! 😊 As an AI assistant, I don't have feelings, but I'm always ready and excited to help you with your academic journey!

How about you? How's your day going? Is there anything academic I can assist you with today?`;
    }
    
    // Handle motivation requests
    if (queryType === 'motivation') {
      const randomQuote = knowledgeBase.motivational[
        Math.floor(Math.random() * knowledgeBase.motivational.length)
      ];
      const randomEncouragement = knowledgeBase.encouragement[
        Math.floor(Math.random() * knowledgeBase.encouragement.length)
      ];
      
      return `🌟 **Here's some motivation for you:**

"${randomQuote}"

${randomEncouragement}

**Remember:** Every expert was once a beginner. Keep going! 💪`;
    }
    
    // Handle goodbye
    if (queryType === 'goodbye') {
      return `👋 Goodbye, ${studentData.full_name.split(' ')[0]}! 

It was great chatting with you! Remember:
• Take regular breaks during study sessions
• Stay hydrated and get enough sleep
• Don't hesitate to reach out if you need help

Wishing you all the best in your studies! Come back anytime! 📚✨`;
    }
    
    // GPA query
    if (queryType === 'gpa') {
      const topCourses = studentStats.courses.list
        .filter(c => c.gradePoints && c.status === 'completed')
        .sort((a, b) => b.gradePoints - a.gradePoints)
        .slice(0, 5);
      
      const completedCourses = studentStats.courses.list.filter(c => c.status === 'completed');
      const totalCredits = completedCourses.reduce((sum, c) => sum + c.credits, 0);
      
      let advice = '';
      let icon = '📊';
      
      if (studentStats.gpa < 2.0) {
        advice = "You might want to speak with an academic advisor. Focus on passing current courses.";
        icon = "⚠️";
      } else if (studentStats.gpa < 3.0) {
        advice = "Consider focusing more on your current courses to improve your GPA.";
        icon = "📈";
      } else if (studentStats.gpa < 3.5) {
        advice = "Good work! Aim for a 3.5+ GPA for better opportunities.";
        icon = "👍";
      } else if (studentStats.gpa < 4.0) {
        advice = "Excellent! Maintain this strong academic performance.";
        icon = "🎯";
      } else {
        advice = "Outstanding! You're at the top of your class!";
        icon = "🏆";
      }
      
      return `${icon} **Your Academic Performance:**

**Overall CGPA:** ${studentStats.gpa.toFixed(2)}
**Completed Courses:** ${completedCourses.length} courses
**Total Credits:** ${totalCredits} credits
**Academic Standing:** ${studentStats.gpa >= 3.5 ? 'Excellent' : studentStats.gpa >= 3.0 ? 'Good' : studentStats.gpa >= 2.0 ? 'Satisfactory' : 'Needs Improvement'}

${topCourses.length > 0 ? `**Top Performing Courses:**
${topCourses.map(c => `• **${c.code}** - ${c.name}\n  Grade: ${c.grade || 'N/A'} | Points: ${c.gradePoints} | Credits: ${c.credits}`).join('\n\n')}\n` : ''}

**Advice:** ${advice}

**Note:** CGPA = (Σ grade_points × credits) / (Σ credits)`;
    }
    
    // Courses query
    if (queryType === 'courses') {
      const currentCourses = studentStats.courses.list
        .filter(c => c.status === 'in_progress');
      
      const completedCourses = studentStats.courses.list
        .filter(c => c.status === 'completed');
      
      const upcomingCourses = studentStats.courses.list
        .filter(c => c.status === 'enrolled' || c.status === 'registered');
      
      return `📚 **Your Course Information:**

**Current Semester Courses (${currentCourses.length}):**
${currentCourses.length > 0 ? 
  currentCourses.map(c => `• **${c.code}** - ${c.name}\n  Credits: ${c.credits} | Status: ${c.status.replace('_', ' ')}`).join('\n\n') : 
  'No courses currently in progress'}

**Completed Courses (${completedCourses.length}):**
${completedCourses.length > 0 ? 
  completedCourses.slice(0, 5).map(c => `• **${c.code}** - ${c.name}\n  Grade: ${c.grade || 'N/A'} | Credits: ${c.credits}`).join('\n\n') : 
  'No courses completed yet'}

${upcomingCourses.length > 0 ? `**Upcoming/Registered Courses (${upcomingCourses.length}):**
${upcomingCourses.map(c => `• **${c.code}** - ${c.name}`).join('\n')}\n` : ''}

**Total Credits This Semester:** ${currentCourses.reduce((sum, c) => sum + c.credits, 0)}`;
    }
    
    // Assignments query
    if (queryType === 'assignments') {
      const upcomingAssignments = studentStats.assignments.upcoming;
      const overdueAssignments = studentStats.assignments.overdue;
      const recentGrades = studentStats.assignments.recentGrades;
      
      let urgencyMessage = '';
      if (overdueAssignments > 0) {
        urgencyMessage = `**🚨 URGENT:** You have ${overdueAssignments} overdue assignment${overdueAssignments !== 1 ? 's' : ''}! Please submit immediately!`;
      } else if (studentStats.assignments.pending > 3) {
        urgencyMessage = `**⚠️ ALERT:** You have ${studentStats.assignments.pending} pending assignments. Consider starting on them soon!`;
      } else if (studentStats.assignments.pending > 0) {
        urgencyMessage = `**📝 REMINDER:** You have ${studentStats.assignments.pending} pending assignment${studentStats.assignments.pending !== 1 ? 's' : ''}.`;
      }
      
      return `📝 **Your Assignments:**

**Summary:**
• **Total:** ${studentStats.assignments.total}
• **Submitted:** ${studentStats.assignments.submitted}
• **Pending:** ${studentStats.assignments.pending}
• **Overdue:** ${overdueAssignments}
• **Graded:** ${studentStats.assignments.graded}

${urgencyMessage ? urgencyMessage + '\n' : ''}

**Upcoming Deadlines:**
${upcomingAssignments.length > 0 ? 
  upcomingAssignments.map(a => {
    const dueDate = new Date(a.due_date);
    const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
    let urgency = '';
    if (daysLeft <= 1) urgency = ' 🚨';
    else if (daysLeft <= 3) urgency = ' ⚠️';
    else if (daysLeft <= 7) urgency = ' 📅';
    
    return `• **${a.title}**${urgency}\n  Course: ${a.courses?.course_name || 'Unknown'}\n  Due: ${dueDate.toLocaleDateString()} (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)\n  Total Marks: ${a.total_marks}`;
  }).join('\n\n') : 
  'No upcoming assignments! Great job keeping up!'}

${recentGrades.length > 0 ? `**Recent Grades:**
${recentGrades.map(a => {
  const submission = a.submissions?.find(s => s.student_id === studentData.id);
  const percentage = submission?.percentage || 0;
  let emoji = '📊';
  if (percentage >= 70) emoji = '🎯';
  else if (percentage >= 50) emoji = '👍';
  
  return `• **${a.title}**: ${submission?.marks_obtained || 0}/${a.total_marks} (${percentage}%) ${emoji}`;
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
      
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const deadlinesThisWeek = allDeadlines.filter(d => new Date(d.date) <= nextWeek);
      
      return `⏰ **All Upcoming Deadlines:**

**This Week (${deadlinesThisWeek.length}):**
${deadlinesThisWeek.length > 0 ? 
  deadlinesThisWeek.map(item => {
    const date = new Date(item.date);
    const daysLeft = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    const typeIcon = item.type === 'assignment' ? '📝' : '📋';
    let urgency = '';
    if (daysLeft <= 1) urgency = ' 🚨';
    else if (daysLeft <= 3) urgency = ' ⚠️';
    
    return `${typeIcon} **${item.title}**${urgency}\n  Type: ${item.type === 'assignment' ? 'Assignment' : 'Exam'}\n  Date: ${date.toLocaleDateString()}\n  Time: ${formatTime(item.type === 'assignment' ? '23:59' : item.start_time?.split(' ')[0] || '09:00')}\n  Days left: ${daysLeft}`;
  }).join('\n\n') : 
  'No deadlines this week! Well done!'}

**All Deadlines (${allDeadlines.length}):**
${allDeadlines.length > 0 ? 
  allDeadlines.slice(0, 10).map(item => {
    const date = new Date(item.date);
    const daysLeft = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    return `• ${item.type === 'assignment' ? '📝' : '📋'} **${item.title}** - ${date.toLocaleDateString()} (${daysLeft} days)`;
  }).join('\n') : 
  'No upcoming deadlines!'}

**📅 Tip:** Start working on assignments at least 3 days before the deadline for best results!`;
    }
    
    // Exams query
    if (queryType === 'exams') {
      const upcomingExams = studentStats.exams.upcoming;
      const performance = studentStats.exams.performance;
      
      const now = new Date();
      const examsThisWeek = upcomingExams.filter(e => {
        const examDate = new Date(e.start_time);
        const daysDiff = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
        return daysDiff <= 7;
      });
      
      return `📋 **Your Exam Information:**

**Performance Summary:**
• **Average Score:** ${performance.average}%
• **Highest Score:** ${performance.highest}%
• **Lowest Score:** ${performance.lowest}%
• **Total Exams:** ${performance.totalExams}
${performance.grades && Object.keys(performance.grades).length > 0 ? `• **Grade Distribution:** ${Object.entries(performance.grades).map(([grade, count]) => `${grade}: ${count}`).join(', ')}` : ''}

**Exams This Week (${examsThisWeek.length}):**
${examsThisWeek.length > 0 ? 
  examsThisWeek.map(e => {
    const examDate = new Date(e.start_time);
    const daysLeft = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
    const time = formatTime(e.start_time?.split(' ')[0] || '09:00');
    let urgency = '';
    if (daysLeft <= 1) urgency = ' 🚨';
    else if (daysLeft <= 3) urgency = ' ⚠️';
    
    return `• **${e.title}**${urgency}\n  Course: ${e.courses?.course_name || 'Unknown'}\n  Date: ${examDate.toLocaleDateString()} at ${time}\n  Location: ${e.location || 'TBA'}\n  Duration: ${e.duration || '2 hours'} (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)`;
  }).join('\n\n') : 
  'No exams this week!'}

**All Upcoming Exams (${upcomingExams.length}):**
${upcomingExams.length > 0 ? 
  upcomingExams.map(e => {
    const examDate = new Date(e.start_time);
    const daysLeft = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
    return `• ${daysLeft <= 7 ? '📅' : '📋'} **${e.title}** - ${examDate.toLocaleDateString()} (${daysLeft} days)`;
  }).join('\n') : 
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
      const today = new Date();
      const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
      const todayLectures = studentStats.lectures.filter(l => 
        new Date(l.date).toDateString() === today.toDateString()
      );
      
      const currentClass = studentStats.timetable.currentClass;
      const nextClass = studentStats.timetable.today.find(slot => {
        const [hour, minute] = (slot.start_time || '00:00').split(':').map(Number);
        const currentTime = today.getHours() * 60 + today.getMinutes();
        return hour * 60 + minute > currentTime;
      });
      
      const todayEvents = studentStats.events.today;
      const todayAssignments = studentStats.assignments.upcoming.filter(a => 
        new Date(a.due_date).toDateString() === today.toDateString()
      );
      
      return `📅 **Today's Schedule (${dayOfWeek}):**

**Current Time:** ${today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

${currentClass ? `**🟢 Currently In Class:**\n• **${currentClass.courses?.course_name}**\n  Time: ${formatTime(currentClass.start_time)} - ${formatTime(currentClass.end_time)}\n  Room: ${currentClass.room_number}\n  Lecturer: ${currentClass.lecturers?.full_name || 'TBA'}\n` : ''}

${nextClass ? `**⏭️ Next Class:**\n• **${nextClass.courses?.course_name}** at ${formatTime(nextClass.start_time)} in ${nextClass.room_number}\n` : ''}

**📚 Lectures Today (${todayLectures.length}):**
${todayLectures.length > 0 ? 
  todayLectures.map(lecture => 
    `• **${lecture.courseCode} - ${lecture.title}**\n  Time: ${formatTime(lecture.time)} - ${formatTime(lecture.endTime)}\n  Lecturer: ${lecture.lecturer}\n  Duration: ${lecture.duration} min\n  Status: ${lecture.status === 'ongoing' ? '🟢 Live Now' : 'Scheduled'}${lecture.google_meet_link ? `\n  Link: ${lecture.google_meet_link}` : ''}`
  ).join('\n\n') : 
  'No lectures scheduled for today! 🎉'}

${todayAssignments.length > 0 ? `**📝 Assignments Due Today (${todayAssignments.length}):**
${todayAssignments.map(a => `• **${a.title}** - ${a.courses?.course_name || 'Unknown'}`).join('\n')}\n` : ''}

${todayEvents.length > 0 ? `**🎉 Campus Events Today:**\n${todayEvents.map(e => `• **${e.title}** at ${e.location} (${formatTime(e.time)})`).join('\n')}` : ''}`;
    }
    
    // This week's schedule
    if (queryType === 'week') {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const weekLectures = studentStats.lectures.filter(l => 
        new Date(l.date) <= nextWeek
      );
      const upcomingEvents = studentStats.events.upcoming.filter(e => 
        new Date(e.date) <= nextWeek
      );
      
      // Group lectures by day
      const lecturesByDay = weekLectures.reduce((acc, lecture) => {
        const date = new Date(lecture.date);
        const dayKey = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        if (!acc[dayKey]) acc[dayKey] = [];
        acc[dayKey].push(lecture);
        return acc;
      }, {});
      
      return `📅 **This Week's Schedule:**

${Object.keys(lecturesByDay).length > 0 ? 
  Object.entries(lecturesByDay).map(([day, lectures]) => 
    `**${day}:**\n${lectures.map(l => `• ${l.courseCode}: ${l.title} (${formatTime(l.time)})`).join('\n')}`
  ).join('\n\n') : 
  'No upcoming lectures scheduled for this week.'}

**Weekly Timetable:**
${Object.entries(studentStats.timetable.byDay).map(([day, slots]) => 
  `**${day}:**\n${slots.map(slot => 
    `• ${slot.start_time} - ${slot.end_time}: ${slot.courses?.course_name || 'Unknown'} (${slot.room_number})`
  ).join('\n')}`
).join('\n\n')}

${upcomingEvents.length > 0 ? `**📢 Events This Week:**\n${upcomingEvents.map(e => `• **${formatDate(e.date)}**: ${e.title} at ${e.location}`).join('\n')}` : ''}`;
    }
    
    // Finance query
    if (queryType === 'finance') {
      const finance = studentStats.finance;
      const totalOutstanding = finance.totalPending + finance.totalPartial;
      
      let statusMessage = '';
      let statusIcon = '💰';
      
      if (finance.overdue > 0) {
        statusMessage = `🚨 **URGENT:** You have ${finance.overdue} overdue payment${finance.overdue !== 1 ? 's' : ''}! Please settle immediately to avoid penalties.`;
        statusIcon = '🚨';
      } else if (totalOutstanding > 0) {
        statusMessage = `⚠️ **REMINDER:** You have outstanding payments totaling $${totalOutstanding.toFixed(2)}.`;
        statusIcon = '⚠️';
      } else {
        statusMessage = '✅ **GREAT:** All payments are up to date!';
        statusIcon = '✅';
      }
      
      return `${statusIcon} **Your Financial Status:**

**Balance Summary:**
• **Total Paid This Year:** $${finance.totalPaid.toFixed(2)}
• **Pending Balance:** $${finance.totalPending.toFixed(2)}
• **Partial Payments Outstanding:** $${finance.totalPartial.toFixed(2)}
• **Total Outstanding:** $${totalOutstanding.toFixed(2)}
• **Overdue Payments:** ${finance.overdue}
${finance.scholarships > 0 ? `• **Scholarships Awarded:** $${finance.scholarships.toFixed(2)}` : ''}
${finance.fines > 0 ? `• **Fines/Charges:** $${finance.fines.toFixed(2)}` : ''}

${statusMessage}

**Recent Transactions:**
${finance.recent.length > 0 ? 
  finance.recent.map(f => {
    const date = f.payment_date ? new Date(f.payment_date) : f.due_date ? new Date(f.due_date) : null;
    let statusIcon = '📄';
    if (f.status === 'paid') statusIcon = '✅';
    else if (f.status === 'overdue') statusIcon = '🚨';
    else if (f.status === 'partial') statusIcon = '⚠️';
    
    return `${statusIcon} **${f.description || 'Transaction'}**\n  Amount: $${f.amount.toFixed(2)} | Status: ${f.status}\n  Date: ${date ? date.toLocaleDateString() : 'N/A'}${f.balance_due > 0 ? `\n  Balance Due: $${f.balance_due.toFixed(2)}` : ''}`;
  }).join('\n\n') : 
  'No recent transactions found'}

**Payment Methods Accepted:**
• Credit/Debit Cards
• Bank Transfer
• Mobile Money
• Cash at Finance Office

**Contact Finance Office:** finance@university.edu | Ext: 1234`;
    }
    
    // Attendance query
    if (queryType === 'attendance') {
      const attendance = studentStats.attendance;
      const trend = attendance.trend;
      const byCourse = attendance.byCourse;
      const minimumRequired = 75;
      const currentRate = parseFloat(attendance.rate);
      
      let statusMessage = '';
      if (currentRate >= minimumRequired) {
        statusMessage = `✅ **EXCELLENT:** Your attendance rate of ${currentRate}% meets the minimum requirement of ${minimumRequired}%!`;
      } else if (currentRate >= minimumRequired - 10) {
        statusMessage = `⚠️ **WARNING:** Your attendance rate of ${currentRate}% is below the required ${minimumRequired}%. Consider improving your attendance.`;
      } else {
        statusMessage = `🚨 **URGENT:** Your attendance rate of ${currentRate}% is significantly below the required ${minimumRequired}%. Immediate improvement is needed.`;
      }
      
      return `📊 **Your Attendance Records:**

**Last 30 Days Summary:**
• **Total Classes:** ${attendance.total}
• **Present:** ${attendance.present} days (${attendance.rate}%)
• **Absent:** ${attendance.absent} days
• **Late:** ${attendance.late} times
• **Trend:** ${trend === 'improving' ? '📈 Improving' : trend === 'declining' ? '📉 Declining' : '➡️ Stable'}

${statusMessage}

**Attendance by Course:**
${Object.keys(byCourse).length > 0 ? 
  Object.entries(byCourse).map(([course, stats]) => {
    const rate = ((stats.present / stats.total) * 100).toFixed(1);
    let icon = '📊';
    if (rate >= 80) icon = '✅';
    else if (rate >= 75) icon = '⚠️';
    else icon = '🚨';
    
    return `${icon} **${course}**: ${stats.present}/${stats.total} (${rate}%)`;
  }).join('\n') : 
  'No course-specific attendance data'}

**Recent Attendance:**
${attendance.recent.length > 0 ? 
  attendance.recent.slice(0, 5).map(a => 
    `• **${new Date(a.date).toLocaleDateString()}**\n  Course: ${a.courses?.course_name || 'General'}\n  Status: ${a.status === 'present' ? '✅ Present' : a.status === 'late' ? '⚠️ Late' : '❌ Absent'}${a.check_in_time ? ` | Check-in: ${a.check_in_time}` : ''}`
  ).join('\n\n') : 
  'No recent attendance records'}

**University Policy:** Minimum ${minimumRequired}% attendance required in each course.`;
    }
    
    // Library query
    if (queryType === 'library') {
      const library = studentStats.library;
      
      // Generate study session tips
      const studyTips = [...knowledgeBase.studyTips]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      
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

**Study Session Tips:**
${studyTips.map((tip, i) => `${i + 1}. ${tip}`).join('\n')}

**Contact Library:** library@university.edu | Ext: 5678`;
    }
    
    // Events query
    if (queryType === 'events') {
      const events = studentStats.events.upcoming;
      const now = new Date();
      
      // Categorize events by time frame
      const todayEvents = events.filter(e => 
        new Date(e.date).toDateString() === now.toDateString()
      );
      const thisWeekEvents = events.filter(e => {
        const eventDate = new Date(e.date);
        const daysDiff = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
        return daysDiff > 0 && daysDiff <= 7;
      });
      const futureEvents = events.filter(e => {
        const eventDate = new Date(e.date);
        const daysDiff = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
        return daysDiff > 7;
      });
      
      return `🎉 **Campus Events & Activities:**

**Today's Events (${todayEvents.length}):**
${todayEvents.length > 0 ? 
  todayEvents.map(e => {
    return `• **${e.title}**\n  Time: ${formatTime(e.time)}\n  Location: ${e.location}\n  Type: ${e.type || 'General'}\n  Description: ${e.description?.substring(0, 100) || 'No description available'}...`;
  }).join('\n\n') : 
  'No events today'}

**This Week's Events (${thisWeekEvents.length}):**
${thisWeekEvents.length > 0 ? 
  thisWeekEvents.map(e => {
    const date = new Date(e.date);
    const daysLeft = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    return `• **${e.title}**\n  Date: ${date.toLocaleDateString()} at ${formatTime(e.time)}\n  Location: ${e.location}\n  Starts in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
  }).join('\n\n') : 
  'No events this week'}

**Future Events (${futureEvents.length}):**
${futureEvents.length > 0 ? 
  futureEvents.slice(0, 5).map(e => {
    const date = new Date(e.date);
    return `• **${date.toLocaleDateString()}**: ${e.title} at ${e.location}`;
  }).join('\n') : 
  'No future events scheduled'}

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
        .slice(0, 7);
      
      const randomExamTips = [...knowledgeBase.examTips]
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);
      
      const randomAssignmentTips = [...knowledgeBase.assignmentHelp]
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
• Set specific, achievable goals

**Exam Preparation:**
${randomExamTips.map((tip, i) => `${i + 1}. ${tip}`).join('\n')}

**Assignment Excellence:**
${randomAssignmentTips.map((tip, i) => `${i + 1}. ${tip}`).join('\n')}

**Resource Recommendations:**
• **Online:** Khan Academy, Coursera, edX, MIT OpenCourseWare
• **Apps:** Anki (flashcards), Forest (focus), Todoist (planning), Notion (organization)
• **Books:** "A Mind for Numbers", "Make It Stick", "Deep Work", "Atomic Habits"

**Need help with a specific subject?** Tell me which course you're struggling with!`;
    }
    
    // Progress report query
    if (queryType === 'progress') {
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const currentYear = new Date().getFullYear();
      const semester = studentData.semester || 1;
      
      // Calculate projected graduation
      const programDuration = 4; // Default 4 years
      const yearsCompleted = studentData.year_of_study - 1 + (semester / 2);
      const progressPercentage = (yearsCompleted / programDuration) * 100;
      const projectedGraduationYear = currentYear + (programDuration - Math.ceil(yearsCompleted));
      
      return `📈 **Comprehensive Academic Progress Report**

**Academic Year:** ${currentYear}
**Semester:** ${semester}
**Report Date:** ${new Date().toLocaleDateString()}

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
1. ${studentStats.attendance.rate >= 75 ? '✅ Maintain good attendance' : '📈 Improve attendance to meet 75% requirement'}
2. ${studentStats.assignments.pending > 0 ? '📝 Complete pending assignments this week' : '✅ Great job staying on top of assignments'}
3. ${studentStats.gpa < 3.0 ? '📊 Focus on improving grades in current courses' : '✅ Maintain strong academic performance'}
4. ${studentStats.finance.overdue > 0 ? '💰 Clear overdue payments immediately' : '✅ Financial status is satisfactory'}
5. ${studentStats.library.recommended.length > 0 ? '📚 Check out recommended library books' : '📚 Utilize library resources for better learning'}

**Projected Graduation:** ${progressPercentage.toFixed(1)}% complete | Projected: ${projectedGraduationYear}`;
    }
    
    // Profile query
    if (queryType === 'profile') {
      const enrollmentDate = new Date(studentData.created_at);
      const daysEnrolled = Math.floor((new Date() - enrollmentDate) / (1000 * 60 * 60 * 24));
      
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

**Enrollment Details:**
• **Enrollment Date:** ${enrollmentDate.toLocaleDateString()}
• **Days Enrolled:** ${daysEnrolled} days
• **Status:** Active Student

**Contact Information:**
• **Student Portal:** portal.university.edu
• **Email:** ${studentData.email}
• **Phone:** ${studentData.phone || 'Not available'}
• **Emergency Contact:** Update in Student Services

**Need to update your information?** Visit the Student Affairs office or update through the portal.`;
    }
    
    // University info query
    if (queryType === 'university') {
      return `🏛️ **University Information:**

**About Our University:**
We are a premier institution dedicated to academic excellence and innovation in education. We provide world-class education across various disciplines.

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
• **Email:** info@university.edu
• **Address:** 123 Education Street, Knowledge City
• **Website:** www.university.edu

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

**💬 General Chat:**
• Greetings and casual conversation
• Motivational quotes and encouragement
• Study tips and learning strategies
• General academic advice

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
• "Give me some motivation"
• "How are you doing?"
• "What can you help me with?"

**Pro Tip:** Be specific in your questions for more detailed answers! I understand natural language, so feel free to chat naturally!`;
    }
    
    // Default response for unknown queries
    const randomEncouragement = knowledgeBase.encouragement[
      Math.floor(Math.random() * knowledgeBase.encouragement.length)
    ];
    const randomTip = knowledgeBase.advice[
      Math.floor(Math.random() * knowledgeBase.advice.length)
    ];
    
    return `🤔 **I'm not sure I understood your question completely.**

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
• **General Chat** - Motivation, encouragement, advice

**Tip:** ${randomTip}

**Try asking me one of these:**
"What's my current GPA?"
"What assignments are due this week?"
"What's my attendance percentage?"
"How much do I owe in fees?"
"What lectures do I have today?"
"Recommend study tips for exams"
"Check my academic progress"
"What library books are available?"
"Give me some motivation"
"How are you doing today?"`;
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

    // Simulate AI thinking time
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

  // Enhanced quick questions
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
    "Progress report",
    "Motivation",
    "How are you?"
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

      {/* Main Chat Interface */}
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

        {/* Messages Container */}
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

        {/* Quick Questions */}
        <div 
          ref={quickQuestionsRef}
          style={{
            padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
            borderTop: '1px solid #e9ecef',
            background: '#f8f9fa',
            flexShrink: 0,
            minHeight: '80px',
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
            paddingBottom: '8px',
            WebkitOverflowScrolling: 'touch',
            alignItems: 'center',
            minHeight: '36px'
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

        {/* Input Area */}
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
          AI Student Assistant • Connected to your academic database • Data updates in real-time
        </p>
        <p style={{ 
          margin: '0.25rem 0 0 0', 
          fontSize: isMobile ? '0.7rem' : '0.75rem',
          opacity: 0.7
        }}>
          Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Ask me anything!
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
            font-size: 16px !important;
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
            /* Large screen optimizations */
        @media (min-width: 1200px) {
          .chat-container {
            height: 75vh !important;
          }
        }
        
        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
        
        /* Print styles */
        @media print {
          .chat-container {
            height: auto !important;
            overflow: visible !important;
          }
          
          .quick-questions,
          .message-input,
          .chat-header {
            display: none !important;
          }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .chat-message {
            border: 2px solid #000 !important;
          }
          
          .quick-question-button {
            border: 2px solid #4361ee !important;
          }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .chat-window {
            background-color: #1a1a1a !important;
            color: #ffffff !important;
          }
          
          .chat-header {
            background-color: #2d2d2d !important;
            border-bottom: 1px solid #404040 !important;
          }
          
          .message-input textarea {
            background-color: #2d2d2d !important;
            color: #ffffff !important;
            border-color: #404040 !important;
          }
          
          .quick-questions {
            background-color: #2d2d2d !important;
            border-top: 1px solid #404040 !important;
          }
          
          .quick-question-button {
            background-color: #3a3a3a !important;
            color: #4361ee !important;
            border-color: #404040 !important;
          }
        }
        
        /* Touch device optimizations */
        @media (hover: none) and (pointer: coarse) {
          .quick-question-button {
            padding: 0.8rem 1.2rem !important;
            min-height: 44px !important;
          }
          
          .send-button {
            min-height: 44px !important;
            padding-top: 0.8rem !important;
            padding-bottom: 0.8rem !important;
          }
          
          .clear-button {
            padding: 0.6rem 1rem !important;
          }
        }
        
        /* Performance optimizations */
        .chat-message {
          will-change: transform, opacity;
          transform: translateZ(0);
        }
        
        /* Focus styles for accessibility */
        .message-input textarea:focus,
        .quick-question-button:focus,
        .send-button:focus,
        .clear-button:focus {
          outline: 2px solid #4361ee !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.2) !important;
        }
        
        /* Loading state animations */
        .typing-indicator span {
          display: inline-block;
          animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.1s;
        }
        
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.2s;
        }
        
        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-8px);
          }
        }
        
        /* Smooth transitions */
        .chat-message,
        .quick-question-button,
        .send-button,
        .clear-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Card hover effects */
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
        }
        
        /* Gradient text effect */
        .gradient-text {
          background: linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        /* Shimmer loading effect */
        .shimmer {
          background: linear-gradient(90deg, 
            rgba(255,255,255,0) 0%, 
            rgba(255,255,255,0.2) 50%, 
            rgba(255,255,255,0) 100%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        
        /* Pulse animation for notifications */
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }
        
        .pulse {
          animation: pulse 2s infinite;
        }
        
        /* Slide-in animation for new messages */
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .slide-in {
          animation: slideIn 0.3s ease-out;
        }
        
        /* Fade-in animation for chat */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-in;
        }
        
        /* Ripple effect for buttons */
        .ripple {
          position: relative;
          overflow: hidden;
        }
        
        .ripple:after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 5px;
          height: 5px;
          background: rgba(255, 255, 255, 0.5);
          opacity: 0;
          border-radius: 100%;
          transform: scale(1, 1) translate(-50%);
          transform-origin: 50% 50%;
        }
        
        .ripple:focus:not(:active)::after {
          animation: ripple 1s ease-out;
        }
        
        @keyframes ripple {
          0% {
            transform: scale(0, 0);
            opacity: 0.5;
          }
          20% {
            transform: scale(25, 25);
            opacity: 0.3;
          }
          100% {
            opacity: 0;
            transform: scale(40, 40);
          }
        }
        
        /* Smooth scrolling */
        .smooth-scroll {
          scroll-behavior: smooth;
        }
        
        /* Custom selection color */
        ::selection {
          background-color: rgba(67, 97, 238, 0.3);
          color: inherit;
        }
        
        /* Scroll snap for mobile */
        @media (max-width: 768px) {
          .chat-container {
            scroll-snap-type: y proximity;
          }
          
          .chat-message:last-child {
            scroll-snap-align: end;
          }
        }
        
        /* Optimize for reduced data mode */
        @media (prefers-reduced-data: reduce) {
          .gradient-bg {
            background: #4361ee !important;
          }
          
          .shimmer {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Chatbot;