// src/services/aiService.js

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const WORKING_MODELS = [
  'llama-3.3-70b-versatile',    // Direct text, no tools
  'llama-3.1-8b-instant',      // Direct text, fast
  'openai/gpt-oss-20b',        // Direct text
  'groq/compound-mini',        // Has tools but less verbose
  'groq/compound',             // Has tools (last resort)
  'openai/gpt-oss-120b',
];

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

export const generateAIResponseWithContext = async (userQuery, studentStats, studentData, conversationHistory = []) => {
  const firstName = studentData?.full_name?.split(' ')[0] || 'Student';
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
          tool_choice: 'none', // Disable tool calling
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
};

//updated