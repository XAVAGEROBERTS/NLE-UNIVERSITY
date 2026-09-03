import{u as I,a as O,b as T,r as o,s as j,R as e,O as D}from"./index-tPt1CnYW.js";const U=()=>{const x=I(),h=O(),{user:a,signOut:S,logoutLoading:r}=T(),[i,w]=o.useState(!1),[g,m]=o.useState(!1),[s,l]=o.useState(!1),[d,v]=o.useState(null),[E,u]=o.useState(!0),[p,L]=o.useState(!1),f=o.useRef(null),b=o.useRef(null),y=[{id:"dashboard",label:"Home",icon:"fas fa-home",path:"/dashboard"},{id:"courses",label:"Course Units",icon:"fas fa-book",path:"/courses"},{id:"lectures",label:"Lectures",icon:"fas fa-video",path:"/lectures"},{id:"timetable",label:"My Time Table",icon:"fas fa-calendar-alt",path:"/timetable"},{id:"coursework",label:"Course Work",icon:"fas fa-tasks",path:"/coursework"},{id:"examinations",label:"Examination",icon:"fas fa-clipboard-list",path:"/examinations"},{id:"results",label:"Examination Results",icon:"fas fa-chart-bar",path:"/results"},{id:"finance",label:"Financial Statements",icon:"fas fa-money-bill-wave",path:"/finance"},{id:"tutorials",label:"Tutorials",icon:"fas fa-chalkboard-teacher",path:"/tutorials"},{id:"chatbot",label:"Student Assistant",icon:"fas fa-robot",path:"/chatbot"},{id:"settings",label:"Settings",icon:"fas fa-cog",path:"/settings"}],c=t=>h.pathname===t;o.useEffect(()=>{const t=()=>{const n=window.innerWidth<1024;L(n),n&&w(!0),l(!1)};return t(),window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]);const k=o.useCallback(async()=>{try{if(!a?.email){console.log("No user email found"),u(!1);return}console.log("📊 Fetching detailed student data for:",a.email);const{data:t,error:n}=await j.from("students").select("*").eq("email",a.email).single();if(n){console.error("Error fetching student data:",n),a&&v({full_name:a.name||"Student",student_id:a.studentId||"N/A",program:a.program||"Unknown Program",year_of_study:a.yearOfStudy||1,semester:a.semester||1,phone:a.phone||"",email:a.email||""});return}t&&(console.log("✅ Student data loaded from database:",t.full_name),v(t))}catch(t){console.error("Error in fetchStudentData:",t)}finally{u(!1)}},[a]);o.useEffect(()=>{a&&(u(!0),k())},[a,k]),o.useEffect(()=>{const t=n=>{g&&f.current&&!f.current.contains(n.target)&&(r||m(!1)),s&&b.current&&!b.current.contains(n.target)&&!n.target.closest(".mobile-menu-toggle")&&l(!1)};return document.addEventListener("mousedown",t),()=>{document.removeEventListener("mousedown",t)}},[g,r,s]),o.useEffect(()=>{s&&l(!1)},[h.pathname]);const N=t=>{x(t),p&&l(!1)},z=()=>{m(!0)},R=()=>{l(!s)},C=async()=>{console.log("Starting logout process");try{await S(),m(!1)}catch(t){console.error("Logout error:",t),m(!1)}},M=()=>{r||m(!1)};return r?null:e.createElement(e.Fragment,null,g&&e.createElement("div",{className:"logout-modal-overlay"},e.createElement("div",{ref:f,className:"logout-modal"},e.createElement("div",{className:"logout-modal-header"},e.createElement("div",{className:"university-badge"},e.createElement("img",{src:"/badge.png",alt:"University Badge",onError:t=>{t.target.style.display="none",t.target.parentElement.innerHTML=`
                      <div class="badge-fallback">
                        🎓
                      </div>
                    `}})),e.createElement("div",{className:"university-info"},e.createElement("h3",null,"NLE University"),e.createElement("p",null,"Student Portal"))),e.createElement("div",{className:"logout-modal-body"},e.createElement("div",{className:"logout-warning"},e.createElement("div",{className:"warning-icon"},e.createElement("i",{className:"fas fa-sign-out-alt"})),e.createElement("div",{className:"warning-content"},e.createElement("h4",null,"Confirm Logout"),e.createElement("p",null,"Are you sure you want to logout from your student account?"))),e.createElement("div",{className:"user-info-card"},e.createElement("div",{className:"user-info-item"},e.createElement("i",{className:"fas fa-user"}),e.createElement("span",null,d?.full_name||a?.name||"Student")),e.createElement("div",{className:"user-info-item"},e.createElement("i",{className:"fas fa-id-card"}),e.createElement("span",null,d?.student_id||a?.studentId||"N/A")))),e.createElement("div",{className:"logout-modal-footer"},e.createElement("button",{onClick:M,disabled:r,className:"logout-cancel-btn"},"Cancel"),e.createElement("button",{onClick:C,disabled:r,className:"logout-confirm-btn"},r?e.createElement(e.Fragment,null,e.createElement("div",{className:"logout-spinner"}),"Logging out..."):e.createElement(e.Fragment,null,e.createElement("i",{className:"fas fa-sign-out-alt"}),"Yes, Logout"))))),e.createElement("div",{className:`layout-container ${r?"logging-out":""}`},e.createElement("header",{className:"layout-header"},e.createElement("div",{className:"header-content"},e.createElement("div",{className:"header-logo"},p&&e.createElement("button",{className:"mobile-menu-toggle",onClick:R,"aria-label":"Toggle mobile menu"},e.createElement("i",{className:s?"fas fa-times":"fas fa-bars"})),e.createElement("div",{className:"logo"},e.createElement("img",{src:"/badge.png",alt:"Logo",onError:t=>{t.target.style.display="none",t.target.parentElement.innerHTML=`
                      <div class="logo-fallback-small">
                        🎓
                      </div>
                    `}}),e.createElement("span",{className:"logo-badge"},"ERP")),e.createElement("div",null,e.createElement("h1",null,"NLE UNIVERSITY"),e.createElement("p",null,"Student Portal"))),e.createElement("div",{className:"header-actions"},!p&&e.createElement("div",{className:"user-info",onClick:()=>x("/settings"),role:"button",tabIndex:"0","aria-label":"Go to settings"},E&&e.createElement("div",{className:"user-loading-indicator"},e.createElement("div",{className:"user-loading-spinner"})),e.createElement("img",{src:`https://ui-avatars.com/api/?name=${encodeURIComponent(d?.full_name||a?.name||"Student")}&background=3498db&color=fff&size=128`,alt:"User"}),e.createElement("div",null,e.createElement("div",{className:"user-name"},d?.full_name||a?.name||"Loading...",E&&e.createElement("div",{className:"name-loading-spinner"})),e.createElement("div",{className:"user-role"},"Student")))))),e.createElement("div",{className:"main-content"},!p&&e.createElement("aside",{className:`sidebar ${i?"collapsed":""}`},e.createElement("button",{className:"sidebar-toggle",onClick:()=>w(!i),"aria-label":i?"Expand sidebar":"Collapse sidebar"},e.createElement("i",{className:`fas fa-chevron-${i?"right":"left"}`})),e.createElement("nav",{className:"sidebar-nav"},y.map(t=>e.createElement("div",{key:t.id,className:"menu-item"},e.createElement("button",{onClick:()=>N(t.path),className:`nav-button ${c(t.path)?"active":""}`,style:{justifyContent:i?"center":"flex-start"},"aria-label":t.label},c(t.path)&&!i&&e.createElement("div",{className:"active-indicator"}),e.createElement("i",{className:t.icon}),!i&&e.createElement("span",null,t.label),i&&c(t.path)&&e.createElement("div",{className:"collapsed-active-indicator"})))),e.createElement("div",{className:"menu-item"},e.createElement("button",{onClick:z,className:"logout-button",style:{justifyContent:i?"center":"flex-start"},"aria-label":"Log out"},e.createElement("i",{className:"fas fa-sign-out-alt"}),!i&&e.createElement("span",null,"Log Out"))))),p&&s&&e.createElement(e.Fragment,null,e.createElement("div",{className:"mobile-menu-backdrop",onClick:()=>l(!1),"aria-label":"Close menu"}),e.createElement("div",{ref:b,className:"mobile-menu"},e.createElement("div",{className:"mobile-user-info"},e.createElement("img",{src:`https://ui-avatars.com/api/?name=${encodeURIComponent(d?.full_name||a?.name||"Student")}&background=3498db&color=fff&size=128`,alt:"User"}),e.createElement("div",null,e.createElement("div",{className:"mobile-user-name"},d?.full_name||a?.name||"Loading..."),e.createElement("div",{className:"mobile-user-role"},"Student"))),e.createElement("nav",{className:"mobile-nav","aria-label":"Main navigation"},y.map(t=>e.createElement("button",{key:t.id,onClick:()=>N(t.path),className:`mobile-nav-button ${c(t.path)?"active":""}`,"aria-label":t.label,"aria-current":c(t.path)?"page":void 0},e.createElement("i",{className:t.icon}),e.createElement("span",null,t.label),c(t.path)&&e.createElement("i",{className:"fas fa-circle active-dot","aria-hidden":"true"}))),e.createElement("div",{className:"mobile-logout-section"},e.createElement("button",{onClick:z,className:"mobile-logout-button","aria-label":"Log out"},e.createElement("i",{className:"fas fa-sign-out-alt"}),e.createElement("span",null,"Log Out")))))),e.createElement("main",{className:"content-area"},e.createElement(D,null)))),e.createElement("style",{jsx:"true"},`
        /* Global Styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
          background-color: #f5f7fb;
        }
        
        button {
          font-family: inherit;
          transition: all 0.2s;
          outline: none;
          cursor: pointer;
        }
        
        img {
          max-width: 100%;
          height: auto;
        }
        
        /* Animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        /* Logout Modal - RESTORED STYLES */
        .logout-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
          animation: fadeIn 0.3s ease-out;
          padding: 1rem;
        }
        
        .logout-modal {
          background-color: white;
          border-radius: 12px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          animation: slideUp 0.3s ease-out;
        }
        
        .logout-modal-header {
          padding: 25px 20px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }
        
        .university-badge {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 3px solid #4361ee;
          padding: 5px;
          background-color: white;
        }
        
        .university-badge img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 50%;
        }
        
        .badge-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #4361ee, #3f37c9);
          color: white;
          font-size: 32px;
          border-radius: 50%;
        }
        
        .university-info {
          text-align: center;
        }
        
        .university-info h3 {
          margin: 0;
          color: #2c3e50;
          font-size: 18px;
          font-weight: 600;
        }
        
        .university-info p {
          margin: 5px 0 0 0;
          color: #7f8c8d;
          font-size: 14px;
          font-weight: 500;
        }
        
        .logout-modal-body {
          padding: 25px 20px;
        }
        
        .logout-warning {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
        }
        
        .warning-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background-color: #e74c3c20;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e74c3c;
          font-size: 20px;
          flex-shrink: 0;
        }
        
        .warning-content h4 {
          margin: 0;
          color: #2c3e50;
          font-size: 16px;
          font-weight: 600;
        }
        
        .warning-content p {
          margin: 5px 0 0 0;
          color: #666;
          font-size: 14px;
          line-height: 1.4;
        }
        
        .user-info-card {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          margin-top: 20px;
          border: 1px solid #e9ecef;
        }
        
        .user-info-item {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        
        .user-info-item:last-child {
          margin-bottom: 0;
        }
        
        .user-info-item i {
          color: #4361ee;
          font-size: 14px;
        }
        
        .user-info-item span {
          font-size: 14px;
          color: #2c3e50;
        }
        
        .user-info-item:last-child span {
          color: #7f8c8d;
        }
        
        .logout-modal-footer {
          padding: 15px 20px;
          border-top: 1px solid #e9ecef;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .logout-cancel-btn {
          padding: 12px 24px;
          background-color: #f8f9fa;
          color: #495057;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          flex: 1;
          min-width: 120px;
        }
        
        .logout-cancel-btn:hover:not(:disabled) {
          background-color: #e9ecef;
        }
        
        .logout-cancel-btn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }
        
        .logout-confirm-btn {
          padding: 12px 24px;
          background-color: #e74c3c;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex: 1;
          min-width: 120px;
        }
        
        .logout-confirm-btn:hover:not(:disabled) {
          background-color: #c0392b;
        }
        
        .logout-confirm-btn:disabled {
          background-color: #95a5a6;
          cursor: not-allowed;
        }
        
        .logout-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        /* Layout Container */
        .layout-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          position: relative;
          opacity: 1;
          transition: opacity 0.3s ease;
        }
        
        .layout-container.logging-out {
          opacity: 0.5;
          pointer-events: none;
        }
        
        /* Header - RESTORED TO ORIGINAL WITH IMPROVEMENTS */
        .layout-header {
          height: 70px;
          background-color: white;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          padding: 0 2rem;
          position: sticky;
          top: 0;
          z-index: 100;
          border-bottom: 1px solid #e9ecef;
        }
        
        /* Tablet and Mobile */
        @media (max-width: 1024px) {
          .layout-header {
            height: 60px;
            padding: 0 1rem;
          }
        }
        
        /* Small mobile devices - ADDED FOR EXTRA SMALL SCREENS */
        @media (max-width: 480px) {
          .layout-header {
            height: 56px;
            padding: 0 0.75rem;
          }
        }
        
        .header-content {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .header-logo {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        @media (max-width: 1024px) {
          .header-logo {
            gap: 0.75rem;
          }
        }
        
        @media (max-width: 480px) {
          .header-logo {
            gap: 0.5rem;
          }
        }
        
        .mobile-menu-toggle {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #4361ee;
          cursor: pointer;
          padding: 5px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          margin-right: 0.5rem;
        }
        
        @media (max-width: 1024px) {
          .mobile-menu-toggle {
            width: 36px;
            height: 36px;
            font-size: 1.25rem;
          }
        }
        
        @media (max-width: 480px) {
          .mobile-menu-toggle {
            width: 32px;
            height: 32px;
            font-size: 1.1rem;
          }
        }
        
        .mobile-menu-toggle:hover {
          background-color: #f1f3f5;
        }
        
        .logo {
          width: 40px;
          height: 40px;
          position: relative;
        }
        
        @media (max-width: 1024px) {
          .logo {
            width: 36px;
            height: 36px;
          }
        }
        
        @media (max-width: 480px) {
          .logo {
            width: 32px;
            height: 32px;
          }
        }
        
        .logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .logo-fallback-small {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #4361ee, #3f37c9);
          color: white;
          font-size: 20px;
          border-radius: 50%;
        }
        
        @media (max-width: 1024px) {
          .logo-fallback-small {
            font-size: 18px;
          }
        }
        
        @media (max-width: 480px) {
          .logo-fallback-small {
            font-size: 16px;
          }
        }
        
        .logo-badge {
          position: absolute;
          bottom: -5px;
          right: -5px;
          background-color: #f72585;
          color: white;
          font-size: 0.6rem;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 10px;
        }
        
        @media (max-width: 1024px) {
          .logo-badge {
            font-size: 0.5rem;
            padding: 1px 4px;
            bottom: -3px;
            right: -3px;
          }
        }
        
        @media (max-width: 480px) {
          .logo-badge {
            display: none;
          }
        }
        
        .header-logo h1 {
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(90deg, #4361ee, #3f37c9);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        @media (max-width: 1024px) {
          .header-logo h1 {
            font-size: 1.1rem;
          }
        }
        
        @media (max-width: 480px) {
          .header-logo h1 {
            font-size: 0.9rem;
          }
        }
        
        .header-logo p {
          font-size: 0.75rem;
          color: #6c757d;
          margin: 0;
        }
        
        @media (max-width: 1024px) {
          .header-logo p {
            font-size: 0.7rem;
          }
        }
        
        @media (max-width: 480px) {
          .header-logo p {
            display: none;
          }
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          position: relative;
        }
        
        @media (max-width: 1024px) {
          .header-actions {
            gap: 1rem;
          }
        }
        
        /* User Info - RESTORED */
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.5rem 0.8rem;
          border-radius: 30px;
          cursor: pointer;
          position: relative;
        }
        
        .user-info:hover {
          background-color: #f1f3f5;
        }
        
        .user-loading-indicator {
          position: absolute;
          top: -5px;
          right: -5px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: #3498db;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          border: 2px solid white;
        }
        
        .user-loading-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .user-info img {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e9ecef;
        }
        
        .user-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #212529;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .name-loading-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid #e9ecef;
          border-top-color: #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .user-role {
          font-size: 0.7rem;
          color: #adb5bd;
          text-transform: uppercase;
        }
        
        /* Main Content */
        .main-content {
          display: flex;
          flex: 1;
          position: relative;
          min-height: calc(100vh - 70px);
        }
        
        @media (max-width: 1024px) {
          .main-content {
            min-height: calc(100vh - 60px);
          }
        }
        
        /* Sidebar - RESTORED AND FIXED */
        .sidebar {
          width: 260px;
          background-color: white;
          border-right: 1px solid #e9ecef;
          padding: 1.5rem 0;
          padding-right: 5px;
          transition: all 0.3s;
          position: sticky;
          top: 70px;
          height: calc(100vh - 70px);
          overflow-y: auto;
          z-index: 90;
        }
        
        @media (max-width: 1024px) {
          .sidebar {
            display: none; /* Hide sidebar on mobile/tablet */
          }
        }
        
        .sidebar.collapsed {
          width: 70px;
        }
        
        .sidebar-toggle {
          position: absolute;
          top: 6px;
          right: 22px;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          z-index: 95;
          font-size: 0.8rem;
          color: #6c757d;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .sidebar-toggle:hover {
          background-color: #f8f9fa;
        }
        
        .sidebar-nav {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .menu-item {
          margin-bottom: 0.6rem;
          margin-top: 0.5rem;
        }
        
        .nav-button {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.5rem 1.5rem;
          color: #6c757d;
          background-color: transparent;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          position: relative;
          border-radius: 0 30px 30px 0;
          transition: all 0.2s;
          margin-right: 10px;
        }
        
        .nav-button:hover {
          background-color: #f1f3f5;
        }
        
        .nav-button.active {
          color: #4361ee;
          background-color: rgba(67, 97, 238, 0.1);
          font-weight: 600;
        }
        
        .active-indicator {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background-color: #4361ee;
          border-radius: 0 3px 3px 0;
        }
        
        .collapsed-active-indicator {
          position: absolute;
          right: 5px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #4361ee;
        }
        
        .nav-button i {
          font-size: 1rem;
          width: 20px;
        }
        
        .logout-button {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.7rem 1.5rem;
          color: #f72585;
          background-color: transparent;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          border-radius: 0 30px 30px 0;
          transition: all 0.2s;
          margin-right: 10px;
        }
        
        .logout-button:hover {
          background-color: #f8f9fa;
        }
        
        /* Mobile Menu - IMPROVED */
        .mobile-menu-backdrop {
          position: fixed;
          top: 60px;
          left: 0;
          width: 100%;
          height: calc(100vh - 60px);
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 98;
          animation: fadeIn 0.3s ease-out;
        }
        
        @media (max-width: 480px) {
          .mobile-menu-backdrop {
            top: 56px;
            height: calc(100vh - 56px);
          }
        }
        
        .mobile-menu {
          position: fixed;
          top: 60px;
          left: 0;
          width: 80%;
          max-width: 300px;
          height: calc(100vh - 60px);
          background-color: white;
          z-index: 99;
          overflow-y: auto;
          animation: slideInLeft 0.3s ease-out;
          box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
        }
        
        @media (max-width: 767px) and (min-width: 481px) {
          .mobile-menu {
            width: 75%;
            max-width: 320px;
          }
        }
        
        @media (max-width: 480px) {
          .mobile-menu {
            top: 56px;
            height: calc(100vh - 56px);
            width: 85%;
            max-width: 280px;
          }
        }
        
        .mobile-user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem 1rem;
          background-color: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }
        
        @media (max-width: 480px) {
          .mobile-user-info {
            padding: 1rem;
          }
        }
        
        .mobile-user-info img {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e9ecef;
        }
        
        @media (max-width: 480px) {
          .mobile-user-info img {
            width: 40px;
            height: 40px;
          }
        }
        
        .mobile-user-name {
          font-size: 1rem;
          font-weight: 600;
          color: #212529;
          margin-bottom: 4px;
        }
        
        @media (max-width: 480px) {
          .mobile-user-name {
            font-size: 0.9rem;
          }
        }
        
        .mobile-user-role {
          font-size: 0.8rem;
          color: #adb5bd;
          text-transform: uppercase;
        }
        
        @media (max-width: 480px) {
          .mobile-user-role {
            font-size: 0.7rem;
          }
        }
        
        .mobile-nav {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 1rem 0;
          flex: 1;
        }
        
        .mobile-nav-button {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.9rem 1rem;
          color: #6c757d;
          background-color: transparent;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          border-left: 3px solid transparent;
          transition: all 0.2s;
        }
        
        @media (max-width: 480px) {
          .mobile-nav-button {
            padding: 0.75rem 1rem;
            font-size: 0.85rem;
            gap: 0.75rem;
          }
        }
        
        .mobile-nav-button:hover {
          background-color: #f1f3f5;
        }
        
        .mobile-nav-button.active {
          color: #4361ee;
          background-color: rgba(67, 97, 238, 0.1);
          border-left: 3px solid #4361ee;
          font-weight: 600;
        }
        
        .mobile-nav-button i {
          font-size: 1rem;
          width: 24px;
          text-align: center;
        }
        
        @media (max-width: 480px) {
          .mobile-nav-button i {
            font-size: 0.9rem;
            width: 20px;
          }
        }
        
        .active-dot {
          font-size: 8px;
          color: #4361ee;
          margin-left: auto;
          margin-right: 10px;
        }
        
        .mobile-logout-section {
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }
        
        .mobile-logout-button {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.9rem 1rem;
          color: #f72585;
          background-color: transparent;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          margin-top: 0.5rem;
          border-left: 3px solid transparent;
          transition: all 0.2s;
        }
        
        @media (max-width: 480px) {
          .mobile-logout-button {
            padding: 0.75rem 1rem;
            font-size: 0.85rem;
          }
        }
        
        .mobile-logout-button:hover {
          background-color: #f8f9fa;
        }
        
        /* Content Area - RESTORED */
        .content-area {
          flex: 1;
          padding: 2rem;
          background-color: #f5f7fb;
          overflow-y: auto;
          min-height: calc(100vh - 70px);
          position: relative;
          z-index: 1;
        }
        
        @media (max-width: 1024px) {
          .content-area {
            padding: 1rem;
            min-height: calc(100vh - 60px);
          }
        }
        
        @media (max-width: 480px) {
          .content-area {
            padding: 0.75rem;
            min-height: calc(100vh - 56px);
          }
        }
        
        /* Tablet-specific improvements (769px-1024px) */
        @media (min-width: 769px) and (max-width: 1024px) {
          .content-area {
            padding: 1.5rem;
          }
          
          .sidebar {
            display: block; /* Show sidebar on tablet */
            width: 220px;
          }
          
          .sidebar.collapsed {
            width: 70px;
          }
          
          .sidebar-toggle {
            right: 15px;
          }
        }
        
        /* Additional responsive improvements */
        @media (max-width: 768px) {
          /* Better touch targets for mobile */
          .mobile-nav-button,
          .mobile-menu-toggle {
            min-height: 44px;
            min-width: 44px;
          }
        }
        
        /* Scrollbar Styling - RESTORED */
        .sidebar::-webkit-scrollbar {
          width: 4px;
        }
        
        .sidebar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        
        .sidebar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 2px;
        }
        
        /* Body class for mobile menu open */
        body.mobile-menu-open {
          overflow: hidden;
        }
      `))};export{U as default};
