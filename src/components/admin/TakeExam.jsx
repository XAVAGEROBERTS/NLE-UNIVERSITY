// src/components/admin/TakeExam.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

const TakeExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExamData();
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examId]);

  const fetchExamData = async () => {
    try {
      // Fetch exam
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (examError) throw examError;

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('sequence');

      if (questionsError) throw questionsError;

      setExam(examData);
      setQuestions(questionsData || []);
      
      // Calculate time left
      const endTime = new Date(examData.end_time);
      const now = new Date();
      const timeDiff = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(timeDiff);

      // Initialize answers
      const initialAnswers = {};
      (questionsData || []).forEach(q => {
        initialAnswers[q.id] = '';
      });
      setAnswers(initialAnswers);

    } catch (error) {
      console.error('Error fetching exam data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    saveAnswers();
  };

  const saveAnswers = () => {
    // Save to localStorage for now
    localStorage.setItem(`exam_${examId}_answers`, JSON.stringify(answers));
  };

  const handleSubmit = async () => {
    if (window.confirm('Are you sure you want to submit your exam?')) {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // Submit to database
        const { error } = await supabase
          .from('exam_submissions')
          .insert([{
            exam_id: examId,
            student_id: user.id,
            submission_data: answers,
            status: 'submitted'
          }]);

        if (error) throw error;

        alert('Exam submitted successfully!');
        navigate(`/examinations/submitted/${examId}`);
      } catch (error) {
        console.error('Error submitting exam:', error);
        alert('Error submitting exam. Please try again.');
      }
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading exam...</p>
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
        <div>
          <h1 style={styles.examTitle}>{exam.title}</h1>
          <p style={styles.courseCode}>{exam.course_code}</p>
        </div>
        
        <div style={styles.timerContainer}>
          <div style={styles.timer}>
            <span style={styles.timerLabel}>Time Remaining:</span>
            <span style={styles.timerValue}>{formatTime(timeLeft)}</span>
          </div>
          <div style={styles.autoSave}>Auto-save enabled</div>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.sidebar}>
          <h3 style={styles.sidebarTitle}>Questions</h3>
          <div style={styles.questionList}>
            {questions.map((q, index) => (
              <a 
                key={q.id}
                href={`#question-${q.id}`}
                style={styles.questionNav}
              >
                <span>Q{index + 1}</span>
                <span>{q.marks} marks</span>
              </a>
            ))}
          </div>
          
          <div style={styles.examInfo}>
            <p><strong>Duration:</strong> {exam.duration_hours} hours</p>
            <p><strong>Total Marks:</strong> {exam.total_marks}</p>
            <p><strong>Questions:</strong> {questions.length}</p>
          </div>
        </div>

        <div style={styles.mainContent}>
          <div style={styles.questions}>
            {questions.map((question, index) => (
              <div key={question.id} id={`question-${question.id}`} style={styles.questionCard}>
                <div style={styles.questionHeader}>
                  <h3>Question {index + 1}</h3>
                  <span style={styles.marksBadge}>{question.marks} marks</span>
                </div>
                
                <div style={styles.questionText}>
                  <p>{question.question_text}</p>
                </div>
                
                <div style={styles.answerSection}>
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="Type your answer here..."
                    rows={8}
                    style={styles.textarea}
                  />
                  {question.max_words && (
                    <div style={styles.wordLimit}>
                      Word limit: {question.max_words} words
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={styles.submissionPanel}>
            <div style={styles.warning}>
              <span style={styles.warningIcon}>⚠</span>
              <p>
                <strong>Warning:</strong> Make sure all answers are complete before submitting.
                You cannot edit after submission.
              </p>
            </div>
            
            <div style={styles.actions}>
              <button 
                onClick={saveAnswers}
                style={styles.saveButton}
              >
                Save Answers
              </button>
              
              <button 
                onClick={handleSubmit}
                style={styles.submitButton}
              >
                Submit Examination
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    padding: '20px'
  },
  header: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  examTitle: {
    color: '#2c3e50',
    margin: 0,
    fontSize: '24px'
  },
  courseCode: {
    color: '#7f8c8d',
    margin: '5px 0 0 0'
  },
  timerContainer: {
    textAlign: 'right'
  },
  timer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  timerLabel: {
    color: '#7f8c8d',
    fontSize: '14px'
  },
  timerValue: {
    color: '#e74c3c',
    fontSize: '24px',
    fontWeight: '600',
    fontFamily: 'monospace'
  },
  autoSave: {
    color: '#27ae60',
    fontSize: '14px',
    marginTop: '5px'
  },
  content: {
    display: 'flex',
    gap: '20px'
  },
  sidebar: {
    width: '250px',
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    alignSelf: 'flex-start',
    position: 'sticky',
    top: '20px'
  },
  sidebarTitle: {
    color: '#2c3e50',
    marginBottom: '15px',
    fontSize: '18px'
  },
  questionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px'
  },
  questionNav: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    textDecoration: 'none',
    color: '#2c3e50',
    fontSize: '14px',
    border: '1px solid #e8e8e8'
  },
  examInfo: {
    paddingTop: '20px',
    borderTop: '1px solid #e8e8e8'
  },
  mainContent: {
    flex: 1
  },
  questions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '30px'
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '25px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '15px',
    borderBottom: '2px solid #f5f5f5'
  },
  marksBadge: {
    backgroundColor: '#3498db',
    color: 'white',
    padding: '5px 15px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600'
  },
  questionText: {
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '20px',
    color: '#2c3e50'
  },
  answerSection: {
    marginTop: '20px'
  },
  textarea: {
    width: '100%',
    padding: '15px',
    border: '2px solid #e8e8e8',
    borderRadius: '8px',
    fontSize: '16px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '150px'
  },
  wordLimit: {
    marginTop: '10px',
    color: '#7f8c8d',
    fontSize: '14px'
  },
  submissionPanel: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '25px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  warning: {
    display: 'flex',
    gap: '15px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  warningIcon: {
    color: '#e74c3c',
    fontSize: '20px',
    flexShrink: 0
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px'
  },
  saveButton: {
    padding: '12px 30px',
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
    border: '1px solid #e8e8e8',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600'
  },
  submitButton: {
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

export default TakeExam;