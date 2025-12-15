import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';
import ReactPlayer from 'react-player';
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
  const [videoProgress, setVideoProgress] = useState({});
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef(null);
  const { user } = useStudentAuth();

  useEffect(() => {
    if (user?.email) {
      fetchTutorials();
    }
  }, [user]);

  const fetchTutorials = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching tutorials for user:', user.email);

      // Get student data
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('email', user.email)
        .single();

      if (studentError) {
        console.error('Student error:', studentError);
        throw new Error(`Student data error: ${studentError.message}`);
      }

      if (!student) {
        throw new Error('Student not found');
      }

      // Fetch student's enrolled courses
      const { data: studentCourses, error: coursesError } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', student.id)
        .in('status', ['enrolled', 'in_progress', 'completed']);

      if (coursesError) {
        console.error('Courses error:', coursesError);
        throw new Error(`Courses error: ${coursesError.message}`);
      }

      const courseIds = studentCourses ? studentCourses.map(sc => sc.course_id) : [];
      console.log('Enrolled course IDs:', courseIds);

      if (courseIds.length === 0) {
        console.log('No enrolled courses found');
        setTutorials([]);
        setLoading(false);
        return;
      }

      // Fetch tutorials for these courses
      const { data: tutorialsData, error: tutorialsError } = await supabase
        .from('tutorials')
        .select(`
          *,
          courses (course_code, course_name),
          lecturers (full_name)
        `)
        .in('course_id', courseIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (tutorialsError) {
        console.error('Tutorials error:', tutorialsError);
        throw new Error(`Tutorials error: ${tutorialsError.message}`);
      }

      console.log('Tutorials fetched:', tutorialsData?.length || 0);

      // Fetch student's tutorial progress
      const { data: progressData, error: progressError } = await supabase
        .from('student_tutorial_progress')
        .select('*')
        .eq('student_id', student.id);

      if (progressError) {
        console.error('Progress error:', progressError);
        throw new Error(`Progress error: ${progressError.message}`);
      }

      console.log('Progress data found:', progressData?.length || 0);

      // Process tutorials with progress
      const processedTutorials = tutorialsData ? tutorialsData.map(tutorial => {
        const studentProgress = progressData?.find(p => p.tutorial_id === tutorial.id);
        const progress = studentProgress?.progress_percentage || 0;
        const completed = studentProgress?.completed || false;
        
        let status = 'new';
        if (completed) status = 'completed';
        else if (progress > 0) status = 'in-progress';

        // Parse video URL - handle both direct URLs and Supabase storage URLs
        let videoSrc = tutorial.video_url;
        if (videoSrc && !videoSrc.startsWith('http')) {
          // If it's a Supabase storage path, construct the full URL
          const { data: { publicUrl } } = supabase.storage
            .from('tutorial-videos')
            .getPublicUrl(videoSrc);
          videoSrc = publicUrl;
        }

        return {
          id: tutorial.id,
          title: tutorial.title,
          lecturer: tutorial.lecturers?.full_name || 'Unknown Lecturer',
          duration: tutorial.duration_minutes || 0,
          description: tutorial.description,
          videoSrc: videoSrc,
          progress: progress,
          status: status,
          courseCode: tutorial.courses?.course_code || 'N/A',
          courseName: tutorial.courses?.course_name || 'Unknown Course',
          difficulty: tutorial.difficulty_level || 'beginner',
          viewCount: tutorial.view_count || 0,
          rating: tutorial.rating,
          lastWatched: studentProgress?.last_watched,
          fileUrls: tutorial.file_urls || [],
          thumbnailUrl: tutorial.thumbnail_url
        };
      }) : [];

      console.log('Processed tutorials:', processedTutorials.length);
      setTutorials(processedTutorials);
    } catch (error) {
      console.error('Error fetching tutorials:', error);
      setError(`Failed to load tutorials: ${error.message}`);
      setTutorials([]);
    } finally {
      setLoading(false);
    }
  };

  const openVideoPlayer = async (tutorial) => {
    try {
      // Update view count
      await supabase
        .from('tutorials')
        .update({ view_count: (tutorial.viewCount || 0) + 1 })
        .eq('id', tutorial.id);

      setActiveVideo(tutorial);
      setIsModalOpen(true);
      
      // Load saved progress for this video
      if (tutorial.progress > 0 && tutorial.progress < 100) {
        setVideoProgress(prev => ({
          ...prev,
          [tutorial.id]: {
            playedSeconds: (tutorial.progress / 100) * (tutorial.duration * 60),
            loadedSeconds: 0
          }
        }));
      }
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  };

  const handleVideoProgress = async (state) => {
    if (!activeVideo) return;

    const { played, loadedSeconds, playedSeconds } = state;
    const progressPercentage = Math.round(played * 100);
    
    // Update local progress state
    setVideoProgress(prev => ({
      ...prev,
      [activeVideo.id]: { played, loadedSeconds, playedSeconds }
    }));

    // Auto-save progress every 10 seconds or when video ends
    const shouldSave = 
      progressPercentage % 10 === 0 || 
      progressPercentage >= 95 ||
      Math.abs(playedSeconds - (activeVideo.duration * 60)) < 5;

    if (shouldSave) {
      await saveProgressToDatabase(activeVideo.id, progressPercentage, playedSeconds);
    }
  };

  const saveProgressToDatabase = async (tutorialId, progressPercentage, playedSeconds) => {
    try {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('email', user.email)
        .single();

      const completed = progressPercentage >= 95;

      const { error } = await supabase
        .from('student_tutorial_progress')
        .upsert({
          student_id: student.id,
          tutorial_id: tutorialId,
          progress_percentage: progressPercentage,
          completed: completed,
          last_watched: new Date().toISOString(),
          time_watched: Math.round(playedSeconds)
        }, {
          onConflict: 'student_id, tutorial_id'
        });

      if (error) throw error;

      // Update local state
      setTutorials(prev => prev.map(t => 
        t.id === tutorialId 
          ? { 
              ...t, 
              progress: progressPercentage, 
              status: completed ? 'completed' : 'in-progress',
              lastWatched: new Date().toISOString()
            }
          : t
      ));

      console.log('Progress saved:', progressPercentage, '%');
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleVideoEnded = async () => {
    if (!activeVideo) return;
    
    // Mark as completed
    await saveProgressToDatabase(activeVideo.id, 100, activeVideo.duration * 60);
    
    // Update local state
    setTutorials(prev => prev.map(t => 
      t.id === activeVideo.id 
        ? { 
            ...t, 
            progress: 100, 
            status: 'completed',
            lastWatched: new Date().toISOString()
          }
        : t
    ));
  };

  const handleSeek = (seconds) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, 'seconds');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setPlaying(false);
    setActiveVideo(null);
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty.toLowerCase()) {
      case 'beginner': return '#28a745';
      case 'intermediate': return '#fd7e14';
      case 'advanced': return '#dc3545';
      default: return '#007bff';
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const refreshTutorials = () => {
    fetchTutorials();
  };

  const downloadFile = async (fileUrl, fileName) => {
    try {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || 'tutorial-file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  if (loading) {
    return (
      <div className="content">
        <div className="dashboard-header">
          <h2><i className="fas fa-video"></i> Tutorials</h2>
          <div className="date-display">Loading tutorials...</div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content">
        <div className="dashboard-header">
          <h2><i className="fas fa-video"></i> Tutorials</h2>
          <div className="date-display">Error</div>
        </div>
        <div className="error-container">
          <i className="fas fa-exclamation-triangle error-icon"></i>
          <p className="error-message">{error}</p>
          <button 
            onClick={refreshTutorials}
            className="refresh-button"
          >
            <i className="fas fa-sync-alt"></i>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="dashboard-header tutorials-header">
        <div>
          <h2 className="tutorials-title">
            <i className="fas fa-video header-icon"></i>
            Video Tutorials
          </h2>
          <div className="date-display tutorials-subtitle">
            {tutorials.length} tutorials available | Progress automatically saved
          </div>
        </div>
        <button 
          onClick={refreshTutorials}
          className="refresh-button header-refresh"
        >
          <i className="fas fa-sync-alt"></i>
          Refresh
        </button>
      </div>

      {/* Tutorials Grid */}
      <div className="tutorials-grid">
        {tutorials.length === 0 ? (
          <div className="no-tutorials">
            <i className="fas fa-video-slash no-tutorials-icon"></i>
            <h3 className="no-tutorials-title">No Tutorials Available</h3>
            <p className="no-tutorials-message">
              Tutorials will appear here once your lecturers upload them. Check back later!
            </p>
          </div>
        ) : (
          tutorials.map(tutorial => (
            <div 
              key={tutorial.id} 
              className="tutorial-card"
              style={{ borderTopColor: getDifficultyColor(tutorial.difficulty) }}
            >
              {/* Thumbnail/Preview */}
              <div 
                className="tutorial-thumbnail"
                style={{
                  backgroundImage: tutorial.thumbnailUrl ? `url(${tutorial.thumbnailUrl})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
                onClick={() => openVideoPlayer(tutorial)}
              >
                <div 
                  className="difficulty-badge"
                  style={{ backgroundColor: getDifficultyColor(tutorial.difficulty) }}
                >
                  {tutorial.difficulty.toUpperCase()}
                </div>
                
                <div className="course-info-overlay">
                  {tutorial.courseCode}: {tutorial.courseName}
                </div>
                
                <div className="play-button-overlay">
                  <i className="fas fa-play"></i>
                </div>
              </div>

              {/* Tutorial Info */}
              <div className="tutorial-info">
                <div className="tutorial-header">
                  <h4 className="tutorial-title">{tutorial.title}</h4>
                  <span className="tutorial-duration">
                    <i className="far fa-clock"></i>
                    {tutorial.duration} min
                  </span>
                </div>

                <div className="tutorial-details">
                  <div className="lecturer-info">
                    <i className="fas fa-chalkboard-teacher"></i>
                    {tutorial.lecturer}
                  </div>
                  {tutorial.description && (
                    <div className="tutorial-description">
                      {tutorial.description.length > 100 
                        ? `${tutorial.description.substring(0, 100)}...` 
                        : tutorial.description}
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="progress-section">
                  <div className="progress-header">
                    <span className="progress-text">Progress: {tutorial.progress}%</span>
                    <span 
                      className="status-badge"
                      style={{
                        backgroundColor: tutorial.status === 'completed' ? '#d4edda' : 
                                       tutorial.status === 'in-progress' ? '#fff3cd' : '#f8d7da',
                        color: tutorial.status === 'completed' ? '#155724' : 
                              tutorial.status === 'in-progress' ? '#856404' : '#721c24'
                      }}
                    >
                      {tutorial.status === 'completed' ? '✓ Completed' : 
                       tutorial.status === 'in-progress' ? '▶ In Progress' : 'New'}
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar"
                      style={{
                        width: `${tutorial.progress}%`,
                        backgroundColor: tutorial.progress === 100 ? '#28a745' : 
                                       tutorial.progress > 0 ? '#007bff' : '#6c757d'
                      }}
                    ></div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                  <button
                    onClick={() => openVideoPlayer(tutorial)}
                    className="watch-button"
                    style={{
                      backgroundColor: tutorial.progress === 100 ? '#6c757d' : '#007bff'
                    }}
                  >
                    {tutorial.progress === 100 ? (
                      <>
                        <i className="fas fa-redo"></i>
                        Review Again
                      </>
                    ) : tutorial.progress > 0 ? (
                      <>
                        <i className="fas fa-play"></i>
                        Continue ({tutorial.progress}%)
                      </>
                    ) : (
                      <>
                        <i className="fas fa-play"></i>
                        Start Watching
                      </>
                    )}
                  </button>
                  
                  {/* Download files if available */}
                  {tutorial.fileUrls && tutorial.fileUrls.length > 0 && (
                    <button
                      onClick={() => downloadFile(tutorial.fileUrls[0], `${tutorial.title}.zip`)}
                      className="download-button"
                      title="Download materials"
                    >
                      <i className="fas fa-download"></i>
                    </button>
                  )}
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
      >
        {activeVideo && (
          <div className="modal-content">
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-header-content">
                <h3 className="modal-title">{activeVideo.title}</h3>
                <div className="modal-subtitle">
                  <i className="fas fa-chalkboard-teacher"></i>
                  {activeVideo.lecturer} • 
                  <i className="fas fa-book"></i>
                  {activeVideo.courseCode} • 
                  <span 
                    className="modal-difficulty"
                    style={{ backgroundColor: getDifficultyColor(activeVideo.difficulty) }}
                  >
                    {activeVideo.difficulty}
                  </span>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="close-modal-button"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Video Player */}
            <div className="video-player-wrapper">
              <ReactPlayer
                ref={playerRef}
                url={activeVideo.videoSrc}
                playing={playing}
                controls={true}
                width="100%"
                height="100%"
                className="react-player"
                onReady={() => {
                  if (videoProgress[activeVideo.id]) {
                    playerRef.current.seekTo(videoProgress[activeVideo.id].playedSeconds, 'seconds');
                  }
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onProgress={handleVideoProgress}
                onEnded={handleVideoEnded}
                onDuration={setDuration}
                config={{
                  file: {
                    attributes: {
                      controlsList: 'nodownload',
                      disablePictureInPicture: true
                    }
                  }
                }}
              />
            </div>

            {/* Video Controls */}
            <div className="video-controls">
              <div className="controls-container">
                <button
                  onClick={() => setPlaying(!playing)}
                  className="play-pause-button"
                  style={{ backgroundColor: playing ? '#dc3545' : '#28a745' }}
                >
                  <i className={`fas fa-${playing ? 'pause' : 'play'}`}></i>
                  {playing ? 'Pause' : 'Play'}
                </button>

                <div className="progress-controls">
                  <div 
                    className="progress-bar-clickable"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const percent = (e.clientX - rect.left) / rect.width;
                      handleSeek(percent * duration);
                    }}
                  >
                    <div 
                      className="progress-bar-fill"
                      style={{ width: `${activeVideo.progress}%` }}
                    ></div>
                  </div>
                  <div className="time-display">
                    <span>{formatTime(videoProgress[activeVideo.id]?.playedSeconds || 0)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="auto-save-indicator">
                  <i className="fas fa-save"></i>
                  Auto-saving...
                </div>
              </div>
            </div>

            {/* Video Description */}
            <div className="video-description">
              <h4 className="description-title">
                <i className="fas fa-info-circle"></i>
                Description
              </h4>
              <p className="description-text">
                {activeVideo.description || 'No description available.'}
              </p>

              {/* Additional Materials */}
              {activeVideo.fileUrls && activeVideo.fileUrls.length > 0 && (
                <div className="materials-section">
                  <h5 className="materials-title">
                    <i className="fas fa-file-download"></i>
                    Download Materials
                  </h5>
                  <div className="materials-buttons">
                    {activeVideo.fileUrls.map((fileUrl, index) => (
                      <button
                        key={index}
                        onClick={() => downloadFile(fileUrl, `material-${index + 1}.zip`)}
                        className="material-button"
                      >
                        <i className="fas fa-download"></i>
                        Material {index + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <style jsx>{`
        /* Base styles */
        .content {
          padding: 20px;
        }
        
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 300px;
        }
        
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 5px solid #f3f3f3;
          border-top: 5px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .error-container {
          padding: 30px;
          background-color: #fee;
          border: 1px solid #f99;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
        }
        
        .error-icon {
          font-size: 48px;
          color: #dc3545;
          margin-bottom: 20px;
        }
        
        .error-message {
          color: #d33;
          margin-bottom: 20px;
          font-size: 16px;
        }
        
        .refresh-button {
          padding: 10px 20px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        
        .refresh-button:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        .refresh-button:active {
          transform: translateY(0);
        }
        
        /* Header styles */
        .tutorials-header {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        @media (min-width: 768px) {
          .tutorials-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }
        
        .tutorials-title {
          margin: 0 0 5px 0;
        }
        
        .header-icon {
          margin-right: 10px;
          color: #007bff;
        }
        
        .tutorials-subtitle {
          color: #666;
          font-size: 14px;
        }
        
        .header-refresh {
          align-self: flex-start;
        }
        
        @media (min-width: 768px) {
          .header-refresh {
            align-self: center;
          }
        }
        
        /* Tutorials Grid */
        .tutorials-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 40px;
        }
        
        @media (min-width: 576px) {
          .tutorials-grid {
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          }
        }
        
        @media (min-width: 768px) {
          .tutorials-grid {
            gap: 25px;
          }
        }
        
        /* Tutorial Card */
        .tutorial-card {
          background-color: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          border-top: 4px solid;
        }
        
        .tutorial-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        }
        
        .tutorial-thumbnail {
          height: 180px;
          background-color: #f8f9fa;
          background-size: cover;
          background-position: center;
          position: relative;
          cursor: pointer;
        }
        
        @media (min-width: 768px) {
          .tutorial-thumbnail {
            height: 200px;
          }
        }
        
        .difficulty-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: bold;
        }
        
        @media (min-width: 768px) {
          .difficulty-badge {
            font-size: 12px;
          }
        }
        
        .course-info-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background-color: rgba(0,0,0,0.7);
          padding: 8px 12px;
          color: white;
          font-size: 13px;
          font-weight: 500;
        }
        
        .play-button-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 50px;
          height: 50px;
          background-color: rgba(255,255,255,0.9);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: #007bff;
        }
        
        @media (min-width: 768px) {
          .play-button-overlay {
            width: 60px;
            height: 60px;
            font-size: 24px;
          }
        }
        
        /* Tutorial Info */
        .tutorial-info {
          padding: 15px;
        }
        
        @media (min-width: 768px) {
          .tutorial-info {
            padding: 20px;
          }
        }
        
        .tutorial-header {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 12px;
        }
        
        @media (min-width: 576px) {
          .tutorial-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
          }
        }
        
        .tutorial-title {
          margin: 0;
          font-size: 15px;
          color: #333;
          line-height: 1.4;
          flex: 1;
        }
        
        @media (min-width: 768px) {
          .tutorial-title {
            font-size: 16px;
          }
        }
        
        .tutorial-duration {
          font-size: 12px;
          color: #6c757d;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .tutorial-details {
          margin-bottom: 15px;
          font-size: 14px;
          color: #666;
        }
        
        .lecturer-info {
          margin-bottom: 5px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .tutorial-description {
          color: #777;
          font-size: 13px;
          line-height: 1.5;
          margin-top: 8px;
        }
        
        /* Progress Section */
        .progress-section {
          margin-bottom: 15px;
        }
        
        .progress-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 6px;
        }
        
        @media (min-width: 576px) {
          .progress-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }
        
        .progress-text {
          font-size: 12px;
          color: #6c757d;
        }
        
        .status-badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 500;
        }
        
        .progress-bar-container {
          height: 6px;
          background-color: #e9ecef;
          border-radius: 3px;
          overflow: hidden;
        }
        
        .progress-bar {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 3px;
        }
        
        /* Action Buttons */
        .action-buttons {
          display: flex;
          gap: 10px;
          flex-direction: column;
        }
        
        @media (min-width: 576px) {
          .action-buttons {
            flex-direction: row;
          }
        }
        
        .watch-button {
          flex: 1;
          padding: 10px;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        
        .download-button {
          padding: 10px 15px;
          background-color: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.2s ease;
        }
        
        /* No Tutorials */
        .no-tutorials {
          grid-column: 1 / -1;
          padding: 40px 20px;
          text-align: center;
          background-color: #f8f9fa;
          border-radius: 8px;
        }
        
        @media (min-width: 768px) {
          .no-tutorials {
            padding: 60px 20px;
          }
        }
        
        .no-tutorials-icon {
          font-size: 48px;
          color: #dee2e6;
          margin-bottom: 20px;
        }
        
        @media (min-width: 768px) {
          .no-tutorials-icon {
            font-size: 64px;
          }
        }
        
        .no-tutorials-title {
          color: #6c757d;
          margin-bottom: 15px;
          font-size: 18px;
        }
        
        @media (min-width: 768px) {
          .no-tutorials-title {
            font-size: 20px;
          }
        }
        
        .no-tutorials-message {
          color: #999;
          margin-bottom: 25px;
          max-width: 500px;
          margin: 0 auto;
          font-size: 14px;
        }
        
        @media (min-width: 768px) {
          .no-tutorials-message {
            font-size: 16px;
          }
        }
        
        /* Modal Styles */
        .video-modal {
          position: relative;
          top: auto;
          left: auto;
          right: auto;
          bottom: auto;
          border: none;
          background: transparent;
          border-radius: 12px;
          padding: 0;
          width: 95%;
          max-width: 900px;
          max-height: 90vh;
          overflow: hidden;
          margin: 20px;
        }
        
        @media (min-width: 768px) {
          .video-modal {
            width: 90%;
            max-width: 1000px;
          }
        }
        
        .video-modal-overlay {
          background-color: rgba(0, 0, 0, 0.75);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        @media (max-width: 576px) {
          .video-modal {
            width: 100%;
            margin: 0;
            border-radius: 0;
            max-height: 100vh;
            max-width: 100%;
          }
          
          .video-modal-overlay {
            padding: 0;
          }
        }
        
        .modal-content {
          background-color: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        
        @media (max-width: 576px) {
          .modal-content {
            border-radius: 0;
            max-height: 100vh;
            overflow-y: auto;
          }
        }
        
        /* Modal Header */
        .modal-header {
          padding: 15px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        @media (min-width: 768px) {
          .modal-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
          }
        }
        
        .modal-header-content {
          flex: 1;
        }
        
        .modal-title {
          margin: 0 0 5px 0;
          color: #333;
          font-size: 16px;
        }
        
        @media (min-width: 768px) {
          .modal-title {
            font-size: 18px;
          }
        }
        
        .modal-subtitle {
          font-size: 13px;
          color: #666;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }
        
        @media (min-width: 768px) {
          .modal-subtitle {
            font-size: 14px;
          }
        }
        
        .modal-difficulty {
          padding: 2px 8px;
          border-radius: 10px;
          color: white;
          font-size: 12px;
        }
        
        .close-modal-button {
          background: none;
          border: none;
          font-size: 20px;
          color: #6c757d;
          cursor: pointer;
          padding: 5px;
          border-radius: 4px;
          align-self: flex-end;
        }
        
        @media (min-width: 768px) {
          .close-modal-button {
            font-size: 24px;
            align-self: center;
          }
        }
        
        /* Video Player */
        .video-player-wrapper {
          position: relative;
          background-color: #000;
          padding-top: 56.25%; /* 16:9 Aspect Ratio */
        }
        
        .react-player {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        
        .react-player video {
          border-radius: 0 !important;
        }
        
        /* Video Controls */
        .video-controls {
          padding: 15px;
          background-color: #f8f9fa;
          border-top: 1px solid #dee2e6;
        }
        
        .controls-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        @media (min-width: 768px) {
          .controls-container {
            flex-direction: row;
            align-items: center;
            flex-wrap: wrap;
          }
        }
        
        .play-pause-button {
          padding: 8px 16px;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .progress-controls {
          flex: 1;
          min-width: 200px;
        }
        
        .progress-bar-clickable {
          height: 6px;
          background-color: #dee2e6;
          border-radius: 3px;
          overflow: hidden;
          cursor: pointer;
        }
        
        .progress-bar-fill {
          height: 100%;
          background-color: #007bff;
          transition: width 0.1s linear;
        }
        
        .time-display {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #6c757d;
          margin-top: 5px;
        }
        
        .auto-save-indicator {
          font-size: 13px;
          color: #495057;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        /* Video Description */
        .video-description {
          padding: 15px;
        }
        
        @media (min-width: 768px) {
          .video-description {
            padding: 20px;
          }
        }
        
        .description-title {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .description-text {
          color: #666;
          line-height: 1.6;
          margin-bottom: 20px;
          font-size: 14px;
        }
        
        /* Materials Section */
        .materials-section {
          margin-top: 20px;
        }
        
        .materials-title {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .materials-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .material-button {
          padding: 8px 15px;
          background-color: #e9ecef;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #495057;
          transition: all 0.2s ease;
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
        
        /* Touch-friendly improvements */
        @media (hover: none) and (pointer: coarse) {
          .tutorial-card:hover {
            transform: none;
          }
          
          button, .tutorial-thumbnail {
            min-height: 44px;
            min-width: 44px;
          }
          
          .play-button-overlay {
            width: 70px;
            height: 70px;
          }
        }
      `}</style>
    </div>
  );
};

export default Tutorials;