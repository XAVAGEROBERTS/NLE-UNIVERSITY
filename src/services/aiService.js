// src/services/aiService.js
import { supabase } from './supabase';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const WORKING_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-20b',
  'groq/compound-mini',
  'groq/compound',
  'openai/gpt-oss-120b',
];

// ===================== EXAM DATA FETCHING =====================

const fetchExaminationSchedule = async (studentId, studentData) => {
  try {
    console.log('📊 Fetching examination schedule for student:', studentId);

    // Get student's enrolled courses
    const { data: studentCourses, error: coursesError } = await supabase
      .from('student_courses')
      .select('course_id, status')
      .eq('student_id', studentId)
      .neq('status', 'completed');

    if (coursesError) {
      console.error('Error fetching student courses:', coursesError);
      return null;
    }

    const courseIds = studentCourses?.map(sc => sc.course_id) || [];

    if (courseIds.length === 0) {
      return [];
    }

    // Build query for examinations
    let query = supabase
      .from('examinations')
      .select(`
        *,
        courses (
          id,
          course_code,
          course_name,
          credits
        )
      `)
      .in('course_id', courseIds)
      .in('status', ['scheduled', 'published', 'active', 'completed'])
      .order('start_time', { ascending: true });

    // Apply cohort targeting
    const cleanAY = (studentData?.academic_year || '2025/2029').trim().replace(/\s/g, '');
    
    if (cleanAY || studentData?.year_of_study || studentData?.semester || studentData?.program_id) {
      const orConditions = [];
      
      if (cleanAY) {
        orConditions.push(`target_academic_year.eq.${cleanAY}`);
        orConditions.push(`target_academic_year.is.null`);
      }
      
      if (studentData?.year_of_study != null) {
        orConditions.push(`target_year_of_study.eq.${studentData.year_of_study}`);
        orConditions.push(`target_year_of_study.is.null`);
      }
      
      if (studentData?.semester != null) {
        orConditions.push(`target_semester.eq.${studentData.semester}`);
        orConditions.push(`target_semester.is.null`);
      }
      
      if (studentData?.program_id) {
        orConditions.push(`target_program_id.eq.${studentData.program_id}`);
        orConditions.push(`target_program_id.is.null`);
      }
      
      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
      }
    }

    const { data: examsData, error: examsError } = await query;
    
    if (examsError) {
      console.error('Error fetching exams:', examsError);
      return null;
    }

    // If no exams found, try without cohort filtering
    if (!examsData || examsData.length === 0) {
      const { data: allExams, error: allExamsError } = await supabase
        .from('examinations')
        .select(`
          *,
          courses (
            id,
            course_code,
            course_name,
            credits
          )
        `)
        .in('course_id', courseIds)
        .in('status', ['scheduled', 'published', 'active', 'completed'])
        .order('start_time', { ascending: true });

      if (!allExamsError && allExams && allExams.length > 0) {
        examsData = allExams;
      }
    }

    if (!examsData || examsData.length === 0) {
      return [];
    }

    // Fetch submissions to check status
    const { data: submissionsData, error: submissionsError } = await supabase
      .from('exam_submissions')
      .select('*')
      .eq('student_id', studentId);

    if (submissionsError) {
      console.warn('Could not fetch submissions:', submissionsError);
    }

    // Process exams with status
    const processedExams = examsData.map(exam => {
      const studentSubmission = submissionsData?.find(sub => sub.exam_id === exam.id);
      const now = new Date();
      const startTime = new Date(exam.start_time);
      const endTime = new Date(exam.end_time);

      const isActiveByTime = now >= startTime && now <= endTime;
      const isUpcoming = now < startTime;
      const isEndedByTime = now > endTime;
      const isOnlineExam = exam.exam_type === 'online' || exam.exam_type === 'written_online';
      
      const hasSubmission = !!studentSubmission;
      
      let isSubmitted = false;
      let isGraded = false;
      
      if (studentSubmission) {
        const status = studentSubmission.status?.toLowerCase();
        isSubmitted = status === 'submitted' || studentSubmission.submitted_at !== null;
        isGraded = status === 'graded' || studentSubmission.graded_at !== null;
      }

      const isStartedButNotSubmitted = studentSubmission && 
        studentSubmission.status === 'started' && 
        !isSubmitted && 
        !isGraded;
      
      const canResume = isStartedButNotSubmitted && !isEndedByTime;
      const canStart = !hasSubmission && isActiveByTime && isOnlineExam;
      
      let finalStatus = 'upcoming';
      
      if (isGraded) {
        finalStatus = 'graded';
      } else if (isSubmitted) {
        finalStatus = 'submitted';
      } else if (canResume) {
        finalStatus = 'resume';
      } else if (isActiveByTime) {
        finalStatus = 'active';
      } else if (isEndedByTime) {
        finalStatus = 'ended';
      }

      return {
        id: exam.id,
        title: exam.title === 'NA' ? `${exam.courses?.course_code || 'Exam'} Final` : exam.title,
        description: exam.description === 'NA' ? 'Final examination for the course' : exam.description,
        courseId: exam.course_id,
        courseCode: exam.courses?.course_code || 'N/A',
        courseName: exam.courses?.course_name || 'N/A',
        courseCredits: exam.courses?.credits || 0,
        examType: exam.exam_type,
        startTime: exam.start_time,
        endTime: exam.end_time,
        duration: exam.duration_minutes,
        totalMarks: exam.total_marks,
        passingMarks: exam.passing_marks,
        location: exam.location || exam.venue || 'TBA',
        supervisor: exam.supervisor,
        instructions: exam.instructions === 'NA' ? 'Complete all questions within the given time frame.' : exam.instructions,
        status: finalStatus,
        submitted: isSubmitted,
        graded: isGraded,
        isActive: finalStatus === 'active' || finalStatus === 'resume',
        isUpcoming: isUpcoming,
        isEnded: isEndedByTime,
        canStart: canStart,
        canResume: canResume,
        isOnline: isOnlineExam
      };
    });

    return processedExams;
  } catch (error) {
    console.error('Error fetching examination schedule:', error);
    return null;
  }
};

