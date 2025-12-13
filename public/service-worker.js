// Empty service worker to prevent errors
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log('Service Worker activated');
});