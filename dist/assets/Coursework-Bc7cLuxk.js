import{r as u,R as e,s as v,b as ce}from"./index-tPt1CnYW.js";import{c as de}from"./clearanceUtils-DrJSehqK.js";const me=({assignment:l,studentId:T,onClose:L,onSubmitSuccess:P})=>{const[S,O]=u.useState(""),[h,$]=u.useState([]),[C,j]=u.useState(0),[_,D]=u.useState(!1),[r,x]=u.useState(""),[B,U]=u.useState(""),I=u.useRef(null),Y=a=>{const b=Array.from(a.target.files),f=l.max_file_size||10,E=l.allowed_formats||["pdf","doc","docx","zip"],F=b.filter(y=>{const A=y.name.split(".").pop().toLowerCase();return y.size/(1024*1024)>f?(x(`"${y.name}" exceeds ${f}MB limit`),!1):E.includes(A)?!0:(x(`"${y.name}" not allowed. Use: ${E.join(", ")}`),!1)});F.length>0&&($(y=>[...y,...F]),x(""))},W=a=>{$(b=>b.filter((f,E)=>E!==a))},q=async()=>{const{data:{user:a}}=await v.auth.getUser();if(!a)throw new Error("Not authenticated");const b=[];for(let f=0;f<h.length;f++){const E=h[f];E.name.split(".").pop();const F=E.name.replace(/[^a-zA-Z0-9._-]/g,"_"),y=`${T}/${l.id}/${Date.now()}_${f}_${F}`,{error:A}=await v.storage.from("assignments").upload(y,E,{upsert:!1});if(A)throw new Error(`Upload failed: ${E.name}`);const{data:M}=v.storage.from("assignments").getPublicUrl(y);b.push(M.publicUrl),j(Math.round((f+1)/h.length*100))}return b},z=async()=>{if(!S.trim()&&h.length===0){x("Please provide text or upload files");return}if(l.submission_type==="text"&&!S.trim()){x("Text submission required");return}if(l.submission_type==="file"&&h.length===0){x("File upload required");return}D(!0),x(""),U("");try{let a=[];h.length>0&&(a=await q());const b={assignment_id:l.id,student_id:T,submitted_text:S||null,file_urls:a.length>0?a:null,status:new Date(l.rawDueDate)<new Date?"late":"submitted",submission_date:new Date().toISOString()},{error:f}=await v.from("assignment_submissions").insert([b]);if(f)throw f;U("Submitted successfully!"),setTimeout(()=>{P(),L()},1500)}catch(a){x(`Submission failed: ${a.message}`)}finally{D(!1)}},H=a=>a<1024?a+" B":a<1048576?(a/1024).toFixed(1)+" KB":(a/1048576).toFixed(1)+" MB";return e.createElement("div",{style:{position:"fixed",top:0,left:0,width:"100%",height:"100%",backgroundColor:"rgba(0, 0, 0, 0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:"16px"}},e.createElement("div",{style:{backgroundColor:"white",borderRadius:"12px",width:"100%",maxWidth:"560px",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 10px 30px rgba(0, 0, 0, 0.2)",overflow:"hidden"}},e.createElement("div",{style:{padding:"16px 20px",borderBottom:"1px solid #eee",display:"flex",justifyContent:"space-between",alignItems:"center",backgroundColor:"#f9fafb"}},e.createElement("h3",{style:{margin:0,fontSize:"17px",fontWeight:600,color:"#1f2937"}},"Submit: ",l.title),e.createElement("button",{onClick:L,style:{background:"none",border:"none",fontSize:"24px",cursor:"pointer",color:"#6b7280",width:"32px",height:"32px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"},onMouseOver:a=>a.target.style.backgroundColor="#f3f4f6",onMouseOut:a=>a.target.style.backgroundColor="transparent"},"×")),e.createElement("div",{style:{padding:"20px",overflowY:"auto",flex:1}},e.createElement("div",{style:{backgroundColor:"#f0f9ff",borderRadius:"8px",padding:"12px",marginBottom:"16px",fontSize:"13px"}},e.createElement("div",null,e.createElement("strong",null,"Course:")," ",l.courseCode),e.createElement("div",null,e.createElement("strong",null,"Due:")," ",l.dueDate),e.createElement("div",null,e.createElement("strong",null,"Type:")," ",l.submission_type)),r&&e.createElement("div",{style:{padding:"10px 12px",backgroundColor:"#fee2e2",border:"1px solid #fca5a5",borderRadius:"6px",color:"#dc2626",fontSize:"14px",marginBottom:"16px"}},r),B&&e.createElement("div",{style:{padding:"10px 12px",backgroundColor:"#dcfce7",border:"1px solid #86efac",borderRadius:"6px",color:"#166534",fontSize:"14px",marginBottom:"16px"}},B),(l.submission_type==="text"||l.submission_type==="both")&&e.createElement("div",{style:{marginBottom:"20px"}},e.createElement("label",{style:{fontSize:"14px",fontWeight:600,display:"block",marginBottom:"6px"}},"Submission Text ",l.submission_type==="text"&&"*"),e.createElement("textarea",{value:S,onChange:a=>O(a.target.value),placeholder:"Enter your answer here...",rows:5,style:{width:"100%",padding:"10px",border:"1px solid #d1d5db",borderRadius:"6px",fontSize:"14px",resize:"vertical"}}),e.createElement("div",{style:{textAlign:"right",fontSize:"12px",color:"#6b7280",marginTop:"4px"}},S.length," characters")),(l.submission_type==="file"||l.submission_type==="both")&&e.createElement("div",{style:{marginBottom:"20px"}},e.createElement("label",{style:{fontSize:"14px",fontWeight:600,display:"block",marginBottom:"6px"}},"Files ",l.submission_type==="file"&&"*"),e.createElement("div",{onClick:()=>I.current?.click(),style:{border:"2px dashed #bbb",borderRadius:"8px",padding:"24px 16px",textAlign:"center",cursor:"pointer",backgroundColor:"#fafafa"},onMouseOver:a=>a.currentTarget.style.borderColor="#3b82f6",onMouseOut:a=>a.currentTarget.style.borderColor="#bbb"},e.createElement("p",{style:{margin:"0 0 8px 0",color:"#4b5563",fontWeight:500}},"Click to upload or drag & drop"),e.createElement("small",{style:{color:"#9ca3af"}},"Max ",l.max_file_size||10,"MB • ",l.allowed_formats?.join(", ")||"PDF, DOC, ZIP")),e.createElement("input",{type:"file",ref:I,onChange:Y,multiple:!0,style:{display:"none"}}),h.length>0&&e.createElement("div",{style:{marginTop:"12px"}},h.map((a,b)=>e.createElement("div",{key:b,style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",backgroundColor:"#f9fafb",borderRadius:"6px",marginBottom:"6px",fontSize:"13px"}},e.createElement("div",{style:{display:"flex",alignItems:"center",gap:"8px"}},e.createElement("i",{className:"fas fa-file",style:{color:"#3b82f6"}}),e.createElement("div",null,e.createElement("div",{style:{fontWeight:500}},a.name),e.createElement("div",{style:{color:"#6b7280",fontSize:"12px"}},H(a.size)))),e.createElement("button",{onClick:()=>W(b),style:{background:"none",border:"none",color:"#ef4444",cursor:"pointer"}},e.createElement("i",{className:"fas fa-times"}))))),C>0&&C<100&&e.createElement("div",{style:{marginTop:"12px"}},e.createElement("div",{style:{height:"4px",backgroundColor:"#e5e7eb",borderRadius:"2px",overflow:"hidden"}},e.createElement("div",{style:{height:"100%",width:`${C}%`,backgroundColor:"#22c55e",transition:"width 0.3s"}})),e.createElement("div",{style:{textAlign:"center",fontSize:"12px",color:"#4b5563",marginTop:"4px"}},C,"% uploaded"))),l.instructions&&e.createElement("div",{style:{backgroundColor:"#fffbeb",border:"1px solid #fcd34d",borderRadius:"8px",padding:"12px",fontSize:"13px",marginTop:"16px"}},e.createElement("strong",{style:{color:"#d97706"}},"Instructions:"),e.createElement("p",{style:{margin:"6px 0 0 0",color:"#92400e"}},l.instructions))),e.createElement("div",{style:{padding:"16px 20px",borderTop:"1px solid #eee",display:"flex",justifyContent:"flex-end",gap:"10px",backgroundColor:"#f9fafb"}},e.createElement("button",{onClick:L,disabled:_,style:{padding:"8px 16px",borderRadius:"6px",fontSize:"14px",backgroundColor:"#f3f4f6",border:"1px solid #d1d5db",cursor:"pointer"}},"Cancel"),e.createElement("button",{onClick:z,disabled:_,style:{padding:"8px 20px",borderRadius:"6px",fontSize:"14px",fontWeight:600,backgroundColor:_?"#9ca3af":"#3b82f6",color:"white",border:"none",cursor:_?"not-allowed":"pointer"}},_?"Submitting...":"Submit"))))},be=()=>{const[l,T]=u.useState([]),[L,P]=u.useState(!0),[S,O]=u.useState(!1),[h,$]=u.useState(!1),[C,j]=u.useState(!1),[_,D]=u.useState(!1),[r,x]=u.useState(null),[B,U]=u.useState(null),[I,Y]=u.useState(!1),[W,q]=u.useState(!0),[z,H]=u.useState(null),{user:a}=ce();u.useEffect(()=>(S||h||C||_?document.body.classList.add("modal-open"):document.body.classList.remove("modal-open"),()=>document.body.classList.remove("modal-open")),[S,h,C,_]),u.useEffect(()=>{(async()=>{if(a?.email)try{q(!0);const{data:c,error:s}=await v.from("students").select("id").eq("email",a.email).single();if(s){console.error("Error getting student:",s),Y(!1),q(!1);return}U(c.id);const n=await de(c.id);Y(n.hasAccess),H({percentagePaid:n.percentagePaid||0,notes:n.notes,details:n.details||[],cached:n.cached||!1}),console.log("Assignment access result:",n),n.hasAccess&&await b()}catch(c){console.error("Error checking assignment access:",c),Y(!1)}finally{q(!1)}})()},[a]);const b=async()=>{try{P(!0),console.clear(),console.log("🚀 ===== STARTING ASSIGNMENT FETCH =====");const{data:t,error:c}=await v.from("students").select("id, student_id, full_name, email, department_code, year_of_study, semester").eq("email",a.email).single();if(c)throw console.error("❌ Student error:",c),c;U(t.id),console.log("👤 STUDENT:",{id:t.id,name:t.full_name,email:t.email,department:t.department_code,year:t.year_of_study,semester:t.semester}),console.log("📚 Fetching student courses...");const{data:s,error:n}=await v.from("student_courses").select("course_id, status").eq("student_id",t.id);if(n)throw console.error("❌ Student courses error:",n),n;const i=s?.filter(o=>o.status!=="completed").map(o=>o.course_id)||[];if(console.log(`📊 Student has ${s?.length||0} total courses`),console.log(`📊 Non-completed courses: ${i.length}`),i.length===0){console.log("✅ No non-completed courses found - setting empty assignments"),T([]),P(!1);return}console.log(`🔍 Fetching assignments for:
        - Department: ${t.department_code}
        - Year: ${t.year_of_study}
        - Semester: ${t.semester}`);const{data:w,error:p}=await v.from("assignments").select(`
          *,
          courses!inner (
            id,
            course_code,
            course_name,
            department_code,
            year,
            semester
          ),
          lecturers (full_name)
        `).eq("courses.department_code",t.department_code).eq("courses.year",t.year_of_study).eq("courses.semester",t.semester).in("status",["published","closed","graded"]).in("course_id",i).order("created_at",{ascending:!1});if(p)throw console.error("❌ Assignments error:",p),p;console.log(`📚 Found ${w?.length||0} assignments for current semester`);const{data:g,error:m}=await v.from("assignment_submissions").select("*").eq("student_id",t.id);if(m)throw console.error("❌ Submissions error:",m),m;console.log(`📤 Student has ${g?.length||0} submissions`);const k=(w||[]).map(o=>{const N=g?.find(d=>d.assignment_id===o.id);let K=!1,V="not submitted",J=!0,Q=!1;N&&(V=N.status||"not submitted",K=["submitted","graded","late"].includes(V),Q=V==="graded");const Z=new Date(o.due_date),ee=Z<new Date;J=!K&&!ee;const G=(o.file_urls||[]).map(d=>{if(!d)return null;if(d.startsWith("http"))return d;const te=v.supabaseUrl.split("//")[1].split(".")[0];let R=d;R.includes("lecturerbucket/")&&(R=R.split("lecturerbucket/")[1]);const re=`https://${te}.supabase.co/storage/v1/object/public/lecturerbucket/${R}`;return console.log(`📁 Lecturer file: ${R} → ${re}`),re}).filter(d=>d&&d!=="");console.log(`   Assignment "${o.title}": ${G.length} lecturer files`);const le=(N?.file_urls||[]).map(d=>d?d.startsWith("http")?d:`https://${v.supabaseUrl.split("//")[1].split(".")[0]}.supabase.co/storage/v1/object/public/assignments/${d}`:null).filter(d=>d&&d!==""),ie=G.find(d=>d&&(d.toLowerCase().endsWith(".pdf")||d.includes("assignment")||d.includes("question")))||G[0];return{id:o.id,courseCode:o.courses?.course_code||"N/A",courseName:o.courses?.course_name||"N/A",courseDepartment:o.courses?.department_code,courseYear:o.courses?.year,courseSemester:o.courses?.semester,title:o.title,description:o.description||"",instructions:o.instructions||"",assignedDate:new Date(o.created_at).toLocaleDateString("en-US",{day:"numeric",month:"short",year:"numeric"}),dueDate:Z.toLocaleDateString("en-US",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:!0})+" EAT",rawDueDate:Z,isPastDue:ee,status:V,isSubmitted:K,submissionId:N?.id,submissionDate:N?.submission_date,fileUrls:le,submittedText:N?.submitted_text||"",feedback:N?.feedback||"",marks:N?.marks_obtained?`${N.marks_obtained}/${o.total_marks}`:"",totalMarks:o.total_marks,obtainedMarks:N?.marks_obtained,lecturer:o.lecturers?.full_name||"Unknown Lecturer",submission_type:o.submission_type||"file",allowed_formats:o.allowed_formats||["pdf","doc","docx","zip"],max_file_size:o.max_file_size||10,assignment_files:G,main_assignment_file:ie,canSubmit:J,isGraded:Q,original_file_urls:o.file_urls||[],created_at:o.created_at}});console.log(`✅ Processed ${k.length} assignments`),T(k)}catch(t){console.error("❌ Error in fetchAssignments:",t),alert(`Error loading assignments: ${t.message}`),T([])}finally{P(!1)}},f=async(t,c=null)=>{const s=c||t.main_assignment_file;if(!s){A(t);return}try{let n=`Assignment_${t.title.replace(/[^a-z0-9]/gi,"_")}`;const i=s.split("/"),w=i[i.length-1];if(w&&w.includes(".")){const o=w.split("?")[0];n=decodeURIComponent(o)}console.log(`📥 Downloading lecturer file: ${n} from ${s}`);const p=await fetch(s);if(!p.ok)throw new Error(`Failed to fetch file: ${p.status} ${p.statusText}`);const g=await p.blob(),m=window.URL.createObjectURL(g),k=document.createElement("a");k.href=m,k.download=n,k.style.display="none",document.body.appendChild(k),k.click(),setTimeout(()=>{document.body.removeChild(k),window.URL.revokeObjectURL(m)},100),console.log("✅ Download started")}catch(n){console.error("❌ Error downloading assignment file:",n);try{const i=document.createElement("a");i.href=s;const w=s.split("/"),p=w[w.length-1];p&&p.includes(".")?i.download=p.split("?")[0]:i.download=`Assignment_${t.title.replace(/[^a-z0-9]/gi,"_")}.pdf`,i.style.display="none",document.body.appendChild(i),i.click(),document.body.removeChild(i),console.log("✅ Download started (fallback method)")}catch(i){console.error("❌ Fallback download failed:",i),alert("Error downloading assignment file. Please try again or contact support.")}}},E=async t=>{if(!t.fileUrls||t.fileUrls.length===0){alert("No files submitted for this assignment");return}try{if(!window.confirm(`Download ${t.fileUrls.length} submitted file(s) for "${t.title}"?`))return;for(let s=0;s<t.fileUrls.length;s++){const n=t.fileUrls[s];let i=`my_submission_${t.title.replace(/[^a-z0-9]/gi,"_").toLowerCase()}_${s+1}`;const w=n.split("/"),p=w[w.length-1];p&&p.includes(".")&&(i=`submission_${p.split("?")[0]}`),console.log(`📥 Downloading student submission: ${i} from ${n}`);try{const g=await fetch(n);if(g.ok){const m=await g.blob(),k=window.URL.createObjectURL(m),o=document.createElement("a");o.href=k,o.download=i,o.style.display="none",document.body.appendChild(o),o.click(),setTimeout(()=>{document.body.removeChild(o),window.URL.revokeObjectURL(k)},100)}else{const m=document.createElement("a");m.href=n,m.download=i,m.style.display="none",document.body.appendChild(m),m.click(),setTimeout(()=>{document.body.removeChild(m)},100)}}catch(g){console.warn(`⚠️ Could not download file ${s+1}:`,g)}await new Promise(g=>setTimeout(g,300))}console.log("✅ All student files downloaded"),alert(`${t.fileUrls.length} file(s) downloaded successfully!`)}catch(c){console.error("❌ Error downloading submission files:",c),alert("Error downloading submission files. Please try again.")}},F=t=>{if(!t.canSubmit){alert("This assignment is past the due date. Submissions are no longer accepted.");return}x(t),O(!0)},y=t=>{x(t),$(!0)},A=t=>{x(t),j(!0)},M=t=>{x(t),D(!0)},X=t=>{if(!t)return"";const[c,s]=t.split("/").map(Number),n=c/s*100;return n>=90?"excellent":n>=75?"good":n>=50?"average":"poor"},ae=()=>{if(!r)return null;const t=r.submissionDate?new Date(r.submissionDate).toLocaleString("en-US",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:!0}):"Not available";return e.createElement("div",{className:"coursework-modal-overlay"},e.createElement("div",{className:"coursework-modal"},e.createElement("div",{className:"coursework-modal-header"},e.createElement("h3",null,"📊 Assignment Results"),e.createElement("button",{className:"coursework-modal-close",onClick:()=>$(!1)},"×")),e.createElement("div",{className:"coursework-modal-body"},e.createElement("div",{className:"coursework-results-card"},e.createElement("h4",null,r.title),e.createElement("p",{className:"coursework-course-info"},r.courseCode," - ",r.courseName),e.createElement("div",{className:"coursework-marks-section"},e.createElement("div",{className:"coursework-marks-display"},e.createElement("span",{className:"coursework-marks-label"},"Your Score"),e.createElement("span",{className:`coursework-marks-value coursework-marks-${X(r.marks)}`},r.marks||"Not graded")),r.obtainedMarks&&e.createElement("div",{className:"coursework-percentage"},e.createElement("span",{className:"coursework-percentage-label"},"Percentage"),e.createElement("span",{className:"coursework-percentage-value"},Math.round(r.obtainedMarks/r.totalMarks*100),"%"))),e.createElement("div",{className:"coursework-details-grid"},e.createElement("div",{className:"coursework-detail-item"},e.createElement("span",{className:"coursework-detail-label"},"Submission Date:"),e.createElement("span",{className:"coursework-detail-value"},t)),e.createElement("div",{className:"coursework-detail-item"},e.createElement("span",{className:"coursework-detail-label"},"Status:"),e.createElement("span",{className:"coursework-detail-value"},r.status)),e.createElement("div",{className:"coursework-detail-item"},e.createElement("span",{className:"coursework-detail-label"},"Total Marks:"),e.createElement("span",{className:"coursework-detail-value"},r.totalMarks)),e.createElement("div",{className:"coursework-detail-item"},e.createElement("span",{className:"coursework-detail-label"},"Lecturer:"),e.createElement("span",{className:"coursework-detail-value"},r.lecturer))),r.feedback&&e.createElement("div",{className:"coursework-feedback-section"},e.createElement("h5",null,"Feedback from Lecturer"),e.createElement("div",{className:"coursework-feedback-content"},r.feedback)))),e.createElement("div",{className:"coursework-modal-footer"},e.createElement("button",{className:"coursework-btn coursework-btn-primary",onClick:()=>$(!1)},"Close"))))},oe=()=>r?e.createElement("div",{className:"coursework-modal-overlay"},e.createElement("div",{className:"coursework-modal coursework-modal-large"},e.createElement("div",{className:"coursework-modal-header"},e.createElement("h3",null,"📁 Assignment Files"),e.createElement("button",{className:"coursework-modal-close",onClick:()=>j(!1)},"×")),e.createElement("div",{className:"coursework-modal-body"},e.createElement("div",{className:"coursework-assignment-info"},e.createElement("h4",null,r.title),e.createElement("p",{className:"coursework-course-info"},r.courseCode," - ",r.courseName),e.createElement("p",{className:"coursework-files-count"},"Total Files: ",r.assignment_files?.length||0)),e.createElement("div",{className:"coursework-files-grid"},r.assignment_files?.map((t,c)=>{if(!t)return null;const s=t.split("/").pop()||`assignment_file_${c+1}`,n=s.split(".").pop().toLowerCase(),i=n==="pdf",w=["jpg","jpeg","png","gif","bmp","webp"].includes(n),p=["doc","docx","txt","rtf"].includes(n);let g="📄",m="File";return i&&(g="📕",m="PDF Document"),w&&(g="🖼️",m="Image"),p&&(g="📝",m="Document"),e.createElement("div",{key:c,className:`coursework-file-card ${i?"coursework-pdf-file":""}`},e.createElement("div",{className:"coursework-file-icon"},g),e.createElement("div",{className:"coursework-file-info"},e.createElement("div",{className:"coursework-file-name"},s),e.createElement("div",{className:"coursework-file-meta"},e.createElement("span",{className:"coursework-file-type"},m),e.createElement("span",{className:"coursework-file-extension"},n.toUpperCase()))),e.createElement("div",{className:"coursework-file-actions"},e.createElement("button",{className:"coursework-btn-preview",onClick:()=>window.open(t,"_blank")},"Preview"),e.createElement("button",{className:"coursework-btn-download",onClick:()=>f(r,t)},"Download")))}))),e.createElement("div",{className:"coursework-modal-footer"},e.createElement("button",{className:"coursework-btn coursework-btn-secondary",onClick:()=>j(!1)},"Close")))):null,se=()=>r?e.createElement("div",{className:"coursework-modal-overlay"},e.createElement("div",{className:"coursework-modal"},e.createElement("div",{className:"coursework-modal-header"},e.createElement("h3",null,"📋 Assignment Details"),e.createElement("button",{className:"coursework-modal-close",onClick:()=>D(!1)},"×")),e.createElement("div",{className:"coursework-modal-body"},e.createElement("div",{className:"coursework-assignment-header"},e.createElement("h4",null,r.title),e.createElement("div",{className:"coursework-assignment-meta"},e.createElement("span",{className:"coursework-meta-item"},e.createElement("strong",null,"Course:")," ",r.courseCode," - ",r.courseName),e.createElement("span",{className:"coursework-meta-item"},e.createElement("strong",null,"Due Date:")," ",r.dueDate),e.createElement("span",{className:"coursework-meta-item"},e.createElement("strong",null,"Total Marks:")," ",r.totalMarks),r.lecturer&&e.createElement("span",{className:"coursework-meta-item"},e.createElement("strong",null,"Lecturer:")," ",r.lecturer))),r.description&&e.createElement("div",{className:"coursework-description-section"},e.createElement("h5",null,"Description"),e.createElement("div",{className:"coursework-description-content"},r.description)),r.instructions&&e.createElement("div",{className:"coursework-instructions-section"},e.createElement("h5",null,"Instructions"),e.createElement("div",{className:"coursework-instructions-content"},r.instructions)),r.assignment_files&&r.assignment_files.length>0&&e.createElement("div",{className:"coursework-attached-files"},e.createElement("h5",null,"📦 Assignment Files"),e.createElement("div",{className:"coursework-files-list"},r.assignment_files.slice(0,3).map((t,c)=>{if(!t)return null;const s=t.split("/").pop()||`file_${c+1}`;return e.createElement("div",{key:c,className:"coursework-file-item-small"},e.createElement("span",{className:"coursework-file-name"},s),e.createElement("button",{className:"coursework-download-btn-small",onClick:()=>f(r,t)},"Download"))}),r.assignment_files.length>3&&e.createElement("div",{className:"coursework-more-files"},"+ ",r.assignment_files.length-3," more files in lecturerbucket")))),e.createElement("div",{className:"coursework-modal-footer"},r.main_assignment_file&&e.createElement("button",{className:"coursework-btn coursework-btn-primary",onClick:()=>f(r)},e.createElement("i",{className:"fas fa-download"})," Download Assignment"),r.assignment_files&&r.assignment_files.length>1&&e.createElement("button",{className:"coursework-btn coursework-btn-secondary",onClick:()=>{D(!1),setTimeout(()=>A(r),100)}},e.createElement("i",{className:"fas fa-eye"})," View All Files"),e.createElement("button",{className:"coursework-btn coursework-btn-tertiary",onClick:()=>D(!1)},"Close")))):null,ne=()=>I||W?null:e.createElement("div",{className:"coursework-modal-overlay"},e.createElement("div",{className:"coursework-modal coursework-modal-large"},e.createElement("div",{className:"coursework-modal-body"},e.createElement("div",{className:"coursework-payment-required"},e.createElement("h4",null,"Assignment Access Requires 50% Tuition Payment"),e.createElement("div",{className:"payment-requirements"},e.createElement("div",{className:"requirement-item requirement-not-met"},e.createElement("i",{className:"fas fa-times-circle"}),e.createElement("span",null,"Minimum 50% of tuition fees must be paid")),e.createElement("div",{className:"requirement-item"},e.createElement("i",{className:"fas fa-exclamation-triangle"}),e.createElement("span",null,"This is a mandatory requirement to access course assignments"))),z&&e.createElement("div",{className:"payment-details"},e.createElement("h5",null,"Your Payment Status"),e.createElement("div",{className:"payment-progress"},e.createElement("div",{className:"progress-bar"},e.createElement("div",{className:"progress-fill",style:{width:`${Math.min(z.percentagePaid,100)}%`}})),e.createElement("div",{className:"progress-labels"},e.createElement("span",null,"Current: ",z.percentagePaid,"% paid"),e.createElement("span",null,"Required: 50%"))),e.createElement("div",{className:"payment-instructions"},e.createElement("h6",null,"To Gain Access:"),e.createElement("ol",null,e.createElement("li",null,"Visit the Finance Office or make an online payment"),e.createElement("li",null,"Ensure your payment is recorded in the system"),e.createElement("li",null,"Contact the finance department if you've already paid"),e.createElement("li",null,"Once 50% is paid, assignments will automatically become visible"))),e.createElement("div",{className:"contact-info"},e.createElement("p",null,e.createElement("strong",null,"Finance Office:")," finance@nleuniversity.com"),e.createElement("p",null,e.createElement("strong",null,"Phone:")," +(256) 765673373")))))));return W?e.createElement("div",{className:"coursework-page"},e.createElement("div",{className:"cw-header"},e.createElement("h2",null,"Course Work"),e.createElement("div",{className:"cw-date-display"},"Checking assignment access...")),e.createElement("div",{className:"coursework-loading-spinner"})):I?L?e.createElement("div",{className:"coursework-page"},e.createElement("div",{className:"cw-header"},e.createElement("h2",null,"Course Work"),e.createElement("div",{className:"cw-date-display"},"Loading assignments...")),e.createElement("div",{className:"coursework-loading-spinner"})):e.createElement("div",{className:"coursework-page"},e.createElement("div",{className:"cw-header"},e.createElement("h2",null,"Course Work"),e.createElement("div",{className:"cw-date-display"},l.length," assignment",l.length!==1?"s":""," available",e.createElement("span",{className:"access-badge"},e.createElement("i",{className:"fas fa-check-circle"})," Access Granted"))),e.createElement("div",{className:"cw-grid"},l.length===0?e.createElement("div",{className:"cw-no-assignments"},e.createElement("p",null,"No assignments available at the moment."),e.createElement("button",{onClick:b,className:"cw-refresh-btn"},"🔄 Refresh Assignments")):l.map(t=>{const c=X(t.marks),s=t.isSubmitted,n=t.assignment_files?.length>0,i=!!t.main_assignment_file;return e.createElement("div",{key:t.id,className:"cw-card"},e.createElement("div",{className:"cw-card-info"},e.createElement("div",{className:"cw-course-code"},t.courseCode,e.createElement("span",{className:"cw-department-badge"},t.courseDepartment)),e.createElement("h3",{className:"cw-card-title"},t.title),e.createElement("p",{className:"cw-card-description"},t.description),e.createElement("div",{className:"cw-card-dates"},e.createElement("div",{className:"cw-date-item"},e.createElement("i",{className:"fas fa-calendar-check"}),e.createElement("span",null,"Assigned: ",t.assignedDate)),e.createElement("div",{className:"cw-date-item"},e.createElement("i",{className:`fas fa-calendar-times ${t.isPastDue?"past-due":""}`}),e.createElement("span",{className:t.isPastDue?"past-due-text":""},"Due: ",t.dueDate),t.isPastDue&&!s&&e.createElement("span",{className:"cw-late-badge"},"Past Due"))),e.createElement("div",{className:"cw-card-status"},e.createElement("i",{className:`fas fa-${s?"check-circle":"times-circle"}`,style:{color:s?"#4CAF50":"#F44336"}}),e.createElement("span",{style:{color:s?"#4CAF50":"#F44336"}},s?t.status==="late"?"Submitted Late":"Submitted":"Not Submitted"),t.lecturer&&e.createElement("span",{className:"cw-card-lecturer"},e.createElement("i",{className:"fas fa-chalkboard-teacher"})," ",t.lecturer))),e.createElement("div",{className:"cw-card-marks"},e.createElement("div",{className:`cw-marks-display cw-marks-${c}`},t.marks||(s?e.createElement("i",{className:"fas fa-hourglass-half",style:{color:"#666"}}):e.createElement("i",{className:"fas fa-book-open"}))),s?e.createElement("div",{className:"cw-submission-actions"},t.fileUrls?.length>0&&e.createElement("button",{className:"cw-btn cw-btn-view",onClick:()=>E(t)},e.createElement("i",{className:"fas fa-download"})," My Submission"),t.isGraded?e.createElement("button",{className:"cw-btn cw-btn-results",onClick:()=>y(t)},e.createElement("i",{className:"fas fa-chart-bar"})," View Results"):e.createElement("button",{className:"cw-btn cw-btn-submitted"},e.createElement("i",{className:"fas fa-check"})," Submitted")):e.createElement("div",{className:"cw-submission-actions"},i?e.createElement(e.Fragment,null,e.createElement("button",{className:"cw-btn cw-btn-download-pdf",onClick:()=>f(t),title:"Download the assignment PDF file from lecturerbucket"},e.createElement("i",{className:"fas fa-download"})," Download Assignment"),e.createElement("button",{className:"cw-btn cw-btn-view-details",onClick:()=>M(t)},e.createElement("i",{className:"fas fa-info-circle"})," View Details")):n?e.createElement(e.Fragment,null,e.createElement("button",{className:"cw-btn cw-btn-view-files",onClick:()=>A(t)},e.createElement("i",{className:"fas fa-eye"})," View Files"),e.createElement("button",{className:"cw-btn cw-btn-view-details",onClick:()=>M(t)},e.createElement("i",{className:"fas fa-info-circle"})," View Details")):e.createElement("button",{className:"cw-btn cw-btn-view-details",onClick:()=>M(t)},e.createElement("i",{className:"fas fa-info-circle"})," View Assignment"),t.canSubmit?e.createElement("button",{className:"cw-btn cw-btn-submit",onClick:()=>F(t)},e.createElement("i",{className:"fas fa-upload"})," Submit Work"):e.createElement("button",{className:"cw-btn cw-btn-late",disabled:!0},e.createElement("i",{className:"fas fa-clock"})," Too Late to Submit"))))})),S&&r&&e.createElement(me,{assignment:r,studentId:B,onClose:()=>{O(!1),x(null)},onSubmitSuccess:b}),h&&r&&e.createElement(ae,null),C&&r&&e.createElement(oe,null),_&&r&&e.createElement(se,null),e.createElement("style",{jsx:!0},`
        .access-badge {
          margin-left: 12px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        
        .access-badge i {
          font-size: 10px;
        }
      `),e.createElement("style",{jsx:!0},`
        /* =================== COURSEWORK PAGE STYLES =================== */
        .coursework-page {
          padding: 20px;
          width: 100%;
          box-sizing: border-box;
          flex: 1;
          overflow-x: hidden;
          background: #f8fafc;
          min-height: 100vh;
        }

        .cw-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 15px;
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .cw-header h2 {
          font-size: 24px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .cw-date-display {
          color: #64748b;
          font-size: 14px;
          background: #f1f5f9;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 500;
          display: flex;
          align-items: center;
        }

        .cw-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 20px;
          width: 100%;
        }

        /* =================== CARD STYLES =================== */
        .cw-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          transition: all 0.3s ease;
          min-height: 320px;
          position: relative;
          overflow: hidden;
        }

        .cw-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
          border-color: #cbd5e1;
        }

        .cw-card-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cw-course-code {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          align-self: flex-start;
          margin-bottom: 8px;
        }

        .cw-department-badge {
          margin-left: 8px;
          font-size: 10px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }

        .cw-card-title {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          line-height: 1.4;
        }

        .cw-card-description {
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
          margin: 0;
          flex-grow: 1;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 4.8em;
        }

        .cw-card-dates {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin: 12px 0;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .cw-date-item {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #475569;
          font-size: 13px;
        }

        .cw-date-item i {
          width: 16px;
          text-align: center;
          color: #64748b;
        }

        .cw-late-badge {
          background: #ef4444;
          color: white;
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 12px;
          margin-left: 8px;
          font-weight: 600;
          letter-spacing: 0.3px;
        }

        .past-due, .past-due-text {
          color: #ef4444 !important;
          font-weight: 600;
        }

        /* =================== FILE ATTACHMENT STYLES =================== */
        .cw-assignment-files-info {
          margin: 10px 0;
        }

        .cw-main-pdf-file {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: #1e40af;
          padding: 12px;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          border-radius: 8px;
          border: 1px solid #bfdbfe;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cw-main-pdf-file:hover {
          background: linear-gradient(135deg, #bfdbfe, #dbeafe);
          transform: translateY(-1px);
        }

        .cw-main-pdf-file i {
          color: #ef4444;
          font-size: 18px;
        }

        .cw-files-attached {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: #475569;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cw-files-attached.clickable:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #334155;
          transform: translateY(-1px);
        }

        .cw-files-attached i {
          color: #3b82f6;
        }

        .cw-files-attached .fa-external-link-alt {
          margin-left: auto;
          font-size: 12px;
          color: #64748b;
        }

        /* =================== STATUS STYLES =================== */
        .cw-card-status {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          margin-top: 16px;
          flex-wrap: wrap;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .cw-card-lecturer {
          margin-left: auto;
          color: #64748b;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cw-card-lecturer i {
          color: #8b5cf6;
        }

        /* =================== MARKS SECTION =================== */
        .cw-card-marks {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          border-top: 2px solid #e2e8f0;
          padding-top: 20px;
          gap: 12px;
        }

        .cw-marks-display {
          font-weight: 700;
          font-size: 18px;
          padding: 12px;
          border-radius: 8px;
          text-align: center;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .cw-marks-excellent { 
          background: linear-gradient(135deg, #d1fae5, #a7f3d0);
          color: #065f46;
          border: 2px solid #34d399;
        }

        .cw-marks-good { 
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #92400e;
          border: 2px solid #f59e0b;
        }

        .cw-marks-average { 
          background: linear-gradient(135deg, #fed7aa, #fdba74);
          color: #9a3412;
          border: 2px solid #f97316;
        }

        .cw-marks-poor { 
          background: linear-gradient(135deg, #fecaca, #fca5a5);
          color: #991b1b;
          border: 2px solid #ef4444;
        }

        /* =================== BUTTON STYLES =================== */
        .cw-submission-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }

        .cw-btn {
          padding: 12px 18px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          
        }

        .cw-btn i {
          font-size: 14px;
        }

        .cw-btn-download-pdf {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }
        .cw-btn-download-pdf:hover { 
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .cw-btn-view-files {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
        }
        .cw-btn-view-files:hover { 
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .cw-btn-view-details {
          background: linear-gradient(135deg, #64748b, #475569);
          color: white;
        }
        .cw-btn-view-details:hover { 
          background: linear-gradient(135deg, #475569, #334155);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(100, 116, 139, 0.3);
        }

        .cw-btn-view {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          display: none;
        }
        .cw-btn-view:hover { 
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .cw-btn-submit {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }
        .cw-btn-submit:hover { 
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .cw-btn-results {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
        }
        .cw-btn-results:hover { 
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .cw-btn-submitted {
          background: #94a3b8;
          color: white;
          cursor: default;
          opacity: 0.8;
        }

        .cw-btn-late {
          background: #f1f5f9;
          color: #64748b;
          cursor: not-allowed;
          border: 1px solid #cbd5e1;
        }

        .cw-refresh-btn {
          margin-top: 15px;
          padding: 10px 20px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: 600;
        }

        .cw-refresh-btn:hover {
          background: #1976d2;
          transform: translateY(-1px);
        }

        /* =================== LOADING & NO DATA =================== */
        .cw-no-assignments {
          grid-column: 1 / -1;
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
          font-size: 16px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

      .coursework-loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f1f5f9;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: coursework-spin 1s linear infinite;
  margin: 40px auto;
}

/* Add a unique animation name to avoid conflicts */
@keyframes coursework-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

        /* =================== MODAL STYLES =================== */
        .coursework-modal-overlay {
          position: fixed;
          top: 30px;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(15, 23, 42, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
          backdrop-filter: blur(4px);
        }

        .coursework-modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 520px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: modalSlideIn 0.3s ease;
          border: 1px solid #e2e8f0;
        }

        .coursework-modal-large {
          max-width: 720px;
        }

        .coursework-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          background: white;
          z-index: 1;
          border-radius: 16px 16px 0 0;
        }

        .coursework-modal-header h3 {
          margin: 0;
          font-size: 20px;
          color: #1e293b;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .coursework-modal-close {
          background: #f1f5f9;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #64748b;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .coursework-modal-close:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .coursework-modal-body {
          padding: 24px;
        }

        .coursework-modal-footer {
          padding: 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: #f8fafc;
          border-radius: 0 0 16px 16px;
        }

        /* =================== MODAL BUTTON STYLES =================== */
        .coursework-btn {
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 120px;
        }

        .coursework-btn i {
          font-size: 14px;
        }

        .coursework-btn-primary {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
        }
        .coursework-btn-primary:hover {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .coursework-btn-secondary {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }
        .coursework-btn-secondary:hover {
          background: #e2e8f0;
          transform: translateY(-2px);
        }

        .coursework-btn-tertiary {
          background: transparent;
          color: #64748b;
          border: 1px solid #cbd5e1;
        }
        .coursework-btn-tertiary:hover {
          background: #f1f5f9;
          transform: translateY(-2px);
        }

        /* =================== RESULTS MODAL =================== */
        .coursework-results-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #e2e8f0;
        }

        .coursework-results-card h4 {
          margin: 0 0 8px 0;
          color: #1e293b;
          font-size: 18px;
          font-weight: 700;
        }

        .coursework-course-info {
          color: #64748b;
          font-size: 14px;
          margin: 0 0 24px 0;
        }

        .coursework-marks-section {
          display: flex;
          align-items: center;
          gap: 24px;
          margin: 24px 0;
          padding: 24px;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-radius: 12px;
        }

        .coursework-marks-display {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .coursework-marks-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
        }

        .coursework-marks-value {
          font-size: 28px;
          font-weight: 800;
          color: #1e293b;
        }

        .coursework-percentage {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .coursework-percentage-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
        }

        .coursework-percentage-value {
          font-size: 28px;
          font-weight: 800;
          color: #3b82f6;
        }

        .coursework-details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin: 24px 0;
        }

        .coursework-detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .coursework-detail-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .coursework-detail-value {
          font-size: 14px;
          color: #1e293b;
          font-weight: 600;
        }

        .coursework-feedback-section {
          margin: 24px 0;
          padding: 20px;
          background: #f0f9ff;
          border-radius: 12px;
          border: 1px solid #bae6fd;
        }

        .coursework-feedback-section h5 {
          margin: 0 0 12px 0;
          color: #0369a1;
          font-size: 16px;
          font-weight: 700;
        }

        .coursework-feedback-content {
          color: #0c4a6e;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-line;
        }

        .coursework-submitted-files {
          margin: 24px 0;
        }

        .coursework-submitted-files h5 {
          margin: 0 0 16px 0;
          color: #1e293b;
          font-size: 16px;
          font-weight: 700;
        }

        .coursework-files-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .coursework-file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .coursework-file-name {
          font-size: 14px;
          color: #475569;
          font-weight: 500;
        }

        .coursework-download-btn {
          padding: 6px 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .coursework-download-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        /* =================== FILES MODAL =================== */
        .coursework-assignment-info {
          margin-bottom: 24px;
        }

        .coursework-assignment-info h4 {
          margin: 0 0 8px 0;
          color: #1e293b;
          font-size: 20px;
          font-weight: 700;
        }

        .coursework-files-count {
          color: #64748b;
          font-size: 14px;
          margin: 8px 0;
        }

        .coursework-files-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .coursework-file-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .coursework-file-card:hover {
          border-color: #cbd5e1;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .coursework-pdf-file {
          background: linear-gradient(135deg, #fef2f2, #fee2e2);
          border-color: #fecaca;
        }

        .coursework-file-icon {
          font-size: 24px;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          border-radius: 10px;
        }

        .coursework-file-info {
          flex: 1;
        }

        .coursework-file-name {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
          word-break: break-all;
        }

        .coursework-file-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .coursework-file-type {
          font-size: 11px;
          color: #64748b;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .coursework-file-extension {
          font-size: 11px;
          color: #3b82f6;
          background: #dbeafe;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }

        .coursework-file-actions {
          display: flex;
          gap: 8px;
        }

        .coursework-btn-preview {
          padding: 8px 12px;
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .coursework-btn-preview:hover {
          background: #e2e8f0;
        }

        .coursework-btn-download {
          padding: 8px 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .coursework-btn-download:hover {
          background: #2563eb;
        }

        /* =================== DETAILS MODAL =================== */
        .coursework-assignment-header {
          margin-bottom: 24px;
        }

        .coursework-assignment-header h4 {
          margin: 0 0 16px 0;
          color: #1e293b;
          font-size: 22px;
          font-weight: 800;
        }

        .coursework-assignment-meta {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .coursework-meta-item {
          font-size: 14px;
          color: #475569;
        }

        .coursework-meta-item strong {
          color: #334155;
          margin-right: 6px;
        }

        .coursework-description-section,
        .coursework-instructions-section {
          margin: 24px 0;
        }

        .coursework-description-section h5,
        .coursework-instructions-section h5 {
          margin: 0 0 12px 0;
          color: #1e293b;
          font-size: 16px;
          font-weight: 700;
        }

        .coursework-description-content,
        .coursework-instructions-content {
          color: #475569;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-line;
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .coursework-attached-files {
          margin: 24px 0;
        }

        .coursework-attached-files h5 {
          margin: 0 0 16px 0;
          color: #1e293b;
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .coursework-file-item-small {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-bottom: 8px;
        }

        .coursework-download-btn-small {
          padding: 6px 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .coursework-download-btn-small:hover {
          background: #2563eb;
        }

        .coursework-more-files {
          color: #64748b;
          font-size: 13px;
          font-style: italic;
          margin-top: 8px;
          padding-left: 14px;
        }

        /* =================== ANIMATIONS =================== */

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* =================== RESPONSIVE STYLES =================== */
        @media (max-width: 1024px) {
          .cw-grid {
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 16px;
          }
        }

        @media (max-width: 768px) {
          .cw-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .cw-grid {
            grid-template-columns: 1fr;
          }
          
          .coursework-modal {
            max-width: 95%;
            margin: 0 auto;
          }
          
          .coursework-details-grid {
            grid-template-columns: 1fr;
          }
          
          .coursework-files-grid {
            grid-template-columns: 1fr;
          }
          
          .coursework-modal-footer {
            flex-direction: column;
          }
          
          .coursework-btn {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .coursework-page {
            padding: 12px;
          }
          
          .cw-header {
            padding: 16px;
          }
          
          .cw-header h2 {
            font-size: 20px;
          }
          
          .cw-card {
            padding: 16px;
            min-height: 280px;
          }
          
          .cw-card-title {
            font-size: 16px;
          }
          
          .cw-btn {
            padding: 10px 14px;
            font-size: 13px;
          }
          
          .coursework-modal {
            max-height: 90vh;
          }
          
          .coursework-modal-header,
          .coursework-modal-body,
          .coursework-modal-footer {
            padding: 16px;
          }
        }
      `)):e.createElement("div",{className:"coursework-page"},e.createElement("div",{className:"cw-header"},e.createElement("h2",null,"Course Work"),e.createElement("div",{className:"cw-date-display"},"Assignment Access Restricted")),e.createElement("div",{className:"cw-no-access"},e.createElement("div",{className:"no-access-card"},e.createElement("div",{className:"no-access-icon"},e.createElement("i",{className:"fas fa-lock"})),e.createElement("h3",null,"Assignment Access Restricted"),e.createElement("p",{className:"no-access-message"},"You need to pay at least 50% of your tuition fees to access assignments."),z&&e.createElement("div",{className:"access-details"},e.createElement("div",{className:"payment-status"},e.createElement("div",{className:"status-label"},"Current Payment Status:"),e.createElement("div",{className:`status-value ${z.percentagePaid>=50?"paid":"unpaid"}`},z.percentagePaid,"% paid")),e.createElement("div",{className:"progress-container"},e.createElement("div",{className:"progress-bar-large"},e.createElement("div",{className:"progress-fill-large",style:{width:`${Math.min(z.percentagePaid,100)}%`}})),e.createElement("div",{className:"progress-required"},e.createElement("span",{className:"required-marker",style:{left:"50%"}},"50% Required"))),e.createElement("div",{className:"contact-support"},e.createElement("p",null,"If you've already paid, please contact the Finance Office:"),e.createElement("p",null,e.createElement("strong",null,"Email:")," finance@nleuniversity.com ",e.createElement("strong",null,"Phone:")," +(256) 765673373"))))),e.createElement(ne,null),e.createElement("style",{jsx:!0},`
          .cw-no-access {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 60vh;
            padding: 40px 20px;
          }
          
          .no-access-card {
            background: white;
            border-radius: 16px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            width: 100%;
            border: 1px solid #e2e8f0;
          }
          
          .no-access-icon {
            font-size: 64px;
            color: #ef4444;
            margin-bottom: 20px;
          }
          
          .no-access-card h3 {
            font-size: 24px;
            color: #1e293b;
            margin-bottom: 16px;
            font-weight: 700;
          }
          
          .no-access-message {
            color: #64748b;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
          }
          
          .access-details {
            text-align: left;
          }
          
          .payment-status {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding: 16px;
            background: #f8fafc;
            border-radius: 8px;
          }
          
          .status-label {
            font-weight: 600;
            color: #475569;
          }
          
          .status-value {
            font-weight: 700;
            font-size: 18px;
          }
          
          .status-value.paid {
            color: #10b981;
          }
          
          .status-value.unpaid {
            color: #ef4444;
          }
          
          .progress-container {
            margin: 30px 0;
          }
          
          .progress-bar-large {
            height: 20px;
            background: #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 10px;
          }
          
          .progress-fill-large {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #1d4ed8);
            transition: width 0.3s ease;
          }
          
          .progress-required {
            position: relative;
            height: 20px;
          }
          
          .required-marker {
            position: absolute;
            top: 0;
            transform: translateX(-50%);
            color: #ef4444;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
          }
          
          .action-buttons {
            display: flex;
            gap: 12px;
            margin: 30px 0;
          }
          
          .contact-support {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
          }
          
          .contact-support p {
            margin: 8px 0;
          }
          
          .contact-support strong {
            color: #475569;
          }
          
          .coursework-payment-required {
            text-align: center;
          }
          
          .payment-alert-icon {
            font-size: 72px;
            color: #f59e0b;
            margin-bottom: 20px;
          }
          
          .payment-requirements {
            margin: 30px 0;
          }
          
          .requirement-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            margin: 10px 0;
            background: #f8fafc;
            border-radius: 8px;
          }
          
          .requirement-not-met {
            background: #fef2f2;
            color: #dc2626;
          }
          
          .payment-details {
            text-align: left;
            margin-top: 30px;
          }
          
          .payment-progress {
            margin: 20px 0;
          }
          
          .progress-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            font-size: 14px;
            color: #64748b;
          }
          
          .payment-instructions {
            background: #f0f9ff;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          
          .payment-instructions h6 {
            color: #0369a1;
            margin-bottom: 12px;
          }
          
          .payment-instructions ol {
            padding-left: 20px;
            margin: 0;
          }
          
          .payment-instructions li {
            margin-bottom: 8px;
          }
          
          .contact-info {
            background: #f1f5f9;
            padding: 16px;
            border-radius: 8px;
            font-size: 14px;
          }
          
          @media (max-width: 768px) {
            .no-access-card {
              padding: 24px;
            }
            
            .action-buttons {
              flex-direction: column;
            }
          }
        `))};export{be as default};