// ===================== QUERY DETECTION =====================

const isExamRelatedQuery = (query) => {
  const examKeywords = [
    'exam', 'examination', 'exams', 'examinations',
    'schedule', 'timetable', 'time table', 'time-table',
    'when', 'what time', 'where', 'location', 'venue',
    'upcoming', 'next', 'active', 'current', 'today',
    'submitted', 'graded', 'result', 'results',
    'paper', 'papers', 'question', 'questions',
    'online', 'physical', 'written',
    'duration', 'marks', 'passing',
    'supervisor', 'invigilator', 'proctor',
    'my exam', 'my exams', 'exam schedule'
  ];

  const lowerQuery = query.toLowerCase();
  return examKeywords.some(keyword => lowerQuery.includes(keyword));
};

// ===================== CONTEXT BUILDING =====================

const buildCompleteContext = (studentStats, studentData) => {
  if (!studentStats || !studentData) return '';
  
  const firstName = studentData.full_name?.split(' ')[0] || 'Student';
  
  return `STUDENT: ${firstName} (${studentData.full_name})
Program: ${studentData.program}
Year: ${studentData.year_of_study}, Semester: ${studentData.semester}

ACADEMIC:
- Exam CGPA: ${studentStats.gpa?.examBasedCGPA?.toFixed(2) || '0.00'}
- Graded Exams: ${studentStats.gpa?.totalGradedExams || 0}

FINANCE:
- Total Paid: $${studentStats.finance?.totalPaid || 0}
- Total Pending: $${studentStats.finance?.totalPending || 0}
${studentStats.finance?.tuition?.semester1?.map(f => `  • Sem 1 Tuition: $${f.amount} - ${f.status.toUpperCase()}`).join('\n') || ''}
${studentStats.finance?.tuition?.semester2?.map(f => `  • Sem 2 Tuition: $${f.amount} - ${f.status.toUpperCase()}`).join('\n') || ''}

ASSIGNMENTS: ${studentStats.assignments?.pending || 0} pending, ${studentStats.assignments?.overdue || 0} overdue
EXAMS: ${studentStats.exams?.upcoming?.length || 0} upcoming
ATTENDANCE: ${studentStats.attendance?.rate || 0}%`;
};

// ===================== FORMAT EXAM SCHEDULE =====================

const formatExamScheduleForContext = (exams, studentName) => {
  if (!exams || exams.length === 0) {
    return `No examinations scheduled for ${studentName}.`;
  }

  const upcomingExams = exams.filter(exam => exam.isUpcoming || exam.status === 'upcoming');
  const activeExams = exams.filter(exam => exam.isActive || exam.status === 'active' || exam.status === 'resume');
  const submittedExams = exams.filter(exam => exam.submitted && !exam.graded);
  const gradedExams = exams.filter(exam => exam.graded);
  const endedExams = exams.filter(exam => exam.isEnded && !exam.submitted && !exam.graded);

  let context = `EXAMINATION SCHEDULE FOR ${studentName.toUpperCase()}:\n\n`;

  if (upcomingExams.length > 0) {
    context += `📅 UPCOMING EXAMS (${upcomingExams.length}):\n`;
    upcomingExams.forEach((exam, index) => {
      const date = new Date(exam.startTime);
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      context += `  ${index + 1}. ${exam.courseCode} - ${exam.title}\n`;
      context += `     Date: ${formattedDate}\n`;
      context += `     Location: ${exam.location}\n`;
      context += `     Duration: ${exam.duration} minutes\n`;
      context += `     Type: ${exam.examType}\n`;
      if (exam.supervisor) {
        context += `     Supervisor: ${exam.supervisor}\n`;
      }
      context += `     Marks: ${exam.totalMarks}`;
      if (exam.passingMarks) {
        context += ` (Passing: ${exam.passingMarks})`;
      }
      context += `\n\n`;
    });
  }

  if (activeExams.length > 0) {
    context += `🟢 ACTIVE EXAMS (${activeExams.length}):\n`;
    activeExams.forEach((exam, index) => {
      const endDate = new Date(exam.endTime);
      const formattedEnd = endDate.toLocaleDateString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      context += `  ${index + 1}. ${exam.courseCode} - ${exam.title}\n`;
      context += `     Location: ${exam.location}\n`;
      context += `     Ends at: ${formattedEnd}\n`;
      context += `     Duration: ${exam.duration} minutes\n`;
      context += `     Type: ${exam.examType}\n`;
      context += `     Status: ${exam.status === 'resume' ? 'CAN RESUME' : 'CAN START'}\n\n`;
    });
  }

  if (submittedExams.length > 0) {
    context += `📤 SUBMITTED EXAMS (${submittedExams.length}):\n`;
    submittedExams.forEach((exam, index) => {
      context += `  ${index + 1}. ${exam.courseCode} - ${exam.title} (Awaiting Grading)\n`;
    });
    context += `\n`;
  }

  if (gradedExams.length > 0) {
    context += `✅ GRADED EXAMS (${gradedExams.length}):\n`;
    gradedExams.forEach((exam, index) => {
      context += `  ${index + 1}. ${exam.courseCode} - ${exam.title} (Graded)\n`;
    });
    context += `\n`;
  }

  if (endedExams.length > 0) {
    context += `❌ ENDED EXAMS (${endedExams.length}):\n`;
    endedExams.forEach((exam, index) => {
      context += `  ${index + 1}. ${exam.courseCode} - ${exam.title} (Ended on ${new Date(exam.endTime).toLocaleDateString()})\n`;
    });
    context += `\n`;
  }

  context += `📊 SUMMARY:\n`;
  context += `  • Total Exams: ${exams.length}\n`;
  context += `  • Upcoming: ${upcomingExams.length}\n`;
  context += `  • Active: ${activeExams.length}\n`;
  context += `  • Submitted: ${submittedExams.length}\n`;
  context += `  • Graded: ${gradedExams.length}\n`;
  context += `  • Ended: ${endedExams.length}\n`;

  if (upcomingExams.length > 0) {
    const nextExam = upcomingExams[0];
    const nextDate = new Date(nextExam.startTime);
    const formattedNext = nextDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    context += `\n🎯 NEXT EXAM:\n`;
    context += `  • ${nextExam.courseCode} - ${nextExam.title}\n`;
    context += `  • Date: ${formattedNext}\n`;
    context += `  • Location: ${nextExam.location}\n`;
  }

  return context;
};

// ===================== GENERATE AI RESPONSE =====================

export const generateAIResponseWithContext = async (
  userQuery,
  studentStats,
  studentData,
  conversationHistory = []
) => {
  try {
    const firstName = studentData?.full_name?.split(' ')[0] || 'Student';

    // Check if this is an exam-related query
    if (isExamRelatedQuery(userQuery)) {
      console.log('🔍 Exam-related query detected:', userQuery);

      // Get student ID
      let studentId = studentData?.id;
      if (!studentId && studentStats?.student_id) {
        studentId = studentStats.student_id;
      }

      if (studentId) {
        // Fetch examination schedule
        const exams = await fetchExaminationSchedule(studentId, studentData);
        
        if (exams && exams.length > 0) {
          // Format exam schedule for context
          const examContext = formatExamScheduleForContext(exams, firstName);

          // Build system prompt with exam data
          const systemPrompt = `You are a helpful AI assistant for ${firstName} at NLE University.

EXAMINATION DATA:
${examContext}

STRICT RULES - FOLLOW EXACTLY:
1. ONLY answer exam-related questions using the provided exam data.
2. Be DIRECT and CONCISE.
3. Format dates clearly (e.g., "Monday, January 15, 2026 at 2:30 PM").
4. If the user asks about a specific exam, provide the details.
5. If the user asks about the next exam, tell them the next upcoming exam.
6. If the user asks about exam location, provide the location.
7. If the user asks "when is my next exam", respond with the next exam details.
8. If the user asks "do I have any exams today", check the schedule.
9. If the user asks about exam results, tell them if exams are graded.
10. DO NOT add extra tips, advice, or suggestions.
11. DO NOT add emojis unless the user uses them first.
12. Maximum 100 words for simple questions, 200 words for complex questions.
13. If no exams match what the user is asking for, say so clearly.
14. For "exam schedule" → List all upcoming exams in a clear format.
15. For "exam timetable" → Show the full timetable with dates and times.
16. NEVER say "Based on the data" or "According to your records".`;

          const messages = [
            { role: 'system', content: systemPrompt },
          ];

          if (conversationHistory && conversationHistory.length > 0) {
            messages.push(...conversationHistory.slice(-6));
          }

          messages.push({ role: 'user', content: userQuery });

          // Try AI models for exam response
          let lastError = null;

          for (const model of WORKING_MODELS) {
            try {
              console.log(`🔄 Trying exam model: ${model}`);
              
              const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                  model: model,
                  messages: messages,
                  temperature: 0.1,
                  max_tokens: 300,
                  top_p: 0.9,
                  tool_choice: 'none',
                })
              });

              if (response.ok) {
                const data = await response.json();
                const aiResponse = data.choices?.[0]?.message?.content;
                if (aiResponse) {
                  console.log(`✅ Exam model ${model} WORKED!`);
                  return aiResponse;
                }
              } else {
                const errorData = await response.json();
                console.log(`❌ Exam model ${model}: ${errorData.error?.message}`);
                lastError = new Error(errorData.error?.message);
              }
            } catch (error) {
              console.log(`❌ Exam model ${model}: ${error.message}`);
              lastError = error;
            }
          }

          console.error('❌ All exam models failed:', lastError?.message);
          
          // Fallback: Return formatted exam data directly
          return generateFallbackExamResponse(exams, userQuery, firstName);
        } else {
          return `You have no exams scheduled at the moment, ${firstName}. Check back later for updates.`;
        }
      }
    }

    // If not exam-related or exam fetch failed, use regular context
    console.log('📝 Using regular AI context for query:', userQuery);
    const context = buildCompleteContext(studentStats, studentData);

    const systemPrompt = `You are a helpful AI assistant for ${firstName} at NLE University.

STUDENT DATA:
${context}

STRICT RULES - FOLLOW EXACTLY:
1. ONLY answer what is asked. Nothing more.
2. DO NOT add extra information, tips, advice, or suggestions unless specifically asked.
3. DO NOT add summaries, conclusions, or "let me know if you need anything else".
4. DO NOT add emojis unless the user uses them first.
5. DO NOT add bullet points or lists unless the question requires it.
6. DO NOT reference the conversation history.
7. DO NOT say "Based on the data" or "According to your records".
8. For "hi" or "hello" → Just say "Hello ${firstName}!"
9. For "how are you" → Just say "I'm good, thanks! How can I help?"
10. For "what's my CGPA" → Just say "Your CGPA is X.XX"
11. For "have I paid tuition" → Just say "Yes, you've paid $X for tuition." or "No, you have $X pending."
12. For "okay" or "thanks" → Just say "You're welcome!" or "👍"
13. Be DIRECT and CONCISE.
14. Maximum 50 words for simple questions.
15. Maximum 100 words for complex questions.
16. NEVER use tools, code execution, or Python scripts. Just answer directly in plain text.`;

    const messages = [
      { role: 'system', content: systemPrompt },
    ];

    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory.slice(-6));
    }

    messages.push({ role: 'user', content: userQuery });

    let lastError = null;

    for (const model of WORKING_MODELS) {
      try {
        console.log(`🔄 Trying model: ${model}`);
        
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.1,
            max_tokens: 150,
            top_p: 0.9,
            tool_choice: 'none',
          })
        });

        if (response.ok) {
          const data = await response.json();
          const aiResponse = data.choices?.[0]?.message?.content;
          if (aiResponse) {
            console.log(`✅ Model ${model} WORKED!`);
            return aiResponse;
          }
        } else {
          const errorData = await response.json();
          console.log(`❌ Model ${model}: ${errorData.error?.message}`);
          lastError = new Error(errorData.error?.message);
        }
      } catch (error) {
        console.log(`❌ Model ${model}: ${error.message}`);
        lastError = error;
      }
    }

    console.error('❌ All models failed:', lastError?.message);
    
    return `**${firstName}, here's your academic summary:**

• 📊 **CGPA:** ${studentStats?.gpa?.examBasedCGPA?.toFixed(2) || '0.00'}
• 💰 **Fees Paid:** $${studentStats?.finance?.totalPaid || 0}
• 📝 **Pending Assignments:** ${studentStats?.assignments?.pending || 0}
• 📋 **Upcoming Exams:** ${studentStats?.exams?.upcoming?.length || 0}
• 📅 **Attendance:** ${studentStats?.attendance?.rate || 0}%`;

  } catch (error) {
    console.error('❌ Error in AI service:', error);
    return `I'm having trouble processing your request. Please try again later.`;
  }
};

// ===================== FALLBACK RESPONSE =====================

const generateFallbackExamResponse = (exams, query, firstName) => {
  const lowerQuery = query.toLowerCase();
  
  const upcomingExams = exams.filter(e => e.isUpcoming || e.status === 'upcoming');
  const activeExams = exams.filter(e => e.isActive || e.status === 'active' || e.status === 'resume');
  
  // Next exam
  if (lowerQuery.includes('next') || lowerQuery.includes('upcoming')) {
    if (upcomingExams.length === 0) {
      if (activeExams.length > 0) {
        return `You have ${activeExams.length} active exam(s) right now! Please check the Examinations page.`;
      }
      return `You have no upcoming exams scheduled, ${firstName}.`;
    }
    
    const next = upcomingExams[0];
    const date = new Date(next.startTime);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    return `Your next exam is ${next.courseCode} - ${next.title} on ${formattedDate} at ${next.location || 'TBA'}. Duration: ${next.duration} minutes.`;
  }
  
  // Today's exams
  if (lowerQuery.includes('today') || lowerQuery.includes('current')) {
    const today = new Date().toDateString();
    const todayExams = exams.filter(e => {
      const examDate = new Date(e.startTime).toDateString();
      return examDate === today;
    });
    
    if (todayExams.length === 0) {
      return `You have no exams today, ${firstName}.`;
    }
    
    let response = `You have ${todayExams.length} exam(s) today:\n`;
    todayExams.forEach(exam => {
      const time = new Date(exam.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      response += `• ${exam.courseCode} at ${time} (${exam.location || 'TBA'})\n`;
    });
    return response;
  }
  
  // Location
  if (lowerQuery.includes('location') || lowerQuery.includes('where') || lowerQuery.includes('venue')) {
    const allExams = [...upcomingExams, ...activeExams];
    if (allExams.length === 0) {
      return `No exams scheduled at the moment, ${firstName}.`;
    }
    
    let response = `Exam locations:\n`;
    allExams.slice(0, 5).forEach(exam => {
      response += `• ${exam.courseCode}: ${exam.location || 'TBA'}\n`;
    });
    if (allExams.length > 5) {
      response += `And ${allExams.length - 5} more exams. Check the Examinations page.`;
    }
    return response;
  }
  
  // Full schedule
  if (lowerQuery.includes('schedule') || lowerQuery.includes('timetable') || lowerQuery.includes('all')) {
    if (exams.length === 0) {
      return `You have no exams scheduled, ${firstName}.`;
    }
    
    let response = `📋 Your Exam Schedule (${exams.length} exams):\n\n`;
    exams.slice(0, 10).forEach((exam, index) => {
      const date = new Date(exam.startTime);
      response += `${index + 1}. ${exam.courseCode}: ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      response += ` (${exam.location || 'TBA'})\n`;
    });
    
    if (exams.length > 10) {
      response += `\nAnd ${exams.length - 10} more exams. Check the Examinations page for full details.`;
    }
    
    return response;
  }
  
  // Active exams
  if (lowerQuery.includes('active')) {
    if (activeExams.length === 0) {
      return `You have no active exams right now, ${firstName}.`;
    }
    
    let response = `You have ${activeExams.length} active exam(s):\n`;
    activeExams.forEach(exam => {
      const endDate = new Date(exam.endTime);
      response += `• ${exam.courseCode} (ends at ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})\n`;
    });
    return response;
  }
  
  // Graded exams
  if (lowerQuery.includes('graded') || lowerQuery.includes('result') || lowerQuery.includes('results')) {
    const gradedExams = exams.filter(e => e.graded);
    const submittedExams = exams.filter(e => e.submitted && !e.graded);
    
    if (gradedExams.length === 0) {
      if (submittedExams.length > 0) {
        return `You have ${submittedExams.length} submitted exam(s) awaiting grading. No graded exams yet.`;
      }
      return `No graded exams available yet, ${firstName}.`;
    }
    
    let response = `You have ${gradedExams.length} graded exam(s):\n`;
    gradedExams.forEach(exam => {
      response += `• ${exam.courseCode}: ${exam.title}\n`;
    });
    return response;
  }
  
  // Default response
  const total = exams.length;
  const upcoming = upcomingExams.length;
  const active = activeExams.length;
  const submitted = exams.filter(e => e.submitted && !e.graded).length;
  const graded = exams.filter(e => e.graded).length;
  
  if (total === 0) {
    return `You have no exams scheduled, ${firstName}.`;
  }
  
  return `You have ${total} exam(s): ${upcoming} upcoming, ${active} active, ${submitted} submitted, ${graded} graded. Check the Examinations page for full details.`;
};

// ===================== DEFAULT EXPORT =====================

export default {
  generateAIResponseWithContext
};