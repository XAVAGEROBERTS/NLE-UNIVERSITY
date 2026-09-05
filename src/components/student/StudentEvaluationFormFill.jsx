// student/StudentEvaluationFormFill.jsx - FIXED
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';

const StudentEvaluationFormFill = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { user } = useStudentAuth();
  const [form, setForm] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [responseId, setResponseId] = useState(null);

  // First, fetch student data
  const fetchStudentData = useCallback(async () => {
    if (!user?.email) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, email, department_code, program, year_of_study')
        .eq('email', user.email)
        .single();

      if (error) {
        console.error('Error fetching student:', error);
        setError('Could not find your student profile. Please contact support.');
        return;
      }

      if (data) {
        setStudentData(data);
        setStudentId(data.id);
      } else {
        setError('Student profile not found.');
      }
    } catch (err) {
      console.error('Error in fetchStudentData:', err);
      setError('Failed to load student data');
    }
  }, [user?.email]);

  // Then fetch the form
  const fetchForm = useCallback(async () => {
    if (!formId || !studentId) {
      return;
    }

    setLoading(true);
    try {
      // Get form details
      const { data: formData, error: formError } = await supabase
        .from('module_evaluation_forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formError) {
        console.error('Form fetch error:', formError);
        throw formError;
      }

      if (!formData) {
        setError('Form not found');
        setLoading(false);
        return;
      }

      // Check if student has already submitted
      const { data: existingResponse, error: responseError } = await supabase
        .from('module_evaluation_responses')
        .select('id, answers, submitted_at')
        .eq('form_id', formId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (responseError) {
        console.error('Response check error:', responseError);
      }

      if (existingResponse) {
        // Check if fully submitted
        if (existingResponse.submitted_at) {
          setAlreadySubmitted(true);
          setForm(formData);
          setLoading(false);
          return;
        }

        // Partial - resume mode (has answers but no submitted_at)
        const hasAnswers = existingResponse.answers && Object.keys(existingResponse.answers).length > 0;
        if (hasAnswers) {
          console.log('🔄 Resuming evaluation with answers:', existingResponse.answers);
          setIsResuming(true);
          setForm(formData);
          setAnswers(existingResponse.answers);
          setResponseId(existingResponse.id);
          setLoading(false);
          return;
        }
      }

      // No existing response - start fresh
      console.log('📝 Starting fresh evaluation');
      setIsResuming(false);
      setForm(formData);
      setResponseId(null);
      const initialAnswers = {};
      (formData.questions || []).forEach(q => {
        initialAnswers[q.id] = q.type === 'mcq' ? '' : '';
      });
      setAnswers(initialAnswers);
    } catch (err) {
      console.error('Error fetching form:', err);
      setError('Failed to load evaluation form: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [formId, studentId]);

  // Load everything
  useEffect(() => {
    const loadData = async () => {
      await fetchStudentData();
    };
    loadData();
  }, []);

  // Fetch form once student data is ready
  useEffect(() => {
    if (studentId && formId) {
      fetchForm();
    }
  }, [studentId, formId, fetchForm]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (errors[questionId]) {
      setErrors(prev => ({ ...prev, [questionId]: null }));
    }

    // Auto-save progress
    autoSaveProgress(questionId, value);
  };

  // Auto-save function
  const autoSaveProgress = useCallback(async (questionId, value) => {
    if (!formId || !studentId || !form) return;

    // Don't auto-save if already submitted
    if (alreadySubmitted) return;

    setSaveStatus('Saving...');

    try {
      const updatedAnswers = { ...answers, [questionId]: value };
      
      // Filter out empty answers for cleaner storage
      const cleanAnswers = {};
      Object.keys(updatedAnswers).forEach(key => {
        if (updatedAnswers[key] !== '' && updatedAnswers[key] !== null && updatedAnswers[key] !== undefined) {
          cleanAnswers[key] = updatedAnswers[key];
        }
      });

      if (responseId) {
        // Update existing draft
        const { error: updateError } = await supabase
          .from('module_evaluation_responses')
          .update({ 
            answers: cleanAnswers,
            updated_at: new Date().toISOString()
          })
          .eq('id', responseId);

        if (updateError) {
          console.error('Error auto-saving:', updateError);
          setSaveStatus('Save failed');
        } else {
          setSaveStatus('Saved');
        }
      } else {
        // Create new draft
        const { data, error: insertError } = await supabase
          .from('module_evaluation_responses')
          .insert({
            form_id: formId,
            student_id: studentId,
            student_name: studentData?.full_name || 'Student',
            student_email: studentData?.email || '',
            answers: cleanAnswers,
            submitted_at: null,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating draft:', insertError);
          setSaveStatus('Save failed');
        } else {
          setResponseId(data.id);
          setSaveStatus('Saved');
        }
      }

      // Clear save status after 2 seconds
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      console.error('Auto-save error:', err);
      setSaveStatus('Error saving');
    }
  }, [formId, studentId, answers, form, studentData, responseId, alreadySubmitted]);

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    (form.questions || []).forEach(q => {
      if (q.required) {
        const answer = answers[q.id];
        if (!answer || (typeof answer === 'string' && !answer.trim())) {
          newErrors[q.id] = 'This question is required';
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Filter out empty answers
      const cleanAnswers = {};
      Object.keys(answers).forEach(key => {
        if (answers[key] !== '' && answers[key] !== null && answers[key] !== undefined) {
          cleanAnswers[key] = answers[key];
        }
      });

      const responseData = {
        form_id: formId,
        student_id: studentId,
        student_name: studentData?.full_name || 'Student',
        student_email: studentData?.email || '',
        answers: cleanAnswers,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let submitError;
      if (responseId) {
        // Update existing draft to submitted
        const { error } = await supabase
          .from('module_evaluation_responses')
          .update(responseData)
          .eq('id', responseId);
        submitError = error;
      } else {
        // Insert new response
        const { error } = await supabase
          .from('module_evaluation_responses')
          .insert([responseData]);
        submitError = error;
      }

      if (submitError) {
        console.error('Submit error:', submitError);
        throw submitError;
      }

      navigate('/module-evaluations', { 
        state: { message: '✅ Evaluation submitted successfully! Thank you for your feedback.' }
      });
    } catch (err) {
      console.error('Error submitting evaluation:', err);
      setError('Failed to submit evaluation: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getQuestionTypeDisplay = (type) => {
    const map = {
      'rating': '⭐ Rating (1-5)',
      'mcq': '📋 Multiple Choice',
      'text': '📝 Short Text',
      'textarea': '📄 Long Text',
      'boolean': '✅ Yes/No',
    };
    return map[type] || type;
  };

  const renderQuestion = (q, index) => {
    const value = answers[q.id] || '';
    const hasError = errors[q.id];

    switch (q.type) {
      case 'rating':
        return React.createElement(
          'div',
          { key: q.id, style: { marginBottom: '12px' } },
          React.createElement(
            'div',
            { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
            [1, 2, 3, 4, 5].map(rating => React.createElement(
              'label',
              { key: rating, style: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' } },
              React.createElement('input', {
                type: 'radio',
                name: 'q_' + q.id,
                value: rating,
                checked: parseInt(value) === rating,
                onChange: () => handleAnswerChange(q.id, rating)
              }),
              '⭐'.repeat(rating)
            ))
          )
        );

      case 'mcq':
        return React.createElement(
          'div',
          { key: q.id, style: { marginBottom: '12px' } },
          q.options && q.options.length > 0 ? (
            q.options.map((opt, idx) => React.createElement(
              'label',
              { key: idx, style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '4px' } },
              React.createElement('input', {
                type: 'radio',
                name: 'q_' + q.id,
                value: opt,
                checked: value === opt,
                onChange: () => handleAnswerChange(q.id, opt)
              }),
              opt
            ))
          ) : (
            <span style={{ color: '#999' }}>No options available</span>
          )
        );

      case 'boolean':
        return React.createElement(
          'div',
          { key: q.id, style: { display: 'flex', gap: '20px', marginBottom: '12px' } },
          React.createElement(
            'label',
            { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' } },
            React.createElement('input', {
              type: 'radio',
              name: 'q_' + q.id,
              value: 'yes',
              checked: value === 'yes',
              onChange: () => handleAnswerChange(q.id, 'yes')
            }),
            '✅ Yes'
          ),
          React.createElement(
            'label',
            { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' } },
            React.createElement('input', {
              type: 'radio',
              name: 'q_' + q.id,
              value: 'no',
              checked: value === 'no',
              onChange: () => handleAnswerChange(q.id, 'no')
            }),
            '❌ No'
          )
        );

      case 'textarea':
        return React.createElement(
          'div',
          { key: q.id },
          React.createElement('textarea', {
            value: value,
            onChange: (e) => handleAnswerChange(q.id, e.target.value),
            placeholder: q.placeholder || 'Enter your answer...',
            style: {
              width: '100%',
              padding: '10px',
              border: hasError ? '2px solid #c62828' : '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical',
              minHeight: '80px'
            }
          })
        );

      case 'text':
      default:
        return React.createElement(
          'div',
          { key: q.id },
          React.createElement('input', {
            type: 'text',
            value: value,
            onChange: (e) => handleAnswerChange(q.id, e.target.value),
            placeholder: q.placeholder || 'Enter your answer...',
            style: {
              width: '100%',
              padding: '10px',
              border: hasError ? '2px solid #c62828' : '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }
          })
        );
    }
  };

  const styles = {
    container: { padding: '20px', maxWidth: '800px', margin: '0 auto' },
    header: {
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '2px solid #e8eaf6'
    },
    title: { margin: 0, fontSize: '24px', fontWeight: '700', color: '#1a237e' },
    subTitle: { margin: '4px 0 0 0', fontSize: '14px', color: '#666' },
    resumeBanner: {
      background: '#e3f2fd',
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '16px',
      border: '1px solid #90caf9',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    saveStatus: {
      fontSize: '12px',
      color: '#666',
      textAlign: 'right',
      marginTop: '4px'
    },
    formCard: {
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #f0f0f5'
    },
    questionBox: {
      padding: '16px',
      marginBottom: '16px',
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e8eaf6'
    },
    questionLabel: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '600',
      fontSize: '15px',
      color: '#1a237e'
    },
    requiredStar: { color: '#c62828', marginLeft: '4px' },
    errorText: { color: '#c62828', fontSize: '12px', marginTop: '4px', display: 'block' },
    footer: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px',
      paddingTop: '16px',
      borderTop: '1px solid #f0f0f0'
    },
    cancelBtn: {
      padding: '10px 24px',
      background: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    submitBtn: {
      padding: '10px 32px',
      background: '#1a237e',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '14px'
    },
    errorAlert: {
      background: '#ffebee',
      color: '#c62828',
      padding: '12px 16px',
      borderRadius: '6px',
      marginBottom: '16px'
    },
    loading: {
      textAlign: 'center',
      padding: '60px',
      color: '#666'
    },
    alreadySubmitted: {
      textAlign: 'center',
      padding: '40px',
      background: '#e8f5e9',
      borderRadius: '8px',
      border: '1px solid #a5d6a7'
    }
  };

  if (loading) {
    return React.createElement('div', { style: styles.loading }, 'Loading evaluation form...');
  }

  if (alreadySubmitted) {
    return React.createElement(
      'div',
      { style: styles.container },
      React.createElement(
        'div',
        { style: styles.alreadySubmitted },
        React.createElement('h3', null, '✅ You have already completed this evaluation'),
        React.createElement('p', null, 'Thank you for your feedback!'),
        React.createElement('button', {
          onClick: () => navigate('/module-evaluations'),
          style: { marginTop: '16px', padding: '10px 24px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }
        }, 'Back to Evaluations')
      )
    );
  }

  if (error && !form) {
    return React.createElement(
      'div',
      { style: { ...styles.container, textAlign: 'center', padding: '60px' } },
      React.createElement('p', { style: { color: '#c62828' } }, '❌ ', error),
      React.createElement('button', {
        onClick: () => navigate('/module-evaluations'),
        style: { marginTop: '16px', padding: '10px 24px', background: '#1a237e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }
      }, 'Back to Evaluations')
    );
  }

  const answeredCount = Object.values(answers).filter(a => a && a !== '').length;
  const totalQuestions = form?.questions?.length || 1;
  const progress = Math.min(Math.round((answeredCount / totalQuestions) * 100), 100);

  return React.createElement(
    'div',
    { style: styles.container },
    React.createElement(
      'div',
      { style: styles.header },
      React.createElement('h2', { style: styles.title }, form?.title || 'Module Evaluation'),
      React.createElement('p', { style: styles.subTitle },
        form?.academic_year || '', ' - Semester ', form?.target_semester || '',
        form?.target_year_of_study ? ' - Year ' + form.target_year_of_study : ''
      ),
      form?.description && React.createElement('p', { style: { ...styles.subTitle, marginTop: '4px' } }, form.description)
    ),
    // Resume banner if resuming
    isResuming && React.createElement(
      'div',
      { style: styles.resumeBanner },
      React.createElement('span', { style: { fontSize: '24px' } }, '🔄'),
      React.createElement(
        'div',
        null,
        React.createElement('strong', null, 'Resuming your evaluation'),
        React.createElement('p', { style: { margin: '0', fontSize: '13px', color: '#555' } },
          'You have already started this evaluation. Continue from where you left off.'
        )
      )
    ),
    error && React.createElement('div', { style: styles.errorAlert }, '❌ ', error),
    React.createElement(
      'form',
      { onSubmit: handleSubmit, style: styles.formCard },
      (form?.questions || []).map((q, index) => {
        const isAnswered = answers[q.id] && answers[q.id] !== '';
        return React.createElement(
          'div',
          { key: q.id, style: styles.questionBox },
          React.createElement(
            'label',
            { style: styles.questionLabel },
            (index + 1),
            '. ',
            q.question,
            q.required && React.createElement('span', { style: styles.requiredStar }, ' *'),
            React.createElement('span', { style: { fontSize: '12px', color: '#999', marginLeft: '8px' } },
              '(', getQuestionTypeDisplay(q.type), ')'
            ),
            isAnswered && React.createElement(
              'span',
              { style: { fontSize: '11px', color: '#2e7d32', marginLeft: '8px' } },
              '✅ Answered'
            )
          ),
          renderQuestion(q, index),
          errors[q.id] && React.createElement('span', { style: styles.errorText }, errors[q.id])
        );
      }),
      // Progress indicator
      React.createElement(
        'div',
        { style: { marginBottom: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '6px' } },
        React.createElement(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#666' } },
          React.createElement('span', null, 'Progress'),
          React.createElement('span', null, answeredCount, ' of ', totalQuestions, ' answered (', progress, '%)')
        ),
        React.createElement(
          'div',
          { style: { width: '100%', height: '6px', background: '#e8eaf6', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' } },
          React.createElement('div', {
            style: {
              width: progress + '%',
              height: '100%',
              background: progress === 100 ? '#2e7d32' : 'linear-gradient(90deg, #1a237e, #42a5f5)',
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }
          })
        ),
        saveStatus && React.createElement(
          'div',
          { style: { ...styles.saveStatus, color: saveStatus === 'Saved' ? '#2e7d32' : saveStatus === 'Saving...' ? '#ff8f00' : '#c62828' } },
          saveStatus === 'Saving...' ? '💾 Saving...' : 
          saveStatus === 'Saved' ? '✅ Saved' : 
          saveStatus === 'Save failed' ? '❌ Save failed' :
          saveStatus === 'Error saving' ? '❌ Error saving' : ''
        )
      ),
      React.createElement(
        'div',
        { style: styles.footer },
        React.createElement('button', {
          type: 'button',
          onClick: () => navigate('/module-evaluations'),
          style: styles.cancelBtn
        }, 'Cancel'),
        React.createElement('button', {
          type: 'submit',
          disabled: submitting,
          style: { ...styles.submitBtn, opacity: submitting ? 0.7 : 1 }
        }, submitting ? 'Submitting...' : 'Submit Evaluation')
      )
    )
  );
};

export default StudentEvaluationFormFill;