import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';

interface GestureEnhancedMapProps {
  onDoubleTap?: (latlng: any) => void;
  onLongPress?: (latlng: any) => void;
  onSingleTap?: (latlng: any) => void;
}

const GestureEnhancedMapInner = ({ onDoubleTap, onLongPress, onSingleTap }: GestureEnhancedMapProps) => {
  const map = useMap();
  const touchStart = useRef<{ time: number; pos: { x: number; y: number } } | null>(null);
  const lastTapTime = useRef<number>(0);
  const tapTimeoutId = useRef<NodeJS.Timeout | null>(null);

  console.log('🗺️ GESTURE DEBUG: GestureEnhancedMap component rendered', {
    mapExists: !!map,
    callbacks: {
      onDoubleTap: !!onDoubleTap,
      onLongPress: !!onLongPress,
      onSingleTap: !!onSingleTap
    }
  });

  // Add mobile logger entry
  if (typeof window !== 'undefined' && window.mobileLogger) {
    window.mobileLogger.log('GESTURE_COMPONENT', 'GestureEnhancedMap rendered - callbacks: ' + JSON.stringify({
      onDoubleTap: !!onDoubleTap,
      onLongPress: !!onLongPress,
      onSingleTap: !!onSingleTap
    }));
  }

  // Define the event handlers here to make them stable across re-renders
  const handleTouchStart = (e: TouchEvent) => {
    console.log('🗺️ GESTURE DEBUG: Touch start detected', {
      touchCount: e.touches.length,
      target: e.target?.constructor.name
    });

    if (e.touches.length === 1) {
      // Single touch - track for tap gestures
      const touch = e.touches[0];
      touchStart.current = {
        time: Date.now(),
        pos: { x: touch.clientX, y: touch.clientY }
      };
      console.log('🗺️ GESTURE DEBUG: Single touch started at', touchStart.current.pos);
    } else if (e.touches.length === 2) {
      // Multi-touch detected - clear any single touch data and allow pinch zoom
      console.log('🗺️ GESTURE DEBUG: Multi-touch detected - clearing single touch data for pinch zoom');
      touchStart.current = null;

      // Clear any pending single tap timeout
      if (tapTimeoutId.current) {
        clearTimeout(tapTimeoutId.current);
        tapTimeoutId.current = null;
      }

      // Don't prevent default for multi-touch - let Leaflet handle pinch zoom
      return;
    } else {
      // More than 2 touches - clear everything
      console.log('🗺️ GESTURE DEBUG: More than 2 touches - clearing all gesture data');
      touchStart.current = null;
      if (tapTimeoutId.current) {
        clearTimeout(tapTimeoutId.current);
        tapTimeoutId.current = null;
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    console.log('🗺️ GESTURE DEBUG: Touch end triggered', {
      hasStartData: !!touchStart.current,
      remainingTouches: e.touches.length,
      changedTouches: e.changedTouches.length
    });

    // If there are still touches remaining, this might be end of multi-touch gesture
    if (e.touches.length > 0) {
      console.log('🗺️ GESTURE DEBUG: Touch end with remaining touches - likely multi-touch gesture');
      // Don't process single tap logic during multi-touch
      return;
    }

    // If no touch start data, nothing to process
    if (!touchStart.current) {
      console.log('🗺️ GESTURE DEBUG: Touch end cancelled - no start data');
      return;
    }

    const touchEnd = Date.now();
    const duration = touchEnd - touchStart.current.time;
    const timeSinceLastTap = touchEnd - lastTapTime.current;

    console.log('🗺️ GESTURE DEBUG: Touch end analysis -', {
      duration,
      timeSinceLastTap,
      isQuickTap: duration < 500,
      isRecentTap: timeSinceLastTap < 300,
      startPos: touchStart.current.pos
    });

    if (duration > 500) {
      console.log('🗺️ GESTURE DEBUG: Long press detected - showing map info');
      const containerPoint = [touchStart.current.pos.x, touchStart.current.pos.y];
      const latlng = map.containerPointToLatLng(containerPoint);
      console.log('🗺️ GESTURE DEBUG: Long press coordinates:', { containerPoint, latlng });
      onLongPress?.(latlng);
      touchStart.current = null;
      return;
    }

    // Clear any existing timeout
    if (tapTimeoutId.current) {
      clearTimeout(tapTimeoutId.current);
      tapTimeoutId.current = null;
    }

    if (timeSinceLastTap < 300 && lastTapTime.current > 0) {
      // Double tap detected - set destination
      console.log('🗺️ GESTURE DEBUG: Double tap confirmed - setting destination');
      const containerPoint = [touchStart.current.pos.x, touchStart.current.pos.y];
      const latlng = map.containerPointToLatLng(containerPoint);
      console.log('🗺️ GESTURE DEBUG: Double tap destination coordinates:', { containerPoint, latlng });
      onDoubleTap?.(latlng);
      lastTapTime.current = 0; // Reset to prevent triple tap
      e.preventDefault();
    } else {
      // Single tap - wait briefly to see if double tap follows
      console.log('🗺️ GESTURE DEBUG: Potential single tap detected, waiting...');
      const currentTouchPos = { x: touchStart.current.pos.x, y: touchStart.current.pos.y };

      tapTimeoutId.current = setTimeout(() => {
        console.log('🗺️ GESTURE DEBUG: Single tap confirmed - map interaction only');
        const containerPoint = [currentTouchPos.x, currentTouchPos.y];
        const latlng = map.containerPointToLatLng(containerPoint);
        console.log('🗺️ GESTURE DEBUG: Single tap coordinates:', { containerPoint, latlng });
        onSingleTap?.(latlng);
        tapTimeoutId.current = null;
      }, 250); // Shorter wait time for better responsiveness

      lastTapTime.current = touchEnd;
    }

    touchStart.current = null;
  };

  const handleWheel = (e: WheelEvent) => {
    // Track zoom gestures if needed
    if (e.ctrlKey) {
      console.log('🗺️ GESTURE DEBUG: Pinch zoom detected via wheel event');
    }
  };


  useEffect(() => {
    console.log('🗺️ GESTURE DEBUG: Setting up gesture handlers for map - map exists:', !!map);

    if (!map) return;

    const container = map.getContainer();
    if (!container) return;

    console.log('🗺️ GESTURE DEBUG: Setting up touch event listeners on map container', {
      containerExists: !!container,
      containerTagName: container.tagName,
      containerClass: container.className
    });

    // Create stable event handlers to prevent memory leaks
    const stableHandlers = {
      touchstart: handleTouchStart,
      touchend: handleTouchEnd,
      wheel: handleWheel
    };

    console.log('🗺️ GESTURE DEBUG: Adding event listeners...');
    container.addEventListener('touchstart', stableHandlers.touchstart, { passive: false });
    container.addEventListener('touchend', stableHandlers.touchend, { passive: false });
    container.addEventListener('wheel', stableHandlers.wheel, { passive: false });

    console.log('🗺️ GESTURE DEBUG: All touch event listeners attached successfully');

    return () => {
      console.log('🗺️ GESTURE DEBUG: Cleaning up touch event listeners');
      if (container) {
        container.removeEventListener('touchstart', stableHandlers.touchstart);
        container.removeEventListener('touchend', stableHandlers.touchend);
        container.removeEventListener('wheel', stableHandlers.wheel);
      }
    };
  }, [map]); // Only depend on map, handlers are stable


  // Return null as this is a utility component
  return null;
};

export const GestureEnhancedMap = (props: GestureEnhancedMapProps) => {
  return <GestureEnhancedMapInner {...props} />;
};