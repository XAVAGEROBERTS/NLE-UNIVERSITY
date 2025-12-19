import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';
import SubmissionModal from "./SubmissionModal.jsx";

const Coursework = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const { user } = useStudentAuth();

  // Lock scroll when any modal is open
  useEffect(() => {
    if (showSubmissionModal || showResultsModal || showFilesModal || showDetailsModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [showSubmissionModal, showResultsModal, showFilesModal, showDetailsModal]);

  useEffect(() => {
    if (user?.email) {
      fetchAssignments();
    }
  }, [user]);

  // =================== FETCH ASSIGNMENTS WITH LECTURER FILES ===================
  const fetchAssignments = async () => {
    try {
      setLoading(true);
      console.clear();
      console.log('🚀 ===== STARTING ASSIGNMENT FETCH =====');

      // 1. Get student by email
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, student_id, full_name, email, department_code')
        .eq('email', user.email)
        .single();

      if (studentError) {
        console.error('❌ Student error:', studentError);
        throw studentError;
      }
      
      setStudentId(student.id);

      console.log('👤 STUDENT:', {
        id: student.id,
        name: student.full_name,
        email: student.email,
        department: student.department_code
      });

      // 2. Get assignments for student's department - CHANGED: Sort by created_at DESC for newest first
      console.log(`🔍 Fetching assignments for department: ${student.department_code}`);
      
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          *,
          courses!inner (
            id,
            course_code,
            course_name,
            department_code
          ),
          lecturers (full_name)
        `)
        .eq('courses.department_code', student.department_code)
        .in('status', ['published', 'closed', 'graded'])
        .order('created_at', { ascending: false }); // CHANGED: Sort by creation date, newest first

      if (assignmentsError) {
        console.error('❌ Assignments error:', assignmentsError);
        throw assignmentsError;
      }

      console.log(`📚 Found ${assignmentsData?.length || 0} assignments`);

      // 3. Get THIS STUDENT'S submissions only
      const { data: submissions, error: subsError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', student.id);

      if (subsError) {
        console.error('❌ Submissions error:', subsError);
        throw subsError;
      }

      console.log(`📤 Student has ${submissions?.length || 0} submissions`);

      // 4. Process assignments with PROPER BUCKET URLS
      const processedAssignments = (assignmentsData || []).map(assignment => {
        // Find THIS student's submission
        const submission = submissions?.find(sub => 
          sub.assignment_id === assignment.id
        );

        // Check submission status
        let isSubmitted = false;
        let submissionStatus = 'not submitted';
        let canSubmit = true;
        let isGraded = false;
        
        if (submission) {
          submissionStatus = submission.status || 'not submitted';
          isSubmitted = ['submitted', 'graded', 'late'].includes(submissionStatus);
          isGraded = submissionStatus === 'graded';
        }

        const dueDate = new Date(assignment.due_date);
        const now = new Date();
        const isPastDue = dueDate < now;
        canSubmit = !isSubmitted && !isPastDue;

        // =========== CRITICAL: PROCESS LECTURER FILES FROM LECTURERBUCKET ===========
        const assignmentFiles = assignment.file_urls || [];
        const processedFiles = assignmentFiles.map(fileUrl => {
          if (!fileUrl) return null;
          
          // If it's already a full URL, keep it
          if (fileUrl.startsWith('http')) {
            return fileUrl;
          }
          
          // If it's a path/name, construct lecturerbucket URL
          // Get project reference from Supabase URL
          const projectRef = supabase.supabaseUrl.split('//')[1].split('.')[0];
          
          // Try to extract file path from different formats
          let filePath = fileUrl;
          
          // Remove any "lecturerbucket/" prefix if present
          if (filePath.includes('lecturerbucket/')) {
            filePath = filePath.split('lecturerbucket/')[1];
          }
          
          // Construct the full URL to lecturerbucket
          const fullUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/lecturerbucket/${filePath}`;
          
          console.log(`📁 Lecturer file: ${filePath} → ${fullUrl}`);
          return fullUrl;
        }).filter(url => url && url !== '');

        console.log(`   Assignment "${assignment.title}": ${processedFiles.length} lecturer files`);

        // =========== PROCESS STUDENT SUBMISSION FILES (from assignments bucket) ===========
        const studentSubmissionFiles = (submission?.file_urls || []).map(fileUrl => {
          if (!fileUrl) return null;
          
          if (fileUrl.startsWith('http')) {
            return fileUrl;
          }
          
          // Get project reference
          const projectRef = supabase.supabaseUrl.split('//')[1].split('.')[0];
          
          // Student submissions go to 'assignments' bucket
          const fullUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/assignments/${fileUrl}`;
          
          return fullUrl;
        }).filter(url => url && url !== '');

        // Find main PDF file from lecturer
        const mainPdfFile = processedFiles.find(file => 
          file && (file.toLowerCase().endsWith('.pdf') || 
          file.includes('assignment') || 
          file.includes('question'))
        ) || processedFiles[0];

        return {
          id: assignment.id,
          courseCode: assignment.courses?.course_code || 'N/A',
          courseName: assignment.courses?.course_name || 'N/A',
          courseDepartment: assignment.courses?.department_code,
          title: assignment.title,
          description: assignment.description || '',
          instructions: assignment.instructions || '',
          assignedDate: new Date(assignment.created_at).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }),
          dueDate: dueDate.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }) + ' EAT',
          rawDueDate: dueDate,
          isPastDue,
          status: submissionStatus,
          isSubmitted: isSubmitted,
          submissionId: submission?.id,
          submissionDate: submission?.submission_date,
          fileUrls: studentSubmissionFiles, // Student's submitted files (assignments bucket)
          submittedText: submission?.submitted_text || '',
          feedback: submission?.feedback || '',
          marks: submission?.marks_obtained
            ? `${submission.marks_obtained}/${assignment.total_marks}`
            : '',
          totalMarks: assignment.total_marks,
          obtainedMarks: submission?.marks_obtained,
          lecturer: assignment.lecturers?.full_name || 'Unknown Lecturer',
          submission_type: assignment.submission_type || 'file',
          allowed_formats: assignment.allowed_formats || ['pdf', 'doc', 'docx', 'zip'],
          max_file_size: assignment.max_file_size || 10,
          assignment_files: processedFiles, // Lecturer's files (lecturerbucket)
          main_assignment_file: mainPdfFile,
          canSubmit: canSubmit,
          isGraded: isGraded,
          original_file_urls: assignment.file_urls || [],
          created_at: assignment.created_at // Keep for sorting
        };
      });

      console.log(`✅ Processed ${processedAssignments.length} assignments`);
      
      // CHANGED: Already sorted by created_at DESC from the query
      setAssignments(processedAssignments);

    } catch (error) {
      console.error('❌ Error in fetchAssignments:', error);
      alert(`Error loading assignments: ${error.message}`);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  // =================== ENHANCED FILE DOWNLOAD FUNCTIONS ===================
 const handleDownloadAssignmentFile = async (assignment, fileUrl = null) => {
  const url = fileUrl || assignment.main_assignment_file;
  
  if (!url) {
    handleViewAllFiles(assignment);
    return;
  }

  try {
    // Extract filename from URL
    let fileName = `Assignment_${assignment.title.replace(/[^a-z0-9]/gi, '_')}`;
    
    // Try to get actual filename from URL
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart && lastPart.includes('.')) {
      const actualFileName = lastPart.split('?')[0];
      fileName = decodeURIComponent(actualFileName); // Decode URL-encoded characters
    }
    
    console.log(`📥 Downloading lecturer file: ${fileName} from ${url}`);

    // FORCE DOWNLOAD instead of opening in new tab
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName; // This forces download instead of opening
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    }, 100);
    
    console.log('✅ Download started');
  } catch (error) {
    console.error('❌ Error downloading assignment file:', error);
    
    // Fallback to old method if fetch fails
    try {
      const a = document.createElement('a');
      a.href = url;
      
      // Extract filename for download attribute
      const urlParts = url.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      if (lastPart && lastPart.includes('.')) {
        a.download = lastPart.split('?')[0];
      } else {
        a.download = `Assignment_${assignment.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      }
      
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      console.log('✅ Download started (fallback method)');
    } catch (fallbackError) {
      console.error('❌ Fallback download failed:', fallbackError);
      alert('Error downloading assignment file. Please try again or contact support.');
    }
  }
};

const handleDownloadSubmittedFiles = async (assignment) => {
  if (!assignment.fileUrls || assignment.fileUrls.length === 0) {
    alert('No files submitted for this assignment');
    return;
  }

  try {
    const confirmed = window.confirm(
      `Download ${assignment.fileUrls.length} submitted file(s) for "${assignment.title}"?`
    );
    
    if (!confirmed) return;
    
    for (let i = 0; i < assignment.fileUrls.length; i++) {
      const fileUrl = assignment.fileUrls[i];
      let fileName = `my_submission_${assignment.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${i + 1}`;
      
      // Try to get actual filename
      const urlParts = fileUrl.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      if (lastPart && lastPart.includes('.')) {
        fileName = `submission_${lastPart.split('?')[0]}`;
      }
      
      console.log(`📥 Downloading student submission: ${fileName} from ${fileUrl}`);
      
      try {
        // Try fetch method first for proper download
        const response = await fetch(fileUrl);
        if (response.ok) {
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = fileName;
          a.style.display = 'none';
          
          document.body.appendChild(a);
          a.click();
          
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
          }, 100);
        } else {
          // Fallback to direct method
          const a = document.createElement('a');
          a.href = fileUrl;
          a.download = fileName;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
          }, 100);
        }
      } catch (error) {
        console.warn(`⚠️ Could not download file ${i + 1}:`, error);
        // Continue with next file
      }
      
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('✅ All student files downloaded');
    alert(`${assignment.fileUrls.length} file(s) downloaded successfully!`);
  } catch (error) {
    console.error('❌ Error downloading submission files:', error);
    alert('Error downloading submission files. Please try again.');
  }
};

  // =================== MODAL HANDLERS ===================
  const handleSubmitAssignment = (assignment) => {
    if (!assignment.canSubmit) {
      alert('This assignment is past the due date. Submissions are no longer accepted.');
      return;
    }
    setSelectedAssignment(assignment);
    setShowSubmissionModal(true);
  };

  const handleViewResults = (assignment) => {
    setSelectedAssignment(assignment);
    setShowResultsModal(true);
  };

  const handleViewAllFiles = (assignment) => {
    setSelectedAssignment(assignment);
    setShowFilesModal(true);
  };

  const handleViewDetails = (assignment) => {
    setSelectedAssignment(assignment);
    setShowDetailsModal(true);
  };

  // =================== HELPER FUNCTIONS ===================
  const getMarksColor = (marks) => {
    if (!marks) return '';
    const [obtained, total] = marks.split('/').map(Number);
    const percentage = (obtained / total) * 100;
    if (percentage >= 90) return 'excellent';
    if (percentage >= 75) return 'good';
    if (percentage >= 50) return 'average';
    return 'poor';
  };

  // =================== MODAL COMPONENTS ===================
  const AssignmentResultsModal = () => {
    if (!selectedAssignment) return null;

    const submissionDate = selectedAssignment.submissionDate
      ? new Date(selectedAssignment.submissionDate).toLocaleString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      : 'Not available';

    return (
      <div className="coursework-modal-overlay">
        <div className="coursework-modal">
          <div className="coursework-modal-header">
            <h3>📊 Assignment Results</h3>
            <button className="coursework-modal-close" onClick={() => setShowResultsModal(false)}>
              ×
            </button>
          </div>
          
          <div className="coursework-modal-body">
            <div className="coursework-results-card">
              <h4>{selectedAssignment.title}</h4>
              <p className="coursework-course-info">
                {selectedAssignment.courseCode} - {selectedAssignment.courseName}
              </p>
              
              <div className="coursework-marks-section">
                <div className="coursework-marks-display">
                  <span className="coursework-marks-label">Your Score</span>
                  <span className={`coursework-marks-value coursework-marks-${getMarksColor(selectedAssignment.marks)}`}>
                    {selectedAssignment.marks || 'Not graded'}
                  </span>
                </div>
                
                {selectedAssignment.obtainedMarks && (
                  <div className="coursework-percentage">
                    <span className="coursework-percentage-label">Percentage</span>
                    <span className="coursework-percentage-value">
                      {Math.round((selectedAssignment.obtainedMarks / selectedAssignment.totalMarks) * 100)}%
                    </span>
                  </div>
                )}
              </div>
              
              <div className="coursework-details-grid">
                <div className="coursework-detail-item">
                  <span className="coursework-detail-label">Submission Date:</span>
                  <span className="coursework-detail-value">{submissionDate}</span>
                </div>
                <div className="coursework-detail-item">
                  <span className="coursework-detail-label">Status:</span>
                  <span className="coursework-detail-value">{selectedAssignment.status}</span>
                </div>
                <div className="coursework-detail-item">
                  <span className="coursework-detail-label">Total Marks:</span>
                  <span className="coursework-detail-value">{selectedAssignment.totalMarks}</span>
                </div>
                <div className="coursework-detail-item">
                  <span className="coursework-detail-label">Lecturer:</span>
                  <span className="coursework-detail-value">{selectedAssignment.lecturer}</span>
                </div>
              </div>
              
              {selectedAssignment.feedback && (
                <div className="coursework-feedback-section">
                  <h5>Feedback from Lecturer</h5>
                  <div className="coursework-feedback-content">
                    {selectedAssignment.feedback}
                  </div>
                </div>
              )}
              
              {selectedAssignment.fileUrls && selectedAssignment.fileUrls.length > 0 && (
                <div className="coursework-submitted-files">
                  <h5>Your Submitted Files (assignments bucket)</h5>
                  <div className="coursework-files-list">
                    {selectedAssignment.fileUrls.map((url, index) => (
                      <div key={index} className="coursework-file-item">
                        <span className="coursework-file-name">File {index + 1}</span>
                        <button
  className="coursework-download-btn"
  onClick={() => {
    const fileName = `submission_${selectedAssignment.title.replace(/[^a-z0-9]/gi, '_')}_${index + 1}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);
  }}
>
  Download
</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="coursework-modal-footer">
            <button className="coursework-btn coursework-btn-primary" onClick={() => setShowResultsModal(false)}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const AssignmentFilesModal = () => {
    if (!selectedAssignment) return null;

    return (
      <div className="coursework-modal-overlay">
        <div className="coursework-modal coursework-modal-large">
          <div className="coursework-modal-header">
            <h3>📁 Assignment Files</h3>
            <button className="coursework-modal-close" onClick={() => setShowFilesModal(false)}>
              ×
            </button>
          </div>
          
          <div className="coursework-modal-body">
            <div className="coursework-assignment-info">
              <h4>{selectedAssignment.title}</h4>
              <p className="coursework-course-info">
                {selectedAssignment.courseCode} - {selectedAssignment.courseName}
              </p>
              <p className="coursework-files-count">
                Total Files: {selectedAssignment.assignment_files?.length || 0}
              </p>
            </div>
            
            <div className="coursework-files-grid">
              {selectedAssignment.assignment_files?.map((fileUrl, index) => {
                if (!fileUrl) return null;
                
                const fileName = fileUrl.split('/').pop() || `assignment_file_${index + 1}`;
                const fileExtension = fileName.split('.').pop().toLowerCase();
                const isPdf = fileExtension === 'pdf';
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension);
                const isDocument = ['doc', 'docx', 'txt', 'rtf'].includes(fileExtension);
                
                let fileIcon = '📄';
                let fileLabel = 'File';
                if (isPdf) {
                  fileIcon = '📕';
                  fileLabel = 'PDF Document';
                }
                if (isImage) {
                  fileIcon = '🖼️';
                  fileLabel = 'Image';
                }
                if (isDocument) {
                  fileIcon = '📝';
                  fileLabel = 'Document';
                }
                
                return (
                  <div key={index} className={`coursework-file-card ${isPdf ? 'coursework-pdf-file' : ''}`}>
                    <div className="coursework-file-icon">{fileIcon}</div>
                    <div className="coursework-file-info">
                      <div className="coursework-file-name">{fileName}</div>
                      <div className="coursework-file-meta">
                        <span className="coursework-file-type">{fileLabel}</span>
                        <span className="coursework-file-extension">{fileExtension.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="coursework-file-actions">
                      <button
                        className="coursework-btn-preview"
                        onClick={() => window.open(fileUrl, '_blank')}
                      >
                        Preview
                      </button>
                      <button
                        className="coursework-btn-download"
                        onClick={() => handleDownloadAssignmentFile(selectedAssignment, fileUrl)}
                      >
                        Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="coursework-modal-footer">
            <button className="coursework-btn coursework-btn-secondary" onClick={() => setShowFilesModal(false)}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const AssignmentDetailsModal = () => {
    if (!selectedAssignment) return null;
    return (
      <div className="coursework-modal-overlay">
        <div className="coursework-modal">
          <div className="coursework-modal-header">
            <h3>📋 Assignment Details</h3>
            <button className="coursework-modal-close" onClick={() => setShowDetailsModal(false)}>
              ×
            </button>
          </div>
          
          <div className="coursework-modal-body">
            <div className="coursework-assignment-header">
              <h4>{selectedAssignment.title}</h4>
              <div className="coursework-assignment-meta">
                <span className="coursework-meta-item">
                  <strong>Course:</strong> {selectedAssignment.courseCode} - {selectedAssignment.courseName}
                </span>
                <span className="coursework-meta-item">
                  <strong>Due Date:</strong> {selectedAssignment.dueDate}
                </span>
                <span className="coursework-meta-item">
                  <strong>Total Marks:</strong> {selectedAssignment.totalMarks}
                </span>
                {selectedAssignment.lecturer && (
                  <span className="coursework-meta-item">
                    <strong>Lecturer:</strong> {selectedAssignment.lecturer}
                  </span>
                )}
              </div>
            </div>
            
            {selectedAssignment.description && (
              <div className="coursework-description-section">
                <h5>Description</h5>
                <div className="coursework-description-content">
                  {selectedAssignment.description}
                </div>
              </div>
            )}
            
            {selectedAssignment.instructions && (
              <div className="coursework-instructions-section">
                <h5>Instructions</h5>
                <div className="coursework-instructions-content">
                  {selectedAssignment.instructions}
                </div>
              </div>
            )}
            
            {selectedAssignment.assignment_files && selectedAssignment.assignment_files.length > 0 && (
              <div className="coursework-attached-files">
                <h5>📦 Assignment Files</h5>
                <div className="coursework-files-list">
                  {selectedAssignment.assignment_files.slice(0, 3).map((fileUrl, index) => {
                    if (!fileUrl) return null;
                    const fileName = fileUrl.split('/').pop() || `file_${index + 1}`;
                    return (
                      <div key={index} className="coursework-file-item-small">
                        <span className="coursework-file-name">{fileName}</span>
                        <button
                          className="coursework-download-btn-small"
                          onClick={() => handleDownloadAssignmentFile(selectedAssignment, fileUrl)}
                        >
                          Download
                        </button>
                      </div>
                    );
                  })}
                  {selectedAssignment.assignment_files.length > 3 && (
                    <div className="coursework-more-files">
                      + {selectedAssignment.assignment_files.length - 3} more files in lecturerbucket
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="coursework-modal-footer">
            {selectedAssignment.main_assignment_file && (
              <button
                className="coursework-btn coursework-btn-primary"
                onClick={() => handleDownloadAssignmentFile(selectedAssignment)}
              >
                <i className="fas fa-download"></i> Download Assignment
              </button>
            )}
            {selectedAssignment.assignment_files && selectedAssignment.assignment_files.length > 1 && (
              <button
                className="coursework-btn coursework-btn-secondary"
                onClick={() => {
                  setShowDetailsModal(false);
                  setTimeout(() => handleViewAllFiles(selectedAssignment), 100);
                }}
              >
                <i className="fas fa-eye"></i> View All Files
              </button>
            )}
            <button className="coursework-btn coursework-btn-tertiary" onClick={() => setShowDetailsModal(false)}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // =================== LOADING STATE ===================
  if (loading) {
    return (
      <div className="coursework-page">
        <div className="cw-header">
          <h2>Course Work</h2>
          <div className="cw-date-display">Loading assignments...</div>
        </div>
        <div className="cw-loading-spinner"></div>
      </div>
    );
  }

  // =================== MAIN RENDER ===================
  return (
    <div className="coursework-page">
      <div className="cw-header">
        <h2>Course Work</h2>
        <div className="cw-date-display">
          {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} available
        </div>
      </div>

      <div className="cw-grid">
        {assignments.length === 0 ? (
          <div className="cw-no-assignments">
            <p>No assignments available at the moment.</p>
            <button 
              onClick={fetchAssignments}
              className="cw-refresh-btn"
            >
              🔄 Refresh Assignments
            </button>
          </div>
        ) : (
          assignments.map(assignment => {
            const marksColor = getMarksColor(assignment.marks);
            const isSubmitted = assignment.isSubmitted;
            const hasAssignmentFiles = assignment.assignment_files?.length > 0;
            const hasMainPdfFile = !!assignment.main_assignment_file;

            return (
              <div key={assignment.id} className="cw-card">
                <div className="cw-card-info">
                  <div className="cw-course-code">
                    {assignment.courseCode}
                    <span className="cw-department-badge">
                      {assignment.courseDepartment}
                    </span>
                  </div>
                  <h3 className="cw-card-title">{assignment.title}</h3>
                  <p className="cw-card-description">{assignment.description}</p>

                  <div className="cw-card-dates">
                    <div className="cw-date-item">
                      <i className="fas fa-calendar-check"></i>
                      <span>Assigned: {assignment.assignedDate}</span>
                    </div>
                    <div className="cw-date-item">
                      <i className={`fas fa-calendar-times ${assignment.isPastDue ? 'past-due' : ''}`}></i>
                      <span className={assignment.isPastDue ? 'past-due-text' : ''}>
                        Due: {assignment.dueDate}
                      </span>
                      {assignment.isPastDue && !isSubmitted && (
                        <span className="cw-late-badge">Past Due</span>
                      )}
                    </div>
                  </div>

                  <div className="cw-card-status">
                    <i className={`fas fa-${isSubmitted ? 'check-circle' : 'times-circle'}`}
                       style={{ color: isSubmitted ? '#4CAF50' : '#F44336' }}></i>
                    <span style={{ color: isSubmitted ? '#4CAF50' : '#F44336' }}>
                      {isSubmitted
                        ? (assignment.status === 'late' ? 'Submitted Late' : 'Submitted')
                        : 'Not Submitted'}
                    </span>
                    {assignment.lecturer && (
                      <span className="cw-card-lecturer">
                        <i className="fas fa-chalkboard-teacher"></i> {assignment.lecturer}
                      </span>
                    )}
                  </div>
                </div>

                <div className="cw-card-marks">
                  <div className={`cw-marks-display cw-marks-${marksColor}`}>
                    {assignment.marks || (
                      isSubmitted ? (
                        <i className="fas fa-hourglass-half" style={{color: '#666'}}></i>
                      ) : (
                        <i className="fas fa-book-open"></i>
                      )
                    )}
                  </div>

                  {isSubmitted ? (
                    <div className="cw-submission-actions">
                      {assignment.fileUrls?.length > 0 && (
                        <button className="cw-btn cw-btn-view" onClick={() => handleDownloadSubmittedFiles(assignment)}>
                          <i className="fas fa-download"></i> My Submission
                        </button>
                      )}
                      {assignment.isGraded ? (
                        <button className="cw-btn cw-btn-results" onClick={() => handleViewResults(assignment)}>
                          <i className="fas fa-chart-bar"></i> View Results
                        </button>
                      ) : (
                        <button className="cw-btn cw-btn-submitted">
                          <i className="fas fa-check"></i> Submitted
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="cw-submission-actions">
                      {hasMainPdfFile ? (
                        <>
                          <button 
                            className="cw-btn cw-btn-download-pdf" 
                            onClick={() => handleDownloadAssignmentFile(assignment)}
                            title="Download the assignment PDF file from lecturerbucket"
                          >
                            <i className="fas fa-download"></i> Download Assignment
                          </button>
                          <button 
                            className="cw-btn cw-btn-view-details" 
                            onClick={() => handleViewDetails(assignment)}
                          >
                            <i className="fas fa-info-circle"></i> View Details
                          </button>
                        </>
                      ) : hasAssignmentFiles ? (
                        <>
                          <button 
                            className="cw-btn cw-btn-view-files" 
                            onClick={() => handleViewAllFiles(assignment)}
                          >
                            <i className="fas fa-eye"></i> View Files
                          </button>
                          <button 
                            className="cw-btn cw-btn-view-details" 
                            onClick={() => handleViewDetails(assignment)}
                          >
                            <i className="fas fa-info-circle"></i> View Details
                          </button>
                        </>
                      ) : (
                        <button 
                          className="cw-btn cw-btn-view-details" 
                          onClick={() => handleViewDetails(assignment)}
                        >
                          <i className="fas fa-info-circle"></i> View Assignment
                        </button>
                      )}

                      {assignment.canSubmit ? (
                        <button className="cw-btn cw-btn-submit" onClick={() => handleSubmitAssignment(assignment)}>
                          <i className="fas fa-upload"></i> Submit Work
                        </button>
                      ) : (
                        <button className="cw-btn cw-btn-late" disabled>
                          <i className="fas fa-clock"></i> Too Late to Submit
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* =================== MODALS =================== */}
      {showSubmissionModal && selectedAssignment && (
        <SubmissionModal
          assignment={selectedAssignment}
          studentId={studentId}
          onClose={() => {
            setShowSubmissionModal(false);
            setSelectedAssignment(null);
          }}
          onSubmitSuccess={fetchAssignments}
        />
      )}

      {showResultsModal && selectedAssignment && <AssignmentResultsModal />}
      {showFilesModal && selectedAssignment && <AssignmentFilesModal />}
      {showDetailsModal && selectedAssignment && <AssignmentDetailsModal />}

      {/* STYLES */}
      <style jsx>{`
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

        .cw-loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f1f5f9;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 40px auto;
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
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

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
      `}</style>
    </div>
  );
};

export default Coursework;