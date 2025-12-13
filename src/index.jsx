// src/index.jsx - MAIN ENTRY POINT
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import AdminApp from './admin/AdminApp';

// Simple router to decide which app to show
function RootRouter() {
  // Check if we're accessing admin routes
  const isAdminRoute = window.location.pathname.startsWith('/admin');
  
  if (isAdminRoute) {
    // Remove /admin prefix and pass to AdminApp
    const path = window.location.pathname.replace('/admin', '') || '/';
    window.history.replaceState(null, '', path);
    return <AdminApp />;
  }
  
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootRouter />
  </React.StrictMode>
);