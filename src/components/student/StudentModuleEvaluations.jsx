// student/StudentModuleEvaluations.jsx - COMPLETE WITH RESUME
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '../../context/StudentAuthContext';

const StudentModuleEvaluations = () => {
  const navigate = useNavigate();
  const { user } = useStudentAuth();
  const [forms, setForms] = useState([]);
  const [responses, setResponses] = useState([]);
  const [draftResponses, setDraftResponses] = useState({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [studentId, setStudentId] = useState(null);

  // Fetch student data
  const fetchStudentData = useCallback(async () => {
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
  }, [user?.email]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const fetchForms = useCallback(async () => {
    if (!studentData?.department_code || !studentId) {
      return;
    }

    setLoading(true);
    try {
      // Get published forms for this department
      const { data: formsData, error: formsError } = await supabase
        .from('module_evaluation_forms')
        .select('*')
        .eq('department_code', studentData.department_code)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (formsError) throw formsError;

      // Filter forms based on student's year and semester
      let filteredForms = formsData || [];
      
      filteredForms = filteredForms.filter(form => {
        if (form.target_year_of_study === null) return true;
        return form.target_year_of_study === studentData.year_of_study;
      });

      filteredForms = filteredForms.filter(form => {
        if (form.target_semester === null) return true;
        return form.target_semester === studentData.semester;
      });

      // Filter by target courses (if specified)
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

      // Get student's submitted responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('module_evaluation_responses')
        .select('form_id')
        .eq('student_id', studentId)
        .not('submitted_at', 'is', null);

      if (responsesError) throw responsesError;

      const submittedFormIds = new Set(responsesData?.map(r => r.form_id) || []);

      // Get draft/in-progress responses
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
      setDraftResponses(draftMap);
      
      // Mark forms as completed or in-progress
      const formsWithStatus = filteredForms.map(form => ({
        ...form,
        completed: submittedFormIds.has(form.id),
        inProgress: draftMap[form.id] || false
      }));

      setForms(formsWithStatus);
      setResponses(responsesData || []);
    } catch (err) {
      console.error('Error fetching forms:', err);
      setError('Failed to load evaluation forms');
    } finally {
      setLoading(false);
    }
  }, [studentData?.department_code, studentId, studentData?.year_of_study, studentData?.semester]);

  useEffect(() => {
    if (studentId && studentData?.department_code) {
      fetchForms();
    }
  }, [fetchForms, studentId, studentData?.department_code]);

  const handleStartForm = (formId) => {
    navigate(`/module-evaluation/${formId}`);
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
    container: { padding: '20px', maxWidth: '1000px', margin: '0 auto' },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '16px',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '2px solid #e8eaf6'
    },
    title: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      margin: 0,
      fontSize: '24px',
      fontWeight: '700',
      color: '#1a237e'
    },
    badge: {
      background: '#1976d2',
      color: 'white',
      padding: '4px 14px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: '600'
    },
    filters: {
      display: 'flex',
      gap: '12px',
      marginBottom: '20px',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    select: {
      padding: '10px 16px',
      border: '1.5px solid #d1d5db',
      borderRadius: '8px',
      background: 'white',
      fontSize: '14px',
      cursor: 'pointer',
      minWidth: '180px'
    },
    refreshBtn: {
      padding: '10px 18px',
      background: '#f5f5f5',
      border: '1.5px solid #d1d5db',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '20px'
    },
    card: {
      background: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #f0f0f5',
      transition: 'all 0.3s ease'
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '10px'
    },
    cardTitle: { margin: 0, color: '#1a237e', fontSize: '16px' },
    cardSub: { margin: '4px 0 0 0', fontSize: '13px', color: '#666' },
    questionsList: { margin: '8px 0', paddingLeft: '16px' },
    questionItem: { fontSize: '13px', color: '#444', margin: '4px 0' },
    footer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '12px',
      paddingTop: '12px',
      borderTop: '1px solid #f0f0f0'
    },
    empty: {
      textAlign: 'center',
      padding: '60px 20px',
      background: 'white',
      borderRadius: '12px',
      gridColumn: '1 / -1'
    },
    startBtn: {
      padding: '8px 20px',
      background: '#1a237e',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '13px'
    },
    resumeBtn: {
      padding: '8px 20px',
      background: '#ff8f00',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '13px'
    },
    completedBtn: {
      padding: '8px 20px',
      background: '#e8f5e9',
      color: '#2e7d32',
      border: '1px solid #2e7d32',
      borderRadius: '6px',
      cursor: 'default',
      fontWeight: '600',
      fontSize: '13px'
    }
  };

  if (!studentData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
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
      React.createElement('h2', { style: styles.title }, '📋 Module Evaluations'),
      React.createElement('span', { style: styles.badge }, forms.filter(f => !f.completed && !f.inProgress).length, ' Pending')
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
      ),
      React.createElement(
        'button',
        { style: styles.refreshBtn, onClick: fetchForms },
        '\uD83D\uDD04 Refresh'
      )
    ),
    error && React.createElement(
      'div',
      { style: { background: '#ffebee', color: '#c62828', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px' } },
      '❌ ',
      error
    ),
    React.createElement(
      'div',
      { style: styles.grid },
      loading ? React.createElement(
        'div',
        { style: { gridColumn: '1 / -1', textAlign: 'center', padding: '40px' } },
        'Loading forms...'
      ) : filteredForms.length === 0 ? React.createElement(
        'div',
        { style: styles.empty },
        React.createElement('span', { style: { fontSize: '48px', display: 'block', marginBottom: '12px' } }, '📋'),
        React.createElement('h3', null, 'No Evaluation Forms Available'),
        React.createElement('p', { style: { color: '#666' } }, filter === 'pending' ? 'You have completed all pending evaluations!' : 'No evaluation forms available for your program/year.')
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
              null,
              React.createElement('h4', { style: styles.cardTitle }, form.title),
              React.createElement('p', { style: styles.cardSub },
                form.academic_year, ' - Sem ', form.target_semester,
                form.target_year_of_study && React.createElement(
                  'span',
                  null,
                  ' • Year ',
                  form.target_year_of_study
                )
              )
            ),
            React.createElement('span', {
              style: {
                background: statusInfo.bg,
                color: statusInfo.color,
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                border: '1px solid ' + statusInfo.color
              }
            }, statusInfo.label)
          ),
          form.description && React.createElement(
            'p',
            { style: { fontSize: '14px', color: '#444', margin: '8px 0' } },
            form.description
          ),
          React.createElement(
            'div',
            { style: styles.questionsList },
            (form.questions || []).slice(0, 3).map((q, idx) => (
              React.createElement('p', { key: idx, style: styles.questionItem },
                '• ',
                q.question,
                ' (',
                getTypeLabel(q.type),
                ')'
              )
            )),
            (form.questions || []).length > 3 && React.createElement(
              'p',
              { style: { fontSize: '12px', color: '#999' } },
              '+', (form.questions || []).length - 3, ' more questions'
            )
          ),
          React.createElement(
            'div',
            { style: styles.footer },
            React.createElement('small', { style: { color: '#999' } },
              'Published: ', form.published_at ? new Date(form.published_at).toLocaleDateString() : 'N/A'
            ),
            form.completed ? React.createElement(
              'button',
              { style: styles.completedBtn },
              '✅ Completed'
            ) : hasDraft ? React.createElement(
              'button',
              { style: styles.resumeBtn, onClick: () => handleStartForm(form.id) },
              '🔄 Resume'
            ) : React.createElement(
              'button',
              { style: styles.startBtn, onClick: () => handleStartForm(form.id) },
              '📝 Start Evaluation'
            )
          )
        );
      })
    )
  );
};

export default StudentModuleEvaluations;