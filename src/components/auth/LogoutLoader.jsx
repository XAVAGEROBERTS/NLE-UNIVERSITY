// src/components/auth/LogoutLoader.jsx
import React from 'react';

const LogoutLoader = ({ progress = 0 }) => {
  return (
    <div className="logout-loader">
      <div className="logout-loader-content">
        <div className="loading-badge-container">
          <div className="pulsing-circle"></div>
          <div className="badge-wrapper">
            <img 
              src="/badge.png" 
              alt="University Badge" 
              className="spinning-badge"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = `
                  <div class="badge-fallback-spinning">
                    🎓
                  </div>
                `;
              }}
            />
          </div>
        </div>
        
        <p className="logout-loading-title">Logging out...</p>
        
        <p className="logout-loading-text">
          Please wait while we securely sign you out
        </p>
        
        <div className="logout-progress-bar">
          <div 
            className="logout-progress-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="progress-dots">
          <div className={`progress-dot ${progress >= 33 ? 'active' : ''}`}></div>
          <div className={`progress-dot ${progress >= 66 ? 'active' : ''}`}></div>
          <div className={`progress-dot ${progress >= 100 ? 'active' : ''}`}></div>
        </div>
      </div>

      <style jsx="true">{`
        .logout-loader {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }
        
        .logout-loader-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        
        .loading-badge-container {
          position: relative;
          width: 150px;
          height: 150px;
          margin-bottom: 25px;
        }
        
        .pulsing-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background-color: #4361ee10;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.95);
            opacity: 0.7;
          }
          50% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(0.95);
            opacity: 0.7;
          }
        }
        
        .badge-wrapper {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 3px solid #4361ee;
          background-color: white;
          padding: 10px;
        }
        
        .spinning-badge {
          width: 100%;
          height: 100%;
          object-fit: contain;
          animation: rotateSlow 5s linear infinite;
        }
        
        @keyframes rotateSlow {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        .badge-fallback-spinning {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #4361ee, #3f37c9);
          color: white;
          font-size: 48px;
          border-radius: 50%;
          animation: rotateSlow 5s linear infinite;
        }
        
        .logout-loading-title {
          font-size: 1.3rem;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .logout-loading-text {
          font-size: 0.95rem;
          color: #7f8c8d;
          margin-bottom: 25px;
          text-align: center;
          max-width: 300px;
        }
        
        .logout-progress-bar {
          width: 250px;
          height: 6px;
          background-color: #e9ecef;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        
        .logout-progress-fill {
          height: 100%;
          background-color: #4361ee;
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        
        .progress-dots {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
        }
        
        .progress-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: #e9ecef;
          transition: background-color 0.3s ease;
        }
        
        .progress-dot.active {
          background-color: #4361ee;
        }
      `}</style>
    </div>
  );
};

export default LogoutLoader;