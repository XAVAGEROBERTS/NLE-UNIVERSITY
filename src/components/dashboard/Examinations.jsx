// src/components/dashboard/Examinations.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

const Examinations = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUserAndExams();
    setupRealtimeSubscription();
  }, []);

  const fetchUserAndExams = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Fetch exams that are published, active, or completed
      const { data: examsData, error } = await supabase
        .from('exams')
        .select(`
          *,
          exam_submissions!left (
            id,
            status,
            submitted_at,
            total_marks_obtained,
            grade
          )
        `)
        .in('status', ['published', 'active', 'completed'])
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Process exams to check if submitted by current user
      const processedExams = examsData.map(exam => ({
        ...exam,
        submitted: exam.exam_submissions && exam.exam_submissions.length > 0,
        submission: exam.exam_submissions?.[0]
      }));

      setExams(processedExams);
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const examsChannel = supabase
      .channel('exams-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exams'
        },
        (payload) => {
          fetchUserAndExams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(examsChannel);
    };
  };

  const handleExamClick = (exam) => {
    if (exam.submitted) {
      navigate(`/examinations/submitted/${exam.id}`);
    } else {
      const now = new Date();
      const startTime = new Date(exam.start_time);
      const endTime = new Date(exam.end_time);

      if (now >= startTime && now <= endTime) {
        // Exam is active, go to instructions
        navigate(`/examinations/instructions/${exam.id}`);
      } else if (now < startTime) {
        alert(`Exam starts on ${new Date(exam.start_time).toLocaleString()}`);
      } else {
        alert('Exam period has ended');
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + ' EAT';
  };

  const getExamStatus = (exam) => {
    const now = new Date();
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);

    if (exam.submitted) return 'submitted';
    if (now < startTime) return 'upcoming';
    if (now >= startTime && now <= endTime) return 'active';
    return 'ended';
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading examinations...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Examinations</h1>
        <p style={styles.subtitle}>Download Examination Permit</p>
        
        <div style={styles.availableExamsSection}>
          <h2 style={styles.sectionTitle}>Available Examinations</h2>
          
          <div style={styles.examsList}>
            {exams.map(exam => {
              const status = getExamStatus(exam);
              
              return (
                <div 
                  key={exam.id} 
                  style={{
                    ...styles.examCard,
                    borderLeft: `4px solid ${status === 'submitted' ? '#27ae60' : 
                                            status === 'active' ? '#e74c3c' : 
                                            status === 'upcoming' ? '#3498db' : '#95a5a6'}`
                  }}
                  onClick={() => handleExamClick(exam)}
                >
                  <div style={styles.examCardHeader}>
                    <div style={styles.courseCodeBadge}>
                      {exam.course_code}
                    </div>
                    <div style={{
                      ...styles.examStatus,
                      color: status === 'submitted' ? '#27ae60' : 
                             status === 'active' ? '#e74c3c' : 
                             status === 'upcoming' ? '#3498db' : '#95a5a6'
                    }}>
                      <span style={styles.statusIcon}>
                        {status === 'submitted' ? '✓' : 
                         status === 'active' ? '▶' : 
                         status === 'upcoming' ? '⏰' : '⏹'}
                      </span>
                      <span style={styles.statusText}>
                        {status === 'submitted' ? 'Submitted' : 
                         status === 'active' ? 'Active Now' : 
                         status === 'upcoming' ? 'Upcoming' : 'Ended'}
                      </span>
                    </div>
                  </div>
                  
                  <h3 style={styles.examTitle}>
                    {exam.title}
                  </h3>
                  
                  <div style={styles.examDetails}>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Start Date & Time:</span>
                      <span style={styles.detailValue}>{formatDate(exam.start_time)}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>End Date & Time:</span>
                      <span style={styles.detailValue}>{formatDate(exam.end_time)}</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Duration:</span>
                      <span style={styles.detailValue}>{exam.duration_hours} hours</span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Total Marks:</span>
                      <span style={styles.detailValue}>{exam.total_marks}</span>
                    </div>
                  </div>
                  
                  {exam.submitted ? (
                    <div style={styles.submittedInfo}>
                      <span style={styles.submittedIcon}>✓</span>
                      <span style={styles.submittedText}>
                        Submitted {exam.submission?.grade && `• Grade: ${exam.submission.grade}`}
                      </span>
                    </div>
                  ) : status === 'active' ? (
                    <button style={styles.startButton}>
                      Start Exam
                    </button>
                  ) : status === 'upcoming' ? (
                    <div style={styles.upcomingInfo}>
                      <span style={styles.upcomingIcon}>⏰</span>
                      <span style={styles.upcomingText}>
                        Starts {new Date(exam.start_time).toLocaleDateString()}
                      </span>
                    </div>
                  ) : (
                    <div style={styles.endedInfo}>
                      <span style={styles.endedIcon}>⏹</span>
                      <span style={styles.endedText}>Exam period has ended</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa'
  },
  header: {
    marginBottom: '30px'
  },
  title: {
    color: '#2c3e50',
    marginBottom: '5px',
    fontSize: '28px',
    fontWeight: '600'
  },
  subtitle: {
    color: '#7f8c8d',
    fontSize: '16px',
    marginBottom: '30px'
  },
  availableExamsSection: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '25px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    marginTop: '20px'
  },
  sectionTitle: {
    color: '#2c3e50',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #f1f2f6',
    fontSize: '22px'
  },
  examsList: {
    display: 'grid',
    gap: '20px'
  },
  examCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #e8e8e8',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden'
  },
  examCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  courseCodeBadge: {
    background: '#3498db',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600'
  },
  examStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600'
  },
  statusIcon: {
    fontSize: '18px'
  },
  examTitle: {
    color: '#2c3e50',
    marginBottom: '15px',
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '1.4'
  },
  examDetails: {
    display: 'grid',
    gap: '8px',
    marginBottom: '20px'
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f5f5f5'
  },
  detailLabel: {
    color: '#7f8c8d',
    fontSize: '14px',
    fontWeight: '500'
  },
  detailValue: {
    color: '#2c3e50',
    fontSize: '14px',
    fontWeight: '600'
  },
  submittedInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#e8f6ef',
    padding: '12px',
    borderRadius: '6px',
    marginTop: '10px'
  },
  submittedIcon: {
    color: '#27ae60',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  submittedText: {
    color: '#27ae60',
    fontSize: '14px',
    fontWeight: '600'
  },
  startButton: {
    width: '100%',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '15px',
    transition: 'background-color 0.3s'
  },
  upcomingInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#ebf5fb',
    padding: '12px',
    borderRadius: '6px',
    marginTop: '10px'
  },
  upcomingIcon: {
    color: '#3498db',
    fontSize: '18px'
  },
  upcomingText: {
    color: '#3498db',
    fontSize: '14px',
    fontWeight: '600'
  },
  endedInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#f8f9fa',
    padding: '12px',
    borderRadius: '6px',
    marginTop: '10px'
  },
  endedIcon: {
    color: '#95a5a6',
    fontSize: '18px'
  },
  endedText: {
    color: '#95a5a6',
    fontSize: '14px',
    fontWeight: '600'
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

export default Examinations;