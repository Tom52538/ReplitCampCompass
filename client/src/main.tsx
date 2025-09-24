import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { mobileLogger } from "./utils/mobileLogger";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';

// Initialize mobile logging for smartphone debugging
mobileLogger.logDeviceInfo();
mobileLogger.log('SYSTEM', 'App starting up');

// Handle uncaught exceptions
window.addEventListener('error', (event) => {
  console.error('🚨 Uncaught error:', event.error);
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);