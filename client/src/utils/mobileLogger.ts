// Mobile-specific logging utility for smartphone debugging
export class MobileLogger {
  private logs: string[] = [];
  private maxLogs = 500;
  private logElement: HTMLElement | null = null;
  private isVisible = false;

  constructor() {
    // Only enable mobile logger in development
    if (import.meta.env.DEV) {
      this.setupMobileLogging();
      this.createLogDisplay();
      this.setupCrashDetection();
    }
  }

  private setupMobileLogging() {
    // Capture console errors
    const originalError = console.error;
    console.error = (...args) => {
      this.log('ERROR', args.join(' '));
      originalError.apply(console, args);
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.log('UNHANDLED_ERROR', `${event.message} at ${event.filename}:${event.lineno}`);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.log('PROMISE_REJECTION', event.reason?.toString() || 'Unknown promise rejection');
    });

    // Capture network errors
    this.interceptFetch();
  }

  private interceptFetch() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        if (!response.ok) {
          this.log('FETCH_ERROR', `${args[0]} - ${response.status} ${response.statusText} (${duration}ms)`);
        } else {
          this.log('FETCH_SUCCESS', `${args[0]} - ${response.status} (${duration}ms)`);
        }
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.log('FETCH_FAILED', `${args[0]} - ${error} (${duration}ms)`);
        throw error;
      }
    };
  }

  private createLogDisplay() {
    // Create floating log viewer for mobile
    const logContainer = document.createElement('div');
    logContainer.id = 'mobile-log-container';
    logContainer.style.cssText = `
      position: fixed;
      top: 100px;
      right: 10px;
      width: 40px;
      height: 40px;
      background: rgba(255, 0, 0, 0.8);
      border-radius: 50%;
      z-index: 9999;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      backdrop-filter: blur(8px);
      border: 2px solid rgba(255, 255, 255, 0.3);
    `;
    logContainer.textContent = 'LOG';

    const logDisplay = document.createElement('div');
    logDisplay.id = 'mobile-log-display';
    logDisplay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.95);
      color: #00ff00;
      font-family: monospace;
      font-size: 12px;
      padding: 20px;
      overflow-y: auto;
      z-index: 10000;
      display: none;
      white-space: pre-wrap;
      word-wrap: break-word;
    `;

    // Toggle log display
    logContainer.addEventListener('click', () => {
      this.isVisible = !this.isVisible;
      logDisplay.style.display = this.isVisible ? 'block' : 'none';
      if (this.isVisible) {
        this.updateLogDisplay();
      }
    });

    // Close log on tap outside or escape
    logDisplay.addEventListener('click', (e) => {
      if (e.target === logDisplay) {
        this.isVisible = false;
        logDisplay.style.display = 'none';
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.isVisible = false;
        logDisplay.style.display = 'none';
      }
    });

    document.body.appendChild(logContainer);
    document.body.appendChild(logDisplay);
    this.logElement = logDisplay;
  }

  log(level: string, message: string) {
    // Only log in development mode
    if (!import.meta.env.DEV) return;
    
    const timestamp = new Date().toISOString().substr(11, 12);
    const logEntry = `[${timestamp}] ${level}: ${message}`;
    
    this.logs.push(logEntry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Update display if visible
    if (this.isVisible && this.logElement) {
      this.updateLogDisplay();
    }

    // Also log to console for desktop debugging
    console.log(`📱 ${logEntry}`);
  }

  private updateLogDisplay() {
    if (this.logElement) {
      this.logElement.textContent = this.logs.join('\n');
      this.logElement.scrollTop = this.logElement.scrollHeight;
    }
  }

  // Device information logging
  logDeviceInfo() {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      memory: (navigator as any).deviceMemory || 'unknown',
      connection: (navigator as any).connection?.effectiveType || 'unknown'
    };

    this.log('DEVICE_INFO', JSON.stringify(info, null, 2));
  }

  // Performance monitoring
  logPerformance(label: string, startTime: number) {
    const duration = performance.now() - startTime;
    this.log('PERFORMANCE', `${label}: ${duration.toFixed(2)}ms`);
  }

  // Log weather API calls to track frequency
  logWeatherCall(endpoint: string, coords: { lat: number, lng: number }) {
    this.log('WEATHER_API', `${endpoint} called for ${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}`);
  }

  // Log compass/orientation changes
  logCompass(action: string, bearing?: number) {
    this.log('COMPASS', bearing !== undefined ? `${action} - bearing: ${bearing}°` : action);
  }

  // Log map rotation attempts
  logMapRotation(angle: number, method: string) {
    this.log('MAP_ROTATION', `Attempting ${angle}° rotation via ${method}`);
  }

  // Touch event logging
  logTouchEvent(event: TouchEvent, action: string) {
    const touch = event.touches[0] || event.changedTouches[0];
    if (touch) {
      this.log('TOUCH', `${action} at ${touch.clientX},${touch.clientY} - Target: ${(event.target as Element)?.tagName || 'unknown'}`);
    }
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    if (this.logElement) {
      this.logElement.textContent = '';
    }
    this.log('SYSTEM', 'Logs cleared');
  }

  // Export logs for sharing
  exportLogs(): string {
    return this.logs.join('\n');
  }

  // Crash detection and recovery
  private setupCrashDetection() {
    // Detect potential app crashes
    let lastActivity = Date.now();
    let lastGPSCheck = '';
    
    // Monitor for sudden inactivity (potential crash)
    setInterval(() => {
      const now = Date.now();
      if (now - lastActivity > 300000) { // 5 minutes of inactivity
        this.log('CRASH_DETECTION', 'Potential crash detected - app inactive for >5 minutes');
        this.triggerCrashRecovery();
      }
      // Update activity on user interaction
      const updateActivity = () => lastActivity = Date.now();
      document.addEventListener('touchstart', updateActivity);
      document.addEventListener('click', updateActivity);
      document.addEventListener('scroll', updateActivity);
      
      // Prevent GPS logging spam - only log when location actually changes
      const currentLocation = localStorage.getItem('currentCampground') || 'unknown';
      if (currentLocation !== lastGPSCheck) {
        this.log('GPS_LOCATION_CHANGE', `Location changed: ${lastGPSCheck} -> ${currentLocation}`);
        lastGPSCheck = currentLocation;
      }
    }, 30000);

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576);
        
        if (usedMB > limitMB * 0.95) { // Only trigger at 95% to prevent false positives
          this.log('MEMORY_WARNING', `Critical memory usage: ${usedMB}MB/${limitMB}MB`);
          this.triggerMemoryCleanup();
        }
      }, 60000); // Check every minute instead of 15 seconds
    }

    // Detect React component errors
    window.addEventListener('error', (event) => {
      if (event.message.includes('React') || event.message.includes('Component')) {
        this.log('REACT_ERROR', `React component error: ${event.message}`);
        this.logReactState();
      }
    });

    // Monitor query client errors
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.toString().includes('query') || event.reason?.toString().includes('fetch')) {
        this.log('QUERY_ERROR', `Query/Fetch error: ${event.reason}`);
        this.suggestQueryReset();
      }
    });

    // Proactive crash detection
    window.addEventListener('error', (event) => {
      this.log('JS_ERROR', `JavaScript error: ${event.error?.message || event.message}`);
      
      // Critical errors that indicate imminent crash
      const criticalErrors = [
        'out of memory',
        'maximum call stack',
        'script error',
        'network error',
        'quota exceeded'
      ];
      
      if (criticalErrors.some(error => event.error?.message?.toLowerCase().includes(error))) {
        this.log('CRITICAL_ERROR', 'Critical error detected - initiating recovery');
        this.triggerCrashRecovery();
      }
    });

    // Monitor for app freezes
    let lastHeartbeat = Date.now();
    setInterval(() => {
      const now = Date.now();
      if (now - lastHeartbeat > 10000) { // 10 second freeze
        this.log('APP_FREEZE', 'App freeze detected');
        this.triggerMemoryCleanup();
      }
      lastHeartbeat = now;
    }, 5000);
  }

  private triggerCrashRecovery() {
    this.log('CRASH_RECOVERY', 'Attempting automatic crash recovery...');
    
    try {
      // Clear potential memory leaks more efficiently
      const maxTimerId = setTimeout(() => {}, 0);
      for (let i = 1; i <= maxTimerId; i++) {
        clearTimeout(i);
        clearInterval(i);
      }

      // Clear query cache safely
      if ((window as any).queryClient) {
        try {
          (window as any).queryClient.clear();
          this.log('CRASH_RECOVERY', 'Query cache cleared');
        } catch (e) {
          this.log('CRASH_RECOVERY', 'Failed to clear query cache');
        }
      }

      // Force garbage collection if available
      if ('gc' in window) {
        (window as any).gc();
      }

      // Auto-reload after 3 seconds if critical crash detected
      setTimeout(() => {
        this.log('CRASH_RECOVERY', 'Auto-reloading after crash...');
        window.location.reload();
      }, 3000);

    } catch (error) {
      this.log('CRASH_RECOVERY', `Recovery failed: ${error}`);
      // Force reload as last resort
      window.location.reload();
    }
  }

  private triggerMemoryCleanup() {
    this.log('MEMORY_CLEANUP', 'Triggering memory cleanup...');
    
    try {
      // Clear query cache if available
      if ((window as any).queryClient) {
        (window as any).queryClient.clear();
        this.log('MEMORY_CLEANUP', 'Query cache cleared');
      }

      // Clear map instances if they exist
      if ((window as any).mapInstance) {
        try {
          (window as any).mapInstance.remove();
          delete (window as any).mapInstance;
          this.log('MEMORY_CLEANUP', 'Map instance cleaned');
        } catch (e) {
          this.log('MEMORY_CLEANUP', 'Failed to clean map instance');
        }
      }

      // Force garbage collection
      if ('gc' in window) {
        (window as any).gc();
      }

      // Clear any large arrays or objects
      if ((window as any).poiCache) {
        delete (window as any).poiCache;
      }

    } catch (error) {
      this.log('MEMORY_CLEANUP', `Cleanup failed: ${error}`);
    }
  }

  private logReactState() {
    const reactElements = document.querySelectorAll('[data-reactroot], [data-react-checksum]');
    this.log('REACT_STATE', `React elements found: ${reactElements.length}`);
    
    // Check for error boundaries
    const errorBoundaries = document.querySelectorAll('[class*="error"], [class*="crash"]');
    if (errorBoundaries.length > 0) {
      this.log('REACT_ERROR_BOUNDARY', `Error boundaries active: ${errorBoundaries.length}`);
    }
  }

  private suggestQueryReset() {
    this.log('QUERY_RESET', 'Suggesting query client reset due to persistent errors');
    
    setTimeout(() => {
      if ((window as any).queryClient) {
        (window as any).queryClient.invalidateQueries();
        this.log('QUERY_RESET', 'Query cache invalidated');
      }
    }, 1000);
  }

  // Enhanced app state logging
  logAppState() {
    const state = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      memory: 'memory' in performance ? {
        used: Math.round(((performance as any).memory.usedJSHeapSize / 1048576)),
        total: Math.round(((performance as any).memory.totalJSHeapSize / 1048576)),
        limit: Math.round(((performance as any).memory.jsHeapSizeLimit / 1048576))
      } : 'unavailable',
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      connection: (navigator as any).connection ? {
        type: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt
      } : 'unavailable',
      geolocation: navigator.geolocation ? 'available' : 'unavailable',
      storage: {
        localStorage: !!window.localStorage,
        sessionStorage: !!window.sessionStorage
      }
    };
    
    this.log('APP_STATE', JSON.stringify(state, null, 2));
  }
}

// Global mobile logger instance
export const mobileLogger = new MobileLogger();