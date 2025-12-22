import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';
import Modal from 'react-modal';

// Set app element for modal accessibility
if (typeof window !== 'undefined') {
  Modal.setAppElement('#root');
}

const Tutorials = () => {
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showDownloadToast, setShowDownloadToast] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState('');
  const videoRef = useRef(null);
  const hoverVideoRefs = useRef({});
  const { user } = useStudentAuth();

  const [thumbnails, setThumbnails] = useState({});

  useEffect(() => {
    if (user?.email) {
      fetchTutorials();
    }
  }, [user]);

  useEffect(() => {
  const loadThumbnails = async () => {
    for (const tutorial of tutorials) {
      if (!thumbnails[tutorial.id] && tutorial.videoSrc) {
        const thumb = await generateThumbnail(tutorial.videoSrc);
        if (thumb) {
          setThumbnails(prev => ({
            ...prev,
            [tutorial.id]: thumb
          }));
        }
      }
    }
  };

  if (tutorials.length > 0) {
    loadThumbnails();
  }
}, [tutorials]);

  // Clean up hover videos on unmount
  useEffect(() => {
    return () => {
      Object.values(hoverVideoRefs.current).forEach(video => {
        if (video) {
          video.pause();
          video.currentTime = 0;
          video.src = '';
        }
      });
    };
  }, []);

  // Hide download toast after 3 seconds
  useEffect(() => {
    if (showDownloadToast) {
      const timer = setTimeout(() => {
        setShowDownloadToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showDownloadToast]);

const fetchTutorials = async () => {
  try {
    setLoading(true);
    setError(null);

const { data: student, error: studentError } = await supabase
  .from('students')
  .select('id, student_id, program_code, academic_year, year_of_study, semester')
  .eq('email', user.email)
  .single();

if (studentError || !student) {
  throw new Error('Unable to load student profile');
}

if (!student.program_code || !student.academic_year) {
  throw new Error('Your profile is incomplete: missing program code or academic year. Contact admin.');
}
const {
  id: studentId, // UUID
  program_code: studentProgramCode,
  academic_year: studentAcademicYear,
  year_of_study: studentYear,
  semester: studentSemester
} = student;

const studentCohort = `Year${studentYear}_Sem${studentSemester}`;

console.log('Student cohort:', {
  programCode: studentProgramCode,
  academicYear: studentAcademicYear,
  cohort: studentCohort,
  uuid: studentId
});

    // === RECURSIVE STORAGE SCAN (CORRECTED & WORKING) ===
    const scanFolder = async (prefix = '') => {
      let allFiles = [];

      const listAndProcess = async (path = '') => {
        const { data: items, error } = await supabase.storage
          .from('Tutorials')
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

          // Folder: recurse
          if (item.id === null || item.name.endsWith('/')) {
            await listAndProcess(fullPath);
          } else {
            // File: add to list
            const { data: urlData } = supabase.storage
              .from('Tutorials')
              .getPublicUrl(fullPath);

            allFiles.push({
              name: item.name,
              path: fullPath,
              url: urlData.publicUrl,
              created_at: item.created_at
            });
          }
        }
      };

      await listAndProcess(prefix);
      return allFiles;
    };

    // Only ONE declaration of allFiles
    const allFiles = await scanFolder();
    console.log(`Found ${allFiles.length} ACTUAL FILES in Tutorials bucket:`, allFiles.map(f => f.path));

const matchingFiles = allFiles.filter(file => {
  const parts = file.path.split('/');
  if (parts.length < 5) return false; // Need at least program/[course]/year1/year2/cohort/file

  const programCode = parts[0].toUpperCase().trim();

  // Determine if there's a course code
  let startIndex = 1; // default: program/year1/year2/cohort/file
  if (parts.length >= 6 && /^[A-Z0-9]{4,12}$/.test(parts[1])) {
    startIndex = 2; // program/course/year1/year2/cohort/file
  }

  const year1 = parts[startIndex];
  const year2 = parts[startIndex + 1];
  const cohortPart = parts[startIndex + 2];

  // Reconstruct academic year as "2025/2029"
  const folderAcademicYear = `${year1}/${year2}`;

  const normFolderAY = folderAcademicYear
    .replace(/_/g, '/')
    .replace(/-/g, '/')
    .trim()
    .toUpperCase();

  const normStudentAY = studentAcademicYear.toUpperCase().trim();

  const normCohort = (cohortPart || '').toUpperCase().trim();
  const normStudentCohort = studentCohort.toUpperCase();

  console.log('ULTIMATE CHECK:', file.path, {
    programMatch: programCode === studentProgramCode.toUpperCase().trim(),
    ayMatch: normFolderAY === normStudentAY,
    cohortMatch: normCohort === normStudentCohort,
    extracted: { program: programCode, ay: normFolderAY, cohort: normCohort }
  });

  return (
    programCode === studentProgramCode.toUpperCase().trim() &&
    normFolderAY === normStudentAY &&
    normCohort === normStudentCohort
  );
});

    console.log(`Filtered to ${matchingFiles.length} matching tutorials`);
    
    console.log(`Found ${allFiles.length} files in Tutorials bucket`);

  

allFiles.forEach(file => {
  console.log('Available file path:', file.path);
});

    console.log(`Filtered to ${matchingFiles.length} matching tutorials`);
const { data: enrollments, error: enrollError } = await supabase
  .from('student_courses')
  .select('courses(course_code)')
  .eq('student_id', student.id); // Now uses correct UUID

if (enrollError) {
  console.warn('Could not load enrollments:', enrollError);
  // Continue without strict course check
}

    const enrolledCourseCodes = enrollments?.map(e => e.courses?.course_code?.toUpperCase()) || [];

    // 5. Create tutorial objects from matching files
    const studentTutorials = matchingFiles.map(file => {
      const fileName = file.name.replace(/\.[^.]+$/, ''); // remove extension
      const cleanTitle = fileName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      // Extract course code if present
      const parts = file.path.split('/');
      let displayCourseCode = 'General';
      if (parts.length >= 5 && parts[1].length <= 10) {
        displayCourseCode = parts[1];
      }

      return {
        id: `storage-${file.path.replace(/\//g, '-').replace(/\./g, '_')}`,
        title: cleanTitle,
        description: 'Tutorial material uploaded by your lecturer',
        videoSrc: file.url,
        hasVideo: true,
        lecturer: 'Your Lecturer',
        courseCode: displayCourseCode,
        courseName: displayCourseCode === 'General' ? 'General Tutorial' : `Course ${displayCourseCode}`,
        fileUrls: [], // no extra materials for now
        viewCount: 0
      };
    });

    // Sort by filename/title
    studentTutorials.sort((a, b) => a.title.localeCompare(b.title));

    setTutorials(studentTutorials);

    if (studentTutorials.length === 0) {
      setError('No tutorials available for your program and cohort yet. Check back later!');
    }

  } catch (err) {
    console.error('Error loading tutorials:', err);
    setError(`Failed to load tutorials: ${err.message}`);
  } finally {
    setLoading(false);
  }
  };
  
const generateThumbnail = (videoSrc) => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    video.src = videoSrc;
    video.crossOrigin = 'anonymous';
    video.muted = true; // Helps with autoplay policies
    video.preload = 'metadata'; // Load metadata first (includes duration)

    video.onloadedmetadata = () => {
      // Calculate middle point: prefer 25% in, but fallback to 1s if duration unknown/short
      let seekTime = 1;
      if (video.duration && !isNaN(video.duration) && video.duration > 4) {
        seekTime = Math.min(video.duration * 0.25, video.duration - 1); // 25% or near end
      }
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8)); // 80% quality for smaller size
    };

    video.onerror = () => {
      resolve(null); // Fallback to gradient if error
    };
  });
};

  const openVideoPlayer = async (tutorial) => {
    if (!tutorial.videoSrc) {
      alert('Video source not available');
      return;
    }

    // Stop any playing hover videos
    Object.values(hoverVideoRefs.current).forEach(video => {
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    });

    setActiveVideo(tutorial);
    setIsModalOpen(true);
    setIsVideoLoading(true);
    setVideoError(false);
  };

  const closeModal = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsModalOpen(false);
    setActiveVideo(null);
    setIsVideoLoading(false);
    setVideoError(false);
  };

  const handleVideoLoaded = () => {
    setIsVideoLoading(false);
    setVideoError(false);
  };

  const handleVideoError = () => {
    setIsVideoLoading(false);
    setVideoError(true);
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty?.toLowerCase()) {
      case 'beginner': return '#28a745';
      case 'advanced': return '#dc3545';
      default: return '#007bff';
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const refreshTutorials = () => {
    setLoading(true);
    fetchTutorials();
  };

const downloadVideo = (videoUrl, videoTitle) => {
  if (!videoUrl) {
    alert('No download URL available');
    return;
  }

  // Sanitize filename
  const safeTitle = videoTitle
    .replace(/[^a-z0-9]/gi, '_')
    .substring(0, 100)
    .trim();
  const fileName = safeTitle ? `${safeTitle}.mp4` : 'tutorial_video.mp4';

  // Append ?download=filename to force direct download
  const downloadUrl = `${videoUrl}?download=${encodeURIComponent(fileName)}`;

  

  // Create hidden link and click it
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName; // Extra safety
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Toast notification
  setDownloadFileName(fileName);
  setShowDownloadToast(true);

  console.log('Direct download started:', fileName);
};


  const downloadFile = async (fileUrl, fileName) => {
    try {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || 'tutorial-file';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  // Handle thumbnail hover for video preview
  const handleThumbnailHover = (tutorialId, videoUrl, isHovering) => {
    if (!hoverVideoRefs.current[tutorialId]) {
      const video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'metadata';
      hoverVideoRefs.current[tutorialId] = video;
    }

    const video = hoverVideoRefs.current[tutorialId];
    
    if (isHovering && videoUrl) {
      if (video.src !== videoUrl) {
        video.src = videoUrl;
      }
      video.play().catch(err => {
        console.log('Auto-play prevented:', err);
      });
    } else {
      video.pause();
      video.currentTime = 0;
    }
  };



  // Loading state
  if (loading) {
    return (
      <div className="tutorials-container">
        <div className="loading-state">
          <div className="spinner-container">
            <div className="spinner">
              <div className="spinner-circle"></div>
              <div className="spinner-circle"></div>
              <div className="spinner-circle"></div>
              <div className="spinner-circle"></div>
            </div>
          </div>
          <p className="loading-text">Loading tutorials...</p>
        </div>
        <style jsx>{`
          .tutorials-container {
            padding: 24px;
            min-height: calc(100vh - 80px);
            background: #f8f9fa;
          }
          
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 70vh;
            gap: 24px;
          }
          
          .spinner-container {
            width: 80px;
            height: 80px;
            position: relative;
          }
          
          .spinner {
            width: 100%;
            height: 100%;
            position: relative;
            animation: rotate 2s linear infinite;
          }
          
          .spinner-circle {
            position: absolute;
            width: 20px;
            height: 20px;
            background: #007bff;
            border-radius: 50%;
            animation: bounce 1.5s ease-in-out infinite;
          }
          
          .spinner-circle:nth-child(1) {
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            animation-delay: 0s;
          }
          
          .spinner-circle:nth-child(2) {
            top: 50%;
            right: 0;
            transform: translateY(-50%);
            animation-delay: 0.15s;
          }
          
          .spinner-circle:nth-child(3) {
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            animation-delay: 0.3s;
          }
          
          .spinner-circle:nth-child(4) {
            top: 50%;
            left: 0;
            transform: translateY(-50%);
            animation-delay: 0.45s;
          }
          
          .loading-text {
            font-size: 18px;
            color: #666;
            font-weight: 500;
            margin: 0;
          }
          
          @keyframes rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes bounce {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            50% {
              transform: translate(-50%, -50%) scale(0.5);
              opacity: 0.5;
            }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="tutorials-container">
        <div className="tutorials-header">
          <div className="header-left">
            <h1 className="page-title">
              <i className="fas fa-video"></i> Video Tutorials
            </h1>
          </div>
        </div>
        <div className="error-state">
          <div className="error-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h3 className="error-title">Unable to Load Tutorials</h3>
          <p className="error-message">{error}</p>
          <button onClick={refreshTutorials} className="primary-button">
            <i className="fas fa-sync-alt"></i> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tutorials-container">
      <div className="tutorials-header">
        <div className="header-left">
          <h1 className="page-title">
            <i className="fas fa-video"></i> Video Tutorials
          </h1>
          <p className="page-subtitle">
            {tutorials.length} {tutorials.length === 1 ? 'tutorial' : 'tutorials'} available
          </p>
        </div>
        <div className="header-right">
          <button onClick={refreshTutorials} className="secondary-button">
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      {/* Tutorials Grid */}
      <div className="tutorials-grid">
        {tutorials.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fas fa-video-slash"></i>
            </div>
            <h3 className="empty-title">No Tutorials Found</h3>
            <p className="empty-message">
              No video tutorials available. Check back later or contact your instructor.
            </p>
          </div>
        ) : (
          tutorials.map(tutorial => (
            <div key={tutorial.id} className="tutorial-card">
              {/* Thumbnail with Video Preview */}
              <div 
                className="tutorial-thumbnail"
                onMouseEnter={() => handleThumbnailHover(tutorial.id, tutorial.videoSrc, true)}
                onMouseLeave={() => handleThumbnailHover(tutorial.id, tutorial.videoSrc, false)}
                onClick={() => openVideoPlayer(tutorial)}
              >
                <div className="thumbnail-content">
                
                  
                  {/* Video Preview (hidden) */}
                  <div 
                    className="video-preview"
                    ref={el => {
                      if (el && hoverVideoRefs.current[tutorial.id]) {
                        el.appendChild(hoverVideoRefs.current[tutorial.id]);
                      }
                    }}
                  />
                  
                  {/* Fallback image or first frame */}
                  <div 
                    className="thumbnail-fallback"
                   style={{
  backgroundImage: thumbnails[tutorial.id]
    ? `url(${thumbnails[tutorial.id]})`
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  backgroundSize: 'cover',
  backgroundPosition: 'center'
}}
                  />
                  
                  <div className="difficulty-badge" style={{ display:'none',
                    backgroundColor: getDifficultyColor(tutorial.difficulty)
                  }}>
                    {tutorial.difficulty?.toUpperCase()}
                  </div>
                  
                  <div className="course-badge">
                    {tutorial.courseCode}
                  </div>
                </div>
              </div>

              {/* Tutorial Info */}
              <div className="tutorial-content">
                <div className="tutorial-header">
                  <h3 className="tutorial-title" title={tutorial.title}>
                    {tutorial.title}
                  </h3>
                  {tutorial.duration > 0 && (
                    <span className="duration-badge">
                      <i className="far fa-clock"></i> {tutorial.duration} min
                    </span>
                  )}
                </div>
                
                <div className="tutorial-details">
                  <div className="lecturer-info">
                    <i className="fas fa-chalkboard-teacher"></i>
                    <span>{tutorial.lecturer}</span>
                  </div>
                  <div className="course-info">
                    <i className="fas fa-book"></i>
                    <span>{tutorial.courseName}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                  <button 
                    onClick={() => openVideoPlayer(tutorial)}
                    className="watch-button"
                    disabled={!tutorial.videoSrc}
                  >
                    <i className="fas fa-play"></i> Watch
                  </button>
                  
                  <div className="secondary-actions">
                    {tutorial.videoSrc && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadVideo(tutorial.videoSrc, tutorial.title);
                        }}
                        className="download-button"
                        title="Download video"
                      >
                        <i className="fas fa-download"></i> Download
                      </button>
                    )}
                    
                    {tutorial.fileUrls && tutorial.fileUrls.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(tutorial.fileUrls[0], `${tutorial.title}_materials.zip`);
                        }}
                        className="materials-button"
                        title="Download materials"
                      >
                        <i className="fas fa-file-download"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Video Player Modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className="video-modal"
        overlayClassName="video-modal-overlay"
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
      >
        {activeVideo && (
          <div className="modal-container">
            {/* Modal Header - Made more compact */}
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">{activeVideo.title}</h2>
                <div className="modal-subtitle">
                  <span className="subtitle-item">
                    <i className="fas fa-chalkboard-teacher"></i> {activeVideo.lecturer}
                  </span>
                  <span className="subtitle-divider">•</span>
                  <span className="subtitle-item">
                    <i className="fas fa-book"></i> {activeVideo.courseCode}
                  </span>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  onClick={() => downloadVideo(activeVideo.videoSrc, activeVideo.title)}
                  className="modal-download-btn"
                  title="Download video"
                >
                  <i className="fas fa-download"></i> Download
                </button>
                <button
                  onClick={closeModal}
                  className="modal-close-btn"
                  title="Close"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Video Player - Made smaller */}
            <div className="video-container">
              {isVideoLoading && (
                <div className="video-loading">
                  <div className="loading-spinner-small"></div>
                  <p>Loading video...</p>
                </div>
              )}
              
              {videoError ? (
                <div className="video-error">
                  <div className="error-icon-large">
                    <i className="fas fa-exclamation-triangle"></i>
                  </div>
                  <h3>Video Playback Error</h3>
                  <p>Unable to load the video. Please try downloading it instead.</p>
                  <button 
                    onClick={() => downloadVideo(activeVideo.videoSrc, activeVideo.title)}
                    className="modal-download-btn"
                  >
                    <i className="fas fa-download"></i> Download Video
                  </button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  src={activeVideo.videoSrc}
                  className="video-player"
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                  playsInline
                  crossOrigin="anonymous"
                  onLoadedData={handleVideoLoaded}
                  onError={handleVideoError}
                  autoPlay
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>

            {/* Video Description - Made more prominent */}
            <div className="video-description">
              <div className="description-header">
                <h4 className="description-title">
                  <i className="fas fa-info-circle"></i> Description from Lecturer
                </h4>
                <div className="description-badge">
                  Tutorial Material
                </div>
              </div>
              
              <div className="description-content">
                <p className="description-text">
                  {activeVideo.description || 'No description available.'}
                </p>
              </div>

              {/* Materials Section - Only show if there are materials */}
              {activeVideo.fileUrls && activeVideo.fileUrls.length > 0 && (
                <div className="materials-section">
                  <h5 className="materials-title">
                    <i className="fas fa-file-download"></i> Download Materials
                  </h5>
                  <div className="materials-list">
                    {activeVideo.fileUrls.map((fileUrl, index) => (
                      <button
                        key={index}
                        onClick={() => downloadFile(fileUrl, `${activeVideo.title}_material_${index + 1}.zip`)}
                        className="material-btn"
                      >
                        <i className="fas fa-download"></i>
                        <span>Material {index + 1}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Download Toast Notification */}
      {showDownloadToast && (
        <div className="download-toast">
          <div className="toast-content">
            <i className="fas fa-check-circle"></i>
            <span>Download started: {downloadFileName}</span>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Base Container */
        .tutorials-container {
          padding: 24px;
          min-height: calc(100vh - 80px);
          background: #f8f9fa;
          position: relative;
        }

        /* Header Styles */
        .tutorials-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-left {
          flex: 1;
        }

        .header-right {
          display: flex;
          gap: 12px;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .page-title i {
          color: #007bff;
        }

        .page-subtitle {
          font-size: 14px;
          color: #475569;
          margin: 0.5rem 0 0 0;
          padding: 0.5rem 1rem;
          background: #f8fafc;
          border-radius: 8px;
          display: inline-block;
          font-weight: 500;
          border: 1px solid #e2e8f0;
          position: relative;
          padding-left: 2.5rem;
          margin-left: 20px;
        }

        .page-subtitle:before {
          content: '📚';
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 16px;
        }

        /* Button Styles */
        .primary-button {
          padding: 12px 24px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .primary-button:hover {
          background: #0056b3;
          transform: translateY(-1px);
        }

        .secondary-button {
          padding: 10px 20px;
          background: white;
          color: #495057;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .secondary-button:hover {
          background: #f8f9fa;
          border-color: #ced4da;
        }

        /* Loading State for Video Modal */
        .loading-spinner-small {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-text {
          font-size: 16px;
          color: #666;
          margin: 0;
        }

        /* Error State */
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          gap: 24px;
          text-align: center;
        }

        .error-icon {
          font-size: 64px;
          color: #dc3545;
        }

        .error-icon-large {
          font-size: 48px;
          color: #dc3545;
          margin-bottom: 16px;
        }

        .error-title {
          font-size: 24px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }

        .error-message {
          font-size: 16px;
          color: #666;
          max-width: 500px;
          margin: 0;
        }

        /* Tutorials Grid */
        .tutorials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }

        @media (max-width: 768px) {
          .tutorials-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Tutorial Card */
        .tutorial-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .tutorial-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        /* Thumbnail with Video Preview */
        .tutorial-thumbnail {
          height: 200px;
          position: relative;
          cursor: pointer;
          overflow: hidden;
        }

        .thumbnail-content {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .thumbnail-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 1;
          transition: opacity 0.3s ease;
          z-index: 2;
        }

        .tutorial-thumbnail:hover .thumbnail-overlay {
          opacity: 0;
        }

        .play-icon {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: #007bff;
        }

        .video-preview {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          overflow: hidden;
        }

        .video-preview video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .tutorial-thumbnail:hover .video-preview video {
          opacity: 1;
        }

        .thumbnail-fallback {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-size: cover;
          background-position: center;
          z-index: 0;
        }

        .difficulty-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          z-index: 3;
        }

        .course-badge {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          z-index: 3;
          display: none;
        }

        /* Tutorial Content */
        .tutorial-content {
          padding: 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .tutorial-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .tutorial-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
          line-height: 1.4;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .duration-badge {
          font-size: 12px;
          color: #666;
          background: #f8f9fa;
          padding: 2px 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }

        .tutorial-details {
          margin-bottom: 16px;
          flex: 1;
        }

        .lecturer-info, .course-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #666;
          margin-bottom: 4px;
        }

        .lecturer-info i, .course-info i {
          color: #007bff;
          width: 16px;
        }

        /* Action Buttons */
        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: auto;
        }

        .watch-button {
          padding: 10px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          width: 100%;
        }

        .watch-button:hover:not(:disabled) {
          background: #0056b3;
        }

        .watch-button:disabled {
          background: #e9ecef;
          color: #adb5bd;
          cursor: not-allowed;
        }

        .secondary-actions {
          display: flex;
          gap: 8px;
        }

        .download-button {
          flex: 1;
          padding: 10px 16px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .download-button:hover {
          background: #218838;
        }

        .materials-button {
          width: 44px;
          height: 44px;
          background: #17a2b8;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .materials-button:hover {
          background: #138496;
        }

        /* Empty State */
        .empty-state {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }

        .empty-icon {
          font-size: 64px;
          color: #dee2e6;
          margin-bottom: 20px;
        }

        .empty-title {
          font-size: 20px;
          font-weight: 600;
          color: #6c757d;
          margin: 0 0 12px 0;
        }

        .empty-message {
          font-size: 16px;
          color: #adb5bd;
          max-width: 400px;
          margin: 0;
        }

        /* ===== IMPROVED MODAL STYLES ===== */
        .video-modal {
          position: relative;
          background: transparent;
          border: none;
          outline: none;
          width: 90%;
          max-width: 800px; /* Reduced from 1000px */
          max-height: 85vh; /* Reduced from 100vh */
          margin: 40px auto;
          overflow: visible;
        }

        .video-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          overflow: auto;
        }

        .modal-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 85vh; /* Reduced from 100vh */
          height: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: modalSlideIn 0.3s ease;
        }

        @keyframes modalSlideIn {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Modal Header - Made more compact */
        .modal-header {
          padding: 16px 24px; /* Reduced padding */
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-shrink: 0;
          min-height: auto;
        }

        .modal-title-section {
          flex: 1;
          margin-right: 20px;
          min-width: 0; /* Allows text truncation */
        }

        .modal-title {
          font-size: 18px; /* Reduced from 20px */
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 6px 0; /* Reduced margin */
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
        }

        .modal-subtitle {
          font-size: 13px; /* Reduced from 14px */
          color: #666;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px; /* Reduced gap */
          flex-wrap: wrap;
        }

        .subtitle-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .subtitle-divider {
          color: #adb5bd;
          font-size: 12px;
        }

        .modal-subtitle i {
          color: #007bff;
          font-size: 12px; /* Reduced icon size */
        }

        .modal-actions {
          display: flex;
          gap: 8px; /* Reduced gap */
          align-items: center;
          flex-shrink: 0;
        }

        .modal-download-btn {
          padding: 6px 12px; /* Reduced padding */
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px; /* Reduced font size */
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .modal-download-btn:hover {
          background: #218838;
          transform: translateY(-1px);
        }

        .modal-close-btn {
          width: 32px; /* Reduced from 40px */
          height: 32px; /* Reduced from 40px */
          background: none;
          border: none;
          color: #6c757d;
          font-size: 16px; /* Reduced from 20px */
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .modal-close-btn:hover {
          background: #e9ecef;
          color: #495057;
        }

        /* Video Container - Made smaller */
        .video-container {
          position: relative;
          background: #000;
          padding-top: 45%; /* Reduced from 56.25% (16:9 to 20:9) */
          flex-shrink: 0;
        }

        .video-player {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #000;
          z-index: 1;
        }

        /* Video Loading */
        .video-loading {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          z-index: 2;
        }

        .video-loading p {
          color: white;
          font-size: 14px;
          margin: 0;
        }

        /* Video Error */
        .video-error {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 20px;
          text-align: center;
          z-index: 2;
        }

        .video-error h3 {
          color: white;
          font-size: 18px;
          margin: 0;
        }

        .video-error p {
          color: #adb5bd;
          margin: 0;
          max-width: 400px;
          font-size: 14px;
        }

        /* Video Description - Improved visibility */
        .video-description {
          padding: 20px; /* Reduced from 24px */
          overflow-y: auto;
          flex: 1;
          max-height: calc(85vh - 200px); /* Ensures it fits */
          background: #ffffff;
          border-top: 1px solid #f1f3f4;
        }

        .description-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .description-title {
          font-size: 16px; /* Reduced from 18px */
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .description-title i {
          color: #007bff;
          font-size: 16px;
        }

        .description-badge {
          background: #e3f2fd;
          color: #1976d2;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
        }

        .description-content {
          background: #f8fafc;
          border-radius: 8px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          margin-bottom: 20px;
        }

        .description-text {
          font-size: 14px;
          color: #2d3748;
          line-height: 1.6;
          margin: 0;
          white-space: pre-line;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Materials Section */
        .materials-section {
          padding: 16px 0 0 0;
          border-top: 1px solid #e9ecef;
        }

        .materials-title {
          font-size: 15px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .materials-title i {
          color: #17a2b8;
          font-size: 14px;
        }

        .materials-list {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .material-btn {
          padding: 8px 12px;
          background: #e9ecef;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          font-size: 13px;
          color: #495057;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .material-btn:hover {
          background: #dee2e6;
          border-color: #ced4da;
          transform: translateY(-1px);
        }

        /* Download Toast */
        .download-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #28a745;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1001;
          animation: slideIn 0.3s ease;
          max-width: 400px;
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .toast-content i {
          font-size: 18px;
          flex-shrink: 0;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Animations */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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

        /* Enhanced Video Controls */
        .video-player::-webkit-media-controls {
          display: flex !important;
        }

        .video-player::-webkit-media-controls-panel {
          background: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5));
          backdrop-filter: blur(10px);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .tutorials-container {
            padding: 16px;
          }

          .tutorials-header {
            flex-direction: column;
            gap: 16px;
          }

          .header-right {
            width: 100%;
            justify-content: flex-start;
          }

          .video-modal {
            width: 100%;
            margin: 0;
            max-height: 100vh;
            max-width: 100%;
          }

          .video-modal-overlay {
            padding: 0;
          }

          .modal-container {
            border-radius: 0;
            max-height: 100vh;
            height: 100vh;
          }

          .modal-header {
            flex-direction: column;
            gap: 12px;
            padding: 12px 16px;
          }

          .modal-actions {
            width: 100%;
            justify-content: space-between;
          }

          .modal-title {
            font-size: 16px;
            -webkit-line-clamp: 1;
          }

          .video-container {
            padding-top: 56.25%; /* Back to 16:9 on mobile */
          }

          .action-buttons {
            flex-direction: row;
          }

          .watch-button {
            width: auto;
          }

          .download-button {
            padding: 10px;
          }

          .download-button span {
            display: none;
          }

          .tutorials-grid {
            gap: 16px;
          }

          .download-toast {
            bottom: 16px;
            right: 16px;
            left: 16px;
            max-width: none;
          }

          .description-content {
            padding: 12px;
          }
        }

        /* Improve accessibility */
        button:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Scrollbar styling for modal */
        .video-description::-webkit-scrollbar {
          width: 6px;
        }

        .video-description::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .video-description::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        .video-description::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
};

export default Tutorials;