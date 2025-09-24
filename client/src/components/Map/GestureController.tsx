import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';

interface GestureControllerProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchZoom?: (scale: number) => void;
  onDoubleTap?: (latlng: any) => void;
  onLongPress?: (latlng: any) => void;
}

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
  touches: number;
  initialDistance?: number;
}

export const GestureController = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinchZoom,
  onDoubleTap,
  onLongPress
}: GestureControllerProps) => {
  const map = useMap();
  const touchData = useRef<TouchData | null>(null);
  const [lastTap, setLastTap] = useState<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const getTouchDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getSwipeDirection = (startX: number, startY: number, endX: number, endY: number): string | null => {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;

    if (!touchData.current || Date.now() - touchData.current.startTime > maxSwipeTime) {
      return null;
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        return deltaX > 0 ? 'right' : 'left';
      }
    } else {
      if (Math.abs(deltaY) > minSwipeDistance) {
        return deltaY > 0 ? 'down' : 'up';
      }
    }
    return null;
  };

  useEffect(() => {
    const mapContainer = map.getContainer();

    // Handle mouse double click for desktop users
    const handleMouseDoubleClick = (e: MouseEvent) => {
      // Only handle if it's not on a POI marker
      if ((e.target as HTMLElement).closest('.poi-marker-container')) {
        return;
      }
      
      const latlng = map.containerPointToLatLng([e.clientX, e.clientY]);
      onDoubleTap?.(latlng);
    };

    const handleTouchStart = (e: TouchEvent) => {
      const touches = e.touches;
      const now = Date.now();

      // Clear any existing long press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      if (touches.length === 1) {
        const touch = touches[0];
        touchData.current = {
          startX: touch.clientX,
          startY: touch.clientY,
          startTime: now,
          touches: 1
        };

        // Check for double tap
        if (now - lastTap < 300) {
          const latlng = map.containerPointToLatLng([touch.clientX, touch.clientY]);
          onDoubleTap?.(latlng);
          setLastTap(0);
          return;
        }
        setLastTap(now);

        // Start long press timer (only for touch, not mouse)
        longPressTimer.current = setTimeout(() => {
          if (touchData.current && touchData.current.touches === 1) {
            const latlng = map.containerPointToLatLng([touch.clientX, touch.clientY]);
            onLongPress?.(latlng);
          }
        }, 500);

      } else if (touches.length === 2) {
        touchData.current = {
          startX: (touches[0].clientX + touches[1].clientX) / 2,
          startY: (touches[0].clientY + touches[1].clientY) / 2,
          startTime: now,
          touches: 2,
          initialDistance: getTouchDistance(touches)
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchData.current) return;

      // Clear long press timer on move
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      const touches = e.touches;

      if (touches.length === 2 && touchData.current.touches === 2 && touchData.current.initialDistance) {
        // Handle pinch zoom
        const currentDistance = getTouchDistance(touches);
        const scale = currentDistance / touchData.current.initialDistance;
        onPinchZoom?.(scale);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchData.current) return;

      // Clear long press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      const changedTouches = e.changedTouches;

      if (touchData.current.touches === 1 && changedTouches.length === 1) {
        const touch = changedTouches[0];
        const direction = getSwipeDirection(
          touchData.current.startX,
          touchData.current.startY,
          touch.clientX,
          touch.clientY
        );

        switch (direction) {
          case 'left':
            onSwipeLeft?.();
            break;
          case 'right':
            onSwipeRight?.();
            break;
          case 'up':
            onSwipeUp?.();
            break;
          case 'down':
            onSwipeDown?.();
            break;
        }
      }

      touchData.current = null;
    };

    // Prevent default touch behaviors
    const preventDefaults = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Touch event listeners
    mapContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    mapContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    mapContainer.addEventListener('touchend', handleTouchEnd);
    mapContainer.addEventListener('touchmove', preventDefaults, { passive: false });
    
    // Mouse event listeners
    mapContainer.addEventListener('dblclick', handleMouseDoubleClick);

    return () => {
      // Remove touch listeners
      mapContainer.removeEventListener('touchstart', handleTouchStart);
      mapContainer.removeEventListener('touchmove', handleTouchMove);
      mapContainer.removeEventListener('touchend', handleTouchEnd);
      mapContainer.removeEventListener('touchmove', preventDefaults);
      
      // Remove mouse listeners
      mapContainer.removeEventListener('dblclick', handleMouseDoubleClick);
      
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, [map, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onPinchZoom, onDoubleTap, onLongPress, lastTap]);

  return null;
};