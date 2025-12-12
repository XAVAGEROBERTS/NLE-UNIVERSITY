import React from 'react';

const Tutorials = () => {
  const tutorials = [
    {
      id: 1,
      title: "Data Structures - Binary Trees",
      lecturer: "Dr. Smith",
      duration: "12:34",
      description: "Learn binary tree traversal methods (in-order, pre-order, post-order) with Java implementation examples.",
      videoSrc: "videos/binary-trees.mp4",
      progress: 0,
      status: "new"
    },
    {
      id: 2,
      title: "Database Systems - SQL Joins",
      lecturer: "Prof. Brown",
      duration: "10:21",
      description: "Master SQL joins (INNER, LEFT, RIGHT, FULL) with practical query examples and exercises.",
      videoSrc: "videos/sql-joins.mp4",
      progress: 100,
      status: "completed"
    },
    {
      id: 3,
      title: "Computer Architecture - Pipeline Hazards",
      lecturer: "Prof. Johnson",
      duration: "15:45",
      description: "Understand pipeline hazards (data, control, structural) with mitigation techniques.",
      videoSrc: "videos/pipeline-hazards.mp4",
      progress: 35,
      status: "in-progress"
    }
  ];

  const handleWatchTutorial = (tutorial) => {
    alert(`Playing: ${tutorial.title}\n\nIn a real app, this would open a video player.`);
  };

  return (
    <div className="content tut-tab-content" id="tutorials">
      <div className="tut-dashboard-header">
        <h2>Tutorials</h2>
        <div className="tut-date-display">Available Resources</div>
      </div>

      <div className="tut-container">
        {tutorials.map(tutorial => (
          <div key={tutorial.id} className="tut-card" data-tutorial-id={`tutorial-${tutorial.id}`}>
            <div className="tut-card-header">
              <h4 className="tut-card-title">{tutorial.title}</h4>
              <span className={`tut-status tut-status-${tutorial.status}`}>
                {tutorial.status === 'completed' ? 'Completed' : tutorial.status === 'in-progress' ? 'In Progress' : 'New'}
              </span>
            </div>
            <div className="tut-meta">
              <div className="tut-meta-item"><i className="fas fa-user"></i> {tutorial.lecturer}</div>
              <div className="tut-meta-item"><i className="far fa-clock"></i> {tutorial.duration} min</div>
            </div>
            <div className="tut-description">
              {tutorial.description}
            </div>
            <div className="tut-progress">
              <div className="tut-progress-bar">
                <div className="tut-progress-fill" style={{ width: `${tutorial.progress}%` }}></div>
              </div>
              <span className="tut-progress-text">{tutorial.progress}% watched</span>
            </div>
            <button 
              className="tut-action-btn"
              onClick={() => handleWatchTutorial(tutorial)}
            >
              {tutorial.progress === 0 ? (
                <>
                  <i className="fas fa-play"></i> Watch Tutorial
                </>
              ) : tutorial.progress >= 99 ? (
                <>
                  <i className="fas fa-redo"></i> Review Tutorial
                </>
              ) : (
                <>
                  <i className="fas fa-play"></i> Continue Watching
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tutorials;