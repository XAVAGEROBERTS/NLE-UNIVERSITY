import{b as ie,u as le,r as b,R as e,s as i}from"./index-tPt1CnYW.js";const ge=()=>{const{user:y,signOut:V,loading:M,changePassword:ce}=ie(),U=le(),[Z,B]=b.useState(!0),[l,H]=b.useState(null),[G,I]=b.useState(null),[N,K]=b.useState({totalCourses:0,completedCourses:0,currentCGPA:0,pendingAssignments:0,upcomingExams:0}),[m,q]=b.useState({phone:"",address:"",city:"",country:"Uganda",emergency_contact_name:"",emergency_contact_phone:""}),[u,T]=b.useState({currentPassword:"",newPassword:"",confirmPassword:""}),[F,O]=b.useState({current:!1,new:!1,confirm:!1}),[v,W]=b.useState(!1),[_,J]=b.useState(!1),[Y,A]=b.useState({type:"",text:""}),[$,C]=b.useState({type:"",text:""});b.useEffect(()=>{!M&&!y&&U("/login")},[M,y,U]);const L=s=>s&&{"A+":5,A:5,"B+":4.5,B:4,"C+":3.5,C:3,"D+":2.5,D:2,F:0}[s.toUpperCase()]||0,Q=s=>{if(!s&&s!==0)return null;const t=parseFloat(s);return isNaN(t)?null:t>=90?"A+":t>=80?"A":t>=75?"B+":t>=70?"B":t>=65?"C+":t>=60?"C":t>=55?"D+":t>=50?"D":"F"},ee=async s=>{console.log("🔢 Starting CGPA calculation for student:",s);let t=0,n=0;try{console.log("📋 Checking student_courses table...");const{data:a,error:r}=await i.from("student_courses").select("grade, grade_points, marks, course_id").eq("student_id",s).not("grade","is",null);if(!r&&a&&a.length>0){console.log(`✅ Found ${a.length} courses with grades in student_courses`);const o=a.map(p=>p.course_id),{data:P,error:k}=await i.from("courses").select("id, credits").in("id",o);if(!k&&P){const p={};P.forEach(f=>{p[f.id]=f.credits||3}),a.forEach(f=>{const g=f.grade,c=f.grade_points||L(g),x=p[f.course_id]||3;g&&c&&x&&(t+=c*x,n+=x,console.log(`📚 Course: ${g} (${c}) × ${x} credits`))})}}else console.log("📭 No grades found in student_courses table");if(n===0){console.log("📝 Checking exam_submissions table...");const{data:o,error:P}=await i.from("exam_submissions").select("grade, grade_points, total_marks_obtained, exam_id").eq("student_id",s).eq("status","graded");if(!P&&o&&o.length>0){console.log(`✅ Found ${o.length} graded exam submissions`);const k=o.map(g=>g.exam_id),{data:p,error:f}=await i.from("examinations").select("id, course_id").in("id",k);if(!f&&p){const g=p.map(w=>w.course_id),{data:c,error:x}=await i.from("courses").select("id, credits").in("id",g);if(!x&&c){const w={};p.forEach(h=>{w[h.id]=h.course_id});const E={};c.forEach(h=>{E[h.id]=h.credits||3}),o.forEach(h=>{const d=h.grade||Q(h.total_marks_obtained);if(!d)return;const S=h.grade_points||L(d),j=w[h.exam_id],z=E[j]||3;S&&z&&(t+=S*z,n+=z,console.log(`📝 Exam: ${d} (${S}) × ${z} credits`))})}}}else console.log("📭 No graded exam submissions found")}if(n===0){console.log("📊 Checking for marks in student_courses...");const{data:o,error:P}=await i.from("student_courses").select("marks, course_id").eq("student_id",s).not("marks","is",null);if(!P&&o&&o.length>0){console.log(`✅ Found ${o.length} courses with marks`);const k=o.map(g=>g.course_id),{data:p,error:f}=await i.from("courses").select("id, credits").in("id",k);if(!f&&p){const g={};p.forEach(c=>{g[c.id]=c.credits||3}),o.forEach(c=>{const x=Q(c.marks);if(!x)return;const w=L(x),E=g[c.course_id]||3;w&&E&&(t+=w*E,n+=E,console.log(`📊 Marks: ${c.marks}% → ${x} (${w}) × ${E} credits`))})}}}if(n>0){const o=parseFloat((t/n).toFixed(2));return console.log("🎓 CGPA Calculation Summary:"),console.log(`   Total Points: ${t}`),console.log(`   Total Credits: ${n}`),console.log(`   CGPA: ${o}`),o}else return console.log("📭 No academic records found for CGPA calculation"),0}catch(a){return console.error("❌ Error calculating CGPA:",a),0}};b.useEffect(()=>{y&&(async()=>{if(y?.email)try{B(!0),console.log("👤 Fetching student data for email:",y.email);const{data:t,error:n}=await i.from("students").select("*").eq("email",y.email).single();if(n)throw console.error("❌ Student fetch error:",n),n;if(!t)throw new Error("Student not found");console.log("✅ Student data loaded:",t.full_name),H(t),q(a=>({...a,phone:t.phone||""})),console.log("👤 Fetching profile data...");try{const{data:a,error:r}=await i.from("profiles").select("*").eq("user_id",t.id).maybeSingle();r?(console.log("⚠️ Profile fetch issue (may not exist):",r.message),I({user_id:t.id,user_type:"student",address:"",city:"",country:"Uganda",emergency_contact_name:"",emergency_contact_phone:"",notification_preferences:{},theme_preferences:{},privacy_settings:{}})):a?(console.log("✅ Profile data loaded"),I(a),q(o=>({...o,address:a.address||"",city:a.city||"",country:a.country||"Uganda",emergency_contact_name:a.emergency_contact_name||"",emergency_contact_phone:a.emergency_contact_phone||""}))):(console.log("📭 No profile found, creating empty structure"),I({user_id:t.id,user_type:"student",address:"",city:"",country:"Uganda",emergency_contact_name:"",emergency_contact_phone:"",notification_preferences:{},theme_preferences:{},privacy_settings:{}}))}catch(a){console.log("⚠️ Profile fetch failed:",a.message),I({user_id:t.id,user_type:"student",address:"",city:"",country:"Uganda",emergency_contact_name:"",emergency_contact_phone:"",notification_preferences:{},theme_preferences:{},privacy_settings:{}})}console.log("📊 Fetching academic statistics..."),await te(t.id)}catch(t){console.error("❌ Error fetching student data:",t),A({type:"error",text:"Failed to load data: "+t.message})}finally{B(!1)}})()},[y]);const te=async s=>{try{console.log("📈 Starting academic stats fetch for student:",s);const{data:t,error:n}=await i.from("students").select("program_code, year_of_study, semester").eq("id",s).single();if(n)throw console.error("❌ Student info error:",n),n;console.log("✅ Student info loaded:",t);const{data:a,error:r}=await i.from("courses").select("id").eq("program_code",t.program_code).eq("is_active",!0);if(r)throw console.error("❌ Program courses error:",r),r;const o=a?.length||0;console.log(`📚 Total courses in program: ${o}`);const{data:P,error:k}=await i.from("student_courses").select("*").eq("student_id",s);if(k)throw console.error("❌ Enrolled courses error:",k),k;const p=P?.filter(d=>d.status==="completed"||d.status==="passed").length||0;console.log(`✅ Completed courses: ${p}`);const f=P?.filter(d=>d.status!=="completed"&&d.status!=="passed")||[],g=f.length;console.log(`📝 Currently enrolled courses: ${g}`);const c=f.map(d=>d.course_id)||[];console.log("🎓 Calculating CGPA...");const x=await ee(s);console.log(`🎓 Final CGPA: ${x}`);let w=0;if(c.length>0){console.log("📋 Fetching assignments...");const{data:d,error:S}=await i.from("assignments").select("id, course_id").eq("status","published").gt("due_date",new Date().toISOString());S?console.error("❌ Assignments error:",S):d&&(w=d.filter(z=>c.includes(z.course_id)).length,console.log(`📋 Pending assignments: ${w}`))}let E=0;if(c.length>0){console.log("📝 Fetching exams...");const{data:d,error:S}=await i.from("examinations").select("id, course_id").eq("status","published").gt("start_time",new Date().toISOString());S?console.error("❌ Exams error:",S):d&&(E=d.filter(z=>c.includes(z.course_id)).length,console.log(`📝 Upcoming exams: ${E}`))}const h={totalCourses:o,enrolledCourses:g,completedCourses:p,currentCGPA:x,pendingAssignments:w,upcomingExams:E};console.log("📊 Final academic stats:",h),K(h)}catch(t){console.error("❌ Error fetching academic stats:",t),K({totalCourses:0,enrolledCourses:0,completedCourses:0,currentCGPA:0,pendingAssignments:0,upcomingExams:0})}},D=s=>{const{id:t,value:n}=s.target;q(a=>({...a,[t]:n}))},R=s=>{const{id:t,value:n}=s.target;T(a=>({...a,[t]:n})),$.text&&C({type:"",text:""})},X=s=>{O(t=>({...t,[s]:!t[s]}))},se=async()=>{if(!y?.email||!l?.id){A({type:"error",text:"Please login to save changes"});return}W(!0),A({type:"",text:""});try{if(console.log("💾 Saving profile changes..."),m.phone!==(l?.phone||"")){const{error:r}=await i.from("students").update({phone:m.phone,updated_at:new Date().toISOString()}).eq("id",l.id);if(r)throw r}const s={user_id:l.id,user_type:"student",address:m.address||"",city:m.city||"",country:m.country||"Uganda",emergency_contact_name:m.emergency_contact_name||"",emergency_contact_phone:m.emergency_contact_phone||"",updated_at:new Date().toISOString()};console.log("🔍 Checking if profile exists...");const{data:t,error:n}=await i.from("profiles").select("id").eq("user_id",l.id).maybeSingle();let a;if(n){console.log("⚠️ Profile check error, attempting insert:",n.message),s.created_at=new Date().toISOString();const{error:r}=await i.from("profiles").insert([s]);a=r}else if(t){console.log("✏️ Profile exists, updating...");const{error:r}=await i.from("profiles").update(s).eq("user_id",l.id);a=r}else{console.log("📝 Profile does not exist, inserting new..."),s.created_at=new Date().toISOString();const{error:r}=await i.from("profiles").insert([s]);a=r}if(a)throw console.error("❌ Profile operation error:",a),a;I(r=>({...r,...s})),H(r=>({...r,phone:m.phone})),console.log("✅ Profile saved successfully"),A({type:"success",text:"Profile updated successfully!"}),setTimeout(()=>{A({type:"",text:""})},5e3)}catch(s){console.error("❌ Error updating profile:",s),A({type:"error",text:"Failed to update profile. Please try again."})}finally{W(!1)}},ae=async()=>{if(!u.currentPassword||!u.newPassword||!u.confirmPassword){C({type:"error",text:"All password fields are required"});return}if(u.newPassword.length<6){C({type:"error",text:"New password must be at least 6 characters long"});return}if(u.newPassword!==u.confirmPassword){C({type:"error",text:"New passwords do not match"});return}if(u.currentPassword===u.newPassword){C({type:"error",text:"New password must be different from current password"});return}J(!0),C({type:"",text:""});try{const s=y?.email||l?.email;if(!s)throw new Error("User email not found");const{data:t,error:n}=await i.auth.signInWithPassword({email:s,password:u.currentPassword});if(n)throw console.error("Current password verification failed:",n),new Error("Current password is incorrect");const{error:a}=await i.auth.updateUser({password:u.newPassword});if(a)throw console.error("Password update failed:",a),a;T({currentPassword:"",newPassword:"",confirmPassword:""}),O({current:!1,new:!1,confirm:!1}),C({type:"success",text:"Password changed successfully! You can now use your new password for future logins."})}catch(s){console.error("Error changing password:",s);let t=s.message;(s.message.includes("Current password is incorrect")||s.message.includes("invalid_credentials"))&&(t='Current password is incorrect. Try "Test1234" (default password)'),C({type:"error",text:t})}finally{J(!1)}},ne=()=>{T({currentPassword:"",newPassword:"",confirmPassword:""}),O({current:!1,new:!1,confirm:!1}),C({type:"",text:""})},re=()=>{q({phone:l?.phone||"",address:G?.address||"",city:G?.city||"",country:G?.country||"Uganda",emergency_contact_name:G?.emergency_contact_name||"",emergency_contact_phone:G?.emergency_contact_phone||""})},oe=async()=>{try{await V(),U("/login")}catch(s){console.error("Error logging out:",s),A({type:"error",text:"Failed to logout. Please try again."})}};return M||Z?e.createElement("div",{className:"settings-container"},e.createElement("div",{className:"settings-header"},e.createElement("h2",null,e.createElement("i",{className:"fas fa-cog"})," Settings")),e.createElement("div",{className:"settings-loading-container"},e.createElement("div",{className:"settings-spinner"}),e.createElement("p",null,"Loading your profile..."))):y?l?e.createElement("div",{className:"settings-container"},e.createElement("div",{className:"settings-header"},e.createElement("div",{className:"settings-header-left"},e.createElement("h2",{className:"settings-title"},e.createElement("i",{className:"fas fa-cog settings-title-icon"}),"Settings & Account"),e.createElement("p",{className:"settings-subtitle"},"Student ID: ",l.student_id," | ",l.program)),e.createElement("button",{className:"settings-logout-button",onClick:oe},e.createElement("i",{className:"fas fa-sign-out-alt"})," Logout")),Y.text&&e.createElement("div",{className:`settings-message-box settings-message-${Y.type}`},e.createElement("i",{className:`fas fa-${Y.type==="success"?"check-circle":"exclamation-circle"}`}),e.createElement("span",null,Y.text)),e.createElement("div",{className:"settings-content"},e.createElement("div",{className:"settings-card"},e.createElement("h3",{className:"settings-card-title"},e.createElement("i",{className:"fas fa-chart-bar settings-card-icon"}),"Academic Overview"),e.createElement("div",{className:"settings-stats-grid"},e.createElement("div",{className:"settings-stat-card"},e.createElement("div",{className:"settings-stat-value"},N.totalCourses),e.createElement("div",{className:"settings-stat-label"},"Total Courses")),e.createElement("div",{className:"settings-stat-card"},e.createElement("div",{className:"settings-stat-value"},N.completedCourses),e.createElement("div",{className:"settings-stat-label"},"Completed Courses")),e.createElement("div",{className:"settings-stat-card"},e.createElement("div",{className:"settings-stat-value"},N.currentCGPA.toFixed(2)),e.createElement("div",{className:"settings-stat-label"},"CGPA")),e.createElement("div",{className:"settings-stat-card"},e.createElement("div",{className:"settings-stat-value"},N.pendingAssignments),e.createElement("div",{className:"settings-stat-label"},"Pending")),e.createElement("div",{className:"settings-stat-card"},e.createElement("div",{className:"settings-stat-value"},N.upcomingExams),e.createElement("div",{className:"settings-stat-label"},"Exams"))),e.createElement("div",{className:`settings-cgpa-status ${N.currentCGPA>=2?"settings-cgpa-good":"settings-cgpa-warning"}`},e.createElement("i",{className:`fas fa-${N.currentCGPA>=2?"graduation-cap":"exclamation-triangle"}`}),e.createElement("span",null,N.currentCGPA>=2?"Your CGPA is in good standing!":N.currentCGPA>0?"Your CGPA needs improvement. Focus on upcoming assignments and exams.":"No academic records found. CGPA will update when you complete courses."))),e.createElement("div",{className:"settings-card"},e.createElement("h3",{className:"settings-card-title"},e.createElement("i",{className:"fas fa-user settings-card-icon"}),"Profile Information"),e.createElement("div",{className:"settings-profile-section"},e.createElement("div",{className:"settings-avatar-container"},e.createElement("div",{className:"settings-avatar"},e.createElement("i",{className:"fas fa-user-graduate settings-avatar-icon"}))),e.createElement("div",{className:"settings-profile-info"},e.createElement("h4",{className:"settings-profile-name"},l.full_name),e.createElement("div",{className:"settings-info-grid"},e.createElement("div",{className:"settings-info-item"},e.createElement("label",{className:"settings-info-label"},"Email"),e.createElement("div",{className:"settings-info-value"},l.email)),e.createElement("div",{className:"settings-info-item"},e.createElement("label",{className:"settings-info-label"},"Student ID"),e.createElement("div",{className:"settings-info-value"},l.student_id)),e.createElement("div",{className:"settings-info-item"},e.createElement("label",{className:"settings-info-label"},"Program"),e.createElement("div",{className:"settings-info-value"},l.program)),e.createElement("div",{className:"settings-info-item"},e.createElement("label",{className:"settings-info-label"},"Year/Semester"),e.createElement("div",{className:"settings-info-value"},"Year ",l.year_of_study,", Semester ",l.semester)),e.createElement("div",{className:"settings-info-item"},e.createElement("label",{className:"settings-info-label"},"Academic Year"),e.createElement("div",{className:"settings-info-value"},l.academic_year)),e.createElement("div",{className:"settings-info-item"},e.createElement("label",{className:"settings-info-label"},"Intake"),e.createElement("div",{className:"settings-info-value"},l.intake)))))),e.createElement("div",{className:"settings-card"},e.createElement("h3",{className:"settings-card-title"},e.createElement("i",{className:"fas fa-edit settings-card-icon"}),"Update Personal Information"),e.createElement("div",{className:"settings-form"},e.createElement("div",{className:"settings-form-group"},e.createElement("label",{className:"settings-form-label"},"Phone Number"),e.createElement("input",{type:"tel",id:"phone",value:m.phone,onChange:D,placeholder:"+256 XXX XXX XXX",className:"settings-input",disabled:v})),e.createElement("div",{className:"settings-form-group"},e.createElement("label",{className:"settings-form-label"},"Address"),e.createElement("input",{type:"text",id:"address",value:m.address,onChange:D,placeholder:"Enter your residential address",className:"settings-input",disabled:v})),e.createElement("div",{className:"settings-form-group"},e.createElement("label",{className:"settings-form-label"},"City"),e.createElement("input",{type:"text",id:"city",value:m.city,onChange:D,placeholder:"Enter your city",className:"settings-input",disabled:v})),e.createElement("div",{className:"settings-form-group"},e.createElement("label",{className:"settings-form-label"},"Country"),e.createElement("select",{id:"country",value:m.country,onChange:D,className:"settings-input",disabled:v},e.createElement("option",{value:"Uganda"},"Uganda"),e.createElement("option",{value:"Kenya"},"Kenya"),e.createElement("option",{value:"Tanzania"},"Tanzania"),e.createElement("option",{value:"Rwanda"},"Rwanda"),e.createElement("option",{value:"Other"},"Other"))),e.createElement("div",{className:"settings-form-group"},e.createElement("label",{className:"settings-form-label"},"Emergency Contact Name"),e.createElement("input",{type:"text",id:"emergency_contact_name",value:m.emergency_contact_name,onChange:D,placeholder:"Name of emergency contact",className:"settings-input",disabled:v})),e.createElement("div",{className:"settings-form-group"},e.createElement("label",{className:"settings-form-label"},"Emergency Contact Phone"),e.createElement("input",{type:"tel",id:"emergency_contact_phone",value:m.emergency_contact_phone,onChange:D,placeholder:"Emergency contact phone number",className:"settings-input",disabled:v})),e.createElement("div",{className:"settings-form-buttons"},e.createElement("button",{className:"settings-primary-button",onClick:se,disabled:v},v?e.createElement(e.Fragment,null,e.createElement("i",{className:"fas fa-spinner fa-spin"})," Saving..."):e.createElement(e.Fragment,null,e.createElement("i",{className:"fas fa-save"})," Save Changes")),e.createElement("button",{className:"settings-secondary-button",onClick:re,disabled:v},e.createElement("i",{className:"fas fa-undo"})," Reset")))),e.createElement("div",{className:"settings-card"},e.createElement("h3",{className:"settings-card-title"},e.createElement("i",{className:"fas fa-key settings-card-icon"}),"Change Password"),$.text&&e.createElement("div",{className:`settings-message-box settings-message-${$.type}`},e.createElement("i",{className:`fas fa-${$.type==="success"?"check-circle":$.type==="warning"?"exclamation-triangle":"exclamation-circle"}`}),e.createElement("span",null,$.text)),e.createElement("div",{className:"settings-form"},e.createElement("div",{className:"settings-form-group"},e.createElement("label",{className:"settings-form-label"},"Current Password"),e.createElement("div",{className:"settings-password-input-wrapper"},e.createElement("input",{type:F.current?"text":"password",id:"currentPassword",value:u.currentPassword,onChange:R,placeholder:"Enter your current password",className:"settings-password-input",disabled:_,autoComplete:"current-password"}),e.createElement("button",{type:"button",className:"settings-show-password-button",onClick:()=>X("current"),disabled:_},e.createElement("i",{className:`fas fa-${F.current?"eye-slash":"eye"}`}))),e.createElement("div",{className:"settings-password-hint"},e.createElement("i",{className:"fas fa-info-circle"}),e.createElement("span",null,"Default password: Test1234"))),e.createElement("div",{className:"settings-form-group"},e.createElement("label",{className:"settings-form-label"},"New Password"),e.createElement("div",{className:"settings-password-input-wrapper"},e.createElement("input",{type:F.new?"text":"password",id:"newPassword",value:u.newPassword,onChange:R,placeholder:"Enter new password (min. 6 characters)",className:"settings-password-input",disabled:_,autoComplete:"new-password"}),e.createElement("button",{type:"button",className:"settings-show-password-button",onClick:()=>X("new"),disabled:_},e.createElement("i",{className:`fas fa-${F.new?"eye-slash":"eye"}`}))),e.createElement("div",{className:"settings-password-hint"},e.createElement("i",{className:"fas fa-info-circle"}),e.createElement("span",null,"Password must be at least 6 characters long"))),e.createElement("div",{className:"settings-form-group"},e.createElement("label",{className:"settings-form-label"},"Confirm New Password"),e.createElement("div",{className:"settings-password-input-wrapper"},e.createElement("input",{type:F.confirm?"text":"password",id:"confirmPassword",value:u.confirmPassword,onChange:R,placeholder:"Confirm your new password",className:"settings-password-input",disabled:_,autoComplete:"new-password"}),e.createElement("button",{type:"button",className:"settings-show-password-button",onClick:()=>X("confirm"),disabled:_},e.createElement("i",{className:`fas fa-${F.confirm?"eye-slash":"eye"}`})))),e.createElement("div",{className:"settings-form-buttons"},e.createElement("button",{className:"settings-danger-button",onClick:ae,disabled:_},_?e.createElement(e.Fragment,null,e.createElement("i",{className:"fas fa-spinner fa-spin"})," Changing..."):e.createElement(e.Fragment,null,e.createElement("i",{className:"fas fa-key"})," Change Password")),e.createElement("button",{className:"settings-secondary-button",onClick:ne,disabled:_},e.createElement("i",{className:"fas fa-times"})," Clear")),e.createElement("div",{className:"settings-security-note"},e.createElement("i",{className:"fas fa-shield-alt"}),e.createElement("div",null,e.createElement("strong",null,"Password Security Tips:"),e.createElement("ul",null,e.createElement("li",null,"Use a mix of uppercase, lowercase, numbers, and symbols"),e.createElement("li",null,"Don't reuse passwords across different sites"),e.createElement("li",null,"Change your password regularly"),e.createElement("li",null,"Never share your password with anyone"))))))),e.createElement("style",{jsx:!0},`
        /* Base Container */
        .settings-container {
          background-color: #f8f9fa;
          min-height: 100vh;
          padding: 20px;
          box-sizing: border-box;
          width: 100%;
          overflow-x: hidden;
        }

        /* Header */
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e9ecef;
        }

        .settings-header-left {
          flex: 1;
          min-width: 250px;
        }

        .settings-title {
          margin: 0 0 5px 0;
          color: #333;
          font-size: 24px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
        }

        .settings-title-icon {
          margin-right: 10px;
          color: #6c757d;
          font-size: 20px;
        }

        .settings-subtitle {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .settings-logout-button {
          padding: 10px 20px;
          background-color: #dc3545;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .settings-logout-button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .settings-logout-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Content */
        .settings-content {
          display: flex;
          flex-direction: column;
          gap: 25px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        /* Card */
        .settings-card {
          background-color: white;
          border-radius: 12px;
          padding: 25px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          border: 1px solid #e9ecef;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .settings-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        }

        .settings-card-title {
          margin: 0 0 20px 0;
          color: #333;
          font-size: 18px;
          display: flex;
          align-items: center;
        }

        .settings-card-icon {
          margin-right: 10px;
          color: #007bff;
          font-size: 16px;
        }

        /* Stats Grid */
        .settings-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .settings-stat-card {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          text-align: center;
          border-left: 4px solid #007bff;
          transition: all 0.2s ease;
        }

        .settings-stat-card:hover {
          background-color: #e9ecef;
          transform: translateY(-2px);
        }

        .settings-stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #007bff;
          margin-bottom: 5px;
        }

        .settings-stat-label {
          font-size: 14px;
          color: #6c757d;
        }

        /* CGPA Status */
        .settings-cgpa-status {
          margin-top: 20px;
          padding: 15px;
          border-radius: 4px;
          font-size: 14px;
          display: flex;
          align-items: center;
        }

        .settings-cgpa-good {
          background-color: #d4edda;
          border-left: 4px solid #28a745;
        }

        .settings-cgpa-warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
        }

        /* Profile Section */
        .settings-profile-section {
          display: flex;
          align-items: flex-start;
          gap: 30px;
        }

        .settings-avatar-container {
          flex-shrink: 0;
        }

        .settings-avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background-color: #e9ecef;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          color: #6c757d;
          transition: all 0.2s ease;
        }

        .settings-avatar:hover {
          background-color: #dee2e6;
          transform: scale(1.05);
        }

        .settings-avatar-icon {
          font-size: 40px;
        }

        .settings-profile-info {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .settings-profile-name {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 22px;
          word-break: break-word;
        }

        .settings-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .settings-info-item {
          margin-bottom: 10px;
        }

        .settings-info-label {
          display: block;
          font-size: 12px;
          color: #6c757d;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .settings-info-value {
          font-size: 14px;
          color: #495057;
          font-weight: 500;
          word-break: break-word;
        }

        /* Form */
        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .settings-form-group {
          margin-bottom: 5px;
        }

        .settings-form-label {
          display: block;
          font-size: 14px;
          color: #495057;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .settings-input {
          width: 100%;
          padding: 12px 15px;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }

        .settings-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0,123,255,.1);
        }

        .settings-input:disabled {
          background-color: #f8f9fa;
          cursor: not-allowed;
        }

        /* Password Input */
        .settings-password-input-wrapper {
          position: relative;
          width: 100%;
        }

        .settings-password-input {
          width: 100%;
          padding: 12px 45px 12px 15px;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }

        .settings-password-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0,123,255,.1);
        }

        .settings-password-input:disabled {
          background-color: #f8f9fa;
          cursor: not-allowed;
        }

        .settings-show-password-button {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6c757d;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: color 0.2s ease;
        }

        .settings-show-password-button:hover {
          color: #007bff;
        }

        .settings-show-password-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Form Buttons */
        .settings-form-buttons {
          display: flex;
          gap: 15px;
          margin-top: 25px;
          flex-wrap: wrap;
        }

        .settings-primary-button,
        .settings-secondary-button,
        .settings-danger-button {
          padding: 14px 28px;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-width: 160px;
          transition: all 0.2s ease;
        }

        .settings-primary-button {
          background-color: #28a745;
        }

        .settings-primary-button:hover:not(:disabled) {
          background-color: #218838;
          transform: translateY(-1px);
        }

        .settings-secondary-button {
          background-color: #6c757d;
          min-width: 120px;
        }

        .settings-secondary-button:hover:not(:disabled) {
          background-color: #5a6268;
          transform: translateY(-1px);
        }

        .settings-danger-button {
          background-color: #dc3545;
          min-width: 180px;
        }

        .settings-danger-button:hover:not(:disabled) {
          background-color: #c82333;
          transform: translateY(-1px);
        }

        .settings-primary-button:disabled,
        .settings-secondary-button:disabled,
        .settings-danger-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Message Box */
        .settings-message-box {
          padding: 16px 20px;
          border-radius: 10px;
          margin-bottom: 25px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          animation: slideDown 0.3s ease;
        }

        .settings-message-success {
          background-color: #d4edda;
          color: #155724;
          border-color: #c3e6cb;
        }

        .settings-message-error {
          background-color: #f8d7da;
          color: #721c24;
          border-color: #f5c6cb;
        }

        .settings-message-warning {
          background-color: #fff3cd;
          color: #856404;
          border-color: #ffeaa7;
        }

        /* Loading State */
        .settings-loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
          text-align: center;
        }

        .settings-spinner {
          width: 50px;
          height: 50px;
          border: 5px solid #f3f3f3;
          border-top: 5px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        /* Error State */
        .settings-error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          margin: 20px 0;
        }

        .settings-error-icon {
          font-size: 64px;
          color: #dc3545;
          margin-bottom: 20px;
        }

        .settings-button {
          padding: 12px 24px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          margin-top: 15px;
          transition: all 0.2s ease;
        }

        .settings-button:hover {
          background-color: #0056b3;
          transform: translateY(-1px);
        }

        /* Password Hint */
        .settings-password-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          font-size: 12px;
          color: #6c757d;
        }

        /* Security Note */
        .settings-security-note {
          margin-top: 25px;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 10px;
          border-left: 4px solid #17a2b8;
          display: flex;
          gap: 15px;
          align-items: flex-start;
        }

        .settings-security-note ul {
          margin: 5px 0 0 0;
          padding-left: 20px;
          font-size: 13px;
          color: #666;
        }

        /* Animations */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive Styles */
        @media (max-width: 768px) {
          .settings-container {
            padding: 15px;
          }
          
          .settings-header {
            flex-direction: column;
            align-items: stretch;
            gap: 15px;
          }
          
          .settings-header-left {
            width: 100%;
          }
          
          .settings-logout-button {
            align-self: flex-end;
            margin-top: 10px;
          }
          
          .settings-card {
            padding: 20px;
          }
          
          .settings-profile-section {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 20px;
          }
          
          .settings-avatar {
            width: 90px;
            height: 90px;
          }
          
          .settings-avatar-icon {
            font-size: 36px;
          }
          
          .settings-profile-name {
            font-size: 20px;
            margin-bottom: 12px;
          }
          
          .settings-info-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
          }
          
          .settings-stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          
          .settings-stat-card {
            padding: 16px;
          }
          
          .settings-stat-value {
            font-size: 24px;
          }
          
          .settings-form-buttons {
            flex-direction: column;
          }
          
          .settings-primary-button,
          .settings-secondary-button,
          .settings-danger-button {
            width: 100%;
            min-width: auto;
            padding: 12px 24px;
          }
          
          .settings-security-note {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 16px;
          }
        }
        
        @media (max-width: 640px) {
          .settings-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .settings-info-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .settings-card {
            padding: 16px;
          }
          
          .settings-title {
            font-size: 22px;
          }
          
          .settings-card-title {
            font-size: 17px;
            margin-bottom: 16px;
          }
        }
        
        @media (max-width: 480px) {
          .settings-container {
            padding: 12px;
          }
          
          .settings-card {
            padding: 14px;
            border-radius: 10px;
          }
          
          .settings-title {
            font-size: 20px;
          }
          
          .settings-title-icon {
            font-size: 18px;
          }
          
          .settings-subtitle {
            font-size: 13px;
          }
          
          .settings-logout-button {
            width: 100%;
            justify-content: center;
            padding: 12px 20px;
          }
          
          .settings-avatar {
            width: 80px;
            height: 80px;
          }
          
          .settings-avatar-icon {
            font-size: 32px;
          }
          
          .settings-profile-name {
            font-size: 18px;
            margin-bottom: 10px;
          }
          
          .settings-stats-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          
          .settings-stat-card {
            padding: 14px;
          }
          
          .settings-stat-value {
            font-size: 22px;
          }
          
          .settings-stat-label {
            font-size: 13px;
          }
          
          .settings-info-label {
            font-size: 11px;
          }
          
          .settings-info-value {
            font-size: 13px;
          }
          
          .settings-input,
          .settings-password-input {
            padding: 10px 12px;
            font-size: 13px;
          }
          
          .settings-password-input {
            padding: 10px 40px 10px 12px;
          }
          
          .settings-show-password-button {
            font-size: 15px;
            right: 10px;
          }
          
          .settings-message-box {
            padding: 14px 16px;
            font-size: 13px;
            margin-bottom: 20px;
          }
          
          .settings-form-label {
            font-size: 13px;
            margin-bottom: 6px;
          }
          
          .settings-password-hint {
            font-size: 11px;
          }
          
          .settings-security-note {
            padding: 14px;
            margin-top: 20px;
          }
          
          .settings-security-note ul {
            font-size: 12px;
            padding-left: 18px;
          }
        }
        
        @media (max-width: 360px) {
          .settings-container {
            padding: 10px;
          }
          
          .settings-card {
            padding: 12px;
          }
          
          .settings-title {
            font-size: 18px;
          }
          
          .settings-card-title {
            font-size: 16px;
            margin-bottom: 14px;
          }
          
          .settings-avatar {
            width: 70px;
            height: 70px;
          }
          
          .settings-avatar-icon {
            font-size: 28px;
          }
        }
      `)):e.createElement("div",{className:"settings-container"},e.createElement("div",{className:"settings-header"},e.createElement("h2",null,e.createElement("i",{className:"fas fa-cog"})," Settings")),e.createElement("div",{className:"settings-error-container"},e.createElement("i",{className:"fas fa-exclamation-circle settings-error-icon"}),e.createElement("h3",null,"No Data Available"),e.createElement("p",null,"Unable to load student information"),e.createElement("button",{className:"settings-button",onClick:()=>window.location.reload()},"Refresh Page"))):e.createElement("div",{className:"settings-container"},e.createElement("div",{className:"settings-header"},e.createElement("h2",null,e.createElement("i",{className:"fas fa-cog"})," Settings")),e.createElement("div",{className:"settings-error-container"},e.createElement("i",{className:"fas fa-exclamation-circle settings-error-icon"}),e.createElement("h3",null,"Not Logged In"),e.createElement("p",null,"Please login to access settings"),e.createElement("button",{className:"settings-button",onClick:()=>U("/login")},"Go to Login")))};export{ge as default};
