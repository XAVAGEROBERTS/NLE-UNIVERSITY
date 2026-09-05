// student/StudentModuleEvaluations.jsx - WITH NOTES-STYLE REFRESH BUTTON
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '../../context/StudentAuthContext';

const StudentModuleEvaluations = () => {
  const navigate = useNavigate();
  const { user } = useStudentAuth();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive check
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fetch student data
  useEffect(() => {
    const loadStudentData = async () => {
      if (!user?.email) return;

      try {
        const { data, error } = await supabase
          .from('students')
          .select('id, full_name, email, department_code, program, year_of_study, semester')
          .eq('email', user.email)
          .single();

        if (error) throw error;
        if (data) {
          setStudentData(data);
          setStudentId(data.id);
        }
      } catch (err) {
        console.error('Error fetching student data:', err);
        setError('Failed to load student data');
      }
    };

    loadStudentData();
  }, [user]);

  const fetchForms = useCallback(async () => {
    if (!studentData?.department_code || !studentId) {
      return;
    }

    setLoading(true);
    try {
      const { data: formsData, error: formsError } = await supabase
        .from('module_evaluation_forms')
        .select('*')
        .eq('department_code', studentData.department_code)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (formsError) throw formsError;

      let filteredForms = formsData || [];
      
      filteredForms = filteredForms.filter(form => {
        if (form.target_year_of_study === null) return true;
        return form.target_year_of_study === studentData.year_of_study;
      });

      filteredForms = filteredForms.filter(form => {
        if (form.target_semester === null) return true;
        return form.target_semester === studentData.semester;
      });

      if (filteredForms.length > 0) {
        const formsWithCourseCheck = await Promise.all(
          filteredForms.map(async (form) => {
            if (!form.target_courses || form.target_courses.length === 0) {
              return { ...form, eligible: true };
            }
            
            const { data: enrolled, error: enrolledError } = await supabase
              .from('student_courses')
              .select('course_id')
              .eq('student_id', studentId)
              .in('course_id', form.target_courses);

            if (enrolledError) {
              console.error('Error checking enrollment:', enrolledError);
              return { ...form, eligible: false };
            }

            return { 
              ...form, 
              eligible: enrolled && enrolled.length > 0 
            };
          })
        );
        
        filteredForms = formsWithCourseCheck.filter(form => form.eligible);
      }

      const { data: responsesData, error: responsesError } = await supabase
        .from('module_evaluation_responses')
        .select('form_id')
        .eq('student_id', studentId)
        .not('submitted_at', 'is', null);

      if (responsesError) throw responsesError;

      const submittedFormIds = new Set(responsesData?.map(r => r.form_id) || []);

      const { data: draftData, error: draftError } = await supabase
        .from('module_evaluation_responses')
        .select('form_id, answers')
        .eq('student_id', studentId)
        .is('submitted_at', null);

      if (draftError) throw draftError;

      const draftMap = {};
      (draftData || []).forEach(d => {
        if (d.answers && Object.keys(d.answers).length > 0) {
          draftMap[d.form_id] = true;
        }
      });
      
      const formsWithStatus = filteredForms.map(form => ({
        ...form,
        completed: submittedFormIds.has(form.id),
        inProgress: draftMap[form.id] || false
      }));

      setForms(formsWithStatus);
    } catch (err) {
      console.error('Error fetching forms:', err);
      setError('Failed to load evaluation forms');
    } finally {
      setLoading(false);
    }
  }, [studentData, studentId]);

  // Fetch forms when student data is ready - using a flag to prevent cascading renders
  useEffect(() => {
    let isMounted = true;

    const loadForms = async () => {
      if (studentId && studentData?.department_code) {
        await fetchForms();
      }
    };

    if (isMounted) {
      loadForms();
    }

    return () => {
      isMounted = false;
    };
  }, [fetchForms, studentId, studentData]);

  const handleStartForm = (formId) => {
    navigate(`/module-evaluation/${formId}`);
  };

  const handleRefresh = () => {
    // Clear all evaluation-related cache
    if (user?.id) {
      localStorage.removeItem(`module-evaluations-${user.id}`);
      localStorage.removeItem(`module-evaluations-${user.email}`);
    }
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('module-evaluations-') || key.startsWith('eval-')) {
        localStorage.removeItem(key);
      }
    });
    fetchForms();
  };

  const getStatusBadge = (form) => {
    if (form.completed) {
      return { label: '✅ Completed', color: '#2e7d32', bg: '#e8f5e9' };
    }
    if (form.inProgress) {
      return { label: '🔄 In Progress', color: '#ff8f00', bg: '#fff8e1' };
    }
    return { label: '⏳ Pending', color: '#ffa726', bg: '#fff3e0' };
  };

  const getTypeLabel = (type) => {
    const map = {
      'rating': '⭐ Rating',
      'mcq': '📋 Multiple Choice',
      'text': '📝 Short Text',
      'textarea': '📄 Long Text',
      'boolean': '✅ Yes/No',
    };
    return map[type] || type || 'Unknown';
  };

  const filteredForms = forms.filter((f) => {
    if (filter === 'all') return true;
    if (filter === 'completed') return f.completed;
    if (filter === 'pending') return !f.completed && !f.inProgress;
    if (filter === 'in-progress') return f.inProgress;
    return true;
  });

  const styles = {
    container: { 
      padding: isMobile ? '12px 8px' : '20px', 
      maxWidth: '1000px', 
      margin: '0 auto' 
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: isMobile ? '8px' : '16px',
      marginBottom: isMobile ? '16px' : '24px',
      paddingBottom: isMobile ? '12px' : '16px',
      borderBottom: '2px solid #e8eaf6'
    },
    title: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '8px' : '12px',
      margin: 0,
      fontSize: isMobile ? '18px' : '24px',
      fontWeight: '700',
      color: '#1a237e'
    },
    badge: {
      background: '#1976d2',
      color: 'white',
      padding: isMobile ? '2px 10px' : '4px 14px',
      borderRadius: '20px',
      fontSize: isMobile ? '11px' : '13px',
      fontWeight: '600'
    },
    headerActions: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    refreshBtn: {
      width: isMobile ? '28px' : '32px',
      height: isMobile ? '28px' : '32px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      fontSize: isMobile ? '11px' : '13px',
      flexShrink: 0
    },
    filters: {
      display: 'flex',
      gap: isMobile ? '8px' : '12px',
      marginBottom: isMobile ? '12px' : '20px',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    select: {
      padding: isMobile ? '8px 12px' : '10px 16px',
      border: '1.5px solid #d1d5db',
      borderRadius: '8px',
      background: 'white',
      fontSize: isMobile ? '13px' : '14px',
      cursor: 'pointer',
      minWidth: isMobile ? '140px' : '180px',
      flex: isMobile ? '1' : 'none'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: isMobile ? '12px' : '20px'
    },
    card: {
      background: 'white',
      padding: isMobile ? '16px' : '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #f0f0f5',
      transition: 'all 0.3s ease'
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px',
      gap: isMobile ? '8px' : '0'
    },
    cardTitle: { 
      margin: 0, 
      color: '#1a237e', 
      fontSize: isMobile ? '15px' : '16px',
      fontWeight: '600'
    },
    cardSub: { 
      margin: '4px 0 0 0', 
      fontSize: isMobile ? '12px' : '13px', 
      color: '#666' 
    },
    questionsList: { 
      margin: isMobile ? '6px 0' : '8px 0', 
      paddingLeft: isMobile ? '12px' : '16px' 
    },
    questionItem: { 
      fontSize: isMobile ? '12px' : '13px', 
      color: '#444', 
      margin: isMobile ? '2px 0' : '4px 0' 
    },
    footer: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'stretch' : 'center',
      marginTop: '12px',
      paddingTop: '12px',
      borderTop: '1px solid #f0f0f0',
      gap: isMobile ? '8px' : '0'
    },
    empty: {
      textAlign: 'center',
      padding: isMobile ? '40px 16px' : '60px 20px',
      background: 'white',
      borderRadius: '12px',
      gridColumn: '1 / -1'
    },
    startBtn: {
      padding: isMobile ? '10px 16px' : '8px 20px',
      background: '#1a237e',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: isMobile ? '13px' : '13px',
      width: isMobile ? '100%' : 'auto'
    },
    resumeBtn: {
      padding: isMobile ? '10px 16px' : '8px 20px',
      background: '#ff8f00',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: isMobile ? '13px' : '13px',
      width: isMobile ? '100%' : 'auto'
    },
    completedBtn: {
      padding: isMobile ? '10px 16px' : '8px 20px',
      background: '#e8f5e9',
      color: '#2e7d32',
      border: '1px solid #2e7d32',
      borderRadius: '6px',
      cursor: 'default',
      fontWeight: '600',
      fontSize: isMobile ? '13px' : '13px',
      width: isMobile ? '100%' : 'auto',
      textAlign: 'center'
    },
    statusBadge: {
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: isMobile ? '11px' : '12px',
      fontWeight: '600',
      whiteSpace: 'nowrap',
      border: '1px solid currentColor'
    }
  };

  if (!studentData) {
    return (
      <div style={{ textAlign: 'center', padding: isMobile ? '40px 16px' : '60px' }}>
        <p>Loading student data...</p>
      </div>
    );
  }

  return React.createElement(
    'div',
    { style: styles.container },
    React.createElement(
      'div',
      { style: styles.header },
      React.createElement('h2', { style: styles.title }, 
        isMobile ? '📋 Evaluations' : '📋 Module Evaluations'
      ),
      React.createElement(
        'div',
        { style: styles.headerActions },
        React.createElement('span', { style: styles.badge }, 
          forms.filter(f => !f.completed && !f.inProgress).length, ' Pending'
        ),
        // Refresh button - Notes style
        React.createElement(
          'button',
          {
            onClick: handleRefresh,
            style: styles.refreshBtn,
            onMouseEnter: (e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
              e.currentTarget.style.transform = 'rotate(90deg)';
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
              e.currentTarget.style.transform = 'rotate(0deg)';
            },
            title: 'Refresh evaluations'
          },
          React.createElement('i', { className: 'fas fa-sync-alt' })
        )
      )
    ),
    React.createElement(
      'div',
      { style: styles.filters },
      React.createElement(
        'select',
        {
          value: filter,
          onChange: (e) => setFilter(e.target.value),
          style: styles.select
        },
        React.createElement('option', { value: 'all' }, 'All (', forms.length, ')'),
        React.createElement('option', { value: 'pending' }, '⏳ Pending'),
        React.createElement('option', { value: 'in-progress' }, '🔄 In Progress'),
        React.createElement('option', { value: 'completed' }, '✅ Completed')
      )
    ),
    error && React.createElement(
      'div',
      { style: { background: '#ffebee', color: '#c62828', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', fontSize: isMobile ? '13px' : '14px' } },
      '❌ ',
      error
    ),
    React.createElement(
      'div',
      { style: styles.grid },
      loading ? React.createElement(
        'div',
        { style: { gridColumn: '1 / -1', textAlign: 'center', padding: isMobile ? '30px' : '40px' } },
        'Loading forms...'
      ) : filteredForms.length === 0 ? React.createElement(
        'div',
        { style: styles.empty },
        React.createElement('span', { style: { fontSize: isMobile ? '36px' : '48px', display: 'block', marginBottom: '8px' } }, '📋'),
        React.createElement('h3', { style: { fontSize: isMobile ? '16px' : '20px' } }, 'No Evaluation Forms Available'),
        React.createElement('p', { style: { color: '#666', fontSize: isMobile ? '13px' : '14px' } }, 
          filter === 'pending' ? 'You have completed all pending evaluations!' : 'No evaluation forms available for your program/year.'
        )
      ) : filteredForms.map((form) => {
        const statusInfo = getStatusBadge(form);
        const hasDraft = form.inProgress;
        return React.createElement(
          'div',
          { key: form.id, style: styles.card },
          React.createElement(
            'div',
            { style: styles.cardHeader },
            React.createElement(
              'div',
              { style: { flex: 1, minWidth: 0 } },
              React.createElement('h4', { style: styles.cardTitle }, form.title),
              React.createElement('p', { style: styles.cardSub },
                form.academic_year, ' - Sem ', form.target_semester,
                form.target_year_of_study && React.createElement(
                  'span',
                  null,
                  ' • Yr ',
                  form.target_year_of_study
                )
              )
            ),
            React.createElement('span', {
              style: {
                ...styles.statusBadge,
                background: statusInfo.bg,
                color: statusInfo.color
              }
            }, statusInfo.label)
          ),
          form.description && React.createElement(
            'p',
            { style: { fontSize: isMobile ? '13px' : '14px', color: '#444', margin: '6px 0' } },
            isMobile && form.description.length > 80 ? form.description.slice(0, 80) + '...' : form.description
          ),
          React.createElement(
            'div',
            { style: styles.questionsList },
            (form.questions || []).slice(0, isMobile ? 2 : 3).map((q, idx) => (
              React.createElement('p', { key: idx, style: styles.questionItem },
                '• ',
                q.question.length > (isMobile ? 30 : 50) ? q.question.slice(0, isMobile ? 30 : 50) + '...' : q.question,
                ' (',
                getTypeLabel(q.type),
                ')'
              )
            )),
            (form.questions || []).length > (isMobile ? 2 : 3) && React.createElement(
              'p',
              { style: { fontSize: '12px', color: '#999' } },
              '+', (form.questions || []).length - (isMobile ? 2 : 3), ' more questions'
            )
          ),
          React.createElement(
            'div',
            { style: styles.footer },
            React.createElement('small', { style: { color: '#999', fontSize: isMobile ? '11px' : '12px', textAlign: isMobile ? 'center' : 'left' } },
              'Published: ', form.published_at ? new Date(form.published_at).toLocaleDateString() : 'N/A'
            ),
            form.completed ? React.createElement(
              'button',
              { style: styles.completedBtn },
              isMobile ? '✅ Done' : '✅ Completed'
            ) : hasDraft ? React.createElement(
              'button',
              { style: styles.resumeBtn, onClick: () => handleStartForm(form.id) },
              isMobile ? '🔄 Resume' : '🔄 Resume'
            ) : React.createElement(
              'button',
              { style: styles.startBtn, onClick: () => handleStartForm(form.id) },
              isMobile ? '📝 Start' : '📝 Start Evaluation'
            )
          )
        );
      })
    )
  );
};

export default StudentModuleEvaluations;