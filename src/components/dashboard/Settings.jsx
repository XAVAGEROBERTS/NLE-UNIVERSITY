import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const Settings = () => {
  const { profile, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    firstName: profile?.first_name || 'Robert',
    lastName: profile?.last_name || 'Mayhem',
    email: profile?.email || 'robertmayhemj@gmail.com',
    phone: profile?.phone || '+1 (555) 123-4567'
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notifications, setNotifications] = useState({
    email: true,
    assignments: true,
    exams: true
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handlePasswordChange = (e) => {
    const { id, value } = e.target;
    setPasswordData(prev => ({ ...prev, [id]: value }));
  };

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveProfile = () => {
    updateProfile({
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone
    });
  };

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    alert('Password changed successfully!');
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleSaveNotifications = () => {
    alert('Notification preferences updated!');
  };

  return (
    <div className="content">
      <div className="dashboard-header">
        <h2>Settings</h2>
        <div className="date-display">Account Management</div>
      </div>

      <div className="profile-container">
        <div className="profile-section">
          <h3>Profile Information</h3>
          <div className="profile-header">
            <div className="profile-avatar">
              <img src="/images/ROBERT PROFILE.jpg" alt="Profile" id="profilePicture" />
              <div className="profile-avatar-edit" id="changeAvatarBtn">
                <i className="fas fa-camera"></i>
              </div>
            </div>
            <div className="profile-info">
              <h2 id="profileFullName">{formData.firstName} {formData.lastName}</h2>
              <p id="profileProgram">Bachelor of Science in Computer Engineering</p>
              <p id="profileSemester">Year 4, Semester 2</p>
              <p id="profileStudentId">Student ID: NLE-BSCE-2403-0763-DAY</p>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3>Personal Details</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input 
                type="text" 
                id="firstName" 
                value={formData.firstName}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input 
                type="text" 
                id="lastName" 
                value={formData.lastName}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input 
                type="email" 
                id="email" 
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input 
                type="tel" 
                id="phone" 
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <button className="save-btn" onClick={handleSaveProfile}>
            Save Changes
          </button>
        </div>

        <div className="profile-section">
          <h3>Change Password</h3>
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input 
              type="password" 
              id="currentPassword" 
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input 
              type="password" 
              id="newPassword" 
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
            />
          </div>
          <button className="save-btn" onClick={handleChangePassword}>
            Change Password
          </button>
        </div>

        <div className="profile-section">
          <h3>Notification Preferences</h3>
          <div className="form-group">
            <label>
              <input 
                type="checkbox" 
                checked={notifications.email}
                onChange={() => handleNotificationChange('email')}
              /> Email Notifications
            </label>
          </div>
          <div className="form-group">
            <label>
              <input 
                type="checkbox" 
                checked={notifications.assignments}
                onChange={() => handleNotificationChange('assignments')}
              /> Assignment Reminders
            </label>
          </div>
          <div className="form-group">
            <label>
              <input 
                type="checkbox" 
                checked={notifications.exams}
                onChange={() => handleNotificationChange('exams')}
              /> Exam Notifications
            </label>
          </div>
          <button className="save-btn" onClick={handleSaveNotifications}>
            Update Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;