// src/services/aiService.js
import { supabase } from './supabase';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = import.meta.env.VITE_GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';

// ✅ CORRECT - Using your actual available models from the API
const WORKING_MODELS = [
  'groq/compound',
  'groq/compound-mini',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.6-27b',
  'qwen/qwen3.8-27b',
  'allam-2-7b',
];

console.log('🚀 AI Service Loaded');

// ===================== GREETING DETECTION =====================

const isGreetingQuery = (query) => {
  const q = (query || '').toLowerCase().trim();
  const greetings = [
    'hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 
    'good evening', 'what\'s up', 'howdy', 'yo', 'sup', 'hi there', 
    'hello there', 'morning', 'afternoon', 'evening', 'hola', 'bonjour',
    'namaste', 'aloha', 'ciao', 'salam', 'shalom', 'how are you',
    'how\'s it going', 'how\'s everything', 'how\'s life', 'how\'s your day',
    'what\'s happening', 'what\'s new', 'what\'s good', 'long time no see',
    'nice to see you', 'pleased to meet you', 'how have you been',
    'good to see you', 'hiya', 'hey there', 'salutations', 'welcome back',
    'lovely to see you', 'great to see you'
  ];
  return greetings.some(g => q === g || q.startsWith(g + ' ') || q.endsWith(' ' + g));
};

const getGreetingResponse = (studentName) => {
  const firstName = (studentName || 'Student').split(' ')[0];
  const greetings = [
    `👋 Hi ${firstName}! How can I help you today? 😊`,
    `Hello ${firstName}! 👋 What would you like to know about your academics?`,
    `Hey ${firstName}! 🌟 How can I assist you with your studies?`,
    `👋 Welcome back, ${firstName}! What can I do for you today?`,
    `Hi ${firstName}! 💫 Ready to check your academic progress?`,
    `Hello there, ${firstName}! 📚 What would you like to learn about?`,
    `👋 Hey ${firstName}! How are you doing today?`,
    `Hi ${firstName}! 🎓 Let me know what you need help with!`,
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
};

// ===================== HELPERS =====================

const getGradePoints = (grade) => {
  if (!grade) return 0;
  const map = {
    'A+': 5.0, 'A': 5.0, 'B+': 4.5, 'B': 4.0,
    'C+': 3.5, 'C': 3.0, 'D+': 2.5, 'D': 2.0, 'F': 0.0
  };
  return map[String(grade).toUpperCase()] || 0;
};

const getGradeFromMarks = (marks) => {
  if (marks === null || marks === undefined) return null;
  const n = parseFloat(marks);
  if (isNaN(n)) return null;
  if (n >= 90) return 'A+';
  if (n >= 80) return 'A';
  if (n >= 75) return 'B+';
  if (n >= 70) return 'B';
  if (n >= 65) return 'C+';
  if (n >= 60) return 'C';
  if (n >= 55) return 'D+';
  if (n >= 50) return 'D';
  return 'F';
};

// ===================== FETCH STUDENT CORE DATA =====================

const fetchStudentCoreData = async (studentId) => {
  try {
    let cgpa = 0, pendingAssignments = 0, upcomingExams = 0, totalPaid = 0, totalPending = 0;
    
    try {
      // ✅ FIRST: Get Dean-approved exam IDs
      const { data: approvedExams, error: approvedError } = await supabase
        .from('exam_results_approvals')
        .select('exam_id')
        .eq('status', 'approved_by_dean');

      if (approvedError) {
        console.warn('⚠️ Could not fetch approved exams:', approvedError);
      }

      const approvedExamIds = approvedExams?.map(a => a.exam_id) || [];
      console.log(`✅ AI Service - Dean-approved exam IDs: ${approvedExamIds.length}`);

      const { data: studentCourses } = await supabase
        .from('student_courses')
        .select('course_id, status, grade, grade_points, marks')
        .eq('student_id', studentId);

      if (studentCourses && studentCourses.length > 0) {
        const activeCourseIds = studentCourses
          .filter(c => c.status !== 'completed' && c.status !== 'passed')
          .map(c => c.course_id)
          .filter(Boolean);

        let totalPoints = 0;
        let totalCredits = 0;

        // ✅ ONLY use Dean-approved exam submissions for CGPA
        if (approvedExamIds.length > 0) {
          const { data: examSubmissions, error: subError } = await supabase
            .from('exam_submissions')
            .select('exam_id, total_marks_obtained, grade, grade_points, status')
            .eq('student_id', studentId)
            .eq('status', 'graded')
            .not('total_marks_obtained', 'is', null)
            .in('exam_id', approvedExamIds);

          if (subError) {
            console.warn('⚠️ Could not fetch exam submissions:', subError);
          }

          if (examSubmissions && examSubmissions.length > 0) {
            const examIds = examSubmissions.map(s => s.exam_id);
            const { data: exams, error: examsError } = await supabase
              .from('examinations')
              .select('id, course_id, total_marks')
              .in('id', examIds);

            if (examsError) {
              console.warn('⚠️ Could not fetch exams:', examsError);
            }

            const examMap = {};
            (exams || []).forEach(e => { examMap[e.id] = e; });

            const courseIds = (exams || []).map(e => e.course_id).filter(Boolean);
            let creditMap = {};
            if (courseIds.length > 0) {
              const { data: coursesData } = await supabase
                .from('courses')
                .select('id, credits')
                .in('id', courseIds);
              (coursesData || []).forEach(c => { creditMap[c.id] = c.credits || 3; });
            }

            examSubmissions.forEach(sub => {
              const exam = examMap[sub.exam_id];
              if (!exam) return;
              
              const grade = sub.grade || getGradeFromMarks(sub.total_marks_obtained);
              const gp = sub.grade_points || getGradePoints(grade);
              const credits = creditMap[exam.course_id] || 3;
              
              if (gp && credits) {
                totalPoints += gp * credits;
                totalCredits += credits;
              }
            });

            cgpa = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;
            console.log(`✅ AI Service CGPA from Dean-approved exams: ${cgpa} (${totalPoints}/${totalCredits})`);
          }
        }

        // ✅ Fallback: Use student_courses grades only if no Dean-approved exams
        if (totalCredits === 0) {
          const gradedCourses = studentCourses.filter(c => c.grade || c.marks);
          
          if (gradedCourses.length > 0) {
            const courseIds = gradedCourses.map(c => c.course_id);
            const { data: courses } = await supabase
              .from('courses')
              .select('id, credits')
              .in('id', courseIds);
            
            const creditMap = {};
            (courses || []).forEach(c => { creditMap[c.id] = c.credits || 3; });
            
            gradedCourses.forEach(sc => {
              const grade = sc.grade || getGradeFromMarks(sc.marks);
              const gp = sc.grade_points || getGradePoints(grade);
              const credits = creditMap[sc.course_id] || 3;
              if (gp && credits) {
                totalPoints += gp * credits;
                totalCredits += credits;
              }
            });
            cgpa = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;
            console.log(`✅ AI Service CGPA from course grades: ${cgpa}`);
          }
        }

        if (activeCourseIds.length > 0) {
          const { data: assignments } = await supabase
            .from('assignments')
            .select('id')
            .in('course_id', activeCourseIds)
            .eq('status', 'published')
            .is('deleted_at', null)
            .gt('due_date', new Date().toISOString());
          pendingAssignments = (assignments || []).length;

          const { data: exams } = await supabase
            .from('examinations')
            .select('id')
            .in('course_id', activeCourseIds)
            .in('status', ['scheduled', 'published', 'active'])
            .is('deleted_at', null)
            .gt('start_time', new Date().toISOString());
          upcomingExams = (exams || []).length;
        }
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch student data:', err);
    }

    return { cgpa, pendingAssignments, upcomingExams, totalPaid, totalPending };
  } catch (err) {
    console.error('Error fetching student data:', err);
    return { cgpa: 0, pendingAssignments: 0, upcomingExams: 0, totalPaid: 0, totalPending: 0 };
  }
};

// ===================== FETCH TIMETABLE =====================

const fetchStudentTimetable = async (studentData) => {
  try {
    if (!studentData) return { slots: [], upcoming: [] };

    const programId = studentData.program_id;
    const academicYear = studentData.academic_year || studentData.academicYear;
    const semester = studentData.semester;
    const yearOfStudy = studentData.year_of_study || studentData.yearOfStudy;

    if (!programId || !academicYear || semester == null || yearOfStudy == null) {
      console.warn('⚠️ Missing program/year/semester data for timetable');
      return { slots: [], upcoming: [] };
    }

    const { data: programTimetable, error: ptError } = await supabase
      .from('program_timetables')
      .select('id')
      .eq('program_id', programId)
      .eq('academic_year', academicYear)
      .eq('semester', semester)
      .eq('year_of_study', yearOfStudy)
      .eq('is_active', true)
      .maybeSingle();

    if (ptError || !programTimetable) {
      console.warn('⚠️ No active program timetable found for this student cohort');
      return { slots: [], upcoming: [] };
    }

    const { data: timetableSlots, error: slotsError } = await supabase
      .from('program_timetable_slots')
      .select(`
        course_code,
        course_name,
        lecturer_id,
        day_of_week,
        start_time,
        end_time,
        room_number,
        building,
        slot_type,
        lecturers (full_name)
      `)
      .eq('program_timetable_id', programTimetable.id)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (slotsError || !timetableSlots || timetableSlots.length === 0) {
      return { slots: [], upcoming: [] };
    }

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const slots = timetableSlots.map(slot => {
      const dayIndex = (slot.day_of_week || 1) - 1;
      return {
        courseCode: slot.course_code || 'N/A',
        courseName: slot.course_name || 'Unknown Course',
        lecturer: slot.lecturers?.full_name || 'Not Assigned',
        dayOfWeek: slot.day_of_week,
        dayName: dayNames[dayIndex] || 'Unknown',
        startTime: slot.start_time,
        endTime: slot.end_time,
        room: slot.room_number
          ? (slot.room_number + (slot.building ? ', ' + slot.building : ''))
          : 'TBA',
        slotType: slot.slot_type === 'lab' ? 'LAB' : 'Lecture'
      };
    });

    const today = new Date();
    const todayDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
    const upcoming = [];

    slots.forEach(slot => {
      let daysToAdd = slot.dayOfWeek - todayDayOfWeek;
      if (daysToAdd < 0) daysToAdd += 7;
      const lectureDate = new Date(today);
      lectureDate.setDate(today.getDate() + daysToAdd);
      upcoming.push({
        ...slot,
        date: lectureDate.toISOString().split('T')[0],
        isToday: daysToAdd === 0,
        isTomorrow: daysToAdd === 1
      });
    });

    upcoming.sort((a, b) => {
      if (a.date === b.date) {
        return (a.startTime || '').localeCompare(b.startTime || '');
      }
      return a.date.localeCompare(b.date);
    });

    return { slots, upcoming: upcoming.slice(0, 15) };
  } catch (err) {
    console.error('Error fetching timetable:', err);
    return { slots: [], upcoming: [] };
  }
};

// ===================== FETCH FINANCIAL DATA =====================

const fetchFinancialData = async (studentId) => {
  try {
    const { data: financial } = await supabase
      .from('financial_records')
      .select('*')
      .eq('student_id', studentId)
      .order('semester', { ascending: true });

    if (!financial || financial.length === 0) {
      return { totalPaid: 0, totalPending: 0, totalBalance: 0, fees: [] };
    }

    let totalPaid = 0;
    let totalPending = 0;
    let totalBalance = 0;

    const feeDetails = financial.map(f => {
      const amount = parseFloat(f.amount) || 0;
      const balanceDue = parseFloat(f.balance_due) || 0;
      const status = f.status || 'pending';
      
      if (status === 'paid') {
        totalPaid += amount;
      } else if (status === 'pending' || status === 'partial') {
        totalPending += balanceDue > 0 ? balanceDue : amount;
        totalBalance += balanceDue > 0 ? balanceDue : amount;
      }

      return {
        description: f.description || f.category || 'Fee',
        semester: f.semester || 'N/A',
        amount: amount,
        balanceDue: balanceDue,
        status: status,
        dueDate: f.due_date,
        paidDate: f.payment_date,
        category: f.category || 'tuition'
      };
    });

    return { totalPaid, totalPending, totalBalance, fees: feeDetails };
  } catch (err) {
    console.error('Error fetching financial data:', err);
    return { totalPaid: 0, totalPending: 0, totalBalance: 0, fees: [] };
  }
};

// ===================== FETCH EXAM RESULTS =====================

const fetchExamResults = async (studentId) => {
  try {
    if (!studentId) return { submissions: [], gradedCount: 0, totalMarks: 0 };

    // Get Dean-approved exam IDs
    const { data: approvedExams } = await supabase
      .from('exam_results_approvals')
      .select('exam_id')
      .eq('status', 'approved_by_dean');

    const approvedExamIds = approvedExams?.map(a => a.exam_id) || [];

    if (approvedExamIds.length === 0) {
      return { submissions: [], gradedCount: 0, totalMarks: 0 };
    }

    const { data: submissions, error: subError } = await supabase
      .from('exam_submissions')
      .select(`
        id,
        exam_id,
        total_marks_obtained,
        grade,
        grade_points,
        percentage,
        graded_at
      `)
      .eq('student_id', studentId)
      .eq('status', 'graded')
      .in('exam_id', approvedExamIds);

    if (subError || !submissions || submissions.length === 0) {
      return { submissions: [], gradedCount: 0, totalMarks: 0 };
    }

    const examIds = submissions.map(s => s.exam_id);
    const { data: exams } = await supabase
      .from('examinations')
      .select(`
        id,
        title,
        total_marks,
        course_id,
        courses(course_code, course_name)
      `)
      .in('id', examIds);

    const examMap = {};
    (exams || []).forEach(e => { examMap[e.id] = e; });

    const detailedResults = submissions.map(sub => {
      const exam = examMap[sub.exam_id];
      return {
        ...sub,
        examTitle: exam?.title || 'Exam',
        courseCode: exam?.courses?.course_code || 'N/A',
        courseName: exam?.courses?.course_name || 'N/A',
        totalMarks: exam?.total_marks || 100
      };
    });

    return {
      submissions: detailedResults,
      gradedCount: detailedResults.length,
      totalMarks: detailedResults.reduce((sum, r) => sum + (parseFloat(r.total_marks_obtained) || 0), 0)
    };
  } catch (err) {
    console.error('Error fetching exam results:', err);
    return { submissions: [], gradedCount: 0, totalMarks: 0 };
  }
};

// ===================== CONTEXT BUILDER =====================

const buildCompleteContext = async (studentStats, studentData, coreData) => {
  const name = studentData?.full_name || studentData?.fullName || 'Student';
  const cgpa = coreData?.cgpa ?? 0;
  const pendingAssign = coreData?.pendingAssignments ?? 0;
  const upcoming = coreData?.upcomingExams ?? 0;
  
  let financial = { totalPaid: 0, totalPending: 0, totalBalance: 0, fees: [] };
  if (studentData?.id) {
    financial = await fetchFinancialData(studentData.id);
  }
  
  let timetable = { slots: [], upcoming: [] };
  if (studentData) {
    timetable = await fetchStudentTimetable(studentData);
  }

  let examResults = { submissions: [], gradedCount: 0, totalMarks: 0 };
  if (studentData?.id) {
    examResults = await fetchExamResults(studentData.id);
  }

  let context = 'Student Information:\n';
  context += `Name: ${name}\n`;
  context += `Student ID: ${studentData?.student_id || 'N/A'}\n`;
  context += `Program: ${studentData?.program || 'N/A'}\n`;
  context += `Year: ${studentData?.year_of_study || 'N/A'}\n`;
  context += `Semester: ${studentData?.semester || 'N/A'}\n\n`;
  
  context += 'Academic Performance:\n';
  context += `CGPA: ${cgpa}\n`;
  context += `Pending Assignments: ${pendingAssign}\n`;
  context += `Upcoming Exams: ${upcoming}\n\n`;
  
  context += 'Exam Results (Dean-approved only):\n';
  context += `Total Graded Exams: ${examResults.gradedCount}\n`;
  if (examResults.submissions.length > 0) {
    examResults.submissions.forEach(r => {
      context += `- ${r.courseCode} - ${r.examTitle}: ${r.total_marks_obtained}/${r.totalMarks} (${r.percentage || 0}%), Grade: ${r.grade || 'N/A'}\n`;
    });
  } else {
    context += 'No exam results available yet.\n';
  }
  context += '\n';
  
  context += 'Financial Status:\n';
  context += `Total Paid: $${financial.totalPaid.toLocaleString()}\n`;
  context += `Total Pending: $${financial.totalPending.toLocaleString()}\n`;
  context += `Balance: $${financial.totalBalance.toLocaleString()}\n`;
  
  if (financial.fees && financial.fees.length > 0) {
    context += 'Fee Details:\n';
    financial.fees.slice(0, 5).forEach(f => {
      context += `- ${f.description}: $${f.amount} (${f.status})`;
      if (f.dueDate) context += `, Due: ${f.dueDate}`;
      context += '\n';
    });
  }
  context += '\n';
  
  context += 'Timetable:\n';
  if (timetable.slots && timetable.slots.length > 0) {
    const byDay = {};
    timetable.slots.forEach(s => {
      const day = s.dayName || 'Unknown';
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(s);
    });
    
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    dayOrder.forEach(day => {
      if (byDay[day] && byDay[day].length > 0) {
        context += `${day}:\n`;
        byDay[day].forEach(s => {
          context += `  ${s.startTime}-${s.endTime} | ${s.courseCode} | ${s.room}\n`;
        });
      }
    });
  } else {
    context += 'No timetable available for this semester.\n';
  }
  context += '\n';
  
  if (timetable.upcoming && timetable.upcoming.length > 0) {
    context += 'Upcoming Lectures (next 7 days):\n';
    timetable.upcoming.slice(0, 5).forEach(u => {
      const label = u.isToday ? 'Today' : (u.isTomorrow ? 'Tomorrow' : u.dayName);
      context += `- ${label} ${u.startTime}-${u.endTime} | ${u.courseCode} | ${u.room}\n`;
    });
  }

  return context;
};

// ===================== FORMAT RESPONSE =====================

const formatAIResponse = (text) => {
  if (!text) return text;
  
  let formatted = text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/__/g, '')
    .replace(/_/g, '')
    .replace(/`/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  formatted = formatted.replace(/^(\d+)\.\s*/gm, '• ');
  
  return formatted;
};

// ===================== MAIN AI RESPONSE =====================

export const generateAIResponseWithContext = async (
  userQuery,
  studentStats,
  studentData,
  conversationHistory = []
) => {
  const studentName = studentData?.full_name || studentData?.fullName || 'Student';
  
  console.log('📝 User query:', userQuery);
  
  if (isGreetingQuery(userQuery)) {
    console.log('✅ Greeting detected');
    return getGreetingResponse(studentName);
  }

  if (!GROQ_API_KEY) {
    console.error('❌ GROQ API key is missing!');
    return 'AI service is not configured. Please contact support.';
  }

  try {
    let coreData = null;
    if (studentData?.id) {
      coreData = await fetchStudentCoreData(studentData.id);
    }

    const fullContext = await buildCompleteContext(studentStats, studentData, coreData);

    const systemPrompt = 
      'You are a helpful, intelligent academic assistant for a university student. ' +
      'You have access to the student\'s personal academic data including grades, CGPA, assignments, exams, financial records, and timetable.\n\n' +
      'IMPORTANT GUIDELINES:\n' +
      '1. Never reveal that you are fetching data or accessing a database.\n' +
      '2. Never use phrases like "Based on the data provided" or "According to your records".\n' +
      '3. Always be helpful, warm, and encouraging.\n' +
      '4. Format responses cleanly without markdown symbols.\n' +
      '5. For exam results, always mention the specific scores and grades.\n' +
      '6. For financial questions, give clear breakdowns.\n' +
      '7. Be conversational and proactive.\n\n' +
      'Student Data (use this naturally):\n' +
      fullContext;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      })),
      { role: 'user', content: userQuery }
    ];

    console.log('🔄 Calling Groq API...');
    
    for (const model of WORKING_MODELS) {
      try {
        console.log(`📡 Trying model: ${model}`);
        
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + GROQ_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.4,
            max_tokens: 1024
          })
        });

        console.log(`📡 Response status for ${model}:`, response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`⚠️ Model ${model} failed:`, response.status);
          
          if (response.status === 401) {
            return 'The AI service API key is invalid. Please check your Groq API key.';
          }
          
          if (response.status === 429) {
            return 'The AI service is currently rate limited. Please wait a moment and try again.';
          }
          
          continue;
        }

        const data = await response.json();
        console.log('✅ API Response received from', model);
        
        let content = data?.choices?.[0]?.message?.content;
        if (content && content.trim()) {
          content = formatAIResponse(content);
          return content.trim();
        }
      } catch (e) {
        console.warn('Model failed:', model, e.message);
      }
    }

    console.warn('⚠️ All models failed, using intelligent fallback');
    return getIntelligentFallbackResponse(userQuery, studentName, studentData, coreData);

  } catch (err) {
    console.error('❌ AI response error:', err);
    return 'Sorry, I encountered an error. Please try again.';
  }
};

// ===================== INTELLIGENT FALLBACK =====================

const getIntelligentFallbackResponse = async (query, studentName, studentData, coreData) => {
  const q = query.toLowerCase().trim();
  const firstName = (studentName || 'Student').split(' ')[0];
  const cgpa = coreData?.cgpa ?? 0;
  const pendingAssign = coreData?.pendingAssignments ?? 0;
  const upcoming = coreData?.upcomingExams ?? 0;
  
  let financial = { totalPaid: 0, totalPending: 0, totalBalance: 0, fees: [] };
  let timetable = { slots: [], upcoming: [] };
  let examResults = { submissions: [], gradedCount: 0, totalMarks: 0 };
  
  if (studentData?.id) {
    try {
      financial = await fetchFinancialData(studentData.id);
      timetable = await fetchStudentTimetable(studentData);
      examResults = await fetchExamResults(studentData.id);
    } catch (e) {
      console.warn('Fallback data fetch error:', e);
    }
  }
  
  // Timetable questions
  if (q.includes('timetable') || q.includes('schedule') || q.includes('lecture') || q.includes('class')) {
    if (timetable.slots && timetable.slots.length > 0) {
      let response = `📅 Here's your weekly timetable, ${firstName}:\n\n`;
      
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const byDay = {};
      timetable.slots.forEach(s => {
        const day = s.dayName || 'Unknown';
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(s);
      });
      
      dayOrder.forEach(day => {
        if (byDay[day] && byDay[day].length > 0) {
          response += `${day}:\n`;
          byDay[day].forEach(s => {
            response += `  • ${s.startTime}-${s.endTime} | ${s.courseCode} | ${s.room}\n`;
          });
          response += '\n';
        }
      });
      
      if (timetable.upcoming && timetable.upcoming.length > 0) {
        response += `📌 Upcoming this week:\n`;
        timetable.upcoming.slice(0, 3).forEach(u => {
          const label = u.isToday ? 'Today' : (u.isTomorrow ? 'Tomorrow' : u.dayName);
          response += `  • ${label}: ${u.startTime}-${u.endTime} | ${u.courseCode} | ${u.room}\n`;
        });
      }
      
      return response;
    } else {
      return `📅 You don't have any classes scheduled for this semester, ${firstName}. Please check with your department for your timetable.`;
    }
  }
  
  // Financial questions
  if (q.includes('fee') || q.includes('payment') || q.includes('balance') || q.includes('owe') || q.includes('pay')) {
    const totalPaid = financial.totalPaid || 0;
    const totalPending = financial.totalPending || 0;
    const totalBalance = financial.totalBalance || 0;
    
    let response = `💰 Here's your financial summary, ${firstName}:\n\n`;
    response += `• Total Paid: $${totalPaid.toLocaleString()}\n`;
    response += `• Total Pending: $${totalPending.toLocaleString()}\n`;
    
    if (financial.fees && financial.fees.length > 0) {
      response += '\n📋 Fee Breakdown:\n';
      const pendingFees = financial.fees.filter(f => f.status !== 'paid');
      if (pendingFees.length > 0) {
        pendingFees.forEach(f => {
          response += `  • ${f.description}: $${f.balanceDue || f.amount} (${f.status})\n`;
        });
      } else {
        response += '  • All fees are paid! ✅\n';
      }
    }
    
    return response;
  }
  
  // Exam results questions
  if (q.includes('exam') || q.includes('test') || q.includes('result')) {
    if (examResults.gradedCount > 0) {
      let response = `📊 Here are your exam results, ${firstName}:\n\n`;
      response += `• Total Graded Exams: ${examResults.gradedCount}\n`;
      response += `• Total Marks: ${examResults.totalMarks}\n\n`;
      
      examResults.submissions.forEach(r => {
        const gradeEmoji = r.grade === 'A+' || r.grade === 'A' ? '🏆' : 
                           r.grade === 'B+' || r.grade === 'B' ? '👍' : 
                           r.grade === 'C+' || r.grade === 'C' ? '📊' : '📈';
        response += `${gradeEmoji} ${r.courseCode} - ${r.examTitle}\n`;
        response += `   Score: ${r.total_marks_obtained}/${r.totalMarks} (${r.percentage || 0}%)\n`;
        response += `   Grade: ${r.grade || 'N/A'}\n\n`;
      });
      
      return response;
    } else {
      return `📋 You don't have any exam results yet, ${firstName}. Your exams will show here once they've been graded and approved by the Dean. Keep studying! 💪`;
    }
  }
  
  // CGPA/GPA questions
  if (q.includes('cgpa') || q.includes('gpa')) {
    let response = `📊 Your current CGPA is ${cgpa}, ${firstName}.\n\n`;
    if (examResults.gradedCount > 0) {
      response += `Based on ${examResults.gradedCount} Dean-approved exam${examResults.gradedCount !== 1 ? 's' : ''}.\n`;
    }
    response += `You have ${pendingAssign} pending assignment${pendingAssign !== 1 ? 's' : ''} and ${upcoming} upcoming exam${upcoming !== 1 ? 's' : ''}.\n\nKeep up the good work! 💪`;
    return response;
  }
  
  // Assignment questions
  if (q.includes('assignment') || q.includes('homework') || q.includes('project')) {
    return `📝 You have ${pendingAssign} pending assignment${pendingAssign !== 1 ? 's' : ''}, ${firstName}. Would you like help with study tips or time management strategies?`;
  }
  
  // Study tips
  if (q.includes('study') || q.includes('tip') || q.includes('advice')) {
    return `📚 Here are some study tips, ${firstName}:\n\n• Study for 25 minutes, then take a 5-minute break.\n• Test yourself instead of just re-reading notes.\n• Review material at increasing intervals.\n• Explain concepts to others.\n• Practice with problems and exercises.\n\nWould you like subject-specific advice?`;
  }
  
  // Default - show summary naturally
  let response = `Hi ${firstName}! Here's a quick overview of your academic status:\n\n• CGPA: ${cgpa}\n• Pending Assignments: ${pendingAssign}\n• Upcoming Exams: ${upcoming}\n`;
  
  if (examResults.gradedCount > 0) {
    response += `• Graded Exams: ${examResults.gradedCount}\n`;
  }
  
  response += `\nI can help you with your timetable, fees, exam results, study tips, and more. What would you like to know? 😊`;
  return response;
};

export default {
  generateAIResponseWithContext
};