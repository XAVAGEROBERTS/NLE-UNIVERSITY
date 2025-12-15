import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';

const Coursework = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useStudentAuth();

  useEffect(() => {
    if (user?.email) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);

      // Get student data
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('email', user.email)
        .single();

      if (studentError) throw studentError;

      // Fetch assignments for student's enrolled courses
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

      // Fetch assignments for these courses
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
            feedback
          )
        `)
        .in('course_id', courseIds)
        .in('status', ['published', 'closed', 'graded'])
        .order('due_date', { ascending: true });

      if (assignmentsError) throw assignmentsError;

      // Fetch assignment submissions for this student
      const { data: submissions, error: subsError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', student.id);

      if (subsError) throw subsError;

      // Process assignments
      const processedAssignments = assignmentsData.map(assignment => {
        const submission = submissions?.find(sub => sub.assignment_id === assignment.id) || 
                         assignment.assignment_submissions?.[0];
        
        const assignedDate = new Date(assignment.created_at);
        const dueDate = new Date(assignment.due_date);
        
        return {
          id: assignment.id,
          courseCode: assignment.courses?.course_code || 'N/A',
          title: assignment.title,
          description: assignment.description,
          assignedDate: assignedDate.toLocaleDateString('en-US', {
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
          status: submission ? 'submitted' : 'not submitted',
          marks: submission?.marks_obtained 
            ? `${submission.marks_obtained}/${assignment.total_marks}`
            : '',
          totalMarks: assignment.total_marks,
          obtainedMarks: submission?.marks_obtained,
          submissionId: submission?.id,
          lecturer: assignment.lecturers?.full_name || 'Unknown Lecturer'
        };
      });

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

  const handleViewResults = (assignment) => {
    if (assignment.submissionId) {
      alert(`Viewing results for: ${assignment.title}\nMarks: ${assignment.marks}`);
      // In real app, this would navigate to a results page
    }
  };

  const handleDownloadAssignment = (assignment) => {
    alert(`Downloading assignment: ${assignment.title}`);
    // In real app, this would trigger a file download
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
        <div className="cw-date-display">Available Course Work</div>
      </div>

      <div className="cw-grid">
        {assignments.length === 0 ? (
          <div className="cw-no-assignments">
            <p>No assignments available at the moment.</p>
          </div>
        ) : (
          assignments.map(assignment => {
            const marksColor = getMarksColor(assignment.marks);
            
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
                      <i className="fas fa-calendar-times"></i>
                      <span>Due: {assignment.dueDate}</span>
                    </div>
                  </div>
                  <div className="cw-card-status">
                    <i className={`fas fa-${assignment.status === 'submitted' ? 'check-circle' : 'times-circle'}`} 
                       style={{ color: assignment.status === 'submitted' ? '#4CAF50' : '#F44336' }}></i>
                    <span style={{ color: assignment.status === 'submitted' ? '#4CAF50' : '#F44336' }}>
                      {assignment.status === 'submitted' ? 'Submitted' : 'Not Submitted'}
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
                    {assignment.marks || <i className="fas fa-book-open"></i>}
                  </div>
                  {assignment.status === 'submitted' ? (
                    assignment.marks ? (
                      <button 
                        className="cw-btn cw-btn-view-results"
                        onClick={() => handleViewResults(assignment)}
                      >
                        <i className="fas fa-download"></i> View Results
                      </button>
                    ) : (
                      <button className="cw-btn cw-btn-submitted">
                        Submitted
                      </button>
                    )
                  ) : (
                    <button 
                      className="cw-btn cw-btn-not-submitted"
                      onClick={() => handleDownloadAssignment(assignment)}
                    >
                      Download Assignment
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <style jsx>{`
        /* Base styles - using unique class names to avoid conflicts */
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
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #eee;
          padding-top: 15px;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .cw-marks-display {
          font-weight: 600;
          font-size: 16px;
          padding: 6px 12px;
          border-radius: 6px;
          min-width: 80px;
          text-align: center;
        }
        
        .cw-marks-excellent {
          background: #e8f5e9;
          color: #2e7d32;
        }
        
        .cw-marks-good {
          background: #fff8e1;
          color: #f57c00;
        }
        
        .cw-marks-average {
          background: #fff3e0;
          color: #ef6c00;
        }
        
        .cw-marks-poor {
          background: #ffebee;
          color: #c62828;
        }
        
        .cw-btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        
        .cw-btn-view-results {
          background: #2196f3;
          color: white;
        }
        
        .cw-btn-view-results:hover {
          background: #1976d2;
          transform: translateY(-1px);
        }
        
        .cw-btn-submitted {
          background: #4caf50;
          color: white;
          cursor: default;
        }
        
        .cw-btn-not-submitted {
          background: #ff9800;
          color: white;
        }
        
        .cw-btn-not-submitted:hover {
          background: #f57c00;
          transform: translateY(-1px);
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
        
        /* Responsive Breakpoints */
        
        /* Tablets and small desktops */
        @media (max-width: 1024px) {
          .coursework-page {
            padding: 15px;
          }
          
          .cw-grid {
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
          }
          
          .cw-card {
            padding: 16px;
            min-height: 260px;
          }
          
          .cw-card-title {
            font-size: 16px;
          }
          
          .cw-marks-display {
            font-size: 15px;
            padding: 5px 10px;
            min-width: 70px;
          }
        }
        
        /* Tablets */
        @media (max-width: 768px) {
          .cw-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 20px;
          }
          
          .cw-date-display {
            align-self: flex-start;
          }
          
          .cw-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .cw-card {
            min-height: auto;
          }
          
          .cw-card-description {
            -webkit-line-clamp: 2;
          }
          
          .cw-card-marks {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          
          .cw-marks-display {
            align-self: flex-start;
          }
          
          .cw-btn {
            width: 100%;
            justify-content: center;
            padding: 10px 16px;
          }
        }
        
        /* Mobile devices */
        @media (max-width: 480px) {
          .coursework-page {
            padding: 12px;
          }
          
          .cw-header h2 {
            font-size: 20px;
          }
          
          .cw-date-display {
            font-size: 13px;
            padding: 6px 12px;
          }
          
          .cw-card {
            padding: 14px;
            border-radius: 10px;
          }
          
          .cw-course-code {
            font-size: 11px;
            padding: 3px 10px;
          }
          
          .cw-card-title {
            font-size: 15px;
            margin-bottom: 8px;
          }
          
          .cw-card-description {
            font-size: 13px;
            line-height: 1.4;
            margin-bottom: 12px;
          }
          
          .cw-date-item {
            font-size: 12px;
          }
          
          .cw-card-status {
            font-size: 12px;
            gap: 8px;
          }
          
          .cw-card-lecturer {
            font-size: 11px;
            margin-left: 0;
            width: 100%;
            margin-top: 5px;
          }
          
          .cw-marks-display {
            font-size: 14px;
            padding: 4px 8px;
          }
          
          .cw-btn {
            font-size: 12px;
            padding: 9px 14px;
          }
        }
        
        /* Very small mobile devices */
        @media (max-width: 320px) {
          .cw-card {
            padding: 12px;
          }
          
          .cw-card-title {
            font-size: 14px;
          }
          
          .cw-card-description {
            font-size: 12px;
          }
          
          .cw-btn {
            font-size: 11px;
            padding: 8px 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default Coursework;