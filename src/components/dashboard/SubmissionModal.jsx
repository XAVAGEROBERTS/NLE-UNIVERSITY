// src/components/SubmissionModal.jsx
import React, { useState, useRef } from 'react';
import { supabase } from '../../services/supabase';

const SubmissionModal = ({ assignment, studentId, onClose, onSubmitSuccess }) => {
  const [submissionText, setSubmissionText] = useState('');
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const maxFileSize = assignment.max_file_size || 10;
    const allowedFormats = assignment.allowed_formats || ['pdf', 'doc', 'docx', 'zip'];

    const validFiles = selectedFiles.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      const sizeMB = file.size / (1024 * 1024);

      if (sizeMB > maxFileSize) {
        setError(`"${file.name}" exceeds ${maxFileSize}MB limit`);
        return false;
      }
      if (!allowedFormats.includes(ext)) {
        setError(`"${file.name}" not allowed. Use: ${allowedFormats.join(', ')}`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setError('');
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const uploadedUrls = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop();
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${studentId}/${assignment.id}/${Date.now()}_${i}_${cleanName}`;

      const { error: uploadError } = await supabase.storage
        .from('assignments')
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw new Error(`Upload failed: ${file.name}`);

      const { data: urlData } = supabase.storage
        .from('assignments')
        .getPublicUrl(filePath);

      uploadedUrls.push(urlData.publicUrl);
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!submissionText.trim() && files.length === 0) {
      setError('Please provide text or upload files');
      return;
    }
    if (assignment.submission_type === 'text' && !submissionText.trim()) {
      setError('Text submission required');
      return;
    }
    if (assignment.submission_type === 'file' && files.length === 0) {
      setError('File upload required');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      let fileUrls = [];
      if (files.length > 0) {
        fileUrls = await uploadFiles();
      }

      const submissionData = {
        assignment_id: assignment.id,
        student_id: studentId,
        submitted_text: submissionText || null,
        file_urls: fileUrls.length > 0 ? fileUrls : null,
        status: new Date(assignment.rawDueDate) < new Date() ? 'late' : 'submitted',
        submission_date: new Date().toISOString()
      };

      const { error: submissionError } = await supabase
        .from('assignment_submissions')
        .insert([submissionData]);

      if (submissionError) throw submissionError;

      setSuccess('Submitted successfully!');
      setTimeout(() => {
        onSubmitSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '560px',           // Reduced from 700px
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
      }}>
        {/* Compact Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f9fafb'
        }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#1f2937' }}>
            Submit: {assignment.title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={e => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseOut={e => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Compact Info Box */}
          <div style={{
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '13px'
          }}>
            <div><strong>Course:</strong> {assignment.courseCode}</div>
            <div><strong>Due:</strong> {assignment.dueDate}</div>
            <div><strong>Type:</strong> {assignment.submission_type}</div>
          </div>

          {/* Messages */}
          {error && (
            <div style={{
              padding: '10px 12px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '10px 12px',
              backgroundColor: '#dcfce7',
              border: '1px solid #86efac',
              borderRadius: '6px',
              color: '#166534',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {success}
            </div>
          )}

          {/* Text Submission */}
          {(assignment.submission_type === 'text' || assignment.submission_type === 'both') && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Submission Text {assignment.submission_type === 'text' && '*'}
              </label>
              <textarea
                value={submissionText}
                onChange={e => setSubmissionText(e.target.value)}
                placeholder="Enter your answer here..."
                rows={5}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
              <div style={{ textAlign: 'right', fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {submissionText.length} characters
              </div>
            </div>
          )}

          {/* File Upload */}
          {(assignment.submission_type === 'file' || assignment.submission_type === 'both') && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Files {assignment.submission_type === 'file' && '*'}
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #bbb',
                  borderRadius: '8px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#fafafa'
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#3b82f6'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#bbb'}
              >
                <p style={{ margin: '0 0 8px 0', color: '#4b5563', fontWeight: 500 }}>
                  Click to upload or drag & drop
                </p>
                <small style={{ color: '#9ca3af' }}>
                  Max {assignment.max_file_size || 10}MB • {assignment.allowed_formats?.join(', ') || 'PDF, DOC, ZIP'}
                </small>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                style={{ display: 'none' }}
              />

              {/* File List */}
              {files.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  {files.map((file, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '6px',
                      marginBottom: '6px',
                      fontSize: '13px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-file" style={{ color: '#3b82f6' }}></i>
                        <div>
                          <div style={{ fontWeight: 500 }}>{file.name}</div>
                          <div style={{ color: '#6b7280', fontSize: '12px' }}>{formatFileSize(file.size)}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(i)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ height: '4px', backgroundColor: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${uploadProgress}%`,
                      backgroundColor: '#22c55e',
                      transition: 'width 0.3s'
                    }}></div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#4b5563', marginTop: '4px' }}>
                    {uploadProgress}% uploaded
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions (if any) */}
          {assignment.instructions && (
            <div style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '13px',
              marginTop: '16px'
            }}>
              <strong style={{ color: '#d97706' }}>Instructions:</strong>
              <p style={{ margin: '6px 0 0 0', color: '#92400e' }}>{assignment.instructions}</p>
            </div>
          )}
        </div>

        {/* Compact Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #eee',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          backgroundColor: '#f9fafb'
        }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              backgroundColor: isSubmitting ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmissionModal;