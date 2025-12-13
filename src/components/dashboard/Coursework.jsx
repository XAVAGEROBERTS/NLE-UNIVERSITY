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
      <div className="content">
        <div className="dashboard-header">
          <h2>Course Work</h2>
          <div className="date-display">Loading assignments...</div>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="dashboard-header">
        <h2>Course Work</h2>
        <div className="date-display">Available Course Work</div>
      </div>

      <div className="coursework-grid">
        {assignments.length === 0 ? (
          <div className="no-assignments">
            <p>No assignments available at the moment.</p>
          </div>
        ) : (
          assignments.map(assignment => {
            const marksColor = getMarksColor(assignment.marks);
            
            return (
              <div key={assignment.id} className="assignment-card">
                <div className="assignment-info">
                  <div className="course-code">{assignment.courseCode}</div>
                  <h3 className="assignment-title">{assignment.title}</h3>
                  <p className="assignment-description">{assignment.description}</p>
                  <div className="assignment-dates">
                    <div className="date-item">
                      <i className="fas fa-calendar-check"></i>
                      <span>Assigned: {assignment.assignedDate}</span>
                    </div>
                    <div className="date-item">
                      <i className="fas fa-calendar-times"></i>
                      <span>Due: {assignment.dueDate}</span>
                    </div>
                  </div>
                  <div className="assignment-status">
                    <i className={`fas fa-${assignment.status === 'submitted' ? 'check-circle' : 'times-circle'}`} 
                       style={{ color: assignment.status === 'submitted' ? '#4CAF50' : '#F44336' }}></i>
                    <span style={{ color: assignment.status === 'submitted' ? '#4CAF50' : '#F44336' }}>
                      {assignment.status === 'submitted' ? 'Submitted' : 'Not Submitted'}
                    </span>
                    {assignment.lecturer && (
                      <span className="assignment-lecturer">
                        <i className="fas fa-chalkboard-teacher"></i> {assignment.lecturer}
                      </span>
                    )}
                  </div>
                </div>
                <div className="assignment-marks">
                  <div className={`marks-display ${marksColor}`}>
                    {assignment.marks || <i className="fas fa-book-open"></i>}
                  </div>
                  {assignment.status === 'submitted' ? (
                    assignment.marks ? (
                      <button 
                        className="view-results"
                        onClick={() => handleViewResults(assignment)}
                      >
                        <i className="fas fa-download"></i> View Results
                      </button>
                    ) : (
                      <button className="submitted-btn">
                        Submitted
                      </button>
                    )
                  ) : (
                    <button 
                      className="not-submitted-btn"
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
    </div>
  );
};

export default Coursework;