// src/components/admin/ExamInstructions.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

const ExamInstructions = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    fetchExamDetails();
  }, [examId]);

  const fetchExamDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (error) throw error;
      setExam(data);
    } catch (error) {
      console.error('Error fetching exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = () => {
    if (agreed) {
      navigate(`/examinations/take-exam/${examId}`);
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading exam instructions...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div style={styles.error}>
        <h2>Exam not found</h2>
        <button onClick={() => navigate('/examinations')}>Back to Exams</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Exam Instructions</h1>
        <p style={styles.courseCode}>{exam.course_code} - {exam.title}</p>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Important Instructions</h3>
        
        <div style={styles.instructions}>
          <div style={styles.instructionItem}>
            <span style={styles.checkIcon}>✓</span>
            <p>
              The Examination <strong>only</strong> supports submitting your answers through the online answer sheet. 
              Please ensure you save your work there and submit it once you're done.
            </p>
          </div>

          <div style={styles.instructionItem}>
            <span style={styles.checkIcon}>✓</span>
            <p>
              All your changes are automatically saved locally and periodically synced online – 
              so even if you're offline during the exam, your work will be safe and updated once you're back online.
            </p>
          </div>

          <div style={styles.instructionItem}>
            <span style={styles.checkIcon}>✓</span>
            <p>
              The Exam is only available from <strong>{new Date(exam.start_time).toLocaleString()}</strong> to 
              <strong> {new Date(exam.end_time).toLocaleString()}</strong>. After that time, it will be unavailable.
            </p>
          </div>

          <div style={styles.instructionItem}>
            <span style={styles.warningIcon}>⚠</span>
            <p>
              <strong>Cheating is Strictly prohibited</strong> and may lead to disqualification or loss of marks.
            </p>
          </div>
        </div>

        <div style={styles.examInfo}>
          <h4>Exam Details:</h4>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span>Duration:</span>
              <strong>{exam.duration_hours} hours</strong>
            </div>
            <div style={styles.infoItem}>
              <span>Total Marks:</span>
              <strong>{exam.total_marks}</strong>
            </div>
            <div style={styles.infoItem}>
              <span>Passing Marks:</span>
              <strong>{exam.passing_marks}</strong>
            </div>
            <div style={styles.infoItem}>
              <span>Grace Period:</span>
              <strong>{exam.grace_period_minutes} minutes</strong>
            </div>
          </div>
        </div>

        <div style={styles.agreement}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.agreementText}>
              I have read and understood all the examination instructions. I agree to abide by all rules and regulations.
            </span>
          </label>
        </div>

        <div style={styles.actions}>
          <button
            onClick={() => navigate('/examinations')}
            style={styles.backButton}
          >
            Back to Exams
          </button>
          <button
            onClick={handleStartExam}
            disabled={!agreed}
            style={{
              ...styles.startButton,
              ...(!agreed && styles.startButtonDisabled)
            }}
          >
            Start Examination
          </button>
        </div>

        <div style={styles.clearedMessage}>
          <span style={styles.clearedIcon}>✓</span>
          <span>You are Cleared to <strong>attempt</strong> this Examination</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  courseCode: {
    color: '#7f8c8d',
    fontSize: '16px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  cardTitle: {
    color: '#2c3e50',
    marginBottom: '20px',
    fontSize: '22px'
  },
  instructions: {
    marginBottom: '30px'
  },
  instructionItem: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '1px solid #f5f5f5'
  },
  checkIcon: {
    color: '#27ae60',
    fontSize: '20px',
    fontWeight: 'bold',
    flexShrink: 0
  },
  warningIcon: {
    color: '#e74c3c',
    fontSize: '20px',
    fontWeight: 'bold',
    flexShrink: 0
  },
  examInfo: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginTop: '15px'
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px'
  },
  agreement: {
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#ebf5fb',
    borderRadius: '8px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '15px',
    cursor: 'pointer'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    marginTop: '3px'
  },
  agreementText: {
    fontSize: '16px',
    color: '#2c3e50'
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
    marginBottom: '20px'
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
  startButton: {
    padding: '12px 30px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    flex: 1
  },
  startButtonDisabled: {
    backgroundColor: '#bdc3c7',
    cursor: 'not-allowed'
  },
  clearedMessage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '15px',
    backgroundColor: '#e8f6ef',
    borderRadius: '8px',
    color: '#27ae60',
    fontWeight: '600'
  },
  clearedIcon: {
    fontSize: '20px'
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

export default ExamInstructions;