// src/components/dashboard/Notes.jsx
import React, { useState, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useCachedData } from '../../hooks/useCachedData';
import Modal from 'react-modal';
import './Notes.css';

// Set app element for modal accessibility
if (typeof window !== 'undefined') {
  Modal.setAppElement('#root');
}

const Notes = () => {
  const { user } = useStudentAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadProgress, setDownloadProgress] = useState({});
  const [downloadingFile, setDownloadingFile] = useState(null);
  
  // View Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isNoteLoading, setIsNoteLoading] = useState(false);
  const [noteContent, setNoteContent] = useState(null);

  // Helper: Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper: Get file icon based on extension
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const iconMap = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      ppt: '📊',
      pptx: '📊',
      xls: '📊',
      xlsx: '📊',
      txt: '📃',
      zip: '📦',
      rar: '📦',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      mp4: '🎬',
      mp3: '🎵',
    };
    return iconMap[ext] || '📎';
  };

  // Helper: Check if file is viewable in browser
  const isViewable = (fileType) => {
    const viewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'doc', 'docx', 'ppt', 'pptx'];
    return viewableTypes.includes(fileType?.toLowerCase());
  };

  // Helper: Get viewable content type
  const getViewableType = (fileType) => {
    const types = {
      pdf: 'pdf',
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      txt: 'text',
      doc: 'office',
      docx: 'office',
      ppt: 'office',
      pptx: 'office',
    };
    return types[fileType?.toLowerCase()] || 'other';
  };

  // Fetch notes data using SAME logic as Tutorials
  const fetchNotesData = useCallback(async () => {
    if (!user?.email) {
      throw new Error('No user logged in');
    }

    // Get student profile
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, program_code, academic_year, year_of_study, semester')
      .eq('email', user.email)
      .single();

    if (studentError || !student) {
      throw new Error('Unable to load your profile. Please contact admin.');
    }

    if (!student.program_code || !student.academic_year || !student.year_of_study || !student.semester) {
      throw new Error('Profile incomplete: missing program, academic year, year, or semester.');
    }

    const {
      id: studentId,
      program_code: studentProgramCode,
      academic_year: studentAcademicYear,
      year_of_study: studentYear,
      semester: studentSemester
    } = student;

    const academicParts = studentAcademicYear.trim().split('/');
    const startYear = academicParts[0]?.toUpperCase() || '';
    const endYear = academicParts[1]?.toUpperCase() || '';

    const normProgram = studentProgramCode.toUpperCase().trim();
    const cohortString = `YEAR${studentYear}_SEM${studentSemester}`.toUpperCase();

    console.log('Student cohort for Notes:', {
      programCode: studentProgramCode,
      academicYear: studentAcademicYear,
      cohort: cohortString,
      uuid: studentId
    });

    // ⭐ STEP 1: Get ALL completed courses for this student
    const { data: completedCourses, error: completedError } = await supabase
      .from('student_courses')
      .select('course_id')
      .eq('student_id', studentId)
      .eq('status', 'completed');

    if (completedError) {
      console.warn('Could not fetch completed courses:', completedError);
    }

    // Create a Set of course IDs that are completed
    const completedCourseIds = new Set(completedCourses?.map(c => c.course_id) || []);
    console.log(`📚 Student has ${completedCourseIds.size} completed courses`);

    // ⭐ STEP 2: Get all courses that this student is enrolled in (to get course codes)
    const { data: enrolledCourses, error: enrolledError } = await supabase
      .from('student_courses')
      .select('course_id, courses(course_code)')
      .eq('student_id', studentId);

    if (enrolledError) {
      console.warn('Could not fetch enrolled courses:', enrolledError);
    }

    // Create a map of course_id -> course_code
    const courseCodeMap = new Map();
    enrolledCourses?.forEach(enrollment => {
      if (enrollment.courses?.course_code) {
        courseCodeMap.set(enrollment.course_id, enrollment.courses.course_code);
      }
    });

    console.log(`📚 Student has ${courseCodeMap.size} enrolled courses`);

    // ⭐ STEP 3: Get ALL completed course codes
    const completedCourseCodes = new Set();
    completedCourses?.forEach(completion => {
      const courseCode = courseCodeMap.get(completion.course_id);
      if (courseCode) {
        completedCourseCodes.add(courseCode.toUpperCase());
      }
    });

    console.log('📚 Completed course codes:', [...completedCourseCodes]);

    // Scan the Notes bucket
    const scanFolder = async (prefix = '') => {
      let allFiles = [];

      const listAndProcess = async (path = '') => {
        const { data: items, error } = await supabase.storage
          .from('Notes')
          .list(path, {
            limit: 1000,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (error) {
          console.error('Storage list error at path', path, error);
          return;
        }

        if (!items || items.length === 0) return;

        for (const item of items) {
          const fullPath = path ? `${path}/${item.name}` : item.name;

          if (item.id === null || item.name.endsWith('/')) {
            await listAndProcess(fullPath);
          } else {
            const { data: urlData } = supabase.storage
              .from('Notes')
              .getPublicUrl(fullPath);

            // Get file size using HEAD request
            let fileSize = 0;
            try {
              const headResponse = await fetch(urlData.publicUrl, { method: 'HEAD' });
              fileSize = parseInt(headResponse.headers.get('content-length')) || 0;
            } catch (err) {
              console.warn('Could not get file size:', err);
            }

            allFiles.push({
              name: item.name,
              path: fullPath,
              url: urlData.publicUrl,
              created_at: item.created_at,
              size: fileSize
            });
          }
        }
      };

      await listAndProcess(prefix);
      return allFiles;
    };

    const allFiles = await scanFolder();
    console.log(`📚 Found ${allFiles.length} files in Notes bucket:`, allFiles.map(f => f.path));

    // Filter files - Match program, cohort, and academic year
    const matchingFiles = allFiles.filter(file => {
      const upperPath = file.path.toUpperCase();

      const hasProgram = upperPath.includes(normProgram);
      const hasCohort = upperPath.includes(cohortString);
      const hasStartYear = startYear ? upperPath.includes(startYear) : true;
      const hasEndYear = endYear ? upperPath.includes(endYear) : true;

      return hasProgram && hasCohort && hasStartYear && hasEndYear;
    });

    console.log(`📚 Filtered to ${matchingFiles.length} matching notes`);

    // If no files found, try lenient approach
    let finalFiles = matchingFiles;
    
    if (matchingFiles.length === 0) {
      console.log('⚠️ No files found with strict filtering, trying lenient approach...');
      
      finalFiles = allFiles.filter(file => {
        const upperPath = file.path.toUpperCase();
        return upperPath.includes(normProgram);
      });
      
      console.log(`📚 Lenient filter found ${finalFiles.length} notes`);
    }

    // Collect unique lecturer IDs from file paths
    const lecturerIdSet = new Set();
    finalFiles.forEach(file => {
      let parts = file.path.split('/');
      if (parts[0] === 'notes') parts = parts.slice(1);
      if (parts.length >= 1) {
        lecturerIdSet.add(parts[0]);
      }
    });

    const lecturerIds = Array.from(lecturerIdSet);

    // Fetch lecturer names
    let lecturerMap = new Map();
    if (lecturerIds.length > 0) {
      const { data: lecturers, error: lecturerError } = await supabase
        .from('lecturers')
        .select('id, full_name')
        .in('id', lecturerIds);

      if (lecturerError) {
        console.warn('Could not load lecturer names:', lecturerError);
      } else {
        lecturers.forEach(l => {
          lecturerMap.set(l.id, l.full_name || 'Lecturer');
        });
      }
    }

    // ⭐ STEP 4: Process notes and FILTER OUT completed courses
    const studentNotes = finalFiles
      .map(file => {
        let parts = file.path.split('/');
        if (parts[0] === 'notes') parts = parts.slice(1);

        // Lecturer name
        const lecturerId = parts.length >= 1 ? parts[0] : null;
        const lecturerName = lecturerMap.get(lecturerId) || 'Lecturer';

        // Extract course code
        let displayCourseCode = 'General';
        let rawCourseCode = '';
        
        if (parts.length >= 4) {
          rawCourseCode = parts[2] || '';
          const match = rawCourseCode.match(/^([A-Z]+)(\d+)$/);
          if (match) {
            displayCourseCode = `${match[1]} ${match[2]}`;
          } else {
            displayCourseCode = rawCourseCode;
          }
        } else {
          // Try to extract course code from filename
          const fileNameUpper = file.name.toUpperCase();
          const courseCodeMatch = fileNameUpper.match(/([A-Z]{2,4}\d{3,4})/);
          if (courseCodeMatch) {
            const code = courseCodeMatch[1];
            const match = code.match(/^([A-Z]+)(\d+)$/);
            if (match) {
              displayCourseCode = `${match[1]} ${match[2]}`;
              rawCourseCode = code;
            }
          }
        }

        // ⭐ Check if this course is completed
        const isCompleted = completedCourseCodes.has(rawCourseCode.toUpperCase());
        if (isCompleted) {
          console.log(`⏭️ Skipping note for completed course: ${rawCourseCode}`);
          return null; // Skip this note
        }

        // Clean title - STRIP ALL YEAR PATTERNS
        let cleanTitle = file.name
          .replace(/\.[^.]+$/, '') // Remove extension
          .replace(/^\d{10,14}_[a-z0-9]{6,10}_/i, '') // Remove timestamp pattern
          .replace(/\b(19|20)\d{2}\s*\/\s*(19|20)\d{2}\b/g, '') // 2025/2029
          .replace(/\b(19|20)\d{2}\s*-\s*(19|20)\d{2}\b/g, '') // 2025-2029
          .replace(/\b(19|20)\d{2}\s*(?:-\s*(19|20)\d{2})?\b/g, '') // 2025 or 2025-2029
          .replace(/\b(19|20)\d{2}\s*(?:\/\s*(19|20)\d{2})?\b/g, '') // 2025 or 2025/2029
          .replace(/\b(19|20)\d{2}\b/g, '') // Any 4-digit year
          .replace(/_+/g, ' ') // Replace underscores with spaces
          .replace(/\s+/g, ' ') // Remove extra spaces
          .trim();

        // Remove year at start
        cleanTitle = cleanTitle.replace(/^\s*(19|20)\d{2}\s*/, '');
        // Remove year at end
        cleanTitle = cleanTitle.replace(/\s*(19|20)\d{2}\s*$/, '');
        // Remove any remaining years
        cleanTitle = cleanTitle.replace(/\b(19|20)\d{2}\b/g, '');
        // Clean up extra spaces
        cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();

        // If title is empty after cleaning, use the original filename
        if (!cleanTitle) {
          cleanTitle = file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
        }

        // Capitalize first letter of each word
        cleanTitle = cleanTitle
          .toLowerCase()
          .replace(/\b\w/g, l => l.toUpperCase());

        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileSize = file.metadata?.size || 0;

        return {
          id: `storage-${file.path.replace(/\//g, '-').replace(/\./g, '_')}`,
          title: cleanTitle,
          description: `${lecturerName}`,
          name: file.name,
          fileSize: fileSize,
          fileSizeFormatted: formatFileSize(fileSize),
          downloadUrl: file.url,
          fileType: fileExt,
          icon: getFileIcon(file.name),
          courseCode: displayCourseCode,
          lecturer: lecturerName,
          path: file.path,
          isViewable: isViewable(fileExt),
          isCompleted: isCompleted
        };
      })
      .filter(note => note !== null); // Remove null entries (completed courses)

    console.log(`📚 After removing completed courses: ${studentNotes.length} notes remaining`);

    // Sort: newest first
    studentNotes.sort((a, b) => {
      const dateDiff = new Date(b.uploadDate) - new Date(a.uploadDate);
      return dateDiff !== 0 ? dateDiff : a.title.localeCompare(b.title);
    });

    return {
      notes: studentNotes,
      error: studentNotes.length === 0 ? 'No notes available for your active courses. Notes for completed courses are hidden.' : null
    };
  }, [user]);

  // Use cached data hook
  const {
    data: cachedNoteData,
    loading,
    error,
    refetch: refetchNotes
  } = useCachedData(
    `notes-${user?.id || user?.email}`,
    fetchNotesData,
    {
      ttl: 15 * 60 * 1000,
      enabled: !!user?.email,
      dependencies: [user?.email]
    }
  );

  const notes = cachedNoteData?.notes || [];

  // Filter notes based on search
  const filteredNotes = notes.filter(note => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.lecturer.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Handle View Note
  const handleViewNote = async (note) => {
    if (!note.isViewable) {
      alert('This file type cannot be viewed in the browser. Please download it.');
      return;
    }

    setSelectedNote(note);
    setIsModalOpen(true);
    setIsNoteLoading(true);
    setNoteContent(null);

    try {
      console.log(`👁️ Viewing note: ${note.title}`);
      console.log(`📄 File type: ${note.fileType}`);
      
      const fileType = note.fileType?.toLowerCase();
      
      // For PDF, images, and text files - fetch and display directly
      if (['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt'].includes(fileType)) {
        // Try to get a fresh signed URL first
        let fileUrl = note.downloadUrl;
        
        try {
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('Notes')
            .createSignedUrl(note.path, 3600);
          
          if (!signedUrlError && signedUrlData?.signedUrl) {
            fileUrl = signedUrlData.signedUrl;
            console.log('✅ Got signed URL for viewing');
          }
        } catch (signedUrlErr) {
          console.warn('Could not get signed URL, using public URL:', signedUrlErr);
        }

        const response = await fetch(fileUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to load note: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();

        if (fileType === 'pdf') {
          const url = URL.createObjectURL(blob);
          setNoteContent({ type: 'pdf', url });
        } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
          const url = URL.createObjectURL(blob);
          setNoteContent({ type: 'image', url });
        } else if (fileType === 'txt') {
          const text = await blob.text();
          setNoteContent({ type: 'text', content: text });
        }
      } 
      // For Office files (doc, docx, ppt, pptx) - use Microsoft Office Viewer
      else if (['doc', 'docx', 'ppt', 'pptx'].includes(fileType)) {
        console.log('📎 Office file detected, using Microsoft Office Viewer');
        
        const { data: urlData } = supabase.storage
          .from('Notes')
          .getPublicUrl(note.path);
        
        const publicUrl = urlData.publicUrl;
        console.log('🔗 Public URL for Office viewer:', publicUrl);
        
        const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}`;
        
        setNoteContent({ 
          type: 'office', 
          url: officeViewerUrl,
          originalUrl: publicUrl,
          fileType: fileType 
        });
      } else {
        setNoteContent({ type: 'unsupported', message: 'This file type cannot be previewed.' });
      }
    } catch (err) {
      console.error('❌ Error loading note:', err);
      setNoteContent({ 
        type: 'error', 
        message: 'Failed to load the note. Please try downloading it.',
        fileType: note.fileType 
      });
    } finally {
      setIsNoteLoading(false);
    }
  };

  // Close View Modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedNote(null);
    setNoteContent(null);
    setIsNoteLoading(false);
  };

  // Handle note download
  const handleDownload = async (note) => {
    setDownloadingFile(note.id);
    setDownloadProgress(prev => ({ ...prev, [note.id]: 0 }));

    try {
      console.log(`📥 Downloading note: ${note.title}`);
      console.log(`📥 Path: ${note.path}`);
      console.log(`📥 URL: ${note.downloadUrl}`);

      // Try direct URL first
      let response;
      try {
        response = await fetch(note.downloadUrl);
        console.log('✅ Direct URL fetch successful');
      } catch (directFetchError) {
        console.warn('⚠️ Direct fetch failed, trying signed URL...', directFetchError);
        
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('Notes')
          .createSignedUrl(note.path, 3600);
        
        if (signedUrlError || !signedUrlData?.signedUrl) {
          console.error('❌ Signed URL error:', signedUrlError);
          throw new Error('Could not generate download URL');
        }
        
        console.log('✅ Got signed URL');
        response = await fetch(signedUrlData.signedUrl);
      }

      if (!response.ok) {
        console.error(`❌ Response not OK: ${response.status} ${response.statusText}`);
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) === 0) {
        throw new Error('File is empty');
      }

      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      console.log(`✅ Blob size: ${blob.size} bytes`);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = note.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);

      setDownloadProgress(prev => ({ ...prev, [note.id]: 100 }));

      setTimeout(() => {
        setDownloadProgress(prev => ({ ...prev, [note.id]: 0 }));
      }, 2000);

      console.log('✅ Download completed successfully!');

    } catch (err) {
      console.error('❌ Download error:', err);
      alert(`Failed to download file: ${err.message}`);
      setDownloadProgress(prev => ({ ...prev, [note.id]: 0 }));
    } finally {
      setDownloadingFile(null);
    }
  };

  // Handle bulk download
  const handleDownloadAll = async () => {
    if (filteredNotes.length === 0) {
      alert('No notes to download');
      return;
    }

    if (!window.confirm(`Download all ${filteredNotes.length} notes?`)) {
      return;
    }

    for (const note of filteredNotes) {
      await handleDownload(note);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="notes-loading">
        <div className="spinner"></div>
        <p>Loading notes...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="notes-error">
        <div className="error-icon">⚠️</div>
        <h3>Unable to Load Notes</h3>
        <p>{error}</p>
        <button onClick={refetchNotes} className="retry-button">Retry</button>
      </div>
    );
  }

  return (
    <div className="notes-container">
      <div className="notes-header">
        <div>
          <h1 className="page-title">📚 Notes</h1>
          <p className="page-subtitle">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} available for active courses
          </p>
        </div>
        {filteredNotes.length > 0 && (
          <button onClick={handleDownloadAll} className="download-all-btn">
            📦 Download All ({filteredNotes.length})
          </button>
        )}
      </div>

      {/* Search */}
      <div className="notes-controls">
        <div className="search-wrapper">
          <input
            type="text"
            placeholder="Search notes by title, course code, or lecturer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <button onClick={refetchNotes} className="refresh-btn" title="Refresh notes">
          🔄
        </button>
      </div>

      {/* Stats */}
      <div className="notes-stats">
        <span>Total: <strong>{notes.length}</strong> notes</span>
        <span>Showing: <strong>{filteredNotes.length}</strong></span>
        <span style={{ color: '#6c757d', fontSize: '12px' }}>
          (Notes for completed courses are hidden)
        </span>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="notes-empty">
          <div className="empty-icon">📭</div>
          <h3>No Notes Found</h3>
          <p>
            {searchTerm
              ? 'Try adjusting your search criteria'
              : 'No notes available for your active courses. Notes for completed courses are hidden.'}
          </p>
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); }}
              className="clear-filters-btn"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="notes-grid">
          {filteredNotes.map((note) => (
            <div key={note.id} className="note-card">
              <div className="note-card-header">
                <div className="note-icon" style={{ fontSize: '28px' }}>{note.icon}</div>
                {note.isViewable && (
                  <span style={{ 
                    fontSize: '11px', 
                    color: '#28a745',
                    background: '#e8f5e9',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontWeight: '500'
                  }}>
                    👁️ Viewable
                  </span>
                )}
              </div>
              <div className="note-card-body">
                <h3 className="note-title" style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  margin: '0 0 8px 0',
                  color: '#1a1a1a'
                }}>
                  {note.title}
                </h3>
                
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: '#1976d2',
                  marginBottom: '4px'
                }}>
                  📚 {note.courseCode}
                </div>
                
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '500',
                  color: '#333',
                  marginBottom: '4px'
                }}>
                  👨‍🏫 {note.lecturer}
                </div>
                
                <p style={{ 
                  fontSize: '15px', 
                  color: '#555',
                  margin: '4px 0 0 0',
                  lineHeight: '1.4'
                }}>
                  {note.description}
                </p>
              </div>
              <div className="note-card-footer" style={{
                padding: '12px 16px 16px 16px',
                borderTop: '1px solid #f1f3f5',
                marginTop: '12px',
                display: 'flex',
                gap: '8px'
              }}>
                {/* View Button */}
                {note.isViewable && (
                  <button
                    className="view-btn"
                    onClick={() => handleViewNote(note)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#0056b3'}
                    onMouseLeave={(e) => e.target.style.background = '#007bff'}
                  >
                    👁️ View
                  </button>
                )}
                
                <button
                  className="download-btn"
                  onClick={() => handleDownload(note)}
                  disabled={downloadingFile === note.id}
                  style={{
                    flex: note.isViewable ? 1 : 1,
                    padding: '10px 16px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: downloadingFile === note.id ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    opacity: downloadingFile === note.id ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (downloadingFile !== note.id) {
                      e.target.style.background = '#218838';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (downloadingFile !== note.id) {
                      e.target.style.background = '#28a745';
                    }
                  }}
                >
                  {downloadingFile === note.id ? (
                    <>
                      <span className="spinner-small"></span>
                      {downloadProgress[note.id] ? `${downloadProgress[note.id]}%` : 'Downloading...'}
                    </>
                  ) : (
                    '📥 Download'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal - Same as before */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className="notes-view-modal"
        overlayClassName="notes-view-modal-overlay"
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
      >
        {selectedNote && (
          <div className="notes-modal-container">
            {/* Modal Header */}
            <div className="notes-modal-header">
              <div className="notes-modal-title-section">
                <h2 className="notes-modal-title">{selectedNote.title}</h2>
                <div className="notes-modal-subtitle">
                  <span>📚 {selectedNote.courseCode}</span>
                  <span className="notes-modal-divider">•</span>
                  <span>👨‍🏫 {selectedNote.lecturer}</span>
                  <span className="notes-modal-divider">•</span>
                  <span>📎 {selectedNote.fileType?.toUpperCase()}</span>
                </div>
              </div>
              <div className="notes-modal-actions">
                <button
                  onClick={() => handleDownload(selectedNote)}
                  className="notes-modal-download-btn"
                  title="Download note"
                  style={{
                    padding: '8px 16px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📥 Download
                </button>
                <button
                  onClick={closeModal}
                  className="notes-modal-close-btn"
                  title="Close"
                  style={{
                    width: '36px',
                    height: '36px',
                    background: 'none',
                    border: 'none',
                    color: '#6c757d',
                    fontSize: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#e9ecef'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content - Note Viewer */}
            <div className="notes-modal-body">
              {isNoteLoading ? (
                <div className="notes-view-loading">
                  <div className="spinner"></div>
                  <p>Loading note content...</p>
                </div>
              ) : noteContent ? (
                <div className="notes-viewer">
                  {noteContent.type === 'pdf' && (
                    <iframe
                      src={noteContent.url}
                      className="notes-viewer-pdf"
                      title={selectedNote.title}
                      style={{
                        width: '100%',
                        height: '70vh',
                        border: 'none',
                        borderRadius: '8px'
                      }}
                    />
                  )}
                  {noteContent.type === 'image' && (
                    <div className="notes-viewer-image-container" style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '70vh',
                      background: '#f8f9fa',
                      borderRadius: '8px'
                    }}>
                      <img
                        src={noteContent.url}
                        alt={selectedNote.title}
                        className="notes-viewer-image"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                  )}
                  {noteContent.type === 'text' && (
                    <div className="notes-viewer-text" style={{
                      padding: '20px',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      maxHeight: '70vh',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: '#333'
                    }}>
                      {noteContent.content}
                    </div>
                  )}
                  {noteContent.type === 'office' && (
                    <div className="notes-viewer-office-container" style={{
                      width: '100%',
                      height: '70vh',
                      position: 'relative',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <iframe
                        src={noteContent.url}
                        className="notes-viewer-office"
                        title={selectedNote.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          borderRadius: '8px'
                        }}
                        allowFullScreen
                      />
                    </div>
                  )}
                  {noteContent.type === 'unsupported' && (
                    <div className="notes-viewer-unsupported" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '70vh',
                      color: '#666',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
                      <h3>{noteContent.message}</h3>
                      <p style={{ color: '#999' }}>Please download the file to view it.</p>
                      <button
                        onClick={() => handleDownload(selectedNote)}
                        style={{
                          padding: '10px 24px',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        📥 Download
                      </button>
                    </div>
                  )}
                  {noteContent.type === 'error' && (
                    <div className="notes-viewer-error" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '70vh',
                      color: '#dc3545',
                      textAlign: 'center',
                      padding: '20px'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                      <h3>{noteContent.message}</h3>
                      <button
                        onClick={() => handleDownload(selectedNote)}
                        style={{
                          padding: '10px 24px',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          marginTop: '12px'
                        }}
                      >
                        📥 Download Instead
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </Modal>

      {/* Styles for View Modal */}
      <style jsx>{`
        .notes-view-modal {
          position: relative;
          background: transparent;
          border: none;
          outline: none;
          width: 90%;
          max-width: 900px;
          max-height: 90vh;
          margin: 40px auto;
          overflow: visible;
        }

        .notes-view-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          overflow: auto;
        }

        .notes-modal-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          height: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: notesModalSlideIn 0.3s ease;
        }

        @keyframes notesModalSlideIn {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .notes-modal-header {
          padding: 16px 24px;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-shrink: 0;
        }

        .notes-modal-title-section {
          flex: 1;
          margin-right: 20px;
          min-width: 0;
        }

        .notes-modal-title {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 6px 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .notes-modal-subtitle {
          font-size: 13px;
          color: #666;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .notes-modal-divider {
          color: #adb5bd;
          font-size: 12px;
        }

        .notes-modal-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-shrink: 0;
        }

        .notes-modal-body {
          padding: 20px;
          overflow: auto;
          flex: 1;
          background: #ffffff;
        }

        .notes-view-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 70vh;
          gap: 16px;
        }

        .notes-view-loading .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e9ecef;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid #e9ecef;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          display: inline-block;
        }

        .ReactModal__Overlay {
          opacity: 0;
          transition: opacity 200ms ease-in-out;
        }

        .ReactModal__Overlay--after-open {
          opacity: 1;
        }

        .ReactModal__Overlay--before-close {
          opacity: 0;
        }

        @media (max-width: 768px) {
          .notes-view-modal {
            width: 100%;
            margin: 0;
            max-height: 100vh;
            max-width: 100%;
          }

          .notes-view-modal-overlay {
            padding: 0;
          }

          .notes-modal-container {
            border-radius: 0;
            max-height: 100vh;
            height: 100vh;
          }

          .notes-modal-header {
            flex-direction: column;
            gap: 12px;
            padding: 12px 16px;
          }

          .notes-modal-actions {
            width: 100%;
            justify-content: space-between;
          }

          .notes-modal-title {
            font-size: 16px;
            -webkit-line-clamp: 1;
          }

          .notes-modal-body {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default Notes;