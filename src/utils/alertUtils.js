export const showAlert = (message, type = 'success') => {
  // Remove existing alerts
  const existingAlerts = document.querySelectorAll('.custom-alert');
  existingAlerts.forEach(alert => alert.remove());

  const alert = document.createElement('div');
  alert.className = 'custom-alert';
  alert.style.backgroundColor = type === 'success' ? '#27ae60' : '#e74c3c';
  alert.innerHTML = `
    <div class="alert-content">
      <span id="alertMessage">${message}</span>
      <button class="close-alert">&times;</button>
    </div>
  `;
  
  document.body.appendChild(alert);
  
  // Position it
  alert.style.position = 'fixed';
  alert.style.top = '80px';
  alert.style.right = '30px';
  alert.style.zIndex = '2000';
  alert.style.display = 'block';
  
  // Add close functionality
  const closeBtn = alert.querySelector('.close-alert');
  closeBtn.addEventListener('click', () => {
    alert.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => alert.remove(), 300);
  });
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (alert.parentNode) {
      alert.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => alert.remove(), 300);
    }
  }, 5000);
};