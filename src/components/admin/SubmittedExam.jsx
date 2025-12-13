// src/components/admin/SubmittedExam.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

const SubmittedExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissionData();
  }, [examId]);

  const fetchSubmissionData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch submission
      const { data: submissionData, error: submissionError } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .single();

      if (submissionError) throw submissionError;

      // Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      setSubmission(submissionData);
      setExam(examData);
    } catch (error) {
      console.error('Error fetching submission data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading submission details...</p>
      </div>
    );
  }

  if (!submission || !exam) {
    return (
      <div style={styles.error}>
        <h2>Submission not found</h2>
        <button onClick={() => navigate('/examinations')}>Back to Exams</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Exam Submission</h1>
          <p style={styles.courseCode}>{exam.course_code} - {exam.title}</p>
        </div>
        
        <div style={styles.statusBadge}>
          <span style={styles.statusIcon}>✓</span>
          <span style={styles.statusText}>{submission.status.toUpperCase()}</span>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.submissionInfo}>
          <h3 style={styles.sectionTitle}>Submission Details</h3>
          
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Submitted On:</span>
              <span style={styles.infoValue}>
                {new Date(submission.submitted_at).toLocaleString()}
              </span>
            </div>
            
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Status:</span>
              <span style={{
                ...styles.statusPill,
                backgroundColor: submission.status === 'graded' ? '#27ae60' : 
                                submission.status === 'under_review' ? '#3498db' : '#f39c12'
              }}>
                {submission.status}
              </span>
            </div>
            
            {submission.total_marks_obtained && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Marks Obtained:</span>
                <span style={styles.infoValue}>
                  {submission.total_marks_obtained}/{exam.total_marks}
                </span>
              </div>
            )}
            
            {submission.grade && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Grade:</span>
                <span style={styles.gradeBadge}>{submission.grade}</span>
              </div>
            )}
          </div>
        </div>

        {submission.feedback && (
          <div style={styles.feedbackSection}>
            <h3 style={styles.sectionTitle}>Feedback</h3>
            <div style={styles.feedbackContent}>
              <p>{submission.feedback}</p>
            </div>
          </div>
        )}

        <div style={styles.answersSection}>
          <h3 style={styles.sectionTitle}>Your Answers</h3>
          {submission.submission_data && Object.entries(submission.submission_data).map(([questionId, answer], index) => (
            <div key={questionId} style={styles.answerItem}>
              <div style={styles.answerHeader}>
                <span style={styles.questionNumber}>Answer {index + 1}</span>
              </div>
              <div style={styles.answerContent}>
                <p style={styles.answerText}>{answer || 'No answer provided'}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.actions}>
          <button
            onClick={() => navigate('/examinations')}
            style={styles.backButton}
          >
            Back to Exams
          </button>
          
          <button
            onClick={() => window.print()}
            style={styles.printButton}
          >
            Print Submission
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '900px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  title: {
    color: '#2c3e50',
    margin: 0,
    fontSize: '28px'
  },
  courseCode: {
    color: '#7f8c8d',
    margin: '5px 0 0 0',
    fontSize: '16px'
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#e8f6ef',
    padding: '10px 20px',
    borderRadius: '25px'
  },
  statusIcon: {
    color: '#27ae60',
    fontSize: '20px'
  },
  statusText: {
    color: '#27ae60',
    fontWeight: '600',
    fontSize: '16px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    color: '#2c3e50',
    marginBottom: '20px',
    fontSize: '20px',
    borderBottom: '2px solid #f5f5f5',
    paddingBottom: '10px'
  },
  submissionInfo: {
    marginBottom: '30px'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  infoLabel: {
    color: '#7f8c8d',
    fontSize: '14px'
  },
  infoValue: {
    color: '#2c3e50',
    fontSize: '16px',
    fontWeight: '600'
  },
  statusPill: {
    display: 'inline-block',
    padding: '6px 16px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  gradeBadge: {
    display: 'inline-block',
    padding: '6px 16px',
    backgroundColor: '#9b59b6',
    color: 'white',
    borderRadius: '20px',
    fontSize: '16px',
    fontWeight: '600'
  },
  feedbackSection: {
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  feedbackContent: {
    color: '#2c3e50',
    fontSize: '16px',
    lineHeight: '1.6'
  },
  answersSection: {
    marginBottom: '30px'
  },
  answerItem: {
    marginBottom: '20px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e8e8e8'
  },
  answerHeader: {
    marginBottom: '15px',
    paddingBottom: '15px',
    borderBottom: '1px solid #e8e8e8'
  },
  questionNumber: {
    color: '#3498db',
    fontWeight: '600',
    fontSize: '16px'
  },
  answerContent: {
    color: '#2c3e50',
    fontSize: '15px',
    lineHeight: '1.6'
  },
  answerText: {
    margin: 0,
    whiteSpace: 'pre-wrap'
  },
  actions: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    marginTop: '30px'
  },
  backButton: {
    padding: '12px 30px',
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
    border: '1px solid #e8e8e8',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600'
  },
  printButton: {
    padding: '12px 30px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600'
  },
  loading: {
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
  error: {
    textAlign: 'center',
    padding: '40px'
  }
};

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default SubmittedExam;