
import React, { useState, useEffect } from 'react';
import { MemoryMonitor } from '@/utils/memoryMonitor';

interface MemoryInfo {
  supported: boolean;
  usedMB?: number;
  totalMB?: number;
  limitMB?: number;
  message?: string;
}

export default function MobileMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo>({ supported: false });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const memoryMonitor = MemoryMonitor.getInstance();
    
    // Update memory info every 10 seconds
    const updateMemoryInfo = () => {
      const info = memoryMonitor.getMemoryInfo();
      setMemoryInfo(info);
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 10000);

    return () => clearInterval(interval);
  }, []);

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Temporär ausgeblendet
  return null;

  if (!memoryInfo.supported) {
    return null;
  }

  const getMemoryColor = (usedMB: number, limitMB: number) => {
    const percentage = (usedMB / limitMB) * 100;
    if (percentage > 80) return 'text-red-500';
    if (percentage > 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div 
      className="fixed top-4 right-4 z-[9999] bg-black/80 text-white text-xs p-2 rounded cursor-pointer"
      onClick={() => setIsVisible(!isVisible)}
    >
      {isVisible ? (
        <div className="space-y-1">
          <div>Memory Monitor</div>
          <div className={getMemoryColor(memoryInfo.usedMB || 0, memoryInfo.limitMB || 1)}>
            Used: {memoryInfo.usedMB}MB / {memoryInfo.limitMB}MB
          </div>
          <div>Total: {memoryInfo.totalMB}MB</div>
          <div>Usage: {Math.round(((memoryInfo.usedMB || 0) / (memoryInfo.limitMB || 1)) * 100)}%</div>
        </div>
      ) : (
        <div className={getMemoryColor(memoryInfo.usedMB || 0, memoryInfo.limitMB || 1)}>
          {memoryInfo.usedMB}MB
        </div>
      )}
    </div>
  );
}
