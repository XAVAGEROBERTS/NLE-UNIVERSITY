import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useCachedData } from '../../hooks/useCachedData';
import Modal from 'react-modal';

if (typeof window !== 'undefined') {
  Modal.setAppElement('#root');
}

const Tutorials = () => {
  const [activeVideo, setActiveVideo] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showDownloadToast, setShowDownloadToast] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState('');
  const videoRef = useRef(null);
  const hoverVideoRefs = useRef({});
  const lastSavedSecondRef = useRef(-1);
  const hasResumedRef = useRef(false);
  const { user } = useStudentAuth();
  const [thumbnails, setThumbnails] = useState({});

  const fetchTutorialsData = useCallback(async () => {
    if (!user?.email) {
      throw new Error('No user logged in');
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, program_code, academic_year, year_of_study, semester')
      .eq('email', user.email)
      .single();

    if (studentError || !student) {
      throw new Error('Unable to load your profile. Please contact admin.');
    }

    if (
      !student.program_code ||
      !student.academic_year ||
      !student.year_of_study ||
      !student.semester
    ) {
      throw new Error(
        'Profile incomplete: missing program, academic year, year, or semester.'
      );
    }

    const {
      id: studentId,
      program_code: studentProgramCode,
      academic_year: studentAcademicYear,
      year_of_study: studentYear,
      semester: studentSemester,
    } = student;

    const academicParts = studentAcademicYear.trim().split('/');
    const startYear = academicParts[0]?.toUpperCase() || '';
    const endYear = academicParts[1]?.toUpperCase() || '';
    const normProgram = studentProgramCode.toUpperCase().trim();
    const cohortString = `YEAR${studentYear}_SEM${studentSemester}`.toUpperCase();

    const { data: completedCourses, error: completedError } = await supabase
      .from('student_courses')
      .select('course_id')
      .eq('student_id', studentId)
      .eq('status', 'completed');

    if (completedError) {
      console.warn('Could not fetch completed courses:', completedError);
    }

    const { data: enrolledCourses, error: enrolledError } = await supabase
      .from('student_courses')
      .select('course_id, courses(course_code)')
      .eq('student_id', studentId);

    if (enrolledError) {
      console.warn('Could not fetch enrolled courses:', enrolledError);
    }

    const courseCodeMap = new Map();
    enrolledCourses?.forEach((enrollment) => {
      if (enrollment.courses?.course_code) {
        courseCodeMap.set(enrollment.course_id, enrollment.courses.course_code);
      }
    });

    const completedCourseCodes = new Set();
    completedCourses?.forEach((completion) => {
      const courseCode = courseCodeMap.get(completion.course_id);
      if (courseCode) {
        completedCourseCodes.add(courseCode.toUpperCase());
      }
    });

    const scanFolder = async (prefix = '') => {
      const allFiles = [];

      const listAndProcess = async (path = '') => {
        const { data: items, error } = await supabase.storage
          .from('Tutorials')
          .list(path, {
            limit: 1000,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' },
          });

        if (error || !items || items.length === 0) return;

        for (const item of items) {
          const fullPath = path ? `${path}/${item.name}` : item.name;

          if (item.id === null || item.name.endsWith('/')) {
            await listAndProcess(fullPath);
          } else {
            const { data: urlData } = supabase.storage
              .from('Tutorials')
              .getPublicUrl(fullPath);

            allFiles.push({
              name: item.name,
              path: fullPath,
              url: urlData.publicUrl,
              created_at: item.created_at,
            });
          }
        }
      };

      await listAndProcess(prefix);
      return allFiles;
    };

    const allFiles = await scanFolder();

    const matchingFiles = allFiles.filter((file) => {
      const upperPath = file.path.toUpperCase();
      const hasProgram = upperPath.includes(normProgram);
      const hasCohort = upperPath.includes(cohortString);
      const hasStartYear = startYear ? upperPath.includes(startYear) : true;
      const hasEndYear = endYear ? upperPath.includes(endYear) : true;
      return hasProgram && hasCohort && hasStartYear && hasEndYear;
    });

    const lecturerIdSet = new Set();
    matchingFiles.forEach((file) => {
      let parts = file.path.split('/');
      if (parts[0] === 'tutorials') parts = parts.slice(1);
      if (parts.length >= 1) lecturerIdSet.add(parts[0]);
    });

    const lecturerIds = Array.from(lecturerIdSet);
    const lecturerMap = new Map();

    if (lecturerIds.length > 0) {
      const { data: lecturers, error: lecturerError } = await supabase
        .from('lecturers')
        .select('id, full_name')
        .in('id', lecturerIds);

      if (!lecturerError && lecturers) {
        lecturers.forEach((l) => {
          lecturerMap.set(l.id, l.full_name || 'Lecturer');
        });
      }
    }

    const studentTutorials = matchingFiles
      .map((file) => {
        let parts = file.path.split('/');
        if (parts[0] === 'tutorials') parts = parts.slice(1);

        const lecturerId = parts.length >= 1 ? parts[0] : null;
        const lecturerName = lecturerMap.get(lecturerId) || 'Lecturer';

        let displayCourseCode = 'General';
        let rawCourseCode = '';
        if (parts.length >= 4) {
          rawCourseCode = parts[2].toUpperCase();
          const match = rawCourseCode.match(/^([A-Z]+)(\d+)$/);
          displayCourseCode = match ? `${match[1]} ${match[2]}` : rawCourseCode;
        }

        if (completedCourseCodes.has(rawCourseCode)) {
          return null;
        }

        let cleanTitle = file.name
          .replace(/\.[^.]+$/, '')
          .replace(/^\d{10,14}_[a-z0-9]{6,10}_/i, '')
          .replace(/_+/g, ' ')
          .trim();

        cleanTitle =
          cleanTitle.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()) ||
          'Untitled Tutorial';

        return {
          id: `storage-${file.path.replace(/\//g, '-').replace(/\./g, '_')}`,
          title: cleanTitle,
          description: '',
          videoSrc: file.url,
          hasVideo: file.name.match(/\.(mp4|webm|ogg|mov)$/i) !== null,
          lecturer: lecturerName,
          courseCode: displayCourseCode,
          courseName:
            displayCourseCode === 'General' ? 'General Tutorial' : displayCourseCode,
          fileUrls: [],
          viewCount: 0,
          created_at: file.created_at,
          isCompleted: false,
        };
      })
      .filter((t) => t !== null);

    studentTutorials.sort((a, b) => {
      const dateDiff = new Date(b.created_at) - new Date(a.created_at);
      return dateDiff !== 0 ? dateDiff : a.title.localeCompare(b.title);
    });

    return {
      tutorials: studentTutorials,
      error:
        studentTutorials.length === 0
          ? 'No tutorials available for your active courses. Tutorials for completed courses are hidden.'
          : null,
    };
  }, [user]);

  const {
    data: cachedTutorialData,
    loading,
    error,
    refetch: refetchTutorials,
  } = useCachedData(`tutorials-${user?.id || user?.email}`, fetchTutorialsData, {
    ttl: 15 * 60 * 1000,
    enabled: !!user?.email,
    dependencies: [user?.email],
  });

  const tutorials = cachedTutorialData?.tutorials || [];

  // Thumbnails
  const generateThumbnail = (videoSrc) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      video.src = videoSrc;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        let seekTime = 1;
        if (video.duration && !isNaN(video.duration) && video.duration > 4) {
          seekTime = Math.min(video.duration * 0.25, video.duration - 1);
        }
        video.currentTime = seekTime;
      };

      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      video.onerror = () => resolve(null);
    });
  };

  useEffect(() => {
    const loadThumbnails = async () => {
      for (const tutorial of tutorials) {
        if (!thumbnails[tutorial.id] && tutorial.videoSrc) {
          const thumb = await generateThumbnail(tutorial.videoSrc);
          if (thumb) {
            setThumbnails((prev) => ({ ...prev, [tutorial.id]: thumb }));
          }
        }
      }
    };
    if (tutorials.length > 0) loadThumbnails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorials]);

  useEffect(() => {
    const refs = hoverVideoRefs.current;
    return () => {
      Object.values(refs).forEach((video) => {
        if (video) {
          video.pause();
          video.currentTime = 0;
          video.src = '';
        }
      });
    };
  }, []);

  useEffect(() => {
    if (showDownloadToast) {
      const timer = setTimeout(() => setShowDownloadToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showDownloadToast]);

  // ==================== VIDEO PROGRESS ====================
  const saveVideoProgress = (videoId, currentTime, duration) => {
    if (!videoId || !currentTime || currentTime < 3) return;
    try {
      localStorage.setItem(
        `tutorial-progress-${videoId}`,
        JSON.stringify({
          currentTime,
          duration: duration || 0,
          updatedAt: Date.now(),
        })
      );
    } catch (_) {}
  };

  const getVideoProgress = (videoId) => {
    try {
      const raw = localStorage.getItem(`tutorial-progress-${videoId}`);
      if (!raw) return 0;
      const data = JSON.parse(raw);
      if (Date.now() - (data.updatedAt || 0) > 30 * 24 * 60 * 60 * 1000) return 0;
      return Number(data.currentTime) || 0;
    } catch (_) {
      return 0;
    }
  };

  const closeModal = () => {
    if (videoRef.current && activeVideo) {
      const t = videoRef.current.currentTime;
      const d = videoRef.current.duration;
      if (t > 3) {
        saveVideoProgress(activeVideo.id, t, d);
      }
      videoRef.current.pause();
    }
    setIsModalOpen(false);
    setActiveVideo(null);
    setIsVideoLoading(false);
    setVideoError(false);
    lastSavedSecondRef.current = -1;
    hasResumedRef.current = false;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !activeVideo) return;
    const t = videoRef.current.currentTime;
    const sec = Math.floor(t);
    if (sec > 0 && sec % 5 === 0 && sec !== lastSavedSecondRef.current) {
      lastSavedSecondRef.current = sec;
      saveVideoProgress(activeVideo.id, t, videoRef.current.duration);
    }
  };

  const openVideoPlayer = (tutorial) => {
    if (!tutorial.videoSrc) {
      alert('Video source not available');
      return;
    }

    Object.values(hoverVideoRefs.current).forEach((video) => {
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    });

    hasResumedRef.current = false;
    lastSavedSecondRef.current = -1;

    setActiveVideo(tutorial);
    setIsModalOpen(true);
    setIsVideoLoading(true);
    setVideoError(false);
  };

  // Resume only ONCE – prevents infinite seek loop
  const handleVideoLoaded = () => {
    setIsVideoLoading(false);
    setVideoError(false);

    if (hasResumedRef.current) return;
    if (!videoRef.current || !activeVideo) return;

    const duration = videoRef.current.duration;
    if (!duration || isNaN(duration) || !isFinite(duration)) return;

    const savedTime = getVideoProgress(activeVideo.id);

    if (savedTime > 3 && savedTime < duration - 5) {
      hasResumedRef.current = true;
      try {
        videoRef.current.currentTime = savedTime;
      } catch (_) {}
    } else {
      hasResumedRef.current = true;
    }
  };

  const handleVideoError = () => {
    setIsVideoLoading(false);
    setVideoError(true);
  };

  const refreshTutorials = () => {
    refetchTutorials();
  };

  const downloadVideo = (videoUrl, videoTitle) => {
    if (!videoUrl) {
      alert('No download URL available');
      return;
    }

    const safeTitle = videoTitle
      .replace(/[^a-z0-9]/gi, '_')
      .substring(0, 100)
      .trim();
    const fileName = safeTitle ? `${safeTitle}.mp4` : 'tutorial_video.mp4';
    const downloadUrl = `${videoUrl}?download=${encodeURIComponent(fileName)}`;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadFileName(fileName);
    setShowDownloadToast(true);
  };

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
      if (video.src !== videoUrl) video.src = videoUrl;
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  };

  // ==================== LOADING ====================
  if (loading) {
    return (
      <div className="tutorials-container">
        <div className="tutorials-loading-state">
          <div className="tutorials-spinner-container">
            <div className="tutorials-spinner">
              <div className="tutorials-spinner-circle"></div>
              <div className="tutorials-spinner-circle"></div>
              <div className="tutorials-spinner-circle"></div>
              <div className="tutorials-spinner-circle"></div>
            </div>
          </div>
          <p className="tutorials-loading-text">Loading tutorials...</p>
        </div>
      </div>
    );
  }

  // ==================== ERROR ====================
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

  // ==================== MAIN ====================
  return (
    <div className="tutorials-container">
      <div className="tutorials-header">
        <div className="header-left">
          <h1 className="page-title">
            <i className="fas fa-video"></i> Video Tutorials
          </h1>
          <p className="page-subtitle">
            {tutorials.length}{' '}
            {tutorials.length === 1 ? 'tutorial' : 'tutorials'} available for active
            courses
          </p>
        </div>
        <div className="header-right">
          <button onClick={refreshTutorials} className="secondary-button">
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      <div className="tutorials-grid">
        {tutorials.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fas fa-video-slash"></i>
            </div>
            <h3 className="empty-title">No Tutorials Found</h3>
            <p className="empty-message">
              No tutorials available for your active courses. Tutorials for completed
              courses are hidden.
            </p>
          </div>
        ) : (
          tutorials.map((tutorial) => (
            <div key={tutorial.id} className="tutorial-card">
              <div
                className="tutorial-thumbnail"
                onMouseEnter={() =>
                  handleThumbnailHover(tutorial.id, tutorial.videoSrc, true)
                }
                onMouseLeave={() =>
                  handleThumbnailHover(tutorial.id, tutorial.videoSrc, false)
                }
                onClick={() => openVideoPlayer(tutorial)}
              >
                <div className="thumbnail-content">
                  <div
                    className="video-preview"
                    ref={(el) => {
                      if (el && hoverVideoRefs.current[tutorial.id]) {
                        el.appendChild(hoverVideoRefs.current[tutorial.id]);
                      }
                    }}
                  />
                  <div
                    className="thumbnail-fallback"
                    style={{
                      backgroundImage: thumbnails[tutorial.id]
                        ? `url(${thumbnails[tutorial.id]})`
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div className="course-badge">{tutorial.courseCode}</div>
                </div>
              </div>

              <div className="tutorial-content">
                <div className="tutorial-header">
                  <h3 className="tutorial-title" title={tutorial.title}>
                    {tutorial.title}
                  </h3>
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
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Video Modal */}
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
                  onClick={() =>
                    downloadVideo(activeVideo.videoSrc, activeVideo.title)
                  }
                  className="modal-download-btn"
                  title="Download video"
                >
                  <i className="fas fa-download"></i> Download
                </button>
                <button onClick={closeModal} className="modal-close-btn" title="Close">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

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
                    onClick={() =>
                      downloadVideo(activeVideo.videoSrc, activeVideo.title)
                    }
                    className="modal-download-btn"
                  >
                    <i className="fas fa-download"></i> Download Video
                  </button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  key={activeVideo.id}
                  src={activeVideo.videoSrc}
                  className="video-player"
                  controls
                  controlsList="nodownload"
                  preload="auto"
                  playsInline
                  onCanPlay={handleVideoLoaded}
                  onTimeUpdate={handleTimeUpdate}
                  onError={handleVideoError}
                  autoPlay
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>

            <div className="video-description">
              <div className="description-header">
                <h4 className="description-title">
                  <i className="fas fa-info-circle"></i> Description from Lecturer
                </h4>
                <div className="description-badge">Tutorial Material</div>
              </div>
              <div className="description-content">
                <p className="description-text">
                  {activeVideo.description || 'Tutorial material'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {showDownloadToast && (
        <div className="download-toast">
          <div className="toast-content">
            <i className="fas fa-check-circle"></i>
            <span>Download started: {downloadFileName}</span>
          </div>
        </div>
      )}

      {/* Keep your existing <style jsx> block here */}

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
          max-width: 800px;
          max-height: 85vh;
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
          max-height: 85vh;
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

        /* Modal Header */
        .modal-header {
          padding: 16px 24px;
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
          min-width: 0;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 6px 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
        }

        .modal-subtitle {
          font-size: 13px;
          color: #666;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
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
          font-size: 12px;
        }

        .modal-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-shrink: 0;
        }

        .modal-download-btn {
          padding: 6px 12px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
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
          width: 32px;
          height: 32px;
          background: none;
          border: none;
          color: #6c757d;
          font-size: 16px;
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

        /* Video Container */
        .video-container {
          position: relative;
          background: #000;
          padding-top: 45%;
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

        /* Video Description */
        .video-description {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
          max-height: calc(85vh - 200px);
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
          font-size: 16px;
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
  background: rgba(0, 0, 0, 0.7);
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
            padding-top: 56.25%;
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