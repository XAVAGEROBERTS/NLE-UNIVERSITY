import{r as l,b as F,s as D,R as e}from"./index-tPt1CnYW.js";const P=()=>{const[N,c]=l.useState([]),[A,p]=l.useState(!0),[C,g]=l.useState([]),[d,W]=l.useState(!1),[f,h]=l.useState("timetable"),{user:E}=F();l.useEffect(()=>{const t=()=>{const r=window.innerWidth<768;W(r),r&&h("upcoming")};return t(),window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]),l.useEffect(()=>{E?.email&&B()},[E]);const B=async()=>{try{p(!0);const{data:t,error:r}=await D.from("students").select("id, program_id, academic_year, semester, year_of_study, department_code").eq("email",E.email).single();if(r||!t){console.error("Student not found:",r),c([]),g([]),p(!1);return}const{data:o,error:n}=await D.from("program_timetables").select("id").eq("program_id",t.program_id).eq("academic_year",t.academic_year).eq("semester",t.semester).eq("year_of_study",t.year_of_study).eq("is_active",!0).single();if(n||!o){console.log("No program timetable found for this student yet."),c([]),g([]),p(!1);return}const{data:i,error:w}=await D.from("program_timetable_slots").select(`
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
      `).eq("program_timetable_id",o.id).eq("is_active",!0).order("day_of_week",{ascending:!0}).order("start_time",{ascending:!0});if(w)throw w;if(!i||i.length===0){c([]),g([]),p(!1);return}const $=["8:00 - 9:00","9:00 - 10:00","10:00 - 11:00","11:00 - 12:00","12:00 - 13:00","13:00 - 14:00","14:00 - 15:00","15:00 - 16:00","16:00 - 17:00","17:00 - 18:00"],S=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],T=$.map(a=>{const s={time:a};return S.forEach(v=>{s[v.toLowerCase()]=[]}),s}),_=[],m=new Date,I=new Date(m);I.setDate(m.getDate()+7),i.forEach(a=>{const s=S[a.day_of_week]?.toLowerCase();if(!s)return;const v=parseInt(a.start_time.split(":")[0]),V=parseInt(a.end_time.split(":")[0]);for(let y=v;y<V;y++){const j=`${y.toString().padStart(2,"0")}:00 - ${(y+1).toString().padStart(2,"0")}:00`,k=$.findIndex(u=>u===j);if(k!==-1){const u={courseCode:a.course_code||"N/A",courseName:a.course_name||"Unknown Course",room:a.room_number?`${a.room_number}, ${a.building||""}`.trim():"TBA",lecturer:a.lecturers?.full_name||"Not Assigned",slotType:a.slot_type==="lab"?"LAB":"",startTime:a.start_time,endTime:a.end_time,dayOfWeek:a.day_of_week,dayName:S[a.day_of_week]};T[k][s].some(R=>R.courseCode===u.courseCode&&R.startTime===a.start_time)||T[k][s].push(u);const q=m.getDay()===0?6:m.getDay()-1;let x=a.day_of_week-q;x<0&&(x+=7);const b=new Date(m);b.setDate(m.getDate()+x),b<=I&&_.push({...u,date:b.toISOString().split("T")[0],formattedDate:M(b),isToday:x===0,isTomorrow:x===1})}}}),_.sort((a,s)=>a.date===s.date?a.startTime.localeCompare(s.startTime):a.date.localeCompare(s.date)),c(T),g(_)}catch(t){console.error("Error fetching program timetable:",t),c([]),g([])}finally{p(!1)}},L=t=>{if(!t)return"TBD";const[r,o]=t.split(":"),n=parseInt(r),i=n>=12?"PM":"AM";return`${n%12||12}:${o} ${i}`},M=t=>{const r=new Date,o=new Date;return o.setDate(r.getDate()+1),t.toDateString()===r.toDateString()?"Today":t.toDateString()===o.toDateString()?"Tomorrow":t.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})},O=t=>{const r={title:`${t.courseCode} - ${t.courseName}`,start:new Date(`${t.date}T${t.startTime}`),end:new Date(`${t.date}T${t.endTime}`),description:`Lecture by ${t.lecturer}
Room: ${t.room}`,location:t.room},o=["BEGIN:VCALENDAR","VERSION:2.0","BEGIN:VEVENT",`SUMMARY:${r.title}`,`DTSTART:${r.start.toISOString().replace(/[-:]/g,"").split(".")[0]}Z`,`DTEND:${r.end.toISOString().replace(/[-:]/g,"").split(".")[0]}Z`,`DESCRIPTION:${r.description}`,`LOCATION:${r.location}`,"END:VEVENT","END:VCALENDAR"].join(`
`),n=new Blob([o],{type:"text/calendar;charset=utf-8"}),i=document.createElement("a");i.href=URL.createObjectURL(n),i.download=`${t.courseCode.replace(/\s+/g,"_")}_lecture.ics`,i.click(),URL.revokeObjectURL(i.href),alert(`${t.courseCode} added to calendar!`)},z=()=>e.createElement("div",{className:"upcoming-lectures-container",style:{marginTop:"20px"}},e.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"15px",padding:"0 8px"}},e.createElement("h3",{style:{margin:0,fontSize:"1.2rem",color:"#333"}},"Upcoming Lectures"),e.createElement("span",{style:{fontSize:"0.85rem",color:"#666"}},"Next 7 days")),C.length===0?e.createElement("div",{style:{textAlign:"center",padding:"40px 16px",backgroundColor:"#f8f9fa",borderRadius:"10px",margin:"0 8px"}},e.createElement("p",{style:{color:"#666",margin:"0 0 10px 0"}},"No upcoming lectures this week"),e.createElement("p",{style:{fontSize:"0.85rem",color:"#999",marginTop:"5px"}},"Check your timetable for more details")):e.createElement("div",{className:"lecture-cards",style:{padding:"0 8px"}},C.map((t,r)=>e.createElement("div",{key:r,className:"lecture-card",style:{backgroundColor:"white",borderRadius:"12px",padding:"16px",marginBottom:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",borderLeft:`4px solid ${t.isToday?"#3498db":t.isTomorrow?"#9b59b6":"#2ecc71"}`}},e.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px"}},e.createElement("div",{style:{flex:1}},e.createElement("h4",{style:{margin:"0 0 6px 0",fontSize:"16px",color:"#333",lineHeight:"1.3"}},t.courseName),e.createElement("p",{style:{margin:"0",fontSize:"14px",color:"#666",fontWeight:"500"}},t.courseCode)),e.createElement("div",{style:{backgroundColor:t.isToday?"#e3f2fd":t.isTomorrow?"#f3e5f5":"#f8f9fa",padding:"6px 10px",borderRadius:"6px",fontSize:"12px",fontWeight:"500",whiteSpace:"nowrap",marginLeft:"8px"}},t.formattedDate)),e.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:"12px",marginBottom:"16px"}},e.createElement("div",null,e.createElement("p",{style:{margin:"0 0 4px 0",fontSize:"12px",color:"#999",textTransform:"uppercase"}},"Time"),e.createElement("p",{style:{margin:"0",fontSize:"14px",fontWeight:"500",color:"#333"}},L(t.startTime)," - ",L(t.endTime))),e.createElement("div",null,e.createElement("p",{style:{margin:"0 0 4px 0",fontSize:"12px",color:"#999",textTransform:"uppercase"}},"Room"),e.createElement("p",{style:{margin:"0",fontSize:"14px",fontWeight:"500",color:"#333"}},t.room," ",t.slotType))),e.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:"12px",borderTop:"1px solid #eee"}},e.createElement("div",{style:{flex:1}},e.createElement("p",{style:{margin:"0 0 4px 0",fontSize:"12px",color:"#999"}},"Lecturer"),e.createElement("p",{style:{margin:"0",fontSize:"14px",color:"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},t.lecturer)),e.createElement("button",{onClick:()=>O(t),style:{backgroundColor:"#f4f4f4",color:"#333",border:"1px solid #ddd",padding:"8px 12px",borderRadius:"6px",cursor:"pointer",fontSize:"13px",display:"flex",alignItems:"center",gap:"6px",marginLeft:"12px",flexShrink:0,whiteSpace:"nowrap"}},e.createElement("i",{className:"fas fa-calendar-plus"})," Add")))))),U=()=>e.createElement("div",{className:"table-container",style:{marginTop:"20px",padding:"0"}},e.createElement("table",{style:{margin:0}},e.createElement("thead",null,e.createElement("tr",null,e.createElement("th",{style:{padding:"12px"}},"Time"),e.createElement("th",{style:{padding:"12px"}},"Monday"),e.createElement("th",{style:{padding:"12px"}},"Tuesday"),e.createElement("th",{style:{padding:"12px"}},"Wednesday"),e.createElement("th",{style:{padding:"12px"}},"Thursday"),e.createElement("th",{style:{padding:"12px"}},"Friday"),e.createElement("th",{style:{padding:"12px"}},"Saturday"))),e.createElement("tbody",null,N.map((t,r)=>e.createElement("tr",{key:r},e.createElement("td",{style:{padding:"12px",fontWeight:"500"}},t.time),["monday","tuesday","wednesday","thursday","friday","saturday"].map(o=>e.createElement("td",{key:o,style:{padding:"8px"}},t[o].length>0?t[o].map((n,i)=>e.createElement("div",{key:i,className:"timetable-cell",style:{backgroundColor:"#f8f9fa",padding:"10px",marginBottom:"6px",borderRadius:"6px",borderLeft:`3px solid ${n.slotType==="LAB"?"#e74c3c":"#3498db"}`}},e.createElement("div",{style:{fontWeight:"500",fontSize:"0.9rem",marginBottom:"4px"}},n.courseCode),e.createElement("div",{style:{fontSize:"0.8rem",color:"#666",marginBottom:"2px"}},n.room," ",n.slotType),e.createElement("div",{style:{fontSize:"0.75rem",color:"#999"}},n.lecturer))):e.createElement("div",{style:{color:"#ccc",textAlign:"center",padding:"10px"}},"-"))))))));return A?e.createElement("div",{className:"content",style:{padding:"16px"}},e.createElement("div",{className:"dashboard-header",style:{padding:"0"}},e.createElement("h2",{style:{margin:"0 0 8px 0"}},"My Time Table"),e.createElement("div",{className:"date-display",style:{color:"#666"}},"Loading timetable...")),e.createElement("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"200px"}},e.createElement("div",{className:"timetable-spinner"}))):e.createElement("div",{className:"content",style:{padding:d?"12px 8px":"16px",maxWidth:"100%",overflowX:"hidden"}},e.createElement("div",{className:"dashboard-header",style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"10px",padding:d?"0":"0 0 10px 0",marginBottom:d?"0":"10px"}},e.createElement("div",{style:{flex:1,minWidth:"200px"}},e.createElement("h2",{style:{margin:"0 0 6px 0",fontSize:d?"1.3rem":"1.5rem"}},"My Time Table"),e.createElement("div",{className:"date-display",style:{color:"#666",fontSize:d?"0.9rem":"1rem"}},"Week: ",new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}))),!d&&e.createElement("div",{className:"view-toggle",style:{display:"flex",gap:"4px",backgroundColor:"#f8f9fa",padding:"4px",borderRadius:"8px",flexShrink:0}},e.createElement("button",{onClick:()=>h("timetable"),style:{padding:"8px 16px",borderRadius:"6px",border:"none",background:f==="timetable"?"#3498db":"transparent",color:f==="timetable"?"white":"#666",cursor:"pointer",fontWeight:"500",fontSize:"0.9rem",whiteSpace:"nowrap"}},"Full Timetable"),e.createElement("button",{onClick:()=>h("upcoming"),style:{padding:"8px 16px",borderRadius:"6px",border:"none",background:f==="upcoming"?"#3498db":"transparent",color:f==="upcoming"?"white":"#666",cursor:"pointer",fontWeight:"500",fontSize:"0.9rem",whiteSpace:"nowrap"}},"Upcoming Lectures"))),N.length===0?e.createElement("div",{style:{textAlign:"center",padding:"40px 16px",backgroundColor:"#f8f9fa",borderRadius:"10px",marginTop:"20px"}},e.createElement("p",{style:{color:"#666",margin:"0 0 10px 0"}},"No timetable available for the current semester."),e.createElement("p",{style:{fontSize:"0.9rem",color:"#999"}},"Please contact your department for more information.")):e.createElement(e.Fragment,null,d||f==="upcoming"?z():U()),e.createElement("style",null,`
        .table-container {
          overflow-x: auto;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          background: white;
          width: 100%;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }
        
        th {
          background: #f8f9fa;
          text-align: left;
          border-bottom: 2px solid #dee2e6;
          font-weight: 600;
          color: #333;
        }
        
        tr:last-child td {
          border-bottom: none;
        }
        
        .timetable-cell:hover {
          background-color: #f0f7ff;
          transform: translateY(-1px);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .lecture-card:hover {
          transform: translateY(-2px);
          transition: transform 0.3s ease;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        
        /* Loading spinner */
     /* Timetable loading spinner */
.timetable-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: timetable-spin 1s linear infinite;
}

@keyframes timetable-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
        /* Mobile optimizations */
        @media (max-width: 768px) {
          .content {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
          
          .lecture-card {
            margin-left: 0 !important;
            margin-right: 0 !important;
            width: 100%;
          }
          
          .dashboard-header {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          
          .upcoming-lectures-container {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }
        
        @media (min-width: 769px) and (max-width: 1024px) {
          .content {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
          
          table {
            min-width: 700px;
          }
          
          th, td {
            padding: 10px 12px !important;
            font-size: 0.9rem;
          }
        }
        
        @media (min-width: 1025px) {
          .content {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }
        }
        
        /* Button hover effects */
        button:hover {
          opacity: 0.9;
        }
        
        /* Scrollbar styling */
        .table-container::-webkit-scrollbar {
          height: 8px;
        }
        
        .table-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        
        .table-container::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        
        .table-container::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
      `))};export{P as default};
