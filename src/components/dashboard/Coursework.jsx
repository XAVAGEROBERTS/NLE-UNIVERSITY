// Coursework.jsx - UPDATED WITH DEDICATED ASSIGNMENT FILE DOWNLOAD
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';
import SubmissionModal from "./SubmissionModal.jsx";

const Coursework = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const { user } = useStudentAuth();

  // Lock scroll when any modal is open
  useEffect(() => {
    if (showSubmissionModal || showResultsModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [showSubmissionModal, showResultsModal]);

  useEffect(() => {
    if (user?.email) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('email', user.email)
        .single();

      if (studentError) throw studentError;
      setStudentId(student.id);

      const { data: studentCourses, error: coursesError } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', student.id)
        .in('status', ['enrolled', 'in_progress']);

      if (coursesError) throw coursesError;

      const courseIds = studentCourses.map(sc => sc.course_id);
      if (courseIds.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // Fetch assignments with file_urls
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          *,
          courses (course_code, course_name),
          lecturers (full_name),
          assignment_submissions!left (
            id,
            submission_date,
            marks_obtained,
            status,
            feedback,
            file_urls,
            submitted_text
          )
        `)
        .in('course_id', courseIds)
        .in('status', ['published', 'closed', 'graded'])
        .order('due_date', { ascending: true });

      if (assignmentsError) throw assignmentsError;

      const { data: submissions, error: subsError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', student.id);

      if (subsError) throw subsError;

      const processedAssignments = assignmentsData.map(assignment => {
        const submission = submissions?.find(sub => sub.assignment_id === assignment.id) ||
                           assignment.assignment_submissions?.[0];

        const dueDate = new Date(assignment.due_date);
        const now = new Date();
        const isPastDue = dueDate < now;
        const isSubmitted = !!submission;

        // Find the main PDF assignment file
        const assignmentFiles = assignment.file_urls || [];
        const mainPdfFile = assignmentFiles.find(file => 
          file.toLowerCase().endsWith('.pdf') || 
          file.includes('assignment') || 
          file.includes('question')
        ) || assignmentFiles[0];

        return {
          id: assignment.id,
          courseCode: assignment.courses?.course_code || 'N/A',
          courseName: assignment.courses?.course_name || 'N/A',
          title: assignment.title,
          description: assignment.description,
          instructions: assignment.instructions,
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
          status: submission ? submission.status : 'not submitted',
          submissionId: submission?.id,
          submissionDate: submission?.submission_date,
          fileUrls: submission?.file_urls || [],
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
          assignment_files: assignment.file_urls || [], // All files uploaded by lecturer
          main_assignment_file: mainPdfFile, // Main PDF file
          canSubmit: !isSubmitted && !isPastDue,
          isGraded: submission?.marks_obtained !== null && submission?.marks_obtained !== undefined
        };
      });

      console.log('Processed assignments:', processedAssignments);
      setAssignments(processedAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const getMarksColor = (marks) => {
    if (!marks) return '';
    const [obtained, total] = marks.split('/').map(Number);
    const percentage = (obtained / total) * 100;
    if (percentage >= 90) return 'excellent';
    if (percentage >= 75) return 'good';
    if (percentage >= 50) return 'average';
    return 'poor';
  };

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

  // DOWNLOAD MAIN ASSIGNMENT FILE (PDF)
  const handleDownloadAssignmentFile = async (assignment) => {
    if (!assignment.main_assignment_file) {
      // If no main file, show all files or assignment details
      if (assignment.assignment_files && assignment.assignment_files.length > 0) {
        handleViewAllAssignmentFiles(assignment);
      } else {
        handleViewAssignmentDetails(assignment);
      }
      return;
    }

    try {
      const fileName = `Assignment_${assignment.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      
      // Create download link
      const a = document.createElement('a');
      a.href = assignment.main_assignment_file;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      console.log('Downloading assignment file:', fileName);
    } catch (error) {
      console.error('Error downloading assignment file:', error);
      alert('Error downloading assignment file. Please try again.');
    }
  };

  // VIEW ALL ASSIGNMENT FILES
  const handleViewAllAssignmentFiles = (assignment) => {
    if (!assignment.assignment_files || assignment.assignment_files.length === 0) {
      alert('No files attached to this assignment');
      return;
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 12px;
      width: 100%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    `;
    
    modalContent.innerHTML = `
      <div style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0; color: #333;">Assignment Files: ${assignment.title}</h3>
          <button id="closeModalBtn" style="
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
          ">×</button>
        </div>
        
        <p style="color: #666; margin-bottom: 20px;">
          Course: <strong>${assignment.courseCode} - ${assignment.courseName}</strong><br>
          Total Files: ${assignment.assignment_files.length}
        </p>
        
        <div style="margin-bottom: 20px;">
          ${assignment.assignment_files.map((fileUrl, index) => {
            const fileName = fileUrl.split('/').pop() || `assignment_file_${index + 1}`;
            const fileExtension = fileName.split('.').pop().toLowerCase();
            const isPdf = fileExtension === 'pdf';
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension);
            const isDocument = ['doc', 'docx', 'txt', 'rtf'].includes(fileExtension);
            
            let fileIcon = '📄';
            let fileLabel = 'File';
            if (isPdf) {
              fileIcon = '📕';
              fileLabel = 'Assignment PDF';
            }
            if (isImage) {
              fileIcon = '🖼️';
              fileLabel = 'Image';
            }
            if (isDocument) {
              fileIcon = '📝';
              fileLabel = 'Document';
            }
            
            return `
              <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px;
                background: ${isPdf ? '#f0f7ff' : '#f8f9fa'};
                border-radius: 8px;
                margin-bottom: 10px;
                border: 1px solid ${isPdf ? '#c5d9f1' : '#e9ecef'};
              ">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 20px;">${fileIcon}</span>
                  <div>
                    <div style="font-weight: 500; color: #333;">${fileName}</div>
                    <div style="font-size: 12px; color: #666;">${fileLabel} • ${fileExtension.toUpperCase()}</div>
                  </div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button onclick="window.open('${fileUrl}', '_blank')" style="
                    padding: 6px 12px;
                    background: #4dabf7;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                  ">Preview</button>
                  <button onclick="
                    const a = document.createElement('a');
                    a.href = '${fileUrl}';
                    a.download = '${fileName}';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  " style="
                    padding: 6px 12px;
                    background: #40c057;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                  ">Download</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div style="text-align: right;">
          <button id="closeBtn" style="
            padding: 10px 24px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
          ">Close</button>
        </div>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    
    // Add event listeners
    const closeModal = () => {
      document.body.removeChild(modal);
      document.body.classList.remove('modal-open');
    };
    
    modalContent.querySelector('#closeModalBtn').onclick = closeModal;
    modalContent.querySelector('#closeBtn').onclick = closeModal;
    
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  };

  // VIEW ASSIGNMENT DETAILS
  const handleViewAssignmentDetails = (assignment) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 12px;
      width: 100%;
      max-width: 550px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    `;
    
    modalContent.innerHTML = `
      <div style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0; color: #333;">Assignment Details</h3>
          <button id="closeModalBtn" style="
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
          ">×</button>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="
            background: #f0f7ff;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
          ">
            <h4 style="margin: 0 0 10px 0; color: #1e40af;">${assignment.title}</h4>
            <p style="margin: 5px 0; color: #555;">
              <strong>Course:</strong> ${assignment.courseCode} - ${assignment.courseName}
            </p>
            <p style="margin: 5px 0; color: #555;">
              <strong>Due Date:</strong> ${assignment.dueDate}
            </p>
            <p style="margin: 5px 0; color: #555;">
              <strong>Total Marks:</strong> ${assignment.totalMarks}
            </p>
            ${assignment.lecturer ? `
              <p style="margin: 5px 0; color: #555;">
                <strong>Lecturer:</strong> ${assignment.lecturer}
              </p>
            ` : ''}
          </div>
          
          ${assignment.description ? `
            <div style="margin-bottom: 15px;">
              <strong style="display: block; margin-bottom: 5px; color: #333;">Description:</strong>
              <div style="
                padding: 12px;
                background: #f8f9fa;
                border-radius: 6px;
                color: #555;
                line-height: 1.5;
              ">
                ${assignment.description}
              </div>
            </div>
          ` : ''}
          
          ${assignment.instructions ? `
            <div style="margin-bottom: 15px;">
              <strong style="display: block; margin-bottom: 5px; color: #333;">Instructions:</strong>
              <div style="
                padding: 12px;
                background: #fff3e0;
                border-radius: 6px;
                color: #92400e;
                line-height: 1.5;
              ">
                ${assignment.instructions}
              </div>
            </div>
          ` : ''}
        </div>
        
        <div style="text-align: right;">
          ${assignment.main_assignment_file ? `
            <button id="downloadBtn" style="
              padding: 10px 20px;
              background: #40c057;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              margin-right: 10px;
            ">
              <i class="fas fa-download"></i> Download Assignment PDF
            </button>
          ` : ''}
          <button id="closeBtn" style="
            padding: 10px 24px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
          ">Close</button>
        </div>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    
    // Add event listeners
    const closeModal = () => {
      document.body.removeChild(modal);
      document.body.classList.remove('modal-open');
    };
    
    modalContent.querySelector('#closeModalBtn').onclick = closeModal;
    modalContent.querySelector('#closeBtn').onclick = closeModal;
    
    // Add download button functionality if it exists
    const downloadBtn = modalContent.querySelector('#downloadBtn');
    if (downloadBtn) {
      downloadBtn.onclick = () => {
        closeModal();
        setTimeout(() => handleDownloadAssignmentFile(assignment), 100);
      };
    }
    
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
  };

  // DOWNLOAD SUBMITTED FILES
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
        
        const urlParts = fileUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart && lastPart.includes('.')) {
          fileName = `submission_${lastPart.split('?')[0]}`;
        }
        
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error downloading submission files:', error);
      alert('Error downloading submission files. Please try again.');
    }
  };

  // Results Modal Component
  const ResultsModal = ({ assignment, onClose }) => {
    const submissionDate = assignment.submissionDate
      ? new Date(assignment.submissionDate).toLocaleString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      : 'Not available';

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}>
        {/* ... Results Modal content remains the same ... */}
      </div>
    );
  };

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
          </div>
        ) : (
          assignments.map(assignment => {
            const marksColor = getMarksColor(assignment.marks);
            const isSubmitted = assignment.status !== 'not submitted';
            const hasAssignmentFiles = assignment.assignment_files?.length > 0;
            const hasMainPdfFile = !!assignment.main_assignment_file;

            return (
              <div key={assignment.id} className="cw-card">
                <div className="cw-card-info">
                  <div className="cw-course-code">{assignment.courseCode}</div>
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

                  {hasAssignmentFiles && (
                    <div className="cw-assignment-files-info">
                      {hasMainPdfFile ? (
                        <div className="cw-main-pdf-file">
                          <i className="fas fa-file-pdf"></i>
                          <span>Assignment PDF available</span>
                        </div>
                      ) : (
                        <div 
                          className="cw-files-attached clickable"
                          onClick={() => handleViewAllAssignmentFiles(assignment)}
                          title="Click to view/download assignment files"
                        >
                          <i className="fas fa-paperclip"></i>
                          <span>{assignment.assignment_files.length} file(s) attached</span>
                          <i className="fas fa-external-link-alt"></i>
                        </div>
                      )}
                    </div>
                  )}

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
                            title="Download the assignment PDF file"
                          >
                            <i className="fas fa-download"></i> Download Assignment
                          </button>
                          <button 
                            className="cw-btn cw-btn-view-details" 
                            onClick={() => handleViewAssignmentDetails(assignment)}
                          >
                            <i className="fas fa-info-circle"></i> View Details
                          </button>
                        </>
                      ) : hasAssignmentFiles ? (
                        <>
                          <button 
                            className="cw-btn cw-btn-view-files" 
                            onClick={() => handleViewAllAssignmentFiles(assignment)}
                          >
                            <i className="fas fa-eye"></i> View Files
                          </button>
                          <button 
                            className="cw-btn cw-btn-view-details" 
                            onClick={() => handleViewAssignmentDetails(assignment)}
                          >
                            <i className="fas fa-info-circle"></i> View Details
                          </button>
                        </>
                      ) : (
                        <button 
                          className="cw-btn cw-btn-view-details" 
                          onClick={() => handleViewAssignmentDetails(assignment)}
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

      {/* Submission Modal */}
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

      {/* Results Modal */}
      {showResultsModal && selectedAssignment && (
        <ResultsModal
          assignment={selectedAssignment}
          onClose={() => {
            setShowResultsModal(false);
            setSelectedAssignment(null);
          }}
        />
      )}

      <style jsx>{`
        .coursework-page {
          padding: 20px;
          width: 100%;
          box-sizing: border-box;
          flex: 1;
          overflow-x: hidden;
        }

        .cw-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .cw-header h2 {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin: 0;
        }

        .cw-date-display {
          color: #666;
          font-size: 14px;
          background: #f5f5f5;
          padding: 8px 16px;
          border-radius: 20px;
        }

        .cw-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
          width: 100%;
        }

        .cw-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          border: 1px solid #eaeaea;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          min-height: 280px;
        }

        .cw-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
        }

        .cw-course-code {
          background: #f0f7ff;
          color: #1976d2;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          display: inline-block;
          margin-bottom: 12px;
        }

        .cw-card-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin: 0 0 10px 0;
          line-height: 1.3;
        }

        .cw-card-description {
          color: #666;
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 15px 0;
          flex-grow: 1;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .cw-card-dates {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 15px;
        }

        .cw-date-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #666;
          font-size: 13px;
        }

        .cw-date-item i {
          width: 16px;
          text-align: center;
        }

        .cw-late-badge {
          background: #ff6b6b;
          color: white;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 10px;
          margin-left: 8px;
          font-weight: 600;
        }

        .past-due, .past-due-text {
          color: #ff6b6b;
        }

        .cw-assignment-files-info {
          margin: 10px 0;
        }

        .cw-main-pdf-file {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #1e40af;
          padding: 8px 12px;
          background: #f0f7ff;
          border-radius: 6px;
          border: 1px solid #c5d9f1;
        }

        .cw-main-pdf-file i {
          color: #ef4444;
        }

        .cw-files-attached {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #666;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 6px;
          border: 1px solid #e9ecef;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cw-files-attached.clickable:hover {
          background: #e9ecef;
          border-color: #dee2e6;
          color: #495057;
        }

        .cw-files-attached.clickable:active {
          transform: translateY(1px);
        }

        .cw-files-attached i {
          color: #4dabf7;
        }

        .cw-files-attached .fa-external-link-alt {
          margin-left: auto;
          font-size: 11px;
          color: #6c757d;
        }

        .cw-card-status {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          margin-top: auto;
          flex-wrap: wrap;
        }

        .cw-card-lecturer {
          margin-left: auto;
          color: #666;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .cw-card-marks {
          margin-top: 15px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          border-top: 1px solid #eee;
          padding-top: 15px;
          gap: 8px;
        }

        .cw-marks-display {
          font-weight: 600;
          font-size: 16px;
          padding: 8px 12px;
          border-radius: 6px;
          text-align: center;
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cw-marks-excellent { background: #e8f5e9; color: #2e7d32; }
        .cw-marks-good { background: #fff8e1; color: #f57c00; }
        .cw-marks-average { background: #fff3e0; color: #ef6c00; }
        .cw-marks-poor { background: #ffebee; color: #c62828; }

        .cw-submission-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        .cw-btn {
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
        }

        .cw-btn-download-pdf {
          background: #ef4444;
          color: white;
        }
        .cw-btn-download-pdf:hover { background: #dc2626; }

        .cw-btn-view-files {
          background: #4dabf7;
          color: white;
        }
        .cw-btn-view-files:hover { background: #339af0; }

        .cw-btn-view-details {
          background: #6c757d;
          color: white;
        }
        .cw-btn-view-details:hover { background: #5a6268; }

        .cw-btn-view {
          background: #40c057;
          color: white;
        }
        .cw-btn-view:hover { background: #2b8a3e; }

        .cw-btn-submit {
          background: #40c057;
          color: white;
        }
        .cw-btn-submit:hover { background: #2b8a3e; }

        .cw-btn-results {
          background: #7950f2;
          color: white;
        }
        .cw-btn-results:hover { background: #6741d9; }

        .cw-btn-submitted {
          background: #868e96;
          color: white;
          cursor: default;
        }

        .cw-btn-late {
          background: #fee2e2;
          color: #991b1b;
          cursor: not-allowed;
        }

        .cw-no-assignments {
          grid-column: 1 / -1;
          text-align: center;
          padding: 60px 20px;
          color: #666;
          font-size: 16px;
          background: #f9f9f9;
          border-radius: 12px;
        }

        .cw-loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #2196f3;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 40px auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .cw-grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
          .cw-card { padding: 16px; min-height: 260px; }
        }

        @media (max-width: 768px) {
          .cw-header { flex-direction: column; align-items: flex-start; }
          .cw-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 480px) {
          .coursework-page { padding: 12px; }
          .cw-header h2 { font-size: 20px; }
          .cw-card { padding: 14px; }
          .cw-card-title { font-size: 15px; }
          .cw-btn { padding: 8px 12px; font-size: 12px; }
        }
      `}</style>
    </div>
  );
};

export default Coursework;