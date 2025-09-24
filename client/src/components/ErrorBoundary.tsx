import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { mobileLogger } from '@/utils/mobileLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('🚨 App Error Boundary caught error:', error);
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Navigation Error Boundary caught an error:', error, errorInfo);

    // Log to mobile logger for detailed tracking
    mobileLogger.log('CRITICAL_ERROR', `App crash: ${error.message}`);
    mobileLogger.log('ERROR_STACK', error.stack || 'No stack trace');
    mobileLogger.log('COMPONENT_STACK', errorInfo.componentStack);

    // Log app state at time of crash
    mobileLogger.logAppState();

    // Store error info for display
    this.setState({ error, errorInfo });

    // Clear any potential memory leaks
    if (typeof window !== 'undefined') {
      // Clear any ongoing timers or intervals
      for (let i = 1; i < 99999; i++) {
        window.clearTimeout(i);
        window.clearInterval(i);
      }

      // Force garbage collection if available
      if ('gc' in window) {
        (window as any).gc();
      }
    }

    // Log recovery attempt
    mobileLogger.log('CRASH_RECOVERY', 'Error boundary activated, attempting cleanup');
  }

  private handleReload = () => {
    // Clear error state and reload
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  private handleReset = () => {
    // Just reset the error boundary
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 max-w-md w-full shadow-lg border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900">App Error</h2>
            </div>

            <p className="text-gray-600 mb-4">
              The navigation app encountered an error. This might be due to GPS access issues or network problems.
            </p>

            <div className="space-y-2">
              <Button 
                onClick={this.handleReset}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>

              <Button 
                onClick={this.handleReload}
                className="w-full"
                variant="outline"
              >
                Reload App
              </Button>

              <Button 
                onClick={() => {
                  const logs = mobileLogger.exportLogs();
                  console.log('=== CRASH LOGS ===\n', logs);
                  alert('Crash logs exported to console. Check developer tools.');
                }}
                className="w-full mt-2"
                variant="secondary"
                size="sm"
              >
                Export Debug Logs
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer text-gray-500">Error Details</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {this.state.error.message}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}