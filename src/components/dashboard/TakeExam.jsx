// components/dashboard/TakeExam.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  const [remainingTime, setRemainingTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
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
  
  const fileInputRef = useRef(null);
  
  useEffect(() => {
    if (examId && user) {
      fetchStudentInfo();
    }
  }, [examId, user]);

  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      if (window.autoSaveInterval) {
        clearInterval(window.autoSaveInterval);
        delete window.autoSaveInterval;
      }
    };
  }, [timerInterval]);

  const fetchStudentInfo = async () => {
    try {
      // Use the auth user's ID as student_id (matches your CSV)
      const studentId = user?.id;
      
      if (!studentId) {
        throw new Error('User not authenticated');
      }
      
      // Create student info from auth user
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

      // Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from('examinations')
        .select('*')
        .eq('id', examId)
        .single();

      if (examError || !examData) {
        throw new Error('Exam not found');
      }

      // Try to fetch course details
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

      // Try to fetch student's exam submission
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

      if (submission && submission.status === 'started') {
        setIsResuming(true);
        setExamSubmission(submission);
        
        // Restore answers if any
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
        
        // Calculate remaining time
        if (submission.started_at) {
          const startedAt = new Date(submission.started_at);
          const now = new Date();
          const elapsedSeconds = Math.floor((now - startedAt) / 1000);
          const totalSeconds = (examData.duration_minutes || 60) * 60;
          const remaining = Math.max(0, totalSeconds - elapsedSeconds);
          
          setRemainingTime(remaining);
        }
      }

      // Try to fetch exam questions (ignore if fails)
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

      // Process exam data
      const processedExam = {
        id: examData.id,
        title: examData.title === 'NA' ? `${courseCode} Final` : examData.title,
        description: examData.description === 'NA' ? 'Final examination for the course' : examData.description,
        courseId: examData.course_id,
        courseCode,
        courseName,
        examType: examData.exam_type || 'online',
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

    } catch (error) {
      console.error('Error fetching exam data:', error);
      setError(`Failed to load exam: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimerInterval(interval);
  };

  const handleStartExam = async () => {
    try {
      if (!studentInfo) {
        throw new Error('Student information not available');
      }
      
      // Check if student has confirmed they started the exam
      const hasConfirmed = localStorage.getItem(`exam_confirmed_${examId}`);
      
      if (!hasConfirmed) {
        const startConfirmation = window.confirm(
          `Have you started the ${exam.title} exam?\n\n` +
          `Duration: ${exam.duration} minutes\n` +
          `Total Marks: ${exam.totalMarks}\n\n` +
          `Only confirm "OK" when you have physically started the exam.\n\n` +
          `Click "OK" to proceed to download exam papers.`
        );
        
        if (!startConfirmation) {
          return;
        }
        
        localStorage.setItem(`exam_confirmed_${examId}`, 'true');
      }
      
      const confirmed = window.confirm(
        `Are you ready to start the ${exam.title} exam?\n\n` +
        `Duration: ${exam.duration} minutes\n` +
        `Total Marks: ${exam.totalMarks}\n\n` +
        `Once started, the timer will begin. You can exit and resume later.\n\n` +
        `Do you want to continue?`
      );
      
      if (!confirmed) return;

      // Prepare submission data - NO registration_number
      const submissionData = {
        exam_id: exam.id,
        student_id: studentInfo.student_id,
        status: 'started',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let submissionId;
      if (examSubmission) {
        // Update existing submission
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
        // Create new submission - NO registration_number
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
          
          // Try simpler insert - NO registration_number
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

      setIsResuming(false);
      setIsExamActive(true);
      setRemainingTime(exam.duration * 60);
      startTimer();
      
      // Start auto-save
      startAutoSave(submissionId);
      
    } catch (error) {
      console.error('Error starting exam:', error);
      alert(`Failed to start exam. Please try again.\n\nError: ${error.message}`);
    }
  };

  const handleSubmitExam = async () => {
    if (!exam || !studentInfo) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to submit the exam?\n\n' +
      'Once submitted, you cannot make changes.'
    );
    
    if (!confirmed) return;
    
    await submitExamToServer();
  };

  const handleAutoSubmit = async () => {
    if (!exam || !studentInfo) return;
    
    alert('Time is up! Your exam is being submitted automatically.');
    await submitExamToServer();
  };

  const submitExamToServer = async () => {
    if (!studentInfo) {
      alert('Student information not available. Please try again.');
      return;
    }
    
    setSubmittingExam(true);
    
    try {
      // Upload answer files if any - they will return FULL PUBLIC URLs
      let answerFileUrls = [];
      if (examFiles.length > 0) {
        try {
          answerFileUrls = await uploadExamFiles(exam.id, studentInfo.student_id);
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
        }
      }

      // Prepare submission data
      const submissionData = {
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add answers based on exam type
      if (exam.examType === 'online' && examQuestions.length > 0) {
        submissionData.answers = examAnswers;
      } else if (exam.examType === 'written_online') {
        if (answerText) {
          submissionData.answer_text = answerText;
        }
      }

      // Add FULL PUBLIC URLs to answer_files (like assignment submissions)
      if (answerFileUrls.length > 0) {
        submissionData.answer_files = answerFileUrls; // Array of full URLs
      }

      // Update submission record
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

      // Clear timer
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }

      // Clear auto-save interval
      if (window.autoSaveInterval) {
        clearInterval(window.autoSaveInterval);
        delete window.autoSaveInterval;
      }

      // Clear confirmation
      localStorage.removeItem(`exam_confirmed_${examId}`);

      setIsExamActive(false);
      alert('Exam submitted successfully!');
      navigate('/examinations');
    } catch (error) {
      console.error('Error submitting exam:', error);
      alert(`Failed to submit exam: ${error.message}\n\nPlease save your work and contact support.`);
    } finally {
      setSubmittingExam(false);
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
      
      // Create the path structure: student_id/exam_id/filename
      const filePath = `${studentId}/${examId}/${fileName}`;
      
      setUploadProgress(Math.round(((i + 1) / examFiles.length) * 100));

      try {
        // Upload to 'exam_files' bucket
        const bucketName = 'Student exam'; // Adjust to your bucket name
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, { upsert: false });

        if (uploadError) {
          console.error('File upload error:', uploadError);
          continue;
        }

        // Generate FULL PUBLIC URL like assignment submissions
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        // Store the full URL
        uploadedUrls.push(publicUrl);
      } catch (uploadError) {
        console.error('Upload failed:', uploadError);
      }
    }

    return uploadedUrls;
  };

  const downloadExamPaper = async (filePath) => {
    try {
      // Download from storage
      const { data, error } = await supabase.storage
        .from('Lecturer exam')
        .download(filePath);

      if (error) {
        throw error;
      }

      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from path
      const fileName = filePath.split('/').pop();
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Add to downloaded papers list
      setDownloadedPapers(prev => [...prev, filePath]);
      
      // Close dropdown after download
      setShowDownloadDropdown(false);
      
      alert(`Downloaded: ${fileName}`);
    } catch (error) {
      console.error('Error downloading exam paper:', error);
      alert(`Failed to download file: ${error.message}`);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + examFiles.length > 5) {
      alert('Maximum 5 files allowed');
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

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        if (showAlert) alert('Failed to save progress. Please try again.');
      } else {
        console.log('Progress saved successfully');
        if (showAlert) alert('Progress saved successfully!');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      if (showAlert) alert('Failed to save progress. Please check your connection.');
    }
  };

  const startAutoSave = (submissionId) => {
    // Clear any existing auto-save interval
    if (window.autoSaveInterval) {
      clearInterval(window.autoSaveInterval);
    }
    
    // Auto-save every 30 seconds
    window.autoSaveInterval = setInterval(() => {
      if (isExamActive && examSubmission) {
        saveProgress(false);
      }
    }, 30000);
  };

  const handleCancelExam = async () => {
    if (!isExamActive) {
      navigate('/examinations');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to exit the exam?\n\n' +
      'Your progress will be saved automatically.\n' +
      'You can resume the exam later from where you left off.'
    );
    
    if (!confirmed) return;

    // Save current progress
    try {
      await saveProgress(false);
    } catch (error) {
      console.error('Error saving on exit:', error);
    }
    
    // Clear timer but keep exam active for resume
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    // Clear auto-save interval
    if (window.autoSaveInterval) {
      clearInterval(window.autoSaveInterval);
      delete window.autoSaveInterval;
    }
    
    setIsExamActive(false);
    alert('Exam exited successfully. You can resume it later from the examinations page.');
    navigate('/examinations');
  };

  const handleResumeExam = () => {
    setIsResuming(false);
    setIsExamActive(true);
    startTimer();
    
    // Restart auto-save
    if (examSubmission) {
      startAutoSave(examSubmission.id);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading exam...</p>
        </div>
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
      </div>
    );
  }

  // Render start/resume screen (exam not active)
  if (!isExamActive) {
    return (
      <div style={styles.container}>
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
            {/* Resume section */}
            {isResuming && remainingTime > 0 ? (
              <div style={styles.resumeAlert}>
                <i className="fas fa-history" style={styles.resumeIcon}></i>
                <h3>Resume Exam</h3>
                <p>You have an incomplete exam session. You can resume where you left off.</p>
                <div style={styles.timeInfo}>
                  <i className="fas fa-hourglass-half"></i>
                  <span>Time remaining: {formatTime(remainingTime)}</span>
                </div>
                
                <div style={styles.buttonGroup}>
                  <button onClick={handleResumeExam} style={styles.resumeButton}>
                    <i className="fas fa-play-circle"></i>
                    Resume Exam
                  </button>
                  <button onClick={handleCancelExam} style={styles.cancelButton}>
                    <i className="fas fa-times"></i>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Start new exam section */
              <div>
                <div style={styles.instructions}>
                  <h3><i className="fas fa-info-circle"></i> Instructions</h3>
                  <ul style={styles.instructionsList}>
                    <li>You have {exam.duration} minutes to complete the exam</li>
                    <li>Once started, the timer will begin automatically</li>
                    <li>You can exit and resume the exam later</li>
                    <li>Your progress is auto-saved every 30 seconds</li>
                    <li>Make sure you have a stable internet connection</li>
                    <li>The exam will auto-submit when time expires</li>
                    <li>Submit files will be stored as full public URLs</li>
                  </ul>
                </div>

                <div style={styles.examInfo}>
                  <div style={styles.infoRow}>
                    <i className="fas fa-clock"></i>
                    <span>Duration: {exam.duration} minutes</span>
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
                  <div style={styles.infoRow}>
                    <i className="fas fa-user"></i>
                    <span>Student: {studentInfo?.name || 'Unknown'}</span>
                  </div>
                </div>

                <div style={styles.buttonGroup}>
                  <button onClick={handleStartExam} style={styles.startButton}>
                    <i className="fas fa-play"></i>
                    Start Exam
                  </button>
                  <button onClick={handleCancelExam} style={styles.cancelButton}>
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
  }

  // Render active exam interface
  const activeQuestion = examQuestions[activeQuestionIndex];
  const totalQuestions = examQuestions.length;
  const isLastQuestion = activeQuestionIndex === totalQuestions - 1;
  const isFirstQuestion = activeQuestionIndex === 0;

  return (
    <div style={styles.container}>
      {/* Exam Header */}
      <div style={styles.examHeader}>
        <div style={styles.headerLeft}>
          <div style={styles.courseInfo}>
            <h1 style={styles.courseCode}>{exam.courseCode}</h1>
            <div style={styles.examMeta}>
              <span style={styles.metaItem}>
                <i className="fas fa-clock"></i> {exam.duration} minutes
              </span>
              <span style={styles.metaItem}>
                <i className="fas fa-chart-bar"></i> {exam.totalMarks} marks
              </span>
              <span style={styles.metaItem}>
                <i className="fas fa-user"></i> {studentInfo?.name || 'Student'}
              </span>
            </div>
          </div>
        </div>
        
        <div style={styles.headerRight}>
          {/* Download Button */}
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
          
          {/* Timer */}
          <div style={styles.timerContainer}>
            <div style={styles.timerDisplay}>
              <div style={{
                ...styles.timer,
                color: remainingTime < 300 ? '#e74c3c' : '#2ecc71'
              }}>
                {formatTime(remainingTime)}
              </div>
              <div style={styles.timerLabel}>Time Remaining</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Exam Content */}
      <div style={styles.examContent}>
        {/* Questions Navigation - Only show for online exams with questions */}
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

        {/* Question Area */}
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
                    
                    {/* Answer Area */}
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
                      <textarea
                        value={examAnswers[activeQuestion.id] || ''}
                        onChange={(e) => handleAnswerChange(activeQuestion.id, e.target.value)}
                        placeholder="Type your answer here..."
                        style={styles.answerTextarea}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Navigation Buttons */}
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
            /* Written Exam Interface */
            <div>
              <div style={styles.writtenExamCard}>
                <h3 style={styles.writtenTitle}>
                  <i className="fas fa-file-alt"></i>
                  Written Exam Answer Sheet
                </h3>
                
                <div style={styles.writtenInstructions}>
                  {exam.instructions || 'Please write your answers below. You can also upload files if needed.'}
                  <div style={styles.bucketNote}>
                    <i className="fas fa-info-circle"></i>
                    Your submitted files will be stored as full public URLs
                  </div>
                </div>
                
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Write your exam answers here...\n\nYou can type your responses, essays, calculations, etc.\n\nMake sure to save your work periodically."
                  style={styles.writtenTextarea}
                />
                
                {/* File Upload Section */}
                <div>
                  <h4 style={styles.uploadTitle}>
                    <i className="fas fa-paperclip"></i>
                    Upload Supporting Files
                  </h4>
                  
                  <div 
                    style={styles.uploadZone}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <i className="fas fa-cloud-upload-alt" style={styles.uploadIcon}></i>
                    <div style={styles.uploadText}>
                      Click to upload files
                    </div>
                    <div style={styles.uploadSubtext}>
                      PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                    </div>
                    <div style={styles.bucketSubtext}>
                      Files stored as full public URLs
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      style={styles.fileInput}
                    />
                  </div>
                  
                  {/* Uploaded Files List */}
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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Exam Footer */}
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
};

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fb',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', sans-serif"
  },
  
  // Loading styles
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
  
  // Error styles
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
  
  // Start/Resume screen styles
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
    maxWidth: '800px',
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
    maxWidth: '800px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
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
    justifyContent: 'center'
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
  
  // Active exam header styles
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
  
  // Download section in header
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
  
  timerContainer: {
    textAlign: 'center',
    minWidth: '160px'
  },
  timerDisplay: {
    backgroundColor: '#f8f9fa',
    padding: '10px 15px',
    borderRadius: '8px',
    border: '2px solid #e9ecef'
  },
  timer: {
    fontSize: '24px',
    fontWeight: '700',
    fontFamily: "'Roboto Mono', monospace",
    marginBottom: '4px',
    color: '#2ecc71'
  },
  timerLabel: {
    fontSize: '11px',
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  
  // Exam content styles
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
  
  // Question area styles
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
  
  // Multiple choice options
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
  
  // Text answer area
  answerTextarea: {
    width: '100%',
    minHeight: '150px',
    padding: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '15px',
    lineHeight: '1.5',
    resize: 'vertical',
    fontFamily: "'Inter', sans-serif"
  },
  
  // Navigation buttons
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
  
  // Written exam styles
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
    minHeight: '300px',
    padding: '20px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '15px',
    lineHeight: '1.6',
    resize: 'vertical',
    fontFamily: "'Inter', sans-serif",
    marginBottom: '25px'
  },
  
  // File upload styles
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
  
  // Exam footer styles
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
`;
document.head.appendChild(styleSheet);

export default TakeExam;