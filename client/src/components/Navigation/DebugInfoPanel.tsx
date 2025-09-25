import React from 'react';
import { RouteProgress } from '@/lib/routeTracker';

interface DebugInfoPanelProps {
  debugInfo: RouteProgress | null;
  reroutingCooldown: boolean;
}

const DebugDataItem: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => (
  <div className="flex justify-between text-xs">
    <span className="font-semibold">{label}:</span>
    <span className="font-mono">{value === undefined ? 'N/A' : value}</span>
  </div>
);

export const DebugInfoPanel: React.FC<DebugInfoPanelProps> = ({ debugInfo, reroutingCooldown }) => {
  if (!debugInfo) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '10px',
        width: '250px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px',
        borderRadius: '8px',
        zIndex: 1100,
        fontFamily: 'sans-serif',
      }}
    >
      <h4 className="text-sm font-bold mb-2 border-b border-gray-500 pb-1">Debug Info</h4>
      <div className="space-y-1">
        <DebugDataItem label="Current Step" value={`${(debugInfo.currentStep || 0) + 1}`} />
        <DebugDataItem label="Dist to Next" value={`${(debugInfo.distanceToNext || 0).toFixed(1)}m`} />
        <DebugDataItem label="Off-Route Dist" value={`${(debugInfo.offRouteDistance || 0).toFixed(1)}m`} />
        <DebugDataItem label="Is Off-Route" value={debugInfo.isOffRoute ? 'YES' : 'NO'} />
        <DebugDataItem label="Reroute Cooldown" value={reroutingCooldown ? 'YES' : 'NO'} />
        <DebugDataItem label="Raw Lat" value={debugInfo.rawGpsPosition?.lat.toFixed(6)} />
        <DebugDataItem label="Raw Lng" value={debugInfo.rawGpsPosition?.lng.toFixed(6)} />
        <DebugDataItem label="Snapped Lat" value={debugInfo.snappedGpsPosition?.lat.toFixed(6)} />
        <DebugDataItem label="Snapped Lng" value={debugInfo.snappedGpsPosition?.lng.toFixed(6)} />
      </div>
    </div>
  );
};
