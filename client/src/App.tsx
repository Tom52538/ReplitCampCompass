import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Navigation from "@/pages/Navigation";
import NotFound from "@/pages/not-found";
import { MemoryMonitor } from '@/utils/memoryMonitor';
import { mobileLogger } from '@/utils/mobileLogger';
import { useEffect } from 'react';

function Router() {
  return (
    <Switch>
      <Route path="/" component={Navigation} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Start memory monitoring to prevent crashes
    const memoryMonitor = MemoryMonitor.getInstance();
    memoryMonitor.startMonitoring();

    // Initialize crash detection
    mobileLogger.logAppState();
    mobileLogger.log('APP_STARTUP', 'Application starting with crash detection enabled');

    // Log device info for debugging
    mobileLogger.logDeviceInfo();

    return () => {
      memoryMonitor.stopMonitoring();
      mobileLogger.log('APP_SHUTDOWN', 'Application shutting down');
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;