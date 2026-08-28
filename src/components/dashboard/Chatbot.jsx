// src/components/dashboard/Chatbot.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { supabase } from '../../services/supabase';
import { dataCache } from '../../utils/dataCache';
import { generateAIResponseWithContext } from '../../services/aiService';
import { chatHistoryService } from '../../services/chatHistoryService';

const Chatbot = () => {
  const { user } = useStudentAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
const [isLoadingInitial, setIsLoadingInitial] = useState(() => {
  // If cache already has data, never show the full-page loader
  try {
    const key = 'chatbot-data-' + (user?.id || user?.email || '');
    if (key && dataCache.get(key)) return false;
  } catch (e) {}
  return true;
});
  const [studentData, setStudentData] = useState(null);
  const [studentStats, setStudentStats] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const [profilePictureUrl, setProfilePictureUrl] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  // Refs to prevent duplicate loading
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const quickQuestionsRef = useRef(null);
  const inputRef = useRef(null);
  const isFetchingRef = useRef(false);
  const loadedHistoryRef = useRef(false);
  const mountedRef = useRef(true);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setShowQuickQuestions(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      isFetchingRef.current = false;
    };
  }, []);

  // Knowledge base
  const knowledgeBase = {
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
    return 'F';
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

  // Fetch profile picture URL
  const fetchProfilePicture = async (studentId) => {
    try {
      const { data: student, error } = await supabase
        .from('students')
        .select('profile_picture_url')
        .eq('id', studentId)
        .single();

      if (error) {
        console.log('⚠️ Could not fetch profile picture:', error.message);
        return null;
      }

      if (student?.profile_picture_url) {
        console.log('✅ Profile picture found');
        return student.profile_picture_url;
      }

      return null;
    } catch (error) {
      console.error('Error fetching profile picture:', error);
      return null;
    }
  };

  // Fetch GPA from exam results
  const fetchExamBasedGPA = async (studentId) => {
    try {
      console.log('📊 Fetching exam submissions for student_id:', studentId);
      
      const { data: examSubmissions, error: subError } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'graded')
        .not('total_marks_obtained', 'is', null);

      if (subError) {
        console.error('❌ Exam submissions error:', subError);
        throw subError;
      }
      
      console.log(`📊 Found ${examSubmissions?.length || 0} graded exam submissions`);
      
      if (!examSubmissions || examSubmissions.length === 0) {
        return { gpa: 0.0, cgpa: 0.0, semesterResults: {}, totalExams: 0, totalCredits: 0 };
      }

      const semesterResults = {};
      let totalCredits = 0;
      let totalPoints = 0;

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

      const examMap = {};
      exams.forEach(exam => {
        examMap[exam.id] = exam;
      });

      examSubmissions.forEach(submission => {
        const exam = examMap[submission.exam_id];
        if (!exam || !exam.courses) return;

        const course = exam.courses;
        const credits = course.credits || 3;
        const gradePoints = submission.grade_points || 
                           getGradePoints(submission.grade) || 
                           getGradePoints(getGradeFromMarks(submission.total_marks_obtained));
        const grade = submission.grade || getGradeFromMarks(submission.total_marks_obtained);
        
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

        totalCredits += credits;
        totalPoints += gradePoints * credits;
      });

      Object.keys(semesterResults).forEach(key => {
        const semester = semesterResults[key];
        if (semester.totalCredits > 0) {
          semester.gpa = parseFloat((semester.totalPoints / semester.totalCredits).toFixed(2));
        }
      });

      const cgpa = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0.0;

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

  // Save message to database - UPDATED
  const saveMessageToDB = useCallback(async (studentId, message, sender) => {
    try {
      console.log('🔍 saveMessageToDB called:', { studentId, sender, sessionId });
      
      // Get auth user ID
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const authUserId = authUser?.id || studentId;
      
      console.log('💾 Saving message with authUserId:', authUserId);
      
      // Ensure we have a session ID
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = await chatHistoryService.getOrCreateSession(authUserId);
        setSessionId(currentSessionId);
      }
      
      const result = await chatHistoryService.saveMessage(
        authUserId,
        message,
        sender,
        currentSessionId
      );
      
      if (result) {
        console.log('✅ Message saved successfully to DB');
        // Clear cache and reload history
        const cacheKey = `history_${authUserId}`;
        chatHistoryService._messageCache?.delete(cacheKey);
        
        // Reload chat history
        const updatedHistory = await chatHistoryService.loadChatHistory(authUserId);
        if (updatedHistory && updatedHistory.length > 0) {
          setMessages(updatedHistory);
        }
      } else {
        console.warn('⚠️ Message was not saved to DB');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error saving message to database:', error);
      return null;
    }
  }, [sessionId]);

  // Generate brief welcome message
  const generateWelcomeMessage = (student, stats) => {
    const firstName = student?.full_name?.split(' ')[0] || 'Student';
    
    // Check if user has ever sent a message
    const hasUserMessaged = messages.some(m => m.sender === 'user');
    
    // If user has interacted before, just say hi
    if (hasUserMessaged || messages.length > 1) {
      const quickGreetings = [
        `👋 Hey ${firstName}! How can I help?`,
        `👋 Welcome back, ${firstName}!`,
        `👋 Ready to continue, ${firstName}?`,
        `👋 ${firstName}! Ask me anything.`
      ];
      return quickGreetings[Math.floor(Math.random() * quickGreetings.length)];
    }
    
    // New user - brief intro with just the essentials
    const gpa = stats?.gpa?.examBasedCGPA?.toFixed(2) || 'N/A';
    const courses = stats?.courses?.inProgress || 0;
    
    let briefInfo = `📊 CGPA ${gpa}`;
    if (courses > 0) briefInfo += ` · ${courses} courses`;
    
    return `👋 Hi ${firstName}! I'm your personal AI assistant. Feel free to ask me anything! 💬`;
  };

  // Helper functions for data fetching
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
          courses (*)
        `)
        .in('course_id', activeCourseIds)
        .eq('status', 'published')
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching assignments:', error);
        return [];
      }

      if (assignments && assignments.length > 0) {
        const assignmentIds = assignments.map(a => a.id);
        const { data: submissions, error: subError } = await supabase
          .from('assignment_submissions')
          .select('*')
          .in('assignment_id', assignmentIds)
          .eq('student_id', studentId);

        if (subError) {
          console.error('Error fetching submissions:', subError);
          return assignments.map(a => ({ ...a, submissions: [] }));
        }

        return assignments.map(a => ({
          ...a,
          submissions: submissions?.filter(s => s.assignment_id === a.id) || []
        }));
      }

      return assignments || [];

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
          courses (*)
        `)
        .in('course_id', activeCourseIds)
        .eq('status', 'published')
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching exams:', error);
        return [];
      }

      if (exams && exams.length > 0) {
        const examIds = exams.map(e => e.id);
        const { data: submissions, error: subError } = await supabase
          .from('exam_submissions')
          .select('*')
          .in('exam_id', examIds)
          .eq('student_id', studentId);

        if (subError) {
          console.error('Error fetching exam submissions:', subError);
          return exams.map(e => ({ ...e, submissions: [] }));
        }

        return exams.map(e => ({
          ...e,
          submissions: submissions?.filter(s => s.exam_id === e.id) || []
        }));
      }

      return exams || [];

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

  // Detect query type for AI responses
  const detectQueryType = (query) => {
    const q = query.toLowerCase();
    
    if (/(hi|hello|hey|greetings|good\s*(morning|afternoon|evening|day)|what'?s\s*up|howdy|yo|sup|hi\s*there|hello\s*there|morning|afternoon|evening|hola|bonjour|namaste|aloha|ciao|salam|shalom|how\s*are\s*you|how'?s\s*it\s*going|how'?s\s*(everything|life|your\s*day)|what'?s\s*(happening|new|good|poppin)|long\s*time\s*no\s*see|nice\s*to\s*see\s*you|pleased\s*to\s*meet\s*you|how\s*have\s*you\s*been|good\s*to\s*see\s*you|hiya|hey\s*there|salutations|welcome\s*back|lovely\s*to\s*see\s*you|great\s*to\s*see\s*you)/.test(q)) {
      return 'greeting';
    }
    
    if (/(thank|thanks|thankyou|appreciate|grateful|obliged|cheers|ta|much\s*obliged)/.test(q)) {
      return 'thanks';
    }
    
    if (/(cgpa|cumulative\s*grade|cumulative\s*gpa|overall\s*gpa|total\s*gpa|exam\s*based|from\s*exam|exam\s*results)/.test(q)) {
      return 'cgpa';
    }
    
    if (/(gpa|grade\s*point|semester\s*gpa|current\s*gpa|this\s*semester)/.test(q)) {
      return 'gpa';
    }
    
    if (/(grade|marks?|scores?|academic\s*performance)/.test(q)) {
      return 'grades';
    }
    
    if (/(course|subject|unit|module|class)/.test(q)) {
      return 'courses';
    }
    
    if (/(assignment|homework|project|coursework|essay|report|paper|dissertation|thesis|portfolio)/.test(q)) {
      return 'assignments';
    }
    
    if (/(deadline|due\s*date|submission|hand\s*in|submit|when\s*is)/.test(q)) {
      return 'deadlines';
    }
    
    if (/(exam|test|midterm|final|quiz|assessment|evaluation|paper|examination)/.test(q)) {
      return 'exams';
    }
    
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
    
    if (/(fee|payment|finance|balance|money|tuition|fees|bill|invoice|payment|scholarship|loan)/.test(q)) {
      return 'finance';
    }
    
    if (/(attendance|present|absent|late|attended|punctual|late|missing)/.test(q)) {
      return 'attendance';
    }
    
    if (/(library|book|resource|study\s*material|reading|textbook|journal|publication)/.test(q)) {
      return 'library';
    }
    
    if (/(event|activity|campus|extra\s*curricular|club|society|workshop|seminar|conference)/.test(q)) {
      return 'events';
    }
    
    if (/(study|learn|prepar|improve|tip|advice|suggestion|how\s*to|method|technique|strategy)/.test(q)) {
      return 'study';
    }
    
    if (/(progress|performance|how\s*am\s*i|summary|overview|report|status|update)/.test(q)) {
      return 'progress';
    }
    
    if (/(help|what\s*can|capabilities|assist|how\s*to\s*use|guide|manual|tutorial)/.test(q)) {
      return 'help';
    }
    
    if (/(university|campus|faculty|department|program|college|school|institution)/.test(q)) {
      return 'university';
    }
    
    if (/(my\s*info|profile|details|who\s*am\s*i|student\s*info|information\s*about\s*me)/.test(q)) {
      return 'profile';
    }
    
    if (/(motivat|inspire|encourage|cheer\s*up|feeling\s*(down|sad|stressed|overwhelmed))/i.test(q)) {
      return 'motivation';
    }
    
    if (/(bye|goodbye|see\s*you|farewell|take\s*care|later|ciao|adios)/i.test(q)) {
      return 'goodbye';
    }
    
    if (/(how\s*are\s*you|how\s*do\s*you\s*do|how'?s\s*it\s*going)/i.test(q)) {
      return 'howareyou';
    }
    
    return 'unknown';
  };

  // AI Response Generator
  const generateAIResponse = (userQuery) => {
    if (!studentStats || !studentData) {
      return "I'm still loading your data. Please wait a moment...";
    }

    const query = userQuery.toLowerCase();
    const queryType = detectQueryType(query);
    
    if (queryType === 'greeting') {
      const randomGreeting = knowledgeBase.greetings[
        Math.floor(Math.random() * knowledgeBase.greetings.length)
      ];
      const randomTip = knowledgeBase.studyTips[
        Math.floor(Math.random() * knowledgeBase.studyTips.length)
      ];
      
      return `${randomGreeting}\n\n**Quick Tip:** ${randomTip}\n\nWhat would you like to know about your academic progress today?`;
    }
    
    if (queryType === 'thanks') {
      const randomThanks = knowledgeBase.thanks[
        Math.floor(Math.random() * knowledgeBase.thanks.length)
      ];
      const randomEncouragement = knowledgeBase.encouragement[
        Math.floor(Math.random() * knowledgeBase.encouragement.length)
      ];
      
      return `${randomThanks}\n\n${randomEncouragement}`;
    }
    
    if (queryType === 'howareyou') {
      return `I'm doing great, thank you for asking! 😊 As an AI assistant, I don't have feelings, but I'm always ready and excited to help you with your academic journey!\n\nHow about you? How's your day going? Is there anything academic I can assist you with today?`;
    }
    
    if (queryType === 'motivation') {
      const randomQuote = knowledgeBase.motivational[
        Math.floor(Math.random() * knowledgeBase.motivational.length)
      ];
      const randomEncouragement = knowledgeBase.encouragement[
        Math.floor(Math.random() * knowledgeBase.encouragement.length)
      ];
      
      return `🌟 **Here's some motivation for you:**\n\n"${randomQuote}"\n\n${randomEncouragement}\n\n**Remember:** Every expert was once a beginner. Keep going! 💪`;
    }
    
    if (queryType === 'goodbye') {
      return `👋 Goodbye, ${studentData.full_name.split(' ')[0]}! \n\nIt was great chatting with you! Remember:\n• Take regular breaks during study sessions\n• Stay hydrated and get enough sleep\n• Don't hesitate to reach out if you need help\n\nWishing you all the best in your studies! Come back anytime! 📚✨`;
    }
    
    if (queryType === 'cgpa') {
      const cgpaData = studentStats.gpa;
      const examBasedCGPA = cgpaData.examBasedCGPA || cgpaData.currentCGPA;
     
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
      
      let semesterResultsText = '';
      if (cgpaData.semesterResults && Object.keys(cgpaData.semesterResults).length > 0) {
        semesterResultsText = `**Semester-wise Performance:**\n${Object.keys(cgpaData.semesterResults).map(key => {
          const semester = cgpaData.semesterResults[key];
          return `• **Year ${semester.year}, Semester ${semester.semester}:** GPA ${semester.gpa?.toFixed(2) || '0.00'} (${semester.courses.length} exams)`;
        }).join('\n')}\n`;
      }
      
      return `📊 **Your Cumulative GPA (CGPA) Analysis**\n\n**Exam-Based CGPA:** ${examBasedCGPA.toFixed(2)}\n**Academic Classification:** ${classification}\n${sourceInfo}\n\n**Key Statistics:**\n• **Total Graded Exams:** ${cgpaData.totalGradedExams || 0}\n• **Total Credits Earned:** ${cgpaData.totalCredits || 0}\n• **Current Semester GPA:** ${(cgpaData.examBasedGPA || cgpaData.currentGPA).toFixed(2)}\n\n${semesterResultsText}**💡 What is CGPA?**\nCGPA (Cumulative Grade Point Average) is calculated from **all your graded exam results** across all semesters. It represents your overall academic performance.\n\n**Advice:** ${advice}\n\n**Note:** CGPA = (Σ grade_points × credits) / (Σ credits) from all graded exams`;
    }
    
    if (queryType === 'gpa') {
      const gpaData = studentStats.gpa;
      const currentGPA = gpaData.examBasedGPA || gpaData.currentGPA;
      const currentYear = studentData.year_of_study;
      const currentSemester = studentData.semester;
      
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
      
      let semesterDetailsText = '';
      if (currentSemesterResults) {
        semesterDetailsText = `**Current Semester Details:**\n• **Total Credits:** ${currentSemesterResults.totalCredits || 0}\n• **Total Points:** ${currentSemesterResults.totalPoints?.toFixed(2) || '0.00'}\n• **Number of Courses:** ${currentSemesterResults.courses.length}\n\n**Current Semester Courses:**\n${currentSemesterResults.courses.slice(0, 5).map(course => {
          const gradeEmoji = course.grade.startsWith('A') ? '🎯' : 
                             course.grade.startsWith('B') ? '👍' : 
                             course.grade.startsWith('C') ? '📊' : '📈';
          return `• ${gradeEmoji} **${course.grade}** - ${course.marks}/${course.totalMarks} (${course.percentage || '0'}%) - ${course.credits} credits`;
        }).join('\n')}\n${currentSemesterResults.courses.length > 5 ? `\n...and ${currentSemesterResults.courses.length - 5} more courses` : ''}\n`;
      }
      
      return `${icon} **Your Current Semester GPA Analysis**\n\n**Current Semester GPA:** ${currentGPA.toFixed(2)}\n**Semester:** Year ${currentYear}, Semester ${currentSemester}\n**Based on:** ${currentSemesterResults?.courses?.length || 0} graded exams this semester\n\n${semesterDetailsText}**📈 GPA Improvement Tips:**\n1. **Focus on current assignments** - They affect your final grades\n2. **Attend all lectures** - Better understanding leads to better grades\n3. **Seek help early** - Don't wait until you're struggling\n4. **Review past exams** - Identify patterns and weak areas\n5. **Form study groups** - Collaborative learning improves retention\n\n**Advice:** ${advice}\n\n**Next Step:** Work on improving weak areas and maintain strong performance in current courses!`;
    }
    
    if (queryType === 'grades') {
      const gpaData = studentStats.gpa;
      
      let gradeDistributionText = '';
      if (gpaData.semesterResults && Object.keys(gpaData.semesterResults).length > 0) {
        gradeDistributionText = Object.keys(gpaData.semesterResults).map(key => {
          const semester = gpaData.semesterResults[key];
          return `• **Year ${semester.year}, Sem ${semester.semester}:** GPA ${semester.gpa?.toFixed(2) || '0.00'} (${semester.courses.length} exams)`;
        }).join('\n');
      } else {
        gradeDistributionText = 'No detailed grade data available yet.';
      }
      
      return `📊 **Your Academic Grades Overview**\n\n**Overall Performance:**\n• **Exam-Based CGPA:** ${(gpaData.examBasedCGPA || gpaData.currentCGPA).toFixed(2)}\n• **Current Semester GPA:** ${(gpaData.examBasedGPA || gpaData.currentGPA).toFixed(2)}\n• **Total Graded Exams:** ${gpaData.totalGradedExams || 0}\n• **Total Credits:** ${gpaData.totalCredits || 0}\n\n**Grade Distribution:**\n${gradeDistributionText}\n\n**💡 Grade Interpretation:**\n• **A (90-100%)**: Excellent - Keep up the outstanding work!\n• **B (70-89%)**: Good - Solid understanding, room for improvement\n• **C (50-69%)**: Satisfactory - Focus on weaker areas\n• **D (40-49%)**: Passing - Significant improvement needed\n• **F (Below 40%)**: Failing - Immediate action required\n\n**Need specific grade advice?** Tell me which subject you're concerned about!`;
    }
    
    if (queryType === 'courses') {
      const currentCourses = studentStats.courses.list
        .filter(c => c.status === 'in_progress');
      
      const completedCourses = studentStats.courses.list
        .filter(c => c.status === 'completed');
      
      let currentCoursesText = '';
      if (currentCourses.length > 0) {
        currentCoursesText = currentCourses.map(c => 
          `• **${c.code}** - ${c.name}\n  Credits: ${c.credits} | Status: ${c.status.replace('_', ' ')}`
        ).join('\n\n');
      } else {
        currentCoursesText = 'No courses currently in progress';
      }
      
      let completedCoursesText = '';
      if (completedCourses.length > 0) {
        completedCoursesText = completedCourses.slice(0, 5).map(c => 
          `• **${c.code}** - ${c.name}\n  Grade: ${c.grade || 'N/A'} | Credits: ${c.credits}`
        ).join('\n\n');
      } else {
        completedCoursesText = 'No courses completed yet';
      }
      
      return `📚 **Your Course Information:**\n\n**Current Semester Courses (${currentCourses.length}):**\n${currentCoursesText}\n\n**Completed Courses (${completedCourses.length}):**\n${completedCoursesText}\n\n**Total Credits This Semester:** ${currentCourses.reduce((sum, c) => sum + c.credits, 0)}`;
    }
    
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
      
      let upcomingText = '';
      if (upcomingAssignments.length > 0) {
        upcomingText = upcomingAssignments.map(a => {
          const dueDate = new Date(a.due_date);
          const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
          let urgency = '';
          if (daysLeft <= 1) urgency = ' 🚨';
          else if (daysLeft <= 3) urgency = ' ⚠️';
          else if (daysLeft <= 7) urgency = ' 📅';
          
          return `• **${a.title}**${urgency}\n  Course: ${a.courses?.course_name || 'Unknown'}\n  Due: ${dueDate.toLocaleDateString()} (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)\n  Total Marks: ${a.total_marks}`;
        }).join('\n\n');
      } else {
        upcomingText = 'No upcoming assignments! Great job keeping up!';
      }
      
      let recentGradesText = '';
      if (recentGrades.length > 0) {
        recentGradesText = `**Recent Grades:**\n${recentGrades.map(a => {
          const submission = a.submissions?.find(s => s.student_id === studentData.id);
          const percentage = submission?.percentage || 0;
          let emoji = '📊';
          if (percentage >= 70) emoji = '🎯';
          else if (percentage >= 50) emoji = '👍';
          
          return `• **${a.title}**: ${submission?.marks_obtained || 0}/${a.total_marks} (${percentage}%) ${emoji}`;
        }).join('\n')}`;
      }
      
      return `📝 **Your Assignments:**\n\n**Summary:**\n• **Total:** ${studentStats.assignments.total}\n• **Submitted:** ${studentStats.assignments.submitted}\n• **Pending:** ${studentStats.assignments.pending}\n• **Overdue:** ${overdueAssignments}\n• **Graded:** ${studentStats.assignments.graded}\n\n${urgencyMessage ? urgencyMessage + '\n' : ''}**Upcoming Deadlines:**\n${upcomingText}\n\n${recentGradesText}`;
    }
    
    if (queryType === 'exams') {
      const upcomingExams = studentStats.exams.upcoming;
      const performance = studentStats.exams.performance;
      
      const now = new Date();
      const examsThisWeek = upcomingExams.filter(e => {
        const examDate = new Date(e.start_time);
        const daysDiff = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
        return daysDiff <= 7;
      });
      
      let gradeDistributionText = '';
      if (performance.grades && Object.keys(performance.grades).length > 0) {
        gradeDistributionText = `• **Grade Distribution:** ${Object.entries(performance.grades).map(([grade, count]) => `${grade}: ${count}`).join(', ')}`;
      }
      
      let examsThisWeekText = '';
      if (examsThisWeek.length > 0) {
        examsThisWeekText = examsThisWeek.map(e => {
          const examDate = new Date(e.start_time);
          const daysLeft = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
          const time = formatTime(e.start_time?.split(' ')[0] || '09:00');
          let urgency = '';
          if (daysLeft <= 1) urgency = ' 🚨';
          else if (daysLeft <= 3) urgency = ' ⚠️';
          
          return `• **${e.title}**${urgency}\n  Course: ${e.courses?.course_name || 'Unknown'}\n  Date: ${examDate.toLocaleDateString()} at ${time}\n  Location: ${e.location || 'TBA'}\n  Duration: ${e.duration || '2 hours'} (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)`;
        }).join('\n\n');
      } else {
        examsThisWeekText = 'No exams this week!';
      }
      
      let allUpcomingText = '';
      if (upcomingExams.length > 0) {
        allUpcomingText = upcomingExams.map(e => {
          const examDate = new Date(e.start_time);
          const daysLeft = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
          return `• ${daysLeft <= 7 ? '📅' : '📋'} **${e.title}** - ${examDate.toLocaleDateString()} (${daysLeft} days)`;
        }).join('\n');
      } else {
        allUpcomingText = 'No upcoming exams scheduled';
      }
      
      return `📋 **Your Exam Information:**\n\n**Performance Summary:**\n• **Average Score:** ${performance.average}%\n• **Highest Score:** ${performance.highest}%\n• **Lowest Score:** ${performance.lowest}%\n• **Total Exams:** ${performance.totalExams}\n${gradeDistributionText}\n\n**Exams This Week (${examsThisWeek.length}):**\n${examsThisWeekText}\n\n**All Upcoming Exams (${upcomingExams.length}):**\n${allUpcomingText}\n\n**Exam Preparation Tips:**\n1. Review past papers and sample questions\n2. Create summary notes for each topic\n3. Practice with mock tests\n4. Get adequate rest before the exam\n5. Arrive at least 30 minutes early`;
    }
    
    // Default response for unknown queries
    const randomEncouragement = knowledgeBase.encouragement[
      Math.floor(Math.random() * knowledgeBase.encouragement.length)
    ];
    const randomTip = knowledgeBase.advice[
      Math.floor(Math.random() * knowledgeBase.advice.length)
    ];
    
    return `🤔 **I'm not sure I understood your question completely.**\n\n${randomEncouragement}\n\n**Here's what I can help you with:**\n\n• **Academic Performance** - GPA, CGPA, grades, progress\n• **Exam Results** - Real-time GPA/CGPA from graded exams\n• **Assignments & Exams** - Deadlines, submissions, results\n• **Financial Status** - Fees, payments, balances\n• **Schedule** - Timetable, lectures, classes\n• **Attendance** - Records, percentage, trends\n• **Library** - Books, resources, availability\n• **Campus Life** - Events, activities, clubs\n• **Study Help** - Tips, strategies, resources\n• **University Info** - Policies, contacts, facilities\n• **General Chat** - Motivation, encouragement, advice\n\n**Tip:** ${randomTip}\n\n**Try asking me one of these:**\n"What's my current GPA from exams?"\n"What's my overall CGPA?"\n"What assignments are due this week?"\n"What's my attendance percentage?"\n"How much do I owe in fees?"\n"What lectures do I have today?"\n"Recommend study tips for exams"\n"Check my academic progress"\n"What library books are available?"\n"Give me some motivation"\n"How are you doing today?"`;
  };

  // Main data fetching function — uses dataCache like Dashboard / Timetable
  const fetchAllStudentData = useCallback(async (forceRefresh = false) => {
    if (isFetchingRef.current) {
      console.log('⏳ Already fetching data, skipping...');
      return;
    }

    if (!user?.email) {
      console.log('⏳ No user email yet, waiting...');
      return;
    }

    const cacheKey = 'chatbot-data-' + (user.id || user.email);
    const CACHE_TTL = 10 * 60 * 1000; // 10 minutes (same idea as Dashboard)

   // ===== CACHE HIT =====
if (!forceRefresh) {
  const cached = dataCache.get(cacheKey);
  if (cached) {
    console.log('✅ Chatbot: CACHE HIT — no loader');
    if (mountedRef.current) {
      setStudentData(cached.student);
      setStudentStats(cached.stats);
      if (cached.profilePictureUrl) setProfilePictureUrl(cached.profilePictureUrl);
      if (cached.sessionId) setSessionId(cached.sessionId);

      // Load chat history only if needed (no full-page loader)
      if (!loadedHistoryRef.current) {
        (async () => {
          try {
            const dbHistory = await chatHistoryService.loadChatHistory(cached.student.id);
            if (!mountedRef.current) return;
            if (dbHistory && dbHistory.length > 0) {
              setMessages(dbHistory);
            } else if (messages.length === 0) {
              const welcomeText = generateWelcomeMessage(cached.student, cached.stats);
              setMessages([{
                id: 'welcome_' + Date.now(),
                text: welcomeText,
                sender: 'ai',
                timestamp: new Date()
              }]);
            }
          } catch (e) {
            console.warn('⚠️ Chat history load failed:', e);
          }
          loadedHistoryRef.current = true;
        })();
      }

      setIsLoadingInitial(false); // ensure loader is off
    }
    isFetchingRef.current = false;
    return; // ← stop here, never enter the network path
  }
}

// Only show loader when we actually need to fetch from network
setIsLoadingInitial(true);
isFetchingRef.current = true;

    // ===== CACHE MISS / FORCE REFRESH =====
    try {
      isFetchingRef.current = true;
      setIsLoadingInitial(true);
      console.log('📊 Chatbot: CACHE MISS — fetching for:', user.email);

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('email', user.email)
        .single();

      if (studentError) throw studentError;
      if (!student) throw new Error('Student not found');

      console.log('✅ Student found:', student.id);
      setStudentData(student);

      let profilePic = null;
      try {
        profilePic = await fetchProfilePicture(student.id);
        if (profilePic) setProfilePictureUrl(profilePic);
      } catch (picError) {
        console.warn('⚠️ Could not fetch profile picture:', picError);
      }

      let session = null;
      try {
        session = await chatHistoryService.getOrCreateSession(student.id);
        setSessionId(session);
      } catch (sessionError) {
        console.warn('⚠️ Could not get/create session:', sessionError);
        session = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        setSessionId(session);
      }

      // Fetch courses
      let studentCourses = [];
      try {
        const { data: coursesData, error: coursesError } = await supabase
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

        if (coursesError) {
          console.warn('⚠️ Could not fetch courses:', coursesError);
        } else {
          studentCourses = coursesData || [];
        }
      } catch (coursesError) {
        console.warn('⚠️ Error fetching courses:', coursesError);
      }

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

      const activeCourses = coursesWithGrades.filter(c => c.status !== 'completed') || [];
      const activeCourseIds = activeCourses.map(sc => sc.course_id).filter(Boolean);

      // Fetch exam GPA
      let examGpaData = { gpa: 0.0, cgpa: 0.0, semesterResults: {}, totalExams: 0, totalCredits: 0 };
      try {
        examGpaData = await fetchExamBasedGPA(student.id);
      } catch (gpaError) {
        console.warn('⚠️ Could not fetch exam GPA:', gpaError);
      }

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

      // Fetch other data
      let lectures = [], assignments = [], exams = [], finance = [], attendance = [], timetable = [], libraryBooks = [], events = [];

      try { lectures = await fetchUpcomingLectures(activeCourseIds); } catch (e) { console.warn('⚠️ lectures:', e); }
      try { assignments = await fetchAssignments(activeCourseIds, student.id); } catch (e) { console.warn('⚠️ assignments:', e); }
      try { exams = await fetchExams(activeCourseIds, student.id); } catch (e) { console.warn('⚠️ exams:', e); }

      try {
        const { data: financeData } = await supabase
          .from('financial_records')
          .select('*')
          .eq('student_id', student.id)
          .eq('academic_year', student.academic_year)
          .order('semester', { ascending: true })
          .order('created_at', { ascending: true });
        finance = financeData || [];
      } catch (e) { console.warn('⚠️ finance:', e); }

      try {
        const { data: attendanceData } = await supabase
          .from('attendance_records')
          .select('*, courses(*)')
          .eq('student_id', student.id)
          .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('date', { ascending: false });
        attendance = attendanceData || [];
      } catch (e) { console.warn('⚠️ attendance:', e); }

      try {
        const { data: timetableData } = await supabase
          .from('timetable_slots')
          .select('*, courses(*), lecturers(*)')
          .in('course_id', activeCourseIds)
          .eq('is_active', true);
        timetable = timetableData || [];
      } catch (e) { console.warn('⚠️ timetable:', e); }

      try {
        const { data: libraryData } = await supabase
          .from('library_books')
          .select('*')
          .eq('status', 'available')
          .limit(5);
        libraryBooks = libraryData || [];
      } catch (e) { console.warn('⚠️ library:', e); }

      try {
        const { data: eventsData } = await supabase
          .from('campus_events')
          .select('*')
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true })
          .limit(5);
        events = eventsData || [];
      } catch (e) { console.warn('⚠️ events:', e); }

      // Build stats (same structure as before)
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
        gpa: {
          currentGPA: examGpaData.gpa || courseBasedGPA,
          currentCGPA: examGpaData.cgpa || courseBasedGPA,
          examBasedGPA: examGpaData.gpa,
          examBasedCGPA: examGpaData.cgpa,
          courseBasedGPA: courseBasedGPA,
          courseBasedCGPA: courseBasedGPA,
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
        lectures: lectures,
        assignments: {
          total: assignments?.length || 0,
          submitted: assignments?.filter(a => a.submissions?.some(s => s.student_id === student.id)).length || 0,
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
        finance: {
          totalPaid: finance?.filter(f => f.status === 'paid').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0,
          totalPending: finance?.filter(f => f.status === 'pending').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0,
          totalPartial: finance?.filter(f => f.status === 'partial').reduce((sum, f) => sum + (parseFloat(f.balance_due) || parseFloat(f.amount) || 0), 0) || 0,
          overdue: finance?.filter(f => f.due_date && new Date(f.due_date) < new Date() && f.status !== 'paid').length || 0,
          allFees: finance?.map(f => ({
            id: f.id,
            description: f.description || f.category || f.fee_type || 'Fee',
            feeType: f.category || f.fee_type || 'tuition',
            amount: parseFloat(f.amount) || 0,
            balanceDue: parseFloat(f.balance_due) || 0,
            status: f.status,
            semester: f.semester || 1,
            paymentDate: f.payment_date,
            dueDate: f.due_date,
            receiptNumber: f.receipt_number,
            paymentMethod: f.payment_method
          })) || [],
          tuition: {
            amount: finance?.filter(f => (f.category === 'tuition' || f.fee_type === 'tuition')).reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0,
            paid: finance?.filter(f => (f.category === 'tuition' || f.fee_type === 'tuition') && f.status === 'paid').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0,
            pending: finance?.filter(f => (f.category === 'tuition' || f.fee_type === 'tuition') && f.status !== 'paid').reduce((sum, f) => sum + (parseFloat(f.balance_due) || parseFloat(f.amount) || 0), 0) || 0,
            semester1: finance?.filter(f => (f.category === 'tuition' || f.fee_type === 'tuition') && f.semester === 1).map(f => ({ amount: parseFloat(f.amount) || 0, status: f.status, paidDate: f.payment_date })) || [],
            semester2: finance?.filter(f => (f.category === 'tuition' || f.fee_type === 'tuition') && f.semester === 2).map(f => ({ amount: parseFloat(f.amount) || 0, status: f.status, paidDate: f.payment_date })) || []
          },
          functional: {
            amount: finance?.filter(f => f.category === 'functional').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0,
            paid: finance?.filter(f => f.category === 'functional' && f.status === 'paid').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0,
            pending: finance?.filter(f => f.category === 'functional' && f.status !== 'paid').reduce((sum, f) => sum + (parseFloat(f.balance_due) || parseFloat(f.amount) || 0), 0) || 0
          },
          guild: {
            amount: finance?.filter(f => f.category === 'guild').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0,
            paid: finance?.filter(f => f.category === 'guild' && f.status === 'paid').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0,
            pending: finance?.filter(f => f.category === 'guild' && f.status !== 'paid').reduce((sum, f) => sum + (parseFloat(f.balance_due) || parseFloat(f.amount) || 0), 0) || 0
          },
          nche: {
            amount: finance?.filter(f => f.category === 'nche').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0,
            paid: finance?.filter(f => f.category === 'nche' && f.status === 'paid').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0
          },
          registration: {
            amount: finance?.filter(f => f.category === 'registration').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0,
            paid: finance?.filter(f => f.category === 'registration' && f.status === 'paid').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0
          },
          recent: finance?.slice(0, 10) || [],
          scholarships: finance?.filter(f => f.type === 'scholarship' || f.category === 'scholarship').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0,
          fines: finance?.filter(f => f.type === 'fine' || f.category === 'fine').reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0) || 0
        },
        attendance: {
          total: attendance?.length || 0,
          present: attendance?.filter(a => a.status === 'present').length || 0,
          absent: attendance?.filter(a => a.status === 'absent').length || 0,
          late: attendance?.filter(a => a.status === 'late').length || 0,
          rate: attendance?.length > 0 ? (attendance.filter(a => a.status === 'present').length / attendance.length * 100).toFixed(1) : 0,
          recent: attendance?.slice(0, 10) || [],
          byCourse: groupAttendanceByCourse(attendance || []),
          trend: calculateAttendanceTrend(attendance || [])
        },
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
          today: events?.filter(e => new Date(e.date).toDateString() === new Date().toDateString()) || []
        }
      };

      setStudentStats(processedStats);

      // ===== SAVE TO CACHE (survives tab switches) =====
      dataCache.set(cacheKey, {
        student: student,
        stats: processedStats,
        profilePictureUrl: profilePic,
        sessionId: session
      }, CACHE_TTL);

      console.log('✅ Chatbot data cached for 10 minutes');

      // Load chat history (only once per mount)
      if (!loadedHistoryRef.current) {
        try {
          console.log('📥 Loading chat history from database...');
          const dbHistory = await chatHistoryService.loadChatHistory(student.id);

          if (dbHistory && dbHistory.length > 0) {
            console.log('✅ Loaded chat history:', dbHistory.length, 'messages');
            setMessages(dbHistory);
            loadedHistoryRef.current = true;
          } else {
            const welcomeText = generateWelcomeMessage(student, processedStats);
            const welcomeMessage = {
              id: 'welcome_' + Date.now(),
              text: welcomeText,
              sender: 'ai',
              timestamp: new Date()
            };
            setMessages([welcomeMessage]);
            loadedHistoryRef.current = true;
            chatHistoryService.saveMessage(student.id, welcomeMessage, 'ai', session)
              .then(() => console.log('✅ Welcome message saved'))
              .catch(e => console.warn('⚠️ Could not save welcome message:', e));
          }
        } catch (chatError) {
          console.warn('⚠️ Could not load chat history:', chatError);
          const welcomeText = generateWelcomeMessage(student, processedStats);
          setMessages([{
            id: 'welcome_' + Date.now(),
            text: welcomeText,
            sender: 'ai',
            timestamp: new Date()
          }]);
          loadedHistoryRef.current = true;
        }
      }

      console.log('✅ All data loaded successfully!');

    } catch (error) {
      console.error('❌ Error in fetchAllStudentData:', error);
      if (messages.length === 0) {
        setMessages([{
          id: 'error_' + Date.now(),
          text: '⚠️ Error loading your data: ' + error.message + '. Please try refreshing the page or contact support.',
          sender: 'ai',
          timestamp: new Date()
        }]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoadingInitial(false);
      }
      isFetchingRef.current = false;
    }
  }, [user?.email, user?.id]);

  // Handle sending messages - UPDATED
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    // Add user message to state
    setMessages(prev => {
      const exists = prev.some(msg => 
        msg.text === userMessage.text && 
        msg.sender === userMessage.sender
      );
      if (exists) return prev;
      return [...prev, userMessage];
    });
    
    setInputText('');
    setIsLoading(true);

    // Save user message to database - wait for it
    if (studentData?.id) {
      try {
        await saveMessageToDB(studentData.id, userMessage, 'user');
        console.log('✅ User message saved to DB');
      } catch (error) {
        console.error('❌ Error saving user message:', error);
      }
    }

    try {
      const conversationHistory = messages
        .filter(msg => msg.text && msg.text.length > 0)
        .slice(-6)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text.substring(0, 300)
        }));

      const aiResponse = await generateAIResponseWithContext(
        inputText, 
        studentStats, 
        studentData,
        conversationHistory
      );
      
      const aiMessage = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => {
        const exists = prev.some(msg => 
          msg.text === aiMessage.text && 
          msg.sender === aiMessage.sender
        );
        if (exists) return prev;
        return [...prev, aiMessage];
      });

      // Save AI message to database - wait for it
      if (studentData?.id) {
        try {
          await saveMessageToDB(studentData.id, aiMessage, 'ai');
          console.log('✅ AI message saved to DB');
        } catch (error) {
          console.error('❌ Error saving AI message:', error);
        }
      }
      
    } catch (error) {
      console.error('AI response error, using fallback:', error);
      const aiResponse = generateAIResponse(inputText);
      const aiMessage = {
        id: `ai_fallback_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => {
        const exists = prev.some(msg => 
          msg.text === aiMessage.text && 
          msg.sender === aiMessage.sender
        );
        if (exists) return prev;
        return [...prev, aiMessage];
      });

      if (studentData?.id) {
        try {
          await saveMessageToDB(studentData.id, aiMessage, 'ai');
        } catch (error) {
          console.error('❌ Error saving fallback AI message:', error);
        }
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = async () => {
    if (!studentData?.id) return;

    try {
      await chatHistoryService.clearChatHistory(studentData.id);
      
      const welcomeText = generateWelcomeMessage(studentData, studentStats);
      const welcomeMessage = {
        id: `welcome_${Date.now()}`,
        text: welcomeText,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      loadedHistoryRef.current = true;
      
      await saveMessageToDB(studentData.id, welcomeMessage, 'ai');
      localStorage.removeItem(`chat-history-${user.email}-backup`);
      
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  const handleQuickQuestion = (question) => {
    setInputText(question);
    if (isMobile) {
      setShowQuickQuestions(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const quickQuestions = [
    "What's my CGPA?",
    "Current GPA?",
    "Assignments due?",
    "How much do I owe?",
    "Lectures today?",
    "My attendance?",
    "Study tips",
    "Exam schedule"
  ];

  // Scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

   // Initial fetch — uses cache, so tab switches do NOT re-fetch
  useEffect(() => {
    if (!user?.email) return;
    if (isFetchingRef.current) return;

    console.log('🔄 Chatbot mount — checking cache...');
    fetchAllStudentData(false); // false = use cache if available
  }, [user?.email]); // do NOT depend on fetchAllStudentData to avoid loops
  
  
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
          Fetching your academic data
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
            <button
  onClick={() => {
    const cacheKey = 'chatbot-data-' + (user?.id || user?.email);
    dataCache.delete?.(cacheKey); // or dataCache.set(cacheKey, null)
    loadedHistoryRef.current = false;
    fetchAllStudentData(true); // force refresh
  }}
  style={{ /* same style as Clear Chat */ }}
>
  🔄 Refresh
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
                  maxWidth: '95%',
                  flexDirection: message.sender === 'user' ? 'row-reverse' : 'row'
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
                  
                  {message.sender === 'user' && (
                    <div style={{
                      width: isMobile ? '28px' : '32px',
                      height: isMobile ? '28px' : '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '0.25rem',
                      overflow: 'hidden',
                      border: '2px solid #4361ee',
                      background: '#e9ecef'
                    }}>
                      {profilePictureUrl ? (
                        <img 
                          src={profilePictureUrl} 
                          alt={studentData?.full_name || 'User'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <span style={{ 
                          fontSize: isMobile ? '0.8rem' : '0.9rem',
                          color: '#4361ee',
                          fontWeight: 'bold'
                        }}>
                          {studentData?.full_name?.charAt(0) || 'U'}
                        </span>
                      )}
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

        {/* Quick Questions */}
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
        
        ::selection {
          background-color: rgba(67, 97, 238, 0.3);
          color: inherit;
        }
        
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