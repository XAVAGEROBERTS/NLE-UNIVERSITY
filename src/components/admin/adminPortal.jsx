// src/components/admin/AdminPortal.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from ' ../../services/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

const AdminPortal = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalExams: 0,
    activeExams: 0,
    totalSubmissions: 0,
    pendingGrading: 0
  });

  useEffect(() => {
    fetchAllData();
    setupRealtimeSubscriptions();
  }, []);

  const fetchAllData = async () => {
    try {
      // Fetch exams
      const { data: examsData } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch submissions with exam and user data
      const { data: submissionsData } = await supabase
        .from('exam_submissions')
        .select(`
          *,
          exams (
            title,
            course_code
          ),
          profiles (
            full_name,
            email
          )
        `)
        .order('submitted_at', { ascending: false });

      // Fetch users
      const { data: usersData } = await supabase.auth.admin.listUsers();

      setExams(examsData || []);
      setSubmissions(submissionsData || []);
      setUsers(usersData.users || []);

      // Calculate stats
      setStats({
        totalExams: examsData?.length || 0,
        activeExams: examsData?.filter(e => e.status === 'active').length || 0,
        totalSubmissions: submissionsData?.length || 0,
        pendingGrading: submissionsData?.filter(s => s.status === 'submitted').length || 0
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const examsChannel = supabase
      .channel('admin-exams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, () => {
        fetchAllData();
      })
      .subscribe();

    const submissionsChannel = supabase
      .channel('admin-submissions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_submissions' }, () => {
        fetchAllData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(examsChannel);
      supabase.removeChannel(submissionsChannel);
    };
  };

  const renderDashboard = () => {
    const examStatusData = [
      { name: 'Draft', value: exams.filter(e => e.status === 'draft').length, color: '#95a5a6' },
      { name: 'Published', value: exams.filter(e => e.status === 'published').length, color: '#3498db' },
      { name: 'Active', value: exams.filter(e => e.status === 'active').length, color: '#e74c3c' },
      { name: 'Completed', value: exams.filter(e => e.status === 'completed').length, color: '#27ae60' }
    ];

    const submissionStatusData = [
      { name: 'Submitted', value: submissions.filter(s => s.status === 'submitted').length, color: '#f39c12' },
      { name: 'Under Review', value: submissions.filter(s => s.status === 'under_review').length, color: '#3498db' },
      { name: 'Graded', value: submissions.filter(s => s.status === 'graded').length, color: '#27ae60' }
    ];

    return (
      <div style={styles.dashboardGrid}>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><span>📊</span></div>
            <div style={styles.statContent}>
              <h3 style={styles.statNumber}>{stats.totalExams}</h3>
              <p style={styles.statLabel}>Total Exams</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><span>⚡</span></div>
            <div style={styles.statContent}>
              <h3 style={styles.statNumber}>{stats.activeExams}</h3>
              <p style={styles.statLabel}>Active Exams</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><span>📝</span></div>
            <div style={styles.statContent}>
              <h3 style={styles.statNumber}>{stats.totalSubmissions}</h3>
              <p style={styles.statLabel}>Submissions</p>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><span>⏳</span></div>
            <div style={styles.statContent}>
              <h3 style={styles.statNumber}>{stats.pendingGrading}</h3>
              <p style={styles.statLabel}>Pending Grading</p>
            </div>
          </div>
        </div>

        <div style={styles.chartsRow}>
          <div style={styles.chartCard}>
            <h4 style={styles.chartTitle}>Exam Status Distribution</h4>
            <PieChart width={300} height={250}>
              <Pie
                data={examStatusData}
                cx={150}
                cy={100}
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {examStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </div>

          <div style={styles.chartCard}>
            <h4 style={styles.chartTitle}>Submissions Status</h4>
            <BarChart width={400} height={250} data={submissionStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </div>
        </div>

        <div style={styles.recentActivity}>
          <h4 style={styles.sectionTitle}>Recent Submissions</h4>
          <div style={styles.activityList}>
            {submissions.slice(0, 5).map(sub => (
              <div key={sub.id} style={styles.activityItem}>
                <div style={styles.activityIcon}>📄</div>
                <div style={styles.activityContent}>
                  <p style={styles.activityText}>
                    <strong>{sub.profiles?.full_name}</strong> submitted {sub.exams?.title}
                  </p>
                  <p style={styles.activityTime}>
                    {new Date(sub.submitted_at).toLocaleString()}
                  </p>
                </div>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: sub.status === 'graded' ? '#27ae60' : 
                                  sub.status === 'under_review' ? '#3498db' : '#f39c12'
                }}>
                  {sub.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderExams = () => {
    return (
      <div style={styles.examsContainer}>
        <div style={styles.tableHeader}>
          <h3 style={styles.tableTitle}>All Exams</h3>
          <button style={styles.addButton} onClick={() => {/* Open exam creation modal */}}>
            + Create Exam
          </button>
        </div>
        
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Course Code</th>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Start Time</th>
                <th style={styles.th}>End Time</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Submissions</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map(exam => (
                <tr key={exam.id} style={styles.tr}>
                  <td style={styles.td}>{exam.course_code}</td>
                  <td style={styles.td}>{exam.title}</td>
                  <td style={styles.td}>{new Date(exam.start_time).toLocaleString()}</td>
                  <td style={styles.td}>{new Date(exam.end_time).toLocaleString()}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusPill,
                      backgroundColor: exam.status === 'active' ? '#e74c3c' :
                                      exam.status === 'published' ? '#3498db' :
                                      exam.status === 'completed' ? '#27ae60' : '#95a5a6'
                    }}>
                      {exam.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {submissions.filter(s => s.exam_id === exam.id).length}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionButtons}>
                      <button style={styles.smallButton}>Edit</button>
                      <button style={styles.smallButton}>View</button>
                      <button style={{...styles.smallButton, backgroundColor: '#e74c3c'}}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSubmissions = () => {
    return (
      <div style={styles.submissionsContainer}>
        <div style={styles.tableHeader}>
          <h3 style={styles.tableTitle}>All Submissions</h3>
          <div style={styles.filterControls}>
            <select style={styles.select}>
              <option>All Status</option>
              <option>Submitted</option>
              <option>Under Review</option>
              <option>Graded</option>
            </select>
            <select style={styles.select}>
              <option>All Exams</option>
              {exams.map(exam => (
                <option key={exam.id}>{exam.title}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Student</th>
                <th style={styles.th}>Exam</th>
                <th style={styles.th}>Submitted At</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Marks</th>
                <th style={styles.th}>Grade</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(sub => (
                <tr key={sub.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.userCell}>
                      <div style={styles.avatar}>{sub.profiles?.full_name?.charAt(0) || 'U'}</div>
                      <div>
                        <p style={styles.userName}>{sub.profiles?.full_name || 'Unknown'}</p>
                        <p style={styles.userEmail}>{sub.profiles?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <p style={styles.examName}>{sub.exams?.title}</p>
                    <p style={styles.courseCode}>{sub.exams?.course_code}</p>
                  </td>
                  <td style={styles.td}>{new Date(sub.submitted_at).toLocaleString()}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusPill,
                      backgroundColor: sub.status === 'graded' ? '#27ae60' : 
                                      sub.status === 'under_review' ? '#3498db' : '#f39c12'
                    }}>
                      {sub.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {sub.total_marks_obtained ? `${sub.total_marks_obtained}/100` : '--'}
                  </td>
                  <td style={styles.td}>
                    {sub.grade ? (
                      <span style={styles.gradeBadge}>{sub.grade}</span>
                    ) : '--'}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionButtons}>
                      <button style={styles.smallButton}>Grade</button>
                      <button style={styles.smallButton}>View</button>
                      <button style={styles.smallButton}>Download</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderUsers = () => {
    return (
      <div style={styles.usersContainer}>
        <div style={styles.tableHeader}>
          <h3 style={styles.tableTitle}>All Users</h3>
          <button style={styles.addButton} onClick={() => {/* Open user creation modal */}}>
            + Add User
          </button>
        </div>
        
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Joined</th>
                <th style={styles.th}>Last Active</th>
                <th style={styles.th}>Exams Taken</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.userCell}>
                      <div style={styles.avatar}>
                        {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={styles.userName}>
                          {user.user_metadata?.full_name || 'No Name'}
                        </p>
                        <p style={styles.userId}>{user.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.roleBadge,
                      backgroundColor: user.user_metadata?.role === 'admin' ? '#9b59b6' : '#3498db'
                    }}>
                      {user.user_metadata?.role || 'student'}
                    </span>
                  </td>
                  <td style={styles.td}>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}
                  </td>
                  <td style={styles.td}>
                    {submissions.filter(s => s.student_id === user.id).length}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionButtons}>
                      <button style={styles.smallButton}>Edit</button>
                      <button style={styles.smallButton}>Reset Pass</button>
                      <button style={{...styles.smallButton, backgroundColor: '#e74c3c'}}>
                        Disable
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading admin portal...</p>
      </div>
    );
  }

  return (
    <div style={styles.adminContainer}>
      <div style={styles.adminHeader}>
        <h1 style={styles.adminTitle}>Admin Portal</h1>
        <div style={styles.headerActions}>
          <button style={styles.headerButton}>
            <span>🔔</span>
            <span style={styles.notificationBadge}>3</span>
          </button>
          <button style={styles.headerButton}>
            <span>⚙️</span>
            Settings
          </button>
        </div>
      </div>

      <div style={styles.adminNav}>
        <button 
          style={{
            ...styles.navButton,
            ...(activeTab === 'dashboard' ? styles.navButtonActive : {})
          }}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          style={{
            ...styles.navButton,
            ...(activeTab === 'exams' ? styles.navButtonActive : {})
          }}
          onClick={() => setActiveTab('exams')}
        >
          📝 Exams
        </button>
        <button 
          style={{
            ...styles.navButton,
            ...(activeTab === 'submissions' ? styles.navButtonActive : {})
          }}
          onClick={() => setActiveTab('submissions')}
        >
          📄 Submissions
        </button>
        <button 
          style={{
            ...styles.navButton,
            ...(activeTab === 'users' ? styles.navButtonActive : {})
          }}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button 
          style={{
            ...styles.navButton,
            ...(activeTab === 'settings' ? styles.navButtonActive : {})
          }}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </div>

      <div style={styles.adminContent}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'exams' && renderExams()}
        {activeTab === 'submissions' && renderSubmissions()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'settings' && (
          <div style={styles.settingsContainer}>
            <h3>System Settings</h3>
            <p>Settings page content...</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  adminContainer: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa'
  },
  adminHeader: {
    backgroundColor: 'white',
    padding: '20px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  adminTitle: {
    color: '#2c3e50',
    margin: 0,
    fontSize: '24px',
    fontWeight: '600'
  },
  headerActions: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  headerButton: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e8e8e8',
    padding: '8px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    position: 'relative'
  },
  notificationBadge: {
    backgroundColor: '#e74c3c',
    color: 'white',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: '-5px',
    right: '-5px'
  },
  adminNav: {
    backgroundColor: 'white',
    padding: '15px 30px',
    borderBottom: '1px solid #e8e8e8',
    display: 'flex',
    gap: '10px',
    overflowX: 'auto'
  },
  navButton: {
    padding: '10px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#7f8c8d',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap'
  },
  navButtonActive: {
    backgroundColor: '#3498db',
    color: 'white'
  },
  adminContent: {
    padding: '30px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  dashboardGrid: {
    display: 'grid',
    gap: '25px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  statIcon: {
    fontSize: '24px',
    width: '50px',
    height: '50px',
    backgroundColor: '#ebf5fb',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statContent: {
    flex: 1
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: 0
  },
  statLabel: {
    color: '#7f8c8d',
    fontSize: '14px',
    margin: 0
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '25px'
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  chartTitle: {
    color: '#2c3e50',
    marginBottom: '20px',
    fontSize: '16px',
    fontWeight: '600',
    alignSelf: 'flex-start'
  },
  recentActivity: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    color: '#2c3e50',
    marginBottom: '20px',
    fontSize: '18px',
    fontWeight: '600'
  },
  activityList: {
    display: 'grid',
    gap: '15px'
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  activityIcon: {
    fontSize: '20px'
  },
  activityContent: {
    flex: 1
  },
  activityText: {
    margin: 0,
    color: '#2c3e50',
    fontSize: '14px'
  },
  activityTime: {
    margin: '5px 0 0 0',
    color: '#7f8c8d',
    fontSize: '12px'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white'
  },
  examsContainer: {
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  tableHeader: {
    padding: '20px',
    borderBottom: '1px solid #e8e8e8',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  tableTitle: {
    margin: 0,
    color: '#2c3e50',
    fontSize: '18px',
    fontWeight: '600'
  },
  addButton: {
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '15px',
    textAlign: 'left',
    borderBottom: '1px solid #e8e8e8',
    color: '#2c3e50',
    fontWeight: '600',
    fontSize: '14px',
    backgroundColor: '#f8f9fa'
  },
  tr: {
    borderBottom: '1px solid #f5f5f5'
  },
  td: {
    padding: '15px',
    fontSize: '14px',
    color: '#2c3e50'
  },
  statusPill: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    display: 'inline-block'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px'
  },
  smallButton: {
    padding: '6px 12px',
    fontSize: '12px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  submissionsContainer: {
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  filterControls: {
    display: 'flex',
    gap: '10px'
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #e8e8e8',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white'
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#3498db',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '16px'
  },
  userName: {
    margin: 0,
    fontWeight: '600',
    fontSize: '14px'
  },
  userEmail: {
    margin: '2px 0 0 0',
    fontSize: '12px',
    color: '#7f8c8d'
  },
  examName: {
    margin: 0,
    fontWeight: '600',
    fontSize: '14px'
  },
  courseCode: {
    margin: '2px 0 0 0',
    fontSize: '12px',
    color: '#7f8c8d'
  },
  gradeBadge: {
    backgroundColor: '#27ae60',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block'
  },
  usersContainer: {
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  userId: {
    fontSize: '12px',
    color: '#7f8c8d',
    margin: '2px 0 0 0'
  },
  roleBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    display: 'inline-block'
  },
  settingsContainer: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '30px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  loadingText: {
    color: '#7f8c8d',
    fontSize: '16px'
  }
};

export default AdminPortal;