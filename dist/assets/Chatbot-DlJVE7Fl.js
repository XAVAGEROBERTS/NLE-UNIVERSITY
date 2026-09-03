import{b as Se,r as v,s as $,R as n}from"./index-tPt1CnYW.js";const _e=()=>{const{user:L}=Se(),[W,M]=v.useState([]),[_,j]=v.useState(""),[A,N]=v.useState(!1),[ee,O]=v.useState(!0),[S,te]=v.useState(null),[y,re]=v.useState(null),[s,se]=v.useState(!1),[T,B]=v.useState(!0),[$e,ae]=v.useState({gpa:0,cgpa:0,examBasedGpa:0,examBasedCgpa:0}),F=v.useRef(null),ne=v.useRef(null),oe=v.useRef(null),U=v.useRef(null);v.useEffect(()=>{const e=()=>{const t=window.innerWidth<768;se(t),t&&B(!1)};return e(),window.addEventListener("resize",e),()=>window.removeEventListener("resize",e)},[]);const k={greetings:["Great to see you! How can I assist with your studies today? 📚","Hello! Ready to help you with your academic journey! 🎓","Hi there! What would you like to know about your progress? 📈","Welcome back! How can I make your study day better? 🌟","Hey! Let's work on your academic success together! 💪","Greetings! I'm here to help you ace your courses! 🏆","Hello there! Ready to tackle your academic challenges? 💯","Hi! How's your learning journey going? Let me help! 🚀","Good to see you! What academic goals can we work on today? 🎯","Welcome! I'm excited to help you succeed in your studies! ✨"],thanks:["You're welcome! Always happy to help with your studies! 😊","No problem at all! Let me know if you need anything else! 👍","Glad I could help! Keep up the great work! 🎯","Anytime! Remember, I'm here 24/7 for your academic needs! ⏰","My pleasure! Wishing you success in all your courses! 🏆","Happy to assist! Your success is my priority! 💫","You're very welcome! Keep crushing those academic goals! 💪","No thanks needed! Just doing my part to help you succeed! 😄","Always here for you! Don't hesitate to ask more questions! 🤝","The pleasure is mine! Watching you succeed makes my day! 🌟"],encouragement:["You're doing amazing! Keep pushing forward! 🚀","Stay focused and you'll achieve all your academic goals! 🎯","Remember, every small step counts toward your success! 👣","You've got this! Your dedication will pay off! 💯","Keep up the great work! Your progress is impressive! 📊","Believe in yourself! You're capable of great things! 🌟","Consistency is key! Keep showing up and you'll succeed! 🔑","Your hard work is paying off! Stay on this path! 💪","Learning is a journey! Enjoy every step of the way! 🛣️","You're growing every day! That's something to celebrate! 🎉"],studyTips:["**Pomodoro Technique**: Study for 25 minutes, break for 5 minutes ⏰","**Active Recall**: Test yourself instead of just rereading notes 🧠","**Spaced Repetition**: Review material at increasing intervals 📅","**Teach Others**: Explain concepts to solidify your understanding 👨‍🏫","**Practice Problems**: Apply knowledge through practical exercises ✍️","**Healthy Breaks**: Take regular breaks to maintain focus 🧘","**Consistency**: Study regularly instead of cramming 📚","**Goal Setting**: Set specific, measurable academic goals 🎯","**Mind Mapping**: Create visual diagrams to connect ideas 🗺️","**Study Groups**: Collaborate with peers for better understanding 👥","**Note Summaries**: Create concise summaries of key points 📝","**Real-World Application**: Connect theory to practical examples 🌍","**Digital Tools**: Use apps for flashcards and organization 📱","**Regular Review**: Revisit material weekly to retain information 🔄","**Ask Questions**: Don't hesitate to seek clarification ❓"],motivational:["Education is the most powerful weapon which you can use to change the world. - Nelson Mandela","The beautiful thing about learning is that no one can take it away from you. - B.B. King","Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill","The expert in anything was once a beginner. - Helen Hayes","Don't let what you cannot do interfere with what you can do. - John Wooden","Believe you can and you're halfway there. - Theodore Roosevelt","Your education is a dress rehearsal for a life that is yours to lead. - Nora Ephron","The only way to learn mathematics is to do mathematics. - Paul Halmos","Learning never exhausts the mind. - Leonardo da Vinci","Education is not preparation for life; education is life itself. - John Dewey"],advice:["**Stay Organized**: Use planners or digital calendars 📅","**Ask for Help**: Don't struggle alone - seek assistance when needed 🤝","**Balance**: Maintain a healthy work-life balance ⚖️","**Network**: Connect with classmates and professors 👥","**Resources**: Utilize all available campus resources 📚","**Health First**: Prioritize physical and mental health 🧘","**Curiosity**: Stay curious and ask questions in class ❓","**Feedback**: Act on feedback to improve performance 🔄","**Goals**: Set both short-term and long-term academic goals 🎯","**Enjoy Learning**: Find joy in the learning process itself 😊"]},z=e=>{if(!e&&e!==0)return"N/A";const t=parseFloat(e);return isNaN(t)?"N/A":t>=90?"A+":t>=80?"A":t>=75?"B+":t>=70?"B":t>=65?"C+":t>=60?"C":t>=55?"D+":t>=50?"D":"F"},Y=e=>e&&{"A+":5,A:5,"B+":4.5,B:4,"C+":3.5,C:3,"D+":2.5,D:2,F:0}[e.toUpperCase()]||0,ie=async e=>{try{const{data:t,error:l}=await $.from("exam_submissions").select(`
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
        `).eq("student_id",e).eq("status","graded").not("total_marks_obtained","is",null);if(l)throw l;if(!t||t.length===0)return{gpa:0,cgpa:0};const c={};let u=0,a=0;const i=t.map(x=>x.exam_id),{data:o,error:p}=await $.from("examinations").select(`
          *,
          courses (
            id,
            credits,
            year,
            semester
          )
        `).in("id",i);if(p)throw p;const d={};o.forEach(x=>{d[x.id]=x}),t.forEach(x=>{const b=d[x.exam_id];if(!b||!b.courses)return;const E=b.courses,D=E.credits||3,H=z(x.total_marks_obtained),R=Y(H),P=`year${E.year}_sem${E.semester}`;c[P]||(c[P]={year:E.year,semester:E.semester,totalCredits:0,totalPoints:0,courses:[]}),c[P].courses.push({examId:b.id,courseId:E.id,credits:D,grade:H,gradePoints:R,marks:x.total_marks_obtained,totalMarks:b.total_marks,percentage:x.percentage}),c[P].totalCredits+=D,c[P].totalPoints+=R*D,u+=D,a+=R*D}),Object.keys(c).forEach(x=>{const b=c[x];b.totalCredits>0&&(b.gpa=parseFloat((b.totalPoints/b.totalCredits).toFixed(2)))});const h=u>0?parseFloat((a/u).toFixed(2)):0;let g=0;const f=S?.year_of_study,C=S?.semester;if(f&&C){const x=`year${f}_sem${C}`;c[x]&&(g=c[x].gpa)}return{gpa:g,cgpa:h,semesterResults:c,totalExams:t.length,totalCredits:u}}catch(t){return console.error("Error fetching exam-based GPA:",t),{gpa:0,cgpa:0,semesterResults:{}}}},Q=v.useCallback(async()=>{if(L?.email)try{O(!0);const{data:e,error:t}=await $.from("students").select("*").eq("email",L.email).single();if(t)throw t;if(!e)throw new Error("Student not found");te(e);const{data:l,error:c}=await $.from("student_courses").select(`
          *,
          courses (
            id,
            course_code,
            course_name,
            credits,
            year,
            semester
          )
        `).eq("student_id",e.id);if(c)throw c;const u=(l||[]).map(r=>{const m=r.grade||z(r.marks);return{...r,grade:m,grade_points:r.grade_points||Y(m),credits:r.courses?.credits||3,course_code:r.courses?.course_code||"N/A",course_name:r.courses?.course_name||"Unknown Course",status:r.status||"in_progress"}}),a=await ie(e.id),i=r=>{if(!r||r.length===0)return 0;const m=r.filter(G=>G.status==="completed"&&(G.grade||G.marks));if(m.length===0)return 0;let w=0,I=0;return m.forEach(G=>{const Ce=G.grade||z(G.marks),Z=G.grade_points||Y(Ce),q=G.credits||3;Z&&q&&(w+=Z*q,I+=q)}),I>0?parseFloat((w/I).toFixed(2)):0},o=i(u),p=i(u.filter(r=>r.status==="completed"));ae({gpa:a.gpa||o,cgpa:a.cgpa||p,examBasedGpa:a.gpa,examBasedCgpa:a.cgpa,courseBasedGpa:o,courseBasedCgpa:p,semesterResults:a.semesterResults,totalExams:a.totalExams||0,totalCredits:a.totalCredits||0});const d=u.filter(r=>r.status!=="completed")||[],h=d.map(r=>r.course_id).filter(Boolean),g=await le(h),f=await de(h,e.id),C=await ce(h,e.id),{data:x}=await $.from("financial_records").select("*").eq("student_id",e.id).eq("academic_year",e.academic_year).order("payment_date",{ascending:!1}),{data:b}=await $.from("attendance_records").select(`
          *,
          courses (*)
        `).eq("student_id",e.id).gte("date",new Date(Date.now()-720*60*60*1e3).toISOString().split("T")[0]).order("date",{ascending:!1}),{data:E}=h.length>0?await $.from("timetable_slots").select(`
          *,
          courses (*),
          lecturers (*)
        `).in("course_id",h).eq("is_active",!0):{data:[]},{data:D}=await $.from("library_books").select("*").eq("status","available").limit(5),{data:H}=await $.from("campus_events").select("*").gte("date",new Date().toISOString().split("T")[0]).order("date",{ascending:!0}).limit(5),R={studentInfo:{name:e.full_name,id:e.student_id,program:e.program,year:e.year_of_study,semester:e.semester,email:e.email,phone:e.phone,intake:e.intake,academicYear:e.academic_year},gpa:{currentGPA:a.gpa||o,currentCGPA:a.cgpa||p,examBasedGPA:a.gpa,examBasedCGPA:a.cgpa,courseBasedGPA:o,courseBasedCGPA:p,semesterResults:a.semesterResults,totalGradedExams:a.totalExams||0,totalCredits:a.totalCredits||0},courses:{total:u.length||0,completed:u.filter(r=>r.status==="completed").length||0,inProgress:d.length||0,list:u.map(r=>({id:r.course_id,code:r.course_code,name:r.course_name,status:r.status,grade:r.grade,marks:r.marks,gradePoints:r.grade_points,credits:r.credits,lecturer:r.lecturer_name,department:r.department}))||[]},lectures:g,assignments:{total:f?.length||0,submitted:f?.filter(r=>r.submissions?.some(m=>m.student_id===e.id)).length||0,pending:f?.filter(r=>!r.submissions?.find(w=>w.student_id===e.id)&&new Date(r.due_date)>new Date).length||0,graded:f?.filter(r=>r.submissions?.find(w=>w.student_id===e.id)?.status==="graded").length||0,overdue:f?.filter(r=>!r.submissions?.find(w=>w.student_id===e.id)&&new Date(r.due_date)<new Date).length||0,upcoming:f?.filter(r=>!r.submissions?.find(w=>w.student_id===e.id)&&new Date(r.due_date)>new Date).sort((r,m)=>new Date(r.due_date)-new Date(m.due_date)).slice(0,5),recentGrades:f?.filter(r=>r.submissions?.find(w=>w.student_id===e.id)?.status==="graded").sort((r,m)=>new Date(m.updated_at)-new Date(r.updated_at)).slice(0,3)},exams:{total:C?.length||0,completed:C?.filter(r=>{const m=r.submissions?.find(w=>w.student_id===e.id);return m&&m.status==="graded"}).length||0,upcoming:C?.filter(r=>!r.submissions?.find(w=>w.student_id===e.id)&&new Date(r.start_time)>new Date).sort((r,m)=>new Date(r.start_time)-new Date(m.start_time)).slice(0,5),performance:me(C?.filter(r=>r.submissions?.some(m=>m.student_id===e.id&&m.status==="graded"))||[])},finance:{totalPaid:x?.filter(r=>r.status==="paid").reduce((r,m)=>r+(m.amount||0),0)||0,totalPending:x?.filter(r=>r.status==="pending").reduce((r,m)=>r+(m.amount||0),0)||0,totalPartial:x?.filter(r=>r.status==="partial").reduce((r,m)=>r+(m.balance_due||0),0)||0,overdue:x?.filter(r=>r.due_date&&new Date(r.due_date)<new Date&&r.status!=="paid").length||0,recent:x?.slice(0,5)||[],scholarships:x?.filter(r=>r.type==="scholarship").reduce((r,m)=>r+(m.amount||0),0)||0,fines:x?.filter(r=>r.type==="fine").reduce((r,m)=>r+(m.amount||0),0)||0},attendance:{total:b?.length||0,present:b?.filter(r=>r.status==="present").length||0,absent:b?.filter(r=>r.status==="absent").length||0,late:b?.filter(r=>r.status==="late").length||0,rate:b?.length>0?(b.filter(r=>r.status==="present").length/b.length*100).toFixed(1):0,recent:b?.slice(0,10)||[],byCourse:ge(b||[]),trend:pe(b||[])},timetable:{total:E?.length||0,today:E?.filter(r=>{const m=new Date().getDay();return r.day_of_week===(m===0?6:m-1)}).sort((r,m)=>{const w=r.start_time?.split(":").map(Number)||[0,0],I=m.start_time?.split(":").map(Number)||[0,0];return w[0]*60+w[1]-(I[0]*60+I[1])})||[],byDay:ue(E||[]),currentClass:he(E||[])},library:{available:D?.length||0,books:D||[],recommended:D?.filter(r=>r.category?.toLowerCase().includes("computer")||r.category?.toLowerCase().includes("technology")).slice(0,3)||[]},events:{upcoming:H||[],today:H?.filter(r=>new Date(r.date).toDateString()===new Date().toDateString())||[]}};re(R);const P={id:1,text:K(e,R),sender:"ai",timestamp:new Date};M([P])}catch(e){console.error("Error in fetchAllStudentData:",e),M([{id:1,text:`⚠️ Error loading your data: ${e.message}. Please try refreshing the page or contact support.`,sender:"ai",timestamp:new Date}])}finally{O(!1)}},[L?.email]),le=async e=>{try{const t=new Date,l=new Date;l.setDate(t.getDate()+7);const{data:c,error:u}=await $.from("lectures").select(`
          *,
          courses (course_code, course_name),
          lecturers (full_name)
        `).gte("scheduled_date",t.toISOString().split("T")[0]).lte("scheduled_date",l.toISOString().split("T")[0]).in("status",["scheduled","ongoing"]).order("scheduled_date",{ascending:!0}).order("start_time",{ascending:!0});if(u)throw u;return(c?.filter(i=>e.includes(i.course_id))||[]).map(i=>{const o=i.start_time||"09:00",p=i.end_time||"11:00",d=new Date(`2000-01-01T${o}`),h=new Date(`2000-01-01T${p}`),g=Math.round((h-d)/6e4);return{id:i.id,title:i.courses?.course_name||i.title||"Untitled Lecture",date:i.scheduled_date,time:o,endTime:p,lecturer:i.lecturers?.full_name||"Unknown Lecturer",duration:g,courseCode:i.courses?.course_code||"N/A",google_meet_link:i.google_meet_link,status:i.status}})}catch(t){return console.error("Error fetching lectures:",t),[]}},de=async(e,t)=>{try{if(!e.length)return[];if(!t)return[];const{data:l,error:c}=await $.from("assignments").select(`
          *,
          courses (*),
          assignment_submissions (
            *
          ).filter(student_id.eq.${t})
        `).in("course_id",e).eq("status","published").order("due_date",{ascending:!0});if(c)throw c;return l?.map(u=>({...u,submissions:u.assignment_submissions||[]}))||[]}catch(l){return console.error("Error fetching assignments:",l),[]}},ce=async(e,t)=>{try{if(!e.length)return[];if(!t)return[];const{data:l,error:c}=await $.from("examinations").select(`
          *,
          courses (*),
          exam_submissions (
            *
          ).filter(student_id.eq.${t})
        `).in("course_id",e).eq("status","published").order("start_time",{ascending:!0});if(c)throw c;return l?.map(u=>({...u,submissions:u.exam_submissions||[]}))||[]}catch(l){return console.error("Error fetching exams:",l),[]}},me=e=>{if(e.length===0)return{average:0,highest:0,lowest:0,grades:[]};const t=e.map(o=>o.submissions?.find(d=>d.student_id===S?.id)?.percentage||0).filter(o=>o>0);if(t.length===0)return{average:0,highest:0,lowest:0,grades:[]};const l=t.reduce((o,p)=>o+p,0)/t.length,c=Math.max(...t),u=Math.min(...t),i=t.map(o=>o>=70?"A":o>=60?"B+":o>=50?"B":o>=45?"C+":o>=40?"C":o>=35?"D+":o>=30?"D":o>=20?"E":"F").reduce((o,p)=>(o[p]=(o[p]||0)+1,o),{});return{average:l.toFixed(1),highest:c.toFixed(1),lowest:u.toFixed(1),grades:i,totalExams:e.length}},ue=e=>{const t=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];return e.reduce((l,c)=>{const u=t[c.day_of_week]||"Unknown";return l[u]||(l[u]=[]),l[u].push(c),l},{})},ge=e=>e.reduce((t,l)=>{const c=l.courses?.course_name||"General";return t[c]||(t[c]={present:0,absent:0,late:0,total:0}),t[c][l.status]++,t[c].total++,t},{}),pe=e=>{if(e.length<2)return"stable";const t=e.slice(0,Math.min(5,e.length)),l=e.slice(Math.min(5,e.length),Math.min(10,e.length));if(t.length===0||l.length===0)return"stable";const c=t.filter(a=>a.status==="present").length/t.length,u=l.filter(a=>a.status==="present").length/l.length;return c>u+.1?"improving":c<u-.1?"declining":"stable"},he=e=>{const t=new Date,l=t.getDay(),c=t.getHours(),u=t.getMinutes(),a=c*60+u,i=e.filter(o=>o.day_of_week===(l===0?6:l-1));for(const o of i){const[p,d]=(o.start_time||"00:00").split(":").map(Number),[h,g]=(o.end_time||"00:00").split(":").map(Number),f=p*60+d,C=h*60+g;if(a>=f&&a<=C)return o}return null},fe=()=>{const e=new Date().getHours();return e>=0&&e<12?"Good Morning":e>=12&&e<17?"Good Afternoon":"Good Evening"},K=(e,t)=>{const l=t.timetable.currentClass,c=t.assignments.upcoming[0],u=t.exams.upcoming[0],i=new Date().toLocaleDateString("en-US",{weekday:"long"}),o=k.motivational[Math.floor(Math.random()*k.motivational.length)];return`👋 **${fe()} ${e.full_name.split(" ")[0]}!** 

I'm your AI Student Assistant, connected to your personal academic database. Happy ${i}! 😊

**📚 Academic Summary:**
• **Exam-Based CGPA:** ${t.gpa.examBasedCGPA?.toFixed(2)||"0.00"} (from ${t.gpa.totalGradedExams||0} graded exams)
• **Current Semester GPA:** ${t.gpa.examBasedGPA?.toFixed(2)||"0.00"}
• **Courses:** ${t.courses.completed} completed, ${t.courses.inProgress} in progress
• **Year:** ${e.year_of_study||"N/A"}.${e.semester||"N/A"}
• **Total Credits:** ${t.gpa.totalCredits||0}

${l?`**📅 Current Class:**
• **${l.courses?.course_name||"Class"}** until ${J(l.end_time)} in ${l.room_number}
`:""}

${c?`**📝 Next Assignment:**
• **${c.title}** due ${V(c.due_date)}
`:""}

${u?`**📋 Next Exam:**
• **${u.title}** on ${V(u.start_time)}
`:""}

**🎯 Quick Stats:**
• **Attendance Rate:** ${t.attendance.rate}%
• **Pending Assignments:** ${t.assignments.pending}
• **Upcoming Exams:** ${t.exams.upcoming.length}
• **Financial Balance:** $${(t.finance.totalPending+t.finance.totalPartial).toFixed(2)}

**💭 Motivational Quote:**
"${o}"

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

Or just chat with me about anything academic! I'm here to help! 🤖`},J=e=>{if(!e)return"TBD";const[t,l]=e.split(":"),c=parseInt(t),u=c>=12?"PM":"AM";return`${c%12||12}:${l} ${u}`},V=e=>new Date(e).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}),ye=e=>{const t=e.toLowerCase();return/(hi|hello|hey|greetings|good\s*(morning|afternoon|evening|day)|what'?s\s*up|howdy|yo|sup|hi\s*there|hello\s*there|morning|afternoon|evening|hola|bonjour|namaste|aloha|ciao|salam|shalom|how\s*are\s*you|how'?s\s*it\s*going|how'?s\s*(everything|life|your\s*day)|what'?s\s*(happening|new|good|poppin)|long\s*time\s*no\s*see|nice\s*to\s*see\s*you|pleased\s*to\s*meet\s*you|how\s*have\s*you\s*been|good\s*to\s*see\s*you|hiya|hey\s*there|salutations|welcome\s*back|lovely\s*to\s*see\s*you|great\s*to\s*see\s*you)/.test(t)?"greeting":/(thank|thanks|thankyou|appreciate|grateful|obliged|cheers|ta|much\s*obliged)/.test(t)?"thanks":/(cgpa|cumulative\s*grade|cumulative\s*gpa|overall\s*gpa|total\s*gpa|exam\s*based|from\s*exam|exam\s*results)/.test(t)?"cgpa":/(gpa|grade\s*point|semester\s*gpa|current\s*gpa|this\s*semester)/.test(t)?"gpa":/(grade|marks?|scores?|academic\s*performance)/.test(t)?"grades":/(course|subject|unit|module|class)/.test(t)?"courses":/(assignment|homework|project|coursework|essay|report|paper|dissertation|thesis|portfolio)/.test(t)?"assignments":/(deadline|due\s*date|submission|hand\s*in|submit|when\s*is)/.test(t)?"deadlines":/(exam|test|midterm|final|quiz|assessment|evaluation|paper|examination)/.test(t)?"exams":/(lecture|class|schedule|timetable|routine|when\s*do\s*i|what\s*time)/.test(t)?"schedule":/(today|now|current)/.test(t)?"today":/(tomorrow|next\s*day)/.test(t)?"tomorrow":/(week|upcoming|next\s*week|this\s*week)/.test(t)?"week":/(fee|payment|finance|balance|money|tuition|fees|bill|invoice|payment|scholarship|loan)/.test(t)?"finance":/(attendance|present|absent|late|attended|punctual|late|missing)/.test(t)?"attendance":/(library|book|resource|study\s*material|reading|textbook|journal|publication)/.test(t)?"library":/(event|activity|campus|extra\s*curricular|club|society|workshop|seminar|conference)/.test(t)?"events":/(study|learn|prepar|improve|tip|advice|suggestion|how\s*to|method|technique|strategy)/.test(t)?"study":/(progress|performance|how\s*am\s*i|summary|overview|report|status|update)/.test(t)?"progress":/(help|what\s*can|capabilities|assist|how\s*to\s*use|guide|manual|tutorial)/.test(t)?"help":/(university|campus|faculty|department|program|college|school|institution)/.test(t)?"university":/(my\s*info|profile|details|who\s*am\s*i|student\s*info|information\s*about\s*me)/.test(t)?"profile":/(motivat|inspire|encourage|cheer\s*up|feeling\s*(down|sad|stressed|overwhelmed))/i.test(t)?"motivation":/(bye|goodbye|see\s*you|farewell|take\s*care|later|ciao|adios)/i.test(t)?"goodbye":/(how\s*are\s*you|how\s*do\s*you\s*do|how'?s\s*it\s*going)/i.test(t)?"howareyou":"unknown"},xe=e=>{if(!y||!S)return"I'm still loading your data. Please wait a moment...";const t=e.toLowerCase(),l=ye(t);if(l==="greeting"){const a=k.greetings[Math.floor(Math.random()*k.greetings.length)],i=k.studyTips[Math.floor(Math.random()*k.studyTips.length)];return`${a}

**Quick Tip:** ${i}

What would you like to know about your academic progress today?`}if(l==="thanks"){const a=k.thanks[Math.floor(Math.random()*k.thanks.length)],i=k.encouragement[Math.floor(Math.random()*k.encouragement.length)];return`${a}

${i}`}if(l==="howareyou")return`I'm doing great, thank you for asking! 😊 As an AI assistant, I don't have feelings, but I'm always ready and excited to help you with your academic journey!

How about you? How's your day going? Is there anything academic I can assist you with today?`;if(l==="motivation"){const a=k.motivational[Math.floor(Math.random()*k.motivational.length)],i=k.encouragement[Math.floor(Math.random()*k.encouragement.length)];return`🌟 **Here's some motivation for you:**

"${a}"

${i}

**Remember:** Every expert was once a beginner. Keep going! 💪`}if(l==="goodbye")return`👋 Goodbye, ${S.full_name.split(" ")[0]}! 

It was great chatting with you! Remember:
• Take regular breaks during study sessions
• Stay hydrated and get enough sleep
• Don't hesitate to reach out if you need help

Wishing you all the best in your studies! Come back anytime! 📚✨`;if(l==="cgpa"){const a=y.gpa,i=a.examBasedCGPA||a.currentCGPA;a.courseBasedCGPA;let o="";a.totalGradedExams>0?o=`📊 **Calculated from ${a.totalGradedExams} graded exam results**`:a.courseBasedCGPA>0&&(o="📚 **Calculated from completed course grades**");const p=i>=4.5?"First Class":i>=3.5?"Second Class Upper":i>=2.5?"Second Class Lower":i>=1.5?"Third Class":"Pass";let d="";return i<2?d="⚠️ **Consider meeting with an academic advisor** to discuss improvement strategies.":i<3?d="📈 **Focus on current semester courses** to boost your overall performance.":i<3.5?d="👍 **Good progress!** Aim for 3.5+ for better opportunities.":i<4?d="🎯 **Excellent work!** Maintain this strong performance.":d="🏆 **Outstanding achievement!** You're at the top of your class!",`📊 **Your Cumulative GPA (CGPA) Analysis**

**Exam-Based CGPA:** ${i.toFixed(2)}
**Academic Classification:** ${p}
${o}

**Key Statistics:**
• **Total Graded Exams:** ${a.totalGradedExams||0}
• **Total Credits Earned:** ${a.totalCredits||0}
• **Current Semester GPA:** ${(a.examBasedGPA||a.currentGPA).toFixed(2)}

${a.semesterResults&&Object.keys(a.semesterResults).length>0?`
**Semester-wise Performance:**
${Object.keys(a.semesterResults).map(h=>{const g=a.semesterResults[h];return`• **Year ${g.year}, Semester ${g.semester}:** GPA ${g.gpa?.toFixed(2)||"0.00"} (${g.courses.length} exams)`}).join(`
`)}
`:""}

**💡 What is CGPA?**
CGPA (Cumulative Grade Point Average) is calculated from **all your graded exam results** across all semesters. It represents your overall academic performance.

**Advice:** ${d}

**Note:** CGPA = (Σ grade_points × credits) / (Σ credits) from all graded exams`}if(l==="gpa"){const a=y.gpa,i=a.examBasedGPA||a.currentGPA,o=S.year_of_study,p=S.semester;let d=null;if(a.semesterResults){const f=`year${o}_sem${p}`;d=a.semesterResults[f]}let h="",g="📊";return i<2?(h="You might want to speak with an academic advisor. Focus on passing current courses.",g="⚠️"):i<3?(h="Consider focusing more on your current courses to improve your GPA.",g="📈"):i<3.5?(h="Good work! Aim for a 3.5+ GPA for better opportunities.",g="👍"):i<4?(h="Excellent! Maintain this strong academic performance.",g="🎯"):(h="Outstanding! You're at the top of your class!",g="🏆"),`${g} **Your Current Semester GPA Analysis**

**Current Semester GPA:** ${i.toFixed(2)}
**Semester:** Year ${o}, Semester ${p}
**Based on:** ${d?.courses?.length||0} graded exams this semester

${d?`
**Current Semester Details:**
• **Total Credits:** ${d.totalCredits||0}
• **Total Points:** ${d.totalPoints?.toFixed(2)||"0.00"}
• **Number of Courses:** ${d.courses.length}

**Current Semester Courses:**
${d.courses.slice(0,5).map(f=>`• ${f.grade.startsWith("A")?"🎯":f.grade.startsWith("B")?"👍":f.grade.startsWith("C")?"📊":"📈"} **${f.grade}** - ${f.marks}/${f.totalMarks} (${f.percentage||"0"}%) - ${f.credits} credits`).join(`
`)}
${d.courses.length>5?`
...and ${d.courses.length-5} more courses`:""}
`:""}

**📈 GPA Improvement Tips:**
1. **Focus on current assignments** - They affect your final grades
2. **Attend all lectures** - Better understanding leads to better grades
3. **Seek help early** - Don't wait until you're struggling
4. **Review past exams** - Identify patterns and weak areas
5. **Form study groups** - Collaborative learning improves retention

**Advice:** ${h}

**Next Step:** Work on improving weak areas and maintain strong performance in current courses!`}if(l==="grades"){const a=y.gpa;return`📊 **Your Academic Grades Overview**

**Overall Performance:**
• **Exam-Based CGPA:** ${(a.examBasedCGPA||a.currentCGPA).toFixed(2)}
• **Current Semester GPA:** ${(a.examBasedGPA||a.currentGPA).toFixed(2)}
• **Total Graded Exams:** ${a.totalGradedExams||0}
• **Total Credits:** ${a.totalCredits||0}

**Grade Distribution:**
${a.semesterResults&&Object.keys(a.semesterResults).length>0?Object.keys(a.semesterResults).map(i=>{const o=a.semesterResults[i];return`• **Year ${o.year}, Sem ${o.semester}:** GPA ${o.gpa?.toFixed(2)||"0.00"} (${o.courses.length} exams)`}).join(`
`):"No detailed grade data available yet."}

**💡 Grade Interpretation:**
• **A (90-100%)**: Excellent - Keep up the outstanding work!
• **B (70-89%)**: Good - Solid understanding, room for improvement
• **C (50-69%)**: Satisfactory - Focus on weaker areas
• **D (40-49%)**: Passing - Significant improvement needed
• **F (Below 40%)**: Failing - Immediate action required

**Need specific grade advice?** Tell me which subject you're concerned about!`}if(l==="courses"){const a=y.courses.list.filter(o=>o.status==="in_progress"),i=y.courses.list.filter(o=>o.status==="completed");return`📚 **Your Course Information:**

**Current Semester Courses (${a.length}):**
${a.length>0?a.map(o=>`• **${o.code}** - ${o.name}
  Credits: ${o.credits} | Status: ${o.status.replace("_"," ")}`).join(`

`):"No courses currently in progress"}

**Completed Courses (${i.length}):**
${i.length>0?i.slice(0,5).map(o=>`• **${o.code}** - ${o.name}
  Grade: ${o.grade||"N/A"} | Credits: ${o.credits}`).join(`

`):"No courses completed yet"}

**Total Credits This Semester:** ${a.reduce((o,p)=>o+p.credits,0)}`}if(l==="assignments"){const a=y.assignments.upcoming,i=y.assignments.overdue,o=y.assignments.recentGrades;let p="";return i>0?p=`**🚨 URGENT:** You have ${i} overdue assignment${i!==1?"s":""}! Please submit immediately!`:y.assignments.pending>3?p=`**⚠️ ALERT:** You have ${y.assignments.pending} pending assignments. Consider starting on them soon!`:y.assignments.pending>0&&(p=`**📝 REMINDER:** You have ${y.assignments.pending} pending assignment${y.assignments.pending!==1?"s":""}.`),`📝 **Your Assignments:**

**Summary:**
• **Total:** ${y.assignments.total}
• **Submitted:** ${y.assignments.submitted}
• **Pending:** ${y.assignments.pending}
• **Overdue:** ${i}
• **Graded:** ${y.assignments.graded}

${p?p+`
`:""}

**Upcoming Deadlines:**
${a.length>0?a.map(d=>{const h=new Date(d.due_date),g=Math.ceil((h-new Date)/(1e3*60*60*24));let f="";return g<=1?f=" 🚨":g<=3?f=" ⚠️":g<=7&&(f=" 📅"),`• **${d.title}**${f}
  Course: ${d.courses?.course_name||"Unknown"}
  Due: ${h.toLocaleDateString()} (${g} day${g!==1?"s":""} left)
  Total Marks: ${d.total_marks}`}).join(`

`):"No upcoming assignments! Great job keeping up!"}

${o.length>0?`**Recent Grades:**
${o.map(d=>{const h=d.submissions?.find(C=>C.student_id===S.id),g=h?.percentage||0;let f="📊";return g>=70?f="🎯":g>=50&&(f="👍"),`• **${d.title}**: ${h?.marks_obtained||0}/${d.total_marks} (${g}%) ${f}`}).join(`
`)}`:""}`}if(l==="exams"){const a=y.exams.upcoming,i=y.exams.performance,o=new Date,p=a.filter(d=>{const h=new Date(d.start_time);return Math.ceil((h-o)/(1e3*60*60*24))<=7});return`📋 **Your Exam Information:**

**Performance Summary:**
• **Average Score:** ${i.average}%
• **Highest Score:** ${i.highest}%
• **Lowest Score:** ${i.lowest}%
• **Total Exams:** ${i.totalExams}
${i.grades&&Object.keys(i.grades).length>0?`• **Grade Distribution:** ${Object.entries(i.grades).map(([d,h])=>`${d}: ${h}`).join(", ")}`:""}

**Exams This Week (${p.length}):**
${p.length>0?p.map(d=>{const h=new Date(d.start_time),g=Math.ceil((h-o)/(1e3*60*60*24)),f=J(d.start_time?.split(" ")[0]||"09:00");let C="";return g<=1?C=" 🚨":g<=3&&(C=" ⚠️"),`• **${d.title}**${C}
  Course: ${d.courses?.course_name||"Unknown"}
  Date: ${h.toLocaleDateString()} at ${f}
  Location: ${d.location||"TBA"}
  Duration: ${d.duration||"2 hours"} (${g} day${g!==1?"s":""} left)`}).join(`

`):"No exams this week!"}

**All Upcoming Exams (${a.length}):**
${a.length>0?a.map(d=>{const h=new Date(d.start_time),g=Math.ceil((h-o)/(1e3*60*60*24));return`• ${g<=7?"📅":"📋"} **${d.title}** - ${h.toLocaleDateString()} (${g} days)`}).join(`
`):"No upcoming exams scheduled"}

**Exam Preparation Tips:**
1. Review past papers and sample questions
2. Create summary notes for each topic
3. Practice with mock tests
4. Get adequate rest before the exam
5. Arrive at least 30 minutes early`}const c=k.encouragement[Math.floor(Math.random()*k.encouragement.length)],u=k.advice[Math.floor(Math.random()*k.advice.length)];return`🤔 **I'm not sure I understood your question completely.**

${c}

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

**Tip:** ${u}

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
"How are you doing today?"`},X=async()=>{if(!_.trim()||A)return;const e={id:W.length+1,text:_,sender:"user",timestamp:new Date};M(t=>[...t,e]),j(""),N(!0),setTimeout(()=>{const t=xe(_),l={id:W.length+2,text:t,sender:"ai",timestamp:new Date};M(c=>[...c,l]),N(!1),setTimeout(()=>{F.current?.scrollIntoView({behavior:"smooth"})},100)},600)},be=e=>{e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),X())},we=()=>{S&&y&&M([{id:1,text:K(S,y),sender:"ai",timestamp:new Date}])},ke=e=>{j(e),s&&(B(!1),setTimeout(()=>{U.current?.focus()},100))},ve=["What's my CGPA?","Current GPA?","Assignments due?","How much do I owe?","Lectures today?","My attendance?","Study tips","Exam schedule","Library books","Campus events","Progress report","Motivation"];return v.useEffect(()=>{F.current&&F.current.scrollIntoView({behavior:"smooth"})},[W,A]),v.useEffect(()=>{Q()},[Q]),ee?n.createElement("div",{style:{maxWidth:"1200px",margin:"0 auto",padding:"2rem",textAlign:"center",minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",backgroundColor:"#f5f7fa"}},n.createElement("div",{style:{width:"60px",height:"60px",border:"4px solid #f3f3f3",borderTop:"4px solid #3498db",borderRadius:"50%",animation:"spin 1s linear infinite",marginBottom:"1.5rem"}}),n.createElement("h3",{style:{color:"#2c3e50",marginBottom:"0.5rem",fontSize:s?"1.2rem":"1.5rem"}},"Loading your personal AI assistant..."),n.createElement("p",{style:{color:"#7f8c8d",fontSize:s?"0.9rem":"1rem"}},"Fetching your academic data from the database"),n.createElement("style",null,`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `)):n.createElement("div",{style:{maxWidth:"1200px",margin:"0 auto",padding:s?"0.5rem":"1rem",minHeight:"100vh",display:"flex",flexDirection:"column",backgroundColor:"#f5f7fa"}},n.createElement("div",{style:{background:"linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)",borderRadius:s?"10px":"12px",padding:s?"1rem":"1.5rem",color:"white",marginBottom:s?"1rem":"1.5rem",boxShadow:"0 4px 6px rgba(0,0,0,0.1)"}},n.createElement("div",{style:{display:"flex",flexDirection:s?"column":"row",alignItems:s?"flex-start":"center",justifyContent:"space-between",gap:s?"0.75rem":"0"}},n.createElement("div",null,n.createElement("h1",{style:{fontSize:s?"1.25rem":"1.75rem",fontWeight:"bold",margin:"0 0 0.5rem 0",lineHeight:"1.2"}},"🤖 AI Student Assistant"),n.createElement("p",{style:{opacity:.9,margin:0,fontSize:s?"0.85rem":"1rem",lineHeight:"1.4"}},"Personalized assistance for ",S?.full_name||"Student"),n.createElement("div",{style:{display:"flex",gap:"0.5rem",marginTop:"0.75rem",fontSize:s?"0.75rem":"0.85rem",flexWrap:"wrap"}},n.createElement("span",{style:{background:"rgba(255,255,255,0.2)",padding:"0.25rem 0.75rem",borderRadius:"20px"}},"ID: ",S?.student_id||"N/A"),n.createElement("span",{style:{background:"rgba(255,255,255,0.2)",padding:"0.25rem 0.75rem",borderRadius:"20px"}},S?.program||"N/A"),n.createElement("span",{style:{background:"rgba(255,255,255,0.2)",padding:"0.25rem 0.75rem",borderRadius:"20px"}},"Y",S?.year_of_study||"N/A",".S",S?.semester||"N/A"))),n.createElement("div",{style:{background:"rgba(255,255,255,0.1)",padding:s?"0.75rem":"1rem",borderRadius:"8px",textAlign:"center",minWidth:s?"100%":"120px",marginTop:s?"0.5rem":"0",alignSelf:s?"stretch":"auto"}},n.createElement("div",{style:{fontSize:s?"0.75rem":"0.85rem",opacity:.8,marginBottom:"0.25rem"}},"Exam CGPA"),n.createElement("div",{style:{fontSize:s?"1.5rem":"2rem",fontWeight:"bold",lineHeight:"1"}},(y?.gpa?.examBasedCGPA||y?.gpa?.currentCGPA||0).toFixed(2))))),n.createElement("div",{style:{backgroundColor:"white",borderRadius:s?"10px":"12px",boxShadow:"0 2px 20px rgba(0,0,0,0.08)",overflow:"hidden",display:"flex",flexDirection:"column",height:s?"calc(100vh - 180px)":"70vh",minHeight:s?"500px":"600px",flex:"1"}},n.createElement("div",{style:{padding:s?"0.75rem 1rem":"1rem 1.5rem",borderBottom:"1px solid #e9ecef",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f8f9fa",flexShrink:0}},n.createElement("div",{style:{display:"flex",alignItems:"center",gap:s?"0.5rem":"0.75rem"}},n.createElement("div",{style:{width:s?"32px":"40px",height:s?"32px":"40px",borderRadius:"50%",background:"linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",flexShrink:0}},"🤖"),n.createElement("div",null,n.createElement("h2",{style:{fontSize:s?"0.9rem":"1.1rem",fontWeight:"600",margin:0,color:"#2c3e50",lineHeight:"1.2"}},"Personal Assistant"),n.createElement("div",{style:{display:"flex",alignItems:"center",gap:"0.25rem",fontSize:s?"0.7rem":"0.8rem",color:"#7f8c8d"}},n.createElement("div",{style:{width:"6px",height:"6px",borderRadius:"50%",backgroundColor:"#4CAF50"}}),n.createElement("span",null,"Connected to academic database")))),n.createElement("div",{style:{display:"flex",gap:"0.5rem"}},s&&n.createElement("button",{onClick:()=>B(!T),style:{background:"none",border:"1px solid #dee2e6",borderRadius:"6px",padding:"0.4rem 0.75rem",color:T?"#4361ee":"#6c757d",cursor:"pointer",fontSize:"0.75rem",display:"flex",alignItems:"center",gap:"0.25rem",whiteSpace:"nowrap",flexShrink:0}},n.createElement("span",null,T?"❌":"💬"),T?"Hide":"Quick Qs"),n.createElement("button",{onClick:we,style:{background:"none",border:"1px solid #dee2e6",borderRadius:"6px",padding:s?"0.4rem 0.75rem":"0.5rem 1rem",color:"#e74c3c",cursor:"pointer",fontSize:s?"0.75rem":"0.85rem",display:"flex",alignItems:"center",gap:"0.5rem",whiteSpace:"nowrap",flexShrink:0}},n.createElement("span",null,"🗑️"),!s&&"Clear Chat"))),n.createElement("div",{ref:ne,style:{flex:1,padding:s?"0.75rem":"1rem",overflowY:"auto",background:"#fafafa",display:"flex",flexDirection:"column",position:"relative"}},n.createElement("div",{style:{flex:1}},W.map(e=>n.createElement("div",{key:e.id,style:{marginBottom:s?"0.5rem":"0.75rem",display:"flex",flexDirection:"column",alignItems:e.sender==="user"?"flex-end":"flex-start"}},n.createElement("div",{style:{display:"flex",alignItems:"flex-start",gap:s?"0.5rem":"0.75rem",maxWidth:"95%"}},e.sender==="ai"&&n.createElement("div",{style:{width:s?"28px":"32px",height:s?"28px":"32px",borderRadius:"50%",background:"linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:"0.25rem"}},n.createElement("span",{style:{color:"white",fontSize:s?"0.8rem":"0.9rem"}},"🤖")),n.createElement("div",{style:{background:e.sender==="user"?"#4361ee":"white",color:e.sender==="user"?"white":"#2c3e50",padding:s?"0.75rem":"1rem",borderRadius:e.sender==="user"?"12px 12px 0 12px":"12px 12px 12px 0",boxShadow:"0 2px 8px rgba(0,0,0,0.1)",maxWidth:"100%",wordBreak:"break-word",whiteSpace:"pre-line",fontSize:s?"0.85rem":"0.9rem",lineHeight:"1.6"}},n.createElement("div",{style:{lineHeight:"1.6",fontWeight:e.sender==="user"?"400":"500"}},e.text),n.createElement("div",{style:{fontSize:s?"0.65rem":"0.75rem",opacity:.7,marginTop:"0.5rem",textAlign:"right"}},new Date(e.timestamp).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}))),e.sender==="user"&&n.createElement("div",{style:{width:s?"28px":"32px",height:s?"28px":"32px",borderRadius:"50%",background:"#f72585",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:"0.25rem"}},n.createElement("span",{style:{color:"white",fontSize:s?"0.8rem":"0.9rem"}},"👤"))))),A&&n.createElement("div",{style:{display:"flex",alignItems:"center",gap:s?"0.5rem":"0.75rem",marginTop:"0.75rem"}},n.createElement("div",{style:{width:s?"28px":"32px",height:s?"28px":"32px",borderRadius:"50%",background:"linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}},n.createElement("span",{style:{color:"white",fontSize:s?"0.8rem":"0.9rem"}},"🤖")),n.createElement("div",{style:{display:"flex",gap:"0.25rem"}},n.createElement("div",{style:{width:"6px",height:"6px",borderRadius:"50%",background:"#4361ee",animation:"bounce 1.4s infinite"}}),n.createElement("div",{style:{width:"6px",height:"6px",borderRadius:"50%",background:"#4361ee",animation:"bounce 1.4s infinite",animationDelay:"0.2s"}}),n.createElement("div",{style:{width:"6px",height:"6px",borderRadius:"50%",background:"#4361ee",animation:"bounce 1.4s infinite",animationDelay:"0.4s"}}))),n.createElement("div",{ref:F}))),T&&n.createElement("div",{ref:oe,style:{padding:s?"0.5rem 0.75rem":"0.75rem 1rem",borderTop:"1px solid #e9ecef",background:"#f8f9fa",flexShrink:0,maxHeight:s?"120px":"auto",overflowY:s?"auto":"visible"}},n.createElement("div",{style:{fontSize:s?"0.75rem":"0.85rem",color:"#7f8c8d",marginBottom:s?"0.5rem":"0.75rem",fontWeight:"500",paddingLeft:"4px",display:"flex",justifyContent:"space-between",alignItems:"center"}},n.createElement("span",null,"Quick questions:"),s&&n.createElement("button",{onClick:()=>B(!1),style:{background:"none",border:"none",color:"#4361ee",fontSize:"0.75rem",cursor:"pointer",padding:"0.25rem 0.5rem"}},"Close")),n.createElement("div",{style:{display:"flex",gap:s?"0.4rem":"0.5rem",flexWrap:"wrap",overflowX:s?"auto":"visible",paddingBottom:s?"4px":"0",WebkitOverflowScrolling:"touch",alignItems:"center",minHeight:s?"auto":"36px"}},ve.map((e,t)=>n.createElement("button",{key:t,onClick:()=>ke(e),style:{padding:s?"0.4rem 0.75rem":"0.5rem 0.9rem",background:"rgba(67, 97, 238, 0.1)",color:"#4361ee",border:"1px solid rgba(67, 97, 238, 0.2)",borderRadius:"20px",fontSize:s?"0.75rem":"0.8rem",cursor:"pointer",transition:"all 0.2s",whiteSpace:"nowrap",flexShrink:0,height:s?"32px":"36px",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:"1",fontWeight:"500"},onMouseEnter:l=>{l.currentTarget.style.background="rgba(67, 97, 238, 0.2)",l.currentTarget.style.transform="translateY(-2px)",l.currentTarget.style.boxShadow="0 2px 8px rgba(67, 97, 238, 0.2)"},onMouseLeave:l=>{l.currentTarget.style.background="rgba(67, 97, 238, 0.1)",l.currentTarget.style.transform="translateY(0)",l.currentTarget.style.boxShadow="none"}},e)))),n.createElement("div",{style:{padding:s?"0.75rem":"1rem",borderTop:"1px solid #e9ecef",background:"white",flexShrink:0}},n.createElement("div",{style:{display:"flex",gap:s?"0.5rem":"0.75rem",flexDirection:s?"column":"row"}},n.createElement("div",{style:{flex:1,position:"relative",minHeight:s?"44px":"50px"}},n.createElement("textarea",{ref:U,value:_,onChange:e=>j(e.target.value),onKeyPress:be,placeholder:"Ask me anything about your academics...",style:{width:"100%",padding:s?"0.75rem 0.75rem 0.75rem 2.5rem":"1rem 1rem 1rem 3rem",border:"1px solid #dee2e6",borderRadius:"8px",fontSize:s?"0.9rem":"0.95rem",minHeight:s?"44px":"50px",maxHeight:"120px",resize:"vertical",outline:"none",fontFamily:"inherit",boxShadow:"0 2px 4px rgba(0,0,0,0.05)",lineHeight:"1.5"},rows:"2"}),n.createElement("div",{style:{position:"absolute",left:s?"0.75rem":"1rem",top:s?"0.75rem":"1rem",color:"#adb5bd",fontSize:s?"1rem":"1.1rem"}},"💬")),n.createElement("button",{onClick:X,disabled:!_.trim()||A,style:{background:"linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)",color:"white",border:"none",borderRadius:"8px",padding:s?"0.75rem 1rem":"0 1.5rem",cursor:!_.trim()||A?"not-allowed":"pointer",opacity:!_.trim()||A?.6:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem",fontSize:s?"0.9rem":"0.95rem",fontWeight:"600",transition:"all 0.2s",boxShadow:"0 4px 6px rgba(67, 97, 238, 0.4)",minWidth:s?"100%":"auto",height:s?"44px":"auto",minHeight:s?"44px":"auto"},onMouseEnter:e=>{_.trim()&&!A&&(e.currentTarget.style.transform="translateY(-2px)",e.currentTarget.style.boxShadow="0 6px 12px rgba(67, 97, 238, 0.5)")},onMouseLeave:e=>{_.trim()&&!A&&(e.currentTarget.style.transform="translateY(0)",e.currentTarget.style.boxShadow="0 4px 6px rgba(67, 97, 238, 0.4)")}},A?n.createElement(n.Fragment,null,n.createElement("div",{style:{width:s?"14px":"16px",height:s?"14px":"16px",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"white",borderRadius:"50%",animation:"spin 1s linear infinite"}}),s?"...":"Processing..."):n.createElement(n.Fragment,null,n.createElement("span",{style:{fontSize:s?"0.9rem":"1rem"}},"📤"),s?"Send":"Send Message"))))),n.createElement("div",{style:{marginTop:s?"0.75rem":"1rem",textAlign:"center",color:"#7f8c8d",fontSize:s?"0.7rem":"0.8rem",padding:"0.5rem"}},n.createElement("p",{style:{margin:0,lineHeight:"1.4"}},"AI Student Assistant • Real-time GPA/CGPA from exam results • Data updates automatically"),n.createElement("p",{style:{margin:"0.25rem 0 0 0",fontSize:s?"0.65rem":"0.75rem",opacity:.7}},"Last updated: ",new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})," • Ask me anything!")),s&&!T&&n.createElement("button",{onClick:()=>B(!0),style:{position:"fixed",bottom:"80px",right:"20px",background:"#4361ee",color:"white",border:"none",borderRadius:"50%",width:"50px",height:"50px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 4px 12px rgba(67, 97, 238, 0.4)",zIndex:1e3,fontSize:"1.2rem"}},"💬"),n.createElement("style",null,`
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
      `))};export{_e as default};
