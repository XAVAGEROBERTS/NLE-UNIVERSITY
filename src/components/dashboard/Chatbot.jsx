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
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const [gpaData, setGpaData] = useState({
    gpa: 0.0,
    cgpa: 0.0,
    examBasedGpa: 0.0,
    examBasedCgpa: 0.0
  });
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const quickQuestionsRef = useRef(null);
  const inputRef = useRef(null);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setShowQuickQuestions(false); // Hide quick questions by default on mobile
      }
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

  const getGradeFromMarks = (marks) => {
    if (!marks && marks !== 0) return 'N/A';
    const numericMarks = parseFloat(marks);
    if (isNaN(numericMarks)) return 'N/A';

    if (numericMarks >= 90) return 'A+';
    if (numericMarks >= 80) return 'A';
    if (numericMarks >= 75) return 'B+';
    if (numericMarks >= 70) return 'B';
    if (numericMarks >= 65) return 'C+';
    if (numericMarks >= 60) return 'C';
    if (numericMarks >= 55) return 'D+';
    if (numericMarks >= 50) return 'D';
    return 'F';  // Below 50%
  };

  const getGradePoints = (grade) => {
    if (!grade) return 0.0;
    const gradeMap = {
      'A+': 5.0,
      'A': 5.0,
      'B+': 4.5,
      'B': 4.0,
      'C+': 3.5,
      'C': 3.0,
      'D+': 2.5,
      'D': 2.0,
      'F': 0.0
    };
    return gradeMap[grade.toUpperCase()] || 0.0;
  };

  // NEW FUNCTION: Fetch GPA and CGPA from exam results
  const fetchExamBasedGPA = async (studentId) => {
    try {
      // Fetch all graded exam submissions
      const { data: examSubmissions, error: subError } = await supabase
        .from('exam_submissions')
        .select(`
          *,
          examinations (
            id,
            total_marks,
            course_id,
            courses (
              id,
              credits
            )
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'graded')
        .not('total_marks_obtained', 'is', null);

      if (subError) throw subError;
      if (!examSubmissions || examSubmissions.length === 0) {
        return { gpa: 0.0, cgpa: 0.0 };
      }

      // Organize by semester/year for GPA calculation
      const semesterResults = {};
      let totalCredits = 0;
      let totalPoints = 0;

      // Fetch course details for each exam
      const examIds = examSubmissions.map(sub => sub.exam_id);
      const { data: exams, error: examError } = await supabase
        .from('examinations')
        .select(`
          *,
          courses (
            id,
            credits,
            year,
            semester
          )
        `)
        .in('id', examIds);

      if (examError) throw examError;

      // Create exam map for quick access
      const examMap = {};
      exams.forEach(exam => {
        examMap[exam.id] = exam;
      });

      // Process each graded exam
      examSubmissions.forEach(submission => {
        const exam = examMap[submission.exam_id];
        if (!exam || !exam.courses) return;

        const course = exam.courses;
        const credits = course.credits || 3;
        const grade = getGradeFromMarks(submission.total_marks_obtained);
        const gradePoints = getGradePoints(grade);
        
        // Calculate semester key
        const semesterKey = `year${course.year}_sem${course.semester}`;
        if (!semesterResults[semesterKey]) {
          semesterResults[semesterKey] = {
            year: course.year,
            semester: course.semester,
            totalCredits: 0,
            totalPoints: 0,
            courses: []
          };
        }

        // Add to semester results
        semesterResults[semesterKey].courses.push({
          examId: exam.id,
          courseId: course.id,
          credits: credits,
          grade: grade,
          gradePoints: gradePoints,
          marks: submission.total_marks_obtained,
          totalMarks: exam.total_marks,
          percentage: submission.percentage
        });

        semesterResults[semesterKey].totalCredits += credits;
        semesterResults[semesterKey].totalPoints += gradePoints * credits;

        // Add to overall totals
        totalCredits += credits;
        totalPoints += gradePoints * credits;
      });

      // Calculate semester GPAs
      Object.keys(semesterResults).forEach(key => {
        const semester = semesterResults[key];
        if (semester.totalCredits > 0) {
          semester.gpa = parseFloat((semester.totalPoints / semester.totalCredits).toFixed(2));
        }
      });

      // Calculate CGPA (overall average)
      const cgpa = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0.0;

      // Get current semester GPA
      let currentGPA = 0.0;
      const currentYear = studentData?.year_of_study;
      const currentSemester = studentData?.semester;
      
      if (currentYear && currentSemester) {
        const currentSemesterKey = `year${currentYear}_sem${currentSemester}`;
        if (semesterResults[currentSemesterKey]) {
          currentGPA = semesterResults[currentSemesterKey].gpa;
        }
      }

      return {
        gpa: currentGPA,
        cgpa: cgpa,
        semesterResults: semesterResults,
        totalExams: examSubmissions.length,
        totalCredits: totalCredits
      };

    } catch (error) {
      console.error('Error fetching exam-based GPA:', error);
      return { gpa: 0.0, cgpa: 0.0, semesterResults: {} };
    }
  };

  // Updated fetchAllStudentData to include exam-based GPA
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

      // 2. Fetch student's courses with credits for course-based GPA calculation
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

      // Process courses with credits for course-based GPA
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

      // 3. Fetch exam-based GPA and CGPA
      const examGpaData = await fetchExamBasedGPA(student.id);
      
      // 4. Calculate course-based GPA (for comparison)
      const calculateCourseBasedGPA = (courses) => {
        if (!courses || courses.length === 0) return 0.0;
        
        const completedCourses = courses.filter(
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

      const courseBasedGPA = calculateCourseBasedGPA(coursesWithGrades);
      const courseBasedCGPA = calculateCourseBasedGPA(
        coursesWithGrades.filter(c => c.status === 'completed')
      );

      // Set GPA data
      setGpaData({
        gpa: examGpaData.gpa || courseBasedGPA,
        cgpa: examGpaData.cgpa || courseBasedCGPA,
        examBasedGpa: examGpaData.gpa,
        examBasedCgpa: examGpaData.cgpa,
        courseBasedGpa: courseBasedGPA,
        courseBasedCgpa: courseBasedCGPA,
        semesterResults: examGpaData.semesterResults,
        totalExams: examGpaData.totalExams || 0,
        totalCredits: examGpaData.totalCredits || 0
      });

      // 5. Get active courses (not completed)
      const activeCourses = coursesWithGrades.filter(c => c.status !== 'completed') || [];
      const activeCourseIds = activeCourses.map(sc => sc.course_id).filter(Boolean);

      // 6. Fetch other student data (lectures, assignments, etc.)
      const lectures = await fetchUpcomingLectures(activeCourseIds);
      const assignments = await fetchAssignments(activeCourseIds, student.id);
      const exams = await fetchExams(activeCourseIds, student.id);

      // 7. Fetch other student stats (finance, attendance, etc.)
      const { data: finance } = await supabase
        .from('financial_records')
        .select('*')
        .eq('student_id', student.id)
        .eq('academic_year', student.academic_year)
        .order('payment_date', { ascending: false });

      const { data: attendance } = await supabase
        .from('attendance_records')
        .select(`
          *,
          courses (*)
        `)
        .eq('student_id', student.id)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });

      const { data: timetable } = activeCourseIds.length > 0 ? await supabase
        .from('timetable_slots')
        .select(`
          *,
          courses (*),
          lecturers (*)
        `)
        .in('course_id', activeCourseIds)
        .eq('is_active', true) : { data: [] };

      const { data: libraryBooks } = await supabase
        .from('library_books')
        .select('*')
        .eq('status', 'available')
        .limit(5);

      const { data: events } = await supabase
        .from('campus_events')
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

        // GPA data
        gpa: {
          currentGPA: examGpaData.gpa || courseBasedGPA,
          currentCGPA: examGpaData.cgpa || courseBasedCGPA,
          examBasedGPA: examGpaData.gpa,
          examBasedCGPA: examGpaData.cgpa,
          courseBasedGPA: courseBasedGPA,
          courseBasedCGPA: courseBasedCGPA,
          semesterResults: examGpaData.semesterResults,
          totalGradedExams: examGpaData.totalExams || 0,
          totalCredits: examGpaData.totalCredits || 0
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

        // Lectures for active courses only
        lectures: lectures,

        // Assignment statistics for active courses only
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

        // Exam statistics for active courses only
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
        }
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

  // Helper functions (keep existing ones, add missing ones)
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

      return assignments?.map(assignment => ({
        ...assignment,
        submissions: assignment.assignment_submissions || []
      })) || [];

    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
  };

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

      return exams?.map(exam => ({
        ...exam,
        submissions: exam.exam_submissions || []
      })) || [];

    } catch (error) {
      console.error('Error fetching exams:', error);
      return [];
    }
  };

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

  // Enhanced welcome message generator with GPA/CGPA
  const generateWelcomeMessage = (student, stats) => {
    const currentClass = stats.timetable.currentClass;
    const nextAssignment = stats.assignments.upcoming[0];
    const nextExam = stats.exams.upcoming[0];
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
    
    const randomQuote = knowledgeBase.motivational[
      Math.floor(Math.random() * knowledgeBase.motivational.length)
    ];

    return `👋 **${getGreeting()} ${student.full_name.split(' ')[0]}!** 

I'm your AI Student Assistant, connected to your personal academic database. Happy ${dayOfWeek}! 😊

**📚 Academic Summary:**
• **Exam-Based CGPA:** ${stats.gpa.examBasedCGPA?.toFixed(2) || '0.00'} (from ${stats.gpa.totalGradedExams || 0} graded exams)
• **Current Semester GPA:** ${stats.gpa.examBasedGPA?.toFixed(2) || '0.00'}
• **Courses:** ${stats.courses.completed} completed, ${stats.courses.inProgress} in progress
• **Year:** ${student.year_of_study || 'N/A'}.${student.semester || 'N/A'}
• **Total Credits:** ${stats.gpa.totalCredits || 0}

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
2. "What's my CGPA from exam results?"
3. "What assignments are due this week?"
4. "Show me today's schedule"
5. "What's my attendance status?"
6. "Any upcoming exams?"
7. "Check my financial balance"
8. "Recommend study tips"
9. "What library books are available?"
10. "Any campus events this week?"
11. "How can I improve my grades?"

Or just chat with me about anything academic! I'm here to help! 🤖`;
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'TBD';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Enhanced query detection with GPA/CGPA patterns
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
    
    // GPA & CGPA queries - ENHANCED
    if (/(cgpa|cumulative\s*grade|cumulative\s*gpa|overall\s*gpa|total\s*gpa|exam\s*based|from\s*exam|exam\s*results)/.test(q)) {
      return 'cgpa';
    }
    
    if (/(gpa|grade\s*point|semester\s*gpa|current\s*gpa|this\s*semester)/.test(q)) {
      return 'gpa';
    }
    
    if (/(grade|marks?|scores?|academic\s*performance)/.test(q)) {
      return 'grades';
    }
    
    // Courses query
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

  // ENHANCED AI Response Generator with real-time GPA/CGPA from exams
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
    
    // ENHANCED CGPA query - From Exam Results
    if (queryType === 'cgpa') {
      const cgpaData = studentStats.gpa;
      const examBasedCGPA = cgpaData.examBasedCGPA || cgpaData.currentCGPA;
      const courseBasedCGPA = cgpaData.courseBasedCGPA;
      
      let sourceInfo = '';
      if (cgpaData.totalGradedExams > 0) {
        sourceInfo = `📊 **Calculated from ${cgpaData.totalGradedExams} graded exam results**`;
      } else if (cgpaData.courseBasedCGPA > 0) {
        sourceInfo = `📚 **Calculated from completed course grades**`;
      }
      
      const classification = examBasedCGPA >= 4.5 ? 'First Class' :
                           examBasedCGPA >= 3.5 ? 'Second Class Upper' :
                           examBasedCGPA >= 2.5 ? 'Second Class Lower' :
                           examBasedCGPA >= 1.5 ? 'Third Class' : 'Pass';
      
      let advice = '';
      if (examBasedCGPA < 2.0) {
        advice = "⚠️ **Consider meeting with an academic advisor** to discuss improvement strategies.";
      } else if (examBasedCGPA < 3.0) {
        advice = "📈 **Focus on current semester courses** to boost your overall performance.";
      } else if (examBasedCGPA < 3.5) {
        advice = "👍 **Good progress!** Aim for 3.5+ for better opportunities.";
      } else if (examBasedCGPA < 4.0) {
        advice = "🎯 **Excellent work!** Maintain this strong performance.";
      } else {
        advice = "🏆 **Outstanding achievement!** You're at the top of your class!";
      }
      
      return `📊 **Your Cumulative GPA (CGPA) Analysis**

**Exam-Based CGPA:** ${examBasedCGPA.toFixed(2)}
**Academic Classification:** ${classification}
${sourceInfo}

**Key Statistics:**
• **Total Graded Exams:** ${cgpaData.totalGradedExams || 0}
• **Total Credits Earned:** ${cgpaData.totalCredits || 0}
• **Current Semester GPA:** ${(cgpaData.examBasedGPA || cgpaData.currentGPA).toFixed(2)}

${cgpaData.semesterResults && Object.keys(cgpaData.semesterResults).length > 0 ? `
**Semester-wise Performance:**
${Object.keys(cgpaData.semesterResults).map(key => {
  const semester = cgpaData.semesterResults[key];
  return `• **Year ${semester.year}, Semester ${semester.semester}:** GPA ${semester.gpa?.toFixed(2) || '0.00'} (${semester.courses.length} exams)`;
}).join('\n')}\n` : ''}

**💡 What is CGPA?**
CGPA (Cumulative Grade Point Average) is calculated from **all your graded exam results** across all semesters. It represents your overall academic performance.

**Advice:** ${advice}

**Note:** CGPA = (Σ grade_points × credits) / (Σ credits) from all graded exams`;
    }
    
    // ENHANCED GPA query - From Exam Results
    if (queryType === 'gpa') {
      const gpaData = studentStats.gpa;
      const currentGPA = gpaData.examBasedGPA || gpaData.currentGPA;
      const currentYear = studentData.year_of_study;
      const currentSemester = studentData.semester;
      
      // Get current semester results
      let currentSemesterResults = null;
      if (gpaData.semesterResults) {
        const currentSemesterKey = `year${currentYear}_sem${currentSemester}`;
        currentSemesterResults = gpaData.semesterResults[currentSemesterKey];
      }
      
      let advice = '';
      let icon = '📊';
      
      if (currentGPA < 2.0) {
        advice = "You might want to speak with an academic advisor. Focus on passing current courses.";
        icon = "⚠️";
      } else if (currentGPA < 3.0) {
        advice = "Consider focusing more on your current courses to improve your GPA.";
        icon = "📈";
      } else if (currentGPA < 3.5) {
        advice = "Good work! Aim for a 3.5+ GPA for better opportunities.";
        icon = "👍";
      } else if (currentGPA < 4.0) {
        advice = "Excellent! Maintain this strong academic performance.";
        icon = "🎯";
      } else {
        advice = "Outstanding! You're at the top of your class!";
        icon = "🏆";
      }
      
      return `${icon} **Your Current Semester GPA Analysis**

**Current Semester GPA:** ${currentGPA.toFixed(2)}
**Semester:** Year ${currentYear}, Semester ${currentSemester}
**Based on:** ${currentSemesterResults?.courses?.length || 0} graded exams this semester

${currentSemesterResults ? `
**Current Semester Details:**
• **Total Credits:** ${currentSemesterResults.totalCredits || 0}
• **Total Points:** ${currentSemesterResults.totalPoints?.toFixed(2) || '0.00'}
• **Number of Courses:** ${currentSemesterResults.courses.length}

**Current Semester Courses:**
${currentSemesterResults.courses.slice(0, 5).map(course => {
  const gradeEmoji = course.grade.startsWith('A') ? '🎯' : 
                     course.grade.startsWith('B') ? '👍' : 
                     course.grade.startsWith('C') ? '📊' : '📈';
  return `• ${gradeEmoji} **${course.grade}** - ${course.marks}/${course.totalMarks} (${course.percentage || '0'}%) - ${course.credits} credits`;
}).join('\n')}
${currentSemesterResults.courses.length > 5 ? `\n...and ${currentSemesterResults.courses.length - 5} more courses` : ''}\n` : ''}

**📈 GPA Improvement Tips:**
1. **Focus on current assignments** - They affect your final grades
2. **Attend all lectures** - Better understanding leads to better grades
3. **Seek help early** - Don't wait until you're struggling
4. **Review past exams** - Identify patterns and weak areas
5. **Form study groups** - Collaborative learning improves retention

**Advice:** ${advice}

**Next Step:** Work on improving weak areas and maintain strong performance in current courses!`;
    }
    
    // Handle grades query (general)
    if (queryType === 'grades') {
      const gpaData = studentStats.gpa;
      
      return `📊 **Your Academic Grades Overview**

**Overall Performance:**
• **Exam-Based CGPA:** ${(gpaData.examBasedCGPA || gpaData.currentCGPA).toFixed(2)}
• **Current Semester GPA:** ${(gpaData.examBasedGPA || gpaData.currentGPA).toFixed(2)}
• **Total Graded Exams:** ${gpaData.totalGradedExams || 0}
• **Total Credits:** ${gpaData.totalCredits || 0}

**Grade Distribution:**
${gpaData.semesterResults && Object.keys(gpaData.semesterResults).length > 0 ? 
  Object.keys(gpaData.semesterResults).map(key => {
    const semester = gpaData.semesterResults[key];
    return `• **Year ${semester.year}, Sem ${semester.semester}:** GPA ${semester.gpa?.toFixed(2) || '0.00'} (${semester.courses.length} exams)`;
  }).join('\n') : 
  'No detailed grade data available yet.'}

**💡 Grade Interpretation:**
• **A (90-100%)**: Excellent - Keep up the outstanding work!
• **B (70-89%)**: Good - Solid understanding, room for improvement
• **C (50-69%)**: Satisfactory - Focus on weaker areas
• **D (40-49%)**: Passing - Significant improvement needed
• **F (Below 40%)**: Failing - Immediate action required

**Need specific grade advice?** Tell me which subject you're concerned about!`;
    }
    
    // Rest of the response handlers remain the same...
    // Courses query
    if (queryType === 'courses') {
      const currentCourses = studentStats.courses.list
        .filter(c => c.status === 'in_progress');
      
      const completedCourses = studentStats.courses.list
        .filter(c => c.status === 'completed');
      
      return `📚 **Your Course Information:**

**Current Semester Courses (${currentCourses.length}):**
${currentCourses.length > 0 ? 
  currentCourses.map(c => `• **${c.code}** - ${c.name}\n  Credits: ${c.credits} | Status: ${c.status.replace('_', ' ')}`).join('\n\n') : 
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

• **Academic Performance** - GPA, CGPA, grades, progress
• **Exam Results** - Real-time GPA/CGPA from graded exams
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
"What's my current GPA from exams?"
"What's my overall CGPA?"
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
      
      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
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

  const handleQuickQuestion = (question) => {
    setInputText(question);
    if (isMobile) {
      setShowQuickQuestions(false);
      // Focus on input after a delay
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // Enhanced quick questions with GPA/CGPA options
  const quickQuestions = [
    "What's my CGPA?",
    "Current GPA?",
    "Assignments due?",
    "How much do I owe?",
    "Lectures today?",
    "My attendance?",
    "Study tips",
    "Exam schedule",
    "Library books",
    "Campus events",
    "Progress report",
    "Motivation"
  ];

  // Scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

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
        textAlign: 'center',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f7fa'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1.5rem'
        }}></div>
        <h3 style={{ color: '#2c3e50', marginBottom: '0.5rem', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
          Loading your personal AI assistant...
        </h3>
        <p style={{ color: '#7f8c8d', fontSize: isMobile ? '0.9rem' : '1rem' }}>
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
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f5f7fa'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
        borderRadius: isMobile ? '10px' : '12px',
        padding: isMobile ? '1rem' : '1.5rem',
        color: 'white',
        marginBottom: isMobile ? '1rem' : '1.5rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center', 
          justifyContent: 'space-between',
          gap: isMobile ? '0.75rem' : '0'
        }}>
          <div>
            <h1 style={{ 
              fontSize: isMobile ? '1.25rem' : '1.75rem', 
              fontWeight: 'bold', 
              margin: '0 0 0.5rem 0',
              lineHeight: '1.2'
            }}>
              🤖 AI Student Assistant
            </h1>
            <p style={{ 
              opacity: 0.9, 
              margin: 0,
              fontSize: isMobile ? '0.85rem' : '1rem',
              lineHeight: '1.4'
            }}>
              Personalized assistance for {studentData?.full_name || 'Student'}
            </p>
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              marginTop: '0.75rem',
              fontSize: isMobile ? '0.75rem' : '0.85rem',
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
            borderRadius: '8px',
            textAlign: 'center',
            minWidth: isMobile ? '100%' : '120px',
            marginTop: isMobile ? '0.5rem' : '0',
            alignSelf: isMobile ? 'stretch' : 'auto'
          }}>
            <div style={{ 
              fontSize: isMobile ? '0.75rem' : '0.85rem', 
              opacity: 0.8,
              marginBottom: '0.25rem'
            }}>
              Exam CGPA
            </div>
            <div style={{ 
              fontSize: isMobile ? '1.5rem' : '2rem', 
              fontWeight: 'bold',
              lineHeight: '1'
            }}>
              {(studentStats?.gpa?.examBasedCGPA || studentStats?.gpa?.currentCGPA || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: isMobile ? '10px' : '12px',
        boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: isMobile ? 'calc(100vh - 180px)' : '70vh',
        minHeight: isMobile ? '500px' : '600px',
        flex: '1'
      }}>
        {/* Chat Header */}
        <div style={{
          padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8f9fa',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem' }}>
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
                fontSize: isMobile ? '0.9rem' : '1.1rem', 
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
                gap: '0.25rem',
                fontSize: isMobile ? '0.7rem' : '0.8rem',
                color: '#7f8c8d'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#4CAF50'
                }}></div>
                <span>Connected to academic database</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {isMobile && (
              <button
                onClick={() => setShowQuickQuestions(!showQuickQuestions)}
                style={{
                  background: 'none',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  padding: '0.4rem 0.75rem',
                  color: showQuickQuestions ? '#4361ee' : '#6c757d',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                <span>{showQuickQuestions ? '❌' : '💬'}</span>
                {showQuickQuestions ? 'Hide' : 'Quick Qs'}
              </button>
            )}
            <button
              onClick={handleClearChat}
              style={{
                background: 'none',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1rem',
                color: '#e74c3c',
                cursor: 'pointer',
                fontSize: isMobile ? '0.75rem' : '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <span>🗑️</span>
              {!isMobile && 'Clear Chat'}
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div 
          ref={chatContainerRef}
          style={{
            flex: 1,
            padding: isMobile ? '0.75rem' : '1rem',
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
                  marginBottom: isMobile ? '0.5rem' : '0.75rem',
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
                    fontSize: isMobile ? '0.85rem' : '0.9rem',
                    lineHeight: '1.6'
                  }}>
                    <div style={{ 
                      lineHeight: '1.6',
                      fontWeight: message.sender === 'user' ? '400' : '500'
                    }}>
                      {message.text}
                    </div>
                    <div style={{
                      fontSize: isMobile ? '0.65rem' : '0.75rem',
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
                gap: isMobile ? '0.5rem' : '0.75rem',
                marginTop: '0.75rem'
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

        {/* Quick Questions - Mobile optimized */}
        {showQuickQuestions && (
          <div 
            ref={quickQuestionsRef}
            style={{
              padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem',
              borderTop: '1px solid #e9ecef',
              background: '#f8f9fa',
              flexShrink: 0,
              maxHeight: isMobile ? '120px' : 'auto',
              overflowY: isMobile ? 'auto' : 'visible'
            }}
          >
            <div style={{ 
              fontSize: isMobile ? '0.75rem' : '0.85rem', 
              color: '#7f8c8d',
              marginBottom: isMobile ? '0.5rem' : '0.75rem',
              fontWeight: '500',
              paddingLeft: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Quick questions:</span>
              {isMobile && (
                <button
                  onClick={() => setShowQuickQuestions(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4361ee',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    padding: '0.25rem 0.5rem'
                  }}
                >
                  Close
                </button>
              )}
            </div>
            <div style={{
              display: 'flex',
              gap: isMobile ? '0.4rem' : '0.5rem',
              flexWrap: 'wrap',
              overflowX: isMobile ? 'auto' : 'visible',
              paddingBottom: isMobile ? '4px' : '0',
              WebkitOverflowScrolling: 'touch',
              alignItems: 'center',
              minHeight: isMobile ? 'auto' : '36px'
            }}>
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(question)}
                  style={{
                    padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 0.9rem',
                    background: 'rgba(67, 97, 238, 0.1)',
                    color: '#4361ee',
                    border: '1px solid rgba(67, 97, 238, 0.2)',
                    borderRadius: '20px',
                    fontSize: isMobile ? '0.75rem' : '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    height: isMobile ? '32px' : '36px',
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
        )}

        {/* Input Area */}
        <div style={{
          padding: isMobile ? '0.75rem' : '1rem',
          borderTop: '1px solid #e9ecef',
          background: 'white',
          flexShrink: 0
        }}>
          <div style={{ 
            display: 'flex', 
            gap: isMobile ? '0.5rem' : '0.75rem',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            <div style={{ 
              flex: 1, 
              position: 'relative',
              minHeight: isMobile ? '44px' : '50px'
            }}>
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your academics..."
                style={{
                  width: '100%',
                  padding: isMobile ? '0.75rem 0.75rem 0.75rem 2.5rem' : '1rem 1rem 1rem 3rem',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  fontSize: isMobile ? '0.9rem' : '0.95rem',
                  minHeight: isMobile ? '44px' : '50px',
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
                padding: isMobile ? '0.75rem 1rem' : '0 1.5rem',
                cursor: !inputText.trim() || isLoading ? 'not-allowed' : 'pointer',
                opacity: !inputText.trim() || isLoading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: isMobile ? '0.9rem' : '0.95rem',
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
        marginTop: isMobile ? '0.75rem' : '1rem',
        textAlign: 'center',
        color: '#7f8c8d',
        fontSize: isMobile ? '0.7rem' : '0.8rem',
        padding: '0.5rem'
      }}>
        <p style={{ margin: 0, lineHeight: '1.4' }}>
          AI Student Assistant • Real-time GPA/CGPA from exam results • Data updates automatically
        </p>
        <p style={{ 
          margin: '0.25rem 0 0 0', 
          fontSize: isMobile ? '0.65rem' : '0.75rem',
          opacity: 0.7
        }}>
          Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Ask me anything!
        </p>
      </div>

      {/* Mobile Quick Questions Toggle */}
      {isMobile && !showQuickQuestions && (
        <button
          onClick={() => setShowQuickQuestions(true)}
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            background: '#4361ee',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(67, 97, 238, 0.4)',
            zIndex: 1000,
            fontSize: '1.2rem'
          }}
        >
          💬
        </button>
      )}

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
        @media (min-width: 1200px) {
          .chat-container {
            height: 75vh !important;
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
      `}</style>
    </div>
  );
};

export default Chatbot;