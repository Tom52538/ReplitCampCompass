
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  private constructor() {}

  public static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    
    // Check if performance.memory is available (Chrome/Edge)
    if ('memory' in performance) {
      this.monitoringInterval = setInterval(() => {
        this.checkMemoryUsage();
      }, 30000); // Check every 30 seconds
    }
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  private checkMemoryUsage(): void {
    if (!('memory' in performance)) {
      return;
    }

    const memory = (performance as any).memory;
    const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
    const totalMB = Math.round(memory.totalJSHeapSize / 1048576);
    const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576);

    // Log memory usage for debugging
    console.log(`Memory: ${usedMB}MB used, ${totalMB}MB total, ${limitMB}MB limit`);

    // Warn if memory usage is high (>80% of limit)
    if (usedMB > limitMB * 0.8) {
      console.warn('High memory usage detected:', {
        used: usedMB,
        total: totalMB,
        limit: limitMB,
        percentage: Math.round((usedMB / limitMB) * 100)
      });
      
      this.triggerMemoryCleanup();
    }
  }

  private triggerMemoryCleanup(): void {
    // Force garbage collection if available
    if ('gc' in window) {
      try {
        (window as any).gc();
        console.log('Garbage collection triggered');
      } catch (error) {
        console.warn('Could not trigger garbage collection:', error);
      }
    }

    // Clear any query cache if available
    if ((window as any).queryClient) {
      try {
        (window as any).queryClient.clear();
        console.log('Query cache cleared for memory optimization');
      } catch (error) {
        console.warn('Could not clear query cache:', error);
      }
    }
  }

  public getMemoryInfo(): any {
    if (!('memory' in performance)) {
      return {
        supported: false,
        message: 'Memory API not supported in this browser'
      };
    }

    const memory = (performance as any).memory;
    return {
      supported: true,
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedMB: Math.round(memory.usedJSHeapSize / 1048576),
      totalMB: Math.round(memory.totalJSHeapSize / 1048576),
      limitMB: Math.round(memory.jsHeapSizeLimit / 1048576)
    };
  }

  public isCurrentlyMonitoring(): boolean {
    return this.isMonitoring;
  }
}
