// components/dashboard/TakeExam.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';

const TakeExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useStudentAuth();
  
  const [exam, setExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [examAnswers, setExamAnswers] = useState({});
  const [submittingExam, setSubmittingExam] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [examFiles, setExamFiles] = useState([]);
  const [answerText, setAnswerText] = useState('');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [examSubmission, setExamSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isResuming, setIsResuming] = useState(false);
  const [isExamActive, setIsExamActive] = useState(false);
  const [downloadedPapers, setDownloadedPapers] = useState([]);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);
  const [isStartingExam, setIsStartingExam] = useState(false);
  const [submissionType, setSubmissionType] = useState('both');
  
  // Modal states
  const [modal, setModal] = useState({
    isOpen: false,
    type: '',
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'OK',
    cancelText: 'Cancel'
  });

  // Timer states
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [totalDurationMinutes, setTotalDurationMinutes] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState({ hours: 0, minutes: 0 });
  const [examStartTime, setExamStartTime] = useState(null);
  const [examEndTime, setExamEndTime] = useState(null);
  const [timeUntilStart, setTimeUntilStart] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [isExamEnded, setIsExamEnded] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  
  const [showStartConfirmation, setShowStartConfirmation] = useState(false);
  
  const fileInputRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const timeRemainingIntervalRef = useRef(null);
  const isSubmittingRef = useRef(false);

  // Helper function to get plain text from HTML
  const getPlainTextFromHTML = (html) => {
    if (!html) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  // Use memo for character count
  const answerCharCount = useMemo(() => answerText.length, [answerText]);

  // Modal functions
  const showConfirmModal = (title, message, onConfirm, onCancel = null, confirmText = 'Yes', cancelText = 'Cancel') => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
      onCancel,
      confirmText,
      cancelText
    });
  };

  const showAlertModal = (title, message, type = 'alert', onClose = null) => {
    setModal({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: onClose,
      onCancel: null,
      confirmText: 'OK',
      cancelText: ''
    });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleModalConfirm = () => {
    const { onConfirm } = modal;
    closeModal();
    if (onConfirm && typeof onConfirm === 'function') {
      setTimeout(() => {
        onConfirm();
      }, 100);
    }
  };

  const handleModalCancel = () => {
    const { onCancel } = modal;
    closeModal();
    if (onCancel && typeof onCancel === 'function') {
      setTimeout(() => {
        onCancel();
      }, 100);
    }
  };

  // Security measures
  useEffect(() => {
    if (!isExamActive) return;

    const blockPaste = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showAlertModal('Action Blocked', 'Pasting is not allowed during exams.', 'alert');
      return false;
    };

    const blockPasteOnInputs = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showAlertModal('Action Blocked', 'Pasting is not allowed during exams.', 'alert');
      return false;
    };

    document.addEventListener('paste', blockPaste, true);
    
    const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
    inputs.forEach(el => {
      el.addEventListener('paste', blockPasteOnInputs, true);
    });

    return () => {
      document.removeEventListener('paste', blockPaste, true);
      inputs.forEach(el => {
        el.removeEventListener('paste', blockPasteOnInputs, true);
      });
    };
  }, [isExamActive]);

  useEffect(() => {
    if (!isExamActive) return;

    const blockCut = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showAlertModal('Action Blocked', 'Cutting is not allowed during exams.', 'alert');
      return false;
    };

    const blockPaste = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showAlertModal('Action Blocked', 'Pasting is not allowed during exams.', 'alert');
      return false;
    };

    document.addEventListener('cut', blockCut, true);
    document.addEventListener('paste', blockPaste, true);

    return () => {
      document.removeEventListener('cut', blockCut, true);
      document.removeEventListener('paste', blockPaste, true);
    };
  }, [isExamActive]);

  useEffect(() => {
    if (!isExamActive) return;

    const preventContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      showAlertModal('Action Blocked', 'Right-click is not allowed during exams.', 'alert');
      return false;
    };

    document.addEventListener('contextmenu', preventContextMenu, true);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu, true);
    };
  }, [isExamActive]);

  useEffect(() => {
    if (!isExamActive) return;

    const preventDragDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    document.addEventListener('dragstart', preventDragDrop, true);
    document.addEventListener('drop', preventDragDrop, true);
    document.addEventListener('dragover', preventDragDrop, true);

    return () => {
      document.removeEventListener('dragstart', preventDragDrop, true);
      document.removeEventListener('drop', preventDragDrop, true);
      document.removeEventListener('dragover', preventDragDrop, true);
    };
  }, [isExamActive]);

  useEffect(() => {
    if (!isExamActive) return;

    const preventDevTools = (e) => {
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        showAlertModal('Action Blocked', 'Developer tools are not allowed during exams.', 'alert');
        return false;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'i' || e.key === 'j')) {
        e.preventDefault();
        e.stopPropagation();
        showAlertModal('Action Blocked', 'Developer tools are not allowed during exams.', 'alert');
        return false;
      }
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        e.stopPropagation();
        showAlertModal('Action Blocked', 'View source is not allowed during exams.', 'alert');
        return false;
      }
      return true;
    };

    document.addEventListener('keydown', preventDevTools, true);

    return () => {
      document.removeEventListener('keydown', preventDevTools, true);
    };
  }, [isExamActive]);

  // Persist exam active state to localStorage
  useEffect(() => {
    if (isExamActive) {
      localStorage.setItem(`exam-active-${examId}`, 'true');
    } else {
      localStorage.removeItem(`exam-active-${examId}`);
    }
  }, [isExamActive, examId]);

  // Restore exam from cache
  useEffect(() => {
    if (examId) {
      const cachedExam = localStorage.getItem(`exam-cache-${examId}`);
      if (cachedExam) {
        try {
          const parsed = JSON.parse(cachedExam);
          setExam(parsed.exam);
          setExamQuestions(parsed.questions || []);
          setExamStartTime(parsed.exam.startTime);
          setExamEndTime(parsed.exam.endTime);
          setSubmissionType(parsed.exam.submissionType || 'both');
          setLoading(false);
        } catch (e) {
          console.log('Could not restore exam cache');
        }
      }
    }
  }, [examId]);

  // Restore exam state from localStorage
  useEffect(() => {
    if (examId) {
      const savedActiveState = localStorage.getItem(`exam-active-${examId}`);
      if (savedActiveState === 'true') {
        console.log('✅ Exam was active, restoring immediately');
        setIsExamActive(true);
        setShowStartConfirmation(false);
        setIsResuming(false);
      }
      
      const savedAnswers = localStorage.getItem(`exam-answers-${examId}`);
      if (savedAnswers) {
        try {
          const parsed = JSON.parse(savedAnswers);
          console.log('✅ Restored answers from localStorage:', Object.keys(parsed).length, 'answers');
          setExamAnswers(parsed);
        } catch (e) {
          console.log('Could not restore answers');
        }
      }
      
      const savedText = localStorage.getItem(`exam-text-${examId}`);
      if (savedText) {
        console.log('✅ Restored answer text from localStorage');
        setAnswerText(savedText);
      }
      
      const savedIndex = localStorage.getItem(`exam-question-index-${examId}`);
      if (savedIndex) {
        const index = parseInt(savedIndex);
        if (!isNaN(index) && index >= 0) {
          console.log('✅ Restored question index:', index);
          setActiveQuestionIndex(index);
        }
      }
    }
  }, [examId]);

  // Force exam to stay active
  useEffect(() => {
    if (exam && isExamActive) {
      console.log('✅ Exam is active, keeping exam interface open');
      setIsResuming(false);
      setShowStartConfirmation(false);
      
      if (!timerIntervalRef.current) {
        startTimer();
      }
    }
  }, [exam, isExamActive]);

  // Save answers to localStorage AND Supabase
  useEffect(() => {
    if (examId && Object.keys(examAnswers).length > 0) {
      localStorage.setItem(`exam-answers-${examId}`, JSON.stringify(examAnswers));
      
      if (examSubmission?.id) {
        const saveToServer = async () => {
          try {
            await supabase
              .from('exam_submissions')
              .update({ 
                answers: examAnswers,
                updated_at: new Date().toISOString()
              })
              .eq('id', examSubmission.id);
            console.log('✅ Answers saved to server');
          } catch (error) {
            console.log('Could not save to server:', error.message);
          }
        };
        saveToServer();
      }
    }
  }, [examAnswers, examId, examSubmission?.id]);

  // Save current question index
  useEffect(() => {
    if (examId) {
      localStorage.setItem(`exam-question-index-${examId}`, String(activeQuestionIndex));
    }
  }, [activeQuestionIndex, examId]);

  // Save answer text
  useEffect(() => {
    if (examId && answerText) {
      localStorage.setItem(`exam-text-${examId}`, answerText);
      
      if (examSubmission?.id) {
        const saveToServer = async () => {
          try {
            await supabase
              .from('exam_submissions')
              .update({ 
                answer_text: answerText,
                updated_at: new Date().toISOString()
              })
              .eq('id', examSubmission.id);
            console.log('✅ Answer text saved to server');
          } catch (error) {
            console.log('Could not save text to server:', error.message);
          }
        };
        saveToServer();
      }
    }
  }, [answerText, examId, examSubmission?.id]);

  // Auto-start timer
  useEffect(() => {
    if (isExamActive) {
      startTimer();
      if (examSubmission) {
        startAutoSave(examSubmission.id);
      }
    }
  }, [isExamActive, examSubmission]);

  // Cleanup intervals
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (timeRemainingIntervalRef.current) {
        clearInterval(timeRemainingIntervalRef.current);
      }
      if (window.autoSaveInterval) {
        clearInterval(window.autoSaveInterval);
        delete window.autoSaveInterval;
      }
    };
  }, []);

  // Get current time in EAT
  const getCurrentEATTime = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const eat = new Date(utc + (3 * 3600000));
    return eat;
  };

  const formatEATDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Nairobi'
    }) + ' EAT';
  };

  const formatEATTimeOnly = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ' EAT';
  };

  const calculateTimeUntilStart = () => {
    if (!examStartTime) return;
    
    const now = getCurrentEATTime();
    const startTime = new Date(examStartTime);
    const diffMs = startTime - now;
    
    if (diffMs <= 0) {
      setIsExamStarted(true);
      return { hours: 0, minutes: 0, seconds: 0 };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  const calculateTimeRemaining = () => {
    if (!examStartTime || !examEndTime) return;
    
    const now = getCurrentEATTime();
    const startTime = new Date(examStartTime);
    const endTime = new Date(examEndTime);
    
    if (now >= endTime) {
      setIsExamEnded(true);
      setIsTimeUp(true);
      return { hours: 0, minutes: 0, seconds: 0 };
    }
    
    if (now >= startTime) {
      setIsExamStarted(true);
      
      const diffMs = endTime - now;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      const elapsedMs = now - startTime;
      const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));
      const elapsedMinutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeElapsed({ hours: elapsedHours, minutes: elapsedMinutes });
      
      return { hours, minutes, seconds };
    }
    
    return { hours: 0, minutes: 0, seconds: 0 };
  };

  const startTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    timerIntervalRef.current = setInterval(() => {
      const remaining = calculateTimeRemaining();
      if (remaining) {
        setTimeRemaining(remaining);
        
        if (remaining.hours === 0 && remaining.minutes === 0 && remaining.seconds === 0) {
          setIsTimeUp(true);
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
          }
        }
      }
    }, 1000);
  };

  const startTimeUntilStartTimer = () => {
    if (timeRemainingIntervalRef.current) {
      clearInterval(timeRemainingIntervalRef.current);
    }
    
    timeRemainingIntervalRef.current = setInterval(() => {
      const untilStart = calculateTimeUntilStart();
      if (untilStart) {
        setTimeUntilStart(untilStart);
        
        if (untilStart.hours === 0 && untilStart.minutes === 0 && untilStart.seconds === 0) {
          setIsExamStarted(true);
          if (timeRemainingIntervalRef.current) {
            clearInterval(timeRemainingIntervalRef.current);
          }
          startTimer();
        }
      }
    }, 1000);
  };

  const startExamBasedOnSchedule = () => {
    if (!examStartTime) return;
    
    const now = getCurrentEATTime();
    const startTime = new Date(examStartTime);
    const endTime = new Date(examEndTime);
    
    if (now >= endTime) {
      setIsExamEnded(true);
      setIsTimeUp(true);
      return;
    }
    
    if (now >= startTime && now < endTime) {
      setIsExamStarted(true);
      
      if (examSubmission?.status === 'started') {
        setIsResuming(true);
        setShowStartConfirmation(false);
      }
    } else if (now < startTime) {
      setIsExamStarted(false);
      startTimeUntilStartTimer();
    }
  };

  useEffect(() => {
    if (examId && user) {
      fetchStudentInfo();
    }
  }, [examId, user]);

  useEffect(() => {
    if (examStartTime && examEndTime) {
      startExamBasedOnSchedule();
    }
  }, [examStartTime, examEndTime]);

  // Save progress silently when leaving
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isExamActive && examSubmission) {
        saveProgressSilently();
        localStorage.setItem(`exam-active-${examId}`, 'true');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isExamActive, examSubmission, examId]);

  const fetchStudentInfo = async () => {
    try {
      const studentId = user?.id;
      
      if (!studentId) {
        throw new Error('User not authenticated');
      }
      
      const studentData = {
        student_id: studentId,
        email: user?.email || 'unknown@example.com',
        name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'
      };
      
      setStudentInfo(studentData);
      fetchExamData(studentData);
    } catch (error) {
      console.error('Error fetching student info:', error);
      const fallbackStudent = {
        student_id: user?.id || 'unknown',
        email: user?.email || 'unknown@example.com',
        name: user?.user_metadata?.full_name || 'Student'
      };
      setStudentInfo(fallbackStudent);
      fetchExamData(fallbackStudent);
    }
  };

  const fetchExamData = async (student) => {
    try {
      setLoading(true);
      setError(null);

      const { data: examData, error: examError } = await supabase
        .from('examinations')
        .select('*')
        .eq('id', examId)
        .single();

      if (examError || !examData) {
        throw new Error('Exam not found');
      }

      const examSubmissionType = examData.submission_type || 'both';
      setSubmissionType(examSubmissionType);

      let courseCode = 'N/A';
      let courseName = 'N/A';
      if (examData.course_id) {
        try {
          const { data: courseData } = await supabase
            .from('courses')
            .select('course_code, course_name')
            .eq('id', examData.course_id)
            .single();
          
          if (courseData) {
            courseCode = courseData.course_code || 'N/A';
            courseName = courseData.course_name || 'N/A';
          }
        } catch (courseError) {
          console.log('Course fetch failed, using defaults');
        }
      }

      let submission = null;
      try {
        const { data: submissionData } = await supabase
          .from('exam_submissions')
          .select('*')
          .eq('exam_id', examId)
          .eq('student_id', student.student_id)
          .maybeSingle();
        
        submission = submissionData;
      } catch (subError) {
        console.log('No submission found');
      }

      if (submission) {
        if (submission.status === 'started') {
          setExamSubmission(submission);
          
          const wasActive = localStorage.getItem(`exam-active-${examId}`);
          if (wasActive === 'true') {
            setIsExamActive(true);
            setIsResuming(false);
            setShowStartConfirmation(false);
            console.log('🔄 Auto-resuming active exam session after refresh');
          } else {
            setIsResuming(true);
          }
          
          if (submission.answers) {
            try {
              const answers = typeof submission.answers === 'string' 
                ? JSON.parse(submission.answers) 
                : submission.answers;
              setExamAnswers(answers);
            } catch (e) {
              console.log('Could not parse answers');
            }
          }
          if (submission.answer_text) {
            setAnswerText(submission.answer_text);
          }
        } else if (submission.status === 'submitted') {
          setExamSubmission(submission);
          showAlertModal('Already Submitted', 'This exam has already been submitted.', 'alert', () => {
            navigate('/examinations');
          });
          return;
        }
      }

      try {
        const { data: questions } = await supabase
          .from('exam_questions')
          .select('*')
          .eq('exam_id', examId);
        
        if (questions) {
          setExamQuestions(questions);
        }
      } catch (qError) {
        console.log('No questions found or permission denied');
      }

      const processedExam = {
        id: examData.id,
        title: examData.title === 'NA' ? `${courseCode} Final` : examData.title,
        description: examData.description === 'NA' ? 'Final examination for the course' : examData.description,
        courseId: examData.course_id,
        courseCode,
        courseName,
        examType: examData.exam_type || 'online',
        submissionType: examSubmissionType,
        startTime: examData.start_time,
        endTime: examData.end_time,
        duration: examData.duration_minutes || 60,
        totalMarks: examData.total_marks || 100,
        passingMarks: examData.passing_marks,
        location: examData.location || examData.venue || 'TBA',
        supervisor: examData.supervisor,
        instructions: examData.instructions === 'NA' ? 'Complete all questions within the given time frame.' : examData.instructions,
        examFiles: examData.exam_files || [],
        materialsUrl: examData.materials_url || []
      };

      setExam(processedExam);
      setExamStartTime(examData.start_time);
      setExamEndTime(examData.end_time);
      setTotalDurationMinutes(examData.duration_minutes || 60);

      try {
        localStorage.setItem(`exam-cache-${examId}`, JSON.stringify({
          exam: processedExam,
          questions: examQuestions,
        }));
      } catch (e) {
        console.log('Could not cache exam');
      }

      const now = getCurrentEATTime();
      const startTime = new Date(examData.start_time);
      const endTime = new Date(examData.end_time);
      
      if (now >= endTime) {
        setIsExamEnded(true);
        setIsTimeUp(true);
      } else if (now >= startTime && now < endTime) {
        setIsExamStarted(true);
        const remaining = calculateTimeRemaining();
        if (remaining) setTimeRemaining(remaining);
      } else if (now < startTime) {
        const untilStart = calculateTimeUntilStart();
        if (untilStart) setTimeUntilStart(untilStart);
      }

    } catch (error) {
      console.error('Error fetching exam data:', error);
      setError(`Failed to load exam: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveProgressSilently = async () => {
    if (!examSubmission || !isExamActive || !studentInfo) return;
    
    try {
      const submissionData = {
        updated_at: new Date().toISOString(),
        answers: examAnswers,
        answer_text: answerText
      };

      const { error } = await supabase
        .from('exam_submissions')
        .update(submissionData)
        .eq('id', examSubmission.id);

      if (error) {
        console.error('Error saving progress:', error);
      } else {
        console.log('Progress saved silently');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const saveProgress = async (showAlert = false) => {
    if (!examSubmission || !isExamActive || !studentInfo) return;
    
    try {
      const submissionData = {
        updated_at: new Date().toISOString(),
        answers: examAnswers,
        answer_text: answerText
      };

      const { error } = await supabase
        .from('exam_submissions')
        .update(submissionData)
        .eq('id', examSubmission.id);

      if (error) {
        console.error('Error saving progress:', error);
        if (showAlert) showAlertModal('Save Failed', 'Failed to save progress. Please try again.', 'error');
      } else {
        console.log('Progress saved successfully');
        if (showAlert) showAlertModal('Success', 'Progress saved successfully!', 'success');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      if (showAlert) showAlertModal('Save Failed', 'Failed to save progress. Please check your connection.', 'error');
    }
  };

  const handleStartExam = () => {
    if (isStartingExam) return;
    
    if (isExamEnded) {
      showAlertModal('Exam Ended', 'This exam has already ended. Please contact your lecturer.', 'alert');
      return;
    }
    
    if (!isExamStarted) {
      showAlertModal('Not Started', `Exam has not started yet. It starts at ${formatEATDate(examStartTime)}`, 'alert');
      return;
    }
    
    proceedWithStart();
  };

  const proceedWithStart = async () => {
    if (isStartingExam) return;
    setIsStartingExam(true);
    
    try {
      if (!studentInfo) {
        throw new Error('Student information not available');
      }

      const submissionData = {
        exam_id: exam.id,
        student_id: studentInfo.student_id,
        status: 'started',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let submissionId;
      if (examSubmission) {
        const { data, error } = await supabase
          .from('exam_submissions')
          .update(submissionData)
          .eq('id', examSubmission.id)
          .select()
          .single();
        
        if (error) throw error;
        
        setExamSubmission(data);
        submissionId = data.id;
      } else {
        try {
          const { data, error } = await supabase
            .from('exam_submissions')
            .insert({
              exam_id: exam.id,
              student_id: studentInfo.student_id,
              status: 'started',
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (error) throw error;
          
          setExamSubmission(data);
          submissionId = data.id;
        } catch (insertError) {
          console.error('Insert failed:', insertError);
          
          const { data, error } = await supabase
            .from('exam_submissions')
            .insert({
              exam_id: exam.id,
              student_id: studentInfo.student_id,
              status: 'started'
            })
            .select()
            .single();
          
          if (error) throw error;
          
          setExamSubmission(data);
          submissionId = data.id;
        }
      }

      setShowStartConfirmation(false);
      setIsResuming(false);
      setIsExamActive(true);
      
      startAutoSave(submissionId);
      startTimer();
      
    } catch (error) {
      console.error('Error starting exam:', error);
      showAlertModal('Error', `Failed to start exam: ${error.message}`, 'error');
    } finally {
      setIsStartingExam(false);
    }
  };

  const validateSubmissionRequirements = () => {
    // If submission_type is 'file' or 'both', check for files
    if (submissionType === 'file' || submissionType === 'both') {
      if (exam.examType === 'online' && examQuestions.length > 0) {
        const answeredCount = Object.keys(examAnswers).length;
        if (answeredCount < examQuestions.length) {
          showAlertModal('Incomplete', `Please answer all ${examQuestions.length} questions before submitting.`, 'alert');
          return false;
        }
        return true;
      }
      
      if (exam.examType === 'written_online' || exam.examType === 'written') {
        if (examFiles.length === 0) {
          showAlertModal('No Files', 'This exam requires file upload. Please upload your answer files before submitting.', 'alert');
          return false;
        }
        return true;
      }
    }
    
    // If submission_type is 'text' or 'both', check for text
    if (submissionType === 'text' || submissionType === 'both') {
      if (exam.examType === 'online' && examQuestions.length > 0) {
        const answeredCount = Object.keys(examAnswers).length;
        if (answeredCount < examQuestions.length) {
          showAlertModal('Incomplete', `Please answer all ${examQuestions.length} questions before submitting.`, 'alert');
          return false;
        }
        return true;
      }
      
      if (exam.examType === 'written_online' || exam.examType === 'written') {
        if (answerText.trim().length < 20) {
          showAlertModal('Insufficient Answer', `Your answer is too short (${answerText.length} characters). Minimum 20 characters required.`, 'alert');
          return false;
        }
        return true;
      }
    }
    
    return true;
  };

  const handleSubmitExam = async () => {
    if (!exam || !studentInfo) return;
    
    if (!validateSubmissionRequirements()) {
      return;
    }
    
    let confirmMessage = 'Are you sure you want to submit the exam?\n\nOnce submitted, you cannot make changes.';
    
    if (submissionType === 'file') {
      confirmMessage = `Are you sure you want to submit the exam?\n\nYou have uploaded ${examFiles.length} file(s).\nOnce submitted, you cannot make changes.`;
    } else if (submissionType === 'text') {
      confirmMessage = `Are you sure you want to submit the exam?\n\nYour answer contains ${answerText.length} characters.\nOnce submitted, you cannot make changes.`;
    } else {
      confirmMessage = `Are you sure you want to submit the exam?\n\nText answer: ${answerText.length} characters\nFiles uploaded: ${examFiles.length}\nOnce submitted, you cannot make changes.`;
    }
    
    showConfirmModal(
      'Submit Exam',
      confirmMessage,
      async () => {
        await submitExamToServer();
      },
      null,
      'Yes, Submit',
      'Cancel'
    );
  };

  const submitExamToServer = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    if (!studentInfo) {
      showAlertModal('Error', 'Student information not available. Please try again.', 'error');
      isSubmittingRef.current = false;
      return;
    }
    
    setSubmittingExam(true);
    
    try {
      let answerFileUrls = [];
      
      if ((submissionType === 'file' || submissionType === 'both') && examFiles.length > 0) {
        try {
          answerFileUrls = await uploadExamFiles(exam.id, studentInfo.student_id);
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
        }
      }

      const submissionData = {
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (submissionType === 'text' || submissionType === 'both') {
        if (exam.examType === 'online' && examQuestions.length > 0) {
          submissionData.answers = examAnswers;
        } else if (exam.examType === 'written_online') {
          if (answerText) {
            submissionData.answer_text = answerText;
          }
        }
      }

      if ((submissionType === 'file' || submissionType === 'both') && answerFileUrls.length > 0) {
        submissionData.answer_files = answerFileUrls;
      }

      const { error } = await supabase
        .from('exam_submissions')
        .update(submissionData)
        .eq('exam_id', exam.id)
        .eq('student_id', studentInfo.student_id);

      if (error) {
        console.error('Submission update error:', error);
        if (error.message.includes('answer_text')) {
          delete submissionData.answer_text;
          const { error: retryError } = await supabase
            .from('exam_submissions')
            .update(submissionData)
            .eq('exam_id', exam.id)
            .eq('student_id', studentInfo.student_id);
          
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      const { data: verifyData, error: verifyError } = await supabase
        .from('exam_submissions')
        .select('status, submitted_at')
        .eq('exam_id', exam.id)
        .eq('student_id', studentInfo.student_id)
        .single();

      if (verifyError) {
        console.warn('Could not verify submission:', verifyError);
      } else {
        console.log('✅ Submission verified - Status:', verifyData.status);
        console.log('✅ Submitted at:', verifyData.submitted_at);
      }

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (timeRemainingIntervalRef.current) {
        clearInterval(timeRemainingIntervalRef.current);
        timeRemainingIntervalRef.current = null;
      }
      if (window.autoSaveInterval) {
        clearInterval(window.autoSaveInterval);
        delete window.autoSaveInterval;
      }

      localStorage.removeItem(`exam_confirmed_${examId}`);
      localStorage.removeItem(`exam-answers-${examId}`);
      localStorage.removeItem(`exam-text-${examId}`);
      localStorage.removeItem(`exam-active-${examId}`);
      localStorage.removeItem(`exam-cache-${examId}`);
      
      setIsExamActive(false);
      setSubmittingExam(false);
      isSubmittingRef.current = false;

      let successMessage = 'Your exam has been submitted successfully.\n\nYou will now be redirected to the examinations page.';
      
      if (submissionType === 'file') {
        successMessage = `✅ Your exam has been submitted successfully!\n\n${answerFileUrls.length} file(s) uploaded.\n\nYou will now be redirected to the examinations page.`;
      } else if (submissionType === 'text') {
        successMessage = `✅ Your exam has been submitted successfully!\n\nYour answer (${answerText.length} characters) has been saved.\n\nYou will now be redirected to the examinations page.`;
      }

      showAlertModal(
        '✅ Exam Submitted Successfully!', 
        successMessage,
        'success',
        () => {
          navigate('/examinations?fromExam=true&status=submitted', { 
            replace: true 
          });
        }
      );

    } catch (error) {
      console.error('Error submitting exam:', error);
      setSubmittingExam(false);
      isSubmittingRef.current = false;
      showAlertModal('Submission Failed', `Failed to submit exam: ${error.message}\n\nPlease save your work and contact support.`, 'error');
    }
  };

  const uploadExamFiles = async (examId, studentId) => {
    const uploadedUrls = [];
    
    for (let i = 0; i < examFiles.length; i++) {
      const file = examFiles[i];
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `${timestamp}_${randomStr}_${safeName}`;
      
      const filePath = `${studentId}/${examId}/${fileName}`;
      
      setUploadProgress(Math.round(((i + 1) / examFiles.length) * 100));

      try {
        const bucketName = 'Student exam';
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, { upsert: false });

        if (uploadError) {
          console.error('File upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      } catch (uploadError) {
        console.error('Upload failed:', uploadError);
      }
    }

    return uploadedUrls;
  };

  const downloadExamPaper = async (filePath) => {
    try {
      const { data, error } = await supabase.storage
        .from('Lecturer exam')
        .download(filePath);

      if (error) {
        throw error;
      }

      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      
      const fileName = filePath.split('/').pop();
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);

      setDownloadedPapers(prev => [...prev, filePath]);
      setShowDownloadDropdown(false);
      
      showAlertModal('Downloaded', `Downloaded: ${fileName}`, 'success');
    } catch (error) {
      console.error('Error downloading exam paper:', error);
      showAlertModal('Download Failed', `Failed to download file: ${error.message}`, 'error');
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + examFiles.length > 5) {
      showAlertModal('File Limit', 'Maximum 5 files allowed', 'alert');
      return;
    }
    setExamFiles([...examFiles, ...files]);
  };

  const handleRemoveFile = (index) => {
    setExamFiles(examFiles.filter((_, i) => i !== index));
  };

  const handleAnswerChange = (questionId, value) => {
    setExamAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const formatEndTime = (endTime) => {
    if (!endTime) return 'Not set';
    return formatEATTimeOnly(endTime);
  };

  const startAutoSave = (submissionId) => {
    if (window.autoSaveInterval) {
      clearInterval(window.autoSaveInterval);
    }
    
    window.autoSaveInterval = setInterval(() => {
      if (isExamActive && examSubmission) {
        saveProgressSilently();
      }
    }, 30000);
  };

  const handleCancelExam = async () => {
    if (!isExamActive) {
      navigate('/examinations');
      return;
    }

    showConfirmModal(
      'Exit Exam',
      'Are you sure you want to exit the exam?\n\nYour progress will be saved automatically.\nYou can resume the exam later from where you left off.',
      async () => {
        try {
          await saveProgressSilently();
        } catch (error) {
          console.error('Error saving on exit:', error);
        }
        
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        if (window.autoSaveInterval) {
          clearInterval(window.autoSaveInterval);
          delete window.autoSaveInterval;
        }
        
        setIsExamActive(false);
        localStorage.removeItem(`exam-active-${examId}`);
        showAlertModal('Exited', 'Exam exited successfully. You can resume it later from the examinations page.', 'success', () => {
          navigate('/examinations?fromExam=true&status=resume', { replace: true });
        });
      },
      null,
      'Exit Exam',
      'Stay'
    );
  };

  const handleResumeExam = () => {
    if (isExamEnded) {
      showAlertModal('Exam Ended', 'Exam time has ended. Please contact your lecturer.', 'alert');
      return;
    }
    
    if (!isExamStarted) {
      showAlertModal('Not Started', `Exam has not started yet. It starts at ${formatEATDate(examStartTime)}`, 'alert');
      return;
    }
    
    setIsResuming(false);
    setIsExamActive(true);
    
    if (examSubmission) {
      startAutoSave(examSubmission.id);
    }
    startTimer();
  };

  const handleCancelStart = () => {
    navigate('/examinations');
  };

  // Auto-submit when time is up
  useEffect(() => {
    if (isTimeUp && isExamActive && !isSubmittingRef.current) {
      const autoSubmit = async () => {
        showAlertModal('Time\'s Up!', 'Time is up! Your exam will be submitted automatically.', 'alert', async () => {
          await submitExamToServer();
        });
      };
      autoSubmit();
    }
  }, [isTimeUp, isExamActive]);

  // Custom Modal Component
  const Modal = () => {
    if (!modal.isOpen) return null;

    const getIcon = () => {
      switch (modal.type) {
        case 'confirm':
          return 'fa-question-circle';
        case 'success':
          return 'fa-check-circle';
        case 'error':
          return 'fa-exclamation-circle';
        default:
          return 'fa-info-circle';
      }
    };

    const getIconColor = () => {
      switch (modal.type) {
        case 'confirm':
          return '#3498db';
        case 'success':
          return '#28a745';
        case 'error':
          return '#dc3545';
        default:
          return '#ffc107';
      }
    };

    return (
      <div style={styles.modalOverlay} onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}>
        <div style={styles.modalContent}>
          <div style={styles.modalHeader}>
            <i className={`fas ${getIcon()}`} style={{ ...styles.modalIcon, color: getIconColor() }}></i>
            <h2 style={styles.modalTitle}>{modal.title}</h2>
          </div>
          
          <div style={styles.modalBody}>
            <p style={styles.modalMessage}>{modal.message}</p>
          </div>
          
          <div style={styles.modalFooter}>
            {modal.type === 'confirm' && modal.cancelText && (
              <button
                onClick={handleModalCancel}
                style={{ ...styles.modalButton, ...styles.modalCancelButton }}
              >
                {modal.cancelText}
              </button>
            )}
            <button
              onClick={handleModalConfirm}
              style={{
                ...styles.modalButton,
                ...styles.modalConfirmButton,
                backgroundColor: modal.type === 'error' ? '#dc3545' : 
                               modal.type === 'success' ? '#28a745' : '#007bff'
              }}
            >
              {modal.confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render loading state
  if (loading && !exam && !isExamActive) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading exam...</p>
        </div>
        <Modal />
      </div>
    );
  }

  // Render error state
  if (error || !exam) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <i className="fas fa-exclamation-triangle" style={styles.errorIcon}></i>
          <h3>Unable to Load Exam</h3>
          <p>{error || 'Exam not found'}</p>
          <div style={styles.studentInfo}>
            {studentInfo && (
              <div style={styles.studentDetails}>
                <p>Logged in as: {studentInfo.email}</p>
                <p>Student ID: {studentInfo.student_id}</p>
              </div>
            )}
          </div>
          <button onClick={() => navigate('/examinations')} style={styles.backButton}>
            <i className="fas fa-arrow-left"></i>
            Back to Examinations
          </button>
        </div>
        <Modal />
      </div>
    );
  }

  // If exam is active, render the active exam interface
  if (isExamActive) {
    const activeQuestion = examQuestions[activeQuestionIndex];
    const totalQuestions = examQuestions.length;
    const isLastQuestion = activeQuestionIndex === totalQuestions - 1;
    const isFirstQuestion = activeQuestionIndex === 0;

    const showTextArea = submissionType === 'text' || submissionType === 'both';
    const showFileUpload = submissionType === 'file' || submissionType === 'both';

    return (
      <div style={styles.container}>
        <Modal />

        <div style={styles.examHeader}>
          <div style={styles.headerLeft}>
            <div style={styles.courseInfo}>
              <h1 style={styles.courseCode}>{exam.courseCode}</h1>
              <div style={styles.examMeta}>
                <span style={styles.metaItem}>
                  <i className="fas fa-clock"></i> Ends: {formatEndTime(exam.endTime)}
                </span>
                <span style={styles.metaItem}>
                  <i className="fas fa-chart-bar"></i> {exam.totalMarks} marks
                </span>
                <span style={styles.metaItem}>
                  <i className="fas fa-user"></i> {studentInfo?.name || 'Student'}
                </span>
                <span style={{
                  ...styles.metaItem,
                  backgroundColor: submissionType === 'text' ? '#6f42c1' : 
                                  submissionType === 'file' ? '#dc3545' : '#28a745',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {submissionType === 'text' ? '📝 Text Answer' : 
                   submissionType === 'file' ? '📎 File Upload' : '📝+📎 Both'}
                </span>
              </div>
            </div>
          </div>
          
          <div style={styles.headerRight}>
            <div style={styles.timerContainer}>
              <div style={styles.timer}>
                <div style={styles.timerDisplay}>
                  <div style={styles.timeUnit}>
                    <div style={styles.timeNumber}>{timeRemaining.hours.toString().padStart(2, '0')}</div>
                    <div style={styles.timeLabel}>HOURS</div>
                  </div>
                  <div style={styles.timeSeparator}>:</div>
                  <div style={styles.timeUnit}>
                    <div style={styles.timeNumber}>{timeRemaining.minutes.toString().padStart(2, '0')}</div>
                    <div style={styles.timeLabel}>MINUTES</div>
                  </div>
                  <div style={styles.timeSeparator}>:</div>
                  <div style={styles.timeUnit}>
                    <div style={styles.timeNumber}>{timeRemaining.seconds.toString().padStart(2, '0')}</div>
                    <div style={styles.timeLabel}>SECONDS</div>
                  </div>
                </div>
                <div style={styles.timerProgress}>
                  <div style={styles.progressBarContainer}>
                    <div style={{
                      ...styles.progressBarFill,
                      width: `${((totalDurationMinutes - (timeRemaining.hours * 60 + timeRemaining.minutes)) / totalDurationMinutes) * 100}%`
                    }} />
                  </div>
                  <div style={styles.progressText}>
                    Elapsed: {timeElapsed.hours}h {timeElapsed.minutes}m / {totalDurationMinutes}m
                  </div>
                </div>
                <div style={styles.currentTimeDisplay}>
                  <i className="fas fa-clock"></i>
                  EAT: {getCurrentEATTime().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
            
            {exam.examFiles && exam.examFiles.length > 0 && (
              <div style={styles.downloadSection}>
                <button
                  onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                  style={styles.downloadToggle}
                >
                  <i className="fas fa-download"></i>
                  Download Papers
                  <i className={`fas fa-chevron-${showDownloadDropdown ? 'up' : 'down'}`} style={styles.dropdownArrow}></i>
                </button>
                
                {showDownloadDropdown && (
                  <div style={styles.downloadDropdown}>
                    <div style={styles.dropdownHeader}>
                      <i className="fas fa-file-pdf"></i>
                      <span style={styles.dropdownTitle}>Exam Papers</span>
                    </div>
                    <div style={styles.dropdownFiles}>
                      {exam.examFiles.map((filePath, index) => {
                        const fileName = filePath.split('/').pop();
                        const isDownloaded = downloadedPapers.includes(filePath);
                        
                        return (
                          <div key={index} style={styles.dropdownFileItem}>
                            <div style={styles.dropdownFileInfo}>
                              <i className="fas fa-file" style={styles.dropdownFileIcon}></i>
                              <div style={styles.dropdownFileName}>{fileName}</div>
                            </div>
                            <button
                              onClick={() => downloadExamPaper(filePath)}
                              style={{
                                ...styles.dropdownDownloadButton,
                                backgroundColor: isDownloaded ? '#6c757d' : '#007bff'
                              }}
                              disabled={isDownloaded}
                            >
                              {isDownloaded ? (
                                <>
                                  <i className="fas fa-check"></i>
                                  Downloaded
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-download"></i>
                                  Download
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {timeRemaining.hours === 0 && timeRemaining.minutes < 10 && timeRemaining.minutes > 0 && (
          <div style={styles.timeWarningAlert}>
            <i className="fas fa-exclamation-triangle"></i>
            <span>Time Alert: Less than {timeRemaining.minutes} minute{timeRemaining.minutes !== 1 ? 's' : ''} remaining!</span>
          </div>
        )}

        <div style={styles.examContent}>
          {exam.examType === 'online' && totalQuestions > 0 && (
            <div style={styles.sidebar}>
              <h4 style={styles.sidebarTitle}>
                <i className="fas fa-list-ol"></i>
                Questions ({totalQuestions})
              </h4>
              
              <div style={styles.questionGrid}>
                {examQuestions.map((question, index) => (
                  <button
                    key={question.id}
                    onClick={() => setActiveQuestionIndex(index)}
                    style={{
                      ...styles.questionButton,
                      backgroundColor: index === activeQuestionIndex ? '#3498db' : 
                                     examAnswers[question.id] ? '#2ecc71' : '#ecf0f1',
                      color: index === activeQuestionIndex ? 'white' : 
                            examAnswers[question.id] ? 'white' : '#2c3e50',
                      borderColor: index === activeQuestionIndex ? '#3498db' : 
                                  examAnswers[question.id] ? '#2ecc71' : '#e0e0e0'
                    }}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              
              <div style={styles.progressSection}>
                <div style={styles.progressLabel}>Progress</div>
                <div style={styles.progressBar}>
                  <div style={{
                    ...styles.progressFill,
                    width: totalQuestions > 0 ? `${(Object.keys(examAnswers).length / totalQuestions) * 100}%` : '0%'
                  }} />
                </div>
                <div style={styles.progressText}>
                  {Object.keys(examAnswers).length} / {totalQuestions} answered
                </div>
              </div>
              
              <button 
                onClick={() => saveProgress(true)}
                style={styles.saveButton}
                title="Save Progress"
              >
                <i className="fas fa-save"></i>
                Save Progress
              </button>
            </div>
          )}

          <div style={styles.questionArea}>
            {exam.examType === 'online' && totalQuestions > 0 ? (
              <div>
                <div style={styles.questionCard}>
                  <div style={styles.questionHeader}>
                    <h3 style={styles.questionTitle}>
                      Question {activeQuestionIndex + 1} of {totalQuestions}
                      {activeQuestion && activeQuestion.marks && (
                        <span style={styles.marksBadge}>
                          {activeQuestion.marks} marks
                        </span>
                      )}
                    </h3>
                    {activeQuestion && (
                      <div style={styles.questionType}>
                        {activeQuestion.question_type === 'multiple_choice' ? 'Multiple Choice' : 
                         activeQuestion.question_type === 'essay' ? 'Essay' : 'Short Answer'}
                      </div>
                    )}
                  </div>
                  
                  {activeQuestion && (
                    <>
                      <div style={styles.questionText}>
                        {activeQuestion.question_text}
                      </div>
                      
                      {activeQuestion.question_type === 'multiple_choice' && activeQuestion.options ? (
                        <div style={styles.optionsContainer}>
                          {(() => {
                            try {
                              const options = typeof activeQuestion.options === 'string' 
                                ? JSON.parse(activeQuestion.options) 
                                : activeQuestion.options;
                              
                              return options.map((option, index) => (
                                <label key={index} style={{
                                  ...styles.optionLabel,
                                  backgroundColor: examAnswers[activeQuestion.id] === option ? '#d4edda' : '#f8f9fa',
                                  borderColor: examAnswers[activeQuestion.id] === option ? '#28a745' : '#dee2e6',
                                }}>
                                  <input
                                    type="radio"
                                    name={`question-${activeQuestion.id}`}
                                    value={option}
                                    checked={examAnswers[activeQuestion.id] === option}
                                    onChange={(e) => handleAnswerChange(activeQuestion.id, e.target.value)}
                                    style={styles.radioInput}
                                  />
                                  <span style={styles.optionText}>{option}</span>
                                </label>
                              ));
                            } catch (e) {
                              return <div style={styles.errorText}>Error loading options</div>;
                            }
                          })()}
                        </div>
                      ) : (
                        showTextArea ? (
                          <textarea
                            value={examAnswers[activeQuestion.id] || ''}
                            onChange={(e) => handleAnswerChange(activeQuestion.id, e.target.value)}
                            onPaste={(e) => { 
                              e.preventDefault(); 
                              e.stopPropagation();
                              showAlertModal('Action Blocked', 'Pasting is not allowed during exams.', 'alert');
                              return false;
                            }}
                            onCopy={(e) => e.stopPropagation()}
                            onCut={(e) => { 
                              e.preventDefault(); 
                              e.stopPropagation();
                              showAlertModal('Action Blocked', 'Cutting is not allowed during exams.', 'alert');
                              return false;
                            }}
                            placeholder="Type your answer here..."
                            style={styles.answerTextarea}
                          />
                        ) : (
                          <div style={{
                            padding: '20px',
                            backgroundColor: '#fff3cd',
                            borderRadius: '8px',
                            textAlign: 'center',
                            color: '#856404'
                          }}>
                            <i className="fas fa-info-circle" style={{ marginRight: '10px' }}></i>
                            This exam only accepts file uploads. Please upload your answer files.
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>

                {totalQuestions > 1 && (
                  <div style={styles.navigationButtons}>
                    <button
                      onClick={() => setActiveQuestionIndex(activeQuestionIndex - 1)}
                      disabled={isFirstQuestion}
                      style={{
                        ...styles.navButton,
                        ...styles.prevButton,
                        opacity: isFirstQuestion ? 0.5 : 1,
                        cursor: isFirstQuestion ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <i className="fas fa-arrow-left"></i>
                      Previous
                    </button>
                    
                    <button
                      onClick={() => setActiveQuestionIndex(activeQuestionIndex + 1)}
                      disabled={isLastQuestion}
                      style={{
                        ...styles.navButton,
                        ...styles.nextButton,
                        opacity: isLastQuestion ? 0.5 : 1,
                        cursor: isLastQuestion ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next
                      <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // WRITTEN EXAM VIEW
              <div>
                <div style={styles.writtenExamCard}>
                  <h3 style={styles.writtenTitle}>
                    <i className="fas fa-file-alt"></i>
                    Written Exam Answer Sheet
                    <span style={{
                      fontSize: '14px',
                      backgroundColor: submissionType === 'text' ? '#6f42c1' : 
                                      submissionType === 'file' ? '#dc3545' : '#28a745',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      marginLeft: '15px',
                      fontWeight: '500'
                    }}>
                      {submissionType === 'text' ? '📝 Text Only' : 
                       submissionType === 'file' ? '📎 File Only' : '📝+📎 Both'}
                    </span>
                  </h3>
                  
                  <div style={styles.writtenInstructions}>
                    {exam.instructions || 'Please write your answers below or upload files.'}
                    <div style={styles.bucketNote}>
                      <i className="fas fa-info-circle"></i>
                      Your submitted files will be stored as full public URLs
                    </div>
                    <div style={{
                      marginTop: '12px',
                      padding: '12px 16px',
                      backgroundColor: '#e8f4fd',
                      borderRadius: '8px',
                      fontSize: '14px',
                      borderLeft: '4px solid #007bff'
                    }}>
                      <strong>Submission Requirements:</strong>
                      {submissionType === 'text' && ' You must provide a text answer (minimum 20 characters).'}
                      {submissionType === 'file' && ' You must upload at least one file (PDF, DOC, DOCX, JPG, PNG).'}
                      {submissionType === 'both' && ' You must provide either a text answer OR upload files (or both).'}
                    </div>
                  </div>
                  
                  {showTextArea && (
                    <div>
                      <textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        onPaste={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation();
                          showAlertModal('Action Blocked', 'Pasting is not allowed during exams.', 'alert');
                          return false;
                        }}
                        onCopy={(e) => e.stopPropagation()}
                        onCut={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation();
                          showAlertModal('Action Blocked', 'Cutting is not allowed during exams.', 'alert');
                          return false;
                        }}
                        placeholder={submissionType === 'file' ? 'Text answer is not required for this exam.' : "Write your exam answers here..."}
                        style={{
                          ...styles.writtenTextarea,
                          opacity: submissionType === 'file' ? 0.5 : 1,
                          cursor: submissionType === 'file' ? 'not-allowed' : 'text'
                        }}
                        disabled={submissionType === 'file'}
                      />
                      
                      {/* Character count display */}
                      {submissionType !== 'file' && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '-20px',
                          marginBottom: '20px',
                          padding: '0 15px'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}>
                            <span style={{
                              backgroundColor: answerCharCount > 0 ? '#e8f4fd' : '#f3f4f6',
                              color: answerCharCount > 0 ? '#0066cc' : '#6b7280',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '13px',
                              fontWeight: '500',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              <i className="fas fa-keyboard"></i>
                              {answerCharCount} {answerCharCount === 1 ? 'character' : 'characters'}
                            </span>
                          </div>
                          
                          {answerCharCount > 0 && (
                            <div style={{
                              fontSize: '12px',
                              color: answerCharCount < 20 ? '#dc3545' : '#28a745'
                            }}>
                              {answerCharCount < 20 ? (
                                <span>
                                  <i className="fas fa-exclamation-circle"></i> Minimum 20 characters required
                                </span>
                              ) : (
                                <span>
                                  <i className="fas fa-check-circle"></i> Character count satisfied
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!showTextArea && (
                    <div style={{
                      padding: '20px',
                      backgroundColor: '#fff3cd',
                      borderRadius: '8px',
                      textAlign: 'center',
                      marginBottom: '20px',
                      color: '#856404'
                    }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '10px' }}></i>
                      This exam only accepts file uploads. Please upload your answer files below.
                    </div>
                  )}
                  
                  {showFileUpload && (
                    <div>
                      <h4 style={styles.uploadTitle}>
                        <i className="fas fa-paperclip"></i>
                        {submissionType === 'file' ? 'Upload Your Answer Files (Required)' : 'Upload Supporting Files (Optional)'}
                      </h4>
                      
                      <div 
                        style={{
                          ...styles.uploadZone,
                          borderColor: submissionType === 'file' && examFiles.length === 0 ? '#dc3545' : '#007bff',
                          backgroundColor: submissionType === 'file' && examFiles.length === 0 ? '#fff5f5' : '#f8faff'
                        }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <i className="fas fa-cloud-upload-alt" style={styles.uploadIcon}></i>
                        <div style={styles.uploadText}>
                          {submissionType === 'file' ? '📎 Click to upload your answer files (Required)' : 'Click to upload files'}
                        </div>
                        <div style={styles.uploadSubtext}>
                          PDF, DOC, DOCX, JPG, PNG (Max 10MB each, up to 5 files)
                        </div>
                        <div style={styles.bucketSubtext}>
                          Files stored as full public URLs
                        </div>
                        {submissionType === 'file' && examFiles.length === 0 && (
                          <div style={{
                            marginTop: '10px',
                            color: '#dc3545',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}>
                            ⚠️ Please upload at least one file before submitting
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          style={styles.fileInput}
                          required={submissionType === 'file'}
                        />
                      </div>
                      
                      {examFiles.length > 0 && (
                        <div style={styles.uploadedFiles}>
                          <h5 style={styles.uploadedTitle}>
                            Uploaded Files ({examFiles.length}/5)
                          </h5>
                          {examFiles.map((file, index) => (
                            <div key={index} style={styles.fileItem}>
                              <div style={styles.fileInfo}>
                                <i className="fas fa-file" style={styles.fileIcon}></i>
                                <div>
                                  <div style={styles.fileName}>{file.name}</div>
                                  <div style={styles.fileSize}>
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveFile(index)}
                                style={styles.removeButton}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!showFileUpload && (
                    <div style={{
                      padding: '15px',
                      backgroundColor: '#e8f4fd',
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: '#004085',
                      marginTop: '20px'
                    }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                      This exam only accepts text answers. Please use the text area above.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={styles.examFooter}>
          <div style={styles.footerLeft}>
            <div style={styles.autoSaveIndicator}>
              <i className="fas fa-sync-alt" style={styles.autoSaveIcon}></i>
              <span style={styles.autoSaveText}>Auto-save enabled</span>
            </div>
            {uploadProgress > 0 && (
              <div style={styles.uploadProgress}>
                <div style={styles.progressBarContainer}>
                  <div style={{
                    ...styles.progressBarFill,
                    width: `${uploadProgress}%`
                  }} />
                </div>
                <span style={styles.progressText}>Uploading: {uploadProgress}%</span>
              </div>
            )}
          </div>
          
          <div style={styles.footerRight}>
            <button
              onClick={handleCancelExam}
              style={styles.exitButton}
            >
              <i className="fas fa-sign-out-alt"></i>
              Exit Exam
            </button>
            
            <button
              onClick={handleSubmitExam}
              disabled={submittingExam}
              style={{
                ...styles.submitButton,
                backgroundColor: submittingExam ? '#6c757d' : '#28a745',
                cursor: submittingExam ? 'not-allowed' : 'pointer'
              }}
            >
              {submittingExam ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Submit Exam
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render START CONFIRMATION SCREEN
  if (showStartConfirmation) {
    return (
      <div style={styles.container}>
        <Modal />
        <div style={styles.startContainer}>
          <div style={styles.startHeader}>
            <h1 style={styles.startTitle}>{exam.title}</h1>
            <p style={styles.startSubtitle}>
              <i className="fas fa-book"></i> {exam.courseCode}: {exam.courseName}
            </p>
            {studentInfo && (
              <div style={styles.studentBadge}>
                <i className="fas fa-user"></i> {studentInfo.name} ({studentInfo.student_id.slice(0, 8)}...)
              </div>
            )}
          </div>

          <div style={styles.startContent}>
            <div style={styles.instructions}>
              <h3><i className="fas fa-info-circle"></i> Instructions</h3>
              <ul style={styles.instructionsList}>
                <li>Exam ends at: {formatEndTime(exam.endTime)}</li>
                <li>Once started, you can exit and resume later</li>
                <li>
                  <strong>Submission Type:</strong> 
                  {submissionType === 'text' && ' 📝 Text Answer Only'}
                  {submissionType === 'file' && ' 📎 File Upload Only'}
                  {submissionType === 'both' && ' 📝 Text + 📎 File Upload'}
                </li>
                {submissionType === 'text' && (
                  <li>You must provide a text answer (minimum 20 characters)</li>
                )}
                {submissionType === 'file' && (
                  <li>You must upload at least one file (PDF, DOC, DOCX, JPG, PNG)</li>
                )}
                {submissionType === 'both' && (
                  <li>You can provide text answer AND/OR upload files</li>
                )}
                <li>Your progress is auto-saved every 30 seconds</li>
                <li>Make sure you have a stable internet connection</li>
                {isExamEnded && (
                  <li style={{color: '#dc3545', fontWeight: 'bold'}}>
                    <i className="fas fa-exclamation-triangle"></i> Exam period has ended
                  </li>
                )}
              </ul>
            </div>

            <div style={styles.examInfo}>
              <div style={styles.infoRow}>
                <i className="fas fa-clock"></i>
                <span>End Time: {formatEndTime(exam.endTime)}</span>
              </div>
              <div style={styles.infoRow}>
                <i className="fas fa-chart-bar"></i>
                <span>Total Marks: {exam.totalMarks}</span>
              </div>
              {exam.passingMarks && (
                <div style={styles.infoRow}>
                  <i className="fas fa-check-circle"></i>
                  <span>Passing Marks: {exam.passingMarks}</span>
                </div>
              )}
              <div style={styles.infoRow}>
                <i className="fas fa-question-circle"></i>
                <span>Type: {exam.examType === 'written_online' ? 'Written' : 'Online'} Exam</span>
              </div>
              <div style={{
                ...styles.infoRow,
                backgroundColor: submissionType === 'text' ? '#f3e8ff' : 
                                submissionType === 'file' ? '#ffe8e8' : '#e8f5e9',
                padding: '8px 12px',
                borderRadius: '6px',
                borderLeft: `4px solid ${submissionType === 'text' ? '#6f42c1' : 
                                          submissionType === 'file' ? '#dc3545' : '#28a745'}`
              }}>
                <i className="fas fa-pen"></i>
                <span>
                  <strong>Submission:</strong> 
                  {submissionType === 'text' ? ' 📝 Text Answer Only' : 
                   submissionType === 'file' ? ' 📎 File Upload Only' : ' 📝 Text + 📎 File Upload'}
                </span>
              </div>
              <div style={styles.infoRow}>
                <i className="fas fa-user"></i>
                <span>Student: {studentInfo?.name || 'Unknown'}</span>
              </div>
            </div>

            <div style={styles.buttonGroup}>
              <button 
                onClick={handleStartExam}
                style={{
                  ...styles.startButton,
                  backgroundColor: !isExamStarted || isExamEnded || isStartingExam ? '#6c757d' : '#28a745',
                  cursor: !isExamStarted || isExamEnded || isStartingExam ? 'not-allowed' : 'pointer'
                }}
                disabled={!isExamStarted || isExamEnded || isStartingExam}
              >
                {isStartingExam ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Starting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-play"></i>
                    Start Exam
                  </>
                )}
              </button>
              <button onClick={handleCancelStart} style={styles.cancelButton}>
                <i className="fas fa-times"></i>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render start/resume screen
  return (
    <div style={styles.container}>
      <Modal />
      <div style={styles.startContainer}>
        <div style={styles.startHeader}>
          <h1 style={styles.startTitle}>{exam.title}</h1>
          <p style={styles.startSubtitle}>
            <i className="fas fa-book"></i> {exam.courseCode}: {exam.courseName}
          </p>
          {studentInfo && (
            <div style={styles.studentBadge}>
              <i className="fas fa-user"></i> {studentInfo.name} ({studentInfo.student_id.slice(0, 8)}...)
            </div>
          )}
        </div>

        <div style={styles.startContent}>
          <div style={styles.scheduleInfo}>
            <h3><i className="fas fa-calendar-alt"></i> Exam Schedule</h3>
            <div style={styles.scheduleGrid}>
              <div style={styles.scheduleItem}>
                <i className="fas fa-play-circle" style={styles.scheduleIcon}></i>
                <div>
                  <div style={styles.scheduleLabel}>Start Time</div>
                  <div style={styles.scheduleValue}>{formatEATDate(exam.startTime)}</div>
                </div>
              </div>
              <div style={styles.scheduleItem}>
                <i className="fas fa-stop-circle" style={styles.scheduleIcon}></i>
                <div>
                  <div style={styles.scheduleLabel}>End Time</div>
                  <div style={styles.scheduleValue}>{formatEATDate(exam.endTime)}</div>
                </div>
              </div>
              <div style={styles.scheduleItem}>
                <i className="fas fa-clock" style={styles.scheduleIcon}></i>
                <div>
                  <div style={styles.scheduleLabel}>Duration</div>
                  <div style={styles.scheduleValue}>{exam.duration} minutes</div>
                </div>
              </div>
              <div style={styles.scheduleItem}>
                <i className="fas fa-globe-africa" style={styles.scheduleIcon}></i>
                <div>
                  <div style={styles.scheduleLabel}>Time Zone</div>
                  <div style={styles.scheduleValue}>East Africa Time (EAT)</div>
                </div>
              </div>
            </div>
          </div>

          {!isExamStarted && !isExamEnded && (
            <div style={styles.timeUntilStartContainer}>
              <div style={styles.timeUntilStartHeader}>
                <i className="fas fa-hourglass-start"></i>
                <span>Exam Starts In</span>
              </div>
              <div style={styles.timeUntilStartDisplay}>
                <div style={styles.timeUnit}>
                  <div style={styles.timeNumber}>{timeUntilStart.hours.toString().padStart(2, '0')}</div>
                  <div style={styles.timeLabel}>HOURS</div>
                </div>
                <div style={styles.timeSeparator}>:</div>
                <div style={styles.timeUnit}>
                  <div style={styles.timeNumber}>{timeUntilStart.minutes.toString().padStart(2, '0')}</div>
                  <div style={styles.timeLabel}>MINUTES</div>
                </div>
                <div style={styles.timeSeparator}>:</div>
                <div style={styles.timeUnit}>
                  <div style={styles.timeNumber}>{timeUntilStart.seconds.toString().padStart(2, '0')}</div>
                  <div style={styles.timeLabel}>SECONDS</div>
                </div>
              </div>
              <div style={styles.currentTime}>
                <i className="fas fa-clock"></i>
                Current Time (EAT): {getCurrentEATTime().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
              </div>
            </div>
          )}

          {isExamEnded && (
            <div style={styles.examEndedAlert}>
              <i className="fas fa-exclamation-triangle" style={styles.examEndedIcon}></i>
              <h3>Exam Period Has Ended</h3>
              <p>The scheduled exam time has passed. Please contact your lecturer for further instructions.</p>
              <div style={styles.examEndedInfo}>
                <div>Exam ended at: {formatEATDate(exam.endTime)}</div>
                <div>Current time (EAT): {getCurrentEATTime().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</div>
              </div>
            </div>
          )}

          {isResuming ? (
            <div style={styles.resumeAlert}>
              <i className="fas fa-history" style={styles.resumeIcon}></i>
              <h3>Resume Exam</h3>
              <p>You have an incomplete exam session. You can resume where you left off.</p>
              
              {isExamEnded ? (
                <div style={styles.timeUpWarning}>
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>Exam time has ended. Please contact your lecturer.</span>
                </div>
              ) : !isExamStarted ? (
                <div style={styles.timeInfo}>
                  <i className="fas fa-clock"></i>
                  <span>Exam starts at: {formatEATDate(exam.startTime)}</span>
                </div>
              ) : (
                <div style={styles.timeInfo}></div>
              )}
              
              <div style={styles.buttonGroup}>
                {!isExamEnded && isExamStarted && (
                  <button onClick={handleResumeExam} style={styles.resumeButton}>
                    <i className="fas fa-play-circle"></i>
                    Resume Exam
                  </button>
                )}
                {!isExamEnded && isExamStarted && (
                  <button onClick={handleCancelExam} style={styles.cancelButton}>
                    <i className="fas fa-times"></i>
                    Cancel
                  </button>
                )}
                <button onClick={handleSubmitExam} style={styles.submitButton}>
                  <i className="fas fa-paper-plane"></i>
                  Submit Now
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={styles.buttonGroup}>
                <button 
                  onClick={() => setShowStartConfirmation(true)}
                  style={{
                    ...styles.startButton,
                    backgroundColor: !isExamStarted || isExamEnded ? '#6c757d' : '#28a745',
                    cursor: !isExamStarted || isExamEnded ? 'not-allowed' : 'pointer'
                  }}
                  disabled={!isExamStarted || isExamEnded}
                >
                  <i className="fas fa-play"></i>
                  {!isExamStarted ? 'Waiting for Start Time' : isExamEnded ? 'Exam Ended' : 'Proceed to Exam'}
                </button>
                <button onClick={() => navigate('/examinations')} style={styles.cancelButton}>
                  <i className="fas fa-times"></i>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Styles (same as before)
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fb',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', sans-serif"
  },
  
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    maxWidth: '480px',
    width: '95%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden'
  },
  modalHeader: {
    padding: '24px 24px 16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    borderBottom: '1px solid #e9ecef'
  },
  modalIcon: {
    fontSize: '32px'
  },
  modalTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#2c3e50'
  },
  modalBody: {
    padding: '24px'
  },
  modalMessage: {
    margin: 0,
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#4a5568',
    whiteSpace: 'pre-wrap'
  },
  modalFooter: {
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    borderTop: '1px solid #e9ecef',
    backgroundColor: '#f8f9fa'
  },
  modalButton: {
    padding: '10px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  modalConfirmButton: {
    backgroundColor: '#007bff',
    color: 'white'
  },
  modalCancelButton: {
    backgroundColor: '#e9ecef',
    color: '#495057'
  },
  
  loadingContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    backgroundColor: '#f8f9fa'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  
  errorContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    padding: '40px',
    textAlign: 'center',
    backgroundColor: 'white',
    borderRadius: '12px',
    margin: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  errorIcon: {
    fontSize: '48px',
    color: '#dc3545',
    marginBottom: '10px'
  },
  studentInfo: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    margin: '15px 0',
    textAlign: 'left'
  },
  studentDetails: {
    fontSize: '14px',
    color: '#6c757d'
  },
  backButton: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  
  startContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backgroundColor: '#f8f9fa'
  },
  startHeader: {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '25px',
    borderRadius: '12px 12px 0 0',
    width: '100%',
    maxWidth: '900px',
    textAlign: 'center'
  },
  startTitle: {
    margin: '0 0 10px 0',
    fontSize: '28px',
    fontWeight: '600'
  },
  startSubtitle: {
    margin: '0',
    opacity: '0.9',
    fontSize: '16px'
  },
  studentBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    marginTop: '15px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px'
  },
  startContent: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '0 0 12px 12px',
    width: '100%',
    maxWidth: '900px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  
  scheduleInfo: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '25px'
  },
  scheduleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginTop: '15px'
  },
  scheduleItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #dee2e6'
  },
  scheduleIcon: {
    fontSize: '24px',
    color: '#007bff'
  },
  scheduleLabel: {
    fontSize: '12px',
    color: '#6c757d',
    marginBottom: '2px'
  },
  scheduleValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#2c3e50'
  },
  
  timeUntilStartContainer: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '8px',
    padding: '25px',
    marginBottom: '25px',
    textAlign: 'center'
  },
  timeUntilStartHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '15px',
    fontSize: '18px',
    fontWeight: '600',
    color: '#856404'
  },
  timeUntilStartDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '15px'
  },
  timeUnit: {
    textAlign: 'center'
  },
  timeNumber: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#856404',
    backgroundColor: 'white',
    padding: '10px',
    borderRadius: '8px',
    minWidth: '70px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  timeLabel: {
    fontSize: '10px',
    color: '#856404',
    marginTop: '5px',
    fontWeight: '500',
    textTransform: 'uppercase'
  },
  timeSeparator: {
    fontSize: '24px',
    color: '#856404',
    fontWeight: 'bold',
    marginBottom: '15px'
  },
  currentTime: {
    fontSize: '14px',
    color: '#856404',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  
  examEndedAlert: {
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '25px',
    textAlign: 'center'
  },
  examEndedIcon: {
    fontSize: '36px',
    color: '#dc3545',
    marginBottom: '15px'
  },
  examEndedInfo: {
    marginTop: '15px',
    fontSize: '14px',
    color: '#721c24'
  },
  
  instructions: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '25px',
    marginBottom: '25px'
  },
  instructionsList: {
    margin: '0',
    paddingLeft: '20px',
    lineHeight: '1.8',
    color: '#2c3e50'
  },
  examInfo: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '25px'
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
    paddingBottom: '10px',
    borderBottom: '1px solid #e9ecef',
    color: '#2c3e50'
  },
  buttonGroup: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  startButton: {
    padding: '14px 32px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  resumeAlert: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '8px',
    padding: '25px',
    marginBottom: '25px',
    textAlign: 'center'
  },
  resumeIcon: {
    fontSize: '48px',
    color: '#ffc107',
    marginBottom: '15px'
  },
  resumeButton: {
    padding: '14px 32px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  cancelButton: {
    padding: '14px 32px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  submitButton: {
    padding: '14px 32px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  timeInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '15px',
    marginBottom: '20px',
    fontSize: '18px',
    fontWeight: '600',
    color: '#856404'
  },
  timeUpWarning: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '15px',
    marginBottom: '20px',
    fontSize: '16px',
    fontWeight: '500',
    color: '#dc3545',
    backgroundColor: '#f8d7da',
    padding: '10px',
    borderRadius: '6px'
  },
  
  examHeader: {
    backgroundColor: 'white',
    padding: '15px 30px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerLeft: {
    flex: 1
  },
  courseInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  courseCode: {
    margin: '0',
    color: '#2c3e50',
    fontSize: '28px',
    fontWeight: '700'
  },
  examMeta: {
    display: 'flex',
    gap: '20px',
    color: '#6c757d',
    fontSize: '14px',
    alignItems: 'center'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  
  timerContainer: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    padding: '10px',
    minWidth: '280px'
  },
  timer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  timerDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    marginBottom: '8px'
  },
  timeWarning: {
    color: '#dc3545',
    fontWeight: 'bold'
  },
  timerProgress: {
    width: '100%',
    marginBottom: '5px'
  },
  progressBarContainer: {
    width: '100%',
    height: '6px',
    backgroundColor: '#e9ecef',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '3px'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#28a745',
    transition: 'width 1s linear'
  },
  progressText: {
    fontSize: '11px',
    color: '#6c757d',
    textAlign: 'center'
  },
  currentTimeDisplay: {
    fontSize: '11px',
    color: '#6c757d',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  
  timeWarningAlert: {
    backgroundColor: '#dc3545',
    color: 'white',
    padding: '10px 20px',
    textAlign: 'center',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  
  downloadSection: {
    position: 'relative'
  },
  downloadToggle: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease'
  },
  dropdownArrow: {
    fontSize: '12px',
    marginLeft: '5px'
  },
  downloadDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    border: '1px solid #dee2e6',
    minWidth: '350px',
    marginTop: '5px',
    zIndex: 1000
  },
  dropdownHeader: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderBottom: '1px solid #dee2e6',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderRadius: '8px 8px 0 0'
  },
  dropdownTitle: {
    fontWeight: '600',
    color: '#2c3e50',
    fontSize: '16px'
  },
  dropdownFiles: {
    maxHeight: '300px',
    overflowY: 'auto',
    padding: '10px'
  },
  dropdownFileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    marginBottom: '8px',
    border: '1px solid #e9ecef'
  },
  dropdownFileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    overflow: 'hidden'
  },
  dropdownFileIcon: {
    color: '#007bff',
    fontSize: '16px',
    flexShrink: 0
  },
  dropdownFileName: {
    fontSize: '13px',
    color: '#2c3e50',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '200px'
  },
  dropdownDownloadButton: {
    padding: '5px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    flexShrink: 0
  },
  
  examContent: {
    flex: 1,
    display: 'flex',
    padding: '20px',
    gap: '20px',
    overflow: 'hidden'
  },
  sidebar: {
    width: '280px',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    flexShrink: 0
  },
  sidebarTitle: {
    color: '#2c3e50',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  questionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '10px',
    marginBottom: '25px'
  },
  questionButton: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    border: '2px solid #e0e0e0',
    backgroundColor: '#f8f9fa',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease'
  },
  progressSection: {
    marginBottom: '25px',
    paddingBottom: '25px',
    borderBottom: '1px solid #e9ecef'
  },
  progressLabel: {
    fontSize: '12px',
    color: '#6c757d',
    marginBottom: '8px'
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
    transition: 'width 0.3s ease'
  },
  progressText: {
    fontSize: '12px',
    color: '#6c757d',
    textAlign: 'center'
  },
  saveButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  
  questionArea: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '10px'
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    marginBottom: '20px'
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid #e9ecef'
  },
  questionTitle: {
    margin: '0',
    color: '#2c3e50',
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  marksBadge: {
    backgroundColor: '#28a745',
    color: 'white',
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '12px',
    fontWeight: '500',
    marginLeft: '10px'
  },
  questionType: {
    backgroundColor: '#e8f4fc',
    color: '#0066cc',
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '12px',
    fontWeight: '500'
  },
  questionText: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#2c3e50',
    marginBottom: '25px',
    whiteSpace: 'pre-wrap'
  },
  errorText: {
    color: '#dc3545',
    padding: '10px',
    backgroundColor: '#f8d7da',
    borderRadius: '8px',
    marginTop: '10px'
  },
  
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  optionLabel: {
    padding: '16px 20px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s ease'
  },
  radioInput: {
    margin: '0',
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  optionText: {
    flex: 1,
    fontSize: '15px'
  },
  
  answerTextarea: {
    width: '100%',
    minHeight: '300px',
    maxHeight: '600px',
    padding: '20px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    lineHeight: '1.6',
    resize: 'vertical',
    fontFamily: "'Inter', sans-serif",
    backgroundColor: '#fafafa',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
    transition: 'border-color 0.2s ease'
  },
  
  navigationButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 30px'
  },
  navButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  prevButton: {
    backgroundColor: '#6c757d',
    color: 'white'
  },
  nextButton: {
    backgroundColor: '#007bff',
    color: 'white'
  },
  
  writtenExamCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
  },
  writtenTitle: {
    color: '#2c3e50',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  writtenInstructions: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '25px',
    color: '#6c757d',
    fontSize: '14px',
    lineHeight: '1.5'
  },
  bucketNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '10px',
    color: '#007bff',
    fontSize: '12px',
    fontWeight: '500'
  },
  writtenTextarea: {
    width: '100%',
    minHeight: '500px',
    maxHeight: '800px',
    padding: '25px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    lineHeight: '1.7',
    resize: 'vertical',
    fontFamily: "'Inter', sans-serif",
    marginBottom: '25px',
    backgroundColor: '#fafafa',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
    transition: 'border-color 0.2s ease'
  },
  
  uploadTitle: {
    color: '#2c3e50',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  uploadZone: {
    border: '2px dashed #007bff',
    borderRadius: '8px',
    padding: '40px 20px',
    textAlign: 'center',
    backgroundColor: '#f8faff',
    cursor: 'pointer',
    marginBottom: '20px'
  },
  uploadIcon: {
    fontSize: '48px',
    color: '#007bff',
    marginBottom: '15px'
  },
  uploadText: {
    fontSize: '18px',
    color: '#007bff',
    fontWeight: '500',
    marginBottom: '8px'
  },
  uploadSubtext: {
    fontSize: '14px',
    color: '#6c757d'
  },
  bucketSubtext: {
    fontSize: '12px',
    color: '#28a745',
    fontWeight: '500',
    marginTop: '8px'
  },
  fileInput: {
    display: 'none'
  },
  uploadedFiles: {
    marginTop: '20px'
  },
  uploadedTitle: {
    color: '#6c757d',
    marginBottom: '15px',
    fontSize: '14px',
    fontWeight: '500'
  },
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '10px',
    border: '1px solid #e9ecef'
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  fileIcon: {
    color: '#007bff',
    fontSize: '20px'
  },
  fileName: {
    fontSize: '14px',
    color: '#2c3e50',
    fontWeight: '500'
  },
  fileSize: {
    fontSize: '12px',
    color: '#6c757d'
  },
  removeButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  
  examFooter: {
    backgroundColor: 'white',
    padding: '20px 30px',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.05)'
  },
  footerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  autoSaveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#28a745'
  },
  autoSaveIcon: {
    fontSize: '16px',
    animation: 'spin 2s linear infinite'
  },
  autoSaveText: {
    fontWeight: '500'
  },
  uploadProgress: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  progressBarContainer: {
    width: '100px',
    height: '6px',
    backgroundColor: '#e9ecef',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#28a745'
  },
  progressText: {
    fontSize: '12px',
    color: '#6c757d'
  },
  
  footerRight: {
    display: 'flex',
    gap: '15px'
  },
  exitButton: {
    padding: '12px 24px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  submitButton: {
    padding: '12px 28px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  }
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  textarea:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }
`;
document.head.appendChild(styleSheet);

export default TakeExam;