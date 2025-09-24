// Compass debugging utilities
export const debugCompassState = (context: string, data: any) => {
  console.log(`🧭 COMPASS DEBUG [${context}]:`, data);
  
  if (window.mobileLogger) {
    window.mobileLogger.log('COMPASS_DEBUG', `${context}: ${JSON.stringify(data)}`);
  }
};

export const logMapRotationAttempt = (bearing: number, orientation: string, success: boolean) => {
  const message = `Map rotation ${success ? 'SUCCESS' : 'FAILED'}: ${bearing}° in ${orientation} mode`;
  console.log(`🧭 ${message}`);
  
  if (window.mobileLogger) {
    window.mobileLogger.log('MAP_ROTATION', message);
  }
};