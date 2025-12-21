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

  useEffect(() => {
    if (user?.email) {
      fetchTutorials();
    }
  }, [user]);

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

      // 1. Get student profile
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('email', user.email)
        .single();

      if (studentError || !student) {
        throw new Error('Unable to load student profile');
      }

      // 2. Get enrolled course IDs
      const { data: enrollments, error: enrollError } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', student.id);

      if (enrollError) throw enrollError;

      const courseIds = enrollments?.map(e => e.course_id) || [];

      // 3. Fetch tutorial metadata from DB
      let tutorialEntries = [];
      if (courseIds.length > 0) {
        const { data, error } = await supabase
          .from('tutorials')
          .select(`
            id,
            title,
            description,
            duration_minutes,
            difficulty_level,
            course_id,
            view_count,
            file_urls,
            thumbnail_url,
            courses (course_code, course_name),
            lecturers (full_name)
          `)
          .in('course_id', courseIds)
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        if (error) console.warn('No tutorial entries in DB:', error);
        tutorialEntries = data || [];
      }

      // 4. SCAN STORAGE FOR VIDEOS
      let allVideoFiles = [];
      
      const scanFolder = async (folderPath = '') => {
        try {
          const { data: items, error } = await supabase.storage
            .from('Tutorials')
            .list(folderPath, {
              limit: 1000,
              sortBy: { column: 'name', order: 'asc' }
            });

          if (error) return [];

          if (!items || items.length === 0) return [];

          const videos = [];
          const subfolders = [];

          for (const item of items) {
            const itemPath = folderPath ? `${folderPath}/${item.name}` : item.name;
            
            if (!item.metadata || item.name.endsWith('/')) {
              subfolders.push(itemPath.replace(/\/+$/, ''));
            } else {
              const isVideo = /\.(mp4|mkv|mov|webm|avi|m4v|mpeg|mpg|flv|wmv|3gp)$/i.test(item.name);
              if (isVideo) {
                // Get public URL for the video
                const { data: publicUrlData } = supabase.storage
                  .from('Tutorials')
                  .getPublicUrl(itemPath);
                
                if (publicUrlData?.publicUrl) {
                  videos.push({
                    name: item.name,
                    path: itemPath,
                    url: publicUrlData.publicUrl,
                    created_at: item.created_at
                  });
                }
              }
            }
          }

          for (const subfolder of subfolders) {
            const subVideos = await scanFolder(subfolder);
            videos.push(...subVideos);
          }

          return videos;
        } catch (err) {
          console.error('Error scanning folder:', err);
          return [];
        }
      };

      allVideoFiles = await scanFolder();
      console.log(`Found ${allVideoFiles.length} videos`);

      // 5. Match videos to tutorial entries
      const matchedTutorials = tutorialEntries.map(entry => {
        const matchedVideo = allVideoFiles.find(v => {
          const videoName = v.name.toLowerCase();
          const courseCode = entry.courses?.course_code?.toLowerCase() || '';
          const title = entry.title?.toLowerCase() || '';
          
          return videoName.includes(courseCode) || 
                 videoName.includes(title.replace(/[^a-z0-9]/g, '_')) ||
                 videoName.includes(entry.id);
        });

        return {
          id: entry.id,
          title: entry.title || 'Untitled Tutorial',
          description: entry.description || '',
          duration: entry.duration_minutes || 0,
          difficulty: entry.difficulty_level || 'beginner',
          videoSrc: matchedVideo?.url || null,
          videoPath: matchedVideo?.path || null,
          hasVideo: !!matchedVideo?.url,
          lecturer: entry.lecturers?.full_name || 'Unknown Lecturer',
          courseCode: entry.courses?.course_code || 'N/A',
          courseName: entry.courses?.course_name || 'Unknown Course',
          viewCount: entry.view_count || 0,
          fileUrls: entry.file_urls || [],
          thumbnailUrl: entry.thumbnail_url || null
        };
      });

      // 6. Add orphan videos
      const usedVideoPaths = matchedTutorials.map(t => t.videoPath).filter(Boolean);
      const orphanVideos = allVideoFiles
        .filter(v => !usedVideoPaths.includes(v.path))
        .map(v => ({
          id: `video-${v.path.replace(/\//g, '-').replace(/\./g, '_')}`,
          title: v.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '),
          description: 'Uploaded tutorial video',
          duration: 0,
          difficulty: 'beginner',
          videoSrc: v.url,
          videoPath: v.path,
          hasVideo: true,
          lecturer: 'Unknown Lecturer',
          courseCode: 'General',
          courseName: 'Tutorial Video',
          viewCount: 0,
          fileUrls: [],
          thumbnailUrl: null
        }));

      // 7. Combine and filter
      const allTutorials = [
        ...matchedTutorials.filter(t => t.hasVideo),
        ...orphanVideos
      ];

      allTutorials.sort((a, b) => a.title.localeCompare(b.title));
      setTutorials(allTutorials);

    } catch (err) {
      console.error('Critical error:', err);
      setError(`Failed to load tutorials: ${err.message}`);
    } finally {
      setLoading(false);
    }
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

  // Enhanced download function with fetch and blob
  const downloadVideo = async (videoUrl, videoTitle) => {
    try {
      if (!videoUrl) {
        alert('No download URL available');
        return;
      }

      // Sanitize filename
      const safeTitle = videoTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 100);
      const fileName = `${safeTitle}.mp4`;

      // Create download link
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = fileName;
      link.target = '_blank';
      
      // Force download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show toast notification
      setDownloadFileName(fileName);
      setShowDownloadToast(true);
      
      console.log('Download started:', fileName);
    } catch (error) {
      console.error('Error downloading video:', error);
      alert('Failed to download video. Please try again.');
    }
  };

  // Alternative download method using fetch and blob
  const downloadVideoWithFetch = async (videoUrl, videoTitle) => {
    try {
      setIsVideoLoading(true);
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${videoTitle.replace(/[^a-z0-9]/gi, '_')}.mp4`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      setIsVideoLoading(false);
      setDownloadFileName(videoTitle);
      setShowDownloadToast(true);
    } catch (error) {
      console.error('Error downloading video:', error);
      setIsVideoLoading(false);
      alert('Failed to download video. Please try again.');
    }
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
                  <div className="thumbnail-overlay">
                    <div className="play-icon">
                      <i className="fas fa-play"></i>
                    </div>
                  </div>
                  
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
                      backgroundImage: tutorial.thumbnailUrl 
                        ? `url(${tutorial.thumbnailUrl})` 
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
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
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">{activeVideo.title}</h2>
                <p className="modal-subtitle">
                  <i className="fas fa-chalkboard-teacher"></i> {activeVideo.lecturer} • 
                  <i className="fas fa-book"></i> {activeVideo.courseCode}
                </p>
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

            {/* Video Player */}
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

            {/* Video Description */}
            <div className="video-description">
              <h4 className="description-title">
                <i className="fas fa-info-circle"></i> Description
              </h4>
              <p className="description-text">
                {activeVideo.description || 'No description available.'}
              </p>

              {/* Materials Section */}
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
    marglin-left: 20px;
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

        /* Modal Styles */
        .video-modal {
          position: relative;
          background: transparent;
          border: none;
          outline: none;
          width: 90%;
          max-width: 1000px;
          max-height: 100vh;
          margin: 40px auto;
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
        }

        .modal-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 100vh;
        }

        /* Modal Header */
        .modal-header {
          padding: 6px 12px;
          background: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-shrink: 0;
        }

        .modal-title-section {
          flex: 1;
          margin-right: 20px;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 8px 0;
          line-height: 1.4;
        }

        .modal-subtitle {
          font-size: 14px;
          color: #666;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-subtitle i {
          color: #007bff;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .modal-download-btn {
          padding: 8px 16px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .modal-download-btn:hover {
          background: #218838;
        }

        .modal-close-btn {
          width: 40px;
          height: 40px;
          background: none;
          border: none;
          color: #6c757d;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .modal-close-btn:hover {
          background: #e9ecef;
          color: #495057;
        }

        /* Video Container */
        .video-container {
          position: relative;
          background: #000;
          padding-top: 56.25%; /* 16:9 Aspect Ratio */
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
          gap: 16px;
          z-index: 2;
        }

        .video-loading p {
          color: white;
          font-size: 16px;
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
          gap: 20px;
          padding: 20px;
          text-align: center;
          z-index: 2;
        }

        .video-error h3 {
          color: white;
          font-size: 20px;
          margin: 0;
        }

        .video-error p {
          color: #adb5bd;
          margin: 0;
          max-width: 400px;
        }

        /* Video Description */
        .video-description {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .description-title {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .description-title i {
          color: #007bff;
        }

        .description-text {
          font-size: 15px;
          color: #666;
          line-height: 1.6;
          margin: 0 0 32px 0;
          white-space: pre-line;
        }

        /* Materials Section */
        .materials-section {
          padding-top: 24px;
          border-top: 1px solid #e9ecef;
        }

        .materials-title {
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .materials-title i {
          color: #17a2b8;
        }

        .materials-list {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .material-btn {
          padding: 10px 16px;
          background: #e9ecef;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          font-size: 14px;
          color: #495057;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .material-btn:hover {
          background: #dee2e6;
          border-color: #ced4da;
        }

        /* Download Toast */
        .download-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #28a745;
          color: white;
          padding: 16px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1001;
          animation: slideIn 0.3s ease;
          max-width: 400px;
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
        }

        .toast-content i {
          font-size: 20px;
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

        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
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

        .video-player::-webkit-media-controls-play-button,
        .video-player::-webkit-media-controls-volume-slider,
        .video-player::-webkit-media-controls-mute-button,
        .video-player::-webkit-media-controls-timeline,
        .video-player::-webkit-media-controls-current-time-display,
        .video-player::-webkit-media-controls-time-remaining-display,
        .video-player::-webkit-media-controls-fullscreen-button {
          color: white;
          filter: brightness(1.2);
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
            gap: 16px;
            padding: 16px;
          }

          .modal-actions {
            width: 100%;
            justify-content: space-between;
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
          width: 8px;
        }

        .video-description::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        .video-description::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }

        .video-description::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
};

export default Tutorials;