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
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '300px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
        <div style={{
          padding: '30px',
          backgroundColor: '#fee',
          border: '1px solid #f99',
          borderRadius: '8px',
          margin: '20px 0',
          textAlign: 'center'
        }}>
          <i className="fas fa-exclamation-triangle" style={{
            fontSize: '48px',
            color: '#dc3545',
            marginBottom: '20px'
          }}></i>
          <p style={{ color: '#d33', marginBottom: '20px', fontSize: '16px' }}>
            {error}
          </p>
          <button 
            onClick={refreshTutorials}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
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
      <div className="dashboard-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0' }}>
            <i className="fas fa-video" style={{ marginRight: '10px', color: '#007bff' }}></i>
            Video Tutorials
          </h2>
          <div className="date-display" style={{ color: '#666', fontSize: '14px' }}>
            {tutorials.length} tutorials available | Progress automatically saved
          </div>
        </div>
        <button 
          onClick={refreshTutorials}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}
        >
          <i className="fas fa-sync-alt"></i>
          Refresh
        </button>
      </div>

      {/* Tutorials Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '25px',
        marginBottom: '40px'
      }}>
        {tutorials.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            padding: '60px 20px',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <i className="fas fa-video-slash" style={{
              fontSize: '64px',
              color: '#dee2e6',
              marginBottom: '20px'
            }}></i>
            <h3 style={{ color: '#6c757d', marginBottom: '15px' }}>
              No Tutorials Available
            </h3>
            <p style={{ color: '#999', marginBottom: '25px', maxWidth: '500px', margin: '0 auto' }}>
              Tutorials will appear here once your lecturers upload them. Check back later!
            </p>
          </div>
        ) : (
          tutorials.map(tutorial => (
            <div 
              key={tutorial.id} 
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                borderTop: `4px solid ${getDifficultyColor(tutorial.difficulty)}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
            >
              {/* Thumbnail/Preview */}
              <div 
                style={{
                  height: '200px',
                  backgroundColor: '#f8f9fa',
                  backgroundImage: tutorial.thumbnailUrl ? `url(${tutorial.thumbnailUrl})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                onClick={() => openVideoPlayer(tutorial)}
              >
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  backgroundColor: getDifficultyColor(tutorial.difficulty),
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {tutorial.difficulty.toUpperCase()}
                </div>
                
                <div style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '0',
                  right: '0',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  padding: '8px 15px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {tutorial.courseCode}: {tutorial.courseName}
                </div>
                
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '60px',
                  height: '60px',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: '#007bff'
                }}>
                  <i className="fas fa-play"></i>
                </div>
              </div>

              {/* Tutorial Info */}
              <div style={{ padding: '20px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <h4 style={{ 
                    margin: 0,
                    fontSize: '16px',
                    color: '#333',
                    lineHeight: '1.4',
                    flex: 1
                  }}>
                    {tutorial.title}
                  </h4>
                  <span style={{
                    fontSize: '12px',
                    color: '#6c757d',
                    whiteSpace: 'nowrap',
                    marginLeft: '10px'
                  }}>
                    <i className="far fa-clock" style={{ marginRight: '4px' }}></i>
                    {tutorial.duration} min
                  </span>
                </div>

                <div style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
                  <div style={{ marginBottom: '5px' }}>
                    <i className="fas fa-chalkboard-teacher" style={{ marginRight: '8px', color: '#6c757d' }}></i>
                    {tutorial.lecturer}
                  </div>
                  {tutorial.description && (
                    <div style={{ 
                      color: '#777',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      marginTop: '8px'
                    }}>
                      {tutorial.description.length > 100 
                        ? `${tutorial.description.substring(0, 100)}...` 
                        : tutorial.description}
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: '15px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}>
                    <span style={{ fontSize: '12px', color: '#6c757d' }}>
                      Progress: {tutorial.progress}%
                    </span>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: tutorial.status === 'completed' ? '#d4edda' : 
                                     tutorial.status === 'in-progress' ? '#fff3cd' : '#f8d7da',
                      color: tutorial.status === 'completed' ? '#155724' : 
                            tutorial.status === 'in-progress' ? '#856404' : '#721c24',
                      fontWeight: '500'
                    }}>
                      {tutorial.status === 'completed' ? '✓ Completed' : 
                       tutorial.status === 'in-progress' ? '▶ In Progress' : 'New'}
                    </span>
                  </div>
                  <div style={{
                    height: '6px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div 
                      style={{
                        height: '100%',
                        width: `${tutorial.progress}%`,
                        backgroundColor: tutorial.progress === 100 ? '#28a745' : 
                                       tutorial.progress > 0 ? '#007bff' : '#6c757d',
                        transition: 'width 0.3s ease',
                        borderRadius: '3px'
                      }}
                    ></div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => openVideoPlayer(tutorial)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: tutorial.progress === 100 ? '#6c757d' : '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
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
                      style={{
                        padding: '10px 15px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
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
        style={{
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          },
          content: {
            position: 'relative',
            top: 'auto',
            left: 'auto',
            right: 'auto',
            bottom: 'auto',
            border: 'none',
            background: 'transparent',
            borderRadius: '12px',
            padding: 0,
            width: '90%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflow: 'hidden'
          }
        }}
      >
        {activeVideo && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>
                  {activeVideo.title}
                </h3>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <i className="fas fa-chalkboard-teacher" style={{ marginRight: '8px' }}></i>
                  {activeVideo.lecturer} • 
                  <i className="fas fa-book" style={{ marginLeft: '15px', marginRight: '8px' }}></i>
                  {activeVideo.courseCode} • 
                  <span style={{
                    marginLeft: '15px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: getDifficultyColor(activeVideo.difficulty),
                    color: 'white',
                    fontSize: '12px'
                  }}>
                    {activeVideo.difficulty}
                  </span>
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#6c757d',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '4px'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Video Player */}
            <div style={{
              position: 'relative',
              backgroundColor: '#000'
            }}>
              <ReactPlayer
                ref={playerRef}
                url={activeVideo.videoSrc}
                playing={playing}
                controls={true}
                width="100%"
                height="auto"
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
              
              {/* Progress indicator overlay */}
              <div style={{
                position: 'absolute',
                bottom: '60px',
                left: '20px',
                right: '20px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: '10px',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                display: 'none' // Show on hover or based on state
              }}>
                Progress: {activeVideo.progress}% • Auto-save enabled
              </div>
            </div>

            {/* Video Controls */}
            <div style={{
              padding: '15px 20px',
              backgroundColor: '#f8f9fa',
              borderTop: '1px solid #dee2e6'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setPlaying(!playing)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: playing ? '#dc3545' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  <i className={`fas fa-${playing ? 'pause' : 'play'}`}></i>
                  {playing ? 'Pause' : 'Play'}
                </button>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{
                    height: '6px',
                    backgroundColor: '#dee2e6',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    cursor: 'pointer'
                  }} onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    handleSeek(percent * duration);
                  }}>
                    <div 
                      style={{
                        height: '100%',
                        width: `${activeVideo.progress}%`,
                        backgroundColor: '#007bff',
                        transition: 'width 0.1s linear'
                      }}
                    ></div>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#6c757d',
                    marginTop: '5px'
                  }}>
                    <span>{formatTime(videoProgress[activeVideo.id]?.playedSeconds || 0)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div style={{ fontSize: '14px', color: '#495057' }}>
                  <i className="fas fa-save" style={{ marginRight: '5px', color: '#28a745' }}></i>
                  Auto-saving...
                </div>
              </div>
            </div>

            {/* Video Description */}
            <div style={{ padding: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>
                <i className="fas fa-info-circle" style={{ marginRight: '8px', color: '#007bff' }}></i>
                Description
              </h4>
              <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '20px' }}>
                {activeVideo.description || 'No description available.'}
              </p>

              {/* Additional Materials */}
              {activeVideo.fileUrls && activeVideo.fileUrls.length > 0 && (
                <div>
                  <h5 style={{ margin: '0 0 10px 0', color: '#333' }}>
                    <i className="fas fa-file-download" style={{ marginRight: '8px', color: '#28a745' }}></i>
                    Download Materials
                  </h5>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {activeVideo.fileUrls.map((fileUrl, index) => (
                      <button
                        key={index}
                        onClick={() => downloadFile(fileUrl, `material-${index + 1}.zip`)}
                        style={{
                          padding: '8px 15px',
                          backgroundColor: '#e9ecef',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          color: '#495057'
                        }}
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

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .react-player video {
          border-radius: 0 !important;
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
        
        button:hover {
          opacity: 0.9;
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
        
        button:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};

export default Tutorials;